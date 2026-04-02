import { useState, useEffect, useRef, useCallback, useMemo, type MouseEvent as ReactMouseEvent } from "react";
import type { Person, RelationType, Relation, TimelinePoint, CaseEvent, RelStyle, Position, Velocity, InteractionState, GraphSize, PanState, EventCluster, EdgeHistoryEntry, ForceSimulationResult, ArrowMarkerProps, ZoomBtnProps, TimelineScrubberProps } from '../types'

// ══════════════════════════════════════════════
// ── Constants ──
// ══════════════════════════════════════════════

const MAX_DAY = 180;

const PERSONS: Person[] = [
  { id: 1, name: "김태호", role: "피해자", desc: "카페 'Noir' 오너", color: "#e74c3c", icon: "☠" },
  { id: 2, name: "박서연", role: "용의자", desc: "전 여자친구 / 공동투자자", color: "#f39c12", icon: "⚠" },
  { id: 3, name: "이준혁", role: "용의자", desc: "사업 경쟁자", color: "#f39c12", icon: "⚠" },
  { id: 4, name: "최민지", role: "용의자", desc: "카페 직원 / 바리스타", color: "#f39c12", icon: "⚠" },
  { id: 5, name: "한도윤", role: "참고인", desc: "피해자 대학 동기", color: "#3498db", icon: "👤" },
  { id: 6, name: "정은수", role: "참고인", desc: "보험 설계사", color: "#3498db", icon: "👤" },
];

const TIMELINE_POINTS: TimelinePoint[] = [
  { day: 0, label: "6개월 전", date: "2025.10", title: "평온한 시기" },
  { day: 90, label: "3개월 전", date: "2026.01", title: "균열의 시작" },
  { day: 150, label: "1개월 전", date: "2026.03", title: "의심의 단서들" },
  { day: 180, label: "사건 당일", date: "2026.04.01", title: "D-Day" },
];

const RELATIONS_BY_DAY: Record<number, Relation[]> = {
  0: [
    { source: 1, target: 2, type: "romantic", direction: "bi", strength: 0.9, label: "연인" },
    { source: 1, target: 2, type: "business", direction: "bi", strength: 0.7, label: "공동투자" },
    { source: 1, target: 3, type: "business", direction: "bi", strength: 0.6, label: "사업 협력" },
    { source: 1, target: 4, type: "work", direction: "uni", strength: 0.5, label: "고용주→직원" },
    { source: 1, target: 5, type: "friendship", direction: "bi", strength: 0.8, label: "절친" },
    { source: 4, target: 5, type: "romantic", direction: "bi", strength: 0.3, label: "썸" },
  ],
  90: [
    { source: 1, target: 2, type: "conflict", direction: "bi", strength: 0.7, label: "투자금 분쟁" },
    { source: 1, target: 3, type: "conflict", direction: "bi", strength: 0.8, label: "경쟁 카페 오픈" },
    { source: 1, target: 4, type: "work", direction: "uni", strength: 0.5, label: "고용주→직원" },
    { source: 1, target: 5, type: "friendship", direction: "bi", strength: 0.7, label: "고민 상담" },
    { source: 2, target: 3, type: "suspicious", direction: "uni", strength: 0.4, label: "접촉 시작?" },
    { source: 4, target: 5, type: "romantic", direction: "bi", strength: 0.5, label: "연인" },
  ],
  150: [
    { source: 1, target: 2, type: "conflict", direction: "bi", strength: 0.9, label: "법적 분쟁 예고" },
    { source: 1, target: 3, type: "conflict", direction: "uni", strength: 0.6, label: "위협 의심" },
    { source: 1, target: 4, type: "suspicious", direction: "uni", strength: 0.6, label: "내부정보 유출?" },
    { source: 1, target: 5, type: "friendship", direction: "bi", strength: 0.8, label: "유언장 언급" },
    { source: 1, target: 6, type: "business", direction: "bi", strength: 0.7, label: "고액 보험 가입" },
    { source: 2, target: 4, type: "suspicious", direction: "bi", strength: 0.8, label: "비밀 접촉" },
    { source: 2, target: 3, type: "suspicious", direction: "bi", strength: 0.6, label: "공모 의심" },
    { source: 2, target: 6, type: "suspicious", direction: "uni", strength: 0.5, label: "보험 수익자 확인" },
  ],
  180: [
    { source: 1, target: 2, type: "conflict", direction: "bi", strength: 1.0, label: "최후의 통화" },
    { source: 1, target: 3, type: "conflict", direction: "uni", strength: 0.5, label: "알리바이 불일치" },
    { source: 1, target: 4, type: "suspicious", direction: "uni", strength: 0.9, label: "마지막 목격자" },
    { source: 1, target: 5, type: "friendship", direction: "bi", strength: 0.8, label: "부재중 전화 3통" },
    { source: 1, target: 6, type: "business", direction: "uni", strength: 0.8, label: "사망 보험금 10억" },
    { source: 2, target: 4, type: "suspicious", direction: "bi", strength: 1.0, label: "당일 만남 확인" },
    { source: 2, target: 3, type: "suspicious", direction: "bi", strength: 0.7, label: "통화기록 다수" },
    { source: 2, target: 6, type: "suspicious", direction: "uni", strength: 0.9, label: "보험 수익자=박서연" },
    { source: 4, target: 5, type: "romantic", direction: "bi", strength: 0.4, label: "관계 흔들림" },
    { source: 3, target: 6, type: "suspicious", direction: "uni", strength: 0.3, label: "같은 헬스장 회원" },
  ],
};

const SORTED_SNAP_DAYS: number[] = Object.keys(RELATIONS_BY_DAY).map(Number).sort((a, b) => a - b);

const EVENTS: CaseEvent[] = [
  { day: 0, text: "김태호, 박서연과 카페 'Noir' 공동 투자 시작" },
  { day: 5, text: "이준혁과 원두 공동구매 협력 관계" },
  { day: 85, text: "박서연, 투자금 회수 요구 → 분쟁 시작" },
  { day: 92, text: "이준혁, 100m 거리에 경쟁 카페 오픈" },
  { day: 100, text: "박서연-이준혁 간 첫 접촉 포착 (CCTV)" },
  { day: 145, text: "김태호, 10억 원 생명보험 가입 (수익자: 박서연)" },
  { day: 152, text: "최민지-박서연 비밀 만남 3회 확인" },
  { day: 158, text: "김태호, 한도윤에게 '유서를 써뒀다' 발언" },
  { day: 162, text: "카페 매출 데이터 외부 유출 정황" },
  { day: 175, text: "23:40 — 최민지, 카페 마감 후 퇴근 (마지막 목격)" },
  { day: 176, text: "23:52 — 김태호→한도윤 부재중 전화 3회" },
  { day: 178, text: "00:15 — 박서연-최민지 통화 2분 13초" },
  { day: 180, text: "01:30 — 김태호 사망 추정 시각" },
  { day: 180, text: "06:00 — 출근한 직원이 시신 발견" },
];

const REL_STYLES: Record<RelationType, RelStyle> = {
  romantic: { color: "#ff6b9d", dash: "", label: "연애/호감" },
  friendship: { color: "#74b9ff", dash: "", label: "우정" },
  business: { color: "#a8e6cf", dash: "6,3", label: "사업/계약" },
  work: { color: "#95a5a6", dash: "4,4", label: "업무" },
  conflict: { color: "#ff4757", dash: "", label: "갈등/분쟁" },
  suspicious: { color: "#ffa502", dash: "2,4", label: "의심/수상" },
};

// ══════════════════════════════════════════════
// ── Utility Functions ──
// ══════════════════════════════════════════════

function getRelationsAtDay(day: number): Relation[] {
  let snapDay = SORTED_SNAP_DAYS[0];
  for (const sd of SORTED_SNAP_DAYS) {
    if (sd <= day) snapDay = sd;
    else break;
  }
  return RELATIONS_BY_DAY[snapDay] ?? [];
}

function getEventsUpTo(day: number): CaseEvent[] {
  return EVENTS.filter((e) => e.day <= day);
}

function clusterEvents(events: CaseEvent[], maxDay: number, trackWidth: number, minGap = 20): EventCluster[] {
  const clusters: EventCluster[] = [];
  const sorted = [...events].sort((a, b) => a.day - b.day);
  for (const ev of sorted) {
    const px = (ev.day / maxDay) * trackWidth;
    const last = clusters[clusters.length - 1];
    if (last && Math.abs(px - last.px) < minGap) {
      last.events.push(ev);
      last.px = (last.px * (last.events.length - 1) + px) / last.events.length;
    } else {
      clusters.push({ px, events: [ev], day: ev.day });
    }
  }
  return clusters;
}

// ══════════════════════════════════════════════
// ── Force Simulation Hook ──
// ══════════════════════════════════════════════

function useForceSimulation(
    nodes: Person[],
    edges: Relation[],
    width: number,
    height: number,
): ForceSimulationResult {
  const [positions, setPositions] = useState<Record<number, Position>>({} as Record<number, Position>);
  const posRef = useRef<Record<number, Position>>({} as Record<number, Position>);
  const velRef = useRef<Record<number, Velocity>>({} as Record<number, Velocity>);
  const frameRef = useRef<number | null>(null);
  const iterRef = useRef(0);
  const frozenRef = useRef<Set<number>>(new Set());

  const freezeNode = useCallback((id: number) => {
    frozenRef.current.add(id);
  }, []);

  useEffect(() => {
    if (!nodes.length) return;
    const cx = width / 2;
    const cy = height / 2;
    const pos = {} as Record<number, Position>;
    const vel = {} as Record<number, Velocity>;
    const step = (2 * Math.PI) / nodes.length;

    nodes.forEach((n, i) => {
      const ex = posRef.current[n.id];
      if (ex) {
        pos[n.id] = { ...ex };
        vel[n.id] = velRef.current[n.id] ?? { vx: 0, vy: 0 };
      } else {
        const r = Math.min(width, height) * 0.28;
        pos[n.id] = {
          x: cx + r * Math.cos(step * i - Math.PI / 2),
          y: cy + r * Math.sin(step * i - Math.PI / 2),
        };
        vel[n.id] = { vx: 0, vy: 0 };
      }
    });

    posRef.current = pos;
    velRef.current = vel;
    iterRef.current = 0;

    const tick = () => {
      const alpha = Math.max(0.001, 0.3 * Math.pow(0.99, iterRef.current));

      nodes.forEach((n) => {
        if (frozenRef.current.has(n.id)) return;
        let fx = (cx - pos[n.id].x) * 0.01;
        let fy = (cy - pos[n.id].y) * 0.01;

        nodes.forEach((m) => {
          if (m.id === n.id) return;
          const dx = pos[n.id].x - pos[m.id].x;
          const dy = pos[n.id].y - pos[m.id].y;
          const d = Math.max(30, Math.sqrt(dx * dx + dy * dy));
          const f = 8000 / (d * d);
          fx += (dx / d) * f;
          fy += (dy / d) * f;
        });

        edges.forEach((e) => {
          let otherId: number | null = null;
          if (e.source === n.id) otherId = e.target;
          else if (e.target === n.id) otherId = e.source;
          if (!otherId || !pos[otherId]) return;
          const dx = pos[otherId].x - pos[n.id].x;
          const dy = pos[otherId].y - pos[n.id].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          const f = (d - 160) * 0.05;
          fx += (dx / d) * f;
          fy += (dy / d) * f;
        });

        vel[n.id].vx = (vel[n.id].vx + fx * alpha) * 0.6;
        vel[n.id].vy = (vel[n.id].vy + fy * alpha) * 0.6;
      });

      nodes.forEach((n) => {
        if (frozenRef.current.has(n.id)) return;
        pos[n.id].x += vel[n.id].vx;
        pos[n.id].y += vel[n.id].vy;
      });

      iterRef.current++;
      setPositions({ ...pos });
      if (iterRef.current < 300) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [
    nodes.map((n) => n.id).join(","),
    edges.map((e) => e.source + e.target + e.type).join(","),
    width,
    height,
  ]);

  return { positions, posRef, velRef, freezeNode, setPositions };
}

// ══════════════════════════════════════════════
// ── Small Components ──
// ══════════════════════════════════════════════

function ArrowMarker({ id, color }: ArrowMarkerProps) {
  return (
      <marker id={id} viewBox="0 0 10 6" refX="10" refY="3" markerWidth="10" markerHeight="6" orient="auto-start-reverse">
        <path d="M0,0 L10,3 L0,6 Z" fill={color} />
      </marker>
  );
}

function ZoomBtn({ children, onClick, title }: ZoomBtnProps) {
  return (
      <button onClick={onClick} title={title} style={{
        width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
        background: "#2a2419cc", border: "1px solid #3a3225", color: "#b8a88a",
        fontSize: 16, borderRadius: 4, cursor: "pointer", lineHeight: 1,
      }}>
        {children}
      </button>
  );
}

// ══════════════════════════════════════════════
// ── Timeline Scrubber ──
// ══════════════════════════════════════════════

function TimelineScrubber({ currentDay, onDayChange, events }: TimelineScrubberProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [hoveredCluster, setHoveredCluster] = useState<number | null>(null);
  const [trackWidth, setTrackWidth] = useState(400);

  useEffect(() => {
    const measure = () => {
      if (trackRef.current) setTrackWidth(trackRef.current.getBoundingClientRect().width);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const dayFromX = useCallback((clientX: number): number => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(ratio * MAX_DAY);
  }, []);

  useEffect(() => {
    const onMove = (e: globalThis.MouseEvent) => {
      if (!draggingRef.current) return;
      onDayChange(dayFromX(e.clientX));
    };
    const onUp = () => { draggingRef.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dayFromX, onDayChange]);

  const handleTrackMouse = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (e.type === "mousedown") {
      draggingRef.current = true;
      onDayChange(dayFromX(e.clientX));
    }
  };

  const headPos = (currentDay / MAX_DAY) * 100;
  const clusters = useMemo(() => clusterEvents(events, MAX_DAY, trackWidth), [events, trackWidth]);

  const currentSnap = useMemo((): TimelinePoint => {
    let snap = TIMELINE_POINTS[0];
    for (const tp of TIMELINE_POINTS) {
      if (tp.day <= currentDay) snap = tp;
    }
    return snap;
  }, [currentDay]);

  return (
      <div style={{ padding: "16px 24px 12px", background: "#1e1912", borderBottom: "1px solid #3a3225" }}>
        <div style={{
          background: "#15120d", borderRadius: 6, padding: "8px 14px", marginBottom: 14,
          border: "1px solid #2a2419", display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: 15 }}>📋</span>
          <span style={{ fontSize: 12, color: "#ffd43b", fontWeight: 600 }}>{currentSnap.title}</span>
          <span style={{ fontSize: 11, color: "#6a5e4b" }}>— D{currentDay > 0 ? "-" + (MAX_DAY - currentDay) : "-" + MAX_DAY}</span>
          <span style={{ fontSize: 10, color: "#5a4e3b", fontFamily: "monospace", marginLeft: "auto" }}>{currentSnap.date}</span>
        </div>

        <div style={{ position: "relative", padding: "22px 0 32px", userSelect: "none" }}>
          {/* Event flags */}
          {clusters.map((cl, i) => {
            const pct = (cl.events[0].day / MAX_DAY) * 100;
            const isActive = cl.events.some((e) => e.day <= currentDay);
            const isHovered = hoveredCluster === i;
            return (
                <div key={i} style={{
                  position: "absolute", left: `${pct}%`, top: 0,
                  transform: "translateX(-50%)", zIndex: isHovered ? 20 : 5, cursor: "pointer",
                }}
                     onMouseEnter={() => setHoveredCluster(i)}
                     onMouseLeave={() => setHoveredCluster(null)}
                >
                  <div style={{ width: 1, height: 14, background: isActive ? "#ffa50266" : "#3a322566", margin: "0 auto" }} />
                  <div style={{
                    position: "absolute", top: -2, left: "50%", transform: "translateX(-50%)",
                    background: isActive ? "#ffa502" : "#3a3225",
                    color: isActive ? "#1a1510" : "#6a5e4b",
                    fontSize: 8, fontWeight: 700, fontFamily: "monospace",
                    minWidth: 14, height: 14, borderRadius: 3,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "0 3px", lineHeight: 1,
                    boxShadow: isActive ? "0 0 6px #ffa50244" : "none",
                    transition: "all 0.2s",
                  }}>
                    {cl.events.length > 1 ? `🚩${cl.events.length}` : "🚩"}
                  </div>
                  {isHovered && (
                      <div style={{
                        position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)",
                        marginBottom: 22, width: 220,
                        background: "#15120dee", border: "1px solid #3a3225",
                        borderRadius: 6, padding: "8px 10px", fontSize: 10,
                        color: "#a89878", lineHeight: 1.5, zIndex: 30,
                        boxShadow: "0 4px 16px #00000066",
                      }}>
                        {cl.events.map((ev, j) => (
                            <div key={j} style={{
                              padding: "3px 0",
                              borderBottom: j < cl.events.length - 1 ? "1px solid #2a241944" : "none",
                              color: ev.day <= currentDay ? "#d4c5a9" : "#5a4e3b",
                            }}>
                      <span style={{ color: "#ffa502", fontSize: 9, marginRight: 4, fontFamily: "monospace" }}>
                        D-{MAX_DAY - ev.day}
                      </span>
                              {ev.text}
                            </div>
                        ))}
                      </div>
                  )}
                </div>
            );
          })}

          {/* Track */}
          <div ref={trackRef} onMouseDown={handleTrackMouse}
               style={{ position: "relative", height: 6, background: "#2a2419", borderRadius: 3, cursor: "pointer" }}>
            <div style={{
              position: "absolute", left: 0, top: 0, bottom: 0,
              width: `${headPos}%`, background: "linear-gradient(90deg, #5a4e3b, #ffa502)",
              borderRadius: 3, transition: draggingRef.current ? "none" : "width 0.15s",
            }} />

            {/* Snap points */}
            {TIMELINE_POINTS.map((tp) => {
              const pct = (tp.day / MAX_DAY) * 100;
              const passed = tp.day <= currentDay;
              const isCurrent = tp.day === currentDay;
              return (
                  <div key={tp.day}
                       onClick={(e) => { e.stopPropagation(); onDayChange(tp.day); }}
                       style={{
                         position: "absolute", left: `${pct}%`, top: "50%",
                         transform: "translate(-50%, -50%)", zIndex: 3, cursor: "pointer",
                       }}>
                    <div style={{
                      width: isCurrent ? 14 : 10, height: isCurrent ? 14 : 10, borderRadius: "50%",
                      background: passed ? "#ffa502" : "#3a3225",
                      border: isCurrent ? "2px solid #ffd43b" : `2px solid ${passed ? "#ffa502" : "#5a4e3b"}`,
                      transition: "all 0.2s", boxShadow: isCurrent ? "0 0 8px #ffa50266" : "none",
                    }} />
                    <div style={{
                      position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
                      whiteSpace: "nowrap", textAlign: "center",
                    }}>
                      <div style={{ fontSize: 10, color: passed ? "#d4c5a9" : "#5a4e3b", fontWeight: isCurrent ? 700 : 400 }}>{tp.label}</div>
                      <div style={{ fontSize: 9, color: "#4a4030", fontFamily: "monospace" }}>{tp.date}</div>
                    </div>
                  </div>
              );
            })}

            {/* Playhead */}
            <div style={{
              position: "absolute", left: `${headPos}%`, top: "50%",
              transform: "translate(-50%, -50%)", zIndex: 10,
              width: 18, height: 18, borderRadius: "50%",
              background: "#ffd43b", border: "3px solid #1a1510",
              boxShadow: "0 0 10px #ffa50288, 0 0 3px #00000088",
              cursor: "grab", transition: draggingRef.current ? "none" : "left 0.15s",
            }}
                 onMouseDown={(e) => { e.stopPropagation(); draggingRef.current = true; }}
            />
          </div>
        </div>
      </div>
  );
}

// ══════════════════════════════════════════════
// ── Main Component ──
// ══════════════════════════════════════════════

export default function DetectiveBoard() {
  const [currentDay, setCurrentDay] = useState(0);
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Relation | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const [graphSize, setGraphSize] = useState<GraphSize>({ w: 700, h: 500 });

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<PanState>({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const panRef = useRef<PanState>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const interRef = useRef<InteractionState>({
    type: null, nodeId: null, startX: 0, startY: 0, panStartX: 0, panStartY: 0,
  });

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const r = containerRef.current.getBoundingClientRect();
        setGraphSize({ w: r.width, h: Math.max(420, r.height) });
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const currentEdges = useMemo(() => getRelationsAtDay(currentDay), [currentDay]);
  const currentEvents = useMemo(() => getEventsUpTo(currentDay), [currentDay]);

  const uniqueEdgeKeys = new Set<string>();
  const forceEdges = currentEdges.filter((e) => {
    const key = [e.source, e.target].sort().join("-");
    if (uniqueEdgeKeys.has(key)) return false;
    uniqueEdgeKeys.add(key);
    return true;
  });

  const { positions, posRef, velRef, freezeNode, setPositions } = useForceSimulation(PERSONS, forceEdges, graphSize.w, graphSize.h);

  const screenToGraph = useCallback((clientX: number, clientY: number): Position => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const r = svg.getBoundingClientRect();
    return {
      x: (clientX - r.left - panRef.current.x) / zoomRef.current,
      y: (clientY - r.top - panRef.current.y) / zoomRef.current,
    };
  }, []);

  // wheel zoom
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = svg.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      const dir = e.deltaY < 0 ? 1 : -1;
      const nz = Math.min(4, Math.max(0.15, zoomRef.current * (1 + dir * 0.12)));
      const ratio = nz / zoomRef.current;
      panRef.current = {
        x: mx - (mx - panRef.current.x) * ratio,
        y: my - (my - panRef.current.y) * ratio,
      };
      zoomRef.current = nz;
      setZoom(nz);
      setPan({ ...panRef.current });
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  // mouse interactions
  useEffect(() => {
    const onMove = (e: globalThis.MouseEvent) => {
      const inter = interRef.current;
      if (!inter.type) return;
      if (inter.type === "pan") {
        panRef.current = {
          x: inter.panStartX + e.clientX - inter.startX,
          y: inter.panStartY + e.clientY - inter.startY,
        };
        setPan({ ...panRef.current });
      } else if (inter.type === "node" && inter.nodeId) {
        const { x, y } = screenToGraph(e.clientX, e.clientY);
        posRef.current[inter.nodeId] = { x, y };
        if (velRef.current[inter.nodeId]) {
          velRef.current[inter.nodeId] = { vx: 0, vy: 0 };
        }
        setPositions((prev) => ({ ...prev, [inter.nodeId as number]: { x, y } }));
      }
    };
    const onUp = () => {
      interRef.current.type = null;
      interRef.current.nodeId = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [screenToGraph, setPositions]);

  const handleCanvasMouseDown = useCallback((e: ReactMouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    interRef.current = {
      type: "pan", nodeId: null,
      startX: e.clientX, startY: e.clientY,
      panStartX: panRef.current.x, panStartY: panRef.current.y,
    };
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  const handleNodeMouseDown = useCallback((e: ReactMouseEvent<SVGGElement>, nodeId: number) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    interRef.current = {
      type: "node", nodeId,
      startX: e.clientX, startY: e.clientY,
      panStartX: 0, panStartY: 0,
    };
    freezeNode(nodeId);
  }, [freezeNode]);

  const applyZoom = useCallback((nz: number) => {
    const cx = graphSize.w / 2;
    const cy = graphSize.h / 2;
    const ratio = nz / zoomRef.current;
    panRef.current = {
      x: cx - (cx - panRef.current.x) * ratio,
      y: cy - (cy - panRef.current.y) * ratio,
    };
    zoomRef.current = nz;
    setZoom(nz);
    setPan({ ...panRef.current });
  }, [graphSize]);

  const getEdgeHistory = (src: number, tgt: number): EdgeHistoryEntry[] => {
    const history: EdgeHistoryEntry[] = [];
    for (const dayKey of SORTED_SNAP_DAYS) {
      const rels = RELATIONS_BY_DAY[dayKey] ?? [];
      const found = rels.filter(
          (r) => (r.source === src && r.target === tgt) || (r.source === tgt && r.target === src),
      );
      if (found.length) {
        const tp = TIMELINE_POINTS.find((t) => t.day === dayKey);
        history.push({ day: dayKey, label: tp?.label ?? `D-${MAX_DAY - dayKey}`, relations: found });
      }
    }
    return history;
  };

  const person = selectedNode ? PERSONS.find((p) => p.id === selectedNode) ?? null : null;
  const nodeConnections = selectedNode
      ? currentEdges.filter((e) => e.source === selectedNode || e.target === selectedNode)
      : [];

  return (
      <div style={{
        fontFamily: "'Noto Serif KR', 'Nanum Myeongjo', Georgia, serif",
        background: "#1a1510", color: "#d4c5a9",
        minHeight: "100vh", position: "relative", overflow: "hidden",
      }}>
        {/* grain */}
        <div style={{
          position: "fixed", inset: 0, pointerEvents: "none", zIndex: 50, opacity: 0.06,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }} />

        {/* Header */}
        <div style={{ padding: "20px 24px 12px", borderBottom: "1px solid #3a3225", background: "linear-gradient(180deg, #221d15 0%, #1a1510 100%)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <span style={{ fontSize: 22 }}>🔍</span>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#e8d9b8", letterSpacing: "0.05em" }}>사건번호 2026-0401</h1>
            <span style={{ fontSize: 11, background: "#e74c3c22", color: "#e74c3c", padding: "2px 10px", borderRadius: 3, border: "1px solid #e74c3c44", fontFamily: "monospace" }}>CONFIDENTIAL</span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "#8a7e6b", fontStyle: "italic" }}>카페 'Noir' 오너 김태호 살인사건 — 인물 관계도 분석</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 80px)" }}>
          <TimelineScrubber
              currentDay={currentDay}
              onDayChange={(d: number) => { setCurrentDay(d); setSelectedEdge(null); }}
              events={EVENTS}
          />

          <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
            {/* Graph canvas */}
            <div ref={containerRef} style={{ flex: 1, position: "relative", minHeight: 400, overflow: "hidden" }}>
              <svg ref={svgRef} width={graphSize.w} height={graphSize.h}
                   style={{ position: "absolute", inset: 0, cursor: "grab", userSelect: "none" }}
                   onMouseDown={handleCanvasMouseDown}>
                <defs>
                  <radialGradient id="bg-grad" cx="50%" cy="50%" r="70%">
                    <stop offset="0%" stopColor="#2a2318" />
                    <stop offset="100%" stopColor="#1a1510" />
                  </radialGradient>
                  {(Object.entries(REL_STYLES) as [RelationType, RelStyle][]).map(([k, v]) => (
                      <ArrowMarker key={k} id={`arrow-${k}`} color={v.color} />
                  ))}
                </defs>
                <rect width={graphSize.w} height={graphSize.h} fill="url(#bg-grad)" />

                <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                  {/* Edges */}
                  {currentEdges.map((edge, i) => {
                    const sp = positions[edge.source];
                    const tp2 = positions[edge.target];
                    if (!sp || !tp2) return null;
                    const style = REL_STYLES[edge.type];
                    const dx = tp2.x - sp.x;
                    const dy = tp2.y - sp.y;
                    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
                    const ox = (dx / dist) * 32;
                    const oy = (dy / dist) * 32;
                    const x1 = sp.x + ox;
                    const y1 = sp.y + oy;
                    const x2 = tp2.x - ox;
                    const y2 = tp2.y - oy;

                    const same = currentEdges.filter(
                        (e) => (e.source === edge.source && e.target === edge.target) || (e.source === edge.target && e.target === edge.source),
                    );
                    const idx = same.indexOf(edge);
                    const off = same.length > 1 ? (idx - (same.length - 1) / 2) * 20 : 0;
                    const mx = (x1 + x2) / 2 - (dy / dist) * off;
                    const my = (y1 + y2) / 2 + (dx / dist) * off;
                    const path = off !== 0 ? `M${x1},${y1} Q${mx},${my} ${x2},${y2}` : `M${x1},${y1} L${x2},${y2}`;
                    const isSel = selectedEdge !== null
                        && selectedEdge.source === edge.source
                        && selectedEdge.target === edge.target
                        && selectedEdge.type === edge.type;

                    return (
                        <g key={`${edge.source}-${edge.target}-${edge.type}-${i}`}
                           onClick={(e) => { e.stopPropagation(); setSelectedEdge(edge); setSelectedNode(null); }}
                           style={{ cursor: "pointer" }}>
                          <path d={path} fill="none" stroke="transparent" strokeWidth={14} />
                          <path d={path} fill="none" stroke={style.color}
                                strokeWidth={Math.max(1.5, edge.strength * 4)} strokeDasharray={style.dash}
                                opacity={isSel ? 1 : 0.75}
                                markerEnd={edge.direction === "uni" ? `url(#arrow-${edge.type})` : undefined} />
                          {edge.direction === "bi" && (
                              <>
                                <path d={path} fill="none" stroke="transparent" strokeWidth={0} markerEnd={`url(#arrow-${edge.type})`} />
                                <path d={`M${x2},${y2} ${off !== 0 ? `Q${mx},${my}` : "L"} ${x1},${y1}`}
                                      fill="none" stroke="transparent" strokeWidth={0} markerEnd={`url(#arrow-${edge.type})`} />
                              </>
                          )}
                          <text x={mx || (x1 + x2) / 2} y={(my || (y1 + y2) / 2) - 6}
                                fill={style.color} fontSize={11} textAnchor="middle" fontWeight={500}
                                opacity={isSel ? 1 : 0.85}
                                style={{ pointerEvents: "none", fontFamily: "'Noto Sans KR', sans-serif" }}>
                            {edge.label}
                          </text>
                        </g>
                    );
                  })}

                  {/* Nodes */}
                  {PERSONS.map((p) => {
                    const pos = positions[p.id];
                    if (!pos) return null;
                    const isSel = selectedNode === p.id;
                    const isConn = selectedNode
                        ? currentEdges.some((e) => (e.source === selectedNode && e.target === p.id) || (e.target === selectedNode && e.source === p.id))
                        : false;
                    const dimmed = selectedNode !== null && !isSel && !isConn;
                    return (
                        <g key={p.id}
                           onMouseDown={(e) => handleNodeMouseDown(e, p.id)}
                           onClick={(e) => { e.stopPropagation(); setSelectedNode(p.id); setSelectedEdge(null); }}
                           style={{ cursor: "grab" }}>
                          {isSel && (
                              <circle cx={pos.x} cy={pos.y} r={38} fill="none" stroke={p.color} strokeWidth={2} opacity={0.3}>
                                <animate attributeName="r" values="36;42;36" dur="2s" repeatCount="indefinite" />
                                <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" />
                              </circle>
                          )}
                          <circle cx={pos.x} cy={pos.y} r={28}
                                  fill={isSel ? p.color + "33" : "#2a2318"} stroke={p.color}
                                  strokeWidth={isSel ? 3 : 1.5} opacity={dimmed ? 0.25 : 1}
                                  style={{ transition: "opacity 0.3s, fill 0.3s, stroke-width 0.3s" }} />
                          <text x={pos.x} y={pos.y + 1} textAnchor="middle" dominantBaseline="central"
                                fontSize={20} fill="#f0e6d0" style={{ pointerEvents: "none" }} opacity={dimmed ? 0.25 : 1}>
                            {p.icon}
                          </text>
                          <text x={pos.x} y={pos.y + 44} textAnchor="middle"
                                fill={isSel ? "#ffd43b" : "#efe0c4"} fontSize={12} fontWeight={isSel ? 700 : 600}
                                opacity={dimmed ? 0.25 : 1}
                                style={{ pointerEvents: "none", fontFamily: "'Noto Sans KR', sans-serif" }}>
                            {p.name}
                          </text>
                          <text x={pos.x} y={pos.y + 58} textAnchor="middle"
                                fill="#b8a88a" fontSize={10} opacity={dimmed ? 0.15 : 0.8}
                                style={{ pointerEvents: "none", fontFamily: "'Noto Sans KR', sans-serif" }}>
                            {p.role}
                          </text>
                        </g>
                    );
                  })}
                </g>
              </svg>

              {/* Zoom controls */}
              <div style={{ position: "absolute", bottom: 12, left: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                <ZoomBtn onClick={() => applyZoom(Math.min(4, zoomRef.current * 1.3))} title="확대">+</ZoomBtn>
                <ZoomBtn onClick={() => applyZoom(Math.max(0.15, zoomRef.current / 1.3))} title="축소">−</ZoomBtn>
                <ZoomBtn onClick={() => { zoomRef.current = 1; panRef.current = { x: 0, y: 0 }; setZoom(1); setPan({ x: 0, y: 0 }); }} title="초기화">⟲</ZoomBtn>
              </div>
              <div style={{
                position: "absolute", bottom: 14, left: 52, fontSize: 10, color: "#6a5e4b",
                fontFamily: "monospace", background: "#2a2419cc", padding: "2px 8px", borderRadius: 3,
              }}>{Math.round(zoom * 100)}%</div>

              <button onClick={() => setShowLegend(!showLegend)} style={{
                position: "absolute", top: 12, left: 12, background: "#2a2419cc",
                border: "1px solid #3a3225", color: "#8a7e6b", fontSize: 11, padding: "4px 10px",
                borderRadius: 4, cursor: "pointer",
              }}>{showLegend ? "범례 닫기" : "📌 범례"}</button>

              {showLegend && (
                  <div style={{
                    position: "absolute", top: 40, left: 12, background: "#1e1912ee",
                    border: "1px solid #3a3225", borderRadius: 6, padding: 12, fontSize: 11,
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: 6, color: "#b8a88a" }}>관계 유형</div>
                    {(Object.entries(REL_STYLES) as [RelationType, RelStyle][]).map(([k, v]) => (
                        <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                          <svg width={24} height={8}><line x1={0} y1={4} x2={24} y2={4} stroke={v.color} strokeWidth={2} strokeDasharray={v.dash} /></svg>
                          <span style={{ color: v.color }}>{v.label}</span>
                        </div>
                    ))}
                    <div style={{ marginTop: 6, color: "#6a5e4b", fontSize: 10 }}>선 굵기 = 관계 강도 · 화살표 = 단방향</div>
                  </div>
              )}

              <div style={{
                position: "absolute", bottom: 14, right: 12, fontSize: 10, color: "#5a4e3b",
                background: "#2a241988", padding: "3px 8px", borderRadius: 3,
              }}>스크롤: 확대/축소 · 빈 곳 드래그: 이동 · 노드 드래그: 배치</div>
            </div>

            {/* ── Side Panel ── */}
            <div style={{ width: 280, borderLeft: "1px solid #3a3225", background: "#1e1912", overflowY: "auto", flexShrink: 0 }}>
              {person && (
                  <div style={{ padding: 16, borderBottom: "1px solid #2a2419" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 24 }}>{person.icon}</span>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: person.color }}>{person.name}</div>
                        <div style={{ fontSize: 11, color: "#8a7e6b" }}>{person.desc}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: "#6a5e4b", marginBottom: 10 }}>현재 시점 연결: {nodeConnections.length}건</div>
                    {nodeConnections.map((e, i) => {
                      const other: number = e.source === selectedNode ? e.target : e.source;
                      const otherP = PERSONS.find((p) => p.id === other);
                      const st = REL_STYLES[e.type];
                      return (
                          <div key={i} style={{
                            padding: "6px 8px", marginBottom: 4, borderRadius: 4,
                            background: "#15120d", border: "1px solid #2a2419", fontSize: 11, cursor: "pointer",
                          }} onClick={() => setSelectedEdge(e)}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ color: st.color }}>→ {otherP?.name}</span>
                              <span style={{ color: "#5a4e3b", fontSize: 10 }}>{e.label}</span>
                            </div>
                            <div style={{ display: "flex", gap: 6, marginTop: 3 }}>
                              <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: st.color + "22", color: st.color }}>{st.label}</span>
                              <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "#ffffff11", color: "#8a7e6b" }}>강도 {Math.round(e.strength * 100)}%</span>
                            </div>
                          </div>
                      );
                    })}
                  </div>
              )}

              {selectedEdge && (
                  <div style={{ padding: 16, borderBottom: "1px solid #2a2419" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#b8a88a", marginBottom: 10 }}>🔗 관계 변화 추적</div>
                    <div style={{ fontSize: 13, color: REL_STYLES[selectedEdge.type].color, marginBottom: 4 }}>
                      {PERSONS.find((p) => p.id === selectedEdge.source)?.name} ↔ {PERSONS.find((p) => p.id === selectedEdge.target)?.name}
                    </div>
                    <div style={{ marginTop: 10 }}>
                      {getEdgeHistory(selectedEdge.source, selectedEdge.target).map((h, i) => {
                        const isActive = h.day <= currentDay;
                        const isCurrentSnap = getRelationsAtDay(currentDay) === RELATIONS_BY_DAY[h.day];
                        return (
                            <div key={i} style={{
                              position: "relative", paddingLeft: 16, paddingBottom: 12,
                              borderLeft: `2px solid ${isCurrentSnap ? "#ffa502" : isActive ? "#5a4e3b" : "#2a2419"}`,
                              opacity: isActive ? 1 : 0.35,
                            }}>
                              <div style={{
                                position: "absolute", left: -5, top: 0, width: 8, height: 8, borderRadius: "50%",
                                background: isCurrentSnap ? "#ffa502" : isActive ? "#5a4e3b" : "#2a2419",
                              }} />
                              <div style={{ fontSize: 10, color: isCurrentSnap ? "#ffd43b" : "#6a5e4b", marginBottom: 2 }}>{h.label}</div>
                              {h.relations.map((r, j) => (
                                  <div key={j} style={{
                                    fontSize: 11, color: REL_STYLES[r.type].color, padding: "2px 6px", marginBottom: 2,
                                    background: isCurrentSnap ? REL_STYLES[r.type].color + "11" : "transparent", borderRadius: 3,
                                  }}>
                                    {r.label}
                                    <span style={{ color: "#5a4e3b", marginLeft: 4, fontSize: 9 }}>
                              ({r.direction === "bi" ? "양방향" : "단방향"} · {Math.round(r.strength * 100)}%)
                            </span>
                                  </div>
                              ))}
                            </div>
                        );
                      })}
                    </div>
                  </div>
              )}

              {/* 수사 기록 */}
              <div style={{ padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#b8a88a", marginBottom: 10 }}>
                  📝 수사 기록 <span style={{ fontWeight: 400, color: "#5a4e3b", fontSize: 10 }}>({currentEvents.length}건)</span>
                </div>
                {currentEvents.length === 0 && (
                    <div style={{ fontSize: 11, color: "#5a4e3b", fontStyle: "italic" }}>해당 시점 기록 없음</div>
                )}
                {[...currentEvents].reverse().map((ev, i) => (
                    <div key={i} style={{
                      fontSize: 11, color: "#a89878", padding: "6px 8px", marginBottom: 4, borderRadius: 4,
                      background: "#15120d", borderLeft: "2px solid #ffa50244", lineHeight: 1.5,
                    }}>
                  <span style={{ color: "#ffa502", fontSize: 9, marginRight: 6, fontFamily: "monospace" }}>
                    D-{MAX_DAY - ev.day}
                  </span>
                      {ev.text}
                    </div>
                ))}
              </div>

              {!person && !selectedEdge && (
                  <div style={{ padding: 24, textAlign: "center" }}>
                    <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>🔎</div>
                    <div style={{ fontSize: 12, color: "#6a5e4b", lineHeight: 1.6 }}>
                      인물 노드를 클릭하면<br />상세 관계를 확인할 수 있습니다.<br /><br />
                      관계선을 클릭하면<br />시간에 따른 변화를 추적합니다.
                    </div>
                  </div>
              )}
            </div>
          </div>
        </div>
      </div>
  );
}
