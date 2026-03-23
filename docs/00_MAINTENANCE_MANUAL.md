# FMEA OnPremise 유지보수 매뉴얼

> **최종 업데이트**: 2026-03-23
> **총 테스트**: 78파일 / 1343테스트 ALL PASS | **빌드**: 240페이지 성공 | **tsc**: 에러 0개

---

## 업데이트 이력

| 날짜 | 시간 | 작업 내용 | 담당 |
|------|------|-----------|------|
| 2026-03-07 | 05:37 | 초판 작성 — 전체 모듈 체크리스트 + 트러블슈팅 876건 분석 | Claude |
| 2026-03-07 | 05:45 | 테스트 커버리지 현황 섹션 추가 (212개 테스트 모듈별 분류) | Claude |
| 2026-03-07 | 06:30 | CRITICAL 4건 + HIGH 2건 수정, 테스트 1235개 전체 통과 확인 | Claude |
| 2026-03-07 | 07:10 | 03-04~03-07 전체 커밋 81건 분석 → 체크리스트/트러블슈팅/이력 대폭 보강 | Claude |
| 2026-03-08 | 20:05 | 배포 전 전체 진단 — 보안(하드코딩 비밀번호/시크릿 제거) + empty catch 16건 수정 + console.log 8건 제거 + Operations error.tsx 추가 | Claude |
| 2026-03-18 | - | Raw SQL PascalCase 테이블명 전수 제거 (15개 파일) + CP 라우트 Prisma ORM 전환 + 트러블슈팅 T-38~T-42 추가 | Claude |
| 2026-03-20 | - | B4 dedup key WE 추가 (emptyPC 근본수정) + 골든 베이스라인 FC/FL/RA/B4: 104→103 갱신 + 방어코드 4건 추가 | Claude |
| 2026-03-22 | - | `repair-fk` API + `fk-repair.ts` (rebuild 없이 FK 정리), `DISABLE_REBUILD_ATOMIC`로 파이프라인 STEP0 rebuild 생략 | Claude |
| 2026-03-22 | - | `validate-fk` 10개 체크로 확장 (`failureLinkCoverage`, `riskAnalysisCoverage`) + `save-from-import` 불완전 Atomic 409 차단 + 회귀 테스트 3건 추가 | Claude |
| 2026-03-22 | - | 레거시 Import flat 복원, `save-from-import` 체인 유도/chain→flat B4/B5/A6 보강, `pipeline-verify` public A6/B5 fallback으로 `m001` DC/PC null 156건 해소, `f001` resave-import 0→23 FL/RA 회복 | Claude |
| 2026-03-22 | - | **CFT 공용 디렉터리**: `CftPublicMember` → `public.cft_public_members`, API `/api/cft-public-members`, 클라이언트 `cft-public-db.ts`. 기초정보 **사용자 정보(CFT)** 화면·`UserSelectModal`은 이 테이블만 사용 — 로그인 계정 `users`(ADMIN `/api/users`)와 **연동·동기화 없음**. 스키마 반영: `npx prisma db push` 또는 migrate | Claude |
| 2026-03-22 | - | **PFMEA→CP 생성 근본 수정**: `POST /api/pfmea/create-cp`가 `public`만 쓰던 문제 → **PFMEA 프로젝트 스키마**(`getPrismaForSchema(getProjectSchemaName(fmeaId))`)에 `control_plans`/`control_plan_items` 저장. `getPrismaForCp`에 `CpRegistration` 폴백. `GET /api/pfmea/[id]`는 프로젝트 `fmea_registrations`와 병합해 `linkedCpNo` 누락 방지. (M001 등에서 CP 워크시트 빈 화면·「연동할 CP 없음」 재발 방지) | Claude |
| 2026-03-23 | - | **아키텍처 확정**: Master 포함 모든 PFMEA 행 데이터는 `pfmea_{fmeaId}` — public은 메타 전용. **`POST /api/fmea/sync-cp-pfd`**가 `public`에 쓰던 이중 경로 제거 → **프로젝트 스키마**에만 CP/PFD 행 저장(`create-cp`/`sync-to-cp`와 동일). 레거시 이관: `scripts/migrate-public-cp-pfd-to-project-schema.ts`. 문서: `docs/Fmea master family part cp pfd architecture.md` 갱신. | Claude |
| 2026-03-23 | - | **구조분석 컨텍스트 메뉴**: React 18 Strict Mode(개발)에서 함수형 `setState`가 동일 `prev`로 두 번 호출되며 `splice`가 이중 적용 → 「아래로 새 행 추가」 시 placeholder가 위·아래 2줄로 보이던 현상. `createStrictModeDedupedUpdater`(`strictModeStateUpdater.ts`)로 첫 계산 결과만 캐시. `StructureTab` 행 추가·병합 추가·삭제 업데이터에 적용. 단위 테스트: `strictModeStateUpdater.test.ts`. | Claude |
| 2026-03-23 | - | **setStateSynced 근본 수정**: `useWorksheetState`가 `updater(stateRef)` 후 `setState(객체)`만 호출해 React 큐의 `prev`와 어긋날 수 있음 → `setState(prev => …)`로 통일. `PfmeaContextMenu` 메뉴 액션에 `stopPropagation`/`type="button"`/패널 `onMouseDown`으로 중복 실행 방지. | Claude |
| 2026-03-23 | - | **수동모드 컨텍스트 메뉴 진단서**: Handsontable 가정과 실제(HTML 테이블 + `PfmeaContextMenu`) 구분, 체크리스트 A~F 매핑 — `docs/PFMEA_MANUAL_MODE_CONTEXT_MENU_DIAGNOSIS.md`. E2E `context-menu-all-tabs.spec.ts`에 L2「위로 새 행 추가」→정확히 +1행 케이스 추가. | Claude |

---

## 목차

1. [PFMEA 워크시트 탭별 동작 체크리스트](#1-pfmea-워크시트-탭별-동작-체크리스트)
2. [CP (관리계획서) 동작 체크리스트](#2-cp-관리계획서-동작-체크리스트)
3. [PFD (공정흐름도) 동작 체크리스트](#3-pfd-공정흐름도-동작-체크리스트)
4. [DFMEA 동작 체크리스트](#4-dfmea-동작-체크리스트)
5. [등록/개정/결재 동작 체크리스트](#5-등록개정결재-동작-체크리스트)
6. [모듈간 연동 체크리스트](#6-모듈간-연동-체크리스트)
7. [트러블슈팅 가이드](#7-트러블슈팅-가이드)
8. [회귀 테스트 명령어 모음](#8-회귀-테스트-명령어-모음)
9. [테스트 커버리지 현황](#9-테스트-커버리지-현황)
10. [버그 수정 이력](#10-버그-수정-이력)
11. [CODEFREEZE 보호 파일 목록](#11-codefreeze-보호-파일-목록)

---

## 1. PFMEA 워크시트 탭별 동작 체크리스트

### 1.1 구조분석 탭 (StructureTab)

| # | 테스트 항목 | 동작 | 확인 방법 | 상태 |
|---|-----------|------|----------|------|
| S-01 | L1 행 추가 | 컨텍스트 메뉴 → 행추가 | 새 행 생성 + DB 저장 확인 | |
| S-02 | L2 행 추가 | 컨텍스트 메뉴 → 행추가 | L1 하위에 L2 생성 | |
| S-03 | L3 행 추가 | 컨텍스트 메뉴 → 행추가 | L2 하위에 L3 생성 | |
| S-04 | 행 삭제 (L1/L2/L3) | 컨텍스트 메뉴 → 행삭제 | 삭제 + 하위 데이터 연쇄삭제 | |
| S-05 | 병합 추가 | 컨텍스트 메뉴 → 병합추가 | 동일 레벨에 병합행 생성 | |
| S-06 | 셀 편집 | 더블클릭 → 텍스트 입력 | 입력값 DB 저장 | |
| S-07 | 확정/확정해제 | 확정 버튼 클릭 | 확정 시 편집 잠금, 해제 시 편집 가능 | |
| S-08 | 컨텍스트 메뉴 열별 분기 | L1/L2/L3 열에서 우클릭 | 해당 열에 맞는 메뉴 표시 | |
| S-09 | sortOrder 유지 | 행 추가/삭제 후 | 기존 행 순서 불변 확인 | |
| S-10 | 수동모드 placeholder | 빈 L3 placeholder | 삭제되지 않고 유지됨 | |

### 1.2 기능분석 L1 탭 (FunctionL1Tab)

| # | 테스트 항목 | 동작 | 확인 방법 | 상태 |
|---|-----------|------|----------|------|
| F1-01 | 요구사항 행 추가 | 컨텍스트 메뉴 → 행추가 | 요구사항 행 생성 | |
| F1-02 | 요구사항 행 삭제 | 컨텍스트 메뉴 → 행삭제 | reqId 빈값 시에도 정상 삭제 (1eb78784) | |
| F1-03 | 기능 텍스트 편집 | 더블클릭 → 입력 | DB 저장 확인 | |
| F1-04 | 확정해제 자동 | 확정 상태에서 메뉴 클릭 | 자동 확정해제 후 메뉴 표시 | |

### 1.3 기능분석 L2 탭 (FunctionL2Tab)

| # | 테스트 항목 | 동작 | 확인 방법 | 상태 |
|---|-----------|------|----------|------|
| F2-01 | L2 기능 편집 | 더블클릭 → 입력 | DB 저장 | |
| F2-02 | 행 추가/삭제 | 컨텍스트 메뉴 | 정상 동작 + sortOrder 유지 | |
| F2-03 | 중복 제거 | 동일 L2 데이터 | deduplication 정상 동작 | |
| F2-04 | 확정해제 자동 | 확정 상태에서 메뉴 | 자동 해제 후 표시 | |

### 1.4 기능분석 L3 탭 (FunctionL3Tab)

| # | 테스트 항목 | 동작 | 확인 방법 | 상태 |
|---|-----------|------|----------|------|
| F3-01 | L3 기능 편집 | 더블클릭 → 입력 | DB 저장 | |
| F3-02 | 병합추가 열별 분기 | 컨텍스트 메뉴 → 병합추가 | 열에 따라 L2/L3 분기 (e31b08f2) | |
| F3-03 | 삭제 열별 분기 | 컨텍스트 메뉴 → 삭제 | 열에 따라 L2/L3 분기 | |
| F3-04 | 수동모드 placeholder | 빈 L3 | 삭제되지 않음 | |
| F3-05 | 초기 상태 funcId 빈값 | 새 행에서 컨텍스트 메뉴 | funcId 빈값 시에도 정상 동작 (20cb6c90) | |
| F3-06 | 제품특성·공정특성 행삭제 | charId 빈값 시 삭제 | 빈값 폴백 정상 처리 (bab3fc4a) | |

### 1.5 고장분석 탭 (FailureL1/L2/L3)

| # | 테스트 항목 | 동작 | 확인 방법 | 상태 |
|---|-----------|------|----------|------|
| FL-01 | 고장영향(FE) 편집 | L1 탭에서 편집 | DB 저장 | |
| FL-02 | 고장모드(FM) 편집 | L2 탭에서 편집 | DB 저장 | |
| FL-03 | 고장원인(FC) 편집 | L3 탭에서 편집 | DB 저장 | |
| FL-04 | 행 추가/삭제 | 컨텍스트 메뉴 | 정상 동작 + 연쇄 처리 | |
| FL-05 | FE 심각도 자동 | FE 텍스트 기반 | AIAG-VDA 기준 심각도 추천 | |
| FL-06 | 확정해제 자동 | 확정 상태에서 | 7개 탭 통일 패턴 | |
| FL-07 | orphan 방어 | FM/FC 없는 행 | productChar/processChar 방어 (149f7c7a) | |
| FL-08 | 1L영향 행삭제 빈값 | effectId 빈값 시 삭제 | 부모 행 삭제 정상 (04f7f2bc) | |
| FL-09 | 2L고장 행삭제 빈값 | modeId 빈값 시 삭제 | 부모 행 삭제 정상 (04f7f2bc) | |

### 1.6 고장연결 탭 (FailureLinkTab)

| # | 테스트 항목 | 동작 | 확인 방법 | 상태 |
|---|-----------|------|----------|------|
| LK-01 | FM-FE-FC 자동 연결 | Import 후 | 모든 FM에 FE/FC 연결 확인 | |
| LK-02 | 라운드로빈 분배 | FE > FM 시 | 균등 분배 (c738d84c) | |
| LK-03 | SVG 연결선 표시 | 연결된 항목 | 선 정상 렌더링 | |
| LK-04 | 수동 연결/해제 | 체크박스 클릭 | savedLinks DB 저장 | |
| LK-05 | 공통공정 FM | 01번 공정 | FM 누락 없음 (399a042c) | |
| LK-06 | B2/B3 belongsTo | 워크시트 WE 매칭 | 정확한 매칭 (d22615a3) | |

### 1.7 ALL 탭 (AllTabAtomic)

| # | 테스트 항목 | 동작 | 확인 방법 | 상태 |
|---|-----------|------|----------|------|
| AL-01 | 전체 데이터 렌더링 | ALL 탭 진입 | 구조→기능→고장→최적화 통합 표시 | |
| AL-02 | SOD 모달 | 셀 클릭 | 심각도 3열 통합 표시 (fa6e5e1d) | |
| AL-03 | 개선추가 | 헤더 버튼 | 중복 버튼 없음, +/- 표시 (c978f15d) | |
| AL-04 | colSpan 레이아웃 | 4단계 | colSpan=7 정렬 (d157d539) | |
| AL-05 | 검출도 불일치 감지 | 모달 열기 | detectionMismatchInfo 경고 | |
| AL-06 | 다중선택 저장 | 산업표준 모달 | 다중선택 지원 (b582a546) | |
| AL-07 | RPN 차트 | 우측 패널 | 파레토 차트 정상 표시 | |
| AL-08 | 특별특성 셀 | 셀 클릭 | 모달 열기 (b4f54b37) | |
| AL-09 | Filter Code 드롭다운 | 컬럼 추가 | 필터 정상 동작 (03975594) | |
| AL-10 | 엑셀 Export | 전체 내보내기 | 등록정보/CFT/개정현황 포함 (c53050ff) | |
| AL-11 | 성능 최적화 | 대량 데이터 | useMemo/useEffect분할/Map기반 (5088c5bc) | |
| AL-12 | 자동수정 원클릭 | S/PC/DC 순차 실행 | 적색 하이라이트 표시 (7d8cc6cf) | |
| AL-13 | 습득교훈 토글 | 숨기기 버튼 | 토글 정상 동작 (03975594) | |

### 1.8 최적화 탭 (OptTab)

| # | 테스트 항목 | 동작 | 확인 방법 | 상태 |
|---|-----------|------|----------|------|
| OP-01 | 심각도(S) 추천 | 키워드 매칭 | 누락건 순차 이동 (30bc3875) | |
| OP-02 | 발생도(O) 자동 | 교육=5, 육안=7 | AIAG-VDA v3.0 기준 | |
| OP-03 | 검출도(D) 자동 | 비전=3 | AIAG-VDA v3.0 기준 | |
| OP-04 | specialChar 매칭 | 3-tier lookup | riskData→master→l2 (097580f6) | |

### 1.9 Import

| # | 테스트 항목 | 동작 | 확인 방법 | 상태 |
|---|-----------|------|----------|------|
| IM-01 | 엑셀 파일 업로드 | 파일 선택 | 파싱 성공 | |
| IM-02 | STEP A 확정 | 구조 데이터 확인 | SA 탭 정상 | |
| IM-03 | STEP B 확정 | 고장 데이터 확인 | FC 탭 정상 | |
| IM-04 | FE 심각도 검증 | AIAG-VDA 기준 | 심각도 값 정확 | |
| IM-05 | B1/B2/B3 카운트 | DISTINCT 기준 | DB와 동일 기준 | |
| IM-06 | A6/B5 데이터 | 검출/예방 관리 | flatItems 3-tier fallback (a460039a) | |
| IM-07 | 검증표 정합성 | FC/FE 불일치 | chainProcessStats 확인 (31cb7e63) | |
| IM-08 | MAX_DATA_ROWS | 320+ 공정 | 5000행 지원 (28ee148d) | |
| IM-09 | 헤더 감지 | 2-pass 방식 | 경고 메시지 정확 (7717c20a) | |
| IM-10 | 확정 되돌리기 | 확정→리셋 | 탭이동 분리 (f12c0679) | |
| IM-11 | 자동보완 적색 하이라이트 | Import 자동보완 셀 | imported flag + red highlight (e2111908) | |
| IM-12 | STEP B 전처리 | 간소화 포맷 | procNo 자동할당 + 한국어 scope (2f12e57b) | |
| IM-13 | B3 공정특성 자동추론 | 업종별 DB | FC/FM 키워드 → 자동생성 (bd18395a) | |
| IM-14 | C2/C3 업종별 DB 추론 | 전기전자 업종 | C2≤C4 계층 보장 (1bef26ad) | |
| IM-15 | A6 검출관리 + B5 예방관리 | fcChains 추출 | 누락 근본 해결 (a01c5c97) | |
| IM-16 | 완제품명 자동추출 | subject → partName | 누락 재발 방지 (b4986c45) | |

---

## 2. CP (관리계획서) 동작 체크리스트

### 2.1 CP Import

| # | 테스트 항목 | 동작 | 확인 방법 | 상태 |
|---|-----------|------|----------|------|
| CI-01 | 엑셀 업로드 | 파일 선택 | 파싱 성공 | |
| CI-02 | 기초정보 미리보기 | B1/B2 카테고리 | 필터링 정상 (82fb325d) | |
| CI-03 | 관리계획서 미리보기 | 인라인 편집 | 더블클릭 편집 + 저장 | |
| CI-04 | 행 삭제/되돌리기 | 삭제 버튼 | 삭제 + 되돌리기 정상 | |
| CI-05 | 확정→CP 이동 | 확정 버튼 | CP 워크시트로 이동 | |
| CI-06 | DB 저장 | 저장 버튼 | 실제 DB 저장 확인 (dc9f0f6a) | |
| CI-07 | verify-counts | 자동생성 항목 | 자동생성 항목 제외 (07f9f99d) | |
| CI-08 | 메뉴바 통일 | 구분/기초정보/관리계획서 | 3행 teal 색상 통일 (1f5df685) | |
| CI-09 | 워크시트 템플릿 동시저장 | Import 확정 | ControlPlanItem 동시 저장 (435f6e45) | |

### 2.2 CP 워크시트

| # | 테스트 항목 | 동작 | 확인 방법 | 상태 |
|---|-----------|------|----------|------|
| CW-01 | 컨텍스트 메뉴 (part) | part 행 우클릭 | part 타입 핸들러 동작 (162c121e) | |
| CW-02 | 컨텍스트 메뉴 (general) | general 행 우클릭 | general 타입 핸들러 동작 | |
| CW-03 | sortOrder 불변 | 행 추가/삭제 후 | 기존 순서 유지 | |
| CW-04 | 확정/승인 상태 영속 | 확정 후 페이지 이동 | 상태 DB 유지 (278f3a48) | |
| CW-05 | FMEA 연동 데이터 | CP↔FMEA 동기 | 데이터 정상 표시 | |
| CW-06 | 셀 편집 + DB 저장 | 더블클릭 → 입력 | atomic DB 저장 | |
| CW-07 | 배열 경계 체크 | 범위 벗어난 셀 클릭 | 크래시 방지 (e2a9bd2b) | |

### 2.3 CP 기초정보/마스터

| # | 테스트 항목 | 동작 | 확인 방법 | 상태 |
|---|-----------|------|----------|------|
| CM-01 | 기초정보 항상 표시 | 등록 화면 | 기초정보 섹션 표시 (89709e36) | |
| CM-02 | 마스터 자동 동기화 | 등록/워크시트 저장 | 마스터 데이터 동기화 (f1c69778) | |
| CM-03 | SOD 데이터 정합성 | SODMasterData | DB와 일치 (a35b9a74) | |
| CM-04 | 검출관리 모달 | 모달 열기 | Import 기초정보만 표시 (7f3916b3) | |
| CM-05 | 문서생성 모달 동적 라벨 | 소스앱별 | B4 공통공정 자동 삽입 (c26bc1ae) | |
| CM-06 | PFMEA-CP atom-map API | 연동 강화 | 등록 UI 개선 (0b42a774) | |

---

## 3. PFD (공정흐름도) 동작 체크리스트

| # | 테스트 항목 | 동작 | 확인 방법 | 상태 |
|---|-----------|------|----------|------|
| PF-01 | sortOrder 불변 | 행 추가/삭제 | 기존 순서 유지 (a6c8fda9) | |
| PF-02 | FMEA 이동 | 메뉴바 → FMEA이동 | 연동 ID 정확 전달 (cfb36648) | |
| PF-03 | CP 이동 | 메뉴바 → CP이동 | 연동 ID 정확 전달 | |
| PF-04 | PFD→FMEA 네비게이션 | 클릭 이동 | 정확한 FMEA로 이동 (696ef19e) | |
| PF-05 | 설비/금형/지그 매핑 | 4M 데이터 | 실제 설비명 표시 (f505663c) | |
| PF-06 | FMEA→PFD 동기화 | 양방향 | SC매핑 + 빈행 렌더링 정상 | |
| PF-07 | 4M 빈 행 처리 | B1/B2/B3 | rowM4 폴백 MC 통일 (0d1beda1) | |
| PF-08 | 기초정보 DB 영속화 | 마스터 API | 저장/로드 정상 (168ca813) | |
| PF-09 | 컨텍스트 메뉴 | 우클릭 | 행추가/삭제/병합 정상 | |
| PF-10 | LLD 자동선택 | PFD 메뉴 | 자동선택 + 중복 정리 (e127b128) | |

---

## 4. DFMEA 동작 체크리스트

| # | 테스트 항목 | 동작 | 확인 방법 | 상태 |
|---|-----------|------|----------|------|
| DF-01 | 등록 화면 | 신규 DFMEA 등록 | 폼 입력 + DB 저장 | |
| DF-02 | Import | 엑셀 업로드 | 파싱 성공 | |
| DF-03 | 워크시트 탭 전환 | 구조→기능→고장→ALL | 데이터 유지 | |
| DF-04 | CP 연동 | syncDfmeaCP | 동기화 정상 (1b930d22) | |
| DF-05 | 리스트 표시 | modulePrefix | 'dfm' 접두사 정상 (77ebf8e7) | |
| DF-06 | SOD 데이터 | 정오표 반영 | 엑셀 기준 정밀 (762fb7ee) | |
| DF-07 | setStateSynced | 상태 동기화 | setState→setStateSynced 전환 (b0e6405e) | |
| DF-08 | ALL 탭 Export | 엑셀 내보내기 | PFMEA+DFMEA 전체 (41bf3b70) | |
| DF-09 | 사이드바 | FMEA4판 | 비활성화 상태 (9a7af940) | |

---

## 5. 등록/개정/결재 동작 체크리스트

### 5.1 등록 (Register)

| # | 테스트 항목 | 동작 | 확인 방법 | 상태 |
|---|-----------|------|----------|------|
| RG-01 | 신규 FMEA 등록 | 등록 폼 | ID 생성 + DB 저장 | |
| RG-02 | 기초정보 Import | Import 버튼 | 페이지 이동 + 데이터 표시 (fdf9fae0) | |
| RG-03 | 기초정보 템플릿 미리보기 | 등록 화면 | 즉시 표시 + L1 데이터 (ffd12039) | |
| RG-04 | Family CP/PFD 생성 | 다건 생성 | baseId-01/-02 서브넘버 (664f4112) | |
| RG-05 | 연동 CP/PFD 표시 | 등록 화면 | 개별 ID 표시 (6c5b507a) | |
| RG-06 | FMEA 삭제 | 삭제 버튼 | 마스터 연쇄삭제 (8fd6e6fd) | |
| RG-07 | CFT 리스트 | 저장 상태 | saving/saved/idle 표시 (5466d00f) | |
| RG-08 | 리스트 sticky 헤더 | 스크롤 | 간극 없음 (0173529a) | |
| RG-09 | CFT 역할 자동추천 | 역할 입력 | 자동완성 추천 (24616d6a) | |
| RG-10 | 기초정보 접힘/펼침 | 등록 화면 | 아코디언 UX (24616d6a) | |
| RG-11 | API 병렬화 | 등록 화면 로드 | 로딩 속도 개선 (24616d6a) | |
| RG-12 | Help 버튼 위치 | TopNav EN 좌측 | 위치 이동 (3ec9b200) | |

### 5.2 개정 (Revision)

| # | 테스트 항목 | 동작 | 확인 방법 | 상태 |
|---|-----------|------|----------|------|
| RV-01 | 개정번호 시작 | 최초 등록 | 0.00 시작 (f521e73b) | |
| RV-02 | 개정이력 삭제 보호 | 디폴트/승인완료 | 삭제 불가 (9daeeb5c) | |
| RV-03 | soft-delete 재등록 | 삭제된 프로젝트 | deletedAt 복구 (8c37a6d0) | |
| RV-04 | 개정 저장 후 배지 | 기초정보 확인 | 수정(Import)/사용(워크시트) 선택 (22d7a00b) | |
| RV-05 | CFT Leader 연동 | 자동 | 부서/직급 자동 채움 (636d06db) | |

### 5.3 결재 (Approval)

| # | 테스트 항목 | 동작 | 확인 방법 | 상태 |
|---|-----------|------|----------|------|
| AP-01 | 검토자/승인자 재변경 | 지정 후 변경 | 재변경 가능 (23acc381) | |
| AP-02 | 상위 결재자 승인 | 회수 버튼 | 숨김 처리 (cd0aa394) | |
| AP-03 | 에러 메시지 | 개정 오류 | 사용자 친화적 메시지 (f055cc3d) | |
| AP-04 | CFT 성명 입력 | 사용자 추가 | 성명 입력란 표시 (23a101d9) | |

---

## 6. 모듈간 연동 체크리스트

| # | 테스트 항목 | 동작 | 확인 방법 | 상태 |
|---|-----------|------|----------|------|
| LN-01 | PFMEA→CP 연동 | CP 동기화 | 데이터 정상 전달 | |
| LN-02 | CP→PFMEA 역연동 | 역방향 | 워크시트 데이터 표시 (d7083bca) | |
| LN-03 | FMEA↔PFD 양방향 | 동기화 | SC매핑 + 6건 정상 (6c515409) | |
| LN-04 | PFD→FMEA 이동 | 네비게이션 | 연동된 FMEA로 이동 (696ef19e) | |
| LN-05 | PFD→CP 이동 | 네비게이션 | 연동 ID 전달 (cfb36648) | |
| LN-06 | 연동 CP/PFD 클릭 | 리스트 이동 | 갯수 선택 모든 타입 (fe2b8c92) | |
| LN-07 | processChar 교차매핑 | CP 재생성 | 52/55건 정상 (0132a69a) | |
| LN-08 | FM 갭 피드백 루프 | Import↔WS | 양방향 동기화 (d9021a5a) | |
| LN-09 | DFMEA→CP 연동 | syncDfmeaCP | 동기화 정상 | |

---

## 7. 트러블슈팅 가이드

### 7.1 PFMEA 워크시트

| # | 증상 | 원인 | 해결 | 관련 커밋 |
|---|------|------|------|----------|
| T-01 | 컨텍스트 메뉴가 열 구분 없이 동작 | 열별 분기 로직 누락 | 열 인덱스로 L1/L2/L3 분기 처리 | `0773a5d6`, `e31b08f2` |
| T-02 | 확정 상태에서 컨텍스트 메뉴 미표시 | `if (isConfirmed) return;` 차단 | 자동 확정해제 후 메뉴 표시 패턴 통일 | `d157d539` |
| T-03 | 행 추가/삭제 후 순서 깨짐 | sortOrder 직접 mutation | spread operator로 새 배열 생성 (불변성) | `a6c8fda9`, `162c121e` |
| T-04 | 수동모드에서 첫 행 입력 불가 | 데이터 로드 경로에 필터 삽입 → placeholder 삭제 | 로드 경로 원본 불변, 별도 useMemo로 가공 | RULE #1.9 |
| T-05 | DB 동시 저장 시 데이터 유실 | 뮤텍스 패턴 한계 | 큐 패턴으로 전환 (db-storage.ts) | `d157d539` |
| T-06 | 고장사슬 16건 누락 | FE 분배 알고리즘 오류 | 라운드로빈 분배 적용 | `c738d84c` |
| T-07 | FM/FC 연결 없는 orphan 행 | productChar/processChar 미생성 | orphan 방어 로직 추가 | `149f7c7a` |
| T-08 | ALL탭 prop mutation | `visibleSteps.sort()` 직접 정렬 | `[...spread].sort()` 불변성 수정 | `b582a546` |
| T-09 | reqId 빈값 시 행삭제 실패 | reqId undefined 참조 | 빈값 폴백 처리 | `1eb78784` |
| T-10 | 320+ 공정에서 FC 누락 | MAX_DATA_ROWS=500 제한 | 5000으로 상향 | `28ee148d` |
| T-11a | 3L기능 초기 상태에서 메뉴 미작동 | funcId 빈값 참조 | 빈값 폴백 처리 | `20cb6c90` |
| T-11b | 1L영향/2L고장 행삭제 실패 | effectId/modeId 빈값 | 부모 행 삭제 폴백 | `04f7f2bc` |
| T-11c | 제품특성·공정특성 행삭제 실패 | charId 빈값 | 빈값 폴백 처리 | `bab3fc4a` |
| T-11d | 배열 깨짐 런타임 크래시 | 배열 인덱스 접근 방어 없음 | useArrayGuard 방어 코드 3종 | `9bff8255` |

### 7.2 CP 모듈

| # | 증상 | 원인 | 해결 | 관련 커밋 |
|---|------|------|------|----------|
| T-11 | CP Import 저장 버튼 미동작 | DB 저장 API 미연결 | 저장/확정 버튼 DB 연결 | `dc9f0f6a` |
| T-12 | CP 기초정보 B1/B2 미표시 | 카테고리 필터링 오류 | B1/B2 필터 수정 | `82fb325d` |
| T-13 | 확정/승인 상태 페이지 이동 후 초기화 | 상태 미영속화 | DB 영속화 적용 | `278f3a48` |
| T-14 | part 타입 컨텍스트 메뉴 미작동 | part/general 핸들러 누락 | 타입별 핸들러 추가 | `162c121e` |
| T-15 | CP 연동 후 워크시트 데이터 미표시 | CP→FMEA 역연동 데이터 구조 불일치 | 데이터 구조 통일 | `d7083bca` |

### 7.3 PFD 모듈

| # | 증상 | 원인 | 해결 | 관련 커밋 |
|---|------|------|------|----------|
| T-16 | PFD→FMEA 이동 시 엉뚱한 FMEA | 연동 ID 미전달 | 연동 ID 정확 전달 | `cfb36648`, `696ef19e` |
| T-17 | 설비명 대신 4M 코드 표시 | 4M 코드를 직접 매핑 | 실제 설비명 매핑으로 전환 | `f505663c` |
| T-18 | 4M 빈 행에서 B1/B2/B3 누락 | rowM4 폴백 미처리 | MC로 통일 폴백 | `0d1beda1` |
| T-19 | FMEA→PFD 연동 시 빈행 렌더링 | 빈행 처리 로직 | 근본 3건 수정 | `977f0a5a` |

### 7.4 DFMEA 모듈

| # | 증상 | 원인 | 해결 | 관련 커밋 |
|---|------|------|------|----------|
| T-20 | DFMEA 리스트 미표시 | modulePrefix 'pfm' 잘못 사용 | 'dfm'으로 수정 | `77ebf8e7` |
| T-21 | DFMEA 타입 모듈 경로 오류 | import 경로 잘못된 참조 | 경로 보정 | `9a7af940` |
| T-22 | setState 비동기 이슈 | setState로 상태 갱신 | setStateSynced로 전환 | `b0e6405e` |

### 7.5 연동/인증

| # | 증상 | 원인 | 해결 | 관련 커밋 |
|---|------|------|------|----------|
| T-23 | 결재자 지정 후 재변경 불가 | `!name` 가드로 차단 | 가드 제거 | `23acc381` |
| T-24 | 비밀번호 해싱 오류 | 해싱 로직 결함 | 해싱 수정 | `c59496c1` |

### 7.6 빌드/테스트 (2026-03-07 추가)

| # | 증상 | 원인 | 해결 | 관련 커밋 |
|---|------|------|------|----------|
| T-25 | 빌드 174/233 페이지에서 실패 | `/myjob` useSearchParams() Suspense 미래핑 | 서버 page.tsx + Suspense + 클라이언트 분리 | `e2a9bd2b` |
| T-26 | CP 워크시트 셀 클릭 시 크래시 | `items[rowIdx]` 배열 경계 체크 미수행 | `if (rowIdx < 0 \|\| rowIdx >= items.length) return;` | `2032265e` |
| T-27 | APQP ProjectLinkage 에러 무시 | 빈 catch 블록 `catch(e) {}` | `console.error` 로깅 추가 | `2032265e` |
| T-28 | 테스트 13건 FAIL (FM 카운트) | buildWorksheetState FM 107→136 확장 반영 안됨 | EXPECTED.a5FM=136 업데이트 | `e2a9bd2b` |
| T-29 | 연동 CP/PFD +N 뱃지 과다 표시 | 뱃지 집계 오류 | 모든 ID 개별 표시 | `6c5b507a` |
| T-30 | MyJob DFMEA 표시 | 비활성화 모듈 노출 | DFMEA 제외 필터 | `c59496c1` |
| T-31 | 비밀번호 해싱 불일치 | 로그인 실패 | 해싱 로직 수정 | `c59496c1` |

### 7.7 배포 전 전체 진단 (2026-03-08 추가)

| # | 증상 | 원인 | 해결 | 관련 커밋 |
|---|------|------|------|----------|
| T-32 | 하드코딩 비밀번호 노출 | auth-service.ts에 `'admin'`, 전화번호 하드코딩 | 환경변수 `ADMIN_DEFAULT_PASSWORD`, `DEMO_USER_PASSWORD`로 전환 | `c5010535` |
| T-33 | 시크릿키 하드코딩 | approvalToken.ts 기본값이 추측 가능 | 환경변수 미설정 시 경고 로깅 + 안전한 기본값 | `c5010535` |
| T-34 | API 500에서 error.message 직접 노출 | login/route.ts에서 스택 노출 | 안전한 한국어 메시지로 교체 | `c5010535` |
| T-35 | empty catch 16건 에러 묵살 | bizinfo-db, user-db, auth-service 등 | 모든 catch에 console.error 추가 | `c5010535` |
| T-36 | API console.log 디버그 잔류 | useAutoLldFilter, usePfdData, API 3파일 | 8건 console.log 제거 | `c5010535` |
| T-37 | Operations 화이트 스크린 | pm/, ws/ 라우트에 error.tsx 없음 | error.tsx 추가 (에러 바운더리) | `c5010535` |

### 7.8 Raw SQL 테이블/컬럼명 불일치 (2026-03-18 추가)

| # | 증상 | 원인 | 해결 | 수정 파일 수 |
|---|------|------|------|------------|
| T-38 | raw SQL `42P01` 테이블 없음 에러 | Prisma 모델명(PascalCase)을 SQL에 직접 사용 | PascalCase → @@map snake_case 전수 변환 | 15 |
| T-39 | CP 기초정보/통계 API 빈 결과 | `cp_master_flat_items`에 없는 `cpNo` 컬럼 사용 | Prisma ORM으로 전환 (dataset 관계 활용) | 2 |
| T-40 | FM 조회 `name` 빈값 | `failure_modes` 컬럼은 `mode` (not `name`) | `fm.name` → `fm.mode` 수정 | 1 |
| T-41 | fmea_legacy_data 컬럼 에러 | `"legacyData"` 사용 (실제: `data`) | 전수 수정 | 3 |
| T-42 | 프로젝트 스키마 테이블명 불일치 | 레거시 `"FmeaInfo"` vs 신규 `fmea_projects` | 자동 감지 패턴 + snake_case 우선 | 5 |
| T-43 | LLD추천/개선추천 저장 후 사라짐 (1차) | ATOMIC DIRECT 로드 경로에서 legacy riskData 6ST 키 미병합 | `useWorksheetDataLoader.ts` ATOMIC DIRECT 경로에 OPT_PREFIXES 병합 추가 | 1 |
| T-44 | LLD추천/개선추천 재발 — 프로젝트 스키마 riskData 0건 (2차) | API POST에서 optimizations → riskData 역매핑 누락 → 프로젝트 스키마 `fmea_legacy_data`에 `lesson-opt-*`/`detection-opt-*` 키 0건 | `route.ts` step 13.5: optimizations → legacy riskData 자동 역매핑 추가 | 1 |
| T-45 | m071 마스터JSON 없음 + orphanPC 8건 | export-master 미실행 + placeholder FC 누락 | `pipeline-verify` auto-fix + `export-master` 실행 | 1 |
| T-46 | PfmeaMasterFlatItem rowSpan NULL 2765건 | 생성 시 rowSpan 미설정 → deep 검증 FAIL | DB `UPDATE rowSpan=1 WHERE NULL` | 1 |
| T-47 | m069 Public↔Project riskData 불일치 (keys 12 vs 1638) | Public `fmea_legacy_data.riskData` 미동기화 | Project → Public riskData 병합 스크립트 | 1 |

---

## 8. 회귀 테스트 명령어 모음

### 8.1 전체 검증 (커밋 전 필수)

```bash
# 1단계: 타입 체크
npx tsc --noEmit

# 2단계: 전체 단위 테스트
npx vitest run

# 3단계: 프로덕션 빌드 (주요 변경 시)
npm run build

# 4단계: 문서 동기화 (Rule 17 — 모든 코드 변경 후 필수)
# - CLAUDE.md 룰/아키텍처 반영
# - docs/MAINTENANCE_MANUAL.md 파일맵/데이터흐름/버그패턴 반영
# - docs/00_MAINTENANCE_MANUAL.md 트러블슈팅/이력/테스트커버리지 반영
```

### 8.2 모듈별 단위 테스트

```bash
# PFMEA Import 관련 (18개 파일)
npx vitest run src/__tests__/import/

# PFMEA 고장연결
npx vitest run src/__tests__/failure-link-pipeline.test.ts
npx vitest run src/__tests__/failure-link-guard.test.ts
npx vitest run src/__tests__/failure-chain-parsing-diagnosis.test.ts

# ALL 탭
npx vitest run src/__tests__/all-tab-performance.test.ts
npx vitest run src/__tests__/all-tab-chain-enrichment.test.ts
npx vitest run src/__tests__/all-tab-map-utils.test.ts
npx vitest run src/__tests__/all/auto-lld-handlers.test.ts

# SOD/발생도/검출도
npx vitest run src/__tests__/auto-fill-occurrence.test.ts
npx vitest run src/__tests__/fill-pcdc-from-import.test.ts
npx vitest run src/__tests__/control-modal-save.test.ts

# CP 모듈
npx vitest run src/__tests__/cp-context-menu-handlers.test.ts
npx vitest run src/__tests__/cp-master-sync.test.ts
npx vitest run src/__tests__/cp-master-preview-save.test.ts

# PFD 모듈
npx vitest run src/__tests__/pfd-context-menu-handlers.test.ts

# 연동 테스트
npx vitest run src/__tests__/sync/
```

### 8.3 Playwright E2E (주요)

```bash
# PFMEA 컨텍스트 메뉴 전탭
npx playwright test tests/context-menu-regression.spec.ts

# CP Import 흐름
npx playwright test tests/cp-import-full-flow-verification.spec.ts
npx playwright test tests/cp-import-db-save-deep-verification.spec.ts

# DFMEA 통합
npx playwright test tests/dfmea-full-integration.spec.ts
npx playwright test tests/dfmea-regression.spec.ts

# 연동
npx playwright test tests/e2e/pfd-cp-sync.spec.ts
npx playwright test tests/e2e/project-linkage.spec.ts
npx playwright test tests/integration/cp-linkage.spec.ts

# 수동모드 보호 (useWorksheetDataLoader 수정 시 필수)
npx playwright test tests/e2e/manual-mode-guard.spec.ts
```

### 8.4 특정 기능 수정 시 필수 테스트

| 수정 대상 | 필수 테스트 |
|-----------|-----------|
| `useWorksheetDataLoader.ts` | `tests/e2e/manual-mode-guard.spec.ts` |
| Import 파서 | `npx vitest run src/__tests__/import/` (전체) |
| 고장연결 로직 | `npx vitest run src/__tests__/failure-link-*.test.ts` |
| ALL 탭 모달 | `npx vitest run src/__tests__/all/` |
| CP 컨텍스트 메뉴 | `npx vitest run src/__tests__/cp-context-menu-handlers.test.ts` |
| PFD 컨텍스트 메뉴 | `npx vitest run src/__tests__/pfd-context-menu-handlers.test.ts` |
| sortOrder 관련 | 해당 모듈 컨텍스트 메뉴 테스트 전체 |
| DB 저장 큐 | `npx vitest run` (전체) |
| SOD/RPN 데이터 | `npx vitest run src/__tests__/auto-fill-occurrence.test.ts` |

---

## 9. 테스트 커버리지 현황

### 9.1 모듈별 테스트 요약

| 모듈 | Unit | E2E | 합계 | 핵심 검증 영역 |
|------|------|-----|------|---------------|
| PFMEA 워크시트 | 15 | 35+ | 50+ | 구조/기능(L1~L3)/고장/ALL탭/모달 |
| PFMEA Import | 20 | 4+ | 24+ | 엑셀 파싱, v3 마이그레이션, FC 파싱 |
| Control Plan | 4 | 20+ | 24+ | 컨텍스트 메뉴, 마스터, 동기화, Import |
| PFD | 2 | 5+ | 7+ | 컨텍스트 메뉴, 동기화, 장비 |
| DFMEA | 0 | 12+ | 12+ | 등록, 구조, 연동 |
| 연동/통합 | 0 | 15+ | 15+ | 모듈간 동기화, 데이터 정합성 |
| 상태/영속성 | 8 | 15+ | 23+ | DB 저장/로드, 카운트 일관성 |
| 회귀/가드 | 3 | 10+ | 13+ | CODEFREEZE 보호, 회귀 방지 |
| 레이아웃/렌더링 | 0 | 8+ | 8+ | 스크롤, 시각 검증 |
| 특수기능 | 2 | 8+ | 10+ | 문서링크, 특수문자, 장비 |
| 디버그/진단 | 0 | 20+ | 20+ | 콘솔, DB 검증 |
| **합계** | **54** | **158** | **212** | |

### 9.2 핵심 회귀 방지 테스트 (수정 시 반드시 실행)

| 테스트 파일 | 보호 대상 | 트리거 |
|------------|----------|--------|
| `manual-mode-guard.spec.ts` | 수동모드 placeholder | useWorksheetDataLoader 수정 |
| `codefreeze-structure-guard.test.ts` | Import 후 구조 보존 | Import 파서 수정 |
| `context-menu-regression.spec.ts` | 전탭 컨텍스트 메뉴 | 핸들러 수정 |
| `failure-link-guard.test.ts` | FailureLink 불변성 | 고장연결 로직 수정 |
| `b2b3-completeness-guard.test.ts` | B2/B3 완전성 | Import B2/B3 로직 수정 |
| `failure-chain-injector-completeness.test.ts` | 고장사슬 완전성 | FM-FC 매칭 수정 |
| `isPlaceholder-length-guard.test.ts` | Placeholder 길이 | 등록/저장 로직 수정 |

### 9.3 최근 추가된 테스트 (2026-03-04 ~ 03-07)

| 테스트 | 모듈 | 검증 내용 |
|--------|------|----------|
| `cp-context-menu-handlers.test.ts` | CP | part/general 타입 핸들러 44항목 |
| `cp-context-menu-db.spec.ts` | CP | DB 라운드트립 데이터 정합성 |
| `cp-context-menu-render.spec.ts` | CP | 우클릭 메뉴 렌더링 |
| `cp-master-preview-save.test.ts` | CP | 미리보기 편집/확정/CP이동 |
| `pfd-context-menu-handlers.test.ts` | PFD | PFD 컨텍스트 메뉴 핸들러 |
| `pfd-context-menu-db.spec.ts` | PFD | DB 라운드트립 |
| `pfd-context-menu-render.spec.ts` | PFD | 렌더링 검증 |
| `context-menu-all-tabs.spec.ts` | PFMEA | 전탭 컨텍스트 메뉴 동작 |
| `strictModeStateUpdater.test.ts` | PFMEA | Strict Mode 이중 setState 업데이터 → splice 1회만 |

---

## 10. 버그 수정 이력

### 최근 수정 (2026-03-22 기준, 최신순)

| 날짜 | 커밋 | 모듈 | 수정 내용 |
|------|------|------|----------|
| 03-23 | - | PFMEA/구조 | **Strict Mode 행추가 이중 삽입**: `StructureTab` `handleInsertAbove/Below`, 병합 위·아래 추가, `handleDeleteRow`의 `setState` 업데이터를 `createStrictModeDedupedUpdater`로 래핑 (개발 모드에서 한 번 클릭 → 한 줄만 추가) |
| 03-22 | - | Import/Repair | **레거시 Import/재저장 복구**: `legacyParseResultToFlatData.ts`로 레거시 ParseResult→flat 복원, `supplementFlatDataFromChains.ts`로 chain 기반 `B4/B5/A6` 꽂아넣기 추가. `pipeline-verify/auto-fix.ts`는 public `A6/B5`를 읽어 기존 RA `DC/PC` 빈값을 채운다. 결과적으로 `pfm26-m001`은 `DC/PC null 156건 → 0건`, `pfm26-f001`은 `FC/FL/RA 0건 → 23/23/23`까지 복구 |
| 03-22 | - | Import/FK | **거짓 Green 차단**: `validate-fk`에 `failureLinkCoverage`(FM→FL 연결 누락)와 `riskAnalysisCoverage`(FL→RA 1:1) 추가. `pfm26-f001`처럼 FM만 있고 FL=0인 프로젝트가 더 이상 green 통과하지 않음. `save-from-import`는 기존 FC/FL/RA가 있는 프로젝트에 신규 Atomic FC/FL/RA=0 결과가 들어오면 409로 저장 차단 |
| 03-20 | `458f2a7` | Import | **emptyPC 근본수정**: B4 dedup key에 WE 추가 (`{pno\|m4\|fc}`→`{pno\|m4\|we\|fc}`). Cu Target+Ti Target 동일 FC명 공유 시 1건으로 합쳐져 FC 미연결 → orphan L3F 삭제 → emptyPC 재발. StepBB4Item.we 필드 추가. 골든 베이스라인 FC/FL/RA/B4: 104→103 갱신 |
| 03-20 | `4d64805` | 파이프라인 | **emptyPC 방어코드**: migration.ts orphan 삭제 후 폴백 L3F 재생성, rebuild-atomic emptyPC 보정, auto-fix emptyPC 자동수정, verify-steps 폴백 L3F orphanPC 제외 |
| 03-19 | - | 파이프라인 | **자동수정 비활성화**: fixStep3/4/5에서 placeholder FC/FL 자동생성 → 경고만 표시 (부작용: Atomic↔Legacy 불일치 악화 차단) |
| 03-19 | - | Import | **orphanPC 근본수정**: import-builder.ts B4.parentItemId를 B1→B3 ID로 변경 → buildWorksheetState B4→B3 FK 매칭 정상화 |
| 03-08 | `c5010535` | 보안/품질 | 배포 전 전체 진단: 하드코딩 비밀번호→환경변수, 시크릿키 보호, empty catch 16건→console.error, console.log 8건 제거, Operations error.tsx 추가, API error.message 노출 차단 |
| 03-07 | `e2a9bd2b` | MyJob/테스트 | Suspense boundary 빌드 해결 + FM 기대값 107→136 업데이트 |
| 03-07 | `9bff8255` | PFMEA | 배열 깨짐 방어 코드 3종 추가 (필드테스트 안전망) |
| 03-07 | `20cb6c90` | 기능L3 | 3L기능 컨텍스트 메뉴 초기 상태 funcId 빈값 수정 |
| 03-07 | `2032265e` | CP/APQP | console.log 제거 + 배열 경계 체크 + empty catch 수정 |
| 03-07 | `04f7f2bc` | 고장 | 1L영향/2L고장 행삭제 빈값 폴백 (effectId/modeId) |
| 03-07 | `bab3fc4a` | 기능 | 2L/3L기능 제품특성·공정특성 행삭제 charId 빈값 폴백 |
| 03-07 | `1eb78784` | 기능L1 | reqId 빈값 폴백 — 행삭제 미작동 수정 |
| 03-07 | `a6c8fda9` | PFD | sortOrder 불변성 수정 + 테스트 계획 (16 unit + 5 E2E + 4 PW) |
| 03-07 | `16d0cb53` | CP | 컨텍스트 메뉴 테스트 44 unit + 7 E2E + 8 Playwright |
| 03-07 | `162c121e` | CP | part/general 타입 핸들러 + sortOrder 불변성 |
| 03-07 | `e31b08f2` | 구조/기능 | 컨텍스트 메뉴 병합추가/삭제 열별 분기 |
| 03-06 | `dc9f0f6a` | CP | 기초정보 미리보기 DB 저장 연결 |
| 03-06 | `0773a5d6` | PFMEA | 컨텍스트 메뉴 열단위 작동 수정 |
| 03-06 | `6c36adf3` | PFMEA | 전탭 Playwright E2E 테스트 추가 |
| 03-05 | `c978f15d` | ALL탭 | 헤더 중복 버튼 제거 + 개선결과 +/- |
| 03-05 | `03975594` | ALL탭 | Filter Code 드롭다운 + 습득교훈 숨기기 |
| 03-05 | `23a101d9` | CFT | 사용자 추가 성명 입력란 |
| 03-05 | `8ba1d146` | 대시보드 | RPN 비활성화 + CP Import 목록 |
| 03-05 | `82fb325d` | CP | 기초정보 B1/B2 필터링 수정 |
| 03-05 | `c53050ff` | Export | 전체 내보내기 등록정보/CFT/개정현황 포함 |
| 03-05 | `278f3a48` | CP | 확정/승인 상태 DB 영속화 |
| 03-05 | `cfb36648` | PFD | 메뉴바 연동 ID 전달 |
| 03-05 | `696ef19e` | PFD | PFD→FMEA 네비게이션 정확 이동 |
| 03-05 | `f505663c` | PFD | 설비/금형/지그 실제 설비명 매핑 |
| 03-05 | `fa6e5e1d` | ALL탭 | SOD 모달 심각도 3열 통합 |
| 03-05 | `3ec9b200` | UI | Help 버튼 TopNav EN 좌측 이동 |
| 03-05 | `c59496c1` | 인증 | MyJob DFMEA 제외 + 비밀번호 해싱 수정 + UX 개선 |
| 03-05 | `24616d6a` | 등록 | CFT 역할 자동추천 + 기초정보 접힘/펼침 + API 병렬화 |
| 03-05 | `9a7af940` | DFMEA | 타입 모듈 경로 보정 + 사이드바 비활성화 |
| 03-05 | `1b930d22` | DFMEA | 등록/워크시트/타입 보완 + syncDfmeaCP 복원 |
| 03-05 | `d9eef011` | DFMEA | 모듈 전면 구현 — Import/워크시트/등록/개정/CP 연동 |
| 03-05 | `168ca813` | PFD | 기초정보 DB 영속화 — Master Dataset API 구현 |
| 03-05 | `fe2b8c92` | 연동 | CP/PFD 클릭→리스트 이동 + 갯수 선택 모든 타입 |
| 03-05 | `664f4112` | 연동 | CP/PFD 다건 생성 — baseId-01/-02 서브넘버 |
| 03-05 | `1f5df685` | CP | Import 메뉴바 개선 — 구분/기초정보/관리계획서 통일 |
| 03-05 | `594f9fa1` | CP | Family CP 제거 + 연동 CP/PFD 다건 표시 |
| 03-05 | `0b42a774` | CP | PFMEA-CP 연동 강화 + atom-map API |
| 03-05 | `0e8ffa2d` | UI | Help FAB 버튼 "Help" 텍스트 라벨 추가 |
| 03-05 | `07f9f99d` | CP | 기초정보 Import 탭별 미리보기 + verify-counts |
| 03-05 | `435f6e45` | CP | Import 워크시트 템플릿 + ControlPlanItem 동시 저장 |
| 03-05 | `149f7c7a` | PFMEA | FM/FC 누락 근본 해결 — orphan 방어 |
| 03-05 | `22d7a00b` | 개정 | 개정 저장 후 기초정보 확인 배지 |
| 03-05 | `9c3d3f9e` | Export | FMEA 전체 엑셀 내보내기 작업요소 컬럼 3개 삭제 |
| 03-05 | `cd0aa394` | 결재 | 상위 결재자 승인 시 회수 버튼 숨김 |
| 03-05 | `23acc381` | 결재 | 검토자/승인자 지정 후 재변경 가능 |
| 03-05 | `c26bc1ae` | CP | CreateDocumentModal 동적 라벨 + B4 자동 삽입 |
| 03-05 | `89709e36` | CP | 기초정보 항상 표시 + 코드리뷰 HIGH 이슈 |
| 03-05 | `f1c69778` | CP | 기초정보 자동 생성 — 마스터 동기화 |
| 03-04 | `399a042c` | PFMEA | 공통공정 FM 2건 누락 + 갭 피드백 루프 확장 |
| 03-04 | `d9021a5a` | PFMEA | FM 갭 피드백 루프 — Import↔Worksheet 양방향 동기화 |
| 03-04 | `43f2e8b5` | Import | FE 심각도 AIAG VDA 기준 반영 |
| 03-04 | `0d1beda1` | PFD | 4M 빈 행 B1/B2/B3 누락 — rowM4 폴백 MC 통일 |
| 03-04 | `01871e03` | Import | 01번 공통 공정 B3 자동 삽입 — b3Map 누락 보완 |

---

## 11. CODEFREEZE 보호 파일 목록

> 아래 파일들은 CODEFREEZE 적용되어 있으며, 수정 시 반드시 사용자 승인 필요

### v3.2.0 (Import/파싱/렌더링/고장연결)
- `src/app/(fmea-core)/pfmea/import/**`
- `src/app/(fmea-core)/pfmea/worksheet/tabs/failure/**`
- `src/app/(fmea-core)/pfmea/worksheet/tabs/shared/**`
- `src/app/(fmea-core)/pfmea/worksheet/tabs/all/**`
- `src/components/worksheet/SelectableCell.tsx`
- `src/lib/excel-data-range.ts`

### v4.0.0-gold (PFMEA 전체 모듈)
- 등록/리스트/개정 전체 (27개 핵심 파일)

### v4.1.0~v4.2.0 (행삭제/DB큐/API정합성)
- `db-storage.ts`, `useWorksheetDataLoader.ts`
- 7개 탭 확정해제 통일 파일
- 핸들러 훅 5개

### v4.3.0 Phase1+2 (등록/Import/구조분석/기능/고장/ALL/유틸)
- 등록 모듈 7개, Import Master API 2개
- 구조분석 인프라 8개
- 기능분석/고장분석/ALL탭/패널/유틸 전체 (6개 디렉토리 와일드카드)

### v4.4.0~v4.5.0 (ALL탭 모달/타입강화)
- ALL탭 모달 오류 8건 수정 파일 7개
- any 타입 제거 24개 파일

### v4.6.0~v4.7.0 (개정/CP Import)
- 개정 배지 + 결재자 재변경 4개 파일
- CP Import UI 개선 5개 파일

---

> **이 매뉴얼은 매 세션마다 업데이트됩니다. 최종 업데이트 날짜를 항상 확인하세요.**
