# FMEA-CP 동기화 정책 및 구현 가이드

> **버전**: 1.0  
> **작성일**: 2026-01-16  
> **목적**: FMEA와 CP 간 양방향 동기화 정책 정의

---

## 1. 마스터-파생 관계

```
┌─────────────────────────────────────────────────────────────┐
│                    PFMEA (마스터)                            │
│  - 구조분석 (L1/L2/L3)                                       │
│  - 기능분석                                                  │
│  - 고장분석 (FM/FE/FC)                                       │
│  - 리스크분석 (S/O/D/AP)                                     │
│  - 최적화                                                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼ 파생
┌─────────────────────────────────────────────────────────────┐
│                    CP (파생 문서)                            │
│  - 공정현황 (FMEA 연동)                                      │
│  - 관리항목 (FMEA 연동)                                      │
│  - 관리방법 (CP 전용)                                        │
│  - 대응계획 (CP 전용)                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 동기화 유형

### 2.1 구조 동기화 (Structure Sync)

| 방향 | 버튼명 | 동작 |
|------|--------|------|
| **FMEA → CP** | CP 구조연동 | FMEA 전체 구조를 CP에 생성 |
| **CP → FMEA** | FMEA 구조연동 | CP 구조를 FMEA에 생성 (고장정보 빈값) |

#### FMEA → CP 구조연동 (주요)

| FMEA 원본 | CP 대상 | 비고 |
|-----------|---------|------|
| L2.no | processNo | 공정번호 |
| L2.name | processName | 공정명 |
| L2.function / L3.name | processDesc | 공정설명 |
| L3.name (4M) | workElement | 작업요소 |
| Equipment (설비) | equipment | 설비/금형/지그 |
| L4.productChar | productChar | 제품특성 |
| L4.processChar | processChar | 공정특성 |
| L4.specialChar | specialChar | 특별특성 |
| RowSpan 구조 | 셀병합 | 동일 구조 유지 |

#### CP → FMEA 구조연동 (역방향)

| CP 원본 | FMEA 대상 | 비고 |
|---------|-----------|------|
| processNo | L2.no | 공정번호 |
| processName | L2.name | 공정명 |
| processDesc | L2.function | 공정설명 → 기능 |
| workElement | L3.name | 작업요소 |
| equipment | L3.equipment | 설비/금형/지그 |
| productChar | L4.productChar | 제품특성 |
| processChar | L4.processChar | 공정특성 |
| specialChar | L4.specialChar | 특별특성 |
| - | **FM (고장형태)** | **빈 값으로 생성** |
| - | **FE (고장영향)** | **빈 값으로 생성** |
| - | **FC (고장원인)** | **빈 값으로 생성** |
| - | **S/O/D/AP** | **빈 값으로 생성** |

### 2.2 데이터 동기화 (Data Sync)

| 방향 | 버튼명 | 동작 |
|------|--------|------|
| **FMEA → CP** | CP 데이터동기화 | 변경된 특성/특별특성 업데이트 |
| **CP → FMEA** | FMEA 데이터동기화 | 변경된 공통 필드 업데이트 |

#### 동기화 대상 필드 (양방향)

| 필드 | FMEA | CP | 동기화 |
|------|------|----|----|
| 공정번호 | L2.no | processNo | ✅ 양방향 |
| 공정명 | L2.name | processName | ✅ 양방향 |
| 공정설명 | L2.function | processDesc | ✅ 양방향 |
| 제품특성 | L4.productChar | productChar | ✅ 양방향 |
| 공정특성 | L4.processChar | processChar | ✅ 양방향 |
| 특별특성 | L4.specialChar | specialChar | ✅ 양방향 |
| 설비/금형 | Equipment | equipment | ✅ 양방향 |
| 고장형태 | FM | - | ❌ FMEA 전용 |
| 고장영향 | FE | - | ❌ FMEA 전용 |
| 고장원인 | FC | - | ❌ FMEA 전용 |
| S/O/D/AP | RiskAnalysis | ref값 | → 읽기전용 참조 |
| 평가방법 | - | evalMethod | ❌ CP 전용 |
| 샘플링 | - | sampleSize/Freq | ❌ CP 전용 |
| 관리방법 | - | controlMethod | ❌ CP 전용 |
| 대응계획 | - | reactionPlan | ❌ CP 전용 |

---

## 3. 충돌 처리 정책

### 3.1 충돌 감지

```typescript
interface SyncConflict {
  field: string;           // 충돌 필드명
  fmeaValue: string;       // FMEA 값
  cpValue: string;         // CP 값
  fmeaUpdatedAt: Date;     // FMEA 수정 시간
  cpUpdatedAt: Date;       // CP 수정 시간
}
```

### 3.2 충돌 시 사용자 선택 UI

```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️ 데이터 충돌 감지                                         │
├─────────────────────────────────────────────────────────────┤
│  필드: 공정설명 (processDesc)                                │
│                                                             │
│  FMEA 값: "원재료 수입검사 실시"        (2026-01-16 10:30)  │
│  CP 값:   "원재료 품질검사 수행"        (2026-01-16 11:45)  │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ FMEA 값 적용 │  │ CP 값 적용   │  │ 건너뛰기     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  ☐ 이 세션에서 동일 선택 적용                                │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 충돌 해결 옵션

| 옵션 | 동작 |
|------|------|
| **FMEA 값 적용** | FMEA 값으로 CP 업데이트 (마스터 우선) |
| **CP 값 적용** | CP 값으로 FMEA 업데이트 |
| **건너뛰기** | 해당 필드 동기화 스킵 |
| **모든 항목에 적용** | 동일 충돌 유형에 일괄 적용 |

---

## 4. 버튼 구성

### 4.1 FMEA 워크시트 메뉴

```
┌────────────────────────────────────────────────────────────┐
│  [CP 구조연동]  [CP 데이터동기화]  [CP 이동]                 │
└────────────────────────────────────────────────────────────┘
```

| 버튼 | 기능 | 조건 |
|------|------|------|
| CP 구조연동 | FMEA 구조 → CP 전체 생성 | 연결된 CP 필요 |
| CP 데이터동기화 | 변경 데이터만 업데이트 | 연결된 CP 필요 |
| CP 이동 | CP 워크시트로 이동 | - |

### 4.2 CP 워크시트 메뉴

```
┌────────────────────────────────────────────────────────────┐
│  [FMEA 구조연동]  [FMEA 동기화]  [FMEA 이동]                │
└────────────────────────────────────────────────────────────┘
```

| 버튼 | 기능 | 조건 |
|------|------|------|
| FMEA 구조연동 | CP 구조 → FMEA 생성 (고장정보 빈값) | 연결된 FMEA 필요 |
| FMEA 동기화 | 변경 데이터 양방향 업데이트 | 연결된 FMEA 필요 |
| FMEA 이동 | FMEA 워크시트로 이동 | - |

---

## 5. 동기화 로그

### 5.1 로그 테이블 구조

```sql
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY,
  source_type VARCHAR(20),    -- 'fmea' | 'cp'
  source_id VARCHAR(50),      -- fmeaId | cpNo
  target_type VARCHAR(20),    -- 'cp' | 'fmea'
  target_id VARCHAR(50),
  sync_type VARCHAR(20),      -- 'structure' | 'data'
  status VARCHAR(20),         -- 'success' | 'partial' | 'conflict'
  conflicts JSONB,            -- 충돌 상세
  resolved_by VARCHAR(50),    -- 사용자
  created_at TIMESTAMP
);
```

### 5.2 변경 추적

| 필드 | 설명 |
|------|------|
| lastSyncAt | 마지막 동기화 시간 |
| syncHash | 동기화 시점 데이터 해시 |
| changeCount | 동기화 후 변경 횟수 |

---

## 6. 구현 우선순위

| 순위 | 기능 | 난이도 | 설명 |
|------|------|--------|------|
| 🔴 1 | FMEA → CP 구조연동 | 중 | 현재 syncFromFmea 확장 |
| 🔴 2 | CP → FMEA 구조연동 | 상 | 역방향 생성 로직 신규 |
| 🔴 3 | 데이터 동기화 (양방향) | 상 | 충돌 감지/해결 UI |
| 🟡 4 | 충돌 UI | 중 | 모달 컴포넌트 |
| 🟡 5 | 동기화 로그 | 하 | DB 저장 |

---

## 7. API 설계

### 7.1 구조 동기화

```
POST /api/sync/structure
Body: {
  direction: 'fmea-to-cp' | 'cp-to-fmea',
  sourceId: string,
  targetId: string,
  options: {
    overwrite: boolean,
    createEmpty: boolean  // 빈 고장정보 생성
  }
}
```

### 7.2 데이터 동기화

```
POST /api/sync/data
Body: {
  fmeaId: string,
  cpNo: string,
  fields?: string[],      // 특정 필드만 동기화
  conflictPolicy?: 'ask' | 'fmea-wins' | 'cp-wins' | 'skip'
}

Response: {
  success: boolean,
  synced: number,
  conflicts: SyncConflict[],
  skipped: number
}
```

---

## 변경 이력

| 날짜 | 버전 | 내용 |
|------|------|------|
| 2026-01-16 | 1.0 | 초기 정책 수립 |

---

**작성자**: AI Assistant  
**승인자**: 사용자 확인 필요
