import { useToastStore } from '@/hooks/useToast';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from './Theme';
import { useEffect } from 'react';

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();
  const { isDark } = useTheme();

  return (
    <>
      {toasts.length > 0 && (
        <div
          className={cn(
            'fixed top-4 right-4 z-50 space-y-2 max-w-sm',
            isDark ? 'text-slate-200' : 'text-gray-700'
          )}
        >
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              toast={toast}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}

interface ToastProps {
  toast: {
    id: string;
    type: 'success' | 'error' | 'info';
    message: string;
  };
  onClose: () => void;
}

function Toast({ toast, onClose }: ToastProps) {
  const { isDark } = useTheme();

  useEffect(() => {
    // Play sound effect
    const playSound = () => {
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = toast.type === 'error' ? 200 : 600;
      oscillator.type = toast.type === 'error' ? 'sawtooth' : 'sine';

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.1
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    };

    playSound();
  }, [toast.type]);

  return (
    <div
      className={cn(
        'p-3 rounded-lg shadow-lg backdrop-blur-xl border',
        'animate-in slide-in-from-right-4 duration-300',
        'flex items-start gap-2',
        toast.type === 'success' &&
          isDark &&
          'bg-green-900/30 border-green-500/50 text-green-300',
        toast.type === 'error' &&
          isDark &&
          'bg-red-900/30 border-red-500/50 text-red-300',
        toast.type === 'info' &&
          isDark &&
          'bg-blue-900/30 border-blue-500/50 text-blue-300',
        toast.type === 'success' && !isDark && 'bg-green-50 border-green-200',
        toast.type === 'error' && !isDark && 'bg-red-50 border-red-200',
        toast.type === 'info' && !isDark && 'bg-blue-50 border-blue-200'
      )}
    >
      <p className="text-sm font-medium flex-1">{toast.message}</p>
      <button
        onClick={onClose}
        className={cn(
          'flex-shrink-0 hover:opacity-70 transition-opacity',
          isDark ? 'text-current' : 'text-current'
        )}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
