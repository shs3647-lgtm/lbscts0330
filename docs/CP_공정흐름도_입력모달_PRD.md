# CP 공정흐름도 입력 모달 PRD

**작성일**: 2026-01-14  
**버전**: 1.0.0  
**태그**: `cp-process-flow-input-modal`

---

## 1. 개요

### 1.1 목적
Control Plan 워크시트에서 자동 입력 모드 시 공정명을 선택할 수 있는 입력 모달을 제공합니다. PFMEA의 `ProcessSelectModal`과 동일한 형태와 기능을 제공하여 사용자 경험의 일관성을 유지합니다.

### 1.2 범위
- CP 워크시트 자동 입력 모드에서 공정명 입력 시 사용
- 우측 350px 고정 위치
- 트리뷰 형태의 공정 선택 인터페이스
- 연속 입력 모드 지원

---

## 2. 기능 요구사항

### 2.1 모달 위치 및 크기
- **위치**: 우측 350px 고정 (`right-[350px]` 또는 `left-[calc(100%-350px)]`)
- **크기**: 350px 고정 (`w-[350px]`)
- **최대 높이**: `max-h-[calc(100vh-120px)]`
- **위치 조정**: 드래그 가능 (PFMEA 모달과 동일)

### 2.2 모달 구조
```
┌─────────────────────────────────┐
│ 제목: 공정명 선택                │
├─────────────────────────────────┤
│ [검색창]                         │
├─────────────────────────────────┤
│ 트리뷰 영역 (스크롤 가능)        │
│ - 공정 1                         │
│   - 작업요소 1                    │
│   - 작업요소 2                    │
│ - 공정 2                         │
│   - 작업요소 1                    │
├─────────────────────────────────┤
│ [확인] [취소] [연속입력]         │
└─────────────────────────────────┘
```

### 2.3 데이터 소스
1. **마스터 FMEA 공정 데이터** (우선순위 1)
   - API: `/api/fmea/master-processes`
   - 마스터 FMEA (pfm26-M001) 공정 데이터 조회
2. **기초정보 공정 데이터** (우선순위 2)
   - localStorage: `pfmea_master_data`
   - 코드 'A2' 값에서 공정명 추출
3. **현재 CP 워크시트 공정 데이터** (우선순위 3)
   - 현재 워크시트에 이미 입력된 공정명 표시

### 2.4 트리뷰 구조
- **1레벨**: 공정명 (공정번호 포함)
- **2레벨**: 작업요소 (해당 공정의 작업요소 목록)
- **확장/축소**: 클릭으로 토글
- **선택**: 체크박스로 다중 선택 가능

### 2.5 검색 기능
- 실시간 검색 (입력 즉시 필터링)
- 공정명 및 작업요소명 검색 지원
- 대소문자 구분 없음

### 2.6 입력 모드
1. **일반 입력 모드**
   - 선택 후 "확인" 버튼 클릭 시 선택된 공정명을 워크시트에 반영
   - 모달 닫기
2. **연속 입력 모드** (선택사항)
   - "연속입력" 버튼 활성화
   - 선택 후 워크시트에 반영 + 새 행 자동 추가
   - 모달 유지 (다음 공정명 입력 가능)

### 2.7 편집 기능
- 공정명 직접 편집 가능 (인라인 편집)
- 편집 후 저장 시 마스터 데이터에 반영 (선택사항)

---

## 3. UI/UX 요구사항

### 3.1 디자인
- **배경**: 흰색 (`bg-white`)
- **그림자**: `shadow-2xl`
- **둥근 모서리**: `rounded-lg`
- **커서**: 드래그 가능 (`cursor-move`)

### 3.2 색상
- 헤더: 파란색 배경 (`bg-[#1976d2]` 또는 표준 색상)
- 선택된 항목: 하늘색 배경 (`bg-blue-100`)
- 호버: 회색 배경 (`hover:bg-gray-100`)

### 3.3 반응형
- 화면 크기에 관계없이 우측 350px 고정
- 스크롤 가능한 트리뷰 영역
- 모바일 환경에서는 전체 화면 오버레이로 전환 (선택사항)

---

## 4. 기술 요구사항

### 4.1 컴포넌트 위치
```
src/app/control-plan/worksheet/components/ProcessFlowInputModal.tsx
```

### 4.2 Props 인터페이스
```typescript
interface ProcessFlowInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedProcesses: ProcessItem[]) => void;
  onDelete?: (processIds: string[]) => void;
  existingProcessNames?: string[];
  existingProcessesInfo?: ProcessWithL3Info[];
  // 연속입력 모드
  onContinuousAdd?: (process: ProcessItem, addNewRow: boolean) => void;
  // 모달 위치 (우측 350px)
  position?: 'right' | 'left' | 'center';
  // 현재 행 인덱스 (자동 입력 모드용)
  currentRowIdx?: number;
}
```

### 4.3 데이터 타입
```typescript
interface ProcessItem {
  id: string;
  no: string;
  name: string;
}

interface ProcessWithL3Info {
  name: string;
  l3Count: number;
}
```

### 4.4 API 엔드포인트
- `GET /api/fmea/master-processes` - 마스터 공정 데이터 조회

---

## 5. 개발 우선순위

### Phase 1: 기본 모달 구조 (필수)
1. 모달 컴포넌트 생성
2. 우측 350px 위치 설정
3. 기본 레이아웃 (헤더, 검색, 트리뷰, 버튼)

### Phase 2: 데이터 로드 (필수)
1. 마스터 FMEA 공정 데이터 로드
2. 기초정보 공정 데이터 로드 (폴백)
3. 현재 워크시트 공정 데이터 표시

### Phase 3: 트리뷰 구현 (필수)
1. 공정/작업요소 트리 구조 렌더링
2. 확장/축소 기능
3. 체크박스 선택 기능

### Phase 4: 검색 기능 (필수)
1. 실시간 검색 구현
2. 필터링 로직

### Phase 5: 입력 모드 (필수)
1. 일반 입력 모드
2. 연속 입력 모드 (선택사항)

### Phase 6: 편집 기능 (선택사항)
1. 인라인 편집
2. 마스터 데이터 업데이트

---

## 6. 벤치마킹 파일

### 6.1 참고 파일
- `src/app/pfmea/worksheet/ProcessSelectModal.tsx` - PFMEA 공정 선택 모달
- `src/app/pfmea/worksheet/WorkElementSelectModal.tsx` - PFMEA 작업요소 선택 모달
- `src/app/control-plan/worksheet/components/AutoInputModal.tsx` - CP 자동 입력 모달 (현재)

### 6.2 차이점
- PFMEA 모달: 완제품 공정명 기준
- CP 모달: 공정흐름도 기준 (공정명만)
- 위치: 우측 350px 고정

---

## 7. 테스트 요구사항

### 7.1 기능 테스트
- [ ] 모달 열기/닫기
- [ ] 공정 데이터 로드
- [ ] 트리뷰 확장/축소
- [ ] 다중 선택
- [ ] 검색 기능
- [ ] 일반 입력 모드
- [ ] 연속 입력 모드
- [ ] 드래그 이동

### 7.2 UI 테스트
- [ ] 우측 350px 위치 확인
- [ ] 반응형 레이아웃
- [ ] 스크롤 동작
- [ ] 색상 및 스타일

### 7.3 통합 테스트
- [ ] CP 워크시트와 연동
- [ ] 자동 입력 모드와 연동
- [ ] 데이터 저장 확인

---

## 8. 제약사항

### 8.1 코드프리즈 준수
- PFMEA 모달 구조와 동일하게 유지
- 350px 고정 크기 유지
- 우측 위치 유지

### 8.2 모듈화 원칙
- 파일 크기: 500줄 이하
- 컴포넌트 분리
- 훅 분리 (필요시)

---

## 9. 참고 문서

- `docs/관리계획서_PRD.md` - CP 워크시트 전체 PRD
- `docs/CODEFREEZE_FILES.md` - 코드프리즈 파일 목록
- `src/app/pfmea/worksheet/ProcessSelectModal.tsx` - 벤치마킹 파일

---

**작성자**: AI Assistant  
**승인자**: _________________  
**승인일**: _________________

