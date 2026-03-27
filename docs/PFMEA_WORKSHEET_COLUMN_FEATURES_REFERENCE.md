# PFMEA 워크시트 — 열·셀 기능 공통 참조

> **목적**: 적용/미적용 팝업만이 아니라 **열(컬럼) 단위 상호작용**—클릭·더블클릭·우클릭·행추가/삭제·모달·ID 연결·저장—을 **탭 가로로** 한곳에서 찾게 한다.  
> **성격**: 구현 **지도**(소스가 SSoT). CODEFREEZE 파일은 변경 전 규칙 확인.  
> **갱신**: 2026-03-27

---

## 1. 공통 빌딩 블록

| 블록 | 역할 | 대표 위치 |
|------|------|-----------|
| **`SelectableCell`** | 클릭 → 모달/핸들러, 선택적 `onDoubleClickEdit` 인라인 편집 | `@/components/worksheet/SelectableCell` |
| **`PfmeaContextMenu`** | 우클릭: 위/아래 행 추가, 병합 위·아래 추가, 행 삭제, 병합/해제, Undo/Redo(탭별 노출 상이) | `worksheet/components/PfmeaContextMenu.tsx` (파일 상단 주석에 메뉴 설명 **매우 상세**) |
| **`DataSelectModal`** | 마스터 코드(C1~C3, B2/B3, 2L **A4** 등) 선택. `fullSelectionApply` 시 시트 전체 동기. 미설정 시 **미적용만 추가** 병합 | `components/modals/DataSelectModal.tsx` |
| **`L2FunctionSelectModal`** + `useL2FunctionSelect` | 2기능 **메인공정기능(A3)** 전용: **id** + 공정 `processNo`별 마스터 플랫, 적용/미적용, `mergeRowsByMasterSelection`, `/api/fmea/l2-functions` | `worksheet/L2FunctionSelectModal.tsx`, `useL2FunctionSelect.ts` |
| **`mergeRowsByMasterSelection`** | 마스터 픽 `{id,name,...}` 와 시트 행 병합: 빈 행 유지 → 미선택 이름 행 제거 → id 맞춤 → 빈칸 채움 → append | `worksheet/utils/mergeRowsByMasterSelection.ts` |
| **`setStateSynced` + `saveAtomicDB`** | 편집 후 레거시 state와 Atomic 동기 | 각 탭 hook / `useWorksheetState` 계열 |
| **적용됨 / 미적용** | **ID 기준**: 시트 행 id ∈ `worksheetItemIds` → 적용됨 (`useWorkElementSelect`, `useL1FunctionSelect`, `useL2FunctionSelect`). **문자열 기준**: `DataSelectModal`이 `currentValues`(이름 배열)로 구간 나눔 | 아래 §3 |

---

## 2. 행 식별자(ID) 체인 — 열 기능이 물려야 하는 키

워크시트는 **텍스트가 아니라 id**로 행을 잡는다 (`CLAUDE.md` Rule 1.7과 정합).

| 탭(영역) | 흔한 ID 조합 | 의미 |
|----------|--------------|------|
| 구조분석 | `l2Id`(공정), `l3Id`(작업요소) | `state.l2[].id`, `state.l2[].l3[].id` |
| 1기능 | `typeId`(구분 행), `funcId`, `reqId` | `l1.types[]`, `functions[]`, `requirements[]` |
| 2기능 | `procId`, `funcId`, `charId` | 공정 → 메인공정기능 → 제품특성 |
| 3기능 | `procId`, `l3Id`(작업요소), `funcId`, `charId` | B2/B3 |
| 고장·연결 등 | `fmId`, `fcId`, `feId`, `linkId` | 탭별 상이 |

**모달 열 때** 거의 항상 위 id들을 payload에 넣어, 저장 시 올바른 행만 갱신한다.

---

## 3. 선택 모달 유형 (열 → 팝업 매핑)

| 모달 | 쓰는 탭·열 | 목록 키 | 적용/미적용 | 적용 버튼 의미 |
|------|------------|---------|-------------|----------------|
| **WorkElementSelectModal** + `useWorkElementSelect` | 구조분석 작업요소 | **항목 `id`** (마스터 B1 id) | ✅ 적용됨 / 미적용 섹션 | 기존 적용 + 새 체크 합쳐 `onSave(WorkElement[])` → `mergeRowsByMasterSelection` + `replaceL3Structures` |
| **ProcessSelectModal** | 구조분석 공정 | 공정 `id`/`no` | 적용됨(시트에 있음) / 미적용 | 공정 집합 저장, L2/L3·Atomic 갱신 |
| **L1FunctionSelectModal** + `useL1FunctionSelect` | 1기능 C2·C3 (전용) | **`id`** | ✅ 적용됨 / 미적용 | 작업요소 모달과 동일 계열 패턴 |
| **L2FunctionSelectModal** + `useL2FunctionSelect` | 2기능 **메인공정기능(A3)** (전용) | **`id`** + `processNo`(공정번호) | ✅ 적용됨 / 미적용 | `FunctionL2Tab` `handleCellClickForTab` → `mergeRowsByMasterSelection` |
| **DataSelectModal** | 1기능 C1, 2기능 **A4**, 3기능 B2/B3 등 | 기본은 **`value`(문자열)** + 마스터 `item.id` | `fullSelectionApply`일 때만 “전체 동기”에 가깝게. 그 외 **미적용만 추가** | 2L A4는 `FunctionL2Tab`에서 `fullSelectionApply` |

**공통화 목표**를 코드로 모을 때는:

1. **신규/핵심 경로는 ID 기준** 적용/미적용 + `mergeRowsByMasterSelection` 패턴을 기본으로 한다. (2L A3는 **L2FunctionSelectModal**.)  
2. **레거시 문자열 전용** `DataSelectModal` 경로는 단계적으로 `fullSelectionApply` 또는 id 기반 목록으로 수렴시키는 것이 안전하다.

---

## 4. 탭별 열 기능 요약

### 4.1 구조분석 (`StructureTab.tsx` + `StructureTabCells.tsx`)

| 열(개념) | 클릭 | 더블클릭 | 우클릭 메뉴 | 모달/비고 |
|----------|------|----------|-------------|-----------|
| 완제품 공정(L1) | 편집/선택 | (셀별) | `l1` 열 타입 → L1 기준 삽입 | — |
| 메인 공정 | 공정 선택 | — | `process` | **ProcessSelectModal** |
| 4M | `EditableM4Cell` select | — | 작업요소 열과 동일 행 | 변경 시 `emitSave`, 이름 있으면 work-elements POST |
| 작업요소 | 모달 | 인라인 입력 | `workElement` | **WorkElementSelectModal** + `useWorkElementSelect.ts`, `StructureTab.tsx` |

### 4.2 1기능 (`FunctionL1Tab.tsx` + `useFunctionL1Handlers.ts`)

| 열 | 클릭 | 더블클릭 | 컨텍스트 | 모달 |
|----|------|----------|----------|------|
| 구분(C1) | `DataSelectModal` / `handleCellClick` | — | `type` (구분 행에서 메뉴 제한 있음) | itemCode `C1` |
| 완제품기능(C2) | **L1FunctionSelectModal** 등 | ✅ | `function` | id 기반 선택 |
| 요구사항(C3) | **L1FunctionSelectModal** 등 | ✅ | `requirement` | 상위 기능 연동 |

### 4.3 2기능 (`FunctionL2Tab.tsx` + `useFunctionL2Handlers.ts`)

| 열 | 클릭 | 더블클릭 | 컨텍스트 `rowType` | 모달 |
|----|------|----------|-------------------|------|
| 공정 | (구조 연동 표시) | — | `process` | — |
| 메인공정기능(A3) | **L2FunctionSelectModal** + `useL2FunctionSelect` | ✅ `handleInlineEditFunction` | `function` | 공정번호 필수; 마스터 `GET/POST/DELETE` `/api/fmea/l2-functions` |
| 제품특성(A4) | `DataSelectModal` | ✅ `handleInlineEditProductChar` | `productChar` | `fullSelectionApply`, itemCode `A4` |
| 특별특성(SC) | 별도 `SpecialCharSelectModal` | — | — | — |

행 추가/삭제·병합: `PfmeaContextMenu` + `FunctionL2Tab` 내 `handleInsertAbove` 등 (공정/기능/제품특성별 분기).

### 4.4 3기능 (`FunctionL3Tab.tsx` + `useFunctionL3Handlers.ts`)

| 열 | 클릭 | 더블클릭 | 모달 |
|----|------|----------|------|
| 작업요소(구조 연동) | — | — | 읽기 중심 |
| 요소기능(B2) | `DataSelectModal` | ✅ | itemCode `B2` |
| 공정특성(B3) | `DataSelectModal` | ✅ | itemCode `B3` |
| SC | `SpecialCharSelectModal` | — | — |

### 4.5 고장·위험·기타 탭

| 탭 | 열 기능 개요 | 진입 파일 |
|----|--------------|-----------|
| `FailureL1Tab` / `FailureL2Tab` / `FailureL3Tab` | 고장영향·모드·원인 등 셀 + 모달 | `tabs/failure/*.tsx` |
| `FailureLinkTab` | 연결 다이어그램·리스트 (Rule 10 보호) | `FailureLinkTab.tsx`, `useLinkHandlers.ts` |
| `RiskTab` / `OptimizationTab` / `AllViewTab` | SOD, 개선, 통합 뷰 | 각 `tabs/*` |
| `CPTab` | CP 연동 열 | `tabs/cp/CPTab.tsx` |

세부 열마다 동일 패턴(클릭/모달/저장)이 반복되면 이 표에 **한 줄씩 추가**하면 된다.

---

## 5. 컨텍스트 메뉴 — 탭별로 실제로 연결되는 액션

`PfmeaContextMenu` 컴포넌트는 **공통 UI**이고, **어떤 메뉴가 보이고 무엇이 실행되느냐**는 각 탭에서 `onInsertAbove` 등으로 연결한다.

- **구조분석**: 위/아래/삭제 위주 (`StructureTab.tsx` — 병합 메뉴 일부 미연결 가능).
- **2기능·3기능·1기능**: `onAddMergedAbove` / `onAddMergedBelow` 등으로 **병합 영역 안에서 행 추가** 구현.

탭 파일에서 `PfmeaContextMenu` 검색하면 해당 탭의 **열 기능과 메뉴 매핑**이 한번에 나온다.

---

## 6. 저장·Atomic 연동 요약

| 작업 유형 | 흔한 패턴 |
|-----------|-----------|
| 구조 L2/L3 | `useAtomicView`의 `addL3Structure` / `replaceL3Structures` / `deleteL3Structure` + `saveNow` |
| 기능 L2 A3 | `L2FunctionSelectModal` `onSave` → `mergeRowsByMasterSelection` → `setStateSynced` → `saveAtomicDB(true)` |
| 기능 L2 A4 | `useFunctionL2Handlers` `handleSave` → `setStateSynced` → `saveAtomicDB(true)` |
| 마스터 플랫만 갱신 | `GET/POST/DELETE` `/api/fmea/l2-functions`(A3), `/api/fmea/l1-functions`(C2/C3), `/api/fmea/work-elements` 등 |

### 6.1 회귀 이슈 메모 (A3 저장 후 새로고침 소실)

- **증상**: 메인공정기능(A3) 팝업에서 체크/적용 직후 화면에는 반영되지만, 새로고침하면 사라짐.
- **원인**: `syncL2Functions`가 기존 `db.l2Functions` 필터/갱신만 수행하고, state에서 새로 생긴 L2Function 행을 append하지 못함.
- **수정**: `useWorksheetSave.ts`의 `syncL2Functions`를 state 기반 재구성 방식으로 변경.
  - `state.l2[].functions[].productChars[]`를 기준으로 원자 행(`l2Functions`) 생성/갱신
  - 신규 id도 `next` 배열에 포함하여 `saveAtomicDB` payload에 반영
- **결과**: A3 팝업 적용값이 새로고침 후에도 유지됨.
- **관련 파일**: `worksheet/hooks/useWorksheetSave.ts`, `worksheet/tabs/function/FunctionL2Tab.tsx`, `worksheet/useL2FunctionSelect.ts`

---

## 7. 코드로 “공통화”할 때의 현실적인 순서

1. **문서**: 워크시트 열·모달 공통 지도는 **본 파일만** SSoT로 유지.  
2. **순수 함수 추출**: 예) `partitionAppliedNotApplied<T extends { id: string }>(items, worksheetIdSet)` — `useWorkElementSelect` / `useL1FunctionSelect` / `useL2FunctionSelect` / `DataSelectModal`의 이원화를 줄이기.  
3. **UI 통합**: `WorkElementSelectModal`·`L1FunctionSelectModal`·`L2FunctionSelectModal`·`DataSelectModal`의 **적용/미적용 레이아웃**을 공통 서브컴포넌트로 빼기 — **CODEFREEZE** 파일은 사용자 승인 후.  
4. **DataSelectModal**: itemCode별로 `fullSelectionApply`를 명시해 **문자열 병합 모드** 사용처를 줄인다.

---

## 8. 관련 문서

- `docs/PFMEA_TO_CP_COLUMN_MAPPING.md` — CP 컬럼 매핑  
- `CLAUDE.md` Rule 1.7, Rule 10 (고장연결 탭 보호)

---

열 기능을 바꾼 뒤에는 **해당 탭 표(§4)** 와 **§3 모달 표**를 같이 고쳐 준다.
