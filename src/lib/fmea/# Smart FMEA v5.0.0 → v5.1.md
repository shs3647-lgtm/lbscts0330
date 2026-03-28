# Smart FMEA v5.0.0 → v5.1.0 최적화 마스터 플랜

> **기준 버전**: v5.0.0-pipeline-complete (Import → 파싱 → DB적재 → 고장연결 완전 구현)
> **목표 버전**: v5.1.0-optimized
> **작업 브랜치**: `optimize/v5.1.0`
> **원칙**: master 브랜치 직접 수정 금지 · 각 항목 완료 후 smoke test 필수
> **최종 업데이트**: 2026-03-25

---

## 브랜치 준비

```bash
git checkout master
git pull origin master
git checkout -b optimize/v5.1.0
```

---

## 현재 상태 요약 (v5.0.0 기준)

| 영역 | 상태 | 비고 |
|------|------|------|
| Prisma 싱글톤 | 완료 | `src/lib/prisma.ts` — globalForPrisma + adapter-pg + 스키마별 Pool 캐싱 |
| Connection Pool | 완료 | 스키마별 `getPrismaForSchema()` + `Pool` 격리 |
| API gzip 압축 | 완료 | Next.js 16 기본 `compress: true` + OWASP 보안 헤더 |
| failureChainInjector | 완료 | deprecated → `position-parser.ts`로 대체, Map 인덱싱 사용 중 |
| FMEA 스키마 인덱싱 | 완료 | FailureLink 6-7개 인덱스, UNIQUE 제약 (`fmeaId, fmId, feId, fcId`) |

---

## 최적화 항목 목록

| # | 영역 | 항목 | 위험도 | 우선순위 | 예상공수 | 완료 |
|---|------|------|--------|----------|----------|------|
| O-01 | Prisma | N+1 쿼리 제거 (루프 내 `findFirst` 배치화) | 낮음 | High | 2h | [ ] |
| O-02 | Prisma | `select` 필드 제한 (워크시트 로드 불필요 컬럼 제거) | 낮음 | Medium | 3h | [ ] |
| O-03 | Import | `createMany` 500건 단위 청크 분할 | 중간 | High | 1h | [ ] |
| O-04 | 트랜잭션 | `maxWait` 누락 보완 + timeout 표준화 | 낮음 | High | 0.5h | [ ] |
| O-05 | Loader | `atomicToLegacy()` 변환 결과 `useMemo` 래핑 | 낮음 | Medium | 1h | [ ] |
| O-06 | TypeScript | `any` 타입 제거 (position-parser.ts 8건) | 낮음 | Medium | 2h | [ ] |
| O-07 | API Route | Import 에러 메시지 구체화 (Prisma 에러 분류) | 낮음 | Low | 2-3h | [ ] |
| O-08 | 모듈화 | 700행 초과 파일 분리 (position-parser 1718행, rebuild-atomic 1529행) | 낮음 | Medium | 4-6h | [ ] |
| ~~O-09~~ | ~~Connection Pool~~ | ~~튜닝~~ | — | — | — | [x] 이미 완료 |
| ~~O-10~~ | ~~API 압축~~ | ~~gzip + 보안 헤더~~ | — | — | — | [x] 이미 완료 |

---

## 항목별 상세

---

### O-01: N+1 쿼리 제거

**문제**: `rebuild-atomic/route.ts`에서 루프 내 `findFirst` 호출 → FailureLink N건마다 RiskAnalysis 개별 쿼리

**현재 코드** (`rebuild-atomic/route.ts`):
```typescript
// N+1 패턴: peerFLs 건수만큼 DB 쿼리 반복
for (const pfl of peerFLs) {
  const pra = await tx.riskAnalysis.findFirst({
    where: { linkId: pfl.id, fmeaId }
  });
  // ...
}
```

**수정 후**:
```typescript
// 배치 로드 → Map 조회 (O(n) → O(1) per lookup)
const allRAs = await tx.riskAnalysis.findMany({
  where: {
    linkId: { in: peerFLs.map(x => x.id) },
    fmeaId,
  },
});
const raByLinkId = new Map(allRAs.map(ra => [ra.linkId, ra]));

for (const pfl of peerFLs) {
  const pra = raByLinkId.get(pfl.id);
  // ...
}
```

**검증**: Prisma query log 활성화 → 쿼리 수 비교
```typescript
// prisma.ts 임시: log: ['query'] 추가 후 카운트
```

---

### O-02: `select` 필드 제한

**문제**: 워크시트 데이터 로드 시 `findMany`가 모든 컬럼을 포함 → 대형 필드(`data`, `rawJson`, timestamp) 불필요 전송

**대상 파일**: `src/lib/fmea/useWorksheetDataLoader.ts`, `rebuild-atomic/route.ts`

**수정 후**:
```typescript
const l2Data = await prisma.l2Structure.findMany({
  where: { fmeaId },
  select: {
    id: true,
    fmeaId: true,
    processNo: true,
    processName: true,
    order: true,
    parentId: true,
    // createdAt, updatedAt, rawJson 등 UI 불필요 컬럼 제외
  },
  orderBy: { order: 'asc' },
});
```

**주의**: `select`와 `include`는 동시 사용 불가 — 관계 필드도 `select` 내에서 지정

---

### O-03: 대용량 배치 청크 분할

**문제**: `rebuild-atomic/route.ts`에 15개 `createMany` 호출이 청크 없이 단일 실행 → 1000건+ Import 시 PostgreSQL statement 크기 초과 위험

**현재**: `createMany({ data: fcToCreate, skipDuplicates: true })` — 제한 없음

**수정 후**:
```typescript
// src/lib/fmea-core/batch-utils.ts
async function batchCreateMany<T extends Record<string, unknown>>(
  tx: PrismaTransaction,
  model: { createMany: (args: { data: T[]; skipDuplicates?: boolean }) => Promise<unknown> },
  data: T[],
  chunkSize = 500,
): Promise<void> {
  for (let i = 0; i < data.length; i += chunkSize) {
    await model.createMany({
      data: data.slice(i, i + chunkSize),
      skipDuplicates: true,
    });
  }
}

// 사용 예시 (rebuild-atomic 내부, $transaction 안에서)
await batchCreateMany(tx, tx.failureCause, fcToCreate);
await batchCreateMany(tx, tx.failureLink, flsToCreate);
await batchCreateMany(tx, tx.riskAnalysis, rasToCreate);
```

**주의**: 모든 청크는 동일 `$transaction(tx)` 내부 — 원자성 유지

---

### O-04: 트랜잭션 타임아웃 표준화

**문제**: `maxWait` 미설정 (Prisma 기본 5초), timeout 값 불일치

**현재 상태**:

| 파일 | timeout | maxWait | 문제 |
|------|---------|---------|------|
| `rebuild-atomic/route.ts:1477` | 30000 | 미설정 | maxWait 누락 |
| `rebuild-atomic/route.ts:1487` | 15000 | 미설정 | timeout 짧음 |
| `save-atomic.ts:188` | 30000 | 미설정 | maxWait 누락 |

**표준 설정** (모든 `$transaction` 호출에 적용):
```typescript
await prisma.$transaction(
  async (tx) => {
    // import/rebuild 로직
  },
  {
    timeout: 60_000,        // 60초 — 대용량 Import 대비
    maxWait: 10_000,        // 커넥션 풀 대기 최대 10초
    isolationLevel: 'Serializable',
  }
);
```

**검증**: `grep -rn '\$transaction' src/app/api/fmea/ src/lib/` → 모든 호출에 3개 옵션 포함 확인

---

### O-05: atomicToLegacy 메모이제이션

**문제**: 탭 전환/셀 클릭 시마다 `atomicToLegacy()` 전체 변환 재실행

**대상**: `src/lib/fmea/useWorksheetDataLoader.ts`

**수정 후**:
```typescript
import { useMemo } from 'react';

// atomicData 참조가 변경될 때만 변환 실행
const legacyData = useMemo(() => {
  if (!atomicData) return null;
  return atomicToLegacy(atomicData);
}, [atomicData]);
```

**의존성 주의**: `atomicData`가 DB fetch 결과라면 참조 안정성 확보됨. `useState`로 보관 시 매 렌더 새 객체 생성 여부 확인

---

### O-06: TypeScript `any` 타입 제거

**문제**: `position-parser.ts`에 8건의 `any` 타입 → 런타임 에러 사전 탐지 불가

**탐색**:
```bash
grep -rn ": any\|as any" src/lib/fmea/position-parser.ts
```

**수정 방향**:
```typescript
// 수정 전
const fcByRowMap = new Map<number, any>();
async function parsePositionBasedJSON(data: any): Promise<PositionBasedResult> { ... }

// 수정 후
interface LinkData {
  fmId: string;
  feId: string;
  fcId: string;
  l2StructId: string;
  l3StructId: string;
}
const fcByRowMap = new Map<number, LinkData>();
async function parsePositionBasedJSON(data: PositionBasedJSON): Promise<PositionBasedResult> { ... }
```

**주의**: `position-parser.ts`는 CODEFREEZE 대상 — Rule 3.1에 따라 FK 필드 제거 금지. 타입 교체만 허용

---

### O-07: Import 에러 메시지 구체화

**문제**: Import 실패 시 제네릭 "Internal Server Error" → 원인 추적 불가

**대상**: `rebuild-atomic/route.ts`, `save-position-import/route.ts`

**수정 후**:
```typescript
import { Prisma } from '@prisma/client';
import { safeErrorMessage } from '@/lib/security';

try {
  await prisma.$transaction(async (tx) => {
    // import 로직
  }, { timeout: 60_000, maxWait: 10_000, isolationLevel: 'Serializable' });

  return NextResponse.json({ success: true });

} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: '중복 데이터: 동일한 고장사슬이 이미 존재합니다.', code: error.code },
        { status: 409 }
      );
    }
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'FK 참조 오류: 연결된 구조/기능 항목이 존재하지 않습니다.', code: error.code },
        { status: 422 }
      );
    }
  }

  console.error('[Import] Unexpected:', error);
  return NextResponse.json(
    { error: safeErrorMessage(error) },
    { status: 500 }
  );
}
```

---

### O-08: 700행 초과 파일 분리

**문제**: Rule 6 위반 — 2개 파일이 700행 크게 초과

| 파일 | 현재 행수 | 위반 배율 |
|------|----------|----------|
| `src/lib/fmea/position-parser.ts` | 1718 | 2.5x |
| `src/app/api/fmea/rebuild-atomic/route.ts` | 1529 | 2.2x |

**분리 방안**:

**position-parser.ts** (1718행 → 3파일):
| 파일 | 역할 | 예상 행수 |
|------|------|----------|
| `position-parser.ts` | 메인 진입점 + 시트 판별 (`isPositionBasedFormat`) | ~400 |
| `position-sheet-resolver.ts` | L1/L2/L3/FC 시트별 파싱 로직 | ~600 |
| `position-link-builder.ts` | FK 할당 + FailureLink 조립 | ~500 |

**rebuild-atomic/route.ts** (1529행 → 3파일):
| 파일 | 역할 | 예상 행수 |
|------|------|----------|
| `route.ts` | API 엔드포인트 + 트랜잭션 래핑 | ~300 |
| `atomic-builder.ts` | L1~L3 Structure/Function 생성 로직 | ~600 |
| `link-risk-builder.ts` | FailureLink + RiskAnalysis 생성/dedup | ~500 |

**주의**: CODEFREEZE 파일은 분리 전 사용자 승인 필수 (Rule 3)

---

## 실행 순서 (권장)

```
1. O-04 (0.5h) — maxWait 추가 + timeout 표준화 (즉시 효과, 최소 위험)
2. O-03 (1h)   — createMany 청크 분할 (대용량 Import 안정성)
3. O-01 (2h)   — N+1 쿼리 배치화 (rebuild-atomic 성능)
4. O-05 (1h)   — useMemo 래핑 (클라이언트 렌더링 최적화)
5. O-06 (2h)   — any 타입 제거 (타입 안전성)
6. O-07 (2-3h) — 에러 메시지 구체화 (운영 디버깅)
7. O-08 (4-6h) — 파일 분리 (유지보수성, 선택적)
```

**총 예상 공수**: 12.5 ~ 17.5h (O-08 선택적)

---

## Smoke Test 체크리스트

> 각 최적화 항목 완료 후, master 병합 전 필수 수행

```
[ ] tsc --noEmit — 타입 에러 0건
[ ] pipeline-verify GET pfm26-m002 — allGreen=true
[ ] Excel Import 정상 완료 (master_import_12inch_AuBump.xlsx)
[ ] Import 후 워크시트 렌더링 정상 (L2=21, FL=111, RA=111)
[ ] 고장연결 다이어그램 정상 (FM→FE→FC 라인 표시)
[ ] rebuild-atomic 실행 → DC/PC 111/111
[ ] 연속 Import 2회 → 데이터 중복 없음
[ ] 트랜잭션 실패 시 롤백 정상 (의도적 FK 오류 주입)
[ ] 브라우저 콘솔 에러 없음
```

---

## 병합 및 태깅

```bash
# 최적화 완료 후
git add -A
git commit -m "perf: v5.1.0 — N+1 batch, chunk createMany, tx timeout, useMemo, type safety"

git checkout master
git merge optimize/v5.1.0

git tag -a v5.1.0-optimized -m "파이프라인 최적화 완료. Smoke test + pipeline-verify 통과."
git push origin master --tags
```

---

*최종 업데이트: 2026-03-25 | Smart FMEA v5.0.0 → v5.1.0*