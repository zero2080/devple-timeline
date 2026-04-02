import type { ArrowMarkerProps } from '../../types';

export function ArrowMarker({ id, color }: ArrowMarkerProps) {
  return (
    <marker
      id={id}
      viewBox="0 0 10 6"
      refX="10"
      refY="3"
      markerWidth="10"
      markerHeight="6"
      orient="auto-start-reverse"
    >
      <path d="M0,0 L10,3 L0,6 Z" fill={color} />
    </marker>
  );
}
