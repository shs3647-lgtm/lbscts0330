/**
 * @file riskDataSync.ts
 * @description riskData(키-값) → riskAnalysis(배열) 동기화 유틸리티
 * 
 * riskData 키 패턴: risk-{fmId}-{fcId}-{field}
 * - O: 발생도(Occurrence)
 * - D: 검출도(Detection)
 * - PC: 설계검증 예방(Prevention Control)
 * - DC: 설계검증 검출(Detection Control)
 * - AP: Action Priority
 * - SC: 특별특성(Special Characteristic)
 */

interface RiskAnalysisItem {
  id: string;
  preventionControl: string;
  occurrence: number;
  detectionControl: string;
  detection: number;
  ap: number;
  rpn: number;
  specialChar: string;
  lessonLearned: string;
}

interface FailureLinkItem {
  id: string;
  fmId: string;
  fcId: string;
  severity?: number;
  [key: string]: unknown;
}

/**
 * failureLinks와 riskData에서 riskAnalysis 배열을 빌드합니다.
 * - failureLinks에서 고유한 fcId 목록 추출
 * - 각 fcId에 대해 riskData에서 fmId-fcId 키로 값 조회
 * - 기존 riskAnalysis가 있으면 보존 (사용자 수동 입력 우선)
 */
export function buildRiskAnalysisFromData(
  failureLinks: FailureLinkItem[],
  riskData: Record<string, unknown>,
  existingAnalysis: RiskAnalysisItem[],
): RiskAnalysisItem[] {
  const existingMap = new Map(existingAnalysis.map(r => [r.id, r]));
  const result: RiskAnalysisItem[] = [];
  const seenFcIds = new Set<string>();
  const fcToFmMap = new Map<string, string>();

  for (const link of failureLinks) {
    if (!link.fcId || seenFcIds.has(link.fcId)) continue;
    seenFcIds.add(link.fcId);
    fcToFmMap.set(link.fcId, link.fmId);
  }

  for (const fcId of seenFcIds) {
    const existing = existingMap.get(fcId);
    if (existing) {
      result.push(existing);
      continue;
    }

    const fmId = fcToFmMap.get(fcId) || '';
    const prefix = `risk-${fmId}-${fcId}`;

    const occurrence = Number(riskData[`${prefix}-O`]) || 0;
    const detection = Number(riskData[`${prefix}-D`]) || 0;
    const pc = String(riskData[`${prefix}-PC`] || '');
    const dc = String(riskData[`${prefix}-DC`] || '');
    const ap = Number(riskData[`${prefix}-AP`]) || 0;
    const sc = String(riskData[`${prefix}-SC`] || '');

    result.push({
      id: fcId,
      preventionControl: pc,
      occurrence,
      detectionControl: dc,
      detection,
      ap,
      rpn: 0,
      specialChar: sc,
      lessonLearned: '',
    });
  }

  return result;
}
