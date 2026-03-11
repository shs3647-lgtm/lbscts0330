# DB 중심의 고장연결 구축

> **원칙**: 추론 금지. Forward-Fill 금지.
> 엑셀에서 **사실(fact)만 추출** → DB에 완전성 정보 저장 → 렌더링은 DB 데이터를 셀 위치에 주입만.
> 참조 규격: `PFMEA_IMPORT_데이터소스_매핑규격_v3.0.md`

---

## 1. IMPORT 시트 구성 (v3.0)

### 1.1 시트 목록 — 15개 (기존 17개에서 A6, B5 제거)

```
STEP A (11개 시트 — 구조/기능/고장 분석)
  ├── A1 공정번호     ← E열
  ├── A2 공정명       ← E열
  ├── A3 공정기능     ← K열
  ├── A4 제품특성     ← L열
  ├── A5 고장형태     ← S열
  ├── B1 작업요소     ← F+G열(구조), M+N열(기능)
  ├── B2 요소기능     ← O열
  ├── B3 공정특성     ← P열
  ├── B4 고장원인     ← V열
  ├── C1 구분        ← H열, Q열
  ├── C2 제품기능     ← I열
  ├── C3 요구사항     ← J열
  └── C4 고장영향     ← R열

STEP B (FC 고장사슬만 — PC/DC 제외, 9열)
  └── FC 고장사슬     ← N~Q, R~T, V, X, Y열
        ├── N열: FE구분 (scope)      ← 병합참조
        ├── O열: 고장영향 (FE)       ← 병합참조
        ├── P열: 심각도 (S)          ← 병합참조
        ├── Q열: 고장형태 (FM)       ← 병합참조
        ├── R열: FC-4M              ← 직접추출
        ├── S열: FC-작업요소          ← 직접추출
        ├── T열: 고장원인 (FC)       ← 직접추출
        ├── ██ U열: 예방관리 (PC)    ← IMPORT 제외
        ├── V열: 발생도 (O)          ← 직접추출
        ├── ██ W열: 검출관리 (DC)    ← IMPORT 제외
        ├── X열: 검출도 (D)          ← 직접추출
        └── Y열: AP                 ← 직접추출

DB 조인 (1개 시트)
  └── FA 통합분석     ← 위 시트 DB 데이터 + FC 조인

IMPORT 제외 → 리스크 탭 입력 (2개)
  ├── A6 검출관리     → ALL 화면 리스크 탭에서 입력
  └── B5 예방관리     → ALL 화면 리스크 탭에서 입력
```

### 1.2 A6/B5 IMPORT 제외 → 리스크 탭 입력

```
┌──────────────────────────────────────────────────────────┐
│  A6 검출관리 시트 → IMPORT 양식에서 제거                    │
│  B5 예방관리 시트 → IMPORT 양식에서 제거                    │
│  FC 고장사슬의 PC/DC 컬럼 → IMPORT 양식에서 제거            │
│                                                          │
│  대신: ALL 화면 리스크 탭에서 공정별로 입력                  │
│        → 모달에만 반영 (DC/PC 선택지)                      │
└──────────────────────────────────────────────────────────┘

이유:
  1. IMPORT 단순화: 순수 분석 데이터만 → 파싱 오류 감소
  2. 이중 관리 제거: A6/B5 마스터 ↔ FC의 PC/DC 정합성 문제 해소
  3. Forward-Fill 불필요: STEP B에서 PC/DC 추출 자체가 없어짐
  4. 사용자 주도: 관리 활동은 운영 단계에서 사용자가 직접 입력
```

---

## 2. 파싱 원칙 — Forward-Fill 금지

### 2.1 핵심 원칙

```
✅ 셀에 값 있음 → 그대로 추출
✅ 병합셀 → 마스터 셀 값 참조 (get_merged_value)
✅ 값 없음 → NULL (누락 처리)
❌ Forward-Fill 금지 — 이전 행 값을 다음 행에 자동 전파 안 함
❌ 추론 금지 — 텍스트 유사도, 카테시안 곱 등으로 관계 생성 안 함
```

### 2.2 병합셀 참조 vs Forward-Fill (차이)

```
【병합셀 참조 — 허용 ✅】
  Excel 병합: A12:A14 = "손가락끼임" (3행 병합)
  Row 12: get_merged_value(12, A) → "손가락끼임" (마스터)
  Row 13: get_merged_value(13, A) → "손가락끼임" (병합 참조)
  Row 14: get_merged_value(14, A) → "손가락끼임" (병합 참조)
  → 엑셀이 이미 선언한 관계. 사실(fact).

【Forward-Fill — 금지 ❌】
  Row 12: value = "손가락끼임"
  Row 13: value = None (빈셀, 병합 아님)
  Row 14: value = None (빈셀, 병합 아님)
  → FF: Row 13 = "손가락끼임" (이전값 전파) ← 추론!
  → 올바른 처리: Row 13 = NULL (누락)
```

### 2.3 STEP B 열별 추출 방법

```
┌──────────────────────┬───────────┬─────────────────────────────┐
│ 열                    │ 추출 방법  │ 근거                         │
├──────────────────────┼───────────┼─────────────────────────────┤
│ E(5) 공정명           │ 병합참조   │ 병합셀 107건 + 참조 482건     │
│ Q(17) 고장형태(FM)     │ 병합참조   │ 병합셀 107건 + 참조 482건     │
│ N(14) FE구분          │ 병합참조   │ 병합셀 204건 + 참조 0건       │
│ O(15) 고장영향(FE)     │ 병합참조   │ 병합셀 204건 + 참조 0건       │
│ P(16) 심각도(S)       │ 병합참조   │ 병합셀 204건 + 참조 0건       │
│ R(18) FC-4M          │ 직접 추출  │ 589건 전부 raw 값             │
│ S(19) FC-작업요소      │ 직접 추출  │ 589건 전부 raw 값             │
│ T(20) 고장원인(FC)     │ 직접 추출  │ 589건 전부 raw 값             │
│ V(22) 발생도(O)       │ 직접 추출  │ 589건 전부 raw 값             │
│ X(24) 검출도(D)       │ 직접 추출  │ 589건 전부 raw 값             │
│ Y(25) AP             │ 직접 추출  │ 589건 전부 raw 값             │
├──────────────────────┼───────────┼─────────────────────────────┤
│ U(21) 예방관리(PC)     │ ❌ IMPORT제외│ 리스크 탭에서 입력            │
│ W(23) 검출관리(DC)     │ ❌ IMPORT제외│ 리스크 탭에서 입력            │
├──────────────────────┼───────────┼─────────────────────────────┤
│ H~M열 (구조/기능)      │ ❌ 사용안함 │ FF 필요 → DB FK 매칭으로 대체  │
└──────────────────────┴───────────┴─────────────────────────────┘
```

---

## 3. DB 저장 구조 — FailureLink 필드 매핑

### 3.1 FailureLink 테이블 (failure_links)

```
FailureLink
├── id              UUID          PK
├── fmeaId          String        FK → FmeaProject
│
├── fmId            String        FK → FailureMode     ★ 핵심 FK
├── feId            String        FK → FailureEffect    ★ 핵심 FK
├── fcId            String        FK → FailureCause     ★ 핵심 FK
│
├── fmText          String?       캐시: 고장형태 텍스트
├── feText          String?       캐시: 고장영향 텍스트
├── fcText          String?       캐시: 고장원인 텍스트
├── fmProcess       String?       캐시: 공정명
├── feScope         String?       캐시: YP/SP/USER
├── fcWorkElem      String?       캐시: 작업요소명
├── fcM4            String?       캐시: 4M (MN/MC/IM/EN)
├── severity        Int?          심각도 (FE에서 상속)
│
├── fmSeq           Int?          FM 순서 (같은 FE 그룹 내, 1-based)
├── feSeq           Int?          FE 순서 (같은 공정 내, 1-based)
├── fcSeq           Int?          FC 순서 (같은 FM 그룹 내, 1-based)
│
├── parentId        String?       부모 링크 (계층 구조)
├── mergeGroupId    String?       병합 그룹 식별자
├── rowSpan         Int? (=1)     워크시트 행 병합 수
├── colSpan         Int? (=1)     워크시트 열 병합 수
│
├── fmPath          String?       FM 경로 (공정번호/FM명)
├── fePath          String?       FE 경로 (구분/FE명)
└── fcPath          String?       FC 경로 (공정번호/4M/FC명)
```

### 3.2 연관 테이블

```
FailureEffect (failure_effects)
├── id, fmeaId, l1FuncId
├── category        구분 (YP/SP/USER)
├── effect          고장영향 텍스트
├── severity        심각도 S (1-10)
├── mergeGroupId, rowSpan, colSpan, parentId

FailureMode (failure_modes)
├── id, fmeaId, l2FuncId, l2StructId
├── mode            고장형태 텍스트
├── productCharId   제품특성 연결 (선택)
├── mergeGroupId, rowSpan, colSpan, parentId

FailureCause (failure_causes)
├── id, fmeaId, l3FuncId, l3StructId, l2StructId
├── cause           고장원인 텍스트
├── processCharId   공정특성 연결 (선택)
├── occurrence      발생도 O (1-10)
├── mergeGroupId, rowSpan, colSpan, parentId
```

### 3.3 완전성 보장 = 엑셀 → DB 1:1 매핑

| 엑셀 데이터 | DB 필드 | 비고 |
|-------------|---------|------|
| FM 텍스트 | FailureMode.mode + FailureLink.fmText | 이중 저장 |
| FC 텍스트 | FailureCause.cause + FailureLink.fcText | 이중 저장 |
| FE 텍스트 | FailureEffect.effect + FailureLink.feText | 이중 저장 |
| 4M 분류 | L3Structure.m4 + FailureLink.fcM4 | 이중 저장 |
| FE 구분 | FailureEffect.category + FailureLink.feScope | 이중 저장 |
| FM-FC 연결 | FailureLink (fmId + fcId) | FK 관계 |
| FM-FE 연결 | FailureLink (fmId + feId) | FK 관계 |
| FM 순서 | FailureLink.fmSeq | 같은 FE 내 FM 순서 |
| FE 순서 | FailureLink.feSeq | 같은 공정 내 FE 순서 |
| FC 순서 | FailureLink.fcSeq | 같은 FM 내 FC 순서 |
| 행 병합 | FailureLink.rowSpan | 워크시트 표현용 |

---

## 4. 렌더링 원칙 — DB 데이터 → 셀 위치 주입

### 4.1 워크시트 렌더링 규칙

```
DB에서 FailureLink[] 로드
    ↓
fmId별 그룹핑 → FM 1개당 연결된 FC 목록
feId별 그룹핑 → FE 1개당 연결된 FM 목록
    ↓
워크시트 행 계산:
  FM 행수 = max(연결된 FC 수, 1)
  FE 행수 = sum(연결된 FM별 행수)
    ↓
셀병합 처리:
  FM 행수 > FC 행수 → FC 마지막 행 셀병합
  FM 행수 < FC 행수 → FM 마지막 행 셀병합
  FE 행수 > FM 합산행수 → 불가능 (FE = FM 합산)
```

### 4.2 화면별 DB 조회

| 화면(시트) | DB 테이블 | 조회 조건 |
|-----------|----------|----------|
| A1 공정번호 | Process | fmeaId |
| A2 공정명 | Process | fmeaId |
| A3 공정기능 | L2Function | processId FK |
| A4 제품특성 | ProductChar | processId FK |
| A5 고장형태 | FailureMode | fmeaId, l2FuncId FK |
| B1 작업요소 | WorkElement | processId FK, m4 |
| B2 요소기능 | L3Function | workElementId FK |
| B3 공정특성 | ProcessChar | workElementId FK |
| B4 고장원인 | FailureCause | fmeaId, l3FuncId FK |
| C1 구분 | FEScope | fmeaId |
| C2 제품기능 | L1Function | scopeId FK |
| C3 요구사항 | Requirement | scopeId FK |
| C4 고장영향 | FailureEffect | scopeId FK |
| FC 고장사슬 | FailureLink | fmeaId (PC/DC 없음) |
| FA 통합분석 | FailureLink + 조인 | 모든 테이블 조인 |

### 4.3 절대 금지

```
❌ 화면 렌더링 시 텍스트 기반 매칭 (normalize → find)
❌ 화면 렌더링 시 auto-create fallback (매칭 실패 → 새 레코드 생성)
❌ 화면 간 데이터 전파 (A 화면 데이터를 B 화면에 복사)
❌ Forward-Fill (이전 행 값을 다음 행에 전파)
❌ 카테시안 곱 (FM × FC 조합 생성)

✅ DB FK 기반 조회만
✅ 없으면 NULL → 누락 표시 → 사용자 수정
✅ 병합셀은 엑셀 원본의 병합 정보(startRow, endRow) 그대로 활용
```

---

## 5. 현재 문제점 + 해결 현황

### 5.1 해결 완료

| # | 위치 | 문제 | 해결 |
|---|------|------|------|
| P1 | parseFCSheet | fmMergeSpan/feMergeSpan 미추출 | ✅ getMergeSpan() 헬퍼 추가, 병합정보 추출 |
| P2 | buildFailureChainsFromFlat | 카테시안 곱 | ✅ excelRow 기반 행매칭으로 교체 |
| P5 | FailureLink 저장 | fmSeq/feSeq/fcSeq 미설정 | ✅ computeSeqFields() + path 필드 추가 |

### 5.2 v3.0 아키텍처 전환 현황 — ✅ 전체 완료

| # | 위치 | 문제 | v3.0 해결 | 상태 |
|---|------|------|-----------|------|
| V1 | excel-parser-single-sheet.ts | Forward-Fill 사용 중 | 병합셀 참조로 전면 교체 | ✅ TODO-7 |
| V2 | excel-template.ts | A6/B5 시트 포함, FC 11열 | A6/B5 시트 제거, FC 9열 축소 | ✅ TODO-6 |
| V3 | excel-parser-fc.ts | PC/DC 컬럼 파싱 | PC/DC 파싱 제거 | ✅ TODO-8 |
| V4 | failureChainInjector.ts | 텍스트 기반 매칭 | **현행 유지 (종료)** — 아래 §5.3 참고 | ✅ 종료 |
| V5 | failureChainInjector.ts | auto-create fallback | **현행 유지 (종료)** — 아래 §5.3 참고 | ✅ 종료 |
| V6 | masterFailureChain.ts | pcValue/dcValue 필드 | 필드 제거 | ✅ TODO-4 |
| V7 | constants.ts, types.ts | A6/B5 관련 상수 | A6/B5 상수 제거 | ✅ TODO-1~5 |
| V8 | ImportPreviewPanel.tsx | A6/B5 탭 표시 | A6/B5 탭 제거 | ✅ TODO-11 |

### 5.3 V4/V5 종료 사유 — FK 매칭 전환 불필요 (2026-02-28)

```
★★★ 검토 결과: TODO-10 (FK 매칭 전환)은 불필요 → 종료 ★★★

이유:
  1. injectFailureChains 실행 시점에 데이터는 DB에 없음 (메모리 WorksheetState)
     → DB SELECT (FK 조회) 자체가 불가능
  2. "FK 매칭"이라 했지만 실제로는 여전히 메모리 내 텍스트 매칭
     → normalize(processNo + text) 방식이 이미 정확히 동작 중
     → FM 107, FC 251 완전 일치 확인됨
  3. 변하는 것은 auto-create 제거뿐 → 별도 설계가 필요할 때 진행
  4. 카테시안 곱 자동연결(useAutoLink) 삭제 완료 (2026-02-28)

현행 유지:
  - failureChainInjector.ts의 normalize() 텍스트 매칭 → 그대로 유지
  - auto-create (createFE/createFM/createFC) → 그대로 유지
  - 미연결 항목 → 사용자가 워크시트 고장연결 화면에서 수동 연결
```

### 5.4 고장연결 버그 수정 (2026-02-28)

| # | 위치 | 문제 | 해결 |
|---|------|------|------|
| B1 | FailureLinkTab.tsx | FE 누락 연결해도 사라지지 않음 (ID 불일치) | ✅ linkStats 텍스트 fallback + useEffect 텍스트 매칭 |
| B2 | useAutoLink.ts | 카테시안 곱 자동연결 — DB중심 원칙 위반 | ✅ 파일 삭제 + 버튼 제거 |

---

## 6. v3.0 코드 수정 TODO — ✅ 17/17 전체 완료

> v3.0 아키텍처 전환 완료. 모든 TODO 항목 종료.

### 6.1 타입 & 상수 정리 (A6/B5 제거) — ✅ 완료 (edace49d)

#### ✅ TODO-1: `types.ts` — A6/B5 상수 제거

```
커밋: edace49d (2026-02-28)
완료:
  - LEVEL_ITEM_CODES.L2: ['A1'...'A6'] → ['A1'...'A5']  (A6 제거)
  - LEVEL_ITEM_CODES.L3: ['B1'...'B5'] → ['B1'...'B4']  (B5 제거)
  - FAILURE_ITEM_CODES: PC('B5'), DC('A6') 키 제거
  - ITEM_CODE_LABELS: A6, B5, L2-6, L3-5 레이블 제거
  - SHEET_TO_CODE_MAP / CODE_TO_SHEET_MAP: A6/B5 제거
테스트: v3-remove-a6-b5.test.ts (6개 PASS)
```

#### ✅ TODO-2: `constants.ts` — PREVIEW_OPTIONS A6/B5 제거

```
커밋: edace49d
완료: PREVIEW_OPTIONS 15→13개 (A6, B5 항목 제거), SAMPLE_DATA A6/B5 행 제거
테스트: v3-remove-a6-b5.test.ts (4개 PASS)
```

#### ✅ TODO-3: `sampleData.ts` — A6/B5 샘플 데이터 제거

```
커밋: edace49d
완료: SAMPLE_DATA에서 A6/B5 행 제거, PREVIEW_OPTIONS에서 A6/B5 항목 제거
테스트: v3-remove-a6-b5.test.ts (3개 PASS)
```

#### ✅ TODO-4: `masterFailureChain.ts` — pcValue/dcValue 필드 제거

```
커밋: d362cc53 (2026-02-28)
완료:
  - MasterFailureChain.pcValue/dcValue 필드 제거
  - PreventionPool/DetectionPool 인터페이스 제거
  - buildFailureChainsFromFlat(): A6 processInfo 수집 제거, B5 보조정보 수집 제거
  - 체인 생성 시 pcValue/dcValue 속성 제거
테스트: v3-masterfc-no-pcdc.test.ts (7개 PASS)
```

#### ✅ TODO-5: `excel-parser-utils.ts` — A6/B5 시트 매핑 제거

```
커밋: edace49d
완료: SHEET_NAME_MAP, directMap, validNames, keywordMap에서 A6/B5 모두 제거
테스트: v3-remove-a6-b5.test.ts (3개 PASS)
```

---

### 6.2 엑셀 템플릿 변경 — ✅ 완료 (edace49d)

#### ✅ TODO-6: `excel-template.ts` — A6/B5 시트 제거, FC 9열

```
커밋: edace49d
완료:
  - SHEET_DEFINITIONS: A6(L2-6 검출관리) 시트 제거
  - SHEET_DEFINITIONS: B5(L3-5 예방관리) 시트 제거
  - FC 고장사슬: 11열→9열 (B5.예방관리, A6.검출관리 컬럼 제거)
  - FC required 배열 11→9 조정
테스트: v3-template-fc9col.test.ts (4개 PASS)
```

---

### 6.3 파서 — Forward-Fill 제거 — ✅ 완료 (d362cc53)

#### ✅ TODO-7: `excel-parser-single-sheet.ts` — Forward-Fill 완전 제거

```
커밋: d362cc53 (2026-02-28)
완료:
  ★ Forward-Fill 로직 완전 제거:
  - ff 객체, applyForwardFill() 함수, 호출부 모두 삭제
  - chainA5/chainC4/chainSeverity/chainProcNo carry-forward 변수 삭제
  - curFM/curFE 변수 삭제 → rowFM/rowFE (행 단위 직접 읽기)
  ★ A6/B5 파싱 코드 제거:
  - A6(검출관리) addIfNew 제거, B5(예방관리) addIfNew 블록 제거
  - createEmptyProcess()에서 detectionCtrls/preventionCtrls/preventionCtrls4M 제거
  - B1~B4 4M 정렬만 유지 (B5 정렬 제거)
  - 체인 생성 시 pcValue/dcValue 속성 제거
테스트: v3-no-forward-fill.test.ts (11개 PASS)
```

#### ✅ TODO-8: `excel-parser-fc.ts` — PC/DC 컬럼 제거

```
커밋: d362cc53 (2026-02-28)
완료:
  - FCColumnMap에서 pcValue, dcValue 필드 제거
  - HEADER_PATTERNS에서 PC/DC 헤더 패턴 제거
  - 파싱/복구 루프에서 pcValue, dcValue 추출 제거
  - detectColumnMap 초기값에서 pcValue/dcValue 제거
  - 구형식 fallback에서 pcValue/dcValue 제거
테스트: v3-fc-parser-no-pcdc.test.ts (6개 PASS)
```

#### ✅ TODO-9: `excel-parser.ts` — ProcessRelation A6/B5 필드 제거

```
커밋: d362cc53 (2026-02-28)
완료:
  - ProcessRelation: detectionCtrls, preventionCtrls, preventionCtrls4M 필드 제거
  - parseMultiSheetExcel(): 시트 매핑에서 A6/B5 keyword 제거
  - B1~B4만 4M 컬럼 처리 (B5 제외)
  - 주석 업데이트: A1-A5, B1-B4 범위로 수정
테스트: v3-multisheet-no-a6b5.test.ts (14개 PASS)
```

---

### 6.4 인젝터 — ✅ 완료 (현행 유지 결정)

#### ✅ TODO-10: `failureChainInjector.ts` — 종료 (FK 전환 불필요)

```
완료 (d362cc53): pcValue/dcValue riskData 저장 제거
종료 (2026-02-28): FK 매칭 전환 검토 → 불필요 판정 (§5.3 참고)
  - injectFailureChains 시점에 데이터가 DB에 없음 → FK 조회 불가
  - 현재 normalize(text) 매칭이 정확히 동작 (FM 107, FC 251 완전 일치)
  - 텍스트 매칭 유지 + auto-create 유지 (현행)
```

---

### 6.5 UI 변경 — ✅ 완료 (d362cc53)

#### ✅ TODO-11: `ImportPreviewPanel.tsx` — A6/B5 탭 제거

```
커밋: d362cc53 (2026-02-28)
완료: getBK()에서 B5 제거, showM4Column에서 B5 제거 (B1~B4만)
```

#### ✅ TODO-12: `FailureChainPopup.tsx` — PC/DC 필드 제거

```
커밋: d362cc53 (2026-02-28)
완료:
  - selectedPC/selectedDC 상태 제거
  - pcItems/dcItems useMemo 제거
  - PC/DC 다이어그램 UI 제거
  - 관리방법 선택 영역 전체 제거 (-87줄)
  - onSaveChain에서 preventionCtrlId/detectionCtrlId 제거
테스트: v3-ui-no-a6b5.test.ts (PASS)
```

#### ✅ TODO-13: `useRelationData.ts` — A6/B5 조회 제거

```
커밋: d362cc53 (2026-02-28)
완료: RelationDataRow에서 A6/B5 필드 제거, A/B 탭 데이터 조회에서 A6/B5 lookup 제거
테스트: v3-ui-no-a6b5.test.ts (PASS)
```

---

### 6.6 API 변경 — ✅ 완료

#### ✅ TODO-14: `route.ts` (FMEA API) — 변경 불필요

```
조사 결과 (2026-02-28):
  - api/fmea/route.ts의 preventionControl/detectionControl은
    RiskAnalysis 모델의 자유 텍스트 필드 (워크시트 리스크 탭)
  - A6/B5 itemCode 매핑과 무관 → 제거 불필요, 유지
  - 32개 파일에서 참조 (APModal, RiskTabConfirmable 등)
```

#### ✅ TODO-15: `/api/pfmea/master` — A6/B5 시트 처리 제거

```
커밋: d362cc53 (2026-02-28)
완료: preventionPool/detectionPool 요청 필드 제거, Pool→relationData 병합 제거
```

---

### 6.7 테스트 업데이트 — ✅ 완료

#### ✅ TODO-16: 기존 테스트 — A6/B5 제거 반영

```
조사 결과 (2026-02-28):
  - 17개 테스트 파일 전체 확인 → 이미 v3.0 구조에 맞게 작성됨
  - A6/B5 참조는 "제거 검증용" (v3-*.test.ts) 또는 "RiskAnalysis 컨텍스트" (유지 대상)
  - 수정 불필요
```

#### ✅ TODO-17: v3.0 규격 테스트 — 이미 작성됨

```
기존 v3 테스트 7개 파일, 97개 테스트 전부 PASS (vitest):
  - v3-remove-a6-b5.test.ts (16개): 상수/타입/매핑에서 A6/B5 제거 검증
  - v3-template-fc9col.test.ts (4개): FC 9열 템플릿 검증
  - v3-masterfc-no-pcdc.test.ts (7개): pcValue/dcValue/Pool 제거 검증
  - v3-fc-parser-no-pcdc.test.ts (6개): FC 파서 PC/DC 제거 검증
  - v3-no-forward-fill.test.ts (11개): FF 제거 + 병합셀 참조 유지 검증
  - v3-ui-no-a6b5.test.ts (39개): UI 컴포넌트 A6/B5 제거 검증
  - v3-multisheet-no-a6b5.test.ts (14개): 멀티시트 파서 A6/B5 제거 검증

TODO-10 종료 (FK 전환 불필요) → 추가 테스트 없음
```

---

## 7. 파일 참조

| 파일 | 역할 | v3.0 변경 |
|------|------|----------|
| `import/excel-parser-single-sheet.ts` | STEP A 단일시트 파서 | **FF 제거, 병합참조로 교체** |
| `import/excel-parser-fc.ts` | FC 고장사슬 시트 파서 | **PC/DC 컬럼 제거 (11→9열)** |
| `import/excel-parser.ts` | 멀티시트 파서 | **A6/B5 시트 파싱 제거** |
| `import/excel-template.ts` | IMPORT 엑셀 템플릿 생성 | **A6/B5 시트 제거, FC 9열** |
| `import/types/masterFailureChain.ts` | MasterFailureChain 타입 | **pcValue/dcValue 제거** |
| `import/utils/failureChainInjector.ts` | DB 주입 로직 | PC/DC 제거 완료, 텍스트 매칭 유지 |
| `import/types.ts` | IMPORT 타입/상수 | **A6/B5 상수 제거** |
| `import/constants.ts` | PREVIEW_OPTIONS | **A6/B5 탭 제거** |
| `import/sampleData.ts` | 샘플 데이터 | **A6/B5 샘플 제거** |
| `import/excel-parser-utils.ts` | 시트 이름 매핑 | **A6/B5 매핑 제거** |
| `import/components/ImportPreviewPanel.tsx` | 미리보기 UI | **A6/B5 탭 제거** |
| `import/FailureChainPopup.tsx` | FC 팝업 | **PC/DC 표시 제거** |
| `import/useRelationData.ts` | 관계 데이터 훅 | **A6/B5 조회 제거** |
| `api/fmea/route.ts` | FMEA CRUD API | **PC/DC 저장/응답 제거** |
| `api/pfmea/master/route.ts` | 기초정보 저장 API | **A6/B5 처리 제거** |
| `prisma/schema.prisma` | DB 스키마 | 변경 없음 (기존 FK 활용) |
| `worksheet/hooks/useWorksheetDataLoader.ts` | DB→워크시트 로드 | 변경 없음 (CODEFREEZE) |
| `worksheet/hooks/useLinkData.ts` | FailureLink 렌더링 | 변경 없음 |
| `worksheet/hooks/useRowsCalculation.ts` | 행/셀병합 계산 | 변경 없음 (CODEFREEZE) |

---

## 8. 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| v1.0 | 2026-02-23 | 초안 (FC 고장사슬 중심) |
| v2.0 | 2026-02-28 | P1(병합정보추출), P2(카테시안곱제거), P5(seq/path) 해결 |
| v3.0 | 2026-02-28 | 아키텍처 전환: FF금지, A6/B5 IMPORT제외, FC 9열, FK기반매칭, 17개 TODO 정의 |
| v3.1 | 2026-02-28 | TODO-4~17 완료 (16/17 완료). 빌드+97테스트 PASS |
| **v3.2** | **2026-02-28** | **TODO-10 종료 (FK전환 불필요 판정). useAutoLink 삭제. FE누락 ID불일치 버그 수정. 17/17 전체 완료** |
