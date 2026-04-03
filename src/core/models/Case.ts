import type { 
  CaseData, 
  CaseMeta, 
  Entity, 
  Relation,
  RelationType, 
  Event, 
  TimelinePoint, 
  VisualConfig,
  InvestigationEntry,
  EventEntry,
  EvidenceLink
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
    // 기본 snapshot 찾기
    const sortedDays = Object.keys(this.data.snapshots)
      .map(Number)
      .sort((a, b) => a - b);

    let snapDay = sortedDays[0] ?? 0;
    for (const sd of sortedDays) {
      if (sd <= day) snapDay = sd;
      else break;
    }

    const baseRelations = this.data.snapshots[snapDay] ?? [];

    // 이벤트 기반 동적 관계 추가
    const dynamicRelations = this.getDynamicRelationsFromEvents(snapDay, day);
    
    // 병합 (기존 관계 + 동적 관계)
    return this.mergeRelations(baseRelations, dynamicRelations);
  }

  // ── 이벤트 기반 동적 관계 생성 ──
  private getDynamicRelationsFromEvents(fromDay: number, toDay: number): Relation[] {
    const dynamicRelations: Relation[] = [];
    
    // EventEntry 사용 (듀얼 타임라인 지원 시)
    if (this.data.eventTimeline && this.data.eventTimeline.length > 0) {
      // EventEntry는 day 필드가 없으므로 currentVersion의 day 사용
      const events = this.data.eventTimeline.filter((e) => {
        const currentVer = e.timelineVersions[e.currentVersion];
        const eventDay = currentVer?.day;
        
        // day가 있으면 그걸 사용, 없으면 timestamp로 계산
        if (eventDay !== undefined) {
          return eventDay > fromDay && eventDay <= toDay;
        }
        
        // timestamp를 day로 변환 (meta.dateRange.start 기준)
        if (currentVer?.timestamp && this.data.meta.dateRange?.start) {
          const startDate = new Date(this.data.meta.dateRange.start);
          const eventDate = new Date(currentVer.timestamp);
          const calculatedDay = Math.floor((eventDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          return calculatedDay > fromDay && calculatedDay <= toDay;
        }
        
        return false;
      });

      console.log(`🔍 동적 관계 생성: fromDay=${fromDay}, toDay=${toDay}, 필터된 이벤트=${events.length}개`);

      events.forEach((event) => {
        if (!event.involvedEntities || event.involvedEntities.length < 2) return;

        const entities = event.involvedEntities;
        const currentVer = event.timelineVersions[event.currentVersion];
        if (!currentVer) return;
        
        console.log(`  📌 이벤트: "${event.text.substring(0, 30)}..." → 엔티티 [${entities.join(', ')}]`);
        
        // 모든 엔티티 쌍 조합 생성
        for (let i = 0; i < entities.length; i++) {
          for (let j = i + 1; j < entities.length; j++) {
            const source = entities[i];
            const target = entities[j];

            // 이벤트 내용 기반으로 관계 타입 추론
            const relationType = this.inferRelationType(event.text, event.importance);
            
            console.log(`    ➕ 관계 추가: ${source}-${target} (${relationType})`);
            
            dynamicRelations.push({
              source,
              target,
              type: relationType,
              direction: 'bi',
              strength: event.importance === 'high' ? 0.9 : event.importance === 'medium' ? 0.6 : 0.3,
              label: this.shortenEventText(event.text),
            });
          }
        }
      });
      
      console.log(`✅ 총 ${dynamicRelations.length}개 동적 관계 생성됨`);
    }
    // 기존 Event 타입은 involvedEntities 필드가 없으므로 동적 관계 생성 불가

    return dynamicRelations;
  }

  // ── 관계 타입 추론 (키워드 기반) ──
  private inferRelationType(text: string, importance: string): RelationType {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('갈등') || lowerText.includes('다툼') || lowerText.includes('충돌')) {
      return 'conflict';
    }
    if (lowerText.includes('의심') || lowerText.includes('수상') || lowerText.includes('미심쩍')) {
      return 'suspicious';
    }
    if (lowerText.includes('연인') || lowerText.includes('사랑') || lowerText.includes('애정')) {
      return 'romantic';
    }
    if (lowerText.includes('친구') || lowerText.includes('친분')) {
      return 'friendship';
    }
    if (lowerText.includes('업무') || lowerText.includes('회사') || lowerText.includes('직장')) {
      return 'work';
    }
    if (lowerText.includes('거래') || lowerText.includes('계약') || lowerText.includes('사업')) {
      return 'business';
    }
    
    // 중요도 높으면 의심, 낮으면 일반 접촉
    return importance === 'high' ? 'suspicious' : 'custom';
  }

  // ── 이벤트 텍스트 축약 ──
  private shortenEventText(text: string): string {
    if (text.length <= 10) return text;
    return text.substring(0, 10) + '...';
  }

  // ── 관계 병합 (중복 제거, 강도 합산) ──
  private mergeRelations(base: Relation[], dynamic: Relation[]): Relation[] {
    const merged = [...base];
    const existingKeys = new Set(
      base.map((r) => `${Math.min(r.source, r.target)}-${Math.max(r.source, r.target)}`)
    );

    dynamic.forEach((dyn) => {
      const key = `${Math.min(dyn.source, dyn.target)}-${Math.max(dyn.source, dyn.target)}`;
      
      if (!existingKeys.has(key)) {
        // 새 관계 추가
        merged.push(dyn);
        existingKeys.add(key);
      } else {
        // 기존 관계 강화 (강도 증가)
        const existing = merged.find(
          (r) =>
            (r.source === dyn.source && r.target === dyn.target) ||
            (r.source === dyn.target && r.target === dyn.source)
        );
        if (existing) {
          existing.strength = Math.min(1, existing.strength + dyn.strength * 0.3);
        }
      }
    });

    return merged;
  }

  // ── 수사 관점: 형사가 알고 있는 관계만 ──
  getDiscoveredRelationsAtDay(discoveryDay: number): Array<Relation & { discovered: boolean; discoveryDay: number; reliability: string }> {
    if (!this.hasDualTimeline()) {
      // 듀얼 타임라인 없으면 모든 관계 반환
      return this.getRelationsAtDay(this.maxDay).map(r => ({ ...r, discovered: true, discoveryDay: 0, reliability: '확정' }));
    }

    // 해당 수사일까지 발견된 증거들
    const discoveredEvidence = this.getInvestigationEntriesUpTo(discoveryDay);
    
    // 증거로 밝혀진 사건들
    const discoveredEventIds = new Set<string>();
    discoveredEvidence.forEach(evidence => {
      evidence.relatedEvents.forEach(eventId => discoveredEventIds.add(eventId));
    });

    // 밝혀진 사건들에 연관된 엔티티 추출
    const discoveredEntityPairs = new Set<string>();
    this.eventTimeline
      .filter(event => discoveredEventIds.has(event.id))
      .forEach(event => {
        if (event.involvedEntities && event.involvedEntities.length >= 2) {
          // 모든 엔티티 쌍 조합 생성
          for (let i = 0; i < event.involvedEntities.length; i++) {
            for (let j = i + 1; j < event.involvedEntities.length; j++) {
              const pair = [event.involvedEntities[i], event.involvedEntities[j]].sort().join('-');
              discoveredEntityPairs.add(pair);
            }
          }
        }
      });

    // 모든 관계를 가져와서 발견 여부 판단
    const allRelations = this.getRelationsAtDay(this.maxDay);
    
    return allRelations.map(relation => {
      const pair = [relation.source, relation.target].sort().join('-');
      const isDiscovered = discoveredEntityPairs.has(pair);
      
      // 발견 시점 찾기
      let relationDiscoveryDay = 0;
      let reliability = '확정';
      
      if (isDiscovered) {
        for (const evidence of discoveredEvidence) {
          const relatedEvents = this.eventTimeline.filter(e => evidence.relatedEvents.includes(e.id));
          const isRelated = relatedEvents.some(e => 
            e.involvedEntities?.includes(relation.source) && e.involvedEntities?.includes(relation.target)
          );
          
          if (isRelated) {
            relationDiscoveryDay = Math.max(relationDiscoveryDay, evidence.discoveryDay);
            reliability = evidence.reliability;
          }
        }
      }

      return {
        ...relation,
        discovered: isDiscovered,
        discoveryDay: relationDiscoveryDay,
        reliability,
      };
    });
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
