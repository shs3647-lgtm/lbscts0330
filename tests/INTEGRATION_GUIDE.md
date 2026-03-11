# 통합 모듈 검증 가이드 (Integration Verification Guide)

## 🎯 목적
본 가이드는 **WS(Worksheet)** 모듈과 **PM(Process Management)** 모듈이 메인 브랜치(`main`) 상태에서 상호 간섭 없이 정상적으로 작동하는지 검증하기 위한 절차를 설명합니다.

Playwright를 사용한 E2E(End-to-End) 테스트와 TDD 기반의 순차 회귀 검증을 통해 배포 전 안정성을 확보합니다.

## 🛠 대상 모듈 및 테스트 파일

### 1. WS 모듈 (Legacy)
- **모달 검증**: `tests/ws-equipment-parts-modal.spec.ts`
- **전체 회귀**: `tests/ws-complete-regression.spec.ts`

### 2. PM 모듈 (New)
- **모달 검증**: `tests/pm-equipment-parts-modal.spec.ts`
- **전체 회귀**: `tests/pm-complete-regression.spec.ts`

### 3. PFD 모듈 (PM Style)
- **모달 검증**: `tests/pfd-equipment-parts-modal.spec.ts`

## 🚀 실행 가이드

### 1. 통합 검증 실행 (권장)
모든 모듈의 핵심 기능을 순차적으로 검증합니다.

```powershell
# Windows (PowerShell)
npx playwright test tests/ws-equipment-parts-modal.spec.ts tests/pm-equipment-parts-modal.spec.ts tests/pfd-equipment-parts-modal.spec.ts --reporter=list --workers=1
```

### 2. 개별 모듈 검증

#### WS 모듈만 검증
```powershell
npx playwright test tests/ws-*.spec.ts --reporter=list --workers=1
```

#### PM 모듈만 검증
```powershell
npx playwright test tests/pm-*.spec.ts --reporter=list --workers=1
```

## ✅ 주요 검증 항목 (Pass Criteria)

1. **기본 동작**: 각 모듈의 페이지 접속 및 기본 탭 로드
2. **모달 기능**: 설비/부품 관리 모달 열기/닫기 및 CRUD
3. **데이터 무결성**: 5회 반복 순차 테스트 시 데이터 유지 및 초기화 여부
4. **안정성 (Stability)**:
   - 교차 실행 시 에러 없음
   - UI 요소 위치 및 스타일 정확성

## ⚠️ 트러블슈팅 (Troubleshooting)

- **테스트가 중간에 멈추거나 타임아웃 발생 시**:
  - `npm run dev` 서버가 정상 동작 중인지 확인
  - PC 성능에 따라 `waitForTimeout` 시간이 부족할 수 있음 (테스트 파일 내 시간 조정 권장)
  
- **특정 선택자(Selector) 오류 시**:
  - 브라우저의 개발자 도구(F12)를 열어 해당 요소의 `class`나 텍스트가 변경되었는지 확인
  - WS와 PM은 구조가 유사하므로, 한쪽의 수정이 다른 쪽에 영향을 주지 않도록 주의

---
*작성일: 2026-02-01*
*작성자: AI Assistant*
