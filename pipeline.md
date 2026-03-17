# ImportMapping DB 영구저장 기반 Import 파이프라인 구축 프롬프트

> **목적**: ImportMapping 테이블을 DB에 영구 저장하는 방식으로 import 파이프라인 전체를 재구축한다.
> 모든 단계(parsing → DB저장 → FK연결 → FC연결 → verifyRoundTrip)에서
> `originalUid → generatedId` 매핑을 기록하고 조회한다.

---

## 1단계: Prisma Schema 추가

`ImportJob`과 `ImportMapping` 테이블을 추가한다.

```prisma
model ImportJob {
  id          String          @id @default(cuid())
  createdAt   DateTime        @default(now())
  status      String          // "pending" | "success" | "failed"
  sourceFile  String?
  fmeaId      String?
  totalRows   Int             @default(0)
  mappings    ImportMapping[]
}

model ImportMapping {
  id            String    @id @default(cuid())
  importJobId   String
  originalUid   String    // 엑셀 원본 uid
  generatedId   String    // DB에 저장된 cuid
  entityType    String    // "FE" | "FM" | "FC" | "PC" | "DC" | "A4" | "A5" 등
  sheetName     String?   // 어느 시트에서 왔는지
  importJob     ImportJob @relation(fields: [importJobId], references: [id])

  @@index([importJobId, originalUid])
  @@index([importJobId, entityType])
}
```

마이그레이션 실행:

```bash
npx prisma migrate dev --name add_import_mapping
```

---

## 2단계: importJobManager 유틸 함수

import 시작 시점에 ImportJob을 생성하고,
매핑 등록/조회 함수를 제공하는 유틸을 만든다.

**파일 위치**: `lib/import/importJobManager.ts`

```typescript
import { prisma } from '@/lib/prisma'

export async function createImportJob(sourceFile?: string, fmeaId?: string) {
  return prisma.importJob.create({
    data: { status: 'pending', sourceFile, fmeaId }
  })
}

export async function registerMapping(
  importJobId: string,
  originalUid: string,
  generatedId: string,
  entityType: string,
  sheetName?: string
) {
  return prisma.importMapping.create({
    data: { importJobId, originalUid, generatedId, entityType, sheetName }
  })
}

export async function resolveId(
  importJobId: string,
  originalUid: string
): Promise<string | null> {
  const mapping = await prisma.importMapping.findFirst({
    where: { importJobId, originalUid }
  })
  return mapping?.generatedId ?? null
}

export async function getAllMappings(importJobId: string) {
  return prisma.importMapping.findMany({
    where: { importJobId }
  })
}

export async function finalizeImportJob(
  importJobId: string,
  status: 'success' | 'failed',
  totalRows: number
) {
  return prisma.importJob.update({
    where: { id: importJobId },
    data: { status, totalRows }
  })
}
```

---

## 3단계: Parsing 단계 — uid 추출 및 매핑 등록

엑셀 파싱 시 각 행의 `originalUid`를 읽고,
DB 저장 직후 `registerMapping`을 호출한다.

모든 엔티티(FE, FM, FC, PC, DC, A4, A5 등) 생성 패턴:

```typescript
// 예시: FM(고장형태) 생성
const generatedFmId = cuid()

await prisma.failureMode.create({
  data: {
    id: generatedFmId,
    // ... 나머지 필드
  }
})

await registerMapping(importJobId, row.uid, generatedFmId, 'FM', 'B4')
```

**규칙**:
- DB insert 직후 반드시 `registerMapping` 호출
- `entityType`은 시트/엔티티 종류를 명확히 기재 (`'FM'`, `'FE'`, `'FC'`, `'PC'`, `'DC'`)
- `sheetName`은 엑셀 시트명 그대로 기재

---

## 4단계: FK 연결 단계 — resolveId로 부모 ID 변환

모든 FK(`parentId`, `failureModeId` 등) 할당 시
하드코딩된 `originalUid` 대신 `resolveId`를 통해 `generatedId`로 변환한다.

```typescript
// ❌ 기존 (잘못된 방식)
await prisma.failureEffect.create({
  data: {
    parentId: row.parentUid,  // 엑셀 원본 uid 그대로 사용
  }
})

// ✅ 수정 (올바른 방식)
const parentGenId = await resolveId(importJobId, row.parentUid)

if (!parentGenId) {
  console.error(`[FK누락] FE uid=${row.uid} → parentUid=${row.parentUid} 매핑 없음`)
  // 누락 로그 기록 후 continue 또는 throw
}

const generatedFeId = cuid()

await prisma.failureEffect.create({
  data: {
    id: generatedFeId,
    parentId: parentGenId,  // 변환된 generatedId 사용
  }
})

await registerMapping(importJobId, row.uid, generatedFeId, 'FE', 'B5')
```

**resolveId 실패 시 처리 규칙**:
- `null` 반환 시 해당 행을 건너뛰지 말고 에러 로그에 기록
- 전체 import를 중단하지 않고 누락 목록을 수집한 뒤 마지막에 일괄 보고

---

## 5단계: FC(고장원인) 연결

FC는 FM에 연결되는 구조이므로
FM의 `originalUid → resolveId → FM의 generatedId` 순으로 처리한다.

```typescript
// FC 생성 및 FM 연결
const parentFmGenId = await resolveId(importJobId, row.parentFmUid)

if (!parentFmGenId) {
  console.error(`[FC연결누락] FC uid=${row.uid} → parentFmUid=${row.parentFmUid}`)
}

const generatedFcId = cuid()

await prisma.failureCause.create({
  data: {
    id: generatedFcId,
    failureModeId: parentFmGenId,
    // ... 나머지 필드
  }
})

await registerMapping(importJobId, row.uid, generatedFcId, 'FC', 'B5')
```

---

## 6단계: verifyRoundTrip 함수 구현

import 완료 후 전체 매핑 테이블을 기반으로 DB 저장 결과를 검증한다.

**파일 위치**: `lib/import/verifyRoundTrip.ts`

```typescript
import { prisma } from '@/lib/prisma'
import { getAllMappings } from './importJobManager'

export async function verifyRoundTrip(importJobId: string) {
  const mappings = await getAllMappings(importJobId)
  const results = { success: 0, failed: 0, details: [] as any[] }

  for (const mapping of mappings) {
    const { originalUid, generatedId, entityType } = mapping

    let dbRecord: any = null

    if (entityType === 'FM') {
      dbRecord = await prisma.failureMode.findUnique({ where: { id: generatedId } })
    } else if (entityType === 'FE') {
      dbRecord = await prisma.failureEffect.findUnique({ where: { id: generatedId } })
    } else if (entityType === 'FC') {
      dbRecord = await prisma.failureCause.findUnique({ where: { id: generatedId } })
    } else if (entityType === 'PC') {
      dbRecord = await prisma.preventionControl.findUnique({ where: { id: generatedId } })
    } else if (entityType === 'DC') {
      dbRecord = await prisma.detectionControl.findUnique({ where: { id: generatedId } })
    }
    // 필요 시 다른 entityType 추가

    if (dbRecord) {
      results.success++
    } else {
      results.failed++
      results.details.push({
        originalUid,
        generatedId,
        entityType,
        reason: 'DB 레코드 없음'
      })
    }
  }

  console.log(`[verifyRoundTrip] 성공: ${results.success} / 실패: ${results.failed}`)
  if (results.details.length > 0) {
    console.table(results.details)
  }

  return results
}
```

---

## 7단계: Import Route 전체 흐름 통합

API route 또는 server action에서 위 단계를 순서대로 호출한다.

**파일 위치**: `app/api/import/route.ts` 또는 `actions/importFmea.ts`

```typescript
import { createImportJob, finalizeImportJob } from '@/lib/import/importJobManager'
import { verifyRoundTrip } from '@/lib/import/verifyRoundTrip'

export async function importFmea(file: File, fmeaId: string) {

  // 1. ImportJob 생성
  const job = await createImportJob(file.name, fmeaId)
  const importJobId = job.id

  try {
    // 2. 파싱
    const parsedSheets = await parseExcel(file)

    // 3. 엔티티 순서대로 저장 + 매핑 등록
    // ⚠️ 순서 중요: 부모 → 자식 순으로 처리해야 resolveId가 항상 성공함
    await insertA4Rows(parsedSheets.A4, importJobId)
    await insertA5Rows(parsedSheets.A5, importJobId)
    await insertFmRows(parsedSheets.FM, importJobId)
    await insertFeRows(parsedSheets.FE, importJobId)
    await insertFcRows(parsedSheets.FC, importJobId)
    await insertPcRows(parsedSheets.PC, importJobId)
    await insertDcRows(parsedSheets.DC, importJobId)

    // 4. 전체 체인 검증
    const verifyResult = await verifyRoundTrip(importJobId)

    // 5. ImportJob 완료 처리
    await finalizeImportJob(
      importJobId,
      'success',
      verifyResult.success + verifyResult.failed
    )

    return {
      importJobId,
      success: verifyResult.success,
      failed: verifyResult.failed,
      details: verifyResult.details
    }

  } catch (error) {
    await finalizeImportJob(importJobId, 'failed', 0)
    throw error
  }
}
```

---

## 8단계: 누락 체인 디버깅 쿼리

개발 중 누락 원인 추적 시 활용한다.

```sql
-- importJobId별 엔티티 타입 현황 확인
SELECT entityType, COUNT(*) as count
FROM ImportMapping
WHERE importJobId = 'job_xxx'
GROUP BY entityType;

-- 매핑은 있으나 DB 레코드가 없는 FC 찾기
SELECT m.*
FROM ImportMapping m
LEFT JOIN FailureCause fc ON m.generatedId = fc.id
WHERE m.importJobId = 'job_xxx'
  AND m.entityType = 'FC'
  AND fc.id IS NULL;
```

---

## 구현 순서 요약

| 순서 | 작업 | 파일 |
|------|------|------|
| 1 | Prisma schema 추가 + migrate | `schema.prisma` |
| 2 | importJobManager 작성 | `lib/import/importJobManager.ts` |
| 3 | 기존 parsing 코드에 `registerMapping` 삽입 | 기존 parser 파일 |
| 4 | 기존 FK 연결 코드를 `resolveId` 방식으로 교체 | 기존 injector 파일 |
| 5 | FC 연결 코드 동일하게 교체 | 기존 injector 파일 |
| 6 | verifyRoundTrip 작성 | `lib/import/verifyRoundTrip.ts` |
| 7 | import route에서 전체 통합 | `app/api/import/route.ts` |
| 8 | 테스트 후 누락 0건 확인 | — |

---

## 핵심 원칙

> **엔티티 insert 순서는 절대적이다.**
> 부모가 먼저 등록되어야 자식의 `resolveId`가 성공한다.
> `A4 → A5 → FM → FE → FC → PC → DC` 순서를 반드시 지킨다.

> **verifyRoundTrip 호출 시점**
> - 개발 중: 매 import마다 실행
> - 안정화 후: 실패 케이스(`failed > 0`)에서만 실행