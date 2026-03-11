/**
 * @file promotionLogic.ts
 * @description FMEA 개정 — 최적화 결과 → 리스크분석 승격 로직
 *
 * 완료된 최적화(6단계)의 SOD/예방/검출 값을 새 개정본의 리스크분석(5단계) 기준으로 승격.
 * - 예방관리개선 → 현재예방관리 (preventionControl)
 * - 검출관리개선 → 현재검출관리 (detectionControl)
 * - newOccurrence → occurrence (null이면 원본 유지)
 * - newDetection → detection (null이면 원본 유지)
 * - severity 동일 유지
 * - AP 재계산
 *
 * @created 2026-03-02
 */

import { calculateAP } from '@/app/(fmea-core)/pfmea/worksheet/tabs/all/apCalculator';

// ── 타입 정의 ──

/** 원본 RiskAnalysis의 필요 필드 */
export interface RiskSource {
  severity: number;
  occurrence: number;
  detection: number;
  ap: string;
  preventionControl: string | null;
  detectionControl: string | null;
}

/** 원본 Optimization의 필요 필드 */
export interface OptimizationSource {
  recommendedAction: string;
  newSeverity: number | null;
  newOccurrence: number | null;
  newDetection: number | null;
  status: string;
}

/** 승격 결과 */
export interface PromotedRisk {
  severity: number;
  occurrence: number;
  detection: number;
  ap: string;
  preventionControl: string | null;
  detectionControl: string | null;
}

// ── 핵심 함수 ──

/**
 * recommendedAction 복합 문자열에서 예방/검출 조치 분리 추출
 * 형식: "[예방] text | [검출] text"
 */
export function extractAction(action: string | null, type: '예방' | '검출'): string {
  if (!action) return '';
  const tag = `[${type}]`;
  const parts = action.split(' | ');
  const found = parts.find((p) => p.startsWith(tag));
  if (found) return found.replace(tag, '').trim();
  // 태그 없으면: 예방 타입이고 검출 태그가 없을 때만 전체 반환 (레거시 호환)
  if (type === '예방' && !action.includes('[검출]')) return action;
  return '';
}

/**
 * RiskAnalysis에 최적화 결과를 승격
 *
 * @param risk - 원본 리스크분석 값
 * @param optimization - 최적화 결과 (null이면 승격 안함)
 * @returns 승격된 리스크 값
 */
export function promoteRiskAnalysis(
  risk: RiskSource,
  optimization: OptimizationSource | null
): PromotedRisk {
  // 최적화 없거나 미완료 → 원본 그대로
  if (!optimization || optimization.status !== '완료') {
    return {
      severity: risk.severity,
      occurrence: risk.occurrence,
      detection: risk.detection,
      ap: risk.ap,
      preventionControl: risk.preventionControl,
      detectionControl: risk.detectionControl,
    };
  }

  // 완료된 최적화 → 승격
  const newSeverity = risk.severity; // severity는 항상 동일 유지
  const newOccurrence = optimization.newOccurrence ?? risk.occurrence;
  const newDetection = optimization.newDetection ?? risk.detection;

  // 예방/검출관리 승격 (빈 값이면 원본 유지)
  const extractedPrevention = extractAction(optimization.recommendedAction, '예방');
  const extractedDetection = extractAction(optimization.recommendedAction, '검출');
  const newPreventionControl = extractedPrevention || risk.preventionControl;
  const newDetectionControl = extractedDetection || risk.detectionControl;

  // AP 재계산
  const newAP = calculateAP(newSeverity, newOccurrence, newDetection) || risk.ap;

  return {
    severity: newSeverity,
    occurrence: newOccurrence,
    detection: newDetection,
    ap: newAP,
    preventionControl: newPreventionControl,
    detectionControl: newDetectionControl,
  };
}
