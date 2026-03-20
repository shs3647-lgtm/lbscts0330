/**
 * @file autoFillOccurrence.ts
 * @description PC(예방관리) 텍스트 기반 발생도(O) 자동채움 유틸리티
 *
 * failureLinks의 각 FM-FC 쌍에 대해:
 * - risk-{fmId}-{fcId}-O 가 없으면
 * - prevention-{fmId}-{fcId} 의 PC 텍스트를 읽어
 * - AIAG-VDA 키워드 매칭으로 O값을 산정하여 자동 채움
 *
 * @created 2026-02-25
 */

import { correctOccurrence } from '../tabs/all/hooks/pcOccurrenceMap';
import { recommendOccurrence } from '../tabs/all/hooks/occurrenceRecommendMap';

export interface AutoFillDetail {
  uniqueKey: string;
  pcText: string;
  oValue: number;
  reason: string;
}

export interface AutoFillResult {
  filledCount: number;
  updatedRiskData: Record<string, string | number>;
  details: AutoFillDetail[];
}

interface FailureLinkLike {
  fmId?: string;
  fcId?: string;
}

/**
 * riskData에서 누락된 발생도(O) 값을 PC 텍스트 기반으로 자동 채움
 *
 * @param riskData 현재 riskData 객체
 * @param failureLinks FM-FC 연결 배열
 * @returns { filledCount, updatedRiskData, details }
 */
export function autoFillMissingOccurrence(
  riskData: Record<string, unknown> | Record<string, string | number>,
  failureLinks: FailureLinkLike[],
): AutoFillResult {
  const updated: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(riskData)) {
    if (typeof v === 'string' || typeof v === 'number') updated[k] = v;
  }
  const details: AutoFillDetail[] = [];
  let filledCount = 0;

  for (const fl of failureLinks) {
    if (!fl.fmId || !fl.fcId) continue;

    const uniqueKey = `${fl.fmId}-${fl.fcId}`;
    const oKey = `risk-${uniqueKey}-O`;

    const existingO = updated[oKey];
    if (existingO !== undefined && existingO !== null && existingO !== '' && existingO !== 0) {
      const num = Number(existingO);
      // O=1은 import 기본값일 가능성 → 재평가 대상
      if (num >= 2 && num <= 10) continue;
    }

    const pcKey = `prevention-${uniqueKey}`;
    const pcText = String(updated[pcKey] || '').trim();
    if (!pcText) continue;

    const { correctedO, reason } = correctOccurrence(pcText);

    let oValue: number;
    let finalReason: string;

    if (correctedO !== null && correctedO > 0) {
      oValue = correctedO;
      finalReason = reason;
    } else {
      const fallback = recommendOccurrence(pcText);
      if (fallback > 0) {
        oValue = fallback;
        finalReason = `PC 키워드 fallback → O=${oValue}`;
      } else {
        continue;
      }
    }

    updated[oKey] = oValue;
    updated[`imported-O-${uniqueKey}`] = 'auto';
    filledCount++;
    details.push({ uniqueKey, pcText, oValue, reason: finalReason });
  }

  return { filledCount, updatedRiskData: updated, details };
}
