import { useState, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { Button } from '../button';
import { Input } from '../input';
import { cn } from '@/lib/utils';

interface CategoryWizardProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; icon?: string; color?: string }) => Promise<void>;
  checkNameAvailable?: (name: string) => Promise<boolean>;
}

const ICONS = ['📦', '🎨', '🎭', '🎬', '🎵', '📝', '🖼️', '🎮', '📱', '💡', '🔧', '⭐', '🌟', '💫', '🔥', '💎'];
const COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
  '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
  '#EC4899', '#F43F5E',
];

export default function CategoryWizard({ open, onClose, onSubmit, checkNameAvailable }: CategoryWizardProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [color, setColor] = useState('#6366F1');
  const [nameError, setNameError] = useState('');
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setStep(1);
    setName('');
    setIcon('');
    setColor('#6366F1');
    setNameError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const checkName = useCallback(async (n: string) => {
    if (!n.trim()) {
      setNameError('');
      return;
    }
    if (checkNameAvailable) {
      setChecking(true);
      const available = await checkNameAvailable(n);
      setChecking(false);
      setNameError(available ? '' : `类型 "${n}" 已存在`);
    }
  }, [checkNameAvailable]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    checkName(value);
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!name.trim()) {
        setNameError('请输入类型名称');
        return;
      }
      if (checking) return;
      if (nameError) return;
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), icon, color });
      handleClose();
    } catch (error) {
      console.error('Failed to create category:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-lg shadow-lg w-[480px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-medium">新建资产类型</h2>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 p-4 border-b">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {step > s ? <Check className="h-4 w-4" /> : s}
              </div>
              <span className={cn("text-sm", step >= s ? "text-foreground" : "text-muted-foreground")}>
                {s === 1 ? '名称' : s === 2 ? '样式' : '确认'}
              </span>
              {s < 3 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Step 1: Name */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">类型名称</label>
                <Input
                  value={name}
                  onChange={handleNameChange}
                  placeholder="例如：角色、场景、道具..."
                  autoFocus
                />
                {nameError && (
                  <p className="text-sm text-destructive mt-2">{nameError}</p>
                )}
                {checking && (
                  <p className="text-sm text-muted-foreground mt-2">检查中...</p>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                类型名称将用于分类您的资产，每个名称在同一用户下唯一。
              </p>
            </div>
          )}

          {/* Step 2: Icon & Color */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-2 block">选择图标</label>
                <div className="grid grid-cols-8 gap-2">
                  {ICONS.map((ic) => (
                    <button
                      key={ic}
                      onClick={() => setIcon(ic)}
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center text-xl hover:bg-muted transition-colors",
                        icon === ic && "bg-primary/20 ring-2 ring-primary"
                      )}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">选择颜色</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={cn(
                        "w-8 h-8 rounded-full transition-transform hover:scale-110",
                        color === c && "ring-2 ring-offset-2 ring-primary"
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <div
                  className="w-16 h-16 rounded-lg flex items-center justify-center text-3xl"
                  style={{ backgroundColor: color + '20', border: `2px solid ${color}` }}
                >
                  {icon || '📦'}
                </div>
                <div>
                  <h3 className="text-lg font-medium">{name}</h3>
                  <p className="text-sm text-muted-foreground">个人类型</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                确认创建此资产类型？创建后可随时修改图标和颜色。
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t">
          <Button variant="outline" onClick={step === 1 ? handleClose : handleBack}>
            {step === 1 ? '取消' : <><ChevronLeft className="h-4 w-4 mr-1" /> 上一步</>}
          </Button>
          {step < 3 ? (
            <Button onClick={handleNext} disabled={checking || !!nameError}>
              下一步 <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? '创建中...' : '创建类型'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}