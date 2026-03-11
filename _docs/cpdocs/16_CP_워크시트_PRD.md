# CP 워크시트 PRD

> **버전**: 1.0.0  
> **작성일**: 2026-01-24  
> **코드프리즈**: `codefreeze-20260124-cp-worksheet-menu`

---

## 1. 개요

Control Plan 워크시트 화면의 기능 및 UI 정의.

---

## 2. 메뉴 구조

### 2.1 상단 메뉴바 (CPTopMenuBar)

| 영역 | 구성요소 | 설명 |
|------|----------|------|
| CP명 | 드롭다운 | CP 선택 (새로 작성 옵션 포함) |
| 저장 | 저장 버튼 | 변경사항 저장 (dirty 상태 표시) |
| Import | 드롭다운 | Excel 가져오기, 템플릿 다운로드 |
| Export | 버튼 | Excel 내보내기 |
| 행 추가 | 버튼 | 새 행 추가 |
| EP검사장치 | 버튼 | EP검사장치 관리 모달 |
| **PFD 연동** | 드롭다운 | PFD 화면 이동, PFD 구조연동 |
| **FMEA 연동** | 드롭다운 | FMEA 구조연동, 데이터 동기화 |
| **PFD 이동** | 버튼 | `/pfd/worksheet` 이동 |
| **FMEA 이동** | 버튼 | `/pfmea/worksheet` 이동 |

### 2.2 탭 메뉴 (CPTabMenu)

| 탭 | 설명 |
|----|------|
| 전체 | 전체 컬럼 표시 |
| 공정현황 | 공정 정보 컬럼 |
| 관리항목 | 제품특성/공정특성/특별특성 |
| 관리방법 | 평가방법/샘플/주기 |
| 대응계획 | 대응계획 컬럼 |

---

## 3. 특별특성 옵션 (2026-01-24 수정)

| 옵션 | 설명 | 연동 |
|------|------|------|
| 제품SC | 제품특별특성 | PFD 제품특별특성, PFMEA 연동 |
| 공정SC | 공정특별특성 | PFD 공정특별특성, PFMEA 연동 |
| IC | 기타특성 | - |

> **변경사항**: CC → 제품SC, SC → 공정SC로 명칭 변경

---

## 4. PFD/FMEA 연동 기능

### 4.1 PFD 연동

| 기능 | 설명 |
|------|------|
| PFD 화면 이동 | `/pfd/worksheet` 이동 |
| PFD 구조연동 | PFD 공정구조를 CP에 가져오기 |

### 4.2 FMEA 연동

| 기능 | 설명 |
|------|------|
| FMEA 구조연동 | FMEA 구조를 CP에 생성 |
| 데이터 동기화 | 공통 필드 양방향 업데이트 |

---

## 5. 컬럼 정의 (20컬럼)

### 5.1 공정현황 (5컬럼)

| 컬럼 | Key | 너비 | 설명 |
|------|-----|------|------|
| 공정번호 | processNo | 45px | PFMEA 연동 |
| 공정명 | processName | 65px | PFMEA 연동 |
| 레벨 | processLevel | 45px | Main/Sub/외주 |
| 공정설명 | processDesc | 160px | PFMEA 연동 |
| 설비/금형/JIG | workElement | 100px | - |

### 5.2 검출장치 (2컬럼)

| 컬럼 | Key | 너비 | 설명 |
|------|-----|------|------|
| EP | detectorEp | 40px | 체크박스 |
| 자동 | detectorAuto | 40px | 체크박스 |

### 5.3 관리항목 (5컬럼)

| 컬럼 | Key | 너비 | 설명 |
|------|-----|------|------|
| NO | charNo | 25px | 공정별 특성 순번 |
| 제품특성 | productChar | 80px | PFMEA 연동 |
| 공정특성 | processChar | 80px | PFMEA 연동 |
| 특별특성 | specialChar | 35px | 제품SC/공정SC/IC |
| 스펙/공차 | specTolerance | 75px | - |

### 5.4 관리방법 (6컬럼)

| 컬럼 | Key | 너비 | 설명 |
|------|-----|------|------|
| 평가방법 | evalMethod | 70px | - |
| 샘플 | sampleSize | 35px | - |
| 주기 | sampleFreq | 45px | LOT/전수/셋업 등 |
| 관리방법 | controlMethod | 80px | PFMEA 연동 |
| 책임1 | owner1 | 50px | 생산/품질/연구 등 |
| 책임2 | owner2 | 50px | 생산/품질/연구 등 |

### 5.5 대응계획 (1컬럼)

| 컬럼 | Key | 너비 | 설명 |
|------|-----|------|------|
| 대응계획 | reactionPlan | 200px | - |

---

## 6. 파일 구조

```
src/app/control-plan/worksheet/
├── components/
│   ├── CPTopMenuBar.tsx      # 상단 메뉴바
│   ├── CPTabMenu.tsx         # 탭 메뉴
│   ├── CPContextMenu.tsx     # 컨텍스트 메뉴
│   ├── AutoInputModal.tsx    # 자동 입력 모달
│   ├── ProcessFlowInputModal.tsx
│   ├── ProcessDescInputModal.tsx
│   ├── EquipmentInputModal.tsx
│   ├── StandardInputModal.tsx
│   └── EPDeviceSelectModal.tsx
├── hooks/
│   ├── useProcessRowSpan.ts
│   ├── useDescRowSpan.ts
│   ├── useWorkRowSpan.ts
│   ├── useCharRowSpan.ts
│   ├── useContextMenu.ts
│   ├── useWorksheetHandlers.ts
│   ├── useModalHandlers.ts
│   ├── useFmeaSync.ts
│   └── useColumnResize.ts
├── cpConstants.ts            # 상수 정의
├── types.ts                  # 타입 정의
├── schema.ts                 # 스키마 정의
├── utils/index.ts            # 유틸리티
├── renderers/index.tsx       # 셀 렌더러
└── page.tsx                  # 메인 페이지
```

---

## 7. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2026-01-24 | 1.0.0 | 초기 작성 |
| 2026-01-24 | 1.0.1 | PFD 이동/연동 메뉴 추가 |
| 2026-01-24 | 1.0.2 | CC→제품SC, SC→공정SC 변경 |
| 2026-01-24 | 1.0.3 | 리스트 버튼 삭제, 항목수 표시 삭제 |
