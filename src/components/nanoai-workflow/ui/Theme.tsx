import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  storageKey = 'nanoai-workflow-theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      if (stored && (stored === 'light' || stored === 'dark')) {
        return stored as Theme;
      }
    }
    return defaultTheme;
  });

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const isDark = theme === 'dark';

  useEffect(() => {
    const root = window.document.documentElement;

    // 移除所有主题类
    root.classList.remove('light', 'dark');

    // 添加当前主题类
    root.classList.add(theme);

    // 存储到 localStorage
    localStorage.setItem(storageKey, theme);

    // 添加深色主题特有的类
    if (theme === 'dark') {
      root.classList.add('dark-mode');
    } else {
      root.classList.remove('dark-mode');
    }
  }, [theme, storageKey]);

  const value = {
    theme,
    setTheme,
    isDark,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function ThemeToggle() {
  const { theme, setTheme, isDark } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 w-8 p-0 transition-all duration-300',
            'hover:scale-110 active:scale-95',
            'relative overflow-hidden group'
          )}
        >
          <div className={cn(
            'absolute inset-0 bg-gradient-to-br transition-opacity duration-300',
            isDark ? 'from-blue-500 to-cyan-500' : 'from-gray-200 to-gray-300',
            'opacity-0 group-hover:opacity-20'
          )} />
          <span className={cn(
            'relative transition-transform duration-300',
            isDark && 'rotate-180'
          )}>
            {isDark ? (
              <Moon className="w-4 h-4 text-blue-400" />
            ) : (
              <Sun className="w-4 h-4 text-yellow-500" />
            )}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 dropdown-glass">
        <DropdownMenuItem
          onClick={() => setTheme('light')}
          className={cn(
            'cursor-pointer transition-colors',
            theme === 'light' && 'bg-blue-50'
          )}
        >
          <Sun className="w-4 h-4 mr-2 text-yellow-500" />
          <span>浅色模式</span>
          {theme === 'light' && (
            <span className="ml-auto text-xs text-blue-600">✓</span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('dark')}
          className={cn(
            'cursor-pointer transition-colors',
            theme === 'dark' && 'bg-blue-50 dark:bg-blue-900/30'
          )}
        >
          <Moon className="w-4 h-4 mr-2 text-blue-400" />
          <span>深色模式</span>
          {theme === 'dark' && (
            <span className="ml-auto text-xs text-blue-600 dark:text-blue-400">✓</span>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
