# API 설계 완전 명세서

> **문서**: PFMEA Import API Design Specification
> **버전**: v1.1.0 (2026-03-16)
> **스택**: Next.js 14 App Router / Prisma / PostgreSQL / TypeScript
> **연관 문서**: `01_UUID_설계_명세서_v1.1.0.md`, `02_Prisma_스키마_설계_v1.1.0.md`

---

## 1. API 구조 전체 맵

```
/api/fmea/
├── [fmeaId]/
│   ├── import/
│   │   ├── route.ts          POST   엑셀 Import 실행
│   │   ├── status/route.ts   GET    Import 진행 상태
│   │   └── validate/route.ts POST   Import 전 검증
│   ├── structure/
│   │   ├── l1/route.ts       GET    L1 전체 조회
│   │   ├── l2/route.ts       GET    L2 전체 조회
│   │   └── l3/route.ts       GET    L3 전체 조회
│   ├── failure/
│   │   ├── modes/route.ts    GET    A5 고장형태 목록
│   │   ├── causes/route.ts   GET    B4 고장원인 목록
│   │   ├── effects/route.ts  GET    C4 고장영향 목록
│   │   └── links/route.ts    GET/POST/DELETE  FC 고장사슬
│   ├── risk/route.ts         GET/PUT  SOD/AP 관리
│   ├── stats/route.ts        GET    통계·검증 (현재 진단 탭)
│   └── orphan/
│       ├── detect/route.ts   GET    고아 탐지
│       └── fix/route.ts      POST   고아 정리
└── uuid/
    └── generate/route.ts     POST   UUID 생성 유틸
```

---

## 2. UUID 생성 유틸 API

### `POST /api/uuid/generate`

Import 파서가 사용하는 UUID 생성 엔드포인트. 서버사이드에서 일관된 UUID를 생성한다.

**Request**
```typescript
interface UUIDGenerateRequest {
  docType: 'PF' | 'CP' | 'PD' | 'DF';
  level: 'L1' | 'L2' | 'L3' | 'FC';
  // L1 파라미터
  div?: 'YP' | 'SP' | 'US';
  c2Seq?: number;
  c3Seq?: number;
  c4Seq?: number;
  // L2 파라미터
  processNo?: number;
  typeCode?: 'F' | 'P' | 'M' | 'D';
  seq?: number;
  // L3 파라미터
  m4Code?: 'MC' | 'MN' | 'IM' | 'EN';
  b1Seq?: number;
  subTypeCode?: 'G' | 'C' | 'K' | 'V';
  subSeq?: number;
  // FC 파라미터
  mSeq?: number;
  kSeq?: number;
}
```

**Response**
```typescript
interface UUIDGenerateResponse {
  id: string;        // 생성된 UUID
  parentId: string | null;  // 부모 UUID
  level: string;
  segments: string[]; // split('-') 결과
}
```

**생성 함수 구현체 (uuid-generator.ts)**
```typescript
// /lib/uuid-generator.ts
export const pad = (n: number, size = 3) => String(n).padStart(size, '0');

export function genC1(doc: string, div: string) {
  const d = div === 'USER' ? 'US' : div;
  return `${doc}-L1-${d}`;
}
export function genC2(doc: string, div: string, c2: number) {
  return `${genC1(doc, div)}-${pad(c2)}`;
}
export function genC3(doc: string, div: string, c2: number, c3: number) {
  return `${genC2(doc, div, c2)}-${pad(c3)}`;
}
export function genC4(doc: string, div: string, c2: number, c3: number, c4: number) {
  return `${genC3(doc, div, c2, c3)}-${pad(c4)}`;
}

export function genA1(doc: string, pno: number) {
  return `${doc}-L2-${pad(pno)}`;
}
export function genA3(doc: string, pno: number, seq: number) {
  return `${genA1(doc, pno)}-F-${pad(seq)}`;
}
export function genA4(doc: string, pno: number, seq: number) {
  return `${genA1(doc, pno)}-P-${pad(seq)}`;
}
export function genA5(doc: string, pno: number, seq: number) {
  return `${genA1(doc, pno)}-M-${pad(seq)}`;
}
export function genA6(doc: string, pno: number, seq: number) {
  return `${genA1(doc, pno)}-D-${pad(seq)}`;
}

export function genB1(doc: string, pno: number, m4: string, b1seq: number) {
  return `${doc}-L3-${pad(pno)}-${m4}-${pad(b1seq)}`;
}
export function genB2(doc: string, pno: number, m4: string, b1seq: number) {
  return `${genB1(doc, pno, m4, b1seq)}-G`;
}
export function genB3(doc: string, pno: number, m4: string, b1seq: number, cseq: number) {
  return `${genB1(doc, pno, m4, b1seq)}-C-${pad(cseq)}`;
}
export function genB4(doc: string, pno: number, m4: string, b1seq: number, kseq: number) {
  return `${genB1(doc, pno, m4, b1seq)}-K-${pad(kseq)}`;
}
export function genB5(doc: string, pno: number, m4: string, b1seq: number, vseq: number) {
  return `${genB1(doc, pno, m4, b1seq)}-V-${pad(vseq)}`;
}
export function genFC(doc: string, pno: number,
  mseq: number, m4: string, b1seq: number, kseq: number) {
  return `${doc}-FC-${pad(pno)}-M${pad(mseq)}-${m4}${pad(b1seq)}-K${pad(kseq)}`;
}

// 부모 UUID 파싱 (코드에서 직접 추출)
export function getParentId(id: string): string | null {
  const segs = id.split('-');
  if (segs.length <= 3) return null;
  return segs.slice(0, -1).join('-');
}
```

---

## 3. Import API

### `POST /api/fmea/[fmeaId]/import`

엑셀 파일을 받아 4개 통합시트를 파싱하고 UUID를 부여한 후 DB에 저장한다.

**Request** (multipart/form-data)
```
file: File          // .xlsx 파일
sheetMode: string   // "integrated" (L1통합/L2통합/L3통합/FC) | "individual"
docType: string     // "PF" (기본값)
batchId?: string    // 재Import 시 기존 배치 ID
```

**Response**
```typescript
interface ImportResponse {
  batchId: string;
  status: 'success' | 'partial' | 'failed';
  summary: {
    l1: { saved: number; errors: number };
    l2: { saved: number; errors: number };
    l3: { saved: number; errors: number };
    fc: { saved: number; errors: number; orphans: number };
  };
  errors: ImportError[];
  orphans: OrphanReport[];
}

interface ImportError {
  sheet: string;
  row: number;
  field: string;
  value: string;
  reason: string;
}

interface OrphanReport {
  table: string;
  id: string;
  fkColumn: string;
  missingId: string;
  textValue: string; // 매칭 실패한 원본 텍스트
}
```

### Import 파이프라인 실행 순서 (15단계 → 6단계로 단순화)

```typescript
// /api/fmea/[fmeaId]/import/route.ts

export async function POST(req: Request, { params }: { params: { fmeaId: string }}) {
  const { fmeaId } = params;
  const formData = await req.formData();
  const file = formData.get('file') as File;

  // ── 파싱 단계 ──────────────────────────────────────
  const workbook = parseExcel(file);           // Step 0: 엑셀 파싱
  const l1Rows = parseL1Sheet(workbook);       // C1~C4 행 추출
  const l2Rows = parseL2Sheet(workbook);       // A1~A6 행 추출
  const l3Rows = parseL3Sheet(workbook);       // B1~B5 행 추출
  const fcRows  = parseFCSheet(workbook);      // FC 행 추출

  // ── UUID 부여 단계 ─────────────────────────────────
  const l1WithUUID = assignL1UUIDs(l1Rows);   // Step 1: L1 UUID 결정
  const l2WithUUID = assignL2UUIDs(l2Rows);   // Step 2: L2 UUID 결정
  const l3WithUUID = assignL3UUIDs(l3Rows);   // Step 3: L3 UUID 결정

  // ── DB 저장 단계 (순서 절대 준수) ──────────────────
  return await prisma.$transaction(async (tx) => {
    // Step 4: L1 전량 upsert (C1→C2→C3→C4 순)
    await upsertL1(tx, fmeaId, l1WithUUID);

    // Step 5: L2 전량 upsert (A1→A3→A4→A5→A6 순)
    //         A5 저장 시 productCharId = 이미 계산된 A4 UUID (DB 재조회 없음)
    await upsertL2(tx, fmeaId, l2WithUUID);

    // Step 6: L3 전량 upsert (B1→B2→B3→B4→B5 순)
    await upsertL3(tx, fmeaId, l3WithUUID);

    // Step 7: FC 고장사슬 — 5개 FK를 UUID로 직접 설정
    const fcResult = await upsertFC(tx, fmeaId, fcRows, {
      l1Map: buildIdMap(l1WithUUID),   // valueKo → UUID 맵
      l2Map: buildIdMap(l2WithUUID),
      l3Map: buildIdMap(l3WithUUID),
    });

    return buildResponse(fcResult);
  }, {
    isolationLevel: 'Serializable',
    timeout: 30000,
  });
}
```

---

## 4. FC 고장사슬 API

### `GET /api/fmea/[fmeaId]/failure/links`

**Query Parameters**
```
processNo?: number    // 특정 공정 필터
fmId?: string         // 특정 FM 필터
page?: number         // 페이지 (기본값 1)
limit?: number        // 페이지당 수 (기본값 50)
```

**Response**
```typescript
interface FailureLinkListResponse {
  total: number;
  page: number;
  data: FailureLinkItem[];
}

interface FailureLinkItem {
  id: string;                    // PF-FC-040-M001-MC001-K001
  processNo: number;
  // 5개 연결 항목 (JOIN 결과)
  failureMode: {
    id: string;                  // PF-L2-040-M-001
    valueKo: string;             // UBM 두께 부족
    productChar: {
      id: string;                // PF-L2-040-P-001
      valueKo: string;           // UBM 두께
    };
  };
  failureCause: {
    id: string;                  // PF-L3-040-MC-001-K-001
    valueKo: string;             // Power 변동
    workElement: {
      id: string;                // PF-L3-040-MC-001
      valueKo: string;           // Sputter 장비
      m4Code: string;            // MC
    };
  };
  failureEffect: {
    id: string;                  // PF-L1-YP-001-001-001
    valueKo: string;             // Bump Height Spec Out...
    divCode: string;             // YP
  };
  preventCtrl: {
    id: string;                  // PF-L3-040-MC-001-V-001
    valueKo: string;
  };
  detectionCtrl: {
    id: string;                  // PF-L2-040-D-001
    valueKo: string;
  };
  // SOD
  sodS: number | null;
  sodO: number | null;
  sodD: number | null;
  ap: 'H' | 'M' | 'L' | null;
}
```

### `POST /api/fmea/[fmeaId]/failure/links`

수동 고장사슬 추가 (워크시트에서 직접 연결 시).

**Request**
```typescript
interface CreateFailureLinkRequest {
  processNo: number;
  fmId: string;      // A5 UUID (반드시 존재해야 함)
  fcId: string;      // B4 UUID
  feId: string;      // C4 UUID
  pcId: string;      // B5 UUID
  dcId: string;      // A6 UUID
  weId: string;      // B1 UUID
  sodS?: number;
  sodO?: number;
  sodD?: number;
}
```

**Server-side UUID 생성 로직**
```typescript
// fmId, fcId에서 seq 파싱 후 FC 행 UUID 생성
const mSeq  = parseInt(fmId.split('-M-')[1]);   // PF-L2-040-M-001 → 1
const m4    = fcId.split('-')[3];               // PF-L3-040-MC-001-K-001 → MC
const b1Seq = parseInt(fcId.split('-')[4]);     // → 1
const kSeq  = parseInt(fcId.split('-K-')[1]);   // → 1
const linkId = genFC(docType, processNo, mSeq, m4, b1Seq, kSeq);
```

---

## 5. 고아 탐지·정리 API

### `GET /api/fmea/[fmeaId]/orphan/detect`

**Response**
```typescript
interface OrphanDetectResponse {
  total: number;
  byRelation: {
    relation: string;       // "FM→PC (productCharId)"
    table: string;          // "FailureMode"
    targetTable: string;    // "L2ProductChar"
    count: number;
    samples: string[];      // 샘플 ID 5개
  }[];
}
```

### `POST /api/fmea/[fmeaId]/orphan/fix`

**Request**
```typescript
interface OrphanFixRequest {
  mode: 'nullify' | 'reconnect' | 'delete';
  // nullify: FK를 NULL로 설정 (소프트)
  // reconnect: 텍스트 매칭으로 재연결 시도 (1회성)
  // delete: 고아 레코드 삭제
  relations?: string[]; // 특정 관계만 처리 (전체면 생략)
}
```

**Response**
```typescript
interface OrphanFixResponse {
  processed: number;
  fixed: number;
  failed: number;
  details: {
    relation: string;
    action: string;
    count: number;
  }[];
}
```

---

## 6. 구조 조회 API

### `GET /api/fmea/[fmeaId]/structure/l2`

L2 전체 구조를 계층적으로 반환 (워크시트 렌더링용).

**Response**
```typescript
interface L2StructureResponse {
  processes: {
    id: string;            // PF-L2-040
    processNo: number;     // 40
    processName: string;   // UBM Sputter
    functions: {           // A3
      id: string;
      valueKo: string;
    }[];
    productChars: {        // A4
      id: string;
      valueKo: string;
      specialChar: string | null;
      failureModes: {      // A5 (A4 하위)
        id: string;
        valueKo: string;
        detectionCtrls: {  // A6 (A5 하위)
          id: string;
          valueKo: string;
        }[];
      }[];
    }[];
  }[];
}
```

### `GET /api/fmea/[fmeaId]/structure/l3`

**Response**
```typescript
interface L3StructureResponse {
  processes: {
    id: string;
    processNo: number;
    workElements: {          // B1 (4M별 그룹)
      id: string;            // PF-L3-040-MC-001
      m4Code: string;        // MC
      valueKo: string;       // Sputter 장비
      function: {            // B2 (1:1)
        id: string;
        valueKo: string;
      } | null;
      processChars: {        // B3
        id: string;
        valueKo: string;
        specialChar: string | null;
      }[];
      failureCauses: {       // B4
        id: string;
        valueKo: string;
      }[];
      preventCtrls: {        // B5
        id: string;
        valueKo: string;
      }[];
    }[];
  }[];
}
```

---

## 7. 통계·검증 API

### `GET /api/fmea/[fmeaId]/stats`

현재 진단 탭 데이터를 제공한다.

**Response**
```typescript
interface StatsResponse {
  dbItems: number;           // 전체 DB 항목 수
  orphans: number;           // 고아 FK 수
  importMismatch: number;    // Import 불일치 수
  cartesianDuplicates: number; // 카테시안 중복 수

  // 탭별 상세
  fkIntegrity: {
    relation: string;
    table: string;
    targetTable: string;
    orphanCount: number;
    status: 'OK' | 'ERROR';
    sampleIds: string[];
  }[];

  tabCounts: {
    tab: string;
    count: number;
  }[];

  // 고장사슬 진단
  failureLinkDiag: {
    active: number;
    softDeleted: number;
    total: number;
    importChains: number;
  };
}
```

---

## 8. 에러 코드 정의

```typescript
// /lib/api-errors.ts

export const IMPORT_ERRORS = {
  // UUID 관련
  UUID_COLLISION:     'E001', // 동일 UUID 충돌 (재Import 불일치)
  PARENT_NOT_FOUND:   'E002', // 부모 UUID DB에 없음
  FK_MISMATCH:        'E003', // FK 텍스트 매칭 실패

  // 시트 파싱
  SHEET_NOT_FOUND:    'E010', // 필수 시트 없음
  INVALID_PROCESS_NO: 'E011', // 공정번호 범위 초과
  EMPTY_REQUIRED:     'E012', // 필수 항목 빈 값
  PLACEHOLDER_VALUE:  'E013', // FM/TBD 플레이스홀더

  // FC 고장사슬
  FC_FM_NOT_FOUND:    'E020', // FC 시트 FM값 A5에 없음
  FC_CAUSE_NOT_FOUND: 'E021', // FC 시트 원인값 B4에 없음
  FC_FE_NOT_FOUND:    'E022', // FC 시트 FE값 C4에 없음
  FC_PC_NOT_FOUND:    'E023', // FC 시트 PC값 B5에 없음
  FC_DC_NOT_FOUND:    'E024', // FC 시트 DC값 A6에 없음

  // 검증
  DIV_MISMATCH:       'W001', // C4의 DIV가 C1과 불일치 (복붙 오류)
  VERB_ENDING:        'W002', // B4 동사형 종결
  CROSS_CONTAMINATION:'W003', // 항목 혼입
} as const;
```

---

## 9. 미들웨어 — Import 트랜잭션 보호

```typescript
// /lib/import-transaction.ts

export async function runImportTransaction<T>(
  fmeaId: string,
  fn: (tx: PrismaTransaction) => Promise<T>
): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      // 1. FMEA 존재 확인 (lock)
      const fmea = await tx.fmea.findUniqueOrThrow({ where: { id: fmeaId } });

      // 2. Import 배치 생성
      const batch = await tx.importBatch.create({
        data: { fmeaId, batchId: generateBatchId(), status: 'pending', ... }
      });

      try {
        const result = await fn(tx);

        // 3. 배치 완료 업데이트
        await tx.importBatch.update({
          where: { id: batch.id },
          data: { status: 'success', completedAt: new Date() }
        });

        return result;
      } catch (err) {
        await tx.importBatch.update({
          where: { id: batch.id },
          data: { status: 'failed', errorLog: { message: String(err) } }
        });
        throw err;
      }
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 60000,
      maxWait: 10000,
    }
  );
}
```

---

*Smart FMEA OnPremise v5.5+ API Design v1.1.0*
