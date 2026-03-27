# FC 복수 DB 중심 FK 꽂아넣기 프로세스 설계서

> **최종 업데이트**: 2026-03-21
> **목적**: 고장사슬(FailureLink) 완성 → DB 저장 → Import Excel 생성 → 프로젝트 생성 → 워크시트 렌더링까지 전체 파이프라인의 **DB FK 중심 설계**를 정의한다.
> **핵심 원칙**: 모든 엔티티는 PostgreSQL Atomic DB의 FK로 연결되며, 고아 엔티티는 구조적으로 불가능하다.

---

## 1. 전체 프로세스 흐름

비유: **회사의 조직도(DB)**가 유일한 진실이고, 명함(Excel)은 조직도에서 자동 인쇄된다. 명함을 보고 조직도를 만드는 게 아니라, 조직도가 먼저 완성되고 명함이 따라간다.

```
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 1: 고장사슬 완성 (워크시트 UI)                            │
│                                                                 │
│  사용자가 FM↔FE↔FC 연결 확정                                     │
│  • 1 FC → N FM 복수 연결 지원                                    │
│  • syncFailureLinksFromState() → DB-only FL 보존                │
│  • POST /api/fmea → FailureLink deleteAll + createMany          │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 2: DB 저장 (PostgreSQL Atomic DB — SSoT)                 │
│                                                                 │
│  FailureLink 테이블 (107행, m002 기준)                           │
│  ┌──────────┬──────────┬──────────┬──────────┐                  │
│  │ id       │ fmId(FK) │ feId(FK) │ fcId(FK) │                  │
│  ├──────────┼──────────┼──────────┼──────────┤                  │
│  │ FL-001   │ FM-01    │ FE-01    │ FC-01    │  ← 1:1:1         │
│  │ FL-002   │ FM-02    │ FE-01    │ FC-01    │  ← 같은 FC, 다른 FM│
│  │ FL-003   │ FM-01    │ FE-02    │ FC-02    │                  │
│  └──────────┴──────────┴──────────┴──────────┘                  │
│  @@unique([fmeaId, fmId, feId, fcId])                           │
│                                                                 │
│  RiskAnalysis 테이블 (1:1 with FailureLink)                     │
│  ┌──────────┬─────┬─────┬─────┬──────────┬──────────┐          │
│  │ linkId   │  S  │  O  │  D  │ DC       │ PC       │          │
│  ├──────────┼─────┼─────┼─────┼──────────┼──────────┤          │
│  │ FL-001   │  5  │  3  │  4  │ 방법A    │ SPC관리  │          │
│  │ FL-002   │  7  │  4  │  3  │ 방법B    │ 교육관리 │          │
│  └──────────┴─────┴─────┴─────┴──────────┴──────────┘          │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 3: Import Excel 생성 (DB → 6시트 Excel)                  │
│                                                                 │
│  reverseExtract(prisma, fmeaId) → FullAtomicDB                  │
│  atomicToChainRows(FullAtomicDB) → ChainRow[]                   │
│  generateImportExcelFromDB(prisma, fmeaId) → .xlsx              │
│                                                                 │
│  시트 구성:                                                      │
│  ┌─ L1 통합(C1-C4) ── 구분, 제품기능, 요구사항, 고장영향         │
│  ├─ L2 통합(A1-A6) ── 공정번호, 공정명, 기능, 제품특성, FM, DC   │
│  ├─ L3 통합(B1-B5) ── 공정번호, 4M, WE, 기능, PC특성, FC, PC    │
│  ├─ FC 고장사슬 ───── FE, FM, FC, PC, DC, S/O/D, AP (107행)    │
│  ├─ FA 통합분석 ───── 26컬럼 전체 매핑 (107행)                   │
│  └─ VERIFY ────────── 검증 수식                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 4: 프로젝트 생성 (Master → Project 복제)                  │
│                                                                 │
│  방법 A: DB 직접 복제 (권장)                                     │
│    reverseExtract(source) → remapFmeaId(target)                 │
│    → saveAtomicDBInTransaction(remapped)                        │
│    → 13개 테이블 원자적 INSERT                                   │
│                                                                 │
│  방법 B: Excel re-import                                        │
│    Excel 파싱 → import-builder → buildWorksheetState            │
│    → migrateToAtomicDB → save-from-import                      │
│                                                                 │
│  두 방법 모두 동일한 Atomic DB 생성 (Round-trip 검증 완료)       │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 5: 파싱 규칙 + UUID/FK 생성                               │
│                                                                 │
│  Excel → ImportedFlatData[] (A1~C4, 15개 코드)                  │
│  → StepBFCChain[] (FC시트에서 FailureLink별 PC/DC/SOD)          │
│  → failureChainInjector (riskData[prevention-*] 직접 저장)      │
│  → migrateToAtomicDB (Legacy → Atomic 변환)                     │
│                                                                 │
│  UUID 생성 규칙:                                                 │
│  ┌──────────┬──────────────────────────────┐                    │
│  │ genA1    │ PF-{pno}                     │                    │
│  │ genA5    │ PF-{pno}-FM-{seq}            │                    │
│  │ genB1    │ PF-{pno}-{m4}-{seq}          │                    │
│  │ genB2    │ PF-{pno}-{m4}-{seq}-G-{fIdx} │ ← funcIdx 지원    │
│  │ genB4    │ PF-{pno}-{m4}-{seq}-K-{seq}  │                    │
│  │ genC4    │ PF-{div}-C4-{seq}            │                    │
│  └──────────┴──────────────────────────────┘                    │
│                                                                 │
│  FK 생성 규칙:                                                   │
│  ┌──────────────────────────────────────────┐                   │
│  │ L3.l2Id        → L2Structure.id          │                   │
│  │ L3Function.l3StructId → L3Structure.id   │                   │
│  │ FC.l3FuncId    → L3Function.id           │                   │
│  │ FC.l2StructId  → L2Structure.id          │                   │
│  │ FM.l2StructId  → L2Structure.id          │                   │
│  │ FE.l1FuncId    → L1Function.id           │                   │
│  │ FL.fmId        → FailureMode.id          │                   │
│  │ FL.feId        → FailureEffect.id        │                   │
│  │ FL.fcId        → FailureCause.id         │                   │
│  │ RA.linkId      → FailureLink.id          │                   │
│  └──────────────────────────────────────────┘                   │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 6: 검증 (pipeline-verify 5단계)                           │
│                                                                 │
│  STEP 0 구조  : L1/L2/L3 존재, 모자관계 검증                    │
│  STEP 1 UUID  : 13개 테이블 카운트, 중복 UUID, orphan L3F       │
│  STEP 2 fmeaId: 전체 레코드 fmeaId 일치                         │
│  STEP 3 FK    : 14개 FK 전수 검증, broken FL 0건                │
│  STEP 4 누락  : emptyPC=0, orphanPC=0, nullDC=0, nullPC=0      │
│                                                                 │
│  PASS 기준: allGreen=true (warn 허용: L3F WE ≤ 2건)             │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 7: 워크시트 렌더링 (DB → 화면)                            │
│                                                                 │
│  useWorksheetDataLoader                                         │
│    → loadAtomicDB(fmeaId)       // GET /api/fmea               │
│    → atomicToLegacy(atomicDB)   // Atomic → Legacy 변환         │
│    → setStateSynced(state)      // React 렌더링                 │
│                                                                 │
│  워크시트 탭별 렌더링:                                           │
│  ┌─ 구조분석(1L/2L/3L) : L1/L2/L3 Structure 표시               │
│  ├─ 기능분석(1L/2L/3L) : L1/L2/L3 Function 표시                │
│  ├─ 리스크분석(1L/2L/3L) : FE/FM/FC 표시, 누락 0건 필수          │
│  ├─ 고장연결(FC)       : FM↔FE↔FC 연결표, 복수 FM 표시          │
│  ├─ 위험분석(RA)       : S/O/D/AP + DC/PC 표시                 │
│  └─ 전체보기(ALL)      : 26컬럼 통합 뷰                         │
│                                                                 │
│  누락 판정 기준 (FailureL3Tab.tsx):                              │
│  processChar가 있는 L3Function에 FC가 0건 → "누락"              │
│  ★ 3중 가드로 고아 L3Function = 0 보장                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 복수 FM↔FC 연결 데이터 모델

```
FailureMode (FM)      FailureEffect (FE)     FailureCause (FC)
┌──────────┐          ┌──────────┐           ┌──────────┐
│ FM-01    │          │ FE-01    │           │ FC-01    │
│ 파티클초과│          │ 패턴불량  │           │ 숙련도부족│
└────┬─────┘          └────┬─────┘           └────┬─────┘
     │                     │                      │
     │    FailureLink      │                      │
     │    ┌────────────────┐│                      │
     ├───→│ FL-001: FM-01 ←┼──── FE-01 ←──── FC-01│ ← 기본 연결
     │    └────────────────┘                      │
     │                                            │
┌────┴─────┐                                      │
│ FM-02    │    ┌────────────────┐                 │
│ Lot혼입  ├───→│ FL-002: FM-02 ←── FE-01 ←── FC-01│ ← 같은 FC, 다른 FM
└──────────┘    └────────────────┘

각 FailureLink는 독립적인 RiskAnalysis를 가짐:
FL-001 → RA: S=5, O=3, D=4, DC="방법A", PC="SPC관리"
FL-002 → RA: S=7, O=4, D=3, DC="방법B", PC="교육관리"
```

---

## 3. 3중 가드 — 고아 L3Function 방지

비유: 3중 잠금장치. 1차 자물쇠(Import)에서 막고, 만약 뚫려도 2차(Migration)에서 막고, 최종 3차(DB 저장)에서 절대 통과시키지 않는다.

```
Import 파싱 (buildWorksheetState)
  │
  ├─ [가드 1] processChar pruning
  │   FC가 연결되지 않은 processChar 제거
  │   → 고아 L3Function 후보 원천 차단
  │
  ▼
Migration (migrateToAtomicDB)
  │
  ├─ [가드 2] orphan L3F 제거
  │   FC처리 완료 후, FC없는 L3Function 삭제
  │   (단, WE의 유일한 L3F면 수동모드용 보존)
  │
  ▼
DB 저장 (saveAtomicDBInTransaction)
  │
  ├─ [가드 3] pre-save auto-prune (최후방어선)
  │   CREATE 직전, FC없는 L3Function 자동 제거
  │   console.warn 로그 출력
  │
  ▼
PostgreSQL Atomic DB ← 고아 L3Function = 0 보장
```

---

## 4. PC(예방관리) 데이터 흐름

```
FC 고장사슬 시트
  │ chain.pcValue = "SPC 관리"
  ▼
failureChainInjector.ts (L254)
  │ riskData[`prevention-${fmId}-${fcId}`] = chain.pcValue
  │ ★ FC시트가 PC의 PRIMARY SOURCE
  ▼
save-from-import/route.ts (L231-248)
  │ B5 flatData → riskData 보충 (SECONDARY, 안전망)
  │ FC시트에 PC 없을 때만 L3시트 B5에서 보충
  ▼
RiskAnalysis.preventionControl = riskData[`prevention-${uk}`]
```

DC(검출관리)도 동일 경로:
- FC시트 `chain.dcValue` → `riskData[detection-*]` (PRIMARY)
- L2시트 A6 → 보충 (SECONDARY)

---

## 5. 골든 베이스라인 (m002, 2026-03-21)

| 엔티티 | 수량 | 비고 |
|--------|------|------|
| L2 Structure | 21 | 공정 |
| L3 Structure | 91 | 작업요소 |
| L1 Function | 17 | YP:8, SP:6, USER:3 |
| L2 Function | 26 | 공정기능 |
| L3 Function | 99~101 | 요소기능 (변동 허용) |
| FailureMode | 26 | 고장형태 |
| FailureEffect | 20 | 고장영향 |
| FailureCause | 100 | 고장원인 |
| FailureLink | 107 | 고장사슬 (복수 FM 포함) |
| RiskAnalysis | 107 | 1:1 with FL |
| DC | 107/107 | 빈값 0건 |
| PC | 107/107 | 빈값 0건 |

### 복수 FM 연결 현황

| FC | FM1 | FM2 | 공정 |
|----|-----|-----|------|
| 자재 품질 부적합 | 두께 규격 이탈 | TTV 규격 초과 | IQA |
| 환경 조건 이탈 | 두께 규격 이탈 | TTV 규격 초과 | IQA |
| 광학 해상도 부적합 | 두께 규격 이탈 | TTV 규격 초과 | IQA |
| 작업 숙련도 부족 | Wafer 정렬 불량 | OCR ID 오인식 | Sorter |
| 정렬 센서 오작동 | Wafer 정렬 불량 | OCR ID 오인식 | Sorter |
| 자재 품질 부적합 | Wafer 정렬 불량 | OCR ID 오인식 | Sorter |
| 환경 조건 이탈 | Wafer 정렬 불량 | OCR ID 오인식 | Sorter |

---

## 6. 검증 체크리스트

### 프로젝트 생성 후 필수 검증

```
[ ] 1. tsc --noEmit → 0 errors
[ ] 2. pipeline-verify GET → allGreen (warn ≤ 2)
[ ] 3. 워크시트 3L 리스크분석 → 누락 0건
[ ] 4. FC 고장사슬 시트 → FL 수 = DB FL 수
[ ] 5. DC/PC → 빈값 0건
[ ] 6. Round-trip: DB→Excel→재Import→DB = 동일 카운트
```

### Playwright 자동 검증 (3회 반복)

```
R1-1: 워크시트 페이지 로드 (table 렌더링 확인)
R1-2: API 골든 베이스라인 (13개 엔티티 카운트)
R1-3: 파이프라인 STEP0~4 OK
R1-4: 고장연결 탭 콘텐츠 표시
R1-5: 역설계 엑셀 다운로드 (size > 10KB)
```
