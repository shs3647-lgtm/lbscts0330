# CP & PFD ���로젝트 스키마 개선 계획서

> **작성일**: 2026-04-04
> **위반 규칙**: Rule 19 (프로젝트�� 별도 DB 스키마 필수), Rule 1 (empty catch 금지)
> **개발 프로세스**: Forge 6단계 (EXPLORE → PLAN → TDD → EXECUTE → VERIFY → COMMIT)

---

## 1. 진단 결과 요약

### 1.1 EXPLORE 결과 — 실제 위반 범위 (정밀 분석)

초기 진단에서 CP 23건, PFD 14건 위반으로 보고되었으나, **정밀 분석 결과 대부분은 메타���이터(public) 접근으로 정상**이며, 실제 위반은 아래 5개 파일.

#### CP 실제 위반 (3개 파일)

| 파일 | 위반 내용 | 영향 모델 |
|------|----------|----------|
| `src/app/api/control-plan/route.ts` | `ControlPlan` CRUD가 `getPrisma()` (public) | ControlPlan 생성/삭제 |
| `src/app/api/control-plan/[id]/route.ts` | `ControlPlan` + items 전체가 `getPrisma()` | ControlPlan/Item 조회/수정/삭제 |
| `src/app/api/control-plan/[id]/status/route.ts` | `ControlPlan.update()` 가 `getPrisma()` | ControlPlan 상태 변경 |

> **이미 정상인 파일**: `[id]/items/route.ts` (getPrismaForCp 사용 ✅), master, master-processes, next-id, revisions, basic-info, stats (메타데이터 전용 ✅)

#### PFD 실제 위반 (2개 파일)

| 파일 | 위반 내용 | 영향 모델 |
|------|----------|----------|
| `src/app/api/pfd/route.ts` | DELETE 트랜잭션에서 `pfdItem.deleteMany()` 가 public 접근 | PFD 삭제 시 프로젝트 데이터 미삭제 |
| `src/app/api/pfd/[id]/revision/route.ts` | `pfdItem.createMany()` 가 public 접근 | 리비전 복제 시 public에 저장 |

> **이미 정상인 파일**: `[id]/route.ts`, `[id]/items/route.ts`, `sync-from-fmea/`, `sync-from-cp/`, `master/` (getPrismaForPfd 사용 ✅), `revisions/` (메타데이터 전용 ✅)

#### Empty Catch 위반 (src/ 내 7건)

| 파일 | 라인 | 위험도 | 컨텍스트 |
|------|------|--------|---------|
| `pfmea/register/page.tsx` | 178, 181 | LOW | `.catch(() => {})` — fetch 무시 |
| `control-plan/register/hooks/useCpRegisterCore.ts` | 155, 322 | MEDIUM | `.catch(() => {})` — API 호출 무시 |
| `pfd/register/page.tsx` | 317 | LOW | `.catch(() => {})` — fetch 무시 |
| `components/common/SpecialCharBadge.tsx` | 77 | LOW | `catch {}` — localStorage |
| `control-plan/[id]/items/route.ts` | 356 | HIGH | `.catch(() => {})` — DB 동기화 무시 |

#### CLAUDE.md 경로 불일치 (1건)

| 위치 | 문제 |
|------|------|
| `CLAUDE.md` 99줄 | `.claude/rules/` 참조 → 실제 `docs/claude-rules/` |

---

## 2. 수정 계획

### Phase 1: CP 프로젝트 스키마 전환 (3파일)

**에이전트 역할**: 구현 에이전트 (CP 전담)

#### 2.1 `control-plan/route.ts` — ControlPlan CRUD

**변경 전**:
```typescript
import { getPrisma } from '@/lib/prisma';
const prisma = getPrisma();
await prisma.controlPlan.create({ ... });
```

**변경 후**:
```typescript
import { getPrisma } from '@/lib/prisma';
import { getPrismaForCp } from '@/lib/project-schema';

// 메타데이터 (public) — 유지
const prisma = getPrisma();
await prisma.cpRegistration.create({ ... }); // ✅ 메타데이터

// 프로젝트 데이터 — 전환
const projPrisma = await getPrismaForCp(cpNo);
await projPrisma.controlPlan.create({ ... }); // ✅ 프로젝트 스키마
```

**주의**: POST/DELETE에서 `ControlPlan` 모델 접근 부분만 `projPrisma` 전환. `CpRegistration`, `ProjectLinkage` 등 메타데이터는 `getPrisma()` 유지.

#### 2.2 `control-plan/[id]/route.ts` — 단일 CP CRUD

- GET: `controlPlan.findUnique` → `projPrisma`
- PUT: `controlPlan.update` → `projPrisma`
- DELETE: `controlPlan.delete` → `projPrisma`
- cpNo 파라미터 추가 필요 (쿼리스트링 또는 DB 조회)

#### 2.3 `control-plan/[id]/status/route.ts` — 상태 변경

- `controlPlan.update({ status })` → `projPrisma`
- `cpRegistration.update` 는 public 유지

---

### Phase 2: PFD 프로젝트 스키마 전환 (2파일)

**에이전트 역할**: 구현 에이전트 (PFD 전담)

#### 2.4 `pfd/route.ts` — DELETE 트랜잭션

**변경**: DELETE 내 `pfdItem.deleteMany()`, `pfdMasterDataset.deleteMany()` 를 프로젝트 스키마 클라이언트로 전환.

```typescript
// 변경 전 (public)
await prisma.$transaction([
  prisma.pfdItem.deleteMany({ where: { pfdRegistrationId } }),
  ...
]);

// 변경 후 (프로젝트 + public 혼합)
const projPrisma = await getPrismaForPfd(pfdNo);
await projPrisma.pfdItem.deleteMany({ where: { pfdRegistrationId } });
// public 메타데이터 삭제는 getPrisma() 유지
```

#### 2.5 `pfd/[id]/revision/route.ts` — 리비전 복제

**변경**: `pfdItem.createMany()` 를 프로젝트 스키마로 전환.

```typescript
// 변경 전 (public)
await prisma.pfdItem.createMany({ data: copiedItems });

// 변경 후 (프로젝트)
const projPrisma = await getPrismaForPfd(pfdNo);
await projPrisma.pfdItem.createMany({ data: copiedItems });
```

---

### Phase 3: Empty Catch 수정 (7건)

**에이전트 역할**: 검증 에이전트 (코드 품질)

| 파일 | 수정 방법 |
|------|----------|
| `pfmea/register/page.tsx:178,181` | `.catch((e) => console.error('fetch error:', e))` |
| `useCpRegisterCore.ts:155,322` | `.catch((e) => console.error('CP register error:', e))` |
| `pfd/register/page.tsx:317` | `.catch((e) => console.error('PFD fetch error:', e))` |
| `SpecialCharBadge.tsx:77` | `catch (e) { console.error('localStorage:', e); }` |
| `control-plan/[id]/items/route.ts:356` | `.catch((e) => console.error('CP sync error:', e))` |

---

### Phase 4: CLAUDE.md 경로 수정 (1건)

99줄: `.claude/rules/` → `docs/claude-rules/`

---

## 3. TDD Guard Test 계획

### 3.1 CP 스키마 Guard Test

```typescript
// tests/guard/cp-project-schema.guard.test.ts
// CP 프로젝트 데이터 라우트에서 getPrismaForCp 사용 검증
// ControlPlan 모델 접근 시 getPrisma() 단독 사용 금지
```

### 3.2 PFD 스키마 Guard Test

```typescript
// tests/guard/pfd-project-schema.guard.test.ts
// PFD 프로젝트 데이터 라우트에서 getPrismaForPfd 사용 검증
// pfdItem 모델 접근 시 getPrisma() 단독 사용 금지
```

---

## 4. 검증 기준

| 항목 | PASS 기준 |
|------|-----------|
| tsc --noEmit | 에러 0건 |
| Guard Test (기존 14개) | 전체 PASS |
| Guard Test (신규 2개) | 전체 PASS |
| CP [id]/items 기존 기능 | 영향 없음 |
| PFD sync-from-fmea 기존 기능 | 영향 없음 |
| Empty catch 검색 | src/ 내 빈 catch 0건 (Excel mergeCells 제외) |

---

## 5. 실행 순서

```
1. Guard Test 작성 (RED)
2. CP 3파일 수정 (Phase 1)
3. PFD 2파일 수정 (Phase 2)
4. Empty catch 7건 수정 (Phase 3)
5. CLAUDE.md 경로 수정 (Phase 4)
6. tsc --noEmit → 에러 0건
7. Guard Test 전체 → PASS
8. 커밋 + 푸시
```

---

## 6. 리스크 및 주의사항

| 리스크 | 대응 |
|--------|------|
| CP cpNo 파라미터 미전달 | DB에서 CpRegistration 조회 후 cpNo 획득 |
| PFD pfdNo 파라미터 미전달 | PfdRegistration 조회 후 pfdNo 획득 |
| 프로젝트 스키마 미존재 | `ensureProjectSchemaReady` 자동 생성 |
| 기존 public 데이터 마이그레이션 | 이번 작업 범위 외 — 별도 마이그레이션 스크립트 필요 |
| ControlPlan 모델이 public에만 존재 | `getPrismaForCp`가 스키마 자동 생성 처리 |
