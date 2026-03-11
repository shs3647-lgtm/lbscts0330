# Handsontable → HTML Table 마이그레이션 계획서

> **작성일**: 2026-02-20 | **상태**: ✅ 완료 | **롤백 태그**: `rollback-20260220-b2b3guard`

## 1. 배경 및 목적

### 문제
- Handsontable 라이브러리 (v16.2.0) 가 번들에 포함되어 있음
- 번들 크기: CSS ~48KB + JS ~500KB+ (읽기전용 25행 테이블에 과도한 의존성)
- `@handsontable/react` 는 이미 deprecated (→ `@handsontable/react-wrapper` 권장)
- 라이선스 이슈: `non-commercial-and-evaluation` 키 사용 중 → 온프레미스 배포 시 위험

### 목표
- Handsontable 완전 제거 → HTML `<table>` + Tailwind CSS 로 대체
- 기존 UI/UX 100% 유지 (시각적 차이 없음)
- 번들 사이즈 ~550KB 감소

---

## 2. 현황 진단 결과

### Handsontable 사용 파일 전수 조사 (6개 파일)

| # | 파일 경로 | 라인수 | 상태 | 비고 |
|---|----------|--------|------|------|
| 1 | `src/app/project/components/ProjectDashboardTable.tsx` | 382 | **활성 사용** | 유일한 실사용 파일 |
| 2 | `src/app/pfmea/worksheet/FMEAWorksheet.tsx` | 187 | **미사용 (dead)** | 어디서도 import 안 됨 |
| 3 | `src/app/dfmea/worksheet/FMEAWorksheet.tsx` | 189 | **미사용 (dead)** | `@ts-nocheck`, import 없음 |
| 4 | `src/app/pfmea/worksheet/columns.ts` | 157 | **미사용 (dead)** | FMEAWorksheet만 사용 |
| 5 | `src/app/dfmea/worksheet/columns.ts` | 100 | **미사용 (dead)** | FMEAWorksheet만 사용 |
| 6 | `src/app/project/dashboard-test/page.tsx` | 70 | 테스트 페이지 | 간접 사용 |

### 핵심 발견
- **실제 Handsontable을 사용하는 파일은 딱 1개** (`ProjectDashboardTable.tsx`)
- 모든 PFMEA/DFMEA 워크시트 탭은 **이미 HTML 테이블** 사용 중
- 4개 파일은 dead code → 즉시 삭제 가능 (위험도 0)

### ProjectDashboardTable.tsx 상세 분석

```
용도: APQP 대시보드 프로젝트 현황 테이블
특성: 읽기전용 (readOnly: true)
데이터: ~25행, 13컬럼
호출 경로: apqp/dashboard/page.tsx → ProjectDashboardNew.tsx → ProjectDashboardTable.tsx
```

**사용 중인 Handsontable 기능:**

| 기능 | HTML 대체 방법 | 난이도 |
|------|--------------|--------|
| 커스텀 셀 렌더러 4개 (progress, status, compliance, delayed) | React 인라인 컴포넌트 | 쉬움 |
| 컬럼 정렬 (columnSorting) | `useState` + `useMemo` (BdStatusTable 패턴) | 쉬움 |
| 행 클릭 이벤트 (afterSelection) | `<tr onClick>` | 쉬움 |
| 컬럼 자동 확장 (stretchH='all') | `table-fixed` + 퍼센트 colgroup | 쉬움 |
| 행 높이 40px | `h-10` Tailwind 클래스 | 쉬움 |

**결론: 모든 기능이 HTML 테이블로 쉽게 대체 가능 (복잡한 기능 없음)**

---

## 3. 마이그레이션 실행 결과 (5단계)

### ✅ Phase 1: Dead Code 삭제 — `8dbbada3`

삭제된 파일 (4개, 총 633줄):
- `src/app/pfmea/worksheet/FMEAWorksheet.tsx` (187줄)
- `src/app/pfmea/worksheet/columns.ts` (157줄)
- `src/app/dfmea/worksheet/FMEAWorksheet.tsx` (189줄)
- `src/app/dfmea/worksheet/columns.ts` (100줄)

### ✅ Phase 2: HTML 대체 컴포넌트 작성 — `25a7637c`

신규 파일: `src/app/project/components/ProjectDashboardTable.tsx` (329줄)

설계:
```
ProjectDashboardTable.tsx (HTML 버전)
├── Props: 기존과 동일 (onProjectClick, onModuleClick, onGanttClick)
├── State: data, sortKey, sortDir
├── 데이터: fetchDocuments() 기존 로직 그대로 이전
├── 정렬: useMemo (BdStatusTable 패턴 따름)
├── 셀 렌더러 (React 컴포넌트):
│   ├── ProgressCell → getProgressColor() 활용
│   ├── StatusCell → getStatusColor() 활용
│   ├── ComplianceCell → getComplianceColor() 활용
│   └── DelayedCell → getDelayedTasksColor() 활용
├── 컬럼 폭: DASHBOARD_COLUMNS width → 퍼센트 자동 변환
└── JSX:
    └── <table className="w-full border-collapse table-fixed">
        ├── <colgroup> (퍼센트 기반)
        ├── <thead className="sticky top-0 z-10">
        │   └── <tr> 정렬 가능 <th> (▲▼ 표시)
        └── <tbody>
            └── {sorted.map(row => <tr onClick h-10>)}
```

### ✅ Phase 3: Import 교체 — `a4bde315`

변경: 2파일, 각 1줄만 변경

### ✅ Phase 4: 구 파일 삭제 + 리네임 — `e81f347e`

- 구 Handsontable 버전 삭제
- `ProjectDashboardTableHTML.tsx` → `ProjectDashboardTable.tsx` 리네임

### ✅ Phase 5: npm 패키지 제거 — `e68c4afa`

- `handsontable` 제거
- `@handsontable/react` 제거
- 10개 패키지 제거 완료

---

## 4. 최종 결과

| 구분 | 내용 |
|------|------|
| 삭제 파일 | 5개 (dead code 4 + 구 컴포넌트 1) |
| 신규 파일 | 1개 (`ProjectDashboardTable.tsx` — HTML 버전, 329줄) |
| 수정 파일 | 2개 (import 경로 1줄씩, 최종 원복) |
| 수정 없는 파일 | types, utils, core 등 공유 모듈 전혀 변경 없음 |
| 번들 감소 | ~550KB (CSS 48KB + JS 500KB+) |
| npm 패키지 | 2개 제거 (handsontable, @handsontable/react) → 10개 의존성 제거 |
| tsc --noEmit | 에러 0개 |
| 커밋 수 | 5개 (각각 독립 검증 완료) |
