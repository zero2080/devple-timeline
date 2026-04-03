import { useEffect, useState } from 'react';

export interface ToastData {
  id: string;
  type: 'evidence' | 'event' | 'relation';
  icon: string;
  title: string;
  message: string;
  duration?: number; // ms, default 3000
}

interface ToastProps {
  toast: ToastData;
  onClose: (id: string) => void;
}

export function Toast({ toast, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // 입장 애니메이션
    setTimeout(() => setIsVisible(true), 10);

    // 자동 닫힘
    const duration = toast.duration || 3000;
    const timer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(() => onClose(toast.id), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast, onClose]);

  const typeColors = {
    evidence: '#26de81',
    event: '#ffa502',
    relation: '#74b9ff',
  };

  return (
    <div
      style={{
        position: 'relative',
        width: 320,
        background: 'var(--detective-bg-secondary)',
        border: `2px solid ${typeColors[toast.type]}`,
        borderRadius: 8,
        padding: '12px 16px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
        transform: isLeaving ? 'translateX(400px)' : isVisible ? 'translateX(0)' : 'translateX(400px)',
        opacity: isLeaving ? 0 : isVisible ? 1 : 0,
        transition: 'all 0.3s ease-out',
        marginBottom: 12,
      }}
    >
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>{toast.icon}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--detective-text-primary)', flex: 1 }}>
          {toast.title}
        </span>
        <button
          onClick={() => {
            setIsLeaving(true);
            setTimeout(() => onClose(toast.id), 300);
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--detective-text-tertiary)',
            cursor: 'pointer',
            fontSize: 16,
            padding: 0,
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>

      {/* 메시지 */}
      <div style={{ fontSize: 12, color: 'var(--detective-text-secondary)', lineHeight: 1.5 }}>
        {toast.message}
      </div>

      {/* 프로그레스 바 */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: typeColors[toast.type] + '33',
          borderRadius: '0 0 6px 6px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            background: typeColors[toast.type],
            animation: `shrink ${toast.duration || 3000}ms linear`,
          }}
        />
      </div>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
