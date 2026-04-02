import type { CaseMeta } from '../../types';

interface HeaderProps {
  meta: CaseMeta;
}

export function Header({ meta }: HeaderProps) {
  return (
    <div style={{
      padding: "20px 24px 12px",
      borderBottom: "1px solid var(--detective-border-primary)",
      background: "linear-gradient(180deg, var(--detective-bg-secondary) 0%, var(--detective-bg-primary) 100%)"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
        <span style={{ fontSize: 22 }}>🔍</span>
        <h1 style={{
          margin: 0,
          fontSize: 20,
          fontWeight: 700,
          color: "var(--detective-text-primary)",
          letterSpacing: "0.05em"
        }}>
          {meta.title}
        </h1>
        <span style={{
          fontSize: 11,
          background: "#e74c3c22",
          color: "#e74c3c",
          padding: "2px 10px",
          borderRadius: 3,
          border: "1px solid #e74c3c44",
          fontFamily: "var(--font-mono)"
        }}>
          CONFIDENTIAL
        </span>
      </div>
      {meta.subtitle && (
        <p style={{
          margin: 0,
          fontSize: 13,
          color: "var(--detective-text-tertiary)",
          fontStyle: "italic"
        }}>
          {meta.subtitle}
        </p>
      )}
    </div>
  );
}
