# UUID/FK 부여명세서 v2.0.0

> **최종 업데이트**: 2026-03-21
> **상태**: CODEFREEZE — 수정 시 반드시 사용자 허락 필요
> **관련 코드**: `src/lib/uuid-generator.ts`, `src/lib/uuid-rules.ts`

---

## 1. 핵심 원칙

### 1.1 모든 셀은 UUID를 갖는다

> FMEA 워크시트의 **모든 데이터 셀**은 고유한 UUID를 보유한다.
> UUID 없는 셀 = 추적 불가 = 존재하지 않는 데이터.

### 1.2 공정순서(문자열) 기반 UUID

> 공정순서는 **원본 문자열** 그대로 UUID에 포함한다.
> `"10"`, `"15"`, `"20-1"` 등 원본 보존 — `parseInt()` 변환 금지(신규).

### 1.3 상하관계(parentId) 필수

> 모든 하위 엔티티는 상위 엔티티의 UUID를 `parentId`로 보유한다.
> UUID 자체가 부모 UUID를 prefix로 포함하여, UUID만으로 계층 역추적 가능.

### 1.4 "동일 텍스트 ≠ 동일 엔티티"

> 같은 이름이라도 **다른 공정/구분에 속하면 별도 UUID**를 부여한다.
> 예: "작업숙련도부족" → 공정10=FC-001, 공정15=FC-002, 공정20=FC-003

---

## 2. UUID 체계 구조

### 2.1 UUID 패턴

```
{DOC}-{LEVEL}-{공정순서}-{타입}-{순번}
```

| 세그먼트 | 설명 | 예시 |
|---------|------|------|
| DOC | 문서유형 | `PF`(PFMEA), `DF`(DFMEA), `CP`(관리계획서) |
| LEVEL | 계층 | `L1`(완제품), `L2`(공정), `L3`(작업요소), `FC`(고장사슬) |
| 공정순서 | 원본 문자열 (3자리 패딩) | `010`, `015`, `020` |
| 타입 | 엔티티 종류 | `F`(기능), `P`(제품특성), `M`(고장형태), `D`(검출), `C`(공정특성), `K`(원인), `V`(예방), `G`(요소기능) |
| 순번 | 3자리 제로패딩 | `001`~`999` |

### 2.2 계층별 UUID 패턴 전체 매핑

```
L1 완제품 레벨 (C계열) — 문서 전역, 구분(YP/SP/US) 기반
─────────────────────────────────────────────────────
PF-L1-{구분}                          ← C1 (구분)
PF-L1-{구분}-{c2seq}                  ← C2 (완제품기능)
PF-L1-{구분}-{c2seq}-{c3seq}          ← C3 (요구사항)
PF-L1-{구분}-{c2seq}-{c3seq}-{c4seq}  ← C4 (고장영향/FE)

L2 공정 레벨 (A계열) — 공정순서 기반
─────────────────────────────────────────────────────
PF-L2-{pno}                           ← A1/A2 (공정)
PF-L2-{pno}-F-{seq}                   ← A3 (공정기능)
PF-L2-{pno}-P-{seq}                   ← A4 (제품특성)
PF-L2-{pno}-M-{seq}                   ← A5 (고장형태/FM)
PF-L2-{pno}-D-{seq}                   ← A6 (검출관리/DC)

L3 작업요소 레벨 (B계열) — 공정순서 + 4M + 순번 기반
─────────────────────────────────────────────────────
PF-L3-{pno}-{m4}-{b1seq}              ← B1 (작업요소)
PF-L3-{pno}-{m4}-{b1seq}-G[-{idx}]    ← B2 (요소기능)
PF-L3-{pno}-{m4}-{b1seq}-C-{cseq}     ← B3 (공정특성)
PF-L3-{pno}-{m4}-{b1seq}-K-{kseq}     ← B4 (고장원인/FC)
PF-L3-{pno}-{m4}-{b1seq}-V-{vseq}     ← B5 (예방관리/PC)

고장사슬 레벨 (FC계열) — 공정순서 + FM순번 + 4M + 원인순번
─────────────────────────────────────────────────────
PF-FC-{pno}-M{mseq}-{m4}{b1seq}-K{kseq}  ← FailureLink
```

---

## 3. 엔티티별 UUID 부여 규칙

### 3.1 L1 완제품 레벨 (C계열)

| 엔티티 | 코드 | UUID 패턴 | dedup key | parentId |
|--------|------|----------|-----------|----------|
| 구분 | C1 | `PF-L1-{YP\|SP\|US}` | `scope` | 없음 (최상위) |
| 완제품기능 | C2 | `PF-L1-{구분}-{seq}` | `scope\|seq` | → C1 |
| 요구사항 | C3 | `PF-L1-{구분}-{c2}-{c3}` | `scope\|c2\|c3` | → C2 |
| **고장영향(FE)** | C4 | `PF-L1-{구분}-{c2}-{c3}-{c4}` | `procNo\|scope\|fe` | → C3 |

### 3.2 L2 공정 레벨 (A계열)

| 엔티티 | 코드 | UUID 패턴 | dedup key | parentId |
|--------|------|----------|-----------|----------|
| 공정 | A1/A2 | `PF-L2-{pno}` | `pno` | → L1 |
| 공정기능 | A3 | `PF-L2-{pno}-F-{seq}` | `pno\|seq` | → A1 |
| **제품특성** | A4 | `PF-L2-{pno}-P-{seq}` | `pno\|char` | → A1 |
| **고장형태(FM)** | A5 | `PF-L2-{pno}-M-{seq}` | `pno\|fm` | → A4 (productCharId FK) |
| **검출관리(DC)** | A6 | `PF-L2-{pno}-D-{seq}` | `pno\|dc` | → A1 |

### 3.3 L3 작업요소 레벨 (B계열)

| 엔티티 | 코드 | UUID 패턴 | dedup key | parentId |
|--------|------|----------|-----------|----------|
| 작업요소 | B1 | `PF-L3-{pno}-{m4}-{seq}` | `pno\|m4\|we` | → A1 (L2) |
| 요소기능 | B2 | `PF-L3-{pno}-{m4}-{seq}-G-{idx}` | `pno\|m4\|we` | → B1 |
| **공정특성** | B3 | `PF-L3-{pno}-{m4}-{seq}-C-{cseq}` | `pno\|m4\|we` | → B1 |
| **고장원인(FC)** | B4 | `PF-L3-{pno}-{m4}-{seq}-K-{kseq}` | `pno\|m4\|we\|fm\|fc` | → B3 (processCharId FK) |
| **예방관리(PC)** | B5 | `PF-L3-{pno}-{m4}-{seq}-V-{vseq}` | `pno\|m4\|we\|fc\|pc` | → B1 |

### 3.4 고장사슬 레벨

| 엔티티 | UUID 패턴 | dedup key | 참조 FK |
|--------|----------|-----------|--------|
| **FailureLink(FL)** | `PF-FC-{pno}-M{mseq}-{m4}{b1seq}-K{kseq}` | `fmId\|fcId\|feId` (3요소 필수) | fmId→FM, fcId→FC, feId→FE |
| **RiskAnalysis(RA)** | `risk-{failureLinkId}` | `failureLinkId` (1:1) | failureLinkId→FL |
| **DC (검출관리)** | `risk-{flId}-dc` | `flId\|dcSource` | dcSourceId→산업DB/LLD |
| **PC (예방관리)** | `risk-{flId}-pc` | `flId\|pcSource` | pcSourceId→산업DB/LLD |

---

## 4. parentId 계층 체인

### 4.1 전체 계층도

```
PF-L1-YP                                    ← L1 (구분: 양산전)
  ├→ PF-L1-YP-001                            ← C2 (완제품기능 #1)
  │    ├→ PF-L1-YP-001-001                   ← C3 (요구사항 #1)
  │    │    └→ PF-L1-YP-001-001-001          ← C4 (고장영향/FE #1)
  │    └→ PF-L1-YP-001-002                   ← C3 (요구사항 #2)
  │         └→ PF-L1-YP-001-002-001          ← C4 (고장영향/FE #2)
  │
PF-L2-010                                   ← A1 (공정 #10)
  ├→ PF-L2-010-F-001                         ← A3 (공정기능 #1)
  ├→ PF-L2-010-P-001                         ← A4 (제품특성 #1) ★ 공정 단위 1회 생성
  ├→ PF-L2-010-M-001                         ← A5 (FM #1, parentId→A4)
  ├→ PF-L2-010-D-001                         ← A6 (DC #1)
  │
  ├→ PF-L3-010-MC-001                        ← B1 (작업요소: 설비 #1)
  │    ├→ PF-L3-010-MC-001-G                 ← B2 (요소기능 #1)
  │    ├→ PF-L3-010-MC-001-C-001             ← B3 (공정특성 #1)
  │    ├→ PF-L3-010-MC-001-K-001             ← B4 (FC #1, parentId→B3)
  │    └→ PF-L3-010-MC-001-V-001             ← B5 (PC #1)
  │
  └→ PF-L3-010-MT-001                        ← B1 (작업요소: 재료 #1)
       ├→ PF-L3-010-MT-001-G                 ← B2
       ├→ PF-L3-010-MT-001-C-001             ← B3
       └→ PF-L3-010-MT-001-K-001             ← B4

고장사슬:
PF-FC-010-M001-MC001-K001                    ← FL (공정10, FM#1, 설비#1, FC#1)
  └→ risk-{flId}                             ← RA (1:1)
       ├→ risk-{flId}-dc                     ← DC 소스
       └→ risk-{flId}-pc                     ← PC 소스
```

### 4.2 parentId 규칙

| 규칙 | 설명 | 검증 방법 |
|------|------|----------|
| **prefix 포함** | 자식 UUID는 부모 UUID를 prefix로 포함 | `child.startsWith(parent)` |
| **공정순서 일치** | 부모-자식 공정순서 동일 | `extractPno(child) === extractPno(parent)` |
| **getParentId()** | 마지막 세그먼트 제거 = 부모 UUID | `getParentId('PF-L3-010-MC-001-K-001') → 'PF-L3-010-MC-001-K'` |
| **최상위 판별** | 세그먼트 3개 이하 = 최상위 (parentId 없음) | `segs.length <= 3 → null` |

### 4.3 FK 참조 규칙 (parentId와 별개)

| FK 관계 | 소스 → 타겟 | 매칭 방법 |
|---------|-----------|----------|
| A5 → A4 | FM.productCharId → ProductChar.id | **ID 기반 Map.get()만** |
| B4 → B3 | FC.processCharId → ProcessChar.id | **ID 기반 Map.get()만** |
| FL → FM | FailureLink.fmId → FailureMode.id | **UUID FK 직접 참조** |
| FL → FC | FailureLink.fcId → FailureCause.id | **UUID FK 직접 참조** |
| FL → FE | FailureLink.feId → FailureEffect.id | **UUID FK 직접 참조** |
| RA → FL | RiskAnalysis.failureLinkId → FL.id | **UUID FK 직접 참조** |

---

## 5. dedup key 규칙 (중복 ID 생성 차단)

### 5.1 필수 포함 컨텍스트

| 엔티티 | 필수 컨텍스트 | 누락 시 증상 |
|--------|-------------|-------------|
| **FC (고장원인)** | 공정순서 + 작업요소(l3StructId) + 원인명 | 다른 공정 FC가 합쳐짐 |
| **FM (고장형태)** | 공정순서 + 고장형태명 | 다른 공정 FM 소실 |
| **FE (고장영향)** | 공정순서 + 구분(scope) + 영향명 | YP/SP 구분 소실 |
| **제품특성 (A4)** | 공정순서 + 특성명 | 카테시안 복제 |
| **공정특성 (B3)** | 공정순서 + 4M + 작업요소 | WE 간 혼동 |
| **FL (고장사슬)** | fmId + fcId + **feId** (3요소 필수) | 유효 체인 삭제 |

### 5.2 dedup key 위반 방지 검증

```typescript
// ❌ 위반: 공정순서 누락
dedupKey = `${cause}`;                     // "작업숙련도부족" → 18개 공정 1건으로 합침

// ❌ 위반: feId 누락
flDedupKey = `${fmId}|${fcId}`;            // 같은 FM+FC, 다른 FE → 유효 체인 삭제

// ✅ 정상: 공정순서 포함
dedupKey = `${l2StructId}|${l3StructId}|${cause}`;  // 공정별 별도 FC

// ✅ 정상: 3요소 포함
flDedupKey = `${fmId}|${fcId}|${feId}`;    // FM+FC+FE 3요소 완전 매칭
```

---

## 6. UUID 검증 규칙 (uuid-rules.ts)

### 6.1 구조 검증

| 검증 | 규칙 | 실패 시 |
|------|------|--------|
| 형식 | `{DOC}-{LEVEL}-...` 패턴 매칭 | ERROR: 잘못된 UUID 형식 |
| 공정순서 | 숫자 3자리 패딩 (001~999) | ERROR: 공정순서 누락/형식 오류 |
| 순번 | 001~999 범위 | ERROR: 순번 초과 |
| prefix | 자식 UUID가 부모 UUID를 prefix로 포함 | ERROR: 상하관계 불일치 |

### 6.2 정합성 검증

| 검증 | 규칙 | 실패 시 |
|------|------|--------|
| 부모-자식 공정순서 | `extractPno(child) === extractPno(parent)` | ERROR: 다른 공정 ID로 생성 |
| dedup key 유일성 | 같은 dedup key → 같은 UUID | ERROR: 중복 ID 생성 |
| FK 존재 | `Map.has(fkId) === true` | ERROR: 고아 FK (존재하지 않는 부모 참조) |
| FL 3요소 | `fmId && fcId && feId` 모두 존재 | ERROR: FL dedup key 불완전 |

### 6.3 다른 공정 ID 혼입 차단

```typescript
// B4(FC)가 공정10의 B3(공정특성)을 참조해야 하는데 공정20의 B3을 참조하는 경우:
validateParentChild(
  "PF-L3-010-MC-001-K-001",  // 자식: 공정10의 FC
  "PF-L3-020-MC-001-C-001"   // 부모: 공정20의 B3 ← ERROR!
)
// → ERROR: 공정순서 불일치 (자식=010, 부모=020)
```

---

## 7. 버그 이력 기반 방지 규칙

### 7.1 과거 버그 → 방지 규칙 매핑

| 버그 (커밋) | 근본원인 | 방지 규칙 |
|------------|---------|----------|
| FL 8건 소실 (`4f9b61b`) | FL dedup key에 feId 누락 | **R-FL-001**: FL dedup key는 반드시 `fmId\|fcId\|feId` 3요소 |
| FC emptyPC (`b0b4f2b`) | B4 dedup key에 WE 누락 | **R-B4-001**: B4 dedup key는 반드시 `pno\|m4\|we\|fm\|fc` 5요소 |
| FC 렌더링 누락 (`dae39b1`) | FC dedup에 l3StructId 누락 | **R-FC-001**: FC dedup key는 반드시 `l2StructId\|l3StructId\|cause` |
| B3 과잉 dedup (`c7ac2ec`) | 텍스트 기반 dedup | **R-B3-001**: B3 dedup 금지 (B4마다 독립 B3) |
| 45건 텍스트매칭 (`c6a899e`) | 이름매칭/자동생성 | **R-FK-001**: FK 매칭은 ID 기반 Map.get()만 허용 |

### 7.2 방지 규칙 요약 (CODEFREEZE)

| 규칙 ID | 규칙 | 적용 대상 |
|---------|------|----------|
| **R-UUID-001** | 모든 셀은 UUID 필수 | 전체 엔티티 |
| **R-UUID-002** | UUID에 공정순서 문자열 포함 필수 | A계열, B계열, FC |
| **R-UUID-003** | UUID에 구분(scope) 포함 필수 | C4(FE), L1Function |
| **R-PID-001** | parentId 필수 (최상위 제외) | 전체 하위 엔티티 |
| **R-PID-002** | 부모-자식 공정순서 일치 검증 | 모든 부모-자식 관계 |
| **R-DK-001** | dedup key에 공정순서 필수 포함 | FM, FC, FE, A4, B3, B4 |
| **R-DK-002** | dedup key에 구분(m4/scope) 필수 포함 | FC, FE, B1~B5 |
| **R-FL-001** | FL dedup key 3요소(fmId+fcId+feId) 필수 | FailureLink |
| **R-FK-001** | FK 매칭은 ID 기반만 (텍스트매칭 금지) | 전체 FK 관계 |
| **R-FK-002** | positional fallback 금지 | A5→A4, B4→B3 |
| **R-CT-001** | 카테시안 복제 금지 (A4 공정 단위 1회 생성) | 제품특성(A4) |

---

## 8. 검증 체크리스트 (파이프라인 검증 시)

```
[ ] 1. 모든 엔티티에 UUID 존재 (NULL UUID = 0건)
[ ] 2. UUID 형식 정합성 ({DOC}-{LEVEL}-{pno}-... 패턴)
[ ] 3. parentId 존재 (최상위 제외 모든 엔티티)
[ ] 4. 부모-자식 공정순서 일치 (cross-process 혼입 = 0건)
[ ] 5. dedup key 유일성 (동일 key → 동일 UUID)
[ ] 6. FL 3요소 완전성 (fmId+fcId+feId 모두 NOT NULL)
[ ] 7. FK 존재 검증 (고아 FK = 0건)
[ ] 8. 카테시안 복제 탐지 (같은 공정 내 동일 A4 UUID 중복 = 0건)
```

---

## 9. 근본원인 분석 결과 (2026-03-21)

### 9.1 발견된 3가지 문제

| # | 문제 | 근본원인 | 증상 | 해결 |
|---|------|---------|------|------|
| 1 | **비결정론적 ID 생성** | `handleFileSelect`에서 `uid()` 기반 랜덤 ID 사용 → 매 Import마다 다른 UUID 생성 | 같은 엑셀 Import해도 ID 불일치, FK 깨짐 | 공정순서 기반 결정론적 ID 패턴 적용 (`PF-L2-{pno}`, `PF-L3-{pno}-{m4}-{seq}` 등) |
| 2 | **parentItemId FK 체인 오류** | B4(고장원인)의 `parentItemId`가 B1(작업요소)을 직접 참조 → B3(공정특성) 건너뜀 | `buildWorksheetState`에서 B4→B3 매칭 실패 → 순차폴백 → orphanPC 발생 | B4→B3→B1 체인 수정: B4.parentItemId는 반드시 B3을 참조 |
| 3 | **고장사슬 FK 불완전** | FailureLink dedup key에 `feId` 누락 (`fmId\|fcId`만 사용) | 동일 FM+FC의 다른 FE 연결 체인 삭제 → FL 8건 소실 | FL dedup key를 `fmId\|fcId\|feId` 3요소로 확장 |

### 9.2 근본원인 체인 (Root Cause Chain)

```
❌ 기존 (비결정론적) 흐름:
handleFileSelect()
  → excel-parser.ts (엑셀 파싱)
  → uid() 호출 (nanoid 기반 랜덤 ID)
  → ImportedFlatData[] (매번 다른 ID)
  → buildWorksheetState() (B4→B1 직접 참조 → B3 누락)
  → failureChainInjector() (FL dedup key에 feId 누락)
  → 비결정론적 ID + 깨진 FK 체인

✅ 올바른 (결정론적) 흐름:
handleFileSelect()
  → parseMultiSheetExcel() (엑셀 파싱)
  → convertToImportFormat() (정규화)
  → 결정론적 ID 생성 (공정순서 + 4M + 순번 기반)
  → ImportedFlatData[] (동일 엑셀 → 항상 동일 ID)
  → buildWorksheetState() (B4→B3→B1 올바른 체인)
  → failureChainInjector() (FL dedup key 3요소 완전)
  → 결정론적 ID + 완전한 FK 체인
```

### 9.3 parentItemId FK 체인 규칙

> 모든 하위 엔티티는 **직접 부모**를 `parentItemId`로 참조해야 한다. 계층을 건너뛴 참조는 금지.

| 자식 엔티티 | parentItemId 참조 대상 | 금지 | 검증 방법 |
|-----------|---------------------|------|----------|
| **B4 (고장원인/FC)** | → **B3 (공정특성)** | ❌ B4→B1 직접 참조 | `b4.parentItemId`의 itemCode가 'B3'인지 확인 |
| **B3 (공정특성)** | → **B1 (작업요소)** | ❌ B3→A1 참조 | `b3.parentItemId`의 itemCode가 'B1'인지 확인 |
| **B2 (요소기능)** | → **B1 (작업요소)** | ❌ B2→A1 참조 | `b2.parentItemId`의 itemCode가 'B1'인지 확인 |
| **B5 (예방관리/PC)** | → **B1 (작업요소)** | ❌ B5→A1 참조 | `b5.parentItemId`의 itemCode가 'B1'인지 확인 |
| **A5 (고장형태/FM)** | → **A4 (제품특성)** | ❌ A5→A1 참조 | `a5.parentItemId`의 itemCode가 'A4'인지 확인 |
| **C3 (요구사항)** | → **C2 (완제품기능)** | ❌ C3→C1 참조 | `c3.parentItemId`의 itemCode가 'C2'인지 확인 |
| **C4 (고장영향/FE)** | → **C3 (요구사항)** | ❌ C4→C1 참조 | `c4.parentItemId`의 itemCode가 'C3'인지 확인 |

```
올바른 parentItemId 체인:

B계열 (L3):
  B1 (작업요소) ← 최상위 (parentItemId → A1 L2 공정)
    ├→ B2 (요소기능)     parentItemId → B1
    ├→ B3 (공정특성)     parentItemId → B1
    │    └→ B4 (고장원인) parentItemId → B3 (★ B1이 아님!)
    └→ B5 (예방관리)     parentItemId → B1

A계열 (L2):
  A1 (공정) ← 최상위
    ├→ A3 (공정기능)     parentItemId → A1
    ├→ A4 (제품특성)     parentItemId → A1
    │    └→ A5 (고장형태) parentItemId → A4 (★ A1이 아님!)
    └→ A6 (검출관리)     parentItemId → A1

C계열 (L1):
  C1 (구분) ← 최상위
    └→ C2 (완제품기능)   parentItemId → C1
         └→ C3 (요구사항) parentItemId → C2
              └→ C4 (고장영향) parentItemId → C3
```

### 9.4 고장사슬 FK 할당 규칙

| FK 필드 | 소스 엔티티 | 타겟 엔티티 | 할당 시점 | 할당 방법 |
|---------|-----------|-----------|----------|----------|
| `FailureLink.fmId` | FailureLink | FailureMode (A5) | rebuild-atomic / migration | UUID 직접 할당 |
| `FailureLink.fcId` | FailureLink | FailureCause (B4) | rebuild-atomic / migration | UUID 직접 할당 |
| `FailureLink.feId` | FailureLink | FailureEffect (C4) | rebuild-atomic / migration | UUID 직접 할당 |
| `FM.productCharId` | FailureMode | ProductChar (A4) | import-builder | 동일 공정 내 A4 ID 참조 |
| `FC.processCharId` | FailureCause | ProcessChar (B3) | import-builder | B4.parentItemId → B3.id |
| `RA.failureLinkId` | RiskAnalysis | FailureLink | rebuild-atomic | FL 생성 직후 1:1 생성 |

```
FK 할당 흐름:

Import 단계 (임시):
  A4 생성 → A5.parentItemId = A4.id (productCharId FK 후보)
  B3 생성 → B4.parentItemId = B3.id (processCharId FK 후보)

DB 저장 단계 (확정):
  FM.productCharId = A4.id   (A5.parentItemId에서 추출)
  FC.processCharId = B3.id   (B4.parentItemId에서 추출)

rebuild-atomic 단계 (고장사슬):
  FL = { fmId: FM.id, fcId: FC.id, feId: FE.id }  (3요소 필수)
  RA = { failureLinkId: FL.id }                     (1:1 매핑)
```

---

## 10. 참조

- `src/lib/uuid-generator.ts` — UUID 생성 함수
- `src/lib/uuid-rules.ts` — UUID 검증 유틸리티
- `CLAUDE.md` Rule 1.7 — UUID/FK 설계 원칙 (CODEFREEZE)
- `CLAUDE.md` Rule 1.6 — 근본원인 분석 원칙
