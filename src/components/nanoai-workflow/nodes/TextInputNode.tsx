import { useCallback, useState } from 'react';
import { Type, FileText, Sparkles, Wand2, ChevronDown, ChevronUp } from 'lucide-react';
import { NodeProps } from 'reactflow';
import { useNanoaiWorkflowStore, NodeStatus, WorkflowNodeData } from '@/stores/nanoaiWorkflowStore';
import { BaseNode, ExecuteButton } from './BaseNode';
import { useTheme } from '../ui/Theme';
import { cn } from '@/lib/utils';
import { IMERawTextarea } from '../ui/IMEInput';

export interface TextInputNodeData extends WorkflowNodeData {
  params: {
    inputType: 'text' | 'multiline' | 'code';
    placeholder?: string;
    maxLength?: number;
    defaultValue?: string;
    rows?: number;
    showPromptGuide?: boolean;
    promptGuide?: string;
  };
  result?: {
    text?: string;
    charCount?: number;
    wordCount?: number;
  };
}

const DEFAULT_PROMPT_GUIDE = `角色描述指南：
• 三视图：正面、侧面、背面三个角度的完整人物形象
• 脸部特写：微笑表情的细腻刻画
• 人物特征：发型、服装、体型、姿态等细节描述
• 背景环境：场景氛围、光线效果等

请输入您想要设计的角色描述...`;

export const TextInputNode = ({ id, data }: NodeProps<TextInputNodeData>) => {
  const { isDark } = useTheme();
  const { updateNode, updateNodeParams } = useNanoaiWorkflowStore();
  const [inputValue, setInputValue] = useState(data.params.defaultValue || '');
  const [showGuide, setShowGuide] = useState(true);

  const handleExecute = useCallback(() => {
    updateNode(id, { status: NodeStatus.RUNNING });

    setTimeout(() => {
      updateNode(id, {
        status: NodeStatus.SUCCESS,
        result: {
          text: inputValue,
          charCount: inputValue.length,
          wordCount: inputValue.split(/\s+/).filter(w => w.length > 0).length,
        },
      });
    }, 500);
  }, [id, inputValue, updateNode]);

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    updateNodeParams(id, { defaultValue: value });
  }, [id, updateNodeParams]);

  return (
    <BaseNode
      data={data}
      icon={<Type className="w-5 h-5" />}
      headerAction={
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
             style={{ background: 'rgba(148, 163, 184, 0.1)', color: '#898989' }}>
          <FileText className="w-3 h-3" />
          <span>角色输入</span>
        </div>
      }
    >
      {/* 提示词指南折叠面板 */}
      <div className="mt-3 rounded-xl border overflow-hidden" style={{
        background: isDark ? '#171717' : '#f8fafc',
        borderColor: isDark ? '#2e2e2e' : '#e2e8f0',
      }}>
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full px-4 py-3 flex items-center justify-between text-left transition-colors hover:bg-white/5"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#3ecf8e]" />
            <span className="text-sm font-medium" style={{ color: isDark ? '#fafafa' : '#1e293b' }}>
              角色描述指南
            </span>
          </div>
          {showGuide ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {showGuide && (
          <div className="px-4 pb-4">
            <div className="p-3 rounded-lg text-xs leading-relaxed whitespace-pre-line" style={{
              background: isDark ? '#0f0f0f' : '#f1f5f9',
              color: isDark ? '#a1a1aa' : '#64748b',
              fontFamily: 'monospace',
            }}>
              {data.params.promptGuide || DEFAULT_PROMPT_GUIDE}
            </div>
          </div>
        )}
      </div>

      {/* 主文本输入区 */}
      <div className="mt-3">
        <label className="block text-sm font-medium mb-2" style={{ color: isDark ? '#fafafa' : '#374151' }}>
          角色描述内容
        </label>
        <IMERawTextarea
          value={inputValue}
          onChange={(v) => handleInputChange(v)}
          placeholder="请输入角色描述：三视图+脸部特写..."
          rows={6}
          className={cn(
            'w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 resize-none',
            'focus:outline-none focus:ring-2 text-sm leading-relaxed',
            isDark
              ? 'bg-[#0f0f0f] border-[#2e2e2e] text-[#fafafa] placeholder:text-gray-600'
              : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400'
          )}
          style={{
            fontFamily: '"Inter", system-ui, sans-serif',
          }}
        />

        {/* 底部状态栏 */}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs" style={{ color: '#898989' }}>
            <span>{inputValue.length} / {data.params.maxLength || 2000} 字符</span>
            <span>•</span>
            <span>{inputValue.split(/\s+/).filter(w => w.length > 0).length} 词</span>
          </div>

          {inputValue.length > 0 && (
            <button
              onClick={() => setInputValue('')}
              className="text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors"
              style={{ color: '#898989' }}
            >
              清空
            </button>
          )}
        </div>
      </div>

      <ExecuteButton onExecute={handleExecute} status={data.status} label="确认输入" />

      {/* 执行结果 */}
      {data.status === NodeStatus.SUCCESS && data.result && (
        <div className="mt-3 p-4 rounded-xl border-2" style={{
          background: 'rgba(62, 207, 142, 0.08)',
          borderColor: 'rgba(62, 207, 142, 0.3)',
        }}>
          <div className="flex items-center gap-2 mb-2">
            <Wand2 className="w-4 h-4 text-[#3ecf8e]" />
            <span className="text-sm font-semibold" style={{ color: '#3ecf8e' }}>
              输入已确认
            </span>
          </div>
          <div className="p-3 rounded-lg truncate" style={{
            background: isDark ? '#242424' : '#e5e7eb',
            fontFamily: 'monospace',
            fontSize: '12px',
            color: isDark ? '#a1a1aa' : '#64748b',
          }}>
            {data.result.text?.substring(0, 150)}
            {data.result.text && data.result.text.length > 150 && '...'}
          </div>
        </div>
      )}
    </BaseNode>
  );
};

TextInputNode.displayName = 'TextInputNode';

export default TextInputNode;
