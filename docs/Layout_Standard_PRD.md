# FMEA On-Premise System - 화면 레이아웃 표준 정의서 (Layout PRD)

## 1. 개요
본 문서는 FMEA 시스템(PFMEA, DFMEA, APQP 등)의 일관된 사용자 경험을 제공하기 위한 화면 레이아웃 표준 규격(Pixel-perfect Standard)을 정의한다.
모든 페이지 개발 및 수정은 본 PRD의 수치를 기준으로 수행되어야 한다.

## 2. 공통 레이아웃 (Global Layout)

시스템의 기본 골격인 `FixedLayout` 컴포넌트가 준수해야 할 표준이다.

### 2.1. 상단 네비게이션 (Top Navigation)
- **높이 (Height)**: `48px` 고정
- **위치 (Position)**: `fixed`, `top: 0`, `left: 0`, `right: 0`
- **Z-Index**: `1001` (가장 상위 레벨, 사이드바보다 위)
- **배경색**: Brand Color (Purple/Blue Gradient)

### 2.2. 사이드바 (Sidebar)
- **위치 (Position)**: `fixed`, `top: 0`, `left: 0`, `bottom: 0` (TopNav 아래가 아닌 전체 높이)
- **기본 너비 (Collapsed)**: `48px`
- **확장 너비 (Expanded)**: `180px`
- **Z-Index**: `1000` (TopNav보다 아래, 콘텐츠보다 위)
- **동작**: 마우스 호버 시 확장, 핀 고정 시 180px 유지.

### 2.3. 콘텐츠 영역 (Main Content)
- **상단 여백 (Margin Top)**: `48px` (TopNav 높이만큼)
- **좌측 여백 (Margin Left)**: 사이드바 너비(`48px` or `180px`)와 연동
- **간격 (Gap)**: 사이드바와 콘텐츠 사이 **`5px`** 필수 간격 (배경색 노출)
  - 구현: `padding-left: 5px` on Content Container
- **배경색**: `#f0f0f0` (Light Gray)

---

## 3. 워크시트 레이아웃 (Worksheet Layout)

DFMEA, PFMEA 워크시트 페이지 내부의 표준 레이아웃이다.

### 3.1. 상단 툴바 (Top Menu Bar)
- **구성**: FMEA 선택, 저장 버튼, 내보내기 등
- **높이**: `auto` (내부 콘텐츠에 따름, 보통 `40px` ~ `50px`)
- **고정 여부 (Sticky)**: **Non-sticky** (표준)
  - 스크롤 시 상단 네비게이션과 함께 위로 올라감.
  - *사유: 화면 작업 영역(Table)을 최대한 넓게 쓰기 위함.*

### 3.2. 탭 메뉴 (Tab Menu)
- **위치**: 툴바 바로 아래
- **높이**: `36px` (`h-9`)
- **배경색**: `bg-gradient-to-r from-indigo-900 to-indigo-800`
- **보더**: 하단 `2px` (`border-indigo-950`)

### 3.3. 메인 테이블 영역 (Main Table)
- **위치**: 탭 메뉴 아래
- **높이**: `flex-1` (남은 공간 전체)
- **스크롤**: 내부 스크롤 (`overflow-auto`)
- **헤더**: 테이블 자체 헤더(Sticky Header) 사용

### 3.4. 우측 패널 (Right Panel - Tree/Property View)
- **위치**: 화면 최우측
- **너비**: **`220px`** 고정 (기존 350px에서 축소)
- **배경색**: `#f0f4f8`
- **구분선**: 좌측 `1px` border

---

## 4. 레이아웃 계층 다이어그램 (Z-Index Layer)

```text
[Z-1001] Top Navigation (H: 48px)
-------------------------------------------------------
[Z-1000] Sidebar (W: 48/180px) | [Content Area]
                               | (Gap: 5px)
                               | [Toolbar]
                               | [Tab Menu (H: 36px)]
                               | [Main Table (Flex-1)] | [Right Panel (W: 220px)]
-------------------------------------------------------
```

## 5. 구현 체크리스트

1. [ ] `FixedLayout.tsx`: `padding-left: 5px` 적용 확인.
2. [ ] `Sidebar.tsx`: `z-index: 1000` 확인.
3. [ ] `*TopNav.tsx`: `height: 48px`, `z-index: 1001` 확인.
4. [ ] `Worksheet Page`: 우측 패널 `w-[220px]` 적용 확인.
5. [ ] `Worksheet Page`: Sticky 컨테이너 제거 확인 (PFMEA 표준 준수).
