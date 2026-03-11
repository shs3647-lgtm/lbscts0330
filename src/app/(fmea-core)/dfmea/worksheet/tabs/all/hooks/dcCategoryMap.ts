/**
 * @file dcCategoryMap.ts
 * @description DC추천2 — 검출관리 성숙도 향상 기반 고장원인 개선방법 (v3)
 *   AIAG-VDA FMEA Handbook 1st Ed. D-FMEA Detection Rating Table 근거
 *   18개 카테고리 키워드 매칭 → 개선방법 매핑 → D등급 태그 부착
 * @created 2026-02-05
 */

export type DCCategory =
  | 'PARAM_DEVIATION' | 'WEAR_LIFE' | 'EQUIPMENT_FAIL' | 'CALIBRATION'
  | 'SENSOR_INSPECT' | 'JIG_MOLD' | 'FASTENING' | 'DISPENSING'
  | 'WELDING' | 'MISJUDGMENT' | 'OMISSION' | 'MIX_UP'
  | 'HANDLING' | 'SETUP' | 'ENVIRONMENT' | 'PACKAGING'
  | 'HUMAN_SKILL' | 'CONTAMINATION' | 'FALLBACK';

interface CategoryRule {
  id: DCCategory;
  keywords: string[];
}

const CATEGORY_RULES: CategoryRule[] = [
  { id: 'PARAM_DEVIATION', keywords: ['설정값', '파라미터', '조건이탈', '기준이탈', '레시피', '전류', '전압', '압력', '온도이탈', '속도', '유량', '토크값'] },
  { id: 'WEAR_LIFE', keywords: ['마모', '수명', '열화', '노후', '피로', '교체주기', '소모품', '드레싱'] },
  { id: 'EQUIPMENT_FAIL', keywords: ['오작동', '고장', '이상', '정지', '에러', '알람', '파손', '설비변형', '설비손상'] },
  { id: 'CALIBRATION', keywords: ['교정', '검교정', '정도', 'MSA', 'Gage', '마스터', '유효기간'] },
  { id: 'SENSOR_INSPECT', keywords: ['센서', '카메라', '비전', '검사기', '스캐너', '인식', '바코드', 'EOL', '측정기', '검사오류'] },
  { id: 'JIG_MOLD', keywords: ['지그', '금형', '클램프', '고정', '다이', '몰드', '캐비티', '치구', '가이드'] },
  { id: 'FASTENING', keywords: ['토크', '체결', '풀림', '나사', '볼트', '너트', '조립', '삽입', '장착', '부품누락'] },
  { id: 'DISPENSING', keywords: ['도포', '그리스', '접착', '실란트', '디스펜서', '노즐', '코팅', '도막'] },
  { id: 'WELDING', keywords: ['용접', '너겟', '스패터', '전극', '팁', '납땜', '솔더', '브레이징'] },
  { id: 'MISJUDGMENT', keywords: ['오판정', '오판', '합격', '불합격', '판정오류'] },
  { id: 'OMISSION', keywords: ['누락', '미실시', '미검사', '미점검', '미체결', '미삽입', '미장착', '빠짐', '미부착'] },
  { id: 'MIX_UP', keywords: ['이종', '혼입', '혼동', '오투입', '품번', '품명', '사양불일치', '식별'] },
  { id: 'HANDLING', keywords: ['운반', '이송', '낙하', '충격', '적재', '자재손상', '자재파손'] },
  { id: 'SETUP', keywords: ['셋업', '세팅', '조정', '원점', '위치', '프로그램'] },
  { id: 'ENVIRONMENT', keywords: ['온도', '습도', '항온항습', '정전기', 'ESD', '이물', '분진', '먼지', '청정', '풍속', '결로', '환경'] },
  { id: 'PACKAGING', keywords: ['포장', '수량', '라벨', '출하', '선입선출', 'FIFO', 'LOT'] },
  { id: 'HUMAN_SKILL', keywords: ['숙련', '교육', '미숙', '훈련', '부주의', '작업자', '검사원', '작업표준', '절차', '작업방법'] },
  { id: 'CONTAMINATION', keywords: ['세척', '오염', '청소', '이물질'] },
];

const CATEGORY_IMPROVEMENT: Record<DCCategory, string> = {
  PARAM_DEVIATION: '공정 파라미터 실시간 자동모니터링 → 기준이탈 시 자동정지(인터록) → 해당 제품 자동격리',
  WEAR_LIFE: '소모품 잔여수명 자동카운터 모니터링 → 한계도달 시 자동정지·교체알람 → 한계초과 생산품 자동격리',
  EQUIPMENT_FAIL: '설비상태 자동감시(이상감지 센서) → 이상발생 시 자동정지 → 이상구간 생산품 자동식별·격리',
  CALIBRATION: '측정기/검사기 자동교정확인(마스터 자동검증 사이클) → 교정이탈 시 자동정지 → 미교정구간 생산품 추적·격리',
  SENSOR_INSPECT: '검출장비 자기진단(자동 정도확인) → 이상 시 자동정지 → 이상구간 생산품 자동격리',
  JIG_MOLD: '치공구 장착상태 자동확인(센서) → 미장착/이탈 시 공정 자동정지(인터록) → 이탈구간 제품 격리',
  FASTENING: '체결 완료 자동확인(토크/각도 센서) → 미체결·규격이탈 시 자동정지 → NG품 자동분류·배출',
  DISPENSING: '도포량/도포상태 자동계측(중량/비전) → 규격이탈 시 자동정지 → NG품 자동분류·배출',
  WELDING: '접합 파라미터 실시간 자동감시 → 규격이탈 시 자동정지·알람 → 이탈구간 제품 자동격리',
  MISJUDGMENT: '자동판정 시스템(센서/비전) 도입 → 판정결과 자동검증(이중확인) → 불일치 시 라인정지·재검사',
  OMISSION: '공정완료 자동확인(센서/에러프루프) → 미완료 시 다음공정 진행 자동차단(인터록) → 미처리품 자동격리',
  MIX_UP: '자재/부품 자동식별(바코드/RFID 에러프루프) → 불일치 시 공정 자동정지 → 혼입의심품 자동격리',
  HANDLING: '이송/운반 자동화(컨베이어/가이드) → 이상하중·충격 자동감지 시 정지 → 손상의심품 자동격리',
  SETUP: '셋업값 자동입력·자동검증(레시피 관리) → 셋업이탈 시 공정 자동정지(인터록) → 초품 자동검증 후 진행',
  ENVIRONMENT: '환경조건 실시간 자동모니터링(센서) → 기준이탈 시 공정 자동정지 → 이탈구간 생산품 격리',
  PACKAGING: '자동계수/자동라벨링(중량·비전) → 수량/식별 불일치 시 자동정지 → 불일치품 자동격리',
  HUMAN_SKILL: '자동화/에러프루프 전환으로 작업자 의존도 제거 → 공정순서 인터록 → 비정상 시 자동정지·제품격리',
  CONTAMINATION: '오염도 자동모니터링(센서/파티클카운터) → 기준초과 시 자동정지 → 오염구간 생산품 격리',
  FALLBACK: '공정상태 자동모니터링 → 이상발생 시 자동정지(인터록) → 해당 제품 라인에서 자동격리',
};

interface DGradeTag {
  tag: string;
  label: string;
}

export function getDGradeTag(dValue: number): DGradeTag {
  if (dValue >= 8) return { tag: `D${dValue}`, label: '검출체계 구축' };
  if (dValue >= 6) return { tag: `D${dValue}`, label: '효과성 검증' };
  if (dValue >= 4) return { tag: `D${dValue}`, label: '자동분류/정지' };
  if (dValue === 3) return { tag: `D${dValue}`, label: '자동배출' };
  if (dValue >= 1) return { tag: `D${dValue}`, label: '에러프루프' };
  return { tag: 'D?', label: '미평가' };
}

/**
 * FC+PC 결합 텍스트에서 카테고리를 분류 (번호가 작을수록 우선)
 */
export function classifyFC(fcText: string, pcText: string): DCCategory {
  const combined = `${fcText} ${pcText}`.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      if (combined.includes(kw.toLowerCase())) {
        return rule.id;
      }
    }
  }
  return 'FALLBACK';
}

/**
 * DC추천2 전체 생성: 카테고리 분류 → 개선방법 + D등급 태그
 * @returns "[D등급:태그]P_개선방법" 형식
 */
export function generateDCRec2(fcText: string, pcText: string, dValue: number): string {
  const category = classifyFC(fcText, pcText);
  const improvement = CATEGORY_IMPROVEMENT[category];
  const grade = getDGradeTag(dValue);
  return `[${grade.tag}:${grade.label}]P_${improvement}`;
}

export { CATEGORY_RULES, CATEGORY_IMPROVEMENT };
