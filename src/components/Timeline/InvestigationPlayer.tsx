import { useState, useEffect } from 'react';

interface InvestigationPlayerProps {
  maxDiscoveryDay: number;
  currentDiscoveryDay: number;
  onDiscoveryDayChange: (day: number) => void;
  isPlaying: boolean;
  onPlayToggle: () => void;
}

export function InvestigationPlayer({
  maxDiscoveryDay,
  currentDiscoveryDay,
  onDiscoveryDayChange,
  isPlaying,
  onPlayToggle,
}: InvestigationPlayerProps) {
  const [speed, setSpeed] = useState(1); // 1x, 2x, 4x

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      onDiscoveryDayChange(
        currentDiscoveryDay >= maxDiscoveryDay ? 0 : currentDiscoveryDay + 1
      );
    }, 2000 / speed); // 기본 2초, 속도에 따라 조절

    return () => clearInterval(interval);
  }, [isPlaying, currentDiscoveryDay, maxDiscoveryDay, speed, onDiscoveryDayChange]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 14px',
        background: 'var(--detective-bg-tertiary)',
        borderRadius: 6,
        border: '1px solid var(--detective-border-primary)',
      }}
    >
      {/* 재생/일시정지 버튼 */}
      <button
        onClick={onPlayToggle}
        style={{
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isPlaying ? 'var(--detective-accent-primary)' : 'var(--detective-bg-secondary)',
          border: '1px solid var(--detective-border-secondary)',
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 14,
          color: isPlaying ? 'var(--detective-bg-primary)' : 'var(--detective-text-primary)',
        }}
        title={isPlaying ? '일시정지' : '재생'}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      {/* 수사일 표시 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
        <span style={{ fontSize: 11, color: 'var(--detective-text-tertiary)', fontFamily: 'var(--font-mono)' }}>
          수사 진행:
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--detective-text-highlight)' }}>
          D+{currentDiscoveryDay}
        </span>
        <span style={{ fontSize: 10, color: 'var(--detective-text-tertiary)' }}>
          / D+{maxDiscoveryDay}
        </span>
      </div>

      {/* 속도 조절 */}
      <div style={{ display: 'flex', gap: 2 }}>
        {[1, 2, 4].map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            style={{
              padding: '4px 8px',
              fontSize: 10,
              border: 'none',
              borderRadius: 3,
              cursor: 'pointer',
              background: speed === s ? 'var(--detective-accent-secondary)' : 'var(--detective-bg-secondary)',
              color: speed === s ? 'var(--detective-bg-primary)' : 'var(--detective-text-tertiary)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {s}x
          </button>
        ))}
      </div>

      {/* 슬라이더 */}
      <input
        type="range"
        min={0}
        max={maxDiscoveryDay}
        value={currentDiscoveryDay}
        onChange={(e) => onDiscoveryDayChange(Number(e.target.value))}
        style={{
          width: 120,
          cursor: 'pointer',
        }}
      />
    </div>
  );
}
