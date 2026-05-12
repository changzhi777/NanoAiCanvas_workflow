import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface AssetRecord {
  id: string;
  user_id?: string;
  type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'TEXT' | 'image' | 'video' | 'audio' | 'text' | 'storyboard_image' | 'storyboard_video' | 'tvc';
  name: string;
  url: string;
  thumbnail_url?: string;
  meta: Record<string, any>;
  category?: string;
  tags: string[];
  is_starred: boolean;
  workflow_snapshot?: any;
  local_blob?: Blob;
  sync_status?: 'synced' | 'pending' | 'error';
  created_at: string;
  updated_at?: string;
  last_accessed?: number;
}

interface NanoAIDB extends DBSchema {
  assets: {
    key: string;
    value: AssetRecord;
    indexes: {
      'by-user': string;
      'by-type': string;
      'by-category': string;
      'by-sync-status': string;
    };
  };
  operations: {
    key: string;
    value: {
      id: string;
      workflow_id: string;
      device_id: string;
      op_type: string;
      entity_type: string;
      entity_id: string;
      payload: Record<string, any>;
      timestamp: string;
      synced: boolean;
    };
    indexes: {
      'by-workflow': string;
      'by-synced': number;
    };
  };
  sync_meta: {
    key: string;
    value: {
      key: string;
      last_sync_at: string;
      device_id: string;
    };
  };
  pending_uploads: {
    key: string;
    value: {
      id: string;
      file: File;
      asset_id?: string;
      status: 'pending' | 'uploading' | 'failed';
      retries: number;
      created_at: string;
    };
    indexes: {
      'by-status': string;
    };
  };
}

const DB_NAME = 'nanoai-canvas-db';
const DB_VERSION = 3;

let dbInstance: IDBPDatabase<NanoAIDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<NanoAIDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<NanoAIDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Assets store
      if (!db.objectStoreNames.contains('assets')) {
        const assetStore = db.createObjectStore('assets', { keyPath: 'id' });
        assetStore.createIndex('by-user', 'user_id');
        assetStore.createIndex('by-type', 'type');
        assetStore.createIndex('by-category', 'category');
        assetStore.createIndex('by-sync-status', 'sync_status');
      }

      // Operations store
      if (!db.objectStoreNames.contains('operations')) {
        const opStore = db.createObjectStore('operations', { keyPath: 'id' });
        opStore.createIndex('by-workflow', 'workflow_id');
        opStore.createIndex('by-synced', 'synced');
      }

      // Sync metadata store
      if (!db.objectStoreNames.contains('sync_meta')) {
        db.createObjectStore('sync_meta', { keyPath: 'key' });
      }

      // Pending uploads store
      if (!db.objectStoreNames.contains('pending_uploads')) {
        db.createObjectStore('pending_uploads', { keyPath: 'id' });
      }
    },
  });

  return dbInstance;
}

export async function clearAssetCache(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('assets', 'readwrite');
  const store = tx.objectStore('assets');
  await store.clear();
  await tx.done;
}

export async function getCacheSize(): Promise<number> {
  const db = await getDB();
  const assets = await db.getAll('assets');
  return assets.reduce((sum, asset) => sum + (asset.local_blob?.size || 0), 0);
}