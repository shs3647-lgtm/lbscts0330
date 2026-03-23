# FMEA Import 파이프라인 유지보수 매뉴얼

> **최종 업데이트**: 2026-03-23
> **대상**: 171개 커밋 기반 Import 파이프라인 전체 아키텍처

---

## 1. 시스템 개요

비유: FMEA Import 파이프라인은 **"공장의 조립 라인"**이다.
Excel(원재료) → 파싱(부품 분해) → buildWorksheetState(조립) → Atomic DB(완제품 창고).
각 단계에서 불량(UUID 불일치, FK 누락)이 발생하면 뒤의 모든 공정이 멈춘다.

```
Excel → parseExcelToFlatData → ImportedFlatData[]
  → supplementMissingItems (누락 보충)
  → buildWorksheetState (4-Phase)
    Phase 1: Structure (L1/L2/L3 계층)
    Phase 2: Functions + Entities (FM/FE/FC + flatMap)
    Phase 2.5: UUID FK 결정론적 할당
    Phase 3: FailureLink DB-중심 생성
    Phase 4: A6(검출)/B5(예방) riskData 보충
  → migrateToAtomicDB / saveAtomicDB
  → Prisma $transaction → Atomic DB (SSoT)
```

---

## 2. 핵심 파일 맵

### 2.1 Import 파이프라인 (입력 → DB)

| 파일 | 줄 수 | 역할 | CODEFREEZE |
|------|------|------|-----------|
| `import/excel-parser.ts` | 1,516 | Excel → ImportedFlatData[] | ✅ v3.1.0 |
| `import/excel-parser-fc.ts` | 567 | FC 시트 파싱 | ✅ |
| `import/utils/buildWorksheetState.ts` | 1,798 | 4-Phase 핵심 파이프라인 | 해제(3/17) |
| `import/utils/assignChainUUIDs.ts` | 445 | UUID FK 할당 (flatMap 기반) | - |
| `import/utils/failureChainInjector.ts` | 347 | FC 매칭 주입 | - |
| `import/utils/supplementMissingItems.ts` | ~200 | A1-C4 누락 항목 보충 | - |

### 2.2 DB 저장/로드 (Atomic DB ↔ Client)

| 파일 | 줄 수 | 역할 | CODEFREEZE |
|------|------|------|-----------|
| `api/fmea/route.ts` | 2,451 | GET/POST Atomic DB 이중 저장 | ✅ v4.0.0 |
| `api/fmea/save-from-import/route.ts` | 699 | Import→DB 서버사이드 오케스트레이션 + 불완전 Atomic 덮어쓰기 차단 | - |
| `api/fmea/rebuild-atomic/route.ts` | ~400 | legacyData→Atomic 재구축 | - |
| `api/fmea/repair-fk/route.ts` | ~90 | FK 고아·무효만 정리 (`fk-repair.ts`, rebuild 없음) | - |
| `worksheet/migration.ts` | 1,200 | Legacy JSON → FMEAWorksheetDB 변환 | ✅ |
| `worksheet/hooks/useWorksheetSave.ts` | 850 | 클라이언트 저장 (atomicDB 우선) | - |
| `worksheet/hooks/useWorksheetDataLoader.ts` | ~400 | 클라이언트 로드 (**불변 원칙**) | - |

### 2.3 Import 매핑 추적 (신규 2026-03-17)

| 파일 | 역할 |
|------|------|
| `lib/import/importJobManager.ts` | serializeFlatMap, createImportJobData (순수 함수) |
| `lib/import/importJobDb.ts` | createImportJob, saveAllMappings, verifyRoundTrip (DB) |

### 2.4 PFMEA 좌우 비교 뷰 (2026-03-23)

| 파일 | 역할 |
|------|------|
| `pfmea/compare/page.tsx` | `/pfmea/compare` 라우트 |
| `pfmea/compare/components/CompareSplitView.tsx` | iframe 2개 + 탭 URL + 리사이저 |
| `pfmea/compare/hooks/useCompareScrollSync.ts` | `postMessage` 세로 스크롤 동기화 |
| `pfmea/worksheet/page.tsx` | `compareEmbed`/`readonly`/`compareSide`, 스크롤 보고, 좌측 `.compare-worksheet-readonly` |
| `worksheet/hooks/useWorksheetState.ts` | `compareEmbed` 시 URL 탭 동기화 생략 |

상세: `docs/PFMEA_COMPARE_VIEW.md`

---

## 3. 데이터 흐름 상세

### 3.1 Import 경로 (Excel → DB)

```
[클라이언트]
useImportSteps → parseExcelToFlatData(file) → flatData[]
  → POST /api/fmea/save-from-import { fmeaId, flatData, failureChains }

[서버: save-from-import/route.ts]
1. 입력 검증 (isValidFmeaId)
2. parseValidationPipeline 실행 (autoFix 금지)
3. buildAtomicFromFlat(flatData, chains) → Atomic DB 직접 변환
4. A6/B5 → RiskAnalysis DC/PC 보충 안전망 적용
5. 기존 프로젝트 스키마 카운트 조회
6. **기존 FC/FL/RA가 있는데 신규 Atomic이 0건이면 409 차단**
7. $transaction { DELETE ALL → CREATE ALL } 저장
8. 저장 후 Atomic 카운트 검증
9. 응답 반환 { success, atomicCounts, verified, verifyGaps }
```

### 3.2 저장 경로 (워크시트 편집 → DB)

```
[클라이언트: useWorksheetSave.ts]
1. syncFailureLinksFromState (state → DB 링크 동기화)
   - 3단계 매칭: id → FM+FE+FC 3중키 → FM+FC 2중키
2. atomicDB 있으면 → saveAtomicDB() (UUID 보존)
   atomicDB 없으면 → migrateToAtomicDB() (레거시 변환)
3. POST /api/fmea { atomicDB, legacyData }

[서버: fmea/route.ts POST]
1. FK 검증 (FM/FE/FC ID가 실제 존재하는지)
2. DELETE-THEN-INSERT 패턴 (FailureLink)
3. feId 자동할당 (빈 feId → 같은 FM의 FE 또는 전역 FE)
4. $transaction { Atomic 테이블 upsert + legacyData 캐시 }
```

### 3.3 로드 경로 (DB → 워크시트)

```
[클라이언트: useWorksheetDataLoader.ts]
1. GET /api/fmea?fmeaId=xxx
2. 응답에 legacyData 있으면 → 직접 사용
3. 없으면 → Atomic DB에서 조립
4. ⚠️ 불변 원칙: 로드 경로에 필터/변환 삽입 절대 금지 (Rule 10.5)
```

---

## 4. UUID 체계

### 4.1 결정론적 UUID 생성기 (`lib/uuid-generator.ts`)

```
L2 레벨:
  genA1('PF', 40)           → 'PF-L2-040'              (공정 구조)
  genA3('PF', 40, 1)        → 'PF-L2-040-F-001'        (공정 기능)
  genA4('PF', 40, 1)        → 'PF-L2-040-P-001'        (제품특성)
  genA5('PF', 40, 1)        → 'PF-L2-040-M-001'        (고장형태)

L3 레벨:
  genB1('PF', 40, 'MC', 1)  → 'PF-L3-040-MC-001'       (작업요소)
  genB4('PF', 40, 'MC', 1, 1) → 'PF-L3-040-MC-001-K-001' (고장원인)

FC 링크:
  genFC('PF', 40, 1, 'MC', 1, 1) → 'PF-FC-040-M001-MC001-K001'
```

### 4.2 UUID 보존 규칙

| 시점 | 규칙 | 위반 시 영향 |
|------|------|------------|
| Import | genXxx()로 결정론적 생성 | 동일 Excel = 동일 UUID |
| 저장 | saveAtomicDB() UUID 보존 | migrateToAtomicDB()는 재생성 → FK 깨짐 |
| FC 매칭 | flatMap.get() 결정론적 조회 | 텍스트 매칭 → 비결정론적 → 재현 불가 |
| FailureLink | DELETE-THEN-INSERT | INSERT-ONLY → 수정 미반영 |

---

## 5. 반복 발생 버그 패턴 (Bug Recurrence Map)

### 5.1 FC(고장원인) 미연결 — 가장 빈번 (커밋 10건+)

**근본원인 히스토리**:
1. `distribute()` 균등배분 → 순서 의존적 → **제거 (2026-02)**
2. 텍스트 매칭 fallback → NFKC 불일치 → **flatMap 결정론적 전환 (2026-03-15)**
3. `procHasChains` 조건 → 체인 없는 공정 스킵 → **조건 제거 (2026-03-16)**
4. INSERT-ONLY 패턴 → 수정 미반영 → **DELETE-THEN-INSERT (2026-03-17)**
5. feId 빈값 → FK 제약 저장 실패 → **자동할당 (2026-03-17)**

**예방 체크리스트**:
- [ ] FailureLink 저장 전 fmId/feId/fcId 모두 non-null 확인
- [ ] flatMap.fc에 해당 flatDataId가 존재하는지 확인
- [ ] processNo 정규화: '01' === '1' (선행 0 제거)
- [ ] verifyRoundTrip 실행하여 missing 0건 확인

### 5.2 카테시안 복제 (A4/ProcessProductChar)

**근본원인**: A3마다 A4를 복제 생성 → UUID 2배 → 고아 PC 발생
**해결**: A4는 공정 단위 1회 생성, 모든 A3가 동일 ID를 FK 참조
**검증**: `scripts/check-cartesian.sh`

### 5.3 C3(요구사항) parentItemId 누락

**근본원인**: C3→C2 매핑 시 rowSpan 기반 배정 실패
**해결**: parentItemId UUID 직접 꽂기 + single-sheet 파서 인덱스 기록
**검증**: L1Requirement 테이블 카운트 확인

### 5.4 legacyData 덮어쓰기 (풍부도 역전)

**근본원인**: rebuild-atomic이 legacyData를 빈약한 버전으로 덮어쓰기
**해결**: countRichness() FM+FC 비교 → 더 풍부한 쪽 보존
**검증**: save-from-import Verify Loop (3회 재시도)

### 5.5 LLD추천/개선추천 저장 후 사라짐 (2026-03-18)

**근본원인**: `useWorksheetDataLoader.ts`의 ATOMIC DIRECT 로드 경로가 legacy riskData의 6ST 최적화 키를 병합하지 않음
- atomicToLegacy()는 DB 값이 NULL이면 `detection-opt-*`/`lesson-opt-*` 키를 생성하지 않음
- FALLBACK 경로에만 OPT_PREFIXES 병합이 있고, ATOMIC DIRECT 경로에는 없었음
- 결과: state.riskData에 6ST 키 없음 → syncOptimizationsFromState에서 detectionAction/lldOptReference = null 저장

**해결 (1차 — 2026-03-18)**: ATOMIC DIRECT 경로(line 145-234)에서 `loadWorksheetDB()`로 legacy riskData를 로드하여 OPT_PREFIXES 병합 추가

**해결 (2차 — 2026-03-19, 근본 수정)**: 1차 수정만으로는 프로젝트 스키마 `fmea_legacy_data.riskData`에 `lesson-opt-*` / `detection-opt-*` 키가 여전히 0건이어서 재발
- **2차 근본 원인**: API POST에서 optimizations 테이블은 업데이트하지만, `fmea_legacy_data.riskData`에 최적화 키를 역매핑하지 않아 프로젝트 스키마 legacy 데이터가 항상 빈 상태
- **수정 파일**: `src/app/api/fmea/route.ts` — LEGACY_DATA 저장 직전(step 13.5)에 optimizations → riskData 자동 역매핑 로직 추가
  - `lesson-opt-${uk}` ← `opt.lldOptReference`
  - `detection-opt-${uk}` ← `opt.detectionAction`
  - `prevention-opt-${uk}` ← `opt.recommendedAction`
  - 기타: `person-opt-`, `targetDate-opt-`, `completeDate-opt-`, `status-opt-`, `note-opt-`
- **데이터 동기화**: 3개 프로젝트 스키마(m066/m069/m071) legacy riskData 즉시 갱신
- **검증**: m066 프로젝트 스키마 `lesson-opt-*: 64, detection-opt-*: 104` 확인

**예방 체크리스트**:
- [ ] ATOMIC DIRECT 경로와 FALLBACK 경로의 riskData 처리가 일관적인지 확인
- [ ] 새 riskData 키 패턴 추가 시 양쪽 경로 모두 업데이트
- [ ] `atomicToLegacyAdapter.ts`에 새 필드 추가 시 양방향(저장/로드) 모두 구현
- [ ] **API POST LEGACY_DATA 저장 시 optimizations → riskData 역매핑 누락 여부 확인**

---

## 6. placeholder 판정 로직

### 6.1 isMeaningful (FC 누락 카운트)

```typescript
const PLACEHOLDERS = [
  '클릭하여 추가', '여기를 클릭하여 추가', '클릭하여 선택',
  '요구사항 선택', '고장원인 선택', '고장형태 선택', '고장영향 선택',
  '선택하세요', '입력하세요', '추가하세요',
  '고장원인을 입력하세요', '(기능분석에서 입력)', '기능 입력 필요',
];
return !PLACEHOLDERS.includes(trimmed);
```

**주의**: 20자 초과 규칙 제거됨 (2026-03-17). 정확한 목록 비교만 사용.

### 6.2 isMissing (migration.ts)

```typescript
const skip = ['클릭', '선택', '입력', '필요', '기능분석에서'];
// mode가 이 키워드를 포함하면 skip
```

**주의**: migration.ts는 CODEFREEZE. 이 로직 변경 시 반드시 사용자 승인 필요.

---

## 7. 검증 체계

### 7.1 3단계 필수 검증

```bash
# 1단계: 타입 체크 (매 커밋 전 필수)
npx tsc --noEmit

# 2단계: 단위 테스트
npx playwright test tests/e2e/import-mapping.spec.ts --project chromium

# 3단계: FK/커버리지 정합성
node scripts/validate-fk.mjs
```

### 7.2 ImportMapping verifyRoundTrip

Import 완료 후 자동 실행. FM/FC/FE가 Atomic DB에 실제 존재하는지 배치 검증.
결과는 API 응답의 `importJob.roundTrip` 필드에 포함.

### 7.3 Verify Loop (save-from-import)

save-from-import는 저장 전에 아래 방어선을 먼저 통과해야 한다:
1. 기존 프로젝트에 FC/FL/RA가 존재하는지 카운트 확인
2. 신규 Atomic 변환 결과가 FC/FL/RA 0건인지 확인
3. **기존>0 + 신규=0이면 409로 차단**하고 DELETE 트랜잭션 진입 금지

### 7.4 validate-fk 확장 체크 (2026-03-22)

`validate-fk/route.ts`는 기존 orphan/FK 검증 외에 아래 커버리지 체크를 포함한다:
1. `failureLinkCoverage` — FM이 하나도 FailureLink에 연결되지 않으면 ERROR
2. `riskAnalysisCoverage` — FailureLink별 RiskAnalysis가 정확히 1건이 아니면 ERROR

### 7.5 Import/Repair hardening (2026-03-22)

1. `legacyParseResultToFlatData.ts`가 레거시 ParseResult를 `ImportedFlatData[]`로 복원해 `B4/A6/B5` 누락을 막는다.
2. `useImportFileHandlers.ts` 레거시 경로는 더 이상 `flat=[]`로 끝나지 않는다.
3. `save-from-import/route.ts`는 `failureChains` 미전달 시 `flatData`에서 체인을 유도한다.
4. `supplementFlatDataFromChains.ts`가 chain 기반 `B4/B5/A6`를 flatData에 꽂아넣어 `f001` 같은 B4 누락 dataset 재저장을 가능하게 한다.
5. `pipeline-verify/auto-fix.ts`는 peer RA가 모두 비어 있어도 public `PfmeaMasterFlatItem(A6/B5)`를 읽어 `DC/PC`를 채운다.

---

## 8. CODEFREEZE 파일 목록 (수정 시 사용자 승인 필수)

| 파일 | 버전 | 위험도 |
|------|------|--------|
| `api/fmea/route.ts` | v4.0.0-gold | 🔴 최고 |
| `worksheet/migration.ts` | - | 🔴 최고 |
| `import/excel-parser.ts` | v3.1.0 | 🔴 높음 |
| `import/hooks/useImportSteps.ts` | - | 🟠 높음 |
| `worksheet/tabs/failure/*` | - | 🟠 높음 |

---

## 9. 스크립트 카탈로그

### 9.1 진단용 (개발 시 사용)

| 스크립트 | 용도 |
|---------|------|
| `check-fc-ismissing.mjs` | FC isMissing 판정 시뮬레이션 |
| `check-fc-pc-mismatch.mjs` | FC↔PC 불일치 탐지 |
| `check-l3func-vs-fc.mjs` | L3Function vs FailureCause 비교 |
| `diag-4fc-missing.mjs` | FC 4건 누락 원인 진단 |
| `verify-failure-links.mjs` | FailureLink FK 검증 |

### 9.2 데이터 유지보수

| 스크립트 | 용도 |
|---------|------|
| `rebuild-atomic.mjs` | Atomic 테이블 재구축 |
| `seed-lld-data.mjs` | LLD 마스터 데이터 시딩 |
| `validate-fk.mjs` | FK 고아 레코드 탐지 |

---

## 10. Raw SQL 테이블/컬럼명 규칙 (2026-03-18 확정)

> **Prisma @@map 기준 snake_case 테이블명만 사용. PascalCase 절대 금지.**

### 10.1 Prisma 모델 → PostgreSQL 테이블명 매핑

| Prisma 모델 (코드용) | PostgreSQL 테이블명 (SQL용) |
|----------------------|---------------------------|
| `FmeaProject` | `fmea_projects` |
| `FmeaRegistration` | `fmea_registrations` |
| `FmeaLegacyData` | `fmea_legacy_data` |
| `FmeaConfirmedState` | `fmea_confirmed_states` |
| `L1Structure` / `L2Structure` / `L3Structure` | `l1_structures` / `l2_structures` / `l3_structures` |
| `L1Function` / `L2Function` / `L3Function` | `l1_functions` / `l2_functions` / `l3_functions` |
| `FailureMode` / `FailureEffect` / `FailureCause` | `failure_modes` / `failure_effects` / `failure_causes` |
| `FailureLink` / `FailureAnalysis` | `failure_links` / `failure_analyses` |
| `RiskAnalysis` / `Optimization` | `risk_analyses` / `optimizations` |
| `ControlPlan` / `ControlPlanItem` | `control_plans` / `control_plan_items` |
| `CpMasterDataset` / `CpMasterFlatItem` | `cp_master_datasets` / `cp_master_flat_items` |
| `PfdRegistration` / `PfdItem` | `pfd_registrations` / `pfd_items` |
| `TripletGroup` / `UnifiedProcessItem` | `triplet_groups` / `unified_process_items` |
| `ProcessProductChar` | `process_product_chars` |

### 10.2 컬럼명 주의사항

| 테이블 | 잘못된 컬럼명 | 올바른 컬럼명 |
|--------|-------------|-------------|
| `fmea_legacy_data` | `legacyData`, `legacyVersion` | `data`, `version` |
| `failure_modes` | `name` | `mode` |
| `l2_structures` | `processNo`, `processName` | `no`, `name` |
| `l3_structures` | `fourM`, `workElementName` | `m4`, `name` |

### 10.3 raw SQL 사용 규칙

1. **Prisma ORM 우선**: `prisma.model.findMany()` 등 ORM API를 우선 사용
2. **raw SQL 허용 조건**: 동적 스키마(`SET search_path`, `"${schema}".table`), `information_schema` 조회 등 Prisma가 지원하지 않는 경우에만 사용
3. **테이블명**: 반드시 `@@map` snake_case 사용 (`fmea_projects`, NOT `"FmeaProject"`)
4. **컬럼명**: Prisma 필드명 그대로 사용 (`"fmeaId"`, `"deletedAt"` 등 camelCase를 쌍따옴표로 감싸기)
5. **CREATE TABLE**: `LIKE public.{table} INCLUDING ALL` 패턴 사용 (미래 컬럼 자동 상속)
6. **레거시 호환**: 기존 프로젝트 스키마에 `FmeaInfo` 등 PascalCase 테이블이 남아있을 수 있으므로, 스크립트에서는 자동 감지 패턴 사용

```typescript
// ✅ 올바른 raw SQL
await pool.query(`SELECT data FROM "${schema}".fmea_legacy_data WHERE "fmeaId" = $1`, [id]);
await pool.query(`CREATE TABLE IF NOT EXISTS "${schema}".risk_analyses (LIKE public.risk_analyses INCLUDING ALL)`);

// ⛔ 금지 패턴
await pool.query(`SELECT "legacyData" FROM "${schema}"."FmeaLegacyData" WHERE "fmeaId" = $1`, [id]);
```

### 10.4 위반 사례 (2026-03-18 전수 수정 완료)

| 파일 | 이전 (잘못됨) | 이후 (수정됨) |
|------|-------------|-------------|
| `fmea/route.ts` | `"FmeaInfo"` | `fmea_confirmed_states` |
| `inherit/route.ts` | `"RiskAnalysis"`, `"FmeaLegacyData"` 등 | `risk_analyses`, `fmea_legacy_data` 등 |
| `control-plan/*/basic-info` | `WHERE "cpNo" = $1` (없는 컬럼) | Prisma ORM `findMany` |
| `control-plan/*/stats` | `$queryRawUnsafe` × 7 | Prisma ORM `count` × 6 `Promise.all` |
| `scripts/audit-cp-pfd-fk.js` | `"PfdRegistration"`, `"ControlPlan"` 등 | `pfd_registrations`, `control_plans` 등 |
| `scripts/restore-*.js` | `"FmeaLegacyData"`, `"legacyData"` | `fmea_legacy_data`, `data` |
| `scripts/temp-*.ts` | 전체 PascalCase | 전체 snake_case |
| `scripts/diagnostics/*.js` | `fm.name`, `"legacyData"` | `fm.mode`, `data` |

---

## 11. 최적화 체크리스트

### 11.1 Production 배포 전

- [ ] console.log 디버그 로깅 제거 (console.error는 유지)
- [ ] `as any` 타입 캐스팅 최소화
- [ ] 700줄 초과 파일 분리 계획 수립
- [ ] 진단 스크립트 정리 (scripts/diagnostics/ 이동)
- [ ] CODEFREEZE 파일 변경 이력 감사
- [ ] raw SQL에 PascalCase 테이블명 없는지 전수 검사

### 11.2 Import 수정 시

- [ ] flatMap 3개 Map (fm/fc/fe) 모두 정상 채워지는지 확인
- [ ] processNo 정규화 (선행 0 제거) 적용 여부 확인
- [ ] supplementMissingItems 누락 항목 보충 결과 로그 확인
- [ ] verifyRoundTrip missing 0건 확인
- [ ] 카테시안 복제 탐지 스크립트 실행

### 11.3 워크시트 수정 시

- [ ] useWorksheetDataLoader.ts 로드 경로 불변 원칙 준수
- [ ] syncFailureLinksFromState 3단계 매칭 로직 유지
- [ ] saveAtomicDB() 사용 (migrateToAtomicDB 아님)
- [ ] React.memo 해제하지 않기 (SelectableCell, AllViewRow 등)

### 11.4 모든 코드 변경 후 (필수)

- [ ] `CLAUDE.md` 룰/아키텍처 갱신 필요 여부 확인 → 해당 시 반영
- [ ] `docs/MAINTENANCE_MANUAL.md` 핵심 파일맵/데이터 흐름/버그 패턴 갱신
- [ ] `docs/00_MAINTENANCE_MANUAL.md` 트러블슈팅/버그 이력/테스트 커버리지 갱신
- [ ] 문서 `최종 업데이트` 날짜 갱신
- [ ] `00_MAINTENANCE_MANUAL.md` 업데이트 이력 테이블에 한 줄 추가
