# Smart FMEA Auto-Fix — DB 엔티티 기반 자동 교정 규칙

> **버전:** 1.0 | **기준:** AIAG-VDA FMEA 1판 | **대상:** Smart FMEA Import Pipeline
> **목적:** Import 파이프라인에서 발생하는 데이터 무결성 오류를 DB 엔티티 단위로 자동 탐지·교정하는 규칙 정의

---

## 1. DB 엔티티 계층 구조

```
Project
 └─ PFMEA
      └─ Process (공정)
           ├─ ProcessProductChar (A4: 제품특성) ← 공정 단위 공유 엔티티
           ├─ ProcessFunction (A3: 기능)
           │    └─ FK → ProcessProductChar.id
           ├─ FailureMode (A5: 고장형태/FM)
           │    ├─ FK → ProcessProductChar.id (productCharId)
           │    ├─ FailureEffect (FE: 고장영향)
           │    └─ FailureCause (FC: 고장원인)
           │         ├─ PreventionControl (PC: 예방관리)
           │         └─ DetectionControl (DC: 검출관리)
           ├─ ControlPlan (CP: 관리계획서)
           │    └─ FK → ProcessProductChar.id
           └─ ProcessFlowDiagram (PFD: 공정흐름도)
                └─ FK → ProcessProductChar.id
```

---

## 2. 엔티티별 Auto-Fix 규칙

### 2.1 ProcessProductChar (A4: 제품특성)

| # | 오류 유형 | 탐지 조건 | 자동 교정 | 심각도 |
|---|----------|----------|----------|--------|
| A4-001 | **카테시안 복제** | 동일 `processId` 내 동일 `name`의 A4가 2개 이상 | 중복 A4 병합 → 가장 먼저 생성된 ID 유지, 나머지 FK 재매핑 후 삭제 | CRITICAL |
| A4-002 | **고아 A4** | A4에 연결된 FM(`failureModes`)이 0개 AND A3(`functions`)에서도 미참조 | 경고 로그 출력 + `orphan` 플래그 마킹 (자동 삭제 금지) | WARNING |
| A4-003 | **name 빈값** | `name IS NULL OR name = ''` | Import 원본 엑셀에서 역추적하여 셀 값 복원, 불가 시 `(미입력-{순번})` 할당 | HIGH |
| A4-004 | **processId 누락** | `processId IS NULL` | 동일 트랜잭션 내 Process 컨텍스트에서 자동 할당 | CRITICAL |

**카테시안 복제 교정 SQL 패턴:**

```sql
-- 탐지
SELECT name, "processId", COUNT(*) as cnt, ARRAY_AGG(id) as ids
FROM "ProcessProductChar"
GROUP BY name, "processId"
HAVING COUNT(*) > 1;

-- 교정: 첫 번째 ID 유지, 나머지 FK 재매핑
UPDATE "FailureMode"
SET "productCharId" = :keepId
WHERE "productCharId" IN (:duplicateIds);

UPDATE "ProcessFunction"
SET "productCharId" = :keepId
WHERE "productCharId" IN (:duplicateIds);

DELETE FROM "ProcessProductChar"
WHERE id IN (:duplicateIds) AND id != :keepId;
```

---

### 2.2 ProcessFunction (A3: 기능)

| # | 오류 유형 | 탐지 조건 | 자동 교정 | 심각도 |
|---|----------|----------|----------|--------|
| A3-001 | **productCharId FK 누락** | `productCharId IS NULL` | 동일 `processId`의 A4 중 매칭되는 항목 자동 연결 | HIGH |
| A3-002 | **processId 불일치** | A3의 `processId`가 참조하는 A4의 `processId`와 상이 | A4의 `processId`로 통일 | CRITICAL |
| A3-003 | **중복 기능명** | 동일 `processId` 내 동일 `name` A3 2개 이상 | 병합: L2 하위 항목 통합, 먼저 생성된 ID 유지 | MEDIUM |
| A3-004 | **sortOrder 충돌** | 동일 `processId` 내 동일 `sortOrder` | 충돌 항목에 대해 순차 재번호 부여 | LOW |

---

### 2.3 FailureMode (A5: 고장형태/FM)

| # | 오류 유형 | 탐지 조건 | 자동 교정 | 심각도 |
|---|----------|----------|----------|--------|
| FM-001 | **productCharId FK 누락** | `productCharId IS NULL` | Import 매칭 테이블(B5)에서 역추적, 매칭 불가 시 `(미연결)` 플래그 | CRITICAL |
| FM-002 | **고아 FM** | FM에 연결된 FC가 0개 AND FE가 0개 | 경고 로그 + `incomplete` 플래그 마킹 | WARNING |
| FM-003 | **distribute() 오배분** | 동일 A4의 FM 수 ≠ Import 원본 FM 수 | distribute() 결과 폐기 → Import 원본 매칭 정보로 FK 재할당 | CRITICAL |
| FM-004 | **severity 범위 초과** | `severity < 1 OR severity > 10` | 범위 내 클램핑: `GREATEST(1, LEAST(10, severity))` | MEDIUM |
| FM-005 | **UI placeholder 증상** | UI에서 `(고장형태 선택)` 표시 | A4-001(카테시안) 또는 FM-001(FK누락) 우선 탐지 후 해당 규칙 적용 | CRITICAL |

**FM-001 교정 Prisma 패턴:**

```typescript
// 1단계: FK 누락 FM 탐지
const orphanFMs = await tx.failureMode.findMany({
  where: { productCharId: null, processId: targetProcessId }
});

// 2단계: Import 매칭 테이블에서 역추적
for (const fm of orphanFMs) {
  const matchedPC = importMatchMap.get(fm.importSourceKey);
  if (matchedPC) {
    await tx.failureMode.update({
      where: { id: fm.id },
      data: { productCharId: matchedPC.id }
    });
  } else {
    await tx.failureMode.update({
      where: { id: fm.id },
      data: { status: 'UNLINKED' }
    });
  }
}
```

---

### 2.4 FailureEffect (FE: 고장영향)

| # | 오류 유형 | 탐지 조건 | 자동 교정 | 심각도 |
|---|----------|----------|----------|--------|
| FE-001 | **failureModeId FK 누락** | `failureModeId IS NULL` | 동일 트랜잭션 내 FM 컨텍스트에서 자동 연결 | CRITICAL |
| FE-002 | **severity 불일치** | FE의 `severity`와 부모 FM의 `severity`가 상이 | FM의 severity로 동기화 (FM이 마스터) | MEDIUM |
| FE-003 | **중복 FE** | 동일 `failureModeId` 내 동일 `description` | 병합: 먼저 생성된 ID 유지 | LOW |

---

### 2.5 FailureCause (FC: 고장원인)

| # | 오류 유형 | 탐지 조건 | 자동 교정 | 심각도 |
|---|----------|----------|----------|--------|
| FC-001 | **failureModeId FK 누락** | `failureModeId IS NULL` | Import 매칭 테이블(FC시트)에서 역추적 | CRITICAL |
| FC-002 | **occurrence 범위 초과** | `occurrence < 1 OR occurrence > 10` | 클램핑: `GREATEST(1, LEAST(10, occurrence))` | MEDIUM |
| FC-003 | **고장사슬 단절** | FC → FM 연결은 있으나, FM → A4 연결이 NULL | FM-001 규칙 먼저 실행 후 재검증 | CRITICAL |
| FC-004 | **m4Category 불일치** | FC의 `m4Category`가 Import 원본과 상이 | Import 원본 값으로 복원 | HIGH |

---

### 2.6 PreventionControl (PC: 예방관리)

| # | 오류 유형 | 탐지 조건 | 자동 교정 | 심각도 |
|---|----------|----------|----------|--------|
| PC-001 | **failureCauseId FK 누락** | `failureCauseId IS NULL` | Import 매칭으로 FC 역추적, 매칭 실패 시 `UNLINKED` | CRITICAL |
| PC-002 | **고아 PC** | PC가 어떤 FC에도 연결되지 않음 (카테시안 복제의 산물) | A4-001 교정 후 잔존 고아 PC 삭제 | CRITICAL |
| PC-003 | **occurrence 미평가** | PC 존재하나 연결된 FC의 `occurrence IS NULL` | 경고 로그 + 평가 요청 플래그 | WARNING |
| PC-004 | **중복 PC** | 동일 `failureCauseId` 내 동일 `description` | 병합: 먼저 생성된 ID 유지 | LOW |

**고아 PC 탐지 SQL:**

```sql
-- 카테시안 복제로 인한 고아 PC 탐지
SELECT pc.id, pc.description, pc."failureCauseId"
FROM "PreventionControl" pc
LEFT JOIN "FailureCause" fc ON pc."failureCauseId" = fc.id
WHERE fc.id IS NULL;
```

---

### 2.7 DetectionControl (DC: 검출관리)

| # | 오류 유형 | 탐지 조건 | 자동 교정 | 심각도 |
|---|----------|----------|----------|--------|
| DC-001 | **failureCauseId FK 누락** | `failureCauseId IS NULL` | PC-001과 동일 로직 | CRITICAL |
| DC-002 | **detection 범위 초과** | `detection < 1 OR detection > 10` | 클램핑: `GREATEST(1, LEAST(10, detection))` | MEDIUM |
| DC-003 | **고아 DC** | DC가 어떤 FC에도 연결되지 않음 | PC-002와 동일 로직 | CRITICAL |
| DC-004 | **PC 없이 DC만 존재** | 동일 FC에 DC는 있으나 PC가 0개 | 경고 로그 + 빈 PC 스텁 자동 생성 | WARNING |

---

### 2.8 SOD / AP 평가 (Cross-Entity)

| # | 오류 유형 | 탐지 조건 | 자동 교정 | 심각도 |
|---|----------|----------|----------|--------|
| SOD-001 | **S 미평가** | FM의 `severity IS NULL` | 경고 로그 + 평가 요청 플래그 (자동 할당 금지) | HIGH |
| SOD-002 | **O 미평가** | FC의 `occurrence IS NULL` | 경고 로그 + 평가 요청 플래그 | HIGH |
| SOD-003 | **D 미평가** | DC의 `detection IS NULL` | 경고 로그 + 평가 요청 플래그 | HIGH |
| AP-001 | **AP 미산정** | S/O/D 모두 존재하나 `actionPriority IS NULL` | AP 자동 산정: AIAG-VDA AP 매트릭스 적용 | MEDIUM |
| AP-002 | **AP 불일치** | 저장된 AP ≠ S×O×D 기반 재산정 결과 | 재산정 값으로 덮어쓰기 | HIGH |

**AP 자동 산정 로직:**

```typescript
function calculateAP(s: number, o: number, d: number): 'High' | 'Medium' | 'Low' {
  // AIAG-VDA FMEA 1판 AP 매트릭스
  if (s >= 9 && o >= 4) return 'High';
  if (s >= 9 && o >= 2 && d >= 4) return 'High';
  if (s >= 7 && o >= 4 && d >= 4) return 'High';
  if (s >= 5 && o >= 6 && d >= 4) return 'High';

  if (s >= 7 && o >= 2) return 'Medium';
  if (s >= 5 && o >= 4) return 'Medium';
  if (s >= 3 && o >= 6) return 'Medium';
  if (s >= 2 && o >= 6 && d >= 6) return 'Medium';

  return 'Low';
}
```

---

## 3. Auto-Fix 실행 순서 (의존성 기반)

자동 교정은 반드시 아래 순서로 실행해야 한다. 하위 엔티티 교정은 상위 엔티티 교정 결과에 의존한다.

```
Phase 1: 공유 엔티티 정규화
  ├─ [A4-001] 카테시안 복제 병합
  ├─ [A4-003] name 빈값 복원
  └─ [A4-004] processId 할당

Phase 2: 기능 연결 교정
  ├─ [A3-001] productCharId FK 복원
  ├─ [A3-002] processId 정합성
  └─ [A3-004] sortOrder 재번호

Phase 3: 고장형태 연결 교정
  ├─ [FM-001] productCharId FK 복원 (distribute 결과 폐기)
  ├─ [FM-003] distribute 오배분 교정
  └─ [FM-004] severity 범위 클램핑

Phase 4: 고장사슬 교정
  ├─ [FE-001] failureModeId FK 복원
  ├─ [FC-001] failureModeId FK 복원
  ├─ [FC-003] 고장사슬 단절 검증
  └─ [FC-004] m4Category 복원

Phase 5: 관리항목 교정
  ├─ [PC-001] failureCauseId FK 복원
  ├─ [PC-002] 고아 PC 삭제
  ├─ [DC-001] failureCauseId FK 복원
  ├─ [DC-003] 고아 DC 삭제
  └─ [DC-004] 빈 PC 스텁 생성

Phase 6: 평가 정합성
  ├─ [SOD-001~003] 미평가 항목 플래그
  ├─ [AP-001] AP 자동 산정
  ├─ [AP-002] AP 불일치 재산정
  └─ [FE-002] severity 동기화
```

---

## 4. 트랜잭션 래핑 규칙

```typescript
async function executeAutoFix(pfmeaId: string) {
  return await prisma.$transaction(async (tx) => {
    const report: AutoFixReport = { fixed: [], warnings: [], errors: [] };

    // Phase 1
    report.fixed.push(...await fixCartesianDuplicates(tx, pfmeaId));
    report.fixed.push(...await fixEmptyA4Names(tx, pfmeaId));

    // Phase 2
    report.fixed.push(...await fixA3ProductCharFK(tx, pfmeaId));

    // Phase 3
    report.fixed.push(...await fixFMProductCharFK(tx, pfmeaId));

    // Phase 4
    report.fixed.push(...await fixFailureChainFKs(tx, pfmeaId));

    // Phase 5
    report.fixed.push(...await fixOrphanControls(tx, pfmeaId));

    // Phase 6
    report.fixed.push(...await recalculateAP(tx, pfmeaId));

    return report;
  }, {
    maxWait: 10000,
    timeout: 60000,
    isolationLevel: 'Serializable'
  });
}
```

---

## 5. AutoFixReport 스키마

```typescript
interface AutoFixReport {
  pfmeaId: string;
  executedAt: Date;
  duration: number;          // ms
  fixed: AutoFixEntry[];     // 자동 교정 완료 항목
  warnings: AutoFixEntry[];  // 수동 확인 필요 항목
  errors: AutoFixEntry[];    // 교정 실패 항목
  summary: {
    totalChecked: number;
    totalFixed: number;
    totalWarnings: number;
    totalErrors: number;
    phaseResults: Record<string, PhaseResult>;
  };
}

interface AutoFixEntry {
  ruleId: string;            // e.g. "A4-001"
  entityType: string;        // e.g. "ProcessProductChar"
  entityId: string;          // UUID
  description: string;       // 한글 설명
  before: any;               // 교정 전 값
  after: any;                // 교정 후 값
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'WARNING';
}

interface PhaseResult {
  phase: number;
  name: string;
  checked: number;
  fixed: number;
  skipped: number;
  duration: number;
}
```

---

## 6. API 엔드포인트 설계

```
POST /api/pfmea/{pfmeaId}/auto-fix
  → 전체 Auto-Fix 실행, AutoFixReport 반환

POST /api/pfmea/{pfmeaId}/auto-fix/dry-run
  → 탐지만 수행 (교정 미적용), 예상 교정 목록 반환

POST /api/pfmea/{pfmeaId}/auto-fix/phase/{phaseNumber}
  → 특정 Phase만 실행

GET  /api/pfmea/{pfmeaId}/auto-fix/history
  → 과거 Auto-Fix 실행 이력 조회

GET  /api/pfmea/{pfmeaId}/integrity-check
  → 데이터 무결성 검사만 수행 (교정 없음), 위반 목록 반환
```

---

## 7. DB 마이그레이션 (Auto-Fix 지원 테이블)

```sql
CREATE TABLE "AutoFixLog" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "pfmeaId"     UUID NOT NULL REFERENCES "PFMEA"(id),
  "ruleId"      VARCHAR(10) NOT NULL,
  "entityType"  VARCHAR(50) NOT NULL,
  "entityId"    UUID NOT NULL,
  "action"      VARCHAR(20) NOT NULL,  -- 'MERGE', 'RELINK', 'DELETE', 'FLAG', 'RECALC'
  "before"      JSONB,
  "after"       JSONB,
  "severity"    VARCHAR(10) NOT NULL,
  "createdAt"   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_autofix_pfmea ON "AutoFixLog"("pfmeaId");
CREATE INDEX idx_autofix_rule  ON "AutoFixLog"("ruleId");
CREATE INDEX idx_autofix_entity ON "AutoFixLog"("entityType", "entityId");
```

---

## 8. 금지 사항 (Auto-Fix에서 절대 하지 않는 것)

1. **SOD 값 자동 할당 금지** — S/O/D는 전문가 판단 영역, 미평가 플래그만 마킹
2. **사용자 입력 데이터 삭제 금지** — 고아 엔티티도 삭제 대신 `UNLINKED` 플래그
3. **distribute() 재사용 금지** — 순서 기반 배분은 의미 없음, Import 매칭 정보만 사용
4. **트랜잭션 외부 교정 금지** — 모든 Phase는 단일 `$transaction` 내에서 실행
5. **하드코딩 기대값 금지** — 교정 로직은 속성 기반(이름, FK 관계)으로만 판단