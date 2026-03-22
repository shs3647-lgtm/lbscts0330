/**
 * 골든 테스트 STEP B 엑셀 생성기
 * ============================================
 * 목적: 전처리 클로드의 변환 규칙 검증용 "정답" 엑셀
 *
 * 시나리오 설계:
 *   공정10: 단순 패턴 (1 FE : 1 FM : 3 FC)
 *   공정20: 3열 FE 패턴 (Y/C/U : 1 FM : 4 FC) + 다중 FM
 *   공정30: 비대칭 (1 FE : 2 FM : 각 2~3 FC) + 4M 혼합
 *   공정40: 대규모 (2 FE : 3 FM : FM당 4 FC) + Pool 공유
 *   공정50: 경계 테스트 (IM/EN + 특별특성 C)
 *
 * Forward Fill 규칙:
 *   - 완제품공정명(C3), 공정기능(C8,C9): 공정 단위
 *   - scope(C7,C13), FE(C14), FM(C16): FF 대상
 *   - S(C15): FE와 함께 FF
 *   - FC(C19): 항상 값 있음 (행 식별자)
 */

const XLSX = require('xlsx');

// ═══════════════════════════════════════════
// Scope 상수 (scope-constants.ts 와 동일 값)
// ═══════════════════════════════════════════
const SCOPE_LABEL_YOUR_PLANT = 'Your Plant';
const SCOPE_LABEL_SHIP_TO_PLANT = 'Ship to Plant';
const SCOPE_LABEL_USER = 'User';

// ═══════════════════════════════════════════
// 데이터 정의
// ═══════════════════════════════════════════

const PRODUCT_NAME = 'GOLDEN TEST ASSY';
const PRODUCT_FUNC = 'Y1_ 부품을 조립하여 GOLDEN TEST를 제조한다';

// 시나리오별 데이터
const scenarios = [
  // ══════ 공정10: 단순 패턴 ══════
  // 1 FE : 1 FM : 3 FC (MN 작업자)
  {
    process: { no: '10번-조립', m4struct: 'MN', we: '10번-조립작업자' },
    function: {
      processFunc: '10번-부품을 규격에 맞게 조립한다.',
      m4func: 'MN', weFunc: '10번-조립작업자',
      weDetail: '10번-MN01 조립 기준에 따라 부품을 조립한다'
    },
    chains: [
      {
        scope: SCOPE_LABEL_YOUR_PLANT,
        fe: 'Y1-6선별재작업_ 조립불량으로 라인내 선별 재작업', s: '6',
        fm: '10번F01_조립 위치 불량',
        fcs: [
          { m4: 'MN', we: '10번-조립작업자', fc: '10번-작업자 조립 기준 미숙지',
            pc: 'MN-조립작업자 조립기준 교육', o: '3', dc: '육안검사', d: '4', ap: 'L', spec: 'L' },
          { m4: 'MN', we: '10번-조립작업자', fc: '10번-작업자 집중력 저하(피로)',
            pc: 'MN-교대근무 및 휴식시간 관리', o: '2', dc: '육안검사', d: '4', ap: 'L', spec: 'L' },
          { m4: 'MN', we: '10번-조립작업자', fc: '10번-작업자 작업표준서 미준수',
            pc: 'MN-작업표준서 게시 및 준수 점검', o: '3', dc: '치수검사', d: '3', ap: 'L', spec: 'L' },
        ]
      }
    ]
  },

  // ══════ 공정20: 3열 FE 패턴 + 다중 FM ══════
  // FM1: 3 FE(Y/C/U) : 4 FC
  // FM2: 2 FE(Y/C) : 3 FC
  {
    process: { no: '20번-수입검사', m4struct: 'MN', we: '20번-검사원' },
    function: {
      processFunc: '20번-입고된 자재를 검사기준서에 따라 검사하고 합부판정 한다.',
      m4func: 'MN', weFunc: '20번-검사원',
      weDetail: '20번-MN01 검사기준서에 따라 부품을 검사하고 합부판정한다'
    },
    chains: [
      // FM1: 3열 FE (Y/C/U)
      {
        scope: SCOPE_LABEL_YOUR_PLANT,
        fe: 'Y2-6선별재작업_ 외관불량 자재투입으로 선별 재작업', s: '6',
        fm: '20번-PGU ASSY-휘도 부적합',
        fcs: [
          { m4: 'MN', we: '20번-검사원', fc: '20번-외관 합격 자재를 불합격 오판정',
            pc: 'MN-검사원 교육 및 MSA 실시', o: '1', dc: '육안검사', d: '1', ap: 'L', spec: 'L' },
          { m4: 'MC', we: '20번-휘도검사기', fc: '20번_MC_01휘도검사기 설정값 오류',
            pc: 'MC-휘도검사기 정기교정', o: '2', dc: '자동판정', d: '2', ap: 'L', spec: 'L' },
        ]
      },
      {
        scope: SCOPE_LABEL_SHIP_TO_PLANT,
        fe: 'C3-4치수기능 부적합으로 대책서 요구', s: '4',
        fm: null,  // FM은 위와 동일 (FF 대상)
        fcs: [
          { m4: 'MC', we: '20번-휘도검사기', fc: '20번_MC_02휘도검사기 센서 오염',
            pc: 'MC-센서 청소 점검표', o: '2', dc: '자동판정', d: '2', ap: 'L', spec: 'L' },
        ]
      },
      {
        scope: SCOPE_LABEL_USER,
        fe: 'U5-2기능저하_ 사용중 휘도 저하 발생', s: '5',
        fm: null,  // FM은 위와 동일 (FF 대상)
        fcs: [
          { m4: 'MN', we: '20번-검사원', fc: '20번-검사대상 품목 검사 누락',
            pc: 'MN-검사 체크리스트 활용', o: '3', dc: '육안검사', d: '3', ap: 'L', spec: 'L' },
        ]
      },
      // FM2: 2열 FE (Y/C)
      {
        scope: SCOPE_LABEL_YOUR_PLANT,
        fe: 'Y5-4:100% 라인내 재작업(점등 불량)', s: '5',
        fm: '20번-PGU ASSY-점등 부적합',
        fcs: [
          { m4: 'MN', we: '20번-검사원', fc: '20번-불합격 자재를 합격으로 오판정',
            pc: 'MN-검사원 역량 교육', o: '2', dc: '자동판정', d: '2', ap: 'L', spec: 'L' },
          { m4: 'MC', we: '20번-LED검사기', fc: '20번_MC_03LED검사기 설정값 오류',
            pc: 'MC-LED검사기 정기교정', o: '2', dc: '자동판정', d: '1', ap: 'L', spec: 'L' },
        ]
      },
      {
        scope: SCOPE_LABEL_SHIP_TO_PLANT,
        fe: 'C2-5선별 부적합으로 선별재작업 요구', s: '3',
        fm: null, // FM은 위 FM2와 동일
        fcs: [
          { m4: 'MC', we: '20번-LED검사기', fc: '20번_MC_04LED검사기 정기점검 미실시',
            pc: 'MC-LED검사기 점검 이력 관리', o: '3', dc: '자동판정', d: '2', ap: 'L', spec: 'L' },
        ]
      }
    ]
  },

  // ══════ 공정30: 비대칭 + 4M 혼합 ══════
  // 1 FE : 2 FM : (FM1에 3 FC, FM2에 2 FC)
  // 구조=MC인데 FC에 MN도 섞임
  {
    process: { no: '30번-도포', m4struct: 'MC', we: '30번-도포설비' },
    function: {
      processFunc: '30번-접착제를 규격에 맞게 도포한다.',
      m4func: 'MC', weFunc: '30번-도포설비',
      weDetail: '30번-MC01 접착제를 정량 도포한다'
    },
    chains: [
      {
        scope: SCOPE_LABEL_YOUR_PLANT,
        fe: 'Y1-6선별재작업_ 도포불량으로 라인내 선별 재작업', s: '6',
        fm: '30번F01_도포량 과다',
        fcs: [
          { m4: 'MC', we: '30번-도포설비', fc: '30번_MC_01도포설비 토출량 설정 오류',
            pc: 'MC-도포설비 셋업 점검표', o: '3', dc: '중량측정', d: '3', ap: 'L', spec: 'L' },
          { m4: 'MC', we: '30번-도포설비', fc: '30번_MC_02도포노즐 막힘/마모',
            pc: 'MC-노즐 정기교체', o: '3', dc: '중량측정', d: '3', ap: 'L', spec: 'L' },
          { m4: 'MN', we: '30번-도포작업자', fc: '30번-작업자 셋업 점검 누락',
            pc: 'MN-셋업 점검 체크리스트', o: '2', dc: '육안검사', d: '4', ap: 'L', spec: 'L' },
        ]
      },
      {
        // 같은 FE → FM 변경 (FF로 FE 전파)
        scope: null, fe: null, s: null,
        fm: '30번F02_도포량 부족',
        fcs: [
          { m4: 'MC', we: '30번-도포설비', fc: '30번_MC_03접착제 공급 라인 막힘',
            pc: 'MC-공급라인 정기점검', o: '2', dc: '중량측정', d: '3', ap: 'L', spec: 'L' },
          { m4: 'MN', we: '30번-도포작업자', fc: '30번-작업자 접착제 보충 지연',
            pc: 'MN-접착제 잔량 확인 절차', o: '2', dc: '육안검사', d: '5', ap: 'L', spec: 'L' },
        ]
      }
    ]
  },

  // ══════ 공정40: 대규모 + Pool 공유 ══════
  // 2 FE(Y/C) : 3 FM : 각 FM에 4 FC (총 12 FC)
  // 동일 PC가 여러 FC에 공유됨 (Pool 개념)
  {
    process: { no: '40번-열압착', m4struct: 'MC', we: '40번-열압착기' },
    function: {
      processFunc: '40번-열과 압력으로 부품을 접합한다.',
      m4func: 'MC', weFunc: '40번-열압착기',
      weDetail: '40번-MC01 규정된 온도와 압력으로 부품을 압착한다'
    },
    chains: [
      // FM1 + FE(Y)
      {
        scope: SCOPE_LABEL_YOUR_PLANT,
        fe: 'Y1-6선별재작업_ 접합불량으로 라인내 선별 재작업', s: '6',
        fm: '40번F01_접합 강도 부족',
        fcs: [
          { m4: 'MC', we: '40번-열압착기', fc: '40번_MC_01히터 온도 편차',
            pc: 'MC-열압착기 온도 캘리브레이션', o: '3', dc: '인장강도시험', d: '3', ap: 'L', spec: 'C' },
          { m4: 'MC', we: '40번-열압착기', fc: '40번_MC_02압력실린더 압력 저하',
            pc: 'MC-압력계 정기교정', o: '2', dc: '인장강도시험', d: '3', ap: 'L', spec: 'L' },
          { m4: 'MN', we: '40번-압착작업자', fc: '40번-작업자 셋업 점검 누락',
            pc: 'MN-셋업 체크리스트 점검', o: '3', dc: '인장강도시험', d: '3', ap: 'L', spec: 'L' },
          { m4: 'MN', we: '40번-압착작업자', fc: '40번-작업자 셋업 점검 오류',
            pc: 'MN-셋업 체크리스트 점검', o: '2', dc: '인장강도시험', d: '3', ap: 'L', spec: 'L' },
        ]
      },
      // FM1 + FE(C) — scope/FE 변경, FM은 FF
      {
        scope: SCOPE_LABEL_SHIP_TO_PLANT,
        fe: 'C3-4접합불량으로 고객 대책서 요구', s: '4',
        fm: null,
        fcs: [
          { m4: 'MC', we: '40번-열압착기', fc: '40번_MC_01히터 온도 편차',
            pc: 'MC-열압착기 온도 캘리브레이션', o: '3', dc: '인장강도시험', d: '3', ap: 'L', spec: 'C' },
          { m4: 'MC', we: '40번-열압착기', fc: '40번_MC_02압력실린더 압력 저하',
            pc: 'MC-압력계 정기교정', o: '2', dc: '인장강도시험', d: '3', ap: 'L', spec: 'L' },
          { m4: 'MN', we: '40번-압착작업자', fc: '40번-작업자 셋업 점검 누락',
            pc: 'MN-셋업 체크리스트 점검', o: '3', dc: '인장강도시험', d: '3', ap: 'L', spec: 'L' },
          { m4: 'MN', we: '40번-압착작업자', fc: '40번-작업자 셋업 점검 오류',
            pc: 'MN-셋업 체크리스트 점검', o: '2', dc: '인장강도시험', d: '3', ap: 'L', spec: 'L' },
        ]
      },
      // FM2 + FE(Y) — 새 FM, scope/FE 다시 원복
      {
        scope: SCOPE_LABEL_YOUR_PLANT,
        fe: 'Y1-6선별재작업_ 접합불량으로 라인내 선별 재작업', s: '6',
        fm: '40번F02_접합 위치 편차',
        fcs: [
          { m4: 'MC', we: '40번-열압착기', fc: '40번_MC_03위치결정 지그 마모',
            pc: 'MC-지그 정기점검 및 교체', o: '3', dc: '비전검사', d: '2', ap: 'L', spec: 'L' },
          { m4: 'MC', we: '40번-열압착기', fc: '40번_MC_04서보모터 위치 오차',
            pc: 'MC-서보모터 정기교정', o: '2', dc: '비전검사', d: '2', ap: 'L', spec: 'L' },
          { m4: 'MN', we: '40번-압착작업자', fc: '40번-작업자 셋업 점검 누락',
            pc: 'MN-셋업 체크리스트 점검', o: '3', dc: '비전검사', d: '2', ap: 'L', spec: 'L' },
          { m4: 'MN', we: '40번-압착작업자', fc: '40번-작업자 셋업 점검 오류',
            pc: 'MN-셋업 체크리스트 점검', o: '2', dc: '비전검사', d: '2', ap: 'L', spec: 'L' },
        ]
      },
      // FM2 + FE(C)
      {
        scope: SCOPE_LABEL_SHIP_TO_PLANT,
        fe: 'C3-4접합불량으로 고객 대책서 요구', s: '4',
        fm: null,
        fcs: [
          { m4: 'MC', we: '40번-열압착기', fc: '40번_MC_03위치결정 지그 마모',
            pc: 'MC-지그 정기점검 및 교체', o: '3', dc: '비전검사', d: '2', ap: 'L', spec: 'L' },
          { m4: 'MC', we: '40번-열압착기', fc: '40번_MC_04서보모터 위치 오차',
            pc: 'MC-서보모터 정기교정', o: '2', dc: '비전검사', d: '2', ap: 'L', spec: 'L' },
          { m4: 'MN', we: '40번-압착작업자', fc: '40번-작업자 셋업 점검 누락',
            pc: 'MN-셋업 체크리스트 점검', o: '3', dc: '비전검사', d: '2', ap: 'L', spec: 'L' },
          { m4: 'MN', we: '40번-압착작업자', fc: '40번-작업자 셋업 점검 오류',
            pc: 'MN-셋업 체크리스트 점검', o: '2', dc: '비전검사', d: '2', ap: 'L', spec: 'L' },
        ]
      },
      // FM3 + FE(Y) — 새 FM
      {
        scope: SCOPE_LABEL_YOUR_PLANT,
        fe: 'Y1-6선별재작업_ 접합불량으로 라인내 선별 재작업', s: '6',
        fm: '40번F03_압착 시간 초과',
        fcs: [
          { m4: 'MC', we: '40번-열압착기', fc: '40번_MC_05타이머 오작동',
            pc: 'MC-타이머 정기점검', o: '2', dc: '자동판정', d: '1', ap: 'L', spec: 'L' },
          { m4: 'MC', we: '40번-열압착기', fc: '40번_MC_06PLC 프로그램 오류',
            pc: 'MC-PLC 프로그램 검증', o: '1', dc: '자동판정', d: '1', ap: 'L', spec: 'L' },
          { m4: 'MN', we: '40번-압착작업자', fc: '40번-작업자 수동모드 시간 초과',
            pc: 'MN-수동모드 작업 교육', o: '2', dc: '자동판정', d: '1', ap: 'L', spec: 'L' },
          { m4: 'MN', we: '40번-압착작업자', fc: '40번-작업자 비상정지 조작 미숙',
            pc: 'MN-비상정지 교육', o: '1', dc: '자동판정', d: '1', ap: 'L', spec: 'L' },
        ]
      },
      // FM3 + FE(C)
      {
        scope: SCOPE_LABEL_SHIP_TO_PLANT,
        fe: 'C3-4접합불량으로 고객 대책서 요구', s: '4',
        fm: null,
        fcs: [
          { m4: 'MC', we: '40번-열압착기', fc: '40번_MC_05타이머 오작동',
            pc: 'MC-타이머 정기점검', o: '2', dc: '자동판정', d: '1', ap: 'L', spec: 'L' },
          { m4: 'MC', we: '40번-열압착기', fc: '40번_MC_06PLC 프로그램 오류',
            pc: 'MC-PLC 프로그램 검증', o: '1', dc: '자동판정', d: '1', ap: 'L', spec: 'L' },
          { m4: 'MN', we: '40번-압착작업자', fc: '40번-작업자 수동모드 시간 초과',
            pc: 'MN-수동모드 작업 교육', o: '2', dc: '자동판정', d: '1', ap: 'L', spec: 'L' },
          { m4: 'MN', we: '40번-압착작업자', fc: '40번-작업자 비상정지 조작 미숙',
            pc: 'MN-비상정지 교육', o: '1', dc: '자동판정', d: '1', ap: 'L', spec: 'L' },
        ]
      },
    ]
  },

  // ══════ 공정50: 경계 테스트 (IM/EN + 특별특성) ══════
  // IM(부자재) + EN(환경) 4M, 특별특성 C
  {
    process: { no: '50번-세척', m4struct: 'MC', we: '50번-세척설비' },
    function: {
      processFunc: '50번-부품 표면의 이물을 세척하여 제거한다.',
      m4func: 'MC', weFunc: '50번-세척설비',
      weDetail: '50번-MC01 세척액으로 이물을 제거한다'
    },
    chains: [
      {
        scope: SCOPE_LABEL_YOUR_PLANT,
        fe: 'Y1-6선별재작업_ 세척불량으로 라인내 선별 재작업', s: '6',
        fm: '50번F01_세척 잔여물 잔류',
        fcs: [
          { m4: 'MC', we: '50번-세척설비', fc: '50번_MC_01세척설비 노즐 막힘',
            pc: 'MC-노즐 정기점검', o: '3', dc: '육안검사', d: '4', ap: 'L', spec: 'C' },
          { m4: 'IM', we: '50번-세척액', fc: '50번_IM_01세척액 농도 부적합',
            pc: 'IM-세척액 농도 일일점검', o: '2', dc: '농도측정', d: '2', ap: 'L', spec: 'C' },
          { m4: 'IM', we: '50번-세척액', fc: '50번_IM_02세척액 유효기간 초과',
            pc: 'IM-세척액 교체주기 관리', o: '2', dc: '일자확인', d: '1', ap: 'L', spec: 'L' },
          { m4: 'EN', we: '50번-세척실 환경', fc: '50번_EN_01세척실 온도 기준 이탈',
            pc: 'EN-세척실 온습도 모니터링', o: '2', dc: '온도센서', d: '1', ap: 'L', spec: 'L' },
          { m4: 'EN', we: '50번-세척실 환경', fc: '50번_EN_02세척실 습도 기준 이탈',
            pc: 'EN-세척실 온습도 모니터링', o: '2', dc: '습도센서', d: '1', ap: 'L', spec: 'L' },
        ]
      }
    ]
  },
];

// ═══════════════════════════════════════════
// 엑셀 생성
// ═══════════════════════════════════════════

const wb = XLSX.utils.book_new();
const wsData = [];

// ─── 헤더 행 (Row 8~11, 0-indexed 7~10) ───
// Row 8 (r=7): 빈행
wsData.push(Array(36).fill(''));
wsData.push(Array(36).fill(''));
wsData.push(Array(36).fill(''));
wsData.push(Array(36).fill(''));
wsData.push(Array(36).fill(''));
wsData.push(Array(36).fill(''));
wsData.push(Array(36).fill(''));

// Row 8 (r=7) — 빈행 (실제 STEP B에서는 제목행)
// Row 9 (r=8) — 대분류 헤더
const row9 = Array(36).fill('');
row9[1] = 'Revision No';
row9[2] = 'Continuous improvement';
row9[3] = 'P-FMEA 구조 분석(2단계)';
row9[7] = 'P-FMEA 기능 분석(3단계)';
row9[13] = 'P-FMEA 고장 분석(4단계)';
row9[20] = 'P-FMEA 리스크 분석(5단계)';
row9[27] = 'P-FMEA 최적화(6단계)';
wsData.push(row9);

// Row 10 (r=9) — 중분류 헤더
const row10 = Array(36).fill('');
row10[2] = 'History/Change Authorization';
row10[3] = '1. 완제품 공정명';
row10[4] = '2. 메인 공정명';
row10[5] = '3. 작업 요소명';
row10[7] = '1. 완제품 공정기능/요구사항';
row10[9] = '2. 메인공정기능 및 제품특성';
row10[10] = '3. 작업요소의 기능 및 공정특성';
row10[13] = '1. 자사/고객/사용자 고장영향(FE)';
row10[16] = '2. 메인공정 고장형태(FM)';
row10[17] = '3. 작업요소 고장원인(FC)';
row10[20] = '현재 예방관리';
row10[22] = '현재 검출관리';
row10[24] = '리스크 평가';
row10[27] = '계획';
row10[31] = '결과 모니터링';
row10[34] = '효과 평가';
wsData.push(row10);

// Row 11 (r=10) — 세부 컬럼 헤더
const row11 = Array(36).fill('');
row11[3] = '완제품  공정명';
row11[4] = 'NO+공정명';
row11[5] = '4M';
row11[6] = '작업요소';
row11[7] = '구분';
row11[8] = '완제품기능';
row11[9] = '공정 기능/제품특성';
row11[10] = '4M';
row11[11] = '작업요소';
row11[12] = '작업요소 기능/공정특성';
row11[13] = '구분';
row11[14] = '고장영향(FE)';
row11[15] = '심각도';
row11[16] = '고장형태(FM)';
row11[17] = '4M';
row11[18] = '작업요소';
row11[19] = '고장원인(FC)';
row11[20] = '예방관리(PC)';
row11[21] = '발생도';
row11[22] = '검출관리(DC)';
row11[23] = '검출도';
row11[24] = 'AP';
row11[25] = '특별특성';
row11[26] = '필터코드';
row11[27] = '예방관리개선';
row11[28] = '검출관리개선';
row11[29] = '책임자성명';
row11[30] = '목표완료일자';
row11[31] = '상태';
row11[32] = '개선결과근거';
row11[33] = '완료일자';
row11[34] = '심각도';
row11[35] = '발생도';
wsData.push(row11);

// ─── 데이터 행 생성 ───
// Forward Fill 엑셀 규칙 적용:
//   첫 행만 값 기입, 나머지는 빈칸 (엑셀 병합셀 시뮬레이션)

let totalDataRows = 0;

for (const scenario of scenarios) {
  const proc = scenario.process;
  const func = scenario.function;
  let isFirstRowOfProcess = true;

  for (const chain of scenario.chains) {
    const isFirstRowOfChain = true;

    for (let fcIdx = 0; fcIdx < chain.fcs.length; fcIdx++) {
      const fc = chain.fcs[fcIdx];
      const row = Array(36).fill('');

      // ── 구조 영역 (C3~C6) ──
      // 공정 첫 행만 기입
      if (isFirstRowOfProcess) {
        row[3] = PRODUCT_NAME;        // C3: 완제품공정명
        row[4] = proc.no;             // C4: NO+공정명
        row[5] = proc.m4struct;       // C5: 4M(구조)
        row[6] = proc.we;             // C6: 작업요소(구조)
      }
      // 이후 행: C3~C6 빈칸 (Forward Fill 대상)

      // ── 기능 영역 (C7~C12) ──
      // 공정 첫 행만 기입
      if (isFirstRowOfProcess) {
        row[7] = chain.scope || '';     // C7: 구분(기능) — 첫 scope
        row[8] = PRODUCT_FUNC;          // C8: 완제품기능
        row[9] = func.processFunc;      // C9: 공정기능/제품특성
        row[10] = func.m4func;          // C10: 4M(기능)
        row[11] = func.weFunc;          // C11: 작업요소(기능)
        row[12] = func.weDetail;        // C12: 작업요소기능/공정특성
      }

      // ── 고장 영역 (C13~C19) ──
      // scope: chain의 scope가 있으면 기입 (새 scope 시작)
      if (chain.scope && fcIdx === 0) {
        row[13] = chain.scope;          // C13: 구분(고장)
      }
      // FE: chain의 fe가 있으면 기입 (새 FE 시작)
      if (chain.fe && fcIdx === 0) {
        row[14] = chain.fe;             // C14: FE
        row[15] = chain.s;             // C15: S (FE와 함께)
      }
      // FM: chain의 fm이 있으면 기입 (새 FM 시작)
      if (chain.fm && fcIdx === 0) {
        row[16] = chain.fm;             // C16: FM
      }
      // FC: 항상 값 있음 (행 식별자)
      row[17] = fc.m4;                  // C17: 4M(고장)
      row[18] = fc.we;                  // C18: 작업요소(고장)
      row[19] = fc.fc;                  // C19: FC

      // ── 리스크 영역 (C20~C26) ──
      row[20] = fc.pc;                  // C20: PC
      row[21] = fc.o;                   // C21: O
      row[22] = fc.dc;                  // C22: DC
      row[23] = fc.d;                   // C23: D
      row[24] = fc.ap;                  // C24: AP
      row[25] = fc.spec;               // C25: 특별특성

      wsData.push(row);
      totalDataRows++;
      isFirstRowOfProcess = false;
    }
  }
}

// ── 시트 생성 ──
const ws = XLSX.utils.aoa_to_sheet(wsData);

// 컬럼 너비 설정
ws['!cols'] = [
  { wch: 3 },  // C0
  { wch: 8 },  // C1: Revision
  { wch: 15 }, // C2: History
  { wch: 18 }, // C3: 완제품공정명
  { wch: 18 }, // C4: NO+공정명
  { wch: 5 },  // C5: 4M
  { wch: 22 }, // C6: 작업요소
  { wch: 15 }, // C7: 구분
  { wch: 40 }, // C8: 완제품기능
  { wch: 35 }, // C9: 공정기능
  { wch: 5 },  // C10: 4M
  { wch: 22 }, // C11: 작업요소
  { wch: 40 }, // C12: 작업요소기능
  { wch: 15 }, // C13: 구분(고장)
  { wch: 45 }, // C14: FE
  { wch: 5 },  // C15: S
  { wch: 30 }, // C16: FM
  { wch: 5 },  // C17: 4M(고장)
  { wch: 22 }, // C18: 작업요소(고장)
  { wch: 35 }, // C19: FC
  { wch: 35 }, // C20: PC
  { wch: 5 },  // C21: O
  { wch: 20 }, // C22: DC
  { wch: 5 },  // C23: D
  { wch: 5 },  // C24: AP
  { wch: 5 },  // C25: 특별특성
];

XLSX.utils.book_append_sheet(wb, ws, 'fmea result');

// ── 파일 저장 ──
const outPath = 'docs/PFMEA_STEP_B_GOLDEN_TEST.xls';
XLSX.writeFile(wb, outPath);

console.log('═══════════════════════════════════════════');
console.log(' 골든 테스트 STEP B 생성 완료');
console.log('═══════════════════════════════════════════');
console.log(' 파일: ' + outPath);
console.log(' 총 데이터 행: ' + totalDataRows);
console.log('');
console.log(' 시나리오:');
console.log('   공정10: 단순 (1 FE : 1 FM : 3 FC) — MN');
console.log('   공정20: 3열 FE(Y/C/U) + 다중 FM (7 FM:10 FC)');
console.log('   공정30: 비대칭 (1 FE : 2 FM : 5 FC) — MC+MN 혼합');
console.log('   공정40: 대규모 (2 FE : 3 FM : 24 FC) — Pool 공유');
console.log('   공정50: 경계 (MC+IM+EN : 1 FM : 5 FC) — 특별특성 C');
console.log('');
console.log(' Forward Fill 대상:');
console.log('   C3(완제품공정명): 공정단위 1회');
console.log('   C4(NO+공정명): 공정단위 1회');
console.log('   C5/C6(4M/작업요소): 구조 변경 시');
console.log('   C13(scope): scope 변경 시');
console.log('   C14/C15(FE/S): FE 변경 시');
console.log('   C16(FM): FM 변경 시');
console.log('   C19(FC): 항상 값 있음 ★');
