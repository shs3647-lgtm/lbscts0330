# PM 모듈 개발 계획서

## 📋 프로젝트 개요
- **목표**: WS 모듈 기반 PM (Process Management) 모듈 구현
- **브랜치**: `feature/pm-module-implementation`
- **기반**: WS 모듈 구조 및 최적화 패턴 적용

## ✅ 완료된 작업 (Phase 1)

### 1. 기본 구조 생성
- ✅ WS 모듈 복사 및 PM 디렉토리 생성
- ✅ 파일명 변경 (Ws* → Pm*)
- ✅ 코드 내 명칭 일괄 변경 (WS → PM)
- ✅ PM 타입 정의 파일 생성 (`pm-main.ts`)
- ✅ Hook 명칭 변경 (`useWsData` → `usePmData`)

### 2. 생성된 파일 구조
```
src/app/pm/
├── layout.tsx
├── page.tsx
└── worksheet/
    ├── components/
    │   ├── AutoInputModal.tsx
    │   ├── PmContextMenu.tsx
    │   ├── PmEquipmentModal.tsx
    │   ├── PmMainTab.tsx
    │   ├── PmPartsModal.tsx
    │   ├── PmTabMenu.tsx
    │   ├── PmTableBody.tsx
    │   ├── PmTableHeader.tsx
    │   └── PmTopMenuBar.tsx
    ├── hooks/
    │   ├── usePmData.ts
    │   ├── usePfdSync.ts
    │   ├── useRowSpan.ts
    │   ├── useWorksheetHandlers.ts
    │   └── ... (기타 hooks)
    ├── page.tsx
    ├── types.ts
    ├── schema.ts
    └── utils/
```

## 🎯 진행 중인 작업 (Phase 2)

### 1. PM 모듈 최적화
- [ ] PM 전용 상수 정의 (`pmConstants.ts`)
- [ ] PM ID 유틸리티 (`pmIdUtils.ts`)
- [ ] PM 데이터 스키마 최적화
- [ ] PM 타입 정의 완성

### 2. 컴포넌트 모듈화
- [ ] PmTopMenuBar 최적화
- [ ] PmTabMenu 최적화
- [ ] PmTableHeader/Body 최적화
- [ ] PmMainTab 최적화
- [ ] PmEquipmentModal 최적화
- [ ] PmPartsModal 최적화

### 3. Hook 모듈화
- [ ] usePmData 최적화
- [ ] usePmActions 생성
- [ ] usePmSyncHandlers 생성
- [ ] useRowSpan PM 전용 최적화

## 📝 다음 단계 (Phase 3)

### 1. 기능 테스트
- [ ] PM 페이지 로딩 테스트
- [ ] PM Main 탭 기능 테스트
- [ ] PM Worksheet 탭 기능 테스트
- [ ] 설비/부품 모달 테스트
- [ ] 데이터 저장/로드 테스트

### 2. TDD 테스트 작성
- [ ] PM 모달 테스트 (`pm-equipment-parts-modal.spec.ts`)
- [ ] PM 전체 회귀 테스트 (`pm-complete-regression.spec.ts`)
- [ ] 5회 반복 회귀 검증

### 3. 문서화
- [ ] PM 모듈 README
- [ ] PM API 문서
- [ ] PM 사용 가이드

## 🔧 기술 스택

### Frontend
- Next.js 16.1.1
- React 19.2.3
- TypeScript ^5
- Tailwind CSS ^4

### State Management
- React Hooks (useState, useEffect, useCallback, useMemo)
- Custom Hooks (usePmData, usePmActions)

### Data Handling
- LocalStorage (임시 저장)
- Prisma (데이터베이스 연동 예정)

## 📊 WS vs PM 차이점

### 명칭 변경
| WS | PM |
|---|---|
| WS Main | PM Main |
| WS Work Sheet | PM Work Sheet |
| wsNo | pmNo |
| wsList | pmList |
| WSMainDocument | PMMainDocument |
| useWsData | usePmData |

### 기능 차이 (예정)
- PM은 프로세스 관리에 특화
- WS는 워크시트 중심, PM은 프로세스 플로우 중심
- PM 전용 검증 로직 추가 예정

## 🎨 UI/UX 일관성

### WS 모듈과 동일한 패턴 적용
- ✅ Stacked Header (공백 제거)
- ✅ 모달 기반 설비/부품 관리
- ✅ 탭 메뉴 구조
- ✅ Toolbar 버튼 배치
- ✅ 테이블 레이아웃

## 🚀 배포 계획

### 1. 개발 환경 테스트
```bash
npm run dev
# http://localhost:3000/pm/worksheet
```

### 2. 빌드 테스트
```bash
npm run build
npm run start
```

### 3. E2E 테스트
```bash
npx playwright test tests/pm-*.spec.ts
```

### 4. 머지 및 배포
```bash
git checkout main
git merge feature/pm-module-implementation
git push origin main
```

## 📋 체크리스트

### Phase 1: 기본 구조 ✅
- [x] 디렉토리 생성
- [x] 파일 복사
- [x] 명칭 변경
- [x] 타입 정의
- [x] 초기 커밋

### Phase 2: 최적화 (진행 중)
- [ ] 상수 정의
- [ ] 유틸리티 함수
- [ ] 컴포넌트 최적화
- [ ] Hook 최적화
- [ ] 스타일 조정

### Phase 3: 테스트
- [ ] 기능 테스트
- [ ] E2E 테스트
- [ ] 회귀 테스트
- [ ] 성능 테스트

### Phase 4: 문서화 및 배포
- [ ] README 작성
- [ ] API 문서
- [ ] 사용 가이드
- [ ] 최종 커밋 및 머지

## 🔗 관련 문서
- [WS 모듈 리팩토링 보고서](../WS_REFACTORING_REPORT.md)
- [WS 테스트 보고서](../tests/WS_TEST_REPORT.md)
- [프로젝트 설정 가이드](../SETUP_GUIDE.md)

---

**작성일**: 2026-02-01
**작성자**: AI Assistant (Antigravity)
**버전**: 1.0.0
