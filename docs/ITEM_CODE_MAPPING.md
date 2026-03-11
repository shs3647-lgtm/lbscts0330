# PFMEA itemCode 매핑 정의서

## ⚠️ 중요: 모든 코드에서 이 매핑을 준수해야 합니다!

## 표준 매핑 (2026-02-05 확정)

### L2 레벨 (공정) - A 카테고리

| 시트명 | itemCode | 필드명 | 한글 | 설명 |
|--------|----------|--------|------|------|
| L2-1 | A1 | processNo | 공정번호 | 10, 20, 30... |
| L2-2 | A2 | processName | 공정명 | 컷팅, 프레스, 용접... |
| L2-3 | A3 | processDesc | 공정기능/설명 | 공정 설명 |
| L2-4 | **A4** | **productChar** | **제품특성** | 파이프 외경, BURR, 외관... |
| L2-5 | A5 | failureMode | 고장형태 | 고장 발생 형태 |
| L2-6 | A6 | detectionCtrl | 검출관리 | 검출 방법 |

### L3 레벨 (작업요소) - B 카테고리

| 시트명 | itemCode | 필드명 | 한글 | 설명 |
|--------|----------|--------|------|------|
| L3-1 | **B1** | **workElement** | **작업요소/설비** | Cutting MC, 프레스... |
| L3-2 | B2 | elementFunc | 요소기능 | 작업요소 기능 |
| L3-3 | B3 | processChar | 공정특성 | 공정 특성 |
| L3-4 | B4 | failureCause | 고장원인 | 고장 발생 원인 |
| L3-5 | B5 | preventionCtrl | 예방관리 | 예방 방법 |

### L1 레벨 (완제품) - C 카테고리

| 시트명 | itemCode | 필드명 | 한글 | 설명 |
|--------|----------|--------|------|------|
| L1-1 | C1 | productProcess | 구분 | YP/SP/USER |
| L1-2 | C2 | productFunc | 제품기능 | 완제품 기능 |
| L1-3 | C3 | requirement | 요구사항 | 제품 요구사항 |
| L1-4 | C4 | failureEffect | 고장영향 | 고장 영향도 |

## 공통공정 (Common Process)

| processNo | 의미 | 용도 |
|-----------|------|------|
| `0` | 공통공정 | 모든 공정에서 사용 |
| `00` | 공통공정 (호환) | 모든 공정에서 사용 |

공통공정 작업요소: 작업자, 셋업엔지니어, 보전원, 운반원, 검사원 등

## 4M 분류

| 코드 | 의미 | 예시 |
|------|------|------|
| MC | Machine (설비) | Cutting MC, 프레스, CNC |
| MN | Man (사람) | 작업자, 보전원 |
| IM | Indirect Material (부자재) | 윤활유, 그리스 |
| EN | Environment (환경) | 온도, 습도, 조명 |

※ MD, JG는 MC로 통합

## 관련 파일 목록

### 소스 오브 트루스 (Source of Truth)
- `src/app/pfmea/import/types.ts` - ITEM_CODE_LABELS
- `src/app/pfmea/import/excel-parser.ts` - Excel 시트 파싱

### API 파일
- `src/app/api/fmea/master-processes/route.ts`
- `src/app/api/fmea/master-structure/route.ts`
- `src/app/api/fmea/work-elements/route.ts`

### Import 핸들러
- `src/app/pfmea/import/hooks/useImportFileHandlers.ts`

---
마지막 업데이트: 2026-02-05
