# FMEA 모듈화 가이드

## 📌 핵심 원칙

### 1. 파일 라인 수 제한
```
0-150줄:   소형 (이상적)
150-500줄: 적정 (권장)
500-700줄: 허용 (주의)
700줄+:    분리 필수! ❌
```

### 2. 새 기능 = 새 파일
- **절대 기존 파일에 기능 추가 금지**
- 새로운 기능은 항상 별도 파일로 생성

### 3. 데이터와 로직 분리
- 상수/데이터: `data/` 폴더
- 스타일: `styles/` 또는 별도 `.styles.ts`
- 훅: `hooks/` 폴더
- 컴포넌트: `components/` 폴더

---

## 📁 폴더 구조 표준

```
src/app/pfmea/worksheet/
├── page.tsx              # 메인 페이지 (700줄 이하)
├── constants.ts          # 상수 정의
├── utils.ts              # 유틸리티 함수
├── components/           # UI 컴포넌트
│   ├── TopMenuBar.tsx
│   ├── TabMenu.tsx
│   ├── FailureLinkResult.tsx
│   └── AllTabRightPanel.tsx
├── hooks/                # 커스텀 훅
│   ├── useWorksheetState.ts
│   └── usePageHandlers.ts
├── tabs/                 # 탭 컴포넌트
│   ├── structure/
│   ├── function/
│   ├── failure/
│   └── all/
└── panels/               # 우측 패널
    ├── APTable/
    ├── RPNChart/
    └── TreePanel/
```

---

## 🔧 분리 패턴

### 패턴 1: 컴포넌트 분리
```typescript
// Before: page.tsx에 직접 작성
{state.tab === 'failure-link' && (
  <div>... 70줄의 JSX ...</div>
)}

// After: 별도 컴포넌트로 분리
import FailureLinkResult from './components/FailureLinkResult';
{state.tab === 'failure-link' && (
  <FailureLinkResult state={state} setState={setState} />
)}
```

### 패턴 2: 데이터 분리
```typescript
// Before: 컴포넌트 파일에 200줄의 상수
const DEFAULT_ITEMS = { C1: [...], C2: [...], ... };

// After: 별도 데이터 파일
// data/defaultItems.ts
export const DEFAULT_ITEMS = { ... };

// 컴포넌트
import { DEFAULT_ITEMS } from './data/defaultItems';
```

### 패턴 3: 훅 분리
```typescript
// Before: 컴포넌트에 100줄의 상태 관리 로직
const [state1, setState1] = useState();
const [state2, setState2] = useState();
const handler1 = useCallback(() => {...}, []);
const handler2 = useCallback(() => {...}, []);

// After: 커스텀 훅으로 분리
// hooks/useFeatureState.ts
export function useFeatureState() {
  const [state1, setState1] = useState();
  const handler1 = useCallback(() => {...}, []);
  return { state1, setState1, handler1 };
}

// 컴포넌트
const { state1, handler1 } = useFeatureState();
```

### 패턴 4: 스타일 분리
```typescript
// Before: 인라인 스타일
<div style={{ background: '#1a237e', color: '#fff', ... }}>

// After: 스타일 파일 분리
// ComponentName.styles.ts
export const containerStyle = { background: '#1a237e', ... };

// 컴포넌트
import { containerStyle } from './ComponentName.styles';
<div style={containerStyle}>
```

---

## ✅ 체크리스트 (커밋 전)

- [ ] 모든 파일 700줄 이하
- [ ] 새 기능은 별도 파일로 작성
- [ ] 데이터는 data/ 폴더에 분리
- [ ] 훅은 hooks/ 폴더에 분리
- [ ] 인라인 스타일 최소화 (Tailwind 우선)
- [ ] TypeScript 타입 정의 완료
- [ ] 빌드 테스트 통과

---

## 📋 분리 우선순위

### 현재 700줄 초과 파일 (분리 필요)
| 파일 | 라인 | 우선순위 |
|------|------|----------|
| dfmea/import/page.tsx | 977줄 | P1 |
| pfmea/import/page.tsx | 935줄 | P1 |
| dfmea/worksheet/page.tsx | 801줄 | P2 |
| FailureLinkTab.tsx | 792줄 | P2 |
| pfmea/revision/page.tsx | 707줄 | P3 |

### 분리 방법
1. **import/page.tsx**: 프리뷰 컴포넌트, 데이터 변환 로직 분리
2. **worksheet/page.tsx**: 핸들러를 훅으로, 모달을 별도 파일로 분리
3. **FailureLinkTab.tsx**: 데이터 추출 로직을 유틸리티로 분리
4. **revision/page.tsx**: 테이블 컴포넌트 분리

---

## 🏷️ 코드프리즈 목록

| 태그 | 설명 |
|------|------|
| v1.12.0-코드모듈화-분리구조화 | 모듈화 패턴 확립 |
| v1.11.0-SOD점수저장-기초정보연동 | SOD 저장 기능 |
| v1.10.0-메뉴정렬-1px단위조정 | 메뉴 레이아웃 |
| v1.9.0-모달표준화-트리뷰배치 | 모달 표준화 |
| ... | ... |

---

## 📅 최종 업데이트
- 날짜: 2026-01-02
- 작성자: AI Assistant
- 빌드 상태: ✅ 성공

