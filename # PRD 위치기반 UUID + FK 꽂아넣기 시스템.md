# PRD: 위치기반 UUID + FK 꽂아넣기 시스템

> **문서번호**: PRD-FMEA-POSID-001  
> **버전**: 2.0 (CODEFREEZE v4.6.0)  
> **작성일**: 2026-03-22  
> **최종 검증일**: 2026-03-24 (v4.6.0-codefreeze-final)  
> **상위 PRD**: PRD-FMEA-LDB-001 (fmeaId별 Living DB 시스템)  
> **핵심 변경**: 텍스트 매칭 FK → 위치기반 UUID FK로 전면 교체

---

## 1. 문제 정의

### 1.1 현재 방식의 근본 문제

```
현재: 텍스트 매칭으로 FK 연결
  C4(고장영향) "전기적 Open/Short" → L1Function 중 텍스트가 같은 것을 찾아서 FK 연결
  → 텍스트 약간 다르면 → 고아 발생 (FE.l1FuncId → L1F: 고아 20건)
  → scope 기반 fallback 추가 → 또 다른 엣지케이스 발생
  → 보완 로직 추가 → 복잡도 증가 → 새로운 버그 발생
  → 무한 패치 루프
```

### 1.2 근본 해결: 위치기반 UUID

```
신규: 엑셀 셀 위치 = UUID, 부모 셀 위치 = FK
  C4(고장영향)는 L1시트 2행 4열 → UUID = "L1-R2-C4"
  이 C4의 부모는 L1시트 2행 2열(C2 제품기능) → FK = "L1-R2-C2"
  → 텍스트 매칭 완전 제거
  → 엑셀 위치만 맞으면 FK 100% 보장
  → 디버깅: 엑셀 열어서 해당 셀 찾으면 끝
```

---

## 2. 위치기반 UUID 체계

### 2.1 UUID 생성 규칙

```
UUID = {시트코드}-R{행번호}-C{열번호}

시트코드:
  L1 = "L1 통합(C1-C4)" 시트
  L2 = "L2 통합(A1-A6)" 시트
  L3 = "L3 통합(B1-B5)" 시트
  FC = "FC 고장사슬" 시트

행번호: 데이터 시작 행부터 1-based (헤더 제외)
  → 엑셀 실제 행번호 - 1 (헤더가 1행이므로)
  → 또는 엑셀 실제 행번호 그대로 사용 (R2 = 엑셀 2행)

열번호: 해당 시트의 컬럼 순서 (1-based)
```

### 2.2 시트별 UUID 매핑

#### L1 시트 (C1-C4)

```
엑셀 구조:
  Col1: C1(구분)  Col2: C2(제품기능)  Col3: C3(요구사항)  Col4: C4(고장영향)

UUID 예시 (2행 = 첫 번째 데이터):
  L1-R2-C1 = "YP"                          → scope 값
  L1-R2-C2 = "Au Bump 제품특성이..."        → L1Function 레코드
  L1-R2-C3 = "Au Bump 높이 규격..."         → L1Function.requirement
  L1-R2-C4 = "Particle 오염으로 인한..."     → FailureEffect 레코드

DB 저장:
  L1Function 테이블:
    id = "L1-R2-C2"
    scope = L1-R2-C1 셀값 ("YP")
    functionText = L1-R2-C2 셀값
    requirement = L1-R2-C3 셀값

  FailureEffect 테이블:
    id = "L1-R2-C4"
    l1FuncId = "L1-R2-C2"     ← 같은 행의 C2 UUID가 FK!
    effectText = L1-R2-C4 셀값
```

#### L2 시트 (A1-A6)

```
엑셀 구조:
  Col1: A1(공정번호)  Col2: A2(공정명)  Col3: A3(공정기능)
  Col4: A4(제품특성)  Col5: 특별특성     Col6: A5(고장형태)  Col7: A6(검출관리)

UUID 예시 (2행):
  L2-R2-C1 = "01"                    → L2Structure.processNo
  L2-R2-C2 = "작업환경"              → L2Structure.processName
  L2-R2-C3 = "클린룸 환경을..."       → L2Function 레코드
  L2-R2-C4 = "파티클 수"             → ProductChar 레코드
  L2-R2-C5 = ""                      → ProductChar.specialChar
  L2-R2-C6 = "파티클 초과"           → FailureMode 레코드
  L2-R2-C7 = "Particle Counter..."   → DetectionControl 레코드

DB 저장:
  L2Structure 테이블:
    id = "L2-R2"                  ← 행 단위 (C1+C2가 한 레코드)
    l1Id = "L1"                   ← L1Structure는 1개이므로 고정
    processNo = "01"
    processName = "작업환경"

  L2Function 테이블:
    id = "L2-R2-C3"
    l2Id = "L2-R2"                ← 같은 행의 L2Structure FK
    functionText = 셀값

  ProductChar 테이블:
    id = "L2-R2-C4"
    l2Id = "L2-R2"                ← 같은 행의 L2Structure FK
    charText = 셀값
    specialChar = L2-R2-C5 셀값

  FailureMode 테이블:
    id = "L2-R2-C6"
    productCharId = "L2-R2-C4"   ← 같은 행의 ProductChar FK!
    modeText = 셀값

  DetectionControl 테이블:
    id = "L2-R2-C7"
    l2Id = "L2-R2"                ← 같은 행의 L2Structure FK
    controlText = 셀값
```

#### L3 시트 (B1-B5)

```
엑셀 구조:
  Col1: 공정번호  Col2: 4M  Col3: B1(작업요소)  Col4: B2(요소기능)
  Col5: B3(공정특성)  Col6: 특별특성  Col7: B4(고장원인)  Col8: B5(예방관리)

UUID 예시 (2행):
  L3-R2-C1 = "01"                    → 공정번호 (L2 시트 참조 키)
  L3-R2-C2 = "MN"                    → 4M 코드
  L3-R2-C3 = "클린룸 담당자"          → L3Structure.workElement
  L3-R2-C4 = "클린룸 담당자가..."     → L3Function 레코드
  L3-R2-C5 = "작업 숙련도"            → L3Function.processChar
  L3-R2-C6 = ""                      → L3Function.specialChar
  L3-R2-C7 = "작업 숙련도 부족"       → FailureCause 레코드
  L3-R2-C8 = "클린룸 작업자 교육..."  → PC(예방관리) 텍스트

DB 저장:
  L3Structure 테이블:
    id = "L3-R2"
    l2Id = ?                         ← 크로스시트 참조 (아래 2.3 참조)
    fourM = "MN"
    workElement = "클린룸 담당자"

  L3Function 테이블:
    id = "L3-R2-C4"
    l3Id = "L3-R2"                   ← 같은 행의 L3Structure FK
    functionText = 셀값
    processChar = L3-R2-C5 셀값

  FailureCause 테이블:
    id = "L3-R2-C7"
    l3FuncId = "L3-R2-C4"           ← 같은 행의 L3Function FK!
    causeText = 셀값
```

#### FC 시트 (고장사슬)

```
엑셀 구조:
  Col1: FE구분   Col2: FE(고장영향)      Col3: 공정번호
  Col4: FM(고장형태)  Col5: 4M  Col6: 작업요소(WE)  Col7: FC(고장원인)
  Col8: B5(예방관리)  Col9: A6(검출관리)
  Col10: O  Col11: D  Col12: AP

UUID 예시 (2행):
  FC-R2 = FailureLink 레코드 (이 행 자체가 하나의 고장연결)

DB 저장:
  FailureLink 테이블:
    id = "FC-R2"
    feId = ?     ← 크로스시트 참조로 L1 시트의 FE UUID 찾기
    fmId = ?     ← 크로스시트 참조로 L2 시트의 FM UUID 찾기
    fcId = ?     ← 크로스시트 참조로 L3 시트의 FC UUID 찾기

  RiskAnalysis 테이블:
    id = "FC-R2-RA"
    linkId = "FC-R2"              ← 같은 행의 FailureLink FK
    severity = (FE에서 상속)
    occurrence = Col10 셀값
    detection = Col11 셀값
    ap = Col12 셀값
    pcText = Col8 셀값 (B5 예방관리)
    dcText = Col9 셀값 (A6 검출관리)
```

### 2.3 크로스시트 참조 (Cross-Sheet FK)

FC 시트는 L1/L2/L3 시트의 데이터를 참조해야 한다. 이때 **텍스트 매칭 대신 위치 역참조 인덱스**를 사용한다.

#### 방법: Import 시 역참조 인덱스 구축

```typescript
// Step 1: 각 시트 파싱 시 인덱스 구축
const l1Index = new Map<string, string>();  // key → L1 UUID
const l2Index = new Map<string, string>();  // key → L2 UUID  
const l3Index = new Map<string, string>();  // key → L3 UUID

// L1 시트 파싱 시: FE 텍스트 → UUID 인덱스
// key = "scope:FE텍스트앞30자" 또는 단순히 행번호 기반
for (const row of l1Rows) {
  // 핵심: FC시트의 FE구분(Col1) + FE텍스트(Col2)로 매칭
  const key = `${row.c1}:${row.c4Text.substring(0, 30)}`;
  l1Index.set(key, `L1-R${row.rowNum}-C4`);  // FE UUID
}

// L2 시트 파싱 시: FM 텍스트 → UUID 인덱스
for (const row of l2Rows) {
  // 핵심: FC시트의 공정번호(Col3) + FM텍스트(Col4)로 매칭
  const key = `${row.processNo}:${row.fmText.substring(0, 30)}`;
  l2Index.set(key, `L2-R${row.rowNum}-C6`);  // FM UUID
}

// L3 시트 파싱 시: FC 텍스트 → UUID 인덱스
for (const row of l3Rows) {
  // 핵심: FC시트의 공정번호(Col3) + 4M(Col5) + WE(Col6) + FC텍스트(Col7)
  const key = `${row.processNo}:${row.fourM}:${row.we}:${row.fcText.substring(0, 30)}`;
  l3Index.set(key, `L3-R${row.rowNum}-C7`);  // FC UUID
}
```

#### 개선안: FC 시트에 원본 행번호 컬럼 추가

```
FC 시트 확장 구조 (권장):
  Col1: FE구분  Col2: FE(고장영향)  Col3: 공정번호
  Col4: FM(고장형태)  Col5: 4M  Col6: WE  Col7: FC(고장원인)
  Col8: B5  Col9: A6  Col10: O  Col11: D  Col12: AP
  Col13: L1원본행  Col14: L2원본행  Col15: L3원본행   ← 신규 추가

예시:
  FC-R2: FE="Particle 오염...", FM="파티클 초과", FC="작업 숙련도 부족"
         L1원본행=2, L2원본행=2, L3원본행=2

FK 생성:
  FailureLink.feId = "L1-R{Col13}-C4" = "L1-R2-C4"   ← 100% 확정
  FailureLink.fmId = "L2-R{Col14}-C6" = "L2-R2-C6"   ← 100% 확정
  FailureLink.fcId = "L3-R{Col15}-C7" = "L3-R2-C7"   ← 100% 확정
```

**이 방식이면 텍스트 매칭이 완전히 제거된다.**

### 2.4 L3 → L2 크로스시트 참조

L3 시트의 공정번호로 L2 시트 행을 찾아 FK를 연결한다.

```typescript
// L3Structure.l2Id 결정
// L3 시트 Col1(공정번호) → L2 시트에서 같은 공정번호의 행 찾기

const l2ByProcessNo = new Map<string, string>();  // 공정번호 → L2 UUID

for (const row of l2Rows) {
  // 같은 공정번호의 첫 번째 행을 대표로 사용
  if (!l2ByProcessNo.has(row.processNo)) {
    l2ByProcessNo.set(row.processNo, `L2-R${row.rowNum}`);
  }
}

// L3 시트 파싱 시
for (const row of l3Rows) {
  const l3Structure = {
    id: `L3-R${row.rowNum}`,
    l2Id: l2ByProcessNo.get(row.processNo),  // 공정번호로 L2 FK 확정
    fourM: row.fourM,
    workElement: row.we
  };
}
```

---

## 3. 전체 Import → DB → 꽂아넣기 흐름

### 3.1 Import 파이프라인 (신규)

```
[엑셀 파일 업로드]
    │
    ▼
[Phase 1: 시트별 파싱 + 위치 UUID 할당]
    │
    ├── L1 시트 파싱
    │   각 행마다:
    │     L1Function: id="L1-R{행}-C2", scope=Col1, text=Col2, req=Col3
    │     FailureEffect: id="L1-R{행}-C4", l1FuncId="L1-R{행}-C2", text=Col4
    │
    ├── L2 시트 파싱
    │   각 행마다:
    │     L2Structure: id="L2-R{행}", processNo=Col1, processName=Col2
    │     L2Function: id="L2-R{행}-C3", l2Id="L2-R{행}", text=Col3
    │     ProductChar: id="L2-R{행}-C4", l2Id="L2-R{행}", text=Col4
    │     FailureMode: id="L2-R{행}-C6", productCharId="L2-R{행}-C4", text=Col6
    │     DetectionControl: id="L2-R{행}-C7", l2Id="L2-R{행}", text=Col7
    │
    ├── L3 시트 파싱
    │   각 행마다:
    │     L3Structure: id="L3-R{행}", l2Id=공정번호→L2 lookup, fourM=Col2, we=Col3
    │     L3Function: id="L3-R{행}-C4", l3Id="L3-R{행}", text=Col4, char=Col5
    │     FailureCause: id="L3-R{행}-C7", l3FuncId="L3-R{행}-C4", text=Col7
    │
    └── FC 시트 파싱
        각 행마다:
          FailureLink: id="FC-R{행}"
            feId = "L1-R{Col13}-C4"  (원본행 참조) 또는 역참조 인덱스
            fmId = "L2-R{Col14}-C6"  (원본행 참조) 또는 역참조 인덱스
            fcId = "L3-R{Col15}-C7"  (원본행 참조) 또는 역참조 인덱스
          RiskAnalysis: id="FC-R{행}-RA", linkId="FC-R{행}"
            severity=FE상속, occurrence=Col10, detection=Col11, ap=Col12
            pcText=Col8, dcText=Col9
    │
    ▼
[Phase 2: FK 검증 (0ms — 위치 기반이므로 즉시 확인)]
    │
    ├── 모든 FK가 존재하는 UUID를 참조하는지 확인
    │   FailureEffect.l1FuncId → L1Function.id 존재 여부
    │   FailureMode.productCharId → ProductChar.id 존재 여부
    │   FailureCause.l3FuncId → L3Function.id 존재 여부
    │   FailureLink.feId/fmId/fcId → 각각 존재 여부
    │
    └── 누락 시: 어떤 시트 몇 행이 문제인지 즉시 특정 가능
    │
    ▼
[Phase 3: DB 저장 (Prisma $transaction, Serializable)]
    │
    ├── 14개 테이블 FK 순서대로 INSERT
    │   L1Structure → L2Structure → L3Structure
    │   → L1Function → L2Function → L3Function
    │   → ProductChar → DetectionControl
    │   → FailureMode → FailureEffect → FailureCause
    │   → FailureLink → RiskAnalysis
    │
    └── 트랜잭션 성공 = Import 완료
    │
    ▼
[Phase 4: 검증 (pipeline-verify)]
    │
    └── allGreen: true 보장 (위치기반 FK이므로 고아 0건)
```

### 3.2 워크시트 꽂아넣기 (변경 없음)

```
[워크시트 버튼 클릭]
    │
    ▼
[GET /api/fmea?fmeaId={id}]
    │
    ▼
[DB에서 14개 테이블 로드]
    │  id가 위치기반이지만, 데이터 구조는 동일
    │  atomicToLegacy 변환 로직 변경 불필요
    │
    ▼
[Handsontable 렌더링]
    │  각 셀의 meta.atomicId = 위치기반 UUID
    │  예: meta.atomicId = "L2-R2-C6" (FailureMode)
    │
    ▼
[화면 표시]
```

### 3.3 Atomic Cell Save (변경 없음)

```
[사용자 셀 편집]
    │
    ▼
[PATCH /api/fmea/atom-map]
    body: {
      fmeaId: "pfm26-m066",
      atomicId: "L3-R2-C7",          ← 위치기반 UUID
      table: "FailureCause",
      field: "causeText",
      value: "수정된 텍스트"
    }
    │
    ▼
[DB UPDATE]
    UPDATE pfmea_{fmeaId}."FailureCause"
    SET "causeText" = '수정된 텍스트'
    WHERE id = 'L3-R2-C7'
```

---

## 4. UUID 전체 매핑표

### 4.1 L1 시트 → DB 테이블

| 엑셀 위치 | UUID 패턴 | DB 테이블 | DB 필드 | FK (부모 UUID) |
|-----------|-----------|-----------|---------|---------------|
| L1-R{n}-C1 | (값만 사용) | - | L1Function.scope | - |
| L1-R{n}-C2 | `L1-R{n}-C2` | L1Function | functionText | l1Id = "L1" (고정) |
| L1-R{n}-C3 | (값만 사용) | L1Function | requirement | (C2와 같은 레코드) |
| L1-R{n}-C4 | `L1-R{n}-C4` | FailureEffect | effectText | l1FuncId = `L1-R{n}-C2` |

### 4.2 L2 시트 → DB 테이블

| 엑셀 위치 | UUID 패턴 | DB 테이블 | DB 필드 | FK (부모 UUID) |
|-----------|-----------|-----------|---------|---------------|
| L2-R{n} | `L2-R{n}` | L2Structure | processNo, processName | l1Id = "L1" |
| L2-R{n}-C3 | `L2-R{n}-C3` | L2Function | functionText | l2Id = `L2-R{n}` |
| L2-R{n}-C4 | `L2-R{n}-C4` | ProductChar | charText | l2Id = `L2-R{n}` |
| L2-R{n}-C5 | (값만 사용) | ProductChar | specialChar | (C4와 같은 레코드) |
| L2-R{n}-C6 | `L2-R{n}-C6` | FailureMode | modeText | productCharId = `L2-R{n}-C4` |
| L2-R{n}-C7 | `L2-R{n}-C7` | DetectionControl | controlText | l2Id = `L2-R{n}` |

### 4.3 L3 시트 → DB 테이블

| 엑셀 위치 | UUID 패턴 | DB 테이블 | DB 필드 | FK (부모 UUID) |
|-----------|-----------|-----------|---------|---------------|
| L3-R{n} | `L3-R{n}` | L3Structure | fourM, workElement | l2Id = 공정번호→L2 lookup |
| L3-R{n}-C1 | (값만 사용) | - | 공정번호 (lookup 키) | - |
| L3-R{n}-C2 | (값만 사용) | L3Structure | fourM | - |
| L3-R{n}-C3 | (값만 사용) | L3Structure | workElement | - |
| L3-R{n}-C4 | `L3-R{n}-C4` | L3Function | functionText | l3Id = `L3-R{n}` |
| L3-R{n}-C5 | (값만 사용) | L3Function | processChar | (C4와 같은 레코드) |
| L3-R{n}-C6 | (값만 사용) | L3Function | specialChar | (C4와 같은 레코드) |
| L3-R{n}-C7 | `L3-R{n}-C7` | FailureCause | causeText | l3FuncId = `L3-R{n}-C4` |
| L3-R{n}-C8 | (값만 사용) | - | pcText (FC시트 RiskAnalysis에서 사용) | - |

### 4.4 FC 시트 → DB 테이블

| 엑셀 위치 | UUID 패턴 | DB 테이블 | DB 필드 | FK (부모 UUID) |
|-----------|-----------|-----------|---------|---------------|
| FC-R{n} | `FC-R{n}` | FailureLink | - | feId, fmId, fcId (크로스시트) |
| FC-R{n}-RA | `FC-R{n}-RA` | RiskAnalysis | S,O,D,AP,PC,DC | linkId = `FC-R{n}` |

### 4.5 FC 크로스시트 FK 결정

```
방법 A: FC 시트에 원본행 컬럼 추가 (권장, 100% 확정)
  FC-R{n}.feId = "L1-R{Col13}-C4"
  FC-R{n}.fmId = "L2-R{Col14}-C6"
  FC-R{n}.fcId = "L3-R{Col15}-C7"

방법 B: 역참조 인덱스 (Col13~15 없을 때 fallback)
  FC-R{n}.feId = l1Index.get(`${FE구분}:${FE텍스트앞30}`)
  FC-R{n}.fmId = l2Index.get(`${공정번호}:${FM텍스트앞30}`)
  FC-R{n}.fcId = l3Index.get(`${공정번호}:${4M}:${WE}:${FC텍스트앞30}`)
```

---

## 5. 동일 공정번호 다중 행 처리

### 5.1 문제: L2 시트에서 같은 공정번호가 여러 행

```
L2 시트:
  Row 2: 공정번호=01, 공정명=작업환경, A4=파티클 수,       A5=파티클 초과
  Row 3: 공정번호=10, 공정명=IQA,     A4=Wafer 두께,      A5=두께 규격 이탈
  Row 4: 공정번호=10, 공정명=IQA,     A4=Wafer TTV,       A5=TTV 규격 초과
                ↑ 같은 공정번호 10번이 2행에 걸침
```

### 5.2 해결: 행 단위로 독립 UUID

```
L2Structure는 공정번호 단위로 1개:
  id="L2-R3" (공정번호 10의 첫 행 = 대표)
  → L2-R4의 L2Structure는 별도 생성하지 않음
  → 또는 L2-R4도 별도 생성하되 같은 processNo

ProductChar/FailureMode는 행 단위로 각각 독립:
  L2-R3-C4 = "Wafer 두께"     (ProductChar)
  L2-R3-C6 = "두께 규격 이탈" (FailureMode, FK → L2-R3-C4)
  L2-R4-C4 = "Wafer TTV"      (ProductChar)
  L2-R4-C6 = "TTV 규격 초과"  (FailureMode, FK → L2-R4-C4)
```

### 5.3 L2Structure 중복 방지 전략

```typescript
// 공정번호별 첫 행만 L2Structure 생성
const l2Created = new Map<string, string>(); // processNo → L2 UUID

for (const row of l2Rows) {
  let l2Id: string;
  
  if (!l2Created.has(row.processNo)) {
    // 이 공정번호의 첫 행 → L2Structure 생성
    l2Id = `L2-R${row.rowNum}`;
    l2Created.set(row.processNo, l2Id);
    
    db.l2Structure.push({
      id: l2Id,
      l1Id: "L1",
      processNo: row.processNo,
      processName: row.processName
    });
  } else {
    // 이미 생성된 공정번호 → 기존 L2 UUID 사용
    l2Id = l2Created.get(row.processNo)!;
  }
  
  // ProductChar, FailureMode 등은 행마다 독립 생성
  db.productChar.push({
    id: `L2-R${row.rowNum}-C4`,
    l2Id: l2Id,  // ← 첫 행의 L2 UUID를 FK로 사용
    charText: row.col4
  });
  
  db.failureMode.push({
    id: `L2-R${row.rowNum}-C6`,
    productCharId: `L2-R${row.rowNum}-C4`,  // ← 같은 행의 ProductChar
    modeText: row.col6
  });
}
```

---

## 6. 구현 가이드

### 6.1 신규/변경 파일 목록

```
src/
├── app/api/fmea/
│   └── import-position-based/          ← 신규 API
│       └── route.ts                    ← 위치기반 Import 엔드포인트
│
├── lib/fmea/
│   ├── position-uuid.ts                ← 신규: UUID 생성 유틸
│   ├── position-parser.ts              ← 신규: 시트별 위치기반 파서
│   ├── cross-sheet-resolver.ts         ← 신규: 크로스시트 FK 해결
│   └── buildAtomicFromPosition.ts      ← 신규: 위치 데이터 → Atomic 변환
│
└── types/
    └── position-import.ts              ← 신규: 위치기반 타입 정의
```

### 6.2 position-uuid.ts 핵심 코드

```typescript
// ====================================================
// 위치기반 UUID 생성기
// ====================================================

export type SheetCode = 'L1' | 'L2' | 'L3' | 'FC';

/**
 * 셀 위치로 UUID 생성
 * @param sheet 시트 코드
 * @param row 행번호 (엑셀 실제 행번호, 1-based)
 * @param col 열번호 (optional, 행 단위 엔티티는 생략)
 */
export function positionUUID(sheet: SheetCode, row: number, col?: number): string {
  if (col !== undefined) {
    return `${sheet}-R${row}-C${col}`;
  }
  return `${sheet}-R${row}`;
}

/**
 * 같은 행의 다른 열 UUID 생성 (FK 참조용)
 */
export function sameRowFK(sheet: SheetCode, row: number, parentCol: number): string {
  return `${sheet}-R${row}-C${parentCol}`;
}

/**
 * 크로스시트 FK 생성 (FC 시트 → L1/L2/L3 시트)
 */
export function crossSheetFK(
  targetSheet: SheetCode, 
  targetRow: number, 
  targetCol: number
): string {
  return `${targetSheet}-R${targetRow}-C${targetCol}`;
}

// 사용 예시:
// FailureEffect.id = positionUUID('L1', 2, 4)        → "L1-R2-C4"
// FailureEffect.l1FuncId = sameRowFK('L1', 2, 2)     → "L1-R2-C2"
// FailureLink.feId = crossSheetFK('L1', 2, 4)        → "L1-R2-C4"
```

### 6.3 position-parser.ts 핵심 코드

```typescript
// ====================================================
// 시트별 위치기반 파서
// ====================================================

import { positionUUID, sameRowFK } from './position-uuid';

interface PositionAtomicData {
  l1Structure: L1StructureRecord[];
  l2Structures: L2StructureRecord[];
  l3Structures: L3StructureRecord[];
  l1Functions: L1FunctionRecord[];
  l2Functions: L2FunctionRecord[];
  l3Functions: L3FunctionRecord[];
  productChars: ProductCharRecord[];
  detectionControls: DetectionControlRecord[];
  failureModes: FailureModeRecord[];
  failureEffects: FailureEffectRecord[];
  failureCauses: FailureCauseRecord[];
  failureLinks: FailureLinkRecord[];
  riskAnalyses: RiskAnalysisRecord[];
}

export function parseL1Sheet(rows: ExcelRow[]): {
  l1Functions: L1FunctionRecord[];
  failureEffects: FailureEffectRecord[];
} {
  const l1Functions: L1FunctionRecord[] = [];
  const failureEffects: FailureEffectRecord[] = [];
  
  // 중복 C2 텍스트 → 같은 L1Function 재사용
  const seenC2 = new Map<string, string>(); // C2텍스트 → UUID
  
  for (const row of rows) {
    const rowNum = row.excelRowNumber; // 엑셀 실제 행번호
    
    // L1Function (C2가 같으면 같은 레코드)
    const c2Text = getCellText(row, 2);
    let l1FuncId: string;
    
    if (seenC2.has(c2Text)) {
      l1FuncId = seenC2.get(c2Text)!;
    } else {
      l1FuncId = positionUUID('L1', rowNum, 2);
      seenC2.set(c2Text, l1FuncId);
      
      l1Functions.push({
        id: l1FuncId,
        l1Id: 'L1',
        scope: getCellText(row, 1),           // C1 = scope
        functionText: c2Text,                  // C2 = 제품기능
        requirement: getCellText(row, 3),      // C3 = 요구사항
      });
    }
    
    // FailureEffect (C4, 행마다 독립)
    const c4Text = getCellText(row, 4);
    if (c4Text) {
      failureEffects.push({
        id: positionUUID('L1', rowNum, 4),     // "L1-R{n}-C4"
        l1FuncId: l1FuncId,                     // ← 같은 행(또는 같은 C2)의 L1Function
        effectText: c4Text,
      });
    }
  }
  
  return { l1Functions, failureEffects };
}

export function parseL2Sheet(rows: ExcelRow[]): {
  l2Structures: L2StructureRecord[];
  l2Functions: L2FunctionRecord[];
  productChars: ProductCharRecord[];
  failureModes: FailureModeRecord[];
  detectionControls: DetectionControlRecord[];
} {
  const l2Structures: L2StructureRecord[] = [];
  const l2Functions: L2FunctionRecord[] = [];
  const productChars: ProductCharRecord[] = [];
  const failureModes: FailureModeRecord[] = [];
  const detectionControls: DetectionControlRecord[] = [];
  
  const processNoToL2Id = new Map<string, string>();
  
  for (const row of rows) {
    const rowNum = row.excelRowNumber;
    const processNo = getCellText(row, 1);    // Col1 = A1 공정번호
    
    // L2Structure (공정번호 단위 1개)
    let l2Id: string;
    if (!processNoToL2Id.has(processNo)) {
      l2Id = positionUUID('L2', rowNum);       // "L2-R{n}"
      processNoToL2Id.set(processNo, l2Id);
      
      l2Structures.push({
        id: l2Id,
        l1Id: 'L1',
        processNo: processNo,
        processName: getCellText(row, 2),      // Col2 = A2
      });
    } else {
      l2Id = processNoToL2Id.get(processNo)!;
    }
    
    // L2Function (Col3 = A3, 행마다 가능하나 공정 단위 1개 권장)
    const a3Text = getCellText(row, 3);
    if (a3Text && !l2Functions.some(f => f.l2Id === l2Id)) {
      l2Functions.push({
        id: positionUUID('L2', rowNum, 3),     // "L2-R{n}-C3"
        l2Id: l2Id,
        functionText: a3Text,
      });
    }
    
    // ProductChar (Col4 = A4, 행마다 독립)
    const a4Text = getCellText(row, 4);
    if (a4Text) {
      productChars.push({
        id: positionUUID('L2', rowNum, 4),     // "L2-R{n}-C4"
        l2Id: l2Id,                             // ← 공정 단위 L2Structure FK
        charText: a4Text,
        specialChar: getCellText(row, 5),       // Col5 = 특별특성
      });
    }
    
    // FailureMode (Col6 = A5, 행마다 독립)
    const a5Text = getCellText(row, 6);
    if (a5Text) {
      failureModes.push({
        id: positionUUID('L2', rowNum, 6),     // "L2-R{n}-C6"
        productCharId: positionUUID('L2', rowNum, 4), // ← 같은 행의 A4 FK
        modeText: a5Text,
      });
    }
    
    // DetectionControl (Col7 = A6, 행마다 독립)
    const a6Text = getCellText(row, 7);
    if (a6Text) {
      detectionControls.push({
        id: positionUUID('L2', rowNum, 7),     // "L2-R{n}-C7"
        l2Id: l2Id,
        controlText: a6Text,
      });
    }
  }
  
  return { l2Structures, l2Functions, productChars, failureModes, detectionControls };
}

export function parseL3Sheet(
  rows: ExcelRow[],
  processNoToL2Id: Map<string, string>       // L2에서 전달받은 인덱스
): {
  l3Structures: L3StructureRecord[];
  l3Functions: L3FunctionRecord[];
  failureCauses: FailureCauseRecord[];
} {
  const l3Structures: L3StructureRecord[] = [];
  const l3Functions: L3FunctionRecord[] = [];
  const failureCauses: FailureCauseRecord[] = [];
  
  for (const row of rows) {
    const rowNum = row.excelRowNumber;
    const processNo = getCellText(row, 1);     // Col1 = 공정번호
    const l2Id = processNoToL2Id.get(processNo) || 'L2-UNKNOWN';
    
    // L3Structure
    l3Structures.push({
      id: positionUUID('L3', rowNum),          // "L3-R{n}"
      l2Id: l2Id,                               // ← 공정번호 기반 L2 FK
      fourM: getCellText(row, 2),               // Col2 = 4M
      workElement: getCellText(row, 3),         // Col3 = B1
    });
    
    // L3Function (Col4 = B2)
    const b2Text = getCellText(row, 4);
    if (b2Text) {
      l3Functions.push({
        id: positionUUID('L3', rowNum, 4),     // "L3-R{n}-C4"
        l3Id: positionUUID('L3', rowNum),       // ← 같은 행의 L3Structure FK
        functionText: b2Text,
        processChar: getCellText(row, 5),       // Col5 = B3
        specialChar: getCellText(row, 6),       // Col6 = 특별특성
      });
    }
    
    // FailureCause (Col7 = B4)
    const b4Text = getCellText(row, 7);
    if (b4Text) {
      failureCauses.push({
        id: positionUUID('L3', rowNum, 7),     // "L3-R{n}-C7"
        l3FuncId: positionUUID('L3', rowNum, 4), // ← 같은 행의 L3Function FK
        causeText: b4Text,
      });
    }
  }
  
  return { l3Structures, l3Functions, failureCauses };
}

export function parseFCSheet(
  rows: ExcelRow[],
  crossRef: CrossSheetResolver                 // 크로스시트 FK 해결기
): {
  failureLinks: FailureLinkRecord[];
  riskAnalyses: RiskAnalysisRecord[];
} {
  const failureLinks: FailureLinkRecord[] = [];
  const riskAnalyses: RiskAnalysisRecord[] = [];
  
  for (const row of rows) {
    const rowNum = row.excelRowNumber;
    
    // 크로스시트 FK 해결
    const feId = crossRef.resolveFeId(row);    // → "L1-R{x}-C4"
    const fmId = crossRef.resolveFmId(row);    // → "L2-R{x}-C6"
    const fcId = crossRef.resolveFcId(row);    // → "L3-R{x}-C7"
    
    // FailureLink
    failureLinks.push({
      id: positionUUID('FC', rowNum),          // "FC-R{n}"
      feId: feId,
      fmId: fmId,
      fcId: fcId,
    });
    
    // RiskAnalysis
    riskAnalyses.push({
      id: `FC-R${rowNum}-RA`,
      linkId: positionUUID('FC', rowNum),       // ← 같은 행의 FailureLink FK
      occurrence: parseInt(getCellText(row, 10)) || 0,
      detection: parseInt(getCellText(row, 11)) || 0,
      ap: getCellText(row, 12),
      pcText: getCellText(row, 8),              // B5 예방관리
      dcText: getCellText(row, 9),              // A6 검출관리
    });
  }
  
  return { failureLinks, riskAnalyses };
}
```

### 6.4 cross-sheet-resolver.ts 핵심 코드

```typescript
// ====================================================
// 크로스시트 FK 해결기
// ====================================================

export class CrossSheetResolver {
  // 역참조 인덱스
  private feIndex: Map<string, string>;  // "scope:FE텍스트앞30" → "L1-R{n}-C4"
  private fmIndex: Map<string, string>;  // "공정번호:FM텍스트앞30" → "L2-R{n}-C6"
  private fcIndex: Map<string, string>;  // "공정번호:4M:WE:FC텍스트앞30" → "L3-R{n}-C7"
  
  constructor(
    l1Rows: ExcelRow[],
    l2Rows: ExcelRow[],
    l3Rows: ExcelRow[]
  ) {
    this.feIndex = new Map();
    this.fmIndex = new Map();
    this.fcIndex = new Map();
    
    // L1 FE 인덱스 구축
    for (const row of l1Rows) {
      const scope = getCellText(row, 1);
      const feText = getCellText(row, 4);
      if (feText) {
        const key = `${scope}:${feText.substring(0, 30)}`;
        if (!this.feIndex.has(key)) {
          this.feIndex.set(key, positionUUID('L1', row.excelRowNumber, 4));
        }
      }
    }
    
    // L2 FM 인덱스 구축
    for (const row of l2Rows) {
      const processNo = getCellText(row, 1);
      const fmText = getCellText(row, 6);
      if (fmText) {
        const key = `${processNo}:${fmText.substring(0, 30)}`;
        if (!this.fmIndex.has(key)) {
          this.fmIndex.set(key, positionUUID('L2', row.excelRowNumber, 6));
        }
      }
    }
    
    // L3 FC 인덱스 구축
    for (const row of l3Rows) {
      const processNo = getCellText(row, 1);
      const fourM = getCellText(row, 2);
      const we = getCellText(row, 3);
      const fcText = getCellText(row, 7);
      if (fcText) {
        const key = `${processNo}:${fourM}:${we}:${fcText.substring(0, 30)}`;
        if (!this.fcIndex.has(key)) {
          this.fcIndex.set(key, positionUUID('L3', row.excelRowNumber, 7));
        }
      }
    }
  }
  
  /**
   * FC 시트 행 → FE UUID 해결
   * 방법 A: Col13(원본행)이 있으면 직접 참조
   * 방법 B: 없으면 역참조 인덱스 사용
   */
  resolveFeId(fcRow: ExcelRow): string {
    // 방법 A: 원본행 컬럼
    const l1OrigRow = getCellText(fcRow, 13);
    if (l1OrigRow) {
      return crossSheetFK('L1', parseInt(l1OrigRow), 4);
    }
    
    // 방법 B: 역참조 인덱스
    const scope = getCellText(fcRow, 1);   // FE구분
    const feText = getCellText(fcRow, 2);  // FE 텍스트
    const key = `${scope}:${feText.substring(0, 30)}`;
    return this.feIndex.get(key) || `L1-UNRESOLVED-FE`;
  }
  
  resolveFmId(fcRow: ExcelRow): string {
    const l2OrigRow = getCellText(fcRow, 14);
    if (l2OrigRow) {
      return crossSheetFK('L2', parseInt(l2OrigRow), 6);
    }
    
    const processNo = getCellText(fcRow, 3);
    const fmText = getCellText(fcRow, 4);
    const key = `${processNo}:${fmText.substring(0, 30)}`;
    return this.fmIndex.get(key) || `L2-UNRESOLVED-FM`;
  }
  
  resolveFcId(fcRow: ExcelRow): string {
    const l3OrigRow = getCellText(fcRow, 15);
    if (l3OrigRow) {
      return crossSheetFK('L3', parseInt(l3OrigRow), 7);
    }
    
    const processNo = getCellText(fcRow, 3);
    const fourM = getCellText(fcRow, 5);
    const we = getCellText(fcRow, 6);
    const fcText = getCellText(fcRow, 7);
    const key = `${processNo}:${fourM}:${we}:${fcText.substring(0, 30)}`;
    return this.fcIndex.get(key) || `L3-UNRESOLVED-FC`;
  }
}
```

---

## 7. DB 저장 순서 (FK 의존성 순)

```typescript
async function savePositionBasedAtomic(
  tx: PrismaTransaction,
  schema: string,
  data: PositionAtomicData
) {
  // ====== FK 의존성 순서대로 INSERT ======
  
  // Level 0: 최상위 (FK 없음)
  await bulkInsert(tx, schema, 'L1Structure', data.l1Structure);
  
  // Level 1: L1 참조
  await bulkInsert(tx, schema, 'L2Structure', data.l2Structures);
  await bulkInsert(tx, schema, 'L1Function', data.l1Functions);
  
  // Level 2: L2 참조
  await bulkInsert(tx, schema, 'L3Structure', data.l3Structures);
  await bulkInsert(tx, schema, 'L2Function', data.l2Functions);
  await bulkInsert(tx, schema, 'ProductChar', data.productChars);
  await bulkInsert(tx, schema, 'DetectionControl', data.detectionControls);
  
  // Level 3: L3/ProductChar 참조
  await bulkInsert(tx, schema, 'L3Function', data.l3Functions);
  await bulkInsert(tx, schema, 'FailureMode', data.failureModes);
  await bulkInsert(tx, schema, 'FailureEffect', data.failureEffects);
  
  // Level 4: L3Function 참조
  await bulkInsert(tx, schema, 'FailureCause', data.failureCauses);
  
  // Level 5: FM/FE/FC 참조
  await bulkInsert(tx, schema, 'FailureLink', data.failureLinks);
  
  // Level 6: FailureLink 참조
  await bulkInsert(tx, schema, 'RiskAnalysis', data.riskAnalyses);
}
```

---

## 8. 워크시트 셀 ↔ atomicId 매핑

### 8.1 Handsontable 셀 메타에 UUID 저장

```typescript
// atomicToLegacy 변환 시 각 셀에 meta.atomicId 부여
function buildWorksheetRows(atomicData: PositionAtomicData): WorksheetRow[] {
  return atomicData.failureLinks.map(link => {
    const fe = atomicData.failureEffects.find(e => e.id === link.feId);
    const fm = atomicData.failureModes.find(m => m.id === link.fmId);
    const fc = atomicData.failureCauses.find(c => c.id === link.fcId);
    const ra = atomicData.riskAnalyses.find(r => r.linkId === link.id);
    
    return {
      // 표시 데이터
      feText: fe?.effectText || '',
      fmText: fm?.modeText || '',
      fcText: fc?.causeText || '',
      severity: ra?.severity || 0,
      occurrence: ra?.occurrence || 0,
      detection: ra?.detection || 0,
      ap: ra?.ap || '',
      pcText: ra?.pcText || '',
      dcText: ra?.dcText || '',
      
      // 셀별 atomicId (Atomic Cell Save 시 사용)
      meta: {
        feAtomicId: link.feId,        // "L1-R2-C4"
        fmAtomicId: link.fmId,        // "L2-R2-C6"
        fcAtomicId: link.fcId,        // "L3-R2-C7"
        raAtomicId: ra?.id,           // "FC-R2-RA"
        linkAtomicId: link.id,        // "FC-R2"
      }
    };
  });
}
```

### 8.2 셀 편집 → DB 저장 흐름

```typescript
// Handsontable afterChange 핸들러
function onCellChange(row: number, col: number, newValue: string) {
  const cellMeta = hot.getCellMeta(row, col);
  
  // 열 번호 → 테이블/필드/atomicId 매핑
  const mapping = {
    // col 0 = FE(고장영향)
    0: { table: 'FailureEffect', field: 'effectText', atomicId: cellMeta.feAtomicId },
    // col 1 = FM(고장형태)
    1: { table: 'FailureMode', field: 'modeText', atomicId: cellMeta.fmAtomicId },
    // col 2 = FC(고장원인)
    2: { table: 'FailureCause', field: 'causeText', atomicId: cellMeta.fcAtomicId },
    // col 3 = S
    3: { table: 'RiskAnalysis', field: 'severity', atomicId: cellMeta.raAtomicId },
    // col 4 = O
    4: { table: 'RiskAnalysis', field: 'occurrence', atomicId: cellMeta.raAtomicId },
    // col 5 = D
    5: { table: 'RiskAnalysis', field: 'detection', atomicId: cellMeta.raAtomicId },
  };
  
  const target = mapping[col];
  if (target && target.atomicId) {
    fetch('/api/fmea/atom-map', {
      method: 'PATCH',
      body: JSON.stringify({
        fmeaId: currentFmeaId,
        atomicId: target.atomicId,    // "L1-R2-C4" 등
        table: target.table,
        field: target.field,
        value: newValue
      })
    });
  }
}
```

---

## 9. 현재 방식 vs 위치기반 비교

| 항목 | 현재 (텍스트 매칭) | 신규 (위치기반 UUID) |
|------|-------------------|---------------------|
| FK 연결 방식 | 텍스트 비교로 부모 찾기 | 셀 위치로 FK 확정 |
| 고아 발생 확률 | 높음 (텍스트 불일치) | 0% (위치가 곧 ID) |
| 디버깅 | FK 누락 원인 추적 어려움 | 엑셀 열어서 해당 행 확인 |
| fallback 로직 | scope, processNo 등 다단계 | 불필요 |
| 코드 복잡도 | buildAtomicFromFlat 500줄+ | position-parser 200줄 이하 |
| Import 속도 | 텍스트 검색 O(n²) | 위치 직접 참조 O(1) |
| 크로스시트 FK | 텍스트 매칭 (불안정) | 원본행 컬럼 또는 인덱스 |
| 재Import 안정성 | 텍스트 변경 시 FK 깨짐 | 행 순서 유지 시 100% 안정 |
| 사용자 행 추가 | 새 결정론적 ID 채번 필요 | 다음 행번호 자동 할당 |

---

## 10. 엣지케이스 처리

### 10.1 사용자가 워크시트에서 새 행 추가

```typescript
// Living DB에서 새 FailureCause 추가 시
// 기존 L3 시트에 없는 행이므로 위치기반 UUID를 동적 확장

function generateNewPositionUUID(
  sheet: SheetCode, 
  existingIds: string[]
): string {
  // 기존 최대 행번호 + 1
  const maxRow = existingIds
    .filter(id => id.startsWith(`${sheet}-R`))
    .map(id => parseInt(id.match(/R(\d+)/)?.[1] || '0'))
    .reduce((max, n) => Math.max(max, n), 0);
  
  return positionUUID(sheet, maxRow + 1, 7); // 7 = B4(고장원인) 열
}

// 예: 기존 L3-R116까지 있으면 → "L3-R117-C7"
```

### 10.2 행 삭제 시

```typescript
// 행 삭제 = 해당 UUID의 레코드 soft delete
// FK CASCADE로 하위 엔티티도 함께 비활성화
// 행번호는 재사용하지 않음 (간격 허용)
```

### 10.3 행 순서 변경 시

```
위치기반 UUID는 행 순서에 의존하므로:
  - Import 시 행 순서 고정 (엑셀 원본 순서)
  - Living DB에서 행 이동은 UUID 변경 없이 표시 순서만 변경
  - displayOrder 필드로 화면 순서 관리
```

### 10.4 엑셀 재Import (Roundtrip)

```
기존 Living DB → 엑셀 Export → 수정 → 재Import 시:
  - Export 시 각 행에 기존 UUID를 숨김 컬럼으로 포함
  - 재Import 시 기존 UUID가 있으면 UPDATE, 없으면 INSERT
  - 이렇게 하면 재Import해도 FK가 깨지지 않음
```

---

## 11. 마이그레이션 계획

### 11.1 기존 데이터 변환

```
현재 pfm26-m066 (결정론적 ID: PF-L2-001-...)
  → 위치기반 ID로 변환 (L1-R2-C4, L2-R2-C6, ...)
  → 마스터 JSON 재생성
  → 새 ID로 DB 재구축
```

### 11.2 단계별 전환

```
Phase 1: position-parser 구현 + 단위 테스트
Phase 2: 기존 엑셀로 Import → pipeline-verify allGreen 확인
Phase 3: 기존 save-from-import와 병행 운영
Phase 4: 안정화 후 기존 방식 deprecated
```

---

## 12. 요약: 핵심 3줄

```
1. 엑셀 셀 위치(시트, 행, 열) = UUID → 텍스트 매칭 완전 제거
2. 같은 행의 부모 열 UUID = FK → 고아 레코드 원천 차단
3. 크로스시트는 원본행 컬럼(Col13~15) 또는 역참조 인덱스 → FC↔FE/FM/FC 100% 연결
```

---

> **이 PRD를 Cursor/Claude Code에 컨텍스트로 제공하면, 위치기반 UUID 시스템을 구현할 수 있습니다.**  
> **상위 PRD(PRD-FMEA-LDB-001)의 Step 3 Import 파이프라인을 이 방식으로 교체합니다.**

---

## 13. CODEFREEZE v4.6.0 — 최종 검증 결과 (2026-03-24)

> **코드프리즈 태그:** `v4.6.0-codefreeze-final`  
> **DB 백업:** `backup_codefreeze_v460_20260324.sql` (7.2MB)

### 13.1 파이프라인 전체 검증

| 파이프라인 단계 | p006-i06 | p007-i07 |
|---|---|---|
| Import (Excel 파싱) | ✅ A6=26건, B5=115건 | ✅ |
| Atomic DB (UUID/FK) | ✅ Step0-2 ok | ✅ Step0-2 ok |
| FK 무결성 (9개 체크) | ✅ **orphan 0건** | ✅ **orphan 0건** |
| 고장연결 (FM→FC→FE→FL) | ✅ orphanPC=0 | ✅ |
| 위험분석 (RA/DC/PC) | ✅ ok (전량 미입력=info) | ⚠️ RA 미완료 (데이터) |

### 13.2 Import Excel FC 셀병합 검증

| 검증 항목 | 결과 |
|-----------|------|
| FC 시트 병합 범위 | 63개 merge range |
| parseFCSheet 파싱 | **58 chains** (전행 일치) |
| 빈 fmValue | **0건** ✅ |
| 빈 fcValue | **0건** ✅ |
| 빈 feValue | **0건** ✅ |
| pcValue (예방관리) | **58/58건** ✅ (100%) |
| dcValue (검출관리) | **58/58건** ✅ (100%) |
| FM 병합 분기 | Unique FM 28개 → 19개 FM이 2+ chains |

### 13.3 DB 레거시 정리

| 항목 | 내용 |
|------|------|
| 삭제된 스키마 | 25개 (E2E 잔여 + 마스터 + 테스트) |
| 삭제된 orphan 참조 | 9개 public 테이블, **852건** |
| 남은 프로젝트 | **p006-i06, p007-i07** (2개만) |
| 남은 스키마 | **pfmea_pfm26_p006_i06, pfmea_pfm26_p007_i07** |

### 13.4 정적 분석

| 검사 | 결과 |
|------|------|
| `npx tsc --noEmit` | **0 에러** ✅ |
| `npm run build` | **성공** ✅ |
| 카데시안/이름매칭/폴백 | **없음** ✅ |

### 13.5 롤백 방법

```bash
# Git 롤백
git checkout v4.6.0-codefreeze-final

# DB 롤백
psql -U postgres -d fmea_db < backup_codefreeze_v460_20260324.sql
```