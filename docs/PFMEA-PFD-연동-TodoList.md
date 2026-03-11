# PFMEA-PFD 연동 TodoList

**작성일**: 2026-01-27  
**우선순위**: PFD 먼저 → PFMEA 적용

---

## Phase 1: PFD 워크시트 업그레이드 (CP 동일 수준)

### 1.1 Import 파싱 개선
- [ ] `pfd/worksheet/excel-import.ts` 수정
  - [ ] 병합 셀 자동 처리 제거 (원본 그대로)
  - [ ] 4행부터 데이터 파싱 (헤더 3행)
  - [ ] CP `worksheet-excel-parser.ts` 로직 참조

### 1.2 부모-자식 그룹 색상
- [ ] `pfdConstants.ts`에 색상 정의 추가
  ```typescript
  partGroup: { parent, parentAlt, child, childAlt }  // 파란색
  equipGroup: { parent, parentAlt, child, childAlt } // 녹색
  ```
- [ ] `renderers/index.tsx` 수정
  - [ ] 행 데이터 기준 그룹 결정
  - [ ] 제품특성 있으면 → 파란색 (부품명 그룹)
  - [ ] 공정특성 있으면 → 녹색 (설비 그룹)
  - [ ] 공유 컬럼 (특별특성~) 행 데이터 기준 결정

### 1.3 컨텍스트 메뉴
- [ ] `components/PFDContextMenu.tsx` 생성 (또는 수정)
  - [ ] ⬆️ 위로 행 추가
  - [ ] ⬇️ 아래로 행 추가
  - [ ] 🗑️ 행 삭제
  - [ ] 🔗 위 행과 병합
  - [ ] 🔗 아래 행과 병합
  - [ ] ✂️ 셀 병합 해제
  - [ ] ↩️ Undo (최대 3회)
  - [ ] ↪️ Redo (최대 3회)
- [ ] `hooks/useContextMenu.ts` 수정 (merge up/down 지원)

---

## Phase 2: PFD → PFMEA 연동

### 2.1 연동 버튼
- [ ] 상단 메뉴바에 "PFMEA 연동" 버튼 추가
- [ ] 클릭 시 PFD 데이터를 PFMEA ALL 형식으로 변환
- [ ] PFMEA 워크시트 화면으로 자동 이동

### 2.2 데이터 변환
- [ ] PFD 공정정보 → PFMEA 구조 탭
- [ ] PFD 특성정보 → PFMEA 기능/고장 탭 기초 데이터
- [ ] 공정레벨 (Main/Sub) → L1/L2/L3 구조 매핑

### 2.3 연동 상태 관리
- [ ] PFD ↔ PFMEA 연동 상태 표시
- [ ] 변경 감지 시 알림 Flag

---

## Phase 3: PFMEA 워크시트 업그레이드

### 3.1 부모-자식 그룹 색상
- [ ] `allTabConstants.ts`에 색상 정의 추가 (CP 동일)
- [ ] 렌더러 수정 (행 데이터 기준 색상)

### 3.2 컨텍스트 메뉴
- [ ] CP 동일 수준 컨텍스트 메뉴 적용
- [ ] 병합/해제, Undo/Redo 지원

---

## 완료 기준

1. PFD Import가 병합 셀 자동 처리 없이 원본 그대로 Import됨
2. PFD 워크시트에 파란색/녹색 부모-자식 그룹 색상 적용됨
3. PFD 컨텍스트 메뉴에서 행 추가/삭제/병합/해제/Undo/Redo 가능
4. "PFMEA 연동" 버튼으로 PFD → PFMEA 데이터 전달 가능
5. PFMEA 워크시트에 동일한 색상/컨텍스트 메뉴 적용됨

---

## 참고: CP 컴포넌트 재사용 가능성

| CP 컴포넌트 | PFD 재사용 | PFMEA 재사용 |
|-------------|-----------|--------------|
| CPContextMenu.tsx | 복사 후 수정 | 복사 후 수정 |
| cpConstants.ts 색상 | 동일 적용 | 동일 적용 |
| renderers/index.tsx 로직 | 복사 후 수정 | 복사 후 수정 |
| worksheet-excel-parser.ts | 참조하여 재작성 | 기존 import 유지 |
