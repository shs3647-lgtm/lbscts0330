# 역설계 기반 FMEA Import 시스템 설계서

> **문서 버전**: v2.0 — 2026-03-19  
> **대상 프로젝트**: Smart FMEA On-Premise (Next.js 14 + PostgreSQL + Prisma + TypeScript)  
> **핵심 원칙**: **완성된 FMEA(M066) 역설계 → 3단계 전략 (구축 → 검증 → 이관)**

---

## 1. 핵심 사상 — "완성된 집에서 설계도를 추출한다"

### 1.1 3단계 전략 개요

본 시스템의 핵심은 **순서(Sequence)**에 있다. 먼저 완전한 전환 시스템을 구축하고, 검증한 뒤, 실전에 투입한다.

| 단계 | 목표 | 방법 | 산출물 |
|------|------|------|--------|
| **1단계** | 기존데이터전환시스템 구축 | M066 DB → DB 다이렉트 전환. JSON 없음, 레거시 없음 | PgSQL ↔ WS 직통 시스템 |
| **2단계** | 역설계 완전성 검증 | M066에서 Import 엑셀 역생성 → Import → 원본과 비교 | 원본 = 결과 → 시스템 완전 |
| **3단계** | 실전: 구버전 FMEA 이관 | 구 시스템 엑셀 다운 → Claude로 Import 형식 변환 → Import 파이프라인 실행 | 신시스템 이관 완성 |

### 1.2 비유 체계

| 비유 | 시스템 대응 | 설명 |
|------|-----------|------|
| 완성된 집 | M066 FMEA (Atomic DB) | 이미 검증된 WS + 고장사슬 전체 |
| 3층짜리 집 | 1L / 2L / 3L Structure | 공정 → 공정단계 → 작업요소 (구조트리) |
| 방, 명칭, 연결 | UUID, Name, FK | 각 항목의 고유ID, 이름, 부모 연결 |
| 고장연결 | FailureLink (FE←FM←FC) | N:1:N 사슬, FK로만 구성 |
| 자재목록 | Import 엑셀 각 시트 | 집을 짓기 위한 부품 리스트 |
| 문고리/경첩 자동생성 | **폐기 대상** | 누락 데이터 보정용 자동생성 로직 |

### 1.3 최종 아키텍처 — 두 개의 독립 경로

```
┌─────────────────────────────────────────────────────────────────┐
│                     최종 아키텍처                                 │
│                                                                 │
│              ┌──────────────┐                                   │
│              │  PostgreSQL  │                                   │
│              │  (모든 FMEA) │                                   │
│              └──────┬───────┘                                   │
│                     │                                           │
│          ┌──────────┴──────────┐                                │
│          ▼                     ▼                                │
│  ┌───────────────┐   ┌────────────────────┐                    │
│  │  경로 A: 직통  │   │  경로 B: Import    │                    │
│  │  DB → WS      │   │  엑셀→JSON→DB→WS  │                    │
│  │  (1단계 전환용) │   │  (3단계 이관용)    │                    │
│  │               │   │                    │                    │
│  │  레거시 0줄    │   │  JSON=검증게이트   │                    │
│  │  중간파일 0개  │   │  자동생성 0건      │                    │
│  └───────┬───────┘   └────────┬───────────┘                    │
│          │                     │                                │
│          └──────────┬──────────┘                                │
│                     ▼                                           │
│              ┌──────────────┐                                   │
│              │  WS 렌더링   │                                   │
│              └──────────────┘                                   │
└─────────────────────────────────────────────────────────────────┘
```

**경로 A (1단계)**: PgSQL → WS 직통. 레거시 코드 0줄 경유. M066 역설계로 완전한 전환 시스템 구축. `buildWorksheetState`가 DB FK를 바로 읽어서 렌더링.

**경로 B (3단계)**: 구버전 엑셀 → Claude 변환 → Import 엑셀 → JSON 검증 → DB → WS. JSON은 이 경로에서만 엑셀(비정형)과 DB(정형) 사이의 정확성 검증 게이트 역할.

**공통 원칙**: 두 경로 모두 레거시 자동생성 로직(`uid()`, 퍼지매칭, `fc-orphan-*`, `fc-autofix-*`)을 사용하지 않는다.

### 1.4 현재 시스템 vs 제안 시스템

| 항목 | 현재 시스템 | 제안 시스템 |
|------|-----------|-----------|
| UUID 생성 | `uid()` 매번 새로 생성 | DB에서 **확정 UUID 추출** (경로A) / 결정론적 생성 (경로B) |
| FK 연결 | 5단계 퍼지 매칭 + 폴백 | DB FK **그대로 복사** (경로A) / JSON 검증 (경로B) |
| 누락 데이터 | 자동생성 (`fc-orphan-*`, `fc-autofix-*`) | **없음** — 원본에 없으면 없는 것 (거부) |
| 멱등성 | ❌ rebuild 시 수량 변경 | ✅ 몇 번 실행해도 동일 결과 |
| FK 매칭률 | ~61% (나머지 순차 폴백) | **100%** (경로A: DB FK 확정 / 경로B: JSON 검증) |
| 중간 파일 | 엑셀 파싱 필수 | 경로A: 없음 / 경로B: JSON 검증 게이트만 |

---

## 2. 1단계 — PgSQL ↔ WS 다이렉트 시스템 (기존데이터전환)

### 2.1 설계 원칙

1단계의 핵심은 **엑셀도 JSON도 없이** PostgreSQL DB에서 워크시트(WS)로 직통 연결하는 것이다. 레거시 Import 파이프라인을 완전히 우회하여, 중간 변환 과정에서 발생하는 오류와 유실을 원천 차단한다.

| 원칙 | 내용 | 효과 |
|------|------|------|
| 중간 파일 제로 | 엑셀, JSON, CSV 등 중간 변환 파일 없음 | 파싱 오류 원천 차단 |
| 레거시 코드 제로 | `uid()`, 퍼지매칭, 자동생성 로직 미사용 | UUID 불일치/FK 유실 방지 |
| DB FK 직참조 | `buildWorksheetState`가 DB FK를 직접 읽음 | 100% FK 정합성 |
| 원자적 트랜잭션 | `$transaction` Serializable 격리수준 | 부분 저장 방지 |

### 2.2 처리 흐름

```
STEP 1: M066 원본 쿼리 (Prisma + Project Schema)
  │  getPrismaForSchema('pfmea_pfm26_m066')
  │  → L1/L2/L3 Structure + Function + FK 관계 전체 로드
  │  → FailureLink (FE↔FM↔FC 확정 FK) 전체 로드
  │  → RiskAnalysis + ProcessProductChar 전체 로드
  │  ✅ Guard: fmeaId 일치 + FK 정합성 + 레코드 수 검증
  ▼
STEP 2: 3층 구조 추출 (Structure Tree)
  │  1L(공정) / 2L(공정단계) / 3L(작업요소)
  │  모든 UUID = DB 원본 그대로 (uid() 호출 0건)
  │  모든 FK = DB 원본 그대로 (매칭 로직 0건)
  ▼
STEP 3: 고장사슬 추출 (Failure Chain)
  │  FE←FM←FC 확정 FK 추출
  │  N:1:N 사슬 구조 보존
  │  퍼지 매칭 불필요 — DB에 이미 확정된 FK
  ▼
STEP 4: fmeaId 리매핑 (메모리 내)
  │  Map<oldUUID, newUUID> + FK 일괄 교체
  │  파일 변환 아님 — 순수 메모리 연산
  ▼
STEP 5: $transaction 원자적 삽입
  │  DELETE ALL → CREATE ALL (새 프로젝트 DB)
  │  트랜잭션 내 레코드 수 검증 → 불일치 시 ROLLBACK
  ▼
STEP 6: WS 직통 렌더링
     buildWorksheetState → DB FK 직접 참조
     자동생성 0건
```

### 2.3 M066 골든 베이스라인 — 데이터 수량

| 테이블 | M066 수량 | 설명 |
|--------|----------|------|
| L1Structure | 1 | 완제품 (12INCH AU BUMP) |
| L2Structure | 21 | 공정 |
| L3Structure | 91 | 작업요소 |
| L1Function | 17 | 완제품 기능 + 요구사항 |
| L2Function | 26 | 공정 기능 |
| L3Function | 103 | 요소 기능 + 공정특성 |
| ProcessProductChar | 26 | 제품특성 |
| FailureEffect | 20 | 고장영향 |
| FailureMode | 26 | 고장형태 |
| FailureCause | 104 | 고장원인 |
| FailureLink | 104 | 고장사슬 (FE↔FM↔FC) |
| RiskAnalysis | 104 | 위험분석 (SOD + DC/PC) |
| Optimization | 0 | 개선안 (사용자 입력) |

### 2.4 flatData 항목별 수량

| 코드 | 이름 | M066 수량 | FK 근거 |
|------|------|----------|---------|
| C1 | 구분(YP/SP/USER) | 3 | L1Function.category distinct |
| C2 | 완제품기능 | 7 | L1Function.functionName distinct |
| C3 | 요구사항 | 17 | L1Function count |
| C4 | 고장영향 | 20 | FailureEffect count |
| A1 | 공정번호 | 21 | L2Structure.no |
| A2 | 공정명 | 21 | L2Structure.name |
| A3 | 공정기능 | 21 | L2Function per L2 (중복제거) |
| A4 | 제품특성 | 26 | ProcessProductChar |
| A5 | 고장형태 | 26 | FailureMode |
| A6 | 검출관리 | 21 | RiskAnalysis.detectionControl (공정별) |
| B1 | 작업요소 | 91 | L3Structure |
| B2 | 요소기능 | 91 | L3Function.functionName |
| B3 | 공정특성 | 103 | L3Function.processChar |
| B4 | 고장원인 | 104 | FailureCause |
| B5 | 예방관리 | 98 | RiskAnalysis.preventionControl (L3별) |
| **합계** | | **670** | |

### 2.5 고장사슬 구조

```
FailureEffect (20) ←─── FailureLink (104) ───→ FailureCause (104)
       │                      │                        │
       │                      ▼                        │
       │               FailureMode (26)                │
       │                      │                        │
       │              관계: N:1:N                       │
       │                                               │
  L1Function FK            L2Function FK          L3Function FK
  (l1FuncId)              (l2FuncId)             (l3FuncId)
       │                      │                        │
  L1Structure             L2Structure             L3Structure
  (완제품)                 (공정)                  (작업요소)

  1개 FM에 평균 4개 FC가 연결됨 (104÷26 = 4.0)
  1개 FE에 평균 5.2개 FL이 연결됨 (104÷20 = 5.2)
```

### 2.6 API 설계 — 경로 A

```
POST /api/fmea/reverse-import

Body: {
  sourceFmeaId: string,     // 원본 FMEA ID (예: pfm26-m066)
  targetFmeaId: string,     // 대상 FMEA ID (예: pfm26-m079)
  options: {
    copySOD: boolean,       // SOD 점수 복사 여부 (기본: false)
    copyDCPC: boolean,      // DC/PC 텍스트 복사 여부 (기본: true)
    copyOptimization: boolean, // 개선안 복사 여부 (기본: false)
  }
}

Response: {
  ok: boolean,
  sourceFmeaId: string,
  targetFmeaId: string,
  extracted: {
    l2Structures: number,   // 21
    l3Structures: number,   // 91
    l3Functions: number,    // 103
    failureModes: number,   // 26
    failureEffects: number, // 20
    failureCauses: number,  // 104
    failureLinks: number,   // 104
    riskAnalyses: number,   // 104
  },
  verification: {
    allGreen: boolean,
    steps: VerifyStep[],
  }
}
```

### 2.7 내부 처리 함수

```typescript
async function reverseImport(
  sourceFmeaId: string,
  targetFmeaId: string,
  options: ReverseImportOptions
) {
  // STEP 1: 원본 Atomic DB 로드
  const sourcePrisma = await getIsolatedPrisma(sourceFmeaId);
  const sourceData = await loadFullAtomicDB(sourcePrisma, sourceFmeaId);

  // Guard: 원본 데이터 완전성 검증
  assertSourceComplete(sourceData, sourceFmeaId);

  // STEP 2~3: 구조 + 사슬 추출 (sourceData에 이미 포함)

  // STEP 4: fmeaId 변환 (원본 → 대상)
  const targetData = remapFmeaId(sourceData, targetFmeaId);

  // STEP 5: 대상 스키마에 저장 (DELETE ALL → CREATE ALL)
  const targetPrisma = await getIsolatedPrisma(targetFmeaId);
  await saveAtomicDBInTransaction(targetPrisma, targetData, options);

  // STEP 6: Legacy 데이터 동기화
  await syncAtomicToLegacy(targetPrisma, targetFmeaId);

  // 검증
  const verification = await runPipelineVerify(targetFmeaId);
  return { ok: verification.allGreen, extracted: targetData.counts, verification };
}
```

---

## 3. 2단계 — 역설계 완전성 검증

### 3.1 검증 원리

2단계는 1단계에서 구축한 다이렉트 전환 시스템의 완전성을 증명하는 단계이다. M066 DB에서 Import 엑셀을 역방향으로 생성하고, 이를 Import 파이프라인에 다시 투입하여, 결과가 원본과 동일한지 비교한다.

```
┌──────────┐     역생성      ┌──────────────┐     Import     ┌──────────┐
│ M066 DB  │ ──────────────→ │ Import 엑셀  │ ─────────────→ │ 결과 DB  │
│  (원본)  │                 │ (역생성)      │                │  (재구성) │
└────┬─────┘                 └──────────────┘                └────┬─────┘
     │                                                            │
     └──────────────── 비교: 원본 = 결과? ────────────────────────┘
                       YES → 시스템 완전 증명
                       NO  → 차이점 분석 → 수정
```

| 단계 | 처리 | 검증 기준 |
|------|------|----------|
| 2-1 | M066 DB → Import 엑셀 역생성 (모든 시트에 UUID+명칭+FK) | 시트별 레코드 수 = 골든 베이스라인 |
| 2-2 | 역생성 Import 엑셀 → Import 파이프라인 실행 (JSON 검증 포함) | 파이프라인 오류 0건, JSON 검증 통과 |
| 2-3 | Import 결과 DB ↔ M066 원본 DB 비교 | 원본 = 결과 → 시스템 완전, 불일치 0건 |
| 2-4 | 멱등성 검증: 2회 연속 실행 → 동일 결과 확인 | 1차 결과 = 2차 결과, 수량 변동 0건 |

### 3.2 검증 통과 시 의미

2단계 검증이 통과하면 두 가지가 동시에 증명된다:

1. **1단계의 DB 다이렉트 전환 시스템이 M066의 모든 데이터를 완전하게 추출하고 재현할 수 있다.**
2. **Import 파이프라인(엑셀→JSON→DB) 경로도 역생성 엑셀 기준으로 정상 작동한다.** 3단계에서 이 파이프라인을 신뢰하고 사용할 수 있다.

---

## 4. 3단계 — 실전: 구버전 FMEA 이관

### 4.1 이관 프로세스

| 단계 | 처리 | 도구 |
|------|------|------|
| 3-1 | 구버전 FMEA 시스템에서 엑셀 다운로드 (구버전 고유 형식 그대로) | 구 시스템 Export 기능 |
| 3-2 | Claude를 활용하여 Import 엑셀 형식으로 변환 (시트별 UUID+명칭+FK 구조) | Claude AI |
| 3-3 | Import 파이프라인 실행 (엑셀 → JSON 검증 → DB 저장) | 검증 완료 파이프라인 (2단계) |
| 3-4 | 이관 결과 검증 (pipeline-verify 실행) | pipeline-verify API |

### 4.2 JSON의 역할 — Import 전용 검증 게이트

JSON은 **3단계 Import 경로에서만** 사용된다. 엑셀(비정형 데이터)과 DB(정형 데이터) 사이에서 정확성을 검증하는 게이트 역할이다. 1단계의 DB 다이렉트 경로에서는 JSON이 필요 없다.

| 검증 항목 | 기준 | 실패 시 |
|----------|------|--------|
| 스키마 일치 | 모든 필드가 확정 JSON 스키마에 맞음 | Import 거부 → 엑셀 수정 요구 |
| FK 참조 무결성 | 모든 FK가 참조하는 UUID가 존재 | Import 거부 → 누락 항목 리포트 |
| 사슬 완전성 | FC 시트의 FE↔FM↔FC 빠짐없이 연결 | Import 거부 → 미연결 사슬 리포트 |
| 자동생성 금지 | 누락 데이터 0건, 자동생성 0건 | Import 거부 → 원본 보완 요구 |

---

## 5. 에러 카탈로그 — 역설계 시스템에서 재발 방지 대상

> 이 카탈로그는 역설계 시스템에서 **절대 재발하지 않아야 할** 문제 목록이다.

### 5.1 fmeaId 매칭 오류 (E01~E03)

| # | 증상 | 근본 원인 | 방지 설계 |
|---|------|----------|----------|
| E01 | 다른 fmeaId 데이터 혼입 | 스키마 미지정 → public 조회 | 모든 쿼리에 `fmeaId` WHERE 필수 + 스키마 격리 |
| E02 | Public↔Project 불일치 | Public에 구버전 데이터 잔존 | Project 스키마만 사용, Public은 캐시용 |
| E03 | API 응답 fmeaId 불일치 | `ensureProjectSchemaReady` 미호출 | API 응답 전 fmeaId 일치 검증 |

### 5.2 UUID 매칭 오류 (E04~E06)

| # | 증상 | 근본 원인 | 방지 설계 |
|---|------|----------|----------|
| E04 | rebuild마다 FC 수량 증가 (104→125→146) | `uid()` 비결정적 + 자동생성 FC 누적 | DB 원본 UUID 사용, `uid()` 호출 금지 |
| E05 | processCharId ≠ l3FuncId | migration.ts에서 별도 생성 | `processCharId = l3FuncId` 강제 |
| E06 | 카테시안 복제 (A4가 A3×N개 생성) | 루프 안에서 `uid()` 호출 | 공유 엔티티 1회 생성, FK 참조만 |

### 5.3 FK 연결 오류 (E07~E09)

| # | 증상 | 근본 원인 | 방지 설계 |
|---|------|----------|----------|
| E07 | B4.parentItemId=B1 (작업요소) | import-builder에서 B4→B1 연결 | B4.parentItemId → B3 ID |
| E08 | FailureLink 없는 FC 발생 | 미연결 FC 자동수정 미작동 | FC→FL 1:1 동시 생성 |
| E09 | 고아 L3Function (FC 없는 공정특성) | Import B4에 해당 B3 없음 | Import에 없는 데이터는 삭제 |

### 5.4 API 배달 사고 (E10~E13)

| # | 증상 | 근본 원인 | 방지 설계 |
|---|------|----------|----------|
| E10 | LLD 추천 저장 후 사라짐 | API POST에서 역매핑 누락 | 양방향 동기화 |
| E11 | rebuild-atomic에서 RiskAnalysis 미저장 | upsert 로직 누락 | `createMany` 일괄 생성 |
| E12 | 통합시트 A6/B5 파싱 누락 | 개별시트 존재 시 통합시트 스킵 | 통합시트 항상 파싱 |
| E13 | RiskAnalysis DC/PC NULL | `deleteMany` 누락 → 중복 208건 | DELETE ALL → CREATE ALL 패턴 |

### 5.5 에러 분류 체계

```
에러 유형별 근본 원인 분석:

fmeaId 오류 (E01-E03)
 └─ 원인: 스키마 격리 미흡, Public/Project 이원화
 └─ 방지: 단일 스키마 접근 + fmeaId assertion

UUID 오류 (E04-E06)
 └─ 원인: 비결정론적 uid() 호출, 자동생성 누적
 └─ 방지: DB 원본 UUID 사용, 자동생성 전면 폐지

FK 오류 (E07-E09)
 └─ 원인: parentItemId 잘못 지정, 퍼지 매칭 실패
 └─ 방지: DB FK 그대로 추출, 매칭 불필요

배달 사고 (E10-E13)
 └─ 원인: 양방향 동기화 누락, 파서 불완전성
 └─ 방지: 단방향 데이터 흐름 (DB→Import→DB), 트랜잭션 원자성
```

---

## 6. 로버스트 시스템 설계 — 에러 방지 아키텍처

### 6.1 Guard 시스템 (경로 A/B 공통)

| Guard | 위치 | 검증 내용 | 실패 시 |
|-------|------|----------|--------|
| fmeaId 검증 | API 진입점 | 유효한 fmeaId인지 확인 | throw Error |
| 스키마 격리 | Prisma 쿼리 전 | Project 스키마 준비 확인 | throw Error |
| 쿼리 결과 검증 | SELECT 후 | 모든 레코드 fmeaId 일치 | throw Error |
| FK 정합성 | INSERT 전 | 참조 대상 EXISTS 확인 | INSERT 거부 |
| 레코드 수 검증 | 트랜잭션 내 | 기대 수량과 실제 수량 일치 | ROLLBACK |

```typescript
// ★ Guard 1: API 진입점에서 fmeaId 검증
function assertFmeaId(fmeaId: string): void {
  if (!fmeaId || !isValidFmeaId(fmeaId)) {
    throw new Error(`[GUARD] 유효하지 않은 fmeaId: ${fmeaId}`);
  }
}

// ★ Guard 2: 스키마 격리 — 반드시 프로젝트 스키마 사용
async function getIsolatedPrisma(fmeaId: string) {
  const schema = getProjectSchemaName(fmeaId);
  await ensureProjectSchemaReady(schema);
  return getPrismaForSchema(schema);
}

// ★ Guard 3: 쿼리 결과 fmeaId 일치 검증
function assertQueryResult<T extends { fmeaId: string }>(
  records: T[], expectedFmeaId: string, tableName: string
): void {
  const mismatch = records.filter(r => r.fmeaId !== expectedFmeaId);
  if (mismatch.length > 0) {
    throw new Error(
      `[GUARD] ${tableName}에서 fmeaId 불일치 ${mismatch.length}건 발견`
    );
  }
}
```

### 6.2 UUID 관리 원칙

| 원칙 | 내용 | 적용 경로 |
|------|------|----------|
| DB 원본 UUID 사용 | `uid()` 호출 금지. DB에서 추출한 UUID만 사용 | 경로 A (직통) |
| 결정론적 ID 생성 | `${prefix}-${parentId}-${seq}` 패턴. 동일 입력→동일 출력 | 경로 B (Import) |
| 중복 검사 | INSERT 전 EXISTS 확인. 중복 시 SKIP (upsert 아님 — 원본 보존) | 경로 A/B 공통 |

#### UUID 변환 전략

| 시나리오 | UUID 처리 | 이유 |
|---------|----------|------|
| M066 → M066 재구축 | **동일 UUID 유지** | 같은 프로젝트 → 같은 ID |
| M066 → M079 복사 | **새 fmeaId + 동일 구조 ID** | fmeaId만 변경, 나머지 동일 |
| M066 + 사용자 수정 | **수정분만 새 UUID** | 추가된 항목만 결정론적 ID 생성 |
| M066 전혀 다른 제품 | **구조 참조 + 새 UUID** | 구조만 복사, 내용은 새로 작성 |

### 6.3 FK 정합성 보장

```
┌─────────────────────────────────────────────────────────────┐
│              FK 정합성 3원칙                                  │
│                                                             │
│ 1. FK = DB 원본값 (매칭 로직 없음)                            │
│    ├── FailureLink.fmId = DB의 FailureMode.id               │
│    ├── FailureLink.feId = DB의 FailureEffect.id             │
│    └── FailureLink.fcId = DB의 FailureCause.id              │
│                                                             │
│ 2. FK 참조 무결성 검증 (INSERT 전)                            │
│    ├── 참조 대상 EXISTS 확인                                 │
│    ├── 불일치 시 INSERT 거부 (자동생성 금지)                  │
│    └── 거부 건수 로그 + 사용자 알림                           │
│                                                             │
│ 3. FK 양방향 일치 (Atomic ↔ Legacy)                          │
│    ├── processCharId = l3FuncId (항상)                        │
│    ├── Legacy FC.processCharId = Atomic FC.l3FuncId          │
│    └── rebuild 시 SSoT(Atomic) → Cache(Legacy) 동기화        │
└─────────────────────────────────────────────────────────────┘
```

### 6.4 멱등성 보장

```
멱등성 = 같은 입력 → 같은 출력 (몇 번 실행해도 동일)

현재 시스템의 멱등성 파괴 패턴:
 1. uid() → 매번 다른 UUID → 레코드 누적
 2. fc-orphan-* 자동생성 → 이전 실행 결과 위에 추가 생성
 3. Atomic→Legacy 동기화 → Legacy에 중복 FC/FL 추가

제안 시스템의 멱등성 보장:
 1. DB 원본 UUID → 항상 동일
 2. DELETE ALL → CREATE ALL → 이전 상태 무관
 3. 단방향 흐름 (DB→추출→저장) → 순환 동기화 불필요

검증 방법:
 $ rebuild-atomic 2회 연속 실행
 $ pipeline-verify 결과 비교
 → L3F, FC, FL, RA 수량 모두 동일해야 PASS
```

### 6.5 트랜잭션 원자성

```typescript
// ★ 모든 DB 작업은 단일 트랜잭션
await prisma.$transaction(async (tx) => {
  // 1. DELETE ALL (기존 데이터 완전 제거) — 자식→부모 순서
  await tx.optimization.deleteMany({ where: { fmeaId } });
  await tx.riskAnalysis.deleteMany({ where: { fmeaId } });
  await tx.failureLink.deleteMany({ where: { fmeaId } });
  // ...

  // 2. CREATE ALL (추출 데이터 일괄 생성) — 부모→자식 순서
  await tx.l1Structure.create({ data: l1 });
  await tx.l2Structure.createMany({ data: l2s });
  // ...

  // 3. VERIFY (트랜잭션 내 검증)
  const counts = await verifyCountsInTx(tx, fmeaId, expected);
  if (!counts.allMatch) {
    throw new Error(`[ROLLBACK] 레코드 수 불일치: ${JSON.stringify(counts)}`);
  }
}, { timeout: 30000, isolationLevel: 'Serializable' });
```

---

## 7. FK 참조 관계 전체도

```
L1Structure ──┬── L1Function ──── FailureEffect
              │         │              │
              │         └── l1FuncId ──┘
              │
L2Structure ──┼── L2Function ──── FailureMode ───┐
              │         │              │           │
              │         └── l2FuncId ──┘           │
              │                                    │
              ├── ProcessProductChar               │
              │         │                          │
              │         └── productCharId ─────────┘
              │
L3Structure ──┬── L3Function ──── FailureCause
              │         │              │
              │         ├── l3FuncId ──┘
              │         └── processCharId (= l3FuncId, 항상 동일)
              │
              └── FailureLink ─── RiskAnalysis ─── Optimization
                    │  │  │           │
                    │  │  └── fcId    └── linkId
                    │  └── feId
                    └── fmId

                    ControlPlanItem ──── productCharId → ProcessProductChar
                    PfdItem ──────────── productCharId → ProcessProductChar
```

| 부모 테이블 | FK 필드 | 자식 테이블 | 관계 |
|------------|---------|-----------|------|
| L1Structure | l1StructId | L1Function | 1:N |
| L1Function | l1FuncId | FailureEffect | 1:N |
| L2Structure | l2StructId | L2Function | 1:N |
| L2Structure | l2StructId | ProcessProductChar | 1:N |
| L2Function | l2FuncId | FailureMode | 1:N |
| L3Structure | l3StructId | L3Function | 1:N |
| L3Function | l3FuncId | FailureCause | 1:N |
| FailureMode | fmId | FailureLink | 1:N |
| FailureEffect | feId | FailureLink | N:1 |
| FailureCause | fcId | FailureLink | N:1 |
| FailureLink | linkId | RiskAnalysis | 1:1 |
| RiskAnalysis | linkId | Optimization | 1:N |
| ProcessProductChar | productCharId | ControlPlanItem | 1:N |
| ProcessProductChar | productCharId | PfdItem | 1:N |

---

## 8. 코드 재활용 및 폐기 대상

### 8.1 재활용 가능 함수

| 기존 함수 | 위치 | 역설계에서 용도 |
|----------|------|---------------|
| `atomicToFlatData()` | export-master | Atomic DB → flatData 변환 |
| `atomicToChains()` | export-master | Atomic DB → chains 변환 |
| `loadFullAtomicDB()` | rebuild-atomic | 전체 Atomic DB 로드 |
| `runPipelineVerify()` | pipeline-verify | 5단계 검증 |
| `ensureProjectSchemaReady()` | project-schema | 스키마 생성/검증 |
| `getPrismaForSchema()` | prisma.ts | 스키마별 Prisma 클라이언트 |

### 8.2 폐기 대상 로직

| 폐기 대상 | 위치 | 대체 방법 |
|----------|------|----------|
| `uid()` 호출 (비결정적 UUID) | buildWorksheetState | DB 원본 UUID |
| 5단계 퍼지 매칭 | failureChainInjector | DB FK 직접 사용 |
| `fc-orphan-*` 자동생성 | migration.ts | 원본에 없으면 삭제 |
| `fc-autofix-*` 자동생성 | pipeline-verify | 원본에 없으면 삭제 |
| `supplementMissingItems()` | save-from-import | 역설계는 보충 불필요 |
| `distribute()` 순서 배분 | buildWorksheetState | FK 확정 → 배분 불필요 |

### 8.3 신규 개발 필요 함수

| 함수명 | 기능 | 경로 |
|--------|------|------|
| `reverseExtract()` | M066 Atomic DB → 추출 데이터 | 경로 A |
| `remapFmeaId()` | fmeaId 변환 (원본 → 대상) | 경로 A |
| `assertSourceComplete()` | 원본 완전성 검증 | 공통 |
| `assertQueryResult()` | 쿼리 결과 fmeaId 검증 | 공통 |
| `saveAtomicDBInTransaction()` | 트랜잭션 저장 (DELETE→CREATE) | 경로 A |
| `syncAtomicToLegacy()` | Atomic→Legacy 동기화 | 경로 A |
| `generateImportExcel()` | DB → Import 엑셀 역생성 | 2단계 검증 |

---

## 9. 검증 체계

### 9.1 자동 검증 항목

| # | 검증 항목 | PASS 기준 | 검증 시점 |
|---|----------|----------|----------|
| V01 | fmeaId 일치 (10개 테이블) | 불일치 0건 | 저장 직후 |
| V02 | FK 참조 무결성 (14개 FK) | 고아 레코드 0건 | 저장 직후 |
| V03 | 멱등성 (2회 연속 실행) | 수량 동일 | 개발 시 |
| V04 | 원본↔대상 수량 일치 | ±0 (옵션에 따라) | 저장 직후 |
| V05 | Atomic↔Legacy 일치 | L3F, FC, FL 수량 동일 | 동기화 직후 |
| V06 | orphanPC = 0 | FC 없는 공정특성 0건 | pipeline-verify |
| V07 | emptyPC = 0 | 빈 공정특성 이름 0건 | pipeline-verify |
| V08 | processCharId = l3FuncId | 불일치 0건 | rebuild 직후 |

### 9.2 검증 커맨드

```powershell
# 1. 역설계 실행 (경로 A)
Invoke-RestMethod -Uri "http://localhost:3000/api/fmea/reverse-import" `
  -Method POST `
  -Body '{"sourceFmeaId":"pfm26-m066","targetFmeaId":"pfm26-m079"}' `
  -ContentType "application/json" | ConvertTo-Json -Depth 5

# 2. 파이프라인 검증
Invoke-RestMethod -Uri "http://localhost:3000/api/fmea/pipeline-verify?fmeaId=pfm26-m079" `
  -Method GET | ConvertTo-Json -Depth 5

# 3. 멱등성 검증 (2회 연속)
Invoke-RestMethod -Uri "http://localhost:3000/api/fmea/rebuild-atomic?fmeaId=pfm26-m079" `
  -Method POST | ConvertTo-Json -Depth 3
Invoke-RestMethod -Uri "http://localhost:3000/api/fmea/rebuild-atomic?fmeaId=pfm26-m079" `
  -Method POST | ConvertTo-Json -Depth 3
# → 두 결과의 l3Functions, failureCauses, failureLinks 수량 비교
```

---

## 10. 구현 로드맵

| Phase | 기간 | Task | 산출물 |
|-------|------|------|--------|
| **Phase 1: 핵심 API** | 1주 | `reverseExtract()`, `remapFmeaId()`, Guard 함수, `/api/fmea/reverse-import` 라우트 | DB 다이렉트 전환 시스템 (경로 A 완성) |
| **Phase 2: 검증 도구** | 3일 | `generateImportExcel()`, 원본↔결과 비교 로직, 멱등성 자동 테스트 | 2단계 검증 통과, 시스템 완전성 증명 |
| **Phase 3: UI + 워크플로우** | 1주 | Import 페이지 "기존 데이터 활용" 탭, 원본 FMEA 선택 UI, 옵션 설정 + 결과 표시 | 사용자 접근 가능 Import UI |
| **Phase 4: 안정화** | 3일 | M066→M079 전환 테스트, E01~E13 비발생 확인, Playwright E2E | 프로덕션 배포 가능 |

### Phase 1 상세 태스크

| Task | 설명 | 파일 |
|------|------|------|
| 1.1 | `reverseExtract()` 함수 구현 | `src/lib/fmea-core/reverse-extract.ts` |
| 1.2 | `remapFmeaId()` 함수 구현 | `src/lib/fmea-core/remap-fmeaid.ts` |
| 1.3 | Guard 함수 구현 (`assert*`) | `src/lib/fmea-core/guards.ts` |
| 1.4 | `/api/fmea/reverse-import` 라우트 | `src/app/api/fmea/reverse-import/route.ts` |
| 1.5 | `saveAtomicDBInTransaction()` | `src/lib/fmea-core/save-atomic.ts` |
| 1.6 | 단위 테스트 | `tests/unit/reverse-import.test.ts` |

---

## 11. 위험 요소 및 대응

| 위험 | 확률 | 영향 | 대응 |
|------|------|------|------|
| 원본 M066에 데이터 오류 존재 | 중 | 대상에 오류 전파 | 추출 전 pipeline-verify 실행 |
| UUID 충돌 (다른 프로젝트에 동일 ID) | 저 | FK violation | fmeaId 포함한 복합 유니크 제약 |
| 대상 프로젝트에 기존 데이터 존재 | 중 | 데이터 충돌 | DELETE ALL → CREATE ALL (덮어쓰기) |
| Legacy ↔ Atomic 동기화 실패 | 중 | 워크시트 표시 오류 | `syncAtomicToLegacy()` + 재검증 |
| 스키마 마이그레이션 버전 불일치 | 저 | 테이블 미존재 | `ensureProjectSchemaReady()` |

---

## 부록 A: 용어 정의

| 용어 | 정의 |
|------|------|
| **역설계 (Reverse Engineering)** | 완성된 FMEA DB에서 Import 데이터를 역으로 추출하는 방식 |
| **경로 A (직통)** | PgSQL → WS 다이렉트. 레거시/중간파일 없음. 1단계 전환용 |
| **경로 B (Import)** | 엑셀 → JSON → DB. 외부 데이터 진입. 3단계 이관용 |
| **SSoT** | Single Source of Truth — 유일한 진실의 원천 (Atomic DB) |
| **멱등성** | 동일 입력에 대해 몇 번 실행해도 동일 결과를 보장하는 성질 |
| **골든 베이스라인** | M066의 확정된 데이터 수량 (검증 기준) |
| **Guard** | API/함수 진입점에서 입력값 유효성을 강제 검증하는 방어 코드 |
| **카테시안 복제** | N×M 반복에서 공유 엔티티를 각각 새로 생성하는 버그 패턴 |
| **orphanPC** | FC(고장원인)가 없는 processChar (공정특성) |
| **배달 사고** | API 저장/로드 과정에서 데이터가 유실되거나 잘못 전달되는 버그 |
| **JSON 검증 게이트** | 3단계 Import 경로에서만 사용. 엑셀↔DB 사이 정확성 검증 레이어 |

## 부록 B: 관련 문서

| 문서 | 경로 | 내용 |
|------|------|------|
| DB 중앙 아키텍처 | `docs/CENTRAL_DB_ARCHITECTURE.md` | Atomic DB 설계 원칙 |
| 파이프라인 검증 매뉴얼 | `CLAUDE.md` 파이프라인 섹션 | 5단계 검증 + 자동수정 |
| 모듈화 가이드 | `docs/MODULARIZATION_GUIDE.md` | 파일 분리 원칙 |
| 워크시트 설계 원칙 | `docs/WORKSHEET_DESIGN_PRINCIPLES.md` | UI 레이아웃 |
| DB 스키마 | `docs/DB_SCHEMA.md` | Prisma 모델 상세 |
| 마스터 FMEA JSON | `data/master-fmea/pfm26-m066.json` | M066 골든 데이터 |