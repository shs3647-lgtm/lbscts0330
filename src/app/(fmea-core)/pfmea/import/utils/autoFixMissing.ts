/**
 * @file autoFixMissing.ts
 * @description Import 미리보기에서 누락 항목 자동 채움 유틸
 * - A6(검출관리): A5(고장형태) 기반 inferDC 엔진으로 추론
 * - B5(예방관리): B4(고장원인) + 4M 기반 inferPC 엔진으로 추론
 * ★ v5.4.1: B5_MN_MC_SWAP 사후 검증 추가
 * @created 2026-03-14
 */

import type { CrossTab } from './template-delete-logic';
import { inferDC, inferPC, getDefaultRuleSet, type IndustryRuleSet } from '../stepb-parser/pc-dc-inference';

export interface AutoFixResult {
  /** 수정된 항목 수 */
  fixed: number;
  /** 수정 불가 (A5/B4도 비어있어 추론 불가) */
  skipped: number;
  /** 수정 상세 */
  details: Array<{
    processNo: string;
    itemCode: string;
    value: string;
    source: string;
  }>;
}

// ═══════════════════════════════════════════════
// B5_MN_MC_SWAP 사후 검증
// ═══════════════════════════════════════════════

/** 4M별 B5 부적합 키워드 — 해당 4M 행에 있으면 스왑 의심 */
const B5_SWAP_DETECTORS: Record<string, { forbidden: string[]; label: string }> = {
  MN: { forbidden: ['PM', '정기 교정', '장비 PM', '설비 PM', 'Calibration'], label: '작업자' },
  MC: { forbidden: ['교육', '숙련도', '작업표준 교육', '작업자 교육'], label: '설비' },
};

export interface B5SwapWarning {
  processNo: string;
  m4: string;
  value: string;
  reason: string;
}

/**
 * B5 autoFix 결과에서 MN/MC 스왑 감지
 * MC 행에 "교육/숙련도" → 오류, MN 행에 "PM/교정" → 오류
 */
export function detectB5MnMcSwap(
  details: AutoFixResult['details'],
  bRows: CrossTab['bRows'],
): B5SwapWarning[] {
  const warnings: B5SwapWarning[] = [];

  for (const d of details) {
    if (d.itemCode !== 'B5') continue;
    const row = bRows.find(r => r.processNo === d.processNo && r._ids.B5 === d.value);
    const m4 = row?.m4?.toUpperCase() || '';
    const detector = B5_SWAP_DETECTORS[m4];
    if (!detector) continue;

    const valueLower = d.value.toLowerCase();
    for (const kw of detector.forbidden) {
      if (valueLower.includes(kw.toLowerCase())) {
        warnings.push({
          processNo: d.processNo,
          m4,
          value: d.value,
          reason: `${detector.label}(${m4}) 행에 부적합 키워드 "${kw}" 감지 — B5_MN_MC_SWAP 의심`,
        });
        break;
      }
    }
  }

  return warnings;
}

/**
 * A6(검출관리) 누락 자동 채움
 * A5(고장형태) 텍스트로 inferDC → A6 값 추론
 */
export function autoFixMissingA6(
  crossTab: CrossTab,
  onUpdateItem?: (id: string, value: string) => void,
  onAddItems?: (items: Array<{ processNo: string; category: 'A' | 'B' | 'C'; itemCode: string; value: string; createdAt: Date }>) => void,
  rules?: IndustryRuleSet,
): AutoFixResult {
  const ruleSet = rules || getDefaultRuleSet();
  const result: AutoFixResult = { fixed: 0, skipped: 0, details: [] };
  const newItems: Array<{ processNo: string; category: 'A' | 'B' | 'C'; itemCode: string; value: string; createdAt: Date }> = [];

  for (const row of crossTab.aRows) {
    // A6 이미 있으면 스킵
    if (row.A6?.trim()) continue;

    // A5 없으면 추론 불가
    const fm = row.A5?.trim();
    if (!fm) {
      result.skipped++;
      continue;
    }

    const { dc } = inferDC(fm, ruleSet);
    if (!dc) {
      result.skipped++;
      continue;
    }

    if (row._ids.A6 && onUpdateItem) {
      // 기존 아이템이 있지만 비어있음 → 업데이트
      onUpdateItem(row._ids.A6, dc);
      result.fixed++;
      result.details.push({ processNo: row.processNo, itemCode: 'A6', value: dc, source: `A5→DC: "${fm}"` });
    } else if (!row._ids.A6 && onAddItems) {
      // 아이템 자체가 없음 → 생성
      newItems.push({ processNo: row.processNo, category: 'A', itemCode: 'A6', value: dc, createdAt: new Date() });
      result.fixed++;
      result.details.push({ processNo: row.processNo, itemCode: 'A6', value: dc, source: `A5→DC: "${fm}"` });
    } else {
      result.skipped++;
    }
  }

  if (newItems.length > 0 && onAddItems) {
    onAddItems(newItems);
  }

  return result;
}

/**
 * B5(예방관리) 누락 자동 채움
 * B4(고장원인) + 4M 기반 inferPC → B5 값 추론
 */
export function autoFixMissingB5(
  crossTab: CrossTab,
  onUpdateItem?: (id: string, value: string) => void,
  onAddItems?: (items: Array<{ processNo: string; m4?: string; category: 'A' | 'B' | 'C'; itemCode: string; value: string; createdAt: Date }>) => void,
  rules?: IndustryRuleSet,
): AutoFixResult {
  const ruleSet = rules || getDefaultRuleSet();
  const result: AutoFixResult = { fixed: 0, skipped: 0, details: [] };
  const newItems: Array<{ processNo: string; m4?: string; category: 'A' | 'B' | 'C'; itemCode: string; value: string; createdAt: Date }> = [];

  for (const row of crossTab.bRows) {
    // B5 이미 있으면 스킵
    if (row.B5?.trim()) continue;

    // B4 없으면 추론 불가
    const fc = row.B4?.trim();
    if (!fc) {
      result.skipped++;
      continue;
    }

    const pc = inferPC(fc, row.m4 || '', ruleSet);
    if (!pc) {
      result.skipped++;
      continue;
    }

    if (row._ids.B5 && onUpdateItem) {
      onUpdateItem(row._ids.B5, pc);
      result.fixed++;
      result.details.push({ processNo: row.processNo, itemCode: 'B5', value: pc, source: `B4→PC: "${fc}"` });
    } else if (!row._ids.B5 && onAddItems) {
      newItems.push({ processNo: row.processNo, m4: row.m4, category: 'B', itemCode: 'B5', value: pc, createdAt: new Date() });
      result.fixed++;
      result.details.push({ processNo: row.processNo, itemCode: 'B5', value: pc, source: `B4→PC: "${fc}"` });
    } else {
      result.skipped++;
    }
  }

  if (newItems.length > 0 && onAddItems) {
    onAddItems(newItems);
  }

  return result;
}
