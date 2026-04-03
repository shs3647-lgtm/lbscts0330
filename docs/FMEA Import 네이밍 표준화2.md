## 작업: FMEA Import 네이밍 표준화 — Phase 2A (네임스페이스 분리)

### 배경
Phase 1 전수조사에서 핵심 발견: CP/PFD가 A3~A5, B1~B4 코드를
PFMEA와 완전히 다른 의미로 사용 중 (예: PFMEA A5=고장형태, CP A5=설비).
정규화 맵을 만들기 전에, 먼저 앱별 코드 체계를 명확히 분리해야 한다.

### 이 Phase에서 해결할 문제 (Phase 1 발견 기준)

| # | 영향도 | 문제 | 대상 파일 |
|---|--------|------|----------|
| 1 | H | CP/PFD `itemCode` A3~A5,B1~B4가 PFMEA와 다른 의미 | CP `master-data/route.ts`, PFD `import/constants.ts` |
| 2 | M | FA검증 코드 C0~C5와 FMEA 코드 C1~C4 네임스페이스 비분리 | `faValidation.ts` |
| 3 | L | `DataSelectModal.tsx`에서 두 코드 체계 혼재 | `DataSelectModal.tsx` |

### 작업 원칙
- PFMEA의 A1~C4 체계는 변경하지 않는다 (이미 확립된 표준)
- CP/PFD/FA에서 충돌하는 코드에 앱 접두사를 붙여 분리한다
- 기존 동작을 변경하지 않는다 (리팩토링만)

### 작업 순서

#### Step 2A-1: 충돌 매핑표 작성
CP/PFD/FA에서 사용하는 코드와 PFMEA 코드의 1:1 충돌 매핑표를 먼저 작성한다.
NAMING_AUDIT_REPORT.md의 조사 결과를 기반으로:

```typescript
// 예시 — 실제 코드 조사 결과로 채울 것
// PFMEA 체계
// A5 = 고장형태 (Failure Mode)

// CP 체계 (충돌!)
// A5 = 설비 (Equipment) ← 완전히 다른 의미

// 목표: CP 코드에 접두사 추가
// CP_A5 = 설비
// PFMEA A5 = 고장형태 (변경 없음)
```

이 매핑표를 먼저 작성하여 `/docs/CODE_NAMESPACE_MAP.md`로 저장한 후
나에게 보여줘라. 승인 후 Step 2A-2로 진행.

#### Step 2A-2: CP/PFD 코드에 앱 접두사 추가
CP `master-data/route.ts`와 PFD `import/constants.ts`에서:
1. `itemCode` 값으로 사용되는 "A3", "A4", "A5", "B1"~"B4" 문자열을 찾는다
2. CP 전용 상수 파일 생성: `src/lib/cp/constants/cp-column-ids.ts`
3. PFD 전용 상수 파일 생성: `src/lib/pfd/constants/pfd-column-ids.ts`
4. 하드코딩된 문자열을 상수 참조로 교체

```typescript
// src/lib/cp/constants/cp-column-ids.ts
// CP(관리계획서) 전용 코드 — PFMEA A1~C4와 별개 체계
export const CP_ITEM_CODES = {
  CP_A1: '...',  // CP에서의 A1 의미
  CP_A3: '...',  // CP에서의 A3 의미
  CP_A5: '설비', // ← PFMEA A5(고장형태)와 다름!
  // ...
} as const;
```

#### Step 2A-3: FA검증 코드 네임스페이스 분리
`faValidation.ts`에서:
1. C0~C5 코드가 FMEA C1~C4와 어떻게 겹치는지 확인
2. FA 전용 접두사 추가 또는 별도 enum으로 분리
3. FMEA C1~C4 참조 부분은 그대로 유지

#### Step 2A-4: DataSelectModal 정리
`DataSelectModal.tsx`에서:
1. PFMEA 코드와 CP/PFD 코드가 혼재하는 부분 식별
2. 조건 분기로 앱별 코드 체계를 명시적으로 구분
3. 또는 앱별 상수 import로 분리

### 수정 시 금지 사항
- PFMEA의 A1~C4 코드 값 자체를 변경하지 않는다
- CP/PFD의 기존 동작(데이터 저장/조회)을 변경하지 않는다
- Import 파서 로직은 이 Phase에서 수정하지 않는다 (Phase 2B에서 처리)
- DB 마이그레이션이 필요한 변경은 하지 않는다

### 산출물
1. `/docs/CODE_NAMESPACE_MAP.md` — 앱별 코드 충돌 매핑표
2. `src/lib/cp/constants/cp-column-ids.ts` (신규)
3. `src/lib/pfd/constants/pfd-column-ids.ts` (신규)
4. 수정된 파일 목록 + 각 파일의 변경 요약
5. TypeScript 컴파일 에러 없음 확인

### 완료 기준
- CP/PFD 코드에서 "A5"라고 쓰면 반드시 CP_A5 또는 PFD_A5로 식별 가능
- PFMEA 코드에서 "A5"라고 쓰면 항상 고장형태를 의미
- 두 체계가 같은 파일에서 혼재하지 않음
- 또는 혼재하더라도 접두사로 명확히 구분됨

---
---

## 작업: FMEA Import 네이밍 표준화 — Phase 2B (PFMEA 헤더 정규화)

> ⚠️ Phase 2A 완료 + 기획자 승인 후에만 이 작업 시작

### 배경
Phase 2A에서 앱 간 네임스페이스 충돌을 해결했다.
이제 PFMEA 내부의 헤더 변형(120개소 하드코딩)을 단일 정규화 맵으로 통합한다.

### 이 Phase에서 해결할 문제 (Phase 1 발견 기준)

| # | 영향도 | 문제 | 대상 |
|---|--------|------|------|
| 4 | M | AllTab 헤더 한글 하드코딩, DFMEA 라벨 미전환 | `allTabConstants.ts`, `AllTabBasic.tsx` |
| 5 | M | A4 제품특성이 텍스트 필드 + 엔티티 FK 두 곳 저장 | Prisma 스키마 |
| 6 | L | C2 한글명 불일치 "완제품기능" vs "제품기능" | `excel-styles.ts` vs `excel-template.ts` |
| 7 | L | `processDesc` 필드명이 PFD A3(공정설명)과 혼동 | `import/types.ts`, `master-processes/route.ts` |
| 8 | L | C3 레거시 단일필드 + 신규 테이블 병행 | Prisma 스키마 |

### 작업 순서

#### Step 2B-1: PFMEA 헤더 정규화 맵 생성
`src/lib/fmea/constants/fmea-column-ids.ts` 생성:

```typescript
/**
 * PFMEA Import 컬럼 ID 정규화
 * 수동 Import / 복합 Import / FC시트 / FA시트의 모든 헤더 변형을
 * 하나의 canonical ID (A1~C4)로 매핑
 * 
 * ⚠️ 이 파일은 PFMEA 전용. CP/PFD 코드는 cp-column-ids.ts / pfd-column-ids.ts 참조
 */

export const FMEA_COLUMN_IDS = {
  // L2 레벨
  A1: '공정번호',
  A2: '공정명',
  A3: '공정기능',
  A4: '제품특성',
  A5: '고장형태',
  A6: '검출관리',
  // L3 레벨
  B1: '작업요소',
  B2: '요소기능',
  B3: '공정특성',
  B4: '고장원인',
  B5: '예방관리',
  // L1 레벨
  C1: '구분',
  C2: '제품기능',   // ← 표준명칭 확정: "제품기능" ("완제품기능" 아님)
  C3: '요구사항',
  C4: '고장영향',
} as const;

export type FmeaColumnId = keyof typeof FMEA_COLUMN_IDS;

// NAMING_AUDIT_REPORT.md 섹션1에서 수집된 모든 헤더 변형
export const HEADER_NORMALIZE_MAP: Record<string, FmeaColumnId> = {
  // === A1 공정번호 ===
  'L2-1.공정번호':  'A1',
  'A1.공정번호':    'A1',
  '공정No(A1)':    'A1',
  '공정번호':       'A1',

  // === A2 공정명 ===
  'L2-2.공정명':    'A2',
  'A2.공정명':      'A2',
  '공정명(A2)':     'A2',
  'NO+공정명':      'A2',

  // === A3 공정기능 ===
  'L2-3.공정기능(설명)': 'A3',
  'A3.공정기능':        'A3',
  '공정기능(A3)':       'A3',

  // === A4 제품특성 ===
  'L2-4.제품특성':  'A4',
  'A4.제품특성':    'A4',
  '제품특성(A4)':   'A4',

  // === A5 고장형태 ===
  'L2-5.고장형태':  'A5',
  'A5.고장형태':    'A5',
  '고장형태(A5)':   'A5',
  'FM(고장형태)':   'A5',

  // === A6 검출관리 ===
  'L2-6.검출관리':  'A6',
  'A6.검출관리':    'A6',
  '검출관리(A6)':   'A6',

  // === B1 작업요소 ===
  'L3-1.작업요소(설비)': 'B1',
  '작업요소(B1)':       'B1',
  'WE(작업요소)':       'B1',

  // === B2 요소기능 ===
  'L3-2.요소기능':  'B2',
  '요소기능(B2)':   'B2',

  // === B3 공정특성 ===
  'L3-3.공정특성':  'B3',
  '공정특성(B3)':   'B3',

  // === B4 고장원인 ===
  'L3-4.고장원인':  'B4',
  '고장원인(B4)':   'B4',
  'FC(고장원인)':   'B4',

  // === B5 예방관리 ===
  'L3-5.예방관리':  'B5',
  '예방관리(B5)':   'B5',
  'B5.예방관리':    'B5',

  // === C1 구분 ===
  'L1-1.구분':     'C1',
  '구분(C1)':      'C1',
  'FE구분':        'C1',

  // === C2 제품기능 ===
  'L1-2.제품(반)기능':  'C2',
  '제품기능(C2)':      'C2',
  '완제품기능':         'C2',   // ← 레거시 변형, "제품기능"으로 통일

  // === C3 요구사항 ===
  'L1-3.제품(반)요구사항': 'C3',
  '요구사항(C3)':        'C3',

  // === C4 고장영향 ===
  'L1-4.고장영향':  'C4',
  '고장영향(C4)':   'C4',
  'FE(고장영향)':   'C4',
};

// ⚠️ NAMING_AUDIT_REPORT.md에서 추가로 발견된 변형이 있으면 여기에 추가할 것

export function normalizeHeader(header: string): FmeaColumnId | null {
  const trimmed = header.trim();
  return HEADER_NORMALIZE_MAP[trimmed] ?? null;
}

// 역방향: canonical ID → 표준 표시명 (UI용)
export function getDisplayName(id: FmeaColumnId): string {
  return FMEA_COLUMN_IDS[id];
}
```

이 파일을 생성한 후 나에게 보여줘라. 
NAMING_AUDIT_REPORT.md에서 발견된 추가 변형이 있으면 반드시 포함시켜라.

#### Step 2B-2: AllTab 헤더 하드코딩 → 상수 참조 교체
`allTabConstants.ts`와 `AllTabBasic.tsx`에서:
1. 한글 하드코딩된 컬럼 헤더를 `FMEA_COLUMN_IDS` 또는 `getDisplayName()` 참조로 교체
2. DFMEA용 라벨이 필요한 경우, DFMEA 전용 표시명 맵 추가:
   ```typescript
   export const DFMEA_DISPLAY_OVERRIDES: Partial<Record<FmeaColumnId, string>> = {
     A3: '설계기능',    // PFMEA "공정기능" → DFMEA "설계기능"
     B1: '설계요소',    // PFMEA "작업요소" → DFMEA "설계요소"
     // ... DFMEA 전용 표시명
   };
   ```

#### Step 2B-3: C2 한글명 통일
`excel-styles.ts`와 `excel-template.ts`에서:
- "완제품기능"을 "제품기능"으로 통일
- 또는 `getDisplayName('C2')` 참조로 교체

#### Step 2B-4: 120개소 하드코딩 헤더 순차 교체
NAMING_AUDIT_REPORT.md 섹션 2의 85개 파일에서:
1. 하드코딩된 PFMEA 헤더 문자열 → `FMEA_COLUMN_IDS.XX` 상수 참조로 교체
2. 헤더 매칭 로직 → `normalizeHeader()` 함수 사용으로 교체
3. 우선순위: Import 파서 파일 → API route → 프론트엔드 순

**주의: 이 작업에서는 파싱 로직/dedup 로직/DB 저장 로직을 변경하지 않는다.**
오직 문자열 참조만 상수로 바꾸는 리팩토링이다.

#### Step 2B-5: Phase 1 발견 L등급 문서화 (코드 수정 보류)
아래 항목은 코드 수정하지 않고 기록만 한다:
- `processDesc` 혼동 → TODO 주석 추가 ("Phase 3에서 필드명 정리 예정")
- C3 레거시+신규 병행 → TODO 주석 추가 ("마이그레이션 필요, 별도 PR")
- A4 이중 저장 → TODO 주석 추가 ("Phase 3 FK 재설계에서 해결 예정")

### 수정 시 금지 사항
- Import 파싱 로직 변경 금지 (Phase 3에서 처리)
- 중복제거(dedup) 로직 변경 금지 (Phase 3에서 처리)
- DB 마이그레이션 금지 (Phase 3에서 처리)
- Prisma 스키마 변경 금지 (Phase 3에서 처리)
- CP/PFD 코드 변경 금지 (Phase 2A에서 완료됨)

### 산출물
1. `src/lib/fmea/constants/fmea-column-ids.ts` (신규)
2. 수정된 파일 목록 + 각 파일의 변경 요약
3. NAMING_STANDARDIZATION_COMPLETE.md (Phase 2A + 2B 통합 변경 요약)

### 검증
- TypeScript 컴파일 에러 없음
- 기존 단위 테스트 전체 통과
- 수동 Import / 복합 Import 기존 동작 정상
- `grep -rn "L[123]-[0-9]\." src/` 결과에서 파서 외부 하드코딩 제로 확인