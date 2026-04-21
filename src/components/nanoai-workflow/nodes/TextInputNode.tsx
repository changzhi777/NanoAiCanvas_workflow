import { useCallback, useState } from 'react';
import { Type, FileText } from 'lucide-react';
import { NodeProps } from 'reactflow';
import { useNanoaiWorkflowStore, NodeStatus, WorkflowNodeData } from '@/stores/nanoaiWorkflowStore';
import { BaseNode, ParamEditor, ExecuteButton } from './BaseNode';
import { useTheme } from '../ui/Theme';
import { cn } from '@/lib/utils';

export interface TextInputNodeData extends WorkflowNodeData {
  params: {
    inputType: 'text' | 'multiline' | 'code';
    placeholder?: string;
    maxLength?: number;
    defaultValue?: string;
    rows?: number;
  };
  result?: {
    text?: string;
    charCount?: number;
    wordCount?: number;
  };
}

export const TextInputNode = ({ id, data }: NodeProps<TextInputNodeData>) => {
  const { isDark } = useTheme();
  const { updateNode, updateNodeParams } = useNanoaiWorkflowStore();
  const [inputValue, setInputValue] = useState(data.params.defaultValue || '');

  const handleExecute = useCallback(() => {
    updateNode(id, { status: NodeStatus.RUNNING });

    // 文本输入节点立即返回结果
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

  const paramSchema = [
    {
      key: 'inputType',
      label: '输入类型',
      type: 'select' as const,
      options: [
        { label: '单行文本', value: 'text' },
        { label: '多行文本', value: 'multiline' },
        { label: '代码', value: 'code' },
      ],
      defaultValue: 'multiline',
    },
    {
      key: 'placeholder',
      label: '占位符',
      type: 'text' as const,
      placeholder: '请输入占位符提示...',
      defaultValue: '请输入内容...',
    },
    {
      key: 'maxLength',
      label: '最大长度',
      type: 'number' as const,
      defaultValue: 1000,
    },
  ];

  const handleParamsChange = useCallback((params: Record<string, any>) => {
    // 参数已通过ParamEditor更新到data.params中
    console.log('文本输入参数已更新:', params);
  }, []);

  return (
    <BaseNode
      data={data}
      icon={<Type className="w-5 h-5" />}
      headerAction={
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
             style={{ background: 'rgba(148, 163, 184, 0.1)', color: '#898989' }}>
          <FileText className="w-3 h-3" />
          <span>输入</span>
        </div>
      }
    >
      <ParamEditor params={data.params} onChange={handleParamsChange} schema={paramSchema} />
      <ExecuteButton onExecute={handleExecute} status={data.status} label="确认输入" />

      {/* 文本输入区 */}
      <div className="mt-3">
        {data.params.inputType === 'text' && (
          <input
            type="text"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={data.params.placeholder}
            maxLength={data.params.maxLength}
            className={cn(
              'w-full px-3 py-2 rounded-lg border transition-all duration-200',
              'focus:outline-none focus:ring-2',
              isDark
                ? 'bg-[#0f0f0f] border-[#2e2e2e] text-[#fafafa] focus:border-[#3ecf8e] focus:ring-[#3ecf8e]/20'
                : 'bg-white border-gray-300 text-gray-900 focus:border-[#3ecf8e] focus:ring-[#3ecf8e]/20'
            )}
          />
        )}

        {(data.params.inputType === 'multiline' || data.params.inputType === 'code') && (
          <textarea
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={data.params.placeholder}
            maxLength={data.params.maxLength}
            rows={data.params.inputType === 'code' ? 8 : 4}
            className={cn(
              'w-full px-3 py-2 rounded-lg border transition-all duration-200 resize-none',
              'focus:outline-none focus:ring-2 font-mono text-xs',
              isDark
                ? 'bg-[#0f0f0f] border-[#2e2e2e] text-[#fafafa] focus:border-[#3ecf8e] focus:ring-[#3ecf8e]/20'
                : 'bg-white border-gray-300 text-gray-900 focus:border-[#3ecf8e] focus:ring-[#3ecf8e]/20'
            )}
            style={{
              fontFamily: data.params.inputType === 'code'
                ? '"Source Code Pro", monospace'
                : 'inherit'
            }}
          />
        )}

        {/* 字数统计 */}
        {inputValue && (
          <div className="mt-2 flex items-center justify-between text-xs" style={{ color: '#898989' }}>
            <span>字符数: {inputValue.length}</span>
            <span>词数: {inputValue.split(/\s+/).filter(w => w.length > 0).length}</span>
          </div>
        )}
      </div>

      {/* 执行结果 */}
      {data.status === NodeStatus.SUCCESS && data.result && (
        <div className="mt-3 p-3 rounded-lg border" style={{
          background: 'rgba(62, 207, 142, 0.1)',
          borderColor: 'rgba(62, 207, 142, 0.3)',
        }}>
          <div className="text-sm font-semibold mb-1" style={{ color: '#3ecf8e' }}>
            ✓ 输入成功
          </div>
          <div className="text-xs space-y-1" style={{ color: '#898989' }}>
            <div>字符数: {data.result.charCount}</div>
            <div>词数: {data.result.wordCount}</div>
            <div className="mt-2 p-2 rounded truncate" style={{
              background: isDark ? '#242424' : '#e5e7eb',
              fontFamily: 'monospace',
              fontSize: '11px'
            }}>
              {data.result.text?.substring(0, 100)}
              {data.result.text && data.result.text.length > 100 && '...'}
            </div>
          </div>
        </div>
      )}
    </BaseNode>
  );
};

TextInputNode.displayName = 'TextInputNode';

export default TextInputNode;
