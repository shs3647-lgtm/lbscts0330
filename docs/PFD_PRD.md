# PFD (Process Flow Diagram) 모듈 제품 요구사항 정의서 (PRD)

## 1. 📋 개요 (Overview)
- **프로젝트명**: FMEA On-Premise Solution - PFD Module
- **문서 버전**: 2.0.0 (Refactored based on PM Module architecture)
- **작성일**: 2026-02-01
- **목적**: 제조 공정 흐름도(PFD)를 작성하고, 관련 설비/부품 및 특성 정보를 관리하여 FMEA 및 CP와 연계
- **상태**: ✅ 기능 고도화 완료

## 2. 🎯 배경 및 목적 (Background & Goals)
### 2.1 배경
PM 모듈에서 검증된 모듈화 아키텍처와 관리 편의성(모달 기반 데이터 관리)을 PFD 모듈에도 적용하여 일관된 사용자 경험을 제공하고 유지보수성을 향상시킴.

### 2.2 핵심 목표
- **Look & Feel 통일**: PM 모듈과 동일한 UX/UI 제공 (설비/부품 관리 모달 등)
- **데이터 일관성**: CP 및 FMEA 모듈과의 데이터 연동성 강화 (정방향/역방향 연동 UI)
- **품질 보증**: TDD 기반의 테스트 자동화 구축

## 3. 🛠 기술 스펙 (Technical Spec)
### 3.1 아키텍처
- **Front-end**: Next.js 14+ (App Router), TypeScript, Tailwind CSS
- **Design Pattern**: Container-Presenter 패턴
  - `page.tsx`: 컨테이너, 상태 조합 (State, Handler)
  - `components/`: PfdEquipmentModal, PfdPartsModal 등 순수 UI 컴포넌트
  - `hooks/`: usePfdData, useModalHandlers 등 비즈니스 로직

### 3.2 주요 컴포넌트 구조
```
src/app/pfd/worksheet/
├── components/          # UI 컴포넌트
│   ├── PfdEquipmentModal.tsx # (New) 설비 관리 모달
│   ├── PfdPartsModal.tsx     # (New) 부품 리스트 관리 모달
│   ├── PfdTopMenuBar.tsx     # 버튼 및 연동 메뉴
│   ├── PfdTableBody.tsx      # 워크시트 메인 테이블
│   └── ...
├── hooks/               # 비즈니스 로직
│   ├── usePfdData.ts    # 데이터 상태 및 마스터 데이터 관리
│   ├── useModalHandlers.ts # 모달 제어
│   └── ...
└── types.ts             # 타입 정의 (equipmentTools, partItems 추가)
```

## 4. 📱 주요 기능 (Key Features)

### 4.1 PFD 워크시트
- **공정 흐름 관리**: 공정번호, 공정명, 상세설명, 4대 기호(Work, Transport, Storage, Inspect)
- **설비 및 특성 관리**: 설비명, 제품특성, 공정특성, SC 관리
- **연동 기능**: FMEA, CP와의 데이터 동기화 (Import/Export 개념)

### 4.2 데이터 관리 모달 (신규 추가)
- **설비/TOOL 관리 (`PfdEquipmentModal`)**
  - 공통 설비/Tool 리스트 CRUD
  - 실시간 유효성 검증
  - UI: PM 모듈과 동일한 Blue 테마 적용
- **부품 리스트 관리 (`PfdPartsModal`)**
  - 부품명 및 수량 관리
  - UI: PM 모듈과 동일한 Green 테마 적용

## 5. 🧪 테스트 및 품질 보증 (QA)
### 5.1 테스트 커버리지
- **Playwright E2E Test**: `tests/pfd-equipment-parts-modal.spec.ts`
- **검증 항목**:
  1. UI 버튼 존재 여부
  2. 설비 모달 열기/닫기 및 CRUD
  3. 부품 모달 열기/닫기 및 CRUD
  4. 데이터 상태 유지 (5회 반복)

## 6. 🚀 실행 가이드
```bash
# PFD 모듈 검증
npx playwright test tests/pfd-equipment-parts-modal.spec.ts

# 통합 회귀 검증
npx playwright test tests/ws-*.spec.ts tests/pm-*.spec.ts tests/pfd-*.spec.ts --reporter=list --workers=1
```

## 7. 📅 변경 이력 (Changelog)
- **v2.0.0 (2026-02-01)**: 
  - PM 모듈의 모달 시스템을 PFD에 이식
  - PfdTopMenuBar 버튼 추가 및 연동
  - TDD 테스트 스위트 작성
