# 공정흐름도 (PFD) PRD

**요청 시각**: 2026-01-21  
**버전**: 1.0.0

[문서] Process Flow Diagram (PFD) 화면정의서 (상세)

※ 본 화면정의서는 PFMEA 및 CP 실시간 연동 Process Flow Diagram 개발을 위한 기준 문서이며, Excel 기반 UI(Handsontable) 구현을 전제로 함.

## 1. 화면 개요
   ① 화면명: 공정흐름도 관리 화면
   ② 목적: PFMEA와 CP와 실시간 연동되는 공정 흐름도(Process Flow Diagram) 작성 및 관리
   ③ 대상 사용자: 생산기술, 품질, 생산 담당자
   ④ 연계 화면: PFMEA 워크시트 화면, Control Plan (CP)

## 2. 화면 구성 영역

### 2.1 상단 메타정보 영역
① 프로젝트명 (PFMEA Project 명 연동)
② 제품/품번
③ 공정 범위 (PFMEA 공정번호 From~To)
④ PFD 버전
⑤ 승인 상태 (Draft / Approved / Obsolete)

### 2.2 메인 테이블 영역 (Excel Grid UI)
① 편집 방식: Excel 유사 그리드
② 행 단위: 공정번호 기준
③ 열 구성: 아래 그룹으로 구분

[공정정보]
① 공정번호 (PFMEA 공정번호 자동연계, Read-only)
② 공정명 (PFMEA 연동)
③ 공정레벨 (Main / Sub)
④ 공정설명
⑤ 작업요소 (PFMEA 연동)
⑥ 설비 / 금형 / Jig / Tools

[특성정보]
① 제품특성 (PFMEA 연동)
② 공정특성 (PFMEA 연동)
③ 특별특성 (BM, SC, CC 등 – PFMEA 기준 연계)

[흐름정보]
① 이전 공정 (연결 공정번호)
② 다음 공정 (연결 공정번호)
③ 공정시간 (분 단위)

### 2.3 상태/연계 표시 컬럼
① PFMEA 연계 상태 (정상 / 미연계 / 변경발생)
② CP 연계 상태 (정상 / 미연계 / 변경발생)
③ 변경 알림 아이콘

## 3. 화면 세부 구성 및 컬럼 정의

### 3.1 상단 헤더 영역 (Header Section)
① 프로젝트명: PFMEA 프로젝트명 자동 연계, Read-only
② 고객사 / 제품명 / 품번: PFMEA 기본정보 연계, Read-only
③ 공정 범위: From ~ To 선택, 기본값 전체 공정
④ 문서번호: PFD 문서번호 자동 생성
⑤ Rev.: 숫자형, PFMEA Rev 연동 증가
⑥ 승인상태: Draft / Approved / Obsolete
⑦ 버튼: 임시저장, 승인요청, 승인, 개정, Excel Export, 다이어그램 보기, PFMEA 연동

### 3.2 메인 그리드 영역 (Process Flow Diagram Worksheet)

[공정정보 영역 – PFMEA 연계 기준]
① 공정번호: PFMEA 공정번호 자동 매핑, Read-only
② 공정명: PFMEA 연계, Read-only
③ 공정레벨: Main / Sub, PFMEA 연계 (상하관계 정의용)
④ 공정설명: PFMEA 연계
⑤ 작업요소: PFMEA 연계
⑥ 설비·금형·Jig·Tools: PFMEA 연계

[특성정보 영역 – PFMEA 연계 기준]
① 제품특성: PFMEA 제품특성 연계, Read-only
② 공정특성: PFMEA 공정특성 연계, Read-only
③ 특별특성: PFMEA Special Characteristic 자동 반영 (BM, SC, CC 등), Read-only

[흐름정보 영역 – PFD 고유 데이터]
① 이전 공정: 드롭다운 (PFMEA 공정 목록), 다중 선택 가능
② 다음 공정: 드롭다운 (PFMEA 공정 목록), 다중 선택 가능
③ 공정시간: 숫자 입력 (분 단위)

### 3.3 상태/제어 컬럼
① PFMEA 연계상태: 정상 / 변경감지 / 미연계
② CP 연계상태: 정상 / 변경감지 / 미연계
③ 변경 아이콘: PFMEA 또는 CP 변경 발생 시 자동 표시

## 8. PFMEA 연계 작성 기능

### 8.1 기능 개요
① PFD에서 PFMEA 연동 버튼 클릭 시 PFMEA ALL 화면 자동 생성
② PFD의 공정정보 및 특성정보를 PFMEA 작성 기초정보로 로딩
③ 공정 상하관계(계층 구조)를 PFMEA L1/L2/L3 구조로 변환하여 셀 합치기로 반영

### 8.2 PFMEA 연동 버튼 동작
① 버튼 위치: 상단 헤더 영역
② 버튼명: PFMEA 연동
③ 동작: PFD 데이터를 기반으로 PFMEA ALL 화면 생성 및 이동
④ 조건: PFD 승인 상태일 때만 활성화

### 8.3 기초정보 로딩 규칙
① 공정정보: PFD의 공정번호, 공정명, 공정설명, 작업요소 자동 반영
② 특성정보: 제품특성, 공정특성, 특별특성 자동 반영
③ 설비정보: 설비/금형/Jig/Tools 자동 반영

### 8.4 상하관계 셀 합치기 반영
① 공정레벨 기준: Main/Sub 레벨을 L1/L2/L3 구조로 매핑
② 셀 병합: parentId, mergeGroupId, rowSpan, colSpan를 사용하여 계층적 표시
③ 표시 방식: 상위 공정은 여러 행에 걸쳐 병합, 하위 공정은 개별 행
④ 예시: Main 공정(행 병합) 아래 Sub 공정들 표시

### 8.5 PFMEA ALL 화면 생성 시 고려사항
① 빈 필드 자동 생성: 고장형태, 고장영향, 고장원인, S/O/D/AP 등 PFMEA 전용 필드
② 버전 관리: PFD Rev를 PFMEA 초기 Rev로 설정
③ 연결 정보: PFD ID를 PFMEA 메타데이터에 저장하여 추적성 확보

### 8.6 사용자 경험
① 자동 이동: 버튼 클릭 시 PFMEA ALL 화면으로 즉시 이동
② 데이터 검증: PFD 데이터 완전성 확인 후 생성
③ 충돌 처리: 기존 PFMEA가 있을 경우 덮어쓰기 여부 사용자 선택

## 4. 입력 및 제어 규칙
   ① PFMEA 연계 컬럼은 직접 수정 불가
   ② PFMEA 승인 후 PFD는 자동 잠금
   ③ PFD 승인 후 흐름정보만 조회 가능
   ④ PFMEA 개정 발생 시 PFD 신규 Draft 자동 생성
   ⑤ 행 추가/삭제는 PFMEA 공정 기준에 의해 자동 제어

① PFMEA에서 연계된 셀은 기본 Read-only
② PFD 단독 입력 항목만 편집 허용
③ 공정 추가/삭제는 PFMEA 승인 상태에 따라 제어

## 5. 저장·승인·개정 로직
   ① 임시저장: Draft 상태 유지
   ② 승인요청: 검토자 지정
   ③ 승인: Approved 상태 전환 및 수정 잠금
   ④ 개정: 기존 PFD 복제 후 Rev +1 생성
   ⑤ Obsolete: 이전 Rev 자동 처리

## 6. Excel Import / Export 요구사항
   ① Export 시 승인된 PFD만 출력
   ② PFMEA 연계 컬럼 보호 설정
   ③ 감사 대응용 서식 출력 지원

## 7. 권한 및 감사 추적
   ① 작성자 / 수정자 / 승인자 로그 자동 기록
   ② PFMEA Rev–PFD Rev 추적성 확보
   ③ 변경 이력 테이블 자동 생성

---

[문서 2] PFMEA–PFD–CP 데이터 연계 PRD

## 1. 연계 목적
   ① PFMEA 위험 분석 결과를 PFD에 실시간 반영
   ② CP 관리 기준을 PFD 흐름에 연계
   ③ 중복 입력 제거 및 변경관리 일관성 확보

## 2. 연계 기준 개체 (SSOT 정의)

### 2.1 PFMEA → PFD 단방향 기준 데이터
① 공정번호
② 공정명
③ 공정설명
④ 공정레벨
⑤ 작업요소
⑥ 설비/금형/지그
⑦ 제품특성
⑧ 공정특성
⑨ 특별특성

### 2.2 PFD 전용 흐름 데이터
① 이전 공정 연결
② 다음 공정 연결
③ 공정시간

### 2.3 CP → PFD 연계 데이터
① 공정 관리 정보
② 특별특성

## 3. 데이터 매핑 정의

### 3.1 공정 기준 매핑
① PFMEA.process_no = PFD.process_no
② PFMEA.process_name = PFD.process_name

### 3.2 특성 매핑
① PFMEA.product_characteristics = PFD.product_char
② PFMEA.process_characteristics = PFD.process_char
③ PFMEA.special_characteristics = PFD.special_char

### 3.3 흐름 매핑
① PFD.previous_process = PFMEA.process_no (참조)
② PFD.next_process = PFMEA.process_no (참조)

### 3.4 변경 트리거 정의
① PFMEA 공정 추가 → PFD 행 자동 생성
② PFMEA 공정 삭제 → PFD 행 비활성 처리
③ PFMEA 변경 → PFD 변경 알림 Flag

## 4. 실시간 동기화 정책
   ① PFMEA 저장 시 PFD 연계 자동 반영
   ② PFMEA 승인 시 PFD 수정 잠금
   ③ PFMEA 개정 시 PFD 신규 버전 생성
   ④ CP 변경 시 PFD 연계 업데이트

## 5. 버전 및 승인 로직
   ① PFMEA Rev 증가 → PFD Rev 자동 증가
   ② CP Rev 증가 → PFD 연계 업데이트
   ③ 이전 PFD는 Obsolete 처리
   ④ 승인 이력 상호 참조

## 6. 감사 대응 관점 요구사항
   ① PFMEA–PFD–CP 간 추적성 (공정번호 + 특성 키)
   ② 변경이력 자동 기록
   ③ 승인자/승인일 연계 표시

## 7. 비기능 요구사항
   ① Excel Import/Export 지원
   ② Handsontable 기준 그리드 구현
   ③ 대용량 공정(200+ 행) 성능 보장
   ④ 다이어그램 시각화 지원 (선택사항)