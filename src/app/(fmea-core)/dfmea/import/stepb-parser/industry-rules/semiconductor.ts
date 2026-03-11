/**
 * @file semiconductor.ts
 * @description 반도체 업종 PC/DC 추론 규칙 셋
 *
 * 근거: AIAG-VDA PFMEA + Au Bump Photo 공정 PFMEA 작성법
 * 공정: PR Coating, Expose, Develop, Descum, Etch, Plating, CMP 등
 *
 * @created 2026-03-05
 */

import type { IndustryRuleSet } from '../pc-dc-inference';

export const SEMICONDUCTOR_RULES: IndustryRuleSet = {
  id: 'semiconductor',
  name: '반도체',

  // ── FC(고장원인) → PC(예방관리) ──
  pcRulesFC: [
    { keywords: ['recipe', 'Recipe', '조건', '설정', '파라미터', '레시피'], pc: 'Recipe 관리 및 공정조건 표준화' },
    { keywords: ['설비', '점검', '이상', 'Chamber'], pc: '설비 점검 및 PM' },
    { keywords: ['교육', '숙련', '미숙', '부주의'], pc: '작업자 교육 및 자격관리' },
    { keywords: ['오염', '이물', '세척', '파티클', 'Particle'], pc: '세척/청소 주기 관리' },
    { keywords: ['마모', '수명', '교체', '열화'], pc: '교체주기 관리' },
    { keywords: ['교정', '센서', '카메라', 'MSA'], pc: '교정 및 MSA' },
    { keywords: ['농도', '약액', '현상액', 'Developer'], pc: '약품 농도 관리' },
    { keywords: ['압력', 'Gas', '가스', 'Vacuum', '진공'], pc: '압력/유량 점검' },
    { keywords: ['온도', '가열', '베이크', 'Bake', 'Plasma', '플라즈마'], pc: '공정 온도 프로파일 관리' },
    { keywords: ['정렬', '얼라인', 'Align', '광학', 'Mask'], pc: '설비 정렬 점검' },
    { keywords: ['취급', '스크래치', 'Wafer', '웨이퍼'], pc: '취급 교육 및 보호 장비' },
    { keywords: ['FIFO', 'LOT', '보관', 'Q-Time'], pc: 'FIFO 운영 및 LOT 추적' },
    { keywords: ['도포', '코팅', 'Spin', '스핀'], pc: '정량 관리 및 코팅 조건 표준화' },
    { keywords: ['표준', '미준수', 'WI', '기준서'], pc: '작업자 교육' },
    { keywords: ['금형', '다이', '지그', '척', 'Chuck'], pc: '지그/척 PM 관리' },
    { keywords: ['노광', 'Exposure', 'UV', '광원'], pc: '노광 에너지 관리 및 광원 점검' },
    { keywords: ['현상', 'Develop', '현상시간'], pc: '현상 조건 표준화' },
    { keywords: ['식각', 'Etch', 'Descum'], pc: '식각 조건 관리 및 엔드포인트 모니터링' },
    { keywords: ['증착', 'Deposition', 'CVD', 'PVD', 'Sputter'], pc: '증착 조건 관리' },
    { keywords: ['CMP', '연마', 'Polish'], pc: 'CMP 슬러리/패드 관리' },
  ],

  // ── FM(고장형태) → PC(예방관리) (FC 매칭 실패 시) ──
  pcRulesFM: [
    { keywords: ['Missing', 'missing', '누락', '미형성'], pc: '공정 파라미터 관리 및 설비 점검' },
    { keywords: ['Scratch', 'scratch', '스크래치', '찍힘'], pc: '취급 교육 및 보호 장비' },
    { keywords: ['Spec Out', 'spec out', 'CD', '선폭'], pc: 'SPC 관리도 운영' },
    { keywords: ['Align', 'align', '정렬'], pc: '설비 정렬 점검' },
    { keywords: ['Scum', 'scum', '잔류'], pc: '현상 조건 표준화' },
    { keywords: ['도포', 'Coating', '두께', 'thickness'], pc: '코팅 조건 관리' },
    { keywords: ['변형', 'Deform', '휨', 'Warpage'], pc: '공정 온도 프로파일 관리' },
    { keywords: ['Chipping', 'chipping', '파손', '깨짐'], pc: '취급 교육 및 보호 장비' },
    { keywords: ['Pitting', 'pitting', '핏팅'], pc: '약품 농도 관리' },
    { keywords: ['오염', 'Contamination', 'Particle'], pc: '세척/청소 주기 관리' },
    { keywords: ['Bump', 'bump', '범프', '접촉저항'], pc: '도금 조건 관리' },
  ],

  // ── 4M → 기본 PC ──
  m4Defaults: {
    MN: '작업자 교육 및 WI 준수',
    MC: '설비 점검 및 PM',
    IM: '수입검사 및 자재관리',
    EN: 'Recipe 관리 및 공정조건 표준화',
  },

  // ── FM(고장형태) → DC(검출관리) + D값 ──
  dcRules: [
    { keywords: ['Missing', 'missing', '누락', '미형성'], dc: '패턴 검사 (AOI)', d: 3 },
    { keywords: ['Align', 'align', '정렬', '얼라인', 'Overlay'], dc: '정렬 검사 (Optical Microscope)', d: 4 },
    { keywords: ['Spec Out', 'spec out', 'Size', '선폭', 'CD'], dc: '패턴 CD 측정 (CD-SEM)', d: 4 },
    { keywords: ['Scum', 'scum', '잔류', 'Residue'], dc: '표면 검사 (SEM)', d: 4 },
    { keywords: ['Scratch', 'scratch', '스크래치', '찍힘'], dc: '외관 검사 (AOI)', d: 3 },
    { keywords: ['도포', 'Coating', 'coating', '두께', 'thickness'], dc: '두께 측정 (Profilometer)', d: 4 },
    { keywords: ['경화', 'Cure', 'cure', 'Bake'], dc: '표면 검사 (Optical Microscope)', d: 4 },
    { keywords: ['Deform', 'deform', '변형', '휨', 'Warpage'], dc: '표면 검사 (SEM)', d: 4 },
    { keywords: ['Plating', 'plating', '도금'], dc: '패턴 검사 (Optical Microscope)', d: 4 },
    { keywords: ['Chipping', 'chipping', '파손', '깨짐'], dc: '외관 검사 (AOI)', d: 3 },
    { keywords: ['Pitting', 'pitting', '핏팅'], dc: '표면 검사 (Optical Microscope)', d: 4 },
    { keywords: ['Bump', 'bump', '범프'], dc: '패턴 검사 (AOI)', d: 3 },
    { keywords: ['접촉저항', '저항', 'Resistance'], dc: '접촉저항 측정 (Four Point Probe)', d: 4 },
    { keywords: ['신호', '전기', 'Electrical'], dc: '신호 측정 (Probe Station)', d: 4 },
    { keywords: ['오염', 'Contamination', 'Particle'], dc: '파티클 카운터', d: 4 },
    { keywords: ['Void', 'void', '보이드'], dc: 'X-ray 검사', d: 4 },
    { keywords: ['Crack', 'crack', '크랙'], dc: '외관 검사 (SEM)', d: 4 },
    { keywords: ['식각', 'Etch', '프로파일'], dc: '단면 분석 (SEM/FIB)', d: 5 },
    { keywords: ['불량', '부적합', 'Defect'], dc: '육안 검사', d: 7 },
  ],

  // FE(고장영향) → C2(제품기능) 추론 규칙
  c2Rules: [
    { feKeywords: ['Missing', 'missing', '누락', '미형성'], productFunction: '패턴 형성 완전성 확보' },
    { feKeywords: ['Align', 'align', '정렬', 'Overlay'], productFunction: '정렬 정밀도 확보' },
    { feKeywords: ['Spec Out', 'CD', '선폭', 'Size'], productFunction: '치수 규격 적합성 확보' },
    { feKeywords: ['Scratch', 'scratch', '스크래치'], productFunction: '표면 품질 확보' },
    { feKeywords: ['오염', 'Particle', 'Contamination'], productFunction: '청정도 확보' },
    { feKeywords: ['Void', 'Crack', '크랙', '파손'], productFunction: '구조적 건전성 확보' },
    { feKeywords: ['전기', 'Electrical', '저항', '신호'], productFunction: '전기적 특성 확보' },
    { feKeywords: ['변형', 'Warpage', '휨', 'Deform'], productFunction: '형상 안정성 확보' },
    { feKeywords: ['도포', 'Coating', '두께'], productFunction: '막질/도포 품질 확보' },
  ],

  c2Defaults: {
    YP: ['웨이퍼 품질 확보', '패턴 정밀도 확보', '전기적 특성 확보'],
    SP: ['고객 스펙 충족', '신뢰성 확보'],
    USER: ['최종 제품 기능 확보'],
  },

  // ── FC(고장원인) → B3(공정특성) 추론 규칙 ──
  charRulesFC: [
    { keywords: ['recipe', 'Recipe', '조건', '설정', '파라미터', '레시피'], char: '공정 레시피' },
    { keywords: ['설비', '점검', 'Chamber'], char: '설비 상태' },
    { keywords: ['오염', '이물', '파티클', 'Particle'], char: '청정도' },
    { keywords: ['마모', '수명', '교체', '열화'], char: '소모품 상태' },
    { keywords: ['농도', '약액', '현상액', 'Developer'], char: '약품 농도' },
    { keywords: ['압력', 'Gas', '가스', 'Vacuum', '진공'], char: '압력/유량' },
    { keywords: ['온도', '가열', '베이크', 'Bake', 'Plasma'], char: '온도' },
    { keywords: ['정렬', '얼라인', 'Align', 'Mask'], char: '정렬 정밀도' },
    { keywords: ['도포', '코팅', 'Spin', '스핀'], char: '코팅 두께' },
    { keywords: ['노광', 'Exposure', 'UV', '광원'], char: '노광 에너지' },
    { keywords: ['현상', 'Develop', '현상시간'], char: '현상 조건' },
    { keywords: ['식각', 'Etch', 'Descum'], char: '식각 깊이' },
    { keywords: ['증착', 'Deposition', 'CVD', 'PVD'], char: '증착 두께' },
    { keywords: ['CMP', '연마', 'Polish'], char: '연마 균일도' },
    { keywords: ['교육', '숙련', '미숙', '부주의'], char: '작업자 숙련도' },
  ],

  charRulesFM: [
    { keywords: ['Missing', 'missing', '누락', '미형성'], char: '패턴 형성' },
    { keywords: ['Scratch', 'scratch', '스크래치'], char: '표면 상태' },
    { keywords: ['Spec Out', 'CD', '선폭'], char: 'CD 치수' },
    { keywords: ['Align', 'align', '정렬'], char: '정렬 정밀도' },
    { keywords: ['도포', 'Coating', '두께'], char: '코팅 두께' },
    { keywords: ['변형', 'Warpage', '휨'], char: '형상 정밀도' },
    { keywords: ['오염', 'Contamination', 'Particle'], char: '청정도' },
    { keywords: ['Bump', 'bump', '범프'], char: '범프 높이' },
  ],

  charM4Defaults: {
    MN: '작업 조건',
    MC: '설비 조건',
    IM: '자재 규격',
    EN: '공정 파라미터',
  },

  fallbackPC: '작업 표준 준수 교육',
  fallbackDC: { dc: '육안 검사', d: 7 },
};
