import type { InvestigationEntry } from '../../types';

interface InvestigationLogProps {
  entries: InvestigationEntry[];
  currentDiscoveryDay: number;
  onEvidenceClick?: (evidenceId: string) => void;
  newCardIds?: Set<string>;
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

export function InvestigationLog({ entries, currentDiscoveryDay, onEvidenceClick, newCardIds }: InvestigationLogProps) {
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
          const isNew = newCardIds?.has(entry.id) ?? false;

          return (
            <div
              key={entry.id}
              onClick={() => onEvidenceClick?.(entry.id)}
              style={{
                padding: '10px 12px',
                borderRadius: 6,
                background: isNew ? reliabilityColor + '22' : 'var(--detective-bg-tertiary)',
                border: `1px solid ${reliabilityColor}${isNew ? '' : '33'}`,
                borderLeft: `3px solid ${reliabilityColor}`,
                cursor: onEvidenceClick ? 'pointer' : 'default',
                transition: 'all 0.3s ease-out',
                transform: isNew ? 'scale(1.02)' : 'scale(1)',
                animation: isNew ? 'slideIn 0.5s ease-out' : undefined,
              }}
            >
              {isNew && (
                <style>{`
                  @keyframes slideIn {
                    from {
                      opacity: 0;
                      transform: translateX(20px) scale(0.95);
                    }
                    to {
                      opacity: 1;
                      transform: translateX(0) scale(1.02);
                    }
                  }
                `}</style>
              )}
              
              {/* 헤더 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14 }}>{typeInfo.icon}</span>
                  <span
                    style={{
                      fontSize: 9,
                      padding: '2px 6px',
                      borderRadius: 3,
                      background: reliabilityColor + '33',
                      color: reliabilityColor,
                      fontWeight: 600,
                    }}
                  >
                    {typeInfo.label}
                  </span>
                </div>
                <span style={{ fontSize: 9, color: 'var(--detective-text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                  D+{entry.discoveryDay}
                </span>
              </div>

              {/* 제목 */}
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--detective-text-primary)', marginBottom: 4 }}>
                {entry.title}
              </div>

              {/* 설명 */}
              {entry.description && (
                <div style={{ fontSize: 10, color: 'var(--detective-text-secondary)', lineHeight: 1.4, marginBottom: 6 }}>
                  {entry.description}
                </div>
              )}

              {/* 하단 메타 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                <span
                  style={{
                    fontSize: 9,
                    padding: '2px 6px',
                    borderRadius: 3,
                    background: 'var(--detective-bg-secondary)',
                    color: reliabilityColor,
                    fontWeight: 600,
                  }}
                >
                  {entry.reliability}
                </span>
                {entry.relatedEvents.length > 0 && (
                  <span style={{ fontSize: 9, color: 'var(--detective-text-tertiary)' }}>
                    관련 사건 {entry.relatedEvents.length}건
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
