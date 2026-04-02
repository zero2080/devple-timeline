import type { InvestigationEntry } from '../../types';

interface InvestigationLogProps {
  entries: InvestigationEntry[];
  currentDiscoveryDay: number;
  onEvidenceClick?: (evidenceId: string) => void;
}

const EVIDENCE_TYPE_LABELS: Record<InvestigationEntry['type'], { icon: string; label: string }> = {
  evidence: { icon: '📦', label: '증거물' },
  testimony: { icon: '👤', label: '진술' },
  forensic: { icon: '🔬', label: '과학수사' },
  document: { icon: '📄', label: '문서' },
  cctv: { icon: '📹', label: 'CCTV' },
  analysis: { icon: '📊', label: '분석' },
};

const RELIABILITY_COLORS: Record<InvestigationEntry['reliability'], string> = {
  '확정': '#26de81',
  '추정': '#ffa502',
  '의심': '#ff4757',
  '모순': '#a29bfe',
};

export function InvestigationLog({ entries, currentDiscoveryDay, onEvidenceClick }: InvestigationLogProps) {
  const visibleEntries = entries.filter((e) => e.discoveryDay <= currentDiscoveryDay);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--detective-text-secondary)', marginBottom: 10 }}>
        🔍 수사 기록 <span style={{ fontWeight: 400, color: 'var(--detective-text-tertiary)', fontSize: 10 }}>({visibleEntries.length}건)</span>
      </div>

      {visibleEntries.length === 0 && (
        <div style={{ fontSize: 11, color: 'var(--detective-text-tertiary)', fontStyle: 'italic', textAlign: 'center', padding: 20 }}>
          아직 발견된 증거 없음
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[...visibleEntries].reverse().map((entry) => {
          const typeInfo = EVIDENCE_TYPE_LABELS[entry.type];
          const reliabilityColor = RELIABILITY_COLORS[entry.reliability];

          return (
            <div
              key={entry.id}
              onClick={() => onEvidenceClick?.(entry.id)}
              style={{
                padding: '10px 12px',
                background: 'var(--detective-bg-tertiary)',
                borderLeft: `3px solid ${reliabilityColor}`,
                borderRadius: 4,
                cursor: onEvidenceClick ? 'pointer' : 'default',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (onEvidenceClick) {
                  e.currentTarget.style.background = 'var(--detective-bg-secondary)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--detective-bg-tertiary)';
              }}
            >
              {/* 헤더 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 14 }}>{typeInfo.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--detective-text-primary)' }}>
                  {entry.title}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    marginLeft: 'auto',
                    padding: '2px 6px',
                    borderRadius: 3,
                    background: reliabilityColor + '22',
                    color: reliabilityColor,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {entry.reliability}
                </span>
              </div>

              {/* 내용 */}
              <div style={{ fontSize: 11, color: 'var(--detective-text-secondary)', lineHeight: 1.5, marginBottom: 6 }}>
                {entry.description}
              </div>

              {/* 메타 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 9, color: 'var(--detective-text-tertiary)' }}>
                <span style={{ fontFamily: 'var(--font-mono)' }}>D+{entry.discoveryDay}</span>
                <span>•</span>
                <span>{typeInfo.label}</span>
                {entry.relatedEvents.length > 0 && (
                  <>
                    <span>•</span>
                    <span>관련 사건 {entry.relatedEvents.length}건</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
