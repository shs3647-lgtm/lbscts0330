/**
 * @file preventionKeywordMap.ts
 * @description 예방관리(PC) 3단계 매칭 규칙
 *
 * 1차: 4M 카테고리 → 예방관리 기본 추천
 * 2차: FC(고장원인) 키워드 → 예방관리 매칭 (17개 규칙)
 * 3차: FM(고장형태) 키워드 → 예방관리 매칭 (11개 규칙)
 *
 * 근거: AIAG-VDA FMEA Handbook 1판 + 한국 제조업 현장 용어
 * @created 2026-02-23
 */

import { rankBySimlarity } from './similarityScore';

// =====================================================
// 인터페이스
// =====================================================

export interface PreventionRule {
  /** 매칭 키워드 (FC 또는 FM 텍스트에 포함 여부 검사) */
  keywords: string[];
  /** 1순위 예방관리 방법 */
  primaryMethods: string[];
  /** 2순위 예방관리 방법 */
  secondaryMethods: string[];
  /** 우선순위 (낮을수록 우선) */
  priority: number;
}

interface PC4MCategory {
  label: string;
  description: string;
  defaultMethods: string[];
  controlTypes: string[];
}

// =====================================================
// 4M 정규화 (MT→IM, ME→EN, MD/JG→MC)
// =====================================================

/** 다양한 4M 코드를 코드베이스 표준(MN/MC/IM/EN)으로 정규화 */
export function normalize4M(m4: string): 'MN' | 'MC' | 'IM' | 'EN' | '' {
  const upper = (m4 || '').toUpperCase().trim();
  if (upper === 'MN') return 'MN';
  if (upper === 'MC' || upper === 'MD' || upper === 'JG') return 'MC';
  if (upper === 'IM' || upper === 'MT') return 'IM';
  if (upper === 'EN' || upper === 'ME') return 'EN';
  return '';
}

// =====================================================
// 1차: 4M 카테고리 → 예방관리 기본 매칭
// =====================================================

export const PC_4M_CATEGORY_MAP: Record<string, PC4MCategory> = {
  MN: {
    label: '작업자 (Man)',
    description: '작업자의 숙련도, 교육, 실수, 자격 등에 기인한 고장원인',
    defaultMethods: [
      '작업자 교육/훈련', '작업표준서(WI) 준수', '자격인증 관리',
      '숙련도 평가', '교대 인수인계 절차', '작업자 배치 관리',
      '다기능 작업자 양성', 'OJT(현장교육)',
    ],
    controlTypes: ['behavioral'],
  },
  MC: {
    label: '설비 (Machine)',
    description: '설비, 지그, 치공구, 금형, 검사기 등 기계에 기인한 고장원인',
    defaultMethods: [
      '예방유지보전(PM)', '설비 점검 체크리스트', '지그/치공구 점검',
      '금형 관리', '설비 교정(Calibration)', '설비 파라미터 관리',
      '설비 수명 관리', '일상점검/시업점검', 'TPM(전원참여 생산보전)',
      '스페어 파트 관리',
    ],
    controlTypes: ['technical'],
  },
  IM: {
    label: '자재 (Material)',
    description: '원자재, 부품, 부자재 등 자재 품질에 기인한 고장원인',
    defaultMethods: [
      '수입검사', '공급업체 관리(SQA)', '자재 LOT 관리',
      '선입선출(FIFO)', '자재 보관 조건 관리', '자재 유효기한 관리',
      'IQC(수입품질관리)', '공급업체 품질협약', '자재 성적서(COC) 확인',
      '부품 승인 프로세스(PPAP)',
    ],
    controlTypes: ['behavioral', 'technical'],
  },
  EN: {
    label: '방법/환경 (Method/Environment)',
    description: '작업방법, 공정조건, 환경(온습도 등)에 기인한 고장원인',
    defaultMethods: [
      '작업표준서(WI) 개정', '공정조건 표준화', 'SPC(통계적 공정관리)',
      '환경 조건 관리(온습도)', '5S/정리정돈', '공정 FMEA 주기적 검토',
      '변경점 관리(4M 변경)', '관리계획서(CP) 준수', '초·중·종물 관리',
      '이상발생 대응절차',
    ],
    controlTypes: ['behavioral', 'technical'],
  },
};

// =====================================================
// 2차: FC(고장원인) 키워드 → 예방관리 매칭 (17개 규칙)
// =====================================================

export const FC_TO_PC_RULES: PreventionRule[] = [
  {
    keywords: ['지그', '치구', '고정구', '클램프', '바이스', '척'],
    primaryMethods: ['지그 정기점검 (마모/변형 확인)', '지그 수명관리 및 교체주기 설정', '지그 세척/청소 주기 관리', '지그 치수 정기 측정'],
    secondaryMethods: ['설비 점검 체크리스트'],
    priority: 1,
  },
  {
    keywords: ['금형', '다이', '몰드', '캐비티', '코어'],
    primaryMethods: ['금형 PM(예방유지보전) 주기 관리', '금형 타수 관리', '금형 세척/코팅 관리', '금형 수리이력 관리'],
    secondaryMethods: ['설비 교정(Calibration)'],
    priority: 2,
  },
  {
    keywords: ['전동드라이버', '토크드라이버', '토크렌치', '임팩트', '체결공구', '너트러너'],
    primaryMethods: ['공구 교정(Calibration) 주기 관리', '토크 설정값 일일 확인', '공구 마모 점검 및 교체', '공구 교정 성적서 관리'],
    secondaryMethods: ['설비 파라미터 관리'],
    priority: 3,
  },
  {
    keywords: ['도포기', '디스펜서', '노즐', '도포', '그리스', '접착제', '실란트', '본드'],
    primaryMethods: ['도포량 정량 관리 (중량 체크)', '노즐 교체주기 관리', '도포기 에어압력 정기 점검', '접착제/그리스 유효기한 관리', '도포 패턴 정기 확인'],
    secondaryMethods: ['설비 파라미터 관리'],
    priority: 4,
  },
  {
    keywords: ['압력', '에어압', 'AIR', '공압', '유압', '레귤레이터', '밸브', '실린더'],
    primaryMethods: ['압력게이지 교정 주기 관리', '에어 필터/레귤레이터 점검', '유압/공압 배관 누설 점검', '압력 설정값 일일 확인', '실린더 패킹 교체주기 관리'],
    secondaryMethods: ['설비 점검 체크리스트'],
    priority: 5,
  },
  {
    keywords: ['센서', '카메라', '비전', '검사기', 'EOL', '측정기', '게이지'],
    primaryMethods: ['센서 교정(Calibration) 주기 관리', '마스터 샘플 정기 검증', 'MSA(측정시스템분석) 주기적 실시', '검사기 일상점검 체크리스트'],
    secondaryMethods: ['설비 교정(Calibration)'],
    priority: 6,
  },
  {
    keywords: ['모터', '서보', '스핀들', '베어링', '기어', '벨트', '체인', '감속기'],
    primaryMethods: ['구동부 윤활 주기 관리', '베어링 진동/소음 정기 측정', '벨트/체인 장력 점검', '모터 전류값 모니터링'],
    secondaryMethods: ['예방유지보전(PM)'],
    priority: 7,
  },
  {
    keywords: ['용접', '스팟', '아크', 'MIG', 'TIG', '전극', '팁', '용접봉'],
    primaryMethods: ['용접팁 드레싱/교체 주기 관리', '용접 전류/전압 파라미터 관리', '용접기 일상점검', '전극 마모 측정 및 교체'],
    secondaryMethods: ['설비 파라미터 관리'],
    priority: 8,
  },
  {
    keywords: ['온도', '가열', '건조', '경화', '오븐', '히터', '열풍'],
    primaryMethods: ['온도 프로파일 정기 확인', '온도센서 교정 주기 관리', '오븐/히터 일상점검', '경화 시간/온도 파라미터 관리'],
    secondaryMethods: ['환경 조건 관리(온습도)'],
    priority: 9,
  },
  {
    keywords: ['컨베이어', '이송', '로봇', '피더', '슈트', '호퍼', '매거진'],
    primaryMethods: ['이송 설비 일상점검', '로봇 원점/위치 정기 확인', '피더/호퍼 청소 주기 관리', '이송 속도 파라미터 관리'],
    secondaryMethods: ['예방유지보전(PM)'],
    priority: 10,
  },
  {
    keywords: ['숙련도', '미숙', '작업자', '오조작', '실수', '부주의', '피로', '교대'],
    primaryMethods: ['작업자 교육/숙련도 평가 실시', '작업표준서(WI) 교육 및 게시', '작업자 자격인증 관리', '실수방지(Poka-Yoke) 도입', '교대 인수인계 체크리스트'],
    secondaryMethods: ['OJT(현장교육)'],
    priority: 11,
  },
  {
    keywords: ['오염', '이물', '세척', '청소', '먼지', '유분', '찌꺼기', '잔류물'],
    primaryMethods: ['세척/청소 주기 및 기준 관리', '에어블로우/집진 설비 점검', '클린룸/청정도 관리', '세척액 농도/온도 관리'],
    secondaryMethods: ['5S/정리정돈'],
    priority: 12,
  },
  {
    keywords: ['보관', '습도', '산화', '부식', '결로', '환경', '온습도'],
    primaryMethods: ['보관 조건(온습도) 관리', '방습/방청 포장 관리', '입고~사용 간 보관기한 관리', '온습도 모니터링 시스템'],
    secondaryMethods: ['환경 조건 관리(온습도)'],
    priority: 13,
  },
  {
    keywords: ['선입선출', 'FIFO', 'LOT', '이종', '혼입', '오삽입'],
    primaryMethods: ['선입선출(FIFO) 시스템 운영', 'LOT 추적 시스템(바코드/QR)', '이종품 방지 구획/색상 관리', '부품 식별표시 관리'],
    secondaryMethods: ['자재 LOT 관리'],
    priority: 14,
  },
  {
    keywords: ['마모', '수명', '열화', '노후', '피로', '크랙', '파손', '변형'],
    primaryMethods: ['소모품 교체주기 설정 및 관리', '마모량 정기 측정', '예방정비(PM) 주기 준수', '설비/공구 수명관리 시스템'],
    secondaryMethods: ['예방유지보전(PM)'],
    priority: 15,
  },
  {
    keywords: ['파라미터', '설정값', '조건', '레시피', '프로그램', 'PLC', '설비조건'],
    primaryMethods: ['공정 파라미터 관리표 운영', '설정값 변경 이력 관리', '시업 시 파라미터 확인 절차', '파라미터 잠금(Lock) 기능 적용'],
    secondaryMethods: ['설비 파라미터 관리'],
    priority: 16,
  },
  {
    keywords: ['스크류', '볼트', '너트', '체결', '풀림', '토크', '누락'],
    primaryMethods: ['토크 관리 기준 설정', '체결 순서/패턴 표준화', '개수 확인 센서/카운터 적용', '풀림 방지 와셔/접착제 적용'],
    secondaryMethods: ['실수방지(Poka-Yoke) 도입'],
    priority: 17,
  },
];

// =====================================================
// 3차: FM(고장형태) 키워드 → 예방관리 매칭 (11개 규칙)
// =====================================================

export const FM_TO_PC_RULES: PreventionRule[] = [
  {
    keywords: ['사양', '품명', '규격', '버전', '불일치', '이종', '라벨'],
    primaryMethods: ['바코드/QR 스캔 확인 시스템', '부품 식별표시 관리 강화', '변경점 관리(ECN) 절차 준수', '수입검사 기준 강화'],
    secondaryMethods: ['자재 LOT 관리'],
    priority: 1,
  },
  {
    keywords: ['외관', '파손', '스크래치', '찍힘', '긁힘', '크랙', '이물', '흠집'],
    primaryMethods: ['취급 주의 교육 (운반/적재)', '보호 포장/간지 적용', '작업대 연질 매트 적용', '이물 관리 (에어블로우, 청소주기)'],
    secondaryMethods: ['5S/정리정돈'],
    priority: 2,
  },
  {
    keywords: ['조립', '체결', '누락', '미삽입', '역삽입', '오삽입', '풀림'],
    primaryMethods: ['조립 순서 표준화 (작업표준서)', '실수방지(Poka-Yoke) 적용', '개수 확인 센서/카운터', '조립 상태 자주검사 기준'],
    secondaryMethods: ['작업표준서(WI) 준수'],
    priority: 3,
  },
  {
    keywords: ['치수', '형상', 'PV값', '변형', '편차', '공차', '두께', '갭'],
    primaryMethods: ['공정능력(Cpk) 관리', 'SPC 관리도 운영', '초·중·종물 치수 측정', '지그/금형 정기 점검'],
    secondaryMethods: ['설비 교정(Calibration)'],
    priority: 4,
  },
  {
    keywords: ['도포', '도포량', '도포상태', '접착', '그리스', '도포위치'],
    primaryMethods: ['도포량 정량 관리 (중량 체크)', '도포기 파라미터 관리 (압력, 시간, 온도)', '노즐 상태 점검 주기', '도포 패턴 기준서 관리'],
    secondaryMethods: ['설비 파라미터 관리'],
    priority: 5,
  },
  {
    keywords: ['휘도', '점등', '영상', '암전류', '미출력', '틀어짐', '균일도', '얼룩'],
    primaryMethods: ['부품 수입검사 강화 (PGU, LCD, PCB)', '조립 환경 관리 (정전기, 클린룸)', '케이블 체결 상태 확인 절차', '부품 보관 조건 관리'],
    secondaryMethods: ['환경 조건 관리(온습도)'],
    priority: 6,
  },
  {
    keywords: ['포장', '수량', '출하', '납품', '적재'],
    primaryMethods: ['포장 작업표준서 준수', '수량 카운트 시스템 (바코드/중량)', '출하 전 최종 확인 체크리스트', '포장재 규격 관리'],
    secondaryMethods: ['작업표준서(WI) 준수'],
    priority: 7,
  },
  {
    keywords: ['산화', '습도', '오염', '부식', '결로'],
    primaryMethods: ['보관 환경(온습도) 관리', '방습/방청 포장 적용', '보관 기한 관리', '입고~사용 리드타임 관리'],
    secondaryMethods: ['자재 보관 조건 관리'],
    priority: 8,
  },
  {
    keywords: ['미작동', '오작동', '기능', '이음', '소음', '진동', '동작'],
    primaryMethods: ['부품 기능검사 강화 (수입검사)', '조립 후 기능 확인 절차', '설비 파라미터 관리', '공정 내 중간 검사 도입'],
    secondaryMethods: ['예방유지보전(PM)'],
    priority: 9,
  },
  {
    keywords: ['선입선출', 'FIFO', '이종', '혼입'],
    primaryMethods: ['선입선출(FIFO) 시스템 운영', 'LOT 추적 바코드/QR 시스템', '이종품 구획/색상 관리', '자재 식별표시 관리'],
    secondaryMethods: ['부품 식별표시 관리'],
    priority: 10,
  },
  {
    keywords: ['마스터', '미검출', '오판', '불량판정', '검출률'],
    primaryMethods: ['마스터 샘플 정기 검증', 'MSA(측정시스템분석) 실시', '검사기 교정 주기 준수', '검사 기준 명확화'],
    secondaryMethods: ['센서 교정(Calibration) 주기 관리'],
    priority: 11,
  },
];

// =====================================================
// 헬퍼 함수
// =====================================================

/** 텍스트에서 키워드 매칭되는 규칙 조회 */
export function matchPreventionRules(text: string, rules: PreventionRule[]): PreventionRule[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  return rules
    .filter(rule => rule.keywords.some(kw => lower.includes(kw.toLowerCase())))
    .sort((a, b) => a.priority - b.priority);
}

/** 4M 기본 예방관리 방법 키워드 조회 */
export function get4MDefaultMethods(m4: string): string[] {
  const normalized = normalize4M(m4);
  if (!normalized) return [];
  return PC_4M_CATEGORY_MAP[normalized]?.defaultMethods || [];
}

/**
 * B5 후보에 대한 3단계 예방관리 규칙 매칭 랭킹
 *
 * 스코어 = 유사도(0.40) + 4M보너스(0.15) + FC규칙(0.25) + FM규칙(0.20)
 */
export function rankByPreventionRules<T extends { value: string; m4?: string }>(
  fcText: string,
  fmText: string,
  fcM4: string,
  candidates: T[],
): T[] {
  if (candidates.length === 0) return [];

  // 기존 유사도 기반 순위 (인덱스 기반 점수: 1위=1.0, 꼴찌=0.1)
  const simRanked = fcText ? rankBySimlarity(fcText, candidates) : candidates;
  const simScoreMap = new Map<string, number>();
  simRanked.forEach((c, i) => {
    simScoreMap.set(c.value, 1.0 - (i / Math.max(simRanked.length, 1)) * 0.9);
  });

  // 1차: 4M 카테고리 기본 방법 키워드
  const m4Methods = get4MDefaultMethods(fcM4);
  const m4Keywords = m4Methods.map(m => m.toLowerCase());

  // 2차: FC 키워드 규칙 매칭
  const fcMatched = matchPreventionRules(fcText, FC_TO_PC_RULES);
  const fcKeywords = new Set<string>();
  fcMatched.forEach(rule => {
    rule.primaryMethods.forEach(m => fcKeywords.add(m.toLowerCase()));
    rule.secondaryMethods.forEach(m => fcKeywords.add(m.toLowerCase()));
  });

  // 3차: FM 키워드 규칙 매칭
  const fmMatched = matchPreventionRules(fmText, FM_TO_PC_RULES);
  const fmKeywords = new Set<string>();
  fmMatched.forEach(rule => {
    rule.primaryMethods.forEach(m => fmKeywords.add(m.toLowerCase()));
    rule.secondaryMethods.forEach(m => fmKeywords.add(m.toLowerCase()));
  });

  // ★ Set→Array 변환 (루프 외부에서 1회만)
  const fcKeywordsArr = Array.from(fcKeywords);
  const fmKeywordsArr = Array.from(fmKeywords);

  // 후보별 최종 점수 계산
  const scored = candidates.map(c => {
    const val = c.value.toLowerCase();

    // 유사도 점수 (0~1)
    const simScore = simScoreMap.get(c.value) || 0.5;

    // 4M 카테고리 보너스 (0 또는 1)
    const m4Score = m4Keywords.some(kw => val.includes(kw) || kw.includes(val)) ? 1.0 : 0;

    // FC 키워드 규칙 점수 (0 또는 1)
    const fcScore = fcKeywordsArr.some(kw => val.includes(kw) || kw.includes(val)) ? 1.0 : 0;

    // FM 키워드 규칙 점수 (0 또는 1)
    const fmScore = fmKeywordsArr.some(kw => val.includes(kw) || kw.includes(val)) ? 1.0 : 0;

    // 가중합
    const total = simScore * 0.40 + m4Score * 0.15 + fcScore * 0.25 + fmScore * 0.20;

    return { item: c, score: total };
  });

  // 점수 내림차순 정렬
  scored.sort((a, b) => b.score - a.score);
  return scored.map(s => s.item);
}
