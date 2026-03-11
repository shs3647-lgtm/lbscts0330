# CP 원자성 DB 구축 마스터 플랜

> **버전**: 1.0.0  
> **작성일**: 2026-01-14  
> **상태**: 계획 수립 중  
> **벤치마킹**: FMEA 원자성 DB 구조

---

## 📋 목차

1. [개요](#개요)
2. [FMEA 벤치마킹 분석](#fmea-벤치마킹-분석)
3. [CP 원자성 DB 스키마 설계](#cp-원자성-db-스키마-설계)
4. [인덱싱 규칙 (하이브리드 ID)](#인덱싱-규칙-하이브리드-id)
5. [구현 계획 (단계별)](#구현-계획-단계별)
6. [모듈화 원칙 적용](#모듈화-원칙-적용)
7. [상호 연동 (FMEA/CP/PFD/WS/PM)](#상호-연동-fmeacppfdwspm)
8. [CP 마스터 플랜 반영](#cp-마스터-플랜-반영)

---

## 개요

### 목적
- FMEA를 벤치마킹하여 CP에도 원자성 DB 구축
- 기초정보와 워크시트 분석 결과를 모두 원자성 DB에 저장
- CP 등록, 리스트, 개정관리, 모든 화면을 DB 원자성으로 관리
- 모듈화 원칙 준수 (500줄 이하)

### 핵심 원칙
1. **원자성**: 모든 데이터를 원자 단위로 저장
2. **하이브리드 ID**: 행/열/병합/상위정보를 인덱스에 반영
3. **모듈화**: 모든 파일 500줄 이하
4. **벤치마킹**: FMEA 구조를 100% 참조
5. **상호 연동**: FMEA, CP, PFD, WS, PM 간 데이터 연동

---

## FMEA 벤치마킹 분석

### FMEA 원자성 DB 구조

#### 테이블 구조
```
FMEA 원자성 테이블:
├── l1_structures (완제품 공정명)
├── l2_structures (메인 공정)
├── l3_structures (작업요소)
├── l1_functions (완제품 기능)
├── l2_functions (공정 기능)
├── l3_functions (작업요소 기능)
├── failure_effects (고장영향)
├── failure_modes (고장형태)
├── failure_causes (고장원인)
├── failure_links (고장연결)
├── risk_analyses (리스크분석)
└── optimizations (최적화)
```

#### 하이브리드 ID 형식 (FMEA 참조)
```
ID 형식: {FMEA_SEQ}-{TYPE}-{SEQ}
경로 정보: {LEVEL}{NO}{CHILD}

예시:
- L2 구조: M001-P001 (M001의 1번째 공정)
- L3 구조: M001-P001W001 (M001의 P001 공정의 1번째 작업요소)
- 기능: M001-P001F001 (M001의 P001 공정의 1번째 기능)
- 고장형태: M001-P001FM001 (M001의 P001 공정의 1번째 고장형태)
```

#### 인덱싱 규칙 (FMEA)
- **행 인덱스**: `rowIndex`, `order`, `sortOrder`
- **열 인덱스**: `colIndex`, `category`, `itemCode`
- **병합 정보**: `mergeGroupId`, `rowSpan`, `colSpan`, `parentId`
- **상위 정보**: `parentId`, `l1Id`, `l2Id`, `l3Id`, `fmeaId`

---

## CP 원자성 DB 스키마 설계

### 기존 CP 스키마 (Prisma)
```
현재 구조:
├── CpRegistration (기본정보)
├── CpProcess (공정현황)
├── CpDetector (검출장치)
├── CpControlItem (관리항목)
├── CpControlMethod (관리방법)
└── CpReactionPlan (대응계획)
```

### CP 원자성 테이블 설계 (FMEA 벤치마킹)

#### 1. CP 워크시트 원자성 테이블 (신규 추가 필요)
```
CpWorksheetAtomic:
├── cp_atomic_processes (공정현황 원자성)
├── cp_atomic_detectors (검출장치 원자성)
├── cp_atomic_control_items (관리항목 원자성)
├── cp_atomic_control_methods (관리방법 원자성)
├── cp_atomic_reaction_plans (대응계획 원자성)
├── cp_atomic_merge_groups (셀 병합 정보)
└── cp_confirmed_states (확정 상태)
```

#### 2. CP 기초정보 원자성 테이블 (Import 데이터용)
```
CpMasterData:
├── cp_master_datasets (CP 마스터 데이터셋)
└── cp_master_flat_items (CP 마스터 플랫 아이템)
```

### Prisma 스키마 추가 필요 항목

```prisma
// ============ CP 원자성 워크시트 테이블 ============

// CP 공정 원자성 (L1: CpProcess)
model CpAtomicProcess {
  id            String   @id // 하이브리드 ID: {CP_SEQ}-P{SEQ}
  cpNo          String   // FK: cp_registrations.cpNo
  processNo     String   // 공정번호
  processName   String   // 공정명
  level         String?  // Main | Sub
  processDesc   String?  // 공정설명
  equipment     String?  // 설비/금형/지그
  workElement   String?  // 작업요소
  sortOrder     Int      @default(0)
  rowIndex      Int?     // 행 인덱스
  mergeGroupId  String?  // 병합 그룹 ID
  parentId      String?  // 상위 ID (병합 시)
  rowSpan       Int      @default(1)
  colSpan       Int      @default(1)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Relations
  registration  CpRegistration @relation(fields: [cpNo], references: [cpNo], onDelete: Cascade)
  detectors     CpAtomicDetector[]
  controlItems  CpAtomicControlItem[]
  controlMethods CpAtomicControlMethod[]
  reactionPlans CpAtomicReactionPlan[]
  
  @@unique([cpNo, processNo])
  @@index([cpNo])
  @@index([mergeGroupId])
  @@map("cp_atomic_processes")
}

// CP 검출장치 원자성 (L2: CpDetector)
model CpAtomicDetector {
  id            String   @id // 하이브리드 ID: {CP_SEQ}-P{SEQ}-D{SEQ}
  cpNo          String   // FK
  processNo     String   // FK
  processId     String   // FK: cp_atomic_processes.id
  ep            String?  // EP
  autoDetector  String?  // 자동검사장치
  sortOrder     Int      @default(0)
  rowIndex      Int?
  colIndex      Int?     // 컬럼 인덱스 (검출장치 그룹 내)
  mergeGroupId  String?
  parentId      String?  // 상위 공정 ID
  rowSpan       Int      @default(1)
  colSpan       Int      @default(1)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Relations
  process       CpAtomicProcess @relation(fields: [processId], references: [id], onDelete: Cascade)
  
  @@index([cpNo, processNo])
  @@index([processId])
  @@map("cp_atomic_detectors")
}

// CP 관리항목 원자성 (L3: CpControlItem)
model CpAtomicControlItem {
  id            String   @id // 하이브리드 ID: {CP_SEQ}-P{SEQ}-CI{SEQ}
  cpNo          String   // FK
  processNo     String   // FK
  processId     String   // FK
  productChar   String?  // 제품특성
  processChar   String?  // 공정특성
  specialChar   String?  // 특별특성
  spec          String?  // 스펙/공차
  sortOrder     Int      @default(0)
  rowIndex      Int?
  colIndex      Int?     // 컬럼 인덱스 (관리항목 그룹 내)
  mergeGroupId  String?
  parentId      String?  // 상위 공정 ID
  rowSpan       Int      @default(1)
  colSpan       Int      @default(1)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Relations
  process       CpAtomicProcess @relation(fields: [processId], references: [id], onDelete: Cascade)
  
  @@index([cpNo, processNo])
  @@index([processId])
  @@map("cp_atomic_control_items")
}

// CP 관리방법 원자성 (L4: CpControlMethod)
model CpAtomicControlMethod {
  id            String   @id // 하이브리드 ID: {CP_SEQ}-P{SEQ}-CM{SEQ}
  cpNo          String   // FK
  processNo     String   // FK
  processId     String   // FK
  evalMethod    String?  // 평가방법
  sampleSize    String?  // 샘플크기
  frequency     String?  // 주기
  owner1        String?  // 책임1
  owner2        String?  // 책임2
  sortOrder     Int      @default(0)
  rowIndex      Int?
  colIndex      Int?     // 컬럼 인덱스 (관리방법 그룹 내)
  mergeGroupId  String?
  parentId      String?  // 상위 공정 ID
  rowSpan       Int      @default(1)
  colSpan       Int      @default(1)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Relations
  process       CpAtomicProcess @relation(fields: [processId], references: [id], onDelete: Cascade)
  
  @@index([cpNo, processNo])
  @@index([processId])
  @@map("cp_atomic_control_methods")
}

// CP 대응계획 원자성 (L5: CpReactionPlan)
model CpAtomicReactionPlan {
  id            String   @id // 하이브리드 ID: {CP_SEQ}-P{SEQ}-RP{SEQ}
  cpNo          String   // FK
  processNo     String   // FK
  processId     String   // FK
  productChar   String?  // 제품특성
  processChar   String?  // 공정특성
  reactionPlan  String?  // 대응계획
  sortOrder     Int      @default(0)
  rowIndex      Int?
  colIndex      Int?
  mergeGroupId  String?
  parentId      String?  // 상위 공정 ID
  rowSpan       Int      @default(1)
  colSpan       Int      @default(1)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Relations
  process       CpAtomicProcess @relation(fields: [processId], references: [id], onDelete: Cascade)
  
  @@index([cpNo, processNo])
  @@index([processId])
  @@map("cp_atomic_reaction_plans")
}

// CP 확정 상태 (단계별 확정)
model CpConfirmedState {
  id                String   @id @default(uuid())
  cpNo              String   @unique // FK: cp_registrations.cpNo
  processConfirmed  Boolean  @default(false)  // 공정현황 확정
  detectorConfirmed Boolean  @default(false)  // 검출장치 확정
  controlItemConfirmed Boolean @default(false) // 관리항목 확정
  controlMethodConfirmed Boolean @default(false) // 관리방법 확정
  reactionPlanConfirmed Boolean @default(false)  // 대응계획 확정
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@index([cpNo])
  @@map("cp_confirmed_states")
}

// CP 마스터 데이터 (Import용)
model CpMasterDataset {
  id          String   @id @default(uuid())
  name        String   // 데이터셋 이름
  isActive    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  flatItems   CpMasterFlatItem[]
  
  @@index([name])
  @@index([isActive])
  @@map("cp_master_datasets")
}

model CpMasterFlatItem {
  id          String   @id @default(uuid())
  datasetId   String   // FK: cp_master_datasets.id
  processNo   String   // 공정번호
  category    String   // 카테고리
  itemCode    String   // 아이템 코드
  value       String   // 값
  createdAt   DateTime @default(now())
  
  dataset     CpMasterDataset @relation(fields: [datasetId], references: [id], onDelete: Cascade)
  
  @@index([datasetId])
  @@index([processNo])
  @@index([category])
  @@index([itemCode])
  @@map("cp_master_flat_items")
}
```

---

## 인덱싱 규칙 (하이브리드 ID)

### CP 하이브리드 ID 형식 (FMEA 벤치마킹)

```
기본 형식: {CP_SEQ}-{TYPE}-{SEQ}
경로 정보: {LEVEL}{NO}{CHILD}

예시:
- 공정: CP001-P001 (CP001의 1번째 공정)
- 검출장치: CP001-P001D001 (CP001의 P001 공정의 1번째 검출장치)
- 관리항목: CP001-P001CI001 (CP001의 P001 공정의 1번째 관리항목)
- 관리방법: CP001-P001CM001 (CP001의 P001 공정의 1번째 관리방법)
- 대응계획: CP001-P001RP001 (CP001의 P001 공정의 1번째 대응계획)
```

### 인덱싱 필드

#### 행 인덱스
- `rowIndex`: 화면상의 행 위치
- `sortOrder`: 정렬 순서
- `order`: 순서 (레거시 호환)

#### 열 인덱스
- `colIndex`: 컬럼 그룹 내 인덱스
- `category`: 카테고리 (processInfo, detector, controlItem, controlMethod, reactionPlan)
- `itemCode`: 아이템 코드 (processNo, processName, productChar 등)

#### 병합 정보
- `mergeGroupId`: 병합 그룹 ID (같은 그룹 = 같은 mergeGroupId)
- `parentId`: 상위 ID (병합된 셀의 부모)
- `rowSpan`: 행 병합 개수
- `colSpan`: 열 병합 개수

#### 상위 정보
- `cpNo`: CP 번호 (최상위)
- `processId`: 공정 ID (부모)
- `processNo`: 공정번호 (참조용)
- `pfmeaRowUid`: PFMEA 행 UID (FMEA 연동)

---

## 구현 계획 (단계별)

### Phase 1: DB 스키마 구축 (1주)

#### 1.1 Prisma 스키마 추가
- [ ] `CpAtomicProcess` 모델 추가
- [ ] `CpAtomicDetector` 모델 추가
- [ ] `CpAtomicControlItem` 모델 추가
- [ ] `CpAtomicControlMethod` 모델 추가
- [ ] `CpAtomicReactionPlan` 모델 추가
- [ ] `CpConfirmedState` 모델 추가
- [ ] `CpMasterDataset` 모델 추가
- [ ] `CpMasterFlatItem` 모델 추가
- [ ] 마이그레이션 실행

#### 1.2 타입 정의 (TypeScript)
- [ ] `src/app/control-plan/worksheet/schema.ts` 생성 (FMEA 벤치마킹)
- [ ] `src/app/control-plan/worksheet/types.ts` 생성
- [ ] 하이브리드 ID 생성/파싱 함수 (FMEA 참조)

### Phase 2: 기초정보 DB 저장 (1주)

#### 2.1 CP Import DB 저장 API
- [ ] `src/app/api/control-plan/master/route.ts` 생성 (PFMEA 벤치마킹)
- [ ] `src/app/control-plan/import/utils/cp-master-api.ts` 생성
- [ ] CP Import 페이지 DB 저장 로직 추가

#### 2.2 모듈화 (500줄 이하)
- [ ] Import 페이지 모듈화 (현재 777줄 → 500줄 이하)
- [ ] 컴포넌트 분리
- [ ] 훅 분리
- [ ] 유틸리티 분리

### Phase 3: 워크시트 원자성 DB (2주)

#### 3.1 워크시트 원자성 저장 API
- [ ] `src/app/api/control-plan/worksheet/atomic/route.ts` 생성
- [ ] `src/app/api/control-plan/worksheet/confirmed/route.ts` 생성
- [ ] 마이그레이션 함수 (레거시 → 원자성)

#### 3.2 워크시트 입력 모달 DB 연동
- [ ] 입력 모달에서 DB 저장
- [ ] 확정 시 원자성 DB 생성
- [ ] 셀 병합 정보 원자성 보관

#### 3.3 인덱싱 구현
- [ ] 하이브리드 ID 생성 함수
- [ ] 행/열/병합 인덱스 계산
- [ ] 상위 정보 인덱싱

### Phase 4: 확정 → DB 생성 (1주)

#### 4.1 확정 프로세스
- [ ] CP 워크시트 확정 버튼 → 원자성 DB 저장
- [ ] 확정 상태 관리 (`CpConfirmedState`)
- [ ] 확정 후 수정 불가 처리

### Phase 5: 상호 연동 (2주)

#### 5.1 FMEA ↔ CP 연동
- [ ] PFMEA 행 UID 매핑
- [ ] CP 확정 → FMEA 알림
- [ ] FMEA 변경 → CP 동기화

#### 5.2 PFD/WS/PM 연동 (향후)
- [ ] 데이터 연동 구조 설계
- [ ] API 엔드포인트 정의

### Phase 6: 모든 화면 DB 연동 (1주)

#### 6.1 CP 등록 화면
- [ ] DB 저장 확인 (이미 완료)
- [ ] 원자성 검증

#### 6.2 CP 리스트 화면
- [ ] DB 조회 확인
- [ ] 원자성 데이터 표시

#### 6.3 CP 개정관리
- [ ] 개정 이력 DB 저장
- [ ] 원자성 데이터 버전 관리

---

## 모듈화 원칙 적용

### 파일 구조 (FMEA 벤치마킹)

```
src/app/control-plan/
├── import/
│   ├── page.tsx                    # ~250줄 (메인)
│   ├── components/                 # UI 컴포넌트
│   ├── hooks/                      # 커스텀 훅
│   ├── utils/                      # 유틸리티
│   │   └── cp-master-api.ts        # DB 저장 API (~100줄)
│   └── schema.ts                   # 타입 정의
│
├── worksheet/
│   ├── page.tsx                    # ~250줄 (메인)
│   ├── schema.ts                   # 원자성 스키마 (~200줄)
│   ├── types.ts                    # 타입 정의 (~100줄)
│   ├── migration.ts                # 마이그레이션 (~300줄)
│   ├── components/                 # UI 컴포넌트
│   ├── hooks/                      # 커스텀 훅
│   │   └── useWorksheetState.ts    # 상태 관리 (~200줄)
│   └── utils/                      # 유틸리티
│       ├── atomic-api.ts           # 원자성 API (~150줄)
│       └── indexing.ts             # 인덱싱 함수 (~100줄)
│
└── register/
    └── page.tsx                    # (기존)
```

### 파일 라인 수 제한
- **메인 파일**: 250줄 이하 (page.tsx)
- **스키마/타입**: 300줄 이하
- **API/유틸리티**: 150줄 이하
- **훅**: 200줄 이하
- **컴포넌트**: 150줄 이하

---

## 상호 연동 (FMEA/CP/PFD/WS/PM)

### 연동 구조

```
FMEA (Single Source of Truth)
    ↓
CP (관리 실행 문서)
    ↓
PFD (공정흐름도)
    ↓
WS (워크시트)
    ↓
PM (프로젝트 관리)
```

### 연동 데이터 매핑

| FMEA | CP | PFD | WS | PM |
|------|----|-----|----|----|
| 공정번호 | 공정번호 | 공정번호 | 공정번호 | 프로젝트 ID |
| 공정명 | 공정명 | 공정명 | 공정명 | 프로젝트명 |
| 작업요소 | 작업요소 | - | - | - |
| 제품특성 | 제품특성 | - | - | - |
| 공정특성 | 공정특성 | - | - | - |
| 심각도 | 참조 | - | - | - |
| AP | 참조 | - | - | - |

---

## CP 마스터 플랜 반영

### `docs/CP_MASTER_PLAN.md` 업데이트 필요

#### 추가 섹션
1. **원자성 DB 구조**
   - 테이블 목록
   - 인덱싱 규칙
   - 하이브리드 ID 형식

2. **DB 저장 프로세스**
   - 기초정보 저장
   - 워크시트 확정 → DB 생성
   - 셀 병합 원자성 보관

3. **상호 연동**
   - FMEA ↔ CP 연동
   - 데이터 동기화 규칙

---

## 다음 단계

1. **FMEA 코드 상세 분석** (하이브리드 ID 생성/파싱 함수)
2. **Prisma 스키마 작성** (위 설계 반영)
3. **타입 정의 작성** (schema.ts, types.ts)
4. **Phase 1 시작** (DB 스키마 구축)

---

## 참조 문서

- `docs/CP_MASTER_PLAN.md`: CP 전체 마스터 플랜
- `docs/중요_ONPREMISE_MASTER_PLAN.md`: DB 구축 상태
- `src/app/pfmea/worksheet/schema.ts`: FMEA 원자성 스키마
- `src/app/pfmea/worksheet/migration.ts`: FMEA 마이그레이션
- `prisma/schema.prisma`: Prisma 스키마

