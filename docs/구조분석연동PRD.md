# 구조분석 연동 PRD (Product Requirements Document)

> **작성일**: 2026-02-01  
> **버전**: 1.0.0  
> **작성자**: AI Assistant  
> **상태**: CODE FREEZE 완료

---

## 1. 개요

### 1.1 목적
FMEA 구조분석 워크시트의 **데이터 무결성**을 보장하기 위한 **콘크리트 구조** 시스템 구현.

### 1.2 핵심 원칙
| 원칙 | 설명 |
|------|------|
| **열(Column) 고정** | 워크시트 열 위치는 절대 변경 불가 |
| **행(Row) 동적** | 데이터 추가 시 행만 동적으로 증가 |
| **병합 허용** | 상위부모가 같은 셀만 병합 가능 |
| **에러 표시** | 위치 불일치 시 렌더링하지 않고 에러 메시지 표시 |

---

## 2. DB 스키마 구성

### 2.1 구조분석 테이블 (Structure Tables)

#### L1Structure (완제품 공정)
```prisma
model L1Structure {
  id        String   @id @default(uuid())
  fmeaId    String   // FK: FMEA 프로젝트 ID
  name      String   // 완제품 공정명
  confirmed Boolean? @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // ★★★ 위치 정보 (콘크리트 구조) ★★★
  rowIndex     Int      @default(0)  // 행 위치 (동적 증가)
  colIndex     Int      @default(0)  // 열 위치 (고정: 0=L1열)

  // ★★★ 하이브리드 ID 시스템 필드 ★★★
  parentId     String?  // 부모 ID (모자관계 추적)
  mergeGroupId String?  // 병합 그룹 ID
  rowSpan      Int?     @default(1)  // 병합된 행 수
  colSpan      Int?     @default(1)  // 병합된 열 수 (고정)

  // Relations
  l2Structures L2Structure[]
  l1Functions  L1Function[]

  @@index([fmeaId])
  @@index([parentId])
  @@index([mergeGroupId])
  @@index([rowIndex])  // 행 위치 인덱스
  @@map("l1_structures")
}
```

#### L2Structure (메인 공정)
```prisma
model L2Structure {
  id        String   @id @default(uuid())
  fmeaId    String   // FK: FMEA 프로젝트 ID
  l1Id      String   // FK: L1Structure.id
  no        String   // 공정 번호
  name      String   // 공정명
  order     Int      // 순서
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // ★★★ 위치 정보 (콘크리트 구조) ★★★
  rowIndex     Int      @default(0)  // 행 위치 (동적 증가)
  colIndex     Int      @default(1)  // 열 위치 (고정: 1=L2열)

  // ★★★ 하이브리드 ID 시스템 필드 ★★★
  parentId     String?  // 부모 ID (모자관계 추적)
  mergeGroupId String?  // 병합 그룹 ID
  rowSpan      Int?     @default(1)
  colSpan      Int?     @default(1)  // 고정

  // Relations
  l1Structure  L1Structure   @relation(fields: [l1Id], references: [id], onDelete: Cascade)
  l3Structures L3Structure[]
  l2Functions  L2Function[]
  failureModes FailureMode[]

  @@index([fmeaId])
  @@index([l1Id])
  @@index([parentId])
  @@index([mergeGroupId])
  @@index([rowIndex])  // 행 위치 인덱스
  @@map("l2_structures")
}
```

#### L3Structure (작업 요소 / 4M)
```prisma
model L3Structure {
  id        String   @id @default(uuid())
  fmeaId    String   // FK: FMEA 프로젝트 ID
  l1Id      String   // FK: L1Structure.id (연결용)
  l2Id      String   // FK: L2Structure.id
  m4        String?  // 4M 분류: 'MN' | 'MC' | 'IM' | 'EN'
  name      String   // 작업요소명
  order     Int      // 순서
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // ★★★ 위치 정보 (콘크리트 구조) ★★★
  rowIndex     Int      @default(0)  // 행 위치 (동적 증가)
  colIndex     Int      @default(3)  // 열 위치 (고정: 2=4M열, 3=L3열)

  // ★★★ 하이브리드 ID 시스템 필드 ★★★
  parentId     String?  // 부모 ID (모자관계 추적)
  mergeGroupId String?  // 병합 그룹 ID
  rowSpan      Int?     @default(1)
  colSpan      Int?     @default(1)  // 고정

  // Relations
  l2Structure   L2Structure    @relation(fields: [l2Id], references: [id], onDelete: Cascade)
  l3Functions   L3Function[]
  failureCauses FailureCause[]

  @@index([fmeaId])
  @@index([l1Id])
  @@index([l2Id])
  @@index([parentId])
  @@index([mergeGroupId])
  @@index([rowIndex])  // 행 위치 인덱스
  @@map("l3_structures")
}
```

---

## 3. 콘크리트 워크시트 구조

### 3.1 열 위치 상수 (COLUMN_INDEX) - 절대 변경 금지

```typescript
// ★★★ 절대 변경 금지 ★★★
const COLUMN_INDEX = {
  L1: 0,    // 완제품 공정명 (병합 확장)
  L2: 1,    // 메인 공정명 (병합 확장)
  M4: 2,    // 4M 분류
  L3: 3,    // 작업 요소명 (새 행 추가)
} as const;
```

### 3.2 ★★★ 핵심 규칙 ★★★

| 열 | 동작 | 설명 |
|----|------|------|
| **L1 (0열)** | 확장 병합 | 작업요소 추가 시 rowSpan 증가 |
| **L2 (1열)** | 확장 병합 | 작업요소 추가 시 rowSpan 증가 |
| **4M (2열)** | 새 행 추가 | 작업요소와 함께 새 행에 삽입 |
| **L3 (3열)** | 새 행 추가 | 무조건 아래로 행 추가 삽입 |

### 3.3 작업요소 추가 시 동작

```
[추가 전]
┌──────────┬──────────┬────┬──────────┐
│ L1       │ 10-컷팅  │ MC │ Cutting  │ 행1
│ (rs=2)   │ (rs=2)   │ MC │ 톱날     │ 행2
└──────────┴──────────┴────┴──────────┘

[작업자 추가]
┌──────────┬──────────┬────┬──────────┐
│ L1       │ 10-컷팅  │ MC │ Cutting  │ 행1
│ (rs=3)   │ (rs=3)   │ MC │ 톱날     │ 행2
│          │          │ MN │ 작업자   │ 행3 ← NEW ROW
└──────────┴──────────┴────┴──────────┘
```

### 3.4 금지 사항

❌ **절대 하면 안 되는 것:**
- L3 데이터를 L1/L2 열에 렌더링
- L2 공정명을 L3 작업요소 열에 렌더링
- 열 순서 변경
- 새 열 추가/삭제

✅ **허용되는 것:**
- L3에 새 행 추가
- L1/L2의 rowSpan 증가
- 같은 부모의 셀 병합

---

## 4. 배열 구조 및 데이터 흐름

### 4.1 TypeScript 타입 정의

```typescript
// L3 작업요소
export interface L3WorkElement {
  id: string;
  m4: M4Type;
  name: string;
  function?: string;
  requirement?: string;
  // ★★★ 콘크리트 구조: 위치 정보 ★★★
  rowIndex?: number;  // 행 위치 (동적)
  colIndex?: number;  // 열 위치 (고정: 3)
  causes?: FailureCause[];
}

// L2 메인공정
export interface L2Process {
  id: string;
  no: string;
  name: string;
  function?: string;
  requirement?: string;
  // ★★★ 콘크리트 구조: 위치 정보 ★★★
  rowIndex?: number;  // 행 위치 (동적)
  colIndex?: number;  // 열 위치 (고정: 1)
  l3: L3WorkElement[];
  failures?: FailureData[];
}

// L1 완제품공정
export interface L1Product {
  id: string;
  name: string;
  function?: string;
  // ★★★ 콘크리트 구조: 위치 정보 ★★★
  rowIndex?: number;  // 행 위치 (동적)
  colIndex?: number;  // 열 위치 (고정: 0)
}
```

### 4.2 평탄화(Flatten) 로직

```typescript
// 평탄화된 행 데이터 생성 + 위치 검증
const { flatRows, errors } = useMemo(() => {
  const rows: Array<{
    l1Id: string;
    l1Name: string;
    l2Id: string;
    l2Label: string;
    l3Id: string;
    m4: M4Type;
    l3Name: string;
    calculatedRowIndex: number;  // ★ 계산된 행 위치
  }> = [];
  
  let currentRowIndex = 0;

  l2List.forEach((proc) => {
    if (proc.l3.length === 0) {
      rows.push({ ... , calculatedRowIndex: currentRowIndex });
      currentRowIndex++;
    } else {
      proc.l3.forEach((work) => {
        rows.push({ ... , calculatedRowIndex: currentRowIndex });
        currentRowIndex++;
      });
    }
  });

  return { flatRows: rows, errors: validationErrors };
}, [l1, l2List]);
```

---

## 5. 위치 검증 시스템

### 5.1 검증 로직

```typescript
// ★ L1 위치 검증 (colIndex는 항상 0이어야 함)
if (l1.colIndex !== undefined && l1.colIndex !== COLUMN_INDEX.L1) {
  validationErrors.push({
    type: 'L1',
    id: l1.id,
    message: `L1 열 위치 불일치: 기대=${COLUMN_INDEX.L1}, 실제=${l1.colIndex}`,
    expectedCol: COLUMN_INDEX.L1,
    actualCol: l1.colIndex,
  });
}

// ★ L2 위치 검증 (colIndex는 항상 1이어야 함)
if (proc.colIndex !== undefined && proc.colIndex !== COLUMN_INDEX.L2) {
  validationErrors.push({
    type: 'L2',
    id: proc.id,
    message: `L2 열 위치 불일치: 기대=${COLUMN_INDEX.L2}, 실제=${proc.colIndex}`,
    expectedCol: COLUMN_INDEX.L2,
    actualCol: proc.colIndex,
  });
}

// ★ L3 위치 검증 (colIndex는 항상 3이어야 함)
if (work.colIndex !== undefined && work.colIndex !== COLUMN_INDEX.L3) {
  validationErrors.push({
    type: 'L3',
    id: work.id,
    message: `L3 열 위치 불일치: 기대=${COLUMN_INDEX.L3}, 실제=${work.colIndex}`,
    expectedCol: COLUMN_INDEX.L3,
    actualCol: work.colIndex,
  });
}
```

### 5.2 PositionError 인터페이스

```typescript
interface PositionError {
  type: 'L1' | 'L2' | 'L3';
  id: string;
  message: string;
  expectedRow: number;
  actualRow?: number;
  expectedCol: number;
  actualCol?: number;
}
```

---

## 6. 에러 메시지 시스템

### 6.1 에러 표시 UI

에러 발생 시 워크시트 상단에 표시:

```
┌─────────────────────────────────────────────────────────────────┐
│ ⚠️ 구조 무결성 오류 (2건) - 열(Column) 위치 불일치               │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [L3] L3 열 위치 불일치: 기대=3, 실제=5                       │ │
│ │ • ID: abc12345-6789-0abc-def0-123456789abc                  │ │
│ │ • 기대 열: 3 | 실제 열: 5                                    │ │
│ │ • 기대 행: 2 | 실제 행: 미정의                               │ │
│ │ 🔧 수정 방법: DB 테이블 l3_structures 에서 colIndex를 3     │ │
│ │    으로 변경                                                 │ │
│ │ 📁 파일: prisma/schema.prisma → API: api/fmea/route.ts      │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ 💡 해결 가이드:                                                  │
│ 1. 저장 로직에서 colIndex 값을 올바르게 설정하세요              │
│    (L1=0, L2=1, L3=3)                                          │
│ 2. 기존 데이터는 DB에서 직접 업데이트하거나 삭제 후 재생성      │
│ 3. 열은 절대 고정값입니다. 동적으로 변경되면 안 됩니다.          │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 에러 정보 상세

| 항목 | 설명 | 용도 |
|------|------|------|
| **type** | L1/L2/L3 | 어떤 레벨에서 오류 발생 |
| **id** | UUID | DB에서 해당 레코드 식별 |
| **message** | 상세 설명 | 문제 파악 |
| **expectedCol** | 기대 열 (0/1/3) | 정상 값 |
| **actualCol** | 실제 열 | 잘못된 값 |
| **expectedRow** | 기대 행 | 계산된 위치 |
| **actualRow** | 실제 행 | DB 저장 값 |

### 6.3 수정 가이드

| 에러 타입 | 수정 테이블 | 수정 필드 | 정상 값 |
|-----------|-------------|-----------|---------|
| L1 | `l1_structures` | `colIndex` | 0 |
| L2 | `l2_structures` | `colIndex` | 1 |
| L3 | `l3_structures` | `colIndex` | 3 |

---

## 7. 관련 파일 목록

### 7.1 스키마 파일
- `prisma/schema.prisma` - L1/L2/L3 Structure 모델 정의

### 7.2 컴포넌트 파일
- `src/components/worksheet/StructureAnalysis.tsx` - 구조분석 워크시트 컴포넌트
- `src/components/worksheet/types.ts` - 타입 정의

### 7.3 API 파일
- `src/app/api/fmea/route.ts` - FMEA 데이터 CRUD
- `src/app/api/fmea/projects/route.ts` - FMEA 프로젝트 관리

---

## 8. 병합(Merge) 규칙

### 8.1 병합 조건
- **같은 부모(parentId)** 를 가진 셀만 병합 가능
- **같은 mergeGroupId** 를 가진 셀은 병합 표시

### 8.2 rowSpan 계산

```typescript
const computeSpan = (rows: typeof flatRows, keyFn: (r) => string) => {
  const spans: number[] = new Array(rows.length).fill(0);
  let i = 0;
  while (i < rows.length) {
    const key = keyFn(rows[i]);
    let j = i + 1;
    while (j < rows.length && keyFn(rows[j]) === key) j++;
    spans[i] = j - i;  // ★ 연속된 같은 키 개수 = rowSpan
    for (let k = i + 1; k < j; k++) spans[k] = -1;  // ★ 병합된 셀은 렌더링 안 함
    i = j;
  }
  return spans.map((v) => (v < 0 ? 0 : v));
};

const l1Spans = computeSpan(flatRows, (r) => r.l1Id);  // L1 병합
const l2Spans = computeSpan(flatRows, (r) => r.l2Id);  // L2 병합
```

---

## 9. 4M 분류 시스템

### 9.1 4M 타입

```typescript
export type M4Type = 'MN' | 'MC' | 'IM' | 'EN';

export const M4_INFO: Record<M4Type, { label: string; color: string; bgColor: string }> = {
  MN: { label: 'Man',         color: '#1f4f86', bgColor: '#eef7ff' },
  MC: { label: 'Machine',     color: '#8a4f00', bgColor: '#fff3e6' },
  IM: { label: 'Material',    color: '#1b6b2a', bgColor: '#f0fff2' },
  EN: { label: 'Environment', color: '#7a1a88', bgColor: '#fef0ff' },
};
```

### 9.2 4M과 열 위치
- **4M은 L3의 속성**이지만 시각적으로 별도 열(colIndex=2)에 표시
- DB에는 L3Structure.m4 필드로 저장
- 렌더링 시 L3 행의 일부로 처리

---

## 10. 향후 개선 사항

### 10.1 저장 로직 수정
- 새 데이터 저장 시 colIndex 자동 설정
- rowIndex는 현재 최대값 + 1로 자동 증가

### 10.2 행 충돌 검증
- 같은 rowIndex에 다른 데이터가 있으면 에러

### 10.3 병합 검증
- mergeGroupId 기반 병합 규칙 검증

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0.0 | 2026-02-01 | 최초 작성 (콘크리트 구조 구현) |
