# PFMEA → CP 컬럼 매핑표

> **작성일**: 2026-02-04  
> **목적**: PFMEA 데이터가 CP(Control Plan)로 동기화될 때의 정확한 컬럼 매핑을 정의

---

## 1. 핵심 매핑 요약

| No | PFMEA 필드 | PFMEA 경로 | CP 필드 | 비고 |
|----|------------|------------|---------|------|
| 1 | 공정번호 | `L2.no` | `processNo` | 10, 20, 30... |
| 2 | 공정명 | `L2.name` | `processName` | 메인공정명 |
| 3 | 공정설명/기능 | `L2.functions[].name` | `processDesc` | 첫 번째 기능 사용 |
| 4 | 4M 분류 | `L3.m4` | `equipment` 라벨 | MC/MD/JG/IM/MN/EN |
| 5 | 작업요소명 | `L3.name` | `workElement` | [4M] + 작업요소명 |
| 6 | 제품특성 | `L2.functions[].productChars[].name` | `productChar` | 특별특성 포함 |
| 7 | **공정특성** | `L3.functions[].processChars[].name` | `processChar` | ⭐ 핵심! |
| 8 | 특별특성 | `specialChar` | `specialChar` | CC/SC |

---

## 2. PFMEA 데이터 구조 (소스)

```
PFMEA WorksheetState
├── l1 (L1Data)
│   ├── name: 완제품 공정명
│   ├── types[]: YP/SP/USER
│   └── failureScopes[]: 고장영향
│
└── l2[] (Process[])  ← CP 동기화 시작점
    ├── id: 공정 ID
    ├── no: 공정번호 (10, 20, 30...)       → CP.processNo
    ├── name: 공정명                        → CP.processName
    ├── functions[] (L2Function[])
    │   ├── name: 공정기능                  → CP.processDesc
    │   └── productChars[] (L2ProductChar[])
    │       ├── name: 제품특성명            → CP.productChar
    │       └── specialChar: CC/SC          → CP.specialChar (제품)
    │
    └── l3[] (WorkElement[])
        ├── id: 작업요소 ID
        ├── m4: 4M 분류 (MC/MD/JG/IM/MN/EN) → CP.equipment 라벨
        ├── name: 작업요소명                → CP.workElement
        │
        ├── functions[] (L3Function[])      ← ⭐ 공정특성 경로!
        │   ├── name: 작업요소 기능
        │   └── processChars[] (L3ProcessChar[])
        │       ├── name: 공정특성명        → CP.processChar ⭐
        │       └── specialChar: CC/SC      → CP.specialChar (공정)
        │
        └── processChars[] (deprecated)     ← 사용 금지!
```

---

## 3. CP 데이터 구조 (타겟)

```typescript
interface ControlPlanRow {
  // 공정 정보
  processNo: string;      // 공정번호 (PFMEA L2.no)
  processName: string;    // 공정명 (PFMEA L2.name)
  processDesc: string;    // 공정설명 (PFMEA L2.functions[].name)
  
  // 작업요소/설비 정보
  workElement: string;    // 작업요소 (PFMEA L3.name)
  equipment: string;      // 설비 ([4M] + 작업요소명)
  
  // 특성 정보
  productChar: string;    // 제품특성 (PFMEA L2.functions[].productChars[].name)
  processChar: string;    // 공정특성 (PFMEA L3.functions[].processChars[].name) ⭐
  specialChar: string;    // 특별특성 (CC/SC)
}
```

---

## 4. 4M 분류 → equipment 라벨 매핑

| PFMEA m4 코드 | 영문 | 한글 | CP equipment 라벨 | CP 포함 |
|---------------|------|------|-------------------|--------|
| **MC** | Machine | 설비 | `[MC] 작업요소명` | ✅ 포함 |
| **MD** | Mold/Die | 금형 | `[MD] 작업요소명` | ✅ 포함 |
| **JG** | Jig | 지그 | `[JG] 작업요소명` | ✅ 포함 |
| **IM** | InMaterial | 투입자재 | `[IM] 작업요소명` | ✅ 포함 |
| **MN** | Man | 사람 | `[MN] 작업요소명` | ❌ **제외** |
| **EN** | Environment | 작업환경 | `[EN] 작업요소명` | ✅ 포함 |
| (빈값) | - | - | `작업요소명` | ✅ 포함 |

### 코드 예시 (route.ts)
```typescript
const m4Type = (l3.m4 || l3.fourM || '').trim().toUpperCase();
const m4Labels: Record<string, string> = {
    MC: '설비', MD: '금형', JG: '지그',
    IM: '투입자재', MN: '사람', EN: '작업환경'
};
const equipmentLabel = m4Labels[m4Type] || '';
const equipment = equipmentLabel ? `[${m4Type}] ${workElement}` : workElement;
```

---

## 5. ⭐ 공정특성 수집 로직 (핵심!)

### 올바른 경로
```typescript
// ★★★ 반드시 L3.functions[].processChars에서 수집 ★★★
for (const l3 of l2.l3) {
    for (const l3Func of l3.functions || []) {
        for (const pchar of l3Func.processChars || []) {
            // CP로 동기화
            cpRows.push({
                processNo: l2.no,
                processName: l2.name,
                workElement: l3.name,
                processChar: pchar.name,  // ⭐ 공정특성
                specialChar: pchar.specialChar || '',
                // ...
            });
        }
    }
}
```

### 잘못된 경로 (사용 금지!)
```typescript
// ❌ L3.processChars는 deprecated! 사용하지 마세요!
for (const pchar of l3.processChars || []) {  // ← 잘못된 경로
    // ...
}
```

### 폴백 로직 (하위호환)
```typescript
// 1. L3.functions[].processChars에서 먼저 수집
let processCharsFound = false;
for (const l3Func of l3.functions || []) {
    for (const pchar of l3Func.processChars || []) {
        processCharsFound = true;
        // 수집...
    }
}

// 2. 없으면 l3.processChars 폴백 (레거시 데이터용)
if (!processCharsFound) {
    for (const pchar of l3.processChars || []) {
        // 수집...
    }
}
```

---

## 6. 제품특성 수집 로직

```typescript
// L2.functions[].productChars에서 수집
for (const l2Func of l2.functions || []) {
    for (const pchar of l2Func.productChars || []) {
        cpRows.push({
            processNo: l2.no,
            processName: l2.name,
            productChar: pchar.name,       // 제품특성
            specialChar: pchar.specialChar || '',  // CC/SC
            // ...
        });
    }
}
```

---

## 7. 특별특성(CC/SC) 처리

| 소스 | 경로 | CP 필드 |
|------|------|---------|
| 제품특성 특별특성 | `L2.functions[].productChars[].specialChar` | `specialChar` |
| 공정특성 특별특성 | `L3.functions[].processChars[].specialChar` | `specialChar` |

### 우선순위
1. 공정특성의 `specialChar` 우선
2. 없으면 제품특성의 `specialChar` 사용

```typescript
const specialChar = pchar.specialChar || productChar.specialChar || '';
```

---

## 8. 행 생성 규칙

### 기본 규칙
- PFMEA의 **L2(공정)** 단위로 CP 행 그룹 생성
- 각 **L3(작업요소)** 별로 세부 행 생성
- 각 **공정특성(processChar)** 별로 최종 행 생성

### 행 생성 시나리오

| 시나리오 | L3 functions | L3.processChars(폴백) | 생성 행 수 |
|----------|-------------|----------------------|-----------|
| 정상 | 3개 공정특성 | - | 3행 |
| 폴백 | 없음 | 2개 공정특성 | 2행 |
| 빈 데이터 | 없음 | 없음 | 1행 (빈 행) |

---

## 9. CP 동기화 API

### 엔드포인트
```
POST /api/pfmea/sync-to-cp/all
```

### 요청 Body
```typescript
{
  fmeaId: string;     // PFMEA ID
  cpNo: string;       // CP 번호
  l2Data: Process[];  // PFMEA L2 데이터
}
```

### 응답
```typescript
{
  success: boolean;
  processCount: number;      // 공정 수
  workElementCount: number;  // 작업요소 수
  processCharCount: number;  // 공정특성 수
  cpRowsCount: number;       // 생성된 CP 행 수
}
```

---

## 10. 점검 체크리스트

### ✅ 매핑 확인
- [ ] `L2.no` → `processNo` 매핑 확인
- [ ] `L2.name` → `processName` 매핑 확인
- [ ] `L2.functions[].name` → `processDesc` 매핑 확인
- [ ] `L3.m4` → `equipment` 라벨 매핑 확인
- [ ] `L3.name` → `workElement` 매핑 확인
- [ ] `L2.functions[].productChars[].name` → `productChar` 매핑 확인
- [ ] `L3.functions[].processChars[].name` → `processChar` 매핑 확인 ⭐
- [ ] `specialChar` (CC/SC) 매핑 확인

### ✅ 4M 분류 확인
- [ ] MC (설비) 라벨 표시 확인
- [ ] MD (금형) 라벨 표시 확인
- [ ] JG (지그) 라벨 표시 확인
- [ ] IM (투입자재) 라벨 표시 확인
- [ ] MN (사람) 라벨 표시 확인
- [ ] EN (작업환경) 라벨 표시 확인

### ✅ 공정특성 경로 확인
- [ ] `L3.functions[].processChars` 경로 사용 확인
- [ ] `L3.processChars` 폴백 로직 확인
- [ ] 공정특성이 없는 경우 빈 행 생성 확인

---

## 11. 관련 파일

| 구분 | 파일 경로 |
|------|----------|
| CP 동기화 API | `src/app/api/pfmea/sync-to-cp/all/route.ts` |
| CP 동기화 UI | `src/app/pfmea/worksheet/components/CpSyncWizard.tsx` |
| PFMEA 상수 | `src/app/pfmea/worksheet/constants.ts` |
| PFMEA 용어 | `src/app/pfmea/worksheet/terminology.ts` |
| CP 타입 | `src/app/control-plan/worksheet/types.ts` |

---

## 12. 버전 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0 | 2026-02-04 | 최초 작성 |
