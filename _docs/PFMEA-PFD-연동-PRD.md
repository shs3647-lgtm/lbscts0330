# PFMEA-PFD 연동 PRD

**작성일**: 2026-01-27  
**버전**: 2.0.0  
**상태**: ✅ 구현 완료

## 1. 현재 상황 분석

### 1.1 CP 워크시트 (완료)
- ✅ Excel Import/Export
- ✅ 행 데이터 기준 부모-자식 그룹 색상 (파란색/녹색)
- ✅ 컨텍스트 메뉴 (행 추가, 삭제, 병합, 해제, Undo/Redo)
- ✅ 부품명/설비 기준 줄무늬

### 1.2 PFD 워크시트 (✅ 완료)
- ✅ 기본 워크시트 구조 (`/pfd/worksheet`)
- ✅ Excel Import/Export 기본 구현 (`excel-import.ts`, `excel-export.ts`)
- ✅ Import 파싱 로직 CP 수준으로 업그레이드
- ✅ 부모-자식 그룹 색상 적용 (파란색/녹색)
- ✅ 컨텍스트 메뉴 CP 수준으로 업그레이드 (행 추가/삭제, 병합/해제, Undo/Redo)

### 1.3 PFMEA 워크시트 (✅ 완료)
- ✅ 전체 워크시트 구조 (`/pfmea/worksheet`)
- ✅ Excel Import (46개 파일)
- ✅ 구조/기능/고장 탭 구현
- ✅ PFD 연동 구현
- ✅ CP와 동일한 부모-자식 그룹 색상

## 2. 구현 우선순위

### ✅ 완료: **PFD 먼저 적용**

이유:
1. PFD는 PFMEA의 기초 데이터 (공정정보, 특성정보)
2. PFD 완료 후 PFMEA 연동이 자연스러움
3. CP에서 이미 검증된 로직을 PFD에 바로 적용 가능

## 3. PFD 업그레이드 범위

### 3.1 Import 파싱 (✅ 완료)
- [x] `worksheet-excel-parser.ts` 참조하여 PFD용 파서 개선
- [x] 병합 셀 자동 처리 제거 (원본 그대로 Import)
- [x] 4행부터 데이터 파싱 (헤더 3행)

### 3.2 부모-자식 그룹 색상 (✅ 완료)
- [x] `pfdConstants.ts`에 `partGroup`, `equipGroup` 색상 추가
- [x] `renderers/index.tsx`에 행 데이터 기준 색상 로직 적용
- [x] 제품특성 있으면 파란색, 공정특성 있으면 녹색

### 3.3 컨텍스트 메뉴 (✅ 완료)
- [x] 위로 행 추가
- [x] 아래로 행 추가
- [x] 행 삭제
- [x] 위 행과 병합
- [x] 아래 행과 병합
- [x] 셀 병합 해제
- [x] Undo/Redo (최대 10회)

## 4. PFMEA 연동 범위

### 4.1 PFD → PFMEA 연동 (✅ 완료)
- [x] PFD 공정정보 → PFMEA 구조 탭 L2 자동 생성
- [x] PFD 작업요소 → PFMEA 구조 탭 L3 자동 생성
- [x] PFD 특성정보 → PFMEA 기능/고장 탭 기초 데이터
- [x] 연동 버튼 클릭 시 **PFMEA 구조분석 화면**으로 자동 이동
- [x] L2/L3 모자관계 셀 병합 반영

> **참고**: ALL 화면에서는 고장연결을 할 수 없으므로, 연동 후 구조분석 화면으로 이동합니다.

### 4.2 ALL 화면 직접 연동 (🔶 협의 필요)
> **상세 PRD**: [PFD-PFMEA-ALL화면-연동-PRD.md](./PFD-PFMEA-ALL화면-연동-PRD.md)

ALL 화면으로 직접 연동하려면 **고장형태 중심 역전개**가 필요합니다:
- [ ] 고장형태 자동 추론 방안 결정
- [ ] 고장연결 규칙 정의
- [ ] 구현 우선순위 결정

### 4.3 PFMEA → PFD 동기화 (향후 구현)
- [ ] PFMEA 변경 시 PFD 변경 알림 Flag
- [ ] 양방향 추적성 확보 (공정번호 + 특성 키)

## 5. 기술 스택

- **프레임워크**: Next.js 16.1.1 (Turbopack)
- **그리드**: 커스텀 테이블 (CP와 동일)
- **Excel**: ExcelJS
- **상태관리**: React useState/useCallback

## 6. 구현 완료 (2026-01-27)

| 단계 | 작업 | 상태 |
|------|------|------|
| 1 | PFD Import 파싱 업그레이드 | ✅ 완료 |
| 2 | PFD 부모-자식 그룹 색상 | ✅ 완료 |
| 3 | PFD 컨텍스트 메뉴 | ✅ 완료 |
| 4 | PFD → PFMEA 연동 버튼 | ✅ 완료 |
| 5 | PFMEA 동일 색상/메뉴 적용 | ✅ 완료 |
| 6 | 테스트 및 버그 수정 | ✅ 완료 |

## 7. 연동 API

### 7.1 PFD → PFMEA 신규 생성
- **Endpoint**: `POST /api/pfmea/create-from-pfd`
- **기능**: PFD 데이터를 기반으로 새 PFMEA 생성
- **변환 규칙**:
  - 공정번호/공정명 → L2 (구조분석)
  - 작업요소/설비 → L3 (구조분석)
  - 제품특성/공정특성 → 기능분석 기초 데이터

### 7.2 PFD → PFMEA 동기화
- **Endpoint**: `POST /api/pfmea/sync-from-pfd`
- **기능**: 기존 PFMEA에 PFD 데이터 동기화

## 8. 참조 파일

### CP (완료된 참조 코드)
- `src/app/control-plan/worksheet/renderers/index.tsx` - 부모-자식 색상 로직
- `src/app/control-plan/worksheet/cpConstants.ts` - 색상 정의
- `src/app/control-plan/worksheet/components/CPContextMenu.tsx` - 컨텍스트 메뉴

### PFD (✅ 구현 완료)
- `src/app/pfd/worksheet/page.tsx` - 메인 페이지 (PFMEA 연동 핸들러 포함)
- `src/app/pfd/worksheet/pfdConstants.ts` - 색상 정의 (partGroup, equipGroup)
- `src/app/pfd/worksheet/renderers/index.tsx` - 부모-자식 색상 로직
- `src/app/pfd/worksheet/components/PfdContextMenu.tsx` - 컨텍스트 메뉴
- `src/app/pfd/worksheet/excel-import.ts` - Excel Import

### PFMEA (✅ 연동 완료)
- `src/app/pfmea/worksheet/page.tsx` - 메인 페이지
- `src/app/api/pfmea/create-from-pfd/route.ts` - PFD에서 PFMEA 생성 API
- `src/app/api/pfmea/sync-from-pfd/route.ts` - PFD → PFMEA 동기화 API

## 9. 사용 방법

### PFD → PFMEA 연동
1. PFD 워크시트에서 공정정보와 특성정보를 입력
2. 상단 메뉴의 **"PFMEA 연동"** 버튼 클릭
3. 확인 다이얼로그에서 연동 정보 확인 후 **확인** 클릭
4. PFMEA ALL 화면으로 자동 이동
5. 연동된 공정 구조(L2/L3)와 특성 정보 확인

### 연동 데이터 구조
```
PFD                          PFMEA
─────────────────────────────────────────
공정번호 + 공정명      →    L2 (구조분석)
부품명 + 설비          →    L3 (구조분석)
제품SC + 제품특성      →    L1 기능 (기능분석)
공정SC + 공정특성      →    L3 기능 (기능분석)
```
