# devple-timeline 리팩토링 계획

## 새 디렉토리 구조

```
src/
├── components/
│   ├── Graph/
│   │   ├── GraphCanvas.tsx        # 메인 그래프 캔버스
│   │   ├── Node.tsx               # 노드 렌더링
│   │   ├── Edge.tsx               # 엣지 렌더링
│   │   └── ZoomControls.tsx       # 줌 컨트롤
│   ├── Timeline/
│   │   ├── TimelineScrubber.tsx   # 타임라인 바
│   │   └── EventMarker.tsx        # 이벤트 마커
│   ├── Sidebar/
│   │   ├── SidePanel.tsx          # 사이드바 컨테이너
│   │   ├── PersonDetail.tsx       # 인물 상세
│   │   ├── RelationDetail.tsx     # 관계 상세
│   │   └── EventLog.tsx           # 이벤트 로그
│   └── Layout/
│       ├── Header.tsx             # 헤더
│       └── Legend.tsx             # 범례
├── core/
│   ├── models/
│   │   ├── Case.ts                # 사건 클래스
│   │   ├── Person.ts              # 인물 클래스
│   │   ├── Relation.ts            # 관계 클래스
│   │   ├── Timeline.ts            # 타임라인 클래스
│   │   └── Graph.ts               # 그래프 클래스
│   └── services/
│       ├── DataService.ts         # 데이터 로딩
│       └── ForceSimulation.ts     # Force 시뮬레이션
├── data/
│   ├── cases/
│   │   └── noir-cafe.json         # 카페 누아르 사건
│   └── schema.ts                  # 데이터 타입 정의
├── hooks/
│   ├── useForceSimulation.ts      # Force 시뮬레이션 훅
│   ├── useGraphInteraction.ts     # 그래프 인터랙션
│   └── useTheme.ts                # 테마 관리
├── styles/
│   ├── theme.css                  # 테마 변수
│   └── global.css                 # 글로벌 스타일
└── types/
    └── index.ts                   # 타입 정의 (기존 index.d.ts 이동)
```

## 데이터 스키마

### 범용 확장을 위한 추상화
- Detective (형사노트) → 기본 컨셉
- Family Tree (가계도)
- Organization (조직도)
- Story Map (스토리 관계도) 등 확장 가능

### JSON 스키마
```typescript
interface CaseData {
  meta: CaseMeta;
  entities: Entity[];
  timeline: TimelineSnapshot[];
  events: Event[];
  config: VisualConfig;
}
```
