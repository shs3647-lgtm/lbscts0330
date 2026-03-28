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

| 열 | 클릭 | 더블클릭 | 모달 | 마스터 동기화 |
|----|------|----------|------|-------------|
| 작업요소(구조 연동) | — | — | 읽기 중심 | — |
| 요소기능(B2) | `DataSelectModal` | ✅ `handleInlineEditFunction` | itemCode `B2` | ✅ PATCH B2 |
| 공정특성(B3) | `DataSelectModal` | ✅ `handleInlineEditProcessChar` | itemCode `B3` | ✅ PATCH B3 |
| SC | `SpecialCharSelectModal` | — | — | — |

**B2/B3 팝업 선택 로직** (2026-03-28): A4와 동일 — 빈행 우선 채움, 부족하면 행추가, 선택 해제 시 제거.

**B2/B3 더블클릭 인라인 편집**: 값 변경 시 마스터 DB에 oldValue→newValue 업데이트. 신규면 추가.

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

### 6.2 atomicDB 단일화 저장 패턴 (2026-03-27)

> **문제**: 메모리에 `atomicDB`(DB 형태)와 `state`(트리 형태) 2벌이 존재.
> 편집은 state에서, 저장은 atomicDB에서 → 편집 내용 누락.
>
> **해결 방향**: atomicDB 1벌로 통일. 편집 → atomicDB 직접 수정 → `saveNow(db)` 즉시 저장 → state 동기화(화면용).

| 탭/열 | 저장 패턴 | 상태 |
|-------|-----------|------|
| **구조분석 — 공정(L2)** | `addL2Structure` / `deleteL2Structure` / `updateL2Structure` / `removeEmptyL2Structures` → `saveNow(newDB)` → state 동기화 | ✅ 전환 완료 |
| **구조분석 — 작업요소(L3)** | `replaceL3Structures` / `addL3Structure` / `deleteL3Structure` → `saveNow(newDB)` → state 동기화 | ✅ 전환 완료 |
| **구조분석 — 4M/셀 편집** | state 수정 → `emitSave()` → `syncConfirmedFlags` → DB 저장 | ⚠️ 기존 패턴 (emitSave 경유) |
| **2기능 — A3(메인공정기능)** | `mergeRowsByMasterSelection` → `setStateSynced` → `emitSave()` + `syncL2Functions` state 기반 재구성 | ✅ emitSave 전환 완료 |
| **1기능 — C1/C2/C3** | state 수정 → `emitSave()` → `syncL1Functions` state 기반 재구성 → DB 저장 | ✅ emitSave 전환 완료 |
| **나머지 탭** | state 수정 → `emitSave()` 또는 `saveAtomicDB(true)` → `syncConfirmedFlags` → DB 저장 | ⚠️ 기존 패턴 |

**핵심 파일**:

| 파일 | 역할 |
|------|------|
| `hooks/useAtomicView.ts` | atomicDB immutable 편집 헬퍼 (add/update/delete/replace) |
| `hooks/useSaveEvent.ts` | `saveNow(db)` 직접 저장 + `emitSave()` 이벤트 방식 |
| `hooks/useWorksheetSave.ts` | `syncConfirmedFlags` (state→atomicDB 10개 항목 동기화) + `save` 함수 |

**전환 원칙**:
1. 새 기능은 반드시 `atomicDB 직접 수정 → saveNow(newDB) → state 동기화` 패턴 사용
2. 기존 탭은 점진적으로 전환 (state 수정 + emitSave → atomicDB 직접 + saveNow)
3. state는 화면 렌더링 전용으로만 유지, 최종 목표는 state 제거
4. 서버 API(`/api/fmea`)의 빈 배열 복원 보호 코드 삭제 완료 — `syncConfirmedFlags`가 동기화 담당
5. 불필요한 레거시 보호/가드 코드는 스킵이 아닌 **완전 삭제** 원칙

### 6.3 제품특성(A4) 선택 모달 동작 사양 (2026-03-28)

> **파일**: `useFunctionL2Handlers.ts` → `handleSave`

**선택 적용 로직 (빈행 우선 채움)**:

| 단계 | 동작 | 설명 |
|------|------|------|
| 1 | 기존 매칭 유지 | 이미 같은 이름의 제품특성이 있으면 그대로 유지 |
| 2 | 빈 행 채움 | 신규 선택값을 기존 빈 행(`name=''`)에 순서대로 채움 |
| 3 | 행 추가 | 빈 행이 부족하면 새 행(`uid()`) 생성하여 추가 |
| 4 | 선택 해제 행 제거 | 체크 해제된 비빈 행은 결과에서 제외 |

```
예시: 현재 행 = ["치수", "", "외관", ""]
     선택값 = ["치수", "중량", "강도"]

1단계: "치수" 매칭 → 유지
2단계: "중량" → 빈행[0]에 채움, "강도" → 빈행[1]에 채움
3단계: (빈행 충분하므로 추가 없음)
4단계: "외관" 선택 해제 → 제거
결과: ["치수", "중량", "외관" 제거, "강도"] → ["치수", "중량", "강도"]
```

**행 추가/삭제 (컨텍스트 메뉴)**:

| 동작 | 분기 | 설명 |
|------|------|------|
| 위로 추가 | `rowType='productChar'` | 같은 기능 내 해당 제품특성 위에 빈 행 삽입 |
| 아래로 추가 | `rowType='productChar'` | 같은 기능 내 해당 제품특성 아래에 빈 행 삽입 |
| 삭제 | `rowType='productChar'` | 해당 제품특성 행 제거 (최소 1행 유지) |

**rowSpan 계산**: `procRowSpan`과 `funcRowSpan` 모두 빈 행 포함 전체 `chars.length` 사용 (filterMeaningfulProductChars 미사용).

### 6.4 구조분석 작업요소(L3) 저장 상세

| 동작 | 함수 | atomicDB | state | DB |
|------|------|----------|-------|----|
| 작업요소 모달 적용 | `replaceL3Structures` | 해당 L2의 L3 전체 교체 | 동기화 | `saveNow` |
| 행 추가 (위/아래) | `addL3Structure` | L3 1개 추가 | 동기화 | `saveNow` |
| 행 삭제 | `deleteL3Structure` | L3 1개 삭제 (0개 시 빈 L3 자동 추가) | 동기화 | `saveNow` |
| 4M 변경 | state 수정 | `emitSave` → `syncL3Structures` | 직접 수정 | `syncConfirmedFlags` |
| 더블클릭 이름 편집 | state 수정 | `emitSave` → `syncL3Structures` | 직접 수정 | `syncConfirmedFlags` |

**빈 L3 자동 생성**: 데이터 로더(`useWorksheetDataLoader`)에서 L3 없는 공정에 빈 L3 1개를 state + atomicDB 양쪽에 추가. 셀 편집/행추가 시 ID 매칭 보장.

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
