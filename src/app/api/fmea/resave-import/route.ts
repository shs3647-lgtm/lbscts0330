/**
 * @file resave-import/route.ts
 * @description DB에 저장된 flatData + failureChains로 save-from-import 재실행
 *
 * GET /api/fmea/resave-import?fmeaId=xxx
 *   - dry-run: 파이프라인 결과만 반환 (저장하지 않음)
 *
 * POST /api/fmea/resave-import?fmeaId=xxx
 *   - 실제 저장 실행
 *
 * 핵심 기능: 체인의 FM/FE/FC가 flat data와 불일치할 때,
 * 워크시트 상태를 체인 데이터로 보강하여 injectFailureChains 매칭률 극대화
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import { enrichStateFromChains, type ChainRecord } from '@/lib/enrich-state-from-chains';

import type { Process } from '@/app/(fmea-core)/pfmea/worksheet/constants';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return handleResave(request, false);
}

export async function POST(request: NextRequest) {
  return handleResave(request, true);
}

async function handleResave(request: NextRequest, doSave: boolean) {
  const fmeaId = (request.nextUrl.searchParams.get('fmeaId') || request.nextUrl.searchParams.get('id'))?.toLowerCase();

  if (!fmeaId || !isValidFmeaId(fmeaId)) {
    return NextResponse.json({ error: 'fmeaId required or invalid' }, { status: 400 });
  }

  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  }

  const diag: Record<string, unknown> = {};

  try {
    // 1. Load dataset
    const dataset = await prisma.pfmeaMasterDataset.findFirst({
      where: { fmeaId, isActive: true },
      select: { id: true, fmeaId: true, failureChains: true },
    });

    if (!dataset) {
      return NextResponse.json({ error: `No active dataset for ${fmeaId}` }, { status: 404 });
    }
    diag['1_dataset'] = { id: dataset.id };

    // 2. Load flat items
    const flatItems = await prisma.pfmeaMasterFlatItem.findMany({
      where: { datasetId: dataset.id },
      orderBy: { orderIndex: 'asc' },
      select: {
        id: true,
        itemCode: true,
        processNo: true,
        value: true,
        parentItemId: true,
      },
    });
    // itemCode breakdown
    const itemCodeCounts: Record<string, number> = {};
    for (const item of flatItems) {
      itemCodeCounts[item.itemCode] = (itemCodeCounts[item.itemCode] || 0) + 1;
    }
    diag['2_flatItems'] = { total: flatItems.length, itemCodes: itemCodeCounts };

    // 3. Convert to flatData format
    const flatData = flatItems.map(item => ({
      id: item.id,
      itemCode: item.itemCode,
      processNo: item.processNo || '',
      value: item.value || '',
      parentItemId: item.parentItemId || '',
      category: (item.itemCode.charAt(0) as 'A' | 'B' | 'C'),
      createdAt: new Date(),
    }));

    // 4. Get failureChains
    const failureChains = Array.isArray(dataset.failureChains)
      ? (dataset.failureChains as ChainRecord[])
      : [];
    diag['3_failureChains'] = { count: failureChains.length };

    // 4b. Get l1Name from registration (partName 우선)
    let l1Name = '';
    try {
      const reg = await prisma.fmeaRegistration.findUnique({
        where: { fmeaId },
        select: { partName: true, subject: true },
      });
      if (reg) {
        const raw = reg.partName || reg.subject || '';
        // 방어적 정규화: 접미사 제거 (PFMEA/DFMEA/FMEA/생산공정)
        l1Name = raw.replace(/\+?(PFMEA|DFMEA|FMEA|생산공정)\s*$/i, '').trim();
      }
    } catch { /* registration not found */ }
    diag['4b_l1Name'] = l1Name || '(empty)';

    // 5. buildWorksheetState
    const { buildWorksheetState } = await import(
      '@/app/(fmea-core)/pfmea/import/utils/buildWorksheetState'
    );
    const buildResult = buildWorksheetState(flatData, { fmeaId, l1Name });

    if (!buildResult.success) {
      return NextResponse.json({
        error: 'buildWorksheetState failed',
        diagnostics: buildResult.diagnostics,
        diag,
      });
    }
    // B1 items debug - check which processNo each B1 item has
    const b1Items = flatData.filter(i => i.itemCode === 'B1');
    const b1Debug = b1Items.map(i => ({ processNo: i.processNo, value: i.value?.substring(0, 30) }));

    // L3 per process
    const l3PerProc: Record<string, number> = {};
    for (const proc of (buildResult.state?.l2 || [])) {
      l3PerProc[proc.no] = proc.l3?.length ?? 0;
    }

    diag['4_buildResult'] = {
      success: true,
      diagnostics: buildResult.diagnostics,
      l2Count: buildResult.state?.l2?.length ?? 0,
      b1Items: b1Debug,
      l3PerProcess: l3PerProc,
    };

    // ★★★ 5.5. 체인 기반 상태 보강 ★★★
    const enrichStats = enrichStateFromChains(buildResult.state, failureChains);
    diag['5_enrichment'] = enrichStats;

    // 보강 후 상태 카운트
    const postEnrichCounts = {
      feCount: buildResult.state?.l1?.failureScopes?.length ?? 0,
      fmCount: (buildResult.state?.l2 || []).reduce(
        (sum: number, p: Process) => sum + (p.failureModes?.length ?? 0), 0
      ),
      fcCount: (buildResult.state?.l2 || []).reduce(
        (sum: number, p: Process) => sum + (p.l3 || []).reduce(
          (s2: number, we) => s2 + (we.failureCauses?.length ?? 0), 0
        ) + (p.failureCauses?.length ?? 0), 0
      ),
    };
    diag['5b_postEnrichCounts'] = postEnrichCounts;

    // 6. assignEntityUUIDsToChains → injectFailureChains (UUID FK 기반)
    let injectedLinks: unknown[] = [];
    let injectedRisk: Record<string, number | string> = {};
    if (failureChains.length > 0) {
      const { assignEntityUUIDsToChains } = await import(
        '@/app/(fmea-core)/pfmea/import/utils/assignChainUUIDs'
      );
      // ★ 2026-03-15: chain에 UUID FK 할당 (텍스트 매칭 제거)
      assignEntityUUIDsToChains(buildResult.state, failureChains as any);
      const { injectFailureChains } = await import(
        '@/app/(fmea-core)/pfmea/import/utils/failureChainInjector'
      );
      const injection = injectFailureChains(buildResult.state, failureChains as any);
      injectedLinks = injection.failureLinks as unknown[];
      injectedRisk = injection.riskData;
      diag['6_injection'] = {
        injectedCount: injection.injectedCount,
        skippedCount: injection.skippedCount,
        autoCreated: injection.autoCreated,
        linkCount: injectedLinks.length,
        riskKeyCount: Object.keys(injectedRisk).length,
      };
    } else {
      diag['6_injection'] = { skipped: 'no failureChains' };
    }

    // 7. FM gap feedback
    const { applyFmGapFeedback } = await import(
      '@/app/(fmea-core)/pfmea/import/utils/fm-gap-feedback'
    );
    const feedback = applyFmGapFeedback(buildResult.state, flatData);
    diag['7_feedback'] = {
      totalAdded: feedback.totalAdded,
      summary: feedback.summary,
    };

    // 8. Build legacyData
    const legacyData = {
      fmeaId,
      l1: buildResult.state.l1,
      l2: buildResult.state.l2,
      failureLinks: injectedLinks,
      riskData: injectedRisk,
      forceOverwrite: true,
      structureConfirmed: false,
      l1Confirmed: false,
      l2Confirmed: false,
      l3Confirmed: false,
      failureL1Confirmed: false,
      failureL2Confirmed: false,
      failureL3Confirmed: false,
      failureLinkConfirmed: injectedLinks.length > 0,
      riskConfirmed: false,
      optimizationConfirmed: false,
    };

    // 9. migrateToAtomicDB
    const { migrateToAtomicDB } = await import(
      '@/app/(fmea-core)/pfmea/worksheet/migration'
    );
    const legacyCopy = JSON.parse(JSON.stringify(legacyData));
    const atomicDB = migrateToAtomicDB(legacyCopy);
    Object.assign(atomicDB, { forceOverwrite: true });

    diag['8_atomicDB'] = {
      l1Structure: atomicDB.l1Structure ? 'exists' : 'null',
      l2Structures: atomicDB.l2Structures?.length ?? 0,
      l3Structures: atomicDB.l3Structures?.length ?? 0,
      l1Functions: atomicDB.l1Functions?.length ?? 0,
      l2Functions: atomicDB.l2Functions?.length ?? 0,
      l3Functions: atomicDB.l3Functions?.length ?? 0,
      failureEffects: atomicDB.failureEffects?.length ?? 0,
      failureModes: atomicDB.failureModes?.length ?? 0,
      failureCauses: atomicDB.failureCauses?.length ?? 0,
      failureLinks: atomicDB.failureLinks?.length ?? 0,
      riskAnalyses: atomicDB.riskAnalyses?.length ?? 0,
    };

    if (!doSave) {
      return NextResponse.json({
        success: true,
        mode: 'dry-run',
        fmeaId,
        diag,
      });
    }

    // 10. Actually save via POST /api/fmea
    const requestBody = {
      ...atomicDB,
      legacyData: legacyData || null,
    };

    const origin = request.nextUrl.origin;
    const postRes = await fetch(`${origin}/api/fmea`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const postResult = await postRes.json();
    diag['9_save'] = {
      status: postRes.status,
      ok: postRes.ok,
      success: postResult.success,
      message: postResult.message,
      error: postResult.error,
      preventedOverwrite: postResult.preventedOverwrite,
      step: postResult.step,
      code: postResult.code,
    };

    return NextResponse.json({
      success: postResult.success,
      mode: 'saved',
      fmeaId,
      diag,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[resave-import] error:', msg, e instanceof Error ? e.stack : '');
    return NextResponse.json(
      { error: safeErrorMessage(e), diag },
      { status: 500 }
    );
  }
}
