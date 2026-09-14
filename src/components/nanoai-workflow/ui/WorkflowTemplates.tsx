import { useState, useMemo } from 'react';
import {
  FileText, Film, Mic, User, Mountain, Star, Lock,
  Brain, PenTool, Flag, Image, Video, Layers, Code, MessageSquare, Music, Save,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from './Theme';
import { WorkflowNodeType } from '@/stores/nanoaiWorkflowStore';
import { useAppVisibilityStore, isVisible, isActive } from '@/stores/appVisibilityStore';

interface NodeTypeConfig {
  type: WorkflowNodeType;
  label: string;
  icon: React.ReactNode;
  description: string;
  group: string;
  tags?: string[];
  isNew?: boolean;
  popular?: boolean;
}

// ==================== 节点类型配置 ====================

const BASE_AI_NODES: NodeTypeConfig[] = [
  { type: WorkflowNodeType.SCRIPT_GENERATOR, label: '脚本生成', icon: <FileText className="w-5 h-5" />, description: '生成故事脚本', group: 'base', tags: ['文本'], popular: true },
  { type: WorkflowNodeType.STORYBOARD_GENERATOR, label: '分镜头生成', icon: <Film className="w-5 h-5" />, description: '生成分镜图片', group: 'base', tags: ['图片'], popular: true },
  { type: WorkflowNodeType.STORYBOARD_SHOT_A, label: '故事板分镜V1版', icon: <Film className="w-5 h-5" />, description: '输入描述→优化提示词→生成分镜图', group: 'base', tags: ['图片', '分镜', '故事板'], popular: true },
  { type: WorkflowNodeType.DIALOGUE_GENERATOR, label: '对白生成', icon: <Mic className="w-5 h-5" />, description: '生成语音', group: 'base', tags: ['音频'] },
  { type: WorkflowNodeType.CHARACTER_DESIGNER, label: '角色设计', icon: <User className="w-5 h-5" />, description: '生成角色设计图', group: 'base', tags: ['图片', '角色'], popular: true },
  { type: WorkflowNodeType.SCENE_DESIGNER, label: '场景设计', icon: <Mountain className="w-5 h-5" />, description: '生成场景设计图', group: 'base', tags: ['图片', '场景'], isNew: true },
  { type: WorkflowNodeType.DIRECTOR_AGENT, label: '导演Agent', icon: <Brain className="w-5 h-5" />, description: '智能决策和流程控制', group: 'base', tags: ['决策', '逻辑'], isNew: true },
  { type: WorkflowNodeType.SCREENWRITER_AGENT, label: '编剧Agent', icon: <PenTool className="w-5 h-5" />, description: '创意处理和内容优化', group: 'base', tags: ['创意', '优化'], isNew: true },
  { type: WorkflowNodeType.MILESTONE, label: '里程碑', icon: <Flag className="w-5 h-5" />, description: '预览成果展示', group: 'base', tags: ['预览', '展示'], isNew: true },
];

const JIMENG_NODES: NodeTypeConfig[] = [
  { type: WorkflowNodeType.JIMENG_IMAGE, label: '即梦图片生成', icon: <Image className="w-5 h-5" />, description: '即梦AI图片生成', group: 'jimeng', tags: ['图片', '即梦'], isNew: true },
  { type: WorkflowNodeType.JIMENG_VIDEO, label: '即梦视频生成', icon: <Video className="w-5 h-5" />, description: '即梦AI视频生成', group: 'jimeng', tags: ['视频', '即梦'], isNew: true },
];

const GLM_NODES: NodeTypeConfig[] = [
  { type: WorkflowNodeType.GLM_TEXT, label: '智谱文本生成', icon: <FileText className="w-5 h-5" />, description: '智谱GLM文本生成', group: 'glm', tags: ['文本', '智谱'], isNew: true },
  { type: WorkflowNodeType.GLM_VIDEO, label: '智谱视频生成', icon: <Video className="w-5 h-5" />, description: '智谱GLM视频生成', group: 'glm', tags: ['视频', '智谱'], isNew: true },
  { type: WorkflowNodeType.GLM_TTS, label: '智谱TTS', icon: <Mic className="w-5 h-5" />, description: '智谱GLM语音合成', group: 'glm', tags: ['音频', 'TTS', '智谱'], isNew: true },
  { type: WorkflowNodeType.GLM_MULTIMODAL, label: '智谱多模态', icon: <Layers className="w-5 h-5" />, description: '智谱GLM多模态理解', group: 'glm', tags: ['多模态', '智谱'], isNew: true },
];

const QWEN_NODES: NodeTypeConfig[] = [
  { type: WorkflowNodeType.QWEN_TEXT, label: '通义文本生成', icon: <FileText className="w-5 h-5" />, description: '通义千问文本生成', group: 'qwen', tags: ['文本', '通义'], isNew: true },
  { type: WorkflowNodeType.QWEN_CODING, label: '通义代码生成', icon: <Code className="w-5 h-5" />, description: '通义千问代码生成', group: 'qwen', tags: ['代码', '通义'], isNew: true },
];

const KIMI_NODES: NodeTypeConfig[] = [
  { type: WorkflowNodeType.KIMI_TEXT, label: 'Kimi文本生成', icon: <MessageSquare className="w-5 h-5" />, description: 'Kimi文本生成', group: 'kimi', tags: ['文本', 'Kimi'], isNew: true },
];

const MINIMAX_NODES: NodeTypeConfig[] = [
  { type: WorkflowNodeType.MINIMAX_TEXT, label: 'MiniMax文本', icon: <FileText className="w-5 h-5" />, description: 'MiniMax文本生成', group: 'minimax', tags: ['文本', 'MiniMax'], isNew: true },
  { type: WorkflowNodeType.MINIMAX_SPEECH, label: 'MiniMax语音', icon: <Mic className="w-5 h-5" />, description: 'MiniMax语音合成', group: 'minimax', tags: ['音频', 'MiniMax'], isNew: true },
  { type: WorkflowNodeType.MINIMAX_VIDEO, label: 'MiniMax视频', icon: <Video className="w-5 h-5" />, description: 'MiniMax视频生成', group: 'minimax', tags: ['视频', 'MiniMax'], isNew: true },
  { type: WorkflowNodeType.MINIMAX_MUSIC, label: 'MiniMax音乐', icon: <Music className="w-5 h-5" />, description: 'MiniMax音乐生成', group: 'minimax', tags: ['音频', '音乐', 'MiniMax'], isNew: true },
  { type: WorkflowNodeType.MINIMAX_IMAGE, label: 'MiniMax图片', icon: <Image className="w-5 h-5" />, description: 'MiniMax图片生成', group: 'minimax', tags: ['图片', 'MiniMax'], isNew: true },
  { type: WorkflowNodeType.MINIMAX_CODING, label: 'MiniMax编程', icon: <Code className="w-5 h-5" />, description: 'MiniMax编程搜索', group: 'minimax', tags: ['代码', 'MiniMax'], isNew: true },
];

const IMAGE_GEN_NODES: NodeTypeConfig[] = [
  { type: WorkflowNodeType.NANO_BANANA_2, label: 'NanoBanana2', icon: <Image className="w-5 h-5" />, description: 'NanoBanana2图片生成', group: 'image-gen', tags: ['图片', '速创'], isNew: true },
  { type: WorkflowNodeType.NANO_BANANA_PRO, label: 'NanoBananaPro', icon: <Image className="w-5 h-5" />, description: 'NanoBananaPro图片生成', group: 'image-gen', tags: ['图片', '速创'], isNew: true },
  { type: WorkflowNodeType.GPT_IMAGE_2, label: 'GPT-Image-2', icon: <Image className="w-5 h-5" />, description: 'GPT-Image-2图片生成', group: 'image-gen', tags: ['图片', 'GPT'], isNew: true },
];

const OUTPUT_NODES: NodeTypeConfig[] = [
  { type: WorkflowNodeType.IMAGE_PREVIEW, label: '图片预览', icon: <Image className="w-5 h-5" />, description: '展示图片生成结果（画廊+灯箱）', group: 'output', tags: ['预览', '图片', '输出'], isNew: true },
  { type: WorkflowNodeType.VIDEO_PREVIEW, label: '视频预览', icon: <Video className="w-5 h-5" />, description: '展示视频生成结果（播放器）', group: 'output', tags: ['预览', '视频', '输出'], isNew: true },
  { type: WorkflowNodeType.AUDIO_PREVIEW, label: '音频预览', icon: <Music className="w-5 h-5" />, description: '展示音频/TTS结果（播放器）', group: 'output', tags: ['预览', '音频', '输出'], isNew: true },
  { type: WorkflowNodeType.TEXT_PREVIEW, label: '文本预览', icon: <FileText className="w-5 h-5" />, description: '展示文本生成结果（阅读+复制）', group: 'output', tags: ['预览', '文本', '输出'], isNew: true },
  { type: WorkflowNodeType.OUTPUT_PREVIEW, label: '结果预览', icon: <Flag className="w-5 h-5" />, description: '通用结果预览（支持图片/视频/音频/文本）', group: 'output', tags: ['预览', '混合', '输出'], isNew: true },
  { type: WorkflowNodeType.OUTPUT_NODE, label: '输出/保存', icon: <Save className="w-5 h-5" />, description: '保存到资产库 / 下载到本地', group: 'output', tags: ['输出', '保存', '下载', '资产'], isNew: true },
];

const ALL_NODES: NodeTypeConfig[] = [
  ...BASE_AI_NODES, ...JIMENG_NODES, ...GLM_NODES,
  ...QWEN_NODES, ...KIMI_NODES, ...MINIMAX_NODES,
  ...IMAGE_GEN_NODES, ...OUTPUT_NODES,
];

const NODE_CATEGORIES = [
  { value: 'all', label: '全部节点', icon: '📚' },
  { value: 'base', label: 'AI 生成', icon: '⚡' },
  { value: 'jimeng', label: '即梦', icon: '🔮' },
  { value: 'glm', label: '智谱 GLM', icon: '🧠' },
  { value: 'qwen', label: '通义千问', icon: '💬' },
  { value: 'kimi', label: 'Kimi', icon: '🌙' },
  { value: 'minimax', label: 'MiniMax', icon: '🤖' },
  { value: 'image-gen', label: '图片生成', icon: '🖼️' },
  { value: 'output', label: '输出预览', icon: '📤' },
];

// 导出供 Canvas 使用
export { ALL_NODES };

interface WorkflowTemplatesProps {
  show: boolean;
  onClose: () => void;
  onAddNode: (type: WorkflowNodeType) => void;
}

export function WorkflowTemplates({ show, onClose, onAddNode }: WorkflowTemplatesProps) {
  const { isDark } = useTheme();
  const nodeVisibility = useAppVisibilityStore(state => state.workflowNodes);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNodes = useMemo(() => {
    return ALL_NODES
      .filter(n => isVisible(nodeVisibility[n.type]))
      .filter(n => {
        if (selectedCategory !== 'all' && n.group !== selectedCategory) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          return n.label.toLowerCase().includes(q)
            || n.description.toLowerCase().includes(q)
            || n.tags?.some(t => t.toLowerCase().includes(q));
        }
        return true;
      })
      .map(n => ({ ...n, disabled: !isActive(nodeVisibility[n.type]) }))
      .sort((a, b) => {
        // 可用优先
        if (a.disabled !== b.disabled) return a.disabled ? 1 : -1;
        // 热门优先
        if (a.popular !== b.popular) return a.popular ? -1 : 1;
        return 0;
      });
  }, [nodeVisibility, selectedCategory, searchQuery]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      <div className={cn(
        'relative w-full max-w-4xl max-h-[80vh] dialog-glass rounded-3xl',
        'animate-in zoom-in-95 fade-in slide-in-from-bottom-4 duration-300',
        'flex flex-col'
      )}>
        {/* 头部 */}
        <div className={cn('flex items-center justify-between p-6 border-b', isDark ? 'border-white/10' : 'border-gray-200')}>
          <div>
            <h2 className={cn('text-xl font-bold', isDark ? 'text-slate-100' : 'text-gray-900')}>节点库</h2>
            <p className={cn('text-sm mt-1', isDark ? 'text-slate-400' : 'text-gray-500')}>选择节点添加到画布</p>
          </div>
          <button onClick={onClose} className={cn(
            'p-2 rounded-lg transition-colors',
            isDark ? 'hover:bg-white/10 text-slate-400 hover:text-slate-200' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
          )}>✕</button>
        </div>

        {/* 搜索 + 分类 */}
        <div className="p-6 space-y-4 border-b">
          <div className="relative">
            <input type="text" placeholder="搜索节点..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={cn(
                'w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2',
                isDark
                  ? 'bg-white/5 border-white/10 text-slate-100 placeholder:text-slate-400/50 focus:border-blue-500'
                  : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-400'
              )} />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg">🔍</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {NODE_CATEGORIES.map(cat => (
              <button key={cat.value} onClick={() => setSelectedCategory(cat.value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5',
                  selectedCategory === cat.value
                    ? isDark ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50' : 'bg-blue-600 text-white shadow-lg shadow-blue-600/50'
                    : isDark ? 'bg-slate-800 border border-white/10 text-slate-300 hover:bg-slate-700' : 'bg-gray-100 border border-gray-200 text-gray-600 hover:bg-gray-200'
                )}>
                <span>{cat.icon}</span><span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 节点网格 */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredNodes.length === 0 ? (
            <div className="text-center py-12">
              <p className={cn('text-6xl mb-4', isDark ? 'text-slate-600' : 'text-gray-300')}>🔍</p>
              <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-gray-500')}>未找到匹配的节点</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredNodes.map(node => (
                <button key={node.type}
                  onClick={() => { if (!node.disabled) { onAddNode(node.type); onClose(); } }}
                  className={cn(
                    'group relative p-4 rounded-xl border-2 text-left transition-all duration-200',
                    node.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg hover:scale-[1.02]',
                    isDark ? 'border-white/10 hover:border-blue-500/50 bg-white/5 hover:bg-white/10' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  )}>
                  {node.disabled && (
                    <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full text-muted-foreground bg-muted">
                      <Lock className="w-2.5 h-2.5" />未开放
                    </div>
                  )}
                  <div className="flex items-start gap-3 mb-2">
                    <div className={cn('p-2 rounded-lg group-hover:scale-110 transition-transform duration-200',
                      isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600')}>
                      {node.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className={cn('font-semibold mb-1', isDark ? 'text-slate-100' : 'text-gray-900')}>{node.label}</h3>
                      <p className={cn('text-xs', isDark ? 'text-slate-400' : 'text-gray-500')}>{node.description}</p>
                    </div>
                  </div>
                  {node.tags && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {node.tags.map(tag => (
                        <span key={tag} className={cn('text-[10px] px-2 py-0.5 rounded-full',
                          isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-600')}>{tag}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-1">
                    {node.popular && (
                      <span className={cn('flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full',
                        isDark ? 'text-yellow-400 bg-yellow-900/30' : 'text-yellow-600 bg-yellow-50')}>
                        <Star className="w-2.5 h-2.5 fill-current" />热门
                      </span>
                    )}
                    {node.isNew && (
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full',
                        isDark ? 'text-green-400 bg-green-900/30' : 'text-green-600 bg-green-50')}>NEW</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className={cn('p-4 border-t text-center', isDark ? 'border-white/10' : 'border-gray-200')}>
          <p className={cn('text-xs', isDark ? 'text-slate-400' : 'text-gray-500')}>
            💡 提示：点击节点添加到画布，可拖拽调整位置
          </p>
        </div>
      </div>
    </div>
  );
}

WorkflowTemplates.displayName = 'WorkflowTemplates';
