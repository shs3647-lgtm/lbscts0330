# FMEA 단계별 검증 체크리스트
**버전**: v1.0.0 | **작성일**: 2026-03-25  
**진행 원칙**: 각 Phase의 ✅ GATE를 통과하지 못하면 다음 Phase 진행 금지  
**참조 Plan**: `plan.md` v2 (Phase 0~5)

---

## ⚠️ 진행 원칙

```
Phase 0 GATE ✅ → Phase 1 시작
Phase 1 GATE ✅ → Phase 2 시작 (Family)   ← Family는 여기서부터
Phase 2 GATE ✅ → Phase 3 시작 (Part)
Phase 3 GATE ✅ → Phase 4 E2E 시작
Phase 4 GATE ✅ → Phase 5 회귀 검증
```

> **Family FMEA를 Master와 동시 진행 금지**  
> 이유: Master에 버그가 있으면 Family에 그대로 복제되어  
> 버그 발생 지점 추적이 불가능해짐

---

## Phase 0: 사전 환경 준비

### 0-1. DB 초기화 검증

```bash
npx prisma migrate reset --force
npx prisma migrate dev --name init
```

- [ ] `prisma migrate reset` 완료 — 오류 없음
- [ ] public schema 테이블 생성 확인 (아래 목록)
- [ ] 모든 public 테이블 레코드 수 = 0 확인

```sql
-- 확인 쿼리
SELECT table_name, (xpath('/row/cnt/text()',
  query_to_xml('SELECT count(*) AS cnt FROM public.' || table_name, false, true, '')))[1]::text::int AS cnt
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
-- 모든 cnt = 0 이어야 함
```

### 0-2. 프로젝트 스키마 없음 확인

```sql
SELECT schema_name FROM information_schema.schemata
WHERE schema_name LIKE 'pfmea_%';
-- 결과: 0건 (기존 프로젝트 스키마 없음)
```

- [ ] `pfmea_pfm26_m001` 스키마 없음 확인
- [ ] `pfmea_pfm26_f001` 스키마 없음 확인
- [ ] `pfmea_pfm26_p001` 스키마 없음 확인

### 0-3. 소스 파일 존재 확인

- [ ] `src/lib/fmea/cell-id.ts` — `buildCellId()` 함수 존재
- [ ] `src/lib/fmea/cellid-parser.ts` — IL2/IL3/IL1/FC 파서 존재
- [ ] `src/lib/fmea/cellid-to-atomic.ts` — AtomicDB 변환 존재
- [ ] `src/lib/fmea/invariants.ts` — 불변 규칙 10개 존재
- [ ] `src/lib/project-schema.ts` — `ensureProjectSchemaReady()` 존재
- [ ] Import 엑셀 파일 준비 (`D:\00_CELLuuid_FK_SYSTEM` 경로)

### 0-4. 서버 기동 확인

```bash
npm run dev
# 또는
npx next dev
```

- [ ] `http://localhost:3000` 응답 확인
- [ ] `GET /api/fmea/forge-verify?fmeaId=test` → 404 또는 `{error}` 응답 (서버 살아있음)

### ✅ Phase 0 GATE

```
□ DB 모든 테이블 레코드 0건
□ pfmea_* 스키마 0개
□ 핵심 소스 파일 6개 모두 존재
□ 서버 정상 기동
```

**→ 4개 모두 통과 시 Phase 1 진행**

---

## Phase 1: Master FMEA 생성 + Import + 검증

### 1-1. MasterFmea 레코드 생성

```http
POST /api/master-fmea
{
  "code": "MF-AUBUMP",
  "name": "12inch AU BUMP Master FMEA"
}
```

- [ ] HTTP 200/201 응답
- [ ] 응답에 `id: "pfm26-m001"` 포함
- [ ] `public.master_fmeas` 레코드 1건 생성 확인
- [ ] `public.family_masters` 레코드 1건 자동 생성 확인 (코드: `FM-AUBUMP-00`)

```sql
SELECT id, code, name FROM public.master_fmeas WHERE code = 'MF-AUBUMP';
-- 1건

SELECT id, code, master_fmea_id FROM public.family_masters;
-- 1건, master_fmea_id = pfm26-m001
```

### 1-2. Master 공정 등록 (19공정)

```http
POST /api/master-fmea/pfm26-m001/processes
{각 공정별 19회 호출}
공정번호: 10, 20, 30, 40, 50, 60, 70, 80, 90, 100,
          110, 120, 130, 140, 150, 160, 170, 190, 200
```

- [ ] 19회 API 호출 모두 성공
- [ ] `public.master_fmea_processes` 19건 확인

```sql
SELECT COUNT(*) FROM public.master_fmea_processes
WHERE master_fmea_id = 'pfm26-m001';
-- 결과: 19
```

- [ ] 공정번호 zero-padding 확인 (01, 10, 20 형식)
- [ ] 공정번호 중복 없음

### 1-3. Import 엑셀 파싱 (CellId 기반)

**파싱 전 사전 조건:**

- [ ] Import 엑셀 파일 경로 확인
- [ ] 엑셀 내 시트 구성 확인:
  - [ ] `L1통합` 시트 존재 (C1~C4 통합)
  - [ ] `L2통합` 시트 존재 (A1~A6 통합)
  - [ ] `L3통합` 시트 존재 (B1~B5 통합)
  - [ ] `FC` 시트 존재 (9열 구조)

**파싱 실행 후 확인:**

- [ ] `position-parser` 빈행 정제 완료 — 오류 없음
- [ ] `cellid-parser` IL2 파싱 완료:
  - [ ] a1Map size = 19 (19공정)
  - [ ] a4Map size > 0
  - [ ] a5Map size = 21 (FM 21건)
  - [ ] a6Map size > 0
- [ ] `cellid-parser` IL3 파싱 완료:
  - [ ] b1Map size = 73 (WE 73건)
  - [ ] b4Map size = 90 (FC원인 90건)
  - [ ] b5Map size > 0
- [ ] `cellid-parser` IL1 파싱 완료:
  - [ ] c1Map size = 3 (YP/SP/USER)
  - [ ] c4Map size = 20 (FE 20건)
- [ ] `assertMapsReady()` 통과 — 9개 Map 모두 size > 0
- [ ] `cellid-parser` FC 파싱 완료:
  - [ ] FC 전체 행 수 = 49
  - [ ] FK 역조회 실패 = **0건**
  - [ ] 파싱 오류 리포트 출력 확인

**CellId 구조 검증:**

- [ ] A4 cellId 형식: `A4_{procNo}_{row}_004_{seq}_{a1CellId}`
- [ ] A5 cellId의 parentCellId = A4 cellId (랜덤 UUID 아님)
- [ ] FC cellId의 parentCellId = A5 cellId
- [ ] 전체 CellId 중 `uid()\|uuidv4()\|nanoid()` 패턴 = 0건

```bash
# CellId 패턴 검증 (파싱 결과 JSON에서)
# 모든 cellId가 알파벳 코드로 시작하는지 확인
# 예: "A4_10_...", "FC_40_...", "B1_30_..."
```

### 1-4. Atomic DB 저장

```http
POST /api/fmea/save-position-import
{
  "fmeaId": "pfm26-m001",
  "force": true
}
```

- [ ] HTTP 200 응답
- [ ] 응답에 `success: true` 포함
- [ ] 트랜잭션 롤백 없음 (부분 저장 없음)

**저장 후 건수 검증 (plan.md §Phase 1 기준):**

```sql
-- pfmea_pfm26_m001 스키마 기준
SET search_path = pfmea_pfm26_m001;

SELECT 'l1_structures'   AS tbl, COUNT(*) FROM l1_structures   -- 1건
UNION ALL
SELECT 'l2_structures',          COUNT(*) FROM l2_structures   -- 19건
UNION ALL
SELECT 'l3_structures',          COUNT(*) FROM l3_structures   -- 73건
UNION ALL
SELECT 'l1_functions',           COUNT(*) FROM l1_functions    -- 16건
UNION ALL
SELECT 'l2_functions',           COUNT(*) FROM l2_functions    -- 22건
UNION ALL
SELECT 'l3_functions',           COUNT(*) FROM l3_functions    -- 96건
UNION ALL
SELECT 'failure_modes',          COUNT(*) FROM failure_modes   -- 21건
UNION ALL
SELECT 'failure_causes',         COUNT(*) FROM failure_causes  -- 90건
UNION ALL
SELECT 'failure_effects',        COUNT(*) FROM failure_effects -- 20건
UNION ALL
SELECT 'failure_links',          COUNT(*) FROM failure_links;  -- 49건
```

| 테이블 | 기대값 | 실제값 | 일치 |
|--------|--------|--------|------|
| l1_structures | 1 | | □ |
| l2_structures | 19 | | □ |
| l3_structures | 73 | | □ |
| l1_functions | 16 | | □ |
| l2_functions | 22 | | □ |
| l3_functions | 96 | | □ |
| failure_modes | 21 | | □ |
| failure_causes | 90 | | □ |
| failure_effects | 20 | | □ |
| failure_links | 49 | | □ |

### 1-5. FK 고아 검증 (deep-verify)

```http
GET /api/fmea/deep-verify?fmeaId=pfm26-m001
```

또는 직접 SQL:

```sql
SET search_path = pfmea_pfm26_m001;

-- ① 고아 FailureMode (A4 없는 FM)
SELECT COUNT(*) AS orphan_fm
FROM failure_modes fm
LEFT JOIN process_product_chars pc ON pc.id = fm.product_char_id
WHERE pc.id IS NULL;
-- 기대: 0

-- ② 고아 FailureLink (FM/FE/FC 없는 FL)
SELECT COUNT(*) AS orphan_fl_fm
FROM failure_links fl
LEFT JOIN failure_modes fm ON fm.id = fl.failure_mode_id
WHERE fm.id IS NULL;
-- 기대: 0

SELECT COUNT(*) AS orphan_fl_fe
FROM failure_links fl
LEFT JOIN failure_effects fe ON fe.id = fl.failure_effect_id
WHERE fe.id IS NULL;
-- 기대: 0

SELECT COUNT(*) AS orphan_fl_fc
FROM failure_links fl
LEFT JOIN failure_causes fc ON fc.id = fl.failure_cause_id
WHERE fc.id IS NULL;
-- 기대: 0

-- ③ processChar 빈값 (L3Function)
SELECT COUNT(*) AS empty_process_char
FROM l3_functions
WHERE process_char IS NULL OR process_char = '';
-- 기대: 0
```

- [ ] orphan_fm = 0
- [ ] orphan_fl_fm = 0
- [ ] orphan_fl_fe = 0
- [ ] orphan_fl_fc = 0
- [ ] empty_process_char = 0

### 1-6. forge-verify (6항목)

```http
GET /api/fmea/forge-verify?fmeaId=pfm26-m001
```

- [ ] `passed: true`
- [ ] 6개 항목 모두 PASS:
  - [ ] CellId 충돌 = 0
  - [ ] FK 고아 = 0
  - [ ] processChar 빈값 = 0
  - [ ] FailureLink 건수 = 49
  - [ ] RiskAnalysis 건수 = 49
  - [ ] L3 Structure 건수 = 73

### 1-7. Master BD(FlatItem) 저장

```http
POST /api/pfmea/master
{fmeaId: "pfm26-m001", ...}
```

- [ ] HTTP 200 응답
- [ ] FlatItem 약 441건 생성 확인
- [ ] 고장사슬(failureChains) 49건 JSON 포함 확인

### 1-8. 재import 안정성 검증 ★

**동일 데이터를 2회 연속 import했을 때 건수 불변 확인**

```
1회 import → 건수 기록
삭제 → 2회 import → 건수 비교
```

- [ ] 2회 import 후 전체 건수 = 1회와 동일 (증감 0)
- [ ] CellId 충돌 없음

### ✅ Phase 1 GATE

```
□ MasterFmea 레코드: 1건
□ 공정 등록: 19건
□ FK 역조회 실패: 0건 (파싱 단계)
□ 기대 건수 10개 테이블 전체 일치
□ FK 고아 4종 모두 0건
□ forge-verify: passed=true, 6항목 ALL PASS
□ 재import 건수 불변 확인
```

**→ 7개 모두 통과 시 Phase 2 진행**  
**→ 1개라도 실패 시 Phase 2 진행 금지 — Master 버그 먼저 수정**

---

## Phase 2: Family FMEA 파생 + 검증

> **시작 조건**: Phase 1 GATE ✅ 완전 통과 후에만 진행

### 2-1. Family FMEA 프로젝트 생성

```http
POST /api/fmea/projects
{
  "fmeaId": "pfm26-f001",
  "fmeaType": "F",
  "parentFmeaId": "pfm26-m001"
}
```

- [ ] HTTP 200/201 응답
- [ ] `public.family_masters` fmeaId = `pfm26-f001` 업데이트 확인

### 2-2. Master → Family 데이터 상속

```http
POST /api/master-fmea/create-project
{
  "sourceFmeaId": "pfm26-m001",
  "targetFmeaId": "pfm26-f001"
}
```

- [ ] HTTP 200 응답
- [ ] `reverseExtract` 완료 — Master Atomic DB 추출 성공
- [ ] `remapFmeaId` 완료 — fmeaId를 pfm26-f001로 재매핑
- [ ] `saveAtomicDB` 완료 — pfmea_pfm26_f001 스키마 저장

### 2-3. 프로젝트 스키마 생성 확인

```sql
SELECT schema_name FROM information_schema.schemata
WHERE schema_name = 'pfmea_pfm26_f001';
-- 1건

SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'pfmea_pfm26_f001';
-- 44건 (44개 테이블)
```

- [ ] `pfmea_pfm26_f001` 스키마 생성 확인
- [ ] 44개 테이블 생성 확인

### 2-4. 상속 데이터 건수 검증

Family는 Master와 **동일 건수**여야 함:

```sql
SET search_path = pfmea_pfm26_f001;
SELECT 'l2_structures', COUNT(*) FROM l2_structures   -- 19건
UNION ALL SELECT 'l3_structures', COUNT(*) FROM l3_structures -- 73건
UNION ALL SELECT 'failure_modes', COUNT(*) FROM failure_modes -- 21건
UNION ALL SELECT 'failure_links', COUNT(*) FROM failure_links; -- 49건
```

| 테이블 | Master 기대값 | Family 실제값 | 일치 |
|--------|-------------|--------------|------|
| l2_structures | 19 | | □ |
| l3_structures | 73 | | □ |
| failure_modes | 21 | | □ |
| failure_causes | 90 | | □ |
| failure_effects | 20 | | □ |
| failure_links | 49 | | □ |

### 2-5. CellId 재매핑 검증

Family의 CellId는 Master와 **달라야** 한다 (fmeaId 변경으로 재생성):

```sql
-- Master CellId 샘플
SELECT id FROM pfmea_pfm26_m001.failure_modes LIMIT 3;

-- Family CellId 샘플
SELECT id FROM pfmea_pfm26_f001.failure_modes LIMIT 3;

-- 두 결과가 달라야 함 (pfm26-m001 → pfm26-f001 반영)
```

- [ ] Family CellId ≠ Master CellId (재매핑 확인)
- [ ] Family CellId 내부에 `pfm26-f001` 또는 f001 식별자 포함 확인

### 2-6. Family FK 고아 검증

```http
GET /api/fmea/deep-verify?fmeaId=pfm26-f001
```

- [ ] FK 고아 4종 모두 = 0 (Master와 동일 기준)
- [ ] processChar 빈값 = 0

### 2-7. Family forge-verify

```http
GET /api/fmea/forge-verify?fmeaId=pfm26-f001
```

- [ ] `passed: true`
- [ ] 6항목 ALL PASS

### ✅ Phase 2 GATE

```
□ pfmea_pfm26_f001 스키마 생성 + 44테이블
□ 상속 건수 6개 테이블 Master와 동일
□ CellId 재매핑 확인 (Master ≠ Family)
□ FK 고아 4종 0건
□ forge-verify: passed=true
```

**→ 5개 모두 통과 시 Phase 3 진행**

---

## Phase 3: Part FMEA 파생 + 검증

> **시작 조건**: Phase 2 GATE ✅ 완전 통과 후에만 진행

### 3-1. Part FMEA 프로젝트 생성

```http
POST /api/fmea/projects
{
  "fmeaId": "pfm26-p001",
  "fmeaType": "P",
  "parentFmeaId": "pfm26-f001",
  "partCode": "PF-SEC-HBM3E-001",
  "customerName": "Samsung",
  "productName": "HBM3E"
}
```

- [ ] HTTP 200/201 응답
- [ ] `public.part_fmeas` 레코드 생성 확인
- [ ] `sourceType: "FAMILY_REF"` 설정 확인

### 3-2. Family → Part 데이터 상속

```http
POST /api/master-fmea/create-project
{
  "sourceFmeaId": "pfm26-f001",
  "targetFmeaId": "pfm26-p001"
}
```

- [ ] HTTP 200 응답
- [ ] `pfmea_pfm26_p001` 스키마 생성 확인 (44테이블)

### 3-3. 상속 데이터 건수 검증

| 테이블 | Family 기대값 | Part 실제값 | 일치 |
|--------|-------------|-----------|------|
| l2_structures | 19 | | □ |
| l3_structures | 73 | | □ |
| failure_modes | 21 | | □ |
| failure_causes | 90 | | □ |
| failure_effects | 20 | | □ |
| failure_links | 49 | | □ |

### 3-4. Part 독자 추가 (선택)

- [ ] 고객 특화 공정 추가 시 새 l2_structure + l3_structure 생성 확인
- [ ] 추가 공정의 CellId = `A1_{새공정번호}_...` 형식 확인
- [ ] 기존 상속 데이터 변경 없음 (건수 유지)

### 3-5. Part forge-verify + deep-verify

```http
GET /api/fmea/forge-verify?fmeaId=pfm26-p001
GET /api/fmea/deep-verify?fmeaId=pfm26-p001
```

- [ ] forge-verify: `passed: true`
- [ ] FK 고아 4종 0건
- [ ] processChar 빈값 0건

### 3-6. CP/PFD 연동

```sql
SELECT id FROM public.part_control_plans WHERE part_fmea_id = 'pfm26-p001';
-- 1건
SELECT id FROM public.part_pfds WHERE part_fmea_id = 'pfm26-p001';
-- 1건
```

- [ ] PartControlPlan 1건 생성
- [ ] PartPfd 1건 생성

### ✅ Phase 3 GATE

```
□ pfmea_pfm26_p001 스키마 생성 + 44테이블
□ 상속 건수 6개 테이블 Family와 동일
□ forge-verify: passed=true
□ FK 고아 0건
□ PartControlPlan + PartPfd 각 1건
```

---

## Phase 4: Playwright E2E 테스트

> **시작 조건**: Phase 3 GATE ✅ 완전 통과 후에만 진행

### 4-1. API 테스트 (request)

```bash
npx playwright test e2e/fmea-pipeline-e2e.spec.ts
```

| 테스트 번호 | 테스트명 | 결과 |
|------------|---------|------|
| 01 | Master FMEA 생성 | □ PASS / □ FAIL |
| 02 | Master 공정 등록 (19건) | □ PASS / □ FAIL |
| 03 | Master Import → save-position-import | □ PASS / □ FAIL |
| 04 | Master forge-verify ALL PASS | □ PASS / □ FAIL |
| 05 | Family FMEA 파생 | □ PASS / □ FAIL |
| 06 | Family forge-verify ALL PASS | □ PASS / □ FAIL |
| 07 | Part FMEA 파생 | □ PASS / □ FAIL |
| 08 | Part forge-verify ALL PASS | □ PASS / □ FAIL |

### 4-2. 브라우저 UI 테스트 (page)

| 테스트 | URL | 확인 항목 | 결과 |
|--------|-----|---------|------|
| 09 | `/pfmea/worksheet?id=pfm26-m001&tab=structure` | L2 구조 표시 | □ |
| 10 | `/pfmea/worksheet?id=pfm26-m001&tab=failure` | (고장형태 선택) placeholder = **0건** | □ |
| 11 | `/pfmea/worksheet?id=pfm26-f001&tab=failure` | Family 고장사슬 정상 표시 | □ |
| 12 | `/pfmea/worksheet?id=pfm26-p001&tab=failure` | Part 고장사슬 정상 표시 | □ |

- [ ] 브라우저 콘솔 오류 0건 (3계층 모두)
- [ ] `(고장형태 선택)` placeholder 0건 (카테시안 복제 없음 증명)

### ✅ Phase 4 GATE

```
□ Playwright 9개 테스트 ALL PASS
□ 브라우저 UI (고장형태 선택) placeholder = 0건
□ 콘솔 오류 0건
```

---

## Phase 5: 3회 회귀 검증

> **시작 조건**: Phase 4 GATE ✅ 완전 통과 후에만 진행

### 회귀 검증 기준값 (Phase 1~3에서 확정된 값)

```
Master: L1=1, L2=19, L3=73, L1F=16, L2F=22, L3F=96, FM=21, FC=90, FE=20, FL=49, RA=49
Family: L2=19, L3=73, FM=21, FC=90, FE=20, FL=49
Part:   L2=19, L3=73, FM=21, FC=90, FE=20, FL=49
FK_orphan=0, processChar_empty=0, CellId_collision=0
```

### 회귀 실행 스크립트

```bash
# 한 회차 = 아래 순서 전체 실행
npx prisma migrate reset --force          # DB 초기화
npm run seed:master-fmea                   # Master 생성 + Import
npm run derive:family                      # Family 파생
npm run derive:part                        # Part 파생
npm run verify:all                         # 전체 forge-verify
```

### 3회 결과 기록표

| 항목 | 기준값 | 1회차 | 2회차 | 3회차 | 일치 |
|------|--------|-------|-------|-------|------|
| Master L2 | 19 | | | | □ |
| Master L3 | 73 | | | | □ |
| Master FM | 21 | | | | □ |
| Master FC | 90 | | | | □ |
| Master FE | 20 | | | | □ |
| Master FL | 49 | | | | □ |
| Master RA | 49 | | | | □ |
| Family FL | 49 | | | | □ |
| Part FL | 49 | | | | □ |
| FK 고아 | 0 | | | | □ |
| processChar 빈값 | 0 | | | | □ |
| CellId 충돌 | 0 | | | | □ |

- [ ] 1회차 전체 기준값 일치
- [ ] 2회차 전체 기준값 일치 (1회차와 동일)
- [ ] 3회차 전체 기준값 일치 (1·2회차와 동일)

### ✅ Phase 5 GATE (최종 성공 기준)

```
□ 3회 모두 건수 일치 (±0)
□ 3회 모두 FK 고아 = 0
□ 3회 모두 processChar 빈값 = 0
□ 3회 모두 CellId 충돌 = 0
□ 3회 모두 forge-verify ALL PASS
```

**→ 5개 모두 3회 연속 통과 = 시스템 완전 안정화 선언**

---

## 빠른 참조: 단계별 진행 판단표

| Phase | 핵심 조건 | GATE 실패 시 |
|-------|---------|------------|
| **0** | DB 0건, 파일 6개 | 환경 재설정 |
| **1** | FK 역조회 0건 + forge-verify PASS | **Master 코드 수정** (Family 진행 금지) |
| **2** | 건수 Master와 동일 + 재매핑 확인 | remap 로직 수정 |
| **3** | 건수 Family와 동일 + CP/PFD 생성 | 상속 로직 수정 |
| **4** | E2E 9개 PASS + placeholder 0건 | UI 버그 수정 |
| **5** | 3회 연속 동일 결과 | 재현성 버그 수정 |

---

## 체크리스트 사용법

1. Forge 실행 전 이 파일을 로드
2. 각 Phase 시작 시 해당 섹션의 체크박스를 순서대로 확인
3. GATE 항목 중 1개라도 미통과 → 다음 Phase 진행 금지, 문제 먼저 해결
4. Phase 5 GATE 완전 통과 후 → `FMEA_REBUILD_MASTER.md` 버전 올리고 완료 선언

*작성: 2026-03-25 | 다음 갱신: Phase 1 GATE 통과 후*