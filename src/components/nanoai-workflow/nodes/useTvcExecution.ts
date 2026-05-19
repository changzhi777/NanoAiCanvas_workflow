/**
 * TVC 执行逻辑 Hook
 * 从 TvcScriptNode 抽离分步/一键执行逻辑
 */

import { useCallback, useState } from 'react';
import { useToast } from '@/hooks/useToast';
import { NodeStatus } from '@/stores/nanoaiWorkflowStore';
import { tvcApi } from '@/lib/api/tvc-api';
import { tvcProjectsApi } from '@/lib/api/tvc-projects-api';
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
        shotCount: params.shotCount,
        shotDuration: params.shotDuration,
        totalDuration: params.totalDuration,
        style: params.style,
        modelProvider: config.provider,
        model: config.model,
        cameraMovement: params.cameraMovement,
        lightStyle: params.lightStyle,
        negativePrompts: params.negativePrompts,
      });

      updateNode(nodeId, {
        status: NodeStatus.SUCCESS,
        result: { ...data.result, script: response.script },
      });

      // 自动创建/更新 TVC 项目
      try {
        const script = response.script;
        const projectId = data.result?.tvcProjectId;
        const shots = (script?.shots || []).map((s: any, i: number) => ({
          shot_index: i,
          scene_number: s.scene_number,
          scene_description: s.scene_description,
          video_prompt: s.video_prompt,
          start_frame_prompt: s.start_frame_prompt,
          end_frame_prompt: s.end_frame_prompt,
          bgm_mood: s.bgm_mood,
          duration: script.shot_duration || 5,
          dialogue: s.dialogue,
          status: 'pending' as const,
        }));

        if (projectId) {
          await tvcProjectsApi.linkTaskResult(projectId, { script, shots });
        } else {
          const created = await tvcProjectsApi.create({
            name: script?.tvc_title || `TVC ${new Date().toLocaleDateString('zh-CN')}`,
            original_text: params.inputText,
          });
          await tvcProjectsApi.linkTaskResult(created.id, { script, shots });
          updateNode(nodeId, {
            result: { ...data.result, script, tvcProjectId: created.id },
          });
        }
      } catch (e) { console.warn('[useTvcExecution.ts]', e)
        // 项目创建失败不影响主流程
      }

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
      } catch (e) { console.warn('[useTvcExecution.ts]', e)
        // 积分服务不可用时放行
      }

      const submitParams = {
        workflowId: `wf-tvc-${nodeId}`,
        prompt: params.inputText,
        shotCount: params.shotCount || 6,
        shotDuration: params.shotDuration || 5,
        totalDuration: params.totalDuration || 30,
        style: params.style,
        optimizeMode: params.optimizeMode,
        imageModel: params.imageModel,
        videoModel: params.videoModel,
        styleReference,
        scriptModel: params.scriptModel,
        optimizeModel: params.optimizeModel,
        bgmModel: params.bgmModel,
        quality: params.quality,
        cameraMovement: params.cameraMovement,
        lightStyle: params.lightStyle,
        negativePrompts: params.negativePrompts,
      };

      let response;
      try {
        response = await tvcApi.submitTask(submitParams);
      } catch (submitErr: any) {
        // 团队积分不足，确认后用个人积分重试
        const msg = submitErr?.message || String(submitErr);
        if (submitErr?.status === 402 && msg.includes('团队积分不足')) {
          const confirmed = window.confirm(`${msg}\n\n是否使用个人积分支付？`);
          if (!confirmed) return;
          response = await tvcApi.submitTask({
            ...submitParams,
            forcePersonalPoints: true,
          });
        } else {
          throw submitErr;
        }
      }

      toast.success('TVC 后台任务已提交');

      // 自动创建 TVC 项目
      let tvcProjectId = data.result?.tvcProjectId;
      try {
        if (!tvcProjectId) {
          const created = await tvcProjectsApi.create({
            name: `TVC ${new Date().toLocaleDateString('zh-CN')}`,
            original_text: params.inputText,
          });
          tvcProjectId = created.id;
        }
        await tvcProjectsApi.update(tvcProjectId, { task_id: response.task_id, status: 'processing' });
      } catch (e) { console.warn('[useTvcExecution.ts]', e)
        // 项目创建失败不影响主流程
      }

      updateNode(nodeId, {
        status: NodeStatus.RUNNING,
        result: { ...data.result, taskId: response.task_id, tvcProjectId },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`任务提交失败: ${message}`);
    }
  }, [nodeId, data, updateNodeParams, updateNode, toast]);

  return { isExecuting, executeStep, executeAuto };
}
