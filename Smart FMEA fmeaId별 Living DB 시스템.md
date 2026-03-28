# PRD: Smart FMEA fmeaId별 Living DB 시스템

> **문서번호**: PRD-FMEA-LDB-001  
> **버전**: 1.0  
> **작성일**: 2026-03-22  
> **기술스택**: Next.js 14 / TypeScript / Prisma / PostgreSQL / Handsontable  
> **프로젝트 경로**: `C:\fmea-stable-dev`

---

## 1. 개요 (Overview)

### 1.1 목적

FMEA 등록 시 fmeaId별 독립 프로젝트 스키마를 생성하고, UUID/FK 명세서에 따라 **결정론적 ID 체계**로 DB 테이블을 사전 구축한 뒤, 엑셀 Import 데이터를 각 화면(탭)별 DB에 직접 저장하고, 워크시트 버튼 클릭 시 DB에서 직접 읽어 화면에 꽂아넣는 **Living DB 아키텍처**를 구현한다.

### 1.2 핵심 원칙

```
FMEA 등록 → 프로젝트 스키마 생성 → 탭별 DB 테이블 생성 (골든베이스라인 기준)
→ 엑셀 Import → 각 화면 DB에 저장 (UUID/FK 결정론적 ID)
→ 워크시트 버튼 → DB에서 직접 읽어 화면 렌더링
→ 사용자 수정/생성 → DB 즉시 반영 (Atomic Cell Save)
→ fmeaId별 독립 운영 + Living DB 지속 개선
```

### 1.3 용어 정의

| 약어 | 정의 |
|------|------|
| Living DB | fmeaId별로 독립 운영되며 사용자 편집이 즉시 반영되는 지속 DB |
| 골든베이스라인 | 12inch AU Bump 데이터 기준 완전 검증된 참조 데이터셋 |
| Atomic Cell Save | 셀 단위 즉시 DB 저장 방식 |
| 결정론적 ID | UUID 명세서 규칙에 따라 데이터 내용으로부터 예측 가능하게 생성되는 ID |
| 프로젝트 스키마 | `pfmea_{fmeaId}` 형식의 PostgreSQL 스키마 |
| 꽂아넣기 | DB 데이터를 워크시트 셀에 직접 매핑하여 렌더링하는 행위 |

---

## 2. 시스템 아키텍처

### 2.1 전체 흐름도

```
[FMEA 등록]
    │
    ▼
[Step 1] 프로젝트 스키마 생성 ─── pfmea_{fmeaId} 스키마 CREATE
    │
    ▼
[Step 2] 탭별 DB 테이블 생성 ─── 골든베이스라인 참조, UUID/FK 명세서 기준
    │                              L1Structure, L2Structure, L3Structure,
    │                              L1Function, L2Function, L3Function,
    │                              FailureMode, FailureEffect, FailureCause,
    │                              FailureLink, RiskAnalysis, ProductChar, DetectionControl
    │
    ▼
[Step 3] 엑셀 Import ─── parseStepBWorkbook → convertToImportFormat
    │                     → buildAtomicFromFlat → 프로젝트 DB 직접 저장
    │                     결정론적 ID: PF-L2-{공정번호}-{4M}-{WE순번}...
    │
    ▼
[Step 4] 워크시트 버튼 ─── GET /api/fmea?fmeaId={id}
    │                      → Atomic DB에서 직접 로드
    │                      → atomicToLegacy 변환
    │                      → Handsontable 렌더링 (꽂아넣기)
    │
    ▼
[Step 5] 사용자 편집 ─── 셀 수정 → PATCH /api/fmea/atom-map
    │                    → DB 즉시 반영 (Atomic Cell Save)
    │                    → 연관 FK 자동 갱신
    │
    ▼
[Step 6] Living DB 운영 ─── fmeaId별 독립, 지속적 데이터 성장
```

### 2.2 스키마 분리 구조

```
PostgreSQL
├── public (공통 스키마)
│   ├── Fmea (FMEA 마스터 목록)
│   ├── User
│   ├── LLD (교훈사례 DB)
│   └── MasterProcess (표준공정 마스터)
│
├── pfmea_pfm26_m002 (프로젝트 스키마 #1)
│   ├── L1Structure
│   ├── L2Structure / L2Function
│   ├── L3Structure / L3Function
│   ├── L1Function
│   ├── ProductChar
│   ├── FailureMode / FailureEffect / FailureCause
│   ├── FailureLink
│   ├── RiskAnalysis
│   └── DetectionControl
│
├── pfmea_pfm26_m067 (프로젝트 스키마 #2)
│   └── ... (동일 테이블 구조)
│
└── pfmea_pfm26_m068 (프로젝트 스키마 #3)
    └── ...
```

---

## 3. Step 1: FMEA 등록 → 프로젝트 스키마 생성

### 3.1 트리거

- 사용자가 FMEA 관리 화면에서 "신규 FMEA 등록" 클릭
- `POST /api/fmea/create-with-import` 호출

### 3.2 처리 로직

```typescript
// 1. fmeaId 채번 (next-id API)
const fmeaId = await generateNextFmeaId(); // e.g. "pfm26-m069"

// 2. public.Fmea 테이블에 마스터 레코드 생성
await prisma.fmea.create({
  data: {
    id: fmeaId,
    name: "12inch AU Bump PFMEA",
    type: "PFMEA",
    status: "DRAFT",
    ...
  }
});

// 3. 프로젝트 스키마 생성
const schemaName = getProjectSchemaName(fmeaId); // "pfmea_pfm26_m069"
await ensureProjectSchemaReady(schemaName);
// → CREATE SCHEMA IF NOT EXISTS pfmea_pfm26_m069
// → 각 Atomic 테이블 DDL 실행
```

### 3.3 관련 파일

| 파일 | 역할 |
|------|------|
| `src/lib/prisma/schema-manager.ts` | `getProjectSchemaName()`, `ensureProjectSchemaReady()` |
| `src/app/api/fmea/create-with-import/route.ts` | FMEA 생성 + Import 통합 API |
| `src/app/api/fmea/next-id/route.ts` | fmeaId 자동 채번 |

### 3.4 스키마 생성 시 필수 테이블 (14개)

```sql
-- 구조 계층 (Structure Tree)
CREATE TABLE L1Structure (id TEXT PRIMARY KEY, name TEXT, ...);
CREATE TABLE L2Structure (id TEXT PRIMARY KEY, l1Id TEXT REFERENCES L1Structure(id), processNo TEXT, processName TEXT, ...);
CREATE TABLE L3Structure (id TEXT PRIMARY KEY, l2Id TEXT REFERENCES L2Structure(id), fourM TEXT, workElement TEXT, ...);

-- 기능 계층 (Function)
CREATE TABLE L1Function  (id TEXT PRIMARY KEY, l1Id TEXT REFERENCES L1Structure(id), scope TEXT, functionText TEXT, ...);
CREATE TABLE L2Function  (id TEXT PRIMARY KEY, l2Id TEXT REFERENCES L2Structure(id), functionText TEXT, ...);
CREATE TABLE L3Function  (id TEXT PRIMARY KEY, l3Id TEXT REFERENCES L3Structure(id), functionText TEXT, ...);

-- 제품특성 / 검출관리
CREATE TABLE ProductChar      (id TEXT PRIMARY KEY, l2Id TEXT REFERENCES L2Structure(id), charText TEXT, specialChar TEXT, ...);
CREATE TABLE DetectionControl  (id TEXT PRIMARY KEY, l2Id TEXT REFERENCES L2Structure(id), controlText TEXT, ...);

-- 고장 분석 (Failure Analysis)
CREATE TABLE FailureMode   (id TEXT PRIMARY KEY, productCharId TEXT REFERENCES ProductChar(id), modeText TEXT, ...);
CREATE TABLE FailureEffect (id TEXT PRIMARY KEY, l1FuncId TEXT REFERENCES L1Function(id), effectText TEXT, severity INT, ...);
CREATE TABLE FailureCause  (id TEXT PRIMARY KEY, l3FuncId TEXT REFERENCES L3Function(id), causeText TEXT, ...);

-- 고장 연결 + 리스크
CREATE TABLE FailureLink    (id TEXT PRIMARY KEY, fmId TEXT REFERENCES FailureMode(id), feId TEXT REFERENCES FailureEffect(id), fcId TEXT REFERENCES FailureCause(id), ...);
CREATE TABLE RiskAnalysis   (id TEXT PRIMARY KEY, linkId TEXT REFERENCES FailureLink(id), severity INT, occurrence INT, detection INT, ap TEXT, pcText TEXT, dcText TEXT, ...);
```

---

## 4. Step 2: 탭별 DB 테이블 생성 (골든베이스라인 기준)

### 4.1 골든베이스라인 참조 데이터

12inch AU Bump 완전 데이터셋 기준:

| 항목 | 골든 수량 | 설명 |
|------|-----------|------|
| L1Structure | 1 | 12INCH AU BUMP |
| L2Structure | 21 | 공정 21개 (01~150) |
| L3Structure | 91 | 4M 작업요소 91개 |
| L1Function | 7~17 | C2 제품기능 (scope별: YP/SP/USER) |
| L2Function | 21~26 | A3 공정기능 |
| L3Function | 100 | B2 요소기능 |
| ProductChar | 21 | A4 제품특성 |
| FailureMode | 26 | A5 고장형태 |
| FailureEffect | 20 | C4 고장영향 |
| FailureCause | 102 | B4 고장원인 |
| FailureLink | 111 | FE↔FM↔FC 연결 |
| RiskAnalysis | 111 | SOD + AP + PC + DC |
| DetectionControl | 21 | A6 검출관리 |

### 4.2 UUID 생성 명세서 (결정론적 ID 규칙)

```
■ L1Structure:    PF-L1
■ L2Structure:    PF-L2-{공정번호}                    예: PF-L2-001
■ L3Structure:    PF-L2-{공정번호}-{4M}-{WE순번}      예: PF-L2-001-MN-001
■ L1Function:     PF-L1-{scope}-{순번}                예: PF-L1-YP-001
■ L2Function:     PF-L2-{공정번호}-F                  예: PF-L2-001-F
■ L3Function:     PF-L2-{공정번호}-{4M}-{WE순번}-F    예: PF-L2-001-MN-001-F
■ ProductChar:    PF-L2-{공정번호}-P-{순번}           예: PF-L2-001-P-001
■ DetectionControl: PF-L2-{공정번호}-DC-{순번}        예: PF-L2-001-DC-001
■ FailureMode:    PF-L2-{공정번호}-P-{순번}-FM-{순번} 예: PF-L2-001-P-001-FM-001
■ FailureEffect:  PF-FE-{scope}-{순번}                예: PF-FE-YP-001
■ FailureCause:   PF-L2-{공정번호}-{4M}-{WE순번}-C-{순번}  예: PF-L2-001-MN-001-C-001
■ FailureLink:    PF-FL-{순번}                        예: PF-FL-001
■ RiskAnalysis:   PF-RA-{순번}                        예: PF-RA-001
```

### 4.3 FK 관계 맵

```
L2Structure.l1Id        → L1Structure.id
L3Structure.l2Id        → L2Structure.id
L1Function.l1Id         → L1Structure.id
L2Function.l2Id         → L2Structure.id
L3Function.l3Id         → L3Structure.id
ProductChar.l2Id        → L2Structure.id       ★ 공정 레벨 공유 엔티티
FailureMode.productCharId → ProductChar.id
FailureEffect.l1FuncId  → L1Function.id        ★ scope 기반 fallback 필요
FailureCause.l3FuncId   → L3Function.id
FailureLink.fmId        → FailureMode.id
FailureLink.feId        → FailureEffect.id
FailureLink.fcId        → FailureCause.id
RiskAnalysis.linkId     → FailureLink.id
DetectionControl.l2Id   → L2Structure.id
```

---

## 5. Step 3: 엑셀 Import → 각 화면 DB에 저장

### 5.1 Import 엑셀 구조 (5개 시트)

```
master_import_{제품명}.xlsx
├── L1 통합(C1-C4)     → C1(구분), C2(제품기능), C3(요구사항), C4(고장영향)
├── L2 통합(A1-A6)     → A1(공정번호), A2(공정명), A3(공정기능), A4(제품특성), A5(고장형태), A6(검출관리)
├── L3 통합(B1-B5)     → B1(작업요소), B2(요소기능), B3(공정특성), B4(고장원인), B5(예방관리)
├── FC 고장사슬         → FE↔FM↔FC 연결 + B5(예방관리) + A6(검출관리) + O/D/AP
└── FA 통합분석         → 전체 통합 뷰 (검증용)
```

### 5.2 Import 파이프라인

```
[엑셀 파일 업로드]
    │
    ▼
[parseStepBWorkbook] ─── ExcelJS로 5개 시트 파싱
    │                     header-detector.ts: 컬럼 자동 인식
    │                     row-parser.ts: StepBRawRow[] 추출
    │
    ▼
[convertToImportFormat] ─── import-builder.ts
    │   ├── L1 시트 → C1/C2/C3/C4 FlatData 생성 (parentItemId 포함)
    │   ├── L2 시트 → A1/A2/A3/A4/A5/A6 FlatData 생성
    │   ├── L3 시트 → B1/B2/B3/B4/B5 FlatData 생성
    │   ├── FC 시트 → FailureChain 배열 생성
    │   └── 결정론적 UUID 할당 (prefix-utils.ts)
    │
    ▼
[buildAtomicFromFlat] ─── FlatData → Atomic 엔티티 변환
    │   ├── itemCode별 분류 (A1→L2Structure, A5→FailureMode 등)
    │   ├── parentItemId 기반 FK 연결
    │   ├── scope 기반 fallback (FE→L1F 매핑)
    │   └── 누락 parentItemId 자동 보완 (processNo lookup)
    │
    ▼
[save-from-import API] ─── Prisma $transaction (Serializable)
    │   ├── 기존 프로젝트 스키마 데이터 전체 삭제 (clean slate)
    │   ├── Atomic 엔티티 순서대로 INSERT
    │   │   L1Structure → L2Structure → L3Structure
    │   │   → L1Function → L2Function → L3Function
    │   │   → ProductChar → DetectionControl
    │   │   → FailureMode → FailureEffect → FailureCause
    │   │   → FailureLink → RiskAnalysis
    │   └── FK 정합성 자동 검증 (pipeline-verify)
    │
    ▼
[검증 완료] ─── allGreen: true
```

### 5.3 itemCode ↔ DB 테이블 매핑

| itemCode | 엑셀 시트 | DB 테이블 | parentItemId 규칙 |
|----------|-----------|-----------|-------------------|
| A1 | L2 시트 | L2Structure | L1Structure.id |
| A2 | L2 시트 | L2Structure.processName | (A1과 동일 레코드) |
| A3 | L2 시트 | L2Function | L2Structure.id (동일 공정번호) |
| A4 | L2 시트 | ProductChar | L2Structure.id ★공정레벨 공유 |
| A5 | L2 시트 | FailureMode | ProductChar.id |
| A6 | L2 시트 | DetectionControl | L2Structure.id |
| B1 | L3 시트 | L3Structure | L2Structure.id (동일 공정번호) |
| B2 | L3 시트 | L3Function | L3Structure.id |
| B3 | L3 시트 | L3Function.processChar | (B2와 동일 레코드) |
| B4 | L3 시트 | FailureCause | L3Function.id |
| B5 | L3 시트 | RiskAnalysis.pcText | (FC 시트에서 매칭) |
| C1 | L1 시트 | L1Function.scope | - |
| C2 | L1 시트 | L1Function | L1Structure.id |
| C3 | L1 시트 | L1Function.requirement | C2의 L1Function.id |
| C4 | L1 시트 | FailureEffect | L1Function.id (scope 기반) |

### 5.4 parentItemId 생성 규칙 (import-builder.ts)

```typescript
// A5(고장형태) → A4(제품특성) 참조
A5.parentItemId = 동일 공정번호의 ProductChar.id  // PF-L2-{공정번호}-P-{순번}

// B4(고장원인) → B2/B3(요소기능) 참조  
B4.parentItemId = 동일 공정번호+4M+WE의 L3Function.id  // PF-L2-{공정번호}-{4M}-{WE순번}-F

// C3(요구사항) → C2(제품기능) 참조
C3.parentItemId = 동일 scope의 L1Function.id  // PF-L1-{scope}-{순번}

// C4(고장영향) → C2(제품기능) 참조
C4.parentItemId = 동일 scope의 L1Function.id  // PF-L1-{scope}-{순번}

// ★ fallback: parentItemId가 없거나 DB에 없을 때
// → processNo 또는 scope 기반 lookup으로 자동 보완
```

### 5.5 트랜잭션 원자성 요구사항

```typescript
await prisma.$transaction(async (tx) => {
  // 1. 기존 데이터 전체 삭제 (역순)
  await tx.$executeRawUnsafe(`DELETE FROM "${schema}"."RiskAnalysis"`);
  await tx.$executeRawUnsafe(`DELETE FROM "${schema}"."FailureLink"`);
  // ... (14개 테이블 역순 삭제)

  // 2. 새 데이터 순서대로 INSERT (FK 참조 순서)
  await tx.$executeRawUnsafe(`INSERT INTO "${schema}"."L1Structure" ...`);
  await tx.$executeRawUnsafe(`INSERT INTO "${schema}"."L2Structure" ...`);
  // ... (14개 테이블 순서 INSERT)
}, {
  isolationLevel: 'Serializable',
  timeout: 60000
});
```

---

## 6. Step 4: 워크시트 버튼 → DB에서 읽어 화면에 꽂아넣기

### 6.1 꽂아넣기 흐름

```
[사용자: 워크시트 버튼 클릭]
    │
    ▼
[GET /api/fmea?fmeaId={id}&view=worksheet]
    │
    ▼
[DB 로드] ─── 프로젝트 스키마에서 14개 테이블 전체 조회
    │          SELECT * FROM pfmea_{fmeaId}."L2Structure" ...
    │          SELECT * FROM pfmea_{fmeaId}."FailureLink" ...
    │          SELECT * FROM pfmea_{fmeaId}."RiskAnalysis" ...
    │
    ▼
[atomicToLegacy 변환] ─── Atomic 엔티티 → 워크시트 행 구조
    │   ├── FailureLink 기준으로 행 생성 (1 Link = 1 행)
    │   ├── FK 따라가며 FE/FM/FC/PC/DC 텍스트 조립
    │   ├── L2→L3 구조트리 매핑
    │   └── SOD/AP 값 주입
    │
    ▼
[Handsontable 렌더링] ─── 워크시트 셀에 직접 꽂아넣기
    │   ├── 구조 영역: A1(공정번호), A2(공정명), B1(작업요소)
    │   ├── 기능 영역: A3(공정기능), B2(요소기능), B3(공정특성)
    │   ├── 고장 영역: C4(고장영향), A5(고장형태), B4(고장원인)
    │   ├── 관리 영역: B5(예방관리), A6(검출관리)
    │   ├── 평가 영역: S, O, D, AP
    │   └── 셀 병합: mergeCells 설정 (동일 공정/동일 FM 그룹)
    │
    ▼
[화면 표시 완료]
```

### 6.2 탭별 화면 ↔ DB 매핑

| 탭 (화면) | 표시 데이터 | DB 소스 테이블 |
|-----------|-------------|---------------|
| 구조분석 (ST) | 공정트리 L1→L2→L3 | L1Structure, L2Structure, L3Structure |
| 기능분석 (FN) | 공정기능, 요소기능, 제품특성 | L2Function, L3Function, ProductChar |
| 고장분석 (FA) | 고장영향↔고장형태↔고장원인 | FailureEffect, FailureMode, FailureCause, FailureLink |
| 리스크분석 (RA) | SOD 평가, AP 판정, PC/DC | RiskAnalysis, FailureLink |
| 워크시트 (WS) | 전체 통합 뷰 | 14개 테이블 전체 JOIN |
| ALL 탭 | 전체 요약 | AllTabRenderer.tsx (최적화 렌더링) |

### 6.3 관련 파일

| 파일 | 역할 |
|------|------|
| `src/app/api/fmea/route.ts` | GET: Atomic DB 로드, atomicToLegacy 변환 |
| `src/lib/fmea/atomicToLegacy.ts` | Atomic → 워크시트 행 변환 |
| `src/app/(fmea-core)/pfmea/worksheet/` | Handsontable 기반 워크시트 UI |
| `src/app/(fmea-core)/pfmea/all-tab/AllTabRenderer.tsx` | ALL 탭 최적화 렌더링 |

---

## 7. Step 5: 사용자 수정 → DB 즉시 반영 (Atomic Cell Save)

### 7.1 Atomic Cell Save 흐름

```
[사용자: 워크시트 셀 편집]
    │  예: B4(고장원인) 텍스트 수정
    │
    ▼
[afterChange 이벤트] ─── Handsontable onChange 핸들러
    │   ├── 변경된 셀 좌표 (row, col) 감지
    │   ├── 셀 메타데이터에서 atomicId 추출
    │   │   (각 셀은 렌더링 시 atomicId를 메타에 보유)
    │   └── 변경값 수집
    │
    ▼
[PATCH /api/fmea/atom-map]
    │   body: {
    │     fmeaId: "pfm26-m002",
    │     atomicId: "PF-L2-001-MN-001-C-001",
    │     table: "FailureCause",
    │     field: "causeText",
    │     value: "수정된 고장원인 텍스트"
    │   }
    │
    ▼
[DB 즉시 반영]
    │   UPDATE pfmea_pfm26_m002."FailureCause"
    │   SET "causeText" = '수정된 고장원인 텍스트',
    │       "updatedAt" = NOW()
    │   WHERE id = 'PF-L2-001-MN-001-C-001'
    │
    ▼
[연관 FK 자동 갱신] (필요 시)
    │   예: SOD 값 변경 → AP 자동 재계산
    │   예: FM 텍스트 변경 → FailureLink 참조는 유지 (FK이므로)
    │
    ▼
[클라이언트 확인] ─── 200 OK + updatedAt 반환
```

### 7.2 SOD 변경 시 AP 자동 재계산

```typescript
// RiskAnalysis 테이블의 S/O/D 값 변경 시
if (table === 'RiskAnalysis' && ['severity', 'occurrence', 'detection'].includes(field)) {
  const ra = await tx.riskAnalysis.findUnique({ where: { id: atomicId } });
  const newAP = calculateAP(ra.severity, ra.occurrence, ra.detection);
  await tx.riskAnalysis.update({
    where: { id: atomicId },
    data: { ap: newAP, updatedAt: new Date() }
  });
}

// AP 판정 로직 (AIAG-VDA 1판 기준)
function calculateAP(s: number, o: number, d: number): string {
  if (s >= 9 || (s >= 7 && o >= 4) || (s >= 5 && o >= 5 && d >= 5)) return 'H';
  if (s >= 5 && o >= 3 && d >= 3) return 'M';
  return 'L';
}
```

### 7.3 새 데이터 생성 (행 추가)

```
[사용자: 행 추가 버튼]
    │
    ▼
[새 Atomic 엔티티 생성]
    │   ├── 결정론적 ID 채번 (기존 최대 순번 + 1)
    │   ├── FK 자동 연결 (현재 컨텍스트의 상위 엔티티)
    │   └── 빈 값으로 DB INSERT
    │
    ▼
[POST /api/fmea/atom-map]
    │   body: {
    │     fmeaId: "pfm26-m002",
    │     action: "create",
    │     table: "FailureCause",
    │     parentId: "PF-L2-001-MN-001-F",  // L3Function FK
    │     data: { causeText: "" }
    │   }
    │
    ▼
[DB INSERT + 워크시트 행 추가 렌더링]
```

---

## 8. Step 6: fmeaId별 독립 운영 + Living DB

### 8.1 독립 운영 원칙

```
■ 각 fmeaId는 완전히 독립된 PostgreSQL 스키마를 가짐
■ fmeaId A의 데이터 수정이 fmeaId B에 영향 없음
■ 스키마 삭제 = FMEA 프로젝트 완전 삭제 (CASCADE)
■ 스키마 복제 = FMEA 프로젝트 복제 (revision-clone)
■ 스키마 백업 = pg_dump --schema=pfmea_{fmeaId}
```

### 8.2 Living DB 생명주기

```
[DRAFT] ─── 초기 Import 후 편집 중
    │
    ▼
[IN_REVIEW] ─── SOD 평가 완료, 검토 요청
    │
    ▼
[APPROVED] ─── 승인 완료, 기준선 확정
    │
    ▼
[REVISION] ─── 개선 활동 반영, 새 리비전 생성
    │              revision-clone API → 새 fmeaId로 스키마 복제
    │
    ▼
[ACTIVE] ─── 양산 중 지속 운영, 변경점 즉시 반영
```

### 8.3 데이터 내보내기

| 형식 | API | 용도 |
|------|-----|------|
| 마스터 JSON | `POST /api/fmea/export-master` | 전체 Atomic DB + flatData + chains |
| 엑셀 패키지 | `POST /api/fmea/export-package` | 고객 제출용 FMEA 양식 |
| 라운드트립 엑셀 | `GET /api/fmea/generate-roundtrip-excel` | 재Import 가능한 엑셀 |

---

## 9. 파이프라인 검증 체계

### 9.1 pipeline-verify API

```
GET /api/fmea/pipeline-verify?fmeaId={id}

응답:
{
  "allGreen": true,
  "steps": [
    { "step": 0, "name": "구조",   "status": "ok" },
    { "step": 1, "name": "UUID",   "status": "ok" },
    { "step": 2, "name": "fmeaId", "status": "ok" },
    { "step": 3, "name": "FK",     "status": "ok" },   ← FK 정합성 (고아 0건)
    { "step": 4, "name": "누락",   "status": "ok" }    ← PC/DC/SOD 누락 0건
  ]
}
```

### 9.2 검증 항목

| Step | 검증 내용 | 합격 기준 |
|------|-----------|-----------|
| 0. 구조 | L1→L2→L3 계층 무결성 | l2WithoutL3 = 0 |
| 1. UUID | 결정론적 ID 존재 여부 | 모든 테이블 count > 0 |
| 2. fmeaId | 스키마 내 데이터 일관성 | 모든 레코드 fmeaId 일치 |
| 3. FK | 외래키 참조 무결성 | totalOrphans = 0 ★ |
| 4. 누락 | PC/DC/SOD/AP 누락 검사 | emptyPC=0, missS=0, missO=0, missD=0 |

### 9.3 골든베이스라인 반복 루프

```
[엑셀 Import 생성]
    │
    ▼
[DB 저장 (save-from-import)]
    │
    ▼
[pipeline-verify 실행]
    │
    ├── allGreen: true → ✅ 완료
    │
    └── allGreen: false → 오류 분석
            │
            ▼
        [코드 수정 (buildAtomicFromFlat / atomicToFlatData)]
            │
            ▼
        [re-export → re-import → re-verify] ← 반복
```

---

## 10. API 엔드포인트 전체 목록

### 10.1 핵심 CRUD API

| Method | Path | 역할 |
|--------|------|------|
| POST | `/api/fmea/create-with-import` | FMEA 등록 + 스키마 생성 + Import |
| GET | `/api/fmea?fmeaId={id}` | Atomic DB 로드 → 워크시트 데이터 |
| PATCH | `/api/fmea/atom-map` | 셀 단위 수정 (Atomic Cell Save) |
| POST | `/api/fmea/save-from-import` | flatData → Atomic DB 저장 |
| POST | `/api/fmea/rebuild-atomic` | 기존 데이터로 Atomic DB 재구축 |

### 10.2 Import/Export API

| Method | Path | 역할 |
|--------|------|------|
| POST | `/api/fmea/export-master` | 마스터 JSON 내보내기 |
| POST | `/api/fmea/import-package` | 패키지 가져오기 |
| POST | `/api/fmea/export-package` | 패키지 내보내기 |
| POST | `/api/fmea/load-master` | 마스터 JSON 불러오기 |
| POST | `/api/fmea/import-excel-file` | 서버사이드 엑셀 파싱 (신규) |

### 10.3 검증/유지보수 API

| Method | Path | 역할 |
|--------|------|------|
| GET | `/api/fmea/pipeline-verify` | 5단계 파이프라인 검증 |
| GET | `/api/fmea/pipeline-detail` | 상세 파이프라인 리포트 |
| GET | `/api/fmea/validate-fk` | FK 정합성 단독 검증 |
| POST | `/api/fmea/resave-import` | 재Import (데이터 리프레시) |
| POST | `/api/fmea/version-backup` | 버전 백업 생성 |
| POST | `/api/fmea/revision-clone` | 리비전 복제 |

---

## 11. 구현 우선순위

### Phase 1: 골든베이스라인 100% 달성 (현재 진행 중)

- [x] 프로젝트 스키마 분리 (`getProjectSchemaName` + `ensureProjectSchemaReady`)
- [x] `save-from-import` → `buildAtomicFromFlat` → DB 직접 저장
- [x] GET `/api/fmea` → Atomic DB 직접 로드
- [x] `atomicToLegacy` → 워크시트 렌더링
- [x] FailureLink/RiskAnalysis 111건 복원
- [x] FE→L1F scope 기반 fallback 구현
- [ ] L1F 17건 완전 생성 (C3 데이터 보충)
- [ ] L2F 26건 완전 생성 (A4 데이터 보충)
- [ ] allGreen: true 달성

### Phase 2: Atomic Cell Save 완성

- [ ] atom-map PATCH API 셀 메타데이터 연동
- [ ] SOD 변경 → AP 자동 재계산
- [ ] 새 행 추가 (FailureCause, FailureMode 동적 생성)
- [ ] 행 삭제 시 FK CASCADE 처리

### Phase 3: 워크시트 꽂아넣기 최적화

- [ ] 대용량 데이터 가상 스크롤 (Handsontable virtualized rendering)
- [ ] 셀 병합 최적화 (mergeCells 사전 계산)
- [ ] ALL 탭 성능 최적화 (useMemo, useEffect 최소화)

### Phase 4: Living DB 운영 체계

- [ ] 리비전 관리 (revision-clone + revision-confirm)
- [ ] 변경 이력 추적 (audit trail)
- [ ] 다중 fmeaId 대시보드
- [ ] LLD 연동 (교훈사례 기반 PC/DC 자동추천)

---

## 12. 기술적 제약 및 주의사항

### 12.1 Prisma 제약

```
■ Raw SQL 필수: 프로젝트 스키마 접근 시 $executeRawUnsafe 사용
  → Prisma Client는 public 스키마만 기본 지원
  → 동적 스키마 전환: SET search_path TO pfmea_{fmeaId}

■ $transaction 타임아웃: 60초 (대량 Import 시)
■ isolationLevel: 'Serializable' 필수 (동시 수정 방지)
■ skipDuplicates 주의: createMany에서 FK 위반 시 전체 실패
```

### 12.2 성능 고려

```
■ 111행 워크시트: 1초 내 로드 목표
■ 14개 테이블 JOIN: 병렬 쿼리로 최적화
■ ALL 탭: useMemo + virtualized rendering
■ Atomic Cell Save: 단일 UPDATE, 100ms 이내 응답
```

### 12.3 데이터 무결성

```
■ FK 위반 시: 트랜잭션 전체 롤백
■ 고아 레코드: pipeline-verify Step 3에서 감지
■ 중복 ID: 결정론적 ID 체계로 방지
■ 누락 SOD: pipeline-verify Step 4에서 감지
```

---

## 13. 파일 구조 참조

```
C:\fmea-stable-dev\src\
├── app\
│   ├── api\fmea\
│   │   ├── route.ts                    ← GET: Atomic DB 로드
│   │   ├── create-with-import\         ← FMEA 등록
│   │   ├── save-from-import\           ← Import → DB 저장
│   │   ├── atom-map\                   ← Atomic Cell Save
│   │   ├── export-master\              ← 마스터 JSON 내보내기
│   │   ├── pipeline-verify\            ← 파이프라인 검증
│   │   ├── rebuild-atomic\             ← Atomic DB 재구축
│   │   └── import-excel-file\          ← 서버사이드 엑셀 파싱 (신규)
│   │
│   └── (fmea-core)\pfmea\
│       ├── import\
│       │   ├── stepb-parser\
│       │   │   ├── index.ts            ← parseStepBWorkbook 진입점
│       │   │   ├── header-detector.ts  ← 컬럼 자동 인식
│       │   │   ├── row-parser.ts       ← 행 파싱
│       │   │   ├── import-builder.ts   ← convertToImportFormat + 결정론적 ID
│       │   │   └── prefix-utils.ts     ← UUID prefix 생성
│       │   └── utils\
│       │       ├── buildAtomicFromFlat.ts  ← FlatData → Atomic 변환
│       │       ├── atomicToFlatData.ts     ← Atomic → FlatData 역변환
│       │       └── atomicToChains.ts       ← Atomic → FailureChain 생성
│       │
│       └── worksheet\                  ← Handsontable 워크시트 UI
│
├── lib\
│   ├── prisma\
│   │   ├── schema-manager.ts           ← 스키마 생성/관리
│   │   └── client.ts                   ← Prisma Client
│   └── fmea\
│       └── atomicToLegacy.ts           ← Atomic → 워크시트 행 변환
│
└── types\
    ├── fmea.ts                         ← FMEA 타입 정의
    └── import.ts                       ← Import 관련 타입
```

---

## 14. 부록: 골든베이스라인 데이터 현황

### 2026-03-22 기준 (pfm26-m002)

| 항목 | 골든 목표 | 현재 | 상태 |
|------|-----------|------|------|
| L1Structure | 1 | 1 | ✅ |
| L2Structure | 21 | 21 | ✅ |
| L3Structure | 91 | 91 | ✅ |
| L1Function | 17 | 7 | ⚠️ C3 데이터 보충 필요 |
| L2Function | 26 | 21 | ⚠️ A4 데이터 보충 필요 |
| L3Function | 100 | 100 | ✅ |
| ProductChar | 21 | 21 | ✅ (추정) |
| FailureMode | 26 | 26 | ✅ |
| FailureEffect | 20 | 20 | ✅ |
| FailureCause | 102 | 102 | ✅ |
| FailureLink | 111 | 111 | ✅ |
| RiskAnalysis | 111 | 111 | ✅ |
| FK 정합성 | 고아 0건 | 고아 0건 | ✅ |
| pipeline-verify | allGreen | Step1 WARN | ⚠️ L3F 없는 WE 1건 |

---

> **이 PRD는 Cursor/Claude Code에 컨텍스트로 제공하여 Smart FMEA의 fmeaId별 Living DB 시스템 구현을 안내하는 데 사용합니다.**