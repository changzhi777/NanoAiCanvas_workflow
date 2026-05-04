import { useState, useMemo } from 'react';
import { FileText, Film, User, Mountain, Sparkles, Star, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from './Theme';
import { useNanoaiWorkflowStore } from '@/stores/nanoaiWorkflowStore';

// 节点类型到图标的映射
const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'story':
      return <Sparkles className="w-5 h-5" />;
    case 'character':
      return <User className="w-5 h-5" />;
    case 'scene':
      return <Mountain className="w-5 h-5" />;
    case 'storyboard':
      return <Film className="w-5 h-5" />;
    case 'script':
      return <FileText className="w-5 h-5" />;
    case 'image':
      return <Sparkles className="w-5 h-5" />;
    default:
      return <Sparkles className="w-5 h-5" />;
  }
};

interface WorkflowTemplatesProps {
  show: boolean;
  onClose: () => void;
  onLoadTemplate: (templateId: string) => void;
}

export function WorkflowTemplates({ show, onClose, onLoadTemplate }: WorkflowTemplatesProps) {
  const { isDark } = useTheme();
  const templates = useNanoaiWorkflowStore(state => state.templates);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 将store的模板转换为UI格式
  const uiTemplates = useMemo(() => {
    return templates.map(template => ({
      ...template,
      icon: getCategoryIcon(template.category),
      popular: template.tags.includes('推荐') || template.tags.includes('热门'),
      isNew: template.tags.includes('新') || template.tags.includes('NEW'),
      estimatedTime: template.tags.find(tag => tag.includes('分钟')) || '5-10 分钟',
    }));
  }, [templates]);

  const categories = [
    { value: 'all', label: '全部模板', icon: '📚' },
    { value: 'story', label: '故事', icon: '📖' },
    { value: 'character', label: '角色', icon: '👤' },
    { value: 'scene', label: '场景', icon: '🏞️' },
    { value: 'storyboard', label: '分镜', icon: '🎬' },
    { value: 'script', label: '脚本', icon: '📝' },
    { value: 'image', label: '图片', icon: '🖼️' },
  ];

  const filteredTemplates = uiTemplates.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* 对话框 */}
      <div
        className={cn(
          'relative w-full max-w-4xl max-h-[80vh] dialog-glass rounded-3xl',
          'animate-in zoom-in-95 fade-in slide-in-from-bottom-4 duration-300',
          'flex flex-col'
        )}
      >
        {/* 头部 */}
        <div className={cn(
          'flex items-center justify-between p-6 border-b',
          isDark ? 'border-white/10' : 'border-gray-200'
        )}>
          <div>
            <h2 className={cn(
              'text-xl font-bold',
              isDark ? 'text-slate-100' : 'text-gray-900'
            )}>
              工作流模板
            </h2>
            <p className={cn(
              'text-sm mt-1',
              isDark ? 'text-slate-400' : 'text-gray-500'
            )}>
              选择模板快速开始工作流
            </p>
          </div>
          <button
            onClick={onClose}
            className={cn(
              'p-2 rounded-lg transition-colors',
              isDark
                ? 'hover:bg-white/10 text-slate-400 hover:text-slate-200'
                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
            )}
          >
            ✕
          </button>
        </div>

        {/* 搜索和分类 */}
        <div className="p-6 space-y-4 border-b">
          {/* 搜索框 */}
          <div className="relative">
            <input
              type="text"
              placeholder="搜索模板..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                'w-full pl-10 pr-4 py-2.5 rounded-lg border',
                'text-sm transition-colors',
                'focus:outline-none focus:ring-2',
                isDark
                  ? 'bg-white/5 border-white/10 text-slate-100 placeholder:text-slate-400/50 focus:border-blue-500'
                  : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-400'
              )}
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg">🔍</span>
          </div>

          {/* 分类标签 */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.value}
                onClick={() => setSelectedCategory(category.value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium',
                  'transition-all duration-200',
                  'flex items-center gap-1.5',
                  selectedCategory === category.value
                    ? isDark
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50'
                      : 'bg-blue-600 text-white shadow-lg shadow-blue-600/50'
                    : isDark
                      ? 'bg-slate-800 border border-white/10 text-slate-300 hover:bg-slate-700'
                      : 'bg-gray-100 border border-gray-200 text-gray-600 hover:bg-gray-200'
                )}
              >
                <span>{category.icon}</span>
                <span>{category.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 模板列表 */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <p className={cn(
                'text-6xl mb-4',
                isDark ? 'text-slate-600' : 'text-gray-300'
              )}>
                🔍
              </p>
              <p className={cn(
                'text-sm',
                isDark ? 'text-slate-400' : 'text-gray-500'
              )}>
                未找到匹配的模板
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => {
                    onLoadTemplate(template.id);
                    onClose();
                  }}
                  className={cn(
                    'group relative p-4 rounded-xl border-2 text-left',
                    'transition-all duration-200',
                    'hover:shadow-lg hover:scale-[1.02]',
                    isDark
                      ? 'border-white/10 hover:border-blue-500/50 bg-white/5 hover:bg-white/10'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  )}
                >
                  {/* 标签 */}
                  <div className="absolute top-4 right-4 flex gap-1">
                    {template.popular && (
                      <span className={cn(
                        'flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full',
                        isDark
                          ? 'text-yellow-400 bg-yellow-900/30'
                          : 'text-yellow-600 bg-yellow-50'
                      )}>
                        <Star className="w-2.5 h-2.5 fill-current" />
                        热门
                      </span>
                    )}
                    {template.isNew && (
                      <span className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded-full',
                        isDark
                          ? 'text-green-400 bg-green-900/30'
                          : 'text-green-600 bg-green-50'
                      )}>
                        NEW
                      </span>
                    )}
                  </div>

                  {/* 图标和标题 */}
                  <div className="flex items-start gap-3 mb-2">
                    <div className={cn(
                      'p-2 rounded-lg',
                      'transition-transform duration-200',
                      'group-hover:scale-110',
                      isDark
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-blue-100 text-blue-600'
                    )}>
                      {template.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className={cn(
                        'font-semibold mb-1',
                        isDark ? 'text-slate-100' : 'text-gray-900'
                      )}>
                        {template.name}
                      </h3>
                      <p className={cn(
                        'text-xs',
                        isDark ? 'text-slate-400' : 'text-gray-500'
                      )}>
                        {template.description}
                      </p>
                    </div>
                  </div>

                  {/* 标签 */}
                  {template.tags && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {template.tags.map((tag) => (
                        <span
                          key={tag}
                          className={cn(
                            'text-[10px] px-2 py-0.5 rounded-full',
                            isDark
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-gray-100 text-gray-600'
                          )}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* 元信息 */}
                  <div className={cn(
                    'flex items-center gap-3 text-xs',
                    isDark ? 'text-slate-500' : 'text-gray-400'
                  )}>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{template.estimatedTime}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className={cn(
          'p-4 border-t text-center',
          isDark ? 'border-white/10' : 'border-gray-200'
        )}>
          <p className={cn(
            'text-xs',
            isDark ? 'text-slate-400' : 'text-gray-500'
          )}>
            💡 提示：选择模板后可根据需要自定义调整
          </p>
        </div>
      </div>
    </div>
  );
}

WorkflowTemplates.displayName = 'WorkflowTemplates';
