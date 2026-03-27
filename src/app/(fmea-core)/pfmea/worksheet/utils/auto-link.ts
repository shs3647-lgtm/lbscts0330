/**
 * @file auto-link.ts
 * @description 자동연결 유틸리티 - 동일한 상위항목에 연결된 하위항목 자동 연결
 *
 * 기능 1L ~ 고장원인까지 적용:
 * - 1L: 유형→기능, 기능→요구사항
 * - 2L: 기능→제품특성
 * - 3L: 기능→공정특성
 * - 고장1L: 요구사항→고장영향
 * - 고장2L: 제품특성→고장형태
 * - 고장3L: 공정특성→고장원인
 *
 * @version 1.0.0
 * @codefreeze 2026-01-04
 */

import { WorksheetState } from '../constants';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

/**
 * 1L 기능분석: 동일한 유형에 연결된 기능들 찾기
 */
export function findLinkedFunctionsForType(state: WorksheetState, typeName: string): string[] {
  const linkedFunctions: string[] = [];

  (state.l1?.types || []).forEach((t: AnyRecord) => {
    if (t.name === typeName) {
      (t.functions || []).forEach((f: AnyRecord) => {
        if (f.name?.trim()) {
          linkedFunctions.push(f.name);
        }
      });
    }
  });

  return [...new Set(linkedFunctions)]; // 중복 제거
}

/**
 * 1L 기능분석: 동일한 기능에 연결된 요구사항들 찾기
 */
export function findLinkedRequirementsForFunction(state: WorksheetState, functionName: string): string[] {
  const linkedRequirements: string[] = [];

  (state.l1?.types || []).forEach((t: AnyRecord) => {
    (t.functions || []).forEach((f: AnyRecord) => {
      if (f.name === functionName) {
        (f.requirements || []).forEach((r: AnyRecord) => {
          if (r.name?.trim()) {
            linkedRequirements.push(r.name);
          }
        });
      }
    });
  });

  return [...new Set(linkedRequirements)];
}

/**
 * 2L 기능분석: 동일한 기능에 연결된 제품특성들 찾기
 */
export function findLinkedProductCharsForFunction(state: WorksheetState, functionName: string): string[] {
  const linkedChars: string[] = [];

  (state.l2 || []).forEach((proc: AnyRecord) => {
    (proc.functions || []).forEach((f: AnyRecord) => {
      if (f.name === functionName) {
        (f.productChars || []).forEach((c: AnyRecord) => {
          if (c.name?.trim()) {
            linkedChars.push(c.name);
          }
        });
      }
    });
  });

  return [...new Set(linkedChars)];
}

/**
 * 3L 기능분석: 동일한 기능에 연결된 공정특성들 찾기
 */
export function findLinkedProcessCharsForFunction(state: WorksheetState, functionName: string): string[] {
  const linkedChars: string[] = [];

  (state.l2 || []).forEach((proc: AnyRecord) => {
    (proc.l3 || []).forEach((we: AnyRecord) => {
      (we.functions || []).forEach((f: AnyRecord) => {
        if (f.name === functionName) {
          (f.processChars || []).forEach((c: AnyRecord) => {
            if (c.name?.trim()) {
              linkedChars.push(c.name);
            }
          });
        }
      });
    });
  });

  return [...new Set(linkedChars)];
}

/**
 * 고장 1L: 동일한 요구사항에 연결된 고장영향들 찾기
 */
export function findLinkedFailureEffectsForRequirement(state: WorksheetState, requirementName: string): string[] {
  const linkedEffects: string[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ((state.l1 as any)?.failureScopes || []).forEach((scope: AnyRecord) => {
    if (scope.requirementName === requirementName && scope.effect) {
      linkedEffects.push(scope.effect);
    }
  });

  return [...new Set(linkedEffects)];
}

/**
 * 고장 2L: 동일한 제품특성에 연결된 고장형태들 찾기
 */
export function findLinkedFailureModesForProductChar(state: WorksheetState, productCharName: string): string[] {
  const linkedModes: string[] = [];

  (state.l2 || []).forEach((proc: AnyRecord) => {
    (proc.failureModes || []).forEach((fm: AnyRecord) => {
      // 제품특성 ID로 찾거나, 이름으로 매칭
      const linkedChar = (proc.functions || []).flatMap((f: AnyRecord) => f.productChars || [])
        .find((c: AnyRecord) => c.id === fm.productCharId || c.name === productCharName);

      if (linkedChar && linkedChar.name === productCharName && fm.name) {
        linkedModes.push(fm.name);
      }
    });
  });

  return [...new Set(linkedModes)];
}

/**
 * 고장 3L: 동일한 공정특성에 연결된 고장원인들 찾기
 */
export function findLinkedFailureCausesForProcessChar(state: WorksheetState, processCharName: string): string[] {
  const linkedCauses: string[] = [];

  (state.l2 || []).forEach((proc: AnyRecord) => {
    (proc.failureCauses || []).forEach((fc: AnyRecord) => {
      // 공정특성 ID로 찾거나, 이름으로 매칭
      const linkedChar = (proc.l3 || []).flatMap((we: AnyRecord) =>
        (we.functions || []).flatMap((f: AnyRecord) => f.processChars || [])
      ).find((c: AnyRecord) => c.id === fc.processCharId || c.name === processCharName);

      if (linkedChar && linkedChar.name === processCharName && fc.name) {
        linkedCauses.push(fc.name);
      }
    });
  });

  return [...new Set(linkedCauses)];
}

/**
 * 리스크분석: 동일한 고장원인에 연결된 예방관리들 찾기
 * @param riskData state.riskData 객체
 * @param failureLinks 고장연결 데이터 (고장원인 텍스트 포함)
 * @param currentFcText 현재 행의 고장원인 텍스트
 * @returns 동일한 고장원인에 연결된 예방관리 목록
 */
export function findLinkedPreventionControlsForFailureCause(
  riskData: Record<string, number | string> | undefined,
  failureLinks: Array<{ fcText?: string }>,
  currentFcText: string
): string[] {
  if (!riskData || !currentFcText || !failureLinks) return [];

  const linkedPreventions: string[] = [];

  // 동일한 고장원인을 가진 행들의 인덱스 찾기
  const matchingRowIndices: number[] = [];
  failureLinks.forEach((link, idx) => {
    if (link.fcText === currentFcText) {
      matchingRowIndices.push(idx);
    }
  });

  // 해당 행들에서 이미 입력된 예방관리 찾기
  matchingRowIndices.forEach(rowIdx => {
    const key = `prevention-${rowIdx}`;
    const prevention = riskData[key];
    if (prevention && typeof prevention === 'string' && prevention.trim() !== '') {
      linkedPreventions.push(prevention);
    }
  });

  return [...new Set(linkedPreventions)]; // 중복 제거
}

/**
 * 자동연결 적용 함수
 * @param existingItems 현재 이미 연결된 항목들
 * @param linkedItems 다른 곳에서 연결된 항목들
 * @returns 새로 추가해야 할 항목들
 */
export function getAutoLinkItems(existingItems: string[], linkedItems: string[]): string[] {
  const existingSet = new Set(existingItems.filter(item => item?.trim()));
  return linkedItems.filter(item => !existingSet.has(item));
}

/**
 * 자동연결 알림 메시지 생성
 */
export function getAutoLinkMessage(autoLinkedItems: string[], itemType: string): string {
  if (autoLinkedItems.length === 0) return '';

  const itemList = autoLinkedItems.slice(0, 3).join(', ');
  const more = autoLinkedItems.length > 3 ? ` 외 ${autoLinkedItems.length - 3}건` : '';

  return `✨ 자동연결: ${itemList}${more} (기존 연결 기반)`;
}

