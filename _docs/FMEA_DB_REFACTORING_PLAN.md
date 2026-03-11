# FMEA DB-Centric 전면 리팩토링 + 병렬 개발 전략

> **작성일**: 2026-02-10  
> **목표**: localStorage 의존 제거, Atomic DB 테이블에서 직접 렌더링, 2인 병렬 개발

---

## 1. 현황 요약

| 구분 | 현재 상태 | 목표 상태 |
|------|-----------|-----------|
| 데이터 소스 | Legacy JSON (FmeaLegacyData) | Atomic DB 테이블 직접 |
| localStorage | 폴백 렌더링 소스 | 비상 백업 전용 (렌더링 X) |
| 저장 함수 | 3개 혼재 | `saveToDB()` 1개 |
| All화면 API | ✅ 이미 Atomic DB JOIN 사용 | 유지 |
| 탭별 화면 | Legacy JSON → WorksheetState | Atomic DB → WorksheetState |

### 이미 완비된 DB 스키마
- `FmeaProject` + `FmeaRegistration` + `FmeaCftMember` — 등록정보
- `L1/L2/L3 Structure` — 구조분석 (rowSpan, colSpan, mergeGroupId, parentId 포함)
- `L1/L2/L3 Function` — 기능분석
- `FailureEffect/Mode/Cause` — 고장분석
- `FailureLink` + `FailureAnalysis` — 고장연결
- `RiskAnalysis` + `Optimization` — 리스크분석/최적화
- `FmeaConfirmedState` — 확정 상태

> **핵심**: DB 스키마 자체는 이미 완비. 문제는 원자성 DB 테이블이 실제로 사용되지 않고, Legacy JSON이 우선되는 코드 구조.

### 핵심 문제점

| # | 문제 | 위치 | 영향도 |
|---|------|------|--------|
| 1 | localStorage가 여전히 데이터 소스로 사용됨 | `db-storage.ts` 130-190행 | DB 실패 시 localStorage에서 렌더링 → 데이터 불일치 |
| 2 | Legacy JSON이 Single Source of Truth | API `route.ts`, `FmeaLegacyData` 테이블 | 원자성 DB 테이블이 무용화 |
| 3 | saveToLocalStorage가 모든 탭에서 호출 | StructureTab, FunctionTab 등 480+곳 | localStorage 먼저 저장 후 DB |
| 4 | 탭 상태를 localStorage에 저장 | `useWorksheetDataLoader.ts` 154행 | DB에 탭 정보 누락 시 localStorage에서 복원 |
| 5 | 등록정보 localStorage 동기화 | `register/page.tsx` `syncToLocalStorage` | DB와 이중 저장 |
| 6 | 3개 저장 함수 혼재 | `useWorksheetSave.ts` | 역할 혼동 |

---

## 2. 병렬 개발 전략: 2명 분담

### Developer A: Data Layer (저장/로드/API)

| 파일 | 작업 내용 |
|------|-----------|
| `src/app/pfmea/worksheet/db-storage.ts` | localStorage 폴백 렌더링 제거, DB-only 로드 |
| `src/app/pfmea/worksheet/hooks/useWorksheetSave.ts` | 3개 저장 함수 → `saveToDB()` 1개로 통합 |
| `src/app/pfmea/worksheet/hooks/useWorksheetDataLoader.ts` | 886줄 → DB-only 로드로 단순화 (~200줄 목표) |
| `src/app/api/fmea/route.ts` | Legacy JSON 우선 → Atomic DB 우선으로 전환 |
| `src/app/pfmea/worksheet/migration.ts` | Legacy → Atomic 마이그레이션 스크립트 |
| `src/app/pfmea/worksheet/schema.ts` | FMEAWorksheetDB 타입 정비 |
| `src/app/pfmea/worksheet/constants.ts` | WorksheetState 인터페이스 정비 (공유 계약) |

### Developer B: View Layer (All화면 + 탭 + 패널)

| 파일 | 작업 내용 |
|------|-----------|
| `src/app/pfmea/worksheet/tabs/AllViewTab.tsx` | All화면 렌더링 개선 |
| `src/app/pfmea/worksheet/tabs/all/*` | AllTabAtomic, AllTabRenderer 등 |
| `src/app/api/fmea/all-view/route.ts` | All화면 전용 API (이미 Atomic DB 사용) |
| `src/app/pfmea/worksheet/panels/*` | RPNChart, FailureChain, GAPAnalysis 등 |
| 각 Tab의 **렌더링 로직만** | `saveToLocalStorage` → `saveToDB` 호출로 변경 |

### 공유 계약 (절대 단독 수정 금지)

| 파일 | 규칙 |
|------|------|
| `constants.ts` (WorksheetState) | **양측 합의 후만 수정** |
| `schema.ts` (FMEAWorksheetDB) | **양측 합의 후만 수정** |
| `hooks/index.ts` | export 변경 시 양측 통보 |

---

## 3. 충돌 방지: Git 브랜치 전략

```
main
 ├─ feature/fmea-db-refactor-data    ← Developer A
 ├─ feature/fmea-db-refactor-view    ← Developer B
 └─ feature/fmea-db-refactor-shared  ← 공유 계약 변경 시
```

**규칙:**
1. `constants.ts`, `schema.ts` 수정 시 → `shared` 브랜치에서 작업 → 양측 merge
2. 각자 브랜치에서 담당 파일만 수정
3. 매일 `main`에서 rebase하여 최신 상태 유지
4. 최종 merge 순서: `shared` → `data` → `view`

---

## 4. 실행 계획 (4단계)

### Step 1: 공유 계약 확정
- `WorksheetState` 인터페이스에 `dataSource: 'db' | 'local'` 추가
- `saveToLocalStorage` → `saveWorksheet` 이름 통일

### Step 2: Developer A — Data Layer 리팩토링
- `db-storage.ts` localStorage 폴백 렌더링 제거
- `useWorksheetSave.ts` 3개 → 1개 통합
- `useWorksheetDataLoader.ts` 886줄 → ~200줄 단순화
- API `route.ts` Legacy → Atomic 전환

### Step 3: Developer B — View Layer 전환
- 모든 탭에서 `saveToLocalStorage?.(true)` → `saveWorksheet?.(true)` 일괄 변경
- All화면 Atomic DB 직접 데이터 로드 확인
- 패널 컴포넌트 props 정비

### Step 4: 검증 및 통합
- 기존 Legacy 데이터 → Atomic DB 마이그레이션 스크립트
- localStorage.clear() 후 DB에서 정상 로드 확인
- 등록 → 구조 → 기능 → 고장 → 연결 → All → 리스크 전체 플로우 테스트

---

## 5. Verification Checklist

- [ ] DB-only 렌더링: localStorage.clear() → 새로고침 → 데이터 표시 확인
- [ ] 저장 무결성: 구조분석 수정 → DB 직접 조회 → 값 일치
- [ ] All화면 동기화: 탭에서 수정 → All화면 새로고침 → 반영 확인
- [ ] PFD/CP 연동: FMEA ID 기반 CP 연결 → 데이터 정합성
- [ ] 에러 처리: DB 연결 끊김 → 에러 UI 표시 (localStorage 렌더링 없음)
