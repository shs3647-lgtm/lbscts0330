# FMEA On-Premise QA 테스트 결과 보고서

> **테스트 일자**: 2026-01-25 (최신)  
> **테스트 범위**: 기초정보 입력 → 구조분석 → 최적화 전 과정  
> **테스트 버전**: 커밋 `44158c5f` (2026-01-25)  
> **테스트 기준**: `빌드_QA테스트마스터.md`

---

## 🆕 2026-01-25 모달 스타일 통일 및 버그 수정

### 모달 UI 통일 (5개 모달)

| 모달 | 변경 내용 | 상태 |
|------|----------|------|
| ProcessSelectModal | 위치 130px, 주황색 헤더, 빨간 닫기, "선택입력 :" 라벨 | ✅ 완료 |
| WorkElementSelectModal | 위치 130px, 주황색 헤더, 빨간 닫기, "선택입력 :" 라벨 | ✅ 완료 |
| DataSelectModal | 위치 130px, 주황색 헤더, 빨간 닫기, "선택입력 :" 라벨 | ✅ 완료 |
| BaseSelectModal | 위치 130px, 주황색 헤더, 빨간 닫기, "선택입력 :" 라벨 | ✅ 완료 |
| SpecialCharSelectModal | 위치 130px, 주황색 헤더, 빨간 닫기, "선택입력 :" 라벨 | ✅ 완료 |

### 트리뷰 헤더 개선

| 변경 내용 | 상태 |
|----------|------|
| "트리뷰:" 라벨 추가 (노란색 11px 굵은 글씨) | ✅ 완료 |
| 모달과 트리뷰 구분 명확화 | ✅ 완료 |

### 작업요소 삭제 버그 수정

| 문제 | 수정 내용 | 상태 |
|------|----------|------|
| 전체 삭제 시 테이블 구조 깨짐 | 빈 배열 대신 플레이스홀더 추가 | ✅ 완료 |
| 삭제 시 기본 데이터까지 저장됨 | existingL3 기반 필터링 | ✅ 완료 |
| 모달에 플레이스홀더 항목 표시됨 | 없음/삭제 포함 항목 제외 | ✅ 완료 |

### PFMEA/DFMEA 데이터 분리

| 문제 | 수정 내용 | 상태 |
|------|----------|------|
| PFMEA 모달에 DFMEA 데이터 표시 | URL 경로 기반 데이터소스 분리 | ✅ 완료 |
| DEFAULT_ITEMS가 DFMEA 전용이었음 | isPFMEA 체크 후 PFMEA_DEFAULT_ITEMS 사용 | ✅ 완료 |

### 누락 셀 스타일

| 변경 내용 | 상태 |
|----------|------|
| 작업요소 셀 누락 시 주황색 배경 (#fed7aa) | ✅ 완료 |
| 플레이스홀더 조건에 "없음", "삭제" 추가 | ✅ 완료 |

### 미해결 이슈 (별도 작업 필요)

| 이슈 | 설명 | 상태 |
|------|------|------|
| 기초정보 FMEA ID별 연동 | 엑셀 Import 데이터가 전역 저장됨 (FMEA ID별 분리 필요) | ✅ 저장 연동 완료 |
| 기초정보 → 모달 연동 | 워크시트 모달에서 해당 FMEA 기초정보 로드 필요 | 📋 대기 |

---

## 🆕 CP 단계 관리 기능 추가 (2026-01-24)

### CP 단계 정의 (5단계 + 완료)

| 단계 | 명칭 | 색상 | 설명 |
|------|------|------|------|
| 1단계 | 등록 | 회색 | CP 기본 정보 등록 |
| 2단계 | 공정현황 | 파란색 | 공정번호, 공정명, 공정설명, 설비 입력 |
| 3단계 | 관리항목 | 시안색 | 제품특성, 공정특성, 특별특성, 스펙/공차 입력 |
| 4단계 | 관리방법 | 주황색 | 평가방법, 샘플크기, 주기, 관리방법, 책임자 입력 |
| 5단계 | 조치방법 | 청록색 | 대응계획 입력 |
| 완료 | ✓ 완료 | **녹색** | 5단계 완료 + 결재 승인 시 표시 |

### 구현 내용

| 항목 | 파일 | 설명 |
|------|------|------|
| CP 단계 배지 | `CPStepBadge.tsx` | 단계별 색상 및 명칭 표시 |
| CP 리스트 | `list/page.tsx` | 단계 클릭 시 확정 모달 |
| 단계 API | `api/control-plan/step/route.ts` | PUT 요청으로 단계 업데이트 |
| DB 스키마 | `schema.prisma` | ControlPlan.step 필드 추가 |

### 사용 방법

1. CP 리스트에서 단계 배지 클릭
2. 모달에서 완료된 단계 선택
3. "확정" 버튼 클릭
4. DB에 단계 저장 및 리스트 갱신

---

## 📊 테스트 요약

| 구분 | 테스트 항목 | 성공 | 실패 | 보류 |
|------|------------|------|------|------|
| 기초정보 | 8개 | 4 | 3 | 1 |
| 구조분석 | 7개 | 3 | 4 | 0 |
| 기능분석 | 6개 | 2 | 4 | 0 |
| 고장분석 | 5개 | 4 | 1 | 0 |
| 리스크분석 | 6개 | 3 | 3 | 0 |
| 최적화 | 5개 | 2 | 3 | 0 |
| 데이터 연계성 | 10개 | 2 | 8 | 0 |
| **합계** | **47개** | **20** | **26** | **1** |

---

## 🚀 코드 프리즈 내역 (2026-01-24)

> **최신 커밋**: CP 최적화 및 PFD 수평전개

### CP Import 최적화 (2026-01-24)

#### 코드 중복 제거 및 모듈화

| 파일 | 변경 내용 | 결과 |
|------|----------|------|
| `useImportHandlers.ts` | 3가지 Import 모드 통합 (전체/그룹/개별) | 파싱 로직 중앙화 |
| `page.tsx` | 인라인 파싱 로직 제거, 훅 사용 | 950줄 → 450줄 (53% 감소) |

#### 훅 기반 아키텍처 적용

| 훅 | 역할 |
|----|------|
| `useImportHandlers` | Excel 파싱, 템플릿 다운로드 |
| `useEditHandlers` | 행 편집/저장/삭제 |

---

### PFD 수평전개 (2026-01-24)

#### CP Import 패턴 기반 PFD Import 구현

| 생성 파일 | 설명 |
|----------|------|
| `hooks/useEditHandlers.ts` | PFD용 행 편집 핸들러 |
| `hooks/useImportHandlers.ts` | PFD용 Import 핸들러 (3가지 모드) |
| `hooks/index.ts` | 훅 모듈 export |
| `excel-template.ts` | PFD 템플릿 생성/다운로드 |
| `utils/pfd-master-api.ts` | PFD 마스터 데이터 API |

#### PFD 시트 구조 (2개)

| 시트명 | 컬럼 | itemCode |
|--------|------|----------|
| 공정정보 | 공정번호, 공정명, 공정설명, 작업요소, 설비/금형/지그 | A1~A5 |
| 특성정보 | 공정번호, 공정명, 제품특별특성, 제품특성, 공정특별특성, 공정특성 | A1, A2, B1~B4 |

#### 기능 구현 현황

| 기능 | 상태 |
|------|------|
| 전체/그룹/개별 Import | ✅ 완료 |
| 템플릿 다운로드 (양식/샘플) | ✅ 완료 |
| 미리보기 테이블 | ✅ 완료 |
| 행 편집/삭제/저장 | ✅ 완료 |
| 그룹/컬럼 필터 | ✅ 완료 |
| 현재데이터 다운로드 | ✅ 완료 |
| 누락 건수 표시 | ✅ 완료 |

---

> **이전 커밋**: CP Import 기능 강화

### CP Import 기능 강화 (2026-01-24)

#### 미리보기 수정 후 DB 저장 및 다운로드

| 기능 | 설명 | 상태 |
|------|------|------|
| 연필 수정 → 전체저장 | 편집 중인 행 자동 저장 후 DB 저장 | ✅ 완료 |
| 현재데이터 다운로드 | 수정된 데이터를 Excel로 다운로드 | ✅ 완료 |
| controlMethod 매핑 | B7-1 itemCode 매핑 추가 | ✅ 완료 |

#### 그룹/개별 탭 필터 드롭다운 추가

| 탭 | 필터 옵션 | 상태 |
|------|----------|------|
| 그룹 시트 | 공정현황, 검출장치, 관리항목, 관리방법, 대응계획 | ✅ 완료 |
| 개별 항목 | 개별 컬럼 선택 (레벨, 공정설명, 설비 등) | ✅ 완료 |

#### 변경 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `excel-template.ts` | `downloadCurrentData()` 함수 추가 |
| `page.tsx` | 필터 상태, 다운로드 버튼, 편집저장 로직 추가 |
| `PreviewTabs.tsx` | 그룹/개별 필터 드롭다운 UI 추가 |
| `PreviewTable.tsx` | `filteredColumns` 기반 테이블 렌더링 |
| `useEditHandlers.ts` | controlMethod (B7-1) 매핑 추가 |
| `ImportStatusBar.tsx` | missingCount 표시 기능 추가 |

---

> **이전 커밋**: 용어 통일 및 UI 일관성 개선

### 용어 통일 및 UI 일관성 개선 (2026-01-24)

#### 등록화면 명칭 통일

| 모듈 | 변경 내용 | 상태 |
|------|----------|------|
| APQP 등록 | 책임자 → 담당자 | ✅ 완료 |
| DFMEA 등록 | 책임자 → 담당자 | ✅ 완료 |
| PFMEA 등록 | 책임자 → 담당자 | ✅ 완료 |
| CP 등록 | 책임자 → 담당자 | ✅ 완료 |
| PFD 등록 | 책임자 → 담당자 | ✅ 완료 |

#### 신규입력 버튼 네비게이션 수정

| 모듈 | 변경 내용 | 상태 |
|------|----------|------|
| CP 등록 | 신규입력 → 기초정보 Import 페이지로 이동 | ✅ 완료 |
| DFMEA 등록 | 신규입력 → 기초정보 Import 페이지로 이동 | ✅ 완료 |
| PFMEA 등록 | 신규입력 → 기초정보 Import 페이지로 이동 | ✅ 완료 |
| PFD 등록 | 신규입력 → 기초정보 Import 페이지로 이동 | ✅ 완료 |

#### CP 모듈 용어 통일

| 파일 | 변경 내용 | 상태 |
|------|----------|------|
| ProcessFlowInputModal | PFMEA Master → CP Master | ✅ 완료 |
| ProcessDescInputModal | PFMEA 마스터 → 마스터 | ✅ 완료 |

#### DFMEA 모듈 용어 통일 (PFMEA 용어 제거)

| 레벨 | DFMEA 용어 (적용) | PFMEA 용어 (제거) | 상태 |
|------|-----------------|-----------------|------|
| L2 | 초점요소 (Focus Element) | ~~공정~~ | ✅ 완료 |
| L3 | 다음하위수준 (Next Lower Level) | ~~작업요소~~ | ✅ 완료 |

| 파일 | 변경 내용 | 상태 |
|------|----------|------|
| ProcessSelectModal | 공정명 → 초점요소명 | ✅ 완료 |
| useStructureHandlers | 공정 선택 플레이스홀더 제거 | ✅ 완료 |
| excel-export-all | PROCESS NAME → FOCUS NAME | ✅ 완료 |

---

### 리스트 UI 최적화 (9f76d91)

| 모듈 | 변경 내용 | 상태 |
|------|----------|------|
| PFMEA 리스트 | 단계 표시 간소화 ("1단계"만 표시) | ✅ 완료 |
| PFMEA 리스트 | 프로젝트명/FMEA명 컬럼 너비 140px 확대 | ✅ 완료 |
| PFMEA 리스트 | 글씨 크기 축소 (text-[9px]~text-[8px]) | ✅ 완료 |
| PFMEA 리스트 | CFT 숫자만 표시 ("3명" → "3") | ✅ 완료 |
| PFMEA 리스트 | whitespace-nowrap으로 한줄 표시 | ✅ 완료 |
| DFMEA 리스트 | PFMEA 구조 동일 적용 | ✅ 완료 |
| CP 리스트 | 단계 배지 스타일 통일 | ✅ 완료 |

### PFMEA Import UI 개선 (6e6ca5b)

| 항목 | 변경 내용 | 상태 |
|------|----------|------|
| ImportRelationPanel | 분석 완료 전 데이터 표시 제한 (`isAnalysisComplete` 상태) | ✅ 완료 |
| ImportRelationPanel | 현재 분석 중인 FMEA ID 헤더에 표시 | ✅ 완료 |
| ImportPreviewPanel | 백업 버튼 삭제 (DB 저장으로 대체) | ✅ 완료 |
| ImportHeader | 데이터 현황 컬럼 추가 (항목 12, 데이터 갯수) | ✅ 완료 |
| tailwindClasses | 전체 폰트 크기 최적화 (`text-[9px]`) | ✅ 완료 |

### PFD Import 모듈 신규 추가

| 파일 | 설명 | 상태 |
|------|------|------|
| `pfd/import/page.tsx` | CP 구조 기반 메인 페이지 | ✅ 완료 |
| `pfd/import/components/*` | ImportMenuBar, PreviewTable 등 컴포넌트 | ✅ 완료 |
| `pfd/import/constants.ts` | PFD 9컬럼 정의 (제품특별특성, 공정특별특성 포함) | ✅ 완료 |
| Sidebar | PFD 기초정보 메뉴 추가 | ✅ 완료 |

### 분석 데이터 표시 조건

```
구조분석 완료 → 기능분석 완료 → 고장분석 완료 
→ isAnalysisComplete = true 
→ 우측 패널 데이터 표시
```

---

## 🔧 TDD 수정 작업 TODO (2026-01-23)

> **전략**: 모듈화 → 공통 이슈 → 워크플로우 순서대로 테스트 (AI 수정 → 사용자 수동 검증)

---

### 📚 문서화 (2026-01-23)

> **목적**: 유지보수 및 QA 검증을 위한 체계적 문서화

| 문서 | 경로 | 설명 | 상태 |
|------|------|------|------|
| 워크플로우 마스터 | `docs/fmeadocs/00_FMEA_워크플로우_마스터.md` | 전체 워크플로우, 연계 매트릭스 | ✅ 완료 |
| PFMEA PRD & 테스트 | `docs/fmeadocs/01_PFMEA_PRD_테스트체크리스트.md` | PFMEA 9단계 상세 테스트 | ✅ 완료 |
| 연계성 테스트 | `docs/fmeadocs/03_연계성_테스트체크리스트.md` | PFD↔PFMEA↔CP 연계 테스트 | ✅ 완료 |

---

### 🏗️ 0단계: 모듈화 리팩토링 (유지보수성 확보)

> **원칙**: 수정 시 코드 복잡도 증가 금지, 모듈화로 분리 후 최적화 병행

#### 📊 현황 분석

| 모듈 | 원래 행수 | 현재 행수 | 목표 행수 | 감소량 | 상태 |
|------|----------|----------|----------|--------|------|
| `dfmea/hooks/useWorksheetState.ts` | 2,516 | **678** | ~500 | **-1,838 (73%)** | ✅ 마이그레이션 완료 |
| `dfmea/register/page.tsx` | 1,735 | 1,735 | ~500 | - | 📋 다음 대상 |
| `pfmea/register/page.tsx` | 1,688 | 1,688 | ~500 | - | 📋 다음 대상 |
| `pfmea/hooks/useWorksheetState.ts` | 448 | 448 | - | - | ✅ 벤치마크 |

#### 🎯 DFMEA 워크시트 모듈화 완료 내역 (2026-01-23)

| 추출 모듈 | 행수 | 분리된 기능 |
|----------|------|-------------|
| `useFailureLinkUtils.ts` | 181 | 고장연결 정규화 |
| `useWorksheetSave.ts` | 296 | 저장/동기화 로직 |
| `useRowsCalculation.ts` | 246 | 행/스팬 계산 |
| `useWorksheetDataLoader.ts` | 378 | 데이터 로드/초기화 |
| **총 신규 모듈** | **1,101** | |

#### 🎯 DFMEA 모듈화 계획 (PFMEA 패턴 적용)

| 순서 | 추출 대상 | 실제 행수 | 역할 | 상태 |
|------|----------|----------|------|------|
| 1 | `useWorksheetDataLoader.ts` | 378 | 데이터 로드/초기화 | ✅ 생성 완료 |
| 2 | `useWorksheetSave.ts` | 296 | 저장/동기화 로직 | ✅ 생성 완료 |
| 3 | `useFailureLinkUtils.ts` | 181 | 고장연결 정규화 | ✅ 생성 완료 |
| 4 | `useRowsCalculation.ts` | 246 | 행/스팬 계산 | ✅ 생성 완료 |
| 5 | `useWorksheetState.ts` | ~500 | 코어 상태만 유지 | 📋 점진적 마이그레이션 |

> **현재 상태**: 새 모듈 4개 생성 완료 (총 1,101행). 기존 `useWorksheetState.ts`는 기능 안정성을 위해 유지하며 점진적으로 마이그레이션 예정.

---

### 🔄 DFMEA ↔ PFMEA 구조 동기화 (2026-01-23)

> **원칙**: PFMEA가 기준, DFMEA는 PFMEA 구조를 따름. DB는 분리 운영.

#### 📊 hooks 파일 동기화 현황 (2026-01-24 완료)

| PFMEA (기준) | DFMEA (동기화됨) | 상태 |
|-------------|-----------------|------|
| `useWorksheetState.ts` (448행) | `useWorksheetState.ts` (678행) | ✅ 구조동일 |
| `useWorksheetDataLoader.ts` (892행) | `useWorksheetDataLoader.ts` (378행) | ✅ 구조동일 |
| `useWorksheetSave.ts` (415행) | `useWorksheetSave.ts` (296행) | ✅ 구조동일 |
| `useRowsCalculation.ts` (220행) | `useRowsCalculation.ts` (246행) | ✅ 구조동일 |
| `useFailureLinkUtils.ts` (179행) | `useFailureLinkUtils.ts` (181행) | ✅ 구조동일 |
| `useMasterData.ts` (128행) | `useMasterData.ts` (128행) | ✅ 동일 |
| `usePageHandlers.ts` (222행) | `usePageHandlers.ts` (222행) | ✅ 동일 |
| `useProcessHandlers.ts` (201행) | `useProcessHandlers.ts` (214행) | ✅ 새로 추가 |
| `useExcelHandlers.ts` (126행) | `useExcelHandlers.ts` (145행) | ✅ 새로 추가 |
| `useCpSync.ts` (167행) | - | PFMEA 전용 (CP연동) |
| `index.ts` (11행) | `index.ts` (31행) | ✅ 정리완료 |

> **미사용 파일 정리**: `useCellEdit`, `useDFMEAWorksheet`, `useSaveWithForce`, `useWorksheetCore`, `useWorksheetDB`, `useWorksheetHandlers`, `useWorksheetRows` → `_deprecated/` 폴더로 이동

#### 📁 폴더 구조 동기화 (2026-01-24 완료)

| PFMEA 폴더 | DFMEA 폴더 | 상태 |
|-----------|-----------|------|
| `cft/` | `cft/` | ✅ 생성완료 |
| `approve/` | `approve/` | ✅ 생성완료 |
| `lessons-learned/` | `lessons-learned/` | ✅ 생성완료 |
| `ap-improvement/` | `ap-improvement/` | ✅ 생성완료 |
| `all-template/` | `all-template/` | ✅ 생성완료 |
| `fmea4/` | `fmea4/` | ✅ 생성완료 |

#### 💾 DB 분리 구조 (확인됨 ✅)

| 항목 | DFMEA | PFMEA |
|-----|-------|-------|
| localStorage key | `dfmea_atomic_${fmeaId}` | `pfmea_atomic_${fmeaId}` |
| API endpoint | `/api/dfmea/worksheet` | `/api/pfmea/worksheet` |
| ID prefix | `dfm` | `pfm` |

---

### 🏗️ PFMEA 모듈화 리팩토링 계획 (2026-01-24)

> **원칙**: AntiGravity 모듈화 방식 벤치마킹 - 단일 책임, 훅 분리, 컴포넌트 분리

#### 📊 대상 파일 (우선순위순)

| 순위 | 파일 | 현재 행수 | 목표 행수 | 상태 |
|-----|------|----------|----------|------|
| 1 | `register/page.tsx` | 1,688 | ~300 | ✅ 훅 분리 완료 |
| 2 | `revision/page.tsx` | 1,216 | ~300 | 📋 대기 |
| 3 | `hooks/useWorksheetDataLoader.ts` | 892 | ~400 | 📋 대기 |
| 4 | `tabs/all/RiskOptCellRenderer.tsx` | 932 | ~300 | 📋 대기 |
| 5 | `tabs/all/AllTabEmpty.tsx` | 909 | ~300 | 📋 대기 |

#### ✅ register/page.tsx 모듈화 완료 (2026-01-24)

**생성된 파일:**

| 파일 | 행수 | 역할 |
|------|------|------|
| `types.ts` | 145 | 타입 정의 (FMEAInfo, FMEAType 등) |
| `utils.ts` | 167 | 유틸 함수 (ID 생성, localStorage 동기화) |
| `hooks/useRegisterState.ts` | 84 | 상태 관리 |
| `hooks/useModalState.ts` | 62 | 모달 상태 |
| `hooks/useFmeaApi.ts` | 284 | API 호출 |
| `hooks/useRegisterHandlers.ts` | 226 | 이벤트 핸들러 |
| `hooks/index.ts` | 9 | 훅 export |
| `components/RegisterInfoSection.tsx` | 306 | 기초정보 폼 |
| `components/CFTSection.tsx` | 69 | CFT 테이블 |
| `components/AccessLogSection.tsx` | 38 | 접속 로그 |
| `components/index.ts` | 8 | 컴포넌트 export |
| **신규 총계** | **1,381** | |

#### ✅ 공통 훅 생성 (2026-01-24)

| 파일 | 행수 | 용도 |
|------|------|------|
| `src/hooks/useUserSelectModal.ts` | 81 | 사용자 선택 모달 (모든 앱 공통) |
| `src/hooks/useBizInfoSelectModal.ts` | 65 | 고객정보 선택 모달 (모든 앱 공통) |
| `src/hooks/useDatePickerModal.ts` | 74 | 날짜 선택 모달 (모든 앱 공통) |
| `src/hooks/index.ts` | 17 | 공통 훅 export |

> **상태**: 리팩토링 완료

#### ✅ page.tsx 대폭 간소화 (2026-01-24)

| 항목 | 변경 전 | 변경 후 | 감소율 |
|------|--------|--------|-------|
| `page.tsx` | 1,688행 | **459행** | **73% 감소** |

**주요 변경:**
- 중복 FMEA 선택 모달 제거 (2개 → 1개)
- `FmeaSelectModal.tsx` 공통 컴포넌트 생성 (161행)
- `ApqpSelectModal.tsx` 공통 컴포넌트 생성 (107행)
- 인라인 JSX 정리 및 코드 압축

#### 🎯 1. register/page.tsx 모듈화 계획

**현재 구조:**
```
pfmea/register/
└── page.tsx (1,688행) ← 단일 파일
```

**목표 구조:**
```
pfmea/register/
├── page.tsx              (~100행) - 메인 페이지 (레이아웃만)
├── hooks/
│   ├── index.ts          - 훅 export
│   ├── useRegisterState.ts    (~150행) - 상태 관리
│   ├── useRegisterHandlers.ts (~200행) - 핸들러 로직
│   ├── useFmeaApi.ts          (~150행) - API 호출
│   └── useModalState.ts       (~100행) - 모달 상태
├── components/
│   ├── index.ts          - 컴포넌트 export
│   ├── RegisterForm.tsx       (~300행) - 등록 폼
│   ├── FmeaTypeSelector.tsx   (~100행) - 유형 선택
│   ├── ParentFmeaSelector.tsx (~150행) - 상위 FMEA 선택
│   └── CFTSection.tsx         (~150행) - CFT 섹션
├── types.ts              (~50행) - 타입 정의
└── utils.ts              (~50행) - 유틸 함수
```

#### 🎯 2. revision/page.tsx 모듈화 계획

**목표 구조:**
```
pfmea/revision/
├── page.tsx              (~100행)
├── hooks/
│   ├── useRevisionState.ts
│   ├── useRevisionHandlers.ts
│   └── useRevisionApi.ts
├── components/
│   ├── RevisionForm.tsx
│   ├── RevisionHistory.tsx
│   └── SODCompare.tsx
└── types.ts
```

#### 🎯 3. useWorksheetDataLoader.ts 모듈화 계획

**목표 구조:**
```
pfmea/worksheet/hooks/
├── useWorksheetDataLoader.ts (~200행) - 메인 로더
├── loaders/
│   ├── useInitialLoad.ts      - 초기 로드
│   ├── useInheritanceLoad.ts  - 상속 로드
│   └── useMigrationLoad.ts    - 마이그레이션
```

#### 🎯 4. RiskOptCellRenderer.tsx 모듈화 계획

**목표 구조:**
```
pfmea/worksheet/tabs/all/
├── RiskOptCellRenderer.tsx (~150행) - 메인 렌더러
├── cells/
│   ├── RiskCells.tsx      - 리스크 셀
│   ├── OptCells.tsx       - 최적화 셀
│   └── CommonCells.tsx    - 공통 셀
```

#### 🎯 5. AllTabEmpty.tsx 모듈화 계획

**목표 구조:**
```
pfmea/worksheet/tabs/all/
├── AllTabEmpty.tsx (~200행) - 빈 상태 메인
├── empty/
│   ├── EmptyStructure.tsx
│   ├── EmptyFunction.tsx
│   └── EmptyFailure.tsx
```

#### ✅ 모듈화 원칙

1. **단일 책임**: 한 파일 = 한 기능
2. **명시적 의존성**: import/export로 관계 명확화
3. **테스트 용이성**: 작은 단위로 테스트 가능
4. **복잡도 금지**: 수정 시 행 수 증가 금지, 오히려 감소 목표

---

### ✅ 1차 완료 (2026-01-23)

| # | 이슈 | 작업 내용 | 상태 | 완료일 |
|---|------|----------|------|--------|
| 1 | ISSUE-003 | riskData 키 불일치 수정 (Single Source of Truth) | ✅ 완료 | 2026-01-23 |
| 2 | ISSUE-015 | DB/localStorage 동기화 정책 정립 | ✅ 완료 | 2026-01-23 |
| 3 | ISSUE-001 | 리스크분석 failureCauses 연결 로직 수정 | ✅ 완료 | 2026-01-23 |
| 4 | ISSUE-002 | 최적화 탭 optimization 배열 초기화 | ✅ 완료 | 2026-01-23 |
| 5 | - | TypeScript 오류 38개 전체 수정 | ✅ 완료 | 2026-01-23 |

---

### 📋 2차 TDD 테스트 순서 (워크플로우 기반)

> **방식**: AI가 수정 → 사용자가 수동 테스트로 검증 → 다음 단계 진행

| 순서 | 단계 | 테스트 범위 | AI 수정 | 사용자 검증 |
|------|------|------------|---------|------------|
| 0 | **공통 이슈** | DB 연결, 인증, 공용 모달 | 📋 대기 | ⬜ 대기 |
| 1 | **PFMEA 등록** | 프로젝트 생성, FMEA 정보 입력 | 📋 대기 | ⬜ 대기 |
| 2 | **CFT 구성** | CFT 멤버 추가/수정/삭제 | 📋 대기 | ⬜ 대기 |
| 3 | **기초정보 등록** | 마스터 데이터 Import, 공정/작업요소 | 📋 대기 | ⬜ 대기 |
| 4 | **구조분석** | L1/L2/L3 구조 입력, 공정선택 모달 | 📋 대기 | ⬜ 대기 |
| 5 | **기능분석** | L1/L2/L3 기능 입력, 특별특성 | 📋 대기 | ⬜ 대기 |
| 6 | **고장분석/연결** | FE/FM/FC 입력, 고장연결 SVG | 📋 대기 | ⬜ 대기 |
| 7 | **리스크분석** | SOD 입력, AP/RPN 계산, LLD | 📋 대기 | ⬜ 대기 |
| 8 | **최적화** | 조치계획, 새 SOD, 새 AP/RPN | 📋 대기 | ⬜ 대기 |

---

### 📝 단계별 상세 테스트 케이스

#### 0️⃣ 공통 이슈
- [ ] TC-COMMON-001: DB 연결 상태 확인
- [ ] TC-COMMON-002: 로그인/로그아웃 동작
- [ ] TC-COMMON-003: 세션 유지 확인
- [ ] TC-COMMON-004: SODSelectModal 동작
- [ ] TC-COMMON-005: LLDSelectModal 동작

#### 1️⃣ PFMEA 등록
- [ ] TC-REG-001: 새 PFMEA 프로젝트 생성
- [ ] TC-REG-002: FMEA 정보(품목, 모델연도 등) 저장
- [ ] TC-REG-003: 등록 후 리스트 표시 확인
- [ ] TC-REG-004: 프로젝트 삭제 동작

#### 2️⃣ CFT 구성
- [ ] TC-CFT-001: CFT 멤버 추가
- [ ] TC-CFT-002: CFT 멤버 역할 수정
- [ ] TC-CFT-003: CFT 멤버 삭제
- [ ] TC-CFT-004: CFT 저장 후 재로드 확인

#### 3️⃣ 기초정보 등록
- [ ] TC-BASIC-001: 마스터 데이터 Import
- [ ] TC-BASIC-002: 공정 목록 저장/로드
- [ ] TC-BASIC-003: 작업요소 저장/로드
- [ ] TC-BASIC-004: 기초정보 → 워크시트 연동 (ISSUE-014)

#### 4️⃣ 구조분석
- [ ] TC-STRUCT-001: L1 완제품명 입력
- [ ] TC-STRUCT-002: L2 공정 추가 (공정선택 모달, ISSUE-011)
- [ ] TC-STRUCT-003: L3 작업요소 추가
- [ ] TC-STRUCT-004: 구조분석 확정 및 저장
- [ ] TC-STRUCT-005: 새로고침 후 데이터 유지

#### 5️⃣ 기능분석
- [ ] TC-FUNC-001: L1 완제품 기능 입력
- [ ] TC-FUNC-002: L2 공정 기능 입력 (입력모달, ISSUE-012)
- [ ] TC-FUNC-003: L3 작업요소 기능 입력
- [ ] TC-FUNC-004: 특별특성(CC/SC) 입력
- [ ] TC-FUNC-005: 기능분석 확정 및 저장

#### 6️⃣ 고장분석/연결
- [ ] TC-FAIL-001: L1 고장영향(FE) 입력
- [ ] TC-FAIL-002: L2 고장형태(FM) 입력
- [ ] TC-FAIL-003: L3 고장원인(FC) 입력
- [ ] TC-FAIL-004: 고장연결 SVG 표시
- [ ] TC-FAIL-005: FE-FM-FC 연결 생성
- [ ] TC-FAIL-006: 고장연결 확정 및 저장

#### 7️⃣ 리스크분석
- [ ] TC-RISK-001: FC 목록 표시 (ISSUE-001 검증)
- [ ] TC-RISK-002: 예방관리(PC) 입력
- [ ] TC-RISK-003: 발생도(O) SOD 모달 선택
- [ ] TC-RISK-004: 검출관리(DC) 입력
- [ ] TC-RISK-005: 검출도(D) SOD 모달 선택
- [ ] TC-RISK-006: AP/RPN 자동 계산
- [ ] TC-RISK-007: 습득교훈(LLD) 선택
- [ ] TC-RISK-008: riskData 저장/로드 (ISSUE-003 검증)
- [ ] TC-RISK-009: 리스크분석 확정

#### 8️⃣ 최적화
- [ ] TC-OPT-001: 리스크분석 데이터 표시 (ISSUE-002 검증)
- [ ] TC-OPT-002: 조치계획 입력
- [ ] TC-OPT-003: 책임자/목표일 입력
- [ ] TC-OPT-004: 새 SOD 입력
- [ ] TC-OPT-005: 새 AP/RPN 계산
- [ ] TC-OPT-006: 최적화 확정 및 저장

---

### 이슈 심각도 분류
| 심각도 | 건수 | 설명 |
|--------|------|------|
| 🔴 Critical | 3 | 서비스 사용 불가 |
| 🟠 Major | 10 | 주요 기능 제한 |
| 🟡 Minor | 3 | UX 개선 필요 |

---

## 🔴 심각(Critical) - 즉시 수정 필요

### ISSUE-001: 리스크분석 데이터 연계 실패
| 항목 | 내용 |
|------|------|
| **위치** | `RiskTabConfirmable.tsx` |
| **증상** | 고장연결 확정 후 리스크분석 탭에 고장원인(FC)이 표시되지 않음 |
| **원인** | `state.l2[].failureCauses` 배열이 비어있음. 고장분석에서 입력한 FC가 l2 구조에 제대로 연결되지 않음 |
| **영향** | 리스크분석 전체 기능 사용 불가 |
| **수정 방안** | `failureCauses` 데이터가 고장분석 탭에서 올바르게 l2 구조에 저장되는지 확인 및 연결 로직 점검 |

```typescript
// 문제 코드 (RiskTabConfirmable.tsx:76)
const causes = state.l2.flatMap(proc => 
  ((proc as unknown as Record<string, unknown>).failureCauses as Array<...>) || []
);
// state.l2[].failureCauses가 undefined 또는 빈 배열
```

---

### ISSUE-002: 최적화 탭 데이터 미표시
| 항목 | 내용 |
|------|------|
| **위치** | `OptTabConfirmable.tsx` |
| **증상** | 리스크분석 확정 후 최적화 탭에 데이터가 없음 |
| **원인** | `state.optimization` 배열이 초기화되지 않음. 리스크분석 → 최적화 데이터 전달 로직 누락 |
| **영향** | 최적화(6단계) 전체 기능 사용 불가 |
| **수정 방안** | 리스크분석 확정 시 `optimization` 배열 자동 생성 로직 추가 |

```typescript
// 문제 코드 (OptTabConfirmable.tsx:82)
const optData = ((state as unknown as Record<string, unknown>).optimization as OptData[]) || [];
// state.optimization이 항상 빈 배열
```

---

### ISSUE-003: riskData 키 불일치
| 항목 | 내용 |
|------|------|
| **위치** | `useWorksheetState.ts`, `RiskTabConfirmable.tsx` |
| **증상** | riskData 값이 저장되었다가 새로고침 시 사라짐 |
| **원인** | localStorage 키가 분산되어 있음: `pfmea_riskData_${fmeaId}`, `pfmea_worksheet_${fmeaId}` 두 곳에서 저장/로드 |
| **영향** | 리스크분석 데이터 유실 |
| **수정 방안** | riskData 저장/로드 로직 통합. Single Source of Truth 원칙 적용 |

---

## 🟠 중간(Major) - 조속히 수정 필요

### ISSUE-004: LLD(습득교훈) 선택 후 저장 키 불일치
| 항목 | 내용 |
|------|------|
| **위치** | `LLDSelectModal.tsx`, `RiskTabConfirmable.tsx` |
| **증상** | LLD 모달에서 습득교훈 선택 후 셀에 표시되나 저장 안됨 |
| **원인** | LLD 선택 시 `lessonLearned` 필드에 저장하지만, riskData에는 `${fcId}-LL` 키로 저장해야 함 |
| **영향** | 습득교훈 데이터 미저장 |
| **수정 방안** | `updateRiskData` 호출 시 올바른 키 형식 사용 |

```typescript
// 현재 코드 (RiskTabConfirmable.tsx)
updateRiskData(lldModal.fcId, 'lessonLearned', lldNo);

// 수정 필요
// riskDataObj[`${fcId}-LL`] = lldNo 형태로 저장되어야 함
```

---

### ISSUE-005: CFT 멤버 저장 시 name 없는 멤버 제외
| 항목 | 내용 |
|------|------|
| **위치** | `fmea-project-service.ts` |
| **증상** | CFT 테이블에서 role만 입력하고 name 없이 저장 시 해당 행 사라짐 |
| **원인** | `saveCftMembers` 함수에서 `name`이 없는 멤버 필터링 (의도된 동작이지만 UX 문제) |
| **영향** | 사용자 혼란, 데이터 의도치 않은 삭제 |
| **수정 방안** | name이 필수라는 UI 안내 추가 또는 빈 멤버 보존 옵션 |

---

### ISSUE-006: 고장연결 확정 후 리스크분석 탭 전환 시 오류
| 항목 | 내용 |
|------|------|
| **위치** | `useWorksheetState.ts` |
| **증상** | 고장연결 확정 후 리스크분석 탭으로 이동 시 화면 깜빡임 |
| **원인** | `suppressAutoSaveRef` 타이밍 이슈로 상태 업데이트 충돌 |
| **영향** | UX 저하, 간헐적 데이터 불일치 |
| **수정 방안** | 탭 전환 시 상태 동기화 로직 점검 |

---

### ISSUE-007: DB 저장 실패 시 사용자 알림 없음
| 항목 | 내용 |
|------|------|
| **위치** | `db-storage.ts` |
| **증상** | DB 저장 실패해도 사용자에게 알림 없이 localStorage 폴백 |
| **원인** | 에러 throw 제거로 인해 조용히 폴백 처리 |
| **영향** | 사용자가 DB 저장 실패 인지 못함 |
| **수정 방안** | Toast 알림으로 DB 저장 상태 표시 |

---

## 🟠 중간(Major) - 조속히 수정 필요 (추가)

### ISSUE-011: 구조분석 공정선택 모달 데이터 미표시
| 항목 | 내용 |
|------|------|
| **위치** | `ProcessSelectModal.tsx`, `master-processes/route.ts` |
| **증상** | 구조분석에서 공정선택 모달 열면 마스터 공정 목록이 비어있음 |
| **원인** | `/api/fmea/master-processes` API가 `pfmeaMasterDataset`에서 활성 데이터셋을 찾지 못함. 기초정보 Import 미완료 |
| **영향** | 공정 추가 시 수동 입력만 가능 |
| **수정 방안** | 마스터 데이터셋 활성화 검증 및 localStorage 폴백 개선 |

```typescript
// 문제 코드 (master-processes/route.ts:41-52)
const activeDataset = await prisma.pfmeaMasterDataset.findFirst({
  where: { isActive: true },
});
// activeDataset이 null이면 빈 배열 반환
```

---

### ISSUE-012: 기능분석 입력모달 미작동
| 항목 | 내용 |
|------|------|
| **위치** | `FunctionL1Tab.tsx`, `FunctionL2Tab.tsx`, `FunctionL3Tab.tsx` |
| **증상** | 기능분석 셀 클릭 시 입력모달이 열리지 않고 인라인 편집만 가능 |
| **원인** | 기능분석 탭에서 모달 연동 로직 미구현. 구조분석과 달리 DataSelectModal 연결 없음 |
| **영향** | 기초정보 마스터데이터 연동 불가, 수동 입력만 가능 |
| **수정 방안** | 기능분석 셀에 DataSelectModal 연동 추가 |

---

### ISSUE-013: 누락통계(missingCounts) 계산 오류
| 항목 | 내용 |
|------|------|
| **위치** | `StructureTab.tsx`, `page.tsx` |
| **증상** | 구조분석 헤더의 "누락 X건" 표시가 실제 누락 데이터와 불일치 |
| **원인** | `missingCounts` 계산 시 빈 문자열과 undefined/null 구분 미흡. L1/L2/L3 각 레벨별 카운트 오류 |
| **영향** | 사용자 혼란, 데이터 완성도 파악 어려움 |
| **수정 방안** | missingCounts 계산 로직 정밀 검증 |

```typescript
// 문제 코드 (StructureHeader)
const totalMissing = missingCounts?.total || 
  ((missingCounts?.l1Count || 0) + (missingCounts?.l2Count || 0) + (missingCounts?.l3Count || 0));
// l1Count, l2Count, l3Count가 undefined일 때 잘못된 값 표시
```

---

### ISSUE-014: 기초정보 DB 저장과 입력모달 표시 불일치
| 항목 | 내용 |
|------|------|
| **위치** | `register/page.tsx`, `ProcessSelectModal.tsx`, `DataSelectModal.tsx` |
| **증상** | 기초정보에서 저장한 마스터 데이터가 워크시트 입력모달에 표시 안됨 |
| **원인** | 기초정보는 DB(`fmea_registrations`)에 저장, 입력모달은 localStorage(`pfmea_master_data`)에서 로드. 동기화 미연결 |
| **영향** | 기초정보와 워크시트 간 데이터 단절 |
| **수정 방안** | 기초정보 저장 시 localStorage 동시 저장 또는 입력모달에서 DB 조회 |

```typescript
// 문제 (ProcessSelectModal.tsx:56-88)
const loadProcessesFromBasicInfo = (): ProcessItem[] => {
  const savedData = localStorage.getItem('pfmea_master_data'); // ← DB 아닌 localStorage
  // 기초정보가 DB에만 저장되면 여기서 로드 안됨
};
```

---

### ISSUE-015: DB 데이터와 localStorage 데이터 불일치
| 항목 | 내용 |
|------|------|
| **위치** | 전역 (db-storage.ts, useWorksheetState.ts) |
| **증상** | DB에 저장된 데이터와 화면에 표시되는 데이터가 다름 |
| **원인** | 저장 시 DB + localStorage 동시 저장하지만, 로드 시 localStorage 우선 로드. DB 변경이 반영 안됨 |
| **영향** | 다른 브라우저/기기에서 DB 데이터 조회 시 불일치 |
| **수정 방안** | DB를 Single Source of Truth로 설정, localStorage는 캐시 용도로만 사용 |

---

### ISSUE-016: 구조분석 작업요소 선택 모달 데이터 미연동
| 항목 | 내용 |
|------|------|
| **위치** | `WorkElementSelectModal.tsx` |
| **증상** | 작업요소 선택 모달에서 마스터 기초정보 데이터 표시 안됨 |
| **원인** | 공정선택 모달과 동일하게 localStorage 의존, DB 미연동 |
| **영향** | 작업요소 추가 시 수동 입력만 가능 |
| **수정 방안** | DB에서 마스터 작업요소 조회 API 추가 |

---

## 🟡 경미(Minor) - 개선 권장

### ISSUE-008: 구조분석 L1 이름 미입력 시 안내 부족
| 항목 | 내용 |
|------|------|
| **위치** | `StructureTab.tsx` |
| **증상** | 완제품명(L1) 미입력 상태에서도 확정 버튼 활성화 |
| **원인** | L1 필수 입력 검증 로직 미흡 |
| **수정 방안** | L1 미입력 시 확정 버튼 비활성화 + 안내 메시지 |

---

### ISSUE-009: 기능분석 데이터 저장 시 functions 배열 누락
| 항목 | 내용 |
|------|------|
| **위치** | `FunctionTab.tsx`, `db-storage.ts` |
| **증상** | 기능분석 입력 후 새로고침 시 일부 데이터 사라짐 |
| **원인** | `l2[].functions` 배열이 저장 시 누락되는 경우 있음 |
| **수정 방안** | 저장 전 functions 배열 검증 로직 추가 |

---

### ISSUE-010: SOD 모달 선택 값 즉시 반영 안됨
| 항목 | 내용 |
|------|------|
| **위치** | `SODSelectModal.tsx`, `RiskTabConfirmable.tsx` |
| **증상** | SOD 모달에서 값 선택 후 셀에 바로 표시 안되고 클릭해야 표시 |
| **원인** | 상태 업데이트 후 리렌더링 타이밍 이슈 |
| **수정 방안** | `useEffect` 의존성 배열 점검 |

---

## 📋 수정 작업 목록 (우선순위순)

### P1 - 긴급 (서비스 영향)

| # | 이슈 | 파일 | 작업 내용 | 예상 소요 |
|---|------|------|----------|----------|
| 1 | ISSUE-001 | `RiskTabConfirmable.tsx`, `constants.ts` | failureCauses 연결 로직 수정 | 2시간 |
| 2 | ISSUE-002 | `OptTabConfirmable.tsx`, `useWorksheetState.ts` | optimization 배열 초기화 로직 추가 | 1시간 |
| 3 | ISSUE-003 | `useWorksheetState.ts`, `useWorksheetSave.ts` | riskData 저장/로드 통합 | 1.5시간 |

### P2 - 높음 (기능 제한)

| # | 이슈 | 파일 | 작업 내용 | 예상 소요 |
|---|------|------|----------|----------|
| 4 | ISSUE-004 | `RiskTabConfirmable.tsx` | LLD 저장 키 수정 | 30분 |
| 5 | ISSUE-006 | `useWorksheetState.ts` | 탭 전환 시 상태 동기화 | 1시간 |
| 6 | ISSUE-007 | `db-storage.ts`, 공용 Toast | DB 저장 실패 알림 추가 | 1시간 |
| 7 | ISSUE-011 | `ProcessSelectModal.tsx`, `master-processes/route.ts` | 공정선택 모달 DB 연동 | 2시간 |
| 8 | ISSUE-012 | `FunctionL1/L2/L3Tab.tsx` | 기능분석 입력모달 연동 | 3시간 |
| 9 | ISSUE-013 | `StructureTab.tsx`, `page.tsx` | 누락통계 계산 로직 수정 | 1시간 |
| 10 | ISSUE-014 | `register/page.tsx`, 모달들 | 기초정보↔워크시트 데이터 동기화 | 2시간 |
| 11 | ISSUE-015 | `db-storage.ts`, `useWorksheetState.ts` | DB/localStorage 동기화 정책 정립 | 2시간 |
| 12 | ISSUE-016 | `WorkElementSelectModal.tsx` | 작업요소 모달 DB 연동 | 1.5시간 |

### P3 - 보통 (UX 개선)

| # | 이슈 | 파일 | 작업 내용 | 예상 소요 |
|---|------|------|----------|----------|
| 13 | ISSUE-005 | 등록화면 CFT 테이블 | name 필수 UI 안내 | 30분 |
| 14 | ISSUE-008 | `StructureTab.tsx` | L1 필수 검증 추가 | 30분 |
| 15 | ISSUE-009 | `FunctionTab.tsx` | functions 배열 검증 | 1시간 |
| 16 | ISSUE-010 | `SODSelectModal.tsx` | 리렌더링 타이밍 수정 | 30분 |

### 총 예상 소요 시간
| 우선순위 | 이슈 수 | 소요 시간 |
|----------|---------|----------|
| P1 | 3개 | 4.5시간 |
| P2 | 9개 | 14시간 |
| P3 | 4개 | 2.5시간 |
| **합계** | **16개** | **21시간** |

---

## 🔍 추가 조사 필요 항목

1. **DB 테이블 스키마 검증**
   - `fmea_worksheet_data` 테이블에 `riskAnalyses`, `optimization` 컬럼 존재 여부 확인
   - `failureCauses` 데이터가 어느 테이블에 저장되는지 확인

2. **레거시 데이터 마이그레이션**
   - `fmea_legacy_data` → 신규 스키마 변환 검증
   - 변환 과정에서 데이터 손실 여부 확인

3. **동시성 이슈**
   - 여러 탭에서 동시 저장 시 데이터 덮어쓰기 문제

4. **기초정보 마스터 데이터 연동 (신규)**
   - `pfmeaMasterDataset` 테이블 활성화 조건 확인
   - `pfmeaMasterFlatItem` 테이블 데이터 구조 검증
   - 기초정보 Import → 워크시트 모달 연동 경로 확인

5. **localStorage 키 정리 (신규)**
   - 현재 사용 중인 localStorage 키 목록 정리
   - 중복/미사용 키 식별 및 정리
   - 키 네이밍 규칙 표준화 필요

6. **데이터 흐름 아키텍처 검토 (신규)**
   - 기초정보 입력 → DB → 워크시트 모달 → 셀 입력 → DB 저장 전체 흐름 검증
   - Single Source of Truth 정책 수립 필요

---

## 📌 테스트 환경 정보

```
OS: Windows 10/11
Node.js: v18+
Next.js: 16.1.1
Database: PostgreSQL (Supabase)
Browser: Chrome 121+
```

---

## 📝 테스트 상세 로그

### TC-RISK-001: 리스크분석 데이터 표시
```
[테스트] 고장연결 확정 후 리스크분석 탭 이동
[결과] ❌ 실패
[로그] 
  - state.l2.length: 3
  - state.l2[0].failureCauses: undefined
  - state.l2[1].failureCauses: undefined
  - riskData에서 causes 추출: 0개
```

### TC-OPT-001: 최적화 데이터 표시
```
[테스트] 리스크분석 확정 후 최적화 탭 이동
[결과] ❌ 실패
[로그]
  - state.optimization: undefined
  - optData 배열 길이: 0
  - 테이블 행: 0개
```

### TC-RISKDATA-001: riskData 영속성
```
[테스트] SOD 값 입력 후 새로고침
[결과] ❌ 실패
[로그]
  - 저장 전 riskData 키: 15개
  - 새로고침 후 riskData 키: 0개
  - localStorage pfmea_riskData_pfm26-p001: null
  - localStorage pfmea_worksheet_pfm26-p001.riskData: 15개 (불일치)
```

### TC-STRUCT-002: 공정선택 모달 마스터 데이터 표시
```
[테스트] 구조분석 → 메인공정 헤더 클릭 → 공정선택 모달
[결과] ❌ 실패
[로그]
  - API 호출: /api/fmea/master-processes
  - 응답: { success: true, processes: [], source: 'none', message: 'Master FMEA...' }
  - 원인: pfmeaMasterDataset.findFirst({ where: { isActive: true } }) → null
  - localStorage 폴백: pfmea_master_data → null
```

### TC-FUNC-001: 기능분석 입력모달 표시
```
[테스트] 기능분석 L1 탭 → 완제품기능 셀 클릭
[결과] ❌ 실패
[로그]
  - 기대 동작: DataSelectModal 표시
  - 실제 동작: 인라인 편집 모드만 활성화
  - 원인: FunctionL1Tab에 모달 연동 로직 없음
```

### TC-STRUCT-003: 누락통계 정확성
```
[테스트] 구조분석 헤더 "누락 X건" 표시 검증
[결과] ❌ 실패
[로그]
  - L1(완제품명): 입력됨 → l1Count: 0 (정상)
  - L2(메인공정): 3개 입력 → l2Count: 0 (정상)
  - L3(작업요소): 5개 중 2개 미입력 → l3Count: 0 (오류, 예상: 2)
  - 원인: l3Count 계산 시 빈 문자열 체크 누락
```

### TC-REG-DB-001: 기초정보 DB-모달 동기화
```
[테스트] 기초정보 저장 후 워크시트 공정선택 모달
[결과] ❌ 실패
[로그]
  - 기초정보 저장: /api/fmea/projects (POST) → success
  - DB 저장 확인: fmea_registrations 테이블 → 데이터 있음
  - 공정선택 모달: loadMasterProcessesFromDB() → 빈 배열
  - 원인: 기초정보는 fmea_registrations에, 모달은 pfmeaMasterDataset에서 조회
```

---

## 📅 다음 단계

1. **P1 이슈 수정** (오늘)
   - ISSUE-001, ISSUE-002, ISSUE-003 즉시 수정

2. **회귀 테스트** (수정 후)
   - 구조분석 → 최적화 전체 플로우 재검증

3. **P2 이슈 수정** (내일)
   - ISSUE-004 ~ ISSUE-007

4. **통합 테스트** (수정 완료 후)
   - 전체 워크플로우 End-to-End 테스트

---

---

## 🆕 PRD/마스터플랜 기반 종합 분석 (2026-01-23 추가)

> **분석 기준 문서**:
> - `스마트시스템데이타연계성 매트릭스.md` (v3.3)
> - `중요_ONPREMISE_MASTER_PLAN.md` (v2.8.0)
> - `PRD_사용자권한관리.md` (v1.0)

---

## 📊 탭별 미구현 기능 분석

### 1️⃣ 구조분석 (StructureTab)

| 기능 | PRD 요구사항 | 현재 상태 | 이슈 |
|------|------------|----------|------|
| L1 구조 저장 | DB `l1_structures` 저장 | ✅ 완료 | - |
| L2 구조 저장 | DB `l2_structures` 저장 | ✅ 완료 | - |
| L3 구조 저장 | DB `l3_structures` 저장 | ✅ 완료 | - |
| 공정선택 모달 | 마스터 데이터 연동 | ❌ 미작동 | ISSUE-011 |
| 작업요소 모달 | 마스터 데이터 연동 | ❌ 미작동 | ISSUE-016 |
| 확정 기능 | 확정 시 DB 저장 | ✅ 완료 | - |
| **4M 분류 자동화** | MN/MC/IM/EN 자동 분류 | ⚠️ 수동 입력만 | 신규 발견 |

### 2️⃣ 기능분석 (FunctionL1/L2/L3Tab)

| 기능 | PRD 요구사항 | 현재 상태 | 이슈 |
|------|------------|----------|------|
| L1 기능 저장 | DB `l1_functions` 저장 | ✅ 완료 | - |
| L2 기능 저장 | DB `l2_functions` 저장 | ✅ 완료 | - |
| L3 기능 저장 | DB `l3_functions` 저장 | ✅ 완료 | - |
| **입력모달 연동** | 마스터 데이터 선택 | ❌ 미구현 | ISSUE-012 |
| **특별특성 선택** | CC/SC 드롭다운 | ⚠️ 수동 입력만 | 신규 발견 |
| 다중선택 기능 | 구조분석 데이터 참조 | ✅ 완료 | - |

### 3️⃣ 고장분석 (FailureL1/L2/L3Tab)

| 기능 | PRD 요구사항 | 현재 상태 | 이슈 |
|------|------------|----------|------|
| FE 저장 | DB `failure_effects` 저장 | ✅ 완료 | - |
| FM 저장 | DB `failure_modes` 저장 | ✅ 완료 | - |
| FC 저장 | DB `failure_causes` 저장 | ✅ 완료 | - |
| 심각도 선택 | SODSelectModal | ✅ 완료 | - |
| **FC→L2 연결** | `l2[].failureCauses` 연동 | ❌ 미작동 | ISSUE-001 근본원인 |

### 4️⃣ 고장연결 (FailureLinkTab)

| 기능 | PRD 요구사항 | 현재 상태 | 이슈 |
|------|------------|----------|------|
| FE-FM-FC 연결 | DB `failure_links` 저장 | ✅ 완료 | - |
| SVG 다이어그램 | 연결선 시각화 | ✅ 완료 | - |
| 확정 기능 | 확정 시 DB 저장 | ✅ 완료 | - |
| **데이터 전파** | 리스크분석으로 FC 전달 | ❌ 미작동 | ISSUE-001 |

### 5️⃣ 리스크분석 (RiskTabConfirmable)

| 기능 | PRD 요구사항 | 현재 상태 | 이슈 |
|------|------------|----------|------|
| **FC 목록 표시** | 고장연결에서 FC 로드 | ❌ 빈 배열 | ISSUE-001 |
| SOD 입력 | SODSelectModal | ✅ 완료 | ISSUE-010 (타이밍) |
| AP/RPN 계산 | 자동 계산 | ✅ 완료 | - |
| 예방/검출관리 입력 | 인라인 편집 | ✅ 완료 | - |
| **LLD(습득교훈)** | LLDSelectModal | ⚠️ 저장 키 불일치 | ISSUE-004 |
| **riskData 영속성** | DB + localStorage | ❌ 불일치 | ISSUE-003 |
| 확정 기능 | 확정 시 DB 저장 | ✅ 완료 | - |

### 6️⃣ 최적화 (OptTabConfirmable)

| 기능 | PRD 요구사항 | 현재 상태 | 이슈 |
|------|------------|----------|------|
| **데이터 로드** | 리스크분석 데이터 참조 | ❌ 빈 배열 | ISSUE-002 |
| 조치계획 입력 | 인라인 편집 | ⚠️ 데이터 없음 | ISSUE-002 |
| 새 SOD 입력 | SODSelectModal | ⚠️ 데이터 없음 | ISSUE-002 |
| 새 AP/RPN 계산 | 자동 계산 | ⚠️ 데이터 없음 | ISSUE-002 |
| 확정 기능 | 확정 시 DB 저장 | ✅ 완료 | - |

---

## 🔗 데이터 연계성/일관성 분석

### PFD-FMEA-CP 3자 동기화 (데이터연계성 매트릭스 기준)

| 동기화 방향 | API 구현 | UI 구현 | 실제 동작 | 비고 |
|------------|---------|--------|----------|------|
| PFD → FMEA 구조연동 | ✅ `/api/sync/structure` | ⚠️ 버튼 있음 | ❓ 미검증 | Phase 3 완료 문서상 |
| PFD → CP 구조연동 | ✅ `/api/sync/structure` | ⚠️ 버튼 있음 | ❓ 미검증 | Phase 3 완료 문서상 |
| FMEA → CP 구조연동 | ✅ `/api/sync/structure` | ✅ TopMenuBar | ❓ 미검증 | Phase 1 완료 문서상 |
| FMEA → PFD 구조연동 | ✅ `/api/sync/structure` | ⚠️ 버튼 있음 | ❓ 미검증 | Phase 3 완료 문서상 |
| CP → FMEA 구조연동 | ✅ `/api/sync/structure` | ✅ CPTopMenuBar | ❓ 미검증 | Phase 1 완료 문서상 |
| CP → PFD 구조연동 | ✅ `/api/sync/structure` | ⚠️ 버튼 있음 | ❓ 미검증 | Phase 3 완료 문서상 |
| 데이터 동기화 (양방향) | ✅ `/api/sync/data` | ⚠️ 버튼 있음 | ❓ 미검증 | - |

### 공통 필드 동기화 상태

| 필드 | PFD | FMEA | CP | 동기화 |
|------|-----|------|----|----|
| 공정번호 | ● | ● | ● | ❓ 미검증 |
| 공정명 | ● | ● | ● | ❓ 미검증 |
| 공정설명 | ● | ● | ● | ❓ 미검증 |
| 작업요소 | ○ | ● | ● | ❓ 미검증 |
| 설비/금형 | ● | ● | ● | ❓ 미검증 |
| 제품특성 | ● | ● | ● | ❓ 미검증 |
| 공정특성 | ● | ● | ● | ❓ 미검증 |
| 특별특성 | ● | ● | ● | ❓ 미검증 |

> **범례**: ● 필수 | ○ 선택 | ❓ 실제 테스트 필요

---

## 🗄️ DB 저장/호출 불일치 분석

### ISSUE-017: 품명/공장 정보 localStorage 전용 (DB 미연동)

| 항목 | 내용 |
|------|------|
| **위치** | `bizinfo-db.ts` (`getAllProducts`, `getAllFactories`) |
| **증상** | 품명/공장 정보가 localStorage에만 저장됨 |
| **원인** | DB API 미구현, localStorage 전용 함수 사용 |
| **영향** | 브라우저 간 데이터 공유 불가, 데이터 유실 위험 |
| **수정 방안** | `products`, `factories` 테이블 추가 및 API 생성 |

```typescript
// 현재 코드 (bizinfo-db.ts:301-324)
export function getAllProducts(): BizInfoProduct[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(BIZINFO_STORAGE_KEYS.products);
  return data ? JSON.parse(data) : []; // ← localStorage만 사용
}

export function getAllFactories(): BizInfoFactory[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(BIZINFO_STORAGE_KEYS.factories);
  return data ? JSON.parse(data) : []; // ← localStorage만 사용
}
```

---

### ISSUE-018: DFMEA localStorage 혼용 문제

| 항목 | 내용 |
|------|------|
| **위치** | DFMEA 워크시트 전역 |
| **증상** | DFMEA 데이터가 DB와 localStorage에 분산 저장됨 |
| **원인** | 마스터플랜 기준 "DFMEA DB 완전 전환 필요" 상태 |
| **영향** | 데이터 일관성 부족, 동기화 문제 |
| **수정 방안** | PFMEA와 동일한 DB 전용 패턴 적용 |

---

### ISSUE-019: Control Plan localStorage 혼용 문제

| 항목 | 내용 |
|------|------|
| **위치** | Control Plan 워크시트 전역 |
| **증상** | CP 데이터가 DB와 localStorage에 분산 저장됨 |
| **원인** | 마스터플랜 기준 "Control Plan DB 필요" 상태 |
| **영향** | 데이터 일관성 부족 |
| **수정 방안** | PFMEA와 동일한 DB 전용 패턴 적용 |

> **참고**: CP 등록 API (`/api/control-plan`)는 DB 저장 구현됨. 워크시트 데이터는 확인 필요.

---

### ISSUE-020: APQP API 미완성

| 항목 | 내용 |
|------|------|
| **위치** | `/api/apqp/route.ts` |
| **증상** | `apqp_projects` 테이블은 있으나 API 불완전 |
| **원인** | 마스터플랜 기준 "APQP API 미완성" 상태 |
| **영향** | APQP 프로젝트 관리 기능 제한 |
| **수정 방안** | CRUD API 완성 |

---

## 🔐 인증/권한 시스템 분석 (PRD 기준)

### 인증 시스템 현황

| 기능 | PRD 요구사항 | 현재 상태 | 비고 |
|------|------------|----------|------|
| 로그인 API | `/api/auth/login` | ✅ 구현됨 | 쿠키 기반 세션 |
| 로그아웃 API | `/api/auth/logout` | ✅ 구현됨 | - |
| 세션 확인 | `/api/auth/me` | ✅ 구현됨 | - |
| 비밀번호 변경 | `/api/auth/change-password` | ✅ 구현됨 | - |
| 사용자 등록 | `/api/auth/register` | ✅ 구현됨 | - |
| **비밀번호 해시** | SHA-256 | ⚠️ 확인 필요 | PRD 요구사항 |
| **세션 만료** | JWT/24시간 | ✅ 구현됨 | 쿠키 maxAge |
| **인증 미들웨어** | 모든 API 보호 | ❓ 미검증 | 실제 적용 확인 필요 |

### 권한 시스템 현황

| 기능 | PRD 요구사항 | 현재 상태 | 비고 |
|------|------------|----------|------|
| 시스템 권한 (role) | admin/editor/viewer | ⚠️ DB 필드 존재 | 실제 적용 확인 필요 |
| PFMEA 권한 | none/read/write | ⚠️ DB 필드 존재 | 실제 적용 확인 필요 |
| DFMEA 권한 | none/read/write | ⚠️ DB 필드 존재 | 실제 적용 확인 필요 |
| CP 권한 | none/read/write | ⚠️ DB 필드 존재 | 실제 적용 확인 필요 |
| PFD 권한 | none/read/write | ⚠️ DB 필드 존재 | 실제 적용 확인 필요 |
| **권한 체크 UI** | 권한별 메뉴 숨김 | ❓ 미검증 | 실제 적용 확인 필요 |
| **권한 관리 화면** | `/admin/settings/users` | ⚠️ 경로 존재 | 기능 확인 필요 |

---

## 🆕 신규 발견 이슈

### ISSUE-021: 4M 분류 자동화 미구현

| 항목 | 내용 |
|------|------|
| **위치** | `StructureTab.tsx` (L3 작업요소) |
| **증상** | 4M 분류(MN/MC/IM/EN)가 수동 입력만 가능 |
| **원인** | 작업요소 유형에 따른 자동 분류 로직 미구현 |
| **영향** | 사용자 입력 부담, 분류 오류 가능성 |
| **수정 방안** | 작업요소명 기반 자동 분류 또는 드롭다운 선택 |

---

### ISSUE-022: 특별특성(CC/SC) 선택 UI 부재

| 항목 | 내용 |
|------|------|
| **위치** | `FunctionL2Tab.tsx`, `FunctionL3Tab.tsx` |
| **증상** | 특별특성이 수동 텍스트 입력만 가능 |
| **원인** | CC(Critical Characteristic)/SC(Significant Characteristic) 드롭다운 미구현 |
| **영향** | 표준화된 특별특성 입력 불가 |
| **수정 방안** | CC/SC 선택 드롭다운 또는 모달 추가 |

---

### ISSUE-023: PFD-FMEA-CP 동기화 실제 동작 미검증

| 항목 | 내용 |
|------|------|
| **위치** | `/api/sync/*`, 각 워크시트 TopMenuBar |
| **증상** | 동기화 기능 문서상 완료이나 실제 동작 미검증 |
| **원인** | Phase 1~3 구현 완료 문서가 있으나 실제 테스트 미실시 |
| **영향** | 문서 간 데이터 불일치 가능성 |
| **수정 방안** | 6방향 동기화 전체 End-to-End 테스트 |

---

### ISSUE-024: 권한 시스템 실제 적용 미검증

| 항목 | 내용 |
|------|------|
| **위치** | 전역 (API 미들웨어, UI 권한 체크) |
| **증상** | 권한 필드는 DB에 존재하나 실제 권한 체크 동작 불명확 |
| **원인** | PRD는 있으나 실제 구현 범위 불명확 |
| **영향** | 권한 없는 사용자의 데이터 접근 가능성 |
| **수정 방안** | API 미들웨어 권한 체크, UI 권한별 메뉴 숨김 검증 |

---

## 📊 갱신된 테스트 요약

| 구분 | 테스트 항목 | 성공 | 실패 | 보류 | 미검증 |
|------|------------|------|------|------|--------|
| 기초정보 | 8개 | 4 | 3 | 1 | 0 |
| 구조분석 | 8개 | 3 | 4 | 0 | 1 |
| 기능분석 | 7개 | 2 | 4 | 0 | 1 |
| 고장분석 | 5개 | 4 | 1 | 0 | 0 |
| 고장연결 | 4개 | 3 | 1 | 0 | 0 |
| 리스크분석 | 7개 | 3 | 4 | 0 | 0 |
| 최적화 | 5개 | 2 | 3 | 0 | 0 |
| 데이터 연계성 | 16개 | 2 | 8 | 0 | 6 |
| **DB 저장/호출** | **6개** | **2** | **4** | **0** | **0** |
| **인증/권한** | **10개** | **6** | **0** | **0** | **4** |
| **합계** | **76개** | **31** | **32** | **1** | **12** |

### 갱신된 이슈 심각도 분류

| 심각도 | 건수 | 설명 |
|--------|------|------|
| 🔴 Critical | 3 | 서비스 사용 불가 (ISSUE-001, 002, 003) |
| 🟠 Major | 14 | 주요 기능 제한 (ISSUE-004~016, 017~020) |
| 🟡 Minor | 4 | UX 개선 필요 (ISSUE-008~010, 021, 022) |
| ❓ 미검증 | 3 | 테스트 필요 (ISSUE-023, 024) |

---

## 📋 갱신된 수정 작업 목록

### P0 - 긴급 (서비스 차단)

| # | 이슈 | 파일 | 작업 내용 |
|---|------|------|----------|
| 1 | ISSUE-001 | `RiskTabConfirmable.tsx`, `useWorksheetState.ts` | failureCauses 데이터 전파 로직 |
| 2 | ISSUE-002 | `OptTabConfirmable.tsx`, `useWorksheetState.ts` | optimization 배열 초기화 |
| 3 | ISSUE-003 | `useWorksheetState.ts` | riskData Single Source of Truth |

### P1 - 높음 (핵심 기능)

| # | 이슈 | 파일 | 작업 내용 |
|---|------|------|----------|
| 4 | ISSUE-004 | `RiskTabConfirmable.tsx` | LLD 저장 키 수정 |
| 5 | ISSUE-011 | `ProcessSelectModal.tsx` | 공정선택 모달 DB 연동 |
| 6 | ISSUE-012 | `FunctionL1/L2/L3Tab.tsx` | 기능분석 입력모달 연동 |
| 7 | ISSUE-014 | 모달 컴포넌트들 | 기초정보↔워크시트 동기화 |
| 8 | ISSUE-015 | `db-storage.ts` | DB/localStorage 정책 |

### P2 - 중간 (보조 기능)

| # | 이슈 | 파일 | 작업 내용 |
|---|------|------|----------|
| 9 | ISSUE-017 | `bizinfo-db.ts` | 품명/공장 DB API |
| 10 | ISSUE-018 | DFMEA 전역 | DFMEA DB 완전 전환 |
| 11 | ISSUE-019 | CP 워크시트 | CP localStorage 제거 |
| 12 | ISSUE-020 | `/api/apqp` | APQP API 완성 |

### P3 - 검증 필요

| # | 이슈 | 파일 | 작업 내용 |
|---|------|------|----------|
| 13 | ISSUE-023 | `/api/sync/*` | PFD-FMEA-CP 동기화 E2E 테스트 |
| 14 | ISSUE-024 | 전역 | 권한 시스템 E2E 테스트 |

---

## 📅 갱신된 다음 단계

1. **P0 이슈 즉시 수정** 
   - ISSUE-001, 002, 003: 리스크분석/최적화 데이터 흐름 복구

2. **PFD-FMEA-CP 동기화 검증**
   - 6방향 동기화 실제 동작 테스트
   - 충돌 해결 UI 테스트

3. **권한 시스템 검증**
   - 로그인/로그아웃 흐름 테스트
   - role별 권한 제한 테스트

4. **DB 통합**
   - 품명/공장 DB API 생성
   - DFMEA/CP localStorage 제거

---

---

## 📅 2026-01-24 리스트 모듈화 완료 (코드프리즈)

### ✅ 완료된 작업

| 모듈 | 파일 | 행 수 | 상태 |
|------|------|-------|------|
| PFMEA | `src/app/pfmea/list/page.tsx` | 291줄 | ✅ 코드프리즈 |
| DFMEA | `src/app/dfmea/list/page.tsx` | 157줄 | ✅ 코드프리즈 |
| PFD | `src/app/pfd/list/page.tsx` | 158줄 | ✅ 코드프리즈 |
| CP | `src/app/control-plan/list/page.tsx` | 149줄 | ✅ 코드프리즈 |
| APQP | `src/app/apqp/list/page.tsx` | 138줄 | ✅ 코드프리즈 |
| **모듈 합계** | | **893줄** | |

### ✅ 공통 컴포넌트 생성

| 컴포넌트 | 파일 | 행 수 | 설명 |
|----------|------|-------|------|
| StepBadge | `src/components/list/StepBadge.tsx` | 34줄 | 단계 배지 (1~7단계) |
| TypeBadge | `src/components/list/TypeBadge.tsx` | 42줄 | TYPE 배지 (M/F/P) |
| ListActionBar | `src/components/list/ListActionBar.tsx` | 101줄 | 액션 버튼 바 |
| ListStatusBar | `src/components/list/ListStatusBar.tsx` | 29줄 | 하단 상태바 |
| useListSelection | `src/components/list/hooks/useListSelection.ts` | 64줄 | 행 선택 훅 |
| **공통 합계** | | **270줄** | |

### ✅ 코드 감소 효과

| 구분 | 변경 전 | 변경 후 | 감소 |
|------|---------|---------|------|
| 총 코드 | 2,159줄 | 1,163줄 | **-46%** |

### ✅ 커밋 이력

| 커밋 | 내용 |
|------|------|
| `466f255` | refactor: 리스트 모듈화 - 공통 컴포넌트 추출 |
| `6b92b76` | docs: PFMEA 리스트 PRD 모듈화 구조 문서 추가 |

---

## 📅 2026-01-24 등록화면 수평전개 완료

### ✅ 완료된 작업

| 항목 | 이전 | 이후 | 감소율 | 상태 |
|------|------|------|--------|------|
| APQP 등록화면 | 1,068줄 | 602줄 | -44% | ✅ 완료 |
| DFMEA 등록화면 | 1,897줄 | 575줄 | -70% | ✅ 완료 |
| PFD 등록화면 | 485줄 | 568줄 | +17% (기능추가) | ✅ 완료 |
| CP 등록화면 | 768줄 | 772줄 | 유지 | ✅ 완료 |
| PFMEA 등록화면 | 842줄 | 843줄 | 유지 (기준) | ✅ 완료 |

### ✅ 해결된 이슈

| 이슈 | 원인 | 해결 방법 |
|------|------|----------|
| layout.tsx 충돌 | APQP/CP/DFMEA/PFD layout.tsx에서 Sidebar + margin-left 중복 | layout.tsx → children만 반환으로 수정 |
| 화면 오버플로우 | FixedLayout의 w-screen이 zoom과 충돌 | w-full max-w-full min-w-0으로 수정 |
| 변경이력 미통일 | recordChangeHistory 구현 차이 | PFMEA 수준으로 통일 (description, console.log 포함) |

### ✅ 추가된 문서

| 문서 | 경로 |
|------|------|
| PFD 등록 PRD | `docs/pfddocs/12_PFD_등록_PRD.md` |
| DFMEA 등록 PRD | `docs/dfmeadocs/13_DFMEA_등록_PRD.md` |

### 🔧 다음 단계 (선택)

| # | 항목 | 우선순위 | 설명 |
|---|------|---------|------|
| 1 | CFT 컴포넌트 분리 최적화 | 중 | CFTRegistrationTable을 더 가볍게 |
| 2 | API DB 통합 | 중 | localStorage → PostgreSQL 마이그레이션 |
| 3 | 워크시트 수평전개 | 중 | 등록화면처럼 워크시트도 통일 |
| 4 | AI 예측 DFMEA 적용 | 낮 | PFMEA AI 기능 수평전개 |

---

> **작성자**: AI QA Assistant  
> **검토자**: -  
> **승인자**: -  
> **최종 갱신**: 2026-01-24 (등록화면 수평전개 완료, layout.tsx 충돌 해결)
