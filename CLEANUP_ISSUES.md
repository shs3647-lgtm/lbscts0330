# DFMEA / APQP 모듈 삭제 후 코드 정리 이슈

> 테스트 중 발견된 문제를 기록하고, 원인 파일과 수정 방향을 정리합니다.

---

## 완료된 수정

| # | 증상 | 원인 파일 | 수정 내용 |
|---|------|-----------|-----------|
| 1 | 라이선스 만료 화면 | `pfmea/register/page.tsx` → `DFMEATopNav` import 깨짐 → 서버 500 | import 제거, PFMEA TopNav만 사용 |
| 2 | `DFMEA_STEP_COLORS` export 없음 빌드 에러 | `AllTabHeader.tsx:19` | import 제거, `STEP_COLORS`만 사용 |

---

## 미수정 이슈

| # | 증상 | 원인 파일 (추정) | 수정 방향 |
|---|------|-----------------|-----------|
| 3 | 1행 입력 → 행추가 → 2행 입력 → 새로고침 시 1행 사라짐 | `useWorksheetSave.ts:46-56` (`syncL2Structures`) | **수정완료** — 신규 L2 행 append 로직 추가 |
| 4 | 요구사항 디폴트 행 빈 배열 문제 | `useArrayGuard.ts`, `FunctionL1Tab.tsx` | **수정완료** — `requirements: []` → placeholder 1행 통일 |
| 5 | 요구사항 셀 렌더링 3분기 → 1개로 통일 | `FunctionL1Tab.tsx:892-956` | **수정완료** — A/B 분기 제거, C(더블클릭 편집 가능) 경로만 사용 |
| 6 | 디폴트 행 첫 렌더 시 안 보임 | `constants.ts:585` `createInitialState` | **수정완료** — `types: []` → YP/SP/USER 3행 + placeholder 포함 |
| 7 | 메인공정 행추가 시 DB 저장 실패 (P2002 unique constraint) | `pfmea/master/sync.ts:179` | **수정완료** — `create` → `upsert`로 동시저장 충돌 방지 |
| 9 | 공정기능 선택 모달에 "010번 공정을 수행하여 품질을 확보한다" 표시 | 마스터 DB `pfmea_master_flat_items` (A3) | 기록만 — `supplementMissingItems.ts:140` 보충 로직이 마스터에 동기화됨 |
| 10 | 공정기능 미입력 행이 새로고침 시 셀합치기(merge)됨 | `atomicToLegacyAdapter.ts` `buildL2Functions` 또는 렌더링 rowSpan 계산 | 기록만 — 빈 이름 function들이 동일 그룹으로 인식되어 merge됨 (#8 L1 파이프라인 이슈와 동일 패턴) |
| 11 | 작업요소기능 디폴트 행과 행추가 타입 불일치 | `constants.ts:590` vs `FunctionL3Tab.tsx:214` | 기록만 — 디폴트: `functions:[]`(빈배열), 행추가: `{name:'', processChars:[{id,name:'',specialChar:''}]}` → processChars 구조+specialChar 필드 차이 |
| 12 | 고장영향(1L FE) 행 입력 안 됨 | `FailureL1Tab.tsx:629-632` | 기록만 — 기능분석 요구사항 입력 전엔 행 자체 불가. 디폴트 `failureScopes:[]` vs 행추가 `{id,reqId,effect:'',severity:undefined}` 타입 불일치 |
| 13 | 고장형태(2L FM) 행 입력 안 됨 | `FailureL2Tab.tsx:1141` | 기록만 — 상위 제품특성 없으면 "제품특성이 없습니다" alert. 디폴트 `failureModes:[]` vs 행추가 `{id,name:'',productCharId}` 타입 불일치 |
| 14 | 고장원인(3L FC) 행 입력 안 됨 | `FailureL3Tab.tsx` | 기록만 — 상위 공정특성 없으면 행 불가. #12~14 모두 동일 패턴: 상위 기능분석 데이터가 선행 필수 |
| 15 | L2/L3 Functions FK 누락 — `l2Id`, `l3Id`가 빈 문자열로 저장됨 | `useWorksheetSave.ts` `syncL2Functions`/`syncL3Functions` | 기록만 — 공정기능/작업요소기능 저장 시 어떤 공정/작업요소에 속하는지 FK 연결 안 됨. 새로고침 시 데이터 매칭 불가 원인 |

---

## 전체 파이프라인 점검 결과

### 저장 파이프라인 (`useWorksheetSave.ts`)

| # | 함수 | 줄 | 문제 | 심각도 |
|---|------|-----|------|--------|
| 16 | `syncFailureModes` | 282-297 | 신규 FM이 DB에 없으면 append 안 함 → 새로고침 시 유실 | **HIGH** |
| 17 | `syncFailureCauses` | 299-314 | 신규 FC가 DB에 없으면 append 안 함 → 새로고침 시 유실 | **HIGH** |
| 18 | `syncFailureEffects` | 325-338 | 신규 FE가 DB에 없으면 append 안 함 → 새로고침 시 유실 | **HIGH** |
| 19 | `syncL2Functions` | 90-152 | 신규 항목 생성 시 `l2StructId` 검증 없음 → FK 실패 가능 | **HIGH** |
| 20 | `syncL3Functions` | 154-208 | 신규 항목 생성 시 `l3StructId` 검증 없음 → FK 실패 가능 | **HIGH** |
| 21 | `syncL1Functions` | 225-228 | 빈 타입(functions=0)도 placeholder 레코드 생성 → DB 오염 | LOW |
| 22 | `syncFailureLinks` | 316-323 | 얕은 비교(length + 첫 ID만) → 중간 링크 변경 감지 못함 | MEDIUM |

### API 라우트 (`/api/fmea/route.ts`)

| # | 위치 | 문제 | 심각도 |
|---|------|------|--------|
| 23 | POST 214-242 | Full Replace 패턴(전체 삭제→재생성) — 부분 실패 시 데이터 소실 위험 | **HIGH** |

### 로드 파이프라인 (`atomicToLegacyAdapter.ts`)

| # | 함수 | 줄 | 문제 | 심각도 |
|---|------|-----|------|--------|
| 24 | `pickLegacyFcProcessCharId` | 57-66 | validL3FuncIds에 없는 ID도 반환 → FC가 L3에서 분리되어 보임 | MEDIUM |

### 렌더링 탭 컴포넌트

| # | 파일 | 줄 | 문제 | 심각도 |
|---|------|-----|------|--------|
| 25 | `FunctionL2Tab.tsx` | 925-928 | 빈 상태에서 onClick이 `()=>{}` (빈 함수) → 기능 추가 불가 | MEDIUM |
| 26 | `FunctionL3Tab.tsx` | 876 | 기능 미입력 시 onClick이 `()=>{}` → 공정특성 추가 불가 | MEDIUM |
| 27 | `FunctionL3Tab.tsx` | 876 vs 913 | onClick은 `()=>{}`, onDoubleClickEdit은 `undefined` → 핸들러 패턴 불일치 | MEDIUM |
| 28 | `FailureL2Tab.tsx` | 149-151 | 의미있는 공정 없으면 빈 공정 포함 전체 렌더 → 빈 행 표시 | MEDIUM |
| 29 | `FailureL3Tab.tsx` | 125-176 | 공정특성 없는 작업요소에 placeholder 행 없음 → 빈 화면 | MEDIUM |

### 복구/방어 로직 (`useArrayGuard.ts`)

| # | 위치 | 문제 | 심각도 |
|---|------|------|--------|
| 30 | 57-71 | types가 null일 때 하드코딩 YP/SP/USER로 복구 → 사용자 정의 카테고리 유실 | MEDIUM |

---

## API 라운드트립 테스트 결과 (2026-04-04)

테스트 fmeaId: `pfm26-test-roundtrip`

| 테스트 | 내용 | 결과 |
|--------|------|------|
| 1차 저장→조회 | L1~L3 구조, L1~L3 기능, FE/FM/FC, Link, Risk, Opt 전체 | **정상** |
| 2차 저장→조회 | 동일 데이터 덮어쓰기 후 유지 여부 | **정상** |
| 수정/추가/삭제 | 공정명 수정, 신규 L2 추가, L3 삭제 후 반영 여부 | **정상** |

**결론: API(`/api/fmea` POST/GET) 자체는 정상 동작**

---

## 클라이언트 sync 함수 단위 테스트 결과 (31건)

| # | 대상 | 테스트 | 결과 |
|---|------|--------|------|
| 1-3 | syncL2Structures | 수정/추가/삭제 | **통과** |
| 4-5 | syncL3Structures | 수정/신규+FK | **통과** |
| 6-8 | syncL1Functions | 업데이트/빈타입/placeholder방지 | **통과** |
| 9-12 | syncL2Functions | 업데이트/신규FK/빈ID/빈chars | **통과** |
| 13-15 | syncL3Functions | 업데이트/신규FK/빈ID | **통과** |
| 16 | syncFailureModes | 기존 업데이트 | **통과** |
| **17** | **syncFailureModes** | **신규 FM 추가** | **실패 — 신규 항목 append 로직 없음** |
| 18 | syncFailureModes | 삭제 | 통과 (map.size===0 방어) |
| 19 | syncFailureCauses | 기존 업데이트 | **통과** |
| **20** | **syncFailureCauses** | **신규 FC 추가** | **실패 — 신규 항목 append 로직 없음** |
| 21 | syncFailureEffects | 기존 업데이트 | **통과** |
| **22** | **syncFailureEffects** | **신규 FE 추가** | **실패 — db.map만 사용, 신규 무시** |
| **23** | **syncFailureEffects** | **DB 0건일 때 신규 저장** | **실패 — early return으로 저장 불가** |
| 24-25 | syncFailureLinks | 길이/첫ID 변경 감지 | **통과** |
| **26** | **syncFailureLinks** | **중간 ID만 변경** | **실패 — 얕은 비교(첫 ID만 체크)** |
| 27-30 | buildL1Types | 정상변환/placeholder/라운드트립 | **통과** |
| 31 | L2Functions 라운드트립 | l2StructId 유지 | **통과** |

**확인된 버그 5건 (모두 고장분석 관련):**
1. `syncFailureModes` — 신규 FM append 없음 → **새로고침 시 유실**
2. `syncFailureCauses` — 신규 FC append 없음 → **새로고침 시 유실**
3. `syncFailureEffects` — 신규 FE append 없음 (db.map만 사용) → **새로고침 시 유실**
4. `syncFailureEffects` — DB 비어있으면 early return → **최초 FE 저장 불가**
5. `syncFailureLinks` — 얕은 비교 → **중간 링크 변경 미감지**

문제는 API가 아니라 **클라이언트 변환 레이어**:
- `useWorksheetSave.ts`의 sync 함수들이 state → API payload 변환 시 데이터 누락/오염
- `atomicToLegacyAdapter.ts`가 API 응답 → state 변환 시 구조 불일치
- 즉, **올바른 payload를 만들어 보내면 DB는 정상 저장하지만, sync 함수가 올바른 payload를 못 만드는 것이 근본 원인**
| 8 | 디폴트 행이 여러 줄로 누적 (빈 function/requirement placeholder가 l1Function으로 저장되어 누적) | `useWorksheetSave.ts:231-248` | 임시수정 — **L1 Function 파이프라인 전면 개편 필요** (아래 #8 상세) |

---

### #3 상세: 워크시트 1행 소실 버그

**재현 순서**
1. 프로젝트 생성 → 워크시트 진입
2. 최초 1행에 더블클릭으로 텍스트 입력
3. 행 추가 후 2행에 텍스트 입력
4. 새로고침 → **1행 데이터 사라짐**

**원인 분석**

- **저장 방식**: API(`/api/fmea` POST)가 **전체 삭제 후 재생성**(Full Replace) 패턴 사용
  - `src/app/api/fmea/route.ts:214-242` — 모든 L2/L3 Structure를 DELETE → 재생성
- **핵심 버그**: `syncL2Structures()` 함수가 **신규 행을 누락**
  - `src/app/(fmea-core)/pfmea/worksheet/hooks/useWorksheetSave.ts:46-56`
  - `db.l2Structures`(stale)에 있는 행만 필터하고, state에만 있는 신규 행은 무시
  - 비교: `syncL1Functions()`(같은 파일 259-270줄)은 신규 항목 추가 로직이 있음
- **타이밍 문제**: 행 추가 시 state는 즉시 업데이트되지만, `atomicDB`(DB 캐시)는 이전 저장 완료 후에야 갱신
  - auto-save(800ms)가 stale `atomicDBRef.current` 기준으로 동작
  - 결과: 새 행이 저장 payload에 포함되지 않음 → Full Replace가 기존 데이터도 삭제

**수정 방향 (2가지 중 택1)**
1. `syncL2Structures()`에 신규 행 추가 로직 보완 (`syncL1Functions` 패턴 참고)
2. 행 추가 시 `atomicDB`를 동기적으로 갱신하여 auto-save 시점에 최신 상태 보장

**DFMEA 삭제와 무관** — 저장 경로에 `isDfmea` 분기 없음

---

### #4 상세: 요구사항(requirements) 디폴트 행 문제

**증상**: 새 워크시트 생성 시 요구사항 영역에 디폴트 행이 비정상적이거나 빈 상태로 보임

**원인 분석**

- **초기화 불일치**: `useArrayGuard.ts:61-69`에서 디폴트 타입 복구 시 `requirements: []` (빈 배열)로 생성
  - 삭제 시 복구(`FunctionL1Tab.tsx:269, 302`)는 `requirements: [{ id, name: '' }]` (1행 placeholder) 생성
  - 신규 기능 추가(`FunctionL1Tab.tsx:175, 217, 413, 428, 447, 487, 535`)도 `requirements: []` (빈 배열)
  - **빈 배열 vs placeholder 1행이 혼재** → 화면에서 빈 상태로 보이는 경우 발생

- **관련 파일 목록**
  - `useArrayGuard.ts:61-69` — 디폴트 타입 복구 시 `requirements: []`
  - `FunctionL1Tab.tsx:175,217,413,428,447,487,535` — 신규 기능/타입 추가 시 `requirements: []`
  - `FunctionL1Tab.tsx:269,302` — 삭제 복구 시 `requirements: [{ id, name: '' }]`
  - `FunctionL1Tab.tsx:337,360` — `ensurePlaceholder()`로 빈 배열 방지 (삭제 시에만)

**수정 방향**
- `requirements: []` → `requirements: [{ id: uid(), name: '' }]`로 통일하여 항상 placeholder 1행 보장
- 또는 렌더링 측에서 빈 배열일 때 자동으로 빈 행 1개 표시하도록 처리

**DFMEA 삭제와 무관** — `isDfmea` 분기는 타입명(YP/SP vs 법규/기본 등)에만 영향, requirements 초기화 로직은 공통

---

### #5 상세: 요구사항 셀 렌더링 분기 3가지

**파일**: `src/app/(fmea-core)/pfmea/worksheet/tabs/function/FunctionL1Tab.tsx`

요구사항 셀이 3가지 다른 방식으로 렌더링됨:

| 경우 | 조건 | 줄 | 동작 |
|------|------|-----|------|
| A | 기능 0개 (`functionsToRender.length === 0`) | 912 | 클릭→모달만, 더블클릭 편집 **불가** |
| B | 기능 있음 + 요구사항 0개 (`reqsToRender.length === 0`) | 951 | 클릭→모달만, 더블클릭 편집 **불가** |
| C | 요구사항 있음 (`reqsToRender` 순회) | 982 | 클릭→모달 + `onDoubleClickEdit` **가능** |

**문제점**
- A, B 경우에 `onDoubleClickEdit`이 없어서 더블클릭 인라인 편집 불가
- #4 수정으로 `requirements: [{ id, name: '' }]` placeholder를 넣었으므로 보통 C로 진입하겠지만, 데이터 상태에 따라 A/B로 빠질 수 있음
- A와 B는 사실상 동일한 빈 셀인데 분기가 불필요하게 분리됨

**수정 방향**
- A, B에도 `onDoubleClickEdit` 추가하여 인라인 편집 일관성 확보
- 또는 A/B 진입 자체를 방지 (placeholder 1행 보장이 완벽하다면 불필요)

---

### #8 상세: L1 Function 저장/로드 파이프라인 전면 개편 필요

**근본 원인**: state ↔ DB 간 구조 불일치

```
[State 구조 — 3단 트리]
types[] → functions[] → requirements[]

[DB 구조 — 플랫 테이블 1개]
l1_functions (id, category, functionName, requirement)
```

**현재 문제점**
1. **저장 (`syncL1Functions`)**: 3단 트리의 function과 requirement를 각각 별도 l1_functions 레코드로 저장 → placeholder도 레코드가 됨
2. **로드 (`buildL1Types`)**: 플랫 레코드를 다시 트리로 복원할 때 placeholder와 실제 데이터 구분 불가 → 중복 행 생성
3. **누적 버그**: 저장→로드→저장 반복 시 placeholder가 실제 데이터로 굳어지고, 새 placeholder 추가 → 무한 증식

**관련 파일**
- `useWorksheetSave.ts` — `syncL1Functions()`: state → atomicDB 변환
- `atomicToLegacyAdapter.ts` — `buildL1Types()`: atomicDB → state 변환
- `useWorksheetDataLoader.ts` — `ensureL1Types()`: 빈 state일 때 기본 타입 생성
- `useArrayGuard.ts` — `repairWorksheetState()`: 빈 타입 자동 복구
- `/api/fmea/route.ts` POST — 전체 삭제 후 재생성 (Full Replace)

**개편 방향**
- DB에 `l1_types`, `l1_type_functions`, `l1_type_requirements` 테이블 분리 → state 트리 구조와 1:1 대응
- 또는 l1_functions에 `parentFuncId` 컬럼 추가하여 function/requirement 관계 명확화
- placeholder는 클라이언트 전용 (DB 저장 대상에서 완전 제외)
- Full Replace 대신 diff 기반 upsert/delete로 변경
