/**
 * @file atomicRiskToRiskData.ts
 * @description Atomic DB RiskAnalysis → riskData 키-값 변환 유틸
 *
 * Living DB 아키텍처: 워크시트 로드 시 Atomic DB가 SSoT.
 * Legacy riskData JSON blob 대신 RiskAnalysis 필드에서 DC/PC/SOD를 복원하여
 * 워크시트 state.riskData에 주입한다.
 *
 * Rule 10.5 준수: 기존 useWorksheetDataLoader의 로드 할당 라인을 수정하지 않고,
 * 별도 함수로 제공하여 호출자가 useMemo에서 머지한다.
 */

interface AtomicRisk {
  id: string;
  linkId: string;
  severity: number;
  occurrence: number;
  detection: number;
  ap: string;
  preventionControl?: string | null;
  detectionControl?: string | null;
  lldReference?: string | null;
  dcSourceType?: string | null;
  dcSourceId?: string | null;
  pcSourceType?: string | null;
  pcSourceId?: string | null;
}

interface AtomicLink {
  id: string;
  fmId: string;
  fcId: string;
}

/**
 * RiskAnalysis[] + FailureLink[] → riskData Record 변환
 *
 * 비유: "공식 장부(Atomic DB)에서 수첩(riskData)으로 최신값을 복사"
 *
 * @returns riskData 키-값 객체 (SOD/DC/PC/LLD/소스 추적)
 */
export function atomicRiskToRiskData(
  riskAnalyses: AtomicRisk[],
  failureLinks: AtomicLink[],
): Record<string, string | number> {
  const linkById = new Map<string, AtomicLink>(
    failureLinks.map(lk => [lk.id, lk]),
  );

  const riskData: Record<string, string | number> = {};

  for (const ra of riskAnalyses) {
    const link = linkById.get(ra.linkId);
    if (!link) continue;

    const uk = `${link.fmId}-${link.fcId}`;

    // SOD
    if (ra.severity > 0) riskData[`risk-${uk}-S`] = ra.severity;
    if (ra.occurrence > 0) riskData[`risk-${uk}-O`] = ra.occurrence;
    if (ra.detection > 0) riskData[`risk-${uk}-D`] = ra.detection;

    // DC/PC
    if (ra.detectionControl) riskData[`detection-${uk}`] = ra.detectionControl;
    if (ra.preventionControl) riskData[`prevention-${uk}`] = ra.preventionControl;

    // LLD
    if (ra.lldReference) riskData[`lesson-${uk}`] = ra.lldReference;

    // 소스 추적
    if (ra.dcSourceType) riskData[`dcSource-${uk}`] = ra.dcSourceType;
    if (ra.dcSourceId) riskData[`dcSourceId-${uk}`] = ra.dcSourceId;
    if (ra.pcSourceType) riskData[`pcSource-${uk}`] = ra.pcSourceType;
    if (ra.pcSourceId) riskData[`pcSourceId-${uk}`] = ra.pcSourceId;
  }

  return riskData;
}

/**
 * Legacy riskData와 Atomic DB riskData를 머지
 *
 * 전략:
 * 1. Atomic DB 값 우선 (SOD/DC/PC — 최종 저장된 확정값)
 * 2. Legacy에만 있는 키 유지 (opt, imported 플래그 등)
 *
 * @param legacyRiskData - FmeaLegacyData에서 로드한 기존 riskData
 * @param atomicRiskData - atomicRiskToRiskData()로 생성한 Atomic DB 기반 riskData
 * @returns 머지된 riskData (Atomic 우선)
 */
export function mergeRiskData(
  legacyRiskData: Record<string, unknown>,
  atomicRiskData: Record<string, string | number>,
): Record<string, unknown> {
  return {
    ...legacyRiskData,
    ...atomicRiskData, // Atomic DB 값이 Legacy를 덮어씀
  };
}
