# Rule 0 + 19: DB 중앙 아키텍처 — 최우선 설계 원칙

> **모든 시스템 실행은 DB 원자성 데이터에 의해 동작한다. 이 원칙과 위배되는 코드는 절대 사용하지 않는다.**
> **프로젝트별 중앙 DB가 유일한 진실의 원천(SSoT)이며, 모든 앱은 이 DB에서 읽고 쓴다.**

---

## 0.1 중앙 DB 아키텍처 개요

비유: **중앙 DB는 "회사의 공식 장부"**다. 각 부서(PFMEA/CP/PFD/WS/PM)가 자기 수첩에 적는 게 아니라, 공식 장부 하나를 참조하고 기록한다.

```
프로젝트별 중앙 DB 구조:

APQPProject / TripletGroup (프로젝트 최상위)
  │
  ├── FmeaProject (PFMEA/DFMEA 등록정보)
  │     └── FmeaRegistration (기초정보)
  │
  ├── Atomic Structure (구조 계층 — 유일한 진실의 원천)
  │     ├── L1Structure → L1Function → FailureEffect
  │     ├── L2Structure → L2Function + ProcessProductChar
  │     │                              ↕ FK 공유
  │     │                   FailureMode ← productCharId FK
  │     └── L3Structure → L3Function → FailureCause
  │
  ├── FailureLink (고장사슬 — FM↔FE↔FC 확정된 FK만)
  │     ├── fmId FK → FailureMode (확정 UUID)
  │     ├── feId FK → FailureEffect (확정 UUID)
  │     ├── fcId FK → FailureCause (확정 UUID)
  │     └── FailureAnalysis → RiskAnalysis → Optimization
  │
  ├── ControlPlan (관리계획서)
  │     └── ControlPlanItem
  │           └── productCharId FK → ProcessProductChar (동일 FK)
  │
  └── PFD (공정흐름도)
        └── PfdItem
              └── productCharId FK → ProcessProductChar (동일 FK)
```

## 0.2 단일 진실의 원천 (SSoT) 정책

| 구분 | SSoT | 금지 | 이유 |
|------|------|------|------|
| **구조 데이터** | Atomic DB (L1/L2/L3 테이블) | JSON blob에서 직접 렌더링 | JSON은 스냅샷일 뿐, 정합성 보장 불가 |
| **고장사슬** | FailureLink 테이블 (FK 확정) | 메모리 내 텍스트 매칭 직접 사용 | FK 없는 매칭은 재현 불가 |
| **위험분석** | RiskAnalysis 테이블 | riskData JSON 딕셔너리 | JSON 키 불일치 시 데이터 소실 |
| **최적화** | Optimization 테이블 | 메모리 state만 보존 | 새로고침 시 소실 |
| **CP 연동** | productCharId FK | 텍스트 기반 재매칭 | 동음이의어/오타 시 오연결 |
| **PFD 연동** | fmeaL2Id/fmeaL3Id FK | 순서/이름 기반 추측 | 순서 변경 시 전체 깨짐 |

> **FmeaLegacyData(JSON blob)**: 편집 중 임시 캐시로만 사용. 최종 렌더링/연동은 반드시 Atomic DB에서 로드.

## 0.3 Import → 확정 → DB 3단계 흐름 (CRITICAL)

비유: **Import는 "연필로 쓴 초안"**, FC검증은 **"빨간펜 교정"**, DB저장은 **"공식 인쇄"**다.

```
Stage 1: IMPORT (임시 — UUID 미확정)
  Excel 파싱 → ImportedFlatData[] → buildWorksheetState()
  • UUID 생성: uid() 호출하되 "임시 ID" 상태
  • 텍스트 매칭: 5단계 퍼지 매칭 (참고용, FK 아님)
  • 저장: PfmeaMasterDataset + PfmeaMasterFlatItem (staging)
  • ❌ 이 단계에서 FailureLink FK 확정 금지

Stage 2: FC 검증 (매칭 확인 — 사용자 검토)
  failureChainInjector() → 매칭 결과 미리보기
  • 사용자가 매칭 정확성 확인/수정
  • ✅ 사용자 확인 완료 → UUID 확정 가능 상태

Stage 3: DB 원자 저장 (확정 — FK 생성)
  prisma.$transaction() 내에서:
  1. L1/L2/L3 Structure + Function 생성 (확정 UUID)
  2. ProcessProductChar 생성 (공정 단위 1회, 공유)
  3. FailureMode/Effect/Cause 생성 (확정 UUID)
  4. FailureLink 생성 (FM↔FE↔FC FK 확정)
  5. FailureAnalysis + RiskAnalysis 생성
  • ✅ 트랜잭션 성공 = 전체 커밋, 실패 = 전체 롤백
```

## 0.4 전체 파이프라인 적용 범위

| 구간 | 원칙 | 금지 패턴 |
|------|------|----------|
| **Import 파싱** | Staging 테이블에 임시 저장 | Atomic DB에 미확정 데이터 직접 저장 |
| **UUID 생성** | 공유 엔티티(A4)는 단일 UUID + FK 참조 | **카테시안 복제 절대 금지** |
| **FC 검증** | 사용자에게 표시 후 확정 | 퍼지 매칭 자동 FK 확정 |
| **DB 저장** | `prisma.$transaction` + `createMany` | 개별 `create()` 루프, empty catch |
| **렌더링** | Atomic DB 로드 데이터만 | JSON blob 직접 렌더링 |
| **FC 고장사슬** | Map.get() 결정론적 매칭 | `distribute()` 순서 배분, 유사도 매칭 |
| **CP 연동** | 동일 productCharId FK | 텍스트 재매칭, ID 재생성 |
| **PFD 연동** | 동일 fmeaL2Id/fmeaL3Id FK | 순서/이름 기반 추측 |
| **워크시트 편집** | 편집 → 즉시 Atomic DB 반영 (큐) | 메모리만 수정 후 나중에 일괄 저장 |
| **데이터 로드** | DB → State (단방향, 변환 없음) | 로드 경로에 필터/변환 삽입 |

## 0.5 카테시안 복제 절대 금지 (CRITICAL)

```typescript
// ⛔ 절대 금지: A3마다 A4를 복제 생성 → UUID가 2배, 고아 PC 발생
process.functions = a3Items.map(a3 => ({
  productChars: a4Items.map(a4 => ({ id: uid() })) // ← 카테시안 복제!
}))

// ✅ 필수: A4를 공정 단위로 1회 생성 → 모든 A3가 동일 ID를 FK 참조
const sharedPCs = a4Items.map(a4 => ({ id: uid(), name: a4.name }));
process.functions = a3Items.map(a3 => ({
  productChars: sharedPCs.map(pc => ({ ...pc }))  // 동일 ID 공유
}));
```

## 0.6 DB 원자성 5원칙

1. **단일 진실의 원천**: Atomic DB = SSoT. JSON blob/메모리는 캐시일 뿐
2. **공유 엔티티 단일 생성**: A4(제품특성)는 공정 단위 1회 생성, FK로만 참조
3. **트랜잭션 래핑 필수**: Import/저장/연동 모든 DB 작업은 `$transaction` 내
4. **결정론적 매칭**: Map.get() 조회만 허용, 유사도/임계값/순서 매칭 금지
5. **확정 전 FK 생성 금지**: Import 단계에서 FailureLink FK 미확정

## 0.7 세션 시작 시 DB 정합성 검증

```bash
npx prisma db pull --print | head -20   # 스키마 정합성
scripts/check-cartesian.sh               # 카테시안 탐지
npx tsc --noEmit                         # 타입 체크
```

## 0.8 앱별 DB 접근 규칙

| 앱 | 읽기 허용 | 쓰기 허용 | 금지 |
|----|----------|----------|------|
| **PFMEA Import** | PfmeaMasterFlatItem | PfmeaMasterDataset, FlatItem | Atomic DB 직접 쓰기 |
| **PFMEA Worksheet** | L1/L2/L3, FL, Risk, Opt | 전체 Atomic (`$transaction`) | JSON blob 직접 렌더링 |
| **Control Plan** | ControlPlanItem, ProcessProductChar | ControlPlan, ControlPlanItem | FMEA Atomic 직접 쓰기 |
| **PFD** | PfdItem, UnifiedProcessItem | PfdRegistration, PfdItem | FMEA/CP Atomic 직접 쓰기 |
| **WS/PM** | 전체 (읽기 전용) | 자체 테이블만 | 다른 앱 DB 쓰기 |

## 0.9 유사도 추천 예외

> DC/PC/개선안 **추천(Recommendation)** 기능은 유사도 매칭 허용.
> 단, FK 연결/엔티티 생성에는 적용 금지 — **표시/추천 UI에서만 사용**.

---

## Rule 19: 프로젝트별 별도 DB 스키마 필수

> **모든 프로젝트 데이터는 프로젝트 전용 스키마에 저장. public 스키마에 프로젝트 데이터 저장 절대 금지.**

### 스키마 명명 규칙

| 유형 | ID 패턴 | 스키마 이름 | 예시 |
|------|---------|------------|------|
| **PFMEA** | `pfm26-m002` | `pfmea_pfm26_m002` | `pfmea_pfm26_m002.l2_structures` |
| **CP** | `cp26-c001` | `pfmea_cp26_c001` | `pfmea_cp26_c001.control_plan_items` |
| **PFD** | `pfd26-p001` | `pfmea_pfd26_p001` | `pfmea_pfd26_p001.pfd_items` |

### 필수 API 패턴

```typescript
// ❌ 금지: public에 프로젝트 데이터 저장
const prisma = getPrisma();
await prisma.failureCause.create({ data: { fmeaId: 'pfm26-m002', ... } });

// ✅ 필수: 프로젝트 스키마 클라이언트 사용
const schema = getProjectSchemaName(fmeaId);
await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
const prisma = getPrismaForSchema(schema);
```

### 필수 규칙

1. `getProjectSchemaName(fmeaId)`로 스키마 이름 생성 — 직접 문자열 조합 금지
2. `ensureProjectSchemaReady({ baseDatabaseUrl, schema })`로 스키마 생성
3. `getPrismaForSchema(schema)`로 클라이언트 획득 — `getPrisma()` (public) 금지
4. `SET search_path TO {schema}, public` — 프로젝트 스키마 우선
5. 새 프로젝트: DELETE ALL → CREATE ALL — 잔존 데이터 방지
6. seed/보충 API도 프로젝트 스키마에 저장

### public vs 프로젝트 스키마

| 구분 | public 스키마 | 프로젝트 스키마 |
|------|-------------|--------------|
| **저장** | 메타(TripletGroup, FmeaProject), 공통 참조(산업DB, SOD기준표) | Atomic(L1~L3, FM/FE/FC/FL, RA, Opt, Legacy) |
| **Import** | `pfmea_master_datasets/flat_items` (staging) | Atomic DB (확정) |
| **금지** | ❌ Atomic 데이터 직접 저장 | ❌ 공통 참조 복제 |

---

## 위반 시

- **즉시 롤백** + 원인 분석
- 카테시안 탐지: `scripts/check-cartesian.sh`
- FK 정합성: 파이프라인 검증 API
- 상세: `docs/CENTRAL_DB_ARCHITECTURE.md`
