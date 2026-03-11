# CP 기초정보 Import PRD

> **작성일**: 2026-01-27  
> **버전**: 1.0  
> **상태**: Code Freeze

---

## 1. 개요

CP(Control Plan) 기초정보 Import 기능은 **CP 작성화면에서 Export한 Excel 파일**을 Import하여 기초정보 데이터를 시스템에 등록하는 기능입니다.

### 1.1 목적
- CP 작성화면에서 작업한 내용을 Excel로 Export한 후 Import하여 재사용
- 대량의 기초정보 데이터를 한 번에 등록

### 1.2 관련 화면
- **경로**: `/control-plan/import`
- **메뉴**: Control Plan → 기초정보 Import

---

## 2. Excel Export 템플릿 구조

CP 작성화면에서 Export한 Excel 파일의 구조:

| 행 번호 | 내용 | 설명 |
|--------|------|------|
| **1행** | CP 정보 | CP No, 프로젝트명 등 메타 정보 |
| **2행** | 단계 (그룹 헤더) | 공정현황, 관리항목, 관리방법 등 |
| **3행** | 컬럼명 | 공정번호, 공정명, 레벨, 공정설명 등 |
| **4행~** | **실제 데이터** | Import 대상 데이터 |

### 2.1 시트 구조 (5개 시트)

1. **공정현황** (`processInfo`)
   - 컬럼: 공정번호, 공정명, 레벨, 공정설명, 설비/금형/지그
   - itemCodes: A1, A2, A3, A4, A5

2. **검출장치** (`detector`)
   - 컬럼: 공정번호, 공정명, EP, 자동검사장치
   - itemCodes: A1, A2, A6, A7

3. **관리항목** (`controlItem`)
   - 컬럼: 공정번호, 공정명, 제품특성, 공정특성, 특별특성, 스펙/공차
   - itemCodes: A1, A2, B1, B2, B3, B4

4. **관리방법** (`controlMethod`)
   - 컬럼: 공정번호, 공정명, 평가방법, 샘플크기, 주기, 관리방법, 책임1, 책임2
   - itemCodes: A1, A2, B5, B6, B7, B7-1, B8, B9

5. **대응계획** (`reactionPlan`)
   - 컬럼: 공정번호, 공정명, 제품특성, 공정특성, 대응계획
   - itemCodes: A1, A2, B1, B2, B10

---

## 3. Import 로직

### 3.1 행 스킵 규칙

```typescript
// 1행(CP정보), 2행(단계), 3행(컬럼명) 스킵 - 4행부터 데이터
if (rowNumber <= 3) return;
```

- **1행**: CP 정보 (메타 정보) → 스킵
- **2행**: 단계 (그룹 헤더) → 스킵  
- **3행**: 컬럼명 → 스킵
- **4행~**: 실제 데이터 → Import

### 3.2 병합 셀 처리

- 병합된 셀의 경우 이전 행의 값을 상속
- 공정번호, 공정명이 비어있으면 이전 행의 값 사용

```typescript
// 병합 셀 처리: 빈 셀이면 이전 행의 값 사용
if (!processNo && lastProcessNo) {
  processNo = lastProcessNo;
}
```

---

## 4. 주요 기능

### 4.1 전체 Import (`handleFullFileSelect`)
- 5개 시트 전체를 한 번에 Import
- 모든 시트의 데이터를 통합하여 저장

### 4.2 그룹별 Import (`handleGroupFileSelect`)
- 특정 시트(공정현황, 검출장치 등)만 선택하여 Import
- 선택한 그룹의 데이터만 처리

### 4.3 개별 항목 Import (`handleItemFileSelect`)
- 특정 컬럼(공정명, 설비 등)만 Import
- 공정번호 + 단일 항목 형태

---

## 5. 관련 파일

| 파일 | 역할 |
|------|------|
| `hooks/useImportHandlers.ts` | Import 핸들러 훅 (전체/그룹/개별) |
| `excel-parser.ts` | Excel 파싱 유틸리티 |
| `excel-template.ts` | 템플릿 다운로드 함수 |
| `worksheet-excel-parser.ts` | 워크시트 형식 Excel 파서 |
| `page.tsx` | Import 페이지 메인 컴포넌트 |

---

## 6. 참고사항

### ⚠️ 기초정보 빈 템플릿과의 차이점

**이 문서는 "CP 작성화면에서 Export한 Excel" Import에 해당합니다.**

기초정보 빈 템플릿 Import (`CP_기초정보_빈템플릿_PRD.md`)는 별도 문서를 참조하세요.

| 구분 | CP Export Excel | 기초정보 빈 템플릿 |
|------|----------------|------------------|
| 1행 | CP 정보 | 컬럼명 (헤더) |
| 2행 | 단계 (그룹 헤더) | 데이터 시작 |
| 3행 | 컬럼명 | 데이터 |
| 데이터 시작 | **4행** | **2행** |

---

## 7. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2026-01-27 | 1.0 | 초기 작성, 4행부터 데이터 Import 적용 |
