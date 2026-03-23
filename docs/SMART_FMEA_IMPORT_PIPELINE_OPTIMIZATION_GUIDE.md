# Smart FMEA Import 파이프라인 코드 최적화 가이드

> **저장소:** `c:\autom-fmea` (본 문서는 경로를 이 리포지토리 기준으로 정정함)  
> **작성일:** 2026-03-23  
> **원본 기준:** v4.6.0-FC100 (별도 stable 트리) — 아래 **autom-fmea 실제 맵**을 우선한다.

---

## autom-fmea 실제 파일 맵 (Critical Path)

원안의 `src/lib/excel/*`, `1L-import-route.ts` 는 **본 리포와 다름**. 실제 위치:

| 역할 | autom-fmea 경로 |
|------|-----------------|
| ① Flat / 위치 파싱 | `src/lib/fmea/position-parser.ts` |
| ② FK (origRow) 매칭 | `src/lib/fmea/cross-sheet-resolver.ts` |
| 엑셀 시트 파싱 (PFMEA) | `src/app/(fmea-core)/pfmea/import/excel-parser.ts` |
| ③ 체인 빌더 (`buildFailureChainsFromFlat`) | `src/app/(fmea-core)/pfmea/import/types/masterFailureChain.ts` |
| ④ FC 주입 등 | `src/app/(fmea-core)/pfmea/import/utils/failureChainInjector.ts` |
| ⑤ 워크시트 상태 | `src/app/(fmea-core)/pfmea/import/utils/buildWorksheetState.ts` |
| ⑥ Import → DB (서버) | `src/app/api/fmea/save-from-import/route.ts` |

**검증·파이프라인 API:** `src/app/api/fmea/pipeline-verify/*`  
**CLI (골든):** `npm run verify:pipeline-baseline` / `verify:pipeline-baseline:strict` — `docs/LOCATION_FK_SNAPSHOT_AND_FREEZE.md` §3

---

## 정책·가드 (최적화 전 필독)

| 출처 | 내용 |
|------|------|
| `CLAUDE.md` | **CODEFREEZE** 주석 파일은 사용자 허락 없이 수정 금지. Import 핵심 일부는 프리즈 대상일 수 있음. |
| Rule 0 / 1.7 | 고장사슬은 **ID·origRow 기반** — 텍스트 폴백 제거는 방향 일치하나, 레거시 엑셀 회귀 반드시 확인. |
| Rule 15 | 코드 변경 후 `npx tsc --noEmit` + `pipeline-verify`(또는 위 npm 스크립트) 권장. |
| 사용자 규칙 | 메뉴/와이어프레임/워크시트 구조/코드프리즈 스크립트는 **사전 승인** 없이 변경 금지. |
| 테스트 | `npm run test:run` (Vitest) **전체 통과**를 VERIFY 기준으로 둔다. (테스트 **개수는 브랜치마다 다름** — 고정 “69개”는 원안 기준이며, 실행 결과의 통과 수를 기록할 것.) |

---

## 현재 상태 (원안 요약)

| 항목 | 상태 |
|------|------|
| Import 파싱 (Flat) | ✅ excelRow 키 기반 |
| FK 매칭 (origRow) | ✅ L1/L2/L3 행 기준 |
| Chain 빌더 | ✅ FC 행 ↔ 체인 (zero-loss 목표) |
| 테스트 | ✅ Vitest + `tsc --noEmit` (리포 기준) |
| 코드프리즈 태그 | 본 리포: 별도 태그 정책 따름 |

---

## 파일 찾기 (PowerShell, autom-fmea)

```powershell
$root = 'C:\autom-fmea\src'
Get-ChildItem -Recurse -Path $root -Include `
  '*position-parser*','*cross-sheet-resolver*',`
  '*masterFailureChain*','*failureChainInjector*',`
  '*buildWorksheetState*','*save-from-import*','*excel-parser*' |
  Where-Object { $_.FullName -notmatch '\\backups\\' } |
  Select-Object FullName, Length
```

---

## 최적화 순서 (안전 우선)

### 원칙

> **매 최적화 건마다** `npm run test:run` + `npx tsc --noEmit` 통과를 확인한다.  
> 실패 시 해당 커밋/스태시로 원복 후 원인 분석.

---

### Phase 1: 안전 최적화 (로직 변경 없음)

#### 1-1. 데드코드 제거

| 대상 | 설명 | 위험도 |
|------|------|--------|
| `cross-sheet-resolver.ts` | 방법 B(텍스트 폴백) 잔여 코드 완전 삭제 | 🟢 낮음 (회귀 테스트 필수) |
| `position-parser.ts` | 미사용 import·변수 | 🟢 낮음 |
| `masterFailureChain.ts` | rowSpan 등 이전 경로 잔여 | 🟢 낮음 |

**주의:** `resolveFE` 등에서 텍스트 분기 제거 시 **동일 엑셀 골든**으로 E2E/단위 테스트 확인.

#### 1-2. 불필요한 주석 / console

- `console.log` / `warn` / `debug` 정리 — **에러 추적용 `console.error`는 유지** (`CLAUDE.md` empty catch 금지와 병행).
- 구조화 로거 도입 시 한 파일씩 적용.

#### 1-3. 타입 강화

- `any` → 명시 `interface` / `type` (특히 FC/L1/L2/L3 파싱 경계).

---

### Phase 2: 성능 최적화

#### 2-1. CrossSheetResolver 인덱스

- 텍스트 인덱스 배열(`feIndex` 등) 제거 가능 여부는 **방법 A(origRow Map)만 사용하는지** 확인 후 진행.
- 목표: 조회 **Map O(1)** 위주.

#### 2-2. 체인 빌더 FM 탐색

- FC마다 `filter`+`sort` 반복 → **사전 정렬 + 단일 패스** 등으로 완화 (동작 동일성 테스트 필수).

#### 2-3. 대용량 엑셀

- `excel-parser` / `position-parser`에서 행 단위 처리·스트리밍 여부 검토 (메모리 피크 감소).

---

### Phase 3: 견고성

#### 3-1. origRow 범위 검증

- FC의 `L1_origRow` / `L2_origRow` / `L3_origRow` — 시트 `maxRow` 및 최소 행(헤더 이후) 검증 후 0 또는 스킵.

#### 3-2. 트랜잭션 원자성

- **실제 구현 확인:** `save-from-import/route.ts` 등에서 `prisma.$transaction` 범위가 Import 전체를 덮는지 검토.
- 격리 수준·타임아웃은 DB 부하와 데드락 리스크를 고려해 단계적 적용.

#### 3-3. Import 후 불변 검증

- `verifyImportIntegrity` 유사 함수: FC 수, FailureLink 수, 고아 FM/FC 등 — **기대 건수는 프로젝트/템플릿별로 다를 수 있음** (골든 `pfm26-m066` 등으로 보정).

---

### Phase 4: 태그·프리즈 (사용자 승인 후)

- 본 리포는 **코드프리즈 태그/CODEFREEZE 변경에 사용자 서면 승인**이 필요할 수 있음 (`CLAUDE.md` / 프로젝트 규칙).
- 권장: `OPTIMIZE: …` 커밋 → 검증 로그 첨부 → 승인 후 annotated tag.

---

## 최적화 체크리스트

### Phase 1
- [ ] 1-1. 데드코드 제거 (텍스트 폴백 잔여)
- [ ] 1-2. console 정리
- [ ] 1-3. 명시 타입
- [ ] `npm run test:run` + `npx tsc --noEmit` (+ 권장: `npm run verify:pipeline-baseline`)

### Phase 2
- [ ] 2-1. 인덱스 Map화
- [ ] 2-2. FM 탐색 알고리즘
- [ ] 2-3. 메모리/스트리밍
- [ ] 동일 VERIFY

### Phase 3
- [ ] 3-1. origRow 검증
- [ ] 3-2. 트랜잭션 범위
- [ ] 3-3. Import 불변 검증
- [ ] 동일 VERIFY

### Phase 4
- [ ] 최종 테스트 + 문서 동기화 (`CLAUDE.md` / `docs/MAINTENANCE_MANUAL.md` 등 Rule 17)
- [ ] (승인 후) 버전 태그

---

## Forge-style 워크플로 (권장)

1. **PLAN** — 파일 1개·diff 범위 확정  
2. **EXECUTE** — 한 커밋에 핵심 1주제  
3. **VERIFY** — `test:run` + `tsc` + (가능 시) `verify:pipeline-baseline`  
4. **COMMIT**

실패 시 `git stash` 또는 이전 커밋으로 복귀 후 재시도.

---

## .gitattributes / pre-commit (선택)

원안의 `merge=ours`·**매 커밋 전 전체 `npm test`**는 팀 정책과 충돌할 수 있다 (시간·CI·`FULL_SYSTEM` 규칙).  
적용 전 **팀 합의** 후 도입 권장.

---

## 참고 문서

- `docs/MAINTENANCE_MANUAL.md` — Import 파일 맵
- `docs/LOCATION_FK_SNAPSHOT_AND_FREEZE.md` — 파이프라인 CLI 검증
- `CLAUDE.md` — Rule 0, 1.7, 15, CODEFREEZE
