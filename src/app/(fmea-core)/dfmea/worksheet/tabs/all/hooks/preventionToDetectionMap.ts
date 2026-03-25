/**
 * @file preventionToDetectionMap.ts
 * @description 설계검증 예방(PC) → 설계검증 검출(DC) 연계 규칙 — v2.1
 *
 * ★ v2.1 변경:
 *   - 11→12개 규칙 (이종자재 규칙 추가)
 *   - 검교정→실측장비 D=4 연계로 변경
 *   - 모든 연계 DC의 D≤4 보장
 *
 * @created 2026-02-23
 * @updated 2026-02-26 v2.1 전면 보정
 */

export interface PCToDCRule {
  pcKeywords: string[];
  detectionMethods: string[];
  priority: number;
}

export const PC_TO_DC_RULES: PCToDCRule[] = [
  // 1. 교육/훈련/OJT → 자동검사 시스템으로 검증
  {
    pcKeywords: ['교육', '훈련', '숙련도', 'OJT', '자격인증'],
    detectionMethods: [
      'P:비전검사',
      'P:자동검사 시스템',
      'P:기능검사기',
    ],
    priority: 1,
  },
  // 2. 작업표준서/WI → PLC 모니터링, 자동검사
  {
    pcKeywords: ['작업표준서', 'WI', '표준작업', '작업지침'],
    detectionMethods: [
      'P:PLC 모니터링',
      'P:자동검사',
      'P:공정감사(LPA) 기록',
    ],
    priority: 2,
  },
  // 3. PM/정기점검/TPM → 설비 파라미터 모니터링
  {
    pcKeywords: ['예방유지보전', 'PM', '일상점검', '시업점검', '정기점검', 'TPM'],
    detectionMethods: [
      'P:설비 파라미터 모니터링(PLC)',
      'P:비전검사',
    ],
    priority: 3,
  },
  // 4. 검교정/MSA → 해당 계측장비 실측검사 D=4
  {
    pcKeywords: ['교정', 'Calibration', '검교정', 'Gage R&R', 'MSA'],
    detectionMethods: [
      'P:해당 계측장비 실측검사(CMM/치수측정기)',
    ],
    priority: 4,
  },
  // 5. SPC/관리도/Cpk → 자동 SPC 시스템
  {
    pcKeywords: ['SPC', '관리도', 'Cpk', '공정능력', '통계적'],
    detectionMethods: [
      'P:자동 SPC 시스템 모니터링',
      'P:비전검사',
    ],
    priority: 5,
  },
  // 6. Poka-Yoke/에러프루핑 → 자동 작동확인
  {
    pcKeywords: ['실수방지', 'Poka-Yoke', '에러프루핑', '풀프루프'],
    detectionMethods: [
      'P:Poka-Yoke 작동확인(자동)',
      'P:마스터 검증(자동)',
    ],
    priority: 6,
  },
  // 7. 파라미터/설정값/레시피 → PLC 모니터링
  {
    pcKeywords: ['파라미터', '설정값', '조건', '레시피', '압력', '온도', '시간'],
    detectionMethods: [
      'P:PLC 모니터링',
      'P:파라미터 자동기록',
    ],
    priority: 7,
  },
  // 8. 수입검사/IQC/PPAP → 자동판정
  {
    pcKeywords: ['수입검사', 'IQC', '공급업체', 'SQA', 'COC', 'PPAP'],
    detectionMethods: [
      'P:수입검사 자동판정(비전/기능)',
      'P:CMM',
    ],
    priority: 8,
  },
  // 9. 선입선출/FIFO/LOT → 바코드/QR 스캔
  {
    pcKeywords: ['선입선출', 'FIFO', 'LOT', '유효기한', '보관'],
    detectionMethods: [
      'P:바코드/QR 스캔',
      'P:PDA 스캔',
    ],
    priority: 9,
  },
  // 10. 토크/체결/스크류 → 토크검사기
  {
    pcKeywords: ['토크', '체결', '스크류', '볼트'],
    detectionMethods: [
      'P:토크검사기',
      'P:디지털 토크렌치',
    ],
    priority: 10,
  },
  // 11. 도포/디스펜서/그리스 → 중량측정, 비전검사
  {
    pcKeywords: ['도포', '도포량', '디스펜서', '노즐', '그리스'],
    detectionMethods: [
      'P:중량측정',
      'P:비전검사',
    ],
    priority: 11,
  },
  // 12. ★ v2.1 신규: 이종자재/혼입방지/식별 → 바코드, 비전검사
  {
    pcKeywords: ['이종자재', '혼입방지', '식별', '이종품'],
    detectionMethods: [
      'P:바코드 스캐너',
      'P:비전검사',
    ],
    priority: 12,
  },
];

/**
 * PC 텍스트에서 매칭되는 PC→DC 연계 규칙 조회
 */
export function matchPCToDCRules(pcText: string): string[] {
  if (!pcText) return [];
  const lower = pcText.toLowerCase();

  const matched = PC_TO_DC_RULES
    .filter(rule => rule.pcKeywords.some(kw => lower.includes(kw.toLowerCase())))
    .sort((a, b) => a.priority - b.priority);

  const seen = new Set<string>();
  const result: string[] = [];
  for (const rule of matched) {
    for (const method of rule.detectionMethods) {
      if (!seen.has(method)) {
        seen.add(method);
        result.push(method);
      }
    }
  }
  return result;
}

/**
 * A6 후보에 PC→DC 연계 부스팅 적용
 */
export function boostByPCLinkage<T extends { value: string }>(
  pcText: string,
  candidates: T[],
): T[] {
  if (candidates.length <= 1 || !pcText) return candidates;

  const linkedMethods = matchPCToDCRules(pcText);
  if (linkedMethods.length === 0) return candidates;

  const keywords = linkedMethods.map(m => {
    const clean = m.startsWith('P:') ? m.slice(2) : m;
    return clean.toLowerCase();
  });

  return [...candidates].sort((a, b) => {
    const scoreA = pcLinkageScore(a.value, keywords);
    const scoreB = pcLinkageScore(b.value, keywords);
    return scoreB - scoreA;
  });
}

function pcLinkageScore(a6Value: string, linkedKeywords: string[]): number {
  const valLower = a6Value.toLowerCase();
  let score = 0;

  for (const keyword of linkedKeywords) {
    const tokens = keyword.split(/[\s/()]+/).filter(t => t.length >= 2);
    for (const token of tokens) {
      if (valLower.includes(token)) {
        score += 5;
      }
    }
  }

  return score;
}
