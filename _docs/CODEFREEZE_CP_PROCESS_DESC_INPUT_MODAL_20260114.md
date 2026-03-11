# 🔒 CP 공정설명 입력 모달 코드프리즈

**작성일**: 2026-01-14  
**태그**: `codefreeze-20260114-cp-process-desc-input-modal`  
**버전**: 1.0.0

---

## 📋 개요

CP 워크시트 자동 입력 모드에서 공정설명(작업요소)을 선택할 수 있는 입력 모달이 완성되었습니다. `ProcessFlowInputModal`을 벤치마킹하여 동일한 형태와 기능을 제공합니다.

---

## 🎯 핵심 기능

### 1. 모달 위치 및 크기
- **위치**: 우측 350px 고정 (`right: 350px`)
- **크기**: 350px 고정 (`w-[350px]`)
- **드래그**: 헤더 드래그로 위치 이동 가능
- **최대 높이**: `max-h-[calc(100vh-120px)]`

### 2. 데이터 소스
- **FMEA 작업요소 데이터** (우선순위 1)
  - 선택된 공정의 작업요소 목록 조회
  - API: `/api/fmea/work-elements` (향후 구현)
  - 현재는 샘플 데이터 사용

### 3. 주요 기능
- ✅ 검색 기능 (공정설명 실시간 필터링)
- ✅ 라디오 버튼 단일 선택
- ✅ 연속 입력 모드 (저장 시 즉시 반영 + 새 행 추가)
- ✅ 인라인 편집 (더블클릭)
- ✅ 신규 공정설명 추가
- ✅ 드래그 이동
- ✅ 공정 정보 표시 (공정번호, 공정명)

### 4. 워크시트 통합
- 자동 입력 모드에서 공정설명 셀 클릭 시 모달 열기
- 선택된 공정의 공정번호/공정명 자동 전달
- 선택된 공정설명이 워크시트에 반영

---

## 📁 수정된 파일

### 1. 신규 파일
- `src/app/control-plan/worksheet/components/ProcessDescInputModal.tsx` (450줄)
  - CP 공정설명 입력 모달 컴포넌트
  - ProcessFlowInputModal 벤치마킹

### 2. 수정된 파일
- `src/app/control-plan/worksheet/page.tsx`
  - 모달 상태 관리 추가
  - `handleProcessDescSave`: 선택된 공정설명 워크시트 반영
  - `handleProcessDescContinuousAdd`: 연속 입력 모드 핸들러
  - `handleAutoModeClick`: 공정설명 셀 클릭 시 모달 열기 (colKey 파라미터 추가)

- `src/app/control-plan/worksheet/renderers/index.tsx`
  - 공정설명 셀 클릭 이벤트에 colKey 전달

---

## 🔒 코드프리즈 규칙

### 절대 수정 금지 항목
1. **모달 위치**: 우측 350px 고정 (`right: 350px`)
2. **모달 크기**: 350px 고정 (`w-[350px]`)
3. **드래그 기능**: 헤더 드래그로 위치 이동 (제거 금지)
4. **단일 선택**: 라디오 버튼으로 단일 선택 (다중 선택 금지)
5. **공정 정보 표시**: 공정번호/공정명 표시 영역 유지

### 수정 시 필수 프로세스
1. **1단계**: "이 파일은 코드프리즈입니다. 수정하시겠습니까?" 질문
2. **2단계**: "어디까지 수정할까요?" 범위 확인
3. **3단계**: 승인된 범위 내에서만 수정
4. **위반 시**: 즉시 `git checkout`으로 복원

---

## 🔄 롤백 방법

### 특정 파일 롤백
```bash
git checkout HEAD~1 -- src/app/control-plan/worksheet/components/ProcessDescInputModal.tsx
git checkout HEAD~1 -- src/app/control-plan/worksheet/page.tsx
git checkout HEAD~1 -- src/app/control-plan/worksheet/renderers/index.tsx
```

### 전체 롤백
```bash
git checkout codefreeze-20260114-cp-process-desc-input-modal~1
```

---

## 📝 참고 문서

- `docs/CP_공정흐름도_입력모달_PRD.md` - PRD 문서 (공정명 모달)
- `src/app/control-plan/worksheet/components/ProcessFlowInputModal.tsx` - 벤치마킹 파일
- `docs/CODEFREEZE_CP_PROCESS_INPUT_MODAL_20260114.md` - 공정명 모달 코드프리즈 문서
- `docs/CODEFREEZE_FILES.md` - 전체 코드프리즈 파일 목록

---

**작성자**: AI Assistant  
**승인자**: _________________  
**승인일**: _________________

