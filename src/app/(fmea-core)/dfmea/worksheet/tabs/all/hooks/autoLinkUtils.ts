/**
 * @file autoLinkUtils.ts
 * @description 자동연결 카운팅 — Map 기반 O(1) lookup 유틸리티
 *
 * useControlModalSave.ts의 반복 forEach 순회(8회)를 단일 Map 구축(1회) + O(matches) lookup으로 대체.
 * 순수 함수로 추출하여 테스트 가능하게 함.
 *
 * @created 2026-03-04
 */

import type { ProcessedFMGroup } from '../processFailureLinks';
import type { WorksheetState } from '../../../../worksheet/constants';

// ═══════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════

/** 자동연결 인덱스 행 */
export interface IndexRow {
  gFmId: string;
  rFcId: string;
  rFcText: string;
  gProcessNo: string;
  gFmText: string;
}

/** 자동연결 인덱스 */
export interface AutoLinkIndex {
  /** FC 텍스트 → 해당 행 목록 (동일원인 자동연결용) */
  rowsByFcText: Map<string, IndexRow[]>;
  /** FM 텍스트 → 해당 행 목록 (동일 고장형태 자동연결용) */
  rowsByFmText: Map<string, IndexRow[]>;
}

/** 자동연결 카운트 결과 */
export interface AutoLinkCounts {
  /** 자동연결 1: 같은 공정 + 동일 FC텍스트 → PC/DC 자동연결 */
  autoLinkedCount: number;
  /** 자동연결 4: 검출관리 - 같은 공정 + 동일 FM텍스트 → 빈 DC 자동연결 */
  fmDetectionAutoLinkedCount: number;
  /** 자동연결 2: 동일 예방관리 → 발생도 동기화 */
  occurrenceAutoLinkedCount: number;
  /** 자동연결 3: 동일 FM 내 동일 검출관리 → 검출도 동기화 */
  detectionAutoLinkedCount: number;
  /** 검출관리 선택 시 기존 검출도 자동 적용값 */
  autoAppliedDetectionValue: number | null;
}

/** countAutoLinks 파라미터 */
export interface CountAutoLinksParams {
  index: AutoLinkIndex;
  groups: ProcessedFMGroup[];
  state: WorksheetState;
  saveType: string;
  currentFcId: string;
  currentFcText: string;
  currentProcessNo: string;
  currentFmId: string;
  selectedValue: string;
}

// ═══════════════════════════════════════════
// P:/D: 접두어 제거 (기존 stripTypePrefix 동일)
// ═══════════════════════════════════════════

function stripTypePrefix(val: string): string {
  return val.split('\n').map(line => line.replace(/^\[(?:FM|FC)\]/, '').replace(/^[PD]:/, '')).join('\n');
}

// ═══════════════════════════════════════════
// 1. buildAutoLinkIndex — Map 사전 구축 (1회)
// ═══════════════════════════════════════════

/**
 * processedFMGroups를 1회 순회하여 FC텍스트/FM텍스트 기반 인덱스 구축
 * 기존: 8회 forEach → 이 함수: 1회
 */
export function buildAutoLinkIndex(groups: ProcessedFMGroup[]): AutoLinkIndex {
  const rowsByFcText = new Map<string, IndexRow[]>();
  const rowsByFmText = new Map<string, IndexRow[]>();

  for (const group of groups) {
    for (const r of group.rows) {
      const entry: IndexRow = {
        gFmId: group.fmId,
        rFcId: r.fcId,
        rFcText: r.fcText,
        gProcessNo: group.fmProcessNo,
        gFmText: group.fmText,
      };

      // fcText 인덱스
      const fcArr = rowsByFcText.get(r.fcText);
      if (fcArr) {
        fcArr.push(entry);
      } else {
        rowsByFcText.set(r.fcText, [entry]);
      }

      // fmText 인덱스
      const fmArr = rowsByFmText.get(group.fmText);
      if (fmArr) {
        fmArr.push(entry);
      } else {
        rowsByFmText.set(group.fmText, [entry]);
      }
    }
  }

  return { rowsByFcText, rowsByFmText };
}

// ═══════════════════════════════════════════
// 2. countAutoLinks — O(matches) 카운팅
// ═══════════════════════════════════════════

/**
 * Map 기반 자동연결 카운트 (기존 4개 forEach → O(matches) lookup)
 */
export function countAutoLinks(params: CountAutoLinksParams): AutoLinkCounts {
  const { index, groups, state, saveType, currentFcId, currentFcText, currentProcessNo, currentFmId, selectedValue } = params;

  const result: AutoLinkCounts = {
    autoLinkedCount: 0,
    fmDetectionAutoLinkedCount: 0,
    occurrenceAutoLinkedCount: 0,
    detectionAutoLinkedCount: 0,
    autoAppliedDetectionValue: null,
  };

  const autoLinkTypes = ['prevention', 'detection'];
  const isAutoLinkType = autoLinkTypes.includes(saveType);

  // ─── 자동연결 1: 같은 공정 + 동일 FC텍스트 ───
  if (isAutoLinkType && currentFcText) {
    const matches = index.rowsByFcText.get(currentFcText) || [];
    for (const m of matches) {
      if (m.gProcessNo === currentProcessNo && m.rFcId !== currentFcId) {
        result.autoLinkedCount++;
      }
    }
  }

  // ─── 자동연결 4: 검출관리 - 같은 공정 + 동일 FM텍스트 → 빈 DC ───
  if (saveType === 'detection' && currentProcessNo) {
    const currentGroup = groups.find(g => g.fmId === currentFmId);
    const fmText = currentGroup?.fmText || '';
    if (fmText) {
      const matches = index.rowsByFmText.get(fmText) || [];
      for (const m of matches) {
        if (m.gProcessNo !== currentProcessNo) continue;
        // 자기자신 제외
        if (m.gFmId === currentFmId && m.rFcId === currentFcId) continue;
        // auto-link 1이 처리하는 동일 fcText 제외
        if (m.rFcText === currentFcText) continue;
        const existingKey = `detection-${m.gFmId}-${m.rFcId}`;
        if (!state?.riskData?.[existingKey]) {
          result.fmDetectionAutoLinkedCount++;
        }
      }
    }
  }

  // ─── 자동연결 2: 동일 예방관리 → 발생도 동기화 ───
  if (saveType === 'prevention' && state) {
    const currentOKey = currentFmId && currentFcId
      ? `risk-${currentFmId}-${currentFcId}-O` : '';
    const currentO = currentOKey ? state.riskData?.[currentOKey] : undefined;

    if (typeof currentO === 'number' && currentO >= 1 && currentO <= 10) {
      // 모든 행에서 같은 prevention 값을 가진 행 찾기 (Map으로 최적화하기 어려운 부분 — riskData 조회 필요)
      for (const group of groups) {
        for (const r of group.rows) {
          if (group.fmId === currentFmId && r.fcId === currentFcId) continue;
          const targetUK = `${group.fmId}-${r.fcId}`;
          const targetPVal = state.riskData?.[`prevention-${targetUK}`] || '';
          if (stripTypePrefix(String(targetPVal)) === stripTypePrefix(selectedValue)) {
            const existingO = state.riskData?.[`risk-${targetUK}-O`];
            if (!existingO || existingO !== currentO) {
              result.occurrenceAutoLinkedCount++;
            }
          }
        }
      }
    }
  }

  // ─── 자동연결 3: 동일 FM 내 동일 검출관리 → 검출도 동기화 ───
  if (saveType === 'detection' && state && currentFmId) {
    const currentDKey = currentFmId && currentFcId
      ? `risk-${currentFmId}-${currentFcId}-D` : '';
    const currentD = currentDKey ? state.riskData?.[currentDKey] : undefined;

    if (typeof currentD === 'number' && currentD >= 1 && currentD <= 10) {
      const currentGroup = groups.find(g => g.fmId === currentFmId);
      if (currentGroup) {
        for (const r of currentGroup.rows) {
          if (r.fcId === currentFcId) continue;
          const targetUK = `${currentFmId}-${r.fcId}`;
          const targetDVal = state.riskData?.[`detection-${targetUK}`] || '';
          if (stripTypePrefix(String(targetDVal)) === stripTypePrefix(selectedValue)) {
            const existingD = state.riskData?.[`risk-${targetUK}-D`];
            if (!existingD || existingD !== currentD) {
              result.detectionAutoLinkedCount++;
            }
          }
        }
      }
    }

    // ─── 검출관리 선택 시 이미 지정된 검출도 자동 적용 ───
    const currentGroup = groups.find(g => g.fmId === currentFmId);
    if (currentGroup) {
      for (const r of currentGroup.rows) {
        if (r.fcId === currentFcId) continue;
        const targetUK = `${currentFmId}-${r.fcId}`;
        const targetDVal = state.riskData?.[`detection-${targetUK}`] || '';
        if (stripTypePrefix(String(targetDVal)) === stripTypePrefix(selectedValue)) {
          const existingD = state.riskData?.[`risk-${targetUK}-D`];
          if (typeof existingD === 'number' && existingD >= 1 && existingD <= 10) {
            result.autoAppliedDetectionValue = existingD;
            break;
          }
        }
      }
    }
  }

  return result;
}
