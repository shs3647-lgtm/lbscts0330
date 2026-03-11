/**
 * @file electronics.ts
 * @description 전기전자 업종 PC/DC 추론 규칙 셋
 *
 * 근거: AIAG-VDA PFMEA + 전기전자 제품(PCB, SMT, 커넥터, 모듈) 제조 공정
 * 공정: SMT, 솔더링, 조립, 검사, 에이징, 포장 등
 *
 * @created 2026-03-05
 */

import type { IndustryRuleSet } from '../pc-dc-inference';

export const ELECTRONICS_RULES: IndustryRuleSet = {
  id: 'electronics',
  name: '전기전자',

  // ── FC(고장원인) → PC(예방관리) ──
  pcRulesFC: [
    { keywords: ['솔더', '납땜', '리플로우', 'Reflow', '웨이브', 'Wave'], pc: '리플로우 프로파일 관리' },
    { keywords: ['SMT', '마운터', '장착', '실장', 'Placement'], pc: 'SMT 장비 정기점검 및 교정' },
    { keywords: ['인쇄', '스크린', '스텐실', 'Stencil', '페이스트', 'Paste'], pc: '솔더 페이스트 인쇄 조건 관리' },
    { keywords: ['PCB', '기판', '패턴', '동박'], pc: 'PCB 수입검사 및 보관관리' },
    { keywords: ['커넥터', '단자', '핀', '접촉', 'Pin'], pc: '커넥터 삽입 조건 표준화' },
    { keywords: ['부품', '칩', 'IC', '수동소자', '저항', '콘덴서', '캐패시터'], pc: '부품 수입검사 및 FIFO 관리' },
    { keywords: ['온도', '가열', '냉각', '열충격', 'Thermal'], pc: '온도 프로파일 정기 확인' },
    { keywords: ['습도', '결로', '흡습', '건조', 'MSL'], pc: 'MSL 관리 및 건조보관' },
    { keywords: ['ESD', '정전기', '방전', '접지'], pc: 'ESD 보호 시스템 운영' },
    { keywords: ['코팅', '도포', 'Conformal', '방습'], pc: '코팅 두께/균일성 관리' },
    { keywords: ['압착', '크림프', 'Crimp', '터미널'], pc: '압착 높이/인장강도 관리' },
    { keywords: ['와이어', '하네스', '배선', '케이블'], pc: '배선 작업표준서 준수' },
    { keywords: ['검사', '비전', 'AOI', 'ICT', 'FCT'], pc: '검사기 교정 및 마스터 검증' },
    { keywords: ['교육', '숙련', '미숙', '부주의', '오작업'], pc: '작업자 교육 및 숙련도 평가' },
    { keywords: ['오염', '이물', '세척', '플럭스', 'Flux'], pc: '세척 공정 관리 및 이온오염도 검사' },
    { keywords: ['마모', '수명', '교체', '열화', '노즐'], pc: '소모품 교체주기 관리' },
    { keywords: ['레이저', '마킹', 'Laser', '인쇄'], pc: '마킹 품질 정기 확인' },
    { keywords: ['몰딩', '성형', '에폭시', 'Epoxy', '포팅'], pc: '몰딩/포팅 조건 관리' },
    { keywords: ['에이징', 'Aging', '번인', 'Burn-in'], pc: '에이징 조건 표준화' },
    { keywords: ['표준', '미준수', 'WI', '기준서'], pc: '작업표준서(WI) 교육 및 게시' },
  ],

  // ── FM(고장형태) → PC(예방관리) (FC 매칭 실패 시) ──
  pcRulesFM: [
    { keywords: ['미납', '미실장', 'Missing', '누락'], pc: 'SMT 장비 정기점검 및 피더 관리' },
    { keywords: ['오삽', '역삽', '오장착', '극성'], pc: '극성 확인 시스템 운영 (비전검사)' },
    { keywords: ['브릿지', 'Bridge', '쇼트', 'Short'], pc: '솔더 페이스트 인쇄 조건 관리' },
    { keywords: ['냉납', 'Cold', '크랙', '접합불량'], pc: '리플로우 프로파일 관리' },
    { keywords: ['들뜸', 'Tombstone', '맨하탄'], pc: '패드 설계 검토 및 페이스트 도포량 관리' },
    { keywords: ['단선', '단락', '절연', 'Open', 'Short'], pc: '배선 검사 강화' },
    { keywords: ['치수', '형상', '변형', '편차'], pc: '공정능력(Cpk) 관리' },
    { keywords: ['외관', '파손', '스크래치', '찍힘'], pc: '취급 주의 교육 (운반/적재)' },
    { keywords: ['마킹', '라벨', '식별', '오인쇄'], pc: '마킹 품질 정기 확인' },
    { keywords: ['포장', '수량', '출하'], pc: '포장 작업표준서 준수' },
  ],

  // ── 4M → 기본 PC ──
  m4Defaults: {
    MN: '작업자 교육/훈련',
    MC: '설비 점검 및 PM',
    IM: '수입검사 및 자재관리',
    EN: '작업표준서(WI) 개정',
  },

  // ── FM(고장형태) → DC(검출관리) + D값 ──
  dcRules: [
    { keywords: ['미납', '미실장', 'Missing', '누락'], dc: 'AOI (자동광학검사)', d: 3 },
    { keywords: ['오삽', '역삽', '오장착', '극성'], dc: 'AOI + 극성검사', d: 3 },
    { keywords: ['브릿지', 'Bridge', '쇼트'], dc: 'AOI (자동광학검사)', d: 3 },
    { keywords: ['냉납', 'Cold', '접합불량'], dc: 'X-ray 검사', d: 4 },
    { keywords: ['들뜸', 'Tombstone', '맨하탄'], dc: 'AOI (자동광학검사)', d: 3 },
    { keywords: ['단선', 'Open', '통전불량'], dc: 'ICT (In-Circuit Test)', d: 3 },
    { keywords: ['단락', 'Short', '절연불량'], dc: 'ICT (In-Circuit Test)', d: 3 },
    { keywords: ['기능', '미작동', '오작동'], dc: 'FCT (Functional Test)', d: 3 },
    { keywords: ['솔더', '납땜', '리플로우'], dc: 'X-ray 검사', d: 4 },
    { keywords: ['크랙', 'Crack', '파손'], dc: 'X-ray 검사 / 외관검사', d: 4 },
    { keywords: ['치수', '형상', '변형', '편차', '공차'], dc: '치수측정기', d: 4 },
    { keywords: ['외관', '스크래치', '찍힘', '이물'], dc: '비전검사 / AOI', d: 3 },
    { keywords: ['마킹', '라벨', '식별', '인쇄'], dc: '비전검사 (마킹 판독)', d: 3 },
    { keywords: ['전압', '전류', '절연', '내압'], dc: '절연저항계 / 내전압시험기', d: 4 },
    { keywords: ['포장', '수량', '출하'], dc: '바코드 스캐너', d: 3 },
    { keywords: ['ESD', '정전기'], dc: 'ESD 모니터링', d: 5 },
    { keywords: ['오염', '이온', '플럭스', 'Flux'], dc: '이온오염도 측정기', d: 4 },
    { keywords: ['에이징', 'Aging', '번인', 'Burn-in'], dc: '에이징 검사 (기능시험)', d: 3 },
    { keywords: ['불량', '부적합', 'Defect'], dc: '육안 검사', d: 7 },
  ],

  // ── FE(고장영향) → C2(제품기능) 추론 규칙 ──
  c2Rules: [
    { feKeywords: ['단선', 'Open', '통전불량', '미접촉'], productFunction: '전기적 연결 확보' },
    { feKeywords: ['단락', 'Short', '절연불량', '누전'], productFunction: '절연 성능 확보' },
    { feKeywords: ['기능', '미작동', '오작동', '오류'], productFunction: '제품 기능 정상 동작 확보' },
    { feKeywords: ['외관', '스크래치', '찍힘', '파손'], productFunction: '외관 품질 확보' },
    { feKeywords: ['솔더', '납땜', '접합', '크랙'], productFunction: '접합 신뢰성 확보' },
    { feKeywords: ['치수', '형상', '변형', '공차'], productFunction: '치수 정밀도 확보' },
    { feKeywords: ['오삽', '역삽', '극성', '오장착'], productFunction: '부품 실장 정확성 확보' },
    { feKeywords: ['내구', '수명', '열화', '피로'], productFunction: '내구 신뢰성 확보' },
    { feKeywords: ['전압', '전류', '전력', '노이즈'], productFunction: '전기적 특성 확보' },
    { feKeywords: ['오염', '이물', '부식', '산화'], productFunction: '청정도/내식성 확보' },
    { feKeywords: ['포장', '수량', '출하', '납품'], productFunction: '출하 품질 확보' },
  ],

  // ── scope별 기본 제품기능 (FE 매칭 실패 시 fallback) ──
  c2Defaults: {
    YP: ['제품 기본 기능 확보', '전기적 신뢰성 확보', '외관 품질 확보'],
    SP: ['고객 요구사항 충족', '안전 기능 확보'],
    USER: ['사용자 편의성 확보', '사용 안전성 확보'],
  },

  // ── FC(고장원인) → B3(공정특성) 추론 규칙 ──
  charRulesFC: [
    { keywords: ['솔더', '납땜', '리플로우', 'Reflow'], char: '솔더링 조건' },
    { keywords: ['SMT', '마운터', '장착', '실장'], char: '실장 정밀도' },
    { keywords: ['인쇄', '스텐실', 'Stencil', '페이스트'], char: '페이스트 인쇄량' },
    { keywords: ['PCB', '기판', '패턴', '동박'], char: 'PCB 품질' },
    { keywords: ['커넥터', '단자', '핀', '접촉'], char: '접촉 저항' },
    { keywords: ['부품', '칩', 'IC', '저항', '콘덴서'], char: '부품 규격' },
    { keywords: ['온도', '가열', '냉각', '열충격'], char: '온도' },
    { keywords: ['습도', '결로', '흡습', 'MSL'], char: '습도/흡습 레벨' },
    { keywords: ['ESD', '정전기', '방전', '접지'], char: 'ESD 레벨' },
    { keywords: ['코팅', 'Conformal', '방습'], char: '코팅 두께' },
    { keywords: ['압착', '크림프', 'Crimp'], char: '압착 높이' },
    { keywords: ['와이어', '하네스', '배선'], char: '배선 상태' },
    { keywords: ['검사', 'AOI', 'ICT', 'FCT'], char: '검사 정밀도' },
    { keywords: ['교육', '숙련', '미숙', '오작업'], char: '작업자 숙련도' },
    { keywords: ['오염', '이물', '플럭스', 'Flux'], char: '이온오염도' },
    { keywords: ['에이징', 'Aging', '번인', 'Burn-in'], char: '에이징 조건' },
    { keywords: ['몰딩', '에폭시', 'Epoxy', '포팅'], char: '몰딩 조건' },
    { keywords: ['레이저', '마킹', 'Laser'], char: '마킹 품질' },
  ],

  charRulesFM: [
    { keywords: ['미납', '미실장', 'Missing', '누락'], char: '실장 상태' },
    { keywords: ['오삽', '역삽', '오장착', '극성'], char: '부품 극성' },
    { keywords: ['브릿지', 'Bridge', '쇼트'], char: '솔더 상태' },
    { keywords: ['냉납', 'Cold', '접합불량'], char: '접합 강도' },
    { keywords: ['들뜸', 'Tombstone'], char: '부품 실장 상태' },
    { keywords: ['단선', '단락', '절연'], char: '전기적 특성' },
    { keywords: ['치수', '형상', '변형'], char: '치수' },
    { keywords: ['외관', '스크래치', '찍힘'], char: '외관 상태' },
  ],

  charM4Defaults: {
    MN: '작업 조건',
    MC: '설비 조건',
    IM: '자재 규격',
    EN: '공정 조건',
  },

  fallbackPC: '작업 표준 준수 교육',
  fallbackDC: { dc: '육안 검사', d: 7 },
};
