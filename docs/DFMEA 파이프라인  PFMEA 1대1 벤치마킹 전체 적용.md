## 지시: DFMEA 파이프라인 — PFMEA 1:1 벤치마킹 전체 적용

### 배경
PFMEA에서 완료한 작업:
- 헤더 정규화 (`pfmea-header-map.ts`)
- dedupKey 생성 (`dedup-key.ts`)
- parentId 주입 순서 강제
- FK 무결성 검증
- Guard Test + Pre-commit Hook
- Import 에러 체계

DFMEA는 PFMEA와 엔티티 계층이 동일하고 컬럼명만 다르다.
PFMEA 파이프라인을 1:1 벤치마킹하여 DFMEA에 동일한 방어선을 구축한다.

---

### PFMEA ↔ DFMEA 컬럼 매핑표 (이 표가 모든 작업의 기준)

```
PFMEA 컬럼              DFMEA 컬럼                    엔티티    비고
─────────────────────  ───────────────────────────   ───────  ──────────
완제품공정명              다음 상위수준                    ST_L1
공정번호                 번호                           ST_L2    A1 → D1
메인공정                 초점요소                        ST_L2    A2 → D2
4M                      타입                           ST_L3    4M → 타입
작업요소                 부품 또는 특성                   ST_L3    B1 → E1
구분(YP/SP/USER)        구분(법규/기본/보조/관능)              FN_L1    카테고리값 다름
완제품기능/제품기능       제품기능                        FN_L1    C2 동일
요구사항                 요구사항                        FN_L1    C3 동일
공정기능                 초점요소 기능                    FN_L2    A3 → D3
제품특성                 제품특성                        FN_L2    A4 동일
공정특성                 부품 요구사항                    FN_L3    B3 → E3
작업요소기능             부품 기능 또는 특성               FN_L3    B2 → E2
고장영향                 고장영향(FE)                    FL_FE    C4 동일
고장형태                 고장형태(FM)                    FL_FM    A5 동일
고장원인                 고장원인(FC)                    FL_FC    B4 동일
검출관리                 검출관리                        DC       A6 동일
예방관리                 예방관리                        PC       B5 동일
```

---

### 작업 1: DFMEA 헤더 정규화 맵 생성

파일: `src/lib/fmea/constants/dfmea-header-map.ts` (신규)

PFMEA의 `pfmea-header-map.ts`를 벤치마킹하여 DFMEA 전용 맵 생성:

```typescript
/**
 * DFMEA Import 컬럼 ID 정규화
 * PFMEA의 pfmea-header-map.ts와 동일 구조, DFMEA 컬럼명 적용
 */

export const DFMEA_COLUMN_IDS = {
  // L2 레벨 (초점요소)
  D1: '번호',              // PFMEA A1(공정번호)에 대응
  D2: '초점요소',           // PFMEA A2(공정명)에 대응
  D3: '초점요소 기능',      // PFMEA A3(공정기능)에 대응
  D4: '제품특성',           // PFMEA A4와 동일
  D5: '고장형태',           // PFMEA A5와 동일
  D6: '검출관리',           // PFMEA A6와 동일
  // L3 레벨 (부품)
  E1: '부품 또는 특성',     // PFMEA B1(작업요소)에 대응
  E2: '부품 기능 또는 특성', // PFMEA B2(요소기능)에 대응
  E3: '부품 요구사항',      // PFMEA B3(공정특성)에 대응
  E4: '고장원인',           // PFMEA B4와 동일
  E5: '예방관리',           // PFMEA B5와 동일
  // L1 레벨 (다음 상위수준)
  F1: '구분',              // PFMEA C1와 동일 (값: 법규/기본/보조)
  F2: '제품기능',           // PFMEA C2와 동일
  F3: '요구사항',           // PFMEA C3와 동일
  F4: '고장영향',           // PFMEA C4와 동일
} as const;

export type DfmeaColumnId = keyof typeof DFMEA_COLUMN_IDS;

// 모든 알려진 DFMEA 헤더 변형 → canonical ID
export const DFMEA_HEADER_NORMALIZE_MAP: Record<string, DfmeaColumnId> = {
  // === D1 번호 ===
  '번호': 'D1',

  // === D2 초점요소 ===
  '초점요소': 'D2',

  // === D3 초점요소 기능 ===
  '초점요소 기능': 'D3',
  '초점요소기능': 'D3',

  // === D4 제품특성 ===
  '제품특성': 'D4',

  // === D5 고장형태 ===
  '고장형태': 'D5',
  '고장형태(FM)': 'D5',

  // === D6 검출관리 ===
  '검출관리': 'D6',

  // === E1 부품 또는 특성 ===
  '부품 또는 특성': 'E1',
  '부품': 'E1',

  // === E2 부품 기능 또는 특성 ===
  '부품 기능 또는 특성': 'E2',
  '부품기능': 'E2',

  // === E3 부품 요구사항 ===
  '부품 요구사항': 'E3',

  // === E4 고장원인 ===
  '고장원인': 'E4',
  '고장원인(FC)': 'E4',

  // === E5 예방관리 ===
  '예방관리': 'E5',

  // === F1 구분 ===
  '구분': 'F1',

  // === F2 제품기능 ===
  '제품기능': 'F2',
  '제품 기능': 'F2',

  // === F3 요구사항 ===
  '요구사항': 'F3',

  // === F4 고장영향 ===
  '고장영향': 'F4',
  '고장영향(FE)': 'F4',

  // === 구조분석 전용 ===
  '다음 상위수준': 'F1',  // L1 구조명
  '다음하위 수준': 'D2',  // 3L 시트에서 초점요소 참조
  '타입': 'E1',           // 4M에 대응하는 DFMEA 분류
};

export function normalizeDfmeaHeader(header: string): DfmeaColumnId | null {
  const trimmed = header.trim();
  return DFMEA_HEADER_NORMALIZE_MAP[trimmed] ?? null;
}
```

⚠️ 실제 DFMEA 코드에서 사용하는 헤더 변형이 추가로 있으면 맵에 포함시킬 것.
```bash
grep -rn "초점요소\|부품\|다음.*수준\|타입" src/app/*dfmea* src/app/*(fmea-core)*dfmea* --include="*.ts" --include="*.tsx"
```

---

### 작업 2: DFMEA dedupKey 함수 추가

파일: `src/lib/fmea/utils/dedup-key.ts` (기존 파일에 추가)

⚠️ 이 파일은 CODEFREEZE 대상이므로 `FMEA_GUARD_OVERRIDE=APPROVED-BY-USER` 환경변수 설정 후 커밋.

기존 PFMEA 함수 아래에 DFMEA 전용 함수 추가:

```typescript
// ===== DFMEA dedupKey 함수 =====
// PFMEA와 동일 원칙: parentId(n-1) + 자기 식별값
// 컬럼명만 DFMEA 용어로 변경

// ST_L2: 초점요소 (PFMEA의 메인공정에 대응)
export function dedupKey_DFMEA_ST_L2(st_l1_id: string, elementNo: string): string {
  return `${st_l1_id}::${normalize(elementNo)}`;
}

// ST_L3: 부품 (PFMEA의 작업요소에 대응)
export function dedupKey_DFMEA_ST_L3(st_l2_id: string, type: string, partName: string): string {
  return `${st_l2_id}::${normalize(type)}::${normalize(partName)}`;
}

// FN_L1: 제품기능 (PFMEA의 완제품기능에 대응)
export function dedupKey_DFMEA_FN_L1(st_l1_id: string, category: string, functionName: string): string {
  return `${st_l1_id}::${normalize(category)}::${normalize(functionName)}`;
}

// FN_L2: 초점요소 기능 + 제품특성 (PFMEA의 공정기능+제품특성에 대응)
export function dedupKey_DFMEA_FN_L2(st_l2_id: string, functionName: string, productCharId: string): string {
  return `${st_l2_id}::${normalize(functionName)}::${productCharId}`;
}

// FN_L3: 부품 기능 + 부품 요구사항 (PFMEA의 작업요소기능+공정특성에 대응)
export function dedupKey_DFMEA_FN_L3(st_l3_id: string, functionName: string, partRequirement: string): string {
  return `${st_l3_id}::${normalize(functionName)}::${normalize(partRequirement)}`;
}

// FL_FE: 고장영향 (PFMEA와 동일)
export function dedupKey_DFMEA_FL_FE(fn_l1_id: string, effectName: string): string {
  return `${fn_l1_id}::${normalize(effectName)}`;
}

// FL_FM: 고장형태 (PFMEA와 동일)
export function dedupKey_DFMEA_FL_FM(fn_l2_id: string, modeName: string): string {
  return `${fn_l2_id}::${normalize(modeName)}`;
}

// FL_FC: 고장원인 (PFMEA와 동일)
export function dedupKey_DFMEA_FL_FC(fn_l3_id: string, causeName: string): string {
  return `${fn_l3_id}::${normalize(causeName)}`;
}
```

---

### 작업 3: DFMEA Import 파서/저장에 dedupKey + parentId 강제 적용

PFMEA에서 적용한 것과 동일한 패턴을 DFMEA Import 코드에 적용.

먼저 DFMEA Import 코드 위치 파악:
```bash
find src/ -path "*dfmea*import*" -name "*.ts" -o -path "*dfmea*import*" -name "*.tsx" | head -20
grep -rn "dfmea.*save\|dfmea.*import\|dfmea.*transaction" src/ --include="*.ts" -l
```

파악된 파일에서:

##### 3-1: 파싱 시 중복제거 제거
```bash
grep -rn "dedup\|duplicate\|중복\|skip\|already\|seen\|Set()\|Map()" src/ --include="*.ts" | grep -i "dfmea"
```
파싱 시점 중복제거가 있으면 제거. 모든 행을 DB에 저장.

##### 3-2: parentId 주입 순서 강제
PFMEA와 동일 패턴:
```
Phase A: 구조 저장
  ① ST_L1 (다음 상위수준) → st_l1_id 확보
  ② ST_L2 (번호 + 초점요소) → st_l2_id 확보, parentId = st_l1_id
  ③ ST_L3 (타입 + 부품) → st_l3_id 확보, parentId = st_l2_id

Phase B: 기능 저장
  ④ FN_L1 (구분 + 제품기능) → parentId = st_l1_id
  ⑤ FN_L2 (초점요소기능 + 제품특성) → parentId = st_l2_id
  ⑥ FN_L3 (부품기능 + 부품요구사항) → parentId = st_l3_id

Phase C: 고장 저장
  ⑦ FL_FE → parentId = fn_l1_id
  ⑧ FL_FM → parentId = fn_l2_id (초점요소가 아닌 초점요소기능에 연결!)
  ⑨ FL_FC → parentId = fn_l3_id (부품이 아닌 부품기능에 연결!)
```

각 단계에서 parentId가 null이면 `ImportError` throw:
```typescript
if (!st_l2_id) {
  throw new ImportError('PARENT_NOT_FOUND',
    `DFMEA ST_L3 저장 실패: 번호 "${row.elementNo}"에 해당하는 ST_L2 없음`);
}
```

##### 3-3: dedupKey 생성 코드 삽입
각 엔티티 저장 시 dedupKey 필드 포함:
```typescript
const st_l2 = await tx.l2Structure.create({
  data: {
    id: generateId(),
    elementNo: row.elementNo,
    name: row.focusElement,
    parentItemId: st_l1_id,
    dedupKey: dedupKey_DFMEA_ST_L2(st_l1_id, row.elementNo),
  }
});
```

##### 3-4: 저장 후 무결성 검증
PFMEA의 `validateImportIntegrity`와 동일한 검증을 DFMEA 트랜잭션 마지막에 실행:
- 고아 레코드 0건 확인
- dedupKey null 0건 확인
- FM/FC가 기능(FN)에 연결되었는지 확인 (구조(ST)에 직접 연결 금지)

---

### 작업 4: DFMEA 코드에서 PFMEA 명칭 잔존 수정

DFMEA 코드가 PFMEA를 벤치마킹하면서 PFMEA 명칭이 남아 있는 곳 수정:

```bash
# DFMEA 폴더에서 PFMEA 용어 검색
grep -rn "공정번호\|공정명\|공정기능\|작업요소\|요소기능\|공정특성\|4M\|메인공정" src/app/*dfmea* src/app/*(fmea-core)*dfmea* --include="*.ts" --include="*.tsx"

# 엑셀 다운로드 시트 이름에서 PFMEA 명칭 검색
grep -rn "L2-1\|L2-2\|L2-3\|L3-1\|L3-2\|L3-3\|공정번호\|작업요소" src/ --include="*.ts" | grep -i "dfmea\|download\|export\|sample"
```

발견된 각 위치에서:
- PFMEA "공정번호" → DFMEA "번호"
- PFMEA "메인공정" → DFMEA "초점요소"
- PFMEA "4M" → DFMEA "타입"
- PFMEA "작업요소" → DFMEA "부품 또는 특성"
- PFMEA "공정기능" → DFMEA "초점요소 기능"
- PFMEA "요소기능" → DFMEA "부품 기능 또는 특성"
- PFMEA "공정특성" → DFMEA "부품 요구사항"

엑셀 다운로드 시트 이름이 PFMEA와 같은 것:
- DFMEA용 시트 이름을 DFMEA 전용으로 분리
- PFMEA 다운로드 코드와 DFMEA 다운로드 코드가 같은 함수를 공유하면,
  FMEA 타입(PFMEA/DFMEA)에 따라 분기하는 로직 추가

---

### 작업 5: DFMEA AllTab 컬럼 헤더 표준화

PFMEA Phase 2B에서 `allTabConstants.ts`를 `pfmea-header-map.ts` 참조로 교체한 것처럼,
DFMEA AllTab도 `dfmea-header-map.ts` 참조로 교체:

```bash
grep -rn "allTab\|AllTab\|COLUMNS" src/app/*dfmea* --include="*.ts" --include="*.tsx" -l
```

하드코딩된 DFMEA 컬럼 헤더 → `DFMEA_COLUMN_IDS` 상수 참조로 교체.

---

### 작업 6: DFMEA Guard Test 추가

파일: `tests/lib/fmea/dfmea-import-defense.guard.test.ts` (신규)

PFMEA Guard Test(`import-pipeline-defense.guard.test.ts`)를 복사하여
DFMEA 컬럼명으로 수정:

```typescript
// Guard 1: DFMEA FL dedupKey — 동명 FM이 다른 부모면 다른 키
expect(dedupKey_DFMEA_FL_FM('fn_l2_A', '고장형태X'))
  .not.toBe(dedupKey_DFMEA_FL_FM('fn_l2_B', '고장형태X'));

// Guard 2: DFMEA FC parentId — fn_l3_id에 연결 (st_l3_id 아님)

// Guard 3: DFMEA 카테시안 방지

// Guard 4: DFMEA FN_L2 dedupKey에 productCharId(FK) 포함

// Guard 5: DFMEA 파싱 시점 중복제거 부재

// Guard 6: DFMEA fill-down (번호/초점요소/타입)

// Guard 7: DFMEA normalize 엣지케이스

// Guard 8 (DFMEA 전용): 구분 카테고리값 (법규/기본/보조)
expect(['법규', '기본', '보조']).toContain(parsedRow.category);
```

---

### 작업 7: Pre-commit Hook 업데이트

`.husky/pre-commit` 또는 `scripts/guard/codefreeze-import-staged.ts`의
보호 대상 파일 목록에 추가:

```
src/lib/fmea/constants/dfmea-header-map.ts
```

기존 `importCodefreezeFiles` 배열에 추가.

---

### 작업 8: DFMEA 전용 fill-down 규칙

PFMEA와 다른 DFMEA fill-down 대상:

```typescript
const DFMEA_FILL_DOWN_RULES = {
  '구조분석':         ['다음 상위수준', '번호', '초점요소', '타입'],
  '1L_완제품기능':     ['다음 상위수준', '구분'],
  '2L_초점요소기능':   ['초점요소', '초점요소 기능'],
  '3L_부품기능':      ['초점요소', '타입', '부품', '부품 기능 또는 특성'],
  '1L_고장영향':      ['다음 상위수준', '구분', '제품기능', '요구사항'],
  '2L_고장형태':      ['초점요소', '초점요소 기능', '제품특성'],
  '3L_고장원인':      ['초점요소', '타입', '부품', '부품 기능 또는 특성'],
};
```

fill-down 하면 안 되는 필드: FM, FC, FE, 부품 요구사항(일부)

---

### 전체 검증

```bash
# 1. 컴파일
npx tsc --noEmit

# 2. 전체 테스트 (PFMEA + DFMEA)
npm run test:import-slice

# 3. 린트
npm run lint

# 4. DFMEA Import 실행 (가능하면)
# 브라우저에서 DFMEA 프로젝트 Import → pipeline-verify 실행

# 5. PFMEA 회귀 확인 (PFMEA 테스트 여전히 통과하는지)
```

---

### 산출물

1. `src/lib/fmea/constants/dfmea-header-map.ts` (신규)
2. `src/lib/fmea/utils/dedup-key.ts` (DFMEA 함수 추가)
3. `tests/lib/fmea/dfmea-import-defense.guard.test.ts` (신규)
4. DFMEA Import 파서/저장 수정 파일 목록
5. DFMEA 명칭 잔존 수정 파일 목록
6. `DFMEA_파이프라인_구축_완료보고서.md`

### 금지 사항
- PFMEA 코드 변경 금지 (dedup-key.ts DFMEA 함수 추가만 예외, CODEFREEZE override 필요)
- 워크시트 렌더링 코드 변경 금지 (CLAUDE.md Rule 2)
- PFMEA 테스트가 깨지면 즉시 중단하고 보고
- DB 마이그레이션은 dedupKey 필드 추가만 (PFMEA에서 이미 추가했으면 불필요)