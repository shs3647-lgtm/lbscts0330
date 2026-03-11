# CP/PFD 원자성 DB 저장 규칙 설계서

## 📋 개요
Excel Import → 원자성 DB 저장 → 화면 렌더링의 완벽한 데이터 흐름 정의

**핵심 원칙: 컬럼명 = DB필드명 = 코드 key = 100% 일치**

---

## 1️⃣ CP (Control Plan) 컬럼 매핑

| Excel열 | UI 컬럼명 | DB 필드 | 코드 key | 병합 |
|---------|-----------|---------|----------|------|
| A (1) | 공정번호 | processNo | processNo | ✅ |
| B (2) | 공정명 | processName | processName | ✅ |
| C (3) | 레벨 | processLevel | processLevel | ✅ |
| D (4) | 공정설명 | processDesc | processDesc | ✅ |
| E (5) | 부품명 | partName | partName | ✅ |
| F (6) | 설비/금형/JIG | **equipment** | **equipment** | ✅ |
| G (7) | EP | detectorEp | detectorEp | ❌ |
| H (8) | 자동 | detectorAuto | detectorAuto | ❌ |
| I (9) | NO | charNo | charNo | ❌ |
| J (10) | 제품특성 | productChar | productChar | ✅ |
| K (11) | 공정특성 | processChar | processChar | ❌ |
| L (12) | 특별특성 | specialChar | specialChar | ❌ |
| M (13) | 스펙/공차 | specTolerance | specTolerance | ❌ |
| N (14) | 평가방법 | evalMethod | evalMethod | ❌ |
| O (15) | 샘플크기 | sampleSize | sampleSize | ❌ |
| P (16) | 주기 | sampleFreq | sampleFreq | ❌ |
| Q (17) | 관리방법 | controlMethod | controlMethod | ❌ |
| R (18) | 책임1 | owner1 | owner1 | ❌ |
| S (19) | 책임2 | owner2 | owner2 | ❌ |
| T (20) | 조치방법 | reactionPlan | reactionPlan | ❌ |

## 2️⃣ PFD (Process Flow Diagram) 컬럼 매핑

| Excel열 | UI 컬럼명 | DB 필드 | 코드 key | 병합 |
|---------|-----------|---------|----------|------|
| A (1) | 공정번호 | processNo | processNo | ✅ |
| B (2) | 공정명 | processName | processName | ✅ |
| C (3) | 레벨 | processLevel | processLevel | ✅ |
| D (4) | 공정설명 | processDesc | processDesc | ✅ |
| E (5) | 부품명 | partName | partName | ✅ |
| F (6) | 설비/금형/치그 | **equipment** | **equipment** | ✅ |
| G (7) | 제품SC | productSC | productSC | ❌ |
| H (8) | 제품특성 | productChar | productChar | ❌ |
| I (9) | 공정SC | processSC | processSC | ❌ |
| J (10) | 공정특성 | processChar | processChar | ❌ |

---

## 2️⃣ 원자성 저장 규칙

### 기본 원칙
```
Excel 1행 = DB 1레코드 (병합 셀도 펼쳐서 개별 저장)
```

### 병합 컬럼 처리
1. **상속 컬럼** (이전 행 값 상속):
   - CP/PFD 공통: `processNo, processName, processLevel, processDesc, partName, equipment`

2. **비상속 컬럼** (개별 값 유지):
   - 특성 관련: `productChar, processChar, specialChar`
   - 관리 관련: `specTolerance, evalMethod, sampleSize` 등

### 파싱 로직 (3단계)
```
1차. Excel 셀 값 직접 읽기
    ↓
2차. 병합 영역이면 → 병합의 첫 번째 셀 값 사용
    ↓
3차. 상속 컬럼이면 → 이전 행 값 상속
```

---

## 3️⃣ 화면 렌더링 규칙

### rowSpan 동적 계산
화면에서는 DB의 원자성 데이터를 읽어 **동적으로 rowSpan 계산**

| 훅 | 기준 | 적용 컬럼 |
|----|------|----------|
| useProcessRowSpan | 연속된 같은 processNo+processName | 공정번호, 공정명 |
| useDescRowSpan | 연속된 같은 processNo+processName+processLevel+processDesc | 레벨, 공정설명 |
| usePartNameRowSpan | 연속된 같은 partName 값 | 부품명 |
| useWorkRowSpan | 연속된 같은 equipment 값 | 설비/금형 |
| useCharRowSpan | 연속된 같은 productChar 값 | 제품특성 |

---

## 4️⃣ 모자관계 (Parent-Child) 규칙

### 핵심 구조
```
공정(processNo+processName)
  └─ 부품명(partName) ─────→ 제품특성(productChar)
  └─ 설비(equipment) ───────→ 공정특성(processChar)
```

### 모자관계 정의

| 부모 (Parent) | 자식 (Child) | 예시 |
|---------------|--------------|------|
| **부품명** (partName) | 제품특성 (productChar) | 스틸파이프 → 외경, 두께 |
| **설비** (equipment) | 공정특성 (processChar) | UNCOILING → RPM, 교환주기, 톱날흔들림 |

### DB 저장 시 모자관계 보장

각 행에 부모 정보가 함께 저장되어야 함:

```
행1: partName=스틸파이프, productChar=외경
행2: partName=스틸파이프, productChar=두께
행3: equipment=UNCOILING, processChar=RPM
행4: equipment=UNCOILING, processChar=교환주기
```

### 렌더링 규칙

| 특성 유형 | 부모 컬럼 | 자식 컬럼 | 색상 그룹 |
|----------|----------|----------|----------|
| **제품특성** | partName (부품명) | productChar | 파란색 계열 |
| **공정특성** | equipment (설비) | processChar | 녹색 계열 |

---

## 4️⃣ 문서 간 연계성

### CP ↔ PFD ↔ PFMEA 연동 필드

| 필드 | CP | PFD | PFMEA | 연동 방향 |
|------|-----|-----|-------|----------|
| processNo | ✅ | ✅ | ✅ | 양방향 |
| processName | ✅ | ✅ | ✅ | 양방향 |
| processDesc | ✅ | ✅ | ✅ | 양방향 |
| partName | ✅ | ✅ | ❌ | CP ↔ PFD |
| workElement | ✅ | ❌ | ✅ | CP ↔ PFMEA |
| equipment | ❌ | ✅ | ❌ | PFD 전용 |
| productChar | ✅ | ✅ | ✅ | 양방향 |
| processChar | ✅ | ✅ | ✅ | 양방향 |
| specialChar | ✅ | ✅ | ✅ | 양방향 |

### 연동 키 필드

```prisma
// CP → PFMEA 연결
ControlPlanItem {
  pfmeaRowUid     String?  // PFMEA 행 UID
  pfmeaProcessId  String?  // PFMEA L2 공정 ID
  pfmeaWorkElemId String?  // PFMEA L3 작업요소 ID
}

// PFD → PFMEA/CP 연결
PfdItem {
  fmeaL2Id String?  // FMEA L2 ID
  fmeaL3Id String?  // FMEA L3 ID
  cpItemId String?  // CP Item ID
}
```

---

## 5️⃣ 필드 용도 명확화 (FMEA 4M+1E 기준)

### FMEA 작업요소 (workElement) = 4M+1E 분류

| 분류코드 | 영문 | 한글 | 내용 |
|---------|------|------|------|
| **MC** | Machine | 설비 | 설비, 금형, 지그 |
| **IM** | Indirect Material | 부자재 | 간접자재 |
| **MN** | Man | 작업자 | 사람, 작업방법 |
| **EN** | Environment | 환경 | 작업환경 |

### CP와 PFD의 필드 용도 (통일됨)

| 문서 | UI 컬럼명 | DB 필드 | 용도 |
|------|----------|---------|------|
| **CP** | 설비/금형/JIG | `equipment` | 설비 표시 + 공정특성 부모 |
| **PFD** | 설비/금형/치그 | `equipment` | 설비 표시 + 공정특성 부모 |
| **FMEA** | 작업요소 | `workElement` | 4M+1E (MC/IM/MN/EN) |

### ✅ 결론

- **CP/PFD의 equipment**: 설비/금형/지그 저장 → 공정특성의 부모
- **FMEA의 workElement**: 4M+1E 작업요소 저장 → FMEA 전용

### 공통 필드 (CP ↔ PFD 연동)

| 필드 | CP | PFD | 연동 |
|------|-----|-----|------|
| processNo | ✅ | ✅ | ✅ 양방향 |
| processName | ✅ | ✅ | ✅ 양방향 |
| processLevel | ✅ | ✅ | ✅ 양방향 |
| processDesc | ✅ | ✅ | ✅ 양방향 |
| **partName** | ✅ | ✅ | ✅ 양방향 |
| productChar | ✅ | ✅ | ✅ 양방향 |
| processChar | ✅ | ✅ | ✅ 양방향 |
| specialChar | ✅ | ✅ | ✅ 양방향 |

---

## 6️⃣ 구현 체크리스트

### Excel Parser
- [x] CP: worksheet-excel-parser.ts - 상속 로직 포함
- [x] PFD: excel-import.ts - 상속 로직 추가 완료

### DB Schema
- [x] ControlPlanItem: partName 필드 존재
- [x] PfdItem: partName 필드 추가 완료

### API
- [x] CP API: partName 저장 로직 존재
- [x] PFD API: partName 저장 로직 추가 완료

### 타입 정의
- [x] CP types: partName 포함
- [x] PFD types: partName 추가 완료

### 상수 (컬럼 key)
- [x] CP_COLUMNS: partName key 사용
- [x] PFD_COLUMNS: partName key 사용 (수정 완료)

---

## 📅 변경 이력
- 2026-01-31: 초안 작성 - CP/PFD 원자성 저장 규칙 통일
