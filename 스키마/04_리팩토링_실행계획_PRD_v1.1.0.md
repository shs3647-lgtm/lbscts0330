# PFMEA Import 완전 리팩토링 실행 계획 (PRD)

> **버전**: v1.1.0 (2026-03-16) — DB 진단 결과 반영, 수정 범위 정확화
> **변경**: 아키텍처 재판정(UUID FK 이미 존재) / 실제 고아 원인(카테시안 복제) 확정 / Phase 재구성
> **대상**: 오포스(개발팀) 전달용

---

## 0. 핵심 요약

### DB 진단으로 확정된 사실

| 항목 | 판정 | 근거 |
|------|------|------|
| UUID FK JOIN | ✅ 이미 올바름 | fmId/feId/fcId NOT NULL, Map.get(id) 사용 |
| 텍스트 유사도 매칭 | ✅ 사용 안 함 | enrichFailureChains.ts 확인 |
| pcId/dcId/weId | ❌ 없음 | failure_links 실측 컬럼에 부재 |
| 고아 원인 | ❌ 카테시안 복제 | A4가 A3 수만큼 복제 → FM.productCharId 불일치 |
| 현재 데이터 | ⚠️ 0건 | fmea_db Import 미실행 |
| UUID 형식 | ⚠️ nanoid 예상 | Import 후 확인 필요 |

### 수정 우선순위 재정의

```
1순위 (즉시): Import 파이프라인 카테시안 복제 버그 수정
              → 이것만 고쳐도 고아 87건 재발 방지

2순위 (단기): failure_links에 weId/pcId/dcId 컬럼 추가
              → B1/B5/A6 FK 연결 완성

3순위 (중기): UUID 형식을 nanoid → 계층 코드로 교체
              → CP/PFD 연동, 디버깅 완전화
```

---

## 1. 참조 문서 패키지 (v1.1.0)

| 파일 | 내용 | 필수 순서 |
|------|------|---------|
| `01_UUID_설계_명세서_v1.1.0.md` | UUID 형식 + 생성 함수 TypeScript | 1 |
| `02_Prisma_스키마_설계_v1.1.0.md` | 전체 스키마 + 마이그레이션 SQL | 2 |
| `03_API_설계_명세서_v1.1.0.md` | Import API + UUID 생성 함수 | 3 |
| `04_리팩토링_실행계획_PRD_v1.1.0.md` | 본 문서 — 단계별 작업 지시 | 4 |

---

## 2. Phase별 실행 계획

### Phase 0: 준비 (0.5일)

```bash
# 백업
pg_dump -h localhost -U postgres fmea_db > backup_$(date +%Y%m%d_%H%M).sql

# 브랜치
git checkout -b refactor/uuid-hierarchy-v1.1

# Import 전 현재 상태 스냅샷
psql -d fmea_db -c "SELECT COUNT(*) FROM \"FailureLink\";"
```

---

### Phase 1: 카테시안 복제 버그 수정 (1일) ← 1순위

**위치**: Import 파이프라인 — A4(ProcessProductChar) 저장 로직

**버그 패턴 식별**:
```typescript
// 아래 패턴이 있으면 버그 — A3 루프 안에서 A4를 생성하는 경우
for (const a3 of a3List) {
  for (const a4 of a4List) {
    await prisma.processProductChar.create({ ... })  // ❌ 카테시안 복제
  }
}
```

**수정 방법**:
```typescript
// ✅ A4는 공정(PNO) 단위로 1회만 생성
// A4 먼저 전량 upsert → id 메모리 맵 구성
const a4Map = new Map<string, string>(); // valueKo → id

for (let i = 0; i < a4List.length; i++) {
  const a4Id = genA4('PF', processNo, i + 1);
  await prisma.l2ProductChar.upsert({
    where: { id: a4Id },
    create: { id: a4Id, valueKo: a4List[i], processId, ... },
    update: { valueKo: a4List[i], ... }
  });
  a4Map.set(a4List[i], a4Id);  // 메모리 맵에 저장
}

// A5는 a4Map에서 id 직접 조회 — DB 재조회 금지
for (let i = 0; i < a5List.length; i++) {
  const a4Id = a4Map.get(a5List[i].linkedA4Value);  // 메모리에서
  if (!a4Id) { reportError('E_A4_NOT_FOUND'); continue; }

  const a5Id = genA5('PF', processNo, i + 1);
  await prisma.failureMode.upsert({
    where: { id: a5Id },
    create: { id: a5Id, productCharId: a4Id, ... },  // a4Id 직접 사용
    update: { productCharId: a4Id, ... }
  });
}
```

**검증**:
```sql
-- 수정 후 Import 실행 → 아래 쿼리 결과 0건이어야 함
SELECT COUNT(*) AS orphan
FROM "FailureMode" fm
LEFT JOIN "L2ProductChar" pc ON fm."productCharId" = pc.id
WHERE pc.id IS NULL AND fm."productCharId" IS NOT NULL;
```

**완료 기준**: Import 후 고아 FM = **0건**

---

### Phase 2: UUID 생성기 도입 (0.5일)

**신규 파일**: `lib/uuid-generator.ts`

참조: `01_UUID_설계_명세서_v1.1.0.md` §7 "UUID 생성 함수"

```typescript
// 구현 체크리스트
// □ genC1~genC4 함수 구현
// □ genA1~genA6 함수 구현
// □ genB1~genB5 함수 구현
// □ genFC 함수 구현
// □ getParentId 파싱 함수 구현
// □ pad() 유틸 함수 (3자리 zero-padding)
```

**Vitest 테스트** (`uuid-generator.test.ts`):
```typescript
test('C4 UUID는 부모 C3 UUID를 prefix로 포함', () => {
  const c4 = genC4('PF', 'YP', 1, 2, 3);
  const c3 = genC3('PF', 'YP', 1, 2);
  expect(c4).toBe('PF-L1-YP-001-002-003');
  expect(c4.startsWith(c3)).toBe(true);
});

test('USER는 US로 단축', () => {
  expect(genC1('PF', 'USER')).toBe('PF-L1-US');
});

test('공정번호 3자리 zero-pad', () => {
  expect(genA5('PF', 40, 1)).toBe('PF-L2-040-M-001');
  expect(genA5('PF', 100, 1)).toBe('PF-L2-100-M-001');
});

test('B4 UUID는 B1 UUID를 prefix로 포함', () => {
  const b4 = genB4('PF', 40, 'MC', 1, 1);
  const b1 = genB1('PF', 40, 'MC', 1);
  expect(b4.startsWith(b1)).toBe(true);
});

test('genFC는 결정론적 — 동일 파라미터 = 동일 결과', () => {
  expect(genFC('PF', 40, 1, 'MC', 1, 1)).toBe(genFC('PF', 40, 1, 'MC', 1, 1));
});
```

**완료 기준**: 5개 테스트 전부 PASS

---

### Phase 3: failure_links에 weId/pcId/dcId 추가 (1일)

**Prisma 마이그레이션**:

```prisma
// schema.prisma FailureLink 모델에 추가
weId String? @db.VarChar(60)
pcId String? @db.VarChar(60)
dcId String? @db.VarChar(60)
```

```bash
npx prisma migrate dev --name add_we_pc_dc_to_failure_links
```

**기존 데이터 weId 소급 연결** (SQL):
```sql
-- fcWorkElem 캐시 텍스트로 weId 연결
UPDATE "FailureLink" fl
SET "weId" = we.id
FROM "L3WorkElement" we
WHERE we."valueKo" = fl."fcWorkElem"
  AND we."fmeaId" = fl."fmeaId";

-- 연결 결과 확인
SELECT
  COUNT(*) FILTER (WHERE "weId" IS NOT NULL) AS connected,
  COUNT(*) FILTER (WHERE "weId" IS NULL)     AS unconnected
FROM "FailureLink";
```

**Import 파이프라인에 weId/pcId/dcId 설정 추가**:
```typescript
// FC 파서에서 FailureLink 생성 시
await prisma.failureLink.upsert({
  where: { id: linkId },
  create: {
    id: linkId,
    fmId, feId, fcId,       // 기존
    weId: weId ?? null,      // 추가
    pcId: pcId ?? null,      // 추가
    dcId: dcId ?? null,      // 추가
    // 캐시 필드도 함께 유지
    fmText, fcWorkElem, fcM4, feText, ...
  },
  update: { weId, pcId, dcId, ... }
});
```

**완료 기준**:
- `npx prisma validate` 오류 0건
- weId 연결률 80% 이상 (캐시 텍스트 기반)
- 신규 Import 후 weId/pcId/dcId 전부 non-null

---

### Phase 4: UUID 형식 계층 코드로 전환 (1.5일)

현재 nanoid 형식 → `PF-L2-040-M-001` 형식으로 교체.

참조: `02_Prisma_스키마_설계_v1.1.0.md` §4 "마이그레이션 SQL"

**전환 전략**: 새 Import부터 계층 코드 사용, 기존 데이터는 소급 마이그레이션

```typescript
// Import 파이프라인 수정 핵심 — id 결정 방식 변경
// ❌ 기존: @default(cuid()) 또는 nanoid() 랜덤 생성
// ✅ 변경: uuid-generator.ts 함수로 결정론적 생성

// A4 예시
const a4Id = genA4('PF', processNo, a4Seq);  // "PF-L2-040-P-001"
// A5 예시
const a5Id = genA5('PF', processNo, a5Seq);  // "PF-L2-040-M-001"
```

**기존 데이터 마이그레이션 스크립트** (`scripts/migrate-to-hierarchy-uuid.ts`):
```typescript
// 공정별 순차 처리
// A4: sheetRow 오름차순 → seq 1,2,3... → new_id 계산 → 교체
// A5: 동일 패턴 + productCharId 동시 업데이트
// B1~B5: 동일 패턴
// C1~C4: div+seq 계산 → 교체
// FC: 의존 UUID 전부 교체 완료 후 마지막으로 처리
```

**완료 기준**:
```sql
-- 전체 id가 계층 코드 형식인지 확인
SELECT id FROM "FailureMode" LIMIT 5;
-- 기대: PF-L2-040-M-001, PF-L2-040-M-002, ...

SELECT id FROM "FailureLink" LIMIT 5;
-- 기대: PF-FC-040-M001-MC001-K001, ...
```

---

### Phase 5: QA (0.5일)

**자동화 테스트**:
```bash
npx vitest run
```

**체크리스트**:
```
□ GOLDEN_TEST 파일 Import → 고아 FM 0건
□ Import 2회 반복 → 고아 0건 (결정론적 확인)
□ failure_links.fmId/feId/fcId 전부 non-null
□ failure_links.weId 연결률 100%
□ 통계 탭 orphan count = 0
□ 워크시트 화면 고장사슬 정상 렌더링
□ AP 개선 탭 RiskAnalysis 정상 조회
□ UUID 형식 PF-L2-{PNO}-M-{seq} 확인
```

**Import 후 최종 검증 쿼리**:
```sql
-- 1. 고아 FM (목표: 0)
SELECT COUNT(*) FROM "FailureMode" fm
LEFT JOIN "L2ProductChar" pc ON fm."productCharId" = pc.id
WHERE pc.id IS NULL AND fm."productCharId" IS NOT NULL;

-- 2. FK 빈 문자열 (목표: 0)
SELECT COUNT(*) FROM "FailureLink"
WHERE "fmId" = '' OR "feId" = '' OR "fcId" = '';

-- 3. weId NULL (목표: 0)
SELECT COUNT(*) FROM "FailureLink" WHERE "weId" IS NULL;

-- 4. id 형식
SELECT id FROM "FailureMode" LIMIT 3;
SELECT id FROM "FailureLink" LIMIT 3;
```

---

## 3. 작업 일정

| Phase | 작업 | 공수 | 완료 기준 |
|-------|------|------|---------|
| 0 | 준비·백업 | 0.5일 | 백업 확인 |
| **1** | **카테시안 복제 버그 수정** | **1일** | **고아 0건 ← 최우선** |
| 2 | UUID 생성기 구현 | 0.5일 | Vitest 5개 PASS |
| 3 | weId/pcId/dcId 추가 | 1일 | 연결률 80%+ |
| 4 | UUID 형식 전환 | 1.5일 | 계층 코드 형식 확인 |
| 5 | QA | 0.5일 | 체크리스트 전부 ✅ |
| **합계** | | **5일** | |

---

## 4. 절대 금지 사항

```
❌ 1. id 필드에 @default(cuid()) / @default(uuid()) 사용
      → uuid-generator.ts 함수로 명시적 전달

❌ 2. A5 저장 전 A4 id를 findFirst로 재조회
      → 메모리 맵(a4Map)에서 직접 사용

❌ 3. A4를 A3 루프 안에서 반복 생성
      → PNO 단위로 1회만 upsert (카테시안 복제 방지)

❌ 4. FC 파서에서 텍스트 유사도/includes 매칭
      → exactMap.get(valueKo) → UUID FK 직접 설정

❌ 5. Phase 1 완료 전 Import 실행 금지
      → 현재 버그 상태로 Import하면 고아 재발
```

---

## 5. 완료 후 기대 효과

| 지표 | Before (pfm26-m021) | After |
|------|---------------------|-------|
| 고아 FM→PC | 66건 | **0건** |
| 고아 L2→L1 | 21건 | **0건** |
| weId/pcId/dcId | 없음 | **완전 연결** |
| UUID 형식 | `Hk3xQ9...` (불투명) | `PF-L2-040-M-001` (즉시 해석) |
| CP 연동 | 불가 | `CP-L2-{PNO}` 직접 매핑 |
| 재Import 안전성 | 고아 누적 | 결정론적 upsert |

---

*Smart FMEA OnPremise v5.5+ — Refactoring PRD v1.1.0*
*DB 진단 결과(fmea_db, 2026-03-16) 반영*
*Phase 1(카테시안 복제 수정)이 가장 먼저, 가장 중요합니다.*
