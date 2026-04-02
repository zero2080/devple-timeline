import { useState, useEffect, useRef, useCallback, useMemo, type MouseEvent as ReactMouseEvent } from "react";
import type { TimelineScrubberProps, EventCluster } from '../../types';

function clusterEvents(
  events: TimelineScrubberProps['events'],
  maxDay: number,
  trackWidth: number,
  minGap = 20
): EventCluster[] {
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

export function TimelineScrubber({
  currentDay,
  maxDay,
  onDayChange,
  events,
  timelinePoints,
}: TimelineScrubberProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [hoveredCluster, setHoveredCluster] = useState<number | null>(null);
  const [trackWidth, setTrackWidth] = useState(400);

  useEffect(() => {
    const measure = () => {
      if (trackRef.current) {
        setTrackWidth(trackRef.current.getBoundingClientRect().width);
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const dayFromX = useCallback(
    (clientX: number): number => {
      if (!trackRef.current) return 0;
      const rect = trackRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return Math.round(ratio * maxDay);
    },
    [maxDay]
  );

  useEffect(() => {
    const onMove = (e: globalThis.MouseEvent) => {
      if (!draggingRef.current) return;
      onDayChange(dayFromX(e.clientX));
    };
    const onUp = () => {
      draggingRef.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dayFromX, onDayChange]);

  const handleTrackMouse = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (e.type === "mousedown") {
      draggingRef.current = true;
      onDayChange(dayFromX(e.clientX));
    }
  };

  const headPos = (currentDay / maxDay) * 100;
  const clusters = useMemo(() => clusterEvents(events, maxDay, trackWidth), [events, maxDay, trackWidth]);

  const currentSnap = useMemo(() => {
    let snap = timelinePoints[0];
    for (const tp of timelinePoints) {
      if (tp.day <= currentDay) snap = tp;
    }
    return snap;
  }, [currentDay, timelinePoints]);

  return (
    <div style={{ padding: "16px 24px 12px", background: "var(--detective-bg-secondary)", borderBottom: "1px solid var(--detective-border-primary)" }}>
      <div
        style={{
          background: "var(--detective-bg-tertiary)",
          borderRadius: 6,
          padding: "8px 14px",
          marginBottom: 14,
          border: "1px solid var(--detective-border-secondary)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span style={{ fontSize: 15 }}>📋</span>
        <span style={{ fontSize: 12, color: "var(--detective-text-highlight)", fontWeight: 600 }}>
          {currentSnap?.title}
        </span>
        <span style={{ fontSize: 11, color: "var(--detective-text-tertiary)" }}>
          — D{currentDay > 0 ? "-" + (maxDay - currentDay) : "-" + maxDay}
        </span>
        <span
          style={{
            fontSize: 10,
            color: "var(--detective-text-tertiary)",
            fontFamily: "var(--font-mono)",
            marginLeft: "auto",
          }}
        >
          {currentSnap?.date}
        </span>
      </div>

      <div style={{ position: "relative", padding: "22px 0 32px", userSelect: "none" }}>
        {/* Event flags */}
        {clusters.map((cl, i) => {
          const pct = (cl.events[0].day / maxDay) * 100;
          const isActive = cl.events.some((e) => e.day <= currentDay);
          const isHovered = hoveredCluster === i;

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${pct}%`,
                top: 0,
                transform: "translateX(-50%)",
                zIndex: isHovered ? 20 : 5,
                cursor: "pointer",
              }}
              onMouseEnter={() => setHoveredCluster(i)}
              onMouseLeave={() => setHoveredCluster(null)}
            >
              <div style={{ width: 1, height: 14, background: isActive ? "#ffa50266" : "#3a322566", margin: "0 auto" }} />
              <div
                style={{
                  position: "absolute",
                  top: -2,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: isActive ? "#ffa502" : "var(--detective-border-primary)",
                  color: isActive ? "#1a1510" : "var(--detective-text-tertiary)",
                  fontSize: 8,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  minWidth: 14,
                  height: 14,
                  borderRadius: 3,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 3px",
                  lineHeight: 1,
                  boxShadow: isActive ? "0 0 6px #ffa50244" : "none",
                  transition: "all 0.2s",
                }}
              >
                {cl.events.length > 1 ? `🚩${cl.events.length}` : "🚩"}
              </div>

              {isHovered && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "100%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    marginBottom: 22,
                    width: 220,
                    background: "var(--detective-bg-tertiary)ee",
                    border: "1px solid var(--detective-border-primary)",
                    borderRadius: 6,
                    padding: "8px 10px",
                    fontSize: 10,
                    color: "var(--detective-text-secondary)",
                    lineHeight: 1.5,
                    zIndex: 30,
                    boxShadow: "0 4px 16px #00000066",
                  }}
                >
                  {cl.events.map((ev, j) => (
                    <div
                      key={j}
                      style={{
                        padding: "3px 0",
                        borderBottom: j < cl.events.length - 1 ? "1px solid var(--detective-border-secondary)44" : "none",
                        color: ev.day <= currentDay ? "var(--detective-text-primary)" : "var(--detective-text-tertiary)",
                      }}
                    >
                      <span style={{ color: "#ffa502", fontSize: 9, marginRight: 4, fontFamily: "var(--font-mono)" }}>
                        D-{maxDay - ev.day}
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
        <div
          ref={trackRef}
          onMouseDown={handleTrackMouse}
          style={{
            position: "relative",
            height: 6,
            background: "var(--detective-border-secondary)",
            borderRadius: 3,
            cursor: "pointer",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: `${headPos}%`,
              background: "linear-gradient(90deg, var(--detective-border-tertiary), #ffa502)",
              borderRadius: 3,
              transition: draggingRef.current ? "none" : "width 0.15s",
            }}
          />

          {/* Snap points */}
          {timelinePoints.map((tp) => {
            const pct = (tp.day / maxDay) * 100;
            const passed = tp.day <= currentDay;
            const isCurrent = tp.day === currentDay;

            return (
              <div
                key={tp.day}
                onClick={(e) => {
                  e.stopPropagation();
                  onDayChange(tp.day);
                }}
                style={{
                  position: "absolute",
                  left: `${pct}%`,
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  zIndex: 3,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: isCurrent ? 14 : 10,
                    height: isCurrent ? 14 : 10,
                    borderRadius: "50%",
                    background: passed ? "#ffa502" : "var(--detective-border-primary)",
                    border: isCurrent ? "2px solid var(--detective-text-highlight)" : `2px solid ${passed ? "#ffa502" : "var(--detective-border-tertiary)"}`,
                    transition: "all 0.2s",
                    boxShadow: isCurrent ? "0 0 8px #ffa50266" : "none",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: 16,
                    left: "50%",
                    transform: "translateX(-50%)",
                    whiteSpace: "nowrap",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 10, color: passed ? "var(--detective-text-primary)" : "var(--detective-text-tertiary)", fontWeight: isCurrent ? 700 : 400 }}>
                    {tp.label}
                  </div>
                  <div style={{ fontSize: 9, color: "var(--detective-text-tertiary)", fontFamily: "var(--font-mono)" }}>{tp.date}</div>
                </div>
              </div>
            );
          })}

          {/* Playhead */}
          <div
            style={{
              position: "absolute",
              left: `${headPos}%`,
              top: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 10,
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "var(--detective-text-highlight)",
              border: "3px solid var(--detective-bg-primary)",
              boxShadow: "0 0 10px #ffa50288, 0 0 3px #00000088",
              cursor: "grab",
              transition: draggingRef.current ? "none" : "left 0.15s",
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              draggingRef.current = true;
            }}
          />
        </div>
      </div>
    </div>
  );
}
