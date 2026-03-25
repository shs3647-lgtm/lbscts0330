/**
 * @file occurrenceRecommendMap.ts
 * @description 설계검증 예방(PC) → 발생도(O) 자동추천 매트릭스 — v2.1
 *
 * AIAG-VDA FMEA Handbook 1판, 표P2 기준 + v2.1 한국 제조업 보정
 * - 관리유형: designPrevent > bestPractice > technical > systematic > none
 * - ★ v2.1: behavioral 삭제 → systematic 통합, 검교정 bestPractice 추가
 * - ★ v2.1: O≥5 추천 대상 제외 → none 처리
 *
 * @created 2026-02-23
 * @updated 2026-02-26 v2.1 전면 개편
 */

// =====================================================
// 인터페이스
// =====================================================

export type PCControlType =
  | 'none'            // 설계검증 예방 없음 → 추천 제외
  | 'systematic'      // 체계적 관리 (교육, 표준, 체크리스트, 역량인증) → O=4
  | 'technical'       // 기술적 관리 (센서, PLC, Poka-Yoke 등) → O=3~4
  | 'bestPractice'    // 모범사례 (SPC, 검교정, PM + 기술적) → O=2~3
  | 'designPrevent';  // 설계/공정으로 원인 제거 → O=1

export interface OccurrenceRecommendation {
  controlType: PCControlType;
  effectiveness: string;
  recommendedO: number[];
  description: string;
}

// =====================================================
// O 추천 테이블 — v2.1 개편
// =====================================================

export const O_RECOMMENDATION_TABLE: OccurrenceRecommendation[] = [
  {
    controlType: 'none',
    effectiveness: '추천 없음',
    recommendedO: [],
    description: '키워드 미매칭 → 추천 제외 (사용자 직접 입력)',
  },
  {
    controlType: 'systematic',
    effectiveness: '체계적 관리',
    recommendedO: [4],
    description: '체계적 관리 (표준/교육/역량인증) → O=4',
  },
  {
    controlType: 'technical',
    effectiveness: '효과적',
    recommendedO: [4, 3],
    description: '기술적 관리, 효과적 → O=3~4',
  },
  {
    controlType: 'bestPractice',
    effectiveness: '매우 효과적',
    recommendedO: [3, 2],
    description: '모범사례(SPC/검교정/PM), 매우 효과적 → O=2~3',
  },
  {
    controlType: 'designPrevent',
    effectiveness: '물리적 생산 불가',
    recommendedO: [1],
    description: '설계/공정으로 원인 제거, 물리적 생산 불가 → O=1',
  },
];

// =====================================================
// 설계검증 예방 키워드 → 관리유형 판단 테이블 — v2.1 개편
// =====================================================

export const PC_CONTROL_TYPE_KEYWORDS: Record<PCControlType, string[]> = {
  none: [],
  systematic: [
    '작업표준서', 'WI', '기술표준', '품질표준', '검사표준', '관리표준',
    '역량인증', '자격인증', '숙련도 인증', '작업자 인증',
    '정기 교육', 'OJT', '숙련도 평가', '교육훈련', '교육', '훈련',
    '체크리스트', '점검표', '확인표', '절차서',
    '이종자재', '이종품', '혼입방지', '식별교육', '식별표시',
    '작업표준', '표준작업', '숙련도', '인수인계',
    '유효기간', '관리 체계', '판정', '검사',
  ],
  technical: [
    '센서', '자동', 'PLC', '모니터링', 'Poka-Yoke', '실수방지',
    '에러프루핑', '인터록', '자동정지', '카운터', '바코드',
    '비전', '카메라', '자동검출', '설비', '에어블로우', '집진',
    '필터', '파라미터', '설정값', '이력 관리', '설비 점검',
  ],
  bestPractice: [
    'SPC', '관리도', 'Cpk', 'PM', '예방유지보전', 'TPM',
    '지그설계', '치공구설계', '금형관리', 'FMEA', '공정능력',
    '검교정', 'Calibration', 'MSA', 'Gage R&R', 'GR&R',
    '교정', '교정주기',
  ],
  designPrevent: [
    '설계변경', '형상변경', '구조변경', '물리적 방지', '원인 제거',
  ],
};

// =====================================================
// 헬퍼 함수
// =====================================================

/**
 * 설계검증 예방 텍스트에서 관리유형 판단
 * - 여러 유형이 매칭되면 가장 높은 등급(효과적인) 유형 반환
 * - 등급: designPrevent > bestPractice > technical > systematic > none
 *
 * ★ v2.1: 키워드 미매칭 시 'none' 반환 (behavioral 삭제)
 */
export function analyzePCControlType(pcText: string): {
  controlType: PCControlType;
  effectiveness: string;
} {
  if (!pcText || !pcText.trim()) {
    return { controlType: 'none', effectiveness: '추천 없음' };
  }

  // ★ 접두사 제거: P: 자동추천 + m4 카테고리 (MC_, MN_, IM_, EN_)
  const lower = pcText.toLowerCase()
    .replace(/^p[: ]\s*/gm, '')
    .replace(/^(mn|mc|im|en)_\s*/gm, '')
    .trim();

  const types: PCControlType[] = ['designPrevent', 'bestPractice', 'technical', 'systematic'];

  for (const type of types) {
    const keywords = PC_CONTROL_TYPE_KEYWORDS[type];
    if (keywords.some(kw => lower.includes(kw.toLowerCase()))) {
      const rec = O_RECOMMENDATION_TABLE.find(r => r.controlType === type);
      return {
        controlType: type,
        effectiveness: rec?.effectiveness || '',
      };
    }
  }

  return { controlType: 'none', effectiveness: '추천 없음' };
}

/**
 * 설계검증 예방 텍스트 기반 발생도(O) 추천
 * ★ v2.1: none일 경우 0 반환 (추천 없음)
 */
export function recommendOccurrence(pcText: string): number {
  const { controlType } = analyzePCControlType(pcText);
  const rec = O_RECOMMENDATION_TABLE.find(r => r.controlType === controlType);

  if (!rec || rec.recommendedO.length === 0) return 0;

  return rec.recommendedO[0];
}

/**
 * 설계검증 예방 텍스트 기반 발생도 추천 O 범위
 */
export function getOccurrenceRecommendation(pcText: string): {
  controlType: PCControlType;
  recommendedO: number[];
  description: string;
} {
  const { controlType } = analyzePCControlType(pcText);
  const rec = O_RECOMMENDATION_TABLE.find(r => r.controlType === controlType);

  if (!rec) {
    return {
      controlType: 'none',
      recommendedO: [],
      description: '키워드 미매칭 → 추천 제외',
    };
  }

  return {
    controlType: rec.controlType,
    recommendedO: rec.recommendedO,
    description: rec.description,
  };
}
