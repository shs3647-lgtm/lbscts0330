/**
 * @file autoFillDetection.ts
 * @description DC(설계검증 검출) 텍스트 기반 검출도(D) 자동채움 유틸리티
 *
 * failureLinks의 각 FM-FC 쌍에 대해:
 * - risk-{fmId}-{fcId}-D 가 없거나 0이면
 * - detection-{fmId}-{fcId} 의 DC 텍스트를 읽어
 * - AIAG-VDA 키워드 매칭으로 D값을 산정하여 자동 채움
 *
 * @created 2026-03-20
 */

import { recommendDetection } from '../tabs/all/hooks/detectionRatingMap';

export interface AutoFillDetectionDetail {
  uniqueKey: string;
  dcText: string;
  dValue: number;
  reason: string;
}

export interface AutoFillDetectionResult {
  filledCount: number;
  updatedRiskData: Record<string, string | number>;
  details: AutoFillDetectionDetail[];
}

interface FailureLinkLike {
  fmId?: string;
  fcId?: string;
}

/**
 * riskData에서 누락된 검출도(D) 값을 DC 텍스트 기반으로 자동 채움
 */
export function autoFillMissingDetection(
  riskData: Record<string, unknown> | Record<string, string | number>,
  failureLinks: FailureLinkLike[],
): AutoFillDetectionResult {
  const updated: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(riskData)) {
    if (typeof v === 'string' || typeof v === 'number') updated[k] = v;
  }
  const details: AutoFillDetectionDetail[] = [];
  let filledCount = 0;

  for (const fl of failureLinks) {
    if (!fl.fmId || !fl.fcId) continue;

    const uniqueKey = `${fl.fmId}-${fl.fcId}`;
    const dKey = `risk-${uniqueKey}-D`;

    const existingD = updated[dKey];
    if (existingD !== undefined && existingD !== null && existingD !== '' && existingD !== 0) {
      const num = Number(existingD);
      if (num >= 2 && num <= 10) continue;
    }

    const dcKey = `detection-${uniqueKey}`;
    const dcText = String(updated[dcKey] || '').trim();
    if (!dcText) continue;

    const dValue = recommendDetection(dcText);
    if (dValue <= 0) continue;

    updated[dKey] = dValue;
    updated[`imported-D-${uniqueKey}`] = 'auto';
    filledCount++;
    details.push({
      uniqueKey,
      dcText: dcText.substring(0, 60),
      dValue,
      reason: `DC 키워드 매칭 → D=${dValue}`,
    });
  }

  return { filledCount, updatedRiskData: updated, details };
}
