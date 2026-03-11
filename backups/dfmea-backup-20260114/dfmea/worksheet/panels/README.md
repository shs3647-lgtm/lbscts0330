# 우측 패널 플러그인 시스템

> **목적**: 레이지 로딩으로 번들 크기를 최소화하면서 무한 확장 가능한 패널 시스템 구축

## 📁 디렉토리 구조

```
panels/
├── index.ts                    # 플러그인 레지스트리 (메인 진입점)
├── README.md                   # 이 파일
├── TreePanel/                  # 트리 뷰 패널
│   ├── index.tsx              # 레이지 로딩 래퍼
│   └── TreePanel.tsx          # 실제 구현
├── PDFViewer/                  # PDF/PPT/Excel 뷰어
│   └── index.tsx
├── APTable/                    # 5AP/6AP 테이블
│   ├── APTable5.tsx
│   └── APTable6.tsx
├── RPNChart/                   # RPN 차트 및 분석
│   ├── ParetoChart.tsx        # 10 RPN 파레토
│   └── RPNAnalysis.tsx        # RPN 분석
├── LLDViewer/                  # 문서화 뷰어
│   └── index.tsx
└── GAPAnalysis/                # 갭 분석
    └── index.tsx
```

## 🚀 새 패널 추가 방법 (3단계)

### 1단계: 패널 컴포넌트 작성

```bash
cd panels/
mkdir NewPanel
```

```typescript
// panels/NewPanel/index.tsx
'use client';

export default function NewPanel({ state }: { state: any }) {
  return (
    <div>
      <h2>새 패널</h2>
      {/* 패널 내용 */}
    </div>
  );
}
```

### 2단계: 레지스트리에 등록

```typescript
// panels/index.ts
export const PANEL_REGISTRY: PanelConfig[] = [
  // ... 기존 패널들
  {
    id: 'new-panel',
    label: 'NEW',
    icon: '🆕',
    component: lazy(() => import('./NewPanel')),
    order: 9,
  },
];
```

### 3단계: 완료! ✅

- `page.tsx` 수정 불필요
- 자동으로 메뉴바에 버튼 추가
- 클릭 시 레이지 로딩됨

## 📊 현재 상태

| 패널 | 상태 | 예상 크기 | 구현 Phase |
|------|------|----------|-----------|
| 🌳 TREE | 📋 스켈레톤 | ~15KB | Phase 2 |
| 📄 PDF | 📋 스켈레톤 | ~150KB | Phase 3 |
| 🔴 5 AP | 📋 스켈레톤 | ~3KB | Phase 2 |
| 🟠 6 AP | 📋 스켈레톤 | ~3KB | Phase 2 |
| 📊 10 RPN | 📋 스켈레톤 | ~80KB | Phase 3 |
| 📈 RPN | 📋 스켈레톤 | ~10KB | Phase 3 |
| 📚 LLD | 📋 스켈레톤 | ~15KB | Phase 3 |
| 🔍 GAP | 📋 스켈레톤 | ~20KB | Phase 3 |

**총 예상 크기**: ~296KB (레이지 로딩)  
**메인 번들 영향**: 0KB (클릭 시 로드)

## 🎯 레이지 로딩 효과

### 기존 방식 (모든 코드 포함)
```
main.js: 850KB
├── 워크시트 로직: 320KB
├── 트리 뷰: 15KB
├── PDF 뷰어: 150KB
├── RPN 차트: 80KB
└── 기타: 285KB
```

### 레이지 로딩 방식
```
main.js: 320KB ✅
├── 워크시트 로직: 320KB
└── 패널 레지스트리: ~1KB

tree-panel.js: 15KB (클릭 시)
pdf-viewer.js: 150KB (클릭 시)
rpn-chart.js: 80KB (클릭 시)
ap-table.js: 6KB (클릭 시)
...
```

**절약**: 530KB (62% 감소)

## 🔧 고급 기능

### 조건부 활성화

```typescript
{
  id: 'pdf',
  label: 'PDF',
  icon: '📄',
  component: lazy(() => import('./PDFViewer')),
  // PDF 파일이 있을 때만 활성화
  enabled: (state) => !!state.pdfUrl,
  order: 2,
}
```

### 커스텀 색상

```typescript
{
  id: '5ap',
  label: '5 AP',
  icon: '🔴',
  component: lazy(() => import('./APTable/APTable5')),
  color: '#f44336', // 빨간색
  order: 3,
}
```

## 📚 참고 문서

- [RIGHT_PANEL_ARCHITECTURE.md](../../../../../docs/RIGHT_PANEL_ARCHITECTURE.md) - 전체 아키텍처 설계
- [REFACTORING_MASTER_PLAN.md](../../../../../docs/REFACTORING_MASTER_PLAN.md) - Step 8 참조

## ⚠️ 주의사항

1. **레이지 로딩 필수**: 모든 패널은 `lazy()` 또는 `dynamic()`으로 래핑
2. **Props 타입**: 패널은 `{ state: any }` Props를 받음
3. **독립성**: 패널 간 직접 의존성 금지
4. **크기 제한**: 단일 패널 150KB 이하 권장

## 🚧 다음 단계

### Phase 2: 기존 기능 이전 (2-3시간)
- [ ] TreePanel 실제 구현 (기존 로직 이전)
- [ ] APTable5/6 실제 구현
- [ ] 번들 크기 확인

### Phase 3: 신규 뷰어 구현 (6-8시간)
- [ ] PDFViewer 구현
- [ ] ParetoChart 구현
- [ ] RPNAnalysis 구현
- [ ] LLDViewer 구현
- [ ] GAPAnalysis 구현

### Phase 4: 최적화 (2시간)
- [ ] 번들 크기 분석
- [ ] 성능 측정
- [ ] 문서화 완료








