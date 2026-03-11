# CP 기초정보 빈 템플릿 Import PRD

> **작성일**: 2026-01-27  
> **버전**: 1.0  
> **상태**: 참고용 (현재 미사용)

---

## 1. 개요

CP 기초정보 **빈 템플릿**은 시스템에서 다운로드한 빈 양식에 사용자가 직접 데이터를 입력하여 Import하는 방식입니다.

### ⚠️ 현재 상태
현재 CP Import 기능은 **CP 작성화면에서 Export한 Excel Import**에 최적화되어 있습니다.  
빈 템플릿 Import는 별도 구현이 필요합니다.

---

## 2. 빈 템플릿 구조

시스템에서 다운로드하는 빈 템플릿의 구조:

| 행 번호 | 내용 | 설명 |
|--------|------|------|
| **1행** | 컬럼명 (헤더) | 공정번호, 공정명, 레벨 등 |
| **2행~** | **데이터 입력 영역** | 사용자가 직접 입력 |

---

## 3. CP Export Excel과의 차이점

| 구분 | CP Export Excel | 기초정보 빈 템플릿 |
|------|----------------|------------------|
| **1행** | CP 정보 (메타) | 컬럼명 (헤더) |
| **2행** | 단계 (그룹 헤더) | **데이터 시작** |
| **3행** | 컬럼명 | 데이터 |
| **데이터 시작 행** | **4행** | **2행** |
| **Import 스킵** | `rowNumber <= 3` | `rowNumber <= 1` |

---

## 4. 빈 템플릿 Import 로직 (향후 구현 시)

```typescript
// 빈 템플릿: 1행(헤더) 스킵 - 2행부터 데이터
if (rowNumber <= 1) return;
```

---

## 5. 템플릿 다운로드 함수

빈 템플릿 다운로드 함수들:

| 함수명 | 설명 |
|--------|------|
| `downloadCPEmptyTemplate()` | 전체 빈 템플릿 (5개 시트) |
| `downloadProcessInfoTemplate()` | 공정현황 빈 템플릿 |
| `downloadDetectorTemplate()` | 검출장치 빈 템플릿 |
| `downloadControlItemTemplate()` | 관리항목 빈 템플릿 |
| `downloadControlMethodTemplate()` | 관리방법 빈 템플릿 |
| `downloadReactionPlanTemplate()` | 대응계획 빈 템플릿 |

---

## 6. 향후 개선 사항

1. **Import 모드 선택 기능 추가**
   - CP Export Excel Import (4행부터)
   - 빈 템플릿 Import (2행부터)

2. **자동 감지 로직**
   - 1행 내용을 분석하여 템플릿 유형 자동 판별
   - CP 정보가 있으면 Export Excel, 없으면 빈 템플릿

---

## 7. 참고 문서

- `CP_기초정보_Import_PRD.md` - CP Export Excel Import 규격
- `excel-template.ts` - 템플릿 생성 함수

---

## 8. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2026-01-27 | 1.0 | 초기 작성, 빈 템플릿과 Export Excel 차이점 정의 |
