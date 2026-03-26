/**
 * @file manual-worksheet-advanced.ts
 * @description 워크시트 도움말 — 고장분석(4ST) + 리스크분석(5ST) + 최적화(6ST) + ALL탭
 *
 * 카테고리: 고장분석, 고장연결, 리스크분석, 최적화, 전체보기
 * 관련 화면: /pfmea/worksheet
 */

import { ManualItem } from './types';

export const WORKSHEET_ADV_ITEMS_KO: ManualItem[] = [
  // ═══════════════════════════════════════════
  // 4ST 고장분석
  // ═══════════════════════════════════════════
  {
    category: '고장분석',
    title: '고장분석(4ST) 개요',
    content: 'FMEA 4단계: 각 구조/기능에 대한 고장 정보를 입력합니다.\n\n■ 3개 탭 + 고장연결\n• 1L 영향(FE): 고장이 최종사용자에게 미치는 영향\n• 2L 형태(FM): 공정에서 발생 가능한 고장 형태\n• 3L 원인(FC): 고장을 유발하는 근본 원인\n• 고장연결: FM-FE-FC 인과관계 설정\n\n■ SOD 점수 체계\n• S(심각도): 고장 영향의 심각성 (1~10)\n• O(발생도): 고장 발생 빈도 (1~10)\n• D(검출도): 고장 검출 가능성 (1~10)\n\n■ 기준: AIAG VDA FMEA 1st Edition (2차 정오표)',
    keywords: ['고장분석', '4ST', '4단계', 'FE', 'FM', 'FC', 'SOD', '심각도', '발생도', '검출도'],
    paths: ['/pfmea/worksheet'],
  },
  {
    category: '고장분석',
    title: '1L 고장영향(FE) 탭',
    content: '완제품 레벨에서 고장이 미치는 영향을 분석합니다.\n\n■ 구조 (기능분석 L1과 연동)\n• 구분: Your Plant / Ship to Plant / User (자동)\n• 요구사항: 기능분석에서 정의된 요구사항 (자동 연결)\n• 고장영향(FE): 고장 시 발생하는 결과\n• 심각도(S): 1~10 SOD 척도\n\n■ 심각도 평가 기준 (P-FMEA)\n• 3열 구조: 자사공장 / 고객사 / 최종사용자\n• S=10: 안전 관련 영향 (경고 없음)\n• S=9: 규제사항 미준수\n• S=8: 주기능 상실/저하\n• S=1: 영향 없음\n\n■ 입력 방법\n• FE: DataSelectModal 또는 인라인 직접 입력\n• S: SODSelectModal (1~10 선택, 기준 설명 포함)',
    keywords: ['1L', 'FE', '고장영향', '심각도', 'severity', 'S', '영향'],
    paths: ['/pfmea/worksheet'],
  },
  {
    category: '고장분석',
    title: '2L 고장형태(FM) 탭',
    content: '공정 레벨에서 발생 가능한 고장 형태를 분석합니다.\n\n■ 구조 (기능분석 L2와 연동)\n• 제품특성: 기능분석에서 정의 (자동 연결)\n• 고장형태(FM): 공정에서 나타나는 고장 증상\n• 특별특성: CC/SC 배지 (자동 설정 또는 수동)\n\n■ 특별특성 자동 설정\n• A6(검출관리) 매핑 기반 자동 할당\n• 마스터 SC DB와 동기화\n\n■ 1:N 관계\n• 하나의 FM이 여러 기능에 연결 가능\n• 자동매핑: Import 데이터 기반 미리보기 후 적용\n\n■ 모달\n• DataSelectModal: FM 목록 선택 (C1 DFMEA 연계 또는 직접 입력)\n• SpecialCharSelectModal: 특별특성 할당',
    keywords: ['2L', 'FM', '고장형태', 'failure mode', '특별특성'],
    paths: ['/pfmea/worksheet'],
  },
  {
    category: '고장분석',
    title: '3L 고장원인(FC) 탭',
    content: '작업요소 레벨에서 고장의 근본 원인을 분석합니다.\n\n■ 구조 (기능분석 L3와 연동)\n• 공정특성: 기능분석에서 정의 (자동 연결)\n• 고장원인(FC): 고장을 발생시키는 원인\n\n■ 4M 필터링\n• 작업요소의 4M 분류에 맞는 원인만 필터 표시\n• MN(사람): 작업자 실수, 교육 부족 등\n• MC(설비): 기계 고장, 마모 등\n• IM(부자재): 재료 불량, 변질 등\n• EN(환경): 온도, 습도, 진동 등\n\n■ 누락건 순차 이동\n• 누락된 FC가 있는 행으로 자동 이동\n• 빨간 하이라이트로 미입력 위치 표시\n\n■ 모달\n• DataSelectModal: C2/C3/C4 FC 선택 (DFMEA 연계)',
    keywords: ['3L', 'FC', '고장원인', 'failure cause', '4M', '원인', '누락'],
    paths: ['/pfmea/worksheet'],
  },

  // ═══════════════════════════════════════════
  // 고장연결
  // ═══════════════════════════════════════════
  {
    category: '고장연결',
    title: '고장연결 탭 개요',
    content: 'FM(고장형태)을 중심으로 FE(영향)-FC(원인) 인과관계를 설정합니다.\n\n■ 핵심 구조 (FM 중심)\n• FE(고장영향): L1 failureScopes에서 추출\n• FM(고장형태): L2 failureModes에서 추출\n• FC(고장원인): L3 failureCauses에서 추출\n\n■ 3가지 모드\n1. 편집 모드: FM-FE-FC 연결 생성/수정\n2. 확정 모드: 연결 잠금, 심각도 전파\n3. 조회 모드: 다이어그램 또는 결과 테이블\n\n■ 연결 결과\n• 연결 완료: 녹색 (FM-FE-FC 모두 연결)\n• FE 누락: 적색 (고장영향 미연결)\n• FC 누락: 황색 (고장원인 미연결)',
    keywords: ['고장연결', 'failure link', 'FM', 'FE', 'FC', '인과관계', '연결'],
    paths: ['/pfmea/worksheet'],
  },
  {
    category: '고장연결',
    title: '고장연결 다이어그램',
    content: 'SVG 캔버스에서 FM-FE-FC 연결을 시각적으로 관리합니다.\n\n■ 레이아웃 (3컬럼)\n• 좌측: FE(고장영향) 노드 — 파란색\n• 중앙: FM(고장형태) 노드 — 녹색\n• 우측: FC(고장원인) 노드 — 주황색\n\n■ 조작법\n• 노드 클릭: 선택 (하이라이트)\n• 드래그: 연결선 생성 (FM ↔ FE, FM ↔ FC)\n• 선 클릭: 연결 해제/삭제\n\n■ 자동 매칭\n• 공유 스코프/카테고리 기반 추천\n• 매칭 품질 배지 표시',
    keywords: ['다이어그램', 'diagram', 'SVG', '노드', '드래그', '연결선'],
    paths: ['/pfmea/worksheet'],
  },
  {
    category: '고장연결',
    title: '고장연결 확정 & 심각도 전파',
    content: '고장연결을 확정하면 심각도가 자동 전파됩니다.\n\n■ 확정 프로세스\n1. "확정" 버튼 클릭 → 모든 연결 잠금\n2. 심각도 전파: S(FE) → 연결된 FM/FC에 상속\n3. 초기 RPN 값 생성\n4. 읽기 전용으로 전환\n\n■ 연결 데이터 구조\nLinkResult {\n  fmId, fmText, fmProcess,\n  feId, feText, severity(S),\n  fcId, fcText, fcM4\n}',
    keywords: ['확정', '심각도', '전파', 'severity', 'RPN', '잠금'],
    paths: ['/pfmea/worksheet'],
  },

  // ═══════════════════════════════════════════
  // 5ST 리스크분석
  // ═══════════════════════════════════════════
  {
    category: '리스크분석',
    title: '리스크분석(5ST) AP·RPN 개요',
    content: 'FMEA 5단계: 현재 예방/검출관리를 평가하고 리스크를 산출합니다.\n\n■ 주요 컬럼 (8개)\n• 예방관리(PC): A6 기초정보 또는 직접 입력\n• 발생도(O): 1~10 SOD 척도\n• 검출관리(DC): B5 기초정보 또는 직접 입력\n• 검출도(D): 1~10 SOD 척도\n• AP: Action Priority (H/M/L 자동 계산)\n• RPN: O × D 위험우선순위\n• 특별특성: CC/SC 배지 (L2에서 상속)\n• 습득교훈(LLD): Lessons Learned 연결\n\n■ O/D 매칭 자동화\n• "O매칭" 버튼: B5(예방관리)를 공정별 자동 매칭\n• "D매칭" 버튼: B6(검출관리)를 공정별 자동 매칭\n• O누락/D누락: 미입력 건수 표시 + 빨간 하이라이트',
    keywords: ['리스크분석', '5ST', '5단계', 'PC', 'DC', 'O', 'D', 'AP', 'RPN', '발생도', '검출도'],
    paths: ['/pfmea/worksheet'],
  },
  {
    category: '리스크분석',
    title: '심각도·발생도·검출도(SOD) 평가 기준',
    content: '■ P-FMEA 심각도(S, Severity) 기준\n• 3열 구조: 자사공장 / 고객사 / 최종사용자\n• S=10: 안전/규제 위반 (경고 없이)\n• S=9: 규제사항 미준수\n• S=8: 기능 상실 (100%)\n• S=4~2: 외관/소음/불편\n• S=1: 영향 없음\n\n■ P-FMEA 발생도(O) 기준\n• 관리유형: 없음 / 행동적 / 기술적 / 모범사례\n• 예방관리 효과에 따라 O값 결정\n• O=10: 예방관리 없음\n• O=1: 검증된 모범사례 + 실패 불가 설계\n\n■ P-FMEA 검출도(D) 기준\n• 2열 구조: 검출방법 성숙도 + 검출기회\n• D=10: 검출 방법/기회 없음\n• D=8/7: 미입증 검출방법\n• D=6/5: 입증된 검출방법\n• D=1: 공정특성 불필요\n\n■ AP (Action Priority) 계산\n• HIGH(H): S≥9 또는 O×D≥특정 임계값 → 빨강\n• MEDIUM(M): 중간 리스크 → 노랑\n• LOW(L): 낮은 리스크 → 녹색',
    keywords: ['SOD', '심각도', 'severity', '발생도', '검출도', '기준', 'AIAG', 'VDA', 'AP', 'HIGH', 'MEDIUM', 'LOW'],
    paths: ['/pfmea/worksheet'],
  },
  {
    category: '리스크분석',
    title: '습득교훈(LLD) 자동선택',
    content: '습득교훈(Lessons Learned Database) 연결 기능입니다.\n\n■ 수동 선택\n• DataSelectModal에서 LLD 항목 직접 선택\n\n■ 자동 선택\n• FM(고장형태)/FC(고장원인) 텍스트 기반 자동 매칭\n• 가중치 3 적용으로 정확도 향상\n• AutoLldResultModal에서 결과 확인\n\n■ LLD 표시\n• 선택된 LLD의 제목/번호 표시\n• 복수 LLD 연결 가능',
    keywords: ['LLD', '습득교훈', 'lessons learned', '자동선택', '매칭'],
    paths: ['/pfmea/worksheet'],
  },
  {
    category: '리스크분석',
    title: 'RPN 계산 및 파레토 차트',
    content: '■ RPN (Risk Priority Number) 계산\n• RPN = O(발생도) × D(검출도)\n• AIAG VDA 1st Edition에서는 S를 제외한 O×D 사용\n• 5단계 RPN: 현재 관리 상태의 리스크\n• 6단계 RPN: 개선 후 리스크\n\n■ RPN vs AP\n• RPN: 숫자 (O×D), 정량적 비교 가능\n• AP: H/M/L 등급, 우선순위 판단용\n• AP=HIGH인데 RPN이 낮을 수 있음 (S≥9 조건)\n\n■ RPN 파레토 차트\n• 메뉴바 "RPN 차트" 버튼으로 토글\n• 공정별 RPN 내림차순 막대 그래프\n• 누적 비율선 (80/20 법칙 기준선)\n• 5단계/6단계 별도 차트 제공\n\n■ RPN 감소율\n• (개선전 RPN - 개선후 RPN) / 개선전 RPN × 100\n• 최적화 탭에서 자동 계산',
    keywords: ['RPN', 'risk priority', '파레토', 'pareto', 'O×D', '차트', '감소율', '리스크'],
    paths: ['/pfmea/worksheet'],
  },

  // ═══════════════════════════════════════════
  // 6ST 최적화
  // ═══════════════════════════════════════════
  {
    category: '최적화',
    title: '최적화(6ST) 개요',
    content: 'FMEA 6단계: 개선계획 수립, 모니터링, 효과평가를 수행합니다.\n\n■ 3개 그룹 (14컬럼)\n\n1) 계획 (파랑 헤더)\n• 예방개선: A6 개선안 (textarea)\n• 검출개선: B6 개선안 (textarea)\n• 책임자: 담당자 성명\n• 목표완료일: 날짜 선택\n\n2) 모니터링 (녹색 헤더)\n• 상태: 진행중/완료 (드롭다운)\n• 개선결과근거: 근거 기술 (textarea)\n• 완료일자: 날짜 선택\n\n3) 효과평가 (주황 헤더)\n• 개선 후 S/O/D: SODSelectModal (1~10)\n• 특별특성: CC/SC 배지 (5단계에서 상속)\n• AP: 개선 후 Action Priority (자동 계산)\n• RPN: 개선 후 O×D (자동 계산)\n• 비고: 추가 메모',
    keywords: ['최적화', '6ST', '6단계', '개선', 'AP', '계획', '모니터링', '효과평가', '책임자'],
    paths: ['/pfmea/worksheet'],
  },
  {
    category: '최적화',
    title: 'AP 개선안 추천 & 일괄 적용',
    content: '■ AP 개선안 추천 기능\n• RecommendImprovementModal: AP=HIGH인 항목에 대해 개선안 자동 추천\n• 예방관리 강화, 검출방법 개선 등 구체적 제안\n\n■ 일괄 적용\n• 동일 공정의 유사 항목에 동일 개선안 일괄 적용\n• N/A 항목은 해당 없음으로 자동 표시\n\n■ 효과 비교\n• 개선 전/후 S-O-D 비교\n• AP 변화 시각화 (H→M, M→L 등)\n• RPN 감소율 자동 계산',
    keywords: ['AP', '개선안', '추천', '일괄', '적용', '비교', 'N/A', 'HIGH', 'action priority'],
    paths: ['/pfmea/worksheet'],
  },

  // ═══════════════════════════════════════════
  // ALL 전체보기
  // ═══════════════════════════════════════════
  {
    category: '전체보기',
    title: 'ALL 탭 (전체보기) 개요',
    content: '2단계~6단계 전체 FMEA 데이터를 35~37컬럼으로 통합 표시합니다.\n\n■ 컬럼 구성 (35컬럼 기본)\n• 구조분석(4): 완제품공정 | 공정NO+명 | 4M | 작업요소\n• 기능분석(7): 구분 | 완제품기능 | 요구사항 | 공정기능 | 제품특성 | 작업기능 | 공정특성\n• 고장분석(4): 고장영향(FE) | 심각도(S) | 고장형태(FM) | 고장원인(FC)\n• 리스크분석(7): 예방관리(PC) | 발생도(O) | 검출관리(DC) | 검출도(D) | AP | 특별특성 | LLD\n• 최적화(13): 예방개선 | 검출개선 | 책임자 | 목표일 | 상태 | 개선결과 | 완료일 | 효과S | 효과O | 효과D | 특별특성 | AP | RPN\n\n■ 옵션 모드 (37컬럼)\n• RPN(5단계): 리스크분석 영역에 추가\n• RPN(6단계): 최적화 영역에 추가',
    keywords: ['ALL', '전체보기', '35컬럼', '37컬럼', '통합'],
    paths: ['/pfmea/worksheet'],
  },
  {
    category: '전체보기',
    title: 'ALL 탭 3색 헤더 시스템',
    content: '3행 헤더로 단계별 시각 구분을 제공합니다.\n\n■ 1행: 단계 헤더 (배경색)\n• 2단계 구조분석: 파란색\n• 3단계 기능분석: 녹색\n• 4단계 고장분석: 주황색\n• 5단계 리스크분석: 파란색 (진한)\n• 6단계 최적화: 녹색 (진한)\n\n■ 2행: 하위그룹 (15개)\n완제품공정 | 메인공정 | 작업요소 | 완제품기능/요구 | 공정기능 | 작업기능/특성\n고장영향(FE) | 고장형태(FM) | 고장원인(FC) | 예방관리 | 검출관리 | 리스크평가\n계획 | 모니터링 | 효과평가\n\n■ 3행: 상세 컬럼명 (파란 하단 테두리)\n\n■ 셀 병합\n• L1(완제품): 전체 행 세로 병합\n• L2(공정): 전체 행 세로 병합\n• FM 그룹: 세로 병합',
    keywords: ['3색', '헤더', '단계', '배경색', '세로병합', 'rowSpan'],
    paths: ['/pfmea/worksheet'],
  },
  {
    category: '전체보기',
    title: 'ALL 탭 검증 도구',
    content: 'ALL 탭에서 제공하는 데이터 검증 기능입니다.\n\n■ 고장분석 검증 배지 (4ST 헤더)\n• FE 연결/상태: 파란 배지 (연결 건수)\n• FM 연결/상태: 녹색 배지 (연결 건수)\n• FC 연결/상태: 주황 배지 (연결 건수)\n• △(불일치): 연결과 상태 불일치 표시\n\n■ AP 통계 배지 (5ST 헤더)\n• H:N (HIGH 건수) — 빨강\n• M:N (MEDIUM 건수) — 노랑\n• L:N (LOW 건수) — 녹색\n\n■ O/D 매칭 버튼\n• O매칭: B5(예방관리) 자동 매칭\n• D매칭: B6(검출관리) 자동 매칭\n• O누락/D누락: 미입력 건수 + 빨간 하이라이트 토글\n\n■ S 검증 버튼\n• S누락: 심각도 미입력 셀 빨간 하이라이트\n• S추천: 연결된 FE 기반 심각도 자동 추천',
    keywords: ['검증', 'validation', 'AP', '통계', 'O매칭', 'D매칭', 'S누락', '하이라이트'],
    paths: ['/pfmea/worksheet'],
  },
  {
    category: '전체보기',
    title: 'ALL 탭 인라인 편집',
    content: 'ALL 탭에서의 데이터 편집 방법입니다.\n\n■ 편집 가능 셀\n• S/O/D 셀: 클릭 → SODSelectModal\n• AP 셀: 클릭 → AP 테이블 (우측 패널)\n• PC/DC 셀: 클릭 → DataSelectModal\n• FE/FM/FC 셀: textarea 인라인 편집\n• 날짜 셀: DatePickerModal\n• 특별특성: 인라인 배지 + 모달 편집\n• 개선안: textarea 인라인 편집\n\n■ 읽기 전용 셀\n• 구조분석 컬럼 (L1/L2/L3/4M): 읽기 전용\n• AP/RPN 계산 결과: 자동 계산\n\n■ 성능\n• React.memo로 SelectableCell, AllViewRow 최적화\n• useMemo로 병합/색상/누락 계산 캐싱',
    keywords: ['인라인', '편집', 'SOD', '모달', 'textarea', 'memo'],
    paths: ['/pfmea/worksheet'],
  },
  // ═══════════════════════════════════════════
  // SOD 재평가 (O-Rec / D-Rec)
  // ═══════════════════════════════════════════
  {
    category: '리스크분석',
    title: 'O-Rec / D-Rec 발생도·검출도 재평가',
    content: '5ST 리스크분석 헤더의 O-Rec / D-Rec 버튼으로 발생도(O)와 검출도(D)를 재평가합니다.\n\n■ O-Rec (발생도 재평가)\n버튼을 누르면 현재 예방관리(PC) 텍스트를 분석하여 O값을 재산정합니다.\n\n• 1순위: 산업DB 매칭 (public.kr_industry_prevention 25건)\n  → PC 텍스트 ↔ 산업DB method 부분일치/약어매칭\n  → 매칭 성공 시 defaultRating(O=2~5) 적용\n• 2순위: 키워드 추론 (pcOccurrenceMap)\n  → 인터록/UPS → O=2 | SPC/자동검사 → O=3\n  → PM/MSA/IQC → O=4 | 교육/표준 → O=5\n• 미매칭: "DB 미매칭 N건 — 수동 입력 필요" 표시\n\n■ D-Rec (검출도 재평가)\n현재 검출관리(DC) 텍스트를 분석하여 D값을 재산정합니다.\n\n• 1순위: 산업DB 매칭 (public.kr_industry_detection 25건)\n  → DC 텍스트 ↔ 산업DB method 매칭\n  → Particle Counter → D=3 | Open/Short Test → D=2 등\n• 2순위: 키워드 추론 (detectionRatingMap)\n  → 인터록/자동차단 → D=2 | 비전검사/SPC → D=3\n  → CMM/전용검사기 → D=4 | 육안검사 → D=7 등\n\n■ 핵심 규칙\n• O=1, D=1 추천 절대 금지 (엔지니어만 판단)\n• 기존 DB 저장값도 강제 덮어쓰기 (재평가)\n• 산업DB 우선 → 키워드 보충 → 한 번에 저장',
    keywords: ['O-Rec', 'D-Rec', '재평가', '발생도', '검출도', '산업DB', '키워드', 'SOD'],
    paths: ['/pfmea/worksheet'],
  },
  {
    category: '리스크분석',
    title: 'SOD 기준표 (AIAG-VDA)',
    content: '■ SOD 기준표 API\n• GET /api/pfmea/sod-criteria\n• public 스키마의 S/O/D 평가기준 10건씩 조회\n\n■ 발생도(O) 기준표\n• O=2: 극히 낮음 — 실증된 예방관리\n• O=3: 매우 낮음 — SPC 관리\n• O=4: 낮음 — SPC 관리\n• O=5: 다소 낮음 — 관리계획 효과적 운용\n• O=6: 보통 — 관리계획 수립/준수\n• O=7~10: 관리 미흡~미수립\n\n■ 검출도(D) 기준표\n• D=2: 매우 높음 — 전수검사 + 자동 Reject\n• D=3: 높음 — 자동 전수검사 + 자동정지\n• D=4: 다소 높음 — 자동 검사 (연속)\n• D=5: 보통 — 자동 검사 (간헐적)\n• D=6: 다소 낮음 — SPC + 수동 검사\n• D=7~10: 수동/육안/미수립\n\n■ 산업DB (kr_industry)\n• 예방관리 25건: 장비PM, 인터록, SPC, 입고검사 등\n• 검출관리 25건: 4-Point Probe, AVI, Open/Short Test 등\n• 각 항목에 defaultRating(O/D값) 포함',
    keywords: ['SOD', '기준표', '산업DB', 'kr_industry', '예방관리', '검출관리', 'API'],
    paths: ['/pfmea/worksheet'],
  },

  // ═══════════════════════════════════════════
  // LLD 추천 모달 개선
  // ═══════════════════════════════════════════
  {
    category: '최적화',
    title: 'LLD 추천 모달 (6ST)',
    content: '6단계 최적화에서 LLD(습득교훈) 기반 개선안을 추천합니다.\n\n■ LLD추천 버튼\n• 6ST 최적화 헤더의 "LLD추천" 클릭\n• FailureLink별 LLD DB 매칭 → 예방/검출 개선안 추천\n\n■ 모달 구성 (16컬럼)\n• FMEA 정보: 공정번호, 공정명, FM, FC\n• 현행 SOD: S, O, D\n• 매칭 정보: 대상(PC/DC), 등급(정확/공정/수평/Miss), 구분(CIP/RMA/ABN/ECN)\n• LLD No: 매칭된 LLD 번호\n• LLD 개선: 예방관리 개선, 검출관리 개선\n\n■ 매칭 등급\n• 정확: FC/FM 텍스트 정확 매칭 (녹색)\n• 공정: 동일 공정 내 매칭 (파랑)\n• 수평: 타 공정 수평전개 매칭 (보라)\n• Miss: 미매칭 (회색)\n\n■ 구분 배지\n• CIP: 지속개선 (파랑)\n• RMA: 반품분석 (빨강)\n• ABN: 이상발생 (주황)\n• ECN: 설계변경 (보라)\n\n■ 필터 탭\n• 등급별: 정확/공정/수평/Miss\n• 대상별: PC(예방) / DC(검출)\n• AP별: H/M/L\n\n■ 적용\n• 실제 LLD 매칭 항목만 표시 (산업DB 자동추천 제외)\n• 체크 후 "적용" → 개선안이 6ST 최적화 컬럼에 반영',
    keywords: ['LLD', '추천', '모달', '6ST', '최적화', 'CIP', 'RMA', 'ABN', '수평전개', '매칭'],
    paths: ['/pfmea/worksheet'],
  },
  {
    category: '최적화',
    title: '개선추천 (산업DB 기반)',
    content: '6ST 최적화 헤더의 "개선추천" 버튼으로 산업DB 기반 개선안을 생성합니다.\n\n■ SRP 프로세스 (SOD Reduction Path)\n1. H/M 항목만 수집 (L 제외 — 이미 목표 달성)\n2. LLD 매칭 항목 제외 (이미 LLD추천으로 배정된 항목)\n3. 남은 H/M 항목에 산업DB 기반 개선안 배정\n4. AP 최소경로(SRP) 기반 O/D 목표 산출\n5. 개선추천 모달에서 미리보기 + 선택 적용\n\n■ SRP 최소경로\n각 H/M 항목에 대해 AP=L 도달 최소경로 자동 계산:\n• O개선: O만 낮추면 L 도달 → D측은 N/A\n• D개선: D만 낮추면 L 도달 → O측은 N/A\n• O&D개선: O와 D 모두 필요 → 양측 모두 추천\n\n■ 적용 방식\n• 선택 적용: 체크된 항목만 반영\n• 책임자: CFT 리더 자동 배정\n• N/A 강제: 경로상 불필요한 측면은 자동 N/A',
    keywords: ['개선추천', '산업DB', 'AP경로', 'SRP', '최소경로', 'N/A', 'CFT'],
    paths: ['/pfmea/worksheet'],
  },

  // ═══════════════════════════════════════════
  // SRP (SOD Reduction Path)
  // ═══════════════════════════════════════════
  {
    category: '최적화',
    title: 'SRP (SOD Reduction Path) 프로세스',
    content: 'SRP는 H/M 등급 항목을 L로 내리기 위한 최소 개선경로를 자동 산출하는 시스템입니다.\n\n■ SRP 경로 유형 (6ST 헤더 배지)\n• O:N — O만 개선하면 L 도달 (주황 배지)\n• D:N — D만 개선하면 L 도달 (파랑 배지)\n• O&D:N — 양쪽 모두 개선 필요 (보라 배지)\n\n■ 최소경로 알고리즘\n• S(심각도)는 고정 — 공정 고유 특성\n• O(발생도)와 D(검출도)만 개선 가능 (최소 2)\n• Cost = |ΔO| + |ΔD| — 총 변화량 최소인 경로 선택\n• AIAG-VDA AP 테이블 기준 L 도달 가능 여부 판정\n\n■ 6ST 최적화 프로세스 순서\n1단계: LLD추천 → LLD 매칭 항목 우선 배정\n2단계: 개선추천 → 나머지 H/M 항목만 배정 (LLD 매칭·L 제외)\n\n■ N/A 처리 규칙\n• O개선 경로: O측 = 추천, D측 = N/A\n• D개선 경로: D측 = 추천, O측 = N/A\n• O&D 경로: 양측 모두 추천\n\n■ 예시\nS=9, O=8, D=6 → AP=H\n• O경로: O=8→2 (cost=6)\n• D경로: D=6→2 (cost=4) ← 최소경로 선택\n• 결과: D측에 개선추천, O측은 N/A',
    keywords: ['SRP', 'SOD', 'Reduction', 'Path', '최소경로', 'O개선', 'D개선', 'O&D', '배지'],
    paths: ['/pfmea/worksheet'],
  },

  // ═══════════════════════════════════════════
  // 배지 UI 최적화
  // ═══════════════════════════════════════════
  {
    category: '전체보기',
    title: 'ALL 탭 헤더 배지 시스템',
    content: '4ST/5ST/6ST 헤더에 상시 표시되는 배지로 현황을 파악합니다.\n\n■ 5ST 리스크분석 헤더\n• H:N / M:N / L:N — AP 등급별 건수 (항상 표시)\n• O-Miss:N — 발생도 누락 건수 (누락 시만 표시)\n• O-Rec — 발생도 재평가 버튼 (항상 표시)\n• D-Miss:N — 검출도 누락 건수 (누락 시만 표시)\n• D-Rec — 검출도 재평가 버튼 (항상 표시)\n\n■ 4ST 고장분석 헤더\n• FE:N / FM:N / FC:N — 연결 건수\n• S-Miss:N — 심각도 누락 (누락 시만 표시)\n• S-Rec — 심각도 재평가 버튼 (항상 표시)\n\n■ 6ST 최적화 헤더\n• LLD추천 — LLD 매칭 항목 우선 배정\n• 개선추천 — 나머지 H/M 산업DB 기반 배정\n• O:N / D:N / O&D:N — SRP 경로별 건수 (H+M 대상)\n\n■ 설계 원칙\n• Rec 버튼은 항상 표시 (예측 가능한 UI)\n• Miss 배지는 건수 > 0일 때만 표시\n• SRP 배지는 H+M > 0일 때만 표시\n• 버튼 텍스트 최소화: O-Rec, D-Rec, S-Rec',
    keywords: ['배지', 'badge', 'O-Rec', 'D-Rec', 'S-Rec', 'SRP', 'Miss', '헤더'],
    paths: ['/pfmea/worksheet'],
  },
];

export const WORKSHEET_ADV_ITEMS_EN: ManualItem[] = [];
