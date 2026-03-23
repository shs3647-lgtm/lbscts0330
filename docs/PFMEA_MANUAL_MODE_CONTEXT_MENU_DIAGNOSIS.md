# PFMEA 수동모드 컨텍스트 메뉴 — 체계적 진단 (코드베이스 매핑)

> **최종 업데이트**: 2026-03-23  
> **목적**: 사용자 체크리스트(A~F, EX, VERIFY)를 **현재 저장소 구현**에 맞게 정리하고, Handsontable 가정과 실제 아키텍처를 구분한다.

---

## 0. 결론 요약 (아키텍처)

| 가정 (PRD) | 현재 `autom-fmea` PFMEA 워크시트 |
|------------|----------------------------------|
| Handsontable + `alter('insert_row')` + `afterCreateRow` | **해당 없음**. 마이그레이션 완료: **HTML `<table>` + Tailwind** (`CLAUDE.md` Rule 14). |
| `hot.countRows()` vs React | **비교 대상**은 `state.l2` / `rows` 파생 데이터와 **`table tbody tr` DOM** 수준. |
| mergeCells 플러그인 | **Handsontable mergeCells 없음**. L1/L2 등 **병합 표시**는 `rowSpan` 등 **React 렌더** (`StructureTab.tsx`). |

**근본 원인(실제 코드 경로)**은 다음 조합에 가깝다.

1. **React 18 개발 모드 Strict Mode**에서 **함수형 `setState(prev => …)`** 업데이터가 **동일 `prev`에 대해 2회** 호출될 수 있음 → `splice` 기반 구조 변경이 **이중 적용**되면 **2행 추가**처럼 보임.
2. **`setStateSynced`가 과거 `updater(stateRef)` + `setState(객체)`로만 동작**해 React 큐의 `prev`와 어긋날 수 있음 → **수정**: `useWorksheetState`에서 `setState(prev => …)`로 통일 (2026-03-23).
3. **컨텍스트 메뉴 이벤트 전파**로 동일 액션이 중복되는 경우 → **수정**: `PfmeaContextMenu`에서 `stopPropagation` / `type="button"` / 패널 `onMouseDown` (2026-03-23).
4. **구조분석 탭** 삽입/삭제는 **`createStrictModeDedupedUpdater`** (`strictModeStateUpdater.ts`)로 첫 계산 결과 캐시.

---

## A. 컨텍스트 메뉴 정의 탐색

| ID | 항목 | 결과 |
|----|------|------|
| **A-01** | 정의 파일/컴포넌트 | 공용: `src/app/(fmea-core)/pfmea/worksheet/components/PfmeaContextMenu.tsx`. 탭별로 `onInsertAbove` / `onInsertBelow` / `onDeleteRow` 등 **콜백 주입**. |
| **A-02** | 메뉴 항목 | **Handsontable key 없음**. UI 문자열: `위로 새 행 추가`, `아래로 새 행 추가`, `행 삭제`, `위로 병합 추가`, `아래로 병합 추가` 등. |
| **A-03** | 콜백 | `PfmeaContextMenu` 내부 `handleInsertAbove` / `handleInsertBelow` → 부모 `onInsertAbove` / `onInsertBelow`. 구조분석: `StructureTab.tsx`의 `handleInsertAbove` / `handleInsertBelow` 등. |
| **A-04** | override 여부 | **Handsontable `contextMenu: { items }` 없음**. **커스텀 React 오버레이 메뉴** (`z-[201]`) + 전체 화면 `onClick` 오버레이 (`z-[200]`). |

---

## B. 행 추가 로직 추적

| ID | 항목 | 결과 |
|----|------|------|
| **B-01** | 코드 경로 | 우클릭 → `handleContextMenu` (탭별) → `setContextMenuExtra` + `setContextMenu` → 메뉴 클릭 → `handleInsertAbove`/`Below` → `setStateSynced(createStrictModeDedupedUpdater(...))` → `state.l2` (또는 `l3`) `splice`. |
| **B-02** | `alter()` 호출 횟수 | **N/A** (Handsontable 미사용). |
| **B-03** | `afterCreateRow` | **N/A**. |
| **B-04** | `beforeCreateRow` | **N/A**. |
| **B-05** | `afterChange` | **N/A** (Hot 없음). 셀 변경은 탭별 `onChange` / `handleInputBlur` 등. |
| **B-06** | 병합 보정으로 추가 행 | **Handsontable merge 플러그인 없음**. `StructureTab`의 **rowSpan**은 `rows`/`l2Spans` 기반 렌더; **행 추가 시 `state.l2`만 변경**하면 `rows` 재계산으로 반영. **별도 “추가 행 1개 더 만드는” merge 보정 함수는 없음** (검색: `mergeCells`, `afterCreateRow` PFMEA 경로). |
| **B-07** | React vs Hot 행 수 | **동기화 대상은 React `WorksheetState`** (`state.l2`). DOM `tr` 수는 `rows.length`와 일치해야 함. |

---

## C. 행 삭제 로직 추적

| ID | 항목 | 결과 |
|----|------|------|
| **C-01** | 경로 | `PfmeaContextMenu` → `onDeleteRow` → `StructureTab` `handleDeleteRow` (열 타입 `process`/`l1` vs `workElement` 분기). |
| **C-02** | `remove_row` | **N/A**. |
| **C-03** | `afterRemoveRow` | **N/A**. |
| **C-04** | 병합 깨짐 | **rowSpan** 기반 UI; 삭제 후 **같은 `rows` 빌드**로 재렌더. Handsontable 병합 이슈와는 별개. |
| **C-05** | Undo | 워크시트 **Ctrl+Z**는 탭별 구현/제한이 있을 수 있음 — 별도 시나리오로 검증. |

---

## D. 병합셀 관련

| ID | 항목 | 결과 |
|----|------|------|
| **D-01** | `mergedCellsCollection` | **N/A**. |
| **D-02** | MergeCells `afterCreateRow` | **N/A**. |
| **D-03** | 커스텀 `adjustMerge` 등 | PFMEA 구조 탭은 **`l2Spans` 등**으로 시각적 병합; **행 추가 시 별도 “추가 행 삽입” 보정 스크립트 없음**. |
| **D-04** | 병합 안/밖 비교 | **실제 검증**은 `data-col`별 **우클릭 열** (`process` vs `l1` vs `workElement`)과 `rows` 변화로 판단. |

---

## E. 수동모드 vs 기타

| ID | 항목 | 결과 |
|----|------|------|
| **E-01** | 수동만 | `isAutoMode` / `isManualMode`에 따라 **마스터 로드·자동 채움** 차이는 있으나, **컨텍스트 메뉴 자체는 동일 `PfmeaContextMenu`**. |
| **E-02** | Handsontable 설정 차이 | **없음**. |
| **E-03** | 빈 워크시트 | `rows.length === 0` 분기 **별도 UI** (`StructureTab`); `rows`가 생기면 동일 메뉴 경로. |

---

## F. 이벤트 중복 실행

| ID | 항목 | 결과 |
|----|------|------|
| **F-01** | Strict Mode | `next.config.ts`에 **명시적 `reactStrictMode` 없음** (Next 기본 동작은 프로젝트/버전에 따름). **개발 모드**에서 React 18 **Strict Mode**가 켜지면 **업데이터 이중 호출** 이슈 가능 → **dedupe + 함수형 `setStateSynced`**로 대응. |
| **F-02** | Hot `addHook` 중복 | **N/A**. |
| **F-03** | 리마운트 | 탭 전환 시 탭 컴포넌트 언마운트 가능; **한 번의 클릭으로 두 번 삽입**은 주로 **상태 업데이트 경로** 문제. |
| **F-04** | `alter` + `setState` | **해당 없음** (시나리오 1의 **React 주도 단일 경로**만 존재). |

---

## EX. 수정 후 코드 완전성 체크 (매핑)

| ID | 체크 | 방법 |
|----|------|------|
| EX-01~04, 06~08, 10, 12~18 | **브라우저 수동** | 구조분석 `data-col="process"` 셀 우클릭 → 위/아래 추가, 행 수·위치 확인. |
| EX-20 | `rows` vs DOM | **개발자 도구**에서 `table tbody tr` 개수 = 화면 기대 행 수. |
| EX-19 | 타입체크 | `npx tsc --noEmit` |
| EX-11~Undo | **선택** | 탭별 Undo 스택 존재 여부 확인. |

---

## VERIFY: 자동 테스트

- **E2E**: `tests/e2e/context-menu-all-tabs.spec.ts`  
  - 구조분석 L3 `아래로 새 행 추가` → 행 증가 등  
  - **추가**: `1-3b` **L2(공정) `위로 새 행 추가` → 정확히 +1행** (회귀).
- **Unit**: `src/app/(fmea-core)/pfmea/worksheet/utils/strictModeStateUpdater.test.ts`

**Playwright 선택자 주의**: `.handsontable` **사용 금지**. `table tbody tr`, `td[data-col="process"]`, 메뉴 `div.fixed[class*="z-[201]"]` 등 **실제 DOM** 기준.

---

## 관련 수정 파일 (2026-03-23 기준)

| 파일 | 내용 |
|------|------|
| `hooks/useWorksheetState.ts` | `setStateSynced` → `setState(prev => …)` |
| `components/PfmeaContextMenu.tsx` | `stopPropagation`, `type="button"`, 패널 `onMouseDown` |
| `tabs/StructureTab.tsx` | `createStrictModeDedupedUpdater`로 행 추가/삭제/병합 핸들러 |
| `utils/strictModeStateUpdater.ts` | Strict Mode 이중 업데이터 캐시 |

---

## 참고: Handsontable이 남아 있는 곳

- **백업/레거시** 경로 (`backups/`, `codefreeze-*`)에만 존재.  
- **운영 PFMEA 워크시트 경로**는 **HTML 테이블**이다.
