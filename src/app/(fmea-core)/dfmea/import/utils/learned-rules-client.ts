/**
 * @file learned-rules-client.ts
 * @description 학습 규칙 클라이언트 — Import 시 DB 학습 규칙 우선 적용
 *              FMEA 확정 시 학습 규칙 축적
 *
 * ★ 온프레미스 지속적 개선 루프:
 *   Import → Auto Fix → 키워드 규칙 추천
 *                          ↓
 *   학습 규칙 우선 조회 (use_count 높은 것 우선)
 *                          ↓
 *   마스터 규칙 fallback
 *                          ↓
 *   FMEA 워크시트 수정 → 확정 → 학습 규칙 축적
 *                          ↑ ←←←←←←←←←←←←←←←←←↙
 *
 * @created 2026-03-25
 */

'use client';

export interface LearnedRule {
  id: string;
  rule_type: string;       // FC_PC, FM_DC, FM_PC, FE_S, FC_O, DC_D
  input_text: string;
  output_text: string;
  m4_code: string | null;
  sod_value: number | null;
  confidence: number;
  use_count: number;
}

// ═══ 학습 규칙 캐시 (세션 내 조회 1회) ═══
let cachedRules: LearnedRule[] | null = null;

/** 학습 규칙 전체 로드 */
export async function loadLearnedRules(): Promise<LearnedRule[]> {
  if (cachedRules) return cachedRules;
  try {
    const res = await fetch('/api/fmea/learned-rules');
    if (!res.ok) return [];
    const data = await res.json();
    cachedRules = data.rules || [];
    return cachedRules || [];
  } catch {
    return [];
  }
}

/** 캐시 무효화 (학습 후 호출) */
export function invalidateLearnedRulesCache() {
  cachedRules = null;
}

/** 학습 규칙에서 매칭 검색 */
export function findLearnedRule(
  rules: LearnedRule[],
  ruleType: string,
  inputText: string,
  m4Code?: string,
): LearnedRule | null {
  const lower = inputText.toLowerCase();
  return rules.find(r =>
    r.rule_type === ruleType &&
    lower.includes(r.input_text.toLowerCase()) &&
    (!m4Code || !r.m4_code || r.m4_code === m4Code)
  ) || null;
}

// ═══ 확정 데이터 축적 ═══

interface ConfirmedMapping {
  ruleType: string;
  inputText: string;
  outputText: string;
  m4Code?: string;
  sodValue?: number;
  sourceFmea?: string;
}

/** FMEA 확정 시 학습 규칙 축적 */
export async function saveLearnedRules(mappings: ConfirmedMapping[]): Promise<number> {
  if (mappings.length === 0) return 0;
  try {
    const res = await fetch('/api/fmea/learned-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules: mappings }),
    });
    if (!res.ok) return 0;
    const data = await res.json();
    invalidateLearnedRulesCache();
    return data.upserted || 0;
  } catch {
    return 0;
  }
}

/** RiskAnalysis 확정 데이터에서 학습 매핑 추출 */
export function extractLearnedMappings(
  fmeaId: string,
  data: {
    failureCauses?: Array<{ cause: string }>;
    failureModes?: Array<{ mode: string }>;
    failureEffects?: Array<{ effect: string }>;
    riskAnalyses?: Array<{
      severity?: number;
      occurrence?: number;
      detection?: number;
      preventionControl?: string;
      detectionControl?: string;
      failureLink?: {
        failureCause?: { cause: string };
        failureMode?: { mode: string };
        failureEffect?: { effect: string };
      };
    }>;
  }
): ConfirmedMapping[] {
  const mappings: ConfirmedMapping[] = [];
  const seen = new Set<string>();

  for (const ra of data.riskAnalyses || []) {
    const fc = ra.failureLink?.failureCause?.cause;
    const fm = ra.failureLink?.failureMode?.mode;
    const fe = ra.failureLink?.failureEffect?.effect;
    const pc = ra.preventionControl;
    const dc = ra.detectionControl;

    // FC → PC 매핑
    if (fc && pc) {
      const key = `FC_PC|${fc}`;
      if (!seen.has(key)) {
        seen.add(key);
        mappings.push({ ruleType: 'FC_PC', inputText: fc, outputText: pc, sourceFmea: fmeaId });
      }
    }

    // FM → DC 매핑
    if (fm && dc) {
      const key = `FM_DC|${fm}`;
      if (!seen.has(key)) {
        seen.add(key);
        mappings.push({ ruleType: 'FM_DC', inputText: fm, outputText: dc, sourceFmea: fmeaId });
      }
    }

    // FE → S 매핑
    if (fe && ra.severity) {
      const key = `FE_S|${fe}`;
      if (!seen.has(key)) {
        seen.add(key);
        mappings.push({ ruleType: 'FE_S', inputText: fe, outputText: String(ra.severity), sodValue: ra.severity, sourceFmea: fmeaId });
      }
    }

    // FC → O 매핑
    if (fc && ra.occurrence) {
      const key = `FC_O|${fc}`;
      if (!seen.has(key)) {
        seen.add(key);
        mappings.push({ ruleType: 'FC_O', inputText: fc, outputText: String(ra.occurrence), sodValue: ra.occurrence, sourceFmea: fmeaId });
      }
    }

    // DC → D 매핑
    if (dc && ra.detection) {
      const key = `DC_D|${dc}`;
      if (!seen.has(key)) {
        seen.add(key);
        mappings.push({ ruleType: 'DC_D', inputText: dc, outputText: String(ra.detection), sodValue: ra.detection, sourceFmea: fmeaId });
      }
    }
  }

  return mappings;
}
