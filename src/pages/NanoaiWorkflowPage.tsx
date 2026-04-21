import { useEffect } from 'react';
import { NanoaiWorkflowCanvas } from '@/components/nanoai-workflow';
import { ThemeProvider } from '@/components/nanoai-workflow/ui/Theme';
import { useNanoaiWorkflowStore } from '@/stores/nanoaiWorkflowStore';

function WorkflowContent() {
  const resetTemplates = useNanoaiWorkflowStore(state => state.resetTemplates);
  const templates = useNanoaiWorkflowStore(state => state.templates);

  useEffect(() => {
    // 输出当前模板状态到控制台
    console.log('=== NanoAI Workflow 模板状态 ===');
    console.log('模板数量:', templates.length);
    console.log('模板列表:', templates.map(t => ({ id: t.id, name: t.name })));

    // 如果模板为空或缺少内置模板，重置为默认模板
    if (templates.length === 0) {
      console.log('⚠️ 模板为空，重置为默认模板...');
      resetTemplates();
    } else if (!templates.find(t => t.id === 'storyboard-01')) {
      console.log('⚠️ 缺少核心模板，重置为默认模板...');
      resetTemplates();
    } else {
      console.log('✅ 模板加载正常');
    }

    // 将 store 暴露到全局，方便调试
    if (typeof window !== 'undefined') {
      (window as any).useNanoaiWorkflowStore = useNanoaiWorkflowStore;
    }
  }, [templates.length, resetTemplates, templates]);

  return <NanoaiWorkflowCanvas />;
}

export default function NanoaiWorkflowPage() {
  return (
    <ThemeProvider defaultTheme="dark">
      <div className="h-screen w-screen overflow-hidden">
        <WorkflowContent />
      </div>
    </ThemeProvider>
  );
}
