# FMEA ↔ CP ↔ PFD 통합 FK 명세서

> **v1.0.0** | 2026-03-18 | Single Source of Truth

---

## 1. 아키텍처 개요

```
┌──────────────────────────────────────────────────────────────────┐
│                    TripletGroup (M/F/P 세트)                     │
│  pfmeaId ─── cpId ─── pfdId (프로젝트 생성 시 3문서 ID 확정)     │
└───────────────┬──────────────────────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────────────────┐
│                  FMEA Atomic DB (SSoT — 유일한 진실)              │
│                                                                   │
│  L1Structure → L1Function → FailureEffect                        │
│  L2Structure → L2Function → FailureMode → ProcessProductChar     │
│  L3Structure → L3Function → FailureCause                         │
│  FailureLink (FM↔FE↔FC FK 확정)                                  │
│  RiskAnalysis (SOD + DC/PC)                                      │
└───────────────┬────────────────────┬─────────────────────────────┘
                │                    │
     ┌──────────▼──────────┐  ┌──────▼──────────────┐
     │   ControlPlanItem   │  │      PfdItem         │
     │   (CP 워크시트 행)   │  │   (PFD 워크시트 행)  │
     │                     │  │                      │
     │ FK: productCharId   │  │ FK: fmeaL2Id         │
     │ FK: processCharId   │  │ FK: fmeaL3Id         │
     │ FK: linkId          │  │ FK: productCharId    │
     │ FK: pfmeaProcessId  │  │ FK: cpItemId         │
     │ FK: pfmeaWorkElemId │  │ FK: unifiedItemId    │
     └──────────┬──────────┘  └──────┬───────────────┘
                │                    │
     ┌──────────▼────────────────────▼───────────────┐
     │         UnifiedProcessItem (공유 공정 행)      │
     │  FK: fmeaL2Id, fmeaL3Id, projectLinkageId     │
     └───────────────────────────────────────────────┘
```

---

## 2. FK 관계 전수 목록

### 2.1 ControlPlanItem → FMEA Atomic DB

| # | FK 필드 | 참조 테이블.필드 | 의미 | NULL 허용 | 설정 시점 |
|---|---------|-----------------|------|-----------|----------|
| FK-CP-01 | `cpId` | ControlPlan.id | 소속 CP | NOT NULL | CP 생성 시 |
| FK-CP-02 | `pfmeaProcessId` | L2Structure.id | 공정 | NULL | sync-cp-pfd |
| FK-CP-03 | `pfmeaWorkElemId` | L3Structure.id | 작업요소 | NULL | sync-cp-pfd |
| FK-CP-04 | `productCharId` | ProcessProductChar.id | 제품특성 | NULL | sync-cp-pfd |
| FK-CP-05 | `processCharId` | L3Function.id | 공정특성 | NULL | sync-cp-pfd |
| FK-CP-06 | `linkId` | FailureLink.id | 고장사슬 | NULL | sync-cp-pfd |
| FK-CP-07 | `unifiedItemId` | UnifiedProcessItem.id | 공유 공정 행 | NULL | 저장 시 |

### 2.2 PfdItem → FMEA Atomic DB

| # | FK 필드 | 참조 테이블.필드 | 의미 | NULL 허용 | 설정 시점 |
|---|---------|-----------------|------|-----------|----------|
| FK-PFD-01 | `pfdId` | PfdRegistration.id | 소속 PFD | NOT NULL | PFD 생성 시 |
| FK-PFD-02 | `fmeaL2Id` | L2Structure.id | 공정 | NULL | sync-cp-pfd |
| FK-PFD-03 | `fmeaL3Id` | L3Structure.id | 작업요소 | NULL | sync-cp-pfd |
| FK-PFD-04 | `productCharId` | ProcessProductChar.id | 제품특성 | NULL | sync-cp-pfd |
| FK-PFD-05 | `cpItemId` | ControlPlanItem.id | CP 행 참조 | NULL | sync-cp-pfd |
| FK-PFD-06 | `unifiedItemId` | UnifiedProcessItem.id | 공유 공정 행 | NULL | 저장 시 |

### 2.3 UnifiedProcessItem → FMEA Atomic DB

| # | FK 필드 | 참조 테이블.필드 | 의미 | NULL 허용 |
|---|---------|-----------------|------|-----------|
| FK-UPI-01 | `fmeaL2Id` | L2Structure.id | 공정 | NULL |
| FK-UPI-02 | `fmeaL3Id` | L3Structure.id | 작업요소 | NULL |
| FK-UPI-03 | `projectLinkageId` | ProjectLinkage.id | 프로젝트 연결 | NULL |

### 2.4 프로젝트 연결 (Registration)

| # | FK 필드 | 모델 | 참조 | 의미 |
|---|---------|------|------|------|
| FK-REG-01 | ControlPlan.fmeaId | ControlPlan | FmeaProject.fmeaId | FMEA 프로젝트 |
| FK-REG-02 | PfdRegistration.fmeaId | PfdRegistration | FmeaProject.fmeaId | FMEA 프로젝트 |
| FK-REG-03 | CpRegistration.fmeaId | CpRegistration | FmeaProject.fmeaId | FMEA 프로젝트 |
| FK-REG-04 | TripletGroup.pfmeaId | TripletGroup | FmeaProject.fmeaId | 3문서 세트 |
| FK-REG-05 | TripletGroup.cpId | TripletGroup | CpRegistration.cpNo | 3문서 세트 |
| FK-REG-06 | TripletGroup.pfdId | TripletGroup | PfdRegistration.pfdNo | 3문서 세트 |

---

## 3. 불변량 (Invariants)

| ID | 규칙 | 위반 시 |
|----|------|--------|
| INV-INT-01 | CP/PFD 워크시트 저장 시 기존 FK 필드(productCharId, linkId, processCharId, fmeaL2Id, fmeaL3Id)를 반드시 보존한다 | FK 손실 → FMEA 연동 단절 |
| INV-INT-02 | sync-cp-pfd가 설정한 FK는 사용자 편집 저장으로 절대 덮어쓰지 않는다 | 연동 무의미 |
| INV-INT-03 | UnifiedProcessItem은 CP/PFD 모두에서 참조되면 삭제하지 않는다 | 고아 참조 |
| INV-INT-04 | FMEA import 후 sync-cp-pfd를 실행하면 CP/PFD에 동일 FMEA FK가 설정된다 | 연동 불일치 |
| INV-INT-05 | TripletGroup 생성 시 pfmeaId, cpId, pfdId가 확정되면 3문서가 동일 프로젝트를 참조한다 | 프로젝트 불일치 |
| INV-INT-06 | ControlPlanItem.linkId가 설정된 행은 해당 FailureLink의 RiskAnalysis에서 SOD를 참조한다 | 위험분석 단절 |

---

## 4. 데이터 흐름 (Import → Sync → Save 파이프라인)

```
┌─────────────────────────────────────────────────────────────────────┐
│ Stage 1: FMEA Excel Import                                         │
│   Excel → save-from-import → Atomic DB (L1/L2/L3/FM/FE/FC/FL/RA)  │
│   ✅ FK 확정: FailureLink.fmId/feId/fcId                           │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Stage 2: sync-cp-pfd (FMEA → CP + PFD FK 꽂아넣기)                │
│   1. buildCpPfdSkeleton() — FMEA Atomic → 설계도 생성              │
│   2. validateFkDoors() — FK 존재 확인                               │
│   3. $transaction — CP/PFD items CREATE/UPDATE                      │
│   ✅ CP FK: productCharId, processCharId, linkId 설정               │
│   ✅ PFD FK: fmeaL2Id, fmeaL3Id, productCharId 설정                │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Stage 3: CP/PFD 워크시트 편집 + 저장                                │
│   사용자가 CP/PFD 워크시트에서 편집 후 저장                          │
│   ⚠️ FK 보존 필수: productCharId, linkId, processCharId 등          │
│   ⚠️ FMEA-originated FK는 읽기전용 — 사용자 편집 필드만 갱신         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. CP/PFD 워크시트 저장 시 FK 보존 규칙

### 5.1 ControlPlanItem 저장 (PUT /api/control-plan/[id]/items)

| 필드 | 동작 | 규칙 |
|------|------|------|
| `productCharId` | **보존** | 프론트엔드에서 전달된 값 사용, 없으면 기존 값 유지 |
| `processCharId` | **보존** | 프론트엔드에서 전달된 값 사용, 없으면 기존 값 유지 |
| `linkId` | **보존** | 프론트엔드에서 전달된 값 사용, 없으면 기존 값 유지 |
| `pfmeaProcessId` | **보존** | 프론트엔드에서 전달된 값 사용, 없으면 기존 값 유지 |
| `pfmeaWorkElemId` | **보존** | 프론트엔드에서 전달된 값 사용, 없으면 기존 값 유지 |
| `specTolerance` 등 | **편집** | 사용자 편집 가능 |

### 5.2 PfdItem 저장 (POST/PUT /api/pfd/[id]/items)

| 필드 | 동작 | 규칙 |
|------|------|------|
| `fmeaL2Id` | **보존** | 프론트엔드에서 전달된 값 사용 |
| `fmeaL3Id` | **보존** | 프론트엔드에서 전달된 값 사용 |
| `productCharId` | **보존** | 프론트엔드에서 전달된 값 사용 |
| `cpItemId` | **보존** | 프론트엔드에서 전달된 값 사용 |
| `processDesc` 등 | **편집** | 사용자 편집 가능 |

---

## 6. 검증 체크리스트

### 6.1 Import 후 검증 (FMEA → CP → PFD 전체)

| # | 검증 항목 | PASS 기준 |
|---|----------|-----------|
| V-01 | FMEA pipeline-verify allGreen | = true |
| V-02 | sync-cp-pfd 실행 성공 | ok = true |
| V-03 | CP items 수 > 0 | > 0 |
| V-04 | PFD items 수 > 0 | > 0 |
| V-05 | CP productCharId NULL 비율 | < 50% (product 행만 non-null) |
| V-06 | CP linkId NULL 비율 | < 50% (process 행만 non-null) |
| V-07 | CP processCharId NULL 비율 | < 50% (process 행만 non-null) |
| V-08 | PFD fmeaL2Id NULL 비율 | = 0% |
| V-09 | PFD productCharId 설정 | > 0 |
| V-10 | CP 워크시트 저장 후 FK 보존 | FK 값 변화 없음 |
| V-11 | PFD 워크시트 저장 후 FK 보존 | FK 값 변화 없음 |

### 6.2 FK Orphan 검증

| # | FK | 검증 쿼리 | PASS 기준 |
|---|-----|----------|-----------|
| O-01 | CP.productCharId | ProcessProductChar에 존재 확인 | orphan = 0 |
| O-02 | CP.linkId | FailureLink에 존재 확인 | orphan = 0 |
| O-03 | CP.processCharId | L3Function에 존재 확인 | orphan = 0 |
| O-04 | PFD.fmeaL2Id | L2Structure에 존재 확인 | orphan = 0 |
| O-05 | PFD.fmeaL3Id | L3Structure에 존재 확인 | orphan = 0 |
| O-06 | PFD.productCharId | ProcessProductChar에 존재 확인 | orphan = 0 |

---

## 7. 발견된 버그 및 수정 이력

| 날짜 | 버그 ID | 증상 | 근본 원인 | 수정 |
|------|---------|------|----------|------|
| 2026-03-18 | BUG-INT-01 | CP 워크시트 저장 시 FK 손실 | PUT에서 productCharId/linkId/processCharId 미포함 | FIX-INT-01 |
| 2026-03-18 | BUG-INT-02 | PFD 저장 시 productCharId 미설정 | POST에서 productCharId 미포함 | FIX-INT-02 |
| 2026-03-18 | BUG-INT-03 | UnifiedProcessItem 고아 | 매 저장마다 새 UPI 생성, 이전 것 미삭제 | FIX-INT-03 |
| 2026-03-18 | BUG-INT-04 | CPItem 타입에 FK 필드 누락 | types.ts에 FK 필드 미정의 | FIX-INT-04 |
| 2026-03-18 | BUG-INT-05 | PfdItem 타입에 FK 필드 누락 | types.ts에 FK 필드 미정의 | FIX-INT-05 |
| 2026-03-18 | BUG-INT-06 | UPI에 fmeaL2Id/fmeaL3Id 미설정 | create 시 FMEA FK 미전달 | FIX-INT-06 |

---

## 8. 수정 내역 (FIX)

### FIX-INT-01: CP 워크시트 저장 시 FK 보존
- **파일**: `src/app/api/control-plan/[id]/items/route.ts`
- **변경**: PUT의 `create` data에 `productCharId`, `processCharId`, `linkId`, `pfmeaProcessId`, `pfmeaWorkElemId` 추가

### FIX-INT-02: PFD 저장 시 productCharId 보존
- **파일**: `src/app/api/pfd/[id]/items/route.ts`
- **변경**: POST의 `create` data에 `productCharId` 추가 (이미 있지만 UnifiedProcessItem에도 전달)

### FIX-INT-03: UnifiedProcessItem 고아 방지
- **파일**: `src/app/api/control-plan/[id]/items/route.ts`, `src/app/api/pfd/[id]/items/route.ts`
- **변경**: deleteMany 전에 기존 UPI ID 수집 → 저장 후 사용되지 않는 UPI 삭제

### FIX-INT-04: CPItem 타입 FK 필드 추가
- **파일**: `src/app/(fmea-core)/control-plan/worksheet/types.ts`
- **변경**: `productCharId`, `processCharId`, `linkId`, `pfmeaProcessId`, `pfmeaWorkElemId` 추가

### FIX-INT-05: PfdItem 타입 FK 필드 추가
- **파일**: `src/app/(fmea-core)/pfd/worksheet/types.ts`
- **변경**: `fmeaL2Id`, `fmeaL3Id`, `productCharId`, `cpItemId`, `unifiedItemId` 추가

### FIX-INT-06: UnifiedProcessItem에 FMEA FK 설정
- **파일**: 양쪽 items route
- **변경**: UPI create 시 `fmeaL2Id`, `fmeaL3Id` 전달
