# FMEA RawDataset 시스템 구축: Forge PLAN → EXECUTE → VERIFY

> **대상**: PRD-FMEA-RAW-004 (v4, 모든 셀 UUID 완전판)  
> **도구**: Claude Code Forge (PLAN → EXECUTE → VERIFY)  
> **검증**: Playwright 브라우저 E2E 테스트 포함

---

## PHASE 1: EXPLORE (탐색 + 진단)

### 1.1 PRD v4 요구사항 점검

Forge에게 아래를 먼저 탐색하게 한다.

```
EXPLORE 지시:

1. PRD v4의 24개 엔티티 목록을 읽고, 현재 코드베이스에서 
   각 엔티티가 존재하는지/누락인지 매핑하라.

2. 현재 Prisma 스키마(prisma/schema.prisma)와 
   프로젝트 스키마 DDL(schema-manager.ts)에서
   v4의 24개 엔티티에 대응하는 테이블/모델을 찾아라.

3. 아래 진단 항목을 전부 체크하고 결과를 표로 출력하라.
```

### 1.2 진단 체크리스트 (총 8개 카테고리, 92개 항목)

#### A. UUID 완전성 진단 (24항목)

```
각 엔티티에 대해:
□ A-01. L1Structure — UUID 생성 코드 존재하는가?
□ A-02. L1Scope — UUID 생성 코드 존재하는가? (★v4 신규)
□ A-03. L1Function — UUID 생성 코드 존재하는가?
□ A-04. L1Requirement — UUID 생성 코드 존재하는가?
□ A-05. FailureEffect — UUID 생성 코드 존재하는가?
□ A-06. L2Structure — UUID 생성 코드 존재하는가?
□ A-07. L2ProcessNo — UUID 생성 코드 존재하는가? (★v4 신규)
□ A-08. L2ProcessName — UUID 생성 코드 존재하는가? (★v4 신규)
□ A-09. L2Function — UUID 생성 코드 존재하는가?
□ A-10. ProductChar — UUID 생성 코드 존재하는가?
□ A-11. L2SpecialChar — UUID 생성 코드 존재하는가? (★v4 신규)
□ A-12. FailureMode — UUID 생성 코드 존재하는가?
□ A-13. DetectionControl — UUID 생성 코드 존재하는가?
□ A-14. L3Structure — UUID 생성 코드 존재하는가?
□ A-15. L3ProcessNo — UUID 생성 코드 존재하는가? (★v4 신규)
□ A-16. L3FourM — UUID 생성 코드 존재하는가? (★v4 신규)
□ A-17. L3WorkElement — UUID 생성 코드 존재하는가? (★v4 신규)
□ A-18. L3Function — UUID 생성 코드 존재하는가?
□ A-19. L3ProcessChar — UUID 생성 코드 존재하는가? (★v4 핵심 신규)
□ A-20. L3SpecialChar — UUID 생성 코드 존재하는가? (★v4 신규)
□ A-21. FailureCause — UUID 생성 코드 존재하는가?
□ A-22. PreventionControl — UUID 생성 코드 존재하는가?
□ A-23. FailureLink — UUID 생성 코드 존재하는가?
□ A-24. RiskAnalysis — UUID 생성 코드 존재하는가?

판정 기준:
  ✅ = 위치기반 UUID(시트-R행-C열) 생성 코드 있음
  ⚠️ = UUID 있으나 결정론적(PF-L2-040-...) 방식
  ❌ = UUID 생성 자체가 없음 (텍스트 필드로만 존재)
```

#### B. FK 완전성 진단 (모든 FK 필드)

```
각 엔티티의 FK 필드가 코드에 존재하는지:

□ B-01. FE.l1StructId — 코드에 있는가?
□ B-02. FE.l1FuncId — 코드에 있는가?
□ B-03. FE.reqId — 코드에 있는가?
□ B-04. FE.scopeId — 코드에 있는가? (★v4 신규)
□ B-05. FM.l2StructId — 코드에 있는가?
□ B-06. FM.l2FuncId — 코드에 있는가?
□ B-07. FM.productCharId — 코드에 있는가?
□ B-08. FM.specialCharId — 코드에 있는가? (★v4 신규)
□ B-09. FM.feRefs[] — 코드에 있는가?
□ B-10. FM.fcRefs[] — 코드에 있는가?
□ B-11. FC.l3StructId — 코드에 있는가?
□ B-12. FC.l3FuncId — 코드에 있는가?
□ B-13. FC.l3CharId — 코드에 있는가? (★v4 핵심)
□ B-14. FC.l2StructId — 코드에 있는가?
□ B-15. FC.workElementId — 코드에 있는가? (★v4 신규)
□ B-16. FC.fourMId — 코드에 있는가? (★v4 신규)
□ B-17. FL.fmId — 코드에 있는가?
□ B-18. FL.fcId — 코드에 있는가?
□ B-19. FL.feId — 코드에 있는가?
□ B-20. FL.l2StructId — 코드에 있는가?
□ B-21. FL.l3StructId — 코드에 있는가?
□ B-22. RA.linkId — 코드에 있는가?
□ B-23. RA.fmId — 코드에 있는가? (직접참조)
□ B-24. RA.fcId — 코드에 있는가? (직접참조)
□ B-25. RA.feId — 코드에 있는가? (직접참조)
□ B-26. B5.fcId — 코드에 있는가?
□ B-27. B5.l3StructId — 코드에 있는가?
□ B-28. B5.l3CharId — 코드에 있는가?

판정 기준:
  ✅ = FK 필드가 DB/코드에 있고 실제 UUID를 참조
  ⚠️ = FK 필드는 있으나 텍스트 매칭으로 설정
  ❌ = FK 필드 자체가 없음
```

#### C. PostgreSQL 테이블/필드 진단

```
프로젝트 스키마(pfmea_{fmeaId})에서:

□ C-01. 24개 엔티티에 대응하는 테이블이 모두 존재하는가?
□ C-02. 각 테이블의 id 컬럼이 TEXT 타입인가?
□ C-03. 각 테이블의 parentId 컬럼이 존재하는가?
□ C-04. 각 테이블의 FK 컬럼이 모두 존재하는가?
□ C-05. FK 컬럼에 인덱스가 걸려있는가?
□ C-06. L3ProcessChar 테이블이 존재하는가? (★v4 핵심)
□ C-07. L1Scope 테이블이 존재하는가?
□ C-08. L2ProcessNo / L2ProcessName 테이블이 존재하는가?
□ C-09. L3FourM / L3WorkElement 테이블이 존재하는가?
□ C-10. L2SpecialChar / L3SpecialChar 테이블이 존재하는가?
□ C-11. FM 테이블에 feRefs TEXT[] / fcRefs TEXT[] 컬럼이 있는가?
□ C-12. RA 테이블에 fmId/fcId/feId 직접참조 컬럼이 있는가?

Prisma 스키마에서:
□ C-13. 24개 모델이 prisma/schema.prisma에 정의되어 있는가?
□ C-14. v4 신규 10개 모델이 추가되어 있는가?
□ C-15. 마이그레이션 파일이 생성되어 있는가?
```

#### D. 파싱 완전성 진단

```
excel-parser 관련:

□ D-01. L1 시트 파싱 시 C1(구분)에 UUID가 생성되는가?
□ D-02. L1 시트 파싱 시 C2 중복 대표행 결정 로직이 있는가?
□ D-03. L1 시트 파싱 시 C3 행마다 독립 UUID가 생성되는가?
□ D-04. L1 시트 파싱 시 C4 행마다 독립 UUID가 생성되는가?
□ D-05. L2 시트 파싱 시 A1(공정번호)에 UUID가 생성되는가?
□ D-06. L2 시트 파싱 시 A2(공정명)에 UUID가 생성되는가?
□ D-07. L2 시트 파싱 시 특별특성(E열)에 UUID가 생성되는가?
□ D-08. L3 시트 파싱 시 4M(B열)에 UUID가 생성되는가?
□ D-09. L3 시트 파싱 시 B1(작업요소)에 UUID가 생성되는가?
□ D-10. L3 시트 파싱 시 B3(공정특성)에 독립 UUID가 생성되는가? (★핵심)
□ D-11. L3 시트 파싱 시 특별특성(F열)에 UUID가 생성되는가?
□ D-12. FC 시트 파싱 시 13열 포맷(S 포함)을 지원하는가?
□ D-13. 병합셀 carry-forward가 정상 동작하는가?
□ D-14. 빈행 종료 조건이 적절한가?
□ D-15. 1:N 정상 구조(Ti Target 패턴 등)를 중복으로 오판하지 않는가?
```

#### E. parentId 체인 진단

```
□ E-01. L1Scope.parentId → L1Structure 유효?
□ E-02. L1Function.parentId → L1Structure 유효?
□ E-03. L1Requirement.parentId → L1Function 유효?
□ E-04. FE.parentId → L1Function 유효?
□ E-05. L2Structure.parentId → L1Structure 유효?
□ E-06. L2ProcessNo.parentId → L2Structure 유효?
□ E-07. L2ProcessName.parentId → L2Structure 유효?
□ E-08. L2Function.parentId → L2Structure 유효?
□ E-09. ProductChar.parentId → L2Structure 유효?
□ E-10. L2SpecialChar.parentId → ProductChar 유효?
□ E-11. FM.parentId → ProductChar 유효?
□ E-12. DC.parentId → L2Structure 유효?
□ E-13. L3Structure.parentId → L2Structure 유효?
□ E-14. L3ProcessNo.parentId → L3Structure 유효?
□ E-15. L3FourM.parentId → L3Structure 유효?
□ E-16. L3WorkElement.parentId → L3Structure 유효?
□ E-17. L3Function.parentId → L3Structure 유효?
□ E-18. L3ProcessChar.parentId → L3Function 유효?
□ E-19. L3SpecialChar.parentId → L3ProcessChar 유효?
□ E-20. FC.parentId → L3Function 유효?
□ E-21. B5.parentId → FailureCause 유효?
□ E-22. RA.parentId → FailureLink 유효?
□ E-23. 순환 참조가 없는가?
□ E-24. parentId가 존재하지 않는 UUID를 가리키는 케이스가 0건인가?
```

#### F. GPT 진단서 지적사항 점검

```
01_UUID_FK_시스템_진단서.md 기반:
□ F-01. B5 UUID가 uuidv4()가 아닌 위치기반인가? (진단서 이슈#1)
□ F-02. supplementMissingItems 자동생성이 제거되었는가? (진단서 이슈#2)
□ F-03. FE scope 별칭 매칭 불완전 문제가 해결되었는가? (진단서 이슈#3)
□ F-04. FC시트 없이 Import 시 chains=0 가드가 있는가? (진단서 이슈#4)
□ F-05. sampleData 의존이 제거되었는가? (진단서 이슈#5)

03_JSON_엑셀_데이터누락_진단.md 기반:
□ F-06. FC 시트에 S(심각도) 열이 포함되어 있는가? (12열→13열)
□ F-07. FA 시트에 C2/C3/A2가 채워지는가?
□ F-08. VERIFY 시트 수식이 통합시트 참조인가? (레거시→통합)
□ F-09. L2 DC 중복제거 덮어쓰기가 수정되었는가?

FMEA_Import_Error_Analysis.md 기반:
□ F-10. AP 판정이 AIAG-VDA 매트릭스 기반인가? (51건 불일치)
□ F-11. FC→L1 FE 텍스트 매칭이 위치기반/FK로 대체되었는가?
□ F-12. FC→L2 FM 매칭이 위치기반/FK로 대체되었는가?
□ F-13. FC→L3 FC 매칭이 위치기반/FK로 대체되었는가?
□ F-14. B5/A6 불일치(21건/26건)가 chain 단위 독립 저장으로 해결되었는가?
```

#### G. 레거시 제거 진단

```
□ G-01. data/master-fmea/*.json 삭제되었는가?
□ G-02. export-master API 삭제되었는가?
□ G-03. load-master API 삭제되었는가?
□ G-04. import-excel-file API (마스터 JSON 경유) 삭제되었는가?
□ G-05. atomicToFlatData.ts 삭제되었는가?
□ G-06. atomicToChains.ts 삭제되었는가?
□ G-07. supplementMissingItems.ts 삭제되었는가?
□ G-08. import-builder.ts (convertToImportFormat) 삭제되었는가?
□ G-09. uuid-generator.ts (genXxx) 삭제되었는가?
□ G-10. uuid-rules.ts 삭제되었는가?
□ G-11. PfmeaMasterDataset Prisma 모델 삭제되었는가?
□ G-12. PfmeaMasterFlatItem Prisma 모델 삭제되었는가?
```

#### H. Import 데이터 완전성 진단

```
aubump.xlsx 기준:
□ H-01. L1 시트 20행 → 24개 엔티티 모두 생성되는가?
□ H-02. L2 시트 48행 → 24개 엔티티 모두 생성되는가?
□ H-03. L3 시트 118행 → 24개 엔티티 모두 생성되는가?
□ H-04. FC 시트 118행 → FL+RA 생성되는가?
□ H-05. 총 레코드 수가 ~1,710건인가?
□ H-06. FK 고아 레코드가 0건인가?
□ H-07. parentId 깨진 참조가 0건인가?
□ H-08. L3ProcessChar가 118건 생성되었는가? (★B3 누락 해결 확인)
□ H-09. FM.feRefs/fcRefs가 올바르게 채워져 있는가?
□ H-10. 크로스시트 매칭 성공률이 100%인가?
```

### 1.3 EXPLORE 출력 형식

```
Forge에게 요구하는 출력:

EXPLORE_RESULT:
  A. UUID 완전성: ✅ {n}/24, ⚠️ {n}/24, ❌ {n}/24
  B. FK 완전성: ✅ {n}/28, ⚠️ {n}/28, ❌ {n}/28
  C. PostgreSQL: ✅ {n}/15, ❌ {n}/15
  D. 파싱: ✅ {n}/15, ❌ {n}/15
  E. parentId: ✅ {n}/24, ❌ {n}/24
  F. GPT 지적: ✅ {n}/14, ❌ {n}/14
  G. 레거시 제거: ✅ {n}/12, ❌ {n}/12
  H. Import 완전성: ✅ {n}/10, ❌ {n}/10

  총 점수: {합계}/142
  
  작업 필요 목록:
    1. [카테고리-번호] 설명
    2. [카테고리-번호] 설명
    ...
```

---

## PHASE 2: EXECUTE (구현)

### 2.1 구현 순서

```
EXECUTE 지시 (순서 엄수):

Step 1: Prisma 스키마 + DDL (v4 신규 10개 모델 추가)
Step 2: position-uuid.ts (24개 엔티티 UUID 생성)
Step 3: fmea-raw-dataset.ts (타입 정의)
Step 4: raw-dataset-builder.ts (파서 → RawDataset, parentId+FK 전부)
Step 5: cross-sheet-matcher.ts (FC↔L1/L2/L3 + feRefs/fcRefs)
Step 6: fk-chain-validator.ts (parentId+FK 전체 검증)
Step 7: raw-quality-checker.ts (상태 판정)
Step 8: raw-to-atomic.ts (RawDataset → Atomic DB)
Step 9: API 라우트 (import-to-raw, raw-dataset, raw-to-atomic)
Step 10: 레거시 제거 (G카테고리 항목)
```

### 2.2 코드 완전성 체크리스트 (각 Step 완료 후)

#### Step 1 완료 후: Prisma + DDL

```
□ EX-01. prisma/schema.prisma에 24개 모델이 정의되어 있는가?
□ EX-02. v4 신규 10개 모델:
         L1Scope, L2ProcessNo, L2ProcessName, L2SpecialChar,
         L3ProcessNo, L3FourM, L3WorkElement, L3ProcessChar,
         L3SpecialChar — 모두 있는가?
□ EX-03. 각 모델의 id 필드가 String @id인가?
□ EX-04. 각 모델의 parentId 필드가 String인가?
□ EX-05. FM 모델에 feRefs String[] / fcRefs String[]이 있는가?
□ EX-06. RA 모델에 fmId/fcId/feId 직접참조가 있는가?
□ EX-07. FC 모델에 l3CharId가 있는가? (★B3 FK 핵심)
□ EX-08. npx prisma generate 성공하는가?
□ EX-09. npx prisma migrate dev 성공하는가?
□ EX-10. schema-manager.ts에 24개 테이블 DDL이 있는가?
□ EX-11. 각 테이블에 FK 컬럼 인덱스가 설정되어 있는가?
```

#### Step 2 완료 후: position-uuid.ts

```
□ EX-12. positionUUID('L1', 2, 1) → "L1-R2-C1" 반환?
□ EX-13. positionUUID('L2', 13) → "L2-R13" 반환?
□ EX-14. positionUUID('L3', 29, 5) → "L3-R29-C5" 반환?
□ EX-15. positionUUID('FC', 1) → "FC-R1" 반환?
□ EX-16. 모든 시트코드(L1/L2/L3/FC) 지원?
□ EX-17. 행번호/열번호가 엑셀 실제 행번호와 일치?
```

#### Step 3 완료 후: 타입 정의

```
□ EX-18. FmeaRawDataset 인터페이스에 24개 엔티티 배열 포함?
□ EX-19. 각 엔티티 인터페이스에 id, parentId, 모든 FK 필드 정의?
□ EX-20. RawStatus 타입 정의 (raw-complete/partial/ambiguous/invalid)?
□ EX-21. DatasetQualityReport 인터페이스 정의?
□ EX-22. npx tsc --noEmit 타입 체크 통과?
```

#### Step 4 완료 후: raw-dataset-builder.ts

```
□ EX-23. L1 파싱: C1→L1Scope UUID, C2→L1Func UUID, C3→L1Req UUID, C4→FE UUID?
□ EX-24. L2 파싱: A1→L2ProcessNo, A2→L2ProcessName, SC→L2SpecialChar UUID?
□ EX-25. L3 파싱: 4M→L3FourM, B1→L3WorkElement, B3→L3ProcessChar, SC→L3SpecialChar UUID?
□ EX-26. 모든 엔티티의 parentId가 파싱 시점에 즉시 설정되는가?
□ EX-27. 같은 시트 내 FK가 파싱 시점에 즉시 설정되는가?
□ EX-28. L2 공정번호 중복 시 대표행 결정 로직?
□ EX-29. L1 C2 중복 시 대표행 결정 로직?
□ EX-30. L3 행마다 독립 처리 (dedup 안 함)?
□ EX-31. Ti Target 패턴 (같은 B1에 다중 B2) 올바르게 처리?
□ EX-32. FC.l3CharId가 L3ProcessChar UUID를 FK로 참조하는가? (★핵심)
```

#### Step 5 완료 후: cross-sheet-matcher.ts

```
□ EX-33. FC.FE텍스트 → L1.C4 매칭 → FL.feId 확정?
□ EX-34. FC.FM텍스트 → L2.A5 매칭 → FL.fmId 확정?
□ EX-35. FC.FC텍스트 → L3.B4 매칭 → FL.fcId 확정?
□ EX-36. 매칭 후 FM별 feRefs[] 배열 생성?
□ EX-37. 매칭 후 FM별 fcRefs[] 배열 생성?
□ EX-38. FL.l2StructId, FL.l3StructId 설정?
□ EX-39. RA.fmId/fcId/feId 직접참조 설정?
□ EX-40. 매칭 실패 시 UNRESOLVED 표시 (에러 아님)?
```

#### Step 6 완료 후: fk-chain-validator.ts

```
□ EX-41. 모든 parentId가 실제 UUID를 가리키는지 검증?
□ EX-42. 모든 FK가 실제 UUID를 가리키는지 검증?
□ EX-43. 순환 참조 검출?
□ EX-44. 깨진 참조 → missingFields에 기록?
□ EX-45. 검증 결과를 DatasetQualityReport에 반영?
```

#### Step 7 완료 후: raw-quality-checker.ts

```
□ EX-46. raw-complete 판정 기준 충족 체크?
□ EX-47. raw-partial 판정?
□ EX-48. raw-ambiguous 판정?
□ EX-49. raw-invalid 판정?
□ EX-50. completenessRate 계산?
□ EX-51. parentIdCoverage 계산?
□ EX-52. userActions 목록 생성?
```

#### Step 8 완료 후: raw-to-atomic.ts

```
□ EX-53. raw-complete만 필터?
□ EX-54. prisma.$transaction DELETE ALL → CREATE ALL?
□ EX-55. FK 순서대로 INSERT (L1→L2→L3→Functions→Chars→FM/FE/FC→FL→RA)?
□ EX-56. 24개 테이블 모두 INSERT?
□ EX-57. 트랜잭션 실패 시 전체 롤백?
```

#### Step 9 완료 후: API

```
□ EX-58. POST /api/fmea/import-to-raw 동작?
□ EX-59. GET /api/fmea/raw-dataset 동작?
□ EX-60. GET /api/fmea/raw-quality 동작?
□ EX-61. POST /api/fmea/raw-to-atomic 동작?
□ EX-62. PATCH /api/fmea/raw-dataset 동작?
□ EX-63. GET /api/fmea/reverse-expand 동작?
```

#### Step 10 완료 후: 레거시 제거

```
□ EX-64. G-01 ~ G-12 전부 삭제 확인?
□ EX-65. npx tsc --noEmit 타입 체크 통과? (삭제 후)
□ EX-66. 삭제된 파일을 import하는 코드가 없는지 확인?
□ EX-67. npm run build 성공?
```

### 2.3 EXECUTE 출력 형식

```
각 Step 완료 시:

EXECUTE_STEP_{n}_RESULT:
  체크리스트: ✅ {n}/{total}
  실패 항목: [EX-nn] 설명
  수정 내용: {파일명}: {변경 요약}
  다음 Step 진행 가능: YES / NO (실패 항목 해결 필요)
```

---

## PHASE 3: VERIFY (검증)

### 3.1 단위 테스트

```
VERIFY 지시:

아래 테스트를 순서대로 실행하고 전부 PASS해야 한다.
```

#### V1. UUID 생성 테스트

```typescript
// __tests__/position-uuid.test.ts

describe('positionUUID', () => {
  test('L1 셀 UUID', () => {
    expect(positionUUID('L1', 2, 1)).toBe('L1-R2-C1');
    expect(positionUUID('L1', 2, 4)).toBe('L1-R2-C4');
  });
  
  test('L2 행 UUID', () => {
    expect(positionUUID('L2', 13)).toBe('L2-R13');
  });
  
  test('L3 B3 공정특성 UUID', () => {
    expect(positionUUID('L3', 29, 5)).toBe('L3-R29-C5');
  });
  
  test('FC UUID', () => {
    expect(positionUUID('FC', 1)).toBe('FC-R1');
  });
});
```

#### V2. RawDataset 빌드 테스트 (aubump.xlsx)

```typescript
// __tests__/raw-dataset-builder.test.ts

describe('buildRawDataset', () => {
  const dataset = buildRawDataset('aubump.xlsx');
  
  test('L1 엔티티 수량', () => {
    expect(dataset.l1Scopes.length).toBe(20);
    expect(dataset.l1Functions.length).toBe(7);  // C2 유니크
    expect(dataset.l1Requirements.length).toBe(20);
    expect(dataset.failureEffects.length).toBe(20);
  });
  
  test('L2 엔티티 수량', () => {
    expect(dataset.l2Structures.length).toBe(21);
    expect(dataset.l2ProcessNos.length).toBe(48);
    expect(dataset.l2ProcessNames.length).toBe(48);
    expect(dataset.productChars.length).toBe(48);
    expect(dataset.l2SpecialChars.length).toBe(48);
    expect(dataset.failureModes.length).toBe(48);
    expect(dataset.detectionControls.length).toBe(48);
  });
  
  test('L3 엔티티 수량', () => {
    expect(dataset.l3Structures.length).toBe(118);
    expect(dataset.l3ProcessNos.length).toBe(118);
    expect(dataset.l3FourMs.length).toBe(118);
    expect(dataset.l3WorkElements.length).toBe(118);
    expect(dataset.l3Functions.length).toBe(118);
    expect(dataset.l3ProcessChars.length).toBe(118);  // ★B3 독립!
    expect(dataset.l3SpecialChars.length).toBe(118);
    expect(dataset.failureCauses.length).toBe(118);
    expect(dataset.preventionControls.length).toBe(118);
  });
  
  test('FC 엔티티 수량', () => {
    expect(dataset.failureLinks.length).toBe(118);
    expect(dataset.riskAnalyses.length).toBe(118);
  });
  
  test('총 레코드 ~1710', () => {
    const total = /* 전체 합계 */;
    expect(total).toBeGreaterThanOrEqual(1700);
    expect(total).toBeLessThanOrEqual(1720);
  });
  
  test('B3 공정특성이 모두 독립 UUID를 가짐', () => {
    dataset.l3ProcessChars.forEach(pc => {
      expect(pc.id).toMatch(/^L3-R\d+-C5$/);
      expect(pc.parentId).toMatch(/^L3-R\d+-C4$/);
      expect(pc.l3FuncId).toMatch(/^L3-R\d+-C4$/);
    });
  });
  
  test('FC.l3CharId가 L3ProcessChar UUID를 참조', () => {
    const charIds = new Set(dataset.l3ProcessChars.map(c => c.id));
    dataset.failureCauses.forEach(fc => {
      expect(charIds.has(fc.l3CharId)).toBe(true);
    });
  });
});
```

#### V3. parentId 체인 테스트

```typescript
// __tests__/parent-chain.test.ts

describe('parentId 체인 완전성', () => {
  const dataset = buildRawDataset('aubump.xlsx');
  const allIds = getAllIds(dataset);  // 모든 엔티티의 id 수집
  
  test('모든 parentId가 실제 UUID를 가리킴', () => {
    const allEntities = getAllEntities(dataset);
    const broken = allEntities.filter(e => 
      e.parentId && !allIds.has(e.parentId)
    );
    expect(broken.length).toBe(0);
  });
  
  test('모든 FK가 실제 UUID를 가리킴', () => {
    const brokenFKs = validateAllFKs(dataset, allIds);
    expect(brokenFKs.length).toBe(0);
  });
  
  test('순환 참조 없음', () => {
    expect(detectCircularRefs(dataset)).toBe(false);
  });
});
```

#### V4. 역전개 테스트

```typescript
// __tests__/reverse-expand.test.ts

describe('역전개', () => {
  test('FailureLink → 워크시트 전체 셀 복원', () => {
    const dataset = buildRawDataset('aubump.xlsx');
    const link = dataset.failureLinks[0];  // FC-R1
    
    const expanded = reverseExpand(link, dataset);
    
    // L1 역전개
    expect(expanded.fe.effectText).toBeTruthy();
    expect(expanded.fe.scope).toBeTruthy();
    expect(expanded.l1Func.functionText).toBeTruthy();
    expect(expanded.l1Req.requirement).toBeTruthy();
    
    // L2 역전개
    expect(expanded.fm.modeText).toBeTruthy();
    expect(expanded.pc.charText).toBeTruthy();
    expect(expanded.l2Func.functionText).toBeTruthy();
    expect(expanded.l2Struct.processNo).toBeTruthy();
    expect(expanded.l2Struct.processName).toBeTruthy();
    
    // L3 역전개 (★B3 포함)
    expect(expanded.fc.causeText).toBeTruthy();
    expect(expanded.l3Char.charText).toBeTruthy();     // ★B3!
    expect(expanded.l3Func.functionText).toBeTruthy();
    expect(expanded.l3WE.workElement).toBeTruthy();
    expect(expanded.l3FourM.fourM).toBeTruthy();
    
    // SOD
    expect(expanded.ra.severity).toBeGreaterThan(0);
    expect(expanded.ra.occurrence).toBeGreaterThan(0);
    expect(expanded.ra.detection).toBeGreaterThan(0);
  });
});
```

### 3.2 API 통합 테스트

```typescript
// __tests__/api-integration.test.ts

describe('API 통합', () => {
  test('import-to-raw → raw-dataset → raw-to-atomic', async () => {
    // Step 1: Import
    const importRes = await fetch('/api/fmea/import-to-raw', {
      method: 'POST',
      body: formData  // aubump.xlsx
    });
    const rawResult = await importRes.json();
    expect(rawResult.success).toBe(true);
    expect(rawResult.quality.completenessRate).toBeGreaterThan(0.95);
    
    // Step 2: 품질 확인
    const qualityRes = await fetch(`/api/fmea/raw-quality?fmeaId=${fmeaId}`);
    const quality = await qualityRes.json();
    expect(quality.parentIdCoverage).toBe(1.0);  // 100%
    
    // Step 3: Atomic 전환
    const atomicRes = await fetch('/api/fmea/raw-to-atomic', {
      method: 'POST',
      body: JSON.stringify({ fmeaId })
    });
    const atomicResult = await atomicRes.json();
    expect(atomicResult.success).toBe(true);
    
    // Step 4: pipeline-verify
    const verifyRes = await fetch(`/api/fmea/pipeline-verify?fmeaId=${fmeaId}`);
    const verify = await verifyRes.json();
    expect(verify.allGreen).toBe(true);
  });
});
```

### 3.3 Playwright E2E 테스트 (브라우저 검증)

```typescript
// e2e/fmea-import-e2e.spec.ts
import { test, expect } from '@playwright/test';

test.describe('FMEA Import → 워크시트 E2E', () => {
  
  test('엑셀 Import → RawDataset → Atomic → 워크시트 렌더링', async ({ page }) => {
    // ─── 1. FMEA 등록 ───
    await page.goto('/pfmea/register');
    await page.fill('[name="fmeaName"]', 'E2E Test AU Bump');
    await page.click('button:has-text("등록")');
    await page.waitForURL(/\/pfmea\/import/);
    
    // ─── 2. 엑셀 업로드 ───
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('test-data/aubump.xlsx');
    await page.waitForSelector('text=파싱 완료', { timeout: 30000 });
    
    // ─── 3. 품질 리포트 확인 ───
    await expect(page.locator('[data-testid="completeness-rate"]'))
      .toContainText('99');  // 99% 이상
    
    await expect(page.locator('[data-testid="total-records"]'))
      .toContainText('1710');  // ~1710건
    
    await expect(page.locator('[data-testid="fk-orphans"]'))
      .toContainText('0');  // FK 고아 0건
    
    await expect(page.locator('[data-testid="parentid-coverage"]'))
      .toContainText('100');  // parentId 100%
    
    // ─── 4. Atomic 전환 ───
    await page.click('button:has-text("Atomic DB 전환")');
    await page.waitForSelector('text=전환 완료', { timeout: 60000 });
    
    // ─── 5. 워크시트 열기 ───
    await page.click('button:has-text("워크시트")');
    await page.waitForSelector('.handsontable', { timeout: 30000 });
    
    // ─── 6. 워크시트 데이터 검증 ───
    
    // 6-1. 행 수 확인 (118행 이상)
    const rowCount = await page.locator('.handsontable tbody tr').count();
    expect(rowCount).toBeGreaterThanOrEqual(118);
    
    // 6-2. 첫 행 데이터 확인
    const firstRowCells = page.locator('.handsontable tbody tr:first-child td');
    const cellCount = await firstRowCells.count();
    expect(cellCount).toBeGreaterThanOrEqual(15);  // 최소 15개 열
    
    // 6-3. 공정번호 확인 (첫 공정 = 01 또는 1)
    const processNoCell = page.locator('[data-testid="cell-processNo-0"]');
    await expect(processNoCell).not.toBeEmpty();
    
    // 6-4. 고장형태(FM) 셀이 비어있지 않은지
    const fmCells = page.locator('[data-testid^="cell-fm-"]');
    const fmCount = await fmCells.count();
    expect(fmCount).toBeGreaterThan(0);
    
    // 6-5. 고장원인(FC) 셀이 비어있지 않은지
    const fcCells = page.locator('[data-testid^="cell-fc-"]');
    const fcCount = await fcCells.count();
    expect(fcCount).toBeGreaterThan(0);
    
    // 6-6. B3(공정특성) 셀이 비어있지 않은지 (★v4 핵심)
    const b3Cells = page.locator('[data-testid^="cell-b3-"]');
    const b3Count = await b3Cells.count();
    expect(b3Count).toBeGreaterThan(0);
    for (let i = 0; i < Math.min(5, b3Count); i++) {
      await expect(b3Cells.nth(i)).not.toBeEmpty();
    }
    
    // 6-7. SOD 값 확인
    const sCells = page.locator('[data-testid^="cell-severity-"]');
    const sCount = await sCells.count();
    expect(sCount).toBeGreaterThan(0);
    
    // 6-8. AP 값 확인
    const apCells = page.locator('[data-testid^="cell-ap-"]');
    const apCount = await apCells.count();
    expect(apCount).toBeGreaterThan(0);
  });
  
  test('워크시트 셀 편집 → DB 반영', async ({ page }) => {
    await page.goto('/pfmea/worksheet?id=e2e-test-id');
    await page.waitForSelector('.handsontable', { timeout: 30000 });
    
    // 셀 더블클릭 → 편집
    const targetCell = page.locator('.handsontable tbody tr:first-child td:nth-child(5)');
    await targetCell.dblclick();
    await page.keyboard.type('E2E 수정 테스트');
    await page.keyboard.press('Enter');
    
    // 저장 확인 (자동저장 또는 저장 버튼)
    await page.waitForTimeout(2000);  // 디바운스 대기
    
    // 페이지 새로고침 후 데이터 유지 확인
    await page.reload();
    await page.waitForSelector('.handsontable', { timeout: 30000 });
    await expect(targetCell).toContainText('E2E 수정 테스트');
  });
  
  test('pipeline-verify allGreen 확인', async ({ page }) => {
    await page.goto('/pfmea/worksheet?id=e2e-test-id');
    
    // 검증 버튼 클릭 (있는 경우)
    const verifyBtn = page.locator('button:has-text("검증")');
    if (await verifyBtn.isVisible()) {
      await verifyBtn.click();
      await page.waitForSelector('[data-testid="verify-result"]', { timeout: 30000 });
      
      await expect(page.locator('[data-testid="verify-step0"]')).toContainText('OK');
      await expect(page.locator('[data-testid="verify-step1"]')).toContainText('OK');
      await expect(page.locator('[data-testid="verify-step2"]')).toContainText('OK');
      await expect(page.locator('[data-testid="verify-step3"]')).toContainText('OK');
      await expect(page.locator('[data-testid="verify-step4"]')).toContainText('OK');
    }
  });
  
  test('역전개: FailureLink → 전체 구조 복원', async ({ page }) => {
    // API 직접 호출로 역전개 테스트
    const response = await page.request.get(
      '/api/fmea/reverse-expand?id=FC-R1&fmeaId=e2e-test-id'
    );
    const data = await response.json();
    
    // L1 역전개
    expect(data.fe).toBeTruthy();
    expect(data.fe.effectText).toBeTruthy();
    expect(data.l1Func).toBeTruthy();
    expect(data.l1Req).toBeTruthy();
    expect(data.l1Scope).toBeTruthy();
    
    // L2 역전개
    expect(data.fm).toBeTruthy();
    expect(data.fm.feRefs.length).toBeGreaterThan(0);
    expect(data.fm.fcRefs.length).toBeGreaterThan(0);
    expect(data.pc).toBeTruthy();
    expect(data.l2Func).toBeTruthy();
    expect(data.l2Struct).toBeTruthy();
    expect(data.l2Struct.processNo).toBeTruthy();
    
    // L3 역전개 (★B3 포함)
    expect(data.fc).toBeTruthy();
    expect(data.l3Char).toBeTruthy();        // ★B3!
    expect(data.l3Char.charText).toBeTruthy();
    expect(data.l3Func).toBeTruthy();
    expect(data.l3WE).toBeTruthy();
    expect(data.l3FourM).toBeTruthy();
    expect(data.l3Struct).toBeTruthy();
    
    // SOD
    expect(data.ra).toBeTruthy();
    expect(data.ra.severity).toBeGreaterThan(0);
  });
});
```

### 3.4 VERIFY 출력 형식

```
VERIFY_RESULT:
  V1. UUID 단위테스트: PASS / FAIL ({n}/{total})
  V2. RawDataset 단위테스트: PASS / FAIL ({n}/{total})
  V3. parentId 체인 테스트: PASS / FAIL ({n}/{total})
  V4. 역전개 테스트: PASS / FAIL
  V5. API 통합테스트: PASS / FAIL
  V6. Playwright E2E:
      - Import → 워크시트: PASS / FAIL
      - 셀 편집 → DB 반영: PASS / FAIL
      - pipeline-verify: PASS / FAIL
      - 역전개: PASS / FAIL
  
  최종 판정: ALL GREEN / {n}건 FAIL
  
  FAIL 항목:
    1. [V{n}] 설명 + 스크린샷
    ...
```

---

## PHASE 4: 최종 체크리스트

```
전체 파이프라인 완료 조건:

□ EXPLORE 92항목 전부 ✅
□ EXECUTE 67항목 전부 ✅
□ VERIFY 단위테스트 전부 PASS
□ VERIFY API 통합테스트 PASS
□ VERIFY Playwright E2E 전부 PASS
□ npm run build 성공
□ npx tsc --noEmit 성공
□ 레거시 파일 전부 삭제 확인
□ aubump.xlsx Import → 워크시트 렌더링 → 셀 편집 → 저장 정상
□ pipeline-verify allGreen
□ 총 레코드 ~1,710건
□ FK 고아 0건
□ parentId 깨진 참조 0건
□ B3(공정특성) 118건 전부 독립 UUID 보유
□ 역전개: FailureLink 1건 → 워크시트 전체 셀 복원 성공
```
