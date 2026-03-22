# Smart FMEA 코드 수정사항: 위치기반 UUID 다이렉트 꽂아넣기 전환

> **작성일**: 2026-03-22  
> **목적**: 마스터 JSON/flatData 중간변환 제거, 위치기반 UUID+FK로 단순화  
> **참조**: 01_UUID_FK_시스템_진단서.md, 02_Import_엑셀_작성기준.md, 03_JSON_엑셀_데이터누락_진단.md, FMEA_Import_Error_Analysis.md

---

## 1. 전환 방향 요약

```
AS-IS (현재)
════════════
Excel → excel-parser → flatData(A1~C4) + chains
  → supplementMissingItems → buildAtomicFromFlat
  → 텍스트 매칭으로 FK 생성 → 에러 다발
  → 마스터 JSON 동기화 → 추가 에러
  → atomicToLegacy → 워크시트 렌더링

TO-BE (목표)
════════════
Excel → position-parser (위치기반)
  → 시트별 DB 테이블 직접 생성 (UUID = 셀 위치)
  → FK = 같은 행 또는 크로스시트 행번호 참조
  → API가 DB에서 직접 읽어 워크시트에 꽂아넣기
  → 사용자 편집 → DB 즉시 반영

제거: flatData, chains, supplementMissingItems, 마스터 JSON, 
      atomicToFlatData, atomicToChains, export-master, load-master
```

---

## 2. 제거 대상 파일/기능

### 2.1 삭제 대상 (마스터 JSON 관련)

| 파일 | 현재 역할 | 제거 이유 |
|------|-----------|-----------|
| `src/app/api/fmea/export-master/route.ts` | Atomic DB → JSON 파일 생성 | JSON 파일 불필요 |
| `src/app/api/fmea/load-master/route.ts` | JSON → DB 로드 | JSON 파일 불필요 |
| `src/app/api/fmea/import-excel-file/route.ts` | 서버사이드 파싱 + 마스터 JSON 병합 | 마스터 JSON 경유 제거 |
| `src/app/api/fmea/seed-from-master/` | m066 시딩 | m066 마스터 전용, 불필요 |
| `src/app/api/fmea/reset-master/` | 마스터 리셋 | JSON 파일 불필요 |
| `data/master-fmea/*.json` | 마스터 JSON 파일들 | 전체 삭제 |
| `src/lib/sample-data-loader.ts` | sampleData 로딩 | 위치기반에서 불필요 |

### 2.2 삭제 대상 (중간 변환 레이어)

| 파일 | 현재 역할 | 제거 이유 |
|------|-----------|-----------|
| `src/app/(fmea-core)/pfmea/import/utils/atomicToFlatData.ts` | Atomic → FlatData 역변환 | flatData 개념 제거 |
| `src/app/(fmea-core)/pfmea/import/utils/atomicToChains.ts` | Atomic → Chain 생성 | chains 개념 제거 |
| `src/app/(fmea-core)/pfmea/import/utils/supplementMissingItems.ts` | 누락 항목 보충 | 위치기반이면 누락 자체 불가 |
| `src/app/(fmea-core)/pfmea/import/stepb-parser/import-builder.ts` | flatData → convertToImportFormat | flatData/dedup key 제거 |
| `src/app/(fmea-core)/pfmea/import/stepb-parser/prefix-utils.ts` | 결정론적 UUID prefix | 위치기반 UUID로 대체 |
| `src/lib/uuid-generator.ts` (158행) | genC1/genA1/genB1 등 결정론적 UUID | 위치기반 UUID로 대체 |
| `src/lib/uuid-rules.ts` (459행) | UUID 검증 규칙 | 위치기반 규칙으로 대체 |

### 2.3 삭제 대상 (DB/public 스키마)

| 테이블 | 현재 역할 | 제거 이유 |
|--------|-----------|-----------|
| `pfmea_master_datasets` | 마스터 JSON 메타데이터 | JSON 제거 |
| `pfmea_master_flat_items` | flatData DB 저장 | flatData 개념 제거 |
| `fmea_legacy_data` | 워크시트 캐시 (레거시) | DB 다이렉트 읽기로 대체 |

---

## 3. 수정 대상 파일 (유지하되 변경)

### 3.1 핵심 수정: excel-parser → position-parser 전환

#### 파일: `src/app/(fmea-core)/pfmea/import/excel-parser.ts` (928행)

```
현재: 통합시트 파싱 → FlatData[] + MasterFailureChain[] 반환
변경: 통합시트 파싱 → PositionAtomicData 직접 반환

수정 내용:
  1. 반환 타입을 FlatData[]에서 PositionAtomicData로 변경
  2. 각 시트 파싱 시 위치기반 UUID 즉시 생성
  3. L2 시트의 각 행 → 해당 행의 L2Structure/ProductChar/FailureMode/DetectionControl UUID
  4. L3 시트의 각 행 → 해당 행의 L3Structure/L3Function/FailureCause UUID
  5. FC 시트의 각 행 → FailureLink + RiskAnalysis UUID
  6. 크로스시트 FK는 역참조 인덱스로 해결
```

#### 신규 파일: `src/lib/fmea/position-uuid.ts`

```typescript
// UUID 생성
export function positionUUID(sheet: SheetCode, row: number, col?: number): string
export function sameRowFK(sheet: SheetCode, row: number, parentCol: number): string
export function crossSheetFK(targetSheet: SheetCode, targetRow: number, targetCol: number): string
```

#### 신규 파일: `src/lib/fmea/cross-sheet-resolver.ts`

```typescript
// FC 시트 → L1/L2/L3 크로스시트 FK 해결
// 방법 A: 원본행 컬럼(Col13~15) 직접 참조
// 방법 B: 역참조 인덱스 (텍스트+공정번호+4M+WE 키)
export class CrossSheetResolver
```

### 3.2 핵심 수정: buildAtomicFromFlat → buildAtomicFromPosition 전환

#### 파일: `src/app/(fmea-core)/pfmea/import/utils/buildAtomicFromFlat.ts` (601행)

```
현재: FlatData[] + chains → FK 텍스트 매칭 → FMEAWorksheetDB
변경: PositionAtomicData 직접 반환 (이미 UUID/FK 포함)

수정 방향:
  - buildAtomicFromFlat 함수를 buildAtomicFromPosition으로 대체
  - 입력이 이미 UUID/FK가 확정된 상태이므로 텍스트 매칭 로직 전체 제거
  - 8단계 Chain FK 매칭 → 불필요 (위치기반으로 이미 확정)
  - 함수 내용이 거의 pass-through가 됨 (검증만 수행)
```

### 3.3 핵심 수정: save-from-import API

#### 파일: `src/app/api/fmea/save-from-import/route.ts` (442행)

```
현재 입력: { fmeaId, flatData, chains, l1Name }
변경 입력: { fmeaId, atomicData: PositionAtomicData }

수정 내용:
  1. flatData/chains 파라미터 → atomicData 파라미터로 변경
  2. supplementMissingItems 호출 제거
  3. buildAtomicFromFlat 호출 → atomicData를 직접 사용
  4. runParseValidationPipeline → 위치기반 검증으로 변경
  5. PfmeaMasterDataset/FlatItem 동기화 제거
  6. prisma.$transaction 내 INSERT 로직은 유지 (테이블 구조 동일)

유지 사항:
  - 프로젝트 스키마 생성 (ensureProjectSchemaReady)
  - DELETE ALL → CREATE ALL 트랜잭션 패턴
  - FK 순서대로 INSERT (L1→L2→L3→Functions→FM/FE/FC→FL→RA)
```

### 3.4 수정: 워크시트 로드 API

#### 파일: `src/app/api/fmea/route.ts`

```
현재: GET → Atomic DB 로드 → FMEAWorksheetDB 반환
     클라이언트: atomicToLegacy(atomicDB) → WorksheetState → Handsontable

수정 내용:
  - Atomic DB 로드 로직은 그대로 유지 (UUID가 위치기반으로 바뀌어도 DB 스키마는 동일)
  - atomicToLegacy 변환도 유지 (필드명/구조 동일, ID 형식만 다름)
  - 변경 없거나 최소 변경
```

### 3.5 수정: 워크시트 저장

#### 파일: `src/app/api/fmea/route.ts` (POST)

```
현재: WorksheetState → migrateWorksheetStateToAtomicDB → DELETE ALL → CREATE ALL
     문제: 저장할 때마다 전체 재생성

수정 방향:
  - 단기: 현재 방식 유지 (위치기반 UUID라도 동일 패턴 적용 가능)
  - 중기: Atomic Cell Save (PATCH /api/fmea/atom-map) 전환
    → 셀 단위 UPDATE, 전체 재생성 불필요
    → meta.atomicId = 위치기반 UUID
```

### 3.6 수정: excel-template.ts (엑셀 내보내기)

#### 파일: `src/app/(fmea-core)/pfmea/import/excel-template.ts`

```
수정 내용:
  1. FC 시트에 S(심각도) 열 추가 (12열 → 13열) ★ 03번 진단서 지적사항
  2. FC 시트 열 순서: FE구분, FE, 공정번호, FM, 4M, WE, FC, B5, A6, S, O, D, AP
  3. 위치기반 UUID를 히든 열(Col14~16)로 기록 → 재Import 시 기존 UUID 유지
  4. VERIFY 시트 수식을 통합시트 참조로 수정 (레거시 시트명 → 통합시트명)
```

### 3.7 수정: generate-import-excel.ts (역Import 엑셀)

#### 파일: `src/app/(fmea-core)/pfmea/import/utils/generate-import-excel.ts`

```
수정 내용:
  1. FA 시트에 C2/C3/A2 채우기 ★ 03번 진단서 지적사항
  2. ChainRow 타입에 c2Value, c3Value, a2Value 필드 추가
  3. L2 시트 DC 중복제거 로직 수정 (FM당 여러 DC 허용)
  4. 위치기반 UUID를 히든 열로 기록
```

### 3.8 수정: Import UI (클라이언트)

#### 파일: `src/app/(fmea-core)/pfmea/import/hooks/useImportFileHandlers.ts`

```
현재: parseStepBWorkbook → convertToImportFormat → flatData + chains → save-from-import API
변경: parsePositionBased → PositionAtomicData → save-from-import API

수정 내용:
  1. convertToImportFormat 호출 제거
  2. 위치기반 파서 호출로 교체
  3. API 호출 시 atomicData 전달 (flatData/chains 대신)
```

#### 파일: `src/app/(fmea-core)/pfmea/import/components/StepBPreprocessSection.tsx`

```
수정 내용:
  1. parseStepBWorkbook → parsePositionBased로 교체
  2. 파싱 결과 표시 UI에서 flatData 카운트 → 테이블별 레코드 카운트
```

---

## 4. 유지 대상 파일 (변경 불필요)

| 파일 | 이유 |
|------|------|
| `src/lib/prisma/schema-manager.ts` | 프로젝트 스키마 관리, 변경 없음 |
| `src/lib/fmea/atomicToLegacy.ts` | DB → 워크시트 변환, ID 형식 무관 |
| `src/app/api/fmea/pipeline-verify/route.ts` | 검증 로직, UUID 형식 무관 |
| `src/app/api/fmea/validate-fk/route.ts` | FK 정합성 검증, 형식 무관 |
| `src/app/(fmea-core)/pfmea/worksheet/` | Handsontable UI, 변경 없음 |
| `src/app/(fmea-core)/pfmea/all-tab/` | ALL 탭 렌더링, 변경 없음 |
| `src/app/api/fmea/revision-clone/route.ts` | 리비전 복제, 스키마 복사 |
| `src/app/api/fmea/version-backup/route.ts` | 백업, 변경 없음 |
| `src/app/api/fmea/projects/route.ts` | 프로젝트 목록, 변경 없음 |
| Prisma schema 파일 | 테이블 구조 동일 (ID가 TEXT이므로 위치기반도 수용) |

---

## 5. 신규 작성 파일

| 파일 | 역할 | 예상 코드량 |
|------|------|-----------|
| `src/lib/fmea/position-uuid.ts` | 위치기반 UUID 생성 유틸 | ~50행 |
| `src/lib/fmea/position-parser.ts` | 시트별 위치기반 파서 (L1/L2/L3/FC) | ~300행 |
| `src/lib/fmea/cross-sheet-resolver.ts` | FC→L1/L2/L3 크로스시트 FK 해결 | ~150행 |
| `src/app/api/fmea/save-position-import/route.ts` | 위치기반 Import API (또는 기존 save-from-import 수정) | ~200행 |

**총 신규 코드: ~700행** (기존 제거 코드: ~3,000행 이상)

---

## 6. DB 스키마 변경사항

### 6.1 프로젝트 스키마 (pfmea_{fmeaId}) — 변경 없음

```
모든 테이블의 id 컬럼이 TEXT 타입이므로
기존: "PF-L2-040-MC-001-K-001"
신규: "L3-R37-C7"
둘 다 TEXT에 저장 가능 → DDL 변경 불필요
```

### 6.2 public 스키마 — 제거 대상

```sql
-- 제거 대상 테이블
DROP TABLE IF EXISTS pfmea_master_flat_items;
DROP TABLE IF EXISTS pfmea_master_datasets;
-- fmea_legacy_data는 당분간 유지 (폴백용), 이후 제거
```

### 6.3 Prisma schema — 수정

```
// 제거 대상 모델
model PfmeaMasterDataset { ... }     // 삭제
model PfmeaMasterFlatItem { ... }    // 삭제

// 유지 모델 (변경 없음)
model FmeaProject { ... }
model L1Structure { ... }
model L2Structure { ... }
// ... (전체 Atomic 모델 유지)
```

---

## 7. 마이그레이션 순서

### Phase 0: 준비 (코드 변경 전)

```
□ 현재 pfm26-m066 DB 백업 (pg_dump)
□ 현재 코드 git tag (pre-position-uuid)
□ aubump.xlsx로 위치기반 UUID 생성 시뮬레이션 (결과 검증)
```

### Phase 1: 신규 파일 작성 + 병행 운영

```
□ position-uuid.ts 작성 + 단위 테스트
□ position-parser.ts 작성 (L1/L2/L3/FC 시트 파싱)
□ cross-sheet-resolver.ts 작성
□ save-position-import API 작성 (기존 save-from-import와 별도)
□ aubump.xlsx로 Import → pipeline-verify allGreen 확인
□ 워크시트 렌더링 정상 확인 (atomicToLegacy는 ID 형식 무관)
```

### Phase 2: 기존 파이프라인과 병행 테스트

```
□ 새 fmeaId로 위치기반 Import 테스트 (pfm26-m069 등)
□ 기존 m066은 그대로 유지 (레거시)
□ 두 방식의 워크시트 렌더링 결과 비교
□ Atomic Cell Save (PATCH) 테스트
```

### Phase 3: 레거시 제거

```
□ import-builder.ts 삭제 (convertToImportFormat)
□ uuid-generator.ts 삭제 (genXxx 함수들)
□ uuid-rules.ts 삭제
□ supplementMissingItems.ts 삭제
□ atomicToFlatData.ts 삭제
□ atomicToChains.ts 삭제
□ export-master, load-master, reset-master API 삭제
□ data/master-fmea/ 디렉토리 삭제
□ PfmeaMasterDataset/FlatItem Prisma 모델 삭제
□ save-from-import 기존 코드를 save-position-import로 교체
```

### Phase 4: 엑셀 내보내기 수정

```
□ excel-template.ts FC 시트 S열 추가 (12열 → 13열)
□ excel-template.ts 위치기반 UUID 히든 열 추가
□ generate-import-excel.ts FA 시트 C2/C3/A2 채우기
□ VERIFY 시트 수식 통합시트 참조로 수정
□ 재Import 왕복(Round-trip) 테스트
```

---

## 8. 1:N 정상 구조 처리 규칙 (Cursor/Claude Code 필수 인지)

위치기반 파서 구현 시 반드시 적용해야 하는 규칙:

### 8.1 L1 시트

```
규칙: 같은 C2 텍스트의 첫 행만 L1Function 생성, C4는 행마다 독립 FailureEffect
처리:
  - seenC2 Map으로 중복 C2 추적
  - 같은 C2 → 같은 L1Function UUID 재사용
  - C4는 행마다 "L1-R{n}-C4" 독립 UUID
  - FailureEffect.l1FuncId = 해당 C2의 L1Function UUID
```

### 8.2 L2 시트

```
규칙: 같은 공정번호의 첫 행만 L2Structure 생성, A4/A5/A6은 행마다 독립
처리:
  - processNoToL2Id Map으로 중복 공정번호 추적
  - 같은 공정번호 → 같은 L2Structure UUID 재사용
  - A4(ProductChar), A5(FailureMode), A6(DetectionControl)은 행마다 독립 UUID
  - 모든 행의 l2Id = 해당 공정번호의 L2Structure UUID
  
주의: A6은 행마다 서로 다를 수 있음 (aubump.xlsx 21개 공정 전부 다중 A6)
     → DetectionControl을 공정 단위 1개로 생성하면 안 됨
     → 행마다 독립 "L2-R{n}-C7" 생성
```

### 8.3 L3 시트 (★ Ti Target 패턴)

```
규칙: 행마다 독립 L3Structure + L3Function + FailureCause
     같은 B1이라도 B2가 다르면 독립 엔티티 (Ti Target 패턴)
처리:
  - 모든 행을 독립 처리 (중복 판단 안 함)
  - L3Structure: "L3-R{n}", l2Id = 공정번호 lookup
  - L3Function: "L3-R{n}-C4"
  - FailureCause: "L3-R{n}-C7"
  
핵심: L3에서는 dedup 하지 않는다. 행 = 엔티티.
```

### 8.4 FC 시트

```
규칙: 행마다 독립 FailureLink + RiskAnalysis
     feId/fmId/fcId는 크로스시트 참조로 확정
처리:
  - FailureLink: "FC-R{n}"
  - RiskAnalysis: "FC-R{n}-RA"
  - feId: CrossSheetResolver로 L1 시트의 FE UUID 찾기
  - fmId: CrossSheetResolver로 L2 시트의 FM UUID 찾기  
  - fcId: CrossSheetResolver로 L3 시트의 FC UUID 찾기
```

---

## 9. 위험 요소 및 대응

### 9.1 크로스시트 FK 해결 정확도

```
위험: FC시트에 원본행 컬럼(Col13~15)이 없으면 역참조 인덱스에 의존
     → 텍스트 매칭의 한계가 일부 남음

대응:
  1순위: Import 엑셀에 원본행 컬럼 추가 (엑셀 생성 시 자동 기록)
  2순위: 역참조 인덱스 (공정번호+4M+WE+텍스트앞30자)
  3순위: 매칭 실패 시 UNRESOLVED 표시 → 사용자에게 수동 연결 UI 제공

aubump.xlsx 분석 결과: 현재 텍스트 매칭 성공률 100% (118/118)
  → 당장은 역참조 인덱스로 충분
  → 엑셀 내보내기(excel-template.ts) 수정 시 원본행 컬럼 추가
```

### 9.2 기존 m066 데이터 호환성

```
위험: 기존 pfm26-m066은 결정론적 UUID (PF-L2-040-MC-001-K-001)
     위치기반 UUID (L3-R37-C7)와 형식이 다름

대응:
  - 기존 m066은 그대로 유지 (레거시 스키마)
  - 새 프로젝트부터 위치기반 UUID 적용
  - 필요시 마이그레이션 스크립트 작성 (기존 UUID → 위치기반 변환)
  - atomicToLegacy는 ID 형식에 무관하게 동작 (필드값만 참조)
```

### 9.3 AP 판정 로직

```
위험: aubump.xlsx에서 51건/118건 AP 불일치 (43%)
     단순 if/else 로직으로는 정확한 AP 산출 불가

대응:
  - AIAG-VDA FMEA 1판 AP 매트릭스 테이블을 정확히 구현
  - 엑셀의 AP 값을 우선 사용 (Import 시)
  - AP 자동재계산은 별도 기능으로 분리 (사용자 선택)
```

---

## 10. 수정 파일 체크리스트 (구현 순서)

```
Phase 1: 신규 (병행 운영)
  □ src/lib/fmea/position-uuid.ts                    신규 ~50행
  □ src/lib/fmea/position-parser.ts                   신규 ~300행  
  □ src/lib/fmea/cross-sheet-resolver.ts              신규 ~150행
  □ src/app/api/fmea/save-position-import/route.ts    신규 ~200행
  □ src/types/position-import.ts                      신규 ~80행

Phase 2: 수정 (기존 파일 변경)
  □ src/app/(fmea-core)/pfmea/import/hooks/useImportFileHandlers.ts    수정
  □ src/app/(fmea-core)/pfmea/import/components/StepBPreprocessSection.tsx  수정
  □ src/app/(fmea-core)/pfmea/import/excel-template.ts                 수정 (S열 추가)
  □ src/app/(fmea-core)/pfmea/import/utils/generate-import-excel.ts    수정 (FA C2/C3/A2)
  □ src/app/api/fmea/save-from-import/route.ts                         수정 (atomicData 입력)
  □ prisma/schema.prisma                                                수정 (모델 제거)

Phase 3: 삭제 (레거시 제거)
  □ src/app/(fmea-core)/pfmea/import/stepb-parser/import-builder.ts    삭제
  □ src/app/(fmea-core)/pfmea/import/stepb-parser/prefix-utils.ts      삭제
  □ src/app/(fmea-core)/pfmea/import/utils/supplementMissingItems.ts   삭제
  □ src/app/(fmea-core)/pfmea/import/utils/atomicToFlatData.ts         삭제
  □ src/app/(fmea-core)/pfmea/import/utils/atomicToChains.ts           삭제
  □ src/lib/uuid-generator.ts                                          삭제
  □ src/lib/uuid-rules.ts                                              삭제
  □ src/lib/sample-data-loader.ts                                      삭제
  □ src/app/api/fmea/export-master/route.ts                            삭제
  □ src/app/api/fmea/load-master/route.ts                              삭제
  □ src/app/api/fmea/import-excel-file/route.ts                        삭제
  □ src/app/api/fmea/reset-master/route.ts                             삭제
  □ src/app/api/fmea/seed-from-master/                                 삭제
  □ data/master-fmea/                                                   삭제
```

---

## 11. 예상 효과

| 항목 | AS-IS | TO-BE |
|------|-------|-------|
| Import 파이프라인 코드량 | ~3,500행 (파서+빌더+보충+변환) | ~700행 (위치파서+FK해결) |
| FK 매칭 방식 | 텍스트 매칭 8단계 | 위치 직접 참조 O(1) |
| FK 고아 발생 | 빈번 (텍스트 불일치) | 0건 (위치가 곧 ID) |
| 마스터 JSON 의존 | 5개 API + data 디렉토리 | 없음 |
| flatData 중간 변환 | 필수 (800+ 항목) | 없음 |
| 디버깅 | FK 누락 원인 추적 어려움 | 엑셀 열어서 해당 행 확인 |
| 1:N 구조 처리 | 텍스트 dedup으로 오판 빈번 | 행 = 엔티티, 오판 불가 |
| S(심각도) 누락 | FC 12열 포맷에서 발생 | 13열 표준화로 해결 |