# UUID / 복합키 / FK / parentId 재설계 — 적용 현황

**기준 문서**: `docs/FMEA Import UUID복합키FKparentId 재설계 적용.md`  
**최종 갱신**: 2026-04-03

## 완료

### Step 3-1 — dedupKey 유틸 + normalize

| 산출물 | 경로 |
|--------|------|
| 유틸 | `src/lib/fmea/utils/dedup-key.ts` |
| 단위 테스트 | `tests/lib/fmea/dedup-key.test.ts` |

포함 API: `normalize`, `dedupKey_ST_L1` … `dedupKey_FL_FC`, `deduplicateForRendering`.

**검증**: `npx vitest run tests/lib/fmea/dedup-key.test.ts` PASS, `npx tsc --noEmit` 0 errors.

## 미적용 (후속 PR)

### Step 3-2 — Import 파싱·DB 저장

- **3-2a**: 파싱 시점 중복제거 제거 → 전 행 DB 저장 + 행별 `dedupKey` 부여. 대상: `position-parser.ts`, `import-builder.ts`, `excel-parser` 계열, `dedupeFlatB1ByWorkElement` 등. **고위험** — 골든 Import 회귀 필수.
- **3-2b**: Phase A/B/C 저장 순서·`parentId` 주입. 대상: `save-from-import`, `raw-to-atomic`, 위치기반 저장 라우트. **CODEFREEZE** 파일은 사용자 승인 없이 FK 필드 변경 금지 (`CLAUDE.md` Rule 3.1).
- **3-2c**: 단일 트랜잭션 범위 명시는 기존 `$transaction`과 정합 검토 후 문서화.

### Step 3-3 — 렌더링

- 탭별로 `deduplicateForRendering` 적용 전, 각 행에 Phase 3 표준 `dedupKey` 필드가 state/프롭에 실려야 함 (3-2와 연동).

## 안티패턴 체크리스트 (수동)

문서 §안티패턴의 `grep` 패턴으로 수정 후 전수 확인. Step 3-1만으로는 기존 인라인 키 조합이 남아 있음 — **3-2/3-3 완료 시 재실행**.

## 의사결정 (문서 확정본과 동일)

- A4 dedupKey 기준: `ProcessProductChar.id` (SSoT FK).
- C3 체인: `L1Function.id` 기준; 표시는 `L1Function.requirement`.
