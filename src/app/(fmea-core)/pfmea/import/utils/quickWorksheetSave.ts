/**
 * @file quickWorksheetSave.ts
 * @description 워크시트 원클릭 생성 — SA/FC/FA 검증 없이 바로 저장 + 이동
 *
 * 4개 탭(기존/수동/자동/전처리) 공용:
 *   1. FMEA 프로젝트 존재 확인 → 자동 생성
 *   2. saveWorksheetFromImport() → L2/L3/FM/FC/FE DB 저장
 *   3. Master DB에 flatData + failureChains 저장
 *
 * @created 2026-03-10
 */

import type { ImportedFlatData } from '../types';
import type { MasterFailureChain } from '../types/masterFailureChain';
import { buildFailureChainsFromFlat } from '../types/masterFailureChain';
import type { CrossTab } from './template-delete-logic';
// supplementMissingItems 삭제됨 (2026-03-22)
const supplementMissingItems = (_flatData: any[], ..._args: any[]) => [] as any[];

export interface QuickSaveParams {
  fmeaId: string;
  flatData: ImportedFlatData[];
  l1Name?: string;
  failureChains?: MasterFailureChain[];
  externalChains?: MasterFailureChain[];
  crossTab?: CrossTab;
  fmeaInfo?: {
    subject?: string;
    companyName?: string;
    customerName?: string;
    modelYear?: string;
    fmeaType?: string;
    engineeringLocation?: string;
    designResponsibility?: string;
    fmeaResponsibleName?: string;
    partName?: string;
    partNo?: string;
  };
}

export interface QuickSaveResult {
  success: boolean;
  error?: string;
  diagnostics?: {
    l2Count: number;
    l3Count: number;
    fmCount: number;
    fcCount: number;
    feCount: number;
  };
}

/**
 * 워크시트 원클릭 생성 — 검증 없이 바로 저장
 * SA+FC+FA를 한 번에 실행하고 결과를 반환
 */
export async function quickWorksheetSave(params: QuickSaveParams): Promise<QuickSaveResult> {
  const {
    fmeaId, flatData, l1Name,
    failureChains, externalChains, crossTab,
    fmeaInfo,
  } = params;

  if (!fmeaId) {
    return { success: false, error: 'FMEA 프로젝트가 선택되지 않았습니다.' };
  }
  if (flatData.length === 0) {
    return { success: false, error: '기초정보 데이터가 없습니다. 먼저 데이터를 생성하세요.' };
  }

  try {
    // ── 1. FMEA 프로젝트 존재 확인 + 자동 생성 ──
    const normalizedId = fmeaId.toLowerCase();
    try {
      const projRes = await fetch(`/api/fmea/projects?id=${encodeURIComponent(normalizedId)}`);
      const projData = await projRes.json();
      const projectExists = projData.success && projData.projects?.length > 0
        && projData.projects.some((p: { id?: string }) => p.id?.toLowerCase() === normalizedId);

      if (!projectExists) {
        const createPayload = {
          fmeaId: normalizedId,
          fmeaType: fmeaInfo?.fmeaType || 'P',
          project: { projectName: fmeaInfo?.subject || l1Name || '' },
          fmeaInfo: {
            subject: fmeaInfo?.subject || l1Name || '',
            companyName: fmeaInfo?.companyName || '',
            customerName: fmeaInfo?.customerName || '',
            modelYear: fmeaInfo?.modelYear || '',
            fmeaType: fmeaInfo?.fmeaType || 'P',
            engineeringLocation: fmeaInfo?.engineeringLocation || '',
            designResponsibility: fmeaInfo?.designResponsibility || '',
            fmeaResponsibleName: fmeaInfo?.fmeaResponsibleName || '',
            partName: fmeaInfo?.partName || '',
            partNo: fmeaInfo?.partNo || '',
          },
        };
        const createRes = await fetch('/api/fmea/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createPayload),
        });
        const createResult = await createRes.json();
        if (!createResult.success && !createResult.dbSaved) {
          return {
            success: false,
            error: '프로젝트 등록에 실패했습니다.\n등록 화면에서 저장 버튼을 먼저 눌러주세요.',
          };
        }
      }
    } catch (projErr) {
      console.error('[quickSave] 프로젝트 확인/생성 실패:', projErr);
      return {
        success: false,
        error: '프로젝트 등록 확인에 실패했습니다.\nDB 연결 상태를 확인해주세요.',
      };
    }

    // ── 2. 고장사슬 확보 (externalChains > failureChains > auto-derive) ──
    const emptyCrossTab: CrossTab = { aRows: [], bRows: [], cRows: [], total: 0 };
    const usedChains =
      (externalChains && externalChains.length > 0) ? externalChains
      : (failureChains && failureChains.length > 0) ? failureChains
      : buildFailureChainsFromFlat(flatData, crossTab ?? emptyCrossTab);

    // ── 2.5. ★ 누락 항목 보충 — buildWorksheetState 전에 B1 등 자동 보충 ──
    const supplements = supplementMissingItems(flatData, usedChains);
    const enrichedFlatData = supplements.length > 0 ? [...flatData, ...supplements] : flatData;
    if (supplements.length > 0) {
      console.info(`[quickSave] 누락 보충: ${supplements.length}건 자동 생성`);
    }

    // ── 3. 워크시트 생성 + DB 저장 ──
    const { saveWorksheetFromImport } = await import('./saveWorksheetFromImport');
    const wsResult = await saveWorksheetFromImport({
      fmeaId,
      flatData: enrichedFlatData,
      l1Name,
      failureChains: usedChains,
    });

    // ── 4. Master DB에 flatData + failureChains 저장 ──
    if (fmeaId && enrichedFlatData.length > 0) {
      try {
        const feedbackItems = wsResult.feedback?.additionalItems || [];
        const mergedFlatData = feedbackItems.length > 0
          ? [...enrichedFlatData, ...feedbackItems]
          : enrichedFlatData;

        // failureChains PATCH
        if (usedChains.length > 0) {
          await fetch(
            '/api/pfmea/master?fmeaId=' + encodeURIComponent(fmeaId),
            { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ failureChains: usedChains }) },
          );
        }
        // flatData 저장
        const { saveMasterDataset } = await import('./master-api');
        await saveMasterDataset({
          fmeaId,
          fmeaType: fmeaInfo?.fmeaType || 'P',
          parentFmeaId: null,
          replace: true,
          flatData: mergedFlatData,
        });
      } catch (masterErr) {
        console.error('[quickSave] Master DB 저장 실패:', masterErr);
        // Master 저장 실패해도 워크시트는 이미 생성됨 — 비차단
      }
    }

    if (wsResult.success) {
      const dd = wsResult.buildResult.diagnostics;
      return {
        success: true,
        diagnostics: {
          l2Count: dd.l2Count,
          l3Count: dd.l3Count,
          fmCount: dd.fmCount,
          fcCount: dd.fcCount,
          feCount: dd.feCount,
        },
      };
    }

    return {
      success: false,
      error: wsResult.error || '워크시트 생성 실패',
    };

  } catch (err) {
    console.error('[quickSave] 오류:', err);
    return {
      success: false,
      error: '워크시트 생성 중 오류: ' + (err instanceof Error ? err.message : String(err)),
    };
  }
}
