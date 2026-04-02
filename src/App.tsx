import { useState, useEffect } from 'react';
import { DataService } from './core/services/DataService';
import { Case } from './core/models/Case';
import { useTheme } from './hooks/useTheme';
import DetectiveBoard from './pages/DetectiveBoard';

function App() {
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useTheme('auto'); // 테마 자동 적용

  useEffect(() => {
    DataService.loadCase('noir-cafe')
      .then((data) => {
        setCaseData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load case:', err);
        setError('사건 데이터를 불러올 수 없습니다.');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--detective-bg-primary)',
        color: 'var(--detective-text-primary)',
        fontSize: 18
      }}>
        <div>
          <div style={{ fontSize: 48, marginBottom: 16, textAlign: 'center' }}>🔍</div>
          <div>데이터 로딩 중...</div>
        </div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--detective-bg-primary)',
        color: 'var(--detective-text-primary)',
        fontSize: 18,
        flexDirection: 'column',
        gap: 12
      }}>
        <div style={{ fontSize: 48 }}>⚠️</div>
        <div>{error || '알 수 없는 오류가 발생했습니다.'}</div>
      </div>
    );
  }

  return <DetectiveBoard caseData={caseData} />;
}

export default App;
