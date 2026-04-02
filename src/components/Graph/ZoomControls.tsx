import type { ZoomBtnProps } from '../../types';

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

function ZoomBtn({ children, onClick, title }: ZoomBtnProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 32,
        height: 32,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--detective-bg-tertiary)cc",
        border: "1px solid var(--detective-border-primary)",
        color: "var(--detective-text-secondary)",
        fontSize: 16,
        borderRadius: 4,
        cursor: "pointer",
        lineHeight: 1,
      }}
    >
      {children}
    </button>
  );
}

export function ZoomControls({ zoom, onZoomIn, onZoomOut, onReset }: ZoomControlsProps) {
  return (
    <>
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: 12,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <ZoomBtn onClick={onZoomIn} title="확대">
          +
        </ZoomBtn>
        <ZoomBtn onClick={onZoomOut} title="축소">
          −
        </ZoomBtn>
        <ZoomBtn onClick={onReset} title="초기화">
          ⟲
        </ZoomBtn>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 14,
          left: 52,
          fontSize: 10,
          color: "var(--detective-text-tertiary)",
          fontFamily: "var(--font-mono)",
          background: "var(--detective-bg-tertiary)cc",
          padding: "2px 8px",
          borderRadius: 3,
        }}
      >
        {Math.round(zoom * 100)}%
      </div>
    </>
  );
}
