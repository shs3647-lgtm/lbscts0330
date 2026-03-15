/**
 * @file useSeverityRecommend.ts
 * @description 심각도 추천 개선루프 훅 — DB 기반
 *
 * 비유: 의사의 경험 데이터베이스. 이전에 비슷한 고장영향에 어떤 심각도를
 * 적용했는지 기록하고, 새 프로젝트에서 추천값으로 제공.
 *
 * 사용법:
 *   const { recommend, recordUsage, bulkRecord } = useSeverityRecommend();
 *   const result = await recommend('Overlay 불량에 의한 Chip 기능 이상');
 *   // result = { severity: 5, usageCount: 12, confidence: 'high' }
 */

interface SeverityRecommendation {
  feText: string;
  severity: number;
  usageCount: number;
  processName: string;
  lastUsedAt: string;
  sourceFmeaId: string | null;
}

interface RecommendResult {
  severity: number | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  recommendations: SeverityRecommendation[];
}

/**
 * FE 텍스트 기반 심각도 추천 조회
 */
export async function recommendSeverity(feText: string, processName?: string): Promise<RecommendResult> {
  try {
    const params = new URLSearchParams();
    if (feText) params.set('feText', feText);
    if (processName) params.set('processName', processName);

    const res = await fetch(`/api/severity-recommend?${params.toString()}`);
    const json = await res.json();

    if (!json.success || !json.data?.length) {
      return { severity: null, confidence: 'none', recommendations: [] };
    }

    const recs: SeverityRecommendation[] = json.data;
    const top = recs[0];

    // 신뢰도 판정: 사용횟수 + 완전일치 여부
    let confidence: RecommendResult['confidence'] = 'low';
    const isExactMatch = top.feText.toLowerCase() === feText.toLowerCase();
    if (isExactMatch && top.usageCount >= 3) confidence = 'high';
    else if (isExactMatch || top.usageCount >= 5) confidence = 'medium';

    return { severity: top.severity, confidence, recommendations: recs };
  } catch {
    return { severity: null, confidence: 'none', recommendations: [] };
  }
}

/**
 * 심각도 사용 기록 (단일)
 */
export async function recordSeverityUsage(params: {
  feText: string;
  severity: number;
  feCategory?: string;
  processName?: string;
  productChar?: string;
  fmeaId?: string;
}): Promise<boolean> {
  try {
    const res = await fetch('/api/severity-recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const json = await res.json();
    return json.success === true;
  } catch {
    return false;
  }
}

/**
 * 심각도 일괄 기록 (Import 후 / 확정 시)
 */
export async function bulkRecordSeverity(
  records: Array<{ feText: string; severity: number; feCategory?: string; processName?: string; productChar?: string }>,
  fmeaId?: string
): Promise<{ saved: number; skipped: number }> {
  try {
    const res = await fetch('/api/severity-recommend', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records, fmeaId }),
    });
    const json = await res.json();
    return { saved: json.saved ?? 0, skipped: json.skipped ?? 0 };
  } catch {
    return { saved: 0, skipped: 0 };
  }
}

/**
 * React Hook — 컴포넌트에서 사용
 */
export function useSeverityRecommend() {
  return {
    recommend: recommendSeverity,
    recordUsage: recordSeverityUsage,
    bulkRecord: bulkRecordSeverity,
  };
}
