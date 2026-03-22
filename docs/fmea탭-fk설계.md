# FMEA 탭 FK 설계서

> **대상**: Au Bump PFMEA | **작성일**: 2026-03-22

## 1. 파이프라인 흐름

```
등록 → fmeaId 생성 (public만, 스키마 LAZY)
Import → 스키마 생성(ON-DEMAND) → 파싱 → UUID/FK 결정 → DB 저장
워크시트 이동 → DB 로드 → 렌더링
```

### 상세

```
등록 POST /api/triplet/create
 ├─ fmeaId: pfm26-mXXX
 ├─ public에 메타 저장 (TripletGroup, FmeaProject)
 └─ 프로젝트 스키마 아직 없음 (LAZY)

Import POST /api/fmea/import-excel-file
 ├─ ensureProjectSchemaReady() → CREATE SCHEMA pfmea_pfm26_mXXX
 ├─ parseMultiSheetExcel() → FlatData[] + failureChains[]
 └─ buildAtomicFromFlat() → UUID/FK 결정 → $transaction INSERT

워크시트 GET /pfmea/worksheet?id=pfm26-mXXX
 ├─ loadAtomicDB() → 프로젝트 스키마에서 전체 로드
 └─ atomicToLegacy() → React 렌더링
```

## 2. 프로젝트 스키마 테이블

| 테이블 | 엔티티 | 소스 | FK |
|--------|--------|------|-----|
| l2_structures | 공정 21건 | L2 A1+A2 | l1StructId |
| l3_structures | 작업요소 91건 | L3 B1 | l2StructId |
| l1_functions | 완제품기능 7건 | L1 C2 | l1StructId |
| l2_functions | 공정기능 26건 | L2 A3 | l2StructId |
| l3_functions | 요소기능 101건 | L3 B2 | l3StructId |
| failure_effects | 고장영향 20건 | L1 C4 | l1FunctionId |
| failure_modes | 고장형태 26건 | L2 A5 | l2StructId, productCharId |
| failure_causes | 고장원인 107건 | L3 B4 | l3FunctionId |
| process_product_chars | 제품특성 26건 | L2 A4 | l2StructId |
| **failure_links** | **고장사슬 107건** | **FC** | **fmId, fcId, feId** |
| risk_analyses | 위험분석 107건 | FC S + L2 A6 + L3 B5 | failureLinkId |

## 3. UUID dedup key

| 엔티티 | dedup key |
|--------|-----------|
| L2Structure | PF\|{pno} |
| L3Structure | {pno}\|{m4}\|{seq} |
| A4 ProductChar | {pno}\|{char} |
| A5 FailureMode | {pno}\|{fm} |
| B4 FailureCause | {pno}\|{m4}\|{we}\|{fm}\|{fc} |
| C4 FailureEffect | {procNo}\|{scope}\|{fe} |
| FailureLink | {fmId}\|{fcId}\|{feId} (3요소 필수) |

## 4. 시트별 DB 매핑

### L1(C1-C4) → 완제품
- C1(구분) → l1_functions.category
- C2(제품기능) → l1_functions.name
- C4(고장영향) → failure_effects.name FK→l1_functions

### L2(A1-A6) → 공정
- A1(공정번호) → l2_structures.no
- A2(공정명) → l2_structures.name
- A3(공정기능) → l2_functions.name FK→l2_structures
- A4(제품특성) → process_product_chars FK→l2_structures
- A5(고장형태) → failure_modes.mode FK→l2_structures, productCharId
- A6(검출관리) → risk_analyses.detectionControl FK→failure_links

### L3(B1-B5) → 작업요소
- B1(작업요소) → l3_structures.name + m4 FK→l2_structures
- B2(요소기능) → l3_functions.name FK→l3_structures
- B3(공정특성) → l3_functions.processChar
- B4(고장원인) → failure_causes.cause FK→l3_functions
- B5(예방관리) → risk_analyses.preventionControl FK→failure_links

### FC 고장사슬 (N:1:N, 8열)
- FE구분 → failure_effects.scope → feId FK
- FE(고장영향) → failure_effects.name
- S(심각도) → risk_analyses.severity
- 공정번호 → l2_structures.no
- FM(고장형태) → failure_modes.mode → fmId FK
- 4M / WE(작업요소) → 매칭 보조
- FC(고장원인) → failure_causes.cause → fcId FK

## 5. FK 관계도

```
l1_structures
  ├─ l1_functions(C2) → failure_effects(C4) ─── feId ─┐
l2_structures(A1)                                      │
  ├─ l2_functions(A3)                                  │
  ├─ process_product_chars(A4)                         │
  │    └─ failure_modes(A5) ──────────────── fmId ─┐   │
l3_structures(B1)                                  │   │
  ├─ l3_functions(B2+B3)                           │   │
  │    └─ failure_causes(B4) ────────────── fcId ─┐│   │
                                                   ││   │
                    failure_links { fmId, fcId, feId }
                      └─ risk_analyses
                           S  ← FC시트
                           DC ← L2 A6
                           PC ← L3 B5
                           O,D ← 워크시트 입력
```

## 6. N:1:N 구조 (FE:FM:FC = 다대다)

```
FM "파티클 초과" (공정 01):

  FE1(YP) ─┐
  FE2(YP) ─┼→ FM ─┬→ FC1 온습도이탈     [EN/클린룸]
  FE3(SP) ─┘      ├→ FC2 숙련도부족     [MN/클린룸담당자]
                   ├→ FC3 설비가동률저하  [MC/항온항습기]
                   ├→ FC4 HEPA필터저하   [IM/HEPA필터]
                   ├→ FC5 풍속저하       [EN/FFU]
                   └→ FC6 습도부적합     [MC/항온항습기]

FC시트 (carry-forward):
  FE1 NEW → FM → FC1
  FE2 NEW → FM → FC2
  FE3 NEW → FM → FC3
  FE3 반복 → FM → FC4
  FE3 반복 → FM → FC5
  FE3 반복 → FM → FC6

DB FailureLink:
  FL1 { fmId, fcId:FC1, feId:FE1 }
  FL2 { fmId, fcId:FC2, feId:FE2 }
  FL3 { fmId, fcId:FC3, feId:FE3 }
  FL4 { fmId, fcId:FC4, feId:FE3 } ← carry-forward
  FL5 { fmId, fcId:FC5, feId:FE3 }
  FL6 { fmId, fcId:FC6, feId:FE3 }
```

## 7. 베이스라인

| 항목 | 수량 | 소스 |
|------|------|------|
| 공정 L2 | 21 | L2 A1 |
| 작업요소 L3 | 91 | L3 B1 |
| L2Function | 26 | L2 A3 |
| L3Function | 101 | L3 B2 |
| 제품특성 | 26 | L2 A4 |
| FM 고장형태 | 26 | L2 A5 |
| FE 고장영향 | 20 | L1 C4 |
| FC 고장원인 | 107 | FC |
| FailureLink | 107 | FC N:1:N |
| DC 검출관리 | 48 | L2 A6 |
| PC 예방관리 | 118 | L3 B5 |
