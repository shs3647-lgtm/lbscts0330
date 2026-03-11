# DFMEA 모듈화 계획서

**작성일**: 2026-01-14  
**벤치마킹**: PFMEA 모듈화 구조  
**목표**: 모듈화, 공용화, 표준화, 인라인 스타일 제거, 500줄 규칙 준수

---

## 📊 현재 상태 분석

### 1. 파일 라인 수 현황

| 파일 | 현재 라인 수 | 목표 라인 수 | 상태 |
|------|-------------|-------------|------|
| `dfmea/worksheet/page.tsx` | **787줄** | ≤500줄 | ❌ 초과 |
| `dfmea/import/page.tsx` | **965줄** | ≤500줄 | ❌ 초과 |
| `dfmea/revision/page.tsx` | 미확인 | ≤500줄 | 확인 필요 |

### 2. 인라인 스타일 사용 현황

**발견된 인라인 스타일 위치:**
- `dfmea/worksheet/page.tsx`: `style={dynamicBgStyle(...)}`
- `dfmea/worksheet/components/TopMenuBar.tsx`: 다수 인라인 스타일
- `dfmea/worksheet/tabs/failure/FailureLinkTables.tsx`: 다수 인라인 스타일
- `dfmea/worksheet/tabs/all/AllTabWithLinks.tsx`: 다수 인라인 스타일
- `dfmea/revision/page.tsx`: `style={headerCellStyle(...)}`

**총 발견 건수**: 907건 (grep 결과)

### 3. PFMEA 벤치마킹 분석

**PFMEA 모듈화 구조 (참고):**
```
pfmea/worksheet/
├── page.tsx (700줄 이하) ✅
├── constants.ts
├── components/
│   ├── TopMenuBar.tsx (Tailwind CSS 사용) ✅
│   ├── TabMenu.tsx
│   └── ...
├── hooks/
│   ├── useWorksheetState.ts
│   └── usePageHandlers.ts
├── tabs/
│   ├── StructureTab.tsx
│   ├── FunctionTab.tsx
│   ├── failure/
│   └── all/
├── utils/
└── panels/
```

**DFMEA 현재 구조:**
```
dfmea/worksheet/
├── page.tsx (787줄) ❌
├── PageStyles.ts (인라인 스타일 분리 시도)
├── components/
│   ├── TopMenuBar.tsx (인라인 스타일 다수) ❌
│   └── ...
├── tabs/
│   ├── failure/
│   │   ├── FailureLinkTables.tsx (인라인 스타일 다수) ❌
│   │   └── FailureLinkTab.tsx (인라인 스타일 다수) ❌
│   └── all/
│       └── AllTabWithLinks.tsx (인라인 스타일 다수) ❌
└── ...
```

---

## 🎯 모듈화 목표

### 1. 핵심 원칙
- ✅ **500줄 규칙**: 모든 파일 500줄 이하 (이상적 150줄)
- ✅ **인라인 스타일 제거**: Tailwind CSS 또는 별도 스타일 파일 사용
- ✅ **공용화**: PFMEA와 공통 컴포넌트/유틸리티 공유
- ✅ **표준화**: PFMEA 구조 벤치마킹하여 동일한 패턴 적용

### 2. 파일 구조 재설계

```
dfmea/
├── worksheet/
│   ├── page.tsx (목표: ≤500줄)
│   ├── constants.ts
│   ├── components/
│   │   ├── TopMenuBar.tsx (Tailwind CSS로 전환)
│   │   ├── TabMenu.tsx
│   │   └── ...
│   ├── hooks/
│   │   ├── useWorksheetState.ts
│   │   └── usePageHandlers.ts
│   ├── tabs/
│   │   ├── StructureTab.tsx
│   │   ├── FunctionTab.tsx
│   │   ├── failure/
│   │   │   ├── FailureLinkTables.tsx (스타일 파일 분리)
│   │   │   ├── FailureLinkTables.styles.ts (신규)
│   │   │   └── ...
│   │   └── all/
│   │       ├── AllTabWithLinks.tsx (스타일 파일 분리)
│   │       └── AllTabWithLinks.styles.ts (신규)
│   ├── utils/
│   └── styles/ (신규)
│       ├── worksheet.styles.ts
│       └── ...
├── import/
│   ├── page.tsx (목표: ≤500줄)
│   ├── components/ (신규)
│   │   ├── ImportPreview.tsx
│   │   ├── ImportStats.tsx
│   │   └── ...
│   ├── hooks/
│   └── utils/
└── revision/
    ├── page.tsx (목표: ≤500줄)
    └── components/ (신규)
        └── RevisionTable.tsx
```

---

## 📋 단계별 실행 계획

### Phase 1: 인라인 스타일 제거 (우선순위: P0)

#### 1.1 스타일 파일 생성 및 분리

**대상 파일:**
1. `dfmea/worksheet/components/TopMenuBar.tsx`
   - 현재: 인라인 스타일 다수 (`style={topMenuBarStyle}`, `style={saveButtonStyle(...)}`)
   - 조치: `TopMenuBar.styles.ts` 생성 또는 Tailwind CSS로 전환
   - 참고: `pfmea/worksheet/components/TopMenuBar.tsx` (Tailwind CSS 사용)

2. `dfmea/worksheet/tabs/failure/FailureLinkTables.tsx`
   - 현재: 인라인 스타일 다수 (`style={flexContainerStyle(...)}`, `style={headerStyle(...)}`)
   - 조치: `FailureLinkTables.styles.ts` 생성

3. `dfmea/worksheet/tabs/all/AllTabWithLinks.tsx`
   - 현재: 인라인 스타일 다수 (`style={headerCellStyle(...)}`, `style={colHeaderStyle(...)}`)
   - 조치: `AllTabWithLinks.styles.ts` 생성

4. `dfmea/worksheet/page.tsx`
   - 현재: `style={dynamicBgStyle(...)}`
   - 조치: Tailwind CSS 클래스로 전환 또는 `PageStyles.ts` 활용

5. `dfmea/revision/page.tsx`
   - 현재: `style={headerCellStyle(...)}`
   - 조치: Tailwind CSS 클래스로 전환

**작업 방법:**
```typescript
// Before (인라인 스타일)
<div style={topMenuBarStyle}>...</div>

// After 1 (Tailwind CSS - 권장)
<div className="flex items-center justify-between bg-[#1a237e] text-white px-4 py-2">...</div>

// After 2 (별도 스타일 파일)
// TopMenuBar.styles.ts
export const topMenuBarStyle = "flex items-center justify-between bg-[#1a237e] text-white px-4 py-2";
// TopMenuBar.tsx
import { topMenuBarStyle } from './TopMenuBar.styles';
<div className={topMenuBarStyle}>...</div>
```

#### 1.2 PFMEA 스타일 패턴 벤치마킹

**PFMEA TopMenuBar 분석:**
- Tailwind CSS 클래스 사용 (`className="px-1.5 sm:px-2 lg:px-3 ..."`)
- 인라인 스타일 없음
- 반응형 디자인 적용

**적용 방안:**
- DFMEA TopMenuBar를 PFMEA와 동일한 패턴으로 재작성
- 공용 스타일 유틸리티 생성 (`@/styles/worksheet.ts` 활용)

---

### Phase 2: worksheet/page.tsx 모듈화 (목표: 787줄 → ≤500줄)

#### 2.1 컴포넌트 분리

**분리 대상:**
1. **FailureLinkResult 렌더링 로직** (예상: ~100줄)
   - 파일: `components/FailureLinkResult.tsx` (이미 존재하나 page.tsx에서 직접 렌더링)
   - 조치: 컴포넌트로 완전 분리

2. **모달 렌더링 로직** (예상: ~50줄)
   - 파일: `components/Modals.tsx` (신규)
   - 내용: ProcessSelectModal, WorkElementSelectModal, SpecialCharMasterModal 등

3. **우측 패널 렌더링 로직** (예상: ~80줄)
   - 파일: `components/RightPanel.tsx` (신규)
   - 내용: APTableInline, AllTabRightPanel 등

#### 2.2 훅 분리

**분리 대상:**
1. **페이지 핸들러 로직** (예상: ~150줄)
   - 파일: `hooks/usePageHandlers.ts` (신규 또는 기존 확장)
   - 내용: handleExport, handleImport, handleDownloadTemplate 등

2. **모달 상태 관리** (예상: ~50줄)
   - 파일: `hooks/useModalState.ts` (신규)
   - 내용: isProcessModalOpen, isWorkElementModalOpen 등 상태 관리

#### 2.3 예상 결과

```
Before: page.tsx (787줄)
After:
  - page.tsx (~400줄) ✅
  - components/FailureLinkResult.tsx (기존 확장)
  - components/Modals.tsx (~50줄) ✅
  - components/RightPanel.tsx (~80줄) ✅
  - hooks/usePageHandlers.ts (~150줄) ✅
  - hooks/useModalState.ts (~50줄) ✅
```

---

### Phase 3: import/page.tsx 모듈화 (목표: 965줄 → ≤500줄)

#### 3.1 컴포넌트 분리

**분리 대상:**
1. **ImportPreview 컴포넌트** (예상: ~200줄)
   - 파일: `components/ImportPreview.tsx` (신규)
   - 내용: ImportPreviewGrid, RelationPreview 등

2. **ImportStats 컴포넌트** (예상: ~100줄)
   - 파일: `components/ImportStats.tsx` (이미 존재하나 page.tsx에서 직접 사용)
   - 조치: 완전 분리

3. **ImportMenuBar 컴포넌트** (예상: ~150줄)
   - 파일: `components/ImportMenuBar.tsx` (신규)
   - 내용: 파일 선택, Import 버튼, 상태 표시 등

#### 3.2 훅 분리

**분리 대상:**
1. **Import 핸들러 로직** (예상: ~200줄)
   - 파일: `hooks/useImportHandlers.ts` (기존 확장)
   - 내용: handleFullImport, handleGroupImport, handleItemImport 등

2. **Preview 핸들러 로직** (예상: ~100줄)
   - 파일: `hooks/usePreviewHandlers.ts` (기존 확장)
   - 내용: handlePreviewTabChange, handleRowSelect 등

#### 3.3 예상 결과

```
Before: import/page.tsx (965줄)
After:
  - page.tsx (~450줄) ✅
  - components/ImportPreview.tsx (~200줄) ✅
  - components/ImportMenuBar.tsx (~150줄) ✅
  - hooks/useImportHandlers.ts (~200줄) ✅
  - hooks/usePreviewHandlers.ts (~100줄) ✅
```

---

### Phase 4: 공용화 및 표준화

#### 4.1 공용 컴포넌트 생성

**대상:**
1. **공용 TopMenuBar** (선택적)
   - 파일: `@/components/worksheet/CommonTopMenuBar.tsx` (신규)
   - 내용: PFMEA/DFMEA 공통 메뉴바 로직
   - Props: `variant: 'pfmea' | 'dfmea'`

2. **공용 스타일 유틸리티**
   - 파일: `@/styles/worksheet.ts` (확장)
   - 내용: 버튼, 배지, 셀 스타일 등

#### 4.2 표준화

**PFMEA 패턴 적용:**
1. 파일 구조 표준화
2. 네이밍 컨벤션 통일
3. 타입 정의 표준화
4. 훅 패턴 통일

---

## 🔧 실행 방법

### 옵션 1: 기존 코드 수정 (권장)

**장점:**
- 기존 로직 유지
- 점진적 개선 가능

**단계:**
1. Phase 1: 인라인 스타일 제거 (1일)
2. Phase 2: worksheet/page.tsx 모듈화 (2일)
3. Phase 3: import/page.tsx 모듈화 (2일)
4. Phase 4: 공용화 및 표준화 (1일)

**총 예상 기간**: 6일

### 옵션 2: PFMEA 코드 복사 후 재작성 (대안)

**장점:**
- 완벽한 모듈화 구조 확보
- 인라인 스타일 완전 제거

**단점:**
- 기존 로직 재작성 필요
- 테스트 시간 증가

**단계:**
1. PFMEA worksheet 구조 전체 복사
2. DFMEA 컬럼 정의로 교체
3. DFMEA 특화 로직 추가
4. 테스트 및 검증

**총 예상 기간**: 10일

---

## ✅ 검증 기준

### 1. 라인 수 검증
```bash
# 모든 파일 500줄 이하 확인
find src/app/dfmea -name "*.tsx" -o -name "*.ts" | xargs wc -l
```

### 2. 인라인 스타일 검증
```bash
# 인라인 스타일 검색 (0건 목표)
grep -r "style=\{" src/app/dfmea
```

### 3. 빌드 검증
```bash
npm run build
```

### 4. 타입 검증
```bash
npm run type-check
```

---

## 📝 체크리스트

### Phase 1: 인라인 스타일 제거
- [ ] `TopMenuBar.tsx` 인라인 스타일 제거
- [ ] `FailureLinkTables.tsx` 인라인 스타일 제거
- [ ] `AllTabWithLinks.tsx` 인라인 스타일 제거
- [ ] `page.tsx` 인라인 스타일 제거
- [ ] `revision/page.tsx` 인라인 스타일 제거
- [ ] grep 검증: `style=\{` 0건

### Phase 2: worksheet/page.tsx 모듈화
- [ ] `components/Modals.tsx` 생성
- [ ] `components/RightPanel.tsx` 생성
- [ ] `hooks/usePageHandlers.ts` 생성/확장
- [ ] `hooks/useModalState.ts` 생성
- [ ] `page.tsx` 라인 수 ≤500줄 확인

### Phase 3: import/page.tsx 모듈화
- [ ] `components/ImportPreview.tsx` 생성
- [ ] `components/ImportMenuBar.tsx` 생성
- [ ] `hooks/useImportHandlers.ts` 확장
- [ ] `hooks/usePreviewHandlers.ts` 확장
- [ ] `page.tsx` 라인 수 ≤500줄 확인

### Phase 4: 공용화 및 표준화
- [ ] 공용 컴포넌트 생성 (선택적)
- [ ] 공용 스타일 유틸리티 확장
- [ ] 파일 구조 표준화
- [ ] 네이밍 컨벤션 통일

---

## 🎯 최종 목표

1. ✅ 모든 파일 500줄 이하
2. ✅ 인라인 스타일 0건
3. ✅ PFMEA와 동일한 모듈화 구조
4. ✅ 공용 컴포넌트/유틸리티 활용
5. ✅ 표준화된 코드 패턴

---

## 📅 일정

| Phase | 작업 내용 | 예상 기간 | 우선순위 |
|-------|----------|----------|----------|
| Phase 1 | 인라인 스타일 제거 | 1일 | P0 |
| Phase 2 | worksheet/page.tsx 모듈화 | 2일 | P1 |
| Phase 3 | import/page.tsx 모듈화 | 2일 | P1 |
| Phase 4 | 공용화 및 표준화 | 1일 | P2 |

**총 예상 기간**: 6일

---

## 🔍 검토 의견

### 권장 사항

1. **옵션 1 (기존 코드 수정) 권장**
   - 점진적 개선으로 리스크 최소화
   - 기존 로직 유지로 테스트 시간 단축
   - Phase별로 검증 가능

2. **인라인 스타일 제거 우선**
   - 가장 빠른 개선 효과
   - 코드 가독성 향상
   - 유지보수성 개선

3. **PFMEA 패턴 벤치마킹**
   - 검증된 구조 활용
   - 일관성 확보
   - 공용화 기반 마련

### 주의사항

1. **기존 기능 유지**
   - 모듈화 과정에서 기능 손실 방지
   - 충분한 테스트 필요

2. **타입 안정성**
   - TypeScript 타입 정의 완료
   - 타입 체크 통과 확인

3. **빌드 검증**
   - 각 Phase 완료 후 빌드 테스트
   - 런타임 오류 방지

---

## 📅 마지막 업데이트: 2026-01-14

