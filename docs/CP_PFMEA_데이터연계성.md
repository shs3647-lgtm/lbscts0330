목적 및 범위 ① 목적: P-FMEA 2~6단계 결과를 Control Plan과 실시간으로 연계하여 공정 관리 기준의 자동 생성·유지 ② 범위: P-FMEA Excel 워크시트(38컬럼) ↔ Control Plan Excel 워크시트 연계 ③ 대상: 제조공정 PFMEA (AIAG-VDA 기반)

연계 기본 원칙 (SSOT) ① 공정 정의의 단일 기준은 PFMEA ② Control Plan은 관리 실행 문서로서 PFMEA 종속 ③ PFMEA 승인 전: CP 편집 가능 ④ PFMEA 승인 후: CP 구조 잠금

PFMEA → CP 연계 대상 컬럼 정의

3.1 구조·공정 식별자 (자동 연계, Read-only) ① 완제품 공정명 ② 메인 공정명 (NO+공정명) ③ 작업요소 (4M + 작업요소) ④ 공정 기능 ⑤ 작업요소 기능

⚠️ 4M 필터링 규칙 (CP 연동 대상):
- MC (Machine): CP 연동 ✅
- IM (Inspection/Measurement): CP 연동 ✅
- EN (Environment): CP 연동 ✅
- MN (Man): CP 연동 ❌ (제외)

→ CP 매핑: 공정번호 / 공정명 / 공정설명 / 공정레벨

3.2 특성 연계 컬럼 (핵심 연계) ① 제품특성 (PFMEA 컬럼: 제품특성) ② 공정특성 (PFMEA 컬럼: 공정특성) ③ 특별특성 (PFMEA 컬럼: 특별특성)

→ CP 매핑: 관리항목_제품 / 관리항목_공정 / 특별특성 (Read-only)

3.3 고장 기반 위험 연계 정보 (참조용) ① 고장영향(FE) ② 심각도(S) ③ 고장형태(FM) ④ 고장원인(FC)

→ CP 활용: 관리대상 선정 근거 Tooltip / Drill-down

PFMEA 단계별 CP 생성 로직

4.1 Step 3 (기능분석) ① 기능 단위 공정 정의 확정 ② CP 기본 행 자동 생성

4.2 Step 4 (고장분석) ① FM, FC 존재 시 관리 필요 Flag 부여 ② CP 관리항목 자동 후보 등록

4.3 Step 5 (리스크분석) ① AP=High 또는 특별특성 존재 시 CP 생성 필수 ② RPN은 CP 표시 전용

4.4 Step 6 (최적화) ① 예방/검출관리 개선 내용 CP에 반영 알림 ② CP 개정 필요 상태 표시

변경 트리거 및 동기화 규칙 ① PFMEA 공정 추가 → CP 행 자동 추가 ② PFMEA 작업요소 변경 → CP 공정설명 갱신 ③ 특별특성 변경 → CP 관리항목 Highlight ④ PFMEA Rev 증가 → CP 신규 Rev 생성

Control Plan 전용 입력 항목 ① 평가/측정방법 ② 샘플링 크기 ③ 샘플링 주기 ④ 관리방법 ⑤ 책임자 ⑥ 대응계획

※ 상기 항목은 PFMEA로 역전파하지 않음

잠금 및 승인 로직 ① PFMEA Approved → 구조 잠금 ② CP Approved → 관리방법 수정 불가 ③ PFMEA Rev 발생 → 기존 CP Obsolete

추적성 및 심사 대응 ① PFMEA 행 ID ↔ CP 행 ID 1:1 매핑 ② PFMEA Rev / CP Rev 교차 표시 ③ 고장원인–관리방법 Trace View 제공

비기능 요구사항 ① Excel Import 시 PFMEA Key 무결성 검증 ② 대용량(500+행) 성능 보장 ③ 변경 로그 자동 기록

※ 다음 작업 권고 ① PFMEA 컬럼 ID 기반 정식 매핑 테이블 작성 ② Control Plan 그리드 컬럼 스키마(JSON) 정의 ③ 변경 시나리오별 UI 상태 다이어그램 작성




[문서 4] Cursor 개발용 PRD – PFMEA 실시간 연동 Control Plan

요청 시각: 2026-01-12 18:05

개발 목표 ① PFMEA Excel 구조(38컬럼)를 단일 기준(SSOT)으로 Control Plan 자동 생성 ② PFMEA 변경사항을 Control Plan에 실시간 반영 ③ 심사 추적성(PFMEA ↔ CP)을 데이터 레벨에서 100% 확보

전체 아키텍처 개요 ① Frontend: Excel-like Grid UI (Handsontable 14.6.2 기준) ② Backend: PFMEA–CP 매핑 로직 서비스 ③ DB: PFMEA, CP 분리 테이블 + 매핑 테이블 ④ 동기화 방식: PFMEA Save / Rev Trigger 기반 Event 처리

핵심 데이터 식별자(Key Design)

3.1 PFMEA Row Key (불변) ① pfmea_project_id ② pfmea_rev ③ process_no ④ work_element_id

→ PFMEA_ROW_UID = project_id + rev + process_no + work_element_id

3.2 CP Row Key ① cp_project_id ② cp_rev ③ PFMEA_ROW_UID (FK)

→ PFMEA–CP 행 1:1 매핑 보장

PFMEA → CP 컬럼 매핑 규칙 (개발 기준)

[구조 정보 – 자동 동기화, Read-only] ① 완제품 공정명 → cp.process_group ② 메인 공정명 → cp.process_name ③ 작업요소 → cp.process_step_desc ④ 공정 기능 → cp.process_function

[특성 정보 – 핵심 연계] ① 제품특성 → cp.product_characteristic ② 공정특성 → cp.process_characteristic ③ 특별특성 → cp.special_characteristic (BM/CC/SC)

[리스크 정보 – 참조용] ① 심각도(S) → cp.ref_severity ② 발생도(O) → cp.ref_occurrence ③ 검출도(D) → cp.ref_detection ④ AP → cp.ref_ap ⑤ RPN → cp.ref_rpn

※ 리스크 정보는 CP 계산에 사용하지 않으며 표시/추적 용도

Control Plan 전용 컬럼 (Editable) ① evaluation_method ② sampling_size ③ sampling_frequency ④ control_method ⑤ owner_primary ⑥ owner_secondary ⑦ reaction_plan

동기화 트리거 로직

6.1 PFMEA 저장 (Draft) ① 신규 PFMEA 행 → CP Draft 행 생성 ② PFMEA 구조 수정 → CP 구조 자동 반영

6.2 PFMEA 승인 (Approved) ① CP 구조 잠금 (컬럼 Lock) ② 관리방법 영역만 편집 허용

6.3 PFMEA 개정 (Rev +1) ① 기존 CP → Obsolete 처리 ② 신규 CP Draft 자동 생성

상태 머신(State Machine)

PFMEA: Draft → Approved → Revised CP: Draft → Approved → Obsolete

※ PFMEA 상태가 CP 상위 상태

UI 개발 요구사항 (Cursor 지시용) ① 그리드 헤더 2단 고정 ② PFMEA 연계 컬럼 강조 색상 처리 ③ 변경 발생 시 행 Highlight + 아이콘 표시 ④ Read-only 컬럼 강제 제어

성능 및 안정성 ① 500행 이상 로딩 시 Lazy Render ② Bulk Sync 시 트랜잭션 처리 ③ PFMEA–CP Key 불일치 시 Import 차단

테스트 시나리오 (필수) ① PFMEA 행 추가/삭제 → CP 반영 확인 ② 특별특성 변경 → CP Highlight 확인 ③ PFMEA Rev → CP Rev 자동 생성 확인 ④ 감사 Trace View 조회 확인
