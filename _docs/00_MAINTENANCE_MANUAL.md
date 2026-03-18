# FMEA OnPremise 유지보수 매뉴얼

> **최종 업데이트**: 2026-03-18 19:30
> **총 테스트**: 255파일 (172 E2E + 81 Unit + 2 기타) / 122 Unit PASS | **빌드**: 200페이지 성공 | **tsc**: 에러 0개

---

## 업데이트 이력

| 날짜 | 시간 | 작업 내용 | 담당 |
|------|------|-----------|------|
| 2026-03-07 | 05:37 | 초판 작성 — 전체 모듈 체크리스트 + 트러블슈팅 876건 분석 | Claude |
| 2026-03-07 | 05:45 | 테스트 커버리지 현황 섹션 추가 (212개 테스트 모듈별 분류) | Claude |
| 2026-03-07 | 06:30 | CRITICAL 4건 + HIGH 2건 수정, 테스트 1235개 전체 통과 확인 | Claude |
| 2026-03-07 | 07:10 | 03-04~03-07 전체 커밋 81건 분석 → 체크리스트/트러블슈팅/이력 대폭 보강 | Claude |
| 2026-03-18 | 19:30 | 03-07~03-18 전체 커밋 219건 분석 → 6대 신규 기능/파이프라인 6단계/모듈 정리 반영 | Claude |

---

## 목차

1. [PFMEA 워크시트 탭별 동작 체크리스트](#1-pfmea-워크시트-탭별-동작-체크리스트)
2. [CP (관리계획서) 동작 체크리스트](#2-cp-관리계획서-동작-체크리스트)
3. [PFD (공정흐름도) 동작 체크리스트](#3-pfd-공정흐름도-동작-체크리스트)
4. [등록/개정/결재 동작 체크리스트](#4-등록개정결재-동작-체크리스트)
5. [모듈간 연동 체크리스트](#5-모듈간-연동-체크리스트)
6. [파이프라인 검증 6단계](#6-파이프라인-검증-6단계)
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
| OP-05 | D값 자동매칭 재평가 | DC 변경 시 | DC 변경 시 항상 재계산 (0465a51) | |
| OP-06 | Step 6 OPT autofix | AP=H/M 자동 | Optimization 자동생성 + AP recalc (d9610fa) | |
| OP-07 | DC/PC 피어 자동채움 | 동일FM 피어값 | 최빈값 기반 빈 DC/PC 채움 (c1ebf7b) | |
| OP-08 | O/D 누락 자동채움 | 피어 중앙값 | 모두 NULL 시 default=1 (6cbd49a) | |
| OP-09 | SOD riskData 동기화 | Atomic↔riskData | 양방향 sync (8c6c8fc) | |

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
| IM-17 | UUID 결정론적 매칭 | uid()→genXxx() | 텍스트 역매칭 제거 (47d77c9) | |
| IM-18 | FC 100% 매칭 | 104건 전수 | 마스터 FMEA FC 100% 일치 (85f3fb2) | |
| IM-19 | C3→C2 parentItemId | rowSpan 기반 | UUID FK 매핑 (3799d42) | |
| IM-20 | L1Requirement 테이블 분리 | C3 데이터 | 별도 테이블 + 스키마 (aa994e4) | |
| IM-21 | ImportMapping DB 영구저장 | 매핑 결과 | 영구 파이프라인 (c553a2c) | |
| IM-22 | ImportValidation 16규칙 | 정합성 검증 | SSoT/PK/FK/orphan 16규칙 (5470d8b) | |
| IM-23 | 마스터 FMEA Export | JSON+Excel | data/master-fmea/ 저장 (5470d8b) | |
| IM-24 | 카테시안 복제 방지 | A4 공유생성 | ProcessProductChar 1회 생성 (fb143df) | |
| IM-25 | A6/B5 riskData 중복검사 | exact match | substring→exact line match (9d71cf5) | |
| IM-26 | processNo 정규화 | 01 vs 1 통일 | B1 작업요소 16건 누락 해소 (b50761e) | |
| IM-27 | 수동/자동 모드 분리 | 탭 복원 | 모드별 검증 범위 분리 (85fb736) | |

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

> **DFMEA 모듈**: 2026-03-08 전면 삭제 (커밋 `a2f9a4d`, `32264a0`). PFMEA/CP/PFD 전용 앱으로 전환.

## 4. 등록/개정/결재 동작 체크리스트

### 4.1 등록 (Register)

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
| RG-13 | Triplet M/F/P 연동 | TripletGroup 생성 | Master→Family→Part 연동 (f596d0e) | |
| RG-14 | CP/PFD Lazy Creation | 등록 시 자동생성 | Family CP/PFD Lazy API (344b299) | |
| RG-15 | LBS 특별특성 | CC/SC→★/◇ | SpecialCharBadge 전면 전환 (8824f29) | |
| RG-16 | 서버사이드 페이지네이션 | 등록 리스트 | 대량 데이터 성능 개선 (f30bc12) | |
| RG-17 | 휴지통 기능 | soft-delete 복원 | 삭제/복원 정상 (f30bc12) | |

### 4.2 개정 (Revision)

| # | 테스트 항목 | 동작 | 확인 방법 | 상태 |
|---|-----------|------|----------|------|
| RV-01 | 개정번호 시작 | 최초 등록 | 0.00 시작 (f521e73b) | |
| RV-02 | 개정이력 삭제 보호 | 디폴트/승인완료 | 삭제 불가 (9daeeb5c) | |
| RV-03 | soft-delete 재등록 | 삭제된 프로젝트 | deletedAt 복구 (8c37a6d0) | |
| RV-04 | 개정 저장 후 배지 | 기초정보 확인 | 수정(Import)/사용(워크시트) 선택 (22d7a00b) | |
| RV-05 | CFT Leader 연동 | 자동 | 부서/직급 자동 채움 (636d06db) | |

### 4.3 결재 (Approval)

| # | 테스트 항목 | 동작 | 확인 방법 | 상태 |
|---|-----------|------|----------|------|
| AP-01 | 검토자/승인자 재변경 | 지정 후 변경 | 재변경 가능 (23acc381) | |
| AP-02 | 상위 결재자 승인 | 회수 버튼 | 숨김 처리 (cd0aa394) | |
| AP-03 | 에러 메시지 | 개정 오류 | 사용자 친화적 메시지 (f055cc3d) | |
| AP-04 | CFT 성명 입력 | 사용자 추가 | 성명 입력란 표시 (23a101d9) | |

---

## 5. 모듈간 연동 체크리스트

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
| LN-09 | Triplet 수평배포 | CP/PFD 동시생성 | 3앱 공유 생성 로직 (344b299) | |
| LN-10 | 특별특성 동기화 | SC매핑 sync API | special-char sync (290d80d) | |

---

## 6. 파이프라인 검증 6단계

> **API**: `/api/fmea/pipeline-verify` (GET=조회, POST=자동수정 루프)
> **골든 베이스라인**: pfm26-m066 (12inch Au Bump)

### 6.1 6단계 검증 항목

| 단계 | 이름 | 검증 대상 | 자동수정 | 관련 커밋 |
|------|------|----------|---------|----------|
| STEP 0 | SAMPLE | 원본 엑셀 데이터 카운트 | ❌ | 15051c5 |
| STEP 1 | IMPORT | Legacy 데이터 존재, L2 공정 수 | ❌ (사용자 개입) | 926be6e |
| STEP 2 | 파싱 | A1~A6, B1~B5, C1~C4 카운트 | ✅ fixStep2Parsing | 9ae0e2e |
| STEP 3 | UUID | Atomic DB L2/L3/FM/FE/FC, orphan L3Func | ✅ fixStep3Uuid | bc43038 |
| STEP 4 | FK | FailureLink FK 정합성, unlinked FC | ✅ fixStep4Fk | d66d6e2 |
| STEP 5 | WS | Legacy 워크시트 PC 빈칸, orphan PC | ✅ fixStep5Ws | 926be6e |
| STEP 6 | OPT | AP=H/M Optimization, DC/PC peer fill, SOD sync | ✅ fixStep6Opt | d9610fa |

### 6.2 골든 베이스라인 (pfm26-m066)

| 항목 | 기대값 | PASS 기준 |
|------|--------|-----------|
| L2 (공정) | 21 | = 21 |
| L3 (작업요소) | 91 | = 91 |
| FM (고장형태) | 26 | = 26 |
| FE (고장영향) | 20 | = 20 |
| FC (고장원인) | 104 | = 104 |
| FailureLink | 104 | = 104 |
| RiskAnalysis | 104 | = 104 |
| DC (검출관리) | 104 | NULL 0건 |
| PC (예방관리) | 104 | NULL 0건 |

### 6.3 Step 6 OPT 자동수정 상세

| # | 자동수정 항목 | 방법 | 검증 |
|---|-------------|------|------|
| OPT-01 | AP=H/M Optimization 자동생성 | 미존재 시 신규 생성 + AP recalc | 72건 불일치 해소 (d9610fa) |
| OPT-02 | DC/PC 피어 자동채움 | 동일FM 그룹 최빈값 | 빈 DC/PC 0건 (c1ebf7b) |
| OPT-03 | O/D 누락 자동채움 | 피어 중앙값, 모두 NULL→default=1 | O/D NULL 0건 (6cbd49a) |
| OPT-04 | SOD riskData 동기화 | Atomic DB↔riskData 양방향 | SOD 불일치 0건 (8c6c8fc) |
| OPT-05 | AP 재계산 | S×O×D→RPN→AP | 전체 104건 재계산 (d9610fa) |

### 6.4 자동수정 루프 흐름

```
POST /api/fmea/pipeline-verify { fmeaId: "pfm26-m066" }
│
├── Loop 1: 6단계 검증 실행
│   ├── 모든 단계 ok → allGreen=true → 종료
│   └── STEP 2~6 에러/경고 → 자동수정 실행
│       ├── fixStep2Parsing → Atomic DB L1Function → Legacy 동기화
│       ├── fixStep3Uuid → orphan L3Function에 FC 자동생성
│       ├── fixStep4Fk → 깨진 FailureLink 삭제 + unlinked FC 연결
│       ├── fixStep5Ws → 빈 PC 이름 복원 + orphan PC에 FC 보충
│       └── fixStep6Opt → DC/PC peer fill + O/D default + AP recalc
│
├── Loop 2: 재검증 (수정 반영 확인)
├── Loop 3: 최종 검증 (최대 3회)
└── allGreen=true → 완료
```

### 6.5 마스터 FMEA 생성 표준

| 항목 | 내용 |
|------|------|
| API | `POST /api/fmea/export-master { fmeaId }` |
| JSON 출력 | `data/master-fmea/{fmeaId}.json` |
| Excel 출력 | `PFMEA_Master_{subject}.xlsx` |
| FC 검증 | 26 FM × 104 FC = 104 chains |
| DC/PC 포함 | 104/104 (NULL 0건) |

---

## 7. 트러블슈팅 가이드

### 7.0 신규 — 파이프라인/Import/마스터 (2026-03-07~18)

| # | 증상 | 원인 | 해결 | 관련 커밋 |
|---|------|------|------|----------|
| T-32 | Master FMEA FC 2배 (200건) | A3마다 A4 복제 → 카테시안 곱 | ProcessProductChar 공정 단위 1회 생성 | `fb143df` |
| T-33 | FC 미연결 50건 | procHasChains 조건 필터 | 조건 제거 + rebuild-atomic FK 검증 | `5a60a49` |
| T-34 | FC 103건 누락 | syncFailureCausesFromState 누락 + fcIdx 이중증가 | sync 추가 + fcIdx 단일 증가 | `a2d3e68` |
| T-35 | FC processCharId NULL 1574건 | GET 응답에 l3FuncId 폴백 없음 | l3FuncId 폴백 추가 + DB 일괄 수정 | `6802de0` |
| T-36 | O/D 값 100% NULL | 피어 데이터 없음 | 피어 중앙값 + default=1 | `6cbd49a` |
| T-37 | Step 2 C1/C2/C3=0 재발 | l1.types 이중 읽기 | 단일 패스 읽기 + 캐싱 | `bf0b2f5` |
| T-38 | Step 6 autofix 루프 bypass | fix 전 allOk 체크 | fix→allOk 순서 변경 | `183e8c8` |
| T-39 | C3 parentItemId 누락 4건 | C2 역순/중복drop/빈요구사항 | 3가지 수정 + L1Requirement 분리 | `089c466`, `aa994e4` |
| T-40 | Hydration mismatch (register) | Date.now() 동적 값 | input name에서 동적 접미사 제거 | `27d747a` |
| T-41 | HelpChatbot hydration 불일치 | typeof window 가드 | 가드 삭제 (SSR 호환) | `288fa5d` |
| T-42 | D값 자동매칭 미재평가 | DC 변경 시 재계산 안 함 | 항상 재평가 로직 추가 | `0465a51` |
| T-43 | B1 작업요소 16건 누락 | processNo 01 vs 1 불일치 | processNo NFKC 정규화 | `b50761e` |
| T-44 | A6/B5 riskData 중복 | substring 매칭 오판 | exact line match 전환 | `9d71cf5` |
| T-45 | FailureLink 저장 손실 | MERGE 방식 충돌 | DELETE-THEN-INSERT 전환 | `cdf0858` |
| T-46 | 고장연결 미저장 (reload 시) | Atomic Path legacyData 미동기 | legacyData sync 추가 | `91c88c1` |
| T-47 | distribute 균등배분 오류 | 잔존 distribute 패턴 | 전면 제거 → parentItemId FK 꽂아넣기 | `6edc6f2` |
| T-48 | C4 고장영향 0건 | enrichStateFromChains FE 위치 | FE 위치 수정 + supplement C4 폴백 | `89c8af3` |
| T-49 | Dashboard 데이터 로드 실패 | API 응답 에러 무시 | SRP 분리 + 에러 핸들링 개선 | `c67c798` |

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

### 7.4 (삭제됨 — DFMEA 모듈 제거, 커밋 `a2f9a4d`)

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
| T-50 | tsc 에러 15건 | PipelineVerifyPanel 포탈 렌더링 등 | 전면 수정 | `e4623ee` |
| T-51 | Playwright integration 폴더 오로드 | vitest 파일 오인식 | testIgnore 추가 | `bc376d1` |
| T-52 | 결재 localStorage 버그 | 상태 영속화 실패 | DB 기반 전환 | `2b04b0a` |
| T-53 | 연쇄삭제 경고 반복 | failureAnalyses 캐시 linkId 미감지 | 변경 감지 추가 | `9c4d54f` |

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

# 4단계: 파이프라인 검증 (FMEA 수정 시 필수)
# PowerShell
Invoke-RestMethod -Uri "http://localhost:3000/api/fmea/pipeline-verify?fmeaId=pfm26-m066" -Method GET | ConvertTo-Json -Depth 5

# 5단계: 파이프라인 자동수정 + 재검증
Invoke-RestMethod -Uri "http://localhost:3000/api/fmea/pipeline-verify" -Method POST -Body '{"fmeaId":"pfm26-m066"}' -ContentType "application/json" | ConvertTo-Json -Depth 3

# 6단계: rebuild-atomic (RiskAnalysis DC/PC 최신화)
Invoke-RestMethod -Uri "http://localhost:3000/api/fmea/rebuild-atomic?fmeaId=pfm26-m066" -Method POST | ConvertTo-Json -Depth 3

# 7단계: 마스터 FMEA 재생성 + DC/PC 104/104 확인
Invoke-RestMethod -Uri "http://localhost:3000/api/fmea/export-master" -Method POST -Body '{"fmeaId":"pfm26-m066"}' -ContentType "application/json" | ConvertTo-Json -Depth 5
```

### 8.2 모듈별 단위 테스트

```bash
# PFMEA Import 관련
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

### 8.2a 파이프라인 검증 테스트 (신규)

```bash
# 파이프라인 6단계 E2E (3x pass 검증)
npx playwright test tests/e2e/pipeline-verify.spec.ts

# 마스터 FMEA FC 100% 검증
npx playwright test tests/e2e/master-fmea.spec.ts

# Import→워크시트 전체 흐름 (5회 회귀)
npx playwright test tests/e2e/import-flow.spec.ts

# LBS 특별특성 렌더링 + 동기화
npx playwright test tests/e2e/special-char.spec.ts

# Triplet M/F/P 배포 (19/19 PASS)
npx playwright test tests/e2e/triplet-deployment.spec.ts
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
| pipeline-verify | `npx playwright test tests/e2e/pipeline-verify.spec.ts` |
| 마스터 FMEA 생성 | `npx playwright test tests/e2e/master-fmea.spec.ts` |
| Import 파이프라인 | `npx playwright test tests/e2e/import-flow.spec.ts` |
| 특별특성 (SC/CC) | `npx playwright test tests/e2e/special-char.spec.ts` |
| Triplet/연동 | `npx playwright test tests/e2e/triplet-deployment.spec.ts` |
| Step 6 OPT | pipeline-verify POST → Step 6 allGreen 확인 |

---

## 9. 테스트 커버리지 현황

### 9.1 모듈별 테스트 요약

| 모듈 | Unit | E2E | 합계 | 핵심 검증 영역 |
|------|------|-----|------|---------------|
| PFMEA 워크시트 | 15 | 35+ | 50+ | 구조/기능(L1~L3)/고장/ALL탭/모달 |
| PFMEA Import | 20 | 15+ | 35+ | 엑셀 파싱, UUID 결정론적 매칭, FC 100% |
| 파이프라인 검증 | 5 | 25+ | 30+ | 6단계 파이프라인, 자동수정, 마스터 FMEA |
| Control Plan | 4 | 20+ | 24+ | 컨텍스트 메뉴, 마스터, 동기화, Import |
| PFD | 2 | 5+ | 7+ | 컨텍스트 메뉴, 동기화, 장비 |
| Triplet/연동 | 0 | 20+ | 20+ | M/F/P 배포, 모듈간 동기화 |
| 상태/영속성 | 8 | 15+ | 23+ | DB 저장/로드, 카운트 일관성 |
| 특별특성 LBS | 2 | 6+ | 8+ | ★/◇ 렌더링, 마스터 추천 |
| 회귀/가드 | 3 | 10+ | 13+ | CODEFREEZE 보호, 회귀 방지 |
| 레이아웃/렌더링 | 0 | 8+ | 8+ | 스크롤, 시각 검증 |
| 결재/인증 | 2 | 10+ | 12+ | 결재 흐름, 비밀번호, 역할 |
| 디버그/진단 | 0 | 20+ | 20+ | 콘솔, DB 검증 |
| **합계** | **81** | **172** | **255** | |

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
| `pipeline-verify.spec.ts` | 6단계 파이프라인 | pipeline-verify API 수정 |
| `master-fmea.spec.ts` | 마스터 FMEA FC 104건 | export-master API 수정 |
| `import-flow.spec.ts` | Import→WS 전체 흐름 | Import 파이프라인 수정 |
| `triplet-deployment.spec.ts` | M/F/P Triplet 연동 | TripletGroup/연동 수정 |

### 9.3 최근 추가된 테스트 (2026-03-04 ~ 03-18)

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
| `pipeline-verify.spec.ts` | 파이프라인 | 6단계 검증 + 자동수정 루프 (3x pass) |
| `master-fmea.spec.ts` | 마스터 | JSON export + FC 100% 검증 |
| `import-flow.spec.ts` | Import | Import→워크시트 전체 흐름 (5회 회귀) |
| `special-char.spec.ts` | 특별특성 | LBS ★/◇ 렌더링 + sync |
| `triplet-deployment.spec.ts` | Triplet | CP/PFD M/F/P 생성 (19/19 PASS) |
| `accuracy-validation.spec.ts` | Import | 정확도 검증 6규칙 + 가이드라인 v2.0 |

---

## 10. 버그 수정 이력

### 최근 수정 (2026-03-18 기준, 최신순)

| 날짜 | 커밋 | 모듈 | 수정 내용 |
|------|------|------|----------|
| 03-18 | `fb48ef4` | 매뉴얼 | MAINTENANCE_MANUAL.md FORGE 검증 + SSR 호환성 개선 |
| 03-17 | `fb143df` | 마스터 | Master FMEA 엑셀 카테시안 버그 수정 + FC/FA/A6/B5 복원 |
| 03-16 | `d9610fa` | Step 6 | OPT autofix — AP=H/M Optimization 자동생성 + AP recalc |
| 03-16 | `bf0b2f5` | 파이프라인 | Step 2 C1/C2/C3=0 재발 근본 수정 — l1.types 이중 읽기 |
| 03-16 | `c1ebf7b` | Step 6 | DC/PC peer fill — 동일FM 피어 최빈값 자동채움 |
| 03-16 | `6cbd49a` | Step 6 | O/D missing — peer median + default 1 |
| 03-15 | `9ae0e2e` | 파이프라인 | STEP 2 교차검증 카운트 기준 통일 |
| 03-15 | `8c6c8fc` | Step 6 | SOD riskData sync + AP recalc |
| 03-14 | `68cde18` | 마스터 | Master FMEA v2 — C4 심각도 분리 + FC 104건 전수 |
| 03-14 | `85f3fb2` | Import | 마스터 FMEA Import 완전 파이프라인 + FC 100% |
| 03-13 | `ff9938a` | 파이프라인 | pipeline-verify CRITICAL 4건 수정 + CODEFREEZE |
| 03-12 | `290d80d` | Import | Import 페이지 간소화 + PipelineStep0Detail + special-char sync |
| 03-12 | `0465a51` | 최적화 | D값 자동매칭 — DC 변경 시 항상 재평가 |
| 03-11 | `926be6e` | 파이프라인 | 5-stage pipeline verify — 통합 파이프라인 |
| 03-11 | `c553a2c` | Import | ImportMapping DB 영구저장 파이프라인 |
| 03-11 | `47d77c9` | Import | UUID 100% 결정론적 매칭 — 텍스트 역매칭 제거 |
| 03-10 | `cdf0858` | 고장연결 | FC 저장/동기화 — DELETE-THEN-INSERT + 3단계 매칭 |
| 03-10 | `5a60a49` | 고장연결 | FC 미연결 50건 — procHasChains 조건 제거 |
| 03-10 | `a2d3e68` | 고장연결 | FC 103건 누락 — sync 추가 + fcIdx 이중증가 수정 |
| 03-10 | `6802de0` | 고장연결 | FC processCharId NULL → l3FuncId 폴백 |
| 03-09 | `aa994e4` | Import | L1Requirement 별도 테이블 분리 |
| 03-09 | `089c466` | Import | L1 누락 4건 — C2 역순/중복drop/빈요구사항 수정 |
| 03-09 | `27d747a` | 등록 | Hydration 불일치 — Date.now() 제거 |
| 03-08 | `dc48e26` | Import | UUID 결정론적 리팩토링 — uid()→genXxx() |
| 03-08 | `344b299` | Triplet | CP/PFD Triplet horizontal deploy |
| 03-08 | `f596d0e` | Triplet | M/F/P Triplet 연동 시스템 구현 |
| 03-08 | `8824f29` | 특별특성 | LBS CC/SC→★/◇ 전면 전환 |
| 03-08 | `a2f9a4d` | 정리 | DFMEA/PM/WS/APQP 4개 모듈 삭제 |
| 03-08 | `b50761e` | Import | processNo 정규화 B1 16건 누락 해소 |
| 03-08 | `89c8af3` | Import | C4 고장영향 0건 — enrichStateFromChains FE 위치 수정 |
| 03-08 | `2b04b0a` | 결재 | approval/revision 전면 수리 — localStorage 버그 |
| 03-07 | `f661dab` | UI | 워크시트 PFD 버튼 삭제 + 5AP/6AP 닫기 버튼 |

### 이전 수정 (2026-03-04~07 기준)

| 날짜 | 커밋 | 모듈 | 수정 내용 |
|------|------|------|----------|
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
