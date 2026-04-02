import type { 
  CaseData, 
  CaseMeta, 
  Entity, 
  Relation, 
  Event, 
  TimelinePoint, 
  VisualConfig,
  InvestigationEntry,
  EventEntry,
  EvidenceLink,
  TimelineVersion
} from '../../types';

/**
 * Case 클래스 - 사건 데이터의 비즈니스 로직 (듀얼 타임라인 지원)
 */
export class Case {
  private data: CaseData;

  constructor(data: CaseData) {
    this.data = data;
  }

  // ── Getters ──
  get meta(): CaseMeta {
    return this.data.meta;
  }

  get entities(): Entity[] {
    return this.data.entities;
  }

  get timeline(): TimelinePoint[] {
    return this.data.timeline;
  }

  get events(): Event[] {
    // 하위 호환: events 필드가 있으면 사용, 없으면 eventTimeline에서 변환
    if (this.data.events) {
      return this.data.events;
    }
    return this.convertEventTimelineToLegacy();
  }

  get config(): VisualConfig {
    return this.data.config;
  }

  get maxDay(): number {
    return this.data.config.maxDay;
  }

  // ── 듀얼 타임라인 Getters ──
  get investigationTimeline(): InvestigationEntry[] {
    return this.data.investigationTimeline || [];
  }

  get eventTimeline(): EventEntry[] {
    return this.data.eventTimeline || [];
  }

  get evidenceLinks(): EvidenceLink[] {
    return this.data.evidenceLinks || [];
  }

  // ── 엔티티 조회 ──
  getEntityById(id: number): Entity | undefined {
    return this.data.entities.find((e) => e.id === id);
  }

  getEntitiesByType(type: Entity['type']): Entity[] {
    return this.data.entities.filter((e) => e.type === type);
  }

  // ── 관계 조회 (특정 시점) ──
  getRelationsAtDay(day: number): Relation[] {
    const sortedDays = Object.keys(this.data.snapshots)
      .map(Number)
      .sort((a, b) => a - b);

    let snapDay = sortedDays[0] ?? 0;
    for (const sd of sortedDays) {
      if (sd <= day) snapDay = sd;
      else break;
    }

    return this.data.snapshots[snapDay] ?? [];
  }

  // ── 이벤트 조회 (특정 시점까지) - 레거시 ──
  getEventsUpTo(day: number): Event[] {
    if (this.data.events) {
      return this.data.events.filter((e) => e.day <= day);
    }
    
    // eventTimeline 사용
    return this.eventTimeline
      .filter((e) => {
        const currentVersion = e.timelineVersions[e.currentVersion - 1];
        if (!currentVersion) return false;
        
        if (currentVersion.day !== undefined) {
          return currentVersion.day <= day;
        }
        
        // timestamp 기반 변환 (향후 구현)
        return false;
      })
      .map((e) => {
        const currentVersion = e.timelineVersions[e.currentVersion - 1];
        return {
          day: currentVersion.day || 0,
          text: e.text,
          importance: e.importance,
        };
      });
  }

  // ── 수사 타임라인 조회 (특정 수사일까지) ──
  getInvestigationEntriesUpTo(discoveryDay: number): InvestigationEntry[] {
    return this.investigationTimeline.filter((e) => e.discoveryDay <= discoveryDay);
  }

  // ── 사건 타임라인 조회 (특정 시점 기준) ──
  getEventEntriesAtVersion(discoveryDay: number): EventEntry[] {
    return this.eventTimeline
      .map((event) => {
        // 해당 수사일까지 업데이트된 버전 찾기
        let latestVersion = event.timelineVersions[0];
        for (const version of event.timelineVersions) {
          const versionDiscoveryDay = this.getDiscoveryDayFromTimestamp(version.updatedAt);
          if (versionDiscoveryDay <= discoveryDay) {
            latestVersion = version;
          }
        }
        
        return {
          ...event,
          currentVersion: latestVersion.version,
        };
      })
      .filter((e) => {
        // 해당 수사일까지 발견되지 않은 사건은 제외
        const currentVersion = e.timelineVersions[e.currentVersion - 1];
        const versionDiscoveryDay = this.getDiscoveryDayFromTimestamp(currentVersion.updatedAt);
        return versionDiscoveryDay <= discoveryDay;
      });
  }

  // ── 증거 조회 ──
  getEvidenceById(id: string): InvestigationEntry | undefined {
    return this.investigationTimeline.find((e) => e.id === id);
  }

  getEvidenceForEvent(eventId: string): InvestigationEntry[] {
    const event = this.eventTimeline.find((e) => e.id === eventId);
    if (!event) return [];
    
    return event.supportedBy
      .map((evidenceId) => this.getEvidenceById(evidenceId))
      .filter((e): e is InvestigationEntry => e !== undefined);
  }

  getEventsForEvidence(evidenceId: string): EventEntry[] {
    const evidence = this.getEvidenceById(evidenceId);
    if (!evidence) return [];
    
    return evidence.relatedEvents
      .map((eventId) => this.eventTimeline.find((e) => e.id === eventId))
      .filter((e): e is EventEntry => e !== undefined);
  }

  // ── 증거 링크 조회 ──
  getLinksForEvent(eventId: string): EvidenceLink[] {
    return this.evidenceLinks.filter((link) => link.eventId === eventId);
  }

  getLinksForEvidence(evidenceId: string): EvidenceLink[] {
    return this.evidenceLinks.filter((link) => link.evidenceId === evidenceId);
  }

  // ── 관계 히스토리 조회 (두 엔티티 간) ──
  getRelationHistory(sourceId: number, targetId: number): Array<{ day: number; relations: Relation[] }> {
    const history: Array<{ day: number; relations: Relation[] }> = [];
    const sortedDays = Object.keys(this.data.snapshots)
      .map(Number)
      .sort((a, b) => a - b);

    for (const day of sortedDays) {
      const rels = this.data.snapshots[day] ?? [];
      const found = rels.filter(
        (r) =>
          (r.source === sourceId && r.target === targetId) ||
          (r.source === targetId && r.target === sourceId)
      );
      if (found.length > 0) {
        history.push({ day, relations: found });
      }
    }

    return history;
  }

  // ── 특정 엔티티의 연결 관계 ──
  getConnectionsForEntity(entityId: number, day: number): Relation[] {
    const relations = this.getRelationsAtDay(day);
    return relations.filter((r) => r.source === entityId || r.target === entityId);
  }

  // ── 타임라인 포인트 조회 (현재 시점 기준) ──
  getCurrentTimelinePoint(day: number): TimelinePoint {
    let current = this.data.timeline[0];
    for (const tp of this.data.timeline) {
      if (tp.day <= day) current = tp;
    }
    return current;
  }

  // ── 유틸리티: 수사일 계산 ──
  private getDiscoveryDayFromTimestamp(timestamp: string): number {
    if (!this.meta.investigationStartDate) return 0;
    
    const start = new Date(this.meta.investigationStartDate);
    const target = new Date(timestamp);
    const diffMs = target.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  // ── 유틸리티: EventTimeline → Legacy Event 변환 ──
  private convertEventTimelineToLegacy(): Event[] {
    return this.eventTimeline.map((e) => {
      const currentVersion = e.timelineVersions[e.currentVersion - 1];
      return {
        day: currentVersion.day || 0,
        text: e.text,
        importance: e.importance,
      };
    });
  }

  // ── 데이터 유효성 검증 ──
  validate(): boolean {
    if (!this.data.meta || !this.data.meta.id || !this.data.meta.title) {
      console.error('Invalid case meta');
      return false;
    }
    if (!Array.isArray(this.data.entities) || this.data.entities.length === 0) {
      console.error('Invalid entities');
      return false;
    }
    if (!this.data.config || typeof this.data.config.maxDay !== 'number') {
      console.error('Invalid config');
      return false;
    }
    return true;
  }

  // ── 전체 데이터 반환 (readonly) ──
  toJSON(): Readonly<CaseData> {
    return Object.freeze({ ...this.data });
  }

  // ── 듀얼 타임라인 지원 여부 확인 ──
  hasDualTimeline(): boolean {
    return (
      Array.isArray(this.data.investigationTimeline) &&
      this.data.investigationTimeline.length > 0 &&
      Array.isArray(this.data.eventTimeline) &&
      this.data.eventTimeline.length > 0
    );
  }
}
