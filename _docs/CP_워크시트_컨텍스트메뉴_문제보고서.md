# CP 워크시트 컨텍스트 메뉴 문제 보고서

> **작성일**: 2026-03-06
> **대상**: `src/app/(fmea-core)/control-plan/worksheet/`
> **컨텍스트 메뉴 타입**: 5개 (`process` | `work` | `char` | `part` | `general`)

---

## 1. 아키텍처 개요

### 컨텍스트 메뉴 흐름
```
셀 우클릭 (renderers/index.tsx)
  → onContextMenu(e, rowIdx, type, colKey)
  → useContextMenu.openContextMenu() (hooks/useContextMenu.ts)
  → CPContextMenu 렌더링 (components/CPContextMenu.tsx)
  → 메뉴 항목 클릭
  → useWorksheetHandlers의 핸들러 호출 (hooks/useWorksheetHandlers.ts)
```

### 컬럼 그룹 ↔ 컨텍스트 메뉴 타입 매핑

| # | 컬럼 그룹 | 컬럼 | 컨텍스트 메뉴 타입 | onContextMenu 바인딩 |
|---|-----------|------|-------------------|---------------------|
| 1 | 공정현황 | processNo, processName | `process` (colKey: AB) | O (렌더러 L290) |
| 1 | 공정현황 | processLevel | - | **X (바인딩 없음)** |
| 1 | 공정현황 | processDesc | `process` (colKey: processDesc) | O (렌더러 L540) |
| 1 | 공정현황 | partName | `part` | O (렌더러 L580) |
| 1 | 공정현황 | equipment | `work` | O (렌더러 L628) |
| 2 | 관리항목 | detectorEp | - | **X (체크박스, 바인딩 없음)** |
| 2 | 관리항목 | detectorAuto | - | **X (체크박스, 바인딩 없음)** |
| 2 | 관리항목 | charNo | - | **X (자동 계산, 바인딩 없음)** |
| 2 | 관리항목 | productChar | `char` | O (렌더러 L679) |
| 2 | 관리항목 | processChar | `char` | O (렌더러 L727) |
| 2 | 관리항목 | specialChar | - | **X (select, 바인딩 없음)** |
| 2 | 관리항목 | specTolerance | `general` | O (기본 렌더러 L775) |
| 3 | 관리방법 | evalMethod | `general` | O (기본 렌더러 L775) |
| 3 | 관리방법 | sampleSize | `general` | O (기본 렌더러 L775) |
| 3 | 관리방법 | sampleFreq | - | **X (select, 바인딩 없음)** |
| 3 | 관리방법 | controlMethod | `general` | O (기본 렌더러 L775) |
| 3 | 관리방법 | owner1 | - | **X (select, 바인딩 없음)** |
| 3 | 관리방법 | owner2 | - | **X (select, 바인딩 없음)** |
| 4 | 대응계획 | reactionPlan | `general` | O (기본 렌더러 L775) |

---

## 2. 컨텍스트 메뉴 타입별 상세 분석

### 2.1 `process` 타입 (공정현황)

**대상 컬럼**: processNo(A), processName(B), processDesc(D)

| 메뉴 항목 | 상태 | 비고 |
|-----------|------|------|
| 위로 행 추가 | **O 정상** | AB: 병합그룹 맨 위 삽입 + 고유값 병합방지 |
| 아래로 행 추가 | **O 정상** | AB: 병합그룹 맨 아래+1 삽입 |
| 행 삭제 | **O 정상** | 최소 1행 보호 |
| 병합 | **O 정상** | AB, processLevel, processDesc 지원 |
| Undo/Redo | **O 정상** | 최대 3회 |

**AB 컬럼 특수 로직**: 새 행의 processNo/processName에 `_timestamp_random` 고유값 삽입 → 기존 병합 그룹과 분리

**CD(processDesc) 컬럼 특수 로직**: 새 행의 A,B는 현재행 값 복사(확장병합), C,D는 고유값(병합방지)

**문제 없음** - 가장 완성도 높은 타입

---

### 2.2 `work` 타입 (설비/금형/JIG)

**대상 컬럼**: equipment(E)

| 메뉴 항목 | 상태 | 비고 |
|-----------|------|------|
| 위로 행 추가 | **O 정상** | CD 병합그룹 맨 위 삽입, A~D 확장병합, E 빈값 |
| 아래로 행 추가 | **O 정상** | CD 병합그룹 맨 아래+1 삽입 |
| 행 삭제 | **O 정상** | |
| 병합 | **O 정상** | workElement 포함 (`isMergeableColumn`) |
| Undo/Redo | **O 정상** | |

**문제 없음**

---

### 2.3 `char` 타입 (제품특성/공정특성)

**대상 컬럼**: productChar(I), processChar(J)

| 메뉴 항목 | 상태 | 비고 |
|-----------|------|------|
| 위로 행 추가 | **O 정상** | E열 병합그룹 맨 위 삽입, A~E 확장병합, I 빈값 |
| 아래로 행 추가 | **O 정상** | E열 병합그룹 맨 아래+1 삽입 |
| 행 삭제 | **O 정상** | |
| 병합 | **X 미지원** | `isMergeableColumn`에 productChar/processChar 없음 |
| Undo/Redo | **O 정상** | |

> **이슈 #1**: char 타입 컬럼은 병합 메뉴가 표시되지 않음. `isMergeableColumn`에 해당 키가 없기 때문. 제품특성/공정특성 행 병합이 필요한 경우 문제.

---

### 2.4 `part` 타입 (부품명) - **심각한 문제**

**대상 컬럼**: partName(F)

| 메뉴 항목 | 상태 | 비고 |
|-----------|------|------|
| 위로 행 추가 | **BUG** | `part` 타입 전용 분기 없음 → CD 기반 default 로직으로 fallthrough |
| 아래로 행 추가 | **BUG** | `part` 타입 전용 분기 없음 → generic default 로직으로 fallthrough |
| 행 삭제 | **O 정상** | |
| 병합 | **O 정상** | `isMergeableColumn`에 `partName` 포함 |
| Undo/Redo | **O 정상** | |

> **이슈 #2 (HIGH)**: `handleInsertRowAbove`에 `if (type === 'part')` 분기가 없음.
> - 현재 동작: default fallthrough → CD 병합 그룹 기반으로 그룹 시작점 계산 → **부품명과 무관한 위치에 행 삽입**
> - 기대 동작: 부품명(partName) 병합 그룹 기반으로 그룹 시작점/끝점 계산, A~D 확장병합, F 빈값
>
> **이슈 #3 (HIGH)**: `handleInsertRowBelow`에도 동일한 `part` 분기 누락.
> - 현재 동작: generic default → `currentItem.processNo/processName` 복사만 하고 단순 rowIdx+1 삽입
> - 기대 동작: partName 병합 그룹 맨 아래+1에 삽입, A~D+equipment 확장병합

**코드 위치**:
- `useWorksheetHandlers.ts:55-205` (handleInsertRowAbove) — `part` 분기 없음
- `useWorksheetHandlers.ts:208-373` (handleInsertRowBelow) — `part` 분기 없음

---

### 2.5 `general` 타입 (스펙/공차, 평가방법, 관리방법, 조치방법 등)

**대상 컬럼**: specTolerance, evalMethod, sampleSize, controlMethod, reactionPlan

| 메뉴 항목 | 상태 | 비고 |
|-----------|------|------|
| 위로 행 추가 | **X 미표시** | `isABColumn=false`, `isSpecialColumn=false` → else 분기 → 삭제만 표시 |
| 아래로 행 추가 | **X 미표시** | 동일 |
| 행 삭제 | **O 정상** | |
| 병합 | **X 미지원** | `isMergeableColumn`에 해당 키 없음 |
| Undo/Redo | **O 정상** | |

> **이슈 #4 (MEDIUM)**: `general` 타입 컬럼에서는 행 추가(위/아래)가 불가능.
> - CPContextMenu.tsx L53: `isSpecialColumn`에 `'general'` 타입이 포함되지 않음
> - 사용자가 스펙/공차, 평가방법, 관리방법, 조치방법 셀에서 우클릭하면 **삭제만 가능**
> - 행 추가하려면 다른 컬럼(process/work/char)에서 우클릭해야 함

---

## 3. 컨텍스트 메뉴 바인딩 누락 컬럼

아래 컬럼들은 `onContextMenu` 이벤트가 바인딩되지 않아 **우클릭 자체가 불가능**.

| 컬럼 | key | 렌더러 타입 | 이유 |
|------|-----|------------|------|
| 레벨 | processLevel | `<select>` | L319-357: `onContextMenu` 미바인딩 |
| EP | detectorEp | checkbox/텍스트 | L360-400: `onClick`만 바인딩 (모달 열기) |
| 자동검사 | detectorAuto | checkbox/텍스트 | L360-400: 동일 |
| 특별특성 | specialChar | `<select>` | L403-436: `onContextMenu` 미바인딩 |
| 주기 | sampleFreq | `<select>` | L439-473: `onContextMenu` 미바인딩 |
| 책임1 | owner1 | `<select>` | L477-511: `onContextMenu` 미바인딩 |
| 책임2 | owner2 | `<select>` | L477-511: `onContextMenu` 미바인딩 |
| NO | charNo | 자동계산 텍스트 | L308-316: 읽기 전용 |

> **이슈 #5 (LOW)**: 8개 컬럼에서 우클릭 컨텍스트 메뉴 불가능.
> - select/checkbox 컬럼은 브라우저 기본 컨텍스트 메뉴 표시됨
> - 행 삭제/추가가 필요하면 인접 컬럼에서 우클릭해야 함
> - charNo, detectorNo는 읽기 전용이므로 무관

---

## 4. 코드 품질 이슈

### 이슈 #6 (MEDIUM): 직접 뮤테이션 (불변성 위반)

`useWorksheetHandlers.ts` 전체에서 `sortOrder` 재정렬 시 직접 뮤테이션 발생:

```typescript
// 현재 코드 (위반)
newItems.forEach((item, idx) => item.sortOrder = idx);  // 7곳

// 올바른 코드
const reordered = newItems.map((item, idx) => ({ ...item, sortOrder: idx }));
```

**발생 위치**: L84, L132, L167, L202, L237, L275, L317, L355, L370, L385

### 이슈 #7 (LOW): `equipment` vs `workElement` 필드 혼용

- `CPItem.equipment`: 실제 DB 저장/로드 필드
- `CPItem.workElement`: optional 필드 (PFMEA 연동용)
- `isMergeableColumn`에 `'workElement'` 포함 → 실제로는 `'equipment'`여야 할 가능성
- 렌더러는 `col.key === 'equipment'`로 work 타입 바인딩

---

## 5. 이슈 요약 및 우선순위

| # | 심각도 | 이슈 | 영향 범위 | 수정 파일 |
|---|--------|------|-----------|-----------|
| **2** | **HIGH** | `part` 타입 insertAbove 핸들러 누락 | 부품명 컬럼 행추가 오동작 | useWorksheetHandlers.ts |
| **3** | **HIGH** | `part` 타입 insertBelow 핸들러 누락 | 부품명 컬럼 행추가 오동작 | useWorksheetHandlers.ts |
| **4** | **MEDIUM** | `general` 타입 행추가 메뉴 미표시 | 관리방법/대응계획 컬럼 기능 제한 | CPContextMenu.tsx |
| **6** | **MEDIUM** | sortOrder 직접 뮤테이션 (7곳+) | 잠재적 상태 불일치 | useWorksheetHandlers.ts |
| **1** | **LOW** | `char` 타입 병합 미지원 | 특성 컬럼 병합 불가 | CPContextMenu.tsx |
| **5** | **LOW** | 8개 컬럼 컨텍스트 메뉴 미바인딩 | select/checkbox 셀 우클릭 불가 | renderers/index.tsx |
| **7** | **LOW** | equipment/workElement 필드 혼용 | 병합 로직 불일치 가능 | cpConstants.ts, useWorksheetHandlers.ts |

---

## 6. 수정 제안

### Phase 1: HIGH 이슈 (즉시 수정)
1. `useWorksheetHandlers.ts`에 `part` 타입 전용 분기 추가 (insertAbove/insertBelow)
   - partName 병합 그룹 기준 시작/끝점 계산
   - A~D+equipment 확장병합, partName 빈값

### Phase 2: MEDIUM 이슈
2. `CPContextMenu.tsx`의 `isSpecialColumn`에 `general` 타입 추가 또는 별도 조건 분기
3. `useWorksheetHandlers.ts` sortOrder 뮤테이션 → spread 패턴으로 교체

### Phase 3: LOW 이슈
4. select/checkbox 컬럼에 `onContextMenu` 바인딩 추가
5. `isMergeableColumn`에 productChar/processChar 추가 검토
6. equipment/workElement 필드 정리
