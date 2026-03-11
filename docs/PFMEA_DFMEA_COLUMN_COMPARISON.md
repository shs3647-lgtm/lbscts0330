# PFMEA vs DFMEA 컬럼 비교표

> **작성일**: 2026-02-04  
> **목적**: PFMEA와 DFMEA의 데이터 구조 차이를 명확히 정리하여 혼동 방지

---

## 1. 핵심 차이점 요약

| 구분 | PFMEA (공정 FMEA) | DFMEA (설계 FMEA) |
|------|-------------------|-------------------|
| **분석 대상** | 제조 공정 | 제품 설계 |
| **L1 (최상위)** | 완제품 공정명 | 제품명 (다음상위수준) |
| **L2 (중간)** | 메인공정 (Process) | Assy (초점요소) |
| **L3 (최하위)** | 작업요소 (WorkElement) | 부품 또는 특성 |
| **L2 구분자** | `no` (공정번호) | `no` (초점요소번호) |
| **L3 구분자** | `m4` (4M: MC/IM/MN/EN) | `type` (부품/Assy/System/I/F) |
| **특성 경로** | L3.functions[].processChars | L3.functions[].processChars |
| **ID 접두사** | M (예: M001) | D (예: D001) |

---

## 2. L1 구조 비교

### PFMEA L1 (완제품 공정)
```typescript
interface L1Data {
  id: string;
  name: string;                    // 완제품 공정명
  types: L1Type[];                 // Your Plant / Ship to Plant / User
  failureScopes?: L1FailureScope[]; // 고장영향
}

interface L1Type {
  id: string;
  name: string;                    // YP / SP / U
  functions: L1Function[];
}
```

### DFMEA L1 (다음상위수준/제품)
```typescript
interface L1Structure {
  id: string;
  name: string;                    // 제품명
  types: L1Type[];                 // 법규 / 기본 / 보조 / 관능
  failureEffects?: L1FailureEffect[];
  confirmed: boolean;
}

interface L1Type {
  id: string;
  name: string;                    // 법규 / 기본 / 보조 / 관능
  functions: L1Function[];
}
```

| 필드 | PFMEA | DFMEA | 비고 |
|------|-------|-------|------|
| `name` | 완제품 공정명 | 제품명 | 라벨만 다름 |
| `types[].name` | YP/SP/U | 법규/기본/보조/관능 | 구분 값 다름 |
| `failureScopes` | ✅ 사용 | ❌ 비사용 | PFMEA만 |
| `failureEffects` | ❌ 비사용 | ✅ 사용 | DFMEA만 |
| `confirmed` | ❌ 없음 | ✅ 있음 | DFMEA만 |

---

## 3. L2 구조 비교

### PFMEA L2 (메인공정)
```typescript
interface Process {
  id: string;
  no: string;                      // ★ 공정번호 (10, 20, 30...)
  name: string;                    // 공정명
  order: number;
  l3: WorkElement[];               // 작업요소 배열
  functions: L2Function[];         // 공정기능
  productChars?: L2ProductChar[];  // (deprecated)
  failureModes?: L2FailureMode[];
}
```

### DFMEA L2 (Assy/초점요소)
```typescript
interface L2Structure {
  id: string;
  no: string;                      // ★ 초점요소번호 (10, 20, 30...)
  type: DFMEAType;                 // S/I/F/C
  name: string;                    // Assy명
  order: number;
  l3: L3Structure[];               // 부품/특성 배열
  functions: L2Function[];         // 초점요소 기능
  failureModes?: L2FailureMode[];
  confirmed: boolean;
}

type DFMEAType = 'S' | 'I' | 'F' | 'C' | '';  // System/Interface/Function/Component
```

| 필드 | PFMEA | DFMEA | 비고 |
|------|-------|-------|------|
| `no` | ✅ 공정번호 | ✅ 초점요소번호 | 둘 다 사용 |
| `type` | ❌ 없음 | ✅ S/I/F/C | DFMEA만 |
| `name` | 공정명 | Assy명 | 라벨만 다름 |
| `l3` | WorkElement[] | L3Structure[] | 내부 구조 다름 |
| `confirmed` | ❌ 없음 | ✅ 있음 | DFMEA만 |

---

## 4. L3 구조 비교

### PFMEA L3 (작업요소)
```typescript
interface WorkElement {
  id: string;
  m4: string;                      // ★ 4M: MC/IM/MN/EN
  name: string;                    // 작업요소명
  order: number;
  functions: L3Function[];         // 작업요소 기능 (공정특성 포함)
  processChars?: L3ProcessChar[];  // (deprecated, functions[].processChars 사용)
  failureCauses?: L3FailureCause[];
}
```

### DFMEA L3 (부품 또는 특성)
```typescript
interface L3Structure {
  id: string;
  type: DFMEAType;                 // ★ 부품/Assy/System/I/F
  name: string;                    // 부품 또는 특성명
  order: number;
  functions: L3Function[];         // 다음하위수준 기능
  failureCauses?: L3FailureCause[];
  confirmed: boolean;
}
```

| 필드 | PFMEA | DFMEA | 비고 |
|------|-------|-------|------|
| `m4` | ✅ MC/IM/MN/EN | ❌ 없음 | **핵심 차이** (PFMEA만) |
| `type` | ❌ 없음 | ✅ 부품/Assy/System/I/F | **핵심 차이** (DFMEA만) |
| `name` | 작업요소명 | 부품/특성명 | 라벨만 다름 |
| `confirmed` | ❌ 없음 | ✅ 있음 | DFMEA만 |
| `processChars` | deprecated | ❌ 없음 | PFMEA 하위호환용 |

---

## 5. 기능/특성 구조 비교

### L2 기능 (공통)
```typescript
interface L2Function {
  id: string;
  name: string;                    // 기능명
  productChars: L2ProductChar[];   // 제품특성 (PFMEA/DFMEA 공통)
}

interface L2ProductChar {
  id: string;
  name: string;                    // 제품특성명
  specialChar?: string;            // CC/SC
}
```

### L3 기능 (공통)
```typescript
interface L3Function {
  id: string;
  name: string;                    // 기능명
  processChars: L3ProcessChar[];   // 공정특성 (PFMEA/DFMEA 공통)
}

interface L3ProcessChar {
  id: string;
  name: string;                    // 공정특성명
  specialChar?: string;            // CC/SC
}
```

| 필드 | PFMEA 라벨 | DFMEA 라벨 | 비고 |
|------|------------|------------|------|
| `L2.functions[].name` | 메인공정 기능 | 초점요소 기능 | 같은 구조 |
| `L2.functions[].productChars` | 제품특성 | 다음하위수준 기능 | 같은 구조, 라벨만 다름 |
| `L3.functions[].name` | 작업요소 기능 | 다음하위수준 기능 | 같은 구조 |
| `L3.functions[].processChars` | 공정특성 | 다음하위수준 기능 | 같은 구조, 라벨만 다름 |

---

## 6. ⭐ CP 연동 시 매핑 (PFMEA 전용)

>  **중요**: CP 연동은 **PFMEA 전용** 기능입니다. DFMEA는 CP와 연동하지 않습니다.

| PFMEA 필드 | CP 필드 | 설명 |
|------------|---------|------|
| `L2.no` | `processNo` | 공정번호 |
| `L2.name` | `processName` | 공정명 |
| `L2.functions[].name` | `processDesc` | 공정설명 (기능) |
| `L3.m4` | `equipment` (4M 분류) | 설비/금형/지그 |
| `L3.name` | `workElement` | 작업요소명 |
| `L2.functions[].productChars[].name` | `productChar` | 제품특성 |
| **`L3.functions[].processChars[].name`** | `processChar` | 공정특성 ⭐ |
| `specialChar` | `specialChar` | 특별특성 (CC/SC) |

### ★ 공정특성 경로 (중요!)
```
PFMEA 공정특성 경로:
  L2 (메인공정)
    └── l3 (작업요소 배열)
          └── functions (L3Function 배열)
                └── processChars (L3ProcessChar 배열)  ← 여기!

잘못된 경로 (deprecated):
  L2.l3[].processChars  ← 사용 금지!
```

---

## 7. 4M 분류 (PFMEA 전용)

| 코드 | 영문 | 한글 | 설명 |
|------|------|------|------|
| **MC** | Machine | 설비 | 생산 설비, 장비 (MC 계열) |
| **MD** | Mold/Die | 금형 | 금형, 다이 (MC 계열) |
| **JG** | Jig | 지그 | 지그, 고정구 (MC 계열) |
| IM | InMaterial | 투입자재 | 투입 자재 (원자재=부품명과 매칭) |
| MN | Man | 사람 | 작업자, 인력 |
| EN | Environment | 작업환경 | 작업 환경 조건 |

> **MC 계열**: MC, MD, JG는 모두 설비/기계류에 해당  
> **DFMEA**는 4M 대신 **부품/Assy/System/I/F** 타입 분류를 사용합니다.

---

## 8. 타입 분류 (DFMEA 전용)

| 코드 | 영문 | 한글 | 설명 |
|------|------|------|------|
| 부품 | Component | 부품 | 개별 부품 |
| Assy | Assembly | 어셈블리 | 부품 조립체 |
| System | System | 시스템 | 전체 시스템 |
| I/F | Interface | 인터페이스 | 시스템 간 연결 부분 |

> **PFMEA**는 부품/Assy/System/I/F 대신 **공정번호(no)**와 **4M(m4)**를 사용합니다.

---

## 9. 확정 상태 비교

### PFMEA 확정 상태
```typescript
interface WorksheetState {
  structureConfirmed?: boolean;
  l1Confirmed?: boolean;
  l2Confirmed?: boolean;
  l3Confirmed?: boolean;
  failureL1Confirmed?: boolean;
  failureL2Confirmed?: boolean;
  failureL3Confirmed?: boolean;
  failureLinkConfirmed?: boolean;
  riskConfirmed?: boolean;
  optimizationConfirmed?: boolean;
}
```

### DFMEA 확정 상태
```typescript
interface ConfirmedState {
  structure: boolean;
  l1Function: boolean;
  l2Function: boolean;
  l3Function: boolean;
  l1Failure: boolean;
  l2Failure: boolean;
  l3Failure: boolean;
  failureLink: boolean;
}

interface WorksheetState {
  confirmed: ConfirmedState;
}
```

| 구분 | PFMEA | DFMEA |
|------|-------|-------|
| 확정 상태 저장 | 플랫 구조 | 객체 구조 |
| 필드명 | `structureConfirmed` | `confirmed.structure` |

---

## 10. 요약: 혼동하기 쉬운 포인트

1. **L2 구분**
   - PFMEA: `no` (공정번호) 사용
   - DFMEA: `no` (초점요소번호) + `type` (S/I/F/C) 사용

2. **L3 구분**
   - PFMEA: `m4` (4M: MC/IM/MN/EN) 사용
   - DFMEA: `type` (부품/Assy/System/I/F) 사용

3. **공정특성 경로**
   - ✅ 올바른 경로: `L3.functions[].processChars`
   - ❌ 잘못된 경로: `L3.processChars` (deprecated)

4. **CP 연동**
   - PFMEA: ✅ 지원
   - DFMEA: ❌ 미지원

---

## 11. 파일 참조

| 구분 | 파일 경로 |
|------|----------|
| PFMEA 상수 | `src/app/pfmea/worksheet/constants.ts` |
| DFMEA 상수 | `src/app/dfmea/worksheet/constants.ts` |
| DFMEA 타입 | `src/app/dfmea/worksheet/types/index.ts` |
| CP 타입 | `src/app/control-plan/worksheet/types.ts` |
| CP 연동 API | `src/app/api/pfmea/sync-to-cp/all/route.ts` |
