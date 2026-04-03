# DFMEA / PFMEA 공용화 설계 (문서 전용)

> 코드 변경 없음. `src/app/(fmea-core)/pfmea` vs `dfmea` 동일 상대 경로 파일을 기준으로 정리.

## 1. 동일 상대 경로 파일 (2026-04-03 스캔)

| 상대 경로 |
|-----------|
| `page.tsx` |
| `layout.tsx` |
| `config.ts` |
| `register/page.tsx` |
| `revision/page.tsx` |
| `list/page.tsx` |
| `dashboard/page.tsx` |
| `worksheet/page.tsx` |
| `import/page.tsx` |
| `lld/page.tsx` |
| `ap-improvement/page.tsx` |

PFMEA 쪽에만 존재하는 대표 영역: `pfmea/compare`, `pfmea/cft`, `pfmea/fmea4`, `pfmea/approve`, `pfmea/import/auto|legacy|manual`, `pfmea/worksheet/**` 대부분 등.

## 2. diff 요약 (개략)

| 구역 | 경향 |
|------|------|
| 루트 `page.tsx` / `layout.tsx` | 라우팅·모듈 접두사(dfmea vs pfmea) 차이 |
| `config.ts` | 앱별 상수·기본 경로 |
| `register` / `revision` / `list` | 동일 패턴이나 필드·API 쿼리 파라미터 차이 |
| `worksheet/page.tsx` | PFMEA는 Atomic·고장연결·CP/PFD 연동 코드량이 큼; DFMEA는 구조 단순·기능 범위 다름 |
| `import/page.tsx` | 시트·컬럼 맵·파서 엔트리가 PFMEA 중심; DFMEA는 설계 FMEA 컬럼 세트 |

정밀 diff는 `git diff --no-index` 또는 IDE 비교로 수행.

## 3. 공용화 가능 / 비권장

| 분류 | 내용 |
|------|------|
| 가능 | 공통 훅 패턴(로딩/에러), `isValidFmeaId` 등 보안·검증 유틸, Triplet/프로젝트 메타 API 클라이언트 |
| 조건부 | Import 마법사 UI 뼈대 — 컬럼 맵·파서만 주입 |
| 비권장 | 워크시트 그리드·고장연결 다이어그램 통합 — Rule 0·Rule 10 보호 구역과 충돌 |

## 4. causeCategory (또는 원인 분류) enum

- PFMEA: 공정/작업요소(4M)·제품 특성 중심 원인 분류.
- DFMEA: 기능 블록·인터페이스 중심; 동일 enum을 억지로 맞추면 의미 왜곡.
- **권장**: 공통 상위(`system`/`interface`/`performance` 등)만 공유하고, 앱별 확장 enum은 별도 타입.

## 5. 구조 트리 depth

- PFMEA: L1(완제품) → L2(공정) → L3(작업요소) + 제품/공정 특성 분기.
- DFMEA: 통상 설계 계층(시스템/서브시스템/컴포넌트)으로 깊이·의미가 다름.
- **공용 트리 컴포넌트**는 `depth`·`nodeType`을 제네릭으로 두고 데이터 어댑터만 분리하는 형태가 안전.

## 6. SOD 평가 기준

- PFMEA: 공정 리스크·검출(현장 관리) 기준표 연동 비중 큼.
- DFMEA: 설계 검증·시뮬·요구사항 기준; D의 의미가 “검출”보다 “설계 확인”에 가깝게 쓰이는 경우가 많음.
- **공용화**: S/O/D 숫자 입력 UI만 공유하고, 기준표(마스터 데이터)는 앱별 테이블 유지.

## 7. 예상 작업량

| 범위 | 규모 | 비고 |
|------|------|------|
| 유틸·API 클라이언트 공통화 | **S** | 이미 `@/lib/security`, 프로젝트 스키마 헬퍼 존재 |
| Import 마법사 공통 셸 + 주입형 파서 | **M** | 타입·CODEFREEZE 경계 정리 필요 |
| 워크시트·고장연결 통합 | **L** | 아키텍처·회귀 비용 큼; 비권장 |

---

*본 문서는 Import 파이프라인 방어선 작업 11 산출물이다.*
