import { useEffect, useCallback } from 'react';
import { getDB, type AssetRecord } from '../db/schema';
import { assetCache } from '../db/AssetCache';
import { assets as apiAssets, type AssetCreate } from '../api/client';

interface AssetCollectorOptions {
  userId: string;
  token: string;
}

interface NodeResult {
  images?: string[];
  imageUrl?: string;
  video_url?: string;
  audio_url?: string;
  text?: string;
  content?: any;
  items?: any[];
  duration?: number;
  thumbnail?: string;
}

interface WorkflowNodeData {
  id: string;
  type: string;
  label: string;
  params: Record<string, any>;
  result?: NodeResult;
}

interface WorkflowData {
  nodes: WorkflowNodeData[];
  edges: any[];
}

function inferCategory(nodeType: string): string | undefined {
  const typeMap: Record<string, string> = {
    character_designer: 'CHARACTER',
    character: 'CHARACTER',
    scene_designer: 'SCENE',
    scene: 'SCENE',
    storyboard_generator: 'STORYBOARD',
    storyboard: 'STORYBOARD',
  };
  return typeMap[nodeType.toLowerCase()];
}

function extractAssetsFromNode(
  node: WorkflowNodeData,
  workflowId: string
): AssetCreate[] {
  const result = node.result;
  if (!result) return [];

  const assets: AssetCreate[] = [];

  const images = result.images || (result.imageUrl ? [result.imageUrl] : []);
  images.forEach((url, idx) => {
    assets.push({
      type: 'IMAGE',
      name: result.items?.[idx]?.name || `${node.label}_${idx + 1}`,
      url,
      thumbnail_url: result.thumbnail,
      metadata: {
        prompt: node.params.prompt,
        model: node.params.model,
        sourceNodeId: node.id,
        sourceWorkflowId: workflowId,
      },
      category: inferCategory(node.type),
      workflow_snapshot: { nodes: [], edges: [] },
    });
  });

  if (result.video_url) {
    assets.push({
      type: 'VIDEO',
      name: `${node.label}_video`,
      url: result.video_url,
      thumbnail_url: result.thumbnail,
      metadata: {
        prompt: node.params.prompt,
        duration: result.duration,
        sourceNodeId: node.id,
        sourceWorkflowId: workflowId,
      },
      category: inferCategory(node.type),
    });
  }

  if (result.audio_url) {
    assets.push({
      type: 'AUDIO',
      name: `${node.label}_audio`,
      url: result.audio_url,
      metadata: {
        prompt: node.params.prompt,
        duration: result.duration,
        sourceNodeId: node.id,
        sourceWorkflowId: workflowId,
      },
    });
  }

  return assets;
}

// Asset(API) → AssetRecord(IndexedDB) 映射
function toAssetRecord(asset: { id: string; type: string; name: string; url: string; thumbnail_url?: string; metadata?: Record<string, any>; category?: string; tags: string[]; is_starred: boolean; workflow_snapshot?: any; version?: string; created_at: string }, userId: string, syncStatus: 'synced' | 'pending' = 'synced'): AssetRecord {
  return {
    id: asset.id,
    type: asset.type as AssetRecord['type'],
    name: asset.name,
    url: asset.url,
    thumbnail_url: asset.thumbnail_url,
    meta: asset.metadata || {},
    category: asset.category,
    tags: asset.tags || [],
    is_starred: asset.is_starred || false,
    workflow_snapshot: asset.workflow_snapshot,
    user_id: userId,
    sync_status: syncStatus,
    created_at: asset.created_at,
    updated_at: new Date().toISOString(),
  };
}

export function useAssetCollector(options: AssetCollectorOptions) {
  const { userId, token } = options;

  const collectAssets = useCallback(
    async (workflowId: string, workflowData: WorkflowData) => {
      const db = await getDB();
      const collectedAssets: string[] = [];

      for (const node of workflowData.nodes) {
        if (!node.result) continue;

        const assetCreates = extractAssetsFromNode(node, workflowId);

        for (const assetData of assetCreates) {
          try {
            const remoteAsset = await apiAssets.create(assetData, token);
            const localRecord = toAssetRecord(remoteAsset, userId);
            await db.put('assets', localRecord);
            collectedAssets.push(remoteAsset.id);

            try {
              const response = await fetch(remoteAsset.url);
              if (response.ok) {
                const blob = await response.blob();
                await assetCache.cache(localRecord, blob);
              }
            } catch { /* ignore cache errors */ }
          } catch (error) {
            console.error('Failed to save asset:', error);

            const localAsset: AssetRecord = {
              id: `local_${Date.now()}`,
              type: assetData.type as AssetRecord['type'],
              name: assetData.name,
              url: assetData.url,
              thumbnail_url: assetData.thumbnail_url,
              meta: assetData.metadata || {},
              category: assetData.category,
              tags: assetData.tags || [],
              is_starred: false,
              workflow_snapshot: assetData.workflow_snapshot,
              user_id: userId,
              sync_status: 'pending',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            await db.put('assets', localAsset);
            collectedAssets.push(localAsset.id);
          }
        }
      }

      return collectedAssets;
    },
    [userId, token]
  );

  const syncPendingAssets = useCallback(async () => {
    const db = await getDB();
    const pending = await db.getAllFromIndex('assets', 'by-sync-status', 'pending');

    for (const asset of pending) {
      if (asset.id.startsWith('local_')) {
        try {
          const assetData: AssetCreate = {
            type: asset.type,
            name: asset.name,
            url: asset.url,
            thumbnail_url: asset.thumbnail_url,
            metadata: asset.meta,
            category: asset.category,
            tags: asset.tags,
            workflow_snapshot: asset.workflow_snapshot,
          };
          const remoteAsset = await apiAssets.create(assetData, token);

          await db.put('assets', {
            ...asset,
            id: remoteAsset.id,
            sync_status: 'synced',
          });
        } catch (error) {
          console.error('Failed to sync asset:', error);
        }
      }
    }
  }, [token]);

  useEffect(() => {
    const handleOnline = () => { syncPendingAssets(); };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [syncPendingAssets]);

  return {
    collectAssets,
    syncPendingAssets,
  };
}
