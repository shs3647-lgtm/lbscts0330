# DFMEA 파이프라인 완료 보고

**작성일:** 2026-04-03 (2차 갱신)  
**근거 문서:** `docs/DFMEA 파이프라인  PFMEA 1대1 벤치마킹 전체 적용.md`

---

## 1. 목적

DFMEA를 PFMEA Import·Atomic·AllTab 체계와 **동일 물리 파이프라인**(`save-position-import`, `raw-to-atomic`, `position-parser`)으로 운용할 수 있도록, 원문 8개 작업을 1:1 벤치마킹하여 구현한다.

---

## 2. 작업별 1:1 매칭 결과

### 작업 1: DFMEA 헤더 정규화 맵

| 항목 | 상태 |
|------|------|
| `src/lib/fmea/constants/dfmea-header-map.ts` 신규 생성 | **완료** |
| `DFMEA_COLUMN_IDS` (D1~F4) | **완료** — 문서 55-74행 1:1 |
| `DFMEA_HEADER_NORMALIZE_MAP` — 헤더 변형 → canonical ID | **완료** — 문서 79-136행 1:1 |
| 구조분석 전용: `'다음 상위수준' → F1`, `'다음하위 수준' → D2`, `'타입' → E1` | **완료** — 문서 132-136행 정확히 반영 |
| `normalizeDfmeaHeader()` | **완료** |
| `DFMEA_CODE_TO_HEADER` (A1~C4 → DFMEA 헤더 문자열) | **완료** |
| AllTab 오버라이드용 그룹/컬럼명 상수 24개 | **완료** |

### 작업 2: DFMEA dedupKey 함수

| 항목 | 상태 |
|------|------|
| `src/lib/fmea/utils/dedup-key.ts`에 8개 독립 함수 추가 | **완료** |
| 함수별 DFMEA 용어 주석 (초점요소, 부품, 제품기능 등) | **완료** — 문서 160-202행 1:1 |
| `dedupKey_DFMEA_ST_L2` ~ `dedupKey_DFMEA_FL_FC` | **완료** |

### 작업 3: DFMEA Import 파서/저장 dedupKey + parentId

| 항목 | 상태 |
|------|------|
| DFMEA Import 코드 위치 파악 | **완료** — DFMEA UI는 `pfmea/import/page` re-export |
| Import 파서 (`position-parser.ts`) | **공용** — PFMEA/DFMEA 동일 경로, 동일 dedupKey 공식 사용 |
| 저장 API (`save-position-import/route.ts`) | **공용** — PFMEA/DFMEA 동일 트랜잭션 |
| parentId 주입 순서 (Phase A→B→C) | **완료** — `position-parser`에서 L1→L2→L3→FN_L1→FN_L2→FN_L3→FE→FM→FC 순서 보장 |
| dedupKey 생성 | **완료** — `position-parser`에서 `dedupKey_ST_L2`, `dedupKey_FL_FM` 등 직접 호출 |
| 저장 후 무결성 검증 | **완료** — `pipeline-verify` API에서 orphan·FK 전수 검증 |

### 작업 4: DFMEA 코드 PFMEA 명칭 잔존 수정

| 항목 | 상태 |
|------|------|
| `excel-export.ts` 2L 시트명/파일명: `'메인공정기능'` → isDfmea 시 `'초점요소기능'` | **완료** |
| `excel-export.ts` 3L 파일명: `'작업요소기능'` → isDfmea 시 `'부품기능'` | **완료** |
| `excel-export.ts` `ALLVIEW_GROUPS`: `'P-FMEA'` → isDfmea 시 `'D-FMEA'` | **완료** |
| `excel-export.ts` 구조분석 export `'공정번호'` → isDfmea 시 `'번호'` | **완료** |
| `excel-export.ts` 구조 템플릿 `'공정번호'` → isDfmea 시 `'번호'` | **완료** |
| `PFMEA_TO_DFMEA_LABEL` 매핑 (AllView 라벨) | **기존 존재** — `getFmeaLabels(isDfmea)` 활용 |

### 작업 5: AllTab 컬럼 헤더 표준화

| 항목 | 상태 |
|------|------|
| `allTabConstants.ts`의 `DFMEA_COLUMN_OVERRIDES` 16컬럼 | **완료** — `dfmea-header-map` 상수 참조 |
| 구조분석 4열 (L1·L2·타입·L3) | **완료** |
| 기능분석 7열 (C1~C3, D3~D4, E2~E3) | **완료** |
| 고장분석 4열 (FE·S·FM·FC) | **완료** |

### 작업 6: Guard Test 8종

| Guard | 검증 내용 | 상태 |
|-------|----------|------|
| Guard 1 | FL_FM dedupKey — 동명 FM 다른 부모 → 다른 키 | **완료** |
| Guard 2 | FC parentId → FN_L3 (ST_L3 아님) | **완료** |
| Guard 3 | 카테시안 방지 — 초점요소 경계 | **완료** |
| Guard 4 | FN_L2 dedupKey에 productCharId(FK) 포함 | **완료** |
| Guard 5 | 파싱 시점 중복제거 부재 — PFMEA re-export 확인 | **완료** |
| Guard 6 | fill-down 규칙 (번호/초점요소/타입 등) | **완료** |
| Guard 7 | normalize 엣지케이스 (탭·줄바꿈·null) | **완료** |
| Guard 8 | 구분(F1) 카테고리값 (법규/기본/보조/관능) | **완료** |

파일: `tests/lib/fmea/dfmea-import-defense.guard.test.ts` (17개 테스트)

### 작업 7: Pre-commit Hook 업데이트

| 항목 | 상태 |
|------|------|
| `importCodefreezeFiles`에 `dfmea-header-map.ts` 추가 | **완료** |
| `dedup-key.ts`, `pfmea-header-map.ts`, CP/PFD column-ids도 함께 보호 | **완료** |
| `guard:codefreeze-import` npm 스크립트 | **완료** |

### 작업 8: fill-down 규칙

| 항목 | 상태 |
|------|------|
| `DFMEA_FILL_DOWN_RULES` 7개 구간 | **완료** — 문서 362-371행 1:1 |
| 구조분석: `['다음 상위수준', '번호', '초점요소', '타입']` | **완료** |
| 1L/2L/3L 기능·고장: 문서와 동일 | **완료** |

---

## 3. 검증 결과

```
tsc --noEmit                      : 에러 0건 ✅
test:import-slice (12파일 91테스트) : 전체 통과 ✅
dfmea-import-defense.guard (17테스트): 전체 통과 ✅
```

---

## 4. 소스 파일 참조

| 파일 | 변경 유형 |
|------|----------|
| `src/lib/fmea/constants/dfmea-header-map.ts` | 신규 |
| `src/lib/fmea/utils/dedup-key.ts` | DFMEA 함수 8개 추가 |
| `src/app/(fmea-core)/pfmea/worksheet/excel-export.ts` | isDfmea 분기 (시트명·파일명·그룹명·라벨) |
| `src/app/(fmea-core)/pfmea/worksheet/tabs/all/allTabConstants.ts` | DFMEA 오버라이드 상수 참조 |
| `tests/lib/fmea/dfmea-import-defense.guard.test.ts` | Guard Test 8종 신규 |
| `scripts/guard/protected-paths.config.json` | `importCodefreezeFiles` 갱신 |
| `package.json` | `guard:codefreeze-import` 스크립트, `test:import-slice` 갱신 |

---

## 5. 아키텍처 결정 사항

1. **DFMEA Import는 PFMEA와 동일 물리 파이프라인 사용** — `position-parser.ts` → `raw-to-atomic.ts` → `save-position-import/route.ts`. 별도 DFMEA-only API 없음.
2. **`normalizeDfmeaHeader`는 참조·테스트용** — 파서 런타임의 헤더 감지 루프에서는 아직 호출하지 않음. DFMEA 전용 엑셀 템플릿 검증 단계에서 활용 예정.
3. **DFMEA UI 경로** — `src/app/(fmea-core)/dfmea/**`는 PFMEA 페이지 re-export 유지.

---

## 6. 복구 방법 (코드프리즈 재도입 시)

`protected-paths.config.json`의 `importCodefreezeFiles` / `frozenFiles` / `protectedPaths`를 Git 이력에서 되돌리거나, `FMEA_GUARD_OVERRIDE=APPROVED-BY-USER`로 우회.

---

*본 보고는 원문 `docs/DFMEA 파이프라인  PFMEA 1대1 벤치마킹 전체 적용.md` 8개 작업의 1:1 매칭 완료 기록이다.*
