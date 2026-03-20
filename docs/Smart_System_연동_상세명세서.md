# Smart System 연동 상세명세서

> **v1.0.0** | 2026-03-18 | FMEA ↔ CP ↔ PFD 완전 연동 설계

---

## 1. 설계 원칙

> **FMEA 등록 = 3문서(FMEA+CP+PFD)의 집 생성**
> **Import = 집에 데이터 채우기**
> **sync-cp-pfd = FMEA 데이터를 CP/PFD 집에 꽂아넣기**
> **화면 이동 = 같은 집의 다른 방으로 이동**

### 1.1 핵심 불변량

| ID | 규칙 | 위반 시 |
|----|------|--------|
| **SSI-01** | FMEA 등록 시 CP+PFD 등록정보가 동시 생성되며, 3문서는 TripletGroup으로 묶인다 | 연동 단절 |
| **SSI-02** | FmeaRegistration.linkedCpNo/linkedPfdNo에 TripletGroup의 cpId/pfdId가 저장된다 | 다른 문서로 이동 |
| **SSI-03** | sync-cp-pfd는 FmeaRegistration.linkedPfdNo를 최우선으로 사용한다 (findFirst 금지) | 잘못된 PFD 선택 |
| **SSI-04** | CP/PFD 워크시트 저장 시 FMEA FK를 반드시 보존한다 | FK 손실 |
| **SSI-05** | 화면 이동(FMEA→CP→PFD)은 동일 TripletGroup 내에서만 발생한다 | 다른 프로젝트 이동 |

---

## 2. 3문서 생명주기

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Phase 1: 등록 (TripletGroup 생성)                                       │
│                                                                         │
│   POST /api/triplet/create                                              │
│   ├── TripletGroup { pfmeaId, cpId, pfdId } 생성                        │
│   ├── FmeaProject + FmeaRegistration { linkedCpNo=cpId, linkedPfdNo=pfdId } │
│   ├── CpRegistration { cpNo=cpId, fmeaId=pfmeaId, linkedPfdNo=pfdId }  │
│   └── PfdRegistration { pfdNo=pfdId, fmeaId=pfmeaId, linkedCpNos=[cpId] } │
│                                                                         │
│   결과: 3문서의 "빈 집" 생성, 모든 연동 ID 확정                          │
└──────────────────────────┬──────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Phase 2: FMEA Import (Atomic DB 채우기)                                 │
│                                                                         │
│   POST /api/fmea/save-from-import { fmeaId, flatData }                 │
│   ├── $transaction 내에서:                                               │
│   │   ├── L1/L2/L3 Structure 생성 (확정 UUID)                           │
│   │   ├── L1/L2/L3 Function 생성 (확정 UUID)                            │
│   │   ├── ProcessProductChar 생성 (A4 제품특성)                          │
│   │   ├── FailureMode/Effect/Cause 생성                                  │
│   │   ├── FailureLink 생성 (FM↔FE↔FC FK 확정)                           │
│   │   └── RiskAnalysis 생성 (SOD + DC/PC)                               │
│   │                                                                      │
│   결과: FMEA Atomic DB 완성 (SSoT)                                      │
└──────────────────────────┬──────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Phase 3: sync-cp-pfd (FK 꽂아넣기)                                      │
│                                                                         │
│   POST /api/fmea/sync-cp-pfd { fmeaId }                                │
│   ├── STEP 1: buildCpPfdSkeleton() — FMEA Atomic → 설계도               │
│   ├── STEP 2: validateFkDoors() — FK 존재 확인                           │
│   └── STEP 3: $transaction — CP/PFD items INSERT                        │
│                                                                         │
│   CP 번호: FmeaRegistration.linkedCpNo (최우선)                          │
│   PFD 번호: FmeaRegistration.linkedPfdNo (최우선)                        │
│                                                                         │
│   결과: CP items에 productCharId/linkId/processCharId FK 설정            │
│         PFD items에 fmeaL2Id/fmeaL3Id/productCharId FK 설정              │
└──────────────────────────┬──────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Phase 4: 화면 이동 (같은 집의 다른 방)                                   │
│                                                                         │
│   FMEA → CP: /control-plan/worksheet?cpNo={linkedCpNo}                  │
│   FMEA → PFD: /pfd/worksheet?pfdNo={linkedPfdNo}                        │
│   CP → FMEA: /pfmea/worksheet?id={fmeaId}                              │
│   CP → PFD: /pfd/worksheet?pfdNo={linkedPfdNo}                          │
│   PFD → FMEA: /pfmea/worksheet?id={fmeaId}                             │
│   PFD → CP: /control-plan/worksheet?cpNo={cpNo}                         │
│                                                                         │
│   모든 ID는 TripletGroup에서 확정된 동일 세트                             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. ID 체계 (Numbering Convention)

| 문서 | 패턴 | 예시 | 생성 시점 |
|------|------|------|----------|
| TripletGroup | `tg{YY}-{type}{serial}` | `tg26-m001` | Triplet 생성 |
| PFMEA | `pfm{YY}-{type}{serial}` | `pfm26-m066` | Triplet 생성 |
| CP | `cp{YY}-{type}{serial}` | `cp26-m066` | Triplet 생성 |
| PFD | `pfd{YY}-{type}{serial}` | `pfd26-m066` | Triplet 생성 |

**핵심**: 동일 Triplet의 3문서는 같은 serial 번호를 공유해야 한다.

---

## 4. DB 테이블 + FK 전체 지도

### 4.1 등록 단계 DB

| 테이블 | PK | 주요 FK | 생성 시점 |
|--------|-----|---------|----------|
| `triplet_groups` | id (tg26-m066) | pfmeaId, cpId, pfdId | 등록 |
| `fmea_projects` | fmeaId | tripletGroupId | 등록 |
| `fmea_registrations` | fmeaId | linkedCpNo→cpNo, linkedPfdNo→pfdNo | 등록 |
| `cp_registrations` | cpNo | fmeaId, linkedPfdNo, tripletGroupId | 등록 |
| `pfd_registrations` | pfdNo | fmeaId, linkedCpNos, tripletGroupId | 등록 |

### 4.2 FMEA Atomic DB (Import 단계)

| 테이블 | PK | 주요 FK | 생성 시점 |
|--------|-----|---------|----------|
| `l1_structure` | UUID | fmeaId | Import |
| `l2_structure` | UUID | fmeaId, l1Id | Import |
| `l3_structure` | UUID | fmeaId, l2Id | Import |
| `l1_function` | UUID | l1StructId | Import |
| `l2_function` | UUID | l2StructId | Import |
| `l3_function` | UUID | l3StructId, l2StructId | Import |
| `process_product_char` | UUID | fmeaId, l2StructId | Import |
| `failure_mode` | UUID | fmeaId, l2StructId, productCharId | Import |
| `failure_effect` | UUID | fmeaId, l1FuncId | Import |
| `failure_cause` | UUID | fmeaId, l3StructId, l3FuncId | Import |
| `failure_link` | UUID | fmeaId, fmId, feId, fcId | Import |
| `risk_analysis` | UUID | fmeaId, linkId | Import |

### 4.3 CP/PFD 워크시트 DB (sync 단계)

| 테이블 | PK | FMEA FK | 생성 시점 |
|--------|-----|---------|----------|
| `control_plans` | UUID | fmeaId, linkedPfmeaNo, linkedPfdNo | sync-cp-pfd |
| `control_plan_items` | UUID | productCharId, linkId, processCharId, pfmeaProcessId | sync-cp-pfd |
| `pfd_items` | UUID | fmeaL2Id, fmeaL3Id, productCharId | sync-cp-pfd |
| `unified_process_items` | UUID | fmeaL2Id, fmeaL3Id | 저장 시 |

### 4.4 FK 의존성 그래프

```
TripletGroup
 ├── pfmeaId ─────→ FmeaProject.fmeaId
 │                   └── FmeaRegistration
 │                        ├── linkedCpNo ──→ CpRegistration.cpNo
 │                        └── linkedPfdNo ─→ PfdRegistration.pfdNo
 ├── cpId ────────→ CpRegistration.cpNo
 │                   └── ControlPlan.cpNo
 │                        └── ControlPlanItem
 │                             ├── productCharId ──→ ProcessProductChar.id
 │                             ├── linkId ─────────→ FailureLink.id
 │                             ├── processCharId ──→ L3Function.id
 │                             └── pfmeaProcessId ─→ L2Structure.id
 └── pfdId ───────→ PfdRegistration.pfdNo
                     └── PfdItem
                          ├── fmeaL2Id ────→ L2Structure.id
                          ├── fmeaL3Id ────→ L3Structure.id
                          └── productCharId → ProcessProductChar.id
```

---

## 5. API 전체 목록

### 5.1 등록 API

| API | Method | 역할 |
|-----|--------|------|
| `/api/triplet/create` | POST | 3문서 동시 등록 |
| `/api/fmea/projects` | POST | FMEA 단독 등록/수정 |

### 5.2 Import API

| API | Method | 역할 |
|-----|--------|------|
| `/api/fmea/save-from-import` | POST | Excel → Atomic DB 저장 |
| `/api/fmea/pipeline-verify` | GET/POST | 6단계 파이프라인 검증 |
| `/api/fmea/rebuild-atomic` | POST | Atomic DB 재구축 |

### 5.3 연동 API

| API | Method | 역할 |
|-----|--------|------|
| `/api/fmea/sync-cp-pfd` | POST | FMEA → CP + PFD FK 꽂아넣기 |
| `/api/fmea/cp-pfd-verify` | GET/POST | CP/PFD FK 정합성 검증 |
| `/api/control-plan/[id]/items` | GET/PUT | CP 워크시트 CRUD (FK 보존) |
| `/api/pfd/[id]/items` | POST/PUT | PFD 워크시트 CRUD (FK 보존) |

### 5.4 화면 이동 URL

| From → To | URL |
|-----------|-----|
| FMEA → CP | `/control-plan/worksheet?cpNo={linkedCpNo}` |
| FMEA → PFD | `/pfd/worksheet?pfdNo={linkedPfdNo}` |
| CP → FMEA | `/pfmea/worksheet?id={fmeaId}` |
| CP → PFD | `/pfd/worksheet?pfdNo={linkedPfdNo}` |
| PFD → FMEA | `/pfmea/worksheet?id={fmeaId}` |
| PFD → CP | `/control-plan/worksheet?cpNo={cpNo}` |

---

## 6. 발견된 버그 및 수정

| # | 버그 | 근본 원인 | 수정 |
|---|------|----------|------|
| BUG-SSI-01 | Master Triplet에서 FmeaRegistration.linkedCpNo/linkedPfdNo가 null | createMasterTriplet에서 미설정 | FIX-SSI-01 |
| BUG-SSI-02 | sync-cp-pfd가 잘못된 PFD 선택 (pfd26-m065) | findFirst 비결정론적 | FIX-SSI-02 |
| BUG-SSI-03 | sync-cp-pfd가 잘못된 CP 선택 가능 | findFirst 비결정론적 | FIX-SSI-03 |
| BUG-SSI-04 | Triplet에서 ProjectLinkage 미생성 | Triplet 트랜잭션에 미포함 | FIX-SSI-04 |
| BUG-SSI-05 | cp-pfd-verify에서 중복 문서 구분 불가 | TripletGroup 미활용 | (검증 API 개선) |

---

## 7. 검증 체크리스트

### 7.1 등록 후 검증

| # | 항목 | PASS 기준 |
|---|------|-----------|
| R-01 | TripletGroup 생성 | pfmeaId, cpId, pfdId 모두 non-null |
| R-02 | FmeaRegistration.linkedCpNo | = TripletGroup.cpId |
| R-03 | FmeaRegistration.linkedPfdNo | = TripletGroup.pfdId |
| R-04 | CpRegistration.fmeaId | = TripletGroup.pfmeaId |
| R-05 | PfdRegistration.fmeaId | = TripletGroup.pfmeaId |

### 7.2 Import 후 검증

| # | 항목 | PASS 기준 |
|---|------|-----------|
| I-01 | pipeline-verify allGreen | = true |
| I-02 | L2 Structure | > 0 |
| I-03 | FailureLink | > 0 |
| I-04 | RiskAnalysis | = FailureLink count |

### 7.3 sync-cp-pfd 후 검증

| # | 항목 | PASS 기준 |
|---|------|-----------|
| S-01 | cp-pfd-verify allGreen | = true |
| S-02 | CP items totalOrphans | = 0 |
| S-03 | PFD items totalOrphans | = 0 |
| S-04 | CP cpNo = FmeaRegistration.linkedCpNo | 일치 |
| S-05 | PFD pfdNo = FmeaRegistration.linkedPfdNo | 일치 |

### 7.4 화면 이동 검증

| # | 항목 | PASS 기준 |
|---|------|-----------|
| N-01 | FMEA → CP 이동 시 올바른 CP | cpNo 일치 |
| N-02 | FMEA → PFD 이동 시 올바른 PFD | pfdNo 일치 |
| N-03 | CP → FMEA 이동 시 올바른 FMEA | fmeaId 일치 |
| N-04 | CP → PFD 이동 시 올바른 PFD | pfdNo 일치 |
| N-05 | PFD → CP 이동 시 올바른 CP | cpNo 일치 |
| N-06 | PFD → FMEA 이동 시 올바른 FMEA | fmeaId 일치 |
