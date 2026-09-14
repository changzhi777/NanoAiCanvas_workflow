import { getDB, type AssetRecord } from './schema';

const MAX_CACHE_SIZE = 500 * 1024 * 1024; // 500MB
const LRU_CLEANUP_THRESHOLD = 0.9; // Clean up when 90% full

interface CachedAsset extends AssetRecord {
  local_blob?: Blob;
  last_accessed: number;
}

class AssetCache {
  private accessOrder: string[] = [];

  async cache(asset: AssetRecord, blob?: Blob): Promise<void> {
    const db = await getDB();
    const existingAsset = await db.get('assets', asset.id);
    const existingSize = existingAsset?.local_blob?.size || 0;
    const newSize = blob?.size || 0;

    // Check if we need to evict
    const currentSize = await this.getUsedSpace();
    if (currentSize + newSize - existingSize > MAX_CACHE_SIZE * LRU_CLEANUP_THRESHOLD) {
      await this.evictLRU(newSize - existingSize);
    }

    // Store asset with blob
    const cachedAsset: CachedAsset = {
      ...asset,
      local_blob: blob,
      last_accessed: Date.now(),
    };

    await db.put('assets', cachedAsset);
    this.updateAccessOrder(asset.id);
  }

  async get(assetId: string): Promise<CachedAsset | null> {
    const db = await getDB();
    const asset = await db.get('assets', assetId);

    if (asset) {
      asset.last_accessed = Date.now();
      await db.put('assets', asset);
      this.updateAccessOrder(assetId);
    }

    return asset as CachedAsset | null;
  }

  async getBlob(assetId: string): Promise<Blob | null> {
    const asset = await this.get(assetId);
    return asset?.local_blob || null;
  }

  async getUrl(assetId: string): Promise<string | null> {
    const asset = await this.get(assetId);
    if (!asset) return null;

    // Return local blob URL if available
    if (asset.local_blob) {
      return URL.createObjectURL(asset.local_blob);
    }

    // Fall back to remote URL
    return asset.url || null;
  }

  async remove(assetId: string): Promise<void> {
    const db = await getDB();
    const asset = await db.get('assets', assetId);

    if (asset?.local_blob) {
      URL.revokeObjectURL(asset.url);
    }

    await db.delete('assets', assetId);
    this.accessOrder = this.accessOrder.filter((id) => id !== assetId);
  }

  private updateAccessOrder(assetId: string): void {
    this.accessOrder = this.accessOrder.filter((id) => id !== assetId);
    this.accessOrder.push(assetId);
  }

  private async evictLRU(neededSpace: number): Promise<void> {
    const db = await getDB();
    let freedSpace = 0;

    while (freedSpace < neededSpace && this.accessOrder.length > 0) {
      const oldestId = this.accessOrder.shift();
      if (!oldestId) break;

      const asset = await db.get('assets', oldestId);
      if (asset?.local_blob) {
        freedSpace += asset.local_blob.size;
        URL.revokeObjectURL(asset.url);
        await db.delete('assets', oldestId);
      } else {
        await db.delete('assets', oldestId);
      }
    }
  }

  async getUsedSpace(): Promise<number> {
    const db = await getDB();
    const assets = await db.getAll('assets');
    return assets.reduce((sum, asset) => sum + (asset.local_blob?.size || 0), 0);
  }

  async clear(): Promise<void> {
    const db = await getDB();
    const assets = await db.getAll('assets');

    for (const asset of assets) {
      if (asset.local_blob) {
        URL.revokeObjectURL(asset.url);
      }
    }

    await db.clear('assets');
    this.accessOrder = [];
  }
}

export const assetCache = new AssetCache();