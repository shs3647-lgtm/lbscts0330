# FMEA Master Data 독립 DB 아키텍처 PRD

> **Version**: 1.0
> **Date**: 2026-02-16
> **Status**: 설계 확정

---

## 1. 배경 및 문제점

### 1.1 현재 구조
```
PfmeaMasterDataset (1개만 isActive=true)
  └─ PfmeaMasterFlatItem[] (모든 M/F/P의 데이터 혼합)
       └─ sourceFmeaId로만 소속 구분 (unique key에 미포함)
```

### 1.2 근본 문제
| # | 문제 | 영향 |
|---|------|------|
| 1 | **단일 Dataset에 모든 FMEA 데이터 혼합** | sourceFmeaId 누락 시 데이터 미귀속 |
| 2 | **unique key에 sourceFmeaId 미포함** | 다른 FMEA의 동일 값 저장 실패 (skipDuplicates) |
| 3 | **전체 데이터 로드 후 클라이언트 필터** | FMEA 증가 시 성능 저하 |
| 4 | **복사만 지원, 실시간 연동 없음** | Master 변경 시 하위 FMEA 수동 업데이트 필요 |
| 5 | **명칭 불명확** | "Basic Data"가 M/F/P 공통 → 구분 불가 |

---

## 2. 목표

1. **1 FMEA = 1 Dataset** — 데이터 완전 격리
2. **M/F/P 계층 연동** — 하위 FMEA가 상위 데이터 가져오기/동기화 가능
3. **명칭 통일** — MBD/FBD/PBD로 타입별 구분 명확화
4. **서버 필터링** — fmeaId 기준 API 조회 (전체 로드 제거)

---

## 3. 명칭 변경

### 3.1 Basic Data → 타입별 명칭

| 현재 | 변경 후 | 약칭 | 색상 |
|------|---------|------|------|
| Basic Data (공통) | **Master FMEA Data** | MBD | 🟣 Purple |
| Basic Data (공통) | **Family FMEA Data** | FBD | 🔵 Blue |
| Basic Data (공통) | **Part FMEA Basic Data** | PBD | 🟢 Green |

### 3.2 BD ID 변경

| 현재 | 변경 후 | 예시 |
|------|---------|------|
| `BD-M26-001` | `MBD-26-001` | Master |
| `BD-F26-001` | `FBD-26-001` | Family |
| `BD-P26-001` | `PBD-26-001` | Part |

---

## 4. DB 스키마 변경

### 4.1 PfmeaMasterDataset (변경)

```prisma
model PfmeaMasterDataset {
  id             String                @id @default(uuid())
  name           String
  fmeaId         String                @unique    // ★ 1 FMEA = 1 Dataset
  fmeaType       String                           // M | F | P
  parentFmeaId   String?                          // 상위 FMEA 연결
  isActive       Boolean               @default(true)
  version        Int                    @default(1) // 버전 관리
  relationData   Json?
  createdAt      DateTime              @default(now())
  updatedAt      DateTime              @updatedAt
  flatItems      PfmeaMasterFlatItem[]

  @@index([fmeaId])
  @@index([fmeaType])
  @@index([isActive])
  @@map("pfmea_master_datasets")
}
```

**변경 사항:**
- `fmeaId String @unique` 추가 — 1:1 매핑 보장
- `fmeaType String` 추가 — M/F/P 타입 저장
- `parentFmeaId String?` 추가 — 상속 체인 추적
- `version Int @default(1)` 추가 — 버전 관리 기반
- `isActive` 기본값 `true`로 변경 (각 FMEA별 독립이므로)

### 4.2 PfmeaMasterFlatItem (변경)

```prisma
model PfmeaMasterFlatItem {
  id           String             @id @default(uuid())
  datasetId    String
  processNo    String
  category     String                      // A | B | C
  itemCode     String                      // A1~A6, B1~B5, C1~C4
  value        String
  m4           String?                     // 4M 분류 (B1 전용)
  inherited    Boolean            @default(false)  // ★ 상위에서 가져온 데이터
  sourceId     String?                              // ★ 원본 dataset ID
  createdAt    DateTime           @default(now())
  dataset      PfmeaMasterDataset @relation(fields: [datasetId], references: [id], onDelete: Cascade)

  @@unique([datasetId, processNo, itemCode, value])
  @@index([datasetId])
  @@map("pfmea_master_flat_items")
}
```

**변경 사항:**
- `sourceFmeaId` 제거 (dataset 자체에 fmeaId가 있으므로 불필요)
- `inherited Boolean @default(false)` 추가 — 가져온 데이터 vs 직접 입력 구분
- `sourceId String?` 추가 — 원본 dataset ID (어디서 가져왔는지 추적)

### 4.3 DfmeaMasterDataset / DfmeaMasterFlatItem (동일 패턴)

DFMEA도 동일한 구조 변경 적용 (PFMEA와 대칭)

---

## 5. API 변경

### 5.1 GET /api/pfmea/master

**현재:** 단일 active dataset 전체 반환
**변경:** fmeaId 기준 해당 dataset만 반환

```
GET /api/pfmea/master?fmeaId=pfm26-m001&includeItems=true

Response: {
  dataset: {
    id: string
    fmeaId: string        // ★ NEW
    fmeaType: string      // ★ NEW
    parentFmeaId: string? // ★ NEW
    version: number       // ★ NEW
    name: string
    isActive: boolean
    flatItems?: FlatItem[]
  }
}
```

### 5.2 POST /api/pfmea/master

**변경:** fmeaId 필수, 해당 dataset에 저장

```
POST /api/pfmea/master
Body: {
  fmeaId: string          // ★ 필수 (1 FMEA = 1 Dataset)
  fmeaType: string        // ★ 필수 (M | F | P)
  parentFmeaId?: string   // 상위 FMEA 연결
  name?: string
  replace?: boolean
  replaceItemCodes?: string | string[]
  flatData: Array<{
    processNo: string
    category: string
    itemCode: string
    value: string
    m4?: string
    inherited?: boolean   // ★ NEW
    sourceId?: string     // ★ NEW
  }>
}
```

### 5.3 POST /api/pfmea/master/inherit (신규)

상위 FMEA 데이터를 하위로 가져오기

```
POST /api/pfmea/master/inherit
Body: {
  targetFmeaId: string    // 하위 FMEA ID
  sourceFmeaId: string    // 상위 FMEA ID
  itemCodes?: string[]    // 특정 항목만 (생략 시 전체)
  mode: 'copy' | 'sync'  // copy=덮어쓰기, sync=변경분만
}

Response: {
  success: boolean
  copiedCount: number
  updatedCount: number
  deletedCount: number
}
```

### 5.4 GET /api/pfmea/master/diff (신규)

상위 대비 차이 비교

```
GET /api/pfmea/master/diff?fmeaId=pfm26-p001

Response: {
  parentFmeaId: string
  added: FlatItem[]       // 하위에만 있는 항목
  modified: FlatItem[]    // 상위와 다른 값
  deleted: FlatItem[]     // 상위에는 있지만 하위에 없는 항목
  unchanged: number       // 동일 항목 수
}
```

---

## 6. 데이터 흐름

### 6.1 Master FMEA Data (MBD) 생성

```
1. FMEA 등록: fmeaType='M', fmeaId='pfm26-m001'
2. Import 페이지: Excel 업로드 → parseMultiSheetExcel()
3. 저장: POST /api/pfmea/master { fmeaId: 'pfm26-m001', fmeaType: 'M' }
4. DB: PfmeaMasterDataset { fmeaId: 'pfm26-m001', fmeaType: 'M' }
         └─ FlatItem[] (inherited=false, sourceId=null)
```

### 6.2 Family FMEA Data (FBD) 생성

```
1. FMEA 등록: fmeaType='F', fmeaId='pfm26-f001', parent='pfm26-m001'
2. Import 페이지: "상위에서 가져오기" 클릭
3. API: POST /api/pfmea/master/inherit {
     targetFmeaId: 'pfm26-f001',
     sourceFmeaId: 'pfm26-m001',
     mode: 'copy'
   }
4. DB: PfmeaMasterDataset { fmeaId: 'pfm26-f001', fmeaType: 'F', parentFmeaId: 'pfm26-m001' }
         ├─ FlatItem (inherited=true, sourceId='ds-master-xxx')  ← Master에서 복사
         └─ FlatItem (inherited=false, sourceId=null)            ← Family 고유 추가
```

### 6.3 Part FMEA Basic Data (PBD) 생성

```
1. FMEA 등록: fmeaType='P', fmeaId='pfm26-p001', parent='pfm26-f001'
2. Import 페이지: "상위에서 가져오기" 클릭
3. API: POST /api/pfmea/master/inherit {
     targetFmeaId: 'pfm26-p001',
     sourceFmeaId: 'pfm26-f001',
     mode: 'copy'
   }
4. DB: PfmeaMasterDataset { fmeaId: 'pfm26-p001', fmeaType: 'P', parentFmeaId: 'pfm26-f001' }
         ├─ FlatItem (inherited=true, sourceId='ds-family-xxx')  ← Family에서 복사
         └─ FlatItem (inherited=false, sourceId=null)            ← Part 고유 추가
```

### 6.4 계층 구조 예시

```
MBD-26-001 (pfm26-m001, Master)
  ├─ A1:10, A2:조립, B1:부품투입, ... (124건, 모두 own)
  │
  ├─→ FBD-26-001 (pfm26-f001, Family, parent=pfm26-m001)
  │     ├─ [inherited] A1:10, A2:조립, B1:부품투입, ... (124건, Master에서)
  │     ├─ [own] A2:도장, B1:도포 (6건, Family 고유)
  │     │
  │     ├─→ PBD-26-001 (pfm26-p001, Part, parent=pfm26-f001)
  │     │     ├─ [inherited] 130건 (Family에서)
  │     │     └─ [own] A2:연마 (2건, Part 고유)
  │     │
  │     └─→ PBD-26-002 (pfm26-p002, Part, parent=pfm26-f001)
  │           ├─ [inherited] 130건 (Family에서)
  │           └─ [own] B1:세척 (3건, Part 고유)
  │
  └─→ FBD-26-002 (pfm26-f002, Family, parent=pfm26-m001)
        ├─ [inherited] 124건 (Master에서)
        └─ [own] A2:가공 (4건)
```

---

## 7. Import 페이지 UI 변경

### 7.1 헤더 명칭

```
현재: ★ Basic Data : BD-F26-001 (15항목 124개)
변경: ★ Family FMEA Data : FBD-26-001 (15항목 124개)
```

타입별:
- Master: `★ Master FMEA Data : MBD-26-001 (15항목 124개)`
- Family: `★ Family FMEA Data : FBD-26-001 (15항목 130개)`
- Part:   `★ Part FMEA Basic Data : PBD-26-001 (12항목 98개)`

### 7.2 BD 현황 테이블

```
┌──────────┬─────────────┬──────┬──────┬─────────────────┐
│ 타입     │ Data ID     │ 항목 │ 데이터│ 상태            │
├──────────┼─────────────┼──────┼──────┼─────────────────┤
│ 🟣Master │ MBD-26-001  │  15  │ 124  │ ✅ 저장됨       │
│ 🔵Family │ FBD-26-001  │  15  │ 130  │ ✏️ 편집 중      │
│ 🟢Part   │ PBD-26-001  │  12  │  98  │ 🔄 동기화 필요  │
│ 🟢Part   │ PBD-26-002  │  14  │ 112  │ ✅ 저장됨       │
└──────────┴─────────────┴──────┴──────┴─────────────────┘
```

### 7.3 상위 데이터 가져오기 UI

```
┌──────────────────────────────────────────────┐
│ 📥 상위 데이터 가져오기                       │
│                                               │
│ 상위: MBD-26-001 (Master, 15항목 124개)      │
│                                               │
│ [전체 가져오기] [선택 항목만] [동기화]        │
│                                               │
│ ⚠️ 기존 데이터가 있으면 병합됩니다           │
└──────────────────────────────────────────────┘
```

---

## 8. 클라이언트 API 변경

### 8.1 master-api.ts

```typescript
// 현재
loadActiveMasterDataset(opts?: { sourceFmeaId?: string })
// → 전체 로드 후 클라이언트 필터

// 변경
loadDatasetByFmeaId(fmeaId: string)
// → 해당 FMEA의 dataset만 로드 (서버 필터)

// 신규
inheritFromParent(targetFmeaId: string, sourceFmeaId: string, mode: 'copy' | 'sync')
// → 상위 데이터 가져오기/동기화
```

### 8.2 bd-id.ts

```typescript
// 현재
fmeaIdToBdId('pfm26-m001') → 'BD-M26-001'

// 변경
fmeaIdToBdId('pfm26-m001') → 'MBD-26-001'
fmeaIdToBdId('pfm26-f001') → 'FBD-26-001'
fmeaIdToBdId('pfm26-p001') → 'PBD-26-001'
```

### 8.3 useMasterDataHandlers.ts

```typescript
// 현재: buildBdStatusList() → 전체 데이터에서 sourceFmeaId 그룹핑
// 변경: 각 FMEA별 dataset에서 직접 카운트 (서버 API 활용)

// 현재: loadActiveMasterDataset() → 전체 로드
// 변경: loadDatasetByFmeaId(selectedFmeaId) → 해당 FMEA만 로드
```

---

## 9. 마이그레이션 계획

### 9.1 기존 데이터 변환

```sql
-- Step 1: 기존 단일 dataset에서 sourceFmeaId별로 분리
-- sourceFmeaId가 있는 각 FMEA에 대해 새 dataset 생성

-- Step 2: 각 dataset에 fmeaId, fmeaType, parentFmeaId 설정
-- FmeaProject 테이블에서 관계 정보 가져옴

-- Step 3: sourceFmeaId 컬럼 제거 (dataset에 fmeaId가 있으므로)

-- Step 4: sourceFmeaId=null인 고아 데이터 정리
```

### 9.2 하위 호환성

- 마이그레이션 스크립트로 기존 데이터 자동 변환
- API 응답 형식은 하위 호환 유지
- 프론트엔드 코드 동시 변경

---

## 10. 영향 범위

### 10.1 변경 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `prisma/schema.prisma` | Dataset/FlatItem 모델 변경 |
| `src/app/api/pfmea/master/route.ts` | fmeaId 기준 CRUD |
| `src/app/api/dfmea/master/route.ts` | fmeaId 기준 CRUD |
| `src/app/api/pfmea/master/inherit/route.ts` | 신규: 상속 API |
| `src/app/api/dfmea/master/inherit/route.ts` | 신규: 상속 API |
| `src/app/pfmea/import/utils/master-api.ts` | loadDatasetByFmeaId() |
| `src/app/dfmea/import/utils/master-api.ts` | loadDatasetByFmeaId() |
| `src/app/pfmea/import/utils/bd-id.ts` | MBD/FBD/PBD 명칭 |
| `src/app/pfmea/import/hooks/useMasterDataHandlers.ts` | fmeaId 기준 로드 |
| `src/app/pfmea/import/components/ImportHeader.tsx` | 명칭 변경 |
| `src/app/pfmea/import/components/ImportPreviewPanel.tsx` | 명칭 변경 |
| `src/app/pfmea/import/page.tsx` | 독립 dataset 로드 |
| `src/app/dfmea/import/page.tsx` | 독립 dataset 로드 |
| `src/app/api/trash/route.ts` | dataset 삭제 로직 변경 |
| `scripts/migrate-master-data.ts` | 신규: 마이그레이션 스크립트 |

### 10.2 변경하지 않는 파일

- 워크시트 관련 (useWorksheetDataLoader.ts 등) — 영향 없음
- Control Plan 연동 — 영향 없음
- PFD 연동 — 영향 없음
- useRelationHandlers.ts — sourceFmeaId 제거 후 단순화

---

## 11. 구현 순서

| 단계 | 작업 | 우선도 |
|------|------|--------|
| **1** | DB 스키마 변경 + Prisma generate | 🔴 |
| **2** | 마이그레이션 스크립트 작성/실행 | 🔴 |
| **3** | PFMEA Master API 변경 (GET/POST/DELETE) | 🔴 |
| **4** | DFMEA Master API 변경 (동일 패턴) | 🔴 |
| **5** | client master-api.ts 변경 (PFMEA + DFMEA) | 🔴 |
| **6** | bd-id.ts 명칭 변경 (MBD/FBD/PBD) | 🟡 |
| **7** | useMasterDataHandlers.ts 리팩토링 | 🟡 |
| **8** | Import 페이지 UI 명칭 변경 | 🟡 |
| **9** | Inherit API 구현 (상속/동기화) | 🟡 |
| **10** | trash API 변경 (fmeaId 기준 삭제) | 🟡 |
| **11** | 타입체크 + 커밋 | 🔴 |
