# PFMEA → CP 연동 PRD

> **작성일**: 2026-02-03  
> **버전**: 1.0.0  
> **상태**: Draft

---

## 1. 개요

### 1.1 목적
PFMEA 워크시트에서 **기존 연동된 CP**에 데이터를 자동으로 채워넣는 기능을 구현합니다.
> ⚠️ **중요**: 새로운 CP를 생성하는 것이 아니라, FMEA 등록 시 설정된 `linkedCpNo`에 해당하는 CP에 연동합니다.

### 1.2 연동 CP 식별

```typescript
// FMEA 등록 정보에서 연동 CP 조회
FmeaRegistration.linkedCpNo → ControlPlan.cpNo
```

| FMEA 필드 | CP 필드 | 설명 |
|----------|---------|------|
| `FmeaRegistration.linkedCpNo` | `ControlPlan.cpNo` | 연동 대상 CP 번호 |
| `FmeaProject.fmeaId` | `ControlPlan.fmeaId` | FMEA 프로젝트 ID |

> **★ 핵심**: FMEA 등록 시 이미 연동된 CP가 있어야만 연동 가능. 없으면 먼저 등록화면에서 CP 연동 설정 필요.

### 1.3 활성화 조건
- **linkedCpNo가 설정됨** - FMEA 등록 시 CP 연동 설정 완료
- **3L 원인분석(고장원인) 확정** 후 CP 연동 버튼 활성화
- `failureL3Confirmed === true` 조건 충족 시

### 1.4 핵심 원칙
1. **기존 CP에 연동**: 새로 CP 생성 ❌, `linkedCpNo` 대상 CP에 데이터 채움 ✅
2. **원자성 데이터 기반**: FMEA에 저장된 원자성 ID 정보 활용
3. **순차적 연동**: 구조 → 제품특성 → 공정특성 → 특별특성 순서
4. **상위 병합 확장**: 제품특성 추가 시 상위 공정정보는 자동 병합
5. **사용자 승인**: 각 단계마다 확인 후 진행

---

## 2. 데이터 매핑

### 2.1 PFMEA → CP 필드 매핑 (단계별)

#### 🏗️ 1단계: 구조분석 (기초 구조)
| PFMEA 소스 | CP 필드 | 비고 |
|-----------|---------|------|
| L2.no | processNo | 공정번호 |
| L2.name | processName | 공정명 |
| L2.level | processLevel | Main/Sub |
| L3.m4 | equipment | 설비/금형/지그 (4M) |
| L3.name | workElement | 작업요소 |

#### 🔧 2단계: 기능분석 - 2L (메인공정기능 + 제품특성)
| PFMEA 소스 | CP 필드 | 비고 |
|-----------|---------|------|
| L2.functions[].name | processDesc | 공정설명 (메인공정기능) |
| L2.functions[].productChars[].name | productChar | 제품특성 |
| L2.functions[].productChars[].specialChar | specialChar | 제품 특별특성 (CC/SC) |

> **병합 규칙**: 제품특성 수만큼 행 추가, 상위 공정번호/공정명 병합 확장

#### ⚙️ 3단계: 기능분석 - 3L (작업요소기능 + 공정특성)
| PFMEA 소스 | CP 필드 | 비고 |
|-----------|---------|------|
| L3.functions[].name | (연동 안함) | 작업요소 기능 |
| L3.processChars[].name | processChar | 공정특성 |
| L3.processChars[].specialChar | specialChar | 공정 특별특성 (CC/SC) |

> **병합 규칙**: 공정특성 수만큼 행 추가, 상위 제품특성/공정명 병합 확장

#### ⭐ 4단계: 특별특성 연동
| PFMEA 소스 | CP 필드 | 비고 |
|-----------|---------|------|
| riskData.specialChar-{fmId}-{fcId} | specialChar | CC/SC/IC |

### 2.2 병합 규칙 (상위 확장)

```
┌────────────────────────────────────────────────────────────────┐
│ 공정번호/공정명     → L2 레벨 병합 (모든 하위 행에 동일)        │
│ 설비/금형/지그      → L3 레벨 병합 (작업요소 단위)             │
│ 공정설명(기능)      → Function 레벨 병합                      │
│ 제품특성           → ProductChar 수만큼 행 생성               │
│ 공정특성           → ProcessChar 수만큼 행 생성               │
│ 작업요소           → L3 레벨 병합                            │
└────────────────────────────────────────────────────────────────┘

★ 핵심: 하위 데이터(제품특성, 공정특성) 추가 시 상위 부모 셀이 자동 병합 확장
```

### 2.3 원자성 데이터 스키마 (FMEA 저장 기준)

#### 📦 CP 연동용 원자성 ID 구조

```typescript
interface FmeaAtomicRow {
  // ===== 고유 식별자 (FMEA에서 저장) =====
  rowUid: string;           // 행 고유 ID: `${fmeaId}-${l2Id}-${funcId}-${pcId}-${l3Id}-${procCharId}`
  fmeaId: string;           // FMEA 프로젝트 ID
  
  // ===== 구조분석 ID (1단계) =====
  l2Id: string;             // L2 공정 ID
  l3Id: string;             // L3 작업요소 ID
  
  // ===== 기능분석 ID (2L - 2단계) =====
  funcId: string;           // L2.functions[].id (공정기능 ID)
  productCharId: string;    // L2.functions[].productChars[].id (제품특성 ID)
  
  // ===== 기능분석 ID (3L - 3단계) =====
  l3FuncId?: string;        // L3.functions[].id (작업요소 기능 ID)
  processCharId?: string;   // L3.processChars[].id (공정특성 ID)
  
  // ===== 고장분석 ID =====
  fmId?: string;            // FailureMode ID
  feId?: string;            // FailureEffect ID
  fcId?: string;            // FailureCause ID
  
  // ===== 데이터 값 =====
  processNo: string;        // 공정번호 (L2.no)
  processName: string;      // 공정명 (L2.name)
  processLevel?: string;    // Main/Sub
  equipment?: string;       // 설비/금형/지그 (L3.m4)
  workElement?: string;     // 작업요소 (L3.name)
  processDesc?: string;     // 공정설명 (L2.functions[].name)
  productChar?: string;     // 제품특성 (L2.functions[].productChars[].name)
  processChar?: string;     // 공정특성 (L3.processChars[].name)
  specialChar?: string;     // 특별특성 (CC/SC/IC)
  
  // ===== 병합 정보 =====
  l2RowSpan?: number;       // L2 레벨 병합 수
  funcRowSpan?: number;     // 기능 레벨 병합 수
  productCharRowSpan?: number; // 제품특성 레벨 병합 수
  l3RowSpan?: number;       // L3 레벨 병합 수
  
  // ===== 메타 =====
  sortOrder: number;        // 정렬 순서
  createdAt?: string;       // 생성일
  updatedAt?: string;       // 수정일
}
```

#### 🔗 ID 생성 규칙

```typescript
// rowUid 생성 함수
function generateRowUid(
  fmeaId: string,
  l2Id: string,
  funcId: string,
  productCharId: string,
  l3Id: string,
  processCharId: string
): string {
  return `${fmeaId}-${l2Id}-${funcId}-${productCharId}-${l3Id}-${processCharId}`;
}

// 예시: "pfm26-m001-l2-001-func-001-pc-001-l3-001-pchar-001"
```

#### 📊 DB 스키마 (Prisma)

```prisma
model FmeaAtomicData {
  id              String   @id @default(uuid())
  rowUid          String   @unique  // 복합 고유 ID
  fmeaId          String   // FK: FMEA 프로젝트 ID
  
  // 구조분석 ID
  l2Id            String   // L2 공정 ID
  l3Id            String?  // L3 작업요소 ID
  
  // 기능분석 ID (2L)
  funcId          String?  // 공정기능 ID
  productCharId   String?  // 제품특성 ID
  
  // 기능분석 ID (3L)
  l3FuncId        String?  // 작업요소 기능 ID
  processCharId   String?  // 공정특성 ID
  
  // 고장분석 ID
  fmId            String?  // FailureMode ID
  feId            String?  // FailureEffect ID
  fcId            String?  // FailureCause ID
  
  // 데이터 값
  processNo       String   // 공정번호
  processName     String   // 공정명
  processLevel    String?  // Main/Sub
  equipment       String?  // 설비/금형/지그
  workElement     String?  // 작업요소
  processDesc     String?  // 공정설명 (메인공정기능)
  productChar     String?  // 제품특성
  processChar     String?  // 공정특성
  specialChar     String?  // 특별특성 (CC/SC/IC)
  
  // 병합 정보
  l2RowSpan       Int      @default(1)
  funcRowSpan     Int      @default(1)
  productCharRowSpan Int   @default(1)
  l3RowSpan       Int      @default(1)
  
  // 메타
  sortOrder       Int      @default(0)
  syncStatus      String   @default("pending")  // pending | synced | error
  cpItemId        String?  // 연동된 CP Item ID
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([fmeaId])
  @@index([l2Id])
  @@index([l3Id])
  @@index([fmId])
  @@index([cpItemId])
  @@map("fmea_atomic_data")
}
```

### 2.4 원자성 데이터 생성 시점

| 시점 | 트리거 | 생성 데이터 |
|-----|-------|-----------|
| **구조분석 저장** | L2/L3 저장 | l2Id, l3Id, processNo, processName, equipment, workElement |
| **2L 기능분석 저장** | functions 저장 | funcId, productCharId, processDesc, productChar |
| **3L 기능분석 저장** | processChars 저장 | l3FuncId, processCharId, processChar |
| **고장분석 저장** | failureLinks 저장 | fmId, feId, fcId |
| **특별특성 저장** | riskData 저장 | specialChar |

> **★ 핵심**: 각 단계 저장 시 원자성 데이터가 자동 생성/업데이트 → CP 연동 시 이 데이터 기반으로 동작


### 2.5 조합 예시

**PFMEA 데이터:**
```json
{
  "L2": {
    "no": "10",
    "name": "커팅",
    "functions": [
      {
        "name": "절단",
        "productChars": ["재질", "두께"]
      }
    ],
    "l3": [
      {
        "name": "커팅MC",
        "m4": "MC",
        "processChars": ["절단정밀도", "절단속도"]
      }
    ]
  }
}
```

**CP 생성 결과:**

| processNo | processName | processDesc | productChar | processChar | workElement | equipment |
|-----------|-------------|-------------|-------------|-------------|-------------|-----------|
| 10 | 커팅 | 절단 | 재질 | 절단정밀도 | 커팅MC | MC |
| ↑ 병합 | ↑ 병합 | ↑ 병합 | 두께 | 절단정밀도 | 커팅MC | MC |
| ↑ 병합 | ↑ 병합 | ↑ 병합 | 재질 | 절단속도 | 커팅MC | MC |
| ↑ 병합 | ↑ 병합 | ↑ 병합 | 두께 | 절단속도 | 커팅MC | MC |

**총 행 수**: 제품특성(2) × 공정특성(2) = **4행**

---

## 3. 사용자 플로우

### 3.1 버튼 위치
- **PFMEA 워크시트 헤더** 또는 **전체보기(ALL) 탭**
- 3L 원인분석 확정 전: 버튼 비활성화 (회색)
- 3L 원인분석 확정 후: 버튼 활성화 (파란색)

### 3.2 순차 연동 단계

```
[CP 연동] 버튼 클릭
         ↓
┌─────────────────────────────────────────┐
│  📦 1단계: 원자성 데이터 생성            │
│  "PFMEA 데이터를 CP 형식으로 변환합니다" │
│  - 공정: 5건                            │
│  - 제품특성: 12건                       │
│  - 공정특성: 8건                        │
│  [확인] [취소]                          │
└─────────────────────────────────────────┘
         ↓ 확인
┌─────────────────────────────────────────┐
│  🏭 2단계: 구조 연동                    │
│  "공정번호, 공정명, 설비 5건 연동"       │
│  [확인] [취소]                          │
└─────────────────────────────────────────┘
         ↓ 확인
┌─────────────────────────────────────────┐
│  📋 3단계: 제품특성 연동                 │
│  "제품특성 12건 추가 (상위 공정 병합)"   │
│  [확인] [취소]                          │
└─────────────────────────────────────────┘
         ↓ 확인
┌─────────────────────────────────────────┐
│  ⚙️ 4단계: 공정특성 연동                 │
│  "공정특성 8건 매핑 완료"                │
│  [확인] [취소]                          │
└─────────────────────────────────────────┘
         ↓ 확인
┌─────────────────────────────────────────┐
│  ⭐ 5단계: 특별특성 연동                 │
│  "CC 2건, SC 3건 연동 완료"              │
│  [확인] [CP 워크시트로 이동]            │
└─────────────────────────────────────────┘
```

### 3.3 에러 처리
- 각 단계 실패 시: 에러 메시지 표시 + 재시도 옵션
- 부분 성공: 성공 건수와 실패 건수 표시
- 전체 취소: 이전 상태로 롤백

---

## 4. API 설계

### 4.1 API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| **원자성 데이터** | | |
| GET | `/api/pfmea/{fmeaId}/atomic-data` | 원자성 데이터 조회 (CP 연동 기준) |
| POST | `/api/pfmea/{fmeaId}/atomic-data/generate` | 원자성 데이터 (재)생성 |
| **CP 연동** | | |
| POST | `/api/pfmea/sync-to-cp/prepare` | 1단계: 원자성 데이터 검증 및 준비 |
| POST | `/api/pfmea/sync-to-cp/structure` | 2단계: 구조 연동 |
| POST | `/api/pfmea/sync-to-cp/product-char` | 3단계: 제품특성 연동 |
| POST | `/api/pfmea/sync-to-cp/process-char` | 4단계: 공정특성 연동 |
| POST | `/api/pfmea/sync-to-cp/special-char` | 5단계: 특별특성 연동 |

### 4.2 Request/Response

#### 1단계: 원자성 데이터 생성
```typescript
// Request
POST /api/pfmea/sync-to-cp/prepare
{
  "fmeaId": "pfm26-m001",
  "l2Data": [...],  // PFMEA L2 데이터
  "l1Data": {...},  // PFMEA L1 데이터
}

// Response
{
  "success": true,
  "atomicData": [
    {
      "processNo": "10",
      "processName": "커팅",
      "processDesc": "절단",
      "productChar": "재질",
      "processChar": "절단정밀도",
      "workElement": "커팅MC",
      "equipment": "MC"
    },
    // ... 추가 행
  ],
  "summary": {
    "processCount": 5,
    "productCharCount": 12,
    "processCharCount": 8,
    "totalRows": 24
  }
}
```

#### 2단계: 구조 연동
```typescript
// Request
POST /api/pfmea/sync-to-cp/structure
{
  "fmeaId": "pfm26-m001",
  "cpNo": "cp26-m001",  // 기존 CP 또는 새로 생성
  "atomicData": [...]   // 1단계에서 받은 데이터
}

// Response
{
  "success": true,
  "cpId": "uuid",
  "cpNo": "cp26-m001",
  "synced": 5,
  "message": "공정 구조 5건 연동 완료"
}
```

#### 3단계: 제품특성 연동
```typescript
// Request
POST /api/pfmea/sync-to-cp/product-char
{
  "cpId": "uuid",
  "atomicData": [...]
}

// Response
{
  "success": true,
  "added": 12,
  "merged": 5,  // 상위 병합 확장된 행
  "message": "제품특성 12건 연동 완료 (5개 공정 병합 확장)"
}
```

---

## 5. 구현 파일 구조

```
src/app/pfmea/worksheet/
├── hooks/
│   └── useCpSync.ts          # PFMEA → CP 순차 연동 훅
├── components/
│   └── CpSyncWizard.tsx      # 단계별 확인 모달 UI
│
src/app/api/pfmea/sync-to-cp/
├── prepare/route.ts          # 1단계: 원자성 데이터 생성
├── structure/route.ts        # 2단계: 구조 연동
├── product-char/route.ts     # 3단계: 제품특성 연동
├── process-char/route.ts     # 4단계: 공정특성 연동
└── special-char/route.ts     # 5단계: 특별특성 연동
```

---

## 6. 구현 순서

### Phase 1: 기초 인프라
- [ ] `useCpSync.ts` 훅 생성
- [ ] `CpSyncWizard.tsx` 모달 UI 생성
- [ ] 헤더에 CP 연동 버튼 추가 (3L 확정 조건 체크)

### Phase 2: API 구현
- [ ] `/api/pfmea/sync-to-cp/prepare` - 원자성 데이터 생성
- [ ] `/api/pfmea/sync-to-cp/structure` - 구조 연동
- [ ] `/api/pfmea/sync-to-cp/product-char` - 제품특성 연동
- [ ] `/api/pfmea/sync-to-cp/process-char` - 공정특성 연동
- [ ] `/api/pfmea/sync-to-cp/special-char` - 특별특성 연동

### Phase 3: 테스트 및 검증
- [ ] 단위 테스트
- [ ] 통합 테스트
- [ ] 병합 로직 검증

---

## 7. 향후 확장

- **리스크 연동**: S/O/D/AP 값을 CP에 참조 표시
- **양방향 동기화**: CP 수정 시 PFMEA 알림
- **변경 추적**: 연동 이력 관리

---

## 8. 용어 정의

| 용어 | 설명 |
|------|------|
| 원자성 데이터 | PFMEA의 계층 구조를 CP의 평탄화된 행으로 변환한 데이터 |
| 상위 병합 | 제품특성 추가 시 공정번호/공정명 셀이 확장되어 병합되는 것 |
| Cartesian Product | 제품특성 × 공정특성의 모든 조합 |

