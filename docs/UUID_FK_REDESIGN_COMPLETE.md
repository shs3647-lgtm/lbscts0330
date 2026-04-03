# UUID / 복합키 / FK / parentId 재설계 — 완료 요약

**기준 문서**: `docs/FMEA Import UUID복합키FKparentId 재설계 적용.md`  
**최종 갱신**: 2026-04-03

## 산출물 (코드)

| # | 내용 | 경로 |
|---|------|------|
| 1 | dedupKey 유틸 | `src/lib/fmea/utils/dedup-key.ts` |
| 2 | 레거시/역변환 flat에 `dedupKey` 보강 | `src/lib/fmea/utils/flat-dedup-key-enrich.ts` (`enrichImportedFlatWithDedupKeys`) |
| 3 | 타입 | `ImportedFlatData.dedupKey?` — `src/app/(fmea-core)/pfmea/import/types.ts` |
| 4 | 위치기반 atomic→flat | `src/lib/fmea/position-parser.ts` — `atomicToFlatData` |
| 5 | 워크시트 DB→flat | `src/app/(fmea-core)/pfmea/import/utils/atomicToFlatData.ts` — 반환 전 enrich |
| 6 | Import 사전검증 | `src/lib/fmea-core/validate-import.ts` — `validateImportData` 시작 시 enrich + Check 5에서 `dedupKey` 우선 |
| 7 | Auto Import 핸들러 | `useImportFileHandlers.ts` — 병합 키 `dedupKey` 우선, 마스터 저장/재로드 시 enrich |
| 8 | Legacy Import UI | `legacy/page.tsx` — Master 적용·데이터셋 로드·백업 복원 시 enrich, `getBK`가 `dedupKey` 우선 |

## 테스트

- `tests/lib/fmea/dedup-key.test.ts`
- `tests/lib/fmea/flat-dedup-key-enrich.test.ts`
- `tests/import/atomic-to-flat-dedup-key.test.ts`
- `tests/import/atomic-to-flat-a6-b5.test.ts`
- `tests/import/worksheet-atomic-to-flat-fk.test.ts`
- `npm run test:import-slice` (위 + guard + position-parser 등 **66 tests**)
- `npx tsc --noEmit`

## Step 3-3 (렌더링)

- **워크시트 탭**(구조/기능/고장 본탭): `CLAUDE.md` Rule 2(기존 UI 변경 금지)에 따라 **레이아웃/그리드에 `deduplicateForRendering` 미삽입**.
- **Import 측 행 식별**: 미리보기/병합은 `dedupKey`(또는 enrich 후 생성된 키)를 우선 사용해 **동일 표시값·다른 부모** 구분과 문서의 복합키 정책을 맞춤.
- `deduplicateForRendering`은 유틸로 유지 — 향후 Import-only 테이블 등 **신규 뷰**에서 선택 적용 가능.

## Step 3-2b / 3-2c (DB 저장 순서)

- **문서상 Phase A/B/C 함수 분리**까지의 대규모 리팩터는 이번 범위에서 **생략**.
- 위치기반 저장은 기존처럼 **`save-position-import` 등 단일 `$transaction`** 안에서 수행되며, FK 필드 보호는 `CLAUDE.md` Rule 3.1·3.2 유지.

## 안티패턴 체크 (요약)

- `dedupKey`는 **부모 스코프 + 식별자 + (필요 시) 행/엔티티 id** 조합을 사용. 이름만으로 FK를 확정하는 로직은 추가하지 않음.
- `position-parser` / `atomicToFlatData`의 A4·FN_L2 등은 문서대로 **제품특성(A4) id = PC FK**를 키에 포함.
- 문서 §안티패턴 전수 `grep`은 릴리스 전 로컬에서 주기 실행 권장.

## 의사결정 (변경 없음)

- A4 SSoT: `ProcessProductChar.id` (FK).
- C3: 표시·요구사항은 `L1Function.requirement`; 체인·키는 `L1Function`/`C2` 행 id 기반 보강.
