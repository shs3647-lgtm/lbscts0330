# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## ⚠️ MANDATORY DEVELOPMENT RULES (2026-01-19)

> **❌ 위반 시 롤백 대상** - 아래 룰을 반드시 준수해야 합니다.

### 🔴 Rule 0: DB 중앙 아키텍처 — 최우선 설계 원칙 (2026-03-15)

> **모든 시스템 실행은 DB 원자성 데이터에 의해 동작한다. 이 원칙과 위배되는 코드는 절대 사용하지 않는다.**
> **프로젝트별 중앙 DB가 유일한 진실의 원천(SSoT)이며, 모든 앱은 이 DB에서 읽고 쓴다.**

#### 0.1 중앙 DB 아키텍처 개요

비유: **중앙 DB는 "회사의 공식 장부"**다. 각 부서(PFMEA/CP/PFD/WS/PM)가 자기 수첩에 적는 게 아니라, 공식 장부 하나를 참조하고 기록한다. 수첩(메모리/JSON blob)은 임시 메모일 뿐, 공식 장부(Atomic DB)만 진실이다.

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

#### 0.2 단일 진실의 원천 (Single Source of Truth) 정책

| 구분 | SSoT | 금지 | 이유 |
|------|------|------|------|
| **구조 데이터** | Atomic DB (L1/L2/L3 테이블) | JSON blob에서 직접 렌더링 | JSON은 스냅샷일 뿐, 정합성 보장 불가 |
| **고장사슬** | FailureLink 테이블 (FK 확정) | 메모리 내 텍스트 매칭 결과 직접 사용 | FK 없는 매칭은 재현 불가 |
| **위험분석** | RiskAnalysis 테이블 | riskData JSON 딕셔너리 | JSON 키 불일치 시 데이터 소실 |
| **최적화** | Optimization 테이블 | 메모리 state만 보존 | 새로고침 시 소실 |
| **CP 연동** | productCharId FK | 텍스트 기반 재매칭 | 동음이의어/오타 시 오연결 |
| **PFD 연동** | fmeaL2Id/fmeaL3Id FK | 순서/이름 기반 추측 | 순서 변경 시 전체 깨짐 |

> **FmeaLegacyData(JSON blob)**: 편집 중 임시 캐시로만 사용. 최종 렌더링/연동은 반드시 Atomic DB에서 로드.

#### 0.3 Import → 확정 → DB 3단계 흐름 (CRITICAL)

비유: **Import는 "연필로 쓴 초안"**, FC검증은 **"빨간펜 교정"**, DB저장은 **"공식 인쇄"**다. 초안 단계에서 번호(UUID)를 확정하면 교정 시 고칠 수 없다.

```
┌─────────────────────────────────────────────────────────────┐
│ Stage 1: IMPORT (임시 — UUID 미확정)                         │
│                                                             │
│  Excel 파싱 → ImportedFlatData[] → buildWorksheetState()    │
│  • UUID 생성: uid() 호출하되 "임시 ID" 상태                   │
│  • 텍스트 매칭: 5단계 퍼지 매칭 (참고용, FK 아님)              │
│  • 저장: PfmeaMasterDataset + PfmeaMasterFlatItem (staging)  │
│  • ❌ 이 단계에서 FailureLink FK 확정 금지                    │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Stage 2: FC 검증 (매칭 확인 — 사용자 검토)                    │
│                                                             │
│  failureChainInjector() → 매칭 결과 미리보기                  │
│  • FM↔FE↔FC 텍스트 매칭 결과를 UI에 표시                     │
│  • 사용자가 매칭 정확성 확인/수정                              │
│  • 매칭 실패 건은 수동 지정 또는 재매칭                        │
│  • ✅ 사용자 확인 완료 → UUID 확정 가능 상태                  │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Stage 3: DB 원자 저장 (확정 — FK 생성)                       │
│                                                             │
│  prisma.$transaction() 내에서:                               │
│  1. L1/L2/L3 Structure + Function 생성 (확정 UUID)           │
│  2. ProcessProductChar 생성 (공정 단위 1회, 공유)             │
│  3. FailureMode/Effect/Cause 생성 (확정 UUID)                │
│  4. FailureLink 생성 (FM↔FE↔FC FK 확정)                     │
│  5. FailureAnalysis + RiskAnalysis 생성                      │
│  6. FmeaLegacyData 캐시 저장 (편집용 스냅샷)                  │
│  • ✅ 트랜잭션 성공 = 전체 커밋, 실패 = 전체 롤백             │
└─────────────────────────────────────────────────────────────┘
```

#### 0.4 적용 범위 (전체 파이프라인)

| 구간 | 원칙 | 금지 패턴 |
|------|------|----------|
| **Import 파싱** | 파싱 결과는 Staging 테이블에 임시 저장 | 직접 Atomic DB에 미확정 데이터 저장 |
| **UUID 생성** | 공유 엔티티(A4)는 단일 UUID 생성 후 FK 참조 | **카테시안 복제 절대 금지** |
| **FC 검증** | 매칭 결과를 사용자에게 표시 후 확정 | 퍼지 매칭 결과를 자동 FK 확정 |
| **DB 저장** | `prisma.$transaction` 래핑 필수, `createMany` 사용 | 개별 `create()` 루프, empty catch |
| **렌더링** | Atomic DB에서 로드한 데이터만 렌더링 | JSON blob 직접 렌더링, 메모리 조작 |
| **FC 고장사슬** | Map.get() 결정론적 매칭 (유사도 매칭 금지) | `distribute()` 순서 배분, 임계값 매칭 |
| **CP 연동** | 동일 productCharId FK로 FMEA↔CP 참조 | 텍스트 기반 재매칭, ID 재생성 |
| **PFD 연동** | 동일 fmeaL2Id/fmeaL3Id FK로 FMEA↔PFD 참조 | 순서 기반 매핑, 이름 기반 추측 |
| **워크시트 편집** | 편집 → 즉시 Atomic DB 반영 (큐 패턴) | 메모리만 수정 후 나중에 일괄 저장 |
| **데이터 로드** | DB → State (단방향, 변환 없음) | 로드 경로에 필터/변환 삽입 |

#### 0.5 카테시안 복제 절대 금지 (CRITICAL)

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

#### 0.6 DB 원자성 5원칙

1. **단일 진실의 원천**: Atomic DB = SSoT. JSON blob/메모리는 캐시일 뿐
2. **공유 엔티티 단일 생성**: A4(제품특성)는 공정 단위 1회 생성, FK로만 참조
3. **트랜잭션 래핑 필수**: Import/저장/연동 모든 DB 작업은 `$transaction` 내에서 실행
4. **결정론적 매칭**: Map.get() 조회만 허용, 유사도/임계값/순서 기반 매칭 금지
5. **확정 전 FK 생성 금지**: Import 단계에서 FailureLink FK를 확정하지 않음

#### 0.7 세션 시작 시 DB 정합성 검증 (MANDATORY)

> 매 세션 시작 시, 코드 수정 전에 아래 검증을 수행한다.

```bash
# 1. 스키마 정합성 — Prisma 클라이언트와 DB 일치 확인
npx prisma db pull --print | head -20

# 2. FK 정합성 — 고아 레코드 탐지
# FailureLink의 fmId/feId/fcId가 실제 존재하는지
# ControlPlanItem의 productCharId가 실제 존재하는지

# 3. 카테시안 탐지
scripts/check-cartesian.sh

# 4. 타입 체크
npx tsc --noEmit
```

#### 0.8 앱별 DB 접근 규칙

| 앱 | 읽기 허용 테이블 | 쓰기 허용 테이블 | 금지 |
|----|----------------|----------------|------|
| **PFMEA Import** | PfmeaMasterFlatItem | PfmeaMasterDataset, PfmeaMasterFlatItem | Atomic DB 직접 쓰기 |
| **PFMEA Worksheet** | L1/L2/L3, FailureLink, Risk, Opt | 전체 Atomic DB (`$transaction`) | JSON blob 직접 렌더링 |
| **Control Plan** | ControlPlanItem, ProcessProductChar | ControlPlan, ControlPlanItem | FMEA Atomic DB 직접 쓰기 |
| **PFD** | PfdItem, UnifiedProcessItem | PfdRegistration, PfdItem | FMEA/CP Atomic DB 직접 쓰기 |
| **WS/PM** | 전체 (읽기 전용) | 자체 테이블만 | 다른 앱의 DB 쓰기 |

#### 0.8.1 프로젝트별 스키마 분리 정책 (2026-03-21) — CRITICAL

> **모든 프로젝트 데이터는 프로젝트 전용 스키마에 저장한다. public 스키마에 프로젝트 데이터를 저장하는 것은 절대 금지.**

비유: **public 스키마는 "회사 로비"**다. 프로젝트 데이터는 "전용 사무실(프로젝트 스키마)"에 보관해야 한다. 로비에 서류를 방치하면 다른 프로젝트와 섞인다.

**스키마 네이밍 규칙:**

| 앱 | ID 패턴 | 스키마 이름 | 예시 |
|----|---------|------------|------|
| **PFMEA** | `pfm26-m066` | `pfmea_pfm26_m066` | `pfmea_pfm26_m066.l2_structures` |
| **Control Plan** | `cp26-c001` | `pfmea_cp26_c001` | `pfmea_cp26_c001.control_plan_items` |
| **PFD** | `pfd26-p001` | `pfmea_pfd26_p001` | `pfmea_pfd26_p001.pfd_items` |

**필수 규칙:**

1. **`getProjectSchemaName(fmeaId)`로 스키마 이름 생성** — 직접 문자열 조합 금지
2. **`ensureProjectSchemaReady({ baseDatabaseUrl, schema })`로 스키마 생성** — 객체 파라미터 필수
3. **`getPrismaForSchema(schema)`로 Prisma 클라이언트 획득** — `getPrisma()` (public) 사용 금지
4. **`SET search_path TO {schema}, public`** — 프로젝트 스키마 우선, public 폴백
5. **새 프로젝트 생성 시 DELETE ALL → CREATE ALL** — 기존 데이터 잔존 방지
6. **seed/보충 API도 프로젝트 스키마에 저장** — public에 저장하면 다른 프로젝트에서 보임
7. **`POST /api/fmea/sync-cp-pfd`** — CP/PFD 행은 **`pfmea_{fmeaId}`에만** 저장 (`create-cp` / `sync-to-cp`와 동일). Master(M001)도 예외 없음. 레거시 public 행 이관: `scripts/migrate-public-cp-pfd-to-project-schema.ts`

```typescript
// ❌ 금지: public에 프로젝트 데이터 저장
const prisma = getPrisma();
await prisma.failureCause.create({ data: { fmeaId: 'pfm26-m066', ... } });

// ✅ 필수: 프로젝트 스키마 클라이언트 사용
const schema = getProjectSchemaName(fmeaId);
await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
const prisma = getPrismaForSchema(schema);
```

**위반 시:** 즉시 롤백 + public 스키마에서 해당 fmeaId 데이터 삭제

#### 0.9 예외: 유사도 추천 허용 대상

> 아래 3가지는 **추천(Recommendation)** 기능이므로 유사도 매칭을 허용한다.
> 단, FK 연결/엔티티 생성에는 적용 금지 — **표시/추천 UI에서만 사용**.

| 대상 | 용도 | 허용 범위 |
|------|------|----------|
| **DC (검출관리)** | LLD/마스터 DB에서 유사 검출방법 추천 | 추천 목록 표시, 사용자 선택 후 저장 |
| **PC (예방관리)** | LLD/마스터 DB에서 유사 예방방법 추천 | 추천 목록 표시, 사용자 선택 후 저장 |
| **개선안 추천** | 기존 개선 이력에서 유사 개선안 추천 | 추천 목록 표시, 사용자 선택 후 저장 |

#### 0.10 위반 시

- **즉시 롤백** + 원인 분석 + `/fmea-bug-fix` 스킬로 진단
- 카테시안 탐지: `scripts/check-cartesian.sh` 실행
- FK 정합성: `/verify` 커맨드로 3단계 검증
- DB 정합성 보고서 작성 (어떤 테이블, 어떤 FK, 몇 건 불일치)

#### 0.11 중앙 DB 설계 참조 문서

> 상세 설계는 `docs/CENTRAL_DB_ARCHITECTURE.md` 참조

---

### 🔴 Rule 1.5: DB UUID 중심 꽂아넣기 원칙 — 자동생성/추론 절대 금지 (2026-03-21)

> **모든 데이터 렌더링은 DB에 저장된 근거 데이터에만 근거한다.**
> **fallback 자동생성, 카테시안 추론, 추론 기반 데이터 생성을 절대 적용하지 않는다.**
> **누락 데이터는 Master DB / 산업 DB에 저장된 실제 데이터에서만 보충한다.**

#### 1.5.1 데이터 소스 우선순위 (SSoT 체인)

| 우선순위 | 소스 | 테이블 | 예시 |
|---------|------|--------|------|
| 1순위 | **프로젝트 Atomic DB** | L1/L2/L3, FM/FE/FC, FailureLink | 현재 프로젝트 확정 데이터 |
| 2순위 | **Master FMEA DB** | `MasterFmeaReference` | m066 기반 B2/B3/B4/B5 실제 데이터 |
| 3순위 | **산업 DB** | `KrIndustryDetection`, `KrIndustryPrevention` | B6(DC)/B5(PC) 추천 |
| 4순위 | **LLD DB** | `LLDFilterCode`, `LessonsLearned` | 과거 이력 기반 추천 |
| ❌ 금지 | **코드 내 자동생성** | 없음 | `"관리 부적합"`, `"설비가..."`, `inferChar()` |

#### 1.5.2 누락 데이터 처리 원칙

```
데이터 요청 → DB 조회 (1→2→3→4순위 순차)
    ↓
  ┌─ 데이터 있음 → 새 UUID 생성 + FK 연결 → 꽂아넣기
  │
  └─ 데이터 없음 → warn.error('M066_MISSING') 누락경고 발송
                     ↓
               Import 미리보기 UI에 경고 표시
                     ↓
               사용자 선택:
                 ├── "입력" → 사용자 직접 입력 → Master DB에 저장 (Living DB)
                 └── "삭제" or 무응답 → 하위요소 없는 상위 B1~B5 cascade 삭제
```

- ❌ **절대 금지**: `"${name} 부적합"`, `"${name} 관리 특성"`, `"설비가..."`, `"작업자가..."` 등 문자열 자동생성
- ❌ **절대 금지**: `inferChar()`, `inferPC()` 등 추론 함수로 데이터 생성
- ✅ **허용**: DB 테이블에서 조회한 실제 데이터만 사용
- ✅ **허용**: B6(DC) = 산업DB(`KrIndustryDetection`) + LLD에서 조회 (추론 아님)

#### 1.5.3 Master DB 지속 발전 원칙 (Living Database)

> Master DB는 사용할수록 풍부해지는 "살아있는 DB"다.
> 새로 입력된 자료, 새로 생성된 FMEA 자료는 Master DB에 업데이트하여 지속적으로 발전시킨다.

| 이벤트 | 동작 | Master DB 업데이트 |
|--------|------|-------------------|
| **새 FMEA Import** | FC/PC/DC/SOD 확정 | 확정 데이터를 Master에 upsert |
| **SOD 등급 변경** | S/O/D 재평가 | 해당 FM/FC의 Master SOD 갱신 |
| **LLD Import** | 새 이력 데이터 생성 | LLD → Master에 cross-reference |
| **사용자 수동 입력** | 누락 데이터 직접 입력 | 입력 데이터를 Master에 저장 |
| **워크시트 저장** | 최종 확정 데이터 | `syncMasterFromWorksheet()` 호출 |
| **새로운 항목 추가** | 신규 FM/FC/PC/DC | Master에 신규 항목 등록 |

#### 1.5.4 Master Data 구성 소스

| 소스 | 내용 | 업데이트 시점 |
|------|------|-------------|
| **m066 골든 레퍼런스** | 91 WE, 104 FC, 26 FM 등 완전한 데이터 | 초기 시딩 |
| **산업 DB** | DC/PC 산업 공통 관리방법 | 주기적 업데이트 |
| **SOD 등급** | 사용자가 재평가한 심각도/발생도/검출도 | 워크시트 저장 시 |
| **LLD Import** | 새로 생성된 과거 이력 데이터 | Import 완료 시 |
| **사용자 입력** | 누락 데이터 수동 입력 | 입력 즉시 |

#### 1.5.5 위반 시

- fallback 자동생성 코드 발견 → **즉시 삭제** + Master DB 조회로 교체
- 추론 함수로 데이터 생성 → **즉시 삭제** + 경고 보고
- DB에 없는 데이터를 코드에서 생성 → **롤백** + 사용자 입력 유도
- 위반 코드 검색: `grep -r "부적합\|관리 특성\|설비가\|작업자가\|inferChar" src/`

---

### 🔴 Rule 1: TDD 필수 + 검증 체계 + 품질 유지 프로세스 — 2026-02-20

**모든 코드 수정은 반드시 테스트 먼저 수정/작성한 후 구현 코드를 수정합니다.**

| 단계 | 명칭 | 방법 | 용도 |
|------|------|------|------|
| **0단계** | **테스트 먼저 (TDD)** | 기대 동작을 테스트 코드로 먼저 작성 → 실패 확인 → 사용자에게 보고 | 요구사항을 코드로 명확히 정의 |
| 1단계 | **타입 체크 (Type Check)** | `npx tsc --noEmit` | 타입 에러 0개 확인 |
| 2단계 | **단위 테스트 (Unit Test)** | 비정상 엑셀 47개로 함수 검증, structureGuard 구조 보호 검증 | 개별 함수/모듈이 정확히 동작하는지 |
| 3단계 | **통합 테스트 (E2E Test)** | 앱에 실제 임포트해서 화면 확인 | 전체 흐름이 정상인지 |

**⚠️ TDD 절차 (0단계 상세)**:
1. 기대 동작을 테스트 코드로 **먼저** 작성/수정
2. 테스트 실행 → **FAIL 확인** (Red)
3. 사용자에게 "이 테스트가 실패합니다. 이제 구현을 수정합니다." 보고
4. 구현 코드 수정
5. 테스트 실행 → **PASS 확인** (Green)
- ❌ **구현 먼저 수정 → 테스트를 맞춰 변경 = TDD 위반 (금지)**
- ✅ **테스트 먼저 수정 → 실패 확인 → 구현 수정 → 통과 확인 = 올바른 TDD**

- 1단계만 통과하고 "완료"라고 하면 안 됨 — 1단계는 결과(타입)만 보는 것
- 2단계로 **각 함수가 올바르게 동작하는지** 검증해야 함
- 3단계로 **실제 사용 시나리오**에서 확인해야 함
- **FMEA는 복잡한 연계 시스템** — 타입체크만으로는 연계성 검증이 불가능
- **7단계(구조→기능→고장→위험→최적화→CP→PFD) 진행 시 E2E 검증을 모두 통과해야 다음 단계 진행 가능**

**🛡️ 온프레미스 품질 유지 프로세스 (2026-02-20 확정, 매 수정 시 필수)**:

**매 커밋 전 (필수)**:
```bash
npx tsc --noEmit          # 타입 에러 0개 확인 (절대 스킵 금지)
```

**주요 기능 수정 후 (권장)**:
```bash
npm run build             # 209페이지 프로덕션 빌드 성공 확인
```

**코드 작성 시 필수 준수 사항**:

| # | 원칙 | 위반 시 영향 |
|---|------|-------------|
| 1 | **empty catch 금지** — `catch(e) {}` 대신 `console.error()` 또는 `toast.error()` | 에러 묵살 → 디버깅 불가 |
| 2 | **새 API에 보안 적용** — `src/lib/security.ts`의 `isValidFmeaId`, `pickFields`, `escapeHtml` 사용 | SQL injection, XSS |
| 3 | **새 페이지에 error.tsx 추가** — 기존 `pfmea/worksheet/error.tsx` 참고 | 화이트 스크린 |
| 4 | **빈 데이터 상태 처리** — `items.length === 0` 시 안내 메시지 표시 | 빈 화면 방치 |
| 5 | **React.memo 유지** — `SelectableCell`, `SpecialCharBadge`, `AllViewRow` memo 해제 금지 | 리렌더 폭발 |
| 6 | **Users API password 제외** — `select: {...}` 유지, password 필드 절대 응답에 포함 금지 | 비밀번호 해시 노출 |
| 7 | **700행 초과 시 파일 분리** | 유지보수 불가 |
| 8 | **Handsontable 도입 금지** — HTML table + Tailwind만 사용 | 라이선스 위반 |
| 9 | **CFT·직원 디렉터리** — `public.cft_public_members` + `cft-public-db.ts` / `/api/cft-public-members`만 사용. 로그인 계정 `users`(ADMIN `/api/users`)와 **동기화·연동 금지** | CFT/시스템 계정 혼선 |

**Forge 문제해결 프로세스 (2026-03-07 확정, 비-트리비얼 작업 시 필수)**:

모든 비-트리비얼 작업(3파일+ 변경, UI 전체 수정, 아키텍처 변경)은 반드시 6단계 파이프라인을 따른다:

| 단계 | 명칭 | 방법 | 산출물 |
|------|------|------|--------|
| 1 | **EXPLORE** | 코드베이스 탐색, 현재 상태 파악 | 현황 분석 보고 |
| 2 | **PLAN** | 수정 파일 목록 + 변경 내용 + 검증 기준 정의 | 승인된 계획 |
| 3 | **TDD** | Playwright/Vitest 테스트 먼저 작성 → RED 확인 | 실패하는 테스트 |
| 4 | **EXECUTE** | 계획대로만 구현 (계획 외 변경 금지) | 구현 코드 |
| 5 | **VERIFY** | `tsc --noEmit` + 테스트 PASS + Playwright 브라우저 검증 | 검증 보고서 |
| 6 | **COMMIT** | 검증 통과 후 커밋 | 커밋 해시 |

- VERIFY에서 실패 시 → EXECUTE로 돌아가 수정 → 재검증 (VERIFY-LOOP)
- Playwright 브라우저 검증은 UI 변경 작업 시 필수
- 단순 타이포/1-2줄 수정은 예외 (Forge 생략 가능)

**새 API 라우트 작성 시 필수 패턴**:
```typescript
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
// 1. 입력 검증 (isValidFmeaId, isValidIdentifier)
// 2. try-catch + console.error (empty catch 금지)
// 3. safeErrorMessage(error) (스택 트레이스 노출 금지)
// 4. 참조 데이터는 Cache-Control 헤더 추가
```

#### 🔁 파이프라인 검증 테스트 매뉴얼 (2026-03-17, 매일 1회 필수)

> **목적**: 코드 수정 전후에 5단계 파이프라인 검증을 실행하여 데이터 정합성을 확인한다.
> **원본 엑셀**: `data/master-fmea/master_import_12inch_AuBump.xlsx` (통합 PFMEA, 35KB)
> **대상 fmeaId**: `pfm26-m066` (12inch Au Bump)
> **마스터 JSON**: `data/master-fmea/pfm26-m066.json`

##### 골든 베이스라인 (2026-03-17 확정)

| 항목 | 기대값 | PASS 기준 |
|------|--------|-----------|
| L2 (공정) | 21 | = 21 |
| L3 (작업요소) | 91 | = 91 |
| L1Function | 17 | = 17 |
| L2Function | 26 | = 26 |
| L3Function | 101 | = 101 |
| FM (고장형태) | 26 | = 26 |
| FE (고장영향) | 20 | = 20 |
| FC (고장원인) | 104 | = 104 |
| FailureLink | 111 | = 111 |
| RiskAnalysis | 111 | = 111 |
| DC (검출관리) in RiskAnalysis | 111 | = 111 (NULL 0건) |
| PC (예방관리) in RiskAnalysis | 111 | = 111 (NULL 0건) |
| Chains with DC | 111 | = 111 |
| Chains with PC | 111 | = 111 |
| flatData 합계 | 682 | ≥ 680 |

##### flatData 항목별 기대값

| 코드 | 이름 | 기대값 | PASS 기준 |
|------|------|--------|-----------|
| A1 | 공정번호 | 21 | = 21 |
| A2 | 공정명 | 21 | = 21 |
| A3 | 공정기능 | 21 | ≥ 20 |
| A4 | 제품특성 | 26 | ≥ 25 |
| A5 | 고장형태 | 26 | = 26 |
| A6 | 검출관리 | 21 | ≥ 20 (공정별 중복제거) |
| B1 | 작업요소 | 91 | = 91 |
| B2 | 요소기능 | 101 | ≥ 100 |
| B3 | 공정특성 | 101 | ≥ 100 |
| B4 | 고장원인 | 104 | = 104 |
| B5 | 예방관리 | 98 | ≥ 90 (L3별 중복제거) |
| C1 | L1 범주 | 3 | ≥ 3 |
| C2 | L1 기능 | 7 | ≥ 7 |
| C3 | L1 요구사항 | 17 | ≥ 17 |
| C4 | 고장영향 | 20 | = 20 |

##### 5단계 검증 PASS 기준

**STEP 1 — IMPORT**
| 검증 항목 | PASS 기준 | FAIL 시 조치 |
|-----------|-----------|-------------|
| Legacy 데이터 존재 | `legacy != null` | Import 재실행 |
| L2 공정 수 | ≥ 20 | 엑셀 시트 확인 |
| L1 완제품명 | 비어있지 않음 | L1 시트 확인 |

**STEP 2 — 파싱**
| 검증 항목 | PASS 기준 | FAIL 시 조치 |
|-----------|-----------|-------------|
| A5 (고장형태) | > 0 | excel-parser.ts 확인 |
| B4 (고장원인) | > 0 | B4 파싱 로직 확인 |
| C4 (고장영향) | > 0 | L1 시트 파싱 확인 |
| A6 (검출관리) | > 0 | 통합시트 A6 추출 확인 |
| B5 (예방관리) | > 0 | 통합시트 B5 추출 확인 |
| 빈 공정특성 | = 0 | B3 빈값 원인 확인 |

**STEP 3 — UUID**
| 검증 항목 | PASS 기준 | FAIL 시 조치 |
|-----------|-----------|-------------|
| L2Structure | = 베이스라인 | rebuild-atomic 실행 |
| L3Structure | = 베이스라인 | rebuild-atomic 실행 |
| FM (FailureMode) | ≥ 베이스라인 90% | migration.ts 확인 |
| FC (FailureCause) | ≥ 베이스라인 90% | migration.ts 확인 |
| 고아 L3Function | = 0 | L3-L2 매핑 확인 |

**STEP 4 — FK (고장사슬)**
| 검증 항목 | PASS 기준 | FAIL 시 조치 |
|-----------|-----------|-------------|
| FailureLink | ≥ 베이스라인 50% | failureChainInjector 확인 |
| Broken FC (끊어진 FC) | = 0 | FC FK 확인 |
| Broken FM (끊어진 FM) | = 0 | FM FK 확인 |
| Broken FE (끊어진 FE) | = 0 | FE FK 확인 |
| Unlinked FC | = 0 | 미연결 FC 자동수정 |

**STEP 5 — WS (워크시트)**
| 검증 항목 | PASS 기준 | FAIL 시 조치 |
|-----------|-----------|-------------|
| 빈 공정특성 | = 0 | PC 데이터 확인 |
| 고아 공정특성 | = 0 | PC-FM 매핑 확인 |
| Legacy Links | ≥ 베이스라인 50% | legacyData 확인 |

##### 테스트 실행 커맨드 (복사 붙여넣기용)

```powershell
# 0. 사전: 타입 체크
npx tsc --noEmit

# 1. 파이프라인 검증 (GET = 읽기전용, POST = 자동수정 포함)
Invoke-RestMethod -Uri "http://localhost:3000/api/fmea/pipeline-verify?fmeaId=pfm26-m066" -Method GET | ConvertTo-Json -Depth 5

# 2. 파이프라인 자동수정 + ImportValidation 저장
Invoke-RestMethod -Uri "http://localhost:3000/api/fmea/pipeline-verify" -Method POST -Body '{"fmeaId":"pfm26-m066"}' -ContentType "application/json" | ConvertTo-Json -Depth 3

# 2b. FK 수선 (rebuild-atomic 없음) — 먼저 dryRun 권장
# Invoke-RestMethod -Uri "http://localhost:3000/api/fmea/repair-fk" -Method POST -Body '{"fmeaId":"pfm26-m066","dryRun":true}' -ContentType "application/json" | ConvertTo-Json -Depth 5

# 3. rebuild-atomic (RiskAnalysis DC/PC 최신화)
Invoke-RestMethod -Uri "http://localhost:3000/api/fmea/rebuild-atomic?fmeaId=pfm26-m066" -Method POST | ConvertTo-Json -Depth 3

# 4. 마스터 FMEA 재생성 + DB 동기화
Invoke-RestMethod -Uri "http://localhost:3000/api/fmea/export-master" -Method POST -Body '{"fmeaId":"pfm26-m066"}' -ContentType "application/json" | ConvertTo-Json -Depth 5

# 5. 마스터 DC/PC 검증 (node)
node -e "const d=JSON.parse(require('fs').readFileSync('data/master-fmea/pfm26-m066.json','utf8')); const r=d.atomicDB.riskAnalyses; const ch=d.chains; console.log('risks:',r.length,'DC:',r.filter(x=>x.detectionControl?.trim()).length,'PC:',r.filter(x=>x.preventionControl?.trim()).length); console.log('chains:',ch.length,'dcChain:',ch.filter(x=>x.dcValue?.trim()).length,'pcChain:',ch.filter(x=>x.pcValue?.trim()).length); console.log('flat:',JSON.stringify(d.stats.flatBreakdown));"

# 6. import-validation 실행 (16개 규칙 검증)
Invoke-RestMethod -Uri "http://localhost:3000/api/fmea/import-validation" -Method POST -Body '{"fmeaId":"pfm26-m066"}' -ContentType "application/json" | ForEach-Object { Write-Host "Total=$($_.summary.total) Errors=$($_.summary.errors) Warns=$($_.summary.warns)" }
```

> **STEP0 / rebuild-atomic**: `DISABLE_REBUILD_ATOMIC=1` 또는 `FMEA_REPAIR_NO_REBUILD=1` 이면 파이프라인 자동수정(`fixStructure`)이 L2=0일 때도 `rebuild-atomic`을 호출하지 않음 — Import 또는 `repair-fk` 우선.

##### 세션 시작 시 체크리스트

```
[ ] 1. dev 서버 기동 확인 (npm run dev, localhost:3000 응답)
[ ] 2. tsc --noEmit 에러 0건
[ ] 3. pipeline-verify GET → allGreen=true 확인
[ ] 4. 마스터 JSON DC/PC 103/103 확인
[ ] 5. 코드 수정 시작
```

##### 코드 수정 후 체크리스트

```
[ ] 1. tsc --noEmit 에러 0건
[ ] 2. pipeline-verify POST → allGreen=true
[ ] 3. rebuild-atomic 실행 → riskAnalyses=104
[ ] 4. export-master 실행 → DC=103, PC=103
[ ] 5. import-validation 실행 → 신규 ERROR 0건
[ ] 6. (Import 관련 수정 시) 원본 엑셀 re-import → pipeline ALL GREEN
```

##### 테스트 이력 로그 형식

> 이 형식으로 테스트 결과를 기록하여 회귀 추적에 사용한다.

```
## [날짜] 파이프라인 테스트 결과
- tsc: ✅ 에러 0건
- STEP1 IMPORT: ✅ L2=21
- STEP2 파싱: ✅ A6=103 B5=103
- STEP3 UUID: ✅ FM=26 FC=104
- STEP4 FK: ✅ links=104 broken=0
- STEP5 WS: ✅ emptyPC=0 orphanPC=0
- Master DC/PC: ✅ 103/103
- allGreen: ✅
- 수정사항: (해당 세션에서 변경한 내용)
- 발견된 이슈: (있으면 기록)
```

##### 발견된 버그 이력

| 날짜 | 증상 | 근본 원인 | 수정 파일 | 검증 |
|------|------|----------|----------|------|
| 2026-03-17 | RiskAnalysis DC/PC NULL → 마스터에 DC/PC 없음 | rebuild-atomic에서 riskAnalysis.deleteMany 누락 → 중복 208건 (NULL 우선 선택) | `rebuild-atomic/route.ts` L76 | ✅ DC=104 PC=104 |
| 2026-03-17 | 통합시트 A6/B5 파싱 누락 | excel-parser가 개별시트 존재 시 통합시트 전체 스킵 | `excel-parser.ts` L527-567 | ✅ A6>0 B5>0 |
| 2026-03-17 | rebuild-atomic에서 RiskAnalysis 미저장 | upsert 로직 누락 | `rebuild-atomic/route.ts` L408-443 | ✅ riskAnalyses=104 |
| 2026-03-18 | LLD추천/개선추천 저장 후 사라짐 (1차) | ATOMIC DIRECT 로드에서 legacy 6ST 키 미병합 | `useWorksheetDataLoader.ts` OPT_PREFIXES 병합 | ✅ lld=64 |
| 2026-03-19 | LLD추천/개선추천 재발 (2차) | API POST에서 optimizations→riskData 역매핑 누락 → 프로젝트 스키마 `lesson-opt-*` 0건 | `route.ts` step 13.5 역매핑 추가 | ✅ lesson-opt=64, detection-opt=104 |
| 2026-03-19 | m071 마스터JSON 없음 + orphanPC 8건 | export-master 미실행 + placeholder FC 누락 | pipeline-verify auto-fix + export-master | ✅ chains=126, orphanPC=0 |
| 2026-03-19 | rowSpan NULL 2765건 (전체 FlatItem) | PfmeaMasterFlatItem 생성 시 rowSpan 미설정 | DB UPDATE rowSpan=1 WHERE NULL | ✅ bad rowSpan=0 |
| 2026-03-19 | m069 Public↔Project riskData 불일치 | Public fmea_legacy_data.riskData 키 12개만 (Project 1638개) | sync-public-legacy 스크립트 실행 | ✅ Public keys=1650 |
| 2026-03-19 | 자동수정(fixStep3/4/5)이 orphanPC 악화 | placeholder FC/FL/RA 생성 → Atomic↔Legacy 불일치 확대 (FL 126 vs 118) | `pipeline-verify/route.ts` 자동생성 비활성화 → 경고만 표시 | ✅ 데이터 손상 차단 |
| 2026-03-19 | orphanPC 근본원인: B4.parentItemId=B1 | import-builder에서 B4→B1 연결 → buildWorksheetState에서 B4→B3 매칭 실패 → 순차폴백 → orphanPC | `import-builder.ts` B4.parentItemId → B3 ID로 변경 | ✅ m066 orphanPC=0, m069 orphanPC=0 |
| 2026-03-20 | emptyPC=1 재발 (Cu Target L3Function) | B4 dedup key={pno\|m4\|fc}에 WE 미포함 → Cu Target+Ti Target 동일 FC명 공유 → 1건 합침 → FC 미연결 → orphan L3F 삭제 | `import-builder.ts` B4 key에 WE 추가, `types.ts` StepBB4Item.we 필드 추가 | ✅ allGreen, emptyPC=0, 베이스라인 FC=103 갱신 |
| 2026-03-21 | FL dedup key에 feId 누락 → 유효 체인 8건 삭제 | FL key=`fmId\|fcId`로 동일 FM+FC의 다른 FE 연결 체인 삭제 → FL 103건 (실제 111건) | `rebuild-atomic/route.ts` FL key에 feId 추가 (`fmId\|fcId\|feId`) | ✅ FL=111, RA=111, DC/PC=111 |
| 2026-03-21 | UUID/FK 설계 원칙 부재 → 반복적 누락 | 모든 dedup key에 공정번호/구분 미포함 → 동일 텍스트 다른 엔티티 삭제 | Rule 1.6(근본원인분석) + Rule 1.7(UUID/FK설계) 추가, 전체 CODEFREEZE | ✅ 영구 CODEFREEZE 적용 |
| 2026-03-22 | 워크시트 전체 누락(빈 placeholder) — L1만 있는 단계 | `loadAtomicDB`는 L1-only여도 객체 반환인데 로더가 `l2Structures.length>0`일 때만 Atomic 적용 → DB와 UI 불일치 | `useWorksheetDataLoader.ts` 게이트를 `if (atomicData)`로 `loadAtomicDB`와 정합 | ✅ vitest + Playwright manual-screen-verify-pause |
| 2026-03-22 | `m001` DC/PC 156건 null + `f001` FC/FL/RA 0건 | 레거시 Import 훅이 `flat=[]`로 끝나고, 서버 저장은 체인 미전달/체인 누락 B4를 복구하지 못함. 파이프라인 자동수정도 public A6/B5 fallback이 없어 기존 RA 빈값을 못 채움 | `legacyParseResultToFlatData.ts` 추가 + `useImportFileHandlers.ts` 레거시 flat 복원, `save-from-import/route.ts` 체인 유도/체인기반 B4/B5/A6 보강, `pipeline-verify/auto-fix.ts` public A6/B5 fallback, `resave-import/route.ts` 보강 flat 사용 | ✅ `m001` allGreen, `f001` 0→23 FL/RA 회복 |
| 2026-03-23 | 구조분석 「아래로 새 행 추가」 시 placeholder가 위·아래 2줄로 보임 | React 18 Strict Mode(개발)에서 함수형 `setState` 업데이터가 동일 `prev`에 대해 2회 호출 → `splice` 이중 적용 | `createStrictModeDedupedUpdater` (`strictModeStateUpdater.ts`) + `StructureTab` 행 추가/병합/삭제 업데이터 적용 | ✅ `strictModeStateUpdater.test.ts` |
| 2026-03-23 | 구조분석 행이 위·아래 중복(재발: 위로 2줄 등) | `setStateSynced`가 `updater(stateRef)`+`setState(객체)`로 React 큐 `prev`와 불일치 → 동일 인덱스에 삽입이 2회 적용될 수 있음 | `useWorksheetState` `setStateSynced`를 `setState(prev=>…)`로 통일 + `PfmeaContextMenu` 메뉴 `stopPropagation`/`type="button"` | ✅ tsc + vitest |

### 🔴 Rule 1.6: 근본원인 분석 원칙 — UUID/FK/DB/API 설계 우선 (2026-03-21) — 영구 CODEFREEZE

> **모든 데이터 문제의 근본원인은 UUID, FK, DB 스키마, API 설계, 레거시 데이터 사용에 있다.**
> **이 5가지를 먼저 분석하지 않고 증상만 처방하면 자동채움, 폴백, 카테시안, 이름매칭 등 거짓 데이터가 생성된다.**

#### 1.6.1 근본원인 분석 5대 체크리스트 (MANDATORY)

> 사용자가 "근본원인 분석" 또는 데이터 누락/불일치를 보고하면, **반드시 아래 5가지를 순서대로 분석**한다.

| 순서 | 분석 대상 | 점검 항목 | 위반 시 증상 |
|------|----------|----------|-------------|
| 1 | **UUID 설계** | dedup key에 공정번호/구분 포함 여부, 카테시안 복제 여부 | 데이터 누락, 중복 생성 |
| 2 | **FK 설계** | FailureLink에 fmId+fcId+feId 3요소 포함 여부, 고아 레코드 | 고장연결 소실, orphanPC |
| 3 | **DB 스키마** | 프로젝트 스키마 분리, 테이블 관계, 컬럼 매핑 | 다른 프로젝트 데이터 혼재 |
| 4 | **API 설계** | 저장/로드 경로에 필터/변환 삽입 여부, 트랜잭션 래핑 | 데이터 소실, 부분 저장 |
| 5 | **레거시 데이터 사용** | JSON blob을 SSoT로 사용 여부, Atomic DB 미동기화 | 렌더링 불일치, 새로고침 시 소실 |

#### 1.6.2 증상 처방 절대 금지 (Anti-Pattern)

```
❌ 증상 처방 (금지):
  데이터 누락 발견 → 자동채움/폴백으로 빈칸 메우기
  FK 깨짐 발견 → 이름 매칭으로 재연결
  중복 발견 → 단어만 보고 삭제
  렌더링 빈칸 → placeholder 자동생성

✅ 근본원인 치료 (필수):
  데이터 누락 발견 → UUID dedup key 점검 → key에 공정번호 누락 → key 수정
  FK 깨짐 발견 → FailureLink FK 3요소 점검 → feId 누락 → FL key 수정
  중복 발견 → dedup key에 컨텍스트(공정번호/구분) 포함 → 동일 텍스트라도 별도 엔티티
  렌더링 빈칸 → DB 조회 → Master DB 보충 → 없으면 사용자 입력 유도
```

#### 1.6.3 사실 기반 FL 원칙 + 논리 오류 경고 표시

> **FMEA는 사실에 근거한 엔지니어의 기술적 판단이 FL(FailureLink)로 만들어지는 시스템이다.**
> **자동생성, 이름매칭, 폴백은 거짓 데이터를 만들어 위험하다.**
> **모든 렌더링은 반드시 사실관계에 의한 FK 기반으로만 동작해야 한다.**

| 구분 | 원칙 | 구현 방법 |
|------|------|----------|
| **FL 생성** | 사실에 근거한 FK만 → FailureLink 생성 | Import/Migration에서 FK 확정된 데이터만 createMany |
| **렌더링** | FK 기반만 → 화면 표시 | `Map.get(id)` 조회, 없으면 빈칸 (자동생성 금지) |
| **논리 오류** | 붉은색 경고 표시 → 엔지니어가 수정 | FM↔FE 불일치, FK 끊김 등 → 빨간 배경/테두리로 경고 |
| **수정 저장** | 엔지니어 수정 → Master DB 자동 업데이트 | `syncMasterFromProject()` → Living DB 지속 개선 |

```
사실 기반 FL 생성 흐름:
  구 Smart FMEA → 엑셀 Export → Import → FK 기반 FL 생성 (자동생성 없음)
    → 워크시트 표시 → 논리 오류 발견 시 붉은색 경고
    → 엔지니어 수정 → 저장 → Master DB 업데이트
    → 다음 FMEA 생성 → 개선된 Master 참조 → 지속 개선 루프
```

#### 1.6.4 위반 시

- 증상 처방 코드 발견 → **즉시 삭제** + 근본원인 5대 분석 수행
- 자동채움/폴백/카테시안/이름매칭 코드 → **즉시 삭제** + DB 설계 점검
- **이 룰은 영구 CODEFREEZE** — 수정 시 반드시 다음 문구로 허락 요청: "Rule 1.6 근본원인 분석 원칙을 수정해도 될까요? 수정 사유: ___"

---

### 🔴 Rule 1.7: UUID/FK 설계 원칙 — 모든 ID에 컨텍스트 정보 포함 (2026-03-21) — 영구 CODEFREEZE

> **모든 엔티티의 dedup key(UUID 생성 기준)에는 해당 엔티티가 속한 컨텍스트(공정번호, 구분)를 반드시 포함한다.**
> **FK 매칭은 ID 기반만 허용한다. 텍스트/이름 기반 매칭은 FK 연결에 절대 사용하지 않는다.**

#### 1.7.1 엔티티별 dedup key 필수 구성 (영구 CODEFREEZE)

| 엔티티 | dedup key 구성 | 필수 포함 | 위치 |
|--------|---------------|----------|------|
| **FailureLink (FL)** | `fmId\|fcId\|feId` | fmId + fcId + **feId** (3요소 필수) | rebuild-atomic |
| **FailureCause (FC)** | `l2StructId\|l3StructId\|cause` | **l2StructId** (=공정) | rebuild-atomic, migration |
| **A4 (ProductChar)** | `pno\|char` | **pno** (공정번호) | import-builder |
| **A5 (FailureMode)** | `pno\|fm` | **pno** | import-builder |
| **B1 (L3Structure)** | `pno\|m4\|we` | **pno** | import-builder |
| **B2 (L3Function)** | `pno\|m4\|we` | **pno** | import-builder |
| **B3 (ProcessChar)** | dedup 없음 (B4마다 독립 생성) | N/A | buildWorksheetState |
| **B4 (FailureCause)** | `pno\|m4\|we\|fm\|fc` | **pno** + m4 + we | import-builder |
| **B5 (PreventionCtrl)** | `pno\|m4\|we\|fc\|pc` | **pno** | import-builder |
| **C4 (FailureEffect)** | `procNo\|scope\|fe` | **procNo** + **scope**(구분) | import-builder |
| **L1Function** | `category\|functionName` | **category** (구분/C1) | migration |

#### 1.7.2 FK 매칭 원칙 (ID-ONLY)

| 구분 | 허용 | 금지 | 이유 |
|------|------|------|------|
| **엔티티 연결** | `Map.get(id)`, FK 직접 참조 | `.find(x => x.name === ...)` | 동음이의어 오연결 |
| **고장사슬** | `fmId`/`fcId`/`feId` UUID FK | 텍스트 유사도 매칭 | 재현 불가 |
| **데이터 조회** | Prisma `where: { id }` | `where: { name: ... }` | 동일 이름 다수 존재 |
| **CP/PFD 연동** | `productCharId` FK 직접 참조 | 텍스트 재매칭 | 오타/변경 시 깨짐 |

#### 1.7.3 핵심 원리: "동일 텍스트 ≠ 동일 엔티티"

```
예시: "작업숙련도부족" (FC)
  - 공정 10 (PR Coating) → 작업숙련도부족 = FC-001 (별도 UUID)
  - 공정 15 (Develop) → 작업숙련도부족 = FC-002 (별도 UUID)
  - 공정 20 (Etch) → 작업숙련도부족 = FC-003 (별도 UUID)
  → 18개 공정에 동일 텍스트 → 18개 별도 FC (공정번호가 key에 포함)

예시: "표면 불량" (FM)
  - 공정 10 (PR Coating) → FM-001
  - 공정 25 (Au Plating) → FM-002
  → 동일 "표면 불량"이지만 다른 공정 → 별도 FM
```

#### 1.7.4 위반 시

- dedup key에서 공정번호/구분 누락 발견 → **즉시 수정** + 영향 범위 파악
- 텍스트 매칭으로 FK 연결 → **즉시 삭제** + ID 기반으로 교체
- **이 룰은 영구 CODEFREEZE** — 수정 시 반드시 다음 문구로 허락 요청: "Rule 1.7 UUID/FK 설계 원칙을 수정해도 될까요? 수정 사유: ___"

> **상세 명세서**: `docs/UUID_FK_SPECIFICATION.md` 참조

#### 1.7.5 parentItemId 필수 규칙 (2026-03-21)

> **모든 FlatData 생성 시 parentItemId FK 체인을 반드시 설정한다.**

| 엔티티 | parentItemId 대상 | 규칙 |
|--------|------------------|------|
| B2 (요소기능) | B1.id (L3Structure) | 필수 — 없으면 B2 스킵 |
| B3 (공정특성) | B1.id (L3Structure) | 필수 — 없으면 B3 스킵 |
| B4 (고장원인) | B3.id (L3Function) | 필수 — B1이 아닌 **B3** |
| A5 (고장형태) | A4.id (L2Function) | 필수 — 없으면 A5 스킵 |
| C3 (요구사항) | C2.id (L1Function) | 필수 — 없으면 C3 스킵 |

- ❌ **parentItemId 없이 엔티티 생성 금지** — FK 없는 엔티티는 고아 데이터
- ❌ **UUID v4로 B1/B4 ID 생성 금지** — `genB1()`/`genB4()` 결정론적 함수만 사용
- ✅ **모든 ID는 `uuid-generator.ts`의 genXxx() 함수로 생성**

#### 1.7.6 FK 중심 꽂아넣기 시스템 — 13개 보호 레이어 (2026-03-21)

> **UUID 누락, 중복 ID 생성, 다른 공정 ID 혼입을 근본 차단하는 13개 시스템**

| # | 시스템 | 파일 | 용도 |
|---|--------|------|------|
| 1 | **UUID 검증 유틸리티** | `src/lib/uuid-rules.ts` | parseUuid, validateParentChild, validateDedupKey, validateNoCartesian |
| 2 | **FK 무결성 검증 API** | `src/app/api/fmea/validate-fk/route.ts` | 10개 FK/커버리지 검증 (orphan FL/RA/PC, cross-process, duplicate UUID, FM→FL 커버리지, FL→RA 1:1) |
| 2b | **FK 수선 API (rebuild 없음)** | `src/app/api/fmea/repair-fk/route.ts`, `src/lib/fmea-core/fk-repair.ts` | 무효 FL·고아 RA/Opt·선택 공정교차 FL 삭제, 무효 `FM.productCharId`→null; `dryRun`; 텍스트 재매칭 없음 |
| 3 | **Import 사전검증** | `src/lib/fmea-core/validate-import.ts` | 10개 규칙 (processNo, parentItemId chain, dedup key, autoGen 텍스트) |
| 4 | **CP UUID 생성기** | `src/lib/uuid-generator.ts` (genCpItem 등 6개) | CP 결정론적 UUID (CP-P-{pno}-I-{seq}) |
| 5 | **PFD FK 검증** | `src/lib/fmea-core/validate-pfd-fk.ts` | PFD↔FMEA FK 교차 검증 (L2/L3/PC orphan, cross-process) |
| 6 | **Export 전 검증** | `src/lib/fmea-core/validate-export.ts` | 7개 체크 (FL FK, RA 1:1, orphan L3F/FC, DC/PC null) |
| 7 | **Optimistic Locking** | `src/lib/fmea-core/optimistic-lock.ts` | 동시편집 충돌 방지 (version 기반) |
| 8 | **Audit Trail** | `src/lib/fmea-core/audit-trail.ts` | DB 변경 감사 추적 (who/what/when) |
| 9 | **Atomic Cell Save** | `src/lib/fmea-core/atomic-cell-save.ts` | 셀 편집 → DB 즉시 반영 (500ms 큐) |
| 10 | **Atomic Risk Map** | `src/lib/fmea-core/atomic-risk-map.ts` | 레거시 riskData 교체 (Map<flId, RiskEntry>) |
| 11 | **Project Clone** | `src/lib/fmea-core/project-clone.ts` | 프로젝트 복제 + UUID 재생성 + FK 재매핑 |
| 12 | **Undo/Redo** | `src/lib/fmea-core/undo-redo.ts` | DB 기반 변경 스택 (Ctrl+Z/Y) |
| 13 | **DC/PC FK 추적** | `src/lib/fmea-core/dc-pc-source-tracker.ts` | DC/PC 소스 FK 검증 (산업DB/LLD/Master) |

> **명세서**: `docs/UUID_FK_SPECIFICATION.md` 참조

---

### 🔴 Rule 2: 기존 UI 변경 금지
기존 UI는 절대 변경하지 않습니다. 사용자가 명시적으로 UI 변경을 요청한 경우에만 수정합니다.

### 🔴 Rule 3: 코드프리즈 수정 금지
`CODEFREEZE` 주석이 있는 파일은 절대 수정하지 않습니다. 수정 필요시 반드시 사용자에게 허락을 먼저 요청합니다.

### 🔴 Rule 4: 명시적 허락 필수 (유추 허락 금지)
수정이 필요한 경우 반드시 사용자의 명시적 허락을 받습니다.
- ❌ "아마 괜찮을 것 같아서" 수정 → 금지
- ✅ "이 파일의 이 부분을 수정해도 될까요?" → 필수

### 🟡 Rule 5: 데이터 연동 고려
관련 앱 화면의 데이터 연동을 항상 고려합니다 (PFMEA↔DFMEA, FMEA↔CP 등)

### 🟡 Rule 6: 모듈화/표준화/공용화 검토 (700행 제한)
새로운 기능 추가 시 반드시 검토합니다:
- 기존 코드 줄 수: **700행 초과 시 분리 필수**
- 동일 패턴의 코드는 공용 함수로 추출
- PFMEA/DFMEA 공통 로직은 공용 모듈 사용

### 🟡 Rule 7: DB 원자성 보장
모든 화면 데이터는 DB에 원자성 있게 보관되어야 합니다. `saveAtomicDB()` 호출 필수.

### 🟡 Rule 8: CRUD 종합 검토
기능 개발 시 CRUD 모든 측면에서 종합적으로 검토합니다:
- Create/Read/Update/Delete 각각 DB 저장/로드 확인
- `setStateSynced` + `saveAtomicDB` 패턴 사용

### 🟡 Rule 9: 타입 지정 필수
모든 코드에 명확한 타입을 지정합니다. `any` 타입 남발 금지.

### 🔴 Rule 10: 기존 기능 손상 금지 (핵심 로직 보호)
새 기능 추가 시 기존 핵심 로직을 절대 수정하지 않습니다.
- ⛔ **고장연결 절대 수정 금지**: `useSVGLines.ts`, `linkedFEs`/`linkedFCs` 상태, FM 선택 useEffect
- ✅ **안전한 방법**: 기존 상태는 읽기만, 수정은 `savedLinks`만, 별도 상태 사용
- 위반 시 **즉시 롤백**

### 🔴 Rule 10.5: 데이터 로드 파이프라인 불변 원칙 (2026-02-09)
> 사고 경위: 데이터 로드 경로에 필터 함수 삽입 → 수동모드 placeholder 삭제 → 기능 파괴

1. **`useWorksheetDataLoader.ts`의 `l2:` 할당 라인에 필터/변환 함수 삽입 절대 금지**
2. **빈 이름(`''`)의 L3를 삭제하는 로직 추가 금지** (수동모드 입력용 placeholder)
3. 새 로직 필요 시 → 별도 useEffect 또는 useMemo에서 처리 (원본 불변)
4. 위반 시 **즉시 롤백** + `tests/e2e/manual-mode-guard.spec.ts` 실행 필수

### 🔴 Rule 12: 온프레미스 출시 에러 제로 정책 (2026-02-16)
1. **어떤 에러가 발견되더라도 완벽하게 모두 수정한다** (`tsc --noEmit` 에러 0개 유지)
2. 관련 앱(PFMEA/DFMEA/CP/PFD/PM/WS/APQP) 전체를 에이전트로 진단하고 **병렬 수정**한다
3. 수정 완료된 파일은 즉시 **코드프리즈** 적용한다
4. 빌드/타입체크 통과 확인 후 커밋한다

### 🔴 Rule 13: 배포환경 코드 품질 (2026-02-16)
1. **페이지 로드 시 `createSample*()` 자동 호출 금지** (개발 모드 전용 기능)
2. **DB가 비어있으면 빈 상태 유지** → 사용자가 Import/추가로 직접 등록
3. **미사용 export 함수/import는 즉시 제거** (dead code 방치 금지)
4. 기능 삭제 시 관련 함수·타입·import 모두 연쇄 제거

### 🔴 Rule 14: Handsontable 사용 금지 (2026-02-20)
> 마이그레이션 완료: Handsontable → HTML `<table>` + Tailwind CSS (2026-02-20)

1. **Handsontable 라이브러리 신규 도입/재설치 절대 금지** (`npm install handsontable` 금지)
2. **모든 데이터 그리드/테이블은 HTML `<table>` + Tailwind CSS로 구현**
3. 정렬 기능: `useState(sortKey/sortDir)` + `useMemo` 패턴 사용 (BdStatusTable 참조)
4. 셀 렌더러: React 인라인 컴포넌트로 구현 (ProgressCell, StatusCell 등)
5. **금지 사유**: 라이선스 이슈 (`non-commercial-and-evaluation`), 번들 크기 (~550KB), deprecated 패키지
6. **참조 문서**: `docs/Handsontable_마이그레이션_계획서.md`
7. **롤백 태그**: `rollback-20260220-b2b3guard`

### 🔴 Rule 15: 코드 수정 후 파이프라인 검증 필수 (2026-03-18)
> **모든 코드 수정 완료 후 파이프라인 검증(`/api/fmea/pipeline-verify`)을 반드시 실시한다.**

1. **수정 완료 즉시 검증**: 코드 수정이 끝나면 `tsc --noEmit` + 파이프라인 검증 API를 호출하여 6단계(SAMPLE→IMPORT→파싱→UUID→FK→WS) 전체를 검증한다
2. **3회 순차 회귀 검증**: 검증에서 누락/불일치가 발견되면 즉시 수정 → 재검증을 **최대 3회** 반복하여 코드를 완벽하게 수정한다
3. **검증 보고 필수**: 각 회차의 검증 결과(PASS/FAIL 항목, 수정 내역)를 사용자에게 보고한다
4. **검증 항목**: fmeaId 일치성(10개 테이블), A1~C4 교차대조 매트릭스, 14개 FK 전수 검증, 모자관계(L2→L3→L3F→FC), Atomic↔Legacy ID 동기화

```
수정 완료 → tsc --noEmit → pipeline-verify (6단계)
               ↓ FAIL
         수정 → 재검증 (1회차)
               ↓ FAIL
         수정 → 재검증 (2회차)
               ↓ FAIL
         수정 → 재검증 (3회차)
               ↓ PASS → 완료 보고
```

- ❌ **검증 없이 "완료" 보고 금지** — 파이프라인 검증 결과 표 없이 작업 완료라고 하면 안 됨
- ❌ **단순 tsc 통과만으로 완료 금지** — tsc는 타입만 확인, 데이터 정합성은 파이프라인 검증으로만 확인 가능
- ✅ **검증 결과 표 포함 보고 필수** — STEP별 상태(OK/WARN/ERROR), 교차검증 일치 여부, FK 고아 건수

### 🔴 Rule 16: Raw SQL 테이블/컬럼명 — Prisma @@map 기준 snake_case 필수 (2026-03-18)

> **Raw SQL에서 PascalCase 테이블명 사용 절대 금지. Prisma `@@map`으로 매핑된 snake_case 이름만 사용한다.**

1. **Prisma ORM 우선**: `$queryRawUnsafe`/`$executeRawUnsafe` 대신 Prisma ORM API(`findMany`, `count`, `create` 등)를 우선 사용
2. **raw SQL 허용 조건**: 동적 스키마 관리(`SET search_path`, `"${schema}".table`), `information_schema` 조회 등 Prisma가 지원하지 않는 경우에만
3. **테이블명 규칙**: `@@map` snake_case만 사용 — `fmea_projects` (O), `"FmeaProject"` (X)
4. **컬럼명 규칙**: Prisma `@map` 또는 필드명 그대로 쌍따옴표 — `"fmeaId"` (O), `fmea_id` (X)
5. **CREATE TABLE 패턴**: `LIKE public.{snake_case_table} INCLUDING ALL` 사용 (미래 컬럼 자동 상속)
6. **CP/PFD 라우트**: `cpNo`는 `cp_master_datasets`에만 존재 → `cp_master_flat_items` 조회 시 반드시 관계(`dataset: { cpNo }`) 사용

**주요 매핑 참조** (`prisma/schema.prisma` 기준):

| 코드 모델명 | SQL 테이블명 | 주의 컬럼 |
|-------------|-------------|----------|
| `FmeaLegacyData` | `fmea_legacy_data` | `data` (not `legacyData`) |
| `FailureMode` | `failure_modes` | `mode` (not `name`) |
| `RiskAnalysis` | `risk_analyses` | |
| `FmeaConfirmedState` | `fmea_confirmed_states` | |
| `CpMasterFlatItem` | `cp_master_flat_items` | `cpNo` 없음 (datasets에) |

- ❌ `await pool.query('SELECT "legacyData" FROM "FmeaLegacyData"')` — 테이블명+컬럼명 모두 틀림
- ✅ `await pool.query('SELECT data FROM fmea_legacy_data WHERE "fmeaId" = $1', [id])`

### 🔴 Rule 17: 코드 변경 시 CLAUDE.md + Maintenance 매뉴얼 동기화 필수 (2026-03-18)

> **모든 코드 변경은 반드시 `CLAUDE.md`와 Maintenance 매뉴얼에 동시 반영한다.**

1. **동기화 대상 문서** (3개):
   - `CLAUDE.md` — 룰/아키텍처/검증 기준
   - `docs/MAINTENANCE_MANUAL.md` — Import 파이프라인 유지보수 (핵심 파일맵, 데이터 흐름, 버그 패턴, 체크리스트)
   - `docs/00_MAINTENANCE_MANUAL.md` — 전체 모듈 동작 체크리스트, 트러블슈팅, 테스트 커버리지, 버그 수정 이력

2. **반영 시점**: 코드 수정 완료 + 검증 통과 후, 커밋 전에 문서 동기화
3. **반영 범위**:
   - 새 룰/아키텍처 변경 → `CLAUDE.md` Rule 추가/수정
   - 새 버그 수정 → `00_MAINTENANCE_MANUAL.md` 트러블슈팅 + 버그 수정 이력 추가
   - 파이프라인/Import/DB 변경 → `docs/MAINTENANCE_MANUAL.md` 핵심 파일맵/데이터 흐름 수정
   - 새 테스트 추가 → `00_MAINTENANCE_MANUAL.md` 테스트 커버리지 + 회귀 테스트 명령어 추가
   - CODEFREEZE 변경 → 양쪽 매뉴얼 CODEFREEZE 목록 갱신
4. **날짜 갱신**: 수정한 문서의 `최종 업데이트` 날짜를 당일로 변경
5. **이력 추가**: `00_MAINTENANCE_MANUAL.md` 업데이트 이력 테이블에 한 줄 추가

- ❌ 코드만 수정하고 문서 미갱신 → **금지** (다음 세션에서 정보 불일치 발생)
- ✅ 코드 수정 → 검증 → 문서 3개 동기화 → 커밋

### 🟡 Rule 18: Living DB 아키텍처 — 산업DB/LLD/SOD 자동 동기화 (2026-03-21)

> **산업DB(DC/PC), LLD, SOD 기준표는 독립 UUID 테이블로 관리하며, 워크시트 저장 시 Master DB에 자동 동기화한다.**

#### 18.1 소스 추적 (Source Traceability)

| 필드 | 테이블 | 용도 |
|------|--------|------|
| `dcSourceType` | `risk_analyses` | DC 출처: 'manual' \| 'master' \| 'industry' \| 'lld' \| 'keyword' |
| `dcSourceId` | `risk_analyses` | DC 소스 엔티티 UUID |
| `pcSourceType` | `risk_analyses` | PC 출처: 'manual' \| 'master' \| 'industry' \| 'lld' |
| `pcSourceId` | `risk_analyses` | PC 소스 엔티티 UUID |

#### 18.2 산업DB 자동 레이팅

| 테이블 | 필드 | 용도 |
|--------|------|------|
| `kr_industry_detection` | `defaultRating` | 기본 D값 (1-10, 낮을수록 검출 잘됨) |
| `kr_industry_prevention` | `defaultRating` | 기본 O값 (1-10, 낮을수록 예방 잘됨) |

- 자동추천 DC/PC 실행 시, 산업DB 항목의 `defaultRating` 우선 적용
- fallback: 기존 `recommendDetection()` 함수

#### 18.3 Optimization → Master 동기화

- `extractChainsFromAtomicDB()`에서 `optimization` 테이블 포함
- `ChainEntry`에 `optRecommendedAction`, `optNewS/O/D` 등 7개 필드 추가
- 워크시트 저장 → `syncMasterReferenceFromChains()` → `MasterFmeaReference` 자동 업데이트

#### 18.4 Living DB 테이블 현황

| 테이블 | 건수 | 용도 |
|--------|------|------|
| `lld_filter_code` | 12+ | LLD 통합 교훈DB (SOD 포함) |
| `lessons_learned` | 8+ | LLD 레거시 |
| `kr_industry_detection` | 25+ | 산업 공통 DC (D 레이팅 포함) |
| `kr_industry_prevention` | 25+ | 산업 공통 PC (O 레이팅 포함) |
| `continuous_improvement_plan` | 8+ | AP 개선 계획 |
| `master_fmea_reference` | 91+ | 마스터 참조 (Living DB) |

#### 18.5 API 엔드포인트

| API | 용도 |
|-----|------|
| `GET /api/kr-industry?type=all` | 산업DB 조회 (defaultRating 포함) |
| `GET /api/kr-industry/usage` | 산업DB 사용 통계 |
| `GET /api/lld/usage` | LLD 사용 현황 역추적 |
| `POST /api/lld/apply` | LLD 적용결과 업데이트 |

### 🔴 Rule 19: 프로젝트별 별도 DB 스키마 필수 — public 직접 저장 금지 (2026-03-21)

> **모든 프로젝트 데이터는 프로젝트 전용 DB 스키마에 저장한다. public 스키마에 프로젝트 데이터를 직접 저장하지 않는다.**

#### 19.1 스키마 명명 규칙

| 프로젝트 유형 | 스키마 패턴 | 예시 |
|-------------|-----------|------|
| **PFMEA** | `pfmea_{fmeaId}` (하이픈→언더스코어) | `pfmea_pfm26_m066` |
| **CP** | `cp_{cpNo}` | `cp_cp26_m066` |
| **PFD** | `pfd_{pfdNo}` | `pfd_pfd26_m066` |

#### 19.2 public vs 프로젝트 스키마 구분

| 구분 | public 스키마 | 프로젝트 스키마 |
|------|-------------|--------------|
| **저장 대상** | 프로젝트 메타(TripletGroup, FmeaProject, FmeaRegistration), 공통 참조(산업DB, SOD기준표, MasterRef) | Atomic 구조(L1~L3), 기능(L1F~L3F), 고장(FM/FE/FC/FL), 위험(RA), 개선(Opt), Legacy |
| **Import FlatItem** | `pfmea_master_datasets`, `pfmea_master_flat_items` (staging) | Atomic DB 테이블 (확정 데이터) |
| **금지** | ❌ L1/L2/L3/FM/FE/FC/FL/RA를 public에 직접 저장 | ❌ TripletGroup/산업DB를 프로젝트 스키마에 복제 |

#### 19.3 프로젝트 생성 절차

```
1. TripletGroup 등록 (public) — tg26-mXXX
2. FmeaProject 등록 (public) — fmeaId, tripletGroupId FK
3. FmeaRegistration 등록 (public) — 기초정보
4. 프로젝트 스키마 생성 — CREATE SCHEMA pfmea_pfm26_mXXX
5. Atomic 테이블 생성 — LIKE public.{table} INCLUDING ALL
6. 데이터 저장 — 프로젝트 스키마에만 INSERT
```

- ❌ **public 스키마에 Atomic 데이터 직접 INSERT 금지**
- ❌ **스크립트에서 프로젝트 등록 시 public 테이블 컬럼 추측 금지** — 반드시 `information_schema.columns` 조회 후 INSERT
- ✅ **메타 등록(TripletGroup/FmeaProject/FmeaRegistration)만 public에 저장**
- ✅ **모든 Atomic 데이터는 프로젝트 전용 스키마에 저장**

### 🔵 Rule 11: UI 슬림화 및 패딩 최소화 (2026-01-23)
1. 모든 테이블 셀 내의 불필요한 아이콘(드롭다운 꺽쇄, 날짜 아이콘 등)은 기본적으로 감춥니다.
2. 행 높이 및 패딩을 최소화하여 100% 배율에서 더 많은 정보가 보이도록 최적화합니다. (LLD No 등 주요 컬럼 패딩 0~2px)
3. 드롭다운이나 날짜 선택 등의 상호작용은 테이블 헤더 라벨링을 통해 암시하거나 호버 시에만 표시하여 화면을 넓고 깔끔하게 유지합니다.

---

## Project Overview

FMEA On-Premise is a Korean-language enterprise quality management system for APQP (Advanced Product Quality Planning), PFMEA/DFMEA (Process/Design FMEA), Control Plans, and PFD (Process Flow Diagrams). Built as a full-stack Next.js application with PostgreSQL.

## Tech Stack

- **Framework**: Next.js 16.1.1 with App Router
- **Language**: TypeScript 5 (strict mode)
- **Frontend**: React 19.2.3, Radix UI, Tailwind CSS 4
- **Database**: PostgreSQL with Prisma ORM 7.2.0
- **Spreadsheets**: HTML `<table>` + Tailwind CSS for data grids, ExcelJS/xlsx for import/export
- **Charts**: Chart.js with react-chartjs-2

## Development Commands

```bash
# Development server (default port 3000)
npm run dev
npm run dev:4000    # Port 4000
npm run dev:5000    # Port 5000

# Production build
npm run build
npm start

# Database
npm run db:generate  # Generate Prisma client (run after schema changes)
npm run db:migrate   # Run migrations
npm run db:push      # Push schema to DB
npm run db:studio    # Open Prisma Studio GUI

# Linting
npm run lint
```

## Architecture

### Data Model Hierarchy

The system follows a strict hierarchical structure:

```
APQPProject (최상위)
├── FMEA Project (PFMEA/DFMEA)
│   ├── L1Structure (완제품 공정) → L1Function → FailureEffect
│   ├── L2Structure (공정) → L2Function → FailureMode
│   └── L3Structure (작업요소) → L3Function → FailureCause
│
├── ControlPlan (관리계획서)
│   └── CpAtomicProcess → Detectors, ControlItems, Methods, ReactionPlans
│
└── PFD (공정흐름도)
    └── PfdItem
```

### Key Database Patterns

1. **Hybrid ID System**: Tables use `parentId`, `mergeGroupId`, `rowSpan`, `colSpan` fields for row merging in worksheets
2. **FailureLink**: Central table connecting FailureMode ↔ FailureEffect ↔ FailureCause (FM-FE-FC triad)
3. **Atomic DB Pattern**: Control Plan uses atomic row-level tables for worksheet synchronization

### Directory Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # 55+ REST API routes
│   ├── apqp/              # APQP module
│   ├── pfmea/             # PFMEA module (register, worksheet, import, revision)
│   ├── dfmea/             # DFMEA module
│   ├── control-plan/      # Control Plan module
│   ├── pfd/               # Process Flow Diagram
│   └── master/            # Master data management
├── components/
│   ├── layout/            # Header, Sidebar, TopNav
│   ├── modals/            # Dialog components
│   ├── tables/            # Table components
│   └── worksheets/        # Worksheet-specific components
├── hooks/                 # Custom React hooks
├── lib/
│   ├── prisma.ts          # Prisma client singleton
│   └── fmea-core/         # Core FMEA logic
└── types/                 # TypeScript type definitions
```

### Module Pattern (Worksheets)

Each worksheet module follows this structure:
```
worksheet/
├── page.tsx              # Main page (<700 lines)
├── constants.ts
├── utils.ts
├── components/
├── hooks/
├── tabs/                 # Tab-specific components
└── panels/               # Right-side panels (AP Table, RPN Chart, Tree)
```

## Key Rules

### File Size Limits
- **Maximum 700 lines per file** - split larger files
- New features should always be in new files
- Separate data/constants into `data/` folders

### Worksheet Design Principles
1. Menu bar fixed at top, doesn't scroll
2. Only one horizontal scrollbar per container
3. Vertical scrollbar controls worksheet only
4. Design for 1440px browser width

### Database Operations
- Always use `prisma.ts` singleton from `@/lib/prisma`
- Schema file: `prisma/schema.prisma`
- Run `npm run db:generate` after schema changes

### Git Hooks
Protected paths are enforced via git hooks:
- `pre-commit`: Check staged files
- `commit-msg`: Validate commit messages
- `pre-push`: Branch protection

## Important Files

- `prisma/schema.prisma` - Database schema (60+ models)
- `src/lib/prisma.ts` - Prisma client singleton
- `src/app/api/` - All API endpoints
- `docs/` - Extensive documentation (50+ files)
- `scripts/` - Database and migration utilities

## Documentation References

- `docs/MODULARIZATION_GUIDE.md` - File organization patterns
- `docs/WORKSHEET_DESIGN_PRINCIPLES.md` - UI layout rules
- `docs/DB_SCHEMA.md` - Database schema details
- `docs/중요_ONPREMISE_MASTER_PLAN.md` - FMEA workflow sequence
- `docs/매뉴얼사진/02_사용자매뉴얼.md` - 사용자 매뉴얼 (업무 순서 기반)

### 사용자 매뉴얼 이미지 규칙
- 이미지 저장 경로: `docs/images/`
- 매뉴얼 내 이미지 자리 표시 형식:
  ```markdown
  > 📸 **[화면 캡처]** 화면 설명
  >
  > ![대체텍스트](images/파일명.png)
  ```
- 사용자가 직접 캡처 → `docs/images/`에 저장 → 마크다운에서 자동 표시
- 매뉴얼은 **업무 순서 기반** 구성 (등록→Import→워크시트→연동→관리)

---

## 파이프라인 검증 매뉴얼 (2026-03-17)

### 개요

5단계 파이프라인 검증 + 자동수정 루프. 빨간불 → 자동수정 → 재검증 → 초록불 반복 (최대 3회).

**API**: `/api/fmea/pipeline-verify`
- `GET ?fmeaId=xxx` → 현재 상태 조회 (읽기 전용)
- `POST { fmeaId }` → 검증 + 자동수정 루프 실행

### 5단계 검증 항목

| 단계 | 이름 | 검증 대상 | 자동수정 |
|------|------|----------|---------|
| STEP 1 | IMPORT | Legacy 데이터 존재, L2 공정 수 | ❌ (사용자 개입 필요) |
| STEP 2 | 파싱 | A1~A6, B1~B5, C1~C4 카운트 | ✅ `fixStep2Parsing` |
| STEP 3 | UUID | Atomic DB L2/L3/FM/FE/FC 카운트, orphan L3Func | ✅ `fixStep3Uuid` |
| STEP 4 | FK | FailureLink FK 정합성, unlinked FC | ✅ `fixStep4Fk` |
| STEP 5 | WS | Legacy 워크시트 PC 빈칸, orphan PC | ✅ `fixStep5Ws` |

### STEP 2 파싱 상세

| 코드 | 항목 | 소스 | 0건 시 |
|------|------|------|--------|
| A1 | 공정번호 | Legacy `l2[]` | error |
| A2 | 공정명 | Legacy `l2[].name` | - |
| A3 | 공정기능 | Legacy `l2[].functions[]` | - |
| A4 | 제품특성 | Legacy `l2[].functions[].productChars[]` | - |
| A5 | 고장형태 | Legacy `l2[].failureModes[]` | error |
| A6 | 검출관리 | Legacy `riskData.detection-*` | warn |
| B1 | 작업요소 | Legacy `l2[].l3[]` | - |
| B2 | 요소기능 | Legacy `l2[].l3[].functions[]` | - |
| B3 | 공정특성 | Legacy `l2[].l3[].functions[].processChars[]` | warn |
| B4 | 고장원인 | Legacy `l2[].l3[].failureCauses[]` + `l2[].failureCauses[]` | error |
| B5 | 예방관리 | Legacy `riskData.prevention-*` | warn |
| C1 | 구분 | Legacy `l1.functions[].category` → **Atomic DB fallback** | error |
| C2 | 완제품기능 | Legacy `l1.functions[].name` → **Atomic DB fallback** | error |
| C3 | 요구사항 | Legacy `l1.functions[]` count → **Atomic DB fallback** | error |
| C4 | 고장영향 | Legacy `l1.failureScopes[]` | error |

### 자동수정 루프 흐름

```
POST /api/fmea/pipeline-verify { fmeaId: "pfm26-m066" }
│
├── Loop 1: 5단계 검증 실행
│   ├── 모든 단계 ok → allGreen=true → 종료
│   ├── STEP 1 error → 사용자 개입 필요 → 종료
│   └── STEP 2~5 에러/경고 →
│       ├── fixStep2Parsing: Atomic DB L1Function → Legacy l1.functions 동기화
│       ├── fixStep3Uuid: orphan L3Function에 FC 자동생성
│       ├── fixStep4Fk: 깨진 FailureLink 삭제 + unlinked FC 연결
│       └── fixStep5Ws: 빈 PC 이름 복원 + orphan PC에 FC 보충
│
├── Loop 2: 재검증 (수정 반영 확인)
│   └── allGreen=true → 종료 또는 추가 수정
│
└── Loop 3: 최종 검증 (최대 3회)
```

### 마스터 고장사슬 표준화

**`master-chain-sync.ts`**: 워크시트 저장 시 자동 동기화
- Atomic DB FailureLink 기반 (SSoT)
- FM 26개 × FC 103건 = 103 chains
- SOD (심각도/발생도/검출도) + PC/DC 포함
- `syncMasterChainsInTx()` → `upsertActiveMasterFromWorksheetTx()` 내에서 호출

### 검증 명령어

```bash
# 현재 상태 조회 (읽기 전용)
curl "http://localhost:3000/api/fmea/pipeline-verify?fmeaId=pfm26-m066"

# 자동수정 루프 실행
curl -X POST http://localhost:3000/api/fmea/pipeline-verify \
  -H "Content-Type: application/json" \
  -d '{"fmeaId":"pfm26-m066"}'

# PowerShell
$body = @{fmeaId="pfm26-m066"} | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:3000/api/fmea/pipeline-verify" -Method POST -Body $body -ContentType "application/json"
```

### 기대 결과 (pfm26-m066 Au Bump 기준)

| 항목 | 기대값 |
|------|--------|
| A1 (공정번호) | 21 |
| A5 (고장형태) | 26 |
| B3 (공정특성) | 101 |
| B4 (고장원인) | 104 |
| C1 (구분) | 3 (YP/SP/USER) |
| C2 (완제품기능) | 7 |
| C3 (요구사항) | 17 |
| C4 (고장영향) | 20 |
| FM (Atomic) | 26 |
| FailureLink | 111 |
| RiskAnalysis | 111 |
