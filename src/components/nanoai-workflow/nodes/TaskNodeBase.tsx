import { memo, useCallback, useState } from 'react';
import { Handle, Position } from 'reactflow';
import { Play, AlertCircle, CheckCircle2, Loader2, Clock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNanoaiWorkflowStore, WorkflowNodeData, NodeStatus } from '@/stores/nanoaiWorkflowStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ==================== 类型定义 ====================

export interface ApiTaskParams {
  // API 配置
  apiType: 'minimax' | 'suchuang' | 'gpt' | 'custom' | 'jimeng' | 'glm' | 'qwen' | 'kimi';
  action: 'text' | 'speech' | 'image' | 'video' | 'music' | 'coding' | 'tts' | 'multimodal';
  model?: string;

  // 输入参数
  prompt?: string;
  inputText?: string;
  query?: string;
  systemPrompt?: string;

  // 生成参数
  temperature?: number;
  maxLength?: number;
  maxTokens?: number;
  size?: string;
  aspectRatio?: string;
  quality?: 'standard' | 'hd';
  voice?: string;
  speed?: number;
  duration?: number;

  // 参考图（用于溶图）
  referenceUrls?: string[];

  // 执行配置
  timeout?: number;
  retryCount?: number;

  // 输出类型
  outputType: 'text' | 'image' | 'audio' | 'video' | 'json';

  // 扩展参数
  [key: string]: any;
}

export interface ApiTaskNodeData extends WorkflowNodeData {
  params: ApiTaskParams;
}

// ==================== 参数 Schema 定义 ====================

interface ParamSchema {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number' | 'switch';
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
  defaultValue?: any;
  min?: number;
  max?: number;
}

// ==================== 组件 Props ====================

interface TaskNodeBaseProps {
  id: string;
  data: ApiTaskNodeData;
  icon: React.ReactNode;
  paramSchema: ParamSchema[];
  apiCall: (params: ApiTaskParams) => Promise<any>;
  defaultModel?: string;
}

// ==================== 状态指示器 ====================

interface StatusConfig {
  icon: typeof Clock;
  color: string;
  label: string;
  animate?: boolean;
}

const StatusIndicator = memo(({ status, className }: { status: NodeStatus; className?: string }) => {
  const config: Record<NodeStatus, StatusConfig> = {
    [NodeStatus.IDLE]: { icon: Clock, color: 'bg-gray-400', label: '空闲' },
    [NodeStatus.RUNNING]: { icon: Loader2, color: 'bg-blue-500', label: '运行中', animate: true },
    [NodeStatus.SUCCESS]: { icon: CheckCircle2, color: 'bg-green-500', label: '成功' },
    [NodeStatus.ERROR]: { icon: AlertCircle, color: 'bg-red-500', label: '错误' },
    [NodeStatus.DISABLED]: { icon: Zap, color: 'bg-gray-300', label: '禁用' },
  };

  const { icon: Icon, color, label, animate } = config[status] || config[NodeStatus.IDLE];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('relative flex items-center justify-center w-5 h-5', animate && 'animate-spin')}>
        <Icon className={cn('w-4 h-4', color.replace('bg-', 'text-'))} />
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
});

StatusIndicator.displayName = 'StatusIndicator';

// ==================== 参数编辑器 ====================

interface ParamEditorProps {
  params: ApiTaskParams;
  schema: ParamSchema[];
  onChange: (params: Partial<ApiTaskParams>) => void;
  disabled?: boolean;
}

const ParamEditor = memo(({ params, schema, onChange, disabled }: ParamEditorProps) => {
  const handleChange = (key: string, value: any) => {
    onChange({ [key]: value });
  };

  return (
    <div className="space-y-3">
      {schema.map((field) => {
        const value = params[field.key] ?? field.defaultValue;

        if (field.type === 'text') {
          return (
            <div key={field.key} className="space-y-1">
              <label className="text-xs text-muted-foreground">
                {field.label} {field.required && <span className="text-destructive">*</span>}
              </label>
              <Input
                value={value || ''}
                onChange={(e) => handleChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                disabled={disabled}
              />
            </div>
          );
        }

        if (field.type === 'textarea') {
          return (
            <div key={field.key} className="space-y-1">
              <label className="text-xs text-muted-foreground">
                {field.label} {field.required && <span className="text-destructive">*</span>}
              </label>
              <Textarea
                value={value || ''}
                onChange={(e) => handleChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                disabled={disabled}
                rows={3}
              />
            </div>
          );
        }

        if (field.type === 'select' && field.options) {
          return (
            <div key={field.key} className="space-y-1">
              <label className="text-xs text-muted-foreground">{field.label}</label>
              <Select
                value={String(value || field.defaultValue || '')}
                onValueChange={(v) => handleChange(field.key, v)}
                disabled={disabled}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="选择..." />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        }

        if (field.type === 'number') {
          return (
            <div key={field.key} className="space-y-1">
              <label className="text-xs text-muted-foreground">{field.label}</label>
              <Input
                type="number"
                value={value ?? field.defaultValue ?? ''}
                onChange={(e) => handleChange(field.key, Number(e.target.value))}
                disabled={disabled}
                min={field.min}
                max={field.max}
              />
            </div>
          );
        }

        return null;
      })}
    </div>
  );
});

ParamEditor.displayName = 'ParamEditor';

// ==================== 结果预览 ====================

interface ResultPreviewProps {
  result?: any;
  outputType: string;
}

const ResultPreview = memo(({ result, outputType }: ResultPreviewProps) => {
  if (!result) return null;

  if (outputType === 'image') {
    return (
      <div className="mt-2 p-2 bg-muted rounded-md">
        <img src={result.imageUrl || result.images?.[0]} alt="结果" className="max-h-24 rounded" />
        {result.images?.length > 1 && (
          <p className="text-xs text-muted-foreground mt-1">共 {result.images.length} 张图片</p>
        )}
      </div>
    );
  }

  if (outputType === 'text' && result.text) {
    return (
      <div className="mt-2 p-2 bg-muted rounded-md">
        <p className="text-xs text-muted-foreground line-clamp-3">{result.text}</p>
      </div>
    );
  }

  return null;
});

ResultPreview.displayName = 'ResultPreview';

// ==================== 执行按钮 ====================

interface ExecuteButtonProps {
  onExecute: () => void;
  status: NodeStatus;
  label?: string;
  disabled?: boolean;
}

const ExecuteButton = memo(({ onExecute, status, label = '执行', disabled }: ExecuteButtonProps) => {
  const isRunning = status === NodeStatus.RUNNING;

  return (
    <Button
      onClick={onExecute}
      disabled={disabled || isRunning}
      size="sm"
      className="w-full mt-3"
    >
      {isRunning ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          执行中...
        </>
      ) : (
        <>
          <Play className="w-4 h-4 mr-2" />
          {label}
        </>
      )}
    </Button>
  );
});

ExecuteButton.displayName = 'ExecuteButton';

// ==================== 主组件 ====================

export function TaskNodeBase({
  id,
  data,
  icon,
  paramSchema,
  apiCall,
}: TaskNodeBaseProps) {
  const { updateNode, updateNodeParams } = useNanoaiWorkflowStore();
  const [error, setError] = useState<string | null>(null);

  const handleParamsChange = useCallback((newParams: Partial<ApiTaskParams>) => {
    updateNodeParams(id, newParams);
  }, [id, updateNodeParams]);

  const handleExecute = useCallback(async () => {
    setError(null);
    // 更新状态为运行中
    updateNode(id, { status: NodeStatus.RUNNING });

    try {
      const result = await apiCall(data.params);
      updateNode(id, {
        status: NodeStatus.SUCCESS,
        result,
      });
    } catch (err: any) {
      setError(err.message || '执行失败');
      updateNode(id, {
        status: NodeStatus.ERROR,
        error: err.message || '未知错误',
      });
    }
  }, [id, data.params, apiCall, updateNode]);

  const isDisabled = data.status === NodeStatus.DISABLED;
  const hasError = data.status === NodeStatus.ERROR;

  return (
    <div className={cn(
      'w-80 bg-card border rounded-lg shadow-sm overflow-hidden',
      hasError && 'border-destructive',
      isDisabled && 'opacity-50'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-sm">API调用任务</span>
        </div>
        <StatusIndicator status={data.status} />
      </div>

      {/* Body */}
      <div className="p-3">
        {/* 输入/输出 Handles */}
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 border-2 bg-background"
          id="input"
        />

        <ParamEditor
          params={data.params}
          schema={paramSchema}
          onChange={handleParamsChange}
          disabled={isDisabled || data.status === NodeStatus.RUNNING}
        />

        {/* 错误信息 */}
        {error && (
          <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
            {error}
          </div>
        )}

        {/* 结果预览 */}
        <ResultPreview result={data.result} outputType={data.params.outputType} />

        <ExecuteButton
          onExecute={handleExecute}
          status={data.status}
          label="执行"
          disabled={isDisabled}
        />

        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 border-2 bg-background"
          id="output"
        />
      </div>
    </div>
  );
}

export default TaskNodeBase;