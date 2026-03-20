# Smart FMEA — L1/L2/L3/FC FK 관계 명세서

> **목적**: Import → DB → Worksheet 전 파이프라인에서 UUID/FK 연결의 **단일 진실 공급원(SSOT)**
> **기준**: AIAG-VDA FMEA 1판 | Smart FMEA v4.5 | Prisma schema 기준 | 2026-03-20
> **사용처**: Cursor/Claude Code에서 코드 수정 시 반드시 이 문서의 FK 규칙을 따를 것
> **검증**: 이 문서의 FK 필드명은 `prisma/schema.prisma` 실제 필드명과 1:1 대응

---

## 1. 계층 구조 (Hierarchy)

```
FmeaProject (프로젝트, fmeaId로 참조)
│
├── L1Structure ─── L1Function
│   └── .fmeaId       ├── .l1StructId ──FK──→ L1Structure.id
│                     ├── .category (YP/SP/USER)
│                     ├── .functionName (제품기능)
│                     ├── .requirement (요구사항)
│                     └── FailureEffect (고장영향, C4)
│                         └── .l1FuncId ──FK──→ L1Function.id
│
├── L2Structure ─── L2Function
│   ├── .fmeaId        ├── .l2StructId ──FK──→ L2Structure.id
│   ├── .l1Id ──FK──→ L1Structure.id
│   ├── .no (공정번호)  ├── .functionName (공정기능)
│   └── .name (공정명)  ├── .productChar (제품특성, A4)
│                       └── FailureMode (고장형태, A5)
│                           ├── .l2FuncId ──FK──→ L2Function.id
│                           ├── .l2StructId ──FK──→ L2Structure.id
│                           └── .productCharId ──FK──→ L2Function.id (선택)
│
├── L3Structure ─── L3Function
│   ├── .fmeaId        ├── .l3StructId ──FK──→ L3Structure.id
│   ├── .l1Id ──FK──→ L1Structure.id
│   ├── .l2Id ──FK──→ L2Structure.id
│   ├── .m4 (4M코드)   ├── .l2StructId ──FK──→ L2Structure.id
│   └── .name (B1)     ├── .functionName (요소기능, B2)
│                       ├── .processChar (공정특성, B3)
│                       └── FailureCause (고장원인, B4)
│                           ├── .l3FuncId ──FK──→ L3Function.id
│                           ├── .l3StructId ──FK──→ L3Structure.id
│                           └── .l2StructId ──FK──→ L2Structure.id
│
├── FailureLink (워크시트 행 단위 — FM↔FE↔FC 확정 연결)
│   ├── .fmId ──FK──→ FailureMode.id
│   ├── .feId ──FK──→ FailureEffect.id
│   ├── .fcId ──FK──→ FailureCause.id
│   └── @@unique([fmeaId, fmId, feId, fcId])
│
├── FailureAnalysis (워크시트 통합 렌더링 캐시)
│   └── .linkId ──FK──→ FailureLink.id (@unique, 1:1)
│
└── RiskAnalysis (SOD/AP 평가)
    ├── .linkId ──FK──→ FailureLink.id
    ├── .preventionControl (예방관리, B5)
    ├── .detectionControl (검출관리, A6)
    ├── .severity / .occurrence / .detection
    └── .ap (H/M/L)
```

> **주의**: `FailureChain`은 DB 테이블이 아닌 **Import 중간 데이터 구조**(`MasterFailureChain` TypeScript 인터페이스).
> FC시트 파싱 결과를 담는 메모리 구조체이며, Import 완료 시 `FailureLink`로 확정 저장됨.

---

## 2. 엔티티별 PK/FK 정의 (Prisma schema 기준)

### 2.1 L1 레벨 (상위 제품/시스템)

| 엔티티 | PK | FK 필드 (Prisma) | FK 대상 | 관계 | Import 시트 |
|--------|----|----|---------|------|-------------|
| **L1Structure** | `id` | `fmeaId` | FmeaProject.id | N:1 | — |
| **L1Function** | `id` | `l1StructId` | L1Structure.id | N:1 | C1(구분), C2(제품기능), C3(요구사항) |
| **FailureEffect** | `id` | `l1FuncId` | L1Function.id | N:1 | C4(고장영향) |

```
L1Structure (1) ──→ L1Function (N) ──→ FailureEffect (N)
 .fmeaId              .l1StructId        .l1FuncId
                      .category          .category (YP/SP/USER)
                      .functionName      .effect
                      .requirement       .severity
```

**FK 규칙**:
- L1Function.l1StructId → L1Structure.id **필수** (onDelete: Cascade)
- FailureEffect.l1FuncId → L1Function.id **필수** (onDelete: Cascade)
- FailureEffect.effect는 FC시트 B열과 텍스트 일치해야 함

### 2.2 L2 레벨 (공정 스텝)

| 엔티티 | PK | FK 필드 (Prisma) | FK 대상 | 관계 | Import 시트 |
|--------|----|----|---------|------|-------------|
| **L2Structure** | `id` | `fmeaId` | FmeaProject.id | N:1 | A1(공정번호), A2(공정명) |
| | | `l1Id` | L1Structure.id | N:1 | — |
| **L2Function** | `id` | `l2StructId` | L2Structure.id | N:1 | A3(공정기능), A4(제품특성) |
| **FailureMode** | `id` | `l2FuncId` | L2Function.id | N:1 | A5(고장형태) |
| | | `l2StructId` | L2Structure.id | N:1 | — |
| | | `productCharId` | L2Function.id | N:1 (선택) | A4 참조 |

```
L2Structure (1) ──→ L2Function (N) ──→ FailureMode (N)
 .l1Id → L1Struct     .l2StructId        .l2FuncId    (필수)
 .no: 공정번호         .functionName       .l2StructId  (필수)
 .name: 공정명         .productChar(A4)    .productCharId (선택)
                                           .mode
```

**FK 규칙**:
- L2Structure.no(공정번호)는 프로젝트 내 **유니크**
- L2Function.l2StructId → L2Structure.id **필수** (onDelete: Cascade)
- FailureMode는 **3개 FK**: l2FuncId(필수), l2StructId(필수), productCharId(선택)
- FailureMode.mode는 FC시트 D열과 텍스트 일치해야 함
- **A4(제품특성)는 L2Function.productChar 필드**이며 공정 레벨에서 공유됨

### 2.3 L3 레벨 (공정 작업요소)

| 엔티티 | PK | FK 필드 (Prisma) | FK 대상 | 필수 | Import 시트 |
|--------|----|----|---------|------|-------------|
| **L3Structure** | `id` | `l1Id` | L1Structure.id | 필수 | — |
| | | `l2Id` | L2Structure.id | 필수 | B1(작업요소) |
| **L3Function** | `id` | `l3StructId` | L3Structure.id | 필수 | B2(요소기능), B3(공정특성) |
| | | `l2StructId` | L2Structure.id | 필수 | — |
| **FailureCause** | `id` | `l3FuncId` | L3Function.id | 필수 | B4(고장원인) |
| | | `l3StructId` | L3Structure.id | 필수 | — |
| | | `l2StructId` | L2Structure.id | 필수 | — |
| | | `processCharId` | L3Function.id | 선택 | — |

```
L2Structure (1) ──→ L3Structure (N) ──→ L3Function (N) ──→ FailureCause (N)
                     .l1Id → L1Struct     .l3StructId        .l3FuncId    (필수)
                     .l2Id → L2Struct     .l2StructId        .l3StructId  (필수)
                     .m4 (MN/MC/...)      .functionName(B2)  .l2StructId  (필수)
                     .name (B1)           .processChar(B3)   .processCharId (선택)
                                                              .cause (B4)
```

**FK 규칙**:
- L3Structure는 **2개 상위 FK**: l1Id(L1Structure), l2Id(L2Structure) — 모두 필수
- L3Function은 **2개 상위 FK**: l3StructId(L3Structure), l2StructId(L2Structure) — 모두 필수
- FailureCause는 **3개 구조 FK + 1개 선택 FK**:
  - `l3FuncId` → L3Function (필수, onDelete: Cascade) — FC 매칭 1순위
  - `l3StructId` → L3Structure (필수) — FC 매칭 2순위
  - `l2StructId` → L2Structure (필수) — FC 매칭 3순위
  - `processCharId` → L3Function (선택) — 공정특성 역참조
- L3Structure.m4는 4M 코드: `MN`(작업자), `MC`(설비), `MD`(금형), `JG`(지그), `EN`(환경), `IM`(투입재료), `''`(공정자체)
- **INV-02: L3Function은 L3Structure당 반드시 1개 이상** ← 폴백 연쇄의 근본원인
- **INV-03: funcName 빈값이면 L3Structure.name 사용** (스킵 금지)

### 2.4 MasterFailureChain (FC시트 — Import 중간 데이터 구조)

> **⚠️ DB 테이블이 아님** — TypeScript 인터페이스(`MasterFailureChain`)
> FC시트 파싱 결과를 메모리에 담는 구조체. Import 완료 시 `FailureLink`로 확정 저장됨.

| 필드 | 의미 | 매칭 대상 | FC시트 열 |
|------|------|----------|-----------|
| `feValue` | 고장영향 텍스트 | → FailureEffect.effect | B열 |
| `fmValue` | 고장형태 텍스트 | → FailureMode.mode | D열 |
| `fcValue` | 고장원인 텍스트 | → FailureCause.cause | G열 |
| `processNo` | 공정번호 | → L2Structure.no | E열 |
| `workElement` | 작업요소 | → L3Structure.name | F열 |
| `feId` | FE UUID (매칭 후 할당) | FailureEffect.id | — |
| `fmId` | FM UUID (매칭 후 할당) | FailureMode.id | — |
| `fcId` | FC UUID (매칭 후 할당) | FailureCause.id | — |
| `severity` | 심각도 | → RiskAnalysis.severity | C열 |

**텍스트 매칭 → UUID 확정 흐름**:
```
FC시트 파싱 → MasterFailureChain[] (텍스트만)
    ↓ failureChainInjector
FE/FM/FC 텍스트 매칭 → feId/fmId/fcId UUID 할당
    ↓ migration.ts FailureLink 루프
FailureLink 생성 (확정 FK)
```

**FK 규칙 (N:1:N 구조)**:
- 1개 FE에 N개 FM이 연결 (FE:FM = 1:N)
- 1개 FM에 N개 FC가 연결 (FM:FC = 1:N)
- FC시트의 E열(공정번호)과 F열(작업요소)는 **매칭 키**이며 FK가 아님
- `feId`, `fmId`, `fcId`는 Import 확정 시 DB에 존재하는 UUID를 참조해야 함

### 2.5 FailureLink (워크시트 행 단위 — DB 테이블)

| 엔티티 | PK | FK 필드 (Prisma) | FK 대상 | 관계 |
|--------|----|----|---------|------|
| **FailureLink** | `id` | `fmId` | FailureMode.id | N:1 (onDelete: Cascade) |
| | | `feId` | FailureEffect.id | N:1 (onDelete: Cascade) |
| | | `fcId` | FailureCause.id | N:1 (onDelete: Cascade) |
| | | `fmeaId` | FmeaProject.id | N:1 |

**추가 필드** (캐시/역전개용):
- `fmText`, `feText`, `fcText` — 텍스트 캐시 (FK가 아님)
- `fmSeq`, `feSeq`, `fcSeq` — 순번
- `fmPath`, `fePath`, `fcPath` — 하이브리드 ID 경로
- `severity` — FE 심각도 캐시

**FK 규칙**:
- `@@unique([fmeaId, fmId, feId, fcId])` — 동일 조합 중복 금지
- fmId/feId/fcId는 **모두 DB에 존재하는 UUID** 필수
- MasterFailureChain에서 파생되나, `chainId` FK 필드는 **존재하지 않음**

### 2.6 FailureAnalysis (워크시트 통합 렌더링 캐시 — DB 테이블)

| 엔티티 | PK | FK 필드 (Prisma) | FK 대상 | 관계 |
|--------|----|----|---------|------|
| **FailureAnalysis** | `id` | `linkId` (@unique) | FailureLink.id | 1:1 |

**필드**: FM/FE/FC 텍스트 + 공정명 + severity/occurrence + WE명/m4 캐시
**용도**: `atomicToLegacyAdapter.ts`에서 `analysisByLinkId` 매핑 → 워크시트 렌더링
**FK 규칙**: linkId는 FailureLink.id와 **1:1 대응** (unique 제약)

### 2.7 RiskAnalysis (SOD 평가 — DB 테이블)

| 엔티티 | PK | FK 필드 (Prisma) | FK 대상 | 관계 | Import 시트 |
|--------|----|----|---------|------|-------------|
| **RiskAnalysis** | `id` | `linkId` | FailureLink.id | N:1 (onDelete: Cascade) | — |

**필드**:
- `.preventionControl` ← B5(예방관리)
- `.detectionControl` ← A6(검출관리)
- `.severity`, `.occurrence`, `.detection` ← SOD 값 (1~10)
- `.ap` ← AP (H/M/L, 자동계산)

**FK 규칙**:
- RiskAnalysis.linkId → FailureLink.id (onDelete: Cascade)
- RiskAnalysis는 FailureLink당 **1개** (실질 1:1이나 schema상 N:1)
- preventionControl은 FailureCause 경유 L3Function → L3Structure 기준으로 매핑
- detectionControl은 FailureMode 경유 L2Function → L2Structure 기준으로 매핑

---

## 3. FK 체인 전체 경로

### 3.1 Import → DB 저장 경로 (Forward Path)

```
엑셀 시트          flatData.itemCode     DB 엔티티              FK (Prisma 필드명)
──────────         ─────────────         ─────────              ────────────────
A1 공정번호    →   processNo         →   L2Structure.no         .fmeaId
A2 공정명      →   A2                →   L2Structure.name       .l1Id → L1Structure.id
A3 공정기능    →   A3                →   L2Function.functionName .l2StructId → L2Structure.id
A4 제품특성    →   A4                →   L2Function.productChar
A5 고장형태    →   A5                →   FailureMode.mode       .l2FuncId → L2Function.id
                                                                 .l2StructId → L2Structure.id
A6 검출관리    →   A6                →   RiskAnalysis.detectionControl .linkId → FailureLink.id

B1 작업요소    →   B1 (+m4, +id)     →   L3Structure.name       .l2Id → L2Structure.id ★
                                                                 .l1Id → L1Structure.id
B2 요소기능    →   B2 (+parentItemId)→   L3Function.functionName .l3StructId → L3Structure.id
B3 공정특성    →   B3 (+parentItemId)→   L3Function.processChar  .l2StructId → L2Structure.id
B4 고장원인    →   B4 (+parentItemId)→   FailureCause.cause     .l3FuncId → L3Function.id
                                                                 .l3StructId → L3Structure.id
                                                                 .l2StructId → L2Structure.id
B5 예방관리    →   B5 (+parentItemId)→   RiskAnalysis.preventionControl .linkId → FailureLink.id

C1 구분        →   C1 (category='C') →   L1Function.category    .l1StructId → L1Structure.id
C2 제품기능    →   C2                →   L1Function.functionName
C3 요구사항    →   C3                →   L1Function.requirement
C4 고장영향    →   C4                →   FailureEffect.effect   .l1FuncId → L1Function.id

FC시트         →   MasterFailureChain[] → FailureLink            .fmId + .feId + .fcId
```

**★ 핵심 연결점**: `L3Structure.l2Id → L2Structure.id`
- B1이 속한 공정번호(processNo)로 L2Structure를 찾고 그 id를 `l2Id` FK로 설정
- Import 시 processNo → L2Structure.id 룩업이 **필수**

### 3.2 DB → 워크시트 렌더링 경로 (Reverse Path)

```
atomicToLegacyAdapter 조립 순서:

1. L2Structure (공정스텝) 루프
   │
   2. L2Function 조회 (FK: l2StructId → L2Structure.id)
   │  ├── productChar → A4 열
   │  └── FailureMode 조회 (FK: l2FuncId → L2Function.id) → A5 열
   │
   3. L3Structure 조회 (FK: l2Id → L2Structure.id) ★
   │  │
   │  4. L3Function 조회 (FK: l3StructId → L3Structure.id) ★★ INV-02: 0건이면 위반
   │  │  ├── processChar → B3 열
   │  │  └── FailureCause 조회 (FK: l3FuncId → L3Function.id) → B4 열
   │  │
   │  5. FailureLink 조회 (FK: fmId + fcId 매칭)
   │  │  ├── FailureAnalysis 조회 (FK: linkId → FailureLink.id, @unique)
   │  │  └── RiskAnalysis 조회 (FK: linkId → FailureLink.id)
   │  │     ├── preventionControl → B5 열
   │  │     └── detectionControl → A6 열
   │  │
   │  6. FailureEffect 역참조 (FK: feId → FailureEffect.id) → C4 열
   │
   7. 워크시트 행 배열 조립
```

---

## 4. 불변 규칙 (Invariants)

### 4.1 생성 불변 규칙

| # | 규칙 | 위반 시 결과 |
|---|------|-------------|
| INV-01 | 모든 L2Structure는 최소 1개 L2Function을 가져야 함 | 워크시트 A3/A4 빈 행 |
| INV-02 | 모든 L3Structure는 최소 1개 L3Function을 가져야 함 | **폴백 연쇄 발생 (근본원인)** |
| INV-03 | L3Function 생성 시 funcName 빈값이면 L3Structure.name 사용 | 스킵하면 INV-02 위반 |
| INV-04 | 모든 FailureMode는 L2Function을 참조해야 함 | 고아 FM |
| INV-05 | 모든 FailureCause는 L3Function을 참조해야 함 | 고아 FC원인 |
| INV-06 | 모든 FailureEffect는 L1Function을 참조해야 함 | 고아 FE |
| INV-07 | FailureChain의 feId/fmId/fcId는 각각 DB에 존재해야 함 | phantom FC |

### 4.2 매칭 불변 규칙

| # | 규칙 | 검증 방법 |
|---|------|----------|
| INV-10 | set(A5.고장형태) == set(FC.D열) | 텍스트 집합 비교 |
| INV-11 | set(B4.고장원인) ⊇ set(FC.G열) | FC의 모든 원인이 B4에 존재 |
| INV-12 | set(C4.고장영향) ⊇ set(FC.B열) | FC의 모든 영향이 C4에 존재 |
| INV-13 | set(B1.작업요소) ⊇ set(FC.F열) | FC의 모든 WE가 B1에 존재 |
| INV-14 | FailureLink.fmId/feId/fcId == 대응 FailureChain의 것 | UUID 직접 비교 |

### 4.3 삭제 불변 규칙

| # | 규칙 | 구현 |
|---|------|------|
| INV-20 | L2Structure 삭제 시 하위 L3Structure 전체 CASCADE | onDelete: Cascade |
| INV-21 | L3Structure 삭제 시 하위 L3Function 전체 CASCADE | onDelete: Cascade |
| INV-22 | FailureLink 삭제 시 RiskAnalysis CASCADE | onDelete: Cascade |
| INV-23 | Import 재실행 시 기존 데이터 전체 DELETE 후 CREATE | $transaction 내 |

---

## 5. parentItemId FK 매핑 규칙

Import 엑셀에서 B2~B5는 `parentItemId`로 상위 B1을 참조합니다.

```
B1 (작업요소)     id: "PF-010-MN-001"  → L3Structure { id, name, m4, l2Id, l1Id }
  ├─ B2 (요소기능) parentItemId: B1.id  → L3Function { functionName, l3StructId, l2StructId }
  ├─ B3 (공정특성) parentItemId: B1.id  → L3Function { processChar, l3StructId, l2StructId }
  ├─ B4 (고장원인) parentItemId: B3.id  → FailureCause { cause, l3FuncId, l3StructId, l2StructId }
  └─ B5 (예방관리) parentItemId: B1.id  → RiskAnalysis { preventionControl, linkId }
```

**핵심**:
- B2/B3은 같은 L3Function의 서로 다른 필드 (`functionName` vs `processChar`)
- B4의 parentItemId는 **B3의 id** (B1이 아님) — `import-builder.ts` L891-943에서 B4→B3 FK 매핑
- B5는 FailureLink 경유 RiskAnalysis

**parentItemId 해석 순서**:
1. B2/B3: `parentItemId` → B1의 `id` → `b1IdToWeId` 매핑 → L3Structure → L3Function 배치
2. B4: `parentItemId` → B3의 `id` → `processCharId` FK로 L3Function 참조
3. B5: `parentItemId` → B1의 `id` → FailureLink 경유 RiskAnalysis에 저장

**주의**: B4.parentItemId는 **2026-03-19 이후 B3 ID를 가리킴** (이전에는 B1 ID → FK 불일치 버그)

---

## 6. NON_WORK_M4 폴백 규칙

| m4 코드 | 이름 | 폴백 생성 | 이유 |
|---------|------|----------|------|
| `MN` | 작업자 | ✅ 생성 | 워크시트 필수 행 |
| `''` (빈값) | 공정 자체 | ✅ 생성 | 워크시트 필수 행 |
| `MC` | 설비 | ❌ 제외 | 미입력 = 분석 제외 의도 |
| `MD` | 금형 | ❌ 제외 | 미입력 = 분석 제외 의도 |
| `JG` | 지그 | ❌ 제외 | 미입력 = 분석 제외 의도 |
| `EN` | 환경 | ❌ 제외 | 미입력 = 분석 제외 의도 |
| `IM` | 투입재료 | ❌ 제외 | 미입력 = 분석 제외 의도 |

**단, INV-02가 지켜지면 폴백 자체가 불필요함.**
폴백은 INV-02 위반의 안전망이지 정상 경로가 아님.

---

## 7. 폴백 근본원인 진단과 FIX 매핑 (2026-03-20 확정)

### 7.1 인과 체인 (Fallback 2 → 3 → 4 → 5 → 1 수렴)

```
Fallback 2: L3Structure에 L3Function 0건
    ↑ 근본원인: migration.ts에서 funcName 빈값 시 스킵 (INV-02/03 위반)
    │
    ├→ Fallback 3: FC가 L3Function 매칭 4단계 모두 실패 (해당 공정에 L3F 0건)
    │    └→ Fallback 4: Fallback 3의 2차 안전망 (동일 근본원인)
    │
    ├→ Fallback 5: orphan cleanup 후 L3Function 재부족 (순환)
    │
    └→ Fallback 1: processChar 빈값 (L3Function이 있어도 B3→WE FK 불일치 시)
                    ※ FIX-1이 effectiveFuncName 폴백으로 빈값 방지

Fallback 6: FE 매칭 실패 (별도 인과 체인)
    ↑ 근본원인: MasterFailureChain.feId ↔ FailureEffect.id UUID 불일치
```

### 7.2 FIX 매핑

| 폴백 # | 근본원인 | 위반 불변 규칙 | FIX | 상태 |
|---------|---------|---------------|-----|------|
| Fallback 1 (processChar 역추론) | B3→WE FK 불일치 + funcName 빈값 | INV-02 | FIX-1 | ✅ 적용 |
| Fallback 2 (L3Function 0건) | migration.ts L438 스킵 (INV-03 위반) | INV-02, INV-03 | FIX-1 | ✅ 적용 |
| Fallback 3 (FC→L3F 매칭 실패) | Fallback 2 연쇄 | INV-02 | FIX-1 | ✅ 적용 |
| Fallback 4 (FLAW-2 방어) | Fallback 3 연쇄 | INV-02 | FIX-1 | ✅ 적용 |
| Fallback 5 (orphan 재생성) | Fallback 2-4 순환 | INV-02 | FIX-1 | ✅ 적용 |
| Fallback 6 (FE 자동생성) | feId UUID 불일치 | INV-07 | FIX-2 | ✅ 적용 |

**FIX-1 (INV-02/03 보장)**: migration.ts에서 `funcName` 빈값이면 **`L3Structure.name`(WE 이름)을 사용**하여 L3Function 생성. 스킵 금지. WE에 function이 없으면 WE 이름으로 L3Function 1건 자동 보장.

**FIX-2 (INV-07 보장)**: migration.ts FailureLink 루프에서 FC/FE 매칭 실패 시 phantom 엔티티 생성 대신 **해당 FailureLink 스킵**. DB에 존재하지 않는 UUID를 FK로 설정하는 것을 원천 차단.

### 7.3 추가 FIX (2026-03-20 2차 전수조사)

| FIX ID | 파일 | 위반 | 수정 내용 |
|--------|------|------|----------|
| FIX-A | `migration.ts` | INV-01 (L2Struct에 L2Func 0건) | `procFuncs=[]`일 때 공정명으로 기본 L2Function 1건 보장 |
| FIX-A2 | `migration.ts` | tempL2Func에 `l1FuncId` 포함 (스키마에 없는 필드) | `l1FuncId` 제거 |
| FIX-B | `migration.ts` | RiskAnalysis에 `row-${rowIdx}` 무효 linkId | matchingLink 없으면 RA 생성 스킵 (유효한 FL만 참조) |
| FIX-C | `rebuild-atomic` | 미연결 FC→FL+RA 자동생성 (no-fallback 위반) | 경고 로그만 출력, 자동 엔티티 생성 전면 제거 |
| FIX-D | `auto-fix.ts` | empty catch 3건 (Rule 1 위반) | `console.error`로 교체, fixStructure 응답 필드명 수정 |
| FIX-E | `save-from-import` | ProcessProductChar 삭제만 하고 재생성 안함 → productCharId FK 고아 | FM.productCharId에서 ProcessProductChar 추출 후 createMany |
| FIX-E2 | `save-from-import` | 리버스 경로에서 ProcessProductChar 미로드 | reverseExistingDB에 processProductChars 포함 |

---

## 8. Import 파이프라인 검증 체크리스트

Import 완료 후 아래 항목이 모두 통과해야 함:

```
□ INV-01: 모든 L2Structure에 L2Function ≥ 1개  ← FIX-A
□ INV-02: 모든 L3Structure에 L3Function ≥ 1개  ← FIX-1 핵심
□ INV-04: FailureMode 고아 0개 (l2FuncId 유효)
□ INV-05: FailureCause 고아 0개 (l3FuncId 유효)
□ INV-06: FailureEffect 고아 0개 (l1FuncId 유효)
□ INV-07: FailureLink의 feId/fmId/fcId 모두 유효
□ INV-10: A5 ↔ FC.D열 텍스트 완전 일치
□ INV-11: B4 ⊇ FC.G열
□ INV-12: C4 ⊇ FC.B열
□ INV-14: FailureLink ↔ FailureChain UUID 일치
□ RiskAnalysis 고아 0개 (linkId 유효, row-${idx} 금지)  ← FIX-B
□ ProcessProductChar ↔ FailureMode.productCharId 정합  ← FIX-E
□ rebuild-atomic에 자동 FL/RA 생성 없음  ← FIX-C
□ 전체 Atomic $transaction 성공
```

---

## 9. Cursor/Claude Code 사용 지침

### 코드 수정 전 확인사항

1. **어떤 엔티티를 수정하는가?** → 이 문서의 Section 2에서 FK 필드명(Prisma) 확인
2. **상위 FK가 유효한가?** → Section 4 불변 규칙 확인
3. **하위에 CASCADE 영향이 있는가?** → Section 4.3 삭제 규칙 확인
4. **FK 필드명은 Prisma 축약형 사용**: `l1StructId` (O) / `l1StructureId` (X)

### Import 코드 수정 시

- `flatData.parentItemId` → Section 5 매핑 규칙 따를 것 (특히 B4→B3 FK)
- L3Function 생성 로직 → **INV-02, INV-03 반드시 보장** (스킵 금지)
- MasterFailureChain → FailureLink 변환 시 feId/fmId/fcId **DB 존재 검증 필수**
- 폴백 엔티티 생성 **금지** → 매칭 실패 시 스킵 + 경고 로그

### migration.ts 수정 시

- FC→L3Function 매칭: 4단계 순서 (l3FuncId → processChar → m4 → l2StructId 내 첫 L3F)
- FailureLink 빌드: FM/FE/FC 모두 유효해야 저장 → 하나라도 null이면 스킵
- **FailureCause는 3중 FK** (l3FuncId + l3StructId + l2StructId) 모두 설정

### atomicToLegacyAdapter 수정 시

- Section 3.2 렌더링 경로의 JOIN 순서를 따를 것
- `analysisByLinkId` 매핑 키는 `FailureAnalysis.linkId` (id가 아님)
- L3Function 0건 → 폴백이 아니라 **INV-02 위반 경고** 출력

### 신규 엔티티 추가 시

- **이 문서에 먼저 추가**하고, 그 다음 코드 수정
- FK 방향, 필드명(Prisma 기준), 필수/선택, CASCADE 여부 모두 명시
- `prisma/schema.prisma`와 이 문서의 FK 정의가 1:1 대응하는지 확인