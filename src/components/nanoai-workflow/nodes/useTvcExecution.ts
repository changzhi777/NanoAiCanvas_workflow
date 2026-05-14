/**
 * TVC 执行逻辑 Hook
 * 从 TvcScriptNode 抽离分步/一键执行逻辑
 */

import { useCallback, useState } from 'react';
import { useToast } from '@/hooks/useToast';
import { NodeStatus } from '@/stores/nanoaiWorkflowStore';
import { tvcApi } from '@/lib/api/tvc-api';
import { GLM_CONFIG } from '@/config/glm';
import type { TvcScriptData } from './TvcScriptNode';

export interface TvcModelConfig {
  label: string;
  model: string;
  provider: 'glm' | 'minimax';
  thinking: boolean;
}

export function getTvcModelConfig(mode: string): TvcModelConfig {
  const allLabels = GLM_CONFIG.TVC_MODEL_LABELS as Record<string, any>;
  const entry = allLabels[mode];
  if (!entry) {
    return { label: '深度分析优化', model: 'glm-5.1', provider: 'glm', thinking: true };
  }
  return {
    label: entry.label as string,
    model: entry.model as string,
    provider: (entry.provider as 'glm' | 'minimax') ?? 'glm',
    thinking: !!entry.thinking,
  };
}

export function useTvcExecution(
  nodeId: string,
  data: TvcScriptData,
  updateNodeParams: (nodeId: string, params: Record<string, any>) => void,
  updateNode: (nodeId: string, updates: Record<string, any>) => void,
) {
  const { toast } = useToast();
  const [isExecuting, setIsExecuting] = useState(false);

  const executeStep = useCallback(async () => {
    const params = data.params;
    if (!params.inputText.trim()) {
      toast.error('请先输入 TVC 描述');
      return;
    }

    setIsExecuting(true);
    updateNode(nodeId, { status: NodeStatus.RUNNING });

    const config = getTvcModelConfig(params.optimizeMode);

    try {
      const response = await tvcApi.generateScript({
        prompt: params.inputText,
        style: params.style,
        modelProvider: config.provider,
        model: config.model,
      });

      updateNode(nodeId, {
        status: NodeStatus.SUCCESS,
        result: { ...data.result, script: response.script },
      });
      toast.success('TVC 脚本生成完成');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      updateNode(nodeId, { status: NodeStatus.ERROR, error: message });
      toast.error(`脚本生成失败: ${message}`);
    } finally {
      setIsExecuting(false);
    }
  }, [nodeId, data, updateNodeParams, updateNode, toast]);

  const executeAuto = useCallback(async () => {
    const params = data.params;
    if (!params.inputText.trim()) {
      toast.error('请先输入 TVC 描述');
      return;
    }

    updateNodeParams(nodeId, { executionMode: 'auto' });

    try {
      const styleReference = data.result?.analysis?.tvc_style_reference || undefined;

      // 积分预检
      try {
        const estimate = await tvcApi.estimatePoints({
          shotCount: params.shotCount || 6,
          includeBgm: true,
        });
        if (!estimate.sufficient) {
          toast.error(`积分不足：需要 ${estimate.total}，当前余额 ${estimate.balance}`);
          return;
        }
      } catch {
        // 积分服务不可用时放行
      }

      const response = await tvcApi.submitTask({
        workflowId: `wf-tvc-${nodeId}`,
        prompt: params.inputText,
        shotCount: params.shotCount || 6,
        shotDuration: params.shotDuration || 5,
        totalDuration: params.totalDuration || 30,
        style: params.style,
        optimizeMode: params.optimizeMode,
        imageModel: params.imageModel || 'jimeng',
        videoModel: params.videoModel || 'jimeng',
        styleReference,
      });

      toast.success('TVC 后台任务已提交');
      updateNode(nodeId, {
        status: NodeStatus.RUNNING,
        result: { ...data.result, taskId: response.task_id },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`任务提交失败: ${message}`);
    }
  }, [nodeId, data, updateNodeParams, updateNode, toast]);

  return { isExecuting, executeStep, executeAuto };
}
