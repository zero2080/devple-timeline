import type { RelationType, RelationStyle } from '../../types';

interface LegendProps {
  show: boolean;
  onToggle: () => void;
  styles: Record<RelationType, RelationStyle>;
}

export function Legend({ show, onToggle, styles }: LegendProps) {
  return (
    <>
      <button
        onClick={onToggle}
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          background: "var(--detective-bg-tertiary)cc",
          border: "1px solid var(--detective-border-primary)",
          color: "var(--detective-text-tertiary)",
          fontSize: 11,
          padding: "4px 10px",
          borderRadius: 4,
          cursor: "pointer",
        }}
      >
        {show ? "범례 닫기" : "📌 범례"}
      </button>

      {show && (
        <div
          style={{
            position: "absolute",
            top: 40,
            left: 12,
            background: "var(--detective-bg-secondary)ee",
            border: "1px solid var(--detective-border-primary)",
            borderRadius: 6,
            padding: 12,
            fontSize: 11,
            zIndex: 20,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6, color: "var(--detective-text-secondary)" }}>
            관계 유형
          </div>
          {(Object.entries(styles) as [RelationType, RelationStyle][]).map(([type, style]) => (
            <div key={type} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <svg width={24} height={8}>
                <line
                  x1={0}
                  y1={4}
                  x2={24}
                  y2={4}
                  stroke={style.color}
                  strokeWidth={2}
                  strokeDasharray={style.dash}
                />
              </svg>
              <span style={{ color: style.color }}>{style.label}</span>
            </div>
          ))}
          <div style={{ marginTop: 6, color: "var(--detective-text-tertiary)", fontSize: 10 }}>
            선 굵기 = 관계 강도 · 화살표 = 단방향
          </div>
        </div>
      )}
    </>
  );
}
