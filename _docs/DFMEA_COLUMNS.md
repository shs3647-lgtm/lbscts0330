# DFMEA 35열 컬럼 표준 정의서

> **문서 버전**: 1.0.0  
> **작성일**: 2026-01-20  
> **목적**: DFMEA 워크시트 개발을 위한 컬럼명 표준화

---

## 📋 DFMEA vs PFMEA 핵심 차이점

| 구분 | PFMEA (공정) | DFMEA (설계) |
|------|-------------|-------------|
| L1 | 완제품 공정명 | **다음상위수준** (제품명) |
| L2 | NO+공정명 | **초점요소** (A'SSY) |
| L2 속성 | 4M (Man/Machine/Material/Method) | **타입** (Main/Sub/Unit/Part) |
| L3 | 작업요소 | **다음하위수준** (부품 또는 특성) |
| 고장원인 | 작업요소 기준 FC | 설계 특성 기준 FC |

---

## 🏗️ 2단계: 구조분석 (Structure Analysis) - 4열

| No | 컬럼명 (한글) | 컬럼명 (영문) | 설명 | 비고 |
|----|-------------|-------------|------|------|
| 1 | **다음상위수준** | Next Higher Level | 제품명/시스템명 | L1 |
| 2 | **초점요소** | Focus Element | A'SSY (Assembly) | L2 |
| 3 | **타입** | Type | Main/Sub/Unit/Part | L2 속성 |
| 4 | **다음하위수준** | Next Lower Level | 부품 또는 특성 | L3 |

### 타입 옵션 (DFMEA 전용 - PFMEA 4M 대체)
- `부품`: 개별 부품
- `A'ssy`: 어셈블리 (조립품)
- `I/F`: Interface (인터페이스)

> ⚠️ **PFMEA와 다름**: PFMEA는 4M (Man/Machine/Material/Method)

---

## ⚙️ 3단계: 기능분석 (Function Analysis) - 7열

| No | 컬럼명 (한글) | 컬럼명 (영문) | 설명 | 비고 |
|----|-------------|-------------|------|------|
| 5 | **분류** | Category | Your Plant / Ship to Plant / User | 고장영향 범위 |
| 6 | **다음상위수준 기능** | Next Higher Level Function | 제품/시스템 기능 | L1 기능 |
| 7 | **요구사항** | Requirement | L1 요구사항 | |
| 8 | **초점요소 기능** | Focus Element Function | A'SSY 기능 | L2 기능 |
| 9 | **요구사항** | Requirement | L2 요구사항 | |
| 10 | **다음하위수준 기능** | Next Lower Level Function | 부품 기능 또는 특성 | L3 기능 |
| 11 | **요구사항** | Requirement | L3 요구사항 | |

### 분류 옵션 (DFMEA 전용)
- `법규`: 법규/규제 관련 요구사항
- `기본`: 기본 기능 요구사항
- `보조`: 보조 기능
- `관능`: 관능적 요구사항 (외관, 촉감 등)

> ⚠️ **PFMEA와 다름**: PFMEA는 Your Plant / Ship to Plant / User

---

## ❌ 4단계: 고장분석 (Failure Analysis) - 4열

| No | 컬럼명 (한글) | 컬럼명 (영문) | 약어 | 설명 |
|----|-------------|-------------|------|------|
| 12 | **고장영향** | Failure Effect | FE | 고장으로 인한 영향 |
| 13 | **심각도** | Severity | S | 1-10 점수 |
| 14 | **고장형태** | Failure Mode | FM | 고장이 나타나는 형태 |
| 15 | **고장원인** | Failure Cause | FC | 고장의 근본 원인 |

### DFMEA 고장분석 특징
- PFMEA와 달리 **4M 분류 없음** (설계 관점이므로)
- FC는 설계 특성 관점에서 분석

---

## 📊 5단계: 리스크분석 (Risk Analysis) - 7열

| No | 컬럼명 (한글) | 컬럼명 (영문) | 약어 | 설명 |
|----|-------------|-------------|------|------|
| 16 | **현재 예방관리** | Current Prevention Control | PC | 예방 조치 |
| 17 | **발생도** | Occurrence | O | 1-10 점수 |
| 18 | **현재 검출관리** | Current Detection Control | DC | 검출 조치 |
| 19 | **검출도** | Detection | D | 1-10 점수 |
| 20 | **AP** | Action Priority | AP | H/M/L |
| 21 | **특별특성** | Special Characteristic | SC | CC/SC/HC 등 |
| 22 | **습득교훈** | Lessons Learned | - | 기존 경험 참조 |

### AP (Action Priority) 계산
- **H (High)**: 즉시 조치 필요
- **M (Medium)**: 계획적 조치 필요
- **L (Low)**: 현재 수준 유지

### 특별특성 옵션
- `CC`: Critical Characteristic (중요 특성) - 안전/법규
- `SC`: Significant Characteristic (중점 특성) - 기능/성능
- `HC`: High Control (중점 관리)
- `FFF`: Fit, Form, Function
- `HI`: High Impact
- `-`: 없음

---

## ✅ 6단계: 최적화 (Optimization) - 13열

| No | 컬럼명 (한글) | 컬럼명 (영문) | 설명 |
|----|-------------|-------------|------|
| 23 | **설계 예방 조치** | Design Prevention Action | 예방 개선 조치 |
| 24 | **설계 검출 조치** | Design Detection Action | 검출 개선 조치 |
| 25 | **책임자** | Responsible | 담당자 성명 |
| 26 | **목표 완료일** | Target Completion Date | 목표 일자 |
| 27 | **상태** | Status | Open/In Progress/Complete |
| 28 | **조치 완료 근거** | Evidence of Action | 보고서 이름/근거 |
| 29 | **완료일** | Completion Date | 실제 완료일 |
| 30 | **심각도(후)** | Severity (After) | 개선 후 S |
| 31 | **발생도(후)** | Occurrence (After) | 개선 후 O |
| 32 | **검출도(후)** | Detection (After) | 개선 후 D |
| 33 | **특별특성(후)** | S/C (After) | 개선 후 SC |
| 34 | **AP(후)** | AP (After) | 개선 후 AP |
| 35 | **비고** | Remarks | 추가 메모 |

---

## 🎨 UI 컬럼 색상 표준

| 단계 | 헤더 색상 | 데이터 배경 |
|------|----------|------------|
| 구조분석 | `#1976d2` (파랑) | `#e3f2fd` (연파랑) |
| 기능분석 | `#388e3c` (녹색) | `#e8f5e9` (연녹색) |
| 고장분석 | `#d32f2f` (빨강) | `#ffebee` (연빨강) |
| 리스크분석 | `#f57c00` (주황) | `#fff3e0` (연주황) |
| 최적화 | `#7b1fa2` (보라) | `#f3e5f5` (연보라) |

---

## 📁 파일별 적용 사항

### `terminology.ts` 수정 필요
```typescript
export const DFMEA_COLUMN_STANDARD = {
  // 2단계 구조분석
  structure: {
    l1Name: '다음상위수준',        // Next Higher Level
    l2Name: '초점요소',            // Focus Element (A'SSY)
    l2Type: '타입',                // Type
    l3Name: '다음하위수준',        // Next Lower Level (부품/특성)
  },
  
  // 3단계 기능분석
  function: {
    category: '분류',
    l1Function: '다음상위수준 기능',
    l1Requirement: '요구사항',
    l2Function: '초점요소 기능',
    l2Requirement: '요구사항',
    l3Function: '다음하위수준 기능',
    l3Requirement: '요구사항',
  },
  
  // 4단계 고장분석
  failure: {
    failureEffect: '고장영향(FE)',
    severity: '심각도(S)',
    failureMode: '고장형태(FM)',
    failureCause: '고장원인(FC)',
  },
  
  // 5단계 리스크분석
  risk: {
    prevention: '현재 예방관리(PC)',
    occurrence: '발생도(O)',
    detection: '현재 검출관리(DC)',
    detectability: '검출도(D)',
    ap: 'AP',
    specialChar: '특별특성(SC)',
    lessonLearned: '습득교훈',
  },
  
  // 6단계 최적화
  optimization: {
    designPreventionAction: '설계 예방 조치',
    designDetectionAction: '설계 검출 조치',
    responsible: '책임자',
    targetDate: '목표 완료일',
    status: '상태',
    evidence: '조치 완료 근거',
    completionDate: '완료일',
    newSeverity: '심각도(후)',
    newOccurrence: '발생도(후)',
    newDetection: '검출도(후)',
    newSpecialChar: '특별특성(후)',
    newAP: 'AP(후)',
    remarks: '비고',
  },
};
```

---

## 🔄 PFMEA → DFMEA 용어 매핑

| PFMEA 용어 | DFMEA 용어 | 변경 이유 |
|-----------|-----------|----------|
| **구조분석** | | |
| 완제품 공정명 | 다음상위수준 | 설계 계층 구조 반영 |
| NO+공정명 | 초점요소 (A'SSY) | 어셈블리 중심 분석 |
| 4M (Man/Machine/Material/Method) | 타입 (부품/A'ssy/I/F) | 설계에서는 4M 미적용 |
| 작업요소 | 다음하위수준 | 부품/특성 중심 |
| **기능분석** | | |
| 제품특성 | 초점요소 요구사항 | |
| 작업요소 기능 | 부품기능 | |
| 공정특성 | 부품 요구사항 | |
| 기능분석 (기타) | **동일** | |
| **리스크분석** | | |
| 예방관리 | 현재 예방관리 | 현재 상태 강조 |
| 검출관리 | 현재 검출관리 | 현재 상태 강조 |
| 리스크분석 (기타) | **동일** | |
| **최적화** | | |
| 예방관리개선 | **동일** | |
| 검출관리개선 | **동일** | |
| 최적화 (기타) | **동일** | |
| **분류 옵션** | | |
| Your Plant (YP) | 법규 | 분류 옵션 변경 |
| Ship to Plant (SP) | 기본 | 분류 옵션 변경 |
| User | 보조 | 분류 옵션 변경 |
| - | 관능 | DFMEA 전용 추가 |
| **연동** | | |
| PFD 연동 | ❌ 제거 | DFMEA는 연동 없음 |
| CP 연동 | ❌ 제거 | DFMEA는 연동 없음 |

---

## ✅ 개발 체크리스트

- [ ] `terminology.ts` - DFMEA_COLUMN_STANDARD 추가
- [ ] `StructureTab.tsx` - 컬럼명 변경
- [ ] `FunctionL1Tab.tsx` ~ `FunctionL3Tab.tsx` - 컬럼명 변경
- [ ] `FailureL1Tab.tsx` ~ `FailureL3Tab.tsx` - 컬럼명 변경
- [ ] `RiskTab.tsx` - 컬럼명 변경
- [ ] `OptTab.tsx` - 컬럼명 변경
- [ ] `AllTab.tsx` - 전체 뷰 컬럼명 변경
- [ ] 모달 컴포넌트들 - 타이틀/레이블 변경
