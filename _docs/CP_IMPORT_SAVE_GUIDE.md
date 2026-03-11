# CP Import 및 저장 기능 유지보수 가이드

태그: `codefreeze-20260115-cp-import-save`

## 1. 개요
Excel 파일을 통해 Control Plan(CP) 기초정보를 Import하고, 이를 마스터 데이터셋 및 프로젝트별 워크시트 테이블(`cp_processes`, `cp_detectors` 등)에 저장하는 기능입니다.

## 2. 관련 파일 목록
| 파일 경로 | 역할 | 주요 수정 내용 |
|-----------|------|----------------|
| `src/app/control-plan/import/page.tsx` | Import 메인 화면 | 저장 로직(`handleSaveAll`) 보정, 상세 로깅 및 에러 처리 알림 추가 |
| `src/app/api/control-plan/master-to-worksheet/route.ts` | 저장 API | 데이터 변환 로직(A1, A2 매핑) 유연화, 트랜잭션 외부 DB 최종 검증 추가 |
| `src/app/admin/db-viewer/page.tsx` | DB 뷰어 | CP 관련 테이블 `hasCpNo` 필터링 지원, 대소문자 구분 없는 비교 로직 |
| `prisma/schema.prisma` | DB 스키마 | CP 마스터 데이터셋 관련 테이블(`cp_master_datasets`, `cp_master_flat_items`) 정의 |

## 3. 핵심 로직 설명
### 3.1 데이터 변환 (Server-side)
- **공정번호(A1) 인식**: `item.processNo`와 `item.value`(itemCode='A1')를 동시에 확인하여 공정의 키값을 추출합니다.
- **공정명(A2) 처리**: 공정명이 비어있는 경우 `공정 [번호]` 형식으로 자동 생성하여 데이터 무결성을 유지합니다.
- **카테고리 맵핑**: `processInfo`, `detector`, `controlItem`, `controlMethod`, `reactionPlan` 카테고리 데이터를 각각의 테이블 구조에 맞게 그룹핑합니다.

### 3.2 DB 저장 및 검증
- **Prisma Transaction**: `deleteMany` 후 `createMany` 방식으로 데이터를 교체(Replace)합니다.
- **Post-Verification**: 트랜잭션 종료 후 실제 DB에서 해당 `cpNo`의 데이터가 저장되었는지 다시 한 번 쿼리하여 성공 여부를 반환합니다.

## 4. 트러블슈팅 가이드
- **데이터가 안 보일 때**: 
  1. `cp_registrations` 테이블에 해당 `cpNo`가 등록되어 있는지 확인하세요.
  2. 브라우저 콘솔의 `📤 [CP Import] API 호출 전 데이터 검증` 로그에서 `a1Count`가 0인지 확인하세요.
  3. DB 뷰어의 필터링이 `cpNo` 대소문자 차이로 인해 작동하지 않는지 확인하세요 (현재는 대소문자 무시 비교 적용됨).

## 5. 색상/스타일 정보
- CP 모듈 기본 색상: `bg-teal-600` (Teal)
- DB 뷰어 필터 배지: `bg-cyan-500`
