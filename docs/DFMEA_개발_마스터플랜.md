# 🚀 DFMEA 개발 마스터 플랜

> **문서 버전**: 1.0.0  
> **작성일**: 2026-01-21  
> **상태**: 개발 진행중  
> **참고 문서**: `중요_ONPREMISE_MASTER_PLAN.md`, `DFMEA_PRD.md`

---

## 📋 개요

DFMEA(Design FMEA)는 PFMEA(Process FMEA)와 별도로 관리되는 설계 기반 고장모드 영향분석입니다.
PFMEA 코드를 기반으로 DFMEA 전용 모듈을 개발합니다.

### 핵심 원칙

1. **완전 분리**: PFMEA와 DFMEA는 독립적인 데이터/ID 체계
2. **코드 공용화**: 공통 컴포넌트/훅은 `src/shared/`에서 관리
3. **용어 구분**: DFMEA 고유 용어 사용 (제품명 → 다음상위수준 등)

### 🔴 신규 기능 = 무조건 별도 모듈 분리 (최우선)

> **사용자 요청 기능이든 AI 자체 개발이든, 신규 기능은 무조건 새 파일로 분리**

```
❌ 금지: 기존 큰 파일에 코드 추가
   useWorksheetState.ts에 300줄 추가 → 금지!
   FailureLinkTab.tsx에 200줄 추가 → 금지!

✅ 필수: 별도 파일로 분리 후 import
   hooks/useNewFeature.ts      → 새 훅
   components/NewFeature.tsx   → 새 컴포넌트
   utils/newFeatureUtils.ts    → 새 유틸리티
```

### 🔴 PFMEA 모듈화 최적화 반영 (필수)

> **DFMEA는 PFMEA에서 진행한 모듈화 경험을 바탕으로 더 최적화된 구조로 개발한다**

| 패턴 | 설명 | 적용 대상 |
|------|------|----------|
| **공용 컴포넌트** | `EditableCell`, `SelectableCell`, `NumberCell` | 모든 탭 셀 |
| **공용 훅** | `useCellEdit` - 셀 업데이트/저장 로직 | 모든 탭 |
| **핸들러 분리** | `useFunctionL3Handlers`, `useFailureL3Handlers` 패턴 | L1~L3 탭 |
| **헤더 분리** | `L3TabHeader`, `FailureL3Header` 패턴 | 모든 탭 헤더 |
| **데이터 로더** | `useWorksheetDataLoader` 패턴 | 워크시트 hooks |
| **저장 로직** | `useWorksheetSave` 패턴 | 워크시트 hooks |
| **상태 동기화** | `setStateSynced` + `saveAtomicDB` 필수 | 모든 CRUD |
| **700행 제한** | 초과 시 즉시 분리 | 모든 파일 |

### PFMEA에서 미완료된 최적화 → DFMEA에서 선제 적용

```
PFMEA 현황 (모듈화 후):
├── useWorksheetState.ts: 406줄 ✅
├── FailureLinkTab.tsx: 734줄 ✅
├── FunctionL3Tab.tsx: 612줄 ✅
├── FailureL3Tab.tsx: 715줄 ⚠️ (추가 분리 가능)
└── AllTabEmpty.tsx: 970줄 ⚠️ (분리 필요)

DFMEA 목표 (선제 최적화):
├── useWorksheetState.ts: <400줄 (처음부터 분리)
├── FailureLinkTab.tsx: <600줄 (다이어그램 분리)
├── FunctionL3Tab.tsx: <500줄 (테이블 분리)
├── FailureL3Tab.tsx: <500줄 (테이블 분리)
└── AllTabEmpty.tsx: <700줄 (렌더러 분리)
```

---

## 🆔 ID 체계

### DFMEA ID 형식

```
dfm{YY}-{t}{NNN}

- dfm: DFMEA 약어 (소문자 고정)
- YY: 연도 뒤 2자리 (26 = 2026년)
- t: 유형 구분자 소문자 (m=Master, f=Family, p=Part)
- NNN: 시리얼 번호 3자리 (001, 002, ...)

예시:
- dfm26-m001 (Master DFMEA)
- dfm26-f001 (Family DFMEA)  
- dfm26-p001 (Part DFMEA)
```

### PFMEA와 비교

| 구분 | PFMEA | DFMEA |
|------|-------|-------|
| ID 프리픽스 | `pfm` | `dfm` |
| 예시 | `pfm26-p001` | `dfm26-p001` |
| localStorage | `pfmea-projects` | `dfmea-projects` |
| 워크시트 키 | `pfmea_worksheet_xxx` | `dfmea_worksheet_xxx` |

---

## 📂 파일 구조

```
src/app/dfmea/
├── layout.tsx                    # ✅ 완료 (사이드바/상태바)
├── register/
│   └── page.tsx                  # ✅ 완료 (dfm ID 생성)
├── list/
│   └── page.tsx                  # ✅ 완료 (dfm 필터링)
├── import/                       # ⏳ DFMEA 기초정보 Import
│   └── page.tsx
├── revision/
│   └── page.tsx                  # ✅ 완료
└── worksheet/
    ├── page.tsx                  # ✅ 완료
    ├── constants.ts              # ⏳ DFMEA 용어 적용 필요
    ├── terminology.ts            # ✅ 완료 (DFMEA 용어 정의)
    ├── hooks/
    │   └── useWorksheetState.ts  # ⏳ dfmea-projects 로드
    └── tabs/
        ├── StructureTab.tsx      # ⏳ DFMEA 용어 적용
        ├── function/             # ⏳ DFMEA 용어 적용
        ├── failure/              # ⏳ DFMEA 용어 적용
        └── all/                  # ⏳ DFMEA 용어 적용
```

---

## 📊 주요 수정 항목

### 1️⃣ 등록 페이지 (`/dfmea/register`)

| 항목 | 현재 상태 | 수정 필요 |
|------|----------|----------|
| FMEA ID 생성 | ✅ `dfm26-p001` | 완료 |
| localStorage 키 | ✅ `dfmea-projects` | 완료 |
| PFMEA ID 차단 | ✅ `pfm` → 리다이렉트 | 완료 |
| **상위 FMEA 선택** | ❌ PFMEA 표시됨 | 🔴 **수정 필요** |
| 기초정보 모달 | ⏳ DFMEA용 분리 필요 | 🟡 검토 |

### 2️⃣ 리스트 페이지 (`/dfmea/list`)

| 항목 | 현재 상태 | 수정 필요 |
|------|----------|----------|
| localStorage 키 | ✅ `dfmea-projects` | 완료 |
| DFMEA 필터링 | ✅ `dfm` 프리픽스만 | 완료 |
| 상위 FMEA 표시 | ⏳ DFMEA만 표시 필요 | 🟡 검토 |

### 3️⃣ 워크시트 (`/dfmea/worksheet`)

| 항목 | 현재 상태 | 수정 필요 |
|------|----------|----------|
| localStorage 키 | ✅ `dfmea_worksheet_xxx` | 완료 |
| 프로젝트 로드 | ⏳ API 의존 | `dfmea-projects` 사용 |
| **용어 적용** | ⏳ 일부만 | 🔴 **전체 적용 필요** |

### 4️⃣ 상위 FMEA 선택 모달

| 항목 | 현재 상태 | 수정 필요 |
|------|----------|----------|
| FMEA 목록 소스 | ❌ PFMEA 포함 | `dfmea-projects`만 |
| ID 필터링 | ❌ 없음 | `dfm` 프리픽스 필터 |

---

## 🔧 수정 상세

### Phase 1: 상위 FMEA 선택 수정 (즉시)

**파일**: `src/app/dfmea/register/page.tsx`

```typescript
// 기존 (문제)
const loadAvailableFmeas = async () => {
  // API에서 모든 FMEA 로드 (PFMEA 포함)
  const res = await fetch('/api/fmea/projects');
  ...
};

// 수정 (DFMEA만)
const loadAvailableFmeas = () => {
  // localStorage에서 DFMEA만 로드
  const stored = localStorage.getItem('dfmea-projects');
  if (stored) {
    const projects = JSON.parse(stored);
    // dfm 프리픽스만 필터링
    const dfmeaOnly = projects.filter((p: any) => 
      p.id?.toLowerCase().startsWith('dfm')
    );
    setAvailableFmeas(dfmeaOnly);
  }
};
```

### Phase 2: 용어 전체 적용

| PFMEA 용어 | DFMEA 용어 |
|-----------|-----------|
| 완제품 공정명 | 다음상위수준 |
| 메인공정(A'SSY) | 초점요소 |
| 작업요소 | 다음하위수준 |
| 4M | 타입 |
| 제품 기능 | 다음상위수준 기능 |
| 공정 기능 | 초점요소 기능 |
| 작업 기능/특성 | 부품 기능 또는 특성 |

### Phase 3: DB 스키마

DFMEA는 현재 PFMEA와 동일한 테이블 구조를 사용하되, `fmeaId`가 `dfm` 프리픽스로 구분됩니다.

```prisma
// 기존 테이블 그대로 사용
model L1Structure {
  id      String @id
  fmeaId  String  // dfm26-p001 형태로 저장
  ...
}
```

**별도 테이블 필요 여부**: ❌ 불필요 (ID로 구분)

---

## ✅ 체크리스트

### 즉시 수정 필요 (🔴)

- [ ] 상위 FMEA 선택 모달 - DFMEA만 표시
- [ ] 등록 페이지 FMEA 목록 - DFMEA만 로드
- [ ] 워크시트 hooks - `dfmea-projects` localStorage 사용

### 용어 적용 필요 (🟡)

- [ ] StructureTab - 컬럼명 DFMEA 용어
- [ ] FunctionL1~L3Tab - 컬럼명 DFMEA 용어
- [ ] FailureL1~L3Tab - 컬럼명 DFMEA 용어
- [ ] RiskTab / OptTab - 컬럼명 확인
- [ ] AllTab - 전체 컬럼명 확인

### 기능 검증 필요 (🟢)

- [ ] 신규 등록 → ID `dfm26-p001` 생성 확인
- [ ] 목록 표시 → DFMEA만 표시 확인
- [ ] 워크시트 저장/로드 → `dfmea_worksheet_xxx` 키 확인
- [ ] 상위 FMEA 상속 → DFMEA 간 상속 확인

---

## 📅 TDD 기반 개발 일정 (10시간 완료)

### 🎯 TDD 테스트 데이터 (마스터 데이터 5개 활용)

```typescript
// src/app/dfmea/constants/masterData.ts에서 사용
const TEST_DATA = {
  // 1. 초점요소 (A'SSY)
  focusElement: {
    id: 'FE-001',
    name: 'Tread Package',
    function: '노면과 직접 접촉하여 구동력·제동력·조향력을 전달...',
    requirement: '트레드 접지계수'
  },
  // 2. 부품 (다음하위수준)
  part: {
    id: 'PT-001', 
    name: 'Cap Tread',
    functions: ['마모 수명, 접지력...', '설계된 접지 면적...'],
    requirements: ['컴파운드', '전폭', 'Crown폭']
  },
  // 3. 고장영향
  failureEffect: { id: 'FE-S10', effect: '주행 중 파열', severity: 10 },
  // 4. 고장형태
  failureMode: { id: 'FM-001', mode: '저마찰', category: 'traction' },
  // 5. 고장원인
  failureCause: { id: 'FC-001', cause: '컴파운드 선정 편차' }
};
```

---

## 🚀 Phase별 TDD 개발 계획

### **Phase 1: 구조분석 (StructureTab)** ⏱️ 1.5시간

#### 📁 파일 구조 (최적화)
```
tabs/structure/
├── StructureTab.tsx           # <400줄 (메인 컴포넌트)
├── StructureTable.tsx         # 테이블 렌더링 분리
├── hooks/
│   └── useStructureHandlers.ts  # 핸들러 분리
└── components/
    ├── L1Row.tsx              # 다음상위수준 행
    ├── L2Row.tsx              # 초점요소 행
    └── L3Row.tsx              # 다음하위수준 행
```

#### 🧪 TDD 테스트 케이스
| # | 테스트 | 기대 결과 |
|---|--------|----------|
| 1 | 다음상위수준 '타이어' 입력 | L1 저장, DB 반영 |
| 2 | 초점요소 'Tread Package' 선택 | 마스터 데이터에서 로드 |
| 3 | 다음하위수준 'Cap Tread' 추가 | L3 행 추가, 저장 |
| 4 | 초점요소→부품 자동 연결 | Package→Parts 매핑 |
| 5 | 인라인 수정 + 저장 | 즉시 저장 확인 |

#### ⏱️ 작업 분배
- useStructureHandlers.ts 생성: 20분
- StructureTable.tsx 분리: 20분  
- Row 컴포넌트 분리: 20분
- TDD 테스트 구현/검증: 30분

---

### **Phase 2: 기능분석 (FunctionL1~L3Tab)** ⏱️ 2시간

#### 📁 파일 구조 (최적화)
```
tabs/function/
├── FunctionL1Tab.tsx          # <400줄
├── FunctionL2Tab.tsx          # <400줄
├── FunctionL3Tab.tsx          # <400줄
├── shared/
│   ├── FunctionTable.tsx      # 공용 테이블
│   └── FunctionHeader.tsx     # 공용 헤더
└── hooks/
    ├── useFunctionL1Handlers.ts
    ├── useFunctionL2Handlers.ts
    └── useFunctionL3Handlers.ts
```

#### 🧪 TDD 테스트 케이스
| # | 테스트 | 기대 결과 |
|---|--------|----------|
| 1 | L1: '다음상위수준 기능' 입력 | 완제품 기능 저장 |
| 2 | L2: 초점요소 기능 마스터 선택 | 자동 로드 |
| 3 | L3: 부품기능 'Cap Tread' 자동 매핑 | 6개 기능 로드 |
| 4 | 요구사항 드롭다운 | 마스터 데이터 표시 |
| 5 | 셀 수정 + 자동 저장 | setStateSynced 패턴 |

#### ⏱️ 작업 분배
- L1 Tab 최적화: 30분
- L2 Tab 최적화: 30분
- L3 Tab 최적화: 30분
- TDD 테스트 구현/검증: 30분

---

### **Phase 3: 고장분석 (FailureL1~L3Tab)** ⏱️ 2시간

#### 📁 파일 구조 (최적화)
```
tabs/failure/
├── FailureL1Tab.tsx           # <400줄 (고장영향)
├── FailureL2Tab.tsx           # <400줄 (고장형태)
├── FailureL3Tab.tsx           # <400줄 (고장원인)
├── shared/
│   ├── FailureTable.tsx       # 공용 테이블
│   ├── FailureHeader.tsx      # 공용 헤더
│   └── SeverityCell.tsx       # 심각도 셀 분리
└── hooks/
    ├── useFailureL1Handlers.ts
    ├── useFailureL2Handlers.ts
    └── useFailureL3Handlers.ts
```

#### 🧪 TDD 테스트 케이스
| # | 테스트 | 기대 결과 |
|---|--------|----------|
| 1 | 고장영향 '주행 중 파열' 선택 | 마스터에서 로드, S=10 |
| 2 | 고장형태 '저마찰' 선택 | 카테고리='traction' |
| 3 | 고장원인 '컴파운드 선정 편차' 선택 | 마스터 매핑 |
| 4 | Severity 자동 계산 | 마스터 severity 적용 |
| 5 | 원인→예방관리 자동 연결 | category 기반 필터 |

#### ⏱️ 작업 분배
- L1 Tab (고장영향) 최적화: 30분
- L2 Tab (고장형태) 최적화: 30분
- L3 Tab (고장원인) 최적화: 30분
- TDD 테스트 구현/검증: 30분

---

### **Phase 4: 고장연결 (FailureLinkTab)** ⏱️ 1.5시간

#### 📁 파일 구조 (최적화) - PFMEA보다 더 분리
```
tabs/failure/
├── FailureLinkTab.tsx         # <500줄 (메인)
├── components/
│   ├── LinkDiagram.tsx        # SVG 다이어그램 분리 ★신규
│   ├── FMSelector.tsx         # FM 선택 패널
│   ├── FEFCPanel.tsx          # FE/FC 연결 패널
│   └── OrphanManager.tsx      # 고아 관리 분리 ★신규
└── hooks/
    ├── useLinkData.ts         # 데이터 로직
    ├── useLinkHandlers.ts     # 핸들러
    ├── useLinkConfirm.ts      # 확정 로직
    └── useSVGLines.ts         # SVG 좌표 계산
```

#### 🧪 TDD 테스트 케이스
| # | 테스트 | 기대 결과 |
|---|--------|----------|
| 1 | FM '저마찰' 선택 | 화살표 시작점 표시 |
| 2 | FE '주행 중 파열' 연결 | SVG 화살표 생성 |
| 3 | FC '컴파운드 선정 편차' 연결 | 원인 연결 완료 |
| 4 | 연결 해제 | 화살표 제거 |
| 5 | 확정 처리 | DB 저장 확인 |

#### ⏱️ 작업 분배
- LinkDiagram.tsx 분리: 30분
- OrphanManager.tsx 분리: 20분
- Hooks 최적화: 20분
- TDD 테스트 구현/검증: 20분

---

### **Phase 5: 리스크분석 (RiskTab)** ⏱️ 1시간

#### 📁 파일 구조 (최적화)
```
tabs/risk/
├── RiskTab.tsx                # <500줄
├── RiskTable.tsx              # 테이블 분리
├── components/
│   ├── RiskHeader.tsx         # 헤더 분리
│   ├── RPNCell.tsx            # RPN 계산 셀
│   └── ControlCell.tsx        # 예방/검출 관리 셀
└── hooks/
    └── useRiskHandlers.ts
```

#### 🧪 TDD 테스트 케이스
| # | 테스트 | 기대 결과 |
|---|--------|----------|
| 1 | S/O/D 입력 | RPN 자동 계산 |
| 2 | 예방관리 마스터 선택 | category 필터링 |
| 3 | 검출관리 마스터 선택 | 시험 항목 로드 |
| 4 | AP 등급 자동 결정 | S×O 기준 |
| 5 | Confirmed 상태 변경 | 확정 처리 |

#### ⏱️ 작업 분배
- RiskTab 분리/최적화: 30분
- TDD 테스트 구현/검증: 30분

---

### **Phase 6: 최적화분석 (OptTab)** ⏱️ 1시간

#### 📁 파일 구조 (최적화)
```
tabs/opt/
├── OptTab.tsx                 # <500줄
├── OptTable.tsx               # 테이블 분리
├── components/
│   ├── OptHeader.tsx          # 헤더 분리
│   └── ActionCell.tsx         # 조치 셀
└── hooks/
    └── useOptHandlers.ts
```

#### 🧪 TDD 테스트 케이스
| # | 테스트 | 기대 결과 |
|---|--------|----------|
| 1 | 권장조치 입력 | 저장 확인 |
| 2 | 담당자/완료일 입력 | 필드 저장 |
| 3 | 조치 후 S/O/D 재평가 | RPN 재계산 |
| 4 | 조치 상태 변경 | 상태 업데이트 |
| 5 | Confirmed 처리 | 확정 저장 |

#### ⏱️ 작업 분배
- OptTab 분리/최적화: 30분
- TDD 테스트 구현/검증: 30분

---

### **Phase 7: 전체보기 (AllTab)** ⏱️ 1시간

#### 📁 파일 구조 (최적화) - PFMEA 970줄 → <700줄 목표
```
tabs/all/
├── AllTab.tsx                 # <400줄 (메인)
├── AllTable.tsx               # 테이블 분리
├── components/
│   ├── AllHeader.tsx          # 헤더 분리 (35컬럼)
│   ├── AllRowRenderer.tsx     # 행 렌더러 분리 ★신규
│   └── ColumnResizer.tsx      # 컬럼 리사이저
└── hooks/
    ├── useAllTabData.ts       # 데이터 가공
    └── useAllTabStats.ts      # 통계 계산
```

#### 🧪 TDD 테스트 케이스
| # | 테스트 | 기대 결과 |
|---|--------|----------|
| 1 | 전체 데이터 렌더링 | 35컬럼 표시 |
| 2 | 마스터 데이터 5개 표시 | 정확한 렌더링 |
| 3 | 컬럼 필터링 | 선택 컬럼만 표시 |
| 4 | Excel Export | 전체 데이터 내보내기 |
| 5 | 통계 계산 | RPN/AP 통계 정확 |

#### ⏱️ 작업 분배
- AllRowRenderer.tsx 분리: 20분
- AllTable.tsx 분리: 20분
- TDD 테스트 구현/검증: 20분

---

## ⏱️ 전체 일정 요약

| Phase | 작업 | 시간 | 누적 |
|-------|------|------|------|
| **P1** | 구조분석 (StructureTab) | 1.5h | 1.5h |
| **P2** | 기능분석 (FunctionL1~L3) | 2.0h | 3.5h |
| **P3** | 고장분석 (FailureL1~L3) | 2.0h | 5.5h |
| **P4** | 고장연결 (FailureLinkTab) | 1.5h | 7.0h |
| **P5** | 리스크분석 (RiskTab) | 1.0h | 8.0h |
| **P6** | 최적화분석 (OptTab) | 1.0h | 9.0h |
| **P7** | 전체보기 (AllTab) | 1.0h | **10.0h** |

---

## 🎯 최적화 목표 비교

| 파일 | PFMEA (현재) | DFMEA (목표) | 개선 |
|------|-------------|-------------|------|
| useWorksheetState.ts | 406줄 | <350줄 | -14% |
| FailureLinkTab.tsx | 734줄 | <500줄 | -32% |
| FunctionL3Tab.tsx | 612줄 | <400줄 | -35% |
| FailureL3Tab.tsx | 715줄 | <400줄 | -44% |
| AllTabEmpty.tsx | 970줄 | <700줄 | -28% |

---

## 🔧 공통 모듈 (재사용)

### 이미 생성된 모듈
```typescript
// src/app/dfmea/worksheet/tabs/shared/EditableCell.tsx
export { EditableCell, SelectableCell, NumberCell, ReadOnlyCell }

// src/app/dfmea/worksheet/hooks/useCellEdit.ts
export { useCellEdit }  // updateCell, save, saveLocal

// src/app/dfmea/constants/masterData.ts
export { FOCUS_ELEMENTS, PARTS, FAILURE_EFFECTS, ... }
```

### 추가 생성 예정
```typescript
// 공용 테이블 컴포넌트
src/app/dfmea/worksheet/tabs/shared/
├── CommonTable.tsx           # 공용 테이블 래퍼
├── CommonHeader.tsx          # 공용 헤더
├── ConfirmButton.tsx         # 확정 버튼
└── MissingCount.tsx          # 미입력 카운트

// 공용 훅
src/app/dfmea/worksheet/hooks/
├── useConfirmState.ts        # 확정 상태 관리
├── useMasterData.ts          # 마스터 데이터 접근
└── useAutoSave.ts            # 자동 저장 로직
```

---

## ✅ TDD 검증 체크리스트

### 빌드 검증
- [ ] `npm run build` 성공
- [ ] TypeScript 에러 0개
- [ ] ESLint 경고 최소화

### 기능 검증
- [ ] 구조분석: 마스터 데이터 5개 입력/저장 완료
- [ ] 기능분석: L1~L3 모든 탭 동작 확인
- [ ] 고장분석: 영향→형태→원인 연결 완료
- [ ] 고장연결: SVG 화살표 정상 표시
- [ ] 리스크분석: RPN 자동 계산 정상
- [ ] 최적화분석: 조치 입력/저장 정상
- [ ] 전체보기: 35컬럼 모두 표시

### 성능 검증
- [ ] 모든 Tab 파일 700줄 이하
- [ ] 첫 로딩 3초 이내
- [ ] 저장 응답 1초 이내

---

## 📝 변경 이력

| 버전 | 일자 | 변경 내용 |
|------|------|----------|
| 1.0.0 | 2026-01-21 | 최초 작성 |

---

**작성자**: AI Assistant  
**승인자**: _________________  
**승인일**: _________________
