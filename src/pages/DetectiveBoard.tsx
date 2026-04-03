import { useState, useEffect, useRef, useCallback, useMemo, type MouseEvent as ReactMouseEvent } from "react";
import type { Case } from '../core/models/Case';
import type { Relation, InteractionState, GraphSize, PanState, TimelineMode } from '../types';
import { Header } from '../components/Layout/Header';
import { Legend } from '../components/Layout/Legend';
import { TimelineScrubber } from '../components/Timeline/TimelineScrubber';
import { TimelineModeToggle } from '../components/Timeline/TimelineModeToggle';
import { InvestigationPlayer } from '../components/Timeline/InvestigationPlayer';
import { ZoomControls } from '../components/Graph/ZoomControls';
import { ArrowMarker } from '../components/Graph/ArrowMarker';
import { InvestigationLog } from '../components/Sidebar/InvestigationLog';
import { EventTimelineLog } from '../components/Sidebar/EventTimelineLog';
import { ToastContainer } from '../components/Toast/ToastContainer';
import { useForceSimulation } from '../hooks/useForceSimulation';
import { useToast } from '../hooks/useToast';

interface DetectiveBoardProps {
  caseData: Case;
}

export default function DetectiveBoard({ caseData }: DetectiveBoardProps) {
  // 타임라인 모드
  const hasDualTimeline = caseData.hasDualTimeline();
  const [timelineMode, setTimelineMode] = useState<TimelineMode>(hasDualTimeline ? 'dual' : 'event');
  
  // 사건 타임라인 (기존)
  const [currentDay, setCurrentDay] = useState(0);
  
  // 수사 타임라인 (새로 추가)
  const maxDiscoveryDay = useMemo(() => {
    if (!hasDualTimeline) return 0;
    const entries = caseData.investigationTimeline;
    return entries.length > 0 ? Math.max(...entries.map((e) => e.discoveryDay)) : 0;
  }, [caseData, hasDualTimeline]);
  
  const [currentDiscoveryDay, setCurrentDiscoveryDay] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const prevDiscoveryDay = useRef(0);
  
  // 토스트 시스템
  const { toasts, addToast, removeToast } = useToast();
  
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const prevRelationsCount = useRef(0);
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
    type: null,
    nodeId: null,
    startX: 0,
    startY: 0,
    panStartX: 0,
    panStartY: 0,
  });

  // 모드별 관계 데이터
  const currentEdges = useMemo(() => {
    if (timelineMode === 'investigation' || timelineMode === 'dual') {
      return caseData.getDiscoveredRelationsAtDay(currentDiscoveryDay).filter(r => r.discovered);
    }
    return caseData.getRelationsAtDay(currentDay);
  }, [caseData, currentDay, currentDiscoveryDay, timelineMode]);

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

  // 수사 일 변경 시 토스트 표시
  useEffect(() => {
    if (!hasDualTimeline || timelineMode === 'event') return;
    if (prevDiscoveryDay.current === currentDiscoveryDay) return;
    if (currentDiscoveryDay === 0) {
      prevDiscoveryDay.current = 0;
      return;
    }

    // 새로 발견된 증거
    const newEvidence = caseData.investigationTimeline.filter(
      (e) => e.discoveryDay === currentDiscoveryDay
    );

    newEvidence.forEach((evidence) => {
      const typeIcons: Record<string, string> = {
        evidence: '📦',
        testimony: '👤',
        forensic: '🔬',
        document: '📄',
        cctv: '📹',
        analysis: '📊',
      };

      addToast({
        type: 'evidence',
        icon: typeIcons[evidence.type] || '📦',
        title: `증거 발견! (D+${evidence.discoveryDay})`,
        message: evidence.title,
        duration: 3000,
      });
    });

    prevDiscoveryDay.current = currentDiscoveryDay;
  }, [currentDiscoveryDay, hasDualTimeline, timelineMode, caseData, addToast]);

  // 관계 변화 감지 (듀얼 모드)
  useEffect(() => {
    if (timelineMode !== 'dual') return;
    
    const currentCount = currentEdges.length;
    if (prevRelationsCount.current === 0) {
      prevRelationsCount.current = currentCount;
      return;
    }

    if (currentCount > prevRelationsCount.current) {
      const diff = currentCount - prevRelationsCount.current;
      addToast({
        type: 'relation',
        icon: '⚠️',
        title: '새로운 관계 발견!',
        message: `${diff}건의 관계가 추가로 확인되었습니다.`,
        duration: 2500,
      });
    }

    prevRelationsCount.current = currentCount;
  }, [currentEdges.length, timelineMode, addToast]);

  const currentEvents = useMemo(() => caseData.getEventsUpTo(currentDay), [caseData, currentDay]);

  const uniqueEdgeKeys = new Set<string>();
  const forceEdges = currentEdges.filter((e) => {
    const key = [e.source, e.target].sort().join("-");
    if (uniqueEdgeKeys.has(key)) return false;
    uniqueEdgeKeys.add(key);
    return true;
  });

  const { positions, posRef, velRef, freezeNode, setPositions } = useForceSimulation(
    caseData.entities,
    forceEdges,
    graphSize.w,
    graphSize.h
  );

  const screenToGraph = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const r = svg.getBoundingClientRect();
    return {
      x: (clientX - r.left - panRef.current.x) / zoomRef.current,
      y: (clientY - r.top - panRef.current.y) / zoomRef.current,
    };
  }, []);

  // Wheel zoom
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

  // Mouse interactions
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
  }, [screenToGraph, setPositions, posRef, velRef]);

  const handleCanvasMouseDown = useCallback((e: ReactMouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    interRef.current = {
      type: "pan",
      nodeId: null,
      startX: e.clientX,
      startY: e.clientY,
      panStartX: panRef.current.x,
      panStartY: panRef.current.y,
    };
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  const handleNodeMouseDown = useCallback(
    (e: ReactMouseEvent<SVGGElement>, nodeId: number) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      interRef.current = {
        type: "node",
        nodeId,
        startX: e.clientX,
        startY: e.clientY,
        panStartX: 0,
        panStartY: 0,
      };
      freezeNode(nodeId);
    },
    [freezeNode]
  );

  const applyZoom = useCallback(
    (nz: number) => {
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
    },
    [graphSize]
  );

  const getEdgeHistory = (src: number, tgt: number) => {
    const history = caseData.getRelationHistory(src, tgt);
    return history.map((h) => {
      const tp = caseData.timeline.find((t) => t.day === h.day);
      return {
        day: h.day,
        label: tp?.label ?? `D-${caseData.maxDay - h.day}`,
        relations: h.relations,
      };
    });
  };

  const person = selectedNode ? caseData.getEntityById(selectedNode) : null;
  const nodeConnections = selectedNode ? caseData.getConnectionsForEntity(selectedNode, currentDay) : [];

  return (
    <div
      style={{
        fontFamily: "var(--font-primary)",
        background: "var(--detective-bg-primary)",
        color: "var(--detective-text-primary)",
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Grain texture */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 50,
          opacity: 0.06,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <Header meta={caseData.meta} />

      <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 80px)" }}>
        {/* 타임라인 컨트롤 */}
        <div style={{ padding: "12px 24px", background: "var(--detective-bg-secondary)", borderBottom: "1px solid var(--detective-border-primary)", display: "flex", alignItems: "center", gap: 12 }}>
          <TimelineModeToggle
            mode={timelineMode}
            onModeChange={setTimelineMode}
            hasDualTimeline={hasDualTimeline}
          />
          
          {hasDualTimeline && timelineMode === 'investigation' && (
            <InvestigationPlayer
              maxDiscoveryDay={maxDiscoveryDay}
              currentDiscoveryDay={currentDiscoveryDay}
              onDiscoveryDayChange={setCurrentDiscoveryDay}
              isPlaying={isPlaying}
              onPlayToggle={() => setIsPlaying(!isPlaying)}
            />
          )}
        </div>

        {(timelineMode === 'event' || !hasDualTimeline) && (
          <TimelineScrubber
            currentDay={currentDay}
            maxDay={caseData.maxDay}
            onDayChange={(d) => {
              setCurrentDay(d);
              setSelectedEdge(null);
            }}
            events={caseData.events}
            timelinePoints={caseData.timeline}
          />
        )}

        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          {/* Graph canvas */}
          <div ref={containerRef} style={{ flex: timelineMode === 'dual' ? 2 : 1, position: "relative", minHeight: 400, overflow: "hidden" }}>
            <svg
              ref={svgRef}
              width={graphSize.w}
              height={graphSize.h}
              style={{ position: "absolute", inset: 0, cursor: "grab", userSelect: "none" }}
              onMouseDown={handleCanvasMouseDown}
            >
              <defs>
                <radialGradient id="bg-grad" cx="50%" cy="50%" r="70%">
                  <stop offset="0%" stopColor="var(--detective-bg-tertiary)" />
                  <stop offset="100%" stopColor="var(--detective-bg-primary)" />
                </radialGradient>
                {Object.entries(caseData.config.relationStyles).map(([k, v]) => (
                  <ArrowMarker key={k} id={`arrow-${k}`} color={v.color} />
                ))}
              </defs>
              <rect width={graphSize.w} height={graphSize.h} fill="url(#bg-grad)" />

              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                {/* Edges */}
                {currentEdges.map((edge, i) => {
                  const sp = positions[edge.source];
                  const tp = positions[edge.target];
                  if (!sp || !tp) return null;

                  // 모드별 시각적 속성 결정
                  const edgeWithDiscovery = edge as any;
                  let edgeOpacity = 0.75;
                  let edgeDash = "";
                  let isNewlyDiscovered = false;
                  
                  if (timelineMode === 'investigation' || timelineMode === 'dual') {
                    // 수사 모드: 신뢰도에 따라 스타일 변경
                    if (edgeWithDiscovery.reliability === '추정') {
                      edgeDash = "4,4"; // 점선
                      edgeOpacity = 0.6;
                    } else if (edgeWithDiscovery.reliability === '의심') {
                      edgeDash = "2,4"; // 더 짧은 점선
                      edgeOpacity = 0.5;
                    }
                    
                    // 듀얼 모드: 새로 발견된 관계 강조
                    if (timelineMode === 'dual' && edgeWithDiscovery.discoveryDay === currentDiscoveryDay) {
                      isNewlyDiscovered = true;
                      edgeOpacity = 1.0;
                    }
                  }

                  const style = caseData.config.relationStyles[edge.type];
                  const dx = tp.x - sp.x;
                  const dy = tp.y - sp.y;
                  const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
                  const ox = (dx / dist) * 32;
                  const oy = (dy / dist) * 32;
                  const x1 = sp.x + ox;
                  const y1 = sp.y + oy;
                  const x2 = tp.x - ox;
                  const y2 = tp.y - oy;

                  const same = currentEdges.filter(
                    (e) =>
                      (e.source === edge.source && e.target === edge.target) ||
                      (e.source === edge.target && e.target === edge.source)
                  );
                  const idx = same.indexOf(edge);
                  const off = same.length > 1 ? (idx - (same.length - 1) / 2) * 20 : 0;
                  const mx = (x1 + x2) / 2 - (dy / dist) * off;
                  const my = (y1 + y2) / 2 + (dx / dist) * off;
                  const path = off !== 0 ? `M${x1},${y1} Q${mx},${my} ${x2},${y2}` : `M${x1},${y1} L${x2},${y2}`;
                  const isSel =
                    selectedEdge !== null &&
                    selectedEdge.source === edge.source &&
                    selectedEdge.target === edge.target &&
                    selectedEdge.type === edge.type;

                  return (
                    <g
                      key={`${edge.source}-${edge.target}-${edge.type}-${i}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEdge(edge);
                        setSelectedNode(null);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <path d={path} fill="none" stroke="transparent" strokeWidth={14} />
                      <path
                        d={path}
                        fill="none"
                        stroke={style.color}
                        strokeWidth={Math.max(1.5, edge.strength * 4)}
                        strokeDasharray={edgeDash || style.dash}
                        opacity={isSel ? 1 : edgeOpacity}
                        markerEnd={edge.direction === "uni" ? `url(#arrow-${edge.type})` : undefined}
                      >
                        {/* 새로 발견된 관계: 펄스 애니메이션 */}
                        {isNewlyDiscovered && (
                          <animate
                            attributeName="opacity"
                            values="1;0.3;1"
                            dur="1.5s"
                            repeatCount="3"
                          />
                        )}
                      </path>
                      {edge.direction === "bi" && (
                        <>
                          <path
                            d={path}
                            fill="none"
                            stroke="transparent"
                            strokeWidth={0}
                            markerEnd={`url(#arrow-${edge.type})`}
                          />
                          <path
                            d={`M${x2},${y2} ${off !== 0 ? `Q${mx},${my}` : "L"} ${x1},${y1}`}
                            fill="none"
                            stroke="transparent"
                            strokeWidth={0}
                            markerEnd={`url(#arrow-${edge.type})`}
                          />
                        </>
                      )}
                      <text
                        x={mx || (x1 + x2) / 2}
                        y={(my || (y1 + y2) / 2) - 6}
                        fill={style.color}
                        fontSize={11}
                        textAnchor="middle"
                        fontWeight={isNewlyDiscovered ? 700 : 500}
                        opacity={isSel ? 1 : edgeOpacity}
                        style={{ pointerEvents: "none", fontFamily: "var(--font-primary)" }}
                      >
                        {edge.label}
                        {timelineMode === 'investigation' && edgeWithDiscovery.reliability === '추정' && ' ?'}
                      </text>
                      
                      {/* 새 발견 뱃지 */}
                      {isNewlyDiscovered && (
                        <circle
                          cx={mx || (x1 + x2) / 2}
                          cy={(my || (y1 + y2) / 2) - 18}
                          r={6}
                          fill="#ffd43b"
                          stroke="var(--detective-bg-primary)"
                          strokeWidth={2}
                        >
                          <animate
                            attributeName="r"
                            values="4;8;4"
                            dur="1.5s"
                            repeatCount="3"
                          />
                        </circle>
                      )}
                    </g>
                  );
                })}

                {/* Nodes */}
                {caseData.entities.map((p) => {
                  const pos = positions[p.id];
                  if (!pos) return null;

                  const isSel = selectedNode === p.id;
                  const isConn = selectedNode
                    ? currentEdges.some(
                        (e) =>
                          (e.source === selectedNode && e.target === p.id) ||
                          (e.target === selectedNode && e.source === p.id)
                      )
                    : false;
                  const dimmed = selectedNode !== null && !isSel && !isConn;

                  return (
                    <g
                      key={p.id}
                      onMouseDown={(e) => handleNodeMouseDown(e, p.id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNode(p.id);
                        setSelectedEdge(null);
                      }}
                      style={{ cursor: "grab" }}
                    >
                      {isSel && (
                        <circle cx={pos.x} cy={pos.y} r={38} fill="none" stroke={p.color} strokeWidth={2} opacity={0.3}>
                          <animate attributeName="r" values="36;42;36" dur="2s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" />
                        </circle>
                      )}
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={28}
                        fill={isSel ? p.color + "33" : "var(--graph-node-bg)"}
                        stroke={p.color}
                        strokeWidth={isSel ? 3 : 1.5}
                        opacity={dimmed ? 0.25 : 1}
                        style={{ transition: "opacity 0.3s, fill 0.3s, stroke-width 0.3s" }}
                      />
                      <text
                        x={pos.x}
                        y={pos.y + 1}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={20}
                        fill="var(--detective-text-primary)"
                        style={{ pointerEvents: "none" }}
                        opacity={dimmed ? 0.25 : 1}
                      >
                        {p.icon}
                      </text>
                      <text
                        x={pos.x}
                        y={pos.y + 44}
                        textAnchor="middle"
                        fill={isSel ? "var(--detective-text-highlight)" : "var(--detective-text-primary)"}
                        fontSize={12}
                        fontWeight={isSel ? 700 : 600}
                        opacity={dimmed ? 0.25 : 1}
                        style={{ pointerEvents: "none", fontFamily: "var(--font-primary)" }}
                      >
                        {p.name}
                      </text>
                      <text
                        x={pos.x}
                        y={pos.y + 58}
                        textAnchor="middle"
                        fill="var(--detective-text-secondary)"
                        fontSize={10}
                        opacity={dimmed ? 0.15 : 0.8}
                        style={{ pointerEvents: "none", fontFamily: "var(--font-primary)" }}
                      >
                        {p.role}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>

            <ZoomControls
              zoom={zoom}
              onZoomIn={() => applyZoom(Math.min(4, zoomRef.current * 1.3))}
              onZoomOut={() => applyZoom(Math.max(0.15, zoomRef.current / 1.3))}
              onReset={() => {
                zoomRef.current = 1;
                panRef.current = { x: 0, y: 0 };
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
            />

            <Legend
              show={showLegend}
              onToggle={() => setShowLegend(!showLegend)}
              styles={caseData.config.relationStyles}
            />

            <div
              style={{
                position: "absolute",
                bottom: 14,
                right: 12,
                fontSize: 10,
                color: "var(--detective-text-tertiary)",
                background: "var(--detective-bg-tertiary)88",
                padding: "3px 8px",
                borderRadius: 3,
              }}
            >
              스크롤: 확대/축소 · 빈 곳 드래그: 이동 · 노드 드래그: 배치
            </div>
          </div>

          {/* Side Panel */}
          <div
            style={{
              width: timelineMode === 'dual' ? 320 : 280,
              borderLeft: "1px solid var(--detective-border-primary)",
              background: "var(--detective-bg-secondary)",
              overflowY: "auto",
              flexShrink: 0,
            }}
          >
            {/* 듀얼 모드일 때 수사/사건 타임라인 표시 */}
            {hasDualTimeline && timelineMode === 'investigation' && (
              <InvestigationLog
                entries={caseData.investigationTimeline}
                currentDiscoveryDay={currentDiscoveryDay}
              />
            )}

            {hasDualTimeline && timelineMode === 'dual' && (
              <>
                <InvestigationLog
                  entries={caseData.investigationTimeline}
                  currentDiscoveryDay={currentDiscoveryDay}
                />
                <div style={{ borderTop: '2px solid var(--detective-border-primary)', margin: '8px 0' }} />
                <EventTimelineLog
                  caseData={caseData}
                  currentDiscoveryDay={currentDiscoveryDay}
                />
              </>
            )}

            {/* 기존 사이드바 (event 모드 또는 듀얼 타임라인 없을 때) */}
            {(!hasDualTimeline || timelineMode === 'event') && (
              <>
                {person && (
                  <div style={{ padding: 16, borderBottom: "1px solid var(--detective-border-secondary)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 24 }}>{person.icon}</span>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: person.color }}>{person.name}</div>
                        <div style={{ fontSize: 11, color: "var(--detective-text-tertiary)" }}>{person.desc}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--detective-text-tertiary)", marginBottom: 10 }}>
                      현재 시점 연결: {nodeConnections.length}건
                    </div>
                    {nodeConnections.map((e, i) => {
                      const other = e.source === selectedNode ? e.target : e.source;
                      const otherP = caseData.getEntityById(other);
                      const st = caseData.config.relationStyles[e.type];

                      return (
                        <div
                          key={i}
                          style={{
                            padding: "6px 8px",
                            marginBottom: 4,
                            borderRadius: 4,
                            background: "var(--detective-bg-tertiary)",
                            border: "1px solid var(--detective-border-secondary)",
                            fontSize: 11,
                            cursor: "pointer",
                          }}
                          onClick={() => setSelectedEdge(e)}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ color: st.color }}>→ {otherP?.name}</span>
                            <span style={{ color: "var(--detective-text-tertiary)", fontSize: 10 }}>{e.label}</span>
                          </div>
                          <div style={{ display: "flex", gap: 6, marginTop: 3 }}>
                            <span
                              style={{
                                fontSize: 9,
                                padding: "1px 5px",
                                borderRadius: 3,
                                background: st.color + "22",
                                color: st.color,
                              }}
                            >
                              {st.label}
                            </span>
                            <span
                              style={{
                                fontSize: 9,
                                padding: "1px 5px",
                                borderRadius: 3,
                                background: "#ffffff11",
                                color: "var(--detective-text-tertiary)",
                              }}
                            >
                              강도 {Math.round(e.strength * 100)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {selectedEdge && (
                  <div style={{ padding: 16, borderBottom: "1px solid var(--detective-border-secondary)" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--detective-text-secondary)", marginBottom: 10 }}>
                      🔗 관계 변화 추적
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: caseData.config.relationStyles[selectedEdge.type].color,
                        marginBottom: 4,
                      }}
                    >
                      {caseData.getEntityById(selectedEdge.source)?.name} ↔{" "}
                      {caseData.getEntityById(selectedEdge.target)?.name}
                    </div>
                    <div style={{ marginTop: 10 }}>
                      {getEdgeHistory(selectedEdge.source, selectedEdge.target).map((h, i) => {
                        const isActive = h.day <= currentDay;
                        const isCurrentSnap = caseData.getRelationsAtDay(currentDay) === caseData.getRelationsAtDay(h.day);

                        return (
                          <div
                            key={i}
                            style={{
                              position: "relative",
                              paddingLeft: 16,
                              paddingBottom: 12,
                              borderLeft: `2px solid ${
                                isCurrentSnap
                                  ? "#ffa502"
                                  : isActive
                                  ? "var(--detective-border-tertiary)"
                                  : "var(--detective-border-secondary)"
                              }`,
                              opacity: isActive ? 1 : 0.35,
                            }}
                          >
                            <div
                              style={{
                                position: "absolute",
                                left: -5,
                                top: 0,
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: isCurrentSnap
                                  ? "#ffa502"
                                  : isActive
                                  ? "var(--detective-border-tertiary)"
                                  : "var(--detective-border-secondary)",
                              }}
                            />
                            <div
                              style={{
                                fontSize: 10,
                                color: isCurrentSnap ? "var(--detective-text-highlight)" : "var(--detective-text-tertiary)",
                                marginBottom: 2,
                              }}
                            >
                              {h.label}
                            </div>
                            {h.relations.map((r, j) => (
                              <div
                                key={j}
                                style={{
                                  fontSize: 11,
                                  color: caseData.config.relationStyles[r.type].color,
                                  padding: "2px 6px",
                                  marginBottom: 2,
                                  background: isCurrentSnap ? caseData.config.relationStyles[r.type].color + "11" : "transparent",
                                  borderRadius: 3,
                                }}
                              >
                                {r.label}
                                <span style={{ color: "var(--detective-text-tertiary)", marginLeft: 4, fontSize: 9 }}>
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
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--detective-text-secondary)", marginBottom: 10 }}>
                    📝 수사 기록 <span style={{ fontWeight: 400, color: "var(--detective-text-tertiary)", fontSize: 10 }}>({currentEvents.length}건)</span>
                  </div>
                  {currentEvents.length === 0 && (
                    <div style={{ fontSize: 11, color: "var(--detective-text-tertiary)", fontStyle: "italic" }}>
                      해당 시점 기록 없음
                    </div>
                  )}
                  {[...currentEvents].reverse().map((ev, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: 11,
                        color: "var(--detective-text-secondary)",
                        padding: "6px 8px",
                        marginBottom: 4,
                        borderRadius: 4,
                        background: "var(--detective-bg-tertiary)",
                        borderLeft: "2px solid #ffa50244",
                        lineHeight: 1.5,
                      }}
                    >
                      <span style={{ color: "#ffa502", fontSize: 9, marginRight: 6, fontFamily: "var(--font-mono)" }}>
                        D-{caseData.maxDay - ev.day}
                      </span>
                      {ev.text}
                    </div>
                  ))}
                </div>

                {!person && !selectedEdge && (
                  <div style={{ padding: 24, textAlign: "center" }}>
                    <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>🔎</div>
                    <div style={{ fontSize: 12, color: "var(--detective-text-tertiary)", lineHeight: 1.6 }}>
                      인물 노드를 클릭하면
                      <br />
                      상세 관계를 확인할 수 있습니다.
                      <br />
                      <br />
                      관계선을 클릭하면
                      <br />
                      시간에 따른 변화를 추적합니다.
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* 토스트 */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}
