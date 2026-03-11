/**
 * @file diagnose-save/route.ts
 * @description Import→DB 파이프라인 진단 API
 *
 * GET /api/fmea/diagnose-save?fmeaId=xxx
 *   - flatData 로드 → buildWorksheetState → migrateToAtomicDB → 결과 비교
 *
 * GET /api/fmea/diagnose-save?fmeaId=xxx&save=true
 *   - 위 + 실제 POST /api/fmea 호출
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const fmeaId = request.nextUrl.searchParams.get('fmeaId')?.toLowerCase();
  const doSave = request.nextUrl.searchParams.get('save') === 'true';

  if (!fmeaId) {
    return NextResponse.json({ error: 'fmeaId required' }, { status: 400 });
  }

  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  }

  const steps: Record<string, unknown> = {};

  try {
    // Step 1: Load dataset
    const dataset = await prisma.pfmeaMasterDataset.findFirst({
      where: { fmeaId, isActive: true },
      select: { id: true, fmeaId: true, failureChains: true },
    });

    if (!dataset) {
      return NextResponse.json({ error: `No active dataset for ${fmeaId}` });
    }
    steps['1_dataset'] = { id: dataset.id, fmeaId: dataset.fmeaId };

    // Step 2: Load flat items
    const flatItems = await prisma.pfmeaMasterFlatItem.findMany({
      where: { datasetId: dataset.id },
      select: {
        id: true,
        itemCode: true,
        processNo: true,
        value: true,
        parentItemId: true,
      },
    });
    steps['2_flatItems'] = { total: flatItems.length };

    // Step 3: Convert to ImportedFlatData format
    const flatData = flatItems.map(item => ({
      id: item.id,
      itemCode: item.itemCode,
      processNo: item.processNo || '',
      value: item.value || '',
      parentItemId: item.parentItemId || '',
      category: (item.itemCode.charAt(0) as 'A' | 'B' | 'C'),
      createdAt: new Date(),
    }));
    steps['3_flatData'] = { count: flatData.length };

    // Step 4: buildWorksheetState
    const { buildWorksheetState } = await import(
      '@/app/(fmea-core)/pfmea/import/utils/buildWorksheetState'
    );

    const buildResult = buildWorksheetState(flatData, { fmeaId });
    steps['4_buildResult'] = {
      success: buildResult.success,
      diagnostics: buildResult.diagnostics,
      l1Name: buildResult.state?.l1?.name,
      l2Count: buildResult.state?.l2?.length ?? 0,
      l2Names: buildResult.state?.l2?.map((p: { no: string; name: string }) => `${p.no}:${p.name}`) ?? [],
    };

    if (!buildResult.success) {
      return NextResponse.json({ steps, error: 'buildWorksheetState failed' });
    }

    // Step 5: Build legacyData (same as saveWorksheetFromImport)
    const normalizedFmeaId = fmeaId.toLowerCase();
    const legacyData = {
      fmeaId: normalizedFmeaId,
      l1: buildResult.state.l1,
      l2: buildResult.state.l2,
      failureLinks: [],
      riskData: {},
      forceOverwrite: true,
      structureConfirmed: false,
      l1Confirmed: false,
      l2Confirmed: false,
      l3Confirmed: false,
      failureL1Confirmed: false,
      failureL2Confirmed: false,
      failureL3Confirmed: false,
      failureLinkConfirmed: false,
      riskConfirmed: false,
      optimizationConfirmed: false,
    };

    // Step 6: migrateToAtomicDB
    const { migrateToAtomicDB } = await import(
      '@/app/(fmea-core)/pfmea/worksheet/migration'
    );
    const legacyCopy = JSON.parse(JSON.stringify(legacyData));
    const atomicDB = migrateToAtomicDB(legacyCopy);

    steps['6_atomicDB'] = {
      fmeaId: atomicDB.fmeaId,
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

    // Step 7: Optionally save
    if (doSave) {
      Object.assign(atomicDB, { forceOverwrite: true });
      const requestBody = { ...atomicDB, legacyData: legacyData || null };

      // Get the base URL from the request
      const origin = request.nextUrl.origin;
      const postRes = await fetch(`${origin}/api/fmea`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const postResult = await postRes.json();
      steps['7_save'] = {
        status: postRes.status,
        ok: postRes.ok,
        success: postResult.success,
        message: postResult.message,
        error: postResult.error,
        preventedOverwrite: postResult.preventedOverwrite,
        step: postResult.step,
        code: postResult.code,
      };
    }

    return NextResponse.json({ success: true, fmeaId, steps });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[diagnose-save] error:', msg, e instanceof Error ? e.stack : '');
    return NextResponse.json({ error: msg, steps }, { status: 500 });
  }
}
