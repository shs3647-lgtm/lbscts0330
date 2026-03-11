# 코드프리즈: CP Import 페이지 전체 기능 완성

**코드프리즈 날짜**: 2026-01-13  
**태그**: `codefreeze-20260113-cp-import-complete`  
**커밋**: `97ee717426902cbdfd42796d1c9387afd6acd69c`

## 핵심 변경 내용

### 1. 전체 Import 기능 완성
- **이전**: 임시 샘플 데이터만 표시
- **현재**: Excel 파일의 모든 시트(5개)의 모든 행과 열 데이터 파싱
- **시트별 파싱**: 공정현황, 검출장치, 관리항목, 관리방법, 대응계획
- **데이터 추출**: 빈 값도 포함하여 모든 컬럼 데이터 추출

### 2. 헤더 고정 기능
- **1행 헤더**: `sticky top-0` 적용 (그룹 헤더)
- **2행 헤더**: `sticky top-[18px]` 적용 (컬럼 헤더)
- **3행부터**: 세로 스크롤로 이동

### 3. 전역 스크롤 제거
- **ControlPlanLayout**: `min-h-screen` → `h-screen overflow-hidden`
- **CP Import 페이지**: `min-h-screen` → `h-screen overflow-hidden flex flex-col`
- **결과**: 사이드바와 전체 화면 고정, 미리보기 테이블만 스크롤

### 4. 좌우 스크롤바 연동
- **StatusBar**: `cp-import-scroll-container` 우선 인식
- **스크롤 상태 표시**: 좌우 스크롤바, 스크롤 퍼센트 표시
- **초기 로드 지연**: 100ms 지연 후 스크롤 상태 확인

### 5. 세로 스크롤바 스타일
- **커스텀 스크롤바**: `#cp-import-scroll-container` 전용 스타일
- **스크롤바 크기**: 세로 12px, 가로 12px
- **색상**: 트랙 `#e0e0e0`, 썸 `#1a237e` (호버 `#303f9f`)

### 6. 빈 행 증가
- **이전**: 10개
- **현재**: 20개 (세로 스크롤 테스트용)

### 7. 대응계획 → 조치방법 변경
- **1행 그룹 헤더**: "대응계획" 유지
- **2행 컬럼 헤더**: "조치방법"으로 변경

## 수정된 파일

### 1. `src/app/control-plan/import/page.tsx`
- `handleFullFileSelect`: 전체 Excel 파일 파싱 로직 구현
- `renderPreviewTable`: 헤더 고정, 빈 행 20개
- 미리보기 테이블 컨테이너: `id="cp-import-scroll-container"` 추가

### 2. `src/app/control-plan/layout.tsx`
- `min-h-screen` → `h-screen overflow-hidden` (전역 스크롤 제거)

### 3. `src/components/layout/StatusBar.tsx`
- `getScrollContainer`: `cp-import-scroll-container` 우선 인식
- 초기 로드 지연: 100ms 후 스크롤 상태 확인

### 4. `src/app/globals.css`
- `#cp-import-scroll-container` 스크롤바 스타일 추가
- 세로/가로 스크롤바 커스터마이징

## 동작 방식

### 전체 Import 프로세스
1. Excel 파일 선택
2. 모든 시트 순회 (5개 시트)
3. 각 시트의 3행부터 데이터 읽기 (1행: 헤더, 2행: 안내)
4. 모든 컬럼 데이터 추출 (빈 값 포함)
5. `ImportedData[]` 형식으로 변환
6. 미리보기 테이블에 표시

### 스크롤 동작
- **전역 스크롤**: 제거됨 (사이드바, 전체 화면 고정)
- **미리보기 테이블**: 세로/가로 스크롤 가능
- **헤더 고정**: 1행, 2행 헤더는 스크롤 시에도 고정

### StatusBar 연동
- `cp-import-scroll-container` 우선 인식
- 스크롤 가능 시 좌우 스크롤바 표시
- 스크롤 불가능 시 "스크롤 없음" 표시

## 롤백 방법

```bash
git checkout codefreeze-20260113-cp-import-complete^
```

또는

```bash
git reset --hard 97ee717426902cbdfd42796d1c9387afd6acd69c^
```

## 관련 문서
- `src/app/control-plan/import/page.tsx`: Import 페이지 메인 컴포넌트
- `src/app/control-plan/import/constants.ts`: 상수 정의
- `src/components/layout/StatusBar.tsx`: 상태바 컴포넌트
- `src/app/globals.css`: 전역 스타일

