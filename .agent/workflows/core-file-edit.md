---
description: 핵심 파일 수정 시 브랜치 전략 (AI 필수 준수)
---

# 🛡️ AI 핵심 파일 수정 규칙

## ⚠️ 이 규칙은 반드시 준수해야 합니다!

### 핵심 파일 목록 (수정 시 브랜치 필수)
- `src/components/modals/DataSelectModal.tsx`
- `src/components/modals/SOD*.tsx`
- `src/app/pfmea/worksheet/hooks/useWorksheet*.ts`
- `src/app/pfmea/worksheet/tabs/failure/*.tsx`
- `src/app/pfmea/worksheet/tabs/function/*.tsx`
- `src/app/pfmea/worksheet/tabs/StructureTab.tsx`
- `src/app/pfmea/worksheet/tabs/*TabConfirmable.tsx`
- `src/app/pfmea/worksheet/page.tsx`

### 수정 전 필수 작업
1. 브랜치 생성: `git checkout -b refactor/[작업명]`
2. 사용자에게 알림: "핵심 파일 수정이 필요합니다. 별도 브랜치에서 작업하겠습니다."

### 수정 후 필수 작업
1. 빌드 확인: `npm run build`
2. 사용자에게 테스트 요청
3. 테스트 OK 시: `git checkout main && git merge refactor/[작업명]`
4. 테스트 실패 시: `git checkout main && git branch -D refactor/[작업명]`

### 일반 파일 (브랜치 불필요)
- 스타일/색상 변경
- 문서/주석 수정
- 독립적인 유틸리티 함수
- 새 파일 생성

### 안정 버전 참조
- 브랜치: `stable-v1.0`
- 커밋: `ea4a458a`
- 복구 명령: `git checkout stable-v1.0 -- [파일경로]`
