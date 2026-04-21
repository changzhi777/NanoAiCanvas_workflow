import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ThemeProvider } from '@/components/nanoai-workflow/ui/Theme';

// 自定义渲染函数，包含 ThemeProvider
export function renderWithTheme(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(<ThemeProvider>{ui}</ThemeProvider>, options);
}

// 重新导出所有 testing-library 工具
export * from '@testing-library/react';
