import { getDB } from '../db/schema';
import { sync, type Operation } from '../api/client';

const DEVICE_ID_KEY = 'nanoai_device_id';
const SYNC_INTERVAL = 30000; // 30 seconds

function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

interface SyncListener {
  (status: SyncStatus, message?: string): void;
}

class SyncEngine {
  private status: SyncStatus = 'idle';
  private listeners: Set<SyncListener> = new Set();
  private syncInterval: number | null = null;
  private isOnline: boolean = navigator.onLine;
  private token: string | null = null;

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  setToken(token: string): void {
    this.token = token;
  }

  getDeviceId(): string {
    return getDeviceId();
  }

  getStatus(): SyncStatus {
    return this.status;
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(status: SyncStatus, message?: string): void {
    this.status = status;
    this.listeners.forEach((listener) => listener(status, message));
  }

  private handleOnline(): void {
    this.isOnline = true;
    this.notify('idle', 'Back online');
    this.startAutoSync();
    this.processQueue();
  }

  private handleOffline(): void {
    this.isOnline = false;
    this.notify('offline', 'Gone offline');
    this.stopAutoSync();
  }

  startAutoSync(): void {
    if (this.syncInterval) return;
    this.syncInterval = window.setInterval(() => this.processQueue(), SYNC_INTERVAL);
  }

  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async recordOperation(operation: Omit<Operation, 'timestamp'>): Promise<void> {
    const db = await getDB();
    const op = {
      ...operation,
      timestamp: new Date().toISOString(),
      synced: false,
    };

    await db.add('operations', { id: `${operation.entity_id}_${Date.now()}`, ...op });

    if (this.isOnline && this.token) {
      this.processQueue();
    }
  }

  async processQueue(): Promise<void> {
    if (!this.isOnline || !this.token) return;

    this.notify('syncing', 'Syncing...');

    try {
      const db = await getDB();
      const pendingOps = await db.getAllFromIndex('operations', 'by-synced', 0);

      if (pendingOps.length === 0) {
        this.notify('idle', 'Synced');
        return;
      }

      const result = await sync.push(pendingOps, getDeviceId(), this.token);

      // Mark synced operations
      const tx = db.transaction('operations', 'readwrite');
      for (const op of pendingOps) {
        await tx.store.delete(op.id);
      }
      await tx.done;

      if (result.conflicts.length > 0) {
        this.notify('error', `${result.conflicts.length} conflicts`);
        console.warn('Sync conflicts:', result.conflicts);
      } else {
        this.notify('idle', `Synced ${result.synced_count} operations`);
      }
    } catch (error) {
      this.notify('error', 'Sync failed');
      console.error('Sync error:', error);
    }
  }

  async pullRemoteChanges(workflowId: string): Promise<Operation[]> {
    if (!this.isOnline || !this.token) return [];

    try {
      const db = await getDB();
      const meta = await db.get('sync_meta', workflowId);
      const since = meta?.last_sync_at;

      const result = await sync.pull(workflowId, getDeviceId(), this.token, since);

      // Update sync metadata
      await db.put('sync_meta', {
        key: workflowId,
        last_sync_at: result.server_time,
        device_id: getDeviceId(),
      });

      return result.operations;
    } catch (error) {
      console.error('Pull error:', error);
      return [];
    }
  }

  async resolveConflict(
    localOp: Operation,
    remoteOp: Operation
  ): Promise<'local' | 'remote'> {
    // Timestamp-based resolution: later timestamp wins
    const localTime = new Date(localOp.timestamp).getTime();
    const remoteTime = new Date(remoteOp.timestamp).getTime();

    return localTime > remoteTime ? 'local' : 'remote';
  }
}

export const syncEngine = new SyncEngine();