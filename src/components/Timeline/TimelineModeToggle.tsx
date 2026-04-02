import type { TimelineMode } from '../../types';

interface TimelineModeToggleProps {
  mode: TimelineMode;
  onModeChange: (mode: TimelineMode) => void;
  hasDualTimeline: boolean;
}

export function TimelineModeToggle({ mode, onModeChange, hasDualTimeline }: TimelineModeToggleProps) {
  if (!hasDualTimeline) {
    return null; // 듀얼 타임라인 없으면 토글 숨김
  }

  const modes: { value: TimelineMode; label: string; icon: string }[] = [
    { value: 'event', label: '사건 타임라인', icon: '📅' },
    { value: 'investigation', label: '수사 타임라인', icon: '🔍' },
    { value: 'dual', label: '듀얼 뷰', icon: '⚡' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        background: 'var(--detective-bg-tertiary)',
        padding: 4,
        borderRadius: 6,
        border: '1px solid var(--detective-border-primary)',
      }}
    >
      {modes.map((m) => (
        <button
          key={m.value}
          onClick={() => onModeChange(m.value)}
          style={{
            padding: '6px 12px',
            fontSize: 11,
            fontWeight: 600,
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            background: mode === m.value ? 'var(--detective-accent-primary)' : 'transparent',
            color: mode === m.value ? 'var(--detective-bg-primary)' : 'var(--detective-text-secondary)',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span>{m.icon}</span>
          <span>{m.label}</span>
        </button>
      ))}
    </div>
  );
}
