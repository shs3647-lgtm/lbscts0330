/**
 * @file detectionRatingMap.ts
 * @description 검출도(D) AIAG-VDA FMEA Handbook 1st Ed. 보수적(Conservative) 기준 — v3.0
 *
 *   ★ v3.0 (2026-03-02): AIAG-VDA 보수적 기준 전면 적용
 *
 *   D=1  거의 확실히 검출  자동 인터락/Poka-Yoke (사람 개입 無) — 기계 자동 차단
 *   D=2  매우 높은 검출    기계 검출 + 사람 확인 (반자동)
 *   D=3  높은 검출         자동측정/SPC/바코드스캐너 등 기계 기반
 *   D=4  보통 수준 검출    전용 검사기/게이지 전수 또는 샘플링
 *   D=5  보통~낮은 검출    검사기+주기적점검/검교정 (간헐적 모니터링)
 *   D=6  낮은 검출         전수 육안검사/촉감검사 (숙련 작업자)
 *   D=7  매우 낮은 검출    일반 육안검사 (보수적 기준)
 *   D=8~10 검출 거의 불가  검출관리 없음/간접적 확인만
 *
 *   ★ 핵심: 육안검사 ≠ D=1 — 사람 의존 검사 최소 D=6(전수)~D=7(일반)
 *   ★ D=1~2는 기계 자동 검출에만 허용
 *   ★ 검교정은 직접 검출이 아닌 간접 보증 → D=5
 *
 * @created 2026-02-05
 * @updated 2026-03-02 v3.0 AIAG-VDA 보수적 기준 전면 적용
 */

// ═══════════════════════════════════════════
// ★ v3.0: 전체 D등급 허용 (1~10)
// ═══════════════════════════════════════════
/** 고장형태(FM) 검출 허용 등급 */
export const FM_ALLOWED_RATINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
/** 고장원인(FC) 검출 허용 등급 */
export const FC_ALLOWED_RATINGS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export type DetectionTarget = 'fm' | 'fc';

/** D값을 대상별 허용 범위로 clamp (가장 가까운 허용 등급으로 올림) */
export function clampToAllowedRating(d: number, target: DetectionTarget): number {
  const allowed = target === 'fm' ? FM_ALLOWED_RATINGS : FC_ALLOWED_RATINGS;
  if ((allowed as readonly number[]).includes(d)) return d;
  for (const r of allowed) {
    if (r >= d) return r;
  }
  return 0;
}

// ★ 관리활동 필터 비활성화 — 검교정/MSA는 별도 D=5 규칙으로 이동
const MANAGEMENT_KEYWORDS: string[] = [];

interface EquipmentRule {
  keywords: string[];
  dValue: number;
  label: string;
}

const EQUIPMENT_RULES: EquipmentRule[] = [
  // ════════════════════════════════════════
  // D=1: 거의 확실히 검출 — 자동 인터락/Poka-Yoke (사람 개입 無, 기계 자동 차단)
  // ════════════════════════════════════════
  {
    keywords: ['Poka-Yoke', 'poka-yoke', '포카요케', '에러프루프', '실수방지',
               '풀프루프', '인터록', 'interlock', '자동차단', '투입중지',
               '라인정지', '자동정지', '투입방지'],
    dValue: 1,
    label: '자동 인터락/Poka-Yoke (D=1)',
  },

  // ════════════════════════════════════════
  // D=2: 매우 높은 검출 — 기계 검출 + 사람 확인 (반자동)
  // ════════════════════════════════════════
  {
    keywords: ['반자동', '반자동검사', '자동+수동', '기계확인+작업자'],
    dValue: 2,
    label: '기계검출+사람확인 (D=2)',
  },

  // ════════════════════════════════════════
  // D=3: 높은 검출 — 자동측정/SPC/바코드스캐너 등 기계 기반
  // ════════════════════════════════════════
  {
    keywords: ['바코드 스캐너', '바코드스캐너', '바코드 스캔', '바코드스캔',
               'PDA 스캔', 'PDA스캔', 'RFID', 'QR스캐너', 'QR 스캐너',
               '자동분류'],
    dValue: 3,
    label: '자동식별/바코드 (D=3)',
  },
  {
    keywords: ['EOL 검사기', 'EOL검사기', 'EOL 검사', 'EOL검사', 'End-of-Line'],
    dValue: 3,
    label: 'EOL 자동검사 (D=3)',
  },
  {
    // ★ 비전검사 = D=7 (AIAG-VDA: 기계기반 검출, MSA 미입증)
    keywords: ['비전검사', '비전 검사', '카메라 검사기', '카메라검사기',
               '카메라 검사', '카메라검사', '영상검사', '비전 검사기'],
    dValue: 7,
    label: '비전검사 — 기계기반 검출 (D=7)',
  },
  {
    keywords: ['SPC', '관리도', '통계적 관리', 'X-bar', '실시간 모니터링'],
    dValue: 3,
    label: 'SPC 자동측정 (D=3)',
  },
  {
    keywords: ['인라인 검사', 'ICT', '자동검출', 'AOI', 'X-ray'],
    dValue: 3,
    label: '인라인 자동검출 (D=3)',
  },

  // ════════════════════════════════════════
  // D=4: 보통 수준 검출 — 전용 검사기/게이지 전수 또는 샘플링
  // ════════════════════════════════════════
  {
    keywords: ['체결검사기', '체결검사', '체결 검사기', '체결 검사'],
    dValue: 4,
    label: '체결 검사기 (D=4)',
  },
  {
    keywords: ['3차원 측정기', '3차원측정기', 'CMM', 'cmm'],
    dValue: 4,
    label: 'CMM 측정 (D=4)',
  },
  {
    keywords: ['치수측정기', '치수 측정기'],
    dValue: 4,
    label: '치수측정기 (D=4)',
  },
  {
    keywords: ['핀휨 검사기', '핀휨검사기', '핀휨 검사'],
    dValue: 4,
    label: '핀휨 검사기 (D=4)',
  },
  {
    keywords: ['중량측정', '발란스', '중량검사', '중량 측정', '중량측정기'],
    dValue: 4,
    label: '중량/발란스 측정 (D=4)',
  },
  {
    keywords: ['도포검사기', '도포 검사기', '도포검사'],
    dValue: 4,
    label: '도포 검사기 (D=4)',
  },
  {
    keywords: ['절연저항계', '절연저항', '통전검사', '통전 검사'],
    dValue: 4,
    label: '전기 검사 (D=4)',
  },
  {
    keywords: ['기능검사기', '기능 검사기', '기능검사'],
    dValue: 4,
    label: '기능 검사기 (D=4)',
  },
  {
    keywords: ['휘도측정기', '휘도 측정기', '휘도측정'],
    dValue: 4,
    label: '휘도 측정기 (D=4)',
  },
  {
    keywords: ['버전 검사기', '버전검사기', 'SW 버전', 'SW버전'],
    dValue: 4,
    label: 'SW버전 검사기 (D=4)',
  },
  {
    keywords: ['토크검사기', '토크 검사기', '토크검사', '토크 검사'],
    dValue: 4,
    label: '토크 검사기 (D=4)',
  },
  {
    keywords: ['인장시험기', '인장시험', '인장 시험기'],
    dValue: 4,
    label: '인장시험기 (D=4)',
  },
  {
    keywords: ['비파괴검사', '비파괴 검사', 'NDT'],
    dValue: 4,
    label: '비파괴 검사 (D=4)',
  },
  {
    keywords: ['기밀시험기', '기밀시험', '기밀 시험기', '리크테스트', '리크 테스트'],
    dValue: 4,
    label: '기밀/리크 시험기 (D=4)',
  },
  {
    keywords: ['압력게이지', '압력 게이지'],
    dValue: 4,
    label: '압력 게이지 (D=4)',
  },
  {
    keywords: ['경도시험기', '경도시험', '경도 시험기'],
    dValue: 4,
    label: '경도시험기 (D=4)',
  },
  {
    keywords: ['도막두께측정기', '도막두께 측정기', '도막 두께'],
    dValue: 4,
    label: '도막두께 측정 (D=4)',
  },
  {
    keywords: ['금속조직검사', '금속조직 검사', '금속 조직'],
    dValue: 4,
    label: '금속조직 검사 (D=4)',
  },
  {
    keywords: ['암전류측정기', '암전류 측정기', '암전류측정', '암전류 측정'],
    dValue: 4,
    label: '암전류 측정 (D=4)',
  },
  {
    keywords: ['광택도 측정', '광택도측정', '광택 측정'],
    dValue: 4,
    label: '광택도 측정 (D=4)',
  },
  {
    keywords: ['확대경', '확대경검사', '확대경 검사'],
    dValue: 4,
    label: '확대경 검사 (D=4)',
  },
  {
    keywords: ['전류계', '전류 측정'],
    dValue: 4,
    label: '전류 측정 (D=4)',
  },
  {
    keywords: ['핀게이지', '핀 게이지'],
    dValue: 4,
    label: '핀게이지 (D=4)',
  },
  {
    keywords: ['환경측정기', '환경 측정기', '온습도계', '온습도 측정'],
    dValue: 4,
    label: '환경측정기 (D=4)',
  },

  // ════════════════════════════════════════
  // D=5: 보통~낮은 검출 — 검사기+주기적점검/검교정 (간헐적 모니터링)
  // ════════════════════════════════════════
  {
    keywords: ['검교정', 'Calibration', 'calibration', '교정주기', '정기교정',
               '센서 교정', '교정 주기'],
    dValue: 5,
    label: '검교정/Calibration (D=5)',
  },
  {
    keywords: ['주기적 점검', '정기적 점검', '간헐적 모니터링', '주기적 검사'],
    dValue: 5,
    label: '주기적 점검 (D=5)',
  },

  // ════════════════════════════════════════
  // D=6: 낮은 검출 — 전수 육안검사/촉감검사 (숙련 작업자)
  // ════════════════════════════════════════
  {
    keywords: ['토크렌치', '토크 렌치', '디지털 토크렌치'],
    dValue: 6,
    label: '토크렌치/계량형 (D=6)',
  },
  {
    keywords: ['캘리퍼', '마이크로미터', '버니어', '다이얼게이지',
               '하이트게이지', '수동게이지'],
    dValue: 6,
    label: '계량형 계측기 (D=6)',
  },
  {
    keywords: ['전수 육안', '전수육안', '전수검사', '전수 검사',
               '자주검사', '자주 검사'],
    dValue: 6,
    label: '전수 육안검사 (D=6)',
  },

  // ════════════════════════════════════════
  // D=7: 매우 낮은 검출 — 일반 육안검사 (보수적 기준)
  // ════════════════════════════════════════
  {
    keywords: ['한도견본', '한도게이지', '한도 견본', '한도 게이지',
               '통과불통과'],
    dValue: 7,
    label: '한도견본/한도게이지 (D=7)',
  },
  {
    keywords: ['체크리스트', '점검표', '확인표', '점검 체크리스트', '설비점검 체크리스트'],
    dValue: 7,
    label: '체크리스트 기반 확인 (D=7)',
  },
  {
    keywords: ['계수치 MSA', '계수형 MSA', 'Attribute MSA', 'attribute MSA',
               '계수치MSA', '계수형MSA', 'Kappa', 'kappa'],
    dValue: 7,
    label: '계수치 MSA 입증 검사 (D=7)',
  },
  {
    // ★ 보수적 기준: 일반 육안검사 = D=7 (사람 의존, 매우 낮은 검출)
    keywords: ['육안검사', '육안 검사', '육안겈사', '외관검사', '외관 검사',
               '목시', '관능검사', '관능 검사', '촉감검사', '촉감 검사'],
    dValue: 7,
    label: '일반 육안검사 (D=7)',
  },
];

/**
 * DC 텍스트에서 검출방법을 추출하여 D값을 직접 산정
 * ★ v3.0: AIAG-VDA 보수적 기준
 * @param dcText 검출관리 텍스트
 * @param target 'fm' | 'fc' (선택적 허용 등급 제한)
 */
export function recommendDetection(dcText: string, target?: DetectionTarget): number {
  if (!dcText || !dcText.trim()) return 0;

  const methods = dcText.split('\n')
    .map(l => l.replace(/^D[: ]\s*/, '').trim())
    .filter(Boolean);

  if (methods.length === 0) return 0;

  const realMethods: string[] = [];
  let hasManagementOnly = false;

  for (const method of methods) {
    const lower = method.toLowerCase();
    const isMgmt = MANAGEMENT_KEYWORDS.length > 0 &&
      MANAGEMENT_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));

    if (isMgmt) {
      const hasEquipment = EQUIPMENT_RULES.some(rule =>
        rule.keywords.some(kw => lower.includes(kw.toLowerCase()))
      );
      if (hasEquipment) {
        realMethods.push(method);
      } else {
        hasManagementOnly = true;
      }
    } else {
      realMethods.push(method);
    }
  }

  if (realMethods.length === 0 && hasManagementOnly) return 0;
  if (realMethods.length === 0) return 0;

  let bestD = 10;

  for (const method of realMethods) {
    const lower = method.toLowerCase();
    for (const rule of EQUIPMENT_RULES) {
      for (const kw of rule.keywords) {
        if (lower.includes(kw.toLowerCase())) {
          if (rule.dValue < bestD) bestD = rule.dValue;
          break;
        }
      }
    }
  }

  if (bestD >= 10) return 0;
  if (target) return clampToAllowedRating(bestD, target);
  return bestD;
}

/**
 * 검출관리 텍스트 기반 검출도 추천 상세 정보
 */
export function getDetectionRecommendation(dcText: string): {
  recommendedD: number;
  matchedLabel: string;
  description: string;
} {
  if (!dcText || !dcText.trim()) {
    return { recommendedD: 0, matchedLabel: '', description: 'DC 텍스트 없음' };
  }

  const methods = dcText.split('\n')
    .map(l => l.replace(/^D[: ]\s*/, '').trim())
    .filter(Boolean);

  const realMethods: string[] = [];

  for (const method of methods) {
    const lower = method.toLowerCase();
    const isMgmt = MANAGEMENT_KEYWORDS.length > 0 &&
      MANAGEMENT_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
    if (isMgmt) {
      const hasEquipment = EQUIPMENT_RULES.some(rule =>
        rule.keywords.some(kw => lower.includes(kw.toLowerCase()))
      );
      if (hasEquipment) realMethods.push(method);
    } else {
      realMethods.push(method);
    }
  }

  if (realMethods.length === 0) {
    return { recommendedD: 0, matchedLabel: '', description: '검출장비 미매칭 → 추천 없음' };
  }

  let bestD = 10;
  let bestLabel = '';

  for (const method of realMethods) {
    const lower = method.toLowerCase();
    for (const rule of EQUIPMENT_RULES) {
      for (const kw of rule.keywords) {
        if (lower.includes(kw.toLowerCase())) {
          if (rule.dValue < bestD) {
            bestD = rule.dValue;
            bestLabel = rule.label;
          }
          break;
        }
      }
    }
  }

  if (bestD < 10) {
    return { recommendedD: bestD, matchedLabel: bestLabel, description: `${bestLabel} → D=${bestD}` };
  }

  return { recommendedD: 0, matchedLabel: '', description: '키워드 미매칭 → 추천 없음' };
}
