import type { ReactNode, Dispatch, RefObject, SetStateAction } from 'react';

// ══════════════════════════════════════════════
// ── Type Definitions ──
// ══════════════════════════════════════════════

export interface Person {
  id: number;
  name: string;
  role: string;
  desc: string;
  color: string;
  icon: string;
}

export type RelationType = "romantic" | "friendship" | "business" | "work" | "conflict" | "suspicious";
export type Direction = "bi" | "uni";

export interface Relation {
  source: number;
  target: number;
  type: RelationType;
  direction: Direction;
  strength: number;
  label: string;
}

export interface TimelinePoint {
  day: number;
  label: string;
  date: string;
  title: string;
}

export interface CaseEvent {
  day: number;
  text: string;
}

export interface RelStyle {
  color: string;
  dash: string;
  label: string;
}

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
  events: CaseEvent[];
  day: number;
}

export interface EdgeHistoryEntry {
  day: number;
  label: string;
  relations: Relation[];
}

export interface ForceSimulationResult {
  positions: Record<number, Position>;
  posRef: RefObject<Record<number, Position>>;
  velRef: RefObject<Record<number, Velocity>>;
  freezeNode: (id: number) => void;
  setPositions: Dispatch<SetStateAction<Record<number, Position>>>;
}

export interface ArrowMarkerProps {
  id: string;
  color: string;
}

export interface ZoomBtnProps {
  children: ReactNode;
  onClick: () => void;
  title: string;
}

export interface TimelineScrubberProps {
  currentDay: number;
  onDayChange: (day: number) => void;
  events: CaseEvent[];
}