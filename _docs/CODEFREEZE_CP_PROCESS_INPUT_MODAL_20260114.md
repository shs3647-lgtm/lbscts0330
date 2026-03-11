# 🔒 CP 공정명 입력 모달 코드프리즈

**작성일**: 2026-01-14  
**태그**: `codefreeze-20260114-cp-process-input-modal`  
**버전**: 1.0.0

---

## 📋 개요

CP 워크시트 자동 입력 모드에서 공정명을 선택할 수 있는 입력 모달이 완성되었습니다. PFMEA의 `ProcessSelectModal`을 벤치마킹하여 동일한 형태와 기능을 제공합니다.

---

## 🎯 핵심 기능

### 1. 모달 위치 및 크기
- **위치**: 우측 350px 고정 (`right: 350px`)
- **크기**: 350px 고정 (`w-[350px]`)
- **드래그**: 헤더 드래그로 위치 이동 가능
- **최대 높이**: `max-h-[calc(100vh-120px)]`

### 2. 데이터 소스 (우선순위 순)
1. **마스터 FMEA 공정 데이터** (우선순위 1)
   - API: `/api/fmea/master-processes`
   - 마스터 FMEA (pfm26-M001) 공정 데이터 조회
2. **기초정보 공정 데이터** (우선순위 2)
   - localStorage: `pfmea_master_data`
   - 코드 'A2' 값에서 공정명 추출
3. **현재 CP 워크시트 공정 데이터** (우선순위 3)
   - 현재 워크시트에 이미 입력된 공정명 표시

### 3. 주요 기능
- ✅ 검색 기능 (공정명/번호 실시간 필터링)
- ✅ 체크박스 다중 선택
- ✅ 전체/해제 버튼
- ✅ 연속 입력 모드 (저장 시 즉시 반영 + 새 행 추가)
- ✅ 인라인 편집 (더블클릭)
- ✅ 신규 공정 추가
- ✅ 드래그 이동

### 4. 워크시트 통합
- 자동 입력 모드에서 공정명 셀 클릭 시 모달 열기
- 선택된 모든 공정이 워크시트에 반영
- 첫 번째 공정: 현재 행 업데이트
- 나머지 공정: 새 행으로 추가

---

## 📁 수정된 파일

### 1. 신규 파일
- `src/app/control-plan/worksheet/components/ProcessFlowInputModal.tsx` (500줄)
  - CP 공정명 입력 모달 컴포넌트
  - PFMEA ProcessSelectModal 벤치마킹

### 2. 수정된 파일
- `src/app/control-plan/worksheet/page.tsx`
  - 모달 상태 관리 추가
  - `handleProcessSave`: 선택된 모든 공정 워크시트 반영
  - `handleProcessContinuousAdd`: 연속 입력 모드 핸들러
  - `handleAutoModeClick`: 공정명 셀 클릭 시 모달 열기

- `src/app/control-plan/worksheet/renderers/index.tsx`
  - 공정명 셀 클릭 이벤트 추가
  - 자동 모드 시 파란색 강조 표시

---

## 🔒 코드프리즈 규칙

### 절대 수정 금지 항목
1. **모달 위치**: 우측 350px 고정 (`right: 350px`)
2. **모달 크기**: 350px 고정 (`w-[350px]`)
3. **드래그 기능**: 헤더 드래그로 위치 이동 (제거 금지)
4. **데이터 소스 우선순위**: DB → localStorage → 워크시트 순서 유지
5. **전체 공정 선택 기능**: 선택된 모든 공정이 워크시트에 반영되는 로직

### 수정 시 필수 프로세스
1. **1단계**: "이 파일은 코드프리즈입니다. 수정하시겠습니까?" 질문
2. **2단계**: "어디까지 수정할까요?" 범위 확인
3. **3단계**: 승인된 범위 내에서만 수정
4. **위반 시**: 즉시 `git checkout`으로 복원

---

## 🔄 롤백 방법

### 특정 파일 롤백
```bash
git checkout HEAD~1 -- src/app/control-plan/worksheet/components/ProcessFlowInputModal.tsx
git checkout HEAD~1 -- src/app/control-plan/worksheet/page.tsx
git checkout HEAD~1 -- src/app/control-plan/worksheet/renderers/index.tsx
```

### 전체 롤백
```bash
git checkout codefreeze-20260114-cp-process-input-modal~1
```

---

## 📝 참고 문서

- `docs/CP_공정흐름도_입력모달_PRD.md` - PRD 문서
- `src/app/pfmea/worksheet/ProcessSelectModal.tsx` - 벤치마킹 파일
- `docs/CODEFREEZE_FILES.md` - 전체 코드프리즈 파일 목록

---

**작성자**: AI Assistant  
**승인자**: _________________  
**승인일**: _________________

