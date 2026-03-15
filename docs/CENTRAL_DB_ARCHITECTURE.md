# 중앙 DB 아키텍처 설계 (Central DB Architecture)

> **문서 버전**: v1.0.0 | **최종 수정**: 2026-03-15
> **적용 대상**: Smart FMEA On-Premise 전체 시스템
> **핵심 원칙**: 프로젝트별 중앙 DB가 유일한 진실의 원천(SSoT)

---

## 1. 설계 철학

### 1.1 비유: "공식 장부" 아키텍처

현재 시스템은 **"5명이 각자 수첩에 적는 회의록"** 구조다:
- PFMEA 워크시트 → FmeaLegacyData (JSON blob)
- CP 워크시트 → ControlPlanItem (독립 테이블)
- PFD → PfdItem (독립 테이블)
- Import → PfmeaMasterFlatItem (staging)
- 워크시트 편집 → 메모리 state (React)

**문제**: 5개 수첩이 서로 다른 내용을 가질 수 있다.

**해결**: **공식 장부 하나(Atomic DB)** 만 인정하고, 모든 앱이 이 장부를 참조한다.

### 1.2 단일 진실의 원천 (Single Source of Truth)

```
┌─────────────────────────────────────────────────┐
│              중앙 DB (Atomic Tables)              │
│  L1 → L2 → L3 → FM/FE/FC → FailureLink → Risk  │
│              ↑         ↑         ↑                │
│           PFMEA      CP       PFD                │
│           워크시트   워크시트   워크시트             │
│              │         │         │                │
│              └─────────┴─────────┘                │
│                 모두 같은 FK 참조                   │
└─────────────────────────────────────────────────┘
```

| 원칙 | 설명 |
|------|------|
| **SSoT = Atomic DB** | L1/L2/L3/FailureLink 테이블이 진실. JSON은 캐시 |
| **FK 기반 연동** | FMEA↔CP↔PFD는 동일 UUID FK로 연결 |
| **Import = Staging** | Import 데이터는 임시 테이블에 저장, 확정 전까지 FK 미생성 |
| **렌더링 = DB 로드** | 화면에 표시하는 데이터는 항상 DB에서 직접 로드 |

---

## 2. 프로젝트 중앙 DB 구조

### 2.1 전체 ERD (Entity-Relationship Diagram)

```
APQPProject (프로젝트 최상위 컨테이너)
  │
  ├── TripletGroup (PFMEA + CP + PFD 세트 관리)
  │     ├── pfmeaId → FmeaProject
  │     ├── cpId → ControlPlan
  │     └── pfdId → PfdRegistration
  │
  ├── ProjectLinkage (외부 문서 연결)
  │     ├── pfmeaId, dfmeaId
  │     ├── cpNo, pfdNo
  │     └── apqpNo
  │
  └── UnifiedProcessItem (공정 통합 마스터)
        ├── fmeaL2Id → L2Structure
        ├── fmeaL3Id → L3Structure
        ├── controlPlanItems[] → ControlPlanItem
        └── pfdItems[] → PfdItem
```

### 2.2 FMEA 구조 계층 (Structure Hierarchy)

```
FmeaProject (등록 정보)
  ├── fmeaId (고유 식별자, 예: pfm26-m001)
  ├── FmeaRegistration (기초정보 — 1:1)
  ├── FmeaCftMember[] (CFT 팀원)
  ├── FmeaWorksheetData (워크시트 JSON 캐시 — 편집용)
  └── FmeaConfirmedState (단계별 확정 상태)

L1Structure (완제품/시스템 공정)
  ├── id: UUID (확정된 고유 ID)
  ├── fmeaId: String (소속 FMEA)
  ├── L1Function[] (완제품 기능)
  │     └── FailureEffect[] (고장영향 — C4)
  └── L2Structure[] (하위 공정)

L2Structure (메인 공정 — A1/A2)
  ├── id: UUID
  ├── no: String (공정번호 — 매칭 키)
  ├── name: String (공정명)
  ├── L2Function[] (공정 기능 — A3)
  │     └── productChar: String (레거시 텍스트)
  ├── ProcessProductChar[] (제품특성 — A4, ★공유 엔티티)
  │     ├── id: UUID (FMEA/CP/PFD가 공유하는 FK)
  │     ├── name: String (제품특성명)
  │     └── failureModes[] ← FailureMode.productCharId FK
  ├── FailureMode[] (고장형태 — A5)
  │     ├── productCharId FK → ProcessProductChar
  │     └── failureLinks[] → FailureLink
  └── L3Structure[] (작업요소 — B1)

L3Structure (작업요소)
  ├── id: UUID
  ├── m4: String (4M 분류: MC/MN/IM/EN)
  ├── L3Function[] (작업요소 기능 — B2/B3)
  │     └── processChar: String (공정특성)
  └── FailureCause[] (고장원인 — B4)
        ├── processCharId: String? (공정특성 FK)
        └── failureLinks[] → FailureLink
```

### 2.3 고장사슬 (Failure Chain — FailureLink 중심)

```
FailureLink (FM↔FE↔FC 확정 연결)
  ├── id: UUID
  ├── fmeaId: String
  ├── fmId FK → FailureMode (고장형태)
  ├── feId FK → FailureEffect (고장영향)
  ├── fcId FK → FailureCause (고장원인)
  ├── fmText, feText, fcText (디버깅용 텍스트 스냅샷)
  ├── fmPath, fePath, fcPath (경로 추적)
  ├── fmSeq, feSeq, fcSeq (배열 내 순서)
  ├── severity: Int (심각도)
  │
  ├── FailureAnalysis (1:1 — 고장분석 상세)
  │     ├── l1/l2/l3 구조+기능 정보 전체 스냅샷
  │     └── confirmed: Boolean (확정 여부)
  │
  ├── RiskAnalysis[] (N:1 — 위험분석)
  │     ├── severity, occurrence, detection, ap
  │     ├── preventionControl, detectionControl
  │     └── Optimization[] (N:1 — 개선 최적화)
  │           ├── recommendedAction, responsible, targetDate
  │           ├── newSeverity, newOccurrence, newDetection, newAP
  │           └── status, completedDate
  │
  └── deletedAt: DateTime? (소프트 삭제)

@@unique([fmeaId, fmId, feId, fcId])  ← 동일 사슬 중복 방지
```

### 2.4 CP/PFD 연동 (FK 기반 — 텍스트 매칭 금지)

```
ProcessProductChar (★ 중앙 공유 엔티티)
  │
  ├── FailureMode.productCharId FK ← FMEA가 참조
  ├── ControlPlanItem.productCharId FK ← CP가 참조
  └── PfdItem.productCharId FK ← PFD가 참조

UnifiedProcessItem (공정 통합)
  │
  ├── fmeaL2Id → L2Structure (FMEA 공정)
  ├── fmeaL3Id → L3Structure (FMEA 작업요소)
  ├── ControlPlanItem.unifiedItemId FK
  └── PfdItem.unifiedItemId FK

동기화 흐름:
  PFMEA 저장 → ProcessProductChar UUID 확정
    → CP 연동 시 동일 productCharId 사용
    → PFD 연동 시 동일 productCharId 사용
    → 어떤 앱에서든 같은 제품특성을 FK로 추적
```

---

## 3. Import → 확정 → DB 3단계 파이프라인

### 3.1 Stage 1: Import (Staging — 미확정)

```
Excel 파일
  ↓
stepa-parser → stepb-parser
  ↓
ImportedFlatData[] (메모리 — 구조화되지 않은 flat 배열)
  ↓
PfmeaMasterDataset + PfmeaMasterFlatItem (DB — staging 테이블)
  ├── processNo: 공정번호 (매칭 키)
  ├── itemCode: A1~A6, B1~B5, C1~C4 (열 코드)
  ├── value: 셀 값
  ├── m4: 4M 분류
  ├── parentItemId: 부모 관계
  └── orderIndex: 순서

이 단계에서의 UUID:
  ✅ PfmeaMasterFlatItem.id — staging 레코드 자체 ID
  ❌ FailureLink FK — 아직 생성하지 않음
  ❌ ProcessProductChar.id — 아직 확정하지 않음
```

### 3.2 Stage 2: 구조 변환 + FC 검증 (매칭 확인)

```
buildWorksheetState() — staging → 계층 구조 변환
  ├── L1/L2/L3 구조 생성 (임시 UUID 부여)
  ├── ProcessProductChar 생성 (공정 단위 1회 — 카테시안 방지)
  └── FM/FE/FC 생성 (임시 UUID 부여)

failureChainInjector() — FC sheet 기반 매칭
  ├── MasterFailureChain[] → FM↔FE↔FC 텍스트 매칭
  ├── 5단계 퍼지 매칭 (exact → no-space → prefix-strip → contains → 70% overlap)
  ├── 매칭 결과를 UI에 표시 → 사용자 검토
  └── 매칭 실패 건 → 수동 지정 또는 재매칭

검증 기준:
  □ 모든 FM에 FE가 연결되었는가?
  □ 모든 FM에 FC가 연결되었는가?
  □ 매칭되지 않은 FM/FE/FC가 있는가?
  □ 카테시안 복제가 발생하지 않았는가?
```

### 3.3 Stage 3: DB 원자 저장 (확정 — 트랜잭션)

```typescript
await prisma.$transaction(async (tx) => {
  // 1. 기존 데이터 삭제 (해당 fmeaId)
  await tx.failureLink.deleteMany({ where: { fmeaId } });
  await tx.failureCause.deleteMany({ where: { fmeaId } });
  // ... (역순 삭제 — FK 제약 준수)

  // 2. 구조 생성 (L1 → L2 → L3 순서 — FK 방향)
  await tx.l1Structure.createMany({ data: l1Records });
  await tx.l2Structure.createMany({ data: l2Records });
  await tx.l3Structure.createMany({ data: l3Records });

  // 3. 기능 + 특성 생성
  await tx.l1Function.createMany({ data: l1FuncRecords });
  await tx.l2Function.createMany({ data: l2FuncRecords });
  await tx.processProductChar.createMany({ data: pcRecords }); // ★ 공정 단위 1회
  await tx.l3Function.createMany({ data: l3FuncRecords });

  // 4. 고장 엔티티 생성
  await tx.failureEffect.createMany({ data: feRecords });
  await tx.failureMode.createMany({ data: fmRecords });     // productCharId FK 포함
  await tx.failureCause.createMany({ data: fcRecords });

  // 5. 고장사슬 확정 (★ FK 생성 시점)
  await tx.failureLink.createMany({ data: linkRecords });   // fmId, feId, fcId FK
  await tx.failureAnalysis.createMany({ data: faRecords });

  // 6. 위험분석 + 최적화
  await tx.riskAnalysis.createMany({ data: riskRecords });
  await tx.optimization.createMany({ data: optRecords });

  // 7. 편집용 캐시 (JSON blob — SSoT 아님)
  await tx.fmeaLegacyData.upsert({
    where: { fmeaId },
    create: { fmeaId, data: worksheetState },
    update: { data: worksheetState },
  });
});
```

---

## 4. 앱별 DB 접근 규칙

### 4.1 접근 권한 매트릭스

| 앱 모듈 | 읽기 허용 | 쓰기 허용 | 절대 금지 |
|---------|----------|----------|----------|
| **PFMEA Import** | MasterFlatItem, MasterDataset | MasterDataset, MasterFlatItem | Atomic 테이블 직접 쓰기 |
| **PFMEA Worksheet** | 전체 Atomic 테이블 | 전체 ($transaction 필수) | JSON blob 직접 렌더링 |
| **DFMEA Worksheet** | 전체 Atomic 테이블 | 전체 ($transaction 필수) | PFMEA 테이블 쓰기 |
| **Control Plan** | ControlPlan*, ProcessProductChar | ControlPlan, ControlPlanItem | FMEA Atomic 직접 쓰기 |
| **PFD** | PfdRegistration*, UnifiedProcessItem | Pfd*, PfdItem | FMEA/CP 직접 쓰기 |
| **LLD** | LLDFilterCode, LessonsLearned | LLDFilterCode, LessonsLearned | FMEA 데이터 쓰기 |
| **WS/PM** | 전체 (읽기 전용) | WS/PM 자체 테이블만 | 다른 앱 테이블 쓰기 |

### 4.2 동기화 API 패턴

```
PFMEA → CP 동기화:
  POST /api/pfmea/sync-to-cp/all
  └── ProcessProductChar.id → ControlPlanItem.productCharId

PFMEA → PFD 동기화:
  POST /api/pfd/sync-from-fmea
  └── L2Structure.id → PfdItem.fmeaL2Id
  └── L3Structure.id → PfdItem.fmeaL3Id

CP → PFD 동기화:
  POST /api/pfd/sync-from-cp
  └── UnifiedProcessItem.id 경유

모든 동기화는:
  ✅ FK 기반 (동일 UUID 참조)
  ✅ $transaction 래핑
  ✅ SyncLog 기록
  ❌ 텍스트 기반 재매칭 금지
  ❌ 새 UUID 생성 금지 (기존 FK 유지)
```

### 4.3 연동 FK 공유 다이어그램

```
ProcessProductChar.id = "pc-uuid-001"
  │
  ├── FailureMode.productCharId = "pc-uuid-001"      (FMEA 내부)
  ├── ControlPlanItem.productCharId = "pc-uuid-001"   (CP 연동)
  └── PfdItem.productCharId = "pc-uuid-001"           (PFD 연동)

→ 3개 앱이 동일한 UUID로 같은 제품특성을 추적
→ 어느 한 곳에서 변경해도 FK 추적 가능
→ 텍스트 매칭 불필요 (UUID가 곧 연결)
```

---

## 5. 데이터 정합성 검증

### 5.1 세션 시작 시 검증 체크리스트

```bash
# 1. FK 정합성 — 고아 레코드 탐지
SELECT fl.id, fl."fmId"
FROM failure_links fl
LEFT JOIN failure_modes fm ON fl."fmId" = fm.id
WHERE fm.id IS NULL;
# → 결과 0건이어야 정상

# 2. 카테시안 탐지 — ProcessProductChar 중복
SELECT "fmeaId", "l2StructId", name, COUNT(*)
FROM process_product_chars
GROUP BY "fmeaId", "l2StructId", name
HAVING COUNT(*) > 1;
# → 결과 0건이어야 정상

# 3. CP/PFD FK 유효성
SELECT cpi.id, cpi."productCharId"
FROM control_plan_items cpi
WHERE cpi."productCharId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM process_product_chars ppc WHERE ppc.id = cpi."productCharId"
  );
# → 결과 0건이어야 정상

# 4. FailureLink 유니크 제약
SELECT "fmeaId", "fmId", "feId", "fcId", COUNT(*)
FROM failure_links
WHERE "deletedAt" IS NULL
GROUP BY "fmeaId", "fmId", "feId", "fcId"
HAVING COUNT(*) > 1;
# → 결과 0건이어야 정상
```

### 5.2 런타임 검증 (코드 내장)

| 검증 | 위치 | 시점 | 실패 시 |
|------|------|------|--------|
| FK 존재 확인 | route.ts POST | DB 저장 직전 | 트랜잭션 롤백 |
| 카테시안 탐지 | buildWorksheetState | Import 변환 후 | 경고 + 중단 |
| FailureLink 완전성 | failureChainInjector | FC 검증 후 | 미연결 건 표시 |
| productCharId 유효성 | sync-to-cp API | CP 동기화 시 | 동기화 거부 |
| fmeaId 일치 | db-storage.ts | 모든 저장 시 | 저장 거부 |

### 5.3 자동 복구 정책

| 상황 | 조치 | 자동/수동 |
|------|------|----------|
| 고아 FailureLink | soft delete (deletedAt 설정) | 자동 |
| 중복 ProcessProductChar | 첫 번째 유지, 나머지 삭제 + FK 재지정 | 수동 (사용자 확인) |
| CP productCharId 미유효 | null 설정 + 재동기화 안내 | 자동 + 알림 |
| JSON/Atomic 불일치 | Atomic 기준으로 JSON 재생성 | 자동 |

---

## 6. 마이그레이션 로드맵

### 6.1 현재 → 목표 아키텍처 전환

```
Phase 현재 (v5.x):
  ┌──────────────────┐
  │ FmeaLegacyData   │ ← SSoT (JSON blob)
  │ (JSON blob)      │
  └────────┬─────────┘
           │ 로드 우선
  ┌────────▼─────────┐
  │ Atomic DB        │ ← 보조 (CP/PFD 연동용)
  │ L1/L2/L3/Link    │
  └──────────────────┘

Phase 목표 (v6.x):
  ┌──────────────────┐
  │ Atomic DB        │ ← SSoT (유일한 진실)
  │ L1/L2/L3/Link    │
  │ Risk/Opt         │
  └────────┬─────────┘
           │ 캐시 생성
  ┌────────▼─────────┐
  │ FmeaLegacyData   │ ← 편집용 캐시 (필요 시 재생성)
  │ (JSON snapshot)  │
  └──────────────────┘
```

### 6.2 전환 단계

| Phase | 작업 | 영향 범위 | 리스크 |
|-------|------|----------|--------|
| **P1** | Atomic DB 저장 완전성 확보 (Risk/Opt 포함) | route.ts POST | 낮음 |
| **P2** | 로드 경로를 Atomic DB 우선으로 전환 | useWorksheetDataLoader | 중간 |
| **P3** | JSON blob → 캐시로 강등 (재생성 가능) | db-storage.ts | 높음 |
| **P4** | JSON blob 의존 코드 전면 제거 | 전체 워크시트 | 높음 |

### 6.3 전환 중 공존 규칙

P1~P2 기간 동안:
- **저장 시**: Atomic DB + JSON blob 모두 저장 (dual write)
- **로드 시**: Atomic DB 우선, JSON blob 폴백
- **불일치 시**: Atomic DB가 진실, JSON blob 재생성
- **편집 시**: 메모리 state → Atomic DB → JSON blob 순서로 동기화

---

## 7. 핵심 FK 관계 요약

### 7.1 구조 계층 FK

```
L1Structure.id ←── L2Structure.l1Id
L2Structure.id ←── L3Structure.l2Id
L1Structure.id ←── L1Function.l1StructId
L2Structure.id ←── L2Function.l2StructId
L2Structure.id ←── ProcessProductChar.l2StructId
L3Structure.id ←── L3Function.l3StructId
```

### 7.2 고장 계층 FK

```
L1Function.id ──→ FailureEffect.l1FuncId
L2Function.id ──→ FailureMode.l2FuncId
L2Structure.id ─→ FailureMode.l2StructId
ProcessProductChar.id ─→ FailureMode.productCharId  ★ 공유 FK
L3Function.id ──→ FailureCause.l3FuncId
L3Structure.id ─→ FailureCause.l3StructId
```

### 7.3 고장사슬 FK

```
FailureMode.id ──→ FailureLink.fmId
FailureEffect.id ─→ FailureLink.feId
FailureCause.id ──→ FailureLink.fcId
FailureLink.id ──→ FailureAnalysis.linkId (1:1)
FailureLink.id ──→ RiskAnalysis.linkId (1:N)
RiskAnalysis.id ──→ Optimization.riskId (1:N)
```

### 7.4 연동 FK (Cross-Module)

```
ProcessProductChar.id ─→ ControlPlanItem.productCharId  ★ FMEA↔CP
ProcessProductChar.id ─→ PfdItem.productCharId           ★ FMEA↔PFD
L2Structure.id ────────→ UnifiedProcessItem.fmeaL2Id     ★ 공정 연동
L3Structure.id ────────→ UnifiedProcessItem.fmeaL3Id     ★ 작업요소 연동
UnifiedProcessItem.id ─→ ControlPlanItem.unifiedItemId
UnifiedProcessItem.id ─→ PfdItem.unifiedItemId
```

---

## 8. 금지 패턴 & 허용 패턴

### 8.1 절대 금지

| # | 금지 패턴 | 이유 | 대안 |
|---|----------|------|------|
| 1 | JSON blob에서 직접 렌더링 | SSoT 위반 — JSON은 캐시 | Atomic DB에서 로드 |
| 2 | 텍스트 기반 FK 매칭 | 동음이의어/오타 시 오연결 | UUID FK 참조 |
| 3 | Import 시 FailureLink FK 확정 | 미검증 매칭으로 오연결 | FC 검증 후 확정 |
| 4 | 카테시안 UUID 복제 | 데이터 2배 + 고아 발생 | 공유 엔티티 1회 생성 |
| 5 | 로드 경로에 필터/변환 삽입 | placeholder 삭제 → 기능 파괴 | 별도 useMemo/useEffect |
| 6 | $transaction 없는 다중 테이블 쓰기 | 부분 저장 → 정합성 깨짐 | $transaction 필수 |
| 7 | 순서 기반 PFD 매핑 | 순서 변경 시 전체 깨짐 | fmeaL2Id/L3Id FK |
| 8 | 메모리 state만 수정 후 저장 누락 | 새로고침 시 데이터 소실 | 즉시 DB 반영 (큐 패턴) |

### 8.2 필수 패턴

| # | 필수 패턴 | 적용 위치 |
|---|----------|----------|
| 1 | `prisma.$transaction()` 래핑 | 모든 다중 테이블 DB 작업 |
| 2 | ProcessProductChar 공정 단위 1회 생성 | buildWorksheetState, route.ts POST |
| 3 | FK 방향 순서 생성 (L1→L2→L3→FM→FE→FC→Link) | route.ts POST |
| 4 | FK 역방향 삭제 (Link→FC→FE→FM→L3→L2→L1) | route.ts POST (재저장 시) |
| 5 | fmeaId 사전 검증 | db-storage.ts (저장 전) |
| 6 | 매칭 결과 사용자 확인 | Import FC 검증 단계 |
| 7 | SyncLog 기록 | 모든 연동 API |

---

## 9. 부록: 주요 파일 위치

| 구분 | 파일 | 역할 |
|------|------|------|
| **스키마** | `prisma/schema.prisma` | 전체 DB 모델 정의 |
| **Import 파싱** | `src/app/(fmea-core)/pfmea/import/utils/buildWorksheetState.ts` | Flat → 계층 변환 |
| **FC 검증** | `src/app/(fmea-core)/pfmea/import/utils/failureChainInjector.ts` | FM↔FE↔FC 매칭 |
| **DB 저장** | `src/app/api/fmea/route.ts` | Atomic DB 트랜잭션 저장 |
| **DB 로드** | `src/app/(fmea-core)/pfmea/worksheet/hooks/useWorksheetDataLoader.ts` | DB → State 로드 |
| **DB 큐** | `src/app/(fmea-core)/pfmea/worksheet/db-storage.ts` | 편집 → DB 저장 큐 |
| **CP 동기화** | `src/app/api/pfmea/sync-to-cp/` | PFMEA → CP FK 동기화 |
| **PFD 동기화** | `src/app/api/pfd/sync-from-fmea/route.ts` | PFMEA → PFD FK 동기화 |
| **카테시안 탐지** | `scripts/check-cartesian.sh` | UUID 중복 검사 |
| **FK 검증** | `/verify` 스킬 | 3단계 정합성 검증 |

---

> **이 문서는 CLAUDE.md Rule 0 "DB 중앙 아키텍처"의 상세 참조 문서입니다.**
> **모든 코드 수정은 이 아키텍처를 준수해야 하며, 위반 시 즉시 롤백합니다.**
