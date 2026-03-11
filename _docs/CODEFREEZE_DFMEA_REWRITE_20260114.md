# DFMEA 모듈 재작성 코드프리즈

**코드프리즈 일자**: 2026-01-14  
**태그**: `codefreeze-20260114-dfmea-rewrite-complete`

## 핵심 변경 내용

### 1. DFMEA 용어 변경 완료
- "완제품 공정명" → "제품명"
- "메인공정" → "A'SSY"
- "작업요소" → "부품 또는 특성"
- "공정특성" → "부품 특성"
- "4M" → 완전 제거
- "공정번호" (`l2No`, `processNo`, `fmProcessNo`, `l2StructNo`) → 제거
- "m4" 필드 (`m4`, `fcM4`, `l3M4`) → 제거
- 컬럼 수: 35개 → 34개 (4M 제거)
- "P-FMEA" → "D-FMEA" 텍스트 변경

### 2. 탭 파일 재작성 완료
모든 탭 파일에서 PFMEA 용어를 DFMEA 용어로 변경:
- `StructureTab.tsx`
- `FunctionTab.tsx` (L1/L2/L3)
- `FailureTab.tsx` (L1/L2/L3, Link)
- `RiskTab.tsx`
- `OptTab.tsx`
- `DocTab.tsx`
- `AllViewTab.tsx`
- `all/` 폴더 내 모든 파일

### 3. 인라인 스타일 제거 (부분 완료)
- `DocTab.tsx` - Tailwind CSS 클래스로 변환 완료
- 동적 스타일은 인라인 유지 (규칙 준수)

## 수정된 파일 목록

### 탭 파일
1. `src/app/dfmea/worksheet/tabs/StructureTab.tsx`
2. `src/app/dfmea/worksheet/tabs/function/FunctionTab.tsx`
3. `src/app/dfmea/worksheet/tabs/function/FunctionL1Tab.tsx`
4. `src/app/dfmea/worksheet/tabs/function/FunctionL2Tab.tsx`
5. `src/app/dfmea/worksheet/tabs/function/FunctionL3Tab.tsx`
6. `src/app/dfmea/worksheet/tabs/failure/FailureTab.tsx`
7. `src/app/dfmea/worksheet/tabs/failure/FailureL1Tab.tsx`
8. `src/app/dfmea/worksheet/tabs/failure/FailureL2Tab.tsx`
9. `src/app/dfmea/worksheet/tabs/failure/FailureL3Tab.tsx`
10. `src/app/dfmea/worksheet/tabs/failure/FailureLinkTab.tsx`
11. `src/app/dfmea/worksheet/tabs/failure/FailureLinkTables.tsx`
12. `src/app/dfmea/worksheet/tabs/failure/FailureLinkResult.tsx`
13. `src/app/dfmea/worksheet/tabs/RiskTab.tsx`
14. `src/app/dfmea/worksheet/tabs/OptTab.tsx`
15. `src/app/dfmea/worksheet/tabs/DocTab.tsx`
16. `src/app/dfmea/worksheet/tabs/AllViewTab.tsx`

### all/ 폴더 파일
17. `src/app/dfmea/worksheet/tabs/all/allTabConstants.ts`
18. `src/app/dfmea/worksheet/tabs/all/processFailureLinks.ts`
19. `src/app/dfmea/worksheet/tabs/all/AllTabRenderer.tsx`
20. `src/app/dfmea/worksheet/tabs/all/AllTabBasic.tsx`
21. `src/app/dfmea/worksheet/tabs/all/AllTabAtomic.tsx`
22. `src/app/dfmea/worksheet/tabs/all/StructureCellRenderer.tsx`
23. `src/app/dfmea/worksheet/tabs/all/FunctionCellRenderer.tsx`

### 설정 파일
24. `src/app/dfmea/worksheet/columns.ts`
25. `src/app/dfmea/worksheet/constants.ts`
26. `src/app/dfmea/worksheet/schema.ts`
27. `src/app/dfmea/worksheet/terminology.ts`

## 절대 수정 금지 항목

### 1. DFMEA 용어 정의
- "제품명", "A'SSY", "부품 또는 특성", "부품 특성" 등 DFMEA 전용 용어
- 4M 관련 코드는 완전히 제거되었으므로 재추가 금지
- 공정번호 관련 필드는 모두 제거되었으므로 재추가 금지

### 2. 컬럼 구조
- 컬럼 수: 34개 (4M 제거)
- 컬럼 ID 조정: `STEP_FIRST_COLUMN_IDS = [1, 4, 11, 15, 22]`
- 컬럼 정의: `allTabConstants.ts`의 `COLUMNS_BASE` 배열

### 3. 스키마 구조
- `schema.ts`의 DFMEA 원자성 DB 스키마
- `constants.ts`의 DFMEA 데이터 구조
- `columns.ts`의 35개 컬럼 정의

## 수정 시 필수 프로세스

1. **사용자 승인 필수**: "이 파일은 코드프리즈입니다. 수정하시겠습니까?" 질문
2. **범위 확인**: "어디까지 수정할까요? (예: 이 함수만/이 컴포넌트만/전체 파일)"
3. **승인 후 수정**: 승인된 범위 외 수정 금지
4. **위반 시 처리**: 즉시 `git checkout`으로 복원

## 롤백 방법

```bash
# 특정 파일 롤백
git checkout codefreeze-20260114-dfmea-rewrite-complete -- src/app/dfmea/worksheet/tabs/StructureTab.tsx

# 전체 DFMEA 탭 폴더 롤백
git checkout codefreeze-20260114-dfmea-rewrite-complete -- src/app/dfmea/worksheet/tabs/
```

## 유지보수 가이드

### 용어 변경 시
1. `terminology.ts` 확인
2. `columns.ts` 확인
3. 관련 탭 파일 모두 검색 후 일괄 변경

### 컬럼 추가/제거 시
1. `allTabConstants.ts`의 `COLUMNS_BASE` 수정
2. `STEP_FIRST_COLUMN_IDS` 조정
3. 관련 렌더러 파일 수정

### 스키마 변경 시
1. `schema.ts` 수정
2. `constants.ts` 수정
3. `db-storage.ts` 수정
4. 마이그레이션 스크립트 작성

## 참고 문서

- `docs/DFMEA_PRD.md` - DFMEA 화면 정의서
- `docs/DFMEA_REWRITE_COMPLETION_REPORT.md` - 재작성 완료 보고서
- `docs/DFMEA_MODULARIZATION_PLAN.md` - 모듈화 계획서

