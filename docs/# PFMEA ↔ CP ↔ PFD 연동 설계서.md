# PFMEA ↔ CP ↔ PFD 연동 설계서

> **문서 버전**: v1.0 — 2026-03-19  
> **핵심 원칙**: FMEA 역설계와 동일한 "설계도 먼저 → FK 꽂아넣기" 방식  
> **목표**: 연동 버튼 1회 클릭 → CP/PFD 설계도 자동 생성 → FK로 데이터 100% 꽂아넣기

---

## 1. 핵심 사상 — "집 설계도가 먼저, 자재는 FK로 꽂는다"

### 1.1 FMEA 역설계와 동일한 원리

```
FMEA 역설계:
  완성된 집(M002 DB) → 설계도(1L/2L/3L + FC) → FK로 꽂아넣기 → WS 완성

CP/PFD 연동 (동일 원리):
  완성된 FMEA(Atomic DB) → 설계도(CP/PFD 스켈레톤) → FK로 꽂아넣기 → CP/PFD 완성
```

### 1.2 연동 버튼의 의미

```
┌─────────────────────────────────────────────────────────────────┐
│  사용자가 [FMEA → CP/PFD 연동] 버튼을 누르면:                    │
│                                                                 │
│  1. FMEA Atomic DB를 읽는다 (이미 완성된 집)                     │
│                                                                 │
│  2. CP 설계도를 그린다                                           │
│     ├── FMEA의 L2Structure(공정) → CP 행의 뼈대                  │
│     ├── ProcessProductChar(제품특성) → CP.productCharId FK       │
│     ├── L3Function.processChar(공정특성) → CP.processCharId FK   │
│     ├── RiskAnalysis.detectionControl → CP.controlMethod         │
│     └── FailureMode + CC/SC → CP.ccSc                           │
│                                                                 │
│  3. PFD 설계도를 그린다                                          │
│     ├── FMEA의 L2Structure(공정) → PFD 행의 뼈대                 │
│     ├── L2Structure.no + name → PFD.processNo + processName     │
│     ├── ProcessProductChar → PFD.productCharId FK                │
│     └── 공정 순서(order) → PFD.stepNo                            │
│                                                                 │
│  4. 설계도의 모든 FK 슬롯이 채워졌는지 검증                       │
│     ├── FK 참조 대상 EXISTS 확인                                 │
│     ├── 누락 FK → 거부 (자동생성 안 함)                           │
│     └── 잘못된 FK → 문 잠금 (INSERT 거부 + 오류 리포트)           │
│                                                                 │
│  5. 검증 통과 → $transaction으로 일괄 꽂아넣기                    │
│     └── CP items + PFD items 원자적 생성                         │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 "문 잠금" 시스템 — 잘못된 데이터 차단

```
FK 슬롯 = 문 (Door)
정상 데이터 = 열쇠가 맞는 자재 → 문 열림 → INSERT 허용
잘못된 데이터 = 열쇠 불일치 → 문 잠김 → INSERT 거부

구체적으로:
  CP.productCharId → ProcessProductChar.id  (문 1)
  CP.processCharId → L3Function.id          (문 2)
  CP.linkId → FailureLink.id                (문 3)
  PFD.productCharId → ProcessProductChar.id  (문 4)
  PFD.l2StructureId → L2Structure.id         (문 5)

  5개 문 중 하나라도 열쇠가 안 맞으면:
  → 해당 행 INSERT 거부
  → 오류 리포트 생성 (어떤 문이 잠겼는지, 왜 안 맞는지)
  → API가 수정 가이드 제공 ("productCharId 'xxx'가 존재하지 않습니다")
```

---

## 2. 데이터 흐름도 — FMEA → CP → PFD

### 2.1 전체 데이터 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│                    PFMEA Atomic DB (원천)                        │
│                                                                 │
│  L1Structure ─── L1Function ─── FailureEffect                   │
│  L2Structure ─── L2Function ─── FailureMode                     │
│  L3Structure ─── L3Function ─── FailureCause                    │
│  ProcessProductChar                                             │
│  FailureLink (FE↔FM↔FC)                                        │
│  RiskAnalysis (SOD + DC/PC)                                     │
└──────────┬──────────────────────────┬───────────────────────────┘
           │                          │
           ▼                          ▼
┌─────────────────────┐    ┌─────────────────────┐
│   Control Plan (CP)  │    │   Process Flow (PFD) │
│                     │    │                     │
│  FK 연결:           │    │  FK 연결:           │
│  ├ productCharId    │    │  ├ l2StructureId    │
│  │  → ProcessProd   │    │  │  → L2Structure   │
│  ├ processCharId    │    │  ├ productCharId    │
│  │  → L3Function    │    │  │  → ProcessProd   │
│  ├ linkId           │    │  └ (공정순서 자동)   │
│  │  → FailureLink   │    │                     │
│  ├ detectionControl │    │                     │
│  │  → RiskAnalysis  │    │                     │
│  └ ccSc (CC/SC)     │    │                     │
│    → FailureMode    │    │                     │
└─────────────────────┘    └─────────────────────┘
```

### 2.2 FK 매핑 상세도

```
FMEA Atomic DB                         CP Item
═══════════════                         ═══════
L2Structure.id          ─── FK ───→    processStepId
L2Structure.no          ─── copy ──→   processNo
L2Structure.name        ─── copy ──→   processName
ProcessProductChar.id   ─── FK ───→    productCharId
ProcessProductChar.name ─── copy ──→   productCharName
ProcessProductChar.sc   ─── copy ──→   ccSc (CC/SC)
L3Function.id           ─── FK ───→    processCharId
L3Function.processChar  ─── copy ──→   processCharName
FailureLink.id          ─── FK ───→    linkId
RiskAnalysis.DC text    ─── copy ──→   controlMethod
RiskAnalysis.detection  ─── copy ──→   detectionRating
RiskAnalysis.occurrence ─── copy ──→   occurrenceRating

FMEA Atomic DB                         PFD Item
═══════════════                         ════════
L2Structure.id          ─── FK ───→    l2StructureId
L2Structure.no          ─── copy ──→   processNo
L2Structure.name        ─── copy ──→   processName
L2Structure.order       ─── copy ──→   stepNo
ProcessProductChar.id   ─── FK ───→    productCharId
ProcessProductChar.name ─── copy ──→   productCharName
ProcessProductChar.sc   ─── copy ──→   ccSc
(공정 유형 판단)        ─── logic ─→   symbolType (OP/INSPECT/...)
```

---

## 3. DB 스키마 (Prisma)

### 3.1 ControlPlan 스키마

```prisma
model ControlPlan {
  id            String   @id @default(uuid())
  fmeaId        String
  familyFmeaId  String?  // F/F용 (nullable)
  partFmeaId    String?  // P/F용 (nullable)
  cpCode        String
  cpName        String
  isPrimary     Boolean  @default(false)  // F/F에서 대표 CP
  version       String   @default("1.0")
  status        String   @default("DRAFT")  // DRAFT | APPROVED
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  items         ControlPlanItem[]

  @@index([fmeaId])
  @@index([familyFmeaId])
  @@index([partFmeaId])
}

model ControlPlanItem {
  id                String   @id @default(uuid())
  controlPlanId     String
  controlPlan       ControlPlan @relation(fields: [controlPlanId], references: [id], onDelete: Cascade)

  // ═══ FK 슬롯 (문) — FMEA Atomic DB 참조 ═══
  processStepId     String   // FK → L2Structure.id (문 1)
  productCharId     String   // FK → ProcessProductChar.id (문 2)
  processCharId     String?  // FK → L3Function.id (문 3, nullable)
  linkId            String?  // FK → FailureLink.id (문 4, nullable)

  // ═══ 복사 데이터 (표시용 캐시) ═══
  processNo         String   // L2Structure.no
  processName       String   // L2Structure.name
  productCharName   String   // ProcessProductChar.name
  processCharName   String?  // L3Function.processChar
  ccSc              String?  // CC | SC | null

  // ═══ CP 고유 데이터 ═══
  controlMethod     String?  // 관리방법 (RiskAnalysis.DC에서 초기값)
  sampleSize        String?  // 시료크기
  sampleFreq        String?  // 시료빈도
  measureMethod     String?  // 측정방법
  reactionPlan      String?  // 이상조치계획
  severity          Int?     // 심각도 (RiskAnalysis에서)
  occurrence        Int?     // 발생도
  detection         Int?     // 검출도

  sortOrder         Int      @default(0)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([controlPlanId])
  @@index([processStepId])
  @@index([productCharId])
  @@index([linkId])
}
```

### 3.2 ProcessFlowDiagram 스키마

```prisma
model ProcessFlowDiagram {
  id            String   @id @default(uuid())
  fmeaId        String
  familyFmeaId  String?
  partFmeaId    String?
  pfdCode       String
  pfdName       String
  isPrimary     Boolean  @default(false)
  version       String   @default("1.0")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  items         PfdItem[]

  @@index([fmeaId])
  @@index([familyFmeaId])
  @@index([partFmeaId])
}

model PfdItem {
  id                String   @id @default(uuid())
  pfdId             String
  pfd               ProcessFlowDiagram @relation(fields: [pfdId], references: [id], onDelete: Cascade)

  // ═══ FK 슬롯 (문) — FMEA Atomic DB 참조 ═══
  l2StructureId     String   // FK → L2Structure.id (문 1)
  productCharId     String?  // FK → ProcessProductChar.id (문 2, nullable)

  // ═══ 복사 데이터 (표시용 캐시) ═══
  stepNo            Int      // 공정 순서 (L2Structure.order)
  processNo         String   // L2Structure.no
  processName       String   // L2Structure.name
  productCharName   String?  // ProcessProductChar.name
  ccSc              String?  // CC | SC | null

  // ═══ PFD 고유 데이터 ═══
  symbolType        String   @default("OPERATION")
                             // OPERATION | TRANSPORT | INSPECT | STORE | DELAY | REWORK
  description       String?  // 공정 설명
  inputMaterial     String?  // 투입 자재
  outputSpec        String?  // 산출 규격
  keyParameter      String?  // 핵심 파라미터

  sortOrder         Int      @default(0)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([pfdId])
  @@index([l2StructureId])
  @@index([productCharId])
}
```

### 3.3 FK 참조 관계 전체도

```
FMEA Atomic DB (원천, 이미 존재)
══════════════════════════════════

L2Structure ──────────────────────┬──→ ControlPlanItem.processStepId
   │                              └──→ PfdItem.l2StructureId
   │
ProcessProductChar ───────────────┬──→ ControlPlanItem.productCharId
   │                              └──→ PfdItem.productCharId
   │
L3Function ─────────────────────────→ ControlPlanItem.processCharId
   │
FailureLink ────────────────────────→ ControlPlanItem.linkId
   │
RiskAnalysis ─── (값 복사) ─────────→ ControlPlanItem.controlMethod
                                      ControlPlanItem.severity/occurrence/detection


FK 방향 정리:
  CP Item → L2Structure       (공정단계 FK)
  CP Item → ProcessProductChar (제품특성 FK)
  CP Item → L3Function        (공정특성 FK)
  CP Item → FailureLink       (고장사슬 FK)
  PFD Item → L2Structure      (공정단계 FK)
  PFD Item → ProcessProductChar (제품특성 FK)

모든 FK는 FMEA Atomic DB에서 이미 확정된 UUID를 참조
→ 매칭 로직 불필요, 퍼지매칭 불필요
→ 존재하지 않는 FK → 문 잠금 → INSERT 거부
```

---

## 4. 연동 파이프라인 — 3단계

### 4.1 전체 파이프라인

```
┌──────────────────────────────────────────────────────────────────┐
│  STEP 1: 설계도 생성 (Skeleton Build)                             │
│                                                                  │
│  FMEA Atomic DB를 읽어서 CP/PFD의 뼈대(행 구조)를 만든다          │
│                                                                  │
│  입력: fmeaId                                                    │
│  처리:                                                           │
│    L2Structure[] → 공정별 CP 행 / PFD 행 생성                     │
│    각 L2에 속한 ProcessProductChar[] → CP 제품특성 행 확장         │
│    각 L2에 속한 L3Function[] → CP 공정특성 행 확장                 │
│    FailureLink[] → CP의 linkId FK 할당                           │
│    RiskAnalysis[] → CP의 DC/PC/SOD 초기값 복사                    │
│                                                                  │
│  출력: CP Skeleton[], PFD Skeleton[] (FK 슬롯 포함)               │
│                                                                  │
│  ✅ 이 단계에서 모든 FK가 확정됨 (자동생성 0건)                    │
└──────────────────────┬───────────────────────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│  STEP 2: FK 검증 — 문 잠금 체크 (Validation Gate)                 │
│                                                                  │
│  모든 FK 슬롯이 실제 DB에 존재하는 레코드를 참조하는지 확인        │
│                                                                  │
│  검증 항목:                                                      │
│  ┌──────────────────┬──────────────────┬──────────────────┐      │
│  │ FK 슬롯          │ 참조 테이블       │ 검증 방법        │      │
│  ├──────────────────┼──────────────────┼──────────────────┤      │
│  │ processStepId    │ L2Structure      │ EXISTS 쿼리      │      │
│  │ productCharId    │ ProcessProdChar  │ EXISTS 쿼리      │      │
│  │ processCharId    │ L3Function       │ EXISTS 쿼리      │      │
│  │ linkId           │ FailureLink      │ EXISTS 쿼리      │      │
│  │ l2StructureId    │ L2Structure      │ EXISTS 쿼리      │      │
│  └──────────────────┴──────────────────┴──────────────────┘      │
│                                                                  │
│  결과:                                                           │
│    ALL PASS → STEP 3 진행                                        │
│    ANY FAIL → 거부 + 오류 리포트 반환                              │
│              { failedDoor: "productCharId",                      │
│                value: "xxx-yyy-zzz",                             │
│                reason: "ProcessProductChar에 존재하지 않음",       │
│                fix: "FMEA에서 해당 제품특성을 먼저 생성하세요" }    │
└──────────────────────┬───────────────────────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│  STEP 3: 꽂아넣기 ($transaction INSERT)                           │
│                                                                  │
│  검증 통과한 데이터를 원자적으로 DB에 삽입                         │
│                                                                  │
│  await prisma.$transaction(async (tx) => {                       │
│    // 1. 기존 CP/PFD 삭제 (멱등성)                                │
│    await tx.controlPlanItem.deleteMany({ where: { cpId } });     │
│    await tx.pfdItem.deleteMany({ where: { pfdId } });            │
│                                                                  │
│    // 2. CP 헤더 upsert                                          │
│    await tx.controlPlan.upsert({ ... });                         │
│    await tx.processFlowDiagram.upsert({ ... });                  │
│                                                                  │
│    // 3. CP Items 일괄 생성                                      │
│    await tx.controlPlanItem.createMany({ data: cpItems });       │
│                                                                  │
│    // 4. PFD Items 일괄 생성                                     │
│    await tx.pfdItem.createMany({ data: pfdItems });              │
│                                                                  │
│    // 5. 레코드 수 검증                                          │
│    const cpCount = await tx.controlPlanItem.count({...});        │
│    const pfdCount = await tx.pfdItem.count({...});               │
│    if (cpCount !== expected.cp || pfdCount !== expected.pfd) {    │
│      throw new Error('[ROLLBACK] 레코드 수 불일치');               │
│    }                                                             │
│  }, { isolationLevel: 'Serializable' });                         │
│                                                                  │
│  ✅ 성공: CP items + PFD items 100% 꽂아넣기 완료                 │
│  ❌ 실패: 전체 롤백 (부분 저장 불가)                               │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 설계도 생성 로직 상세

```typescript
async function buildCpPfdSkeleton(fmeaId: string) {
  const prisma = await getProjectPrisma(fmeaId);

  // ── FMEA Atomic DB에서 원천 데이터 로드 ──
  const l2Structures = await prisma.l2Structure.findMany({
    where: { fmeaId },
    include: {
      l2Functions: {
        include: {
          failureModes: {
            include: {
              failureLinks: {
                include: { riskAnalyses: true }
              }
            }
          }
        }
      },
      processProductChars: true,
      l3Structures: {
        include: {
          l3Functions: {
            include: { failureCauses: true }
          }
        }
      }
    },
    orderBy: { order: 'asc' }
  });

  // ── CP 설계도 생성 ──
  const cpItems: CpItemSkeleton[] = [];
  const pfdItems: PfdItemSkeleton[] = [];

  for (const l2 of l2Structures) {
    // PFD 행: 공정당 1행
    pfdItems.push({
      l2StructureId: l2.id,            // FK 문 1
      stepNo: l2.order,
      processNo: l2.no,
      processName: l2.name,
      productCharId: l2.processProductChars[0]?.id || null,  // FK 문 2
      productCharName: l2.processProductChars[0]?.name || null,
      ccSc: l2.processProductChars[0]?.sc || null,
      symbolType: inferSymbolType(l2),  // 공정 유형 추론
    });

    // CP 행: 공정 × 제품특성 × 고장사슬
    for (const ppc of l2.processProductChars) {
      for (const l2Func of l2.l2Functions) {
        for (const fm of l2Func.failureModes) {
          for (const fl of fm.failureLinks) {
            const ra = fl.riskAnalyses[0];  // 1:1 관계

            // 해당 FC의 L3Function 찾기
            const fc = await findFailureCause(fl.fcId);
            const l3Func = fc ? await findL3Function(fc.l3FuncId) : null;

            cpItems.push({
              // FK 슬롯 (문)
              processStepId: l2.id,          // FK 문 1
              productCharId: ppc.id,         // FK 문 2
              processCharId: l3Func?.id || null, // FK 문 3
              linkId: fl.id,                 // FK 문 4

              // 복사 데이터
              processNo: l2.no,
              processName: l2.name,
              productCharName: ppc.name,
              processCharName: l3Func?.processChar || null,
              ccSc: ppc.sc || null,

              // RiskAnalysis에서 초기값
              controlMethod: ra?.detectionControl || null,
              severity: ra?.severity || null,
              occurrence: ra?.occurrence || null,
              detection: ra?.detection || null,
            });
          }
        }
      }
    }
  }

  return { cpItems, pfdItems };
}
```

---

## 5. FK 검증 시스템 — "문 잠금"

### 5.1 검증 함수

```typescript
interface DoorCheckResult {
  door: string;          // FK 슬롯 이름
  value: string;         // FK 값
  table: string;         // 참조 테이블
  exists: boolean;       // 존재 여부
  fix?: string;          // 수정 가이드 (실패 시)
}

async function validateFkDoors(
  prisma: PrismaClient,
  fmeaId: string,
  cpItems: CpItemSkeleton[],
  pfdItems: PfdItemSkeleton[]
): Promise<{ allPass: boolean; results: DoorCheckResult[] }> {

  const results: DoorCheckResult[] = [];

  // ── CP FK 검증 ──

  // 문 1: processStepId → L2Structure
  const cpProcessIds = [...new Set(cpItems.map(i => i.processStepId))];
  const existingL2 = await prisma.l2Structure.findMany({
    where: { id: { in: cpProcessIds }, fmeaId },
    select: { id: true },
  });
  const l2Set = new Set(existingL2.map(r => r.id));
  for (const id of cpProcessIds) {
    results.push({
      door: 'CP.processStepId',
      value: id,
      table: 'L2Structure',
      exists: l2Set.has(id),
      fix: l2Set.has(id) ? undefined : 'FMEA 구조분석에서 해당 공정단계를 확인하세요',
    });
  }

  // 문 2: productCharId → ProcessProductChar
  const cpPpcIds = [...new Set(cpItems.map(i => i.productCharId).filter(Boolean))];
  const existingPpc = await prisma.processProductChar.findMany({
    where: { id: { in: cpPpcIds }, fmeaId },
    select: { id: true },
  });
  const ppcSet = new Set(existingPpc.map(r => r.id));
  for (const id of cpPpcIds) {
    results.push({
      door: 'CP.productCharId',
      value: id,
      table: 'ProcessProductChar',
      exists: ppcSet.has(id),
      fix: ppcSet.has(id) ? undefined : 'FMEA에서 해당 제품특성을 먼저 생성하세요',
    });
  }

  // 문 3: processCharId → L3Function
  const cpL3Ids = [...new Set(cpItems.map(i => i.processCharId).filter(Boolean))];
  const existingL3F = await prisma.l3Function.findMany({
    where: { id: { in: cpL3Ids }, fmeaId },
    select: { id: true },
  });
  const l3fSet = new Set(existingL3F.map(r => r.id));
  for (const id of cpL3Ids) {
    results.push({
      door: 'CP.processCharId',
      value: id,
      table: 'L3Function',
      exists: l3fSet.has(id),
      fix: l3fSet.has(id) ? undefined : 'FMEA 기능분석에서 해당 공정특성을 확인하세요',
    });
  }

  // 문 4: linkId → FailureLink
  const cpLinkIds = [...new Set(cpItems.map(i => i.linkId).filter(Boolean))];
  const existingFL = await prisma.failureLink.findMany({
    where: { id: { in: cpLinkIds }, fmeaId },
    select: { id: true },
  });
  const flSet = new Set(existingFL.map(r => r.id));
  for (const id of cpLinkIds) {
    results.push({
      door: 'CP.linkId',
      value: id,
      table: 'FailureLink',
      exists: flSet.has(id),
      fix: flSet.has(id) ? undefined : 'FMEA 고장분석에서 해당 고장사슬을 확인하세요',
    });
  }

  // ── PFD FK 검증 ──

  // 문 5: l2StructureId → L2Structure
  const pfdL2Ids = [...new Set(pfdItems.map(i => i.l2StructureId))];
  for (const id of pfdL2Ids) {
    results.push({
      door: 'PFD.l2StructureId',
      value: id,
      table: 'L2Structure',
      exists: l2Set.has(id),  // 위에서 이미 조회함
      fix: l2Set.has(id) ? undefined : 'FMEA 구조분석에서 해당 공정을 확인하세요',
    });
  }

  // 문 6: PFD.productCharId → ProcessProductChar
  const pfdPpcIds = [...new Set(pfdItems.map(i => i.productCharId).filter(Boolean))];
  for (const id of pfdPpcIds) {
    results.push({
      door: 'PFD.productCharId',
      value: id,
      table: 'ProcessProductChar',
      exists: ppcSet.has(id),
      fix: ppcSet.has(id) ? undefined : 'FMEA에서 해당 제품특성을 먼저 생성하세요',
    });
  }

  const allPass = results.every(r => r.exists);
  return { allPass, results };
}
```

### 5.2 오류 리포트 형식

```json
{
  "allPass": false,
  "summary": {
    "totalDoors": 156,
    "passed": 154,
    "failed": 2
  },
  "failures": [
    {
      "door": "CP.productCharId",
      "value": "ppc-xxx-yyy",
      "table": "ProcessProductChar",
      "exists": false,
      "fix": "FMEA에서 해당 제품특성을 먼저 생성하세요",
      "affectedRows": 3,
      "affectedProcessNo": "030"
    },
    {
      "door": "CP.linkId",
      "value": "fl-aaa-bbb",
      "table": "FailureLink",
      "exists": false,
      "fix": "FMEA 고장분석에서 해당 고장사슬을 확인하세요",
      "affectedRows": 1,
      "affectedProcessNo": "050"
    }
  ],
  "action": "INSERT 거부됨. 위 FK 오류를 수정한 후 다시 연동하세요."
}
```

---

## 6. API 설계

### 6.1 연동 API

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/fmea/[fmeaId]/sync-cp-pfd` | **연동 버튼**: FMEA → CP + PFD 동시 생성 |
| POST | `/api/fmea/[fmeaId]/sync-cp` | CP만 연동 |
| POST | `/api/fmea/[fmeaId]/sync-pfd` | PFD만 연동 |
| POST | `/api/fmea/[fmeaId]/validate-cp-pfd` | FK 검증만 (dry-run, 실제 INSERT 안 함) |
| GET | `/api/fmea/[fmeaId]/cp-pfd-status` | 연동 상태 조회 (마지막 연동 시점, 건수 등) |

### 6.2 메인 연동 API 상세

```typescript
// POST /api/fmea/[fmeaId]/sync-cp-pfd
// Body: { cpId?: string, pfdId?: string, mode: "CREATE" | "UPDATE" }

async function syncCpPfd(fmeaId: string, body: SyncRequest) {
  const prisma = await getProjectPrisma(fmeaId);

  // ══ STEP 1: 설계도 생성 ══
  const { cpItems, pfdItems } = await buildCpPfdSkeleton(fmeaId);

  // ══ STEP 2: FK 검증 (문 잠금 체크) ══
  const validation = await validateFkDoors(prisma, fmeaId, cpItems, pfdItems);

  if (!validation.allPass) {
    return {
      ok: false,
      step: 'VALIDATION',
      error: 'FK 검증 실패 — 잘못된 데이터 차단됨',
      report: validation,
      // API가 수정 가이드 제공
      fixes: validation.results
        .filter(r => !r.exists)
        .map(r => ({
          door: r.door,
          value: r.value,
          fix: r.fix,
        })),
    };
  }

  // ══ STEP 3: 꽂아넣기 ══
  const result = await prisma.$transaction(async (tx) => {
    // CP 처리
    const cp = await tx.controlPlan.upsert({
      where: { id: body.cpId || 'new' },
      create: {
        fmeaId,
        cpCode: `CP-${fmeaId}`,
        cpName: `Control Plan`,
        status: 'DRAFT',
      },
      update: { updatedAt: new Date() },
    });

    await tx.controlPlanItem.deleteMany({ where: { controlPlanId: cp.id } });
    await tx.controlPlanItem.createMany({
      data: cpItems.map((item, idx) => ({
        ...item,
        controlPlanId: cp.id,
        sortOrder: idx,
      })),
    });

    // PFD 처리
    const pfd = await tx.processFlowDiagram.upsert({
      where: { id: body.pfdId || 'new' },
      create: {
        fmeaId,
        pfdCode: `PFD-${fmeaId}`,
        pfdName: `Process Flow Diagram`,
      },
      update: { updatedAt: new Date() },
    });

    await tx.pfdItem.deleteMany({ where: { pfdId: pfd.id } });
    await tx.pfdItem.createMany({
      data: pfdItems.map((item, idx) => ({
        ...item,
        pfdId: pfd.id,
        sortOrder: idx,
      })),
    });

    // 레코드 수 검증
    const cpCount = await tx.controlPlanItem.count({ where: { controlPlanId: cp.id } });
    const pfdCount = await tx.pfdItem.count({ where: { pfdId: pfd.id } });

    return { cpId: cp.id, pfdId: pfd.id, cpCount, pfdCount };
  }, { timeout: 30000, isolationLevel: 'Serializable' });

  return {
    ok: true,
    step: 'COMPLETE',
    data: {
      cpId: result.cpId,
      pfdId: result.pfdId,
      cpItems: result.cpCount,
      pfdItems: result.pfdCount,
    },
    message: `CP ${result.cpCount}건 + PFD ${result.pfdCount}건 연동 완료`,
  };
}
```

### 6.3 CRUD API

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/cp/[cpId]` | CP 상세 조회 (items 포함) |
| PUT | `/api/cp/[cpId]/items/[itemId]` | CP 항목 수정 (사용자 입력 필드만) |
| DELETE | `/api/cp/[cpId]` | CP 삭제 |
| GET | `/api/pfd/[pfdId]` | PFD 상세 조회 |
| PUT | `/api/pfd/[pfdId]/items/[itemId]` | PFD 항목 수정 |
| DELETE | `/api/pfd/[pfdId]` | PFD 삭제 |

### 6.4 수정 가능 필드 vs 잠금 필드

```
CP Item 필드:
  ── FK 잠금 (수정 불가 — FMEA 원천에서만 변경) ──
  processStepId     🔒 FMEA L2Structure에서 결정
  productCharId     🔒 FMEA ProcessProductChar에서 결정
  processCharId     🔒 FMEA L3Function에서 결정
  linkId            🔒 FMEA FailureLink에서 결정
  processNo         🔒 L2Structure.no 복사
  processName       🔒 L2Structure.name 복사
  productCharName   🔒 ProcessProductChar.name 복사
  processCharName   🔒 L3Function.processChar 복사
  ccSc              🔒 ProcessProductChar.sc 복사
  severity          🔒 RiskAnalysis에서 복사
  occurrence        🔒 RiskAnalysis에서 복사
  detection         🔒 RiskAnalysis에서 복사

  ── 사용자 편집 가능 ──
  controlMethod     ✏️  관리방법 (초기값: RiskAnalysis.DC)
  sampleSize        ✏️  시료크기
  sampleFreq        ✏️  시료빈도
  measureMethod     ✏️  측정방법
  reactionPlan      ✏️  이상조치계획

PFD Item 필드:
  ── FK 잠금 ──
  l2StructureId     🔒
  productCharId     🔒
  stepNo            🔒
  processNo         🔒
  processName       🔒
  productCharName   🔒
  ccSc              🔒

  ── 사용자 편집 가능 ──
  symbolType        ✏️  공정 기호 (초기값: 자동추론)
  description       ✏️  공정 설명
  inputMaterial     ✏️  투입 자재
  outputSpec        ✏️  산출 규격
  keyParameter      ✏️  핵심 파라미터
```

---

## 7. 재연동 (FMEA 변경 후)

### 7.1 재연동 시나리오

```
FMEA가 수정된 후 CP/PFD를 다시 연동하는 경우:

  1. FMEA에서 공정 추가/삭제 → 재연동 필요
  2. FMEA에서 고장사슬 변경 → 재연동 필요
  3. FMEA에서 SOD 변경 → 재연동 필요 (CP의 SOD 값 갱신)

재연동 방식: DELETE ALL → CREATE ALL (멱등성 보장)
  - 기존 CP/PFD items 전체 삭제
  - FMEA 최신 데이터로 설계도 재생성
  - FK 검증 → 꽂아넣기
  - 사용자가 편집한 필드 (controlMethod, sampleSize 등)는 유실됨

사용자 편집 보존 옵션:
  mode: "CREATE" → 기존 전체 삭제 후 새로 생성
  mode: "UPDATE" → FK 잠금 필드만 갱신, 사용자 편집 필드 보존
```

### 7.2 UPDATE 모드 로직

```typescript
// mode: "UPDATE" — FK 잠금 필드만 갱신, 사용자 편집 보존
async function updateCpFromFmea(tx: PrismaTx, cpId: string, newItems: CpItemSkeleton[]) {
  const existingItems = await tx.controlPlanItem.findMany({
    where: { controlPlanId: cpId },
  });

  // linkId 기준으로 기존 항목 매칭
  const existingMap = new Map(existingItems.map(i => [i.linkId, i]));

  for (const newItem of newItems) {
    const existing = existingMap.get(newItem.linkId);

    if (existing) {
      // 기존 항목 → FK 잠금 필드만 갱신, 사용자 편집 필드 보존
      await tx.controlPlanItem.update({
        where: { id: existing.id },
        data: {
          // FK 잠금 필드 갱신
          processStepId: newItem.processStepId,
          productCharId: newItem.productCharId,
          processCharId: newItem.processCharId,
          processNo: newItem.processNo,
          processName: newItem.processName,
          productCharName: newItem.productCharName,
          processCharName: newItem.processCharName,
          ccSc: newItem.ccSc,
          severity: newItem.severity,
          occurrence: newItem.occurrence,
          detection: newItem.detection,
          // controlMethod, sampleSize 등은 건드리지 않음
        },
      });
      existingMap.delete(newItem.linkId);
    } else {
      // 새 항목 → INSERT
      await tx.controlPlanItem.create({ data: { controlPlanId: cpId, ...newItem } });
    }
  }

  // FMEA에서 삭제된 항목 → CP에서도 삭제
  for (const [, orphan] of existingMap) {
    await tx.controlPlanItem.delete({ where: { id: orphan.id } });
  }
}
```

---

## 8. public vs project 스키마 판단

### 8.1 CP/PFD는 project 스키마

```
CP/PFD 데이터는 특정 FMEA 프로젝트에 종속됨
→ project 스키마(getProjectPrisma)를 사용해야 함

판단 기준:
  CP.fmeaId가 있음 → 프로젝트에 종속 → project 스키마
  PFD.fmeaId가 있음 → 프로젝트에 종속 → project 스키마

  CP/PFD의 FK가 참조하는 테이블:
    L2Structure → project 스키마
    ProcessProductChar → project 스키마
    L3Function → project 스키마
    FailureLink → project 스키마
  → 전부 project 스키마에 있으므로 CP/PFD도 project 스키마
```

### 8.2 API별 스키마 사용 매핑

| API | 스키마 | 이유 |
|-----|--------|------|
| `sync-cp-pfd` | **project** | FMEA Atomic DB + CP/PFD 모두 project |
| `GET /api/cp/[cpId]` | **project** | CP 데이터 = project 종속 |
| `PUT /api/cp/[cpId]/items` | **project** | CP 수정 = project 종속 |
| `GET /api/pfd/[pfdId]` | **project** | PFD 데이터 = project 종속 |
| CP/PFD 목록 (전체 프로젝트 횡단) | **public** | 여러 프로젝트 조회 시 public에서 메타데이터만 |
| 사용자/권한 | **public** | 시스템 공통 |
| SOD 기준표, AP 판정표 | **public** | 시스템 공통 참조 데이터 |

---

## 9. 검증 체계

| # | 검증 항목 | PASS 기준 | 시점 |
|---|----------|----------|------|
| V01 | FK 문 전체 통과 | 실패 0건 | 꽂아넣기 전 |
| V02 | CP items 수 = 예상 수 | ±0 | 꽂아넣기 후 |
| V03 | PFD items 수 = L2Structure 수 | ±0 | 꽂아넣기 후 |
| V04 | fmeaId 일치 | CP/PFD 전 항목 fmeaId 동일 | 꽂아넣기 후 |
| V05 | 멱등성 | 2회 연속 실행 → 동일 결과 | 개발 시 |
| V06 | 재연동 UPDATE 모드 | FK 갱신 + 사용자 편집 보존 | 개발 시 |
| V07 | 트랜잭션 롤백 | 부분 실패 시 전체 롤백 | 개발 시 |

---

## 10. 구현 로드맵

| Phase | 기간 | Task |
|-------|------|------|
| **Phase 1** | 3일 | Prisma 스키마 (ControlPlan, ControlPlanItem, ProcessFlowDiagram, PfdItem) + migration |
| **Phase 2** | 3일 | `buildCpPfdSkeleton()` — FMEA → CP/PFD 설계도 생성 로직 |
| **Phase 3** | 2일 | `validateFkDoors()` — FK 문 잠금 검증 + 오류 리포트 |
| **Phase 4** | 2일 | `sync-cp-pfd` API — $transaction 꽂아넣기 (CREATE/UPDATE 모드) |
| **Phase 5** | 2일 | CP/PFD CRUD API (조회/수정/삭제) + 잠금/편집 필드 구분 |
| **Phase 6** | 2일 | UI 연동 버튼 + 검증 결과 표시 + 오류 리포트 UI |
| **Phase 7** | 1일 | 멱등성 테스트 + 재연동 테스트 + E2E |

---

## 부록 A: 용어 정의

| 용어 | 정의 |
|------|------|
| **FK 꽂아넣기** | FMEA DB의 확정 UUID를 CP/PFD의 FK 슬롯에 직접 삽입하는 방식. 매칭 로직 불필요 |
| **문 잠금 (Door Lock)** | FK 슬롯이 참조하는 대상이 DB에 존재하지 않을 때 INSERT를 거부하는 메커니즘 |
| **설계도 (Skeleton)** | FMEA Atomic DB에서 추출한 CP/PFD의 행 구조 + FK 슬롯. 데이터 INSERT 전 단계 |
| **FK 잠금 필드** | FMEA 원천에서 결정되어 사용자가 직접 수정할 수 없는 필드 (processStepId, productCharId 등) |
| **사용자 편집 필드** | CP/PFD 고유 정보로 사용자가 자유롭게 편집하는 필드 (controlMethod, sampleSize 등) |
| **CREATE 모드** | 기존 CP/PFD 전체 삭제 후 FMEA 최신 데이터로 새로 생성 (멱등성 보장) |
| **UPDATE 모드** | FK 잠금 필드만 갱신하고 사용자 편집 필드는 보존하는 재연동 방식 |
| **project 스키마** | 프로젝트별 격리된 DB 스키마. CP/PFD + FMEA Atomic DB가 여기에 존재 |
| **public 스키마** | 시스템 공통 데이터 (사용자, 권한, SOD 기준표 등) |

## 부록 B: 관련 문서

| 문서 | 경로 |
|------|------|
| 역설계 시스템 설계서 v2.0 | `docs/역설계_FMEA_Import_시스템_설계서_v2.0.md` |
| Family FMEA 설계서 v1.2 | `docs/Family_FMEA_관리시스템_설계서_v1.2.md` |
| DB 중앙 아키텍처 | `docs/CENTRAL_DB_ARCHITECTURE.md` |