# PFMEA 화면별 DB 구성 연계도

> **작성일**: 2026-02-09
> **목적**: 기초정보(Master) → 워크시트 각 탭(구조/기능/고장/연결) 간 DB 테이블 매핑 및 데이터 흐름 정의

---

## 1. 전체 데이터 흐름도

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      기초정보 (Master DB)                                │
│  PfmeaMasterDataset → PfmeaMasterFlatItem (A1~A6, B1~B5, C1~C4)       │
└───────────┬──────────────────────────────────────────────────────────────┘
            │ /api/fmea/master-structure (GET)
            │ /api/pfmea/master (GET/POST)
            ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    PFMEA 워크시트 (Atomic DB)                            │
│                                                                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                  │
│  │ 2단계       │    │ 3단계       │    │ 4단계       │                  │
│  │ 구조분석    │───▶│ 기능분석    │───▶│ 고장분석    │                  │
│  │             │    │ L1/L2/L3    │    │ FE/FM/FC    │                  │
│  └─────────────┘    └─────────────┘    └──────┬──────┘                  │
│                                                │                         │
│                                                ▼                         │
│                                        ┌──────────────┐                  │
│                                        │ 고장연결     │                  │
│                                        │ FailureLink  │                  │
│                                        │ FM ↔ FE ↔ FC │                  │
│                                        └──────┬───────┘                  │
│                                               │                          │
│                                               ▼                          │
│                                        ┌──────────────┐                  │
│                                        │ 5~6단계      │                  │
│                                        │ 리스크/최적화│                  │
│                                        │ RiskAnalysis │                  │
│                                        └──────────────┘                  │
└──────────────────────────────────────────────────────────────────────────┘
            │
            │ sync.ts (워크시트 저장 시 마스터 역동기화)
            ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  FmeaLegacyData (JSON) ← Single Source of Truth                         │
│  FmeaConfirmedState    ← 탭별 확정 상태                                  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 기초정보 DB (Master Data)

### 2.1 테이블 구조

| 테이블 | 용도 |
|--------|------|
| `pfmea_master_datasets` | 마스터 데이터셋 (활성/비활성 관리) |
| `pfmea_master_flat_items` | 마스터 항목 (플랫 구조) |

### 2.2 PfmeaMasterFlatItem 컬럼

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | String (UUID) | PK |
| `datasetId` | String | FK → PfmeaMasterDataset |
| `processNo` | String | 공정번호 (10, 20...) 또는 구분 (YP, SP, USER) |
| `category` | String | 'A' / 'B' / 'C' |
| `itemCode` | String | A1~A6, B1~B5, C1~C4 |
| `value` | String | 실제 데이터 값 |
| `m4` | String? | 4M 분류 (B1 전용): MN/MC/IM/EN |
| `sourceFmeaId` | String? | 소속 FMEA ID (필터용) |

### 2.3 itemCode → 워크시트 매핑

```
┌─────────────────────────────────────────────────────────────────┐
│ Category A: 구조분석 + 2L 고장                                   │
├──────────┬──────────────┬──────────────────────────────────────┤
│ itemCode │ 항목명        │ 워크시트 매핑                         │
├──────────┼──────────────┼──────────────────────────────────────┤
│ A1       │ 공정번호      │ L2Structure.no                       │
│ A2       │ 공정명        │ L2Structure.name                     │
│ A3       │ 공정기능      │ L2Function.functionName              │
│ A4       │ 제품특성      │ L2Function.productChar               │
│ A5       │ 고장형태      │ FailureMode.mode                     │
│ A6       │ 검출관리      │ RiskAnalysis.detectionControl        │
├──────────┴──────────────┴──────────────────────────────────────┤
│ Category B: 작업요소 + 3L 고장                                   │
├──────────┬──────────────┬──────────────────────────────────────┤
│ B1       │ 작업요소      │ L3Structure.name + L3Structure.m4    │
│ B2       │ 요소기능      │ L3Function.functionName              │
│ B3       │ 공정특성      │ L3Function.processChar               │
│ B4       │ 고장원인      │ FailureCause.cause                   │
│ B5       │ 예방관리      │ RiskAnalysis.preventionControl       │
├──────────┴──────────────┴──────────────────────────────────────┤
│ Category C: 완제품(L1) 기능 + 고장영향                           │
├──────────┬──────────────┬──────────────────────────────────────┤
│ C1       │ 구분          │ L1Function.category (YP/SP/USER)     │
│ C2       │ 완제품기능    │ L1Function.functionName              │
│ C3       │ 요구사항      │ L1Function.requirement               │
│ C4       │ 고장영향      │ FailureEffect.effect                 │
└──────────┴──────────────┴──────────────────────────────────────┘
```

---

## 3. 화면별 DB 테이블 연계

### 3.1 구조분석 (2단계)

```
┌─────────────────────────────────────────────────────────┐
│ 화면 컬럼          │ DB 테이블.필드          │ Master   │
├─────────────────────┼───────────────────────┼──────────┤
│ 완제품공정 (1L)    │ L1Structure.name       │ -        │
│ 공정번호           │ L2Structure.no         │ A1       │
│ 공정명 (2L)        │ L2Structure.name       │ A2       │
│ 4M                 │ L3Structure.m4         │ B1.m4    │
│ 작업요소 (3L)      │ L3Structure.name       │ B1.value │
└─────────────────────┴───────────────────────┴──────────┘

State 경로:
  state.l1.name           → 완제품공정
  state.l2[].no           → 공정번호
  state.l2[].name         → 공정명
  state.l2[].l3[].m4      → 4M (MN/MC/IM/EN)
  state.l2[].l3[].name    → 작업요소명

DB 저장:
  Atomic: l1_structures, l2_structures, l3_structures
  Legacy: fmea_legacy_data.data.l1, data.l2[].l3[]
```

### 3.2 기능분석 (3단계)

#### 3.2.1 L1 기능분석 (완제품)

```
┌─────────────────────────────────────────────────────────┐
│ 화면 컬럼          │ DB 테이블.필드          │ Master   │
├─────────────────────┼───────────────────────┼──────────┤
│ 구분               │ L1Function.category    │ C1       │
│ 기능명             │ L1Function.functionName│ C2       │
│ 요구사항           │ L1Function.requirement │ C3       │
└─────────────────────┴───────────────────────┴──────────┘

State 경로:
  state.l1.types[].name              → 구분 (YP/SP/USER)
  state.l1.types[].functions[].name  → 기능명
  state.l1.types[].functions[].requirements[].name → 요구사항

DB 저장:
  Atomic: l1_functions (1행 = 구분+기능+요구사항 원자 단위)
  Legacy: fmea_legacy_data.data.l1.types[]
```

#### 3.2.2 L2 기능분석 (메인공정)

```
┌─────────────────────────────────────────────────────────┐
│ 화면 컬럼          │ DB 테이블.필드          │ Master   │
├─────────────────────┼───────────────────────┼──────────┤
│ 공정번호/공정명     │ L2Structure.no/.name   │ A1/A2    │
│ 기능명             │ L2Function.functionName│ A3       │
│ 제품특성           │ L2Function.productChar │ A4       │
│ 특별특성           │ L2Function.specialChar │ -        │
└─────────────────────┴───────────────────────┴──────────┘

State 경로:
  state.l2[].no                              → 공정번호
  state.l2[].name                            → 공정명
  state.l2[].functions[].name                → 기능명
  state.l2[].functions[].productChars[].name → 제품특성

DB 저장:
  Atomic: l2_functions (1행 = 기능+제품특성 원자 단위)
  Legacy: fmea_legacy_data.data.l2[].functions[]
```

#### 3.2.3 L3 기능분석 (작업요소)

```
┌─────────────────────────────────────────────────────────┐
│ 화면 컬럼          │ DB 테이블.필드          │ Master   │
├─────────────────────┼───────────────────────┼──────────┤
│ 4M/작업요소        │ L3Structure.m4/.name   │ B1       │
│ 기능명             │ L3Function.functionName│ B2       │
│ 공정특성           │ L3Function.processChar │ B3       │
│ 특별특성           │ L3Function.specialChar │ -        │
└─────────────────────┴───────────────────────┴──────────┘

State 경로:
  state.l2[].l3[].m4                                        → 4M
  state.l2[].l3[].name                                      → 작업요소
  state.l2[].l3[].functions[].name                           → 기능명
  state.l2[].l3[].functions[].processChars[].name            → 공정특성

DB 저장:
  Atomic: l3_functions (1행 = 기능+공정특성 원자 단위)
  Legacy: fmea_legacy_data.data.l2[].l3[].functions[]
```

### 3.3 고장분석 (4단계)

#### 3.3.1 L1 고장영향 (FE)

```
┌─────────────────────────────────────────────────────────┐
│ 화면 컬럼          │ DB 테이블.필드          │ Master   │
├─────────────────────┼───────────────────────┼──────────┤
│ 구분               │ FailureEffect.category │ C1       │
│ 고장영향           │ FailureEffect.effect   │ C4       │
│ 심각도 (S)         │ FailureEffect.severity │ -        │
└─────────────────────┴───────────────────────┴──────────┘

State 경로:
  state.l1.failureScopes[].scope    → 구분
  state.l1.failureScopes[].effect   → 고장영향
  state.l1.failureScopes[].severity → 심각도

선행조건: state.l1Confirmed = true (L1 기능분석 확정 필수)
```

#### 3.3.2 L2 고장형태 (FM) ★중심축

```
┌─────────────────────────────────────────────────────────┐
│ 화면 컬럼          │ DB 테이블.필드          │ Master   │
├─────────────────────┼───────────────────────┼──────────┤
│ 공정명             │ L2Structure.name       │ A2       │
│ 제품특성           │ L2Function.productChar │ A4       │
│ 고장형태           │ FailureMode.mode       │ A5       │
│ 특별특성 여부      │ FailureMode.specialChar│ -        │
└─────────────────────┴───────────────────────┴──────────┘

State 경로:
  state.l2[].failureModes[].name          → 고장형태
  state.l2[].failureModes[].productCharId → FK: 어느 제품특성의 고장

선행조건: state.l2Confirmed = true (L2 기능분석 확정 필수)

FK 관계:
  FailureMode.l2FuncId   → L2Function.id (역추적: 어느 기능의 고장)
  FailureMode.l2StructId → L2Structure.id (역추적: 어느 공정의 고장)
```

#### 3.3.3 L3 고장원인 (FC)

```
┌─────────────────────────────────────────────────────────┐
│ 화면 컬럼          │ DB 테이블.필드          │ Master   │
├─────────────────────┼───────────────────────┼──────────┤
│ 4M/작업요소        │ L3Structure.m4/.name   │ B1       │
│ 공정특성           │ L3Function.processChar │ B3       │
│ 고장원인           │ FailureCause.cause     │ B4       │
│ 발생도 (O)         │ FailureCause.occurrence│ -        │
└─────────────────────┴───────────────────────┴──────────┘

State 경로:
  state.l2[].failureCauses[].name     → 고장원인 (공정 레벨)
  state.l2[].l3[].failureCauses[]     → 고장원인 (작업요소 레벨)

선행조건: state.l3Confirmed = true (L3 기능분석 확정 필수)

FK 관계:
  FailureCause.l3FuncId   → L3Function.id (역추적: 어느 요소기능)
  FailureCause.l3StructId → L3Structure.id (역추적: 어느 작업요소)
  FailureCause.l2StructId → L2Structure.id (역추적: 어느 공정)
```

### 3.4 고장연결 (FailureLink)

```
┌──────────────────────────────────────────────────────────────┐
│                    FailureLink 테이블                          │
│                                                                │
│   FE (고장영향)  ←───  FM (고장형태)  ───→  FC (고장원인)     │
│   1L 레벨             2L 레벨 ★중심       3L 레벨             │
│                                                                │
├──────────────┬────────────┬───────────────────────────────────┤
│ 컬럼         │ 타입        │ 설명                              │
├──────────────┼────────────┼───────────────────────────────────┤
│ id           │ String(UUID)│ PK                                │
│ fmeaId       │ String      │ FMEA 프로젝트 ID                  │
│ fmId         │ String      │ FK → FailureMode.id ★중심축       │
│ feId         │ String      │ FK → FailureEffect.id             │
│ fcId         │ String      │ FK → FailureCause.id              │
│ fmText       │ String?     │ 고장형태 텍스트 (캐시)             │
│ fmProcess    │ String?     │ FM 소속 공정명 (캐시)              │
│ feText       │ String?     │ 고장영향 텍스트 (캐시)             │
│ feScope      │ String?     │ FE 구분 YP/SP/USER (캐시)         │
│ fcText       │ String?     │ 고장원인 텍스트 (캐시)             │
│ fcWorkElem   │ String?     │ FC 작업요소명 (캐시)              │
│ fcM4         │ String?     │ FC 4M 분류 (캐시)                │
│ severity     │ Int?        │ 심각도 (캐시)                     │
│ fmSeq/feSeq  │ Int?        │ 순서 번호                         │
│ fmPath/fePath│ String?     │ Hybrid ID 경로                    │
└──────────────┴────────────┴───────────────────────────────────┘

State 경로:
  state.failureLinks[] = {
    fmId, feId, fcId,
    fmText, fmProcess,
    feText, feScope, severity,
    fcText, fcWorkElem, fcM4
  }

선행조건: failureL1/L2/L3 모두 확정 필수
```

### 3.5 리스크분석 (5단계) / 최적화 (6단계)

```
┌─────────────────────────────────────────────────────────┐
│ RiskAnalysis                                             │
├──────────────┬────────────┬─────────────────────────────┤
│ 컬럼         │ 타입        │ 설명                        │
├──────────────┼────────────┼─────────────────────────────┤
│ linkId       │ String      │ FK → FailureLink.id         │
│ severity     │ Int         │ S: 심각도 (1-10)            │
│ occurrence   │ Int         │ O: 발생도 (1-10)            │
│ detection    │ Int         │ D: 검출도 (1-10)            │
│ ap           │ String      │ AP: H/M/L                   │
│ preventionCtrl│ String?    │ 예방관리 (Master B5)        │
│ detectionCtrl│ String?     │ 검출관리 (Master A6)        │
└──────────────┴────────────┴─────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Optimization                                             │
├──────────────┬────────────┬─────────────────────────────┤
│ riskId       │ String      │ FK → RiskAnalysis.id        │
│ action       │ String      │ 권고 조치                    │
│ responsible  │ String      │ 담당자                       │
│ targetDate   │ String      │ 목표일                       │
│ newS/O/D     │ Int?        │ 개선 후 SOD                  │
│ newAP        │ String?     │ 개선 후 AP                   │
│ status       │ String      │ planned/in_progress/completed│
└──────────────┴────────────┴─────────────────────────────┘
```

---

## 4. 확정 상태 관리 (FmeaConfirmedState)

```
┌──────────────────────────┬────────────┬──────────────────────────┐
│ DB 컬럼                   │ 기본값     │ 연관 화면                 │
├──────────────────────────┼────────────┼──────────────────────────┤
│ structureConfirmed       │ false      │ 구조분석 (2단계)          │
│ l1FunctionConfirmed      │ false      │ L1 기능분석 (3단계)       │
│ l2FunctionConfirmed      │ false      │ L2 기능분석 (3단계)       │
│ l3FunctionConfirmed      │ false      │ L3 기능분석 (3단계)       │
│ failureL1Confirmed       │ false      │ L1 고장영향 (4단계)       │
│ failureL2Confirmed       │ false      │ L2 고장형태 (4단계)       │
│ failureL3Confirmed       │ false      │ L3 고장원인 (4단계)       │
│ failureLinkConfirmed     │ false      │ 고장연결                  │
│ riskConfirmed            │ false      │ 리스크분석 (5단계)        │
│ optimizationConfirmed    │ false      │ 최적화 (6단계)            │
└──────────────────────────┴────────────┴──────────────────────────┘

선행조건 체인:
  구조분석 확정 → L1기능 활성화
  L1기능 확정 → L2기능 활성화, L1고장 활성화
  L2기능 확정 → L3기능 활성화, L2고장 활성화
  L3기능 확정 → L3고장 활성화
  L1/L2/L3 고장 모두 확정 → 고장연결 활성화
  고장연결 확정 → 리스크분석 활성화
  리스크분석 확정 → 최적화 활성화
```

---

## 5. Master ↔ Worksheet 동기화 흐름

### 5.1 Master → Worksheet (로드)

```
사용자가 워크시트 열기 / 자동모드 ON
       │
       ▼
GET /api/fmea/master-structure?sourceFmeaId={id}
       │
       ├─ A2 항목 → processMap (공정 목록 구성)
       ├─ B1 항목 → workElements (작업요소 배치)
       │   ├─ item.value → WorkElement.name
       │   ├─ item.m4   → WorkElement.m4 (4M 분류)
       │   └─ ★ value가 4M 코드이면 SKIP (방어코드)
       └─ 공통공정(00) → commonWorkElements (모든 공정에 분배)
              │
              ▼
       StructureTab이 state.l2[].l3[] 에 배치
```

### 5.2 Worksheet → Master (역동기화)

```
워크시트 저장 시 (POST /api/fmea)
       │
       ▼
upsertActiveMasterFromWorksheetTx(tx, db)  [sync.ts]
       │
       ├─ L2Structure → A1 (공정번호)
       ├─ L2Function  → A3 (공정기능), A4 (제품특성)
       ├─ L3Structure → B1 (작업요소) + m4 필드
       │   └─ ★ 4M 코드 이름은 SKIP (방어코드)
       ├─ L3Function  → B2 (요소기능), B3 (공정특성)
       ├─ FailureMode → A5 (고장형태)
       ├─ FailureCause→ B4 (고장원인)
       └─ L1Function  → C1 (구분), C2 (완제품기능), C3 (요구사항)
              │
              ▼
       중복 체크: itemCode + value(lowercase) 기준
       신규 항목만 createMany (기존 데이터 보존)
```

---

## 6. 데이터 저장 이중화 구조

```
┌───────────────────────────────────────────────────┐
│          POST /api/fmea (워크시트 저장)            │
├───────────────────┬───────────────────────────────┤
│ Atomic DB         │ Legacy JSON                    │
│ (정규화 테이블)    │ (단일 JSON 덩어리)              │
├───────────────────┼───────────────────────────────┤
│ l1_structures     │ fmea_legacy_data.data = {      │
│ l2_structures     │   l1: { name, types: [...] },  │
│ l3_structures     │   l2: [{                       │
│ l1_functions      │     no, name,                  │
│ l2_functions      │     l3: [{ m4, name, ... }],   │
│ l3_functions      │     functions: [...],           │
│ failure_effects   │     failureModes: [...],        │
│ failure_modes     │     failureCauses: [...]        │
│ failure_causes    │   }],                          │
│ failure_links     │   failureLinks: [...],          │
│ risk_analyses     │   structureConfirmed: bool,     │
│ optimizations     │   l1Confirmed: bool, ...        │
├───────────────────┼───────────────────────────────┤
│ 용도: FK 관계추적  │ 용도: Single Source of Truth    │
│       CP/PFD 연동  │       워크시트 로드/저장         │
└───────────────────┴───────────────────────────────┘

★ Legacy JSON이 최종 진실 (Atomic DB는 보조)
★ 로드 시: Legacy JSON → WorksheetState (직접 사용)
★ 저장 시: WorksheetState → Atomic DB 변환 + Legacy JSON 저장
```

---

## 7. FK 관계도 (전체)

```
L1Structure ─┬─▶ L1Function ─────▶ FailureEffect ──┐
             │       ↑ category                      │
             │       ↑ functionName                   │ feId
             │       ↑ requirement                    │
             │                                        ▼
L2Structure ─┼─▶ L2Function ─────▶ FailureMode ──▶ FailureLink
   ↑ l1Id    │       ↑ functionName   ↑ mode          ↑ fmId
             │       ↑ productChar    ↑ l2FuncId      │
             │       ↑ specialChar    ↑ l2StructId    │ fcId
             │                                        │
L3Structure ─┴─▶ L3Function ─────▶ FailureCause ──┘
   ↑ l2Id         ↑ functionName   ↑ cause
   ↑ m4           ↑ processChar    ↑ occurrence
   ↑ name         ↑ specialChar    ↑ l3FuncId
                   ↑ l2StructId    ↑ l3StructId
                                   ↑ l2StructId
```

---

## 8. 4M 분류 체계 (하드코딩 - 변경 금지)

| 코드 | 의미 | 대상 | 색상 |
|------|------|------|------|
| MN | 사람 (Man) | 작업자, 검사원, 보전원 | #e3f2fd |
| MC | 설비 (Machine) | 설비/금형/지그 (MD/JG → MC 변환) | #fff3e0 |
| IM | 부자재 (Indirect Material) | 그리스, 윤활유, 세척액 등 ※원자재 아님 | #e8f5e9 |
| EN | 환경 (Environment) | 온도, 습도, 조명 등 | #fce4ec |

**방어코드 위치**:
- `master-structure/route.ts` — B1 로드 시 4M 코드 value 필터링
- `sync.ts` — L3→B1 역동기화 시 4M 코드 이름 필터링
- `master/route.ts` POST — B1 저장 시 4M 코드 value 차단
- `excel-parser.ts` — MD/JG → MC 자동 변환

---

## 9. API 엔드포인트 요약

| API | Method | 용도 | 주요 파라미터 |
|-----|--------|------|---------------|
| `/api/fmea` | GET | 워크시트 데이터 로드 | `fmeaId` |
| `/api/fmea` | POST | 워크시트 저장 (Atomic + Legacy) | body: WorksheetState |
| `/api/fmea/master-structure` | GET | 마스터→구조분석 자동로드 | `sourceFmeaId` |
| `/api/pfmea/master` | GET | 마스터 데이터 조회 | `includeItems` |
| `/api/pfmea/master` | POST | 마스터 데이터 저장 | body: flatData[] |
| `/api/pfmea/master/sync.ts` | (내부) | 워크시트→마스터 역동기화 | FMEAWorksheetDB |

---

## 10. 주요 파일 위치

| 구분 | 파일 경로 |
|------|-----------|
| Prisma 스키마 | `prisma/schema.prisma` |
| 워크시트 메인 | `src/app/pfmea/worksheet/page.tsx` |
| 구조분석 탭 | `src/app/pfmea/worksheet/tabs/StructureTab.tsx` 🔒 |
| 기능분석 탭 | `src/app/pfmea/worksheet/tabs/function/FunctionTab.tsx` |
| 고장분석 L1/L2/L3 | `src/app/pfmea/worksheet/tabs/failure/FailureL{1,2,3}Tab.tsx` |
| 고장연결 탭 | `src/app/pfmea/worksheet/tabs/failure/FailureLinkTab.tsx` |
| Atomic 스키마 타입 | `src/app/pfmea/worksheet/schema/types/` |
| Migration | `src/app/pfmea/worksheet/migration.ts` |
| Master→Worksheet 동기화 | `src/app/api/pfmea/master/sync.ts` 🔒 |
| Master 구조 API | `src/app/api/fmea/master-structure/route.ts` |
| Master CRUD API | `src/app/api/pfmea/master/route.ts` 🔒 |
| FMEA 메인 API | `src/app/api/fmea/route.ts` |
