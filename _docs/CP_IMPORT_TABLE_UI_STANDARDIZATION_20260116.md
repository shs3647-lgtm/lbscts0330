# CP Import 테이블 UI 개선 및 컬럼 너비 표준화

**작성일**: 2026-01-16  
**커밋**: `9be1e99` feat(cp): CP Import 테이블 UI 개선 및 컬럼 너비 표준화  
**코드프리즈**: `codefreeze-20260116-044816`

---

## 📋 개요

CP Import 미리보기 테이블의 텍스트 깨짐 문제를 해결하고, 컬럼 너비를 표준화하여 일관성 있는 UI를 제공합니다.

### 주요 개선 사항

1. **텍스트 줄바꿈 처리**: `truncate` 제거 → `whitespace-pre-wrap break-words` 적용
2. **행 높이 자동 조절**: 고정 높이(`h-5`) → 최소 높이(`min-h-5`)로 변경
3. **편집 모드 개선**: `input` → `textarea`로 변경하여 멀티라인 편집 지원
4. **컬럼 너비 표준화**: 6단계 표준 너비 체계 도입

---

## 🎨 컬럼 너비 표준화

### 표준 너비 체계

| 구분 | 너비 | 용도 |
|------|------|------|
| **소** | 40px | 레벨, 샘플, 주기, 책임1, 책임2 |
| **중소** | 60px | 공정번호, 공정명, 특별특성 |
| **중** | 100px | EP, 자동검사, 제품특성, 공정특성, 스펙/공차 |
| **중대** | 120px | 설비/금형 |
| **대** | 150px | 평가방법, 조치방법 |
| **특대** | 200px | 공정설명 |

### 컬럼별 상세 너비

#### 공정현황 (5컬럼) - 합계: 480px
- 공정번호: **60px** (중소)
- 공정명: **60px** (중소)
- 레벨: **40px** (소)
- 공정설명: **200px** (특대)
- 설비/금형: **120px** (중대)

#### 검출장치 (2컬럼) - 합계: 200px
- EP: **100px** (중)
- 자동검사: **100px** (중)

#### 관리항목 (4컬럼) - 합계: 360px
- 제품특성: **100px** (중)
- 공정특성: **100px** (중)
- 특별특성: **60px** (중소)
- 스펙/공차: **100px** (중)

#### 관리방법 (5컬럼) - 합계: 310px
- 평가방법: **150px** (대)
- 샘플: **40px** (소)
- 주기: **40px** (소)
- 책임1: **40px** (소)
- 책임2: **40px** (소)

#### 대응계획 (1컬럼) - 합계: 150px
- 조치방법: **150px** (대)

### 테이블 전체 너비

- **데이터 컬럼**: 1,500px
- **관리 컬럼** (체크박스, No, 작업): 80px
- **총 너비**: **1,580px**

---

## 🔧 기술적 변경 사항

### 1. 셀 스타일 개선 (`constants.ts`)

**변경 전:**
```typescript
cell: "border border-gray-300 px-0.5 py-0.5 text-[10px] text-gray-800 truncate font-normal antialiased"
```

**변경 후:**
```typescript
cell: "border border-gray-300 px-0.5 py-0.5 text-[10px] text-gray-800 whitespace-pre-wrap break-words font-normal antialiased"
```

**효과:**
- `truncate` 제거로 텍스트 잘림 방지
- `whitespace-pre-wrap`으로 줄바꿈 문자 인식
- `break-words`로 긴 단어 자동 줄바꿈

### 2. 행 높이 자동 조절 (`PreviewTable.tsx`)

**변경 전:**
```tsx
<tr className={`h-5 ${...}`}>
```

**변경 후:**
```tsx
<tr className={`min-h-5 ${...}`}>
```

**효과:**
- 고정 높이에서 최소 높이로 변경
- 텍스트 줄바꿈 시 행 높이 자동 확장

### 3. 편집 모드 개선 (`PreviewTable.tsx`)

**변경 전:**
```tsx
<input 
  type="text" 
  value={...} 
  onChange={...}
  className="w-full px-0.5 py-0 border border-blue-400 rounded text-[10px] bg-white focus:outline-none font-normal antialiased" 
/>
```

**변경 후:**
```tsx
<textarea 
  value={...} 
  onChange={...}
  className="w-full px-0.5 py-0 border border-blue-400 rounded text-[10px] bg-white focus:outline-none font-normal antialiased resize-none min-h-[18px]"
  rows={1}
/>
```

**효과:**
- 멀티라인 텍스트 입력 지원
- 줄바꿈된 텍스트 편집 가능

### 4. 셀 정렬 개선

**추가:**
```tsx
<td className={`${tw.cell} align-top ${...}`}>
```

**효과:**
- 상단 정렬로 여러 줄 텍스트 가독성 향상

---

## 📁 수정된 파일

### 1. `src/app/control-plan/import/constants.ts`
- `PREVIEW_COLUMNS`: 컬럼 너비 표준화
- `tw.cell`, `tw.cellPad`, `tw.cellCenter`: 줄바꿈 스타일 적용

### 2. `src/app/control-plan/import/components/PreviewTable.tsx`
- 행 높이: `h-5` → `min-h-5`
- 편집 모드: `input` → `textarea`
- 셀 정렬: `align-top` 추가
- 텍스트 표시: `whitespace-pre-wrap` 추가

---

## ✅ 개선 효과

### Before (문제점)
- 텍스트가 셀 너비를 초과하여 잘림 (`truncate`)
- EP, 자동검사 컬럼의 텍스트가 인접 컬럼과 겹침
- 긴 텍스트 입력 시 가독성 저하
- 컬럼 너비가 일관성 없음

### After (개선)
- 텍스트가 자동으로 줄바꿈되어 전체 내용 표시
- 컬럼 간 텍스트 겹침 문제 해결
- 멀티라인 텍스트 편집 지원
- 표준화된 컬럼 너비로 일관성 있는 UI

---

## 🔄 유지보수 가이드

### 컬럼 너비 변경 시

1. `constants.ts`의 `PREVIEW_COLUMNS` 배열에서 해당 컬럼의 `width` 값 수정
2. 표준 너비 체계 준수 권장:
   - 40px (소), 60px (중소), 100px (중), 120px (중대), 150px (대), 200px (특대)
3. 테이블 전체 너비(`PreviewTable.tsx`) 조정:
   - 변경된 컬럼 너비 차이만큼 총 너비에 반영

### 예시: 컬럼 너비 변경

```typescript
// Before
{ key: 'ep', label: 'EP', width: 'w-[100px]', group: 'detector' },

// After (120px로 변경)
{ key: 'ep', label: 'EP', width: 'w-[120px]', group: 'detector' },
```

그리고 테이블 전체 너비도 조정:
```tsx
// Before
<table className="... w-[1580px] min-w-[1580px] max-w-[1580px] ...">

// After (+20px)
<table className="... w-[1600px] min-w-[1600px] max-w-[1600px] ...">
```

---

## 📝 참고 사항

- 테이블은 `table-fixed` 레이아웃 사용
- 컬럼 너비는 `<colgroup>`의 `<col>` 태그로 정의
- 줄바꿈은 `whitespace-pre-wrap`과 `break-words` 조합으로 처리
- 편집 모드에서 `textarea`는 `resize-none`으로 크기 조절 비활성화

---

## 🔗 관련 문서

- `CODEFREEZE_CP_IMPORT_LAYOUT_20260114.md`: CP Import 레이아웃 설계
- `CODEFREEZE_CP_IMPORT_MODULARIZATION_20260114.md`: CP Import 모듈화
- `CP_IMPORT_SAVE_GUIDE.md`: CP Import 저장 가이드

---

**작성자**: AI Assistant  
**검토일**: 2026-01-16  
**버전**: 1.0
