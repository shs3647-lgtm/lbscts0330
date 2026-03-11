요청 시각: 2026-01-12 18:00

[문서 1] Control Plan (CP) 화면정의서 (상세)

※ 본 화면정의서는 PFMEA 실시간 연동 Control Plan 개발을 위한 기준 문서이며, Excel 기반 UI(Handsontable) 구현을 전제로 함.

1. 화면 개요
   ① 화면명: Control Plan 관리 화면
   ② 목적: PFMEA와 실시간 연동되는 공정 관리 기준(Control Plan) 작성 및 관리
   ③ 대상 사용자: 생산기술, 품질, 생산 담당자
   ④ 연계 화면: PFMEA 워크시트 화면, 공정흐름도(PFD)

2. 화면 구성 영역

2.1 상단 메타정보 영역
① 프로젝트명 (PFMEA Project 명 연동)
② 제품/품번
③ 공정 범위 (PFMEA 공정번호 From~To)
④ CP 버전
⑤ 승인 상태 (Draft / Approved / Obsolete)

2.2 메인 테이블 영역 (Excel Grid UI)
① 편집 방식: Excel 유사 그리드
② 행 단위: 공정번호 기준
③ 열 구성: 아래 3개 그룹으로 구분

[공정현황]
① 공정번호 (PFMEA 공정번호 자동연계, Read-only)
② 공정명 (PFMEA 연동)
③ 공정레벨 (Main / Sub)
④ 공정설명
⑤ 설비 / 금형 / Jig / Tools
⑥ 검출장치

* NO (유무)
* EP
* 자동검사

[관리항목]
① 관리항목(제품특성)
② 관리항목(공정특성)
③ 특별특성 (BM, SC, CC 등 – PFMEA 기준 연계)
④ 스펙/공차

[관리방법]
① 평가/측정방법
② 샘플링 크기
③ 샘플링 주기
④ 관리방법
⑤ 책임1
⑥ 책임2
⑦ 대응계획

2.3 상태/연계 표시 컬럼
① PFMEA 연계 상태 (정상 / 미연계 / 변경발생)
② 변경 알림 아이콘

3. 화면 세부 구성 및 컬럼 정의

3.1 상단 헤더 영역 (Header Section)
① 프로젝트명: PFMEA 프로젝트명 자동 연계, Read-only
② 고객사 / 제품명 / 품번: PFMEA 기본정보 연계, Read-only
③ 공정 범위: From ~ To 선택, 기본값 전체 공정
④ 문서번호: CP 문서번호 자동 생성
⑤ Rev.: 숫자형, PFMEA Rev 연동 증가
⑥ 승인상태: Draft / Approved / Obsolete
⑦ 버튼: 임시저장, 승인요청, 승인, 개정, Excel Export

3.2 메인 그리드 영역 (Control Plan Worksheet)

[공정현황 영역 – PFMEA 연계 기준]
① 공정번호: PFMEA 공정번호 자동 매핑, Read-only
② 공정명: PFMEA 연계, Read-only
③ 공정레벨: Main / Sub, PFMEA 연계
④ 공정설명: PFMEA 연계
⑤ 설비·금형·Jig·Tools: 수동 입력
⑥ 검출장치_NO: Boolean(0/1)
⑦ 검출장치_EP: Boolean(0/1)
⑧ 검출장치_자동검사: Boolean(0/1)

[관리항목 영역 – 특성 기반]
① 관리항목_제품: PFMEA 제품특성 연계 또는 수동 입력
② 관리항목_공정: PFMEA 공정특성 연계 또는 수동 입력
③ 특별특성: PFMEA Special Characteristic 자동 반영 (BM, SC, CC 등), Read-only
④ 스펙/공차: 수동 입력

[관리방법 영역 – CP 고유 관리 데이터]
① 평가/측정방법: 드롭다운 + 직접입력 병행
② 샘플링 크기: 숫자 또는 100%, ALL 선택
③ 샘플링 주기: EVERY LOT / SHIFT / DAY 등 드롭다운
④ 관리방법: 텍스트 입력
⑤ 책임1: 부서 또는 직무 선택
⑥ 책임2: 선택 사항
⑦ 대응계획: 이상 발생 시 조치 방법 입력

3.3 상태/제어 컬럼
① PFMEA 연계상태: 정상 / 변경감지 / 미연계
② 변경 아이콘: PFMEA 변경 발생 시 자동 표시

4. 입력 및 제어 규칙
   ① PFMEA 연계 컬럼은 직접 수정 불가
   ② PFMEA 승인 후 CP는 자동 잠금
   ③ CP 승인 후 관리방법만 조회 가능
   ④ PFMEA 개정 발생 시 CP 신규 Draft 자동 생성
   ⑤ 행 추가/삭제는 PFMEA 공정 기준에 의해 자동 제어

① PFMEA에서 연계된 셀은 기본 Read-only
② CP 단독 입력 항목만 편집 허용
③ 특별특성은 PFMEA 값 자동 반영, 수동 수정 불가
④ 공정 추가/삭제는 PFMEA 승인 상태에 따라 제어

5. 저장·승인·개정 로직
   ① 임시저장: Draft 상태 유지
   ② 승인요청: 검토자 지정
   ③ 승인: Approved 상태 전환 및 수정 잠금
   ④ 개정: 기존 CP 복제 후 Rev +1 생성
   ⑤ Obsolete: 이전 Rev 자동 처리

6. Excel Import / Export 요구사항
   ① Export 시 승인된 CP만 출력
   ② PFMEA 연계 컬럼 보호 설정
   ③ 감사 대응용 서식 출력 지원

7. 권한 및 감사 추적
   ① 작성자 / 수정자 / 승인자 로그 자동 기록
   ② PFMEA Rev–CP Rev 추적성 확보
   ③ 변경 이력 테이블 자동 생성

---

※ 다음 단계: PFMEA 실제 엑셀 컬럼 제공 시 컬럼 ID 기준 매핑 테이블 상세화 가능
① 임시저장
② 승인요청
③ 승인
④ 개정 (PFMEA 개정 연동 시 자동 생성)

[문서 2] PFMEA–Control Plan 데이터 연계 PRD

1. 연계 목적
   ① PFMEA 위험 분석 결과를 Control Plan에 실시간 반영
   ② 중복 입력 제거
   ③ 변경관리 일관성 확보

2. 연계 기준 개체 (SSOT 정의)

2.1 PFMEA → CP 단방향 기준 데이터
① 공정번호
② 공정명
③ 공정설명
④ 제품/공정 기능
⑤ 고장원인
⑥ 특별특성 구분

2.2 CP 전용 관리 데이터
① 평가/측정방법
② 샘플링 크기/주기
③ 관리방법
④ 책임자
⑤ 대응계획

3. 데이터 매핑 정의

3.1 공정 기준 매핑
① PFMEA.process_no = CP.process_no
② PFMEA.process_name = CP.process_name

3.2 특성 매핑
① PFMEA Special Characteristic → CP 특별특성
② PFMEA 고장모드 기준 자동 생성 가능 옵션

3.3 변경 트리거 정의
① PFMEA 공정 추가 → CP 행 자동 생성
② PFMEA 공정 삭제 → CP 행 비활성 처리
③ PFMEA 특별특성 변경 → CP 변경 알림 Flag

4. 실시간 동기화 정책
   ① PFMEA 저장 시 CP 연계 자동 반영
   ② PFMEA 승인 시 CP 수정 잠금
   ③ PFMEA 개정 시 CP 신규 버전 생성

5. 버전 및 승인 로직
   ① PFMEA Rev 증가 → CP Rev 자동 증가
   ② 이전 CP는 Obsolete 처리
   ③ 승인 이력 상호 참조

6. 감사 대응 관점 요구사항
   ① PFMEA–CP 간 추적성 (공정번호 + 특성 키)
   ② 변경이력 자동 기록
   ③ 승인자/승인일 연계 표시

7. 비기능 요구사항
   ① Excel Import/Export 지원
   ② Handsontable 기준 그리드 구현
   ③ 대용량 공정(200+ 행) 성능 보장

---

다음 단계 제안
① PFMEA 엑셀 화면(실제 컬럼 구조) 제공
② 컬럼 단위 매핑 테이블 상세화
③ DB 스키마 (PFMEA–CP 매핑 테이블) 정의
