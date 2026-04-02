// ══════════════════════════════════════════════
// Core Data Schema - 듀얼 타임라인 구조
// ══════════════════════════════════════════════

export type EntityType = "person" | "organization" | "location" | "object";
export type RelationType = "romantic" | "friendship" | "business" | "work" | "conflict" | "suspicious" | "family" | "custom";
export type Direction = "bi" | "uni";

// ── Case Metadata ──
export interface CaseMeta {
  id: string;
  title: string;
  subtitle?: string;
  category: "detective" | "family-tree" | "organization" | "story" | "custom";
  dateRange?: {
    start: string;
    end: string;
  };
  description?: string;
  investigationStartDate?: string; // 수사 시작일
}

// ── Entity (범용 개체) ──
export interface Entity {
  id: number;
  name: string;
  type: EntityType;
  role?: string;
  desc?: string;
  color: string;
  icon: string;
  metadata?: Record<string, any>;
}

// ── Relation (관계) ──
export interface Relation {
  source: number;
  target: number;
  type: RelationType;
  direction: Direction;
  strength: number; // 0~1
  label: string;
  metadata?: Record<string, any>;
}

// ── Timeline Point (시점 스냅샷) ──
export interface TimelinePoint {
  day: number;
  label: string;
  date: string;
  title: string;
}

// ── Timeline Snapshot (특정 시점의 관계 상태) ──
export interface TimelineSnapshot {
  day: number;
  relations: Relation[];
}

// ══════════════════════════════════════════════
// 듀얼 타임라인: 수사 vs 사건
// ══════════════════════════════════════════════

// 🔍 수사 타임라인 - 형사가 증거를 발견한 순서
export interface InvestigationEntry {
  id: string;
  discoveryDate: string;        // ISO 8601: "2026-04-01T06:00:00+09:00"
  discoveryDay: number;          // 수사 시작일 기준 (D+0, D+1, ...)
  type: "evidence" | "testimony" | "forensic" | "document" | "cctv" | "analysis";
  title: string;
  description: string;
  
  // 이 증거로 밝혀진/업데이트된 사건들
  relatedEvents: string[];       // EventEntry IDs
  
  // 신뢰도
  reliability: "확정" | "추정" | "의심" | "모순";
  
  // 메타데이터
  metadata?: {
    source?: string;             // "CCTV 영상", "부검 소견" 등
    investigator?: string;
    notes?: string;
  };
}

// 📅 사건 타임라인 - 실제 일어난 사건의 시간 순서
export interface EventEntry {
  id: string;
  text: string;
  importance: "low" | "medium" | "high";
  
  // 시간 정보 (버전 관리)
  timelineVersions: TimelineVersion[];
  currentVersion: number;
  
  // 이 사건을 뒷받침하는 증거들
  supportedBy: string[];         // InvestigationEntry IDs
  
  // 연관된 인물들
  involvedEntities?: number[];
  
  // 메타데이터
  metadata?: {
    location?: string;
    witnesses?: string[];
    [key: string]: any;
  };
}

// 시간 정보 버전 (수사 진행하면서 업데이트)
export interface TimelineVersion {
  version: number;
  updatedAt: string;             // 수사일 기준 (ISO 8601)
  updatedByEvidence: string[];   // InvestigationEntry IDs
  
  // 시간 정보
  timestamp?: string;            // ISO 8601 (정확한 시간)
  day?: number;                  // 상대적 날짜 (옵션)
  
  dateEstimate?: {
    earliest: string;            // ISO 8601
    latest: string;              // ISO 8601
    confidence: "low" | "medium" | "high";
  };
  
  precision: "year" | "month" | "day" | "hour" | "minute" | "second" | "unknown";
  
  // 변경 사유
  changeReason?: string;
  changeType: "initial" | "refinement" | "correction" | "contradiction";
}

// 증거-사건 연결
export interface EvidenceLink {
  evidenceId: string;            // InvestigationEntry ID
  eventId: string;               // EventEntry ID
  linkType: "proves" | "suggests" | "contradicts" | "updates";
  strength: number;              // 0~1
  description?: string;
}

// ── Old Event Type (하위 호환) ──
export interface Event {
  day: number;
  text: string;
  importance?: "low" | "medium" | "high";
  metadata?: Record<string, any>;
}

// ── Visual Config (스타일 설정) ──
export interface RelationStyle {
  color: string;
  dash?: string;
  label: string;
}

export interface VisualConfig {
  maxDay: number;
  relationStyles: Record<RelationType, RelationStyle>;
  theme?: "light" | "dark" | "auto";
}

// ── Complete Case Data ──
export interface CaseData {
  meta: CaseMeta;
  entities: Entity[];
  timeline: TimelinePoint[];
  snapshots: Record<number, Relation[]>; // day → relations mapping
  
  // 듀얼 타임라인
  investigationTimeline: InvestigationEntry[];
  eventTimeline: EventEntry[];
  evidenceLinks: EvidenceLink[];
  
  // 하위 호환 (deprecated)
  events?: Event[];
  
  config: VisualConfig;
}

// ══════════════════════════════════════════════
// Component Props Types
// ══════════════════════════════════════════════

export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  vx: number;
  vy: number;
}

export type InteractionType = "pan" | "node" | null;

export interface InteractionState {
  type: InteractionType;
  nodeId: number | null;
  startX: number;
  startY: number;
  panStartX: number;
  panStartY: number;
}

export interface GraphSize {
  w: number;
  h: number;
}

export interface PanState {
  x: number;
  y: number;
}

export interface EventCluster {
  px: number;
  events: Event[];
  day: number;
}

export interface EdgeHistoryEntry {
  day: number;
  label: string;
  relations: Relation[];
}

// ── Arrow Marker Props ──
export interface ArrowMarkerProps {
  id: string;
  color: string;
}

// ── Zoom Button Props ──
export interface ZoomBtnProps {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}

// ── Timeline Scrubber Props ──
export interface TimelineScrubberProps {
  currentDay: number;
  maxDay: number;
  onDayChange: (day: number) => void;
  events: Event[];
  timelinePoints: TimelinePoint[];
}

// ── Timeline Mode ──
export type TimelineMode = "investigation" | "event" | "dual";
