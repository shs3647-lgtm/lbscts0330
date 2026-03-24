# Prisma 스키마 완전 설계 명세서

> **버전**: v1.1.0 (2026-03-16) — 실제 fmea_db 컬럼 구조 반영
> **변경**: failure_links 실제 컬럼 구조 반영 / pcId·dcId·weId 마이그레이션 추가 / 캐시 필드 정책 명확화
> **연관**: `01_UUID_설계_명세서_v1.1.0.md`

---

## 1. 현재 스키마 상태 (fmea_db 실측)

### 1.1 failure_links 실제 컬럼

```
[현재 존재 — UUID FK]          [현재 없음 — 추가 필요]
fmId  text NOT NULL            pcId (B5 예방관리)
feId  text NOT NULL            dcId (A6 검출관리)
fcId  text NOT NULL            weId (B1 작업요소)

[현재 존재 — 텍스트 캐시]
fmText, fmProcess              A5 캐시
feText, feScope                C4 캐시
fcText, fcWorkElem, fcM4      B4/B1 캐시
fmPath, fePath, fcPath        계층 경로 캐시
fmSeq, feSeq, fcSeq           순번 캐시

[렌더링 보조 — UUID 도입 후 제거 가능]
rowSpan, colSpan               → UUID 계층에서 파싱
mergeGroupId                   → UUID prefix로 대체
parentId                       → UUID prefix로 대체
```

### 1.2 캐시 필드 정책 (SSOT 원칙)

```
FK (fmId/feId/fcId)  = SSOT — 반드시 존재, 화면 렌더링 기준
캐시 (fmText 등)      = 보조 — FK 조회 실패 시 fallback, 최신 데이터 아닐 수 있음
결론: FK가 NULL이면 캐시도 신뢰 불가 → Import 시 FK 반드시 설정
```

---

## 2. 고아 발생 원인 (카테시안 복제)

```
버그 위치: Import 파이프라인 — A4(ProcessProductChar) 저장 로직

❌ 현재 버그 패턴:
   for each A3 {
     for each A4 {
       prisma.processProductChar.create({ ... })  // A3마다 A4 새로 생성
       // → A4가 A3 수만큼 복제됨 (카테시안 복제)
     }
   }
   // A5 저장 시 복제된 A4 중 어느 id인지 불확실 → 66건 고아

✅ 수정 패턴:
   // A4는 PNO 단위로 1회만 생성
   const a4Id = genA4(doc, processNo, a4Seq);
   await prisma.l2ProductChar.upsert({
     where: { id: a4Id },
     create: { id: a4Id, ... },
     update: { ... }
   });
   // A5는 a4Id를 메모리에서 직접 사용
   await prisma.failureMode.upsert({
     where: { id: a5Id },
     create: { id: a5Id, productCharId: a4Id, ... },
     update: { productCharId: a4Id, ... }
   });
```

---

## 3. Prisma Schema 완전 정의

```prisma
// schema.prisma
// Smart FMEA OnPremise v5.5+
// 실제 fmea_db 컬럼 기반 — UUID 계층 코드 적용

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ══════════════════════════════════════════════
// FMEA 문서 루트 (기존 유지)
// ══════════════════════════════════════════════

model Fmea {
  id        String   @id  // 예: pfm26-m021 (기존 형식 유지)
  docType   String   @default("PF")
  title     String
  revision  String   @default("1")
  status    String   @default("DRAFT")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  l1Divisions    L1Division[]
  l1Functions    L1Function[]
  l1Requirements L1Requirement[]
  l1Effects      L1FailureEffect[]
  l2Processes    L2Process[]
  l2Functions    L2Function[]
  l2ProductChars L2ProductChar[]
  failureModes   FailureMode[]
  detectionCtrls L2DetectionCtrl[]
  workElements   L3WorkElement[]
  l3Functions    L3Function[]
  processChars   L3ProcessChar[]
  failureCauses  FailureCause[]
  preventCtrls   L3PreventCtrl[]
  failureLinks   FailureLink[]
  riskAnalyses   RiskAnalysis[]
  importBatches  ImportBatch[]

  @@map("Fmea")
}

// ══════════════════════════════════════════════
// L1 — 완제품 레벨 (C계열)
// ══════════════════════════════════════════════

model L1Division {
  // id: PF-L1-YP
  id          String   @id @db.VarChar(60)
  fmeaId      String
  divCode     String   @db.VarChar(4)   // YP | SP | US
  docType     String   @db.VarChar(4)
  sheetRow    Int
  importBatch String   @db.VarChar(40)
  createdAt   DateTime @default(now())

  fmea      Fmea         @relation(fields: [fmeaId], references: [id])
  functions L1Function[]

  @@index([fmeaId])
  @@map("L1Division")
}

model L1Function {
  // id: PF-L1-YP-001
  id         String   @id @db.VarChar(60)
  fmeaId     String
  divisionId String   @db.VarChar(60)
  divCode    String   @db.VarChar(4)
  c2Seq      Int
  valueKo    String   @db.Text
  docType    String   @db.VarChar(4)
  sheetRow   Int
  importBatch String  @db.VarChar(40)
  createdAt  DateTime @default(now())

  fmea         Fmea            @relation(fields: [fmeaId], references: [id])
  division     L1Division      @relation(fields: [divisionId], references: [id])
  requirements L1Requirement[]

  @@index([fmeaId])
  @@map("L1Function")
}

model L1Requirement {
  // id: PF-L1-YP-001-002
  id          String   @id @db.VarChar(60)
  fmeaId      String
  functionId  String   @db.VarChar(60)
  divCode     String   @db.VarChar(4)
  c2Seq       Int
  c3Seq       Int
  valueKo     String   @db.Text
  specialChar String?  @db.VarChar(4)
  docType     String   @db.VarChar(4)
  sheetRow    Int
  importBatch String   @db.VarChar(40)
  createdAt   DateTime @default(now())

  fmea          Fmea              @relation(fields: [fmeaId], references: [id])
  function      L1Function        @relation(fields: [functionId], references: [id])
  failureEffects L1FailureEffect[]

  @@index([fmeaId])
  @@map("L1Requirement")
}

model L1FailureEffect {
  // id: PF-L1-YP-001-002-001
  id            String   @id @db.VarChar(60)
  fmeaId        String
  requirementId String   @db.VarChar(60)
  divCode       String   @db.VarChar(4)
  c2Seq         Int
  c3Seq         Int
  c4Seq         Int
  valueKo       String   @db.Text
  docType       String   @db.VarChar(4)
  sheetRow      Int
  importBatch   String   @db.VarChar(40)
  createdAt     DateTime @default(now())

  fmea         Fmea          @relation(fields: [fmeaId], references: [id])
  requirement  L1Requirement @relation(fields: [requirementId], references: [id])
  failureLinks FailureLink[] @relation("FeLinkRelation")

  @@index([fmeaId])
  @@map("L1FailureEffect")
}

// ══════════════════════════════════════════════
// L2 — 공정 레벨 (A계열)
// ══════════════════════════════════════════════

model L2Process {
  // id: PF-L2-040
  id           String   @id @db.VarChar(60)
  fmeaId       String
  processNo    Int
  processNoPad String   @db.VarChar(3)
  processName  String   @db.VarChar(200)
  docType      String   @db.VarChar(4)
  sheetRow     Int
  importBatch  String   @db.VarChar(40)
  createdAt    DateTime @default(now())

  fmea           Fmea              @relation(fields: [fmeaId], references: [id])
  l2Functions    L2Function[]
  productChars   L2ProductChar[]
  failureModes   FailureMode[]
  detectionCtrls L2DetectionCtrl[]
  workElements   L3WorkElement[]

  @@index([fmeaId])
  @@index([processNo])
  @@map("L2Process")
}

model L2Function {
  // id: PF-L2-040-F-001
  id          String   @id @db.VarChar(60)
  fmeaId      String
  processId   String   @db.VarChar(60)
  processNo   Int
  seq         Int
  typeCode    String   @default("F") @db.VarChar(4)
  valueKo     String   @db.Text
  docType     String   @db.VarChar(4)
  sheetRow    Int
  importBatch String   @db.VarChar(40)
  createdAt   DateTime @default(now())

  fmea         Fmea          @relation(fields: [fmeaId], references: [id])
  process      L2Process     @relation(fields: [processId], references: [id])
  failureModes FailureMode[]

  @@index([fmeaId])
  @@map("L2Function")
}

model L2ProductChar {
  // id: PF-L2-040-P-001
  id          String   @id @db.VarChar(60)
  fmeaId      String
  processId   String   @db.VarChar(60)
  processNo   Int
  seq         Int
  typeCode    String   @default("P") @db.VarChar(4)
  valueKo     String   @db.Text
  specialChar String?  @db.VarChar(4)
  docType     String   @db.VarChar(4)
  sheetRow    Int
  importBatch String   @db.VarChar(40)
  createdAt   DateTime @default(now())

  fmea         Fmea          @relation(fields: [fmeaId], references: [id])
  process      L2Process     @relation(fields: [processId], references: [id])
  failureModes FailureMode[]  // 1:N

  @@index([fmeaId])
  @@index([processNo])
  @@map("L2ProductChar")
}

model FailureMode {
  // id: PF-L2-040-M-001
  id            String   @id @db.VarChar(60)
  fmeaId        String
  processId     String   @db.VarChar(60)
  productCharId String   @db.VarChar(60)  // FK → L2ProductChar (A4)
  l2FuncId      String?  @db.VarChar(60)  // FK → L2Function (A3, 선택)
  processNo     Int
  seq           Int
  typeCode      String   @default("M") @db.VarChar(4)
  valueKo       String   @db.Text
  docType       String   @db.VarChar(4)
  sheetRow      Int
  importBatch   String   @db.VarChar(40)
  createdAt     DateTime @default(now())

  fmea         Fmea           @relation(fields: [fmeaId], references: [id])
  process      L2Process      @relation(fields: [processId], references: [id])
  productChar  L2ProductChar  @relation(fields: [productCharId], references: [id])
  l2Function   L2Function?    @relation(fields: [l2FuncId], references: [id])
  failureLinks FailureLink[]  @relation("FmLinkRelation")

  @@index([fmeaId])
  @@index([productCharId])  // 고아 탐지 성능
  @@map("FailureMode")
}

model L2DetectionCtrl {
  // id: PF-L2-040-D-001
  id            String   @id @db.VarChar(60)
  fmeaId        String
  processId     String   @db.VarChar(60)
  failureModeId String   @db.VarChar(60)  // FK → FailureMode (A5)
  processNo     Int
  seq           Int
  typeCode      String   @default("D") @db.VarChar(4)
  valueKo       String   @db.Text
  docType       String   @db.VarChar(4)
  sheetRow      Int
  importBatch   String   @db.VarChar(40)
  createdAt     DateTime @default(now())

  fmea         Fmea          @relation(fields: [fmeaId], references: [id])
  process      L2Process     @relation(fields: [processId], references: [id])
  failureMode  FailureMode   @relation(fields: [failureModeId], references: [id])
  failureLinks FailureLink[] @relation("DcLinkRelation")

  @@index([fmeaId])
  @@map("L2DetectionCtrl")
}

// ══════════════════════════════════════════════
// L3 — 작업요소 레벨 (B계열)
// ══════════════════════════════════════════════

model L3WorkElement {
  // id: PF-L3-040-MC-001
  id          String   @id @db.VarChar(60)
  fmeaId      String
  processId   String   @db.VarChar(60)
  processNo   Int
  m4Code      String   @db.VarChar(4)
  b1Seq       Int
  valueKo     String   @db.Text
  docType     String   @db.VarChar(4)
  sheetRow    Int
  importBatch String   @db.VarChar(40)
  createdAt   DateTime @default(now())

  fmea          Fmea            @relation(fields: [fmeaId], references: [id])
  process       L2Process       @relation(fields: [processId], references: [id])
  l3Function    L3Function?
  processChars  L3ProcessChar[]
  failureCauses FailureCause[]
  preventCtrls  L3PreventCtrl[]
  failureLinks  FailureLink[]   @relation("WeLinkRelation")

  @@index([fmeaId])
  @@index([processNo, m4Code])
  @@map("L3WorkElement")
}

model L3Function {
  // id: PF-L3-040-MC-001-G (B1 하위 단일)
  id            String   @id @db.VarChar(60)
  fmeaId        String
  workElementId String   @unique @db.VarChar(60)  // 1:1 강제
  processNo     Int
  m4Code        String   @db.VarChar(4)
  b1Seq         Int
  typeCode      String   @default("G") @db.VarChar(4)
  valueKo       String   @db.Text
  docType       String   @db.VarChar(4)
  sheetRow      Int
  importBatch   String   @db.VarChar(40)
  createdAt     DateTime @default(now())

  fmea        Fmea          @relation(fields: [fmeaId], references: [id])
  workElement L3WorkElement @relation(fields: [workElementId], references: [id])

  @@index([fmeaId])
  @@map("L3Function")
}

model L3ProcessChar {
  // id: PF-L3-040-MC-001-C-001
  id            String   @id @db.VarChar(60)
  fmeaId        String
  workElementId String   @db.VarChar(60)
  processNo     Int
  m4Code        String   @db.VarChar(4)
  b1Seq         Int
  cSeq          Int
  typeCode      String   @default("C") @db.VarChar(4)
  valueKo       String   @db.Text
  specialChar   String?  @db.VarChar(4)
  docType       String   @db.VarChar(4)
  sheetRow      Int
  importBatch   String   @db.VarChar(40)
  createdAt     DateTime @default(now())

  fmea        Fmea          @relation(fields: [fmeaId], references: [id])
  workElement L3WorkElement @relation(fields: [workElementId], references: [id])

  @@index([fmeaId])
  @@map("L3ProcessChar")
}

model FailureCause {
  // id: PF-L3-040-MC-001-K-001
  id            String   @id @db.VarChar(60)
  fmeaId        String
  workElementId String   @db.VarChar(60)
  processNo     Int
  m4Code        String   @db.VarChar(4)
  b1Seq         Int
  kSeq          Int
  typeCode      String   @default("K") @db.VarChar(4)
  valueKo       String   @db.Text
  docType       String   @db.VarChar(4)
  sheetRow      Int
  importBatch   String   @db.VarChar(40)
  createdAt     DateTime @default(now())

  fmea         Fmea          @relation(fields: [fmeaId], references: [id])
  workElement  L3WorkElement @relation(fields: [workElementId], references: [id])
  failureLinks FailureLink[] @relation("FcLinkRelation")

  @@index([fmeaId])
  @@map("FailureCause")
}

model L3PreventCtrl {
  // id: PF-L3-040-MC-001-V-001
  id            String   @id @db.VarChar(60)
  fmeaId        String
  workElementId String   @db.VarChar(60)
  processNo     Int
  m4Code        String   @db.VarChar(4)
  b1Seq         Int
  vSeq          Int
  typeCode      String   @default("V") @db.VarChar(4)
  valueKo       String   @db.Text
  docType       String   @db.VarChar(4)
  sheetRow      Int
  importBatch   String   @db.VarChar(40)
  createdAt     DateTime @default(now())

  fmea         Fmea          @relation(fields: [fmeaId], references: [id])
  workElement  L3WorkElement @relation(fields: [workElementId], references: [id])
  failureLinks FailureLink[] @relation("PcLinkRelation")

  @@index([fmeaId])
  @@map("L3PreventCtrl")
}

// ══════════════════════════════════════════════
// FC 고장사슬 — 실제 컬럼 기반 + 3개 FK 추가
// ══════════════════════════════════════════════

model FailureLink {
  // id: PF-FC-040-M001-MC001-K001
  id      String   @id @db.VarChar(60)
  fmeaId  String
  processNo Int?

  // ── 기존 FK (NOT NULL — 현재 존재) ──────────
  fmId String @db.VarChar(60)  // → FailureMode.id    (A5)
  feId String @db.VarChar(60)  // → L1FailureEffect.id (C4)
  fcId String @db.VarChar(60)  // → FailureCause.id   (B4)

  // ── 추가 FK (마이그레이션으로 추가) ──────────
  weId String? @db.VarChar(60) // → L3WorkElement.id  (B1) — 현재 fcWorkElem 캐시로 대체 중
  pcId String? @db.VarChar(60) // → L3PreventCtrl.id  (B5) — 현재 없음
  dcId String? @db.VarChar(60) // → L2DetectionCtrl.id (A6) — 현재 없음

  // ── 텍스트 캐시 (렌더링 속도용, SSOT 아님) ──
  fmText    String? @db.Text
  fmProcess String? @db.Text
  feText    String? @db.Text
  feScope   String? @db.Text
  fcText    String? @db.Text
  fcWorkElem String? @db.Text  // weId 추가 후에도 캐시 유지
  fcM4      String? @db.Text

  // ── 순번/경로 캐시 ──────────────────────────
  fmSeq Int?
  feSeq Int?
  fcSeq Int?
  fmPath String? @db.Text
  fePath String? @db.Text
  fcPath String? @db.Text

  // ── 병합 정보 (UUID 도입 후 단계적 제거) ────
  parentId     String? @db.VarChar(60)
  mergeGroupId String? @db.VarChar(60)
  rowSpan      Int?
  colSpan      Int?

  // ── SOD ─────────────────────────────────────
  severity Int?
  sodO     Int?
  sodD     Int?
  ap       String? @db.VarChar(2)

  // ── 시스템 ──────────────────────────────────
  docType     String   @db.VarChar(4)
  sheetRow    Int?
  importBatch String?  @db.VarChar(40)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?

  // Relations
  fmea          Fmea             @relation(fields: [fmeaId], references: [id])
  failureMode   FailureMode      @relation("FmLinkRelation", fields: [fmId], references: [id])
  failureEffect L1FailureEffect  @relation("FeLinkRelation", fields: [feId], references: [id])
  failureCause  FailureCause     @relation("FcLinkRelation", fields: [fcId], references: [id])
  workElement   L3WorkElement?   @relation("WeLinkRelation", fields: [weId], references: [id])
  preventCtrl   L3PreventCtrl?   @relation("PcLinkRelation", fields: [pcId], references: [id])
  detectionCtrl L2DetectionCtrl? @relation("DcLinkRelation", fields: [dcId], references: [id])
  riskAnalysis  RiskAnalysis?

  @@index([fmeaId])
  @@index([fmId])
  @@index([feId])
  @@index([fcId])
  @@index([fmeaId, processNo])
  @@map("FailureLink")
}

// ══════════════════════════════════════════════
// Risk Analysis
// ══════════════════════════════════════════════

model RiskAnalysis {
  id            String   @id @default(cuid())
  fmeaId        String
  failureLinkId String   @unique @db.VarChar(60)

  severity     Int?
  occurrence   Int?
  detection    Int?
  ap           String?  @db.VarChar(2)
  improveAction String? @db.Text
  improveTarget DateTime?
  improveStatus String? @db.VarChar(20)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  fmea        Fmea        @relation(fields: [fmeaId], references: [id])
  failureLink FailureLink @relation(fields: [failureLinkId], references: [id])

  @@index([fmeaId])
  @@map("RiskAnalysis")
}

// ══════════════════════════════════════════════
// Import 배치 추적
// ══════════════════════════════════════════════

model ImportBatch {
  id          String   @id @default(cuid())
  fmeaId      String
  batchId     String   @unique @db.VarChar(40)
  fileName    String
  sheetMode   String   @db.VarChar(20)
  status      String   @db.VarChar(20)
  totalRows   Int      @default(0)
  savedRows   Int      @default(0)
  errorRows   Int      @default(0)
  errorLog    Json?
  createdAt   DateTime @default(now())
  completedAt DateTime?

  fmea Fmea @relation(fields: [fmeaId], references: [id])

  @@map("ImportBatch")
}
```

---

## 4. 마이그레이션 SQL (weId/pcId/dcId 추가)

```sql
-- 1단계: 컬럼 추가 (nullable로 시작)
ALTER TABLE "FailureLink"
  ADD COLUMN "weId" TEXT,
  ADD COLUMN "pcId" TEXT,
  ADD COLUMN "dcId" TEXT;

-- 2단계: fcWorkElem 캐시 텍스트로 weId 소급 연결
UPDATE "FailureLink" fl
SET "weId" = we.id
FROM "L3WorkElement" we
WHERE we."valueKo" = fl."fcWorkElem"
  AND we."fmeaId" = fl."fmeaId";

-- 3단계: 연결 확인
SELECT
  COUNT(*) FILTER (WHERE "weId" IS NOT NULL) AS we_connected,
  COUNT(*) FILTER (WHERE "weId" IS NULL)     AS we_orphan,
  COUNT(*)                                   AS total
FROM "FailureLink";

-- 4단계: pcId, dcId는 Import 재실행으로 채움
-- (기존 데이터에 PC/DC 텍스트 캐시가 없어 자동 소급 불가)
```

---

## 5. Import 후 검증 쿼리

```sql
-- ① 고아 FM 확인 (목표: 0건)
SELECT COUNT(*) AS orphan_fm
FROM "FailureMode" fm
LEFT JOIN "L2ProductChar" pc ON fm."productCharId" = pc.id
WHERE pc.id IS NULL AND fm."productCharId" IS NOT NULL;

-- ② FK 빈 문자열 확인 (목표: 0건)
SELECT COUNT(*) FROM "FailureLink"
WHERE "fmId" = '' OR "feId" = '' OR "fcId" = '';

-- ③ id 형식 확인 (계층 코드인지)
SELECT id FROM "FailureMode" LIMIT 3;
-- 기대값: PF-L2-040-M-001 형식

-- ④ weId 연결률
SELECT
  COUNT(*) FILTER (WHERE "weId" IS NOT NULL)::float / COUNT(*) * 100 AS we_connect_pct
FROM "FailureLink";
-- 목표: 100%
```

---

*Smart FMEA OnPremise v5.5+ — Prisma Schema v1.1.0*
*fmea_db 실측 컬럼 구조 반영 (2026-03-16)*
