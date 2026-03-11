# DFMEA 재작성 계획서 (PFMEA 벤치마킹)

**작성일**: 2026-01-14  
**방법**: PFMEA 코드 복사 후 DFMEA로 재작성  
**목표**: 완벽한 모듈화, 인라인 스타일 제거, 500줄 규칙 준수

---

## 📊 작업 범위

### 대상 파일 구조

```
dfmea/
├── worksheet/ (재작성 대상)
│   ├── page.tsx
│   ├── components/
│   ├── hooks/
│   ├── tabs/
│   ├── utils/
│   └── ...
└── import/ (별도 계획 필요)
```

---

## 🎯 재작성 전략

### Phase 1: PFMEA 구조 복사 및 기본 설정

#### 1.1 PFMEA → DFMEA 복사

**복사 대상:**
```
pfmea/worksheet/ → dfmea/worksheet/
```

**복사 파일 목록:**
- `page.tsx` (템플릿)
- `components/` (전체)
- `hooks/` (전체)
- `tabs/` (구조만, 내용은 재작성)
- `utils/` (공용)
- `constants.ts` (템플릿)
- `db-storage.ts`
- `excel-export.ts`
- `migration.ts`
- `schema.ts` (DFMEA 스키마로 교체)

#### 1.2 기본 설정 변경

**파일별 변경 사항:**

1. **`page.tsx`**
   - `PFMEATopNav` → `DFMEATopNav`
   - import 경로: `pfmea` → `dfmea`
   - 라우팅: `/pfmea/...` → `/dfmea/...`
   - localStorage 키: `pfmea_*` → `dfmea_*`

2. **`constants.ts`**
   - DFMEA 컬럼 정의로 교체
   - DFMEA 컬러 체계 적용
   - DFMEA 용어로 변경

3. **`columns.ts` (신규)**
   - DFMEA_PRD.md 기반 컬럼 정의
   - 35개 컬럼 (구조: 4, 기능: 7, 고장: 4, 리스크: 7, 최적화: 13)

4. **`schema.ts`**
   - DFMEA 원자성 DB 스키마로 교체
   - DFMEA 타입 정의

5. **`hooks/useWorksheetState.ts`**
   - localStorage 키: `pfmea_*` → `dfmea_*`
   - DFMEA 특화 로직 추가

6. **`components/TopMenuBar.tsx`**
   - Tailwind CSS만 사용 (인라인 스타일 제거)
   - DFMEA 라우팅으로 변경

7. **`components/TabMenu.tsx`**
   - DFMEA 탭 구조로 변경
   - DFMEA 라우팅으로 변경

---

### Phase 2: DFMEA 컬럼 정의 반영

#### 2.1 columns.ts 작성

**DFMEA_PRD.md 기반 컬럼 정의:**

```typescript
// dfmea/worksheet/columns.ts
export const DFMEA_COLUMNS: ColumnDef[] = [
  // 구조분석 (2단계) - 4컬럼
  { data: 'productName', header: '제품명', width: 160, className: 'structure-col' },
  { data: 'assy', header: 'A\'SSY', width: 140, className: 'structure-col' },
  { data: 'type', header: '타입', width: 100, className: 'structure-col' },
  { data: 'partOrChar', header: '부품 또는 특성', width: 120, className: 'structure-col' },
  
  // 기능분석 (3단계) - 7컬럼
  { data: 'category', header: '분류', width: 60, className: 'function-col' },
  { data: 'productFunction', header: '제품 기능', width: 180, className: 'function-col' },
  { data: 'requirement', header: '요구사항', width: 180, className: 'function-col' },
  { data: 'focusElementFunction', header: '초점요소 기능', width: 160, className: 'function-col' },
  { data: 'focusElementRequirement', header: '요구사항', width: 140, className: 'function-col' },
  { data: 'partFunctionOrChar', header: '부품 기능 또는 특성', width: 160, className: 'function-col' },
  { data: 'partRequirement', header: '요구사항', width: 140, className: 'function-col' },
  
  // 고장분석 (4단계) - 4컬럼
  { data: 'failureEffect', header: '고장영향', width: 180, className: 'failure-col' },
  { data: 'severity', header: '심각도', width: 30, className: 'failure-col' },
  { data: 'failureMode', header: '고장형태', width: 160, className: 'failure-col' },
  { data: 'failureCause', header: '고장원인', width: 180, className: 'failure-col' },
  
  // 리스크분석 (5단계) - 7컬럼
  { data: 'preventionControl', header: '예방관리', width: 160, className: 'risk-col' },
  { data: 'occurrence', header: '발생도', width: 30, className: 'risk-col' },
  { data: 'detectionControl', header: '검출관리', width: 160, className: 'risk-col' },
  { data: 'detection', header: '검출도', width: 30, className: 'risk-col' },
  { data: 'ap', header: 'AP', width: 30, className: 'risk-col' },
  { data: 'specialChar', header: '특별특성', width: 60, className: 'risk-col' },
  { data: 'lessonsLearned', header: '습득교훈', width: 120, className: 'risk-col' },
  
  // 최적화 (6단계) - 13컬럼
  { data: 'designPreventionAction', header: '설계 예방 조치', width: 160, className: 'opt-col' },
  { data: 'designDetectionAction', header: '설계 검출 조치', width: 160, className: 'opt-col' },
  { data: 'responsible', header: '책임자', width: 100, className: 'opt-col' },
  { data: 'targetDate', header: '목표 완료일', width: 60, className: 'opt-col' },
  { data: 'status', header: '상태', width: 60, className: 'opt-col' },
  { data: 'reportName', header: '보고서 이름', width: 100, className: 'opt-col' },
  { data: 'completionDate', header: '완료일', width: 60, className: 'opt-col' },
  { data: 'effectSeverity', header: '심각도', width: 30, className: 'opt-col' },
  { data: 'effectOccurrence', header: '발생도', width: 30, className: 'opt-col' },
  { data: 'effectDetection', header: '검출도', width: 30, className: 'opt-col' },
  { data: 'effectSC', header: 'S/C', width: 60, className: 'opt-col' },
  { data: 'effectAP', header: 'AP', width: 30, className: 'opt-col' },
  { data: 'remarks', header: '비고', width: 100, className: 'opt-col' },
];
```

#### 2.2 constants.ts 수정

- DFMEA 컬럼 수: 35개
- DFMEA 색상 체계 적용
- DFMEA 용어로 변경

---

### Phase 3: tabs 재작성

#### 3.1 탭 구조 변경

**PFMEA 탭:**
- StructureTab (구조분석)
- FunctionTab (기능분석)
- FailureTab (고장분석)
- RiskTab (리스크분석)
- OptTab (최적화)
- DocTab (문서)

**DFMEA 탭:**
- StructureTab (구조분석) - 재작성 필요
- FunctionTab (기능분석) - 재작성 필요
- FailureTab (고장분석) - 재작성 필요
- RiskTab (리스크분석) - 재작성 필요
- OptTab (최적화) - 재작성 필요
- DocTab (문서) - 재작성 필요

#### 3.2 각 탭 재작성 작업

**StructureTab:**
- 컬럼: 제품명, A'SSY, 타입, 부품 또는 특성
- PFMEA 패턴 유지, DFMEA 컬럼으로 교체

**FunctionTab:**
- 컬럼: 분류, 제품 기능, 요구사항, 초점요소 기능, 요구사항, 부품 기능 또는 특성, 요구사항
- PFMEA 패턴 유지, DFMEA 컬럼으로 교체

**FailureTab:**
- 컬럼: 고장영향, 심각도, 고장형태, 고장원인
- PFMEA 패턴 유지, DFMEA 컬럼으로 교체

**RiskTab:**
- 컬럼: 예방관리, 발생도, 검출관리, 검출도, AP, 특별특성, 습득교훈
- PFMEA 패턴 유지, DFMEA 컬럼으로 교체

**OptTab:**
- 컬럼: 설계 예방 조치, 설계 검출 조치, 책임자, 목표 완료일, 상태, 보고서 이름, 완료일, 심각도, 발생도, 검출도, S/C, AP, 비고
- PFMEA 패턴 유지, DFMEA 컬럼으로 교체

---

### Phase 4: 인라인 스타일 제거

#### 4.1 스타일 검증

```bash
# 인라인 스타일 검색 (0건 목표)
grep -r "style=\{" src/app/dfmea/worksheet
```

#### 4.2 Tailwind CSS 전환

**변경 패턴:**
```typescript
// Before (인라인 스타일)
<div style={topMenuBarStyle}>...</div>

// After (Tailwind CSS)
<div className="flex items-center justify-between bg-[#1a237e] text-white px-4 py-2">...</div>
```

#### 4.3 공용 스타일 활용

- `@/styles/worksheet.ts` 활용
- PFMEA와 동일한 스타일 패턴 사용

---

### Phase 5: 라인 수 검증

#### 5.1 목표 라인 수

- 모든 파일 ≤500줄
- 이상적: ≤150줄

#### 5.2 검증 방법

```bash
# 라인 수 확인
find src/app/dfmea/worksheet -name "*.tsx" -o -name "*.ts" | xargs wc -l
```

---

## 📋 단계별 체크리스트

### Phase 1: PFMEA 구조 복사
- [ ] PFMEA worksheet 폴더 전체 복사
- [ ] 기본 import 경로 변경 (`pfmea` → `dfmea`)
- [ ] 라우팅 변경 (`/pfmea/...` → `/dfmea/...`)
- [ ] localStorage 키 변경 (`pfmea_*` → `dfmea_*`)
- [ ] TopNav 변경 (`PFMEATopNav` → `DFMEATopNav`)

### Phase 2: DFMEA 컬럼 정의 반영
- [ ] `columns.ts` 작성 (DFMEA_PRD.md 기반)
- [ ] `constants.ts` 수정 (DFMEA 컬럼 수, 색상, 용어)
- [ ] `schema.ts` 수정 (DFMEA 원자성 DB 스키마)
- [ ] 타입 정의 수정

### Phase 3: tabs 재작성
- [ ] StructureTab 재작성
- [ ] FunctionTab 재작성
- [ ] FailureTab 재작성
- [ ] RiskTab 재작성
- [ ] OptTab 재작성
- [ ] DocTab 재작성
- [ ] AllTab 재작성

### Phase 4: 인라인 스타일 제거
- [ ] TopMenuBar 스타일 전환
- [ ] TabMenu 스타일 전환
- [ ] 각 탭 스타일 전환
- [ ] grep 검증: `style=\{` 0건

### Phase 5: 검증
- [ ] 모든 파일 라인 수 ≤500줄 확인
- [ ] 빌드 테스트 (`npm run build`)
- [ ] 타입 체크 (`npm run type-check`)
- [ ] 런타임 테스트

---

## 🔧 실행 방법

### 1단계: 백업

```bash
# DFMEA 기존 코드 백업
cp -r src/app/dfmea/worksheet backups/dfmea-worksheet-backup-$(date +%Y%m%d)
```

### 2단계: PFMEA 복사

```bash
# PFMEA worksheet를 임시 폴더로 복사
cp -r src/app/pfmea/worksheet src/app/dfmea/worksheet-new
```

### 3단계: 기본 설정 변경

- `page.tsx`: import 경로, 라우팅, localStorage 키 변경
- `components/TopMenuBar.tsx`: DFMEATopNav, 라우팅 변경
- `components/TabMenu.tsx`: 라우팅 변경
- `hooks/useWorksheetState.ts`: localStorage 키 변경

### 4단계: DFMEA 컬럼 정의 반영

- `columns.ts` 작성
- `constants.ts` 수정
- `schema.ts` 수정

### 5단계: 탭 재작성

- 각 탭 파일을 DFMEA 컬럼으로 재작성

### 6단계: 검증 및 교체

- 모든 테스트 통과 후 기존 `worksheet` 폴더 교체

---

## ⚠️ 주의사항

1. **기존 기능 유지**
   - DFMEA 특화 기능 보존
   - 데이터 마이그레이션 고려

2. **점진적 교체**
   - 각 Phase별 검증 후 다음 단계 진행
   - Git 브랜치 활용

3. **테스트 중요**
   - 각 Phase 완료 후 빌드 테스트
   - 런타임 테스트 필수

4. **문서화**
   - 변경 사항 기록
   - DFMEA_PRD.md 준수

---

## 📅 예상 일정

| Phase | 작업 내용 | 예상 기간 |
|-------|----------|----------|
| Phase 1 | PFMEA 구조 복사 및 기본 설정 | 0.5일 |
| Phase 2 | DFMEA 컬럼 정의 반영 | 1일 |
| Phase 3 | tabs 재작성 | 3일 |
| Phase 4 | 인라인 스타일 제거 | 1일 |
| Phase 5 | 검증 및 정리 | 0.5일 |

**총 예상 기간**: 6일

---

## 🎯 최종 목표

1. ✅ 완벽한 모듈화 구조 (PFMEA와 동일)
2. ✅ 인라인 스타일 0건
3. ✅ 모든 파일 ≤500줄
4. ✅ DFMEA_PRD.md 완전 준수
5. ✅ 표준화된 코드 패턴

---

## 📅 마지막 업데이트: 2026-01-14

