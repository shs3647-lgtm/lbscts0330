/**
 * @file improvementMap.ts
 * @description AIAG-VDA FMEA 1st Edition 기반 예방관리/검출관리 개선 추천 데이터
 *
 * 근거: AIAG-VDA FMEA Handbook 1판 (2019) + 정오표(Errata V2)
 * - 발생도(O): 표P2 기준
 * - 검출도(D): 표P3 기준
 *
 * @created 2026-02-23
 */

// =====================================================
// 인터페이스 정의
// =====================================================

export interface PreventionImprovement {
  currentO: number;
  targetO: number;
  currentControlType: 'none' | 'behavioral' | 'technical' | 'bestPractice';
  recommendations: string[];
  rationale: string;
}

export interface DetectionImprovement {
  currentD: number;
  targetD: number;
  currentMaturity: 'none' | 'unproven' | 'proven' | 'systemProven';
  currentOpportunity: 'none' | 'random' | 'humanManual' | 'machineAssisted' | 'autoDownstream' | 'autoInStation' | 'causeBlock';
  recommendations: string[];
  rationale: string;
}

// =====================================================
// 예방관리 개선 추천 맵 (발생도 O 기반 — 표P2)
// =====================================================

export const PREVENTION_IMPROVEMENT_MAP: Record<string, PreventionImprovement> = {
  'O10': {
    currentO: 10, targetO: 7,
    currentControlType: 'none',
    recommendations: [
      '기본 작업표준서(WI) 수립',
      '작업자 교육 및 자격인증 실시',
      '초·중·종물 검사 도입',
    ],
    rationale: '표P2: 예방관리 없음(O=10) → 행동적 관리 도입으로 다소 효과적(O=7) 달성',
  },
  'O9': {
    currentO: 9, targetO: 6,
    currentControlType: 'behavioral',
    recommendations: [
      '기술적 관리(지그/치공구) 추가 도입',
      '실수방지(Poka-Yoke) 검토',
      '공정 파라미터 모니터링 시작',
    ],
    rationale: '표P2: 행동적 관리(O=9) → 행동적+기술적 혼합(O=6) 달성',
  },
  'O8': {
    currentO: 8, targetO: 5,
    currentControlType: 'behavioral',
    recommendations: [
      '기술적 관리(센서, 자동제어) 도입',
      'SPC 관리도 적용',
      '예방유지보전(PM) 체계 구축',
    ],
    rationale: '표P2: 행동적 관리(O=8) → 기술적 관리 효과적(O=5) 달성',
  },
  'O7': {
    currentO: 7, targetO: 4,
    currentControlType: 'behavioral',
    recommendations: [
      '기술적 관리로 전환 (센서, 자동화 설비)',
      'SPC 공정능력(Cpk) 모니터링',
      '예방유지보전(PM) 주기 강화',
    ],
    rationale: '표P2: 다소 효과적(O=7) → 기술적 관리 효과적(O=4) 달성',
  },
  'O6': {
    currentO: 6, targetO: 4,
    currentControlType: 'behavioral',
    recommendations: [
      '기술적 관리 비중 확대',
      '공정능력(Cpk) 모니터링 도입',
      '도구/설비 수명 관리 체계화',
    ],
    rationale: '표P2: 다소 효과적(O=6) → 기술적 관리 효과적(O=4) 달성',
  },
  'O5': {
    currentO: 5, targetO: 3,
    currentControlType: 'technical',
    recommendations: [
      '모범사례 적용 (교정절차, 실수방지 검증)',
      '공정 모니터링 자동화',
      'SPC 상한/하한 관리 강화',
    ],
    rationale: '표P2: 효과적(O=5) → 모범사례 매우 효과적(O=3) 달성',
  },
  'O4': {
    currentO: 4, targetO: 2,
    currentControlType: 'technical',
    recommendations: [
      '설계적 예방 검토 (부품 형상, 치공구 설계)',
      '실수방지 검증 주기화',
      '예방유지보전 고도화 (예측 정비)',
    ],
    rationale: '표P2: 효과적(O=4) → 모범사례 매우 효과적(O=2) 달성',
  },
  'O3': {
    currentO: 3, targetO: 1,
    currentControlType: 'bestPractice',
    recommendations: [
      '설계/공정 변경으로 고장 원인 자체 제거',
      '물리적으로 불량 생산 불가한 구조 검토',
    ],
    rationale: '표P2: 매우 효과적(O=3) → 설계적 예방으로 원인 제거(O=1)',
  },
  'O2': {
    currentO: 2, targetO: 1,
    currentControlType: 'bestPractice',
    recommendations: [
      '공정/제품 설계 변경으로 원인 완전 제거',
    ],
    rationale: '표P2: 매우 효과적(O=2) → 원인 제거(O=1)',
  },
};

// =====================================================
// 검출관리 개선 추천 맵 (검출도 D 기반 — 표P3)
// =====================================================

export const DETECTION_IMPROVEMENT_MAP: Record<string, DetectionImprovement> = {
  'D10': {
    currentD: 10, targetD: 7,
    currentMaturity: 'none',
    currentOpportunity: 'none',
    recommendations: [
      '검사방법 수립 (최소 육안검사 기준서)',
      '검사 기준서 작성 및 한도견본 준비',
      '기계기반 검사 도입 검토 (비전검사, 센서 등)',
    ],
    rationale: '표P3: 검출불가(D=10) → 기계기반 검출 도입(D=7)',
  },
  'D9': {
    currentD: 9, targetD: 7,
    currentMaturity: 'none',
    currentOpportunity: 'random',
    recommendations: [
      '체계적 검사방법 도입 (산발적→정기적)',
      '검사 주기 및 샘플링 계획 수립',
      '검사 기준 명확화 (합부 판정 기준)',
    ],
    rationale: '표P3: 산발적 심사(D=9) → 체계적 기계기반 검출(D=7)',
  },
  'D8': {
    currentD: 8, targetD: 6,
    currentMaturity: 'unproven',
    currentOpportunity: 'humanManual',
    recommendations: [
      'Gage R&R 실시하여 검사방법 유효성 입증',
      '검사원 교육·자격인증 체계 구축',
      '검사 환경 개선 (조명, 확대경, 한도견본)',
    ],
    rationale: '표P3: 사람검사 미입증(D=8) → 사람검사 입증됨(D=6)',
  },
  'D7': {
    currentD: 7, targetD: 5,
    currentMaturity: 'unproven',
    currentOpportunity: 'machineAssisted',
    recommendations: [
      'Gage R&R 실시하여 검사장비 유효성 입증',
      '검사기 교정·검증 주기 설정',
      '마스터 샘플 검증 체계 구축',
    ],
    rationale: '표P3: 기계기반 미입증(D=7) → 기계기반 입증됨(D=5)',
  },
  'D6': {
    currentD: 6, targetD: 4,
    currentMaturity: 'proven',
    currentOpportunity: 'humanManual',
    recommendations: [
      '기계기반 자동검출로 전환 (비전검사, 자동측정)',
      '자동 합부 판정 시스템 구축',
      '불일치품 자동 분리·격리 시스템 도입',
    ],
    rationale: '표P3: 사람검사 입증됨(D=6) → 후공정 자동검출+유출방지(D=4)',
  },
  'D5': {
    currentD: 5, targetD: 3,
    currentMaturity: 'proven',
    currentOpportunity: 'machineAssisted',
    recommendations: [
      '완전 자동화 인라인 검사 도입',
      '해당 공정 내(In-station) 자동검출 시스템 구축',
      '불일치품 자동 정지·분리 시스템 강화',
    ],
    rationale: '표P3: 기계기반 입증됨(D=5) → 해당공정 내 자동검출(D=3)',
  },
  'D4': {
    currentD: 4, targetD: 3,
    currentMaturity: 'systemProven',
    currentOpportunity: 'autoDownstream',
    recommendations: [
      '후공정 → 해당 공정 내(In-station) 자동검출로 이동',
      '실시간 모니터링 및 이상 시 자동 정지',
    ],
    rationale: '표P3: 후공정 자동검출(D=4) → 해당공정 내 자동검출(D=3)',
  },
  'D3': {
    currentD: 3, targetD: 2,
    currentMaturity: 'systemProven',
    currentOpportunity: 'autoInStation',
    recommendations: [
      '원인 자체를 검출하여 불량 생산 방지 (Poka-Yoke)',
      '실수방지 검증 체계 구축 및 주기적 검증',
    ],
    rationale: '표P3: 해당공정 자동검출(D=3) → 원인검출+생산방지(D=2)',
  },
  'D2': {
    currentD: 2, targetD: 1,
    currentMaturity: 'systemProven',
    currentOpportunity: 'causeBlock',
    recommendations: [
      '설계/공정 변경으로 고장형태 자체를 물리적으로 불가능하게',
    ],
    rationale: '표P3: 원인검출+생산방지(D=2) → 물리적 생산 불가(D=1)',
  },
};

// =====================================================
// AIAG-VDA 기준 목표값 (O vs D 구분)
// =====================================================

/** 발생도(O) 목표값 — AIAG-VDA 표P2 기준 */
const O_TARGET_MAP: Record<number, number> = {
  10: 7, 9: 6, 8: 5, 7: 4, 6: 4, 5: 3, 4: 2, 3: 1, 2: 1,
};

/** 검출도(D) 목표값 — AIAG-VDA 표P3 기준 */
const D_TARGET_MAP: Record<number, number> = {
  10: 7, 9: 7, 8: 6, 7: 5, 6: 4, 5: 3, 4: 3, 3: 2, 2: 1,
};

/**
 * AIAG-VDA 기준 목표 점수 조회
 * - O(발생도): 관리유형 향상 경로에 따른 목표값
 * - D(검출도): 검출방법 성숙도+검출기회 향상 경로에 따른 목표값
 */
export function getTargetScore(current: number, type: 'O' | 'D'): number {
  if (current <= 1) return 1;
  const map = type === 'O' ? O_TARGET_MAP : D_TARGET_MAP;
  return map[current] ?? 1;
}

/**
 * AP = H / M 일 때 개선 우선순위 전략
 * - S ≥ 9: 안전/규제 항목 → 예방+검출 모두 최대 강화
 * - AP = H: O 우선 + D 병행
 * - AP = M: 큰 값 우선 (동일하면 검출 = 비용효율)
 */
export function getImprovementPriority(
  S: number, O: number, D: number, AP: 'H' | 'M'
): { prevention: boolean; detection: boolean; priority: 'both' | 'prevention' | 'detection' } {
  // S ≥ 9: 안전/규제 항목 → 예방+검출 모두 최대 강화
  if (S >= 9) return { prevention: true, detection: true, priority: 'both' };

  if (AP === 'H') {
    if (O >= 7 && D >= 7) return { prevention: true, detection: true, priority: 'prevention' };
    if (O >= 7) return { prevention: true, detection: false, priority: 'prevention' };
    if (D >= 7) return { prevention: false, detection: true, priority: 'detection' };
    return { prevention: O >= D, detection: D >= O, priority: O >= D ? 'prevention' : 'detection' };
  }

  // AP === 'M'
  if (O > D) return { prevention: true, detection: false, priority: 'prevention' };
  if (D > O) return { prevention: false, detection: true, priority: 'detection' };
  return { prevention: false, detection: true, priority: 'detection' }; // 동일하면 검출 (비용효율)
}

/**
 * O/D 값에 대한 개선 추천 조회
 */
export function getImprovementRecommendation(
  value: number, type: 'O' | 'D'
): PreventionImprovement | DetectionImprovement | null {
  if (value <= 1 || value > 10) return null;
  const key = `${type}${value}`;
  if (type === 'O') return PREVENTION_IMPROVEMENT_MAP[key] || null;
  return DETECTION_IMPROVEMENT_MAP[key] || null;
}
