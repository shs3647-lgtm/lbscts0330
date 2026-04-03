# Phase 4 검증 결과 보고서

> 작성일: 2026-04-03  
> 검증 대상: Phase 3 Import 파이프라인 재설계 + 로컬 `pfm26-m002` (스키마 `pfmea_pfm26_m002`)  
> dev 서버: `http://127.0.0.1:3000` 가동 전제 (API 호출)

---

## 1. Step 1 — RA 고아 1건 (식별 → **삭제 적용 완료**)

### 1-1 `POST /api/fmea/repair-fk` `dryRun: true`

| 항목 | 값 |
|------|-----|
| success | true |
| messages | `[dryRun] RiskAnalysis 고아 삭제 예정 1건` |

### 1-2 `GET /api/fmea/validate-fk?fmeaId=pfm26-m002`

| check | status | detail |
|--------|--------|--------|
| orphanRiskAnalyses | ERROR | `RA FC-R35-RA: linkId=FC-R35` |

### 1-3 프로젝트 스키마 직접 조회 (고아 RA 행)

`risk_analyses` 중 `linkId`가 `failure_links`에 없는 행:

| id | linkId | severity | occurrence | detection |
|----|--------|----------|------------|-----------|
| FC-R35-RA | FC-R35 | 0 | 4 | 2 |

**해석**: `linkId` 값 `FC-R35`는 UUID 형식의 `failure_links.id`가 아니며, 해당 id의 FL 레코드가 존재하지 않음 → **RA.linkId → FL 고아 1건**과 일치.

### 1-4 고아 RA 삭제 적용 (승인 후 실행)

`POST /api/fmea/repair-fk` Body: `{"fmeaId":"pfm26-m002","dryRun":false}`

| 항목 | 값 |
|------|-----|
| success | true |
| deletedRiskAnalysisIds | `["FC-R35-RA"]` |
| deletedFailureLinkIds | `[]` |
| deletedOptimizationIds | `[]` |
| messages | `RiskAnalysis FK 고아 삭제 1건` |
| `validate-fk` **after** | **allGreen: true**, orphanRiskAnalyses OK |

---

## 2. Step 2 — `GET /api/fmea/pipeline-verify?fmeaId=pfm26-m002`

### 2-1 고아 RA 정리 **전** (기록 보관)

| step | name | status | 요약 |
|------|------|--------|------|
| 0 | 구조 | ok | L2=19, L3=119, L1F=16 |
| 1 | UUID | ok | FM=22, FE=16, FC=119, **FL=127, RA=128** |
| 2 | fmeaId | ok | 총 708 records, mismatch 0 |
| 3 | FK | **error** | totalOrphans=1 — RA.linkId→FL 고아 1건 |
| 4 | 누락 | warn | S 미입력 67건 (범위 외) |

### 2-2 고아 RA 정리 **후** (2026-04-03, 삭제 직후)

| step | name | status | 요약 |
|------|------|--------|------|
| 0 | 구조 | ok | L2=19, L3=119, L1F=16 |
| 1 | UUID | ok | FM=22, FE=16, FC=119, **FL=127, RA=127** |
| 2 | fmeaId | ok | 총 **707** records, mismatch 0 |
| 3 | FK | **ok** | **totalOrphans=0**, RA.linkId→FL valid **127/127** |
| 4 | 누락 | warn | S 미입력 **66건** (범위 외) |

- **allGreen**: 여전히 **false** (Step 4 warn — S 미입력만 남음).  
- **FK 목표**: Step 3 **ok** 로 달성 (고아 0, FL=RA=127).

---

## 3. Step 3 — 엣지케이스 (DB 쿼리, 스키마 `pfmea_pfm26_m002`)

Prisma/DB 컬럼명은 문서 초안의 `parentItemId`가 아니라 **`parentId`** (`l2_functions`, `failure_modes`, `failure_causes`).  
FM의 공정기능(FN_L2) 연결은 **`l2FuncId`** → `l2_functions.id`.

### 3-1 동일 FN_L2(`l2FuncId`)에 FM 2건 이상

```sql
SELECT "l2FuncId", COUNT(*)::int AS cnt
FROM "pfmea_pfm26_m002".failure_modes
WHERE "fmeaId" = 'pfm26-m002'
GROUP BY "l2FuncId"
HAVING COUNT(*) > 1;
```

**결과**: **0행** (해당 스냅샷에서는 “동일 FN_L2에 FL_FM 2건 이상” 패턴 없음).

### 3-2 동일 `mode` 텍스트, 서로 다른 `l2FuncId`

```sql
SELECT mode, COUNT(DISTINCT "l2FuncId")::int AS parent_cnt
FROM "pfmea_pfm26_m002".failure_modes
WHERE "fmeaId" = 'pfm26-m002'
GROUP BY mode
HAVING COUNT(DISTINCT "l2FuncId") > 1;
```

**결과**:

| mode | parent_cnt |
|------|------------|
| Wafer 표면 이물 잔류 (Particle 오염) | 4 |
| Wafer 정렬 불량 | 2 |

### 3-3 `parentId` IS NULL 카운트

```sql
SELECT 'FN_L2' AS entity, COUNT(*)::bigint AS cnt
FROM "pfmea_pfm26_m002".l2_functions WHERE "fmeaId" = 'pfm26-m002' AND "parentId" IS NULL
UNION ALL
SELECT 'FL_FM', COUNT(*) FROM "pfmea_pfm26_m002".failure_modes WHERE "fmeaId" = 'pfm26-m002' AND "parentId" IS NULL
UNION ALL
SELECT 'FL_FC', COUNT(*) FROM "pfmea_pfm26_m002".failure_causes WHERE "fmeaId" = 'pfm26-m002' AND "parentId" IS NULL;
```

**결과**: FN_L2=0, FL_FM=0, FL_FC=0.

---

## 4. Step 4 — 워크시트(WS) 육안 / 브라우저

- **브라우저 검증 필요 — 기획자 수동 확인 대기**
- 항목: FL 누락·중복 행·FE-FM-FC 연결·SOD/AP 표시 (문서 `Import 파이프라인 재설계 검증.md` 검증 4)

---

## 5. 자동 테스트 (참고, 이미 통과)

- `npm run verify:all` — tsc + `test:import-slice`(66) + 파이프라인 Vitest 묶음(60) + import FE 레이아웃 스크립트 PASS (2026-04-03 이전 세션 기준).

---

## 6. 최종 정리

| 항목 | 내용 |
|------|------|
| Phase 3 코드 효과 | 단위/통합 자동 검증 구간 PASS |
| 로컬 DB | 고아 RA **`FC-R35-RA` 삭제 완료** (`repair-fk` 실적용) |
| `validate-fk` | **allGreen: true** |
| `pipeline-verify` Step 3 (FK) | **ok**, totalOrphans=0, FL=RA=127 |
| S 미입력 | warn 66건 — 이번 Phase 4 범위 외 (`allGreen` false 원인) |
| Rule 2(WS 렌더) | 변경 없음; WS는 수동 확인 대기 |
