# PM (Process Management) 모듈 제품 요구사항 정의서 (PRD)

## 1. 📋 개요 (Overview)
- **프로젝트명**: FMEA On-Premise Solution - PM Module
- **문서 버전**: 1.0.0
- **작성일**: 2026-02-01
- **목적**: 제조 공정 관리(Process Management)를 위한 웹 기반 워크시트 및 데이터 관리 시스템 구현
- **상태**: ✅ 구현 완료 (Released)

## 2. 🎯 배경 및 목적 (Background & Goals)
### 2.1 배경
기존 워크시트(WS) 모듈의 구조를 기반으로, 공정 관리(PM)에 특화된 별도의 모듈이 필요함. 설비, 부품, 공정 순서를 체계적으로 관리하고 FMEA 및 CP(Control Plan)와 연동되어야 함.

### 2.2 핵심 목표
- **모듈화**: WS 모듈과 독립적이면서도 아키텍처 패턴을 공유하는 고도화된 모듈 구조 확립
- **데이터 무결성**: 설비, 부품 데이터의 CRUD 및 유효성 검증
- **사용자 경험(UX)**: 직관적인 탭 UI, 모달 기반의 데이터 관리, 실시간 저장 상태 피드백
- **안정성**: TDD 기반의 5회 순차 회귀 테스트 및 통합 시나리오 통과

## 3. 🛠 기술 스펙 (Technical Spec)
### 3.1 아키텍처
- **Front-end**: Next.js 14+ (App Router), TypeScript, Tailwind CSS
- **Design Pattern**: Container-Presenter 패턴 변형 (Logic/View 분리)
  - `page.tsx`: 컨테이너, 상태 조합
  - `components/`: 순수 UI 컴포넌트
  - `hooks/`: 비즈니스 로직 (Custom Hooks)

### 3.2 주요 컴포넌트 구조
```
src/app/pm/worksheet/
├── components/          # UI 컴포넌트
│   ├── PmMainTab.tsx    # PM 메인 탭 (공정도, 작업표준)
│   ├── PmEquipmentModal.tsx # 설비 관리 모달
│   ├── PmPartsModal.tsx     # 부품 관리 모달
│   ├── PmTableBody.tsx  # 워크시트 메인 테이블
│   └── ...
├── hooks/               # 비즈니스 로직
│   ├── usePmData.ts     # 데이터 상태 관리
│   ├── useModalHandlers.ts # 모달 제어
│   └── ...
└── types.ts             # 타입 정의
```

## 4. 📱 주요 기능 (Key Features)

### 4.1 PM Main 탭 (표준정보 관리)
- **작업 공정도**: Drag & Drop 인터페이스 (Placeholder 구현)
- **작업 방법**: Step별 작업 내용 추가/삭제/수정
- **표준정보**: 표준번호, 제정/개정일자, 품번/품명 관리
- **안정장비**: 6대 안전장비 (장갑, 안전화 등) 토글 관리

### 4.2 PM Work Sheet 탭 (상세 공정)
- **공정 흐름**: Work, Transport, Storage, Inspect 아이콘 시각화
- **공정 상세**: Level, Description, 설비/치공구 매핑
- **특성 관리**: 제품 특성, 공정 특성, SC/Special Char 관리

### 4.3 데이터 관리 모달
- **설비/TOOL 관리 (`PmEquipmentModal`)**
  - 설비/툴 목록 CRUD
  - 실시간 행 추가/삭제
  - 유효성 검증 (Input 기반)
- **부품 관리 (`PmPartsModal`)**
  - 부품명, 수량 관리
  - 빈 상태(Empty State) 처리
  - 수량 숫자 입력 제한

## 5. 🧪 테스트 및 품질 보증 (QA)
### 5.1 테스트 커버리지
- **Playwright E2E Test**: `tests/pm-equipment-parts-modal.spec.ts`
- **통과율**: 93.1% (27/29 Pass) - WS 모듈 수준(91.2%) 초과 달성

### 5.2 주요 검증 항목
1. **5회 순차 회귀 테스트**: 데이터 누수 및 상태 초기화 문제 없음
2. **에러 핸들링**: 모달 연속 10회 오픈/클로즈 시 크래시 없음
3. **통합 시나리오**: 설비 추가 -> 부품 추가 -> 데이터 유지 확인

## 6. 🚀 배포 및 설치 가이드 (Deployment)

### 6.1 설치 방법
```bash
# 1. 저장소 클론
git clone [repository-url]

# 2. 의존성 설치
npm install

# 3. 개발 서버 실행
npm run dev
# 접속: http://localhost:3000/pm/worksheet
```

### 6.2 데이터베이스 마이그레이션 (필요 시)
현재는 Mock Data 및 로컬 상태 기반으로 동작하며, 추후 DB 연결 시 Prisma Schema 업데이트 필요.

## 7. 📅 변경 이력 (Changelog)
- **v1.0.0 (2026-02-01)**: PM 모듈 최초 릴리즈 (Feature/pm-module-implementation 머지)
  - WS 모듈 구조 복제 및 최적화
  - 설비/부품 모달 구현
  - TDD 테스트 스위트 작성 및 검증 완료
