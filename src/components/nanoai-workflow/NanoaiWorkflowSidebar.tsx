import { useState, useEffect, useMemo } from 'react';
import {
  Film, User, Mountain, Sparkles, FileText,
  Plus, Search, ChevronDown, ChevronRight, Star, Lock,
  BookOpen, Clapperboard, ScrollText, Image, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useTheme } from './ui/Theme';
import { useNanoaiWorkflowStore } from '@/stores/nanoaiWorkflowStore';
import { useAppVisibilityStore, isVisible } from '@/stores/appVisibilityStore';

// 扁平化 Lucide 图标映射
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  story: BookOpen,
  character: User,
  scene: Mountain,
  storyboard: Film,
  script: FileText,
  image: Sparkles,
};

// 模板分组 — 用 Lucide 图标替代 emoji
const TEMPLATE_GROUPS = [
  { value: 'story', label: '故事', Icon: BookOpen },
  { value: 'character', label: '角色', Icon: User },
  { value: 'scene', label: '场景', Icon: Mountain },
  { value: 'storyboard', label: '分镜', Icon: Clapperboard },
  { value: 'script', label: '脚本', Icon: ScrollText },
  { value: 'image', label: '图片', Icon: Image },
  { value: 'custom', label: 'Skills', Icon: Zap },
];

interface TemplateSectionProps {
  title: string;
  Icon: React.ElementType;
  templates: Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    tags?: string[];
  }>;
  onLoadTemplate: (id: string) => void;
  defaultExpanded?: boolean;
  templateVisibility?: Record<string, import('@/stores/appVisibilityStore').VisibilityState>;
}

function TemplateSection({
  title, Icon, templates, onLoadTemplate, defaultExpanded = true, templateVisibility,
}: TemplateSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const { isDark } = useTheme();

  const visibleTemplates = templateVisibility
    ? templates.filter(t => templateVisibility[t.id] !== 'hidden')
    : templates;

  const sortedTemplates = [...visibleTemplates].sort((a, b) => {
    const aDisabled = templateVisibility?.[a.id] === 'disabled';
    const bDisabled = templateVisibility?.[b.id] === 'disabled';
    if (aDisabled !== bDisabled) return aDisabled ? 1 : -1;
    const aHot = a.tags?.some(t => t === '热门' || t === '推荐') ? 1 : 0;
    const bHot = b.tags?.some(t => t === '热门' || t === '推荐') ? 1 : 0;
    return bHot - aHot;
  });

  if (visibleTemplates.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'flex items-center gap-2 w-full px-2 py-1.5 rounded-md transition-colors duration-150',
          isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-gray-50'
        )}
      >
        {isExpanded ? (
          <ChevronDown className={cn('w-3 h-3', isDark ? 'text-slate-500' : 'text-gray-400')} />
        ) : (
          <ChevronRight className={cn('w-3 h-3', isDark ? 'text-slate-500' : 'text-gray-400')} />
        )}
        <Icon className={cn('w-3.5 h-3.5', isDark ? 'text-slate-400' : 'text-gray-500')} />
        <span className={cn('text-xs font-medium flex-1 text-left', isDark ? 'text-slate-300' : 'text-gray-700')}>
          {title}
        </span>
        <span className={cn('text-[10px]', isDark ? 'text-slate-600' : 'text-gray-400')}>
          {visibleTemplates.length}
        </span>
      </button>

      {isExpanded && (
        <div className="space-y-1 pl-3 mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
          {sortedTemplates.map(template => {
            const isDisabled = templateVisibility && templateVisibility[template.id] === 'disabled';
            const isPopular = template.tags?.includes('推荐') || template.tags?.includes('热门');
            const CatIcon = CATEGORY_ICONS[template.category] || Sparkles;
            return (
              <button
                key={template.id}
                onClick={() => { if (!isDisabled) onLoadTemplate(template.id); }}
                className={cn(
                  'w-full px-3 py-2.5 rounded-lg border transition-all duration-150',
                  'text-left group',
                  isDisabled && 'opacity-35 cursor-not-allowed',
                  isDark
                    ? 'border-white/[0.05] hover:border-white/[0.1] bg-white/[0.02] hover:bg-white/[0.04]'
                    : 'border-gray-100 hover:border-gray-200 bg-gray-50/30 hover:bg-gray-50'
                )}
              >
                <div className="flex items-start gap-2.5">
                  <div className={cn(
                    'w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5',
                    isDark
                      ? 'bg-blue-500/10 text-blue-400'
                      : 'bg-blue-50 text-blue-600'
                  )}>
                    <CatIcon className="w-3 h-3" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={cn('text-xs font-medium', isDark ? 'text-slate-200' : 'text-gray-800')}>
                        {template.name}
                      </span>
                      {isDisabled && (
                        <span className="flex items-center gap-0.5 text-[9px] px-1 py-[1px] rounded text-slate-500 bg-slate-800/50">
                          <Lock className="w-2 h-2" />未开放
                        </span>
                      )}
                      {isPopular && (
                        <span className={cn(
                          'flex items-center gap-0.5 text-[9px] px-1 py-[1px] rounded',
                          isDark ? 'text-amber-400 bg-amber-500/10' : 'text-amber-600 bg-amber-50'
                        )}>
                          <Star className="w-2 h-2 fill-current" />热门
                        </span>
                      )}
                    </div>
                    <p className={cn('text-[10px] line-clamp-1 mt-0.5', isDark ? 'text-slate-500' : 'text-gray-400')}>
                      {template.description}
                    </p>
                    {template.tags && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {template.tags.map(tag => (
                          <span key={tag} className={cn(
                            'text-[9px] px-1.5 py-[1px] rounded',
                            isDark ? 'text-slate-500 bg-white/[0.04]' : 'text-gray-400 bg-gray-100'
                          )}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface NanoaiWorkflowSidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
  onLoadTemplate?: (templateId: string) => void;
  onShowNodeDialog?: () => void;
}

export function NanoaiWorkflowSidebar({
  isCollapsed = false, onToggle, onLoadTemplate, onShowNodeDialog,
}: NanoaiWorkflowSidebarProps) {
  const { isDark } = useTheme();
  const templates = useNanoaiWorkflowStore(state => state.templates);
  const templateVisibility = useAppVisibilityStore(state => state.workflowTemplates);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved && onToggle) {
      const collapsed = JSON.parse(saved);
      if (collapsed !== isCollapsed) onToggle();
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  const filteredTemplates = useMemo(() => {
    let result = templates.filter(t => isVisible(templateVisibility[t.id]));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(q)
        || t.description.toLowerCase().includes(q)
        || t.tags?.some(tag => tag.toLowerCase().includes(q))
      );
    }
    return result;
  }, [templates, templateVisibility, searchQuery]);

  const groupedTemplates = useMemo(() => {
    const groups: Record<string, typeof templates> = {};
    for (const t of filteredTemplates) {
      const cat = t.category || 'custom';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(t);
    }
    return groups;
  }, [filteredTemplates]);

  return (
    <div className={cn(
      'flex flex-col border-r transition-all duration-300 ease-in-out h-full',
      isDark ? 'bg-slate-900/60 border-white/[0.06]' : 'bg-white border-gray-100',
      isCollapsed ? 'w-12' : 'w-64'
    )}>
      {/* 搜索 */}
      {!isCollapsed && (
        <div className={cn(
          'px-3 pt-3 pb-2 border-b',
          isDark ? 'border-white/[0.04]' : 'border-gray-50'
        )}>
          <div className="relative">
            <Search className={cn('absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3', isDark ? 'text-slate-600' : 'text-gray-400')} />
            <Input type="text" placeholder="搜索模板..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={cn(
                'pl-7 h-7 text-[11px] border rounded-md transition-colors',
                isDark
                  ? 'bg-white/[0.02] border-white/[0.04] text-slate-300 placeholder:text-slate-600 focus:border-cyan-500/30'
                  : 'bg-gray-50/50 border-gray-100 focus:border-blue-300'
              )} />
          </div>
        </div>
      )}

      {/* 模板列表 */}
      {!isCollapsed ? (
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-3">
          {searchQuery ? (
            filteredTemplates.length === 0 ? (
              <div className="text-center py-8">
                <p className={cn('text-xs', isDark ? 'text-slate-500' : 'text-gray-400')}>未找到匹配的模板</p>
                <button onClick={() => setSearchQuery('')}
                  className={cn('mt-1.5 text-xs', isDark ? 'text-cyan-500' : 'text-blue-500')}>
                  清除搜索
                </button>
              </div>
            ) : (
              <TemplateSection
                title="搜索结果"
                Icon={Search}
                templates={filteredTemplates}
                onLoadTemplate={onLoadTemplate || (() => {})}
                templateVisibility={templateVisibility}
              />
            )
          ) : (
            TEMPLATE_GROUPS.map(group => {
              const groupTemplates = groupedTemplates[group.value];
              if (!groupTemplates || groupTemplates.length === 0) return null;
              return (
                <TemplateSection
                  key={group.value}
                  title={group.label}
                  Icon={group.Icon}
                  templates={groupTemplates}
                  onLoadTemplate={onLoadTemplate || (() => {})}
                  templateVisibility={templateVisibility}
                />
              );
            })
          )}
        </div>
      ) : (
        /* 折叠态：精致 Lucide 图标 */
        <div className="flex-1 overflow-y-auto py-2 px-1.5 space-y-0.5">
          {TEMPLATE_GROUPS.map(group => {
            const groupTemplates = groupedTemplates[group.value];
            if (!groupTemplates || groupTemplates.length === 0) return null;
            return (
              <button
                key={group.value}
                title={group.label}
                className={cn(
                  'w-full aspect-square rounded-md flex items-center justify-center transition-colors duration-150',
                  isDark
                    ? 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.05]'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                )}
              >
                <group.Icon className="w-3.5 h-3.5" />
              </button>
            );
          })}
        </div>
      )}

      {/* 底部 */}
      {!isCollapsed && (
        <div className={cn(
          'px-3 py-2.5 border-t',
          isDark ? 'border-white/[0.04]' : 'border-gray-50'
        )}>
          <button
            onClick={onShowNodeDialog}
            className={cn(
              'w-full h-7 rounded-md text-[11px] font-medium',
              'flex items-center justify-center gap-1.5',
              'transition-all duration-150 active:scale-[0.98]',
              isDark
                ? 'bg-white/[0.05] text-slate-400 hover:bg-white/[0.08] hover:text-slate-300'
                : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            )}
          >
            <Plus className="w-3 h-3" />
            添加节点
            <kbd className={cn(
              'ml-1 text-[9px] px-1 py-[0.5px] rounded font-mono',
              isDark ? 'bg-white/[0.05] text-slate-600' : 'bg-white text-gray-400 border border-gray-100'
            )}>
              ⌘T
            </kbd>
          </button>

          <div className={cn(
            'mt-2 text-[9px] leading-relaxed px-2 py-1.5 rounded-md',
            isDark ? 'text-slate-600 bg-white/[0.02]' : 'text-gray-400 bg-gray-50/50'
          )}>
            点击模板加载 · 拖拽调整 · 连线创建工作流
          </div>
        </div>
      )}
    </div>
  );
}

export default NanoaiWorkflowSidebar;
