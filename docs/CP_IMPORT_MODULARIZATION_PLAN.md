# CP Import 페이지 모듈화 계획

**작성일**: 2026-01-14  
**현재 상태**: 777줄 (700줄 초과, 분리 필수)  
**목표**: 500줄 이하로 분리 (모듈화 가이드 준수)

## 📋 현재 파일 구조

```
src/app/control-plan/import/
├── page.tsx                    # 777줄 ❌ (분리 필요)
├── constants.ts                # ✅ 존재
├── types.ts                    # ✅ 존재
├── excel-template.ts           # ✅ 존재
└── hooks/
    ├── useImportHandlers.ts    # ✅ 존재
    └── index.ts                # ✅ 존재
```

## 🔍 현재 코드 분석

### page.tsx 주요 기능
1. **상태 관리** (약 50줄)
   - CP 목록, 선택된 CP, 미리보기 데이터
   - 편집 상태, 탭 상태
   - 저장 상태

2. **미리보기 테이블 렌더링** (약 250줄)
   - `renderPreviewTable`: 전체/그룹/개별 미리보기 테이블
   - 행별 편집/삭제/저장 UI
   - 헤더 렌더링

3. **Excel 파일 처리** (약 100줄)
   - 파일 선택 핸들러
   - Excel 파싱 로직 (useImportHandlers 사용)

4. **편집 핸들러** (약 150줄)
   - 행 편집 시작/저장/취소
   - 행 삭제
   - 데이터 저장

5. **UI 레이아웃** (약 200줄)
   - 헤더, 메뉴바, 탭
   - 3행 입력 영역
   - 미리보기 테이블 컨테이너
   - 하단 상태바

6. **기타** (약 27줄)
   - 통계 계산
   - 초기화 로직

## 📁 분리 계획 (Phase 1: 즉시 분리)

### 1. 컴포넌트 분리

#### `components/PreviewTable.tsx` (신규)
- **기능**: 미리보기 테이블 렌더링
- **예상 라인**: ~250줄
- **내용**:
  - `renderPreviewTable` 함수 → 컴포넌트로 변환
  - 행별 편집/삭제/저장 UI
  - 헤더 렌더링 로직
- **Props**:
  ```typescript
  interface PreviewTableProps {
    data: ImportedData[];
    columns: PreviewColumn[];
    editingRowId: string | null;
    editValues: Record<string, string>;
    onEditStart: (rowId: string) => void;
    onEditSave: (rowId: string) => void;
    onEditCancel: () => void;
    onDelete: (rowId: string) => void;
    onCellChange: (field: string, value: string) => void;
  }
  ```

#### `components/ImportMenuBar.tsx` (신규)
- **기능**: 3행 입력 영역 (메뉴바)
- **예상 라인**: ~100줄
- **내용**:
  - 파일 선택 입력
  - 시트 선택 드롭다운
  - 항목 선택 드롭다운
  - 저장 버튼
- **Props**:
  ```typescript
  interface ImportMenuBarProps {
    selectedSheet: string;
    selectedItem: string;
    onSheetChange: (sheet: string) => void;
    onItemChange: (item: string) => void;
    onFileSelect: (file: File) => void;
    onSave: () => void;
    isSaving: boolean;
    isSaved: boolean;
  }
  ```

#### `components/PreviewTabs.tsx` (신규)
- **기능**: 미리보기 탭 (전체/그룹/개별)
- **예상 라인**: ~50줄
- **내용**:
  - 탭 버튼 UI
  - 활성 탭 표시
- **Props**:
  ```typescript
  interface PreviewTabsProps {
    activeTab: PreviewTab;
    onTabChange: (tab: PreviewTab) => void;
    stats: { full: number; group: number; item: number };
  }
  ```

#### `components/ImportStatusBar.tsx` (신규)
- **기능**: 하단 상태바
- **예상 라인**: ~30줄
- **내용**:
  - 통계 표시
  - 버전 정보
- **Props**:
  ```typescript
  interface ImportStatusBarProps {
    stats: { full: number; group: number; item: number };
  }
  ```

### 2. 훅 분리 (확장)

#### `hooks/useEditHandlers.ts` (신규)
- **기능**: 행 편집 핸들러
- **예상 라인**: ~100줄
- **내용**:
  - 편집 시작/저장/취소
  - 행 삭제
  - 편집 값 관리
- **Returns**:
  ```typescript
  interface UseEditHandlersReturn {
    editingRowId: string | null;
    editValues: Record<string, string>;
    handleEditStart: (rowId: string) => void;
    handleEditSave: (rowId: string) => void;
    handleEditCancel: () => void;
    handleDelete: (rowId: string) => void;
    handleCellChange: (field: string, value: string) => void;
  }
  ```

#### `hooks/usePreviewData.ts` (신규)
- **기능**: 미리보기 데이터 관리
- **예상 라인**: ~80줄
- **내용**:
  - 전체/그룹/개별 데이터 상태
  - 데이터 변환 로직
  - 통계 계산
- **Returns**:
  ```typescript
  interface UsePreviewDataReturn {
    fullData: ImportedData[];
    groupData: ImportedData[];
    itemData: ImportedData[];
    stats: { full: number; group: number; item: number };
    updateData: (data: ImportedData[]) => void;
  }
  ```

### 3. 유틸리티 분리

#### `utils/dataTransformer.ts` (신규)
- **기능**: 데이터 변환 로직
- **예상 라인**: ~100줄
- **내용**:
  - Excel 데이터 → ImportedData 변환
  - 그룹/개별 데이터 분류
  - 데이터 검증
- **Functions**:
  ```typescript
  export function transformExcelData(rawData: any[]): ImportedData[];
  export function classifyData(data: ImportedData[]): {
    full: ImportedData[];
    group: ImportedData[];
    item: ImportedData[];
  };
  export function validateImportedData(data: ImportedData[]): ValidationResult;
  ```

## 📊 분리 후 예상 라인 수

### Phase 1: 즉시 분리

| 파일 | 현재 | 분리 후 | 차감 |
|------|------|---------|------|
| `page.tsx` | 777줄 | ~250줄 | -527줄 |
| `components/PreviewTable.tsx` | 0 | ~250줄 | +250줄 |
| `components/ImportMenuBar.tsx` | 0 | ~100줄 | +100줄 |
| `components/PreviewTabs.tsx` | 0 | ~50줄 | +50줄 |
| `components/ImportStatusBar.tsx` | 0 | ~30줄 | +30줄 |
| `hooks/useEditHandlers.ts` | 0 | ~100줄 | +100줄 |
| `hooks/usePreviewData.ts` | 0 | ~80줄 | +80줄 |
| `utils/dataTransformer.ts` | 0 | ~100줄 | +100줄 |
| **합계** | **777줄** | **~710줄** | **-67줄** |

**문제**: 여전히 700줄 초과!

### Phase 1.5: 추가 분리 (필수)

#### `components/PreviewTableRow.tsx` (신규)
- **기능**: 개별 행 렌더링
- **예상 라인**: ~80줄
- **효과**: PreviewTable에서 -80줄

#### `components/PreviewTableHeader.tsx` (신규)
- **기능**: 테이블 헤더 렌더링
- **예상 라인**: ~50줄
- **효과**: PreviewTable에서 -50줄

**Phase 1.5 후 예상 라인 수**:

| 파일 | 라인 수 |
|------|---------|
| `page.tsx` | ~250줄 |
| `components/PreviewTable.tsx` | ~120줄 |
| `components/PreviewTableRow.tsx` | ~80줄 |
| `components/PreviewTableHeader.tsx` | ~50줄 |
| `components/ImportMenuBar.tsx` | ~100줄 |
| `components/PreviewTabs.tsx` | ~50줄 |
| `components/ImportStatusBar.tsx` | ~30줄 |
| `hooks/useEditHandlers.ts` | ~100줄 |
| `hooks/usePreviewData.ts` | ~80줄 |
| `utils/dataTransformer.ts` | ~100줄 |
| **합계** | **~960줄** (총 라인 증가, but 모듈화 완료) |
| **최대 파일 라인 수** | **~250줄** ✅ (500줄 미만) |

## 🚀 향후 추가 기능 개발을 고려한 파일 구조

### Phase 2: 확장 가능한 구조 (향후 추가 기능)

```
src/app/control-plan/import/
├── page.tsx                           # ~250줄 (메인 페이지, 레이아웃만)
├── constants.ts                       # ✅ 상수 정의
├── types.ts                           # ✅ 타입 정의
├── excel-template.ts                  # ✅ Excel 템플릿
│
├── components/                        # UI 컴포넌트
│   ├── ImportMenuBar.tsx             # ~100줄 (메뉴바)
│   ├── PreviewTabs.tsx               # ~50줄 (탭)
│   ├── PreviewTable/                 # 테이블 관련 컴포넌트
│   │   ├── PreviewTable.tsx          # ~120줄 (테이블 컨테이너)
│   │   ├── PreviewTableHeader.tsx    # ~50줄 (헤더)
│   │   ├── PreviewTableRow.tsx       # ~80줄 (행)
│   │   └── PreviewTableCell.tsx      # ~60줄 (셀, 향후 추가)
│   ├── ImportStatusBar.tsx           # ~30줄 (상태바)
│   │
│   ├── filters/                      # 필터 관련 (향후 추가)
│   │   ├── DataFilter.tsx            # ~80줄
│   │   └── SearchBar.tsx             # ~50줄
│   │
│   ├── actions/                      # 액션 버튼 (향후 추가)
│   │   ├── BulkActions.tsx           # ~100줄
│   │   └── ExportButton.tsx          # ~50줄
│   │
│   └── validation/                   # 검증 UI (향후 추가)
│       ├── ValidationPanel.tsx       # ~80줄
│       └── ErrorList.tsx             # ~60줄
│
├── hooks/                            # 커스텀 훅
│   ├── useImportHandlers.ts          # ✅ Excel 처리
│   ├── useEditHandlers.ts            # ~100줄 (편집 핸들러)
│   ├── usePreviewData.ts             # ~80줄 (데이터 관리)
│   │
│   ├── useFilters.ts                 # ~80줄 (필터링, 향후 추가)
│   ├── useValidation.ts              # ~100줄 (검증, 향후 추가)
│   └── index.ts                      # ✅ Export
│
├── utils/                            # 유틸리티 함수
│   ├── dataTransformer.ts            # ~100줄 (데이터 변환)
│   │
│   ├── excelParser.ts                # ~150줄 (Excel 파싱, 향후 추가)
│   ├── validators.ts                 # ~100줄 (검증 로직, 향후 추가)
│   └── formatters.ts                 # ~80줄 (포맷팅, 향후 추가)
│
└── data/                             # 데이터 (향후 추가)
    ├── sheetMappings.ts              # ~50줄 (시트 매핑)
    └── columnDefinitions.ts          # ~80줄 (컬럼 정의)
```

## 📝 Phase 1 분리 작업 순서

### Step 1: 컴포넌트 분리 (우선순위 높음)

1. **PreviewTable 분리**
   - `components/PreviewTable.tsx` 생성
   - `renderPreviewTable` 함수 이동
   - Props 정의 및 연결

2. **PreviewTable 세부 분리**
   - `components/PreviewTableRow.tsx` 생성
   - `components/PreviewTableHeader.tsx` 생성

3. **ImportMenuBar 분리**
   - `components/ImportMenuBar.tsx` 생성
   - 3행 입력 영역 이동

4. **PreviewTabs 분리**
   - `components/PreviewTabs.tsx` 생성
   - 탭 UI 이동

5. **ImportStatusBar 분리**
   - `components/ImportStatusBar.tsx` 생성
   - 하단 상태바 이동

### Step 2: 훅 분리

6. **useEditHandlers 분리**
   - `hooks/useEditHandlers.ts` 생성
   - 편집 핸들러 로직 이동

7. **usePreviewData 분리**
   - `hooks/usePreviewData.ts` 생성
   - 데이터 관리 로직 이동

### Step 3: 유틸리티 분리

8. **dataTransformer 분리**
   - `utils/dataTransformer.ts` 생성
   - 데이터 변환 로직 이동

### Step 4: 통합 및 테스트

9. **page.tsx 정리**
   - import 정리
   - 컴포넌트 연결
   - 최종 라인 수 확인 (목표: ~250줄)

10. **테스트 및 검증**
    - 기능 테스트
    - 라인 수 확인 (모든 파일 500줄 미만)
    - 빌드 테스트

## ✅ 분리 완료 체크리스트

- [ ] 모든 파일 500줄 미만
- [ ] page.tsx 250줄 이하
- [ ] 컴포넌트 분리 완료
- [ ] 훅 분리 완료
- [ ] 유틸리티 분리 완료
- [ ] 기능 테스트 통과
- [ ] 빌드 테스트 통과
- [ ] TypeScript 타입 정의 완료

## 🎯 최종 목표

**Phase 1 완료 후**:
- `page.tsx`: ~250줄 ✅
- 최대 파일: ~250줄 ✅
- 모든 파일: 500줄 미만 ✅
- 모듈화 가이드 준수 ✅

**향후 확장성**:
- 새로운 컴포넌트 추가 용이
- 새로운 훅 추가 용이
- 새로운 유틸리티 추가 용이
- 유지보수 용이

## 📅 작업 일정 추정

- **Step 1 (컴포넌트 분리)**: ~2시간
- **Step 2 (훅 분리)**: ~1시간
- **Step 3 (유틸리티 분리)**: ~1시간
- **Step 4 (통합 및 테스트)**: ~1시간
- **총 예상 시간**: ~5시간

