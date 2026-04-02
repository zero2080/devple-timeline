import { useState, useEffect, useRef, useCallback } from 'react';
import type { Entity, Relation, Position, Velocity } from '../types';

export interface ForceSimulationResult {
  positions: Record<number, Position>;
  posRef: React.MutableRefObject<Record<number, Position>>;
  velRef: React.MutableRefObject<Record<number, Velocity>>;
  freezeNode: (id: number) => void;
  setPositions: React.Dispatch<React.SetStateAction<Record<number, Position>>>;
}

export function useForceSimulation(
  nodes: Entity[],
  edges: Relation[],
  width: number,
  height: number
): ForceSimulationResult {
  const [positions, setPositions] = useState<Record<number, Position>>({});
  const posRef = useRef<Record<number, Position>>({});
  const velRef = useRef<Record<number, Velocity>>({});
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
    const pos: Record<number, Position> = {};
    const vel: Record<number, Velocity> = {};
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

        // Repulsion
        nodes.forEach((m) => {
          if (m.id === n.id) return;
          const dx = pos[n.id].x - pos[m.id].x;
          const dy = pos[n.id].y - pos[m.id].y;
          const d = Math.max(30, Math.sqrt(dx * dx + dy * dy));
          const f = 8000 / (d * d);
          fx += (dx / d) * f;
          fy += (dy / d) * f;
        });

        // Attraction (edges)
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
    edges.map((e) => `${e.source}-${e.target}-${e.type}`).join(","),
    width,
    height,
  ]);

  return { positions, posRef, velRef, freezeNode, setPositions };
}
