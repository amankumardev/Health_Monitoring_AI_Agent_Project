import { Mic, MicOff, Square, Loader2 } from 'lucide-react';

interface MicrophoneButtonProps {
  state: 'idle' | 'listening' | 'processing' | 'speaking';
  onClick: () => void;
  disabled?: boolean;
  size?: number;
}

export default function MicrophoneButton({ state, onClick, disabled, size = 80 }: MicrophoneButtonProps) {
  const getStyle = () => {
    switch (state) {
      case 'listening':
        return {
          bg: 'bg-red-500',
          ring: 'ring-red-200',
          animate: 'animate-pulse',
          icon: <Mic size={size * 0.35} className="text-white" />,
          label: 'Listening...',
        };
      case 'processing':
        return {
          bg: 'bg-amber-500',
          ring: 'ring-amber-200',
          animate: '',
          icon: <Loader2 size={size * 0.35} className="text-white animate-spin" />,
          label: 'Understanding...',
        };
      case 'speaking':
        return {
          bg: 'bg-teal-500',
          ring: 'ring-teal-200',
          animate: '',
          icon: <Square size={size * 0.3} className="text-white" />,
          label: 'AI is responding...',
        };
      default:
        return {
          bg: 'bg-teal-600',
          ring: 'ring-teal-100',
          animate: '',
          icon: <Mic size={size * 0.35} className="text-white" />,
          label: 'Tap to talk',
        };
    }
  };

  const style = getStyle();

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={onClick}
        disabled={disabled}
        aria-label={style.label}
        className={`relative flex items-center justify-center rounded-full ${style.bg} ${style.animate} ring-4 ${style.ring} transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100`}
        style={{ width: size, height: size }}
      >
        {style.icon}
        {state === 'listening' && (
          <span
            className="absolute inset-0 rounded-full bg-red-400 opacity-40 animate-ping"
            style={{ animationDuration: '1.5s' }}
          />
        )}
      </button>
      <span className="text-sm font-medium text-slate-600">{style.label}</span>
    </div>
  );
}
