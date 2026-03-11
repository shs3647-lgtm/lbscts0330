# FMEA ↔ CP 연동 통합 PRD v2.0

> **작성일**: 2026-02-08
> **버전**: 2.0.0
> **상태**: Draft
> **이전 버전**: PFMEA → CP 연동 PRD v1.0 (2026-02-03), FMEA-CP 동기화 정책 v1.0 (2026-01-16)
> **변경 사유**: 실제 CP 엑셀 산출물 분석 후 Cartesian Product → 분리배치 방식 수정, 부품명/검출관리 매핑 추가, API 통합

---

## 변경 이력

| 날짜 | 버전 | 내용 |
|------|------|------|
| 2026-01-16 | 1.0 | 동기화 정책 초기 수립 (양방향 정책, 충돌 처리) |
| 2026-02-03 | 1.0 | PFMEA → CP 연동 PRD 작성 (원자성 데이터, 단계별 연동) |
| 2026-02-08 | **2.0** | **통합 PRD** — 실제 CP 엑셀 분석 기반 전면 수정 |

### v2.0 주요 변경 사항

| # | 변경 항목 | v1.0 | v2.0 | 영향 |
|---|----------|------|------|------|
| 1 | **행 생성 방식** | Cartesian (제품특성 × 공정특성) | **분리배치 (제품특성 + 공정특성)** | 행 생성 로직 전면 변경 |
| 2 | **행 유형 구분** | 없음 | **rowType: 'product' \| 'process'** | 스키마/병합/대응계획 전체 영향 |
| 3 | **부품명(E열)** | 매핑 누락 | **partName 필드 추가, 부품 단위 병합** | 스키마 + 병합 로직 |
| 4 | **검출관리→평가방법** | CP 전용 | **FMEA 검출관리 ↔ CP 평가방법 양방향** | 동기화 필드 확장 |
| 5 | **대응계획 기본값** | 없음 | **행유형별 자동값 (재작업/조건조정)** | 신규 룰 |
| 6 | **API 경로** | 두 문서 별도 | **통합 API 구조** | 일관성 확보 |

---

## 1. 개요

### 1.1 목적

PFMEA 워크시트와 관리계획서(CP) 간 **양방향 동기화**를 구현합니다.

- **FMEA → CP**: FMEA 구조/특성을 CP에 자동 채워넣기 (주 방향)
- **CP → FMEA**: CP 구조를 FMEA에 역생성 (고장정보 빈값)
- **데이터 동기화**: 양쪽 변경 사항 상호 업데이트 + 충돌 해결

### 1.2 마스터-파생 관계

```
┌─────────────────────────────────────────────────────────────┐
│                    PFMEA (마스터)                            │
│  구조분석(L1/L2/L3) → 기능분석 → 고장분석 → 리스크 → 최적화  │
└──────────────────────┬──────────────────────────────────────┘
                       │ 파생 (주 방향)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    CP (파생 문서)                            │
│  공정현황 (FMEA 연동) │ 관리항목 (FMEA 연동)                 │
│  검출 (FMEA 연동)     │ 관리방법 (CP 전용) │ 대응계획 (CP전용)│
└─────────────────────────────────────────────────────────────┘
```

### 1.3 연동 CP 식별

```typescript
// FMEA 등록 정보에서 연동 CP 조회
FmeaRegistration.linkedCpNo → ControlPlan.cpNo
```

| FMEA 필드 | CP 필드 | 설명 |
|----------|---------|------|
| `FmeaRegistration.linkedCpNo` | `ControlPlan.cpNo` | 연동 대상 CP 번호 |
| `FmeaProject.fmeaId` | `ControlPlan.fmeaId` | FMEA 프로젝트 ID |

> **★ 핵심**: FMEA 등록 시 이미 연동된 CP가 있어야만 연동 가능. 없으면 먼저 등록화면에서 CP 연동 설정 필요.

### 1.4 활성화 조건

- **linkedCpNo가 설정됨** — FMEA 등록 시 CP 연동 설정 완료
- **3L 원인분석(고장원인) 확정** 후 CP 연동 버튼 활성화
- `failureL3Confirmed === true` 조건 충족 시

### 1.5 핵심 원칙

1. **기존 CP에 연동**: 새로 CP 생성 ❌, `linkedCpNo` 대상 CP에 데이터 채움 ✅
2. **분리배치**: 제품특성행과 공정특성행은 **별도 행**으로 분리 (Cartesian 아님)
3. **행유형 구분**: 모든 행은 `product`(제품특성) 또는 `process`(공정특성) 유형
4. **상위 병합 확장**: 하위 행 추가 시 상위 공정정보는 자동 병합
5. **원자성 데이터 기반**: FMEA에 저장된 원자성 ID 정보 활용
6. **사용자 승인**: 각 단계마다 확인 후 진행

---

## 2. CP 워크시트 구조 (실제 엑셀 기준)

### 2.1 레이아웃 (3단 헤더, 20열)

```
Row 1: 문서 정보 — CP No | 품명 | 고객
Row 2: 대분류 헤더 — 공정현황 | 검출 | 관리항목 | 관리방법 | 대응계획
Row 3: 상세 컬럼 헤더 (A~T, 20개 컬럼)
Row 4~: 데이터 영역 (병합 구조)
```

### 2.2 컬럼 구성 (5개 색상 그룹)

| 색상 | 그룹 | 컬럼 | 항목 | 데이터 소스 |
|------|------|------|------|------------|
| 🔵 `#1565C0` | 공정현황 | A | 공정번호 | FMEA L2.no |
| 🔵 | | B | 공정명 | FMEA L2.name |
| 🔵 | | C | 레벨 | FMEA L2.level (Main/Sub) |
| 🔵 | | D | 공정설명 | FMEA L2.functions[].name |
| 🔵 | | E | **부품명** | **PFD 연동 / 사용자 입력** (§2.6 참조) |
| 🔵 | | F | 설비/금형/JIG | FMEA L3.name (4M) |
| 🟢 `#2E7D32` | 검출 | G | EP | CP 전용 |
| 🟢 | | H | 자동 | CP 전용 |
| 🟢 | 관리항목 | I | NO | CP 전용 (자동채번) |
| 🟢 | | J | **제품특성** | FMEA productChars[].name |
| 🟢 | | K | **공정특성** | FMEA processChars[].name |
| 🟢 | | L | 특별특성 | FMEA specialChar (IC/CC/SC) |
| 🟢 | | M | 스펙/공차 | CP 전용 / 사용자 입력 |
| 🟠 `#F57C00` | 관리방법 | N | **평가방법** | **FMEA 검출관리 연동** |
| 🟠 | | O | 샘플크기 | CP 전용 |
| 🟠 | | P | 주기 | CP 전용 |
| 🟠 | | Q | 관리방법 | CP 전용 |
| 🟠 | | R | 책임1 | CP 전용 |
| 🟠 | | S | 책임2 | CP 전용 |
| 🟣 `#7B1FA2` | 대응계획 | T | **대응계획** | **행유형별 기본값** |

### 2.3 행 유형 — 2가지 (v2.0 핵심 변경)

> **★ v1.0에서는 Cartesian Product(제품특성 × 공정특성 모든 조합)으로 정의했으나,
> 실제 CP 엑셀에서는 제품특성행과 공정특성행이 분리 배치됩니다.**

#### 제품특성행 (rowType = 'product')

```
E(부품명) + J(제품특성) + L(특별특성) 채움
K(공정특성) = 빈칸
F(설비) = 빈칸
대응계획 기본값 = "재작업 또는 폐기"
```

#### 공정특성행 (rowType = 'process')

```
F(설비) + K(공정특성) 채움
E(부품명) = 빈칸
J(제품특성) = 빈칸
대응계획 기본값 = "조건조정"
```

#### 핵심 규칙: 같은 행에 제품특성 + 공정특성 동시 배치 금지

> **★ 절대 규칙**: J열(제품특성)과 K열(공정특성)은 동일 행에 동시에 값을 가질 수 없습니다.
> - 제품특성행: J열 채움, K열 비움
> - 공정특성행: K열 채움, J열 비움

#### 행 배치 순서 (공정 블록 내)

```
┌─────────────────────────────────────────────────────┐
│ 공정 블록 (A~D 병합)                                 │
│                                                     │
│ ① [제품특성 영역] — 부품 단위 그룹, E열 병합           │
│    부품A: 제품특성1, 제품특성2  (J열 채움, K열 비움)    │
│    부품B: 제품특성3, 제품특성4  (J열 채움, K열 비움)    │
│                                                     │
│ ② [공정특성 영역] — 설비 단위 그룹, F열 병합           │
│    설비X: 공정특성1, 공정특성2  (K열 채움, J열 비움)    │
│    설비Y: 공정특성3             (K열 채움, J열 비움)    │
└─────────────────────────────────────────────────────┘
```

> **★ 표시 순서**: 같은 공정 내에서 제품특성행을 먼저 배치하고, 공정특성행을 나중에 배치합니다.

### 2.4 행 수 계산 공식 (v2.0 수정)

```typescript
// ❌ v1.0 (Cartesian Product) — 폐기
// totalRows = productChars.length × processChars.length

// ✅ v2.0 (분리배치)
function calculateProcessBlockRows(process: ProcessBlock): number {
  const productCharRows = process.parts
    .reduce((sum, part) => sum + part.productChars.length, 0);
  
  const processCharRows = process.equipments
    .reduce((sum, equip) => sum + equip.processChars.length, 0);
  
  return productCharRows + processCharRows;
}

// 예시: 공정10 (컷팅)
// 부품[스틸파이프]: 외경, 두께, 길이 = 3행
// 설비[CuttingMC]: RPM = 1행
// 설비[톱날]: 교환주기, 톱날흔들림 = 2행
// 총 = 3 + 1 + 2 = 6행
```

### 2.5 병합 규칙

| 컬럼 | 병합 단위 | 병합 조건 | rowType |
|------|----------|----------|---------|
| A~D (공정번호~설명) | **공정 전체** | 같은 공정의 모든 행 (제품특성+공정특성) | 공통 |
| E (부품명) | **부품 그룹** | 같은 부품의 제품특성 행들 | product만 |
| F (설비) | **설비 그룹** | 같은 설비의 공정특성 행들 | process만 |
| G~T | **병합 없음** | 행마다 개별 | 공통 |

#### 병합 시각화 (공정10 예시)

```
     A      B      C     D              E            F          J          K          L
  ┌──────┬──────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┬────┐
4 │      │      │      │           │          │          │파이프외경 │          │ IC │ ← product
  │      │      │      │           │스틸파이프 │          ├──────────┤          ├────┤
5 │  10  │ 컷팅 │ Main │ Steel Pipe│          │          │파이프두께 │          │ CC │ ← product
  │      │      │      │ 를 도면...│          │          ├──────────┤          ├────┤
6 │      │      │      │           │          │          │파이프길이 │          │    │ ← product
  │      │      │      │           ├──────────┼──────────┼──────────┼──────────┼────┤
7 │      │      │      │           │          │CuttingMC │          │  RPM     │    │ ← process
  │      │      │      │           │          ├──────────┤          ├──────────┤    │
8 │      │      │      │           │          │          │          │ 교환주기  │    │ ← process
  │      │      │      │           │          │톱날(DISC)│          ├──────────┤    │
9 │      │      │      │           │          │          │          │톱날흔들림 │    │ ← process
  └──────┴──────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┴────┘
         A4:A9 병합     D4:D9 병합   E4:E6 병합  F8:F9 병합
```

### 2.6 부품명(E열) 데이터 소스 및 연동 경로 (v2.0 보완)

> **★ PFMEA에는 부품명 필드가 없습니다.**
> 부품명은 PFD(공정흐름도)에서 가져오거나, CP에서 사용자가 직접 입력합니다.

#### 계층 구조 비교

```
[제품특성 경로]                    [공정특성 경로]
공정명(L2)                        공정명(L2)
  └─ 부품명(PFD에서 가져옴)          └─ 설비명(L3, 4M=MC)
       └─ 제품특성(productChar)          └─ 공정특성(processChar)

CP 컬럼: B → E → J                CP 컬럼: B → F → K
```

#### 두 가지 연동 경로

| 경로 | 데이터 흐름 | 부품명(E열) 소스 | 매핑 정확도 |
|------|-----------|---------------|-----------|
| **경로 A** | PFD → PFMEA → CP | **PFD에서 가져옴** (명확) | ★★★ 높음 |
| **경로 B** | PFMEA 기초정보 → PFMEA → CP | **빈값** (사용자 후입력) | ★★ 보통 |

##### 경로 A: PFD → PFMEA → CP (권장)

```
PFD (공정흐름도)
  ├─ 부품명 있음 ──→ PFMEA 연동 시 부품 정보 전달
  │                   └─ CP E열에 자동 매핑
  └─ 설비명 있음 ──→ PFMEA L3 구조와 일치
                      └─ CP F열에 자동 매핑
```

- PFD에 부품명이 이미 정의되어 있으므로 `공정명→부품명→제품특성` 매핑이 정확
- 부품 그룹핑(E열 병합)도 자동으로 처리 가능

##### 경로 B: PFMEA 기초정보 → PFMEA → CP (PFD 없는 경우)

```
PFMEA 기초정보 (부품명 없음)
  ├─ ① 공정특성 먼저 매핑 (계층 명확: 공정명→설비명→공정특성)
  │     → CP F열 + K열 채움
  └─ ② 제품특성 나중 매핑 (계층 불완전: 공정명→?→제품특성)
        → CP J열 채움, E열 = 빈값 (사용자 후입력)
```

- **공정특성을 먼저 매핑**하는 이유: `공정명→설비명→공정특성` 계층이 PFMEA에서 명확
- **제품특성은 나중에 매핑**: `공정명→부품명→제품특성`에서 부품명이 PFMEA에 없으므로
  - E열(부품명) = 빈값으로 생성
  - 제품특성행은 공정(A~D)에 직접 매핑 (부품 그룹핑 없음)
  - 사용자가 CP에서 E열을 수동 입력 후 → E열 병합 재계산

#### 매핑 순서 정책

> **★ 매핑 처리 순서 (내부 로직)**: 공정특성 → 제품특성
> **★ 배치 표시 순서 (CP 화면)**: 제품특성행 → 공정특성행

```typescript
// 매핑 처리 순서 (공정특성 우선 — 계층이 명확하므로)
// 1. 공정특성 매핑: L2→L3(설비)→processChars
// 2. 제품특성 매핑: L2→functions→productChars (부품명 = PFD 또는 빈값)

// 배치 순서 (CP 표시용 — 정렬 시)
// 같은 공정 내: 제품특성행(sortOrder 앞) → 공정특성행(sortOrder 뒤)
```

---

## 3. 데이터 매핑

### 3.1 FMEA → CP 필드 매핑 (단계별)

#### 🏗️ 1단계: 구조분석 (기초 구조)

| PFMEA 소스 | CP 필드 (컬럼) | 행유형 | 비고 |
|-----------|---------------|--------|------|
| L2.no | A. processNo | 공통 | 공정번호 |
| L2.name | B. processName | 공통 | 공정명 |
| L2.level | C. processLevel | 공통 | Main/Sub |
| L3.name (4M=MC/IM) | F. equipment | process | 설비/금형/지그 |

#### 📦 2단계: 부품명 + 제품특성 (제품특성행 생성)

| PFMEA 소스 | CP 필드 (컬럼) | 비고 |
|-----------|---------------|------|
| PFD.partName / (사용자 입력) | E. partName | **부품명 — PFD 연동 또는 사용자 입력** (§2.6) |
| L2.functions[].name | D. processDesc | 공정설명 (메인공정기능) |
| L2.functions[].productChars[].name | J. productChar | 제품특성 |
| L2.functions[].productChars[].specialChar | L. specialChar | 특별특성 (IC/CC/SC) |
| L2.detectionControls[].name | N. evalMethod | **평가방법 ← 검출관리 연동** |

> **병합 규칙**: 부품명(E) 기준 병합, 상위 공정(A~D) 병합 확장

#### ⚙️ 3단계: 설비 + 공정특성 (공정특성행 생성)

| PFMEA 소스 | CP 필드 (컬럼) | 비고 |
|-----------|---------------|------|
| L3.name (설비명) | F. equipment | 설비/금형/JIG |
| L3.processChars[].name | K. processChar | 공정특성 |
| L3.processChars[].specialChar | L. specialChar | 공정 특별특성 |
| L3.detectionControls[].name | N. evalMethod | **평가방법 ← 검출관리 연동** |

> **병합 규칙**: 설비(F) 기준 병합, 상위 공정(A~D) 병합 확장

#### ⭐ 4단계: 특별특성 + 대응계획

| PFMEA 소스 | CP 필드 (컬럼) | 비고 |
|-----------|---------------|------|
| riskData.specialChar | L. specialChar | IC/CC/SC |
| (행유형 기본값) | T. reactionPlan | 자동 설정 |

#### 대응계획 기본값 룰

```typescript
const DEFAULT_REACTION_PLAN: Record<RowType, string> = {
  product: '재작업 또는 폐기',   // 제품특성행 — 제품 결함
  process: '조건조정',          // 공정특성행 — 설비 파라미터
} as const;
```

### 3.2 동기화 대상 필드 (양방향)

| 필드 | CP 컬럼 | FMEA 소스 | 동기화 방향 | 비고 |
|------|---------|----------|-----------|------|
| 공정번호 | A | L2.no | ✅ 양방향 | |
| 공정명 | B | L2.name | ✅ 양방향 | |
| 레벨 | C | L2.level | ✅ 양방향 | |
| 공정설명 | D | L2.functions[].name | ✅ 양방향 | |
| **부품명** | **E** | **PFD.partName** | **→ PFD 연동 / CP 수동입력** | **§2.6 참조** |
| 설비 | F | L3.name | ✅ 양방향 | |
| 제품특성 | J | productChars[].name | ✅ 양방향 | |
| 공정특성 | K | processChars[].name | ✅ 양방향 | |
| 특별특성 | L | specialChar | ✅ 양방향 | IC/CC/SC |
| 스펙/공차 | M | (없음) | ❌ CP 전용 | 사용자 입력 |
| **평가방법** | **N** | **검출관리** | **✅ 양방향** | **v2.0 변경** |
| 샘플크기 | O | (없음) | ❌ CP 전용 | |
| 주기 | P | (없음) | ❌ CP 전용 | |
| 관리방법 | Q | (없음) | ❌ CP 전용 | |
| 책임1 | R | (없음) | ❌ CP 전용 | |
| 책임2 | S | (없음) | ❌ CP 전용 | |
| **대응계획** | **T** | **(행유형 기본값)** | **→ 초기값만** | **v2.0 추가** |
| 고장형태 | - | FM | ❌ FMEA 전용 | |
| 고장영향 | - | FE | ❌ FMEA 전용 | |
| 고장원인 | - | FC | ❌ FMEA 전용 | |
| S/O/D/AP | - | RiskAnalysis | → 읽기전용 참조 | |

### 3.3 검출관리 → 평가방법 매핑 상세 (v2.0 신규)

> **v1.0에서는 평가방법(N열)을 "CP 전용"으로 분류했으나,
> 실제 CP에서 FMEA 검출관리와 동일한 값이 사용됨을 확인하여 양방향 동기화로 변경합니다.**

```
FMEA L2-6.검출관리              CP N열.평가방법
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
버니어캘리퍼스            →     버니어캘리퍼스
줄자                    →     줄차
GO-NO게이지             →     GO-NO게이지
육안검사                →     육안검사
인장시험기               →     인장시험기
설비판넬                →     설비판넬
카운터                  →     카운터
```

매핑 규칙:
- **제품특성행**: 해당 제품특성의 검출관리 → 평가방법
- **공정특성행**: 해당 공정특성의 검출관리 → 평가방법
- 1:1 매핑이 원칙, 검출관리가 복수인 경우 첫 번째 값 적용

---

## 4. 원자성 데이터 스키마

### 4.1 TypeScript 인터페이스 (v2.0 수정)

```typescript
interface FmeaAtomicRow {
  // ===== 고유 식별자 =====
  rowUid: string;           // 행 고유 ID
  fmeaId: string;           // FMEA 프로젝트 ID
  
  // ===== ★ 행 유형 (v2.0 추가) =====
  rowType: 'product' | 'process';  // 제품특성행 / 공정특성행
  
  // ===== 구조분석 ID =====
  l2Id: string;             // L2 공정 ID
  l3Id?: string;            // L3 작업요소 ID (공정특성행에서 사용)
  
  // ===== 기능분석 ID (2L) =====
  funcId?: string;          // 공정기능 ID
  productCharId?: string;   // 제품특성 ID (제품특성행에서 사용)
  
  // ===== 기능분석 ID (3L) =====
  l3FuncId?: string;        // 작업요소 기능 ID
  processCharId?: string;   // 공정특성 ID (공정특성행에서 사용)
  
  // ===== 고장분석 ID =====
  fmId?: string;            // FailureMode ID
  feId?: string;            // FailureEffect ID
  fcId?: string;            // FailureCause ID
  
  // ===== 데이터 값 (공통) =====
  processNo: string;        // A열. 공정번호
  processName: string;      // B열. 공정명
  processLevel?: string;    // C열. Main/Sub
  processDesc?: string;     // D열. 공정설명
  specialChar?: string;     // L열. 특별특성 (IC/CC/SC)
  evalMethod?: string;      // N열. 평가방법 ← 검출관리 연동 (v2.0)
  reactionPlan?: string;    // T열. 대응계획 ← 행유형 기본값 (v2.0)
  
  // ===== 데이터 값 (제품특성행 전용) =====
  partName?: string;        // E열. 부품명 (v2.0 추가)
  productChar?: string;     // J열. 제품특성
  
  // ===== 데이터 값 (공정특성행 전용) =====
  equipment?: string;       // F열. 설비/금형/JIG
  processChar?: string;     // K열. 공정특성
  
  // ===== 병합 그룹 키 (v2.0 추가) =====
  processGroupKey: string;  // 공정 병합 그룹 = l2Id
  partGroupKey?: string;    // 부품 병합 그룹 = `${l2Id}-${partName}`
  equipGroupKey?: string;   // 설비 병합 그룹 = `${l2Id}-${l3Id}`
  
  // ===== 병합 정보 =====
  processRowSpan?: number;  // A~D열 공정 단위 병합 수
  partRowSpan?: number;     // E열 부품 단위 병합 수
  equipRowSpan?: number;    // F열 설비 단위 병합 수
  
  // ===== 메타 =====
  sortOrder: number;        // 정렬 순서
  syncStatus: 'pending' | 'synced' | 'error';
  cpItemId?: string;        // 연동된 CP Item ID
  createdAt?: string;
  updatedAt?: string;
}
```

### 4.2 rowUid 생성 규칙

```typescript
function generateRowUid(row: FmeaAtomicRow): string {
  if (row.rowType === 'product') {
    // 제품특성행: fmeaId-l2Id-funcId-productCharId
    return `${row.fmeaId}-${row.l2Id}-${row.funcId}-${row.productCharId}`;
  } else {
    // 공정특성행: fmeaId-l2Id-l3Id-processCharId
    return `${row.fmeaId}-${row.l2Id}-${row.l3Id}-${row.processCharId}`;
  }
}

// 예시:
// 제품특성행: "pfm26-m001-l2-001-func-001-pc-001"
// 공정특성행: "pfm26-m001-l2-001-l3-001-pchar-001"
```

### 4.3 DB 스키마 (Prisma) — v2.0 수정

```prisma
model FmeaAtomicData {
  id                String   @id @default(uuid())
  rowUid            String   @unique
  fmeaId            String
  
  // ★ 행 유형 (v2.0)
  rowType           String   // 'product' | 'process'
  
  // 구조분석 ID
  l2Id              String
  l3Id              String?
  
  // 기능분석 ID (2L)
  funcId            String?
  productCharId     String?
  
  // 기능분석 ID (3L)
  l3FuncId          String?
  processCharId     String?
  
  // 고장분석 ID
  fmId              String?
  feId              String?
  fcId              String?
  
  // 데이터 값 (공통)
  processNo         String
  processName       String
  processLevel      String?
  processDesc       String?
  specialChar       String?
  evalMethod        String?   // ★ v2.0: 평가방법 (검출관리 연동)
  reactionPlan      String?   // ★ v2.0: 대응계획 (행유형 기본값)
  
  // 데이터 값 (제품특성행)
  partName          String?   // ★ v2.0: 부품명
  productChar       String?
  
  // 데이터 값 (공정특성행)
  equipment         String?
  processChar       String?
  
  // 병합 그룹 키 (v2.0)
  processGroupKey   String
  partGroupKey      String?
  equipGroupKey     String?
  
  // 병합 정보
  processRowSpan    Int       @default(1)
  partRowSpan       Int       @default(1)
  equipRowSpan      Int       @default(1)
  
  // 메타
  sortOrder         Int       @default(0)
  syncStatus        String    @default("pending")
  cpItemId          String?
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  @@index([fmeaId])
  @@index([rowType])
  @@index([l2Id])
  @@index([l3Id])
  @@index([processGroupKey])
  @@index([cpItemId])
  @@map("fmea_atomic_data")
}
```

### 4.4 원자성 데이터 생성 시점

| 시점 | 트리거 | rowType | 생성 데이터 |
|-----|-------|---------|-----------|
| **구조분석 저장** | L2/L3 저장 | - | l2Id, l3Id, processNo, processName |
| **2L 기능분석 저장** | productChars 저장 | **product** | funcId, productCharId, productChar, partName |
| **3L 기능분석 저장** | processChars 저장 | **process** | l3Id, processCharId, processChar, equipment |
| **고장분석 저장** | failureLinks 저장 | 공통 | fmId, feId, fcId |
| **특별특성 저장** | riskData 저장 | 공통 | specialChar |
| **검출관리 저장** | detectionControls 저장 | 공통 | evalMethod (v2.0) |

---

## 5. 조합 예시 (v2.0 — 분리배치)

### 5.1 PFMEA 데이터

```json
{
  "L2": {
    "no": "10", "name": "컷팅",
    "functions": [{
      "name": "Steel Pipe를 도면에서 지정된 길이로 절단한다",
      "productChars": [
        { "name": "파이프 외경", "specialChar": "IC", "detection": "버니어캘리퍼스" },
        { "name": "파이프 두께", "specialChar": "CC", "detection": "버니어캘리퍼스" },
        { "name": "파이프 길이", "detection": "줄자" }
      ]
    }],
    "l3": [
      {
        "name": "Cutting MC", "m4": "MC",
        "processChars": [
          { "name": "RPM", "detection": "설비판넬" }
        ]
      },
      {
        "name": "톱날(DISC)", "m4": "MC",
        "processChars": [
          { "name": "교환주기", "detection": "카운터" },
          { "name": "톱날흔들림", "detection": "육안검사" }
        ]
      }
    ]
  },
  "partName": "스틸 파이프"   // ← PFD 연동 시 자동 채움, 없으면 빈값 (§2.6)
}
```

### 5.2 CP 생성 결과 (v2.0 — 분리배치)

| Row | A.공정번호 | B.공정명 | D.공정설명 | E.부품명 | F.설비 | J.제품특성 | K.공정특성 | L.특별 | N.평가방법 | T.대응계획 | rowType |
|-----|-----------|---------|-----------|---------|--------|-----------|-----------|-------|-----------|-----------|---------|
| 4 | 10 | 컷팅 | Steel Pipe를... | 스틸파이프 | | 파이프외경 | | IC | 버니어캘리퍼스 | 재작업 또는 폐기 | product |
| 5 | ↑병합 | ↑병합 | ↑병합 | ↑병합 | | 파이프두께 | | CC | 버니어캘리퍼스 | 재작업 또는 폐기 | product |
| 6 | ↑병합 | ↑병합 | ↑병합 | ↑병합 | | 파이프길이 | | | 줄자 | 재작업 또는 폐기 | product |
| 7 | ↑병합 | ↑병합 | ↑병합 | | Cutting MC | | RPM | | 설비판넬 | 조건조정 | process |
| 8 | ↑병합 | ↑병합 | ↑병합 | | 톱날(DISC) | | 교환주기 | | 카운터 | 조건조정 | process |
| 9 | ↑병합 | ↑병합 | ↑병합 | | ↑병합 | | 톱날흔들림 | | 육안검사 | 조건조정 | process |

**총 행 수**: 제품특성(3) + 공정특성(3) = **6행** (v1.0 Cartesian이면 3×3=9행이었음)

### 5.3 v1.0 vs v2.0 비교

```
v1.0 (Cartesian Product — 폐기):
  파이프외경 + RPM       = Row1
  파이프외경 + 교환주기    = Row2
  파이프외경 + 톱날흔들림  = Row3
  파이프두께 + RPM       = Row4
  ... (9행)
  → J열과 K열이 동시에 채워짐 (실제 CP와 불일치)

v2.0 (분리배치 — 채택):
  파이프외경             = Row4  (J열만 채움)
  파이프두께             = Row5  (J열만 채움)
  파이프길이             = Row6  (J열만 채움)
  RPM                  = Row7  (K열만 채움)
  교환주기              = Row8  (K열만 채움)
  톱날흔들림             = Row9  (K열만 채움)
  → J열과 K열이 분리 (실제 CP와 일치 ✅)
```

---

## 6. 사용자 플로우

### 6.1 버튼 구성

#### FMEA 워크시트 메뉴

```
┌────────────────────────────────────────────────────────────┐
│  [CP 구조연동]  [CP 데이터동기화]  [CP 이동]                 │
└────────────────────────────────────────────────────────────┘
```

| 버튼 | 기능 | 활성화 조건 |
|------|------|-----------|
| CP 구조연동 | FMEA 전체 구조 → CP 생성 | linkedCpNo 설정 + failureL3Confirmed |
| CP 데이터동기화 | 변경 데이터만 업데이트 | linkedCpNo 설정 |
| CP 이동 | CP 워크시트로 이동 | - |

#### CP 워크시트 메뉴

```
┌────────────────────────────────────────────────────────────┐
│  [FMEA 구조연동]  [FMEA 동기화]  [FMEA 이동]                │
└────────────────────────────────────────────────────────────┘
```

| 버튼 | 기능 | 활성화 조건 |
|------|------|-----------|
| FMEA 구조연동 | CP 구조 → FMEA 생성 (고장정보 빈값) | linkedFmeaId 설정 |
| FMEA 동기화 | 변경 데이터 양방향 업데이트 | linkedFmeaId 설정 |
| FMEA 이동 | FMEA 워크시트로 이동 | - |

### 6.2 FMEA → CP 구조연동 (순차 단계) — v2.0 수정

```
[CP 구조연동] 버튼 클릭
         ↓
┌─────────────────────────────────────────┐
│  📦 1단계: 원자성 데이터 생성            │
│  "PFMEA 데이터를 CP 형식으로 변환합니다" │
│  - 공정: 3건                            │
│  - 제품특성행: 8건 (product)             │
│  - 공정특성행: 6건 (process)             │
│  - 총 행수: 14건                        │
│  [확인] [취소]                          │
└─────────────────────────────────────────┘
         ↓ 확인
┌─────────────────────────────────────────┐
│  🏭 2단계: 구조 연동                    │
│  "공정번호, 공정명, 레벨 3건 연동"       │
│  [확인] [취소]                          │
└─────────────────────────────────────────┘
         ↓ 확인
┌─────────────────────────────────────────┐
│  📋 3단계: 부품명 + 제품특성 연동        │  ← v2.0: 부품명 추가
│  "제품특성 8건 추가 (부품 병합 3그룹)"   │
│  [확인] [취소]                          │
└─────────────────────────────────────────┘
         ↓ 확인
┌─────────────────────────────────────────┐
│  ⚙️ 4단계: 설비 + 공정특성 연동          │
│  "공정특성 6건 추가 (설비 병합 4그룹)"   │
│  [확인] [취소]                          │
└─────────────────────────────────────────┘
         ↓ 확인
┌─────────────────────────────────────────┐
│  ⭐ 5단계: 특별특성 + 검출관리 연동      │  ← v2.0: 검출관리 추가
│  "특별특성: IC 2건, CC 3건"              │
│  "평가방법: 6건 자동 매핑"               │
│  "대응계획: 기본값 14건 적용"            │
│  [확인] [CP 워크시트로 이동]            │
└─────────────────────────────────────────┘
```

### 6.3 CP → FMEA 역방향 구조연동

```
[FMEA 구조연동] 버튼 클릭
         ↓
┌─────────────────────────────────────────┐
│  📋 CP → FMEA 구조 생성                 │
│  "CP 구조를 기반으로 FMEA를 생성합니다"  │
│  - 공정: 3건 → L2 생성                  │
│  - 제품특성: 8건 → productChar 생성      │
│  - 공정특성: 6건 → processChar 생성      │
│  - 고장분석: 빈 값으로 생성               │
│  [확인] [취소]                          │
└─────────────────────────────────────────┘
```

| CP 원본 | FMEA 생성 대상 | 비고 |
|---------|-------------|------|
| A. processNo | L2.no | 공정번호 |
| B. processName | L2.name | 공정명 |
| D. processDesc | L2.functions[].name | 공정설명 → 기능 |
| E. partName | (저장 안함) | 부품명은 CP 전용 |
| F. equipment | L3.name + L3.m4 | 설비/금형 |
| J. productChar | L2.functions[].productChars[] | 제품특성 |
| K. processChar | L3.processChars[] | 공정특성 |
| L. specialChar | specialChar | 특별특성 |
| - | **FM (고장형태)** | **빈 값으로 생성** |
| - | **FE (고장영향)** | **빈 값으로 생성** |
| - | **FC (고장원인)** | **빈 값으로 생성** |
| - | **S/O/D/AP** | **빈 값으로 생성** |

### 6.4 에러 처리

- 각 단계 실패 시: 에러 메시지 표시 + 재시도 옵션
- 부분 성공: 성공 건수와 실패 건수 표시
- 전체 취소: 이전 상태로 롤백

---

## 7. 충돌 처리 정책 (양방향 동기화)

### 7.1 충돌 감지

```typescript
interface SyncConflict {
  field: string;           // 충돌 필드명
  cpColumn: string;        // CP 컬럼 (A~T)
  fmeaValue: string;       // FMEA 값
  cpValue: string;         // CP 값
  fmeaUpdatedAt: Date;     // FMEA 수정 시간
  cpUpdatedAt: Date;       // CP 수정 시간
  rowUid: string;          // 원자성 행 ID
}
```

### 7.2 충돌 해결 UI

```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️ 데이터 충돌 감지                                         │
├─────────────────────────────────────────────────────────────┤
│  필드: 공정설명 (D열)                                        │
│  행: 공정10 - 컷팅                                          │
│                                                             │
│  FMEA 값: "원재료 수입검사 실시"        (2026-02-08 10:30)  │
│  CP 값:   "원재료 품질검사 수행"        (2026-02-08 11:45)  │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ FMEA 값 적용 │  │ CP 값 적용   │  │ 건너뛰기     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  ☐ 이 세션에서 동일 선택 적용                                │
└─────────────────────────────────────────────────────────────┘
```

### 7.3 충돌 해결 옵션

| 옵션 | 동작 |
|------|------|
| FMEA 값 적용 | FMEA 값으로 CP 업데이트 (마스터 우선) |
| CP 값 적용 | CP 값으로 FMEA 업데이트 |
| 건너뛰기 | 해당 필드 동기화 스킵 |
| 모든 항목에 적용 | 동일 충돌 유형에 일괄 적용 |

---

## 8. API 설계 (통합)

### 8.1 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| | **원자성 데이터** | |
| GET | `/api/fmea/{fmeaId}/atomic-data` | 원자성 데이터 조회 |
| POST | `/api/fmea/{fmeaId}/atomic-data/generate` | 원자성 데이터 (재)생성 |
| | **구조 동기화** | |
| POST | `/api/sync/structure` | 구조 연동 (양방향) |
| | **데이터 동기화** | |
| POST | `/api/sync/data` | 데이터 동기화 (양방향) |

### 8.2 구조 동기화 API

```typescript
// Request
POST /api/sync/structure
{
  direction: 'fmea-to-cp' | 'cp-to-fmea',
  sourceId: string,        // fmeaId 또는 cpNo
  targetId: string,        // cpNo 또는 fmeaId
  options: {
    overwrite: boolean,    // 기존 데이터 덮어쓰기
    createEmpty: boolean,  // CP→FMEA: 빈 고장정보 생성
  }
}

// Response
{
  success: boolean,
  summary: {
    processCount: number,
    productCharRows: number,  // 제품특성행 수
    processCharRows: number,  // 공정특성행 수
    totalRows: number,
    specialCharCount: { IC: number, CC: number, SC: number },
    evalMethodCount: number,  // 평가방법 매핑 수 (v2.0)
  },
  errors?: string[]
}
```

### 8.3 데이터 동기화 API

```typescript
// Request
POST /api/sync/data
{
  fmeaId: string,
  cpNo: string,
  fields?: string[],           // 특정 필드만 동기화 (생략 시 전체)
  conflictPolicy?: 'ask' | 'fmea-wins' | 'cp-wins' | 'skip'
}

// Response
{
  success: boolean,
  synced: number,
  conflicts: SyncConflict[],   // conflictPolicy='ask'일 때 반환
  skipped: number
}
```

### 8.4 충돌 해결 API

```typescript
// Request
POST /api/sync/resolve-conflicts
{
  fmeaId: string,
  cpNo: string,
  resolutions: Array<{
    rowUid: string,
    field: string,
    resolution: 'fmea-wins' | 'cp-wins' | 'skip'
  }>
}
```

---

## 9. 동기화 로그

### 9.1 DB 스키마

```prisma
model SyncLog {
  id            String   @id @default(uuid())
  sourceType    String   // 'fmea' | 'cp'
  sourceId      String
  targetType    String   // 'cp' | 'fmea'
  targetId      String
  syncType      String   // 'structure' | 'data'
  direction     String   // 'fmea-to-cp' | 'cp-to-fmea'
  status        String   // 'success' | 'partial' | 'conflict' | 'error'
  
  summary       Json     // { processCount, productCharRows, processCharRows, ... }
  conflicts     Json?    // 충돌 상세
  resolvedBy    String?  // 사용자
  
  createdAt     DateTime @default(now())
  
  @@index([sourceId])
  @@index([targetId])
  @@map("sync_logs")
}
```

### 9.2 변경 추적

| 필드 | 설명 |
|------|------|
| lastSyncAt | 마지막 동기화 시간 |
| syncHash | 동기화 시점 데이터 해시 |
| changeCount | 동기화 후 변경 횟수 |

---

## 10. 구현 파일 구조

```
src/
├── app/
│   ├── pfmea/worksheet/
│   │   ├── hooks/
│   │   │   └── useCpSync.ts              # PFMEA → CP 순차 연동 훅
│   │   └── components/
│   │       └── CpSyncWizard.tsx           # 단계별 확인 모달 UI
│   │
│   ├── control-plan/worksheet/
│   │   ├── hooks/
│   │   │   └── useFmeaSync.ts            # CP → FMEA 역방향 연동 훅
│   │   └── components/
│   │       └── FmeaSyncWizard.tsx         # 역방향 확인 모달 UI
│   │
│   └── api/
│       ├── fmea/[fmeaId]/
│       │   └── atomic-data/
│       │       ├── route.ts               # GET: 원자성 데이터 조회
│       │       └── generate/route.ts      # POST: 원자성 데이터 생성
│       └── sync/
│           ├── structure/route.ts         # POST: 구조 동기화 (양방향)
│           ├── data/route.ts              # POST: 데이터 동기화 (양방향)
│           └── resolve-conflicts/route.ts # POST: 충돌 해결
│
├── hooks/sync/
│   ├── useSyncConflict.ts                # 충돌 감지/해결 훅
│   └── useSyncLog.ts                     # 동기화 로그 훅
│
└── lib/
    └── sync/
        ├── atomicDataGenerator.ts         # 원자성 데이터 생성기
        ├── mergeCalculator.ts             # 병합 계산기 (분리배치)
        ├── conflictDetector.ts            # 충돌 감지기
        └── types.ts                       # 공통 타입 정의
```

---

## 11. 구현 우선순위

### Phase 1: 기초 인프라 + FMEA → CP (주 방향)

| 순위 | 작업 | 난이도 | 설명 |
|------|------|--------|------|
| 1-1 | `types.ts` — FmeaAtomicRow 타입 정의 | 하 | v2.0 스키마 기반 |
| 1-2 | `atomicDataGenerator.ts` — 분리배치 생성기 | **상** | 핵심 로직 |
| 1-3 | `mergeCalculator.ts` — 병합 계산기 | 중 | processRowSpan, partRowSpan, equipRowSpan |
| 1-4 | Prisma 마이그레이션 — FmeaAtomicData 테이블 | 하 | |
| 1-5 | `/api/fmea/[fmeaId]/atomic-data` API | 중 | |
| 1-6 | `/api/sync/structure` API (fmea-to-cp) | **상** | |
| 1-7 | `useCpSync.ts` 훅 | 중 | |
| 1-8 | `CpSyncWizard.tsx` 모달 UI | 중 | 5단계 위저드 |

### Phase 2: CP → FMEA (역방향)

| 순위 | 작업 | 난이도 | 설명 |
|------|------|--------|------|
| 2-1 | `/api/sync/structure` (cp-to-fmea) | **상** | 빈 고장정보 생성 |
| 2-2 | `useFmeaSync.ts` 훅 | 중 | |
| 2-3 | `FmeaSyncWizard.tsx` 모달 UI | 중 | |

### Phase 3: 양방향 데이터 동기화

| 순위 | 작업 | 난이도 | 설명 |
|------|------|--------|------|
| 3-1 | `conflictDetector.ts` | **상** | 해시 비교, 필드별 충돌 감지 |
| 3-2 | `/api/sync/data` API | **상** | |
| 3-3 | `useSyncConflict.ts` — 충돌 해결 UI 훅 | 중 | |
| 3-4 | `/api/sync/resolve-conflicts` API | 중 | |

### Phase 4: 로그 + 안정화

| 순위 | 작업 | 난이도 | 설명 |
|------|------|--------|------|
| 4-1 | SyncLog 테이블 + API | 하 | |
| 4-2 | 동기화 이력 조회 UI | 하 | |
| 4-3 | 통합 테스트 | 중 | |

---

## 12. 핵심 알고리즘: 분리배치 행 생성기

### 12.1 매핑 순서 원칙

> **★ 내부 매핑 순서**: 공정특성 → 제품특성 (공정특성의 계층이 명확하므로 우선 처리)
> **★ 표시 정렬 순서**: 제품특성행(앞) → 공정특성행(뒤) (sortOrder로 재정렬)

### 12.2 두 가지 연동 경로에 따른 분기

```typescript
/**
 * FMEA 데이터를 CP 분리배치 형식의 원자성 행으로 변환
 *
 * ★ v2.0 핵심: Cartesian Product가 아닌 분리배치
 *   - 제품특성행: E(부품명) + J(제품특성) 채움, K(공정특성) 비움
 *   - 공정특성행: F(설비) + K(공정특성) 채움, J(제품특성) 비움
 *
 * ★ 매핑 순서: 공정특성 먼저 (계층 명확), 제품특성 나중
 * ★ 표시 순서: 제품특성행 먼저 (sortOrder 앞), 공정특성행 나중
 *
 * @param pfdData - PFD 데이터 (있으면 부품명 자동 매핑, 없으면 빈값)
 */
function generateAtomicRows(
  fmeaData: FmeaProcessData,
  fmeaId: string,
  pfdData?: PfdProcessData     // PFD 연동 시 전달 (경로 A)
): FmeaAtomicRow[] {
  const productRows: FmeaAtomicRow[] = [];
  const processRows: FmeaAtomicRow[] = [];

  for (const l2 of fmeaData.l2List) {
    const processGroupKey = l2.id;

    // ========================================
    // ① 공정특성행 먼저 매핑 (계층 명확: 공정명→설비명→공정특성)
    // ========================================
    for (const l3 of l2.l3List) {
      // ★ MN(사람) 제외, MD/JG → MC 변환
      const m4 = normalizeM4(l3.m4);
      if (m4 === 'MN') continue;

      const equipGroupKey = `${l2.id}-${l3.id}`;

      for (const pchar of l3.processChars) {
        processRows.push({
          rowUid: `${fmeaId}-${l2.id}-${l3.id}-${pchar.id}`,
          fmeaId,
          rowType: 'process',

          // 구조
          l2Id: l2.id,
          l3Id: l3.id,
          processCharId: pchar.id,

          // 공통 데이터
          processNo: l2.no,
          processName: l2.name,
          processLevel: l2.level,
          processDesc: l2.functions[0]?.name,

          // 제품특성행 전용 = 빈값
          partName: undefined,
          productChar: undefined,

          // 공정특성행 전용
          equipment: l3.name,
          processChar: pchar.name,
          specialChar: pchar.specialChar,
          evalMethod: pchar.detection,      // 검출관리 → 평가방법
          reactionPlan: '조건조정',          // 기본값

          // 병합 그룹 키
          processGroupKey,
          equipGroupKey,

          sortOrder: 0,  // 나중에 재계산
          syncStatus: 'pending',
        });
      }
    }

    // ========================================
    // ② 제품특성행 나중 매핑 (부품명 = PFD 또는 빈값)
    // ========================================
    for (const func of l2.functions) {
      // ★ 부품명 결정: PFD 연동(경로 A) vs 직접 매핑(경로 B)
      const partName = pfdData
        ? resolvePartNameFromPfd(pfdData, l2.no)   // 경로 A: PFD에서 부품명 가져옴
        : '';                                       // 경로 B: 빈값 (사용자 후입력)

      // ★ 부품 그룹 키: 부품명이 있으면 부품별 그룹, 없으면 공정별 단일 그룹
      const partGroupKey = partName
        ? `${l2.id}-${partName}`
        : `${l2.id}-unassigned`;

      for (const pc of func.productChars) {
        productRows.push({
          rowUid: `${fmeaId}-${l2.id}-${func.id}-${pc.id}`,
          fmeaId,
          rowType: 'product',

          // 구조
          l2Id: l2.id,
          funcId: func.id,
          productCharId: pc.id,

          // 공통 데이터
          processNo: l2.no,
          processName: l2.name,
          processLevel: l2.level,
          processDesc: func.name,

          // 제품특성행 전용
          partName: partName || undefined,    // 빈값이면 undefined
          productChar: pc.name,
          specialChar: pc.specialChar,
          evalMethod: pc.detection,            // 검출관리 → 평가방법
          reactionPlan: '재작업 또는 폐기',     // 기본값

          // 공정특성행 전용 = 빈값
          equipment: undefined,
          processChar: undefined,

          // 병합 그룹 키
          processGroupKey,
          partGroupKey,

          sortOrder: 0,  // 나중에 재계산
          syncStatus: 'pending',
        });
      }
    }
  }

  // ========================================
  // ③ 정렬: 제품특성행 먼저 → 공정특성행 나중 (표시 순서)
  // ========================================
  const rows: FmeaAtomicRow[] = [];
  let sortOrder = 0;

  // 공정별로 그룹핑 후 제품→공정 순서로 배치
  const allRows = [...productRows, ...processRows];
  const processGroupMap = new Map<string, { product: FmeaAtomicRow[]; process: FmeaAtomicRow[] }>();

  for (const row of allRows) {
    const group = processGroupMap.get(row.processGroupKey)
      || { product: [], process: [] };
    group[row.rowType].push(row);
    processGroupMap.set(row.processGroupKey, group);
  }

  // 공정 순서대로, 각 공정 내에서 제품특성→공정특성 순서
  for (const [, group] of processGroupMap) {
    for (const row of [...group.product, ...group.process]) {
      row.sortOrder = sortOrder++;
      rows.push(row);
    }
  }

  // ========================================
  // ④ 병합 수 계산
  // ========================================
  calculateMergeSpans(rows);

  return rows;
}

/**
 * 병합 수 계산 (processRowSpan, partRowSpan, equipRowSpan)
 * ★ 반드시 sortOrder 정렬 후 호출해야 함 (group[0]이 실제 첫 행이어야 함)
 */
function calculateMergeSpans(rows: FmeaAtomicRow[]): void {
  // ★ 안전장치: sortOrder 기준 정렬 보장
  rows.sort((a, b) => a.sortOrder - b.sortOrder);

  // 공정 그룹별 병합 수
  const processGroups = groupBy(rows, 'processGroupKey');
  for (const [, group] of processGroups) {
    group[0].processRowSpan = group.length;
  }

  // 부품 그룹별 병합 수 (제품특성행만)
  const partGroups = groupBy(
    rows.filter(r => r.rowType === 'product'),
    'partGroupKey'
  );
  for (const [key, group] of partGroups) {
    if (key) group[0].partRowSpan = group.length;
  }

  // 설비 그룹별 병합 수 (공정특성행만)
  const equipGroups = groupBy(
    rows.filter(r => r.rowType === 'process'),
    'equipGroupKey'
  );
  for (const [key, group] of equipGroups) {
    if (key) group[0].equipRowSpan = group.length;
  }
}

/**
 * PFD에서 해당 공정의 부품명 조회
 */
function resolvePartNameFromPfd(
  pfdData: PfdProcessData,
  processNo: string
): string {
  const pfdProcess = pfdData.processes.find(p => p.processNo === processNo);
  return pfdProcess?.partName || '';
}

/**
 * 4M 정규화: MD/JG → MC
 */
function normalizeM4(m4?: string): string {
  const val = (m4 || '').trim().toUpperCase();
  if (val === 'MD' || val === 'JG') return 'MC';
  return val;
}
```

---

## 13. 용어 정의

| 용어 | 설명 |
|------|------|
| **분리배치** | 제품특성행과 공정특성행을 별도 행으로 분리하여 배치하는 방식 (v2.0) |
| **Cartesian Product** | 제품특성 × 공정특성의 모든 조합 (v1.0에서 사용, v2.0에서 폐기) |
| **원자성 데이터** | PFMEA의 계층 구조를 CP의 평탄화된 행으로 변환한 데이터 |
| **상위 병합** | 하위 행 추가 시 공정번호/공정명 셀이 확장되어 병합되는 것 |
| **행유형** | product (제품특성행) / process (공정특성행) 구분 |
| **부품 병합** | E열에서 같은 부품의 제품특성 행들이 병합되는 것 |
| **설비 병합** | F열에서 같은 설비의 공정특성 행들이 병합되는 것 |
| **구조 동기화** | FMEA/CP 간 전체 구조를 생성하는 동기화 |
| **데이터 동기화** | 기존 구조에서 변경된 값만 업데이트하는 동기화 |
| **linkedCpNo** | FMEA 등록 시 설정된 연동 CP 번호 |

---

## 14. 향후 확장

- **리스크 연동**: S/O/D/AP 값을 CP에 참조 표시
- **변경 알림**: 한쪽 수정 시 상대편 알림 배지
- **동기화 대시보드**: FMEA-CP 연동 상태 일괄 조회
- **Excel 내보내기**: CP 병합 구조 그대로 Excel 생성

---

> **작성자**: AI Assistant
> **승인자**: 사용자 확인 필요
