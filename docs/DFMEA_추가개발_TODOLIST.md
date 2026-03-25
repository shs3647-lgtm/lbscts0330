# DFMEA 추가 개발 TODO LIST

> 작업 디렉토리: `C:\DNP_FMEA` (autom-fmea 클론)
> 브랜치: `dfmea/v1.0` (master에서 분기)
> 기준일: 2026-03-25
> 원칙: PFMEA 클론 → 용어/기준표 치환 → DFMEA 전용 기능 보완

---

## Phase 1: 라우팅 껍데기 (2h)

- [ ] `src/app/(fmea-core)/dfmea/` 디렉토리 생성
- [ ] `pfmea/layout.tsx` → `dfmea/layout.tsx` 복사 + 타이틀 변경 ("PFMEA" → "DFMEA")
- [ ] `pfmea/page.tsx` → `dfmea/page.tsx` 복사 + 리다이렉트 경로 변경
- [ ] 하위 폴더 껍데기 생성:
  - [ ] `dfmea/register/` — 등록정보 (설계 프로젝트)
  - [ ] `dfmea/import/` — Import (설계 FMEA 엑셀)
  - [ ] `dfmea/worksheet/` — 7단계 워크시트
  - [ ] `dfmea/list/` — 목록
  - [ ] `dfmea/revision/` — 개정관리
  - [ ] `dfmea/compare/` — 비교 뷰
  - [ ] `dfmea/dashboard/` — 대시보드
  - [ ] `dfmea/lld/` — 설계 교훈 (Design LLD)
- [ ] 각 page.tsx에 "DFMEA 준비 중" placeholder 표시

## Phase 2: DB 스키마 확장 (1h)

- [ ] `prisma/schema.prisma` M4Category enum 확장:
  ```
  기존: MC | MT | MN | EN | IM
  추가: PC (Physical Connection)
        ME (Material Exchange)
        ET (Energy Transfer)
        DE (Data Exchange)
        HMI (Human-Machine Interface)
  ```
- [ ] DFMEA 전용 SOD 기준표 모델 (기존 테이블 재사용, `fmeaType` 컬럼 추가):
  - [ ] `PfmeaSeverityCriteria` → `fmeaType: 'PFMEA' | 'DFMEA'` 컬럼 추가
  - [ ] `PfmeaOccurrenceCriteria` → 동일
  - [ ] `PfmeaDetectionCriteria` → 동일
- [ ] `FmeaProject.fmeaType` 필드 활용 확인 ('PFMEA' | 'DFMEA')
- [ ] `npx prisma db push` → 마이그레이션 실행
- [ ] DFMEA SOD 기준표 시드 데이터 작성 (AIAG-VDA DFMEA 1판 기준)

## Phase 3: 사이드바/네비게이션 (1h)

- [ ] `src/components/layout/Sidebar.tsx` — DFMEA 메뉴 그룹 추가:
  - [ ] 대시보드, 등록, 리스트, New FMEA, 개정관리, AP개선, LLD
- [ ] `src/components/layout/TopNav.tsx` — PFMEA ↔ DFMEA 전환 탭/버튼
- [ ] 사이드바 라우트 SSoT (`sidebar-routes.ts`) 업데이트
- [ ] DFMEA 아이콘 구분 (색상: PFMEA=파랑, DFMEA=보라)

## Phase 4: 7단계 워크시트 (4h)

### 4.1 용어 치환 맵

| 단계 | PFMEA 용어 | DFMEA 용어 |
|------|-----------|-----------|
| 1ST 구조 | 공정 (Process) | 서브시스템 (Sub-system) |
| | 작업요소 (Work Element) | 부품/컴포넌트 (Component) |
| | M4: MN/MC/IM/EN | M4: PC/ME/ET/DE/HMI |
| 2ST 기능 | 공정기능 | 설계기능/요구사항 |
| | 제품특성 | 설계특성 (Design Characteristic) |
| | 공정특성 | 설계 파라미터 |
| 3ST 고장 | 공정 고장형태 | 설계 고장형태 (기능 미충족) |
| | 고장원인 (4M) | 설계 원인 (치수/재료/공차/인터페이스) |
| 5ST 위험 | 예방관리 (PC) | 설계검증 예방관리 (Design Prevention) |
| | 검출관리 (DC) | 설계검증 검출관리 (Design Detection) |

### 4.2 구현 순서

- [ ] `pfmea/worksheet/` → `dfmea/worksheet/` 복사
- [ ] `constants.ts` 용어 치환 (ANALYSIS_TABS, 컬럼헤더)
- [ ] `tabs/structure/` — L2="서브시스템", L3="부품/컴포넌트"
- [ ] `tabs/function-l1/` — L1 기능 = 시스템 기능
- [ ] `tabs/function-l2/` — L2 기능 = 서브시스템 기능
- [ ] `tabs/function-l3/` — L3 기능 = 부품 기능, M4=PC/ME/ET/DE/HMI
- [ ] `tabs/failure-l1/` — FE = 시스템/차량/탑승자 영향
- [ ] `tabs/failure-l2/` — FM = 설계 고장형태
- [ ] `tabs/failure-l3/` — FC = 설계 원인 (치수/재료/공차)
- [ ] `tabs/failure/` — 고장연결 다이어그램 (구조 동일, 용어만 변경)
- [ ] `tabs/all/` — ALL 탭 통합 뷰 (SOD 기준표 DFMEA 전용으로 교체)
- [ ] `components/TopMenuBar.tsx` — SC/SOD/S추천 → DFMEA 기준표 연동
- [ ] SOD 기준표 모달 — DFMEA 전용 S/O/D 기준 표시

### 4.3 M4 카테고리 UI

- [ ] M4 드롭다운: PC/ME/ET/DE/HMI (5개)
- [ ] M4별 색상 구분:
  - PC (물리적 연결) = 파랑
  - ME (재료 교환) = 초록
  - ET (에너지 전달) = 주황
  - DE (데이터 교환) = 보라
  - HMI (휴먼머신) = 빨강

## Phase 5: Import/Export (3h)

- [ ] DFMEA 전용 엑셀 양식 설계 (4시트: L1/L2/L3/FC)
  - L1: 시스템 범위 (C1~C4)
  - L2: 서브시스템 (A1~A6)
  - L3: 부품/컴포넌트 (B1~B5), M4=PC/ME/ET/DE/HMI
  - FC: 고장사슬
- [ ] `position-parser.ts` 클론 → `dfmea-position-parser.ts`
  - M4 매핑 변경 (MN→HMI, MC→PC, IM→ME, EN→ET + DE 추가)
- [ ] `save-position-import` 클론 → DFMEA Import API
- [ ] 엑셀 Export 클론 → DFMEA 양식 (컬럼헤더 용어 변경)
- [ ] 다운로드 템플릿 DFMEA 전용 생성

## Phase 6: DFMEA ↔ PFMEA 연동 (2h)

- [ ] DFMEA FM → PFMEA FC 전환 API:
  ```
  POST /api/fmea/dfmea-to-pfmea
  body: { dfmeaId, pfmeaId }
  동작: DFMEA의 FM(설계고장형태)을 PFMEA의 FC(고장원인)으로 Import
  ```
- [ ] UI 버튼: DFMEA 워크시트 → "PFMEA로 전환" 버튼
- [ ] PFMEA Import 화면 → "DFMEA에서 가져오기" 옵션
- [ ] 연동 이력 추적 (어떤 DFMEA FM이 어떤 PFMEA FC가 되었는지)

## Phase 7: 시드/마스터 데이터 (1h)

- [ ] DFMEA SOD 기준표 시드:
  - S=1~10: AIAG-VDA DFMEA 심각도 (설계 관점)
  - O=1~10: AIAG-VDA DFMEA 발생도 (설계검증 관점)
  - D=1~10: AIAG-VDA DFMEA 검출도 (설계검증 관점)
- [ ] DFMEA MasterFmeaReference 초기 데이터 (있으면)
- [ ] DFMEA 산업DB (설계검증 방법 — DVP&R 연계)
- [ ] `prisma/seed-data/` DFMEA 시드 JSON 추가

## Phase 8: 테스트/검증 (2h)

- [ ] tsc --noEmit 에러 0건
- [ ] DFMEA 등록 → Import → 워크시트 렌더링 E2E
- [ ] 7단계 탭 전환 정상 동작
- [ ] SOD 평가 + AP 계산 정상
- [ ] DFMEA → PFMEA 연동 테스트
- [ ] 엑셀 Import/Export 왕복 테스트
- [ ] PFMEA 기존 기능 회귀 테스트 (깨짐 없음)

---

## 재사용 목록 (수정 없이 그대로)

| 모듈 | 파일 |
|------|------|
| Atomic DB 구조 | L1/L2/L3/FM/FE/FC/FL/RA 테이블 |
| AP 계산 | `riskOptUtils.ts` |
| 고장연결 다이어그램 | `useSVGLines.ts`, `FailureLinkTables.tsx` |
| 프로젝트 스키마 분리 | `project-schema.ts`, `getPrismaForSchema()` |
| Living DB | `master-chain-sync.ts`, `SeverityUsageRecord` |
| 배치 유틸 | `batch-utils.ts` |
| 보안 | `security.ts` (isValidFmeaId, safeErrorMessage) |
| 엑셀 파서 엔진 | `position-parser.ts` (구조 클론, M4만 변경) |

## 신규 개발 목록 (DFMEA 전용)

| 항목 | 설명 |
|------|------|
| DFMEA SOD 기준표 | 설계 관점 S/O/D (PFMEA와 다름) |
| M4 = PC/ME/ET/DE/HMI | 설계 인터페이스 5분류 |
| 경계도 (Boundary Diagram) | 시스템-서브시스템 경계 시각화 (Phase 9 확장) |
| P-Diagram | 파라미터 다이어그램 (Phase 9 확장) |
| DVP&R 연동 | 설계검증계획서 연계 (Phase 10 확장) |

---

## 일정 요약

| Phase | 작업 | 공수 | 누적 |
|-------|------|------|------|
| 1 | 라우팅 껍데기 | 2h | 2h |
| 2 | DB 스키마 확장 | 1h | 3h |
| 3 | 사이드바/네비 | 1h | 4h |
| 4 | 7단계 워크시트 | 4h | 8h |
| 5 | Import/Export | 3h | 11h |
| 6 | DFMEA↔PFMEA 연동 | 2h | 13h |
| 7 | 시드/마스터 | 1h | 14h |
| 8 | 테스트/검증 | 2h | **16h** |

---

*최종 업데이트: 2026-03-25 | DFMEA v1.0 개발 계획*
