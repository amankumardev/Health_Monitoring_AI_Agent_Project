interface VoiceWaveformProps {
  state: 'idle' | 'listening' | 'processing' | 'speaking';
}

export default function VoiceWaveform({ state }: VoiceWaveformProps) {
  const bars = 28;
  const isActive = state === 'listening' || state === 'speaking';

  return (
    <div className="flex items-center justify-center gap-1 h-12" aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => {
        const delay = (i * 0.06).toFixed(2);
        const baseHeight = state === 'idle' ? 4 : 8;
        const maxHeight = state === 'listening' ? 32 : state === 'speaking' ? 28 : 12;

        return (
          <div
            key={i}
            className="rounded-full transition-colors"
            style={{
              width: 3,
              height: isActive ? maxHeight : baseHeight,
              background: state === 'listening'
                ? 'linear-gradient(to top, #ef4444, #f87171)'
                : state === 'speaking'
                ? 'linear-gradient(to top, #14b8a6, #5eead4)'
                : '#cbd5e1',
              animation: isActive
                ? `voiceWave 0.${5 + (i % 3)}s ease-in-out ${delay}s infinite alternate`
                : 'none',
            }}
          />
        );
      })}
      <style>{`
        @keyframes voiceWave {
          0% { transform: scaleY(0.3); }
          100% { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}
