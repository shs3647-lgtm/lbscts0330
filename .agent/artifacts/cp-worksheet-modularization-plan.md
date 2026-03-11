# CP Worksheet 모듈화 계획서

> **작성일**: 2026-02-01
> **대상 파일**: `src/app/control-plan/worksheet/page.tsx` (1,455줄 → 목표 400줄)
> **목표**: 유지보수성 향상, 코드 재사용성 증가, 테스트 용이성 확보

---

## 📊 현재 상태 분석

### 파일 크기
- **현재**: 56.8 KB (1,455줄)
- **목표**: ~16 KB (~400줄)
- **감소율**: 약 72%

### 현재 코드 구조

| 영역 | 줄 범위 | 크기 | 책임 |
|------|---------|------|------|
| Imports | 1-34 | 35줄 | 의존성 임포트 |
| 상태 선언 | 35-230 | 195줄 | useState, useMemo, 커스텀 훅 호출 |
| Undo/Redo/병합 | 55-175 | 120줄 | 히스토리 관리, 셀 병합 로직 |
| FMEA 동기화 | 270-370 | 100줄 | syncFromFmea, useFmeaSync |
| PFD 연동 | 369-486 | 117줄 | handlePfdSync (검증, 변경이력 포함) |
| FMEA 생성 | 488-572 | 85줄 | handleFmeaCreate |
| 데이터 로드 | 574-750 | 176줄 | useEffect (CP목록, EP장치, 초기데이터) |
| 필터/확정/승인 | 763-848 | 85줄 | filteredItems, handleConfirm, handleApprove |
| Excel Import | 850-947 | 97줄 | handleExcelImport |
| 로딩 UI | 949-970 | 21줄 | Loading 상태 렌더링 |
| 메인 렌더링 | 974-1304 | 330줄 | 테이블 헤더/바디 렌더링 |
| 모달 렌더링 | 1306-1443 | 137줄 | 7개 모달 컴포넌트 |

---

## 🎯 모듈화 계획

### Phase 1: 커스텀 훅 분리 (로직 계층)

#### 1.1 `useUndoRedo.ts` - Undo/Redo 및 셀 병합
```typescript
// 분리 대상: 55-175줄 (~120줄)
export function useUndoRedo<T>(initialItems: T[]) {
  // undoHistory, redoHistory
  // saveToHistory, handleUndo, handleRedo
  // handleMergeUp, handleMergeDown, handleUnmerge
}
```
- **의존성**: 없음 (독립적)
- **예상 효과**: 120줄 감소

#### 1.2 `useCPData.ts` - 데이터 로드 통합
```typescript
// 분리 대상: 574-750줄 (~176줄)
export function useCPData(cpNoParam: string, fmeaIdParam: string, syncMode: boolean) {
  // state, setState (CPState)
  // cpList, setCpList
  // epDevices, setEpDevices
  // loadCpData, syncFromFmea
  // 초기 데이터 로드 useEffect
}
```
- **의존성**: `router`, `CPState` 타입
- **예상 효과**: 176줄 감소

#### 1.3 `useSyncHandlers.ts` - 연동 핸들러 통합
```typescript
// 분리 대상: 369-572줄 (~200줄)
export function useSyncHandlers(options: {
  cpNo: string;
  fmeaId: string;
  items: CPItem[];
  partName: string;
  customer: string;
  router: AppRouterInstance;
  setState: Dispatch<SetStateAction<CPState>>;
}) {
  // handlePfdSync
  // handleFmeaCreate
  // + 기존 useFmeaSync 호출 통합
}
```
- **의존성**: `sync-validation`, `change-history`, `router`
- **예상 효과**: 200줄 감소

#### 1.4 `useCPActions.ts` - 비즈니스 액션 통합
```typescript
// 분리 대상: 763-947줄 (~185줄)
export function useCPActions(options: {
  state: CPState;
  setState: Dispatch<SetStateAction<CPState>>;
  handleSave: () => Promise<void>;
  excelFileInputRef: RefObject<HTMLInputElement>;
}) {
  // filteredItems, ccCount, scCount
  // filterMode, setFilterMode
  // handleConfirm, handleApprove
  // handleExcelImport, isImporting
}
```
- **의존성**: `worksheet-excel-parser`
- **예상 효과**: 185줄 감소

---

### Phase 2: UI 컴포넌트 분리 (뷰 계층)

#### 2.1 `CPTableHeader.tsx` - 테이블 헤더
```typescript
// 분리 대상: 1066-1218줄 (~150줄)
interface CPTableHeaderProps {
  groupSpans: GroupSpan[];
  columns: CPColumn[];
  columnWidths: Record<string, number>;
  getColumnWidth: (id: string) => number;
  startResize: (colId: string, startX: number) => void;
  resetColumnWidth: (colId: string) => void;
}
export function CPTableHeader(props: CPTableHeaderProps): JSX.Element
```
- **렌더링**: 그룹 헤더(1행), 컬럼명(2행), 열번호(3행)
- **예상 효과**: 150줄 감소

#### 2.2 `CPTableBody.tsx` - 테이블 바디
```typescript
// 분리 대상: 1221-1299줄 (~80줄)
interface CPTableBodyProps {
  items: CPItem[];
  columns: CPColumn[];
  rowSpans: RowSpanMap;
  columnWidths: Record<string, number>;
  onCellChange: (id: string, field: string, value: any) => void;
  onContextMenu: (e: MouseEvent, rowIdx: number, colKey: string) => void;
  onAutoModeClick: (rowIdx: number, mode: string, colKey: string) => void;
  onEnterKey: (rowIdx: number, colKey: string) => void;
  onEPDeviceClick: (rowIdx: number, category: 'EP' | '자동검사') => void;
  onEmptyRowClick: () => void;
}
export function CPTableBody(props: CPTableBodyProps): JSX.Element
```
- **렌더링**: 데이터 행, 빈 행 (30개 보장)
- **예상 효과**: 80줄 감소

#### 2.3 `CPModals.tsx` - 모달 컨테이너 (선택적)
```typescript
// 분리 대상: 1306-1443줄 (~137줄)
// 옵션: 현재 구조 유지 또는 통합 컨테이너로 분리
```
- **현재**: 개별 모달 7개가 page.tsx에서 직접 렌더링
- **대안**: Props 전달 복잡도가 높아 현재 구조 유지 권장

---

## 📁 최종 파일 구조

```
src/app/control-plan/worksheet/
├── page.tsx                       # 메인 페이지 (~400줄)
│
├── hooks/
│   ├── index.ts                   # 훅 re-export (기존 + 신규)
│   ├── useColumnResize.ts         # 기존 (6.8KB)
│   ├── useContextMenu.ts          # 기존 (1KB)
│   ├── useFmeaSync.ts             # 기존 (4.6KB) → useSyncHandlers로 통합 고려
│   ├── useModalHandlers.ts        # 기존 (20KB)
│   ├── useRowSpan.ts              # 기존 (6.6KB)
│   ├── useWorksheetHandlers.ts    # 기존 (17.8KB)
│   ├── useUndoRedo.ts             # ★ 신규 (~4KB)
│   ├── useCPData.ts               # ★ 신규 (~7KB)
│   ├── useSyncHandlers.ts         # ★ 신규 (~8KB)
│   └── useCPActions.ts            # ★ 신규 (~7KB)
│
├── components/
│   ├── AutoInputModal.tsx         # 기존 (3.6KB)
│   ├── CPContextMenu.tsx          # 기존 (7.2KB)
│   ├── CPTabMenu.tsx              # 기존 (6.5KB)
│   ├── CPTopMenuBar.tsx           # 기존 (10.5KB)
│   ├── EPDeviceSelectModal.tsx    # 기존 (8KB)
│   ├── EquipmentInputModal.tsx    # 기존 (16.3KB)
│   ├── ProcessDescInputModal.tsx  # 기존 (23KB)
│   ├── ProcessFlowInputModal.tsx  # 기존 (26.7KB)
│   ├── StandardInputModal.tsx     # 기존 (16.3KB)
│   ├── CPTableHeader.tsx          # ★ 신규 (~6KB)
│   └── CPTableBody.tsx            # ★ 신규 (~4KB)
│
├── cpConstants.ts                 # 기존 (14.3KB)
├── cpIdUtils.ts                   # 기존 (5.9KB)
├── excel-export.ts                # 기존 (17.8KB)
├── schema.ts                      # 기존 (6KB)
├── types.ts                       # 기존 (2.2KB)
│
├── renderers/
│   └── index.tsx                  # 기존 (셀 렌더러)
│
└── utils/
    └── index.ts                   # 기존 (createEmptyItem 등)
```

---

## 🚀 실행 순서

### Step 1: `useUndoRedo.ts` 생성 ✅ 완료
- Undo/Redo 히스토리 관리
- 셀 병합/해제 로직
- **가장 독립적** - 부작용 최소

### Step 2: `CPTableHeader.tsx` 생성 ✅ 완료
- 테이블 헤더 3행 분리
- **순수 UI 컴포넌트** - 상태 의존성 낮음

### Step 3: `CPTableBody.tsx` 생성 ✅ 완료
- 데이터/빈 행 렌더링 분리
- renderCell 호출 위임

### Step 4: `useCPData.ts` 생성 ✅ 완료
- 상태 관리 및 데이터 로드 통합
- 기존 useEffect들 마이그레이션

### Step 5: `useSyncHandlers.ts` 생성 ✅ 완료
- PFD/FMEA 연동 로직 통합
- 기존 useFmeaSync 활용

### Step 6: `useCPActions.ts` 생성 ✅ 완료
- 필터링, 확정/승인, Excel Import
- 비즈니스 액션 통합

### Step 7: `page.tsx` 리팩토링 ⏳ 대기
- 분리된 훅/컴포넌트 조합
- 최종 ~400줄 달성

---

## 📊 현재 진행 상황

| 파일 | 상태 | 크기 |
|------|------|------|
| `hooks/useUndoRedo.ts` | ✅ 완료 | ~190줄 |
| `hooks/useCPData.ts` | ✅ 완료 | ~270줄 |
| `hooks/useSyncHandlers.ts` | ✅ 완료 | ~230줄 |
| `hooks/useCPActions.ts` | ✅ 완료 | ~270줄 |
| `components/CPTableHeader.tsx` | ✅ 완료 | ~195줄 |
| `components/CPTableBody.tsx` | ✅ 완료 | ~140줄 |
| `page.tsx` 리팩토링 | ⏳ 대기 | (현재 1,455줄) |

---

## ✅ 검증 체크리스트

- [ ] 기존 기능 정상 동작 (회귀 테스트)
- [ ] 컴파일 에러 없음
- [ ] 타입 안전성 유지
- [ ] 상태 동기화 정상
- [ ] 모달 동작 정상
- [ ] 연동 기능 정상 (PFD, FMEA)
- [ ] Excel Import/Export 정상
- [ ] Undo/Redo 정상

---

## 📝 주의사항

1. **상태 공유**: `state`와 `setState`는 page.tsx에서 관리, 훅에 전달
2. **의존성 순서**: 훅 간 의존성 주의 (순환 참조 방지)
3. **Props 드릴링**: 테이블 컴포넌트는 많은 props 필요 - 과도하면 Context 고려
4. **점진적 적용**: 한 번에 하나씩 분리, 매 단계 테스트

---

*다음 단계: Step 1 - `useUndoRedo.ts` 생성 시작*
