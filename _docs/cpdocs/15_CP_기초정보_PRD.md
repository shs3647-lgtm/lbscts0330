# CP 기초정보 Import PRD

> **버전**: v1.0.0  
> **최종 업데이트**: 2026-01-24  
> **코드 프리즈**: `b5ea535`

---

## 1. 개요

### 1.1 목적
CP(Control Plan) 기초정보를 엑셀 파일로 Import하여 워크시트에 반영하는 화면입니다.

### 1.2 경로
- **URL**: `/control-plan/import?id={cpId}`
- **파일**: `src/app/control-plan/import/page.tsx`

---

## 2. 화면 구성

### 2.1 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│ TopNav: CP 기초정보 Import                               │
├─────────────────────────────────────────────────────────┤
│ Sidebar │ 메인 컨텐츠                                    │
│         │ ┌───────────────────────────────────────────┐ │
│         │ │ CP 선택 / 템플릿 다운로드                   │ │
│         │ ├───────────────────────────────────────────┤ │
│         │ │ 입력 섹션                                  │ │
│         │ │ - 전체 Import: [찾아보기] [Import]         │ │
│         │ │ - 개별 Import: [항목선택] [찾아보기]       │ │
│         │ ├───────────────────────────────────────────┤ │
│         │ │ 미리보기 패널 (좌)  │  관계형 데이터 (우)  │ │
│         │ │ - 그룹시트 탭       │  - 공정별 데이터     │ │
│         │ │ - 데이터 테이블     │  - 특성/관리방법     │ │
│         │ └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Import 컬럼 정의

### 3.1 CP 기초정보 컬럼 (15개)

| NO | 컬럼명 | 코드 | 필수 | 설명 |
|----|--------|------|------|------|
| 1 | 공정번호 | A1 | ✅ | Process No |
| 2 | 공정명 | A2 | ✅ | Process Name |
| 3 | 설비/장비 | A3 | - | Equipment |
| 4 | 제품특성 | B1 | - | Product Characteristic |
| 5 | 공정특성 | B2 | - | Process Characteristic |
| 6 | 특별특성 | B3 | - | Special Characteristic |
| 7 | 규격/공차 | C1 | - | Specification |
| 8 | 측정방법 | C2 | - | Measurement Method |
| 9 | 샘플크기 | C3 | - | Sample Size |
| 10 | 샘플빈도 | C4 | - | Sample Frequency |
| 11 | 관리방법 | C5 | - | Control Method |
| 12 | 대응계획 | C6 | - | Reaction Plan |
| 13 | 담당자 | D1 | - | Person in Charge |
| 14 | 비고 | D2 | - | Remarks |
| 15 | 작업지시서번호 | D3 | - | Work Instruction No |

---

## 4. 기능 정의

### 4.1 템플릿 다운로드
- **샘플 다운로드**: 예시 데이터 포함된 템플릿
- **빈 템플릿 다운로드**: 헤더만 있는 빈 템플릿

### 4.2 전체 Import
- 모든 컬럼을 한 번에 Import
- 기존 데이터 덮어쓰기 확인

### 4.3 개별 Import
- 선택한 항목(컬럼)만 Import
- 기존 데이터와 병합

### 4.4 미리보기
- Import 전 데이터 검증
- 오류 행 표시 (빨간색)
- 경고 행 표시 (노란색)

### 4.5 저장
- 검증된 데이터 DB 저장
- CP 워크시트에 반영

---

## 5. 파일 구조

```
src/app/control-plan/import/
├── components/
│   ├── ImportMenuBar.tsx      # 상단 메뉴바
│   ├── ImportStatusBar.tsx    # 상태바
│   ├── PreviewTable.tsx       # 미리보기 테이블
│   └── PreviewTabs.tsx        # 탭 전환
├── hooks/
│   ├── useImportHandlers.ts   # Import 핸들러
│   └── useEditHandlers.ts     # 편집 핸들러
├── constants.ts               # 컬럼 정의
├── types.ts                   # 타입 정의
└── page.tsx                   # 메인 페이지
```

---

## 6. API 연동

### 6.1 기초정보 조회
```
GET /api/control-plan/{cpId}/import-data
Response: { data: ImportData[] }
```

### 6.2 기초정보 저장
```
POST /api/control-plan/{cpId}/import-data
Body: { data: ImportData[] }
Response: { success: boolean, count: number }
```

---

## 7. 엑셀 템플릿 형식

### 7.1 시트 구조
- **시트1**: 기초정보 (15컬럼)

### 7.2 헤더 행
- 1행: 컬럼명 (한글)
- 2행~: 데이터

---

## 8. 유효성 검사

| 검사 항목 | 조건 | 오류 메시지 |
|----------|------|------------|
| 공정번호 | 필수, 중복 불가 | "공정번호는 필수입니다" |
| 공정명 | 필수 | "공정명은 필수입니다" |
| 규격/공차 | 숫자 형식 | "유효한 규격 형식이 아닙니다" |

---

## 9. 참고

- PFMEA Import와 동일한 UI/UX 구조
- PFMEA 연계 시 공정번호 기준 매핑
