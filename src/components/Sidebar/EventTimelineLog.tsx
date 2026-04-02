import type { Case } from '../../core/models/Case';

interface EventTimelineLogProps {
  caseData: Case;
  currentDiscoveryDay: number;
  onEventClick?: (eventId: string) => void;
}

export function EventTimelineLog({ caseData, currentDiscoveryDay, onEventClick }: EventTimelineLogProps) {
  const visibleEvents = caseData.getEventEntriesAtVersion(currentDiscoveryDay);

  // 시간순 정렬
  const sortedEvents = [...visibleEvents].sort((a, b) => {
    const aVersion = a.timelineVersions[a.currentVersion - 1];
    const bVersion = b.timelineVersions[b.currentVersion - 1];

    const aTime = aVersion.timestamp || aVersion.dateEstimate?.earliest || '';
    const bTime = bVersion.timestamp || bVersion.dateEstimate?.earliest || '';

    return aTime.localeCompare(bTime);
  });

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--detective-text-secondary)', marginBottom: 10 }}>
        📅 사건 타임라인 <span style={{ fontWeight: 400, color: 'var(--detective-text-tertiary)', fontSize: 10 }}>({visibleEvents.length}건)</span>
      </div>

      {visibleEvents.length === 0 && (
        <div style={{ fontSize: 11, color: 'var(--detective-text-tertiary)', fontStyle: 'italic', textAlign: 'center', padding: 20 }}>
          재구성된 사건 없음
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sortedEvents.map((event) => {
          const currentVersion = event.timelineVersions[event.currentVersion - 1];
          const hasMultipleVersions = event.timelineVersions.length > 1;

          const importanceColors = {
            high: '#ff4757',
            medium: '#ffa502',
            low: '#95a5a6',
          };

          return (
            <div
              key={event.id}
              onClick={() => onEventClick?.(event.id)}
              style={{
                padding: '10px 12px',
                background: 'var(--detective-bg-tertiary)',
                borderLeft: `3px solid ${importanceColors[event.importance]}`,
                borderRadius: 4,
                cursor: onEventClick ? 'pointer' : 'default',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (onEventClick) {
                  e.currentTarget.style.background = 'var(--detective-bg-secondary)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--detective-bg-tertiary)';
              }}
            >
              {/* 내용 */}
              <div style={{ fontSize: 11, color: 'var(--detective-text-primary)', lineHeight: 1.5, marginBottom: 6 }}>
                {event.text}
              </div>

              {/* 시간 정보 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                {currentVersion.timestamp && (
                  <span style={{ fontSize: 10, color: 'var(--detective-text-highlight)', fontFamily: 'var(--font-mono)' }}>
                    {new Date(currentVersion.timestamp).toLocaleString('ko-KR', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
                {currentVersion.dateEstimate && (
                  <span style={{ fontSize: 10, color: 'var(--detective-text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                    추정: {new Date(currentVersion.dateEstimate.earliest).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                    {' ~ '}
                    {new Date(currentVersion.dateEstimate.latest).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>

              {/* 메타 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 9, color: 'var(--detective-text-tertiary)' }}>
                <span
                  style={{
                    padding: '2px 6px',
                    borderRadius: 3,
                    background: importanceColors[event.importance] + '22',
                    color: importanceColors[event.importance],
                  }}
                >
                  {event.importance === 'high' ? '중요' : event.importance === 'medium' ? '보통' : '낮음'}
                </span>
                <span>•</span>
                <span>정밀도: {currentVersion.precision === 'minute' ? '분' : currentVersion.precision === 'hour' ? '시간' : currentVersion.precision === 'day' ? '일' : '불명'}</span>
                {hasMultipleVersions && (
                  <>
                    <span>•</span>
                    <span style={{ color: 'var(--detective-text-highlight)' }}>v{currentVersion.version} 업데이트</span>
                  </>
                )}
                {event.supportedBy.length > 0 && (
                  <>
                    <span>•</span>
                    <span>증거 {event.supportedBy.length}건</span>
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
