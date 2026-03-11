# ALL 탭 전체화면 복귀 기능 가이드 📚

> **코드프리즈 태그**: `codefreeze-20260112-all-fullscreen`
> **최종 수정일**: 2026-01-12

---

## 🎯 기능 개요

| 상태 | 화면 |
|------|------|
| **ALL 탭 기본** | 전체화면 (우측 패널 없음) |
| **5AP/6AP/RPN 클릭** | 우측 350px 패널 표시 |
| **ALL 탭 다시 클릭** | 패널 닫히고 전체화면 복귀 |

---

## 📁 관련 파일 (4개)

### 1. page.tsx (메인 로직)
```
📂 src/app/pfmea/worksheet/page.tsx
```

**핵심 코드 위치**:
- **패널 상태**: `const [activePanelId, setActivePanelId] = useState<string>('tree');`
- **ALL 탭 자동 리셋**: `useEffect` (검색: `ALL 탭 진입 감지`)
- **패널 표시 조건**: 검색 `state.tab === 'all' && ['5ap', '6ap', 'rpn'`

```typescript
// ALL 탭 진입 시 패널 자동 리셋
React.useEffect(() => {
  if (state.tab === 'all') {
    setActivePanelId(''); // 전체화면 복귀
  }
}, [state.tab]);

// 패널 표시 조건
{(state.tab !== 'failure-link' && state.tab !== 'all') || 
 (state.tab === 'all' && ['5ap', '6ap', 'rpn', 'rpn-chart'].includes(activePanelId)) ? (
  // 우측 패널 표시
) : null}
```

---

### 2. TabMenu.tsx (탭 클릭 핸들러)
```
📂 src/app/pfmea/worksheet/components/TabMenu.tsx
```

**핵심 코드 위치**:
- **Props**: `onAllClick?: () => void;`
- **ALL 탭 클릭 시**: 검색 `tab.id === 'all'`

```typescript
// ALL 탭 클릭 시 전체화면 복귀
if (tab.id === 'all') {
  onAllClick?.();
}
```

---

### 3. AllTabRenderer.tsx (ALL 탭 렌더러)
```
📂 src/app/pfmea/worksheet/tabs/all/AllTabRenderer.tsx
```

**핵심 코드 위치**:
- **Props**: `onOpen5AP`, `onOpen6AP`, `onOpenRPN`, `activePanelId`

---

### 4. AllTabEmpty.tsx (ALL 탭 컴포넌트)
```
📂 src/app/pfmea/worksheet/tabs/all/AllTabEmpty.tsx
```

**핵심 코드 위치**:
- **Props**: `onOpen5AP`, `onOpen6AP`, `onOpenRPN`, `activePanelId`

---

## 🔧 수정 방법

### 패널 토글 로직 변경

**파일**: `page.tsx`

```typescript
// TopMenuBar에서 5AP/6AP/RPN 토글
onOpen5AP={() => setActivePanelId(prev => 
  prev === '5ap' ? (state.tab === 'all' ? '' : 'tree') : '5ap'
)}
```

- ALL 탭: 토글 시 `''` (빈값) → 패널 숨김
- 다른 탭: 토글 시 `'tree'` → 트리뷰로 복귀

---

### 새 패널 추가 시

1. `panels/index.ts`에 패널 등록
2. `page.tsx`의 패널 표시 조건에 새 패널 ID 추가:
   ```typescript
   ['5ap', '6ap', 'rpn', 'rpn-chart', '새패널ID'].includes(activePanelId)
   ```
3. TopMenuBar에 버튼 추가 및 핸들러 연결

---

## ⚠️ 주의사항

1. **activePanelId 값**:
   - `''` (빈값): ALL 탭에서 패널 숨김
   - `'tree'`: 다른 탭에서 트리뷰 표시
   - `'5ap'`, `'6ap'`, `'rpn'`: 해당 패널 표시

2. **useEffect 의존성**:
   - `state.tab`이 변경될 때마다 실행됨
   - ALL 탭 진입 시에만 패널 리셋

3. **고장연결 탭**:
   - `failure-link` 탭은 항상 패널 없음 (코드프리즈)

---

## 📝 코드프리즈 파일 목록

| 파일 | 역할 |
|------|------|
| `page.tsx` | 패널 상태 관리, 표시 조건 |
| `TabMenu.tsx` | ALL 탭 클릭 핸들러 |
| `AllTabRenderer.tsx` | 핸들러 props 전달 |
| `AllTabEmpty.tsx` | 핸들러 props 수신 |

---

**코드프리즈 태그**: `codefreeze-20260112-all-fullscreen`






