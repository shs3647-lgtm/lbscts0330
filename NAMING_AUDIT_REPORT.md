# FMEA Import 네이밍 전수조사 보고서
> 작성일: 2026-04-03
> 조사 범위: src/ 전체 + prisma/ + Excel 템플릿 코드

---

## 1. FMEA ID별 헤더 변형 매핑표

### Import 모드 범례

| 모드 | 설명 |
|------|------|
| **복합(L2통합)** | `SHEET_DEFINITIONS` 통합시트 헤더 (`excel-template.ts`) |
| **복합(FA)** | FA 통합분석 시트 헤더 |
| **복합(FC)** | FC 고장사슬 시트 헤더 |
| **수동(14시트)** | 개별시트 컬럼 헤더 (`excel-styles.ts` `SHEET_COLUMNS`) |
| **레거시** | 레거시 시트명 기반 (`legacy-individual-sheet-import.ts`) |
| **위치기반** | `position-parser.ts` `detectColumns()` 별칭 목록 |
| **DFMEA** | DFMEA용 변형 (`DFMEA_SHEET_DEFINITIONS`) |

### A1 — 공정번호

| 변형 | 파일 | 모드 |
|------|------|------|
| `A1.공정번호` | `excel-template.ts` | 복합(L2통합) |
| `A1.초점요소번호` | `excel-template.ts` | DFMEA 복합 |
| `공정No(A1)` | `excel-template.ts` | 복합(FA) |
| `초점요소No(A1)` | `excel-template.ts` | DFMEA FA |
| `L2-1.공정번호` | `excel-template.ts` | 레거시/FC |
| `L2-1.초점요소번호` | `excel-template.ts` | DFMEA FC |
| `공정번호` | `excel-styles.ts` | 수동(14시트) |
| `A1`, `공정번호`, `공정 번호`, `PROCESS NO`, `초점요소번호`, `초점요소 번호` | `position-parser.ts` | 위치기반 |

### A2 — 공정명

| 변형 | 파일 | 모드 |
|------|------|------|
| `A2.공정명` | `excel-template.ts` | 복합(L2통합) |
| `A2.초점요소명` | `excel-template.ts` | DFMEA 복합 |
| `공정명(A2)` | `excel-template.ts` | 복합(FA) |
| `초점요소명(A2)` | `excel-template.ts` | DFMEA FA |
| `L2-2.공정명` | `excel-template.ts` | 레거시 |
| `공정명` | `excel-styles.ts` | 수동(14시트) |
| `A2`, `공정명`, `공정 명`, `PROCESS NAME`, `초점요소명`, `초점요소 명` | `position-parser.ts` | 위치기반 |

### A3 — 공정기능

| 변형 | 파일 | 모드 |
|------|------|------|
| `A3.공정기능` | `excel-template.ts` | 복합(L2통합) |
| `A3.초점요소기능` | `excel-template.ts` | DFMEA 복합 |
| `공정기능(A3)` | `excel-template.ts` | 복합(FA) |
| `초점요소기능(A3)` | `excel-template.ts` | DFMEA FA |
| `L2-3.공정기능(설명)` | `excel-template.ts` | 레거시 |
| `공정기능` | `excel-styles.ts` | 수동(14시트) |
| `A3`, `공정기능`, `공정 기능`, `초점요소기능` | `position-parser.ts` | 위치기반 |

### A4 — 제품특성

| 변형 | 파일 | 모드 |
|------|------|------|
| `A4.제품특성` | `excel-template.ts` | 복합(L2통합) |
| `A4.설계특성` | `excel-template.ts` | DFMEA 복합 |
| `제품특성(A4)`, `특별특성(A4)` | `excel-template.ts` | 복합(FA, 2컬럼) |
| `설계특성(A4)`, `특별특성(A4)` | `excel-template.ts` | DFMEA FA |
| `L2-4.제품특성(Wafer 결과값 명사)` | `excel-template.ts` | 레거시 |
| `제품특성` | `excel-styles.ts` | 수동(14시트) |
| `A4`, `제품특성`, `제품 특성`, `PRODUCT CHAR`, `설계특성`, `설계 특성`, `DESIGN CHAR` | `position-parser.ts` | 위치기반 |

### A5 — 고장형태

| 변형 | 파일 | 모드 |
|------|------|------|
| `A5.고장형태` | `excel-template.ts` | 복합(PF/DF 동일) |
| `고장형태(A5)` | `excel-template.ts` | 복합(FA) |
| `L2-5.고장형태(A4이탈 현상)` | `excel-template.ts` | 레거시 |
| `고장형태` | `excel-styles.ts` | 수동(14시트) |
| `A5`, `고장형태`, `고장 형태`, `FAILURE MODE` | `position-parser.ts` | 위치기반 |

### A6 — 검출관리

| 변형 | 파일 | 모드 |
|------|------|------|
| `A6.검출관리` | `excel-template.ts` | 복합(L2통합) |
| `A6.검출관리(발생 후 검출)` | `excel-template.ts` | 복합(FC) |
| `L2-6.검출관리(발생 후 검출 방법)` | `excel-template.ts` | 레거시 |
| `검출관리` | `excel-styles.ts` | 수동(14시트) |
| `A6`, `검출관리`, `검출 관리`, `DETECTION` | `position-parser.ts` | 위치기반 |
| `DC`, `검출관리`, `DETECTION`, `A6.검출관리` | `position-parser.ts` | 위치기반(FC시트) |

### B1 — 작업요소

| 변형 | 파일 | 모드 |
|------|------|------|
| `작업요소(B1)` | `excel-template.ts` | 복합(L3통합) |
| `부품(컴포넌트)(B1)` | `excel-template.ts` | DFMEA 복합 |
| `L3-1.작업요소(설비·재료·인원 고유명)` | `excel-template.ts` | 레거시 |
| `WE(작업요소)` | `excel-template.ts` | 복합(FC) |
| `부품(컴포넌트)` | `excel-template.ts` | DFMEA FC |
| `작업요소` | `excel-styles.ts` | 수동(14시트) |
| `B1`, `작업요소`, `작업 요소`, `WORK ELEMENT`, `부품(컴포넌트)`, `부품`, `컴포넌트`, `COMPONENT` | `position-parser.ts` | 위치기반 |

### B2 — 요소기능

| 변형 | 파일 | 모드 |
|------|------|------|
| `요소기능(B2)` | `excel-template.ts` | 복합(L3통합) |
| `부품기능(B2)` | `excel-template.ts` | DFMEA 복합 |
| `L3-2.요소기능` | `excel-template.ts` | 레거시 |
| `요소기능` | `excel-styles.ts` | 수동(14시트) |
| `작업요소기능` | `excel-styles.ts` | 수동(B3시트 컬럼) |
| `B2`, `요소기능`, `요소 기능`, `부품기능`, `부품 기능`, `COMPONENT FUNC` | `position-parser.ts` | 위치기반 |

### B3 — 공정특성

| 변형 | 파일 | 모드 |
|------|------|------|
| `공정특성(B3)` | `excel-template.ts` | 복합(L3통합) |
| `설계파라미터(B3)` | `excel-template.ts` | DFMEA 복합 |
| `L3-3.공정특성(설비·약품 파라미터)` | `excel-template.ts` | 레거시 |
| `공정특성(B3)`, `특별특성(B3)` | `excel-template.ts` | 복합(FA, 2컬럼) |
| `공정특성` | `excel-styles.ts` | 수동(14시트) |
| `B3`, `공정특성`, `공정 특성`, `PROCESS CHAR`, `설계파라미터`, `설계 파라미터`, `DESIGN PARAM` | `position-parser.ts` | 위치기반 |

### B4 — 고장원인

| 변형 | 파일 | 모드 |
|------|------|------|
| `고장원인(B4)` | `excel-template.ts` | 복합(L3통합/FA) |
| `L3-4.고장원인(B3이탈 원인)` | `excel-template.ts` | 레거시 |
| `FC(고장원인)` | `excel-template.ts` | 복합(FC시트) |
| `고장원인` | `excel-styles.ts` | 수동(14시트) |
| `B4`, `고장원인`, `고장 원인`, `FAILURE CAUSE` | `position-parser.ts` | 위치기반 |

### B5 — 예방관리

| 변형 | 파일 | 모드 |
|------|------|------|
| `예방관리(B5)` | `excel-template.ts` | 복합(L3통합) |
| `L3-5.예방관리(발생 전 방지)` | `excel-template.ts` | 레거시 |
| `B5.예방관리(발생 전 방지)` | `excel-template.ts` | 복합(FC) |
| `예방관리` | `excel-styles.ts` | 수동(14시트) |
| `B5`, `예방관리`, `예방 관리`, `PREVENTION` | `position-parser.ts` | 위치기반 |
| `PC`, `예방관리`, `PREVENTION`, `B5.예방관리` | `position-parser.ts` | 위치기반(FC시트) |

### C1 — 구분

| 변형 | 파일 | 모드 |
|------|------|------|
| `구분(C1)` | `excel-template.ts` | 복합(L1통합/FA) |
| `L1-1.구분` | `excel-template.ts` | 레거시 |
| `구분` | `excel-styles.ts` | 수동(14시트) |
| `C1`, `구분`, `SCOPE`, `CATEGORY` | `position-parser.ts` | 위치기반 |

### C2 — 제품기능

| 변형 | 파일 | 모드 |
|------|------|------|
| `제품기능(C2)` | `excel-template.ts` | 복합(L1통합/FA) |
| `L1-2.제품(반)기능` | `excel-template.ts` | 레거시 |
| `완제품기능` | `excel-styles.ts` | 수동(14시트) |
| 시트탭 `L1-2(C2) 완제품기능` | `excel-styles.ts` | 수동 시트명 |
| `C2`, `제품기능`, `제품 기능`, `FUNCTION` | `position-parser.ts` | 위치기반 |

> ⚠️ `excel-styles.ts`는 "완제품기능", `excel-template.ts`는 "제품기능" — 동일 C2에 **두 가지 한글명** 혼재

### C3 — 요구사항

| 변형 | 파일 | 모드 |
|------|------|------|
| `요구사항(C3)` | `excel-template.ts` | 복합(L1통합/FA) |
| `L1-3.제품(반)요구사항` | `excel-template.ts` | 레거시 |
| `요구사항` | `excel-styles.ts` | 수동(14시트) |
| `C3`, `요구사항`, `요구 사항`, `REQUIREMENT` | `position-parser.ts` | 위치기반 |

### C4 — 고장영향

| 변형 | 파일 | 모드 |
|------|------|------|
| `고장영향(C4)` | `excel-template.ts` | 복합(L1통합/FA) |
| `L1-4.고장영향` | `excel-template.ts` | 레거시 |
| `FE(고장영향)` | `excel-template.ts` | 복합(FC시트) |
| `고장영향(FE/C4)` | `aiag-vda-severity-mapping.ts` | AIAG-VDA |
| `고장영향` | `excel-styles.ts` | 수동(14시트) |
| `C4`, `고장영향`, `고장 영향`, `FAILURE EFFECT` | `position-parser.ts` | 위치기반 |

---

## 2. 파서별 네이밍 현황

| 파일 경로 | 역할 | convention | 컬럼 식별 방식 | 하드코딩 여부 | 참조 FMEA ID |
|-----------|------|------------|----------------|---------------|-------------|
| `src/lib/fmea/position-parser.ts` | 위치기반 엑셀 파서 (메인) | 복합 `A1`~`C4` | 헤더 별칭 목록 + 인덱스 폴백 | **하드코딩** (별칭 배열) | **전체** A1~C4 |
| `src/lib/fmea/legacy-individual-sheet-import.ts` | 레거시 14시트 파서 | 수동 `L2-1(A1)...` | 시트명 검색 + 고정 컬럼 인덱스 | **하드코딩** | **전체** A1~C4 |
| `src/lib/fmea/cross-sheet-resolver.ts` | FC시트 FK 해석 | 영문 camelCase | 행번호 + 복합 문자열 키 | N/A (A1~C4 미사용) | 간접(FM/FE/FC) |
| `src/app/(fmea-core)/pfmea/import/excel-template.ts` | 엑셀 템플릿 정의 | 혼용 (수동+복합) | 헤더 문자열 정의 | **하드코딩** (대량) | **전체** A1~C4 |
| `src/app/(fmea-core)/pfmea/import/utils/excel-styles.ts` | 수동 14시트 스타일 | 수동 style | 시트별 컬럼 배열 | **하드코딩** | **전체** A1~C4 |
| `src/app/(fmea-core)/pfmea/import/utils/buildAtomicDB.ts` | Flat→Atomic 변환 | 복합 `itemCode` | `byCode('A1')` 필터 | **하드코딩** | **전체** A1~C4 |
| `src/app/(fmea-core)/pfmea/import/utils/atomicToFlatData.ts` | Atomic→Flat 역변환 | 복합 `itemCode` | `itemCode: 'A1'` 직접 | **하드코딩** | **전체** A1~C4 |
| `src/app/(fmea-core)/pfmea/import/utils/buildAtomicHelpers.ts` | 헬퍼 (byCode 등) | 복합 | `itemCode === code` | 파라미터 | 간접 (C1) |
| `src/app/(fmea-core)/pfmea/import/utils/atomicToChains.ts` | Atomic→체인 변환 | 영문 camelCase | DB 필드명 | N/A | FM/FC/FE 값만 |
| `src/lib/fmea-core/raw-to-atomic.ts` | 위치파싱→Prisma 저장 | 영문 camelCase | 구조 필드 | 주석만 A1~C4 | C1,C3,A1,A2(주석) |
| `src/app/(fmea-core)/pfmea/import/utils/faValidation.ts` | FA 검증 | 복합 + PRD 코드 | `itemCode` 필터 | **하드코딩** | A1,A5,B4,C4 + PRD C0~C5 |
| `src/app/(fmea-core)/pfmea/import/utils/faVerificationMetrics.ts` | FA 메트릭 | 복합 | `itemCode` 필터 | **하드코딩** | A5,B4,C4 |
| `src/app/(fmea-core)/pfmea/import/utils/import-verification-columns.ts` | 검증 규칙 | 복합 | `ALL_ITEM_CODES` 상수 | **상수 배열** | **전체** A1~C4 |
| `src/lib/fmea-core/validate-import.ts` | Import 검증 | 복합 | `VALID_ITEM_CODES` Set | **상수 Set** | **전체** A1~C4 |
| `src/app/(fmea-core)/pfmea/import/types.ts` | 타입 + 중앙 매핑 | 복합 + `L2-x` 별칭 | `ITEM_CODE_LABELS`, `SHEET_TO_CODE_MAP` | **내보내기 상수** (SSoT) | **전체** A1~C4 |

---

## 3. Prisma 모델 ↔ FMEA ID 매핑

### 원자 구조 모델

| 모델명 | 필드명 | 대응 FMEA ID | @relation 유무 | onDelete | FK 대상 |
|--------|--------|-------------|---------------|----------|---------|
| `L1Structure` | `name` | — (프로젝트명) | — | — | — |
| `L1Function` | `category` | **C1** | ✅ | Cascade | L1Structure |
| `L1Function` | `functionName` | **C2** | — | — | — |
| `L1Function` | `requirement` | **C3** (레거시) | — | — | — |
| `L1Requirement` | `requirement` | **C3** | ✅ | Cascade | L1Function |
| `L1Scope` | `scope` | **C1** | ✅ | Cascade | L1Structure |
| `L2Structure` | `no` | **A1** | ✅ | Cascade | L1Structure |
| `L2Structure` | `name` | **A2** | — | — | — |
| `L2Function` | `functionName` | **A3** | ✅ | Cascade | L2Structure |
| `L2Function` | `productChar` | **A4** (텍스트) | — | — | — |
| `ProcessProductChar` | `name` | **A4** (엔티티) | ✅ | Cascade | L2Structure |
| `L3Structure` | `name` | **B1** | ✅ | Cascade | L2Structure |
| `L3Structure` | `m4` | — (4M) | — | — | — |
| `L3Function` | `functionName` | **B2** | ✅ | Cascade | L3Structure |
| `L3Function` | `processChar` | **B3** (텍스트) | — | — | — |
| `L3ProcessChar` | `name` | **B3** (엔티티) | ✅ | Cascade | L3Function |
| `L3WorkElement` | `name` | **B1** (중복) | ✅ | Cascade | L3Structure |

### 고장 모델

| 모델명 | 필드명 | 대응 FMEA ID | @relation 유무 | onDelete | FK 대상 |
|--------|--------|-------------|---------------|----------|---------|
| `FailureEffect` | `category` | **C1** (FE맥락) | ✅ | Cascade | L1Function |
| `FailureEffect` | `effect` | **C4** | — | — | — |
| `FailureEffect` | `severity` | — (S) | — | — | — |
| `FailureMode` | `mode` | **A5** | ✅ | Cascade | L2Structure |
| `FailureMode` | `productCharId` | → **A4** FK | ✅ | Restrict | ProcessProductChar |
| `FailureCause` | `cause` | **B4** | ✅ | Cascade | L3Structure |

### 위험분석 모델 (A6/B5 저장소)

| 모델명 | 필드명 | 대응 FMEA ID | @relation 유무 | onDelete | FK 대상 |
|--------|--------|-------------|---------------|----------|---------|
| `RiskAnalysis` | `detectionControl` | **A6** | ✅ | Cascade | FailureLink |
| `RiskAnalysis` | `preventionControl` | **B5** | — | — | — |
| `RiskAnalysis` | `severity/occurrence/detection` | — (S/O/D) | — | — | — |

### Import Staging 모델

| 모델명 | 필드명 | 대응 FMEA ID | 비고 |
|--------|--------|-------------|------|
| `PfmeaMasterFlatItem` | `itemCode` | **A1~C4 전체** | `value`가 해당 코드의 셀 내용 |
| `PfmeaMasterFlatItem` | `processNo` | **A1** 맥락 | 행 그룹 키 |
| `PfmeaMasterFlatItem` | `m4` | — (4M) | |

### FMEA ID → Prisma 필드 요약

| FMEA ID | Primary Prisma 필드 |
|---------|---------------------|
| A1 | `L2Structure.no`, `L2ProcessNo.no`, `PfmeaMasterFlatItem.processNo` |
| A2 | `L2Structure.name`, `L2ProcessName.name` |
| A3 | `L2Function.functionName` |
| A4 | `ProcessProductChar.name`, `L2Function.productChar` (레거시) |
| A5 | `FailureMode.mode` |
| A6 | `RiskAnalysis.detectionControl` |
| B1 | `L3Structure.name`, `L3WorkElement.name` |
| B2 | `L3Function.functionName` |
| B3 | `L3ProcessChar.name`, `L3Function.processChar` (레거시) |
| B4 | `FailureCause.cause` |
| B5 | `RiskAnalysis.preventionControl` |
| C1 | `L1Function.category`, `L1Scope.scope`, `FailureEffect.category` |
| C2 | `L1Function.functionName` |
| C3 | `L1Function.requirement`, `L1Requirement.requirement` |
| C4 | `FailureEffect.effect` |

---

## 4. 프론트엔드 키 매핑 및 dedup 현황

### 4-1. 렌더링 키 매핑

| FMEA ID | 레거시 state 키 | ALL탭 FlatRow 키 | ALL탭 AtomicRow 키 |
|---------|----------------|-----------------|-------------------|
| A1 | `proc.no` | `l2No` | `l2StructNo` |
| A2 | `proc.name` | `l2Name` | `l2StructName` |
| A3 | `functions[].name` (L2) | `l2Functions` | `l2FuncName` |
| A4 | `productChars[].name` | `l2ProductChars` | `l2ProductChar` |
| A5 | `failureModes[].name/mode` | `fmText` | `fmMode` |
| A6 | `riskData['detection-*']` | (riskData 동적키) | `detectionControl` |
| B1 | `l3[].name` / `we.name` | `l3Name` | `l3Name` |
| B2 | `we.functions[].name` | (l3Functions 안) | `l3FuncName` |
| B3 | `processChars[].name` | (l3ProcessChars) | `l3ProcessChar` |
| B4 | `failureCauses[].cause` | `fcText` | `fcCause` |
| B5 | `riskData['prevention-*']` | (riskData 동적키) | `preventionControl` |
| C1 | `l1.types[].name/scope` | `l1Type` | `l1FuncCategory` |
| C2 | `functions[].name` (L1 type하) | `l1Function` | `l1FuncName` |
| C3 | `requirements[].name` | `l1Requirement` | `l1Requirement` |
| C4 | `failureScopes/FE.text` | `feText` | `feEffect` |

### 4-2. Dedup 로직

| 파일 | dedup 기준 필드 | FMEA ID | 시점 |
|------|----------------|---------|------|
| `useL2Deduplication.ts` | function `name` 병합; productChars `id` 중복제거 | A3, A4 | 클라이언트 useEffect (l2 변경 시) |
| `useL2Deduplication.ts` | `deduplicateProductCharsAfterFuncMerge`: `name` Set | A4 | 클라이언트 useEffect |
| `useL2Deduplication.ts` | `remapFailureModeCharIds`: char `id↔name` | A5↔A4 FK | 클라이언트 useEffect |
| `useL3Deduplication.ts` | WE: `m4\|name` | B1 | 클라이언트 useEffect |
| `useL3Deduplication.ts` | 함수/공정특성: `id` | B2/B3 | 클라이언트 useEffect |
| `useL3Deduplication.ts` | FC `processCharId` 리매핑 | B4↔B3 | 클라이언트 useEffect |
| `useFunctionL2Handlers.ts` | 마스터: `processNo::value` | A3, A4 | 자동매핑 로드 시 |
| `useFunctionL3Handlers.ts` | 마스터: `processNo::m4::value` | B2, B3 | 자동매핑 로드 시 |
| `FailureL2Tab.tsx` (핸들러) | `processNo::value` | A5 | 자동매핑 로드 시 |
| `FailureL2Tab.tsx` (렌더) | FM `name` 중복제거 (표시용) | A5 | 렌더링 시 |
| `FailureL3Tab.tsx` | FC `id` Set | B4 | useEffect + UI 집계 |

### 4-3. UI 하드코딩 한글 필드명 (주요)

| 파일 | 하드코딩된 한글 | 비고 |
|------|----------------|------|
| `allTabConstants.ts` (COLUMN_DEF) | `구분`, `완제품기능`, `요구사항`, `공정 기능`, `제품특성`, `작업요소 기능`, `공정특성`, `고장영향(FE)`, `고장형태(FM)`, `고장원인(FC)`, `예방관리(PC)`, `검출관리(DC)` | 컬럼 헤더 고정 |
| `AllTabBasic.tsx` | 3행 헤더에 동일 한글 | `getFmeaLabels` 미적용 |
| `functionL3Utils.ts` | `작업요소기능\|공정특성` (placeholder regex) | 플레이스홀더 검사 |
| `defaultItems.ts` | `C1: 구분`, `A4: 제품특성` 등 코드→한글 | 모달 기본 항목 |

---

## 5. 엔티티 명칭 충돌 목록

### 5-1. 크로스앱 충돌 (Critical)

| 파일 | 코드 | PFMEA 의미 | 이 파일에서의 의미 | 충돌 여부 |
|------|------|-----------|-------------------|----------|
| `src/app/api/control-plan/[id]/master-data/route.ts` | `A3` | 공정기능 | CP: level | **충돌** |
| 같은 파일 | `A4` | 제품특성 | CP: processDesc | **충돌** |
| 같은 파일 | `A5` | 고장형태 | CP: equipment(설비) | **충돌** |
| 같은 파일 | `B1`~`B4` | 작업요소~고장원인 | CP: controlItem~spec | **충돌** |
| `src/app/(fmea-core)/pfd/import/constants.ts` | `A3` | 공정기능 | PFD: 공정설명 | **충돌** |
| 같은 파일 | `A4` | 제품특성 | PFD: 작업요소 | **충돌** |
| 같은 파일 | `A5` | 고장형태 | PFD: 설비 | **충돌** |
| 같은 파일 | `B1`~`B4` | 작업요소~고장원인 | PFD: 특성 컬럼 | **충돌** |
| `src/app/(fmea-core)/control-plan/worksheet/.../EquipmentInputModal.tsx` | `A5` | 고장형태 | CP: 설비 | **충돌** |

### 5-2. UUID 생성기 (네이밍 차용, 충돌 아님)

| 파일 | 패턴 | 의미 | 충돌 여부 |
|------|------|------|----------|
| `src/lib/uuid-generator.ts` | `genA1`~`genC4` | FMEA 엔티티 결정론적 UUID 생성 | 아님 (네이밍 차용) |
| `src/lib/uuid-rules.ts` | `validateDedupKey("B4", ...)` | dedup 엔티티 타입 | 모호 (같은 코드, 다른 맥락) |

### 5-3. 동일 파일 내 혼용

| 파일 | 상황 | 충돌 위험 |
|------|------|----------|
| `position-parser.ts` | `row.cells['A1']` (엑셀 셀) + `itemCode: 'A1'` (flat) | 낮음 (의미 정렬됨) |
| `DataSelectModal.tsx` | `itemCode === 'C3'` (PFMEA) + `FM1`/`FC1`/`FE2` (비표준) | **중간** (두 코드체계 혼재) |
| `faValidation.ts` | `'C1'`~`'C4'` (PRD 체크리스트) vs `itemCode 'A1'` | **중간** (네임스페이스 분리 없음) |

### 5-4. 필드명 드리프트

| 파일 | 필드명 | PFMEA 의미 | 혼동 가능성 |
|------|--------|-----------|------------|
| `import/types.ts` L122 | `processDesc` 주석 `// A3` | 공정기능 | PFD A3=공정설명과 혼동 |
| `master-processes/route.ts` L18 | `'A3': 'processDesc'` | 공정기능/공정설명 | PFD와 교차 시 혼동 |

---

## 6. 불일치 및 위험 항목 (Critical)

| # | 위치 | 문제 설명 | 영향도 | 비고 |
|---|------|----------|--------|------|
| 1 | CP `master-data/route.ts`, PFD `import/constants.ts` | **A3~A5, B1~B4 itemCode가 PFMEA와 완전히 다른 의미로 사용** | **H** | 앱 간 flatData 합치면 데이터 혼재. 현재는 앱별 분리로 실행 시 문제 없음 |
| 2 | `allTabConstants.ts`, `AllTabBasic.tsx` | **ALL 탭 컬럼 헤더 한글 하드코딩** — `getFmeaLabels` 미적용 | **M** | DFMEA에서 "공정기능"→"초점요소기능" 등 미전환 |
| 3 | `excel-styles.ts` vs `excel-template.ts` | **C2 한글명 불일치**: "완제품기능" vs "제품기능" | **L** | 시트 탭명과 헤더가 다름; 파싱에는 영향 없음 |
| 4 | `faValidation.ts` | **PRD 코드 C0~C5와 FMEA 코드 C1~C4 네임스페이스 비분리** | **M** | `failedItems` 배열에서 PRD `C1`과 FMEA `C1` 구분 불가 |
| 5 | `DataSelectModal.tsx` | **PFMEA itemCode (A/B/C)와 비표준 코드 (FM1/FC1/FE2) 혼재** | **L** | 호출자가 올바른 체계만 전달하면 실행 문제 없음 |
| 6 | `import/types.ts`, `master-processes/route.ts` | **`processDesc` 필드명이 PFD A3(공정설명)과 혼동** | **L** | PFMEA 내부에서만 사용 시 무해; 크로스앱 리팩토링 시 주의 |
| 7 | `L2Function.productChar` + `ProcessProductChar.name` | **A4(제품특성)이 텍스트 필드와 엔티티 FK 두 곳에 저장** | **M** | 편집 시 두 곳 동기화 필요. 현재 `atomicToLegacy`에서 처리 |
| 8 | `L1Function.requirement` + `L1Requirement.requirement` | **C3(요구사항)이 레거시 단일필드 + 신규 별도테이블 병행** | **L** | 마이그레이션 과도기. 신규 코드는 `L1Requirement` 사용 |

---

## 7. 통계 요약

- **총 조사 파일 수**: 약 180개 (src/ + prisma/)
- **FMEA ID 참조 파일 수**: 약 85개
- **하드코딩된 헤더 문자열 수**: 약 120개소 (15 ID × 평균 8변형)
- **파서/헬퍼에서 상수 사용**: 4개 파일 (`types.ts`, `import-verification-columns.ts`, `validate-import.ts`, `buildAtomicHelpers.ts`)
- **발견된 불일치 수**: **8건** (H: 1, M: 3, L: 4)
- **크로스앱 itemCode 충돌**: CP 6개 + PFD 6개 = **12개 코드** (A3~B4 범위)
- **DFMEA 라벨 미전환**: ALL 탭 헤더 (`allTabConstants.ts`) 등 **광범위**
- **xlsx 템플릿 바이너리**: repo 내 **0개** (코드 생성만)
