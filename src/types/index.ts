// ══════════════════════════════════════════════
// Core Data Schema - 범용 확장 가능한 구조
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

// ── Event (사건 기록) ──
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
  events: Event[];
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
