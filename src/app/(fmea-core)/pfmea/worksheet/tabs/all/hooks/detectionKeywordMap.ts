/**
 * @file detectionKeywordMap.ts
 * @description FM(고장형태) → DC(검출관리) 키워드 기반 매칭 테이블 — v2.2
 *
 * ★ v2.2 변경: 검출관리작성기준 v1.1 반영
 *   - 색차계, XRF 합금분석기, 초음파탐상기, 소음측정기 등 신규 장비 추가
 *   - 한계견본 전수 육안은 D=6 (사람 의존 최선)
 *   - 마이크로미터/버니어 = D=5 (검교정 보증)
 *
 * @created 2026-02-23
 * @updated 2026-03-09 v2.2 검출관리작성기준 v1.1 반영
 */

export interface DetectionRule {
  fmKeywords: string[];
  primaryMethods: string[];
  secondaryMethods: string[];
  priority: number;
}

export const FM_TO_DC_RULES: DetectionRule[] = [
  // 1. 사양/품번/규격 관련
  {
    fmKeywords: ['사양', '품명', '품번', '규격', '버전', '모델', '식별', '라벨', '표시'],
    primaryMethods: ['바코드 스캐너', 'PDA 스캔', '버전 검사기'],
    secondaryMethods: ['비전검사'],
    priority: 1,
  },
  // 1-1. 이종재질/재질 관련 (v2.2 신규)
  {
    fmKeywords: ['이종', '이종재질', '재질', '재질 불량', '성분', '합금'],
    primaryMethods: ['XRF 합금분석기', '성분분석기'],
    secondaryMethods: ['바코드 스캐너'],
    priority: 1,
  },
  // 2. 휘도/점등/영상/LED/디스플레이
  {
    fmKeywords: ['휘도', '점등', '영상', '암전류', '밝기', '광도', '발광', 'LED', '화면', '디스플레이', '표시장치'],
    primaryMethods: ['EOL 검사기', '휘도측정기'],
    secondaryMethods: ['비전검사'],
    priority: 2,
  },
  // 3. 치수/형상/변형/공차
  {
    fmKeywords: ['치수', '형상', 'PV값', 'PV', '변형', '편차', '공차', '두께', '높이', '폭', '길이', '간격', '갭'],
    primaryMethods: ['치수측정기', 'CMM'],
    secondaryMethods: ['핀게이지'],
    priority: 3,
  },
  // 4. 핀휨/단자/커넥터 핀
  {
    fmKeywords: ['핀휨', '핀 휨', '핀', '단자', '커넥터 핀', '리드'],
    primaryMethods: ['핀휨 검사기', '비전검사'],
    secondaryMethods: ['AOI'],
    priority: 4,
  },
  // 5. 미작동/오작동/기능/NVH/소음/진동
  {
    fmKeywords: ['미작동', '오작동', '동작', '이음', '소음', '진동', '기능', '작동', 'NVH'],
    primaryMethods: ['기능검사기', 'EOL 검사기', '소음측정기'],
    secondaryMethods: ['통전검사', 'NVH 분석기'],
    priority: 5,
  },
  // 6. 도포/그리스/접착
  {
    fmKeywords: ['도포', '그리스', '접착', '실란트', '도포량', '도포상태', '도포위치'],
    primaryMethods: ['중량측정', '도포검사기'],
    secondaryMethods: ['비전검사'],
    priority: 6,
  },
  // 7. 조립/체결/토크/누락
  {
    fmKeywords: ['조립', '체결', '누락', '토크', '풀림', '미체결', '오삽입', '미삽입', '역삽입', '장착'],
    primaryMethods: ['토크검사기', '체결검사기'],
    secondaryMethods: ['바코드 스캐너'],
    priority: 7,
  },
  // 8. 외관/파손/이물/스크래치
  {
    fmKeywords: ['외관', '파손', '이물', '스크래치', '긁힘', '찍힘', '흠집', '크랙', '균열', '덴트', '버', 'S/C'],
    primaryMethods: ['비전검사', 'AOI'],
    secondaryMethods: ['확대경검사'],
    priority: 8,
  },
  // 9. 균일도/얼룩/색상/변색
  {
    fmKeywords: ['균일도', '얼룩', '색상', '색차', '변색', '무라', '색상 편차'],
    primaryMethods: ['색차계', '비전검사'],
    secondaryMethods: ['EOL 검사기', '휘도측정기'],
    priority: 9,
  },
  // 10. 포장/수량/출하/선입선출
  {
    fmKeywords: ['포장', '수량', '출하', '납품', '적재', '선입선출', 'FIFO'],
    primaryMethods: ['바코드 스캐너', '중량검사'],
    secondaryMethods: ['PDA 스캔'],
    priority: 10,
  },
  // 11. 산화/습도/오염/부식
  {
    fmKeywords: ['산화', '습도', '오염', '온도', '결로', '부식', '녹', '환경'],
    primaryMethods: ['환경측정기', '비전검사'],
    secondaryMethods: ['시스템 검증'],
    priority: 11,
  },
  // 12. 마스터/미검출/불량판정/MSA
  {
    fmKeywords: ['마스터', '미검출', '불량판정', '오판', '검출률', 'MSA', '반복성', '재현성'],
    primaryMethods: ['기능검사기', 'AOI'],
    secondaryMethods: ['비전검사'],
    priority: 12,
  },
  // 13. 용접/너겟/스패터/인장
  {
    fmKeywords: ['용접', '너겟', '스패터', '비드', '용접강도', '접합', '인장', '용접 불량'],
    primaryMethods: ['초음파탐상기', '인장시험기', '비파괴검사'],
    secondaryMethods: ['X-ray', '용접 비전검사기'],
    priority: 13,
  },
  // 13-1. 나사산/탭핑 (v2.2 신규)
  {
    fmKeywords: ['나사산', '탭핑', '나사 불량', 'GO/NO-GO'],
    primaryMethods: ['나사산 GO/NO-GO 게이지'],
    secondaryMethods: ['체결검사기'],
    priority: 13,
  },
  // 14. 누설/기밀/리크/누출
  {
    fmKeywords: ['누설', '누유', '기밀', '리크', '누출'],
    primaryMethods: ['리크검사기', '기밀시험기'],
    secondaryMethods: ['압력게이지'],
    priority: 14,
  },
  // 15. 전압/전류/합선/단선/절연
  {
    fmKeywords: ['전압', '전류', '저항', '합선', '단선', '절연', '통전', '단락'],
    primaryMethods: ['절연저항계', '통전검사', 'EOL 검사기'],
    secondaryMethods: ['ICT'],
    priority: 15,
  },
  // 16. 압력/유압/공압/진공
  {
    fmKeywords: ['압력', '유압', '공압', '에어압', '진공', '압력이탈', '기준이탈', '압력부족', '압력과다'],
    primaryMethods: ['압력게이지', '기밀시험기'],
    secondaryMethods: ['리크테스트'],
    priority: 16,
  },
  // 17. 설비이상/파라미터/조건이탈
  {
    fmKeywords: ['설비이상', '파라미터', '조건이탈', '설정값', '도포기', '펌프', '모터', '실린더', '밸브'],
    primaryMethods: ['PLC 모니터링', '파라미터 기록'],
    secondaryMethods: ['비전검사'],
    priority: 17,
  },
  // 18. 경도/강도/물성/피로
  {
    fmKeywords: ['경도', '강도', '물성', '인장강도', '피로', '경화', '취성'],
    primaryMethods: ['경도시험기', '인장시험기'],
    secondaryMethods: ['금속조직검사'],
    priority: 18,
  },
  // 19. HUD/헤드업/미러/렌즈
  {
    fmKeywords: ['HUD', '헤드업', '미러', '비구면', '렌즈', '커버렌즈'],
    primaryMethods: ['EOL 검사기', '비전검사'],
    secondaryMethods: ['휘도측정기'],
    priority: 19,
  },
  // 20. PCB/SMT/솔더/납땜
  {
    fmKeywords: ['PCB', 'SMT', '솔더', '납땜', '실장', 'BGA', 'IC'],
    primaryMethods: ['AOI', 'X-ray 검사'],
    secondaryMethods: ['ICT'],
    priority: 20,
  },
  // 21. 사출/프레스/성형/싱크마크
  {
    fmKeywords: ['사출', '프레스', '성형', '버', '웰드라인', '싱크마크', '쇼트'],
    primaryMethods: ['치수검사', '중량 측정'],
    secondaryMethods: ['비전검사'],
    priority: 21,
  },
  // 22. 도장/코팅/도막/박리/도금
  {
    fmKeywords: ['도장', '코팅', '도막', '박리', '기포', '흘러내림', '오렌지필', '도금', '도금두께'],
    primaryMethods: ['도막두께계', '도막두께 측정기', '부착력 테스트'],
    secondaryMethods: ['광택도 측정', '색차계'],
    priority: 22,
  },
  // 23. 열처리/담금질/침탄/질화
  {
    fmKeywords: ['열처리', '담금질', '뜨임', '침탄', '질화', '고주파'],
    primaryMethods: ['경도시험기', '금속조직 검사'],
    secondaryMethods: ['인장시험기'],
    priority: 23,
  },
  // 24. 암전류/대기전류/소비전력
  {
    fmKeywords: ['암전류', '대기전류', '소비전력', '전력소모'],
    primaryMethods: ['암전류 측정기', 'EOL 검사기'],
    secondaryMethods: ['전류계 측정'],
    priority: 24,
  },
];

/**
 * FM 텍스트에서 매칭되는 검출규칙들을 우선순위순으로 반환
 */
export function matchDetectionRules(fmText: string): DetectionRule[] {
  if (!fmText) return [];
  const fmLower = fmText.toLowerCase();

  const matched = FM_TO_DC_RULES.filter(rule =>
    rule.fmKeywords.some(kw => fmLower.includes(kw.toLowerCase()))
  );

  return matched.sort((a, b) => a.priority - b.priority);
}

/**
 * FM 텍스트 기반으로 추천 검출방법 목록 생성
 */
export function getRecommendedDetectionMethods(fmText: string): string[] {
  const rules = matchDetectionRules(fmText);
  if (rules.length === 0) return [];

  const methods: string[] = [];
  const seen = new Set<string>();

  for (const rule of rules) {
    for (const m of rule.primaryMethods) {
      const lower = m.toLowerCase();
      if (!seen.has(lower)) { seen.add(lower); methods.push(m); }
    }
  }
  for (const rule of rules) {
    for (const m of rule.secondaryMethods) {
      const lower = m.toLowerCase();
      if (!seen.has(lower)) { seen.add(lower); methods.push(m); }
    }
  }

  return methods;
}

/**
 * A6 후보 목록을 FM 키워드 규칙으로 재정렬
 */
export function rankByDetectionRules<T extends { value: string }>(
  fmText: string,
  candidates: T[],
): T[] {
  if (candidates.length <= 1 || !fmText) return candidates;

  const recommendedMethods = getRecommendedDetectionMethods(fmText);
  if (recommendedMethods.length === 0) return candidates;

  return [...candidates].sort((a, b) => {
    const scoreA = detectionMatchScore(a.value, recommendedMethods);
    const scoreB = detectionMatchScore(b.value, recommendedMethods);
    return scoreB - scoreA;
  });
}

function detectionMatchScore(a6Value: string, recommendedMethods: string[]): number {
  const valLower = a6Value.toLowerCase();
  let score = 0;

  for (let i = 0; i < recommendedMethods.length; i++) {
    const method = recommendedMethods[i].toLowerCase();
    if (valLower.includes(method) || method.includes(valLower)) {
      score += (recommendedMethods.length - i) * 10;
    }
    const tokens = method.split(/\s+/).filter(t => t.length >= 2);
    for (const token of tokens) {
      if (valLower.includes(token)) {
        score += (recommendedMethods.length - i) * 3;
      }
    }
  }

  return score;
}
