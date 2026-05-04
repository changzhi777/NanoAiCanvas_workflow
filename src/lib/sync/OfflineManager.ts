import { getDB } from '../db/schema';

export type NetworkStatus = 'online' | 'offline';

type StatusListener = (status: NetworkStatus) => void;

class OfflineManager {
  private listeners: Set<StatusListener> = new Set();
  private status: NetworkStatus = navigator.onLine ? 'online' : 'offline';

  constructor() {
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  getStatus(): NetworkStatus {
    return this.status;
  }

  isOnline(): boolean {
    return this.status === 'online';
  }

  subscribe(listener: StatusListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private handleOnline(): void {
    this.status = 'online';
    this.listeners.forEach((listener) => listener('online'));
    this.processPendingUploads();
  }

  private handleOffline(): void {
    this.status = 'offline';
    this.listeners.forEach((listener) => listener('offline'));
  }

  async getPendingUploads(): Promise<Array<{ id: string; file: File; retries: number }>> {
    const db = await getDB();
    const pending = await db.getAll('pending_uploads');
    return pending.map((p) => ({ id: p.id, file: p.file, retries: p.retries }));
  }

  async addPendingUpload(file: File): Promise<string> {
    const id = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const db = await getDB();

    await db.add('pending_uploads', {
      id,
      file,
      status: 'pending',
      retries: 0,
      created_at: new Date().toISOString(),
    });

    if (this.isOnline()) {
      this.processPendingUploads();
    }

    return id;
  }

  async removePendingUpload(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('pending_uploads', id);
  }

  async processPendingUploads(): Promise<void> {
    if (!this.isOnline()) return;

    const db = await getDB();
    const pending = await db.getAllFromIndex('pending_uploads', 'by-status', 'pending');

    for (const item of pending) {
      try {
        await db.put('pending_uploads', { ...item, status: 'uploading' });

        // Here you would upload to your asset storage
        // For now, just mark as success
        await db.delete('pending_uploads', item.id);
      } catch (error) {
        const retries = item.retries + 1;
        if (retries >= 3) {
          await db.put('pending_uploads', { ...item, status: 'failed', retries });
        } else {
          await db.put('pending_uploads', { ...item, status: 'pending', retries });
        }
      }
    }
  }
}

export const offlineManager = new OfflineManager();