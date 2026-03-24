/**
 * @file sod-recommendation.ts
 * @description AIAG VDA FMEA SOD 추천 엔진 + 지속적 개선 루프
 *
 * ★ 온프레미스 학습 루프:
 *   1. 키워드 규칙 기반 SOD 추천 (AIAG VDA 기준)
 *   2. 사용자 확정 시 learned_rules DB에 축적
 *   3. 다음 Import에서 학습된 규칙 우선 적용
 *   4. 외부 API/클라우드 불필요 — PostgreSQL만 사용
 *
 * @created 2026-03-25
 */

// ═══════════════════════════════════════════════
// AIAG VDA FMEA — 심각도(S) 추천 기준
// ═══════════════════════════════════════════════

/** FE(고장영향) 키워드 → 심각도(S) 추천 */
export interface SeverityRule {
  keywords: string[];
  severity: number;         // 1~10
  rationale: string;        // AIAG VDA 근거
  enhancedText?: string;    // AIAG 적합 문구 수정
}

export const SEVERITY_RULES: SeverityRule[] = [
  // S=10: 안전/법규 (경고 없이)
  { keywords: ['화재', 'fire', '폭발', '감전', '전복', '인명', '사망'],
    severity: 10, rationale: 'S10: 안전/규제 위반 — 경고 없이 돌발적 위험' },
  // S=9: 안전/법규 (경고 있음)
  { keywords: ['안전', 'safety', '법규', 'regulation', '인체', '유해', '부상'],
    severity: 9, rationale: 'S9: 안전/규제 위반 — 사전 경고 가능' },
  // S=8: 차량 운행 불가
  { keywords: ['운행 불가', '시동 불가', '주행 불가', '완전 고장', '전면 정지', '라인 스탑'],
    severity: 8, rationale: 'S8: 주요 기능 상실 — 차량/라인 운행 불가' },
  // S=7: 주요 기능 저하
  { keywords: ['성능 저하', '기능 저하', '출력 저하', '효율 저하', '부분 고장'],
    severity: 7, rationale: 'S7: 주요 기능 저하 — 운행 가능하나 성능 감소' },
  // S=6: 보조 기능 상실
  { keywords: ['에어컨', '오디오', '조명', '편의', '보조 기능 상실'],
    severity: 6, rationale: 'S6: 보조 기능 상실 — 편의 기능 완전 정지' },
  // S=5: 보조 기능 저하
  { keywords: ['소음', '진동', '이음', '외관 불량', '미관'],
    severity: 5, rationale: 'S5: 보조 기능 저하 — 불편감 유발' },
  // S=4: 고객 인지 가능
  { keywords: ['고객 인지', '눈에 띄는', '경미한', '미세'],
    severity: 4, rationale: 'S4: 경미한 영향 — 대부분 고객이 인지' },
  // S=3: 일부 고객만 인지
  { keywords: ['일부', '간헐적', '드문'],
    severity: 3, rationale: 'S3: 경미한 영향 — 일부 고객만 인지' },
  // S=2: 거의 인지 불가
  { keywords: ['미미', '거의 없는', '무시 가능'],
    severity: 2, rationale: 'S2: 미미한 영향 — 거의 인지 불가' },
];

// ═══════════════════════════════════════════════
// AIAG VDA FMEA — 발생도(O) 추천 기준
// ═══════════════════════════════════════════════

/** FC(고장원인) 키워드 → 발생도(O) 추천 */
export interface OccurrenceRule {
  keywords: string[];
  occurrence: number;       // 1~10
  rationale: string;
  enhancedPC?: string;      // AIAG 적합 예방관리 문구
}

export const OCCURRENCE_RULES: OccurrenceRule[] = [
  // O=10: 예방관리 없음
  { keywords: ['관리 없음', '예방 없음', '미관리'],
    occurrence: 10, rationale: 'O10: 예방관리 없음 또는 무효',
    enhancedPC: '예방관리 수립 필요 — 현재 관리 부재' },
  // O=8~9: 기본 관리만
  { keywords: ['작업자 실수', '작업 미숙', '숙련도 부족', '교육 미흡'],
    occurrence: 8, rationale: 'O8: 예방관리 약함 — 작업자 의존',
    enhancedPC: '작업 표준서(SOP) 준수 교육, OJT 실시, 숙련도 인증제' },
  // O=7: 불완전한 관리
  { keywords: ['설정 오류', '파라미터', '조건 변동', '공정 변동'],
    occurrence: 7, rationale: 'O7: 예방관리 보통 — 공정 변동 가능성',
    enhancedPC: '공정 파라미터 모니터링, SPC 관리도 적용' },
  // O=6: 간헐적 발생
  { keywords: ['마모', '열화', '노후', '피로'],
    occurrence: 6, rationale: 'O6: 예방관리 보통 — 시간 경과에 따른 열화',
    enhancedPC: '예방 보전(PM) 계획, 정기 교체 주기 설정' },
  // O=5: 가끔 발생
  { keywords: ['오염', '이물', '혼입', '자재 불량'],
    occurrence: 5, rationale: 'O5: 예방관리 양호 — 가끔 발생',
    enhancedPC: '수입 검사(IQC), 자재 성적서(COC) 확인, 공급업체 관리' },
  // O=4: 드물게 발생
  { keywords: ['치수', '공차', '정밀도'],
    occurrence: 4, rationale: 'O4: 예방관리 양호 — 드물게 발생',
    enhancedPC: 'SPC 관리, Cpk 1.33 이상 유지, 정기 교정' },
  // O=3: 매우 드물게
  { keywords: ['설계', '구조', '재질'],
    occurrence: 3, rationale: 'O3: 예방관리 강함 — 매우 드물게 발생' },
  // O=2: 거의 발생 안함
  { keywords: ['인터록', 'interlock', 'poka-yoke', '폴카요케', '자동 차단'],
    occurrence: 2, rationale: 'O2: 예방관리 매우 강함 — Poka-Yoke/인터록 적용',
    enhancedPC: '자동 차단(인터록), 오류 방지(Poka-Yoke) 시스템 적용' },
];

// ═══════════════════════════════════════════════
// AIAG VDA FMEA — 검출도(D) 추천 기준
// ═══════════════════════════════════════════════

/** DC(검출관리) 키워드 → 검출도(D) 추천 */
export interface DetectionRule {
  keywords: string[];
  detection: number;        // 1~10
  rationale: string;
  enhancedDC?: string;      // AIAG 적합 검출관리 문구
}

export const DETECTION_RULES: DetectionRule[] = [
  // D=10: 검출 불가
  { keywords: ['검출 불가', '검출 수단 없음', '관리 없음'],
    detection: 10, rationale: 'D10: 고장 모드 검출 불가, 검출관리 없음' },
  // D=9: 검출 거의 불가
  { keywords: ['육안', '외관 확인', '간접 확인'],
    detection: 9, rationale: 'D9: 불확실한 검출 — 육안/간접 검사만',
    enhancedDC: '외관 육안 검사 (장비+방법+빈도 보강 필요)' },
  // D=7: 검출 가능성 낮음
  { keywords: ['샘플링', 'sampling', '샘플 검사', '발췌검사'],
    detection: 7, rationale: 'D7: 샘플링 기반 검출 — 누락 가능성',
    enhancedDC: '샘플링 검사 (AQL 검사 기준), 검사 빈도: LOT당 n건' },
  // D=5: 보통 검출
  { keywords: ['게이지', 'gauge', '측정기', '검사기', 'CMM', '3차원'],
    detection: 5, rationale: 'D5: 장비 기반 검사 — 유효한 검출',
    enhancedDC: '측정 장비 검사, 정기 교정, MSA 검증 완료' },
  // D=4: 높은 검출
  { keywords: ['전수', '100%', 'inline', '인라인', '자동 검사'],
    detection: 4, rationale: 'D4: 전수/인라인 검사 — 높은 검출률',
    enhancedDC: '전수 자동 검사(인라인), 검사 장비 정기 교정' },
  // D=3: 매우 높은 검출
  { keywords: ['비전', 'vision', 'AOI', 'AVI', '자동 광학'],
    detection: 3, rationale: 'D3: 자동 비전/AOI 검출 — 매우 높은 검출률',
    enhancedDC: 'AOI/비전 자동 검사, 전수 인라인, 검출률 99%+' },
  // D=2: 거의 확실한 검출
  { keywords: ['SPC', 'Cpk', '관리도', '통계적', '실시간 모니터링'],
    detection: 2, rationale: 'D2: SPC/통계적 공정 관리 — 거의 확실한 검출',
    enhancedDC: 'SPC 관리도 적용, Cpk 모니터링, 이상 자동 알림' },
  // D=1: 확실한 검출/예방
  { keywords: ['폴카요케', 'poka-yoke', '인터록', '오류 방지', '자동 차단'],
    detection: 1, rationale: 'D1: 오류 방지 장치 — 고장 원천 차단',
    enhancedDC: 'Poka-Yoke/인터록: 부적합 시 자동 정지, 다음 공정 진행 차단' },
];


// ═══════════════════════════════════════════════
// 추천 엔진 — 키워드 매칭 + 학습 규칙
// ═══════════════════════════════════════════════

function matchKeywords(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some(kw => lower.includes(kw.toLowerCase()));
}

export interface SODRecommendation {
  severity?: { value: number; rationale: string; enhancedText?: string };
  occurrence?: { value: number; rationale: string; enhancedPC?: string };
  detection?: { value: number; rationale: string; enhancedDC?: string };
  source: 'learned' | 'rule' | 'default';
}

/** FE(고장영향)로 심각도(S) 추천 */
export function recommendSeverity(fe: string): { value: number; rationale: string } {
  if (!fe?.trim()) return { value: 5, rationale: 'S5: 기본값 (FE 텍스트 없음)' };
  for (const rule of SEVERITY_RULES) {
    if (matchKeywords(fe, rule.keywords)) {
      return { value: rule.severity, rationale: rule.rationale };
    }
  }
  return { value: 5, rationale: 'S5: 기본값 (매칭 규칙 없음 — 보조 기능 저하)' };
}

/** FC(고장원인) + 4M으로 발생도(O) 추천 */
export function recommendOccurrence(fc: string, pc?: string): { value: number; rationale: string; enhancedPC?: string } {
  if (!fc?.trim()) return { value: 6, rationale: 'O6: 기본값 (FC 텍스트 없음)' };
  for (const rule of OCCURRENCE_RULES) {
    if (matchKeywords(fc, rule.keywords)) {
      return { value: rule.occurrence, rationale: rule.rationale, enhancedPC: rule.enhancedPC };
    }
  }
  // PC(예방관리) 텍스트 기반 보정
  if (pc) {
    const pcLower = pc.toLowerCase();
    if (pcLower.includes('poka-yoke') || pcLower.includes('인터록') || pcLower.includes('자동 차단'))
      return { value: 2, rationale: 'O2: 예방관리에 Poka-Yoke/인터록 포함' };
    if (pcLower.includes('spc') || pcLower.includes('cpk'))
      return { value: 3, rationale: 'O3: SPC/Cpk 기반 예방관리' };
    if (pcLower.includes('pm') || pcLower.includes('예방보전'))
      return { value: 4, rationale: 'O4: 예방보전(PM) 계획 적용' };
  }
  return { value: 6, rationale: 'O6: 기본값 (매칭 규칙 없음)' };
}

/** DC(검출관리)로 검출도(D) 추천 */
export function recommendDetection(dc: string): { value: number; rationale: string; enhancedDC?: string } {
  if (!dc?.trim()) return { value: 8, rationale: 'D8: 기본값 (DC 텍스트 없음)' };
  for (const rule of DETECTION_RULES) {
    if (matchKeywords(dc, rule.keywords)) {
      return { value: rule.detection, rationale: rule.rationale, enhancedDC: rule.enhancedDC };
    }
  }
  return { value: 7, rationale: 'D7: 기본값 (매칭 규칙 없음)' };
}

/** FE + FC + DC 통합 SOD 추천 */
export function recommendSOD(
  fe: string, fc: string, dc: string, pc?: string
): SODRecommendation {
  const s = recommendSeverity(fe);
  const o = recommendOccurrence(fc, pc);
  const d = recommendDetection(dc);
  return {
    severity: { value: s.value, rationale: s.rationale },
    occurrence: { value: o.value, rationale: o.rationale, enhancedPC: o.enhancedPC },
    detection: { value: d.value, rationale: d.rationale, enhancedDC: d.enhancedDC },
    source: 'rule',
  };
}


// ═══════════════════════════════════════════════
// AIAG VDA 문구 적합성 수정 엔진
// ═══════════════════════════════════════════════

/** PC/DC 문구를 AIAG VDA 기준에 맞게 보강 */
export function enhanceForAIAG(text: string, type: 'PC' | 'DC'): { enhanced: string; changes: string[] } {
  const changes: string[] = [];
  let enhanced = text;

  if (type === 'PC') {
    // PC(예방관리)는 "예방적 조치"여야 함 — 검출용어 혼입 제거
    const pcFixes: [RegExp, string, string][] = [
      [/육안\s*검사/g, '작업 표준 교육 및 점검', 'PC에 검출용어 "육안 검사" → 예방적 "교육/점검"'],
      [/전수\s*검사/g, '공정 관리 기준 준수', 'PC에 검출용어 "전수 검사" → 예방적 "기준 준수"'],
      [/측정/g, '관리 기준 모니터링', 'PC에 검출용어 "측정" → 예방적 "모니터링"'],
    ];
    for (const [pattern, replacement, reason] of pcFixes) {
      if (pattern.test(enhanced)) {
        enhanced = enhanced.replace(pattern, replacement);
        changes.push(reason);
      }
    }
    // B5 최소 길이 보강
    if (enhanced.length < 10) {
      enhanced += ', 작업표준서(SOP) 준수';
      changes.push('PC 문구 최소 길이 보강 — SOP 준수 추가');
    }
  }

  if (type === 'DC') {
    // DC(검출관리)는 3요소 필수: 장비 + 방법 + 빈도
    const hasEquip = /게이지|측정기|검사기|cmm|aoi|vision|비전|체크리스트|카메라|scope|probe/i.test(enhanced);
    const hasMethod = /전수|샘플링|검사|측정|확인|분석|모니터링/i.test(enhanced);
    const hasFreq = /매\s*lot|전수|daily|매일|1회|분기|주기|매회|100%|inline|실시간|정기/i.test(enhanced);

    if (!hasEquip) { enhanced += ', 체크리스트'; changes.push('DC 장비 요소 추가'); }
    if (!hasMethod) { enhanced += ', 검사'; changes.push('DC 방법 요소 추가'); }
    if (!hasFreq) { enhanced += ', 매 LOT'; changes.push('DC 빈도 요소 추가'); }
  }

  return { enhanced, changes };
}
