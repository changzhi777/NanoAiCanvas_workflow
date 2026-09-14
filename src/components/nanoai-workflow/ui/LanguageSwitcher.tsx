import { useI18n } from '@/hooks/useI18n';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Languages, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LanguageSwitcher() {
  const { locale, changeLanguage } = useI18n();

  const languages = [
    { code: 'zh-CN', name: '简体中文', flag: '🇨🇳' },
    { code: 'en-US', name: 'English', flag: '🇺🇸' },
  ];

  const currentLang = languages.find(lang => lang.code === locale) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 shadow-sm hover:shadow transition-all duration-200"
        >
          <Languages className="w-4 h-4" />
          <span className="hidden sm:inline">{currentLang.flag}</span>
          <span className="hidden md:inline">{currentLang.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 dropdown-glass">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => changeLanguage(language.code)}
            className={cn(
              'cursor-pointer transition-colors',
              locale === language.code && 'bg-blue-50 dark:bg-blue-900/30'
            )}
          >
            <span className="text-lg mr-2">{language.flag}</span>
            <span className="flex-1">{language.name}</span>
            {locale === language.code && (
              <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
