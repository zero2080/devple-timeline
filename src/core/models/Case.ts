import type { CaseData, CaseMeta, Entity, Relation, Event, TimelinePoint, VisualConfig } from '../../types';

/**
 * Case 클래스 - 사건 데이터의 비즈니스 로직
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
    return this.data.events;
  }

  get config(): VisualConfig {
    return this.data.config;
  }

  get maxDay(): number {
    return this.data.config.maxDay;
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

  // ── 이벤트 조회 (특정 시점까지) ──
  getEventsUpTo(day: number): Event[] {
    return this.data.events.filter((e) => e.day <= day);
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
}
