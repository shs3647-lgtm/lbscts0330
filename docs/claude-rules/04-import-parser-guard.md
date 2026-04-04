# Rule 3.1 + 3.2: Import 파이프라인 / 위치 파서 / FK 필드 보호

---

## Rule 3.1: FK 필드 제거 절대 금지 — 3중 방어 (영구 CODEFREEZE)

> **save-position-import / raw-to-atomic / position-parser의 FK 필드를 절대 제거하지 않는다.**
> parentId, feRefs, fcRefs, l2StructId, l3StructId, fmId, fcId, feId 모두 보호 대상.

### 사고 이력 (2026-03-23)

| 항목 | 내용 |
|------|------|
| **커밋** | `e1f1bd5` (10:49) |
| **명목** | "런타임 Prisma 캐시 호환성 — 서버 재시작 전까지 skip" |
| **실제** | `save-position-import/route.ts`에서 **23개 FK 필드 제거** |
| **결과** | DB에 FK 전멸 → 워크시트 렌더링 완전 실패 (FK 0%) |
| **복구** | 23개 필드 전부 복원 |

### 3중 방어 체계

| # | 방어 | 위치 |
|---|------|------|
| 1 | **CODEFREEZE 주석** | 파일 상단 경고 (Rule 3 해제 후에도 FK 필드 제거 금지) |
| 2 | **Guard Test** | `tests/guard/save-position-import-fk.guard.test.ts` |
| 3 | **CLAUDE.md Rule** | 이 룰 (Rule 3.1) |

### 보호 대상 파일 (3개)

| 파일 | 역할 | 보호 필드 |
|------|------|----------|
| `src/app/api/fmea/save-position-import/route.ts` | Import DB 저장 API | parentId ×19, feRefs, fcRefs, l2StructId, l3StructId |
| `src/lib/fmea/position-parser.ts` | 위치기반 파서 | parentId ×10 |
| `src/lib/fmea-core/raw-to-atomic.ts` | raw→atomic DB 저장 | parentId ×4 |

### 금지 패턴

```typescript
// ❌ 절대 금지: "런타임 호환성" 명목의 FK 필드 제거
-            parentId: s.parentId || null,
+            // parentId: s.parentId || null, // 런타임 미지원 → 스킵

// ✅ 허용: FK 필드 유지 + 안전 처리
parentId: s.parentId || null,   // null fallback으로 안전
feRefs: fm.feRefs || undefined, // undefined → Prisma skip
```

### 검증 방법

```bash
npx vitest run tests/guard/save-position-import-fk.guard.test.ts
# parentId 18개+, feRefs/fcRefs, l2StructId/l3StructId 존재 확인
```

---

## Rule 3.2: isPositionBasedFormat 라우팅 보호 (영구 CODEFREEZE)

> **"통합" 또는 "UNIFIED" 키워드 검사로 `return false` 처리하는 코드를 절대 삽입하지 않는다.**

### 사고 경위 (2026-03-23)

| 시점 | 커밋 | 결과 |
|------|------|------|
| 14:54 | `ab7054a` | `hasUnified` 체크 4줄 추가 → 위치기반 엑셀이 레거시 파서로 오라우팅 |
| | | A5=1, B4=18 (정상: 25+, 90+) → **106건 FC 누락** |

### PRD 근거

위치기반 포맷의 정상 시트명:
- "L1 **통합**(C1-C4)" ← "통합" 포함이 **정상**
- "L2 **통합**(A1-A6)" ← "통합" 포함이 **정상**
- "L3 **통합**(B1-B5)" ← "통합" 포함이 **정상**
- "FC 고장사슬"

### 3중 방어

| # | 방어 | 위치 |
|---|------|------|
| 1 | CODEFREEZE 주석 | `position-parser.ts` 함수 위 14줄 경고 |
| 2 | Guard Test | `tests/guard/position-format-routing.guard.test.ts` (5개) |
| 3 | CLAUDE.md | 이 룰 |

### 절대 재삽입 금지

```typescript
// ⛔ 이 코드를 다시 넣으면 전체 Import 파이프라인 파괴
const hasUnified = upper.some(n => n.includes('통합') || n.includes('UNIFIED'));
if (hasUnified) return false;
```

### 검증

```bash
npx vitest run tests/guard/position-format-routing.guard.test.ts
# "통합" 차단 코드 부재 검증 (결과 0건이 정상)
```

---

## Import 파이프라인 핵심 파일맵

| 파일 | 역할 |
|------|------|
| `src/lib/fmea/excel-parser.ts` | 엑셀 파싱 (통합시트 A6/B5 추출 포함) |
| `src/lib/fmea/position-parser.ts` | 위치기반 파서 (엑셀 물리 행=기준행) |
| `src/lib/fmea/import-builder.ts` | FlatData 빌드 (B4 dedup key 포함) |
| `src/lib/fmea-core/raw-to-atomic.ts` | raw→Atomic DB 저장 |
| `src/app/api/fmea/save-from-import/route.ts` | Import 저장 API ($transaction) |
| `src/app/api/fmea/save-position-import/route.ts` | 위치 Import 저장 API |
| `src/lib/fmea/buildAtomicFromFlat.ts` | FlatData → Atomic 변환 |
| `src/lib/fmea/atomicToLegacyAdapter.ts` | Atomic → Legacy 변환 |
| `src/lib/fmea/failureChainInjector.ts` | FC 고장사슬 주입 |

## 과거 Import 실패 사례

| 날짜 | 증상 | 근본원인 | 교훈 |
|------|------|---------|------|
| 03-23 | FK 전멸 (0%) | FK 필드 23개 제거 | FK 필드 제거 금지 (Rule 3.1) |
| 03-23 | FC 106건 누락 | "통합" 키워드 차단 | 라우팅 보호 (Rule 3.2) |
| 03-20 | emptyPC=1 재발 | B4 dedup key에 WE 미포함 | key에 WE 추가 |
| 03-19 | orphanPC 8건 | B4.parentItemId=B1 (B3이어야 함) | parentItemId 규칙 준수 |
| 03-23 | B3 행 합쳐짐 | 이름 기준 dedup → 다른 공정 동일명 합침 | id 중복만 제거 |
| 03-23 | 가짜 FC 누락 수십건 | atomicToLegacy에서 processCharId 우선 | l3FuncId 우선으로 수정 |
