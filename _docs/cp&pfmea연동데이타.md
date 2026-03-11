# CP ↔ PFMEA 연동 데이터 매트릭스

> **버전**: 1.0 (2026-01-30)  
> **목적**: CP와 PFMEA 간 구조연동, 데이터동기화 시 연동되는 데이터 정의

---

## 📋 연동 방향

```
┌─────────────────────────────────────────────────────────────┐
│                        PFMEA                                │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐     │
│  │   L1    │ → │   L2    │ → │   L3    │ → │ L3Func  │     │
│  │ (1L기능)│   │ (2L기능)│   │ (3L기능)│   │ (원인)  │     │
│  └────┬────┘   └────┬────┘   └────┬────┘   └────┬────┘     │
│       │             │             │             │           │
│       └─────────────┼─────────────┼─────────────┘           │
│                     │구조분석     │                          │
│                     ▼                                       │
│            ┌────────────────┐                               │
│            │   FailureMode  │ → FailureLink → RiskAnalysis │
│            │   (고장모드)    │     (원인연결)   (S/O/D/AP)   │
│            └────────────────┘                               │
└─────────────────────────────────────────────────────────────┘
                      │
                      │ 🔗 구조연동 (FMEA → CP)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                          CP                                 │
│            ┌────────────────────────────────────┐           │
│            │       ControlPlanItem              │           │
│            │  (각 특성별 원자적 행)              │           │
│            └────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. 구조연동 (FMEA → CP) 필드 매핑

| CP 필드 | PFMEA 출처 | 상세 설명 |
|---------|------------|-----------|
| **processNo** | L2Structure.no | 공정번호 |
| **processName** | L2Structure.name | 공정명 |
| **processDesc** | L2Function.functionName | 공정설명 (L2 메인공정 기능명, 복수시 콤마구분) |
| **workElement** | L3Structure (4M 제외 MN) | 작업요소 ([4M] 이름 형식, MC/IM/EN만 포함) |
| **equipment** | L3Structure (4M 제외 MN) | 설비/금형/지그 (MN 제외, 나머지 모두 포함) |
| **productChar** | L2Function.productChar | 제품특성 (각각 별도 행) |
| **processChar** | L3Function.processChar | 공정특성 (각각 별도 행, MN 제외) |
| **specialChar** | L2Function/L3Function | 특별특성 (CC/SC) |
| **refSeverity** | RiskAnalysis.severity | 심각도(S) - 참조용, FMEA에서 최대값 |
| **refOccurrence** | RiskAnalysis.occurrence | 발생도(O) - 참조용, FMEA에서 최대값 |
| **refDetection** | RiskAnalysis.detection | 검출도(D) - 참조용, FMEA에서 최대값 |
| **refAp** | RiskAnalysis.ap | 조치우선순위(AP) - 참조용, H>M>L 순서 최고값 |
| **pfmeaRowUid** | L2Structure.id | PFMEA 공정 연결 ID |
| **pfmeaProcessId** | L2Structure.id | PFMEA 공정 ID |
| **charIndex** | 자동생성 | 특성 인덱스 (원자성 구분용) |

---

## 2. PFMEA 구조 레벨 설명

### 2.1 구조분석 (L1 → L2 → L3)

| 레벨 | PFMEA 구조 | 설명 | CP 연동 |
|------|------------|------|---------|
| **L1 (1L기능)** | L1Structure | 전체 공정 (예: "프레임 ASSY") | 연동 안 함 |
| **L2 (2L기능)** | L2Structure | 메인 공정 (예: "용접", "가공") | ● 공정번호, 공정명 연동 |
| **L3 (3L기능)** | L3Structure | 세부 요소 (설비/금형/작업자) | ● 설비, 작업요소 연동 |
| **L2 형태** | L2Function | 제품특성, 메인기능 | ● 제품특성, 공정설명 연동 |
| **L3 원인** | L3Function | 공정특성, 원인 | ● 공정특성 연동 |

### 2.2 고장분석 (FailureMode → RiskAnalysis)

| 레벨 | PFMEA 구조 | 설명 | CP 연동 |
|------|------------|------|---------|
| **FailureMode** | FailureMode | L2 기준 고장모드 | 참조 연결 |
| **FailureLink** | FailureLink | 원인 연결 | 내부 사용 |
| **RiskAnalysis** | RiskAnalysis | S/O/D/AP 분석 | ● S/O/D/AP 참조 연동 |

---

## 3. 4M 분류 및 처리

### 3.1 4M 정규화 값

| 표준값 | 의미 | CP 연동 |
|--------|------|---------|
| **MN** | Man (작업자) | ❌ 설비/작업요소에서 제외 |
| **MC** | Machine (설비) | ● 설비/작업요소에 포함 |
| **IM** | In-Material (부자재) | ● 설비/작업요소에 포함 |
| **EN** | Environment (환경) | ● 설비/작업요소에 포함 |

### 3.2 4M 처리 로직

```typescript
// L3 요소의 4M 분류에 따른 처리
if (l3.m4 === 'MN') {
  // 작업자 → 설비/작업요소 연동에서 제외
  // 공정특성도 제외
} else {
  // MC, IM, EN, 빈값 → 설비/작업요소에 포함
  // 공정특성 연동
}
```

---

## 4. 원자성 데이터 구조

### 4.1 원자성 원칙

한 CP 행에는 **하나의 특성**만 저장됩니다:

| 상황 | CP 행 생성 |
|------|------------|
| 제품특성 2개, 공정특성 3개 | 5행 생성 (각 특성별 1행) |
| 제품특성 0개, 공정특성 0개 | 1행 생성 (빈 행) |

### 4.2 charIndex 사용

```
L2(공정): "용접"
├── productChar: "파이프 두께" → charIndex: 0
├── productChar: "용접 강도"   → charIndex: 1
├── processChar: "용접 온도"   → charIndex: 2
└── processChar: "용접 시간"   → charIndex: 3
```

---

## 5. API 엔드포인트

### 5.1 구조연동 API

```
POST /api/sync/structure
{
  "direction": "fmea-to-cp",  // FMEA → CP
  "sourceId": "pfm26-p001-l01",
  "targetId": "cp26-p001-l01",
  "options": {
    "overwrite": true  // 기존 CP 항목 삭제 후 재생성
  }
}
```

### 5.2 데이터동기화 API

```
POST /api/sync/data
{
  "fmeaId": "pfm26-p001-l01",
  "cpNo": "cp26-p001-l01",
  "conflictPolicy": "fmea-wins"  // 충돌 시 FMEA 우선
}
```

### 5.3 동기화 방향

| 방향 | direction 값 | 용도 |
|------|--------------|------|
| FMEA → CP | `fmea-to-cp` | FMEA 구조로 CP 생성 |
| CP → FMEA | `cp-to-fmea` | CP 구조로 FMEA 업데이트 |
| PFD → FMEA | `pfd-to-fmea` | PFD 구조로 FMEA 생성 |
| FMEA → PFD | `fmea-to-pfd` | FMEA 구조로 PFD 업데이트 |
| PFD → CP | `pfd-to-cp` | PFD 구조로 CP 생성 |
| CP → PFD | `cp-to-pfd` | CP 구조로 PFD 업데이트 |

---

## 6. 데이터 흐름 예시

### 6.1 FMEA → CP 구조연동 시나리오

```
[PFMEA 데이터]
L2Structure:
  - no: "010", name: "용접"
  - L2Functions: [{ functionName: "프레임 용접", productChar: "파이프 두께", specialChar: "CC" }]
  - L3Structures:
    - { name: "용접기", m4: "MC", L3Functions: [{ processChar: "용접 온도" }] }
    - { name: "작업자", m4: "MN" }  ← 제외됨
  - FailureModes → RiskAnalyses: [{ severity: 7, occurrence: 4, detection: 3, ap: "M" }]

[생성되는 CP 데이터]
Row 1:
  processNo: "010"
  processName: "용접"
  processDesc: "프레임 용접"
  workElement: "[MC] 용접기"
  equipment: "용접기"
  productChar: "파이프 두께"  ← 원자성: 한 행에 하나
  processChar: ""
  specialChar: "CC"
  refSeverity: 7, refOccurrence: 4, refDetection: 3, refAp: "M"
  charIndex: 0

Row 2:
  processNo: "010"
  processName: "용접"
  processDesc: "프레임 용접"
  workElement: "[MC] 용접기"
  equipment: "용접기"
  productChar: ""
  processChar: "용접 온도"  ← 원자성: 한 행에 하나
  specialChar: ""
  refSeverity: 7, refOccurrence: 4, refDetection: 3, refAp: "M"
  charIndex: 1
```

---

## 7. 현재 렌더링 범위

### 7.1 CP에서 FMEA 연동 버튼 클릭 시

| 연동 범위 | 포함 여부 |
|-----------|----------|
| **L1 (1L기능)** | ❌ 미포함 |
| **L2 (2L기능)** | ✅ 포함 (공정번호, 공정명) |
| **L2 형태 (제품특성)** | ✅ 포함 (productChar, functionName) |
| **L3 (3L기능)** | ✅ 포함 (설비, 작업요소, 4M 제외 MN) |
| **L3 원인 (공정특성)** | ✅ 포함 (processChar, 4M 제외 MN) |
| **고장모드** | △ 참조만 (S/O/D/AP) |
| **리스크분석** | ✅ 포함 (refSeverity, refOccurrence, refDetection, refAp) |

---

## 변경 이력

| 날짜 | 버전 | 내용 |
|------|------|------|
| **2026-01-30** | **1.0** | **초기 문서 작성** |

---

**작성자**: AI Assistant  
**참조**: [스마트시스템데이타연계성 매트릭스.md](file:///C:/01_new_sdd/fmea-onpremise/docs/스마트시스템데이타연계성%20매트릭스.md)
