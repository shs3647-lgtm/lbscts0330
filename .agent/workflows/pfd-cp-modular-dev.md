---
description: PFD/CP 기능 추가 시 모듈화 원칙 준수
---

# PFD/CP 기능 추가 워크플로우

## 📌 핵심 원칙
**새로운 기능은 반드시 모듈로 분리하여 개발**

## 🔧 개발 절차

### 1. 브랜치 생성
```bash
git checkout -b feature/{기능명}
```

### 2. 모듈 분리 개발

#### 훅 추가 시
```
src/app/{pfd|control-plan}/worksheet/hooks/use{기능명}.ts
```
- 단일 책임 원칙 (Single Responsibility)
- hooks/index.ts에 export 추가

#### 컴포넌트 추가 시
```
src/app/{pfd|control-plan}/worksheet/components/{컴포넌트명}.tsx
```
- memo() 사용하여 성능 최적화
- Props 인터페이스 명확히 정의

### 3. page.tsx 수정
- 새 훅/컴포넌트 import
- page.tsx 400줄 이하 유지
- 로직은 훅으로, UI는 컴포넌트로 분리

### 4. 커밋 & 머지
```bash
# 기능 커밋
git add -A
git commit -m "feat({모듈}): {기능 설명}"

# 메인 머지
git checkout main
git merge feature/{기능명} --no-ff -m "feat({모듈}): {기능 설명}"

# 브랜치 정리 & 푸시
git branch -d feature/{기능명}
git push origin main
```

## 📂 현재 모듈 구조

### CP Worksheet (`src/app/control-plan/worksheet/`)
```
hooks/
├── useUndoRedo.ts       # Undo/Redo + 셀 병합
├── useCPData.ts         # 데이터 로드/상태 관리
├── useSyncHandlers.ts   # PFD/FMEA 연동
├── useCPActions.ts      # 필터/확정/승인/Import
└── index.ts

components/
├── CPTableHeader.tsx    # 테이블 헤더 3행
├── CPTableBody.tsx      # 테이블 바디
└── ... (기존 컴포넌트)
```

### PFD Worksheet (`src/app/pfd/worksheet/`)
```
hooks/
├── useUndoRedo.ts       # Undo/Redo + 셀 병합
├── usePfdData.ts        # 데이터 로드/상태 관리
├── usePfdActions.ts     # 확정/승인/Export/Import/연동
└── index.ts

components/
├── PfdTableHeader.tsx   # 테이블 헤더 3행
├── PfdTableBody.tsx     # 테이블 바디
└── ... (기존 컴포넌트)
```

## ✅ 체크리스트

새 기능 개발 시:
- [ ] feature 브랜치에서 작업
- [ ] 훅 또는 컴포넌트로 분리
- [ ] index.ts에 export 추가
- [ ] page.tsx 400줄 이하 유지
- [ ] 타입스크립트 빌드 확인
- [ ] main 머지 후 push

## 🔄 공통 모듈 (`src/lib/`)
- `change-history.ts` - CP/PFD 공통 변경 이력 관리
- `sync-validation.ts` - 연동 데이터 검증
