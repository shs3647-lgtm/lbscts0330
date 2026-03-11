# 코드프리즈: CP Import 페이지 대응계획 → 조치방법 변경

**코드프리즈 날짜**: 2026-01-13  
**태그**: `codefreeze-20260113-cp-import-reaction-plan-label`  
**커밋**: `9d1ef6a520f8a02ecea36892cd2f249acd8d644a`

## 핵심 변경 내용

### 1. 테이블 헤더 라벨 변경
- **1행 그룹 헤더**: "대응계획" 유지
- **2행 컬럼 헤더**: "대응계획" → "조치방법"으로 변경

### 2. 변경 이유
- CP 워크시트와 용어 통일
- 사용자 요청에 따른 UI 개선

## 수정된 파일

### 1. `src/app/control-plan/import/constants.ts`
- `PREVIEW_COLUMNS`의 `reactionPlan` 컬럼: `label: '대응계획'` → `label: '조치방법'`
- `GROUP_HEADERS`의 `reactionPlan` 그룹: `label: '대응계획'` 유지

## 동작 방식

### 테이블 구조
```
1행 (그룹 헤더): 공정현황 | 검출장치 | 관리항목 | 관리방법 | 대응계획
2행 (컬럼 헤더): 공정번호 | 공정명 | ... | 조치방법
```

### 표시 위치
- **1행**: 그룹 헤더 (colspan=1, bg-orange-500) → "대응계획"
- **2행**: 컬럼 헤더 (개별 컬럼) → "조치방법"

## 롤백 방법

```bash
git checkout codefreeze-20260113-cp-import-reaction-plan-label^
```

또는

```bash
git reset --hard 9d1ef6a520f8a02ecea36892cd2f249acd8d644a^
```

## 관련 문서
- `src/app/control-plan/import/constants.ts`: 상수 정의
- `src/app/control-plan/import/page.tsx`: Import 페이지 컴포넌트

