/**
 * @file save-from-import/route.ts
 * @description Import→DB 서버사이드 저장 API
 *
 * POST /api/fmea/save-from-import
 * Body: { fmeaId, flatData, l1Name?, failureChains? }
 *
 * 2026-03-21: buildAtomicFromFlat() 단일 경로로 전환
 * - buildWorksheetState + migrateToAtomicDB 2단계 제거
 * - reversePath 로직 제거
 * - FlatData + Chains → Atomic DB 직접 변환 (1단계)
 */
import { NextRequest, NextResponse } from 'next/server';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import { getBaseDatabaseUrl, getPrismaForSchema } from '@/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fmeaId, flatData, l1Name, failureChains } = body;

    // 1. 입력 검증
    if (!fmeaId || !isValidFmeaId(fmeaId)) {
      return NextResponse.json(
        { success: false, error: 'fmeaId가 없거나 유효하지 않습니다' },
        { status: 400 }
      );
    }
    if (!Array.isArray(flatData) || flatData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'flatData가 비어있습니다' },
        { status: 400 }
      );
    }

    const normalizedFmeaId = fmeaId.toLowerCase();

    // ★★★ ImportMapping: ImportJob 생성 (status: pending) ★★★
    const { createImportJobData, serializeFlatMap } = await import('@/lib/import/importJobManager');
    const importJobData = createImportJobData(normalizedFmeaId, {
      flatDataCount: flatData.length,
      chainCount: Array.isArray(failureChains) ? failureChains.length : 0,
    });

    // 1.5. ★ 누락 항목 보충 — buildAtomicFromFlat 전에 B1 등 누락 보충
    const { supplementMissingItems } = await import(
      '@/app/(fmea-core)/pfmea/import/utils/supplementMissingItems'
    );
    const chainsArray = Array.isArray(failureChains) && failureChains.length > 0
      ? failureChains : undefined;
    const supplements = supplementMissingItems(flatData, chainsArray || []);
    const enrichedFlatData = supplements.length > 0 ? [...flatData, ...supplements] : flatData;
    if (supplements.length > 0) {
      console.info(`[save-from-import] 누락 보충: ${supplements.length}건`);
    }

    // 1.7. ★ 파싱 검증→자동수정→피드백 파이프라인 실행
    const { runParseValidationPipeline, formatValidationReport } = await import(
      '@/app/(fmea-core)/pfmea/import/utils/parseValidationPipeline'
    );
    const parseValidation = runParseValidationPipeline(
      enrichedFlatData,
      chainsArray || [],
      normalizedFmeaId,
      { autoFix: false }, // ★★★ 2026-03-21 FIX: autoFix 비활성화 — "부적합" 자동생성 금지 (Rule 1.5)
    );
    if (parseValidation.fixes.length > 0 || parseValidation.summary.failed > 0) {
      console.info(formatValidationReport(parseValidation));
    }

    // 2. buildAtomicFromFlat (FlatData + Chains → Atomic DB 직접 변환)
    const { buildAtomicFromFlat } = await import(
      '@/app/(fmea-core)/pfmea/import/utils/buildAtomicFromFlat'
    );
    const atomicDB = buildAtomicFromFlat({
      fmeaId: normalizedFmeaId,
      flatData: enrichedFlatData,
      chains: chainsArray || [],
      l1Name: l1Name || '',
    });

    console.info(
      `[save-from-import] buildAtomicFromFlat 완료: ` +
      `L2=${atomicDB.l2Structures.length} L3=${atomicDB.l3Structures.length} ` +
      `L2F=${atomicDB.l2Functions.length} L3F=${atomicDB.l3Functions.length} ` +
      `FM=${atomicDB.failureModes.length} FC=${atomicDB.failureCauses.length} ` +
      `FE=${atomicDB.failureEffects.length} FL=${atomicDB.failureLinks.length} ` +
      `RA=${atomicDB.riskAnalyses.length}`
    );

    // ★★★ ImportMapping: flatMap 직렬화 (buildAtomicFromFlat은 flatMap 미생성 → 빈 배열)
    const importMappingRecords: ReturnType<typeof serializeFlatMap> = [];

    // 3.5. A6/B5 riskData 보충 (Phase 4 안전망) — chains + atomicDB.failureLinks 기반
    {
      const a6Items = flatData.filter((d: { itemCode?: string; value?: string }) =>
        d.itemCode === 'A6' && d.value?.trim()
      );
      const b5Items = flatData.filter((d: { itemCode?: string; value?: string }) =>
        d.itemCode === 'B5' && d.value?.trim()
      );

      if ((a6Items.length > 0 || b5Items.length > 0) && atomicDB.failureLinks.length > 0) {
        // Build processNo → links mapping from atomicDB
        // FM.id contains L2-{pno} pattern → extract processNo
        const fmPnoMap = new Map<string, string>();
        for (const fm of atomicDB.failureModes) {
          const pnoMatch = fm.id.match(/L2-(\d+)/);
          if (pnoMatch) fmPnoMap.set(fm.id, pnoMatch[1]);
        }

        const linksByProc = new Map<string, Array<{ fmId: string; fcId: string }>>();
        for (const link of atomicDB.failureLinks) {
          const pNo = fmPnoMap.get(link.fmId) || '';
          if (!pNo) continue;
          if (!linksByProc.has(pNo)) linksByProc.set(pNo, []);
          linksByProc.get(pNo)!.push({ fmId: link.fmId, fcId: link.fcId });
        }

        // 공정번호별 A6/B5 그룹핑
        const a6ByProc = new Map<string, string[]>();
        for (const item of a6Items) {
          const pNo = (item as { processNo?: string }).processNo || '';
          const val = ((item as { value?: string }).value || '').trim();
          if (!val) continue;
          if (!a6ByProc.has(pNo)) a6ByProc.set(pNo, []);
          a6ByProc.get(pNo)!.push(val);
        }
        const b5ByProc = new Map<string, string[]>();
        for (const item of b5Items) {
          const pNo = (item as { processNo?: string }).processNo || '';
          const val = ((item as { value?: string }).value || '').trim();
          if (!val) continue;
          if (!b5ByProc.has(pNo)) b5ByProc.set(pNo, []);
          b5ByProc.get(pNo)!.push(val);
        }

        // RA lookup by linkId for DC/PC supplement
        const raByLinkId = new Map<string, (typeof atomicDB.riskAnalyses)[number]>();
        for (const ra of atomicDB.riskAnalyses) {
          raByLinkId.set(ra.linkId, ra);
        }

        // A6 → RiskAnalysis.detectionControl 보충
        let a6Injected = 0;
        for (const [pNo, dcValues] of a6ByProc) {
          const procLinks = linksByProc.get(pNo);
          if (!procLinks || procLinks.length === 0) continue;
          dcValues.forEach((dc, i) => {
            const link = procLinks[i % procLinks.length];
            // Find matching FL in atomicDB
            const fl = atomicDB.failureLinks.find(
              l => l.fmId === link.fmId && l.fcId === link.fcId
            );
            if (!fl) return;
            const ra = raByLinkId.get(fl.id);
            if (!ra) return;
            const existing = (ra.detectionControl || '').trim();
            if (!existing) {
              ra.detectionControl = dc;
              a6Injected++;
            } else if (!existing.includes(dc)) {
              ra.detectionControl = `${existing}\n${dc}`;
              a6Injected++;
            }
          });
        }

        // B5 → RiskAnalysis.preventionControl 보충
        let b5Injected = 0;
        for (const [pNo, pcValues] of b5ByProc) {
          const procLinks = linksByProc.get(pNo);
          if (!procLinks || procLinks.length === 0) continue;
          pcValues.forEach((pc, i) => {
            const link = procLinks[i % procLinks.length];
            const fl = atomicDB.failureLinks.find(
              l => l.fmId === link.fmId && l.fcId === link.fcId
            );
            if (!fl) return;
            const ra = raByLinkId.get(fl.id);
            if (!ra) return;
            const existing = (ra.preventionControl || '').trim();
            if (!existing) {
              ra.preventionControl = pc;
              b5Injected++;
            } else if (!existing.includes(pc)) {
              ra.preventionControl = `${existing}\n${pc}`;
              b5Injected++;
            }
          });
        }

        if (a6Injected > 0 || b5Injected > 0) {
          console.info(`[save-from-import] Phase 4 A6/B5 보충: A6=${a6Injected}건, B5=${b5Injected}건`);
        }
      }
    }

    // 7. 프로젝트 스키마 준비
    const baseUrl = getBaseDatabaseUrl();
    if (!baseUrl) {
      return NextResponse.json(
        { success: false, error: 'DATABASE_URL not configured' },
        { status: 500 }
      );
    }

    const schema = getProjectSchemaName(normalizedFmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });

    const prisma = getPrismaForSchema(schema);
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Prisma client 생성 실패' },
        { status: 500 }
      );
    }

    // ★★★ 8. Atomic DB 직접 저장 (buildAtomicFromFlat 기반 — 2026-03-21) ★★★
    /* eslint-disable @typescript-eslint/no-explicit-any */
    let actualCounts = { l1Funcs: 0, l2: 0, l3: 0, fm: 0, fc: 0, fe: 0, links: 0 };
    const gaps: string[] = [];
    let verifyPassed = false;

    {
      const fId = normalizedFmeaId;
      const a = atomicDB;
      await prisma.$transaction(async (tx: any) => {
        // 자식→부모 순서 삭제
        await tx.riskAnalysis.deleteMany({ where: { fmeaId: fId } }).catch((e: unknown) => console.error('[save] RA delete error:', e));
        await tx.failureLink.deleteMany({ where: { fmeaId: fId } });
        try { if (tx.failureAnalysis) await tx.failureAnalysis.deleteMany({ where: { fmeaId: fId } }); } catch (e: unknown) { console.warn('[save] FailureAnalysis delete skipped:', e instanceof Error ? e.message : String(e)); }
        await tx.failureEffect.deleteMany({ where: { fmeaId: fId } });
        await tx.failureMode.deleteMany({ where: { fmeaId: fId } });
        await tx.failureCause.deleteMany({ where: { fmeaId: fId } });
        try { if (tx.l1Requirement) await tx.l1Requirement.deleteMany({ where: { fmeaId: fId } }); } catch {}
        await tx.l1Function.deleteMany({ where: { fmeaId: fId } });
        try { if (tx.processProductChar) await tx.processProductChar.deleteMany({ where: { fmeaId: fId } }); } catch {}
        await tx.l2Function.deleteMany({ where: { fmeaId: fId } });
        await tx.l3Function.deleteMany({ where: { fmeaId: fId } });
        await tx.l1Structure.deleteMany({ where: { fmeaId: fId } });
        await tx.l2Structure.deleteMany({ where: { fmeaId: fId } });
        await tx.l3Structure.deleteMany({ where: { fmeaId: fId } });

        if (a.l1Structure) {
          await tx.l1Structure.create({ data: { id: a.l1Structure.id, fmeaId: fId, name: a.l1Structure.name, confirmed: false } });
        }
        if (a.l2Structures?.length) {
          const l2Data = a.l2Structures.map((s: any) => ({ id: s.id, fmeaId: fId, l1Id: s.l1Id, no: (s.no ?? '').toString().trim() || String(s.order ?? 0), name: (s.name || '').trim() || `L2-${s.order ?? 0}`, order: s.order ?? 0 }));
          const l2Result = await tx.l2Structure.createMany({ data: l2Data, skipDuplicates: true });
          if (l2Result.count < l2Data.length) console.warn(`[save] L2Structure: expected ${l2Data.length}, created ${l2Result.count} (${l2Data.length - l2Result.count} skipped)`);
        }
        if (a.l3Structures?.length) {
          const l3Data = a.l3Structures.map((s: any) => ({ id: s.id, fmeaId: fId, l1Id: s.l1Id, l2Id: s.l2Id, m4: s.m4 || null, name: (s.name || '').trim() || 'N/A', order: s.order ?? 0 }));
          const l3Result = await tx.l3Structure.createMany({ data: l3Data, skipDuplicates: true });
          if (l3Result.count < l3Data.length) console.warn(`[save] L3Structure: expected ${l3Data.length}, created ${l3Result.count} (${l3Data.length - l3Result.count} skipped)`);
        }
        if (a.l1Functions?.length) {
          const l1fData = a.l1Functions.map((f: any) => ({ id: f.id, fmeaId: fId, l1StructId: f.l1StructId, category: (f.category || '').trim() || 'USER', functionName: (f.functionName || '').trim() || 'N/A', requirement: (f.requirement || '').trim() }));
          const l1fResult = await tx.l1Function.createMany({ data: l1fData, skipDuplicates: true });
          if (l1fResult.count < l1fData.length) console.warn(`[save] L1Function: expected ${l1fData.length}, created ${l1fResult.count} (${l1fData.length - l1fResult.count} skipped)`);
        }
        if (a.l2Functions?.length) {
          const l2fData = a.l2Functions.map((f: any) => ({ id: f.id, fmeaId: fId, l2StructId: f.l2StructId, functionName: (f.functionName || '').trim() || 'N/A', productChar: (f.productChar || '').trim() || 'N/A', specialChar: f.specialChar || null }));
          const l2fResult = await tx.l2Function.createMany({ data: l2fData, skipDuplicates: true });
          if (l2fResult.count < l2fData.length) console.warn(`[save] L2Function: expected ${l2fData.length}, created ${l2fResult.count} (${l2fData.length - l2fResult.count} skipped)`);
        }
        // ProcessProductChar 생성 (FM.productCharId FK 대상)
        {
          const pcRows: { id: string; fmeaId: string; l2StructId: string; name: string; specialChar: string | null; orderIndex: number }[] = [];
          const seenPcIds = new Set<string>();
          const funcByL2Struct = new Map<string, string>();
          for (const f of (a.l2Functions || []) as any[]) {
            if (f.l2StructId && f.productChar) funcByL2Struct.set(f.l2StructId, f.productChar);
          }
          for (const fm of (a.failureModes || []) as any[]) {
            if (fm.productCharId && !seenPcIds.has(fm.productCharId)) {
              seenPcIds.add(fm.productCharId);
              pcRows.push({
                id: fm.productCharId,
                fmeaId: fId,
                l2StructId: fm.l2StructId || '',
                name: funcByL2Struct.get(fm.l2StructId || '') || 'N/A',
                specialChar: fm.specialChar ? String(fm.specialChar) : null,
                orderIndex: pcRows.length,
              });
            }
          }
          if (pcRows.length > 0) {
            await tx.processProductChar.createMany({ data: pcRows, skipDuplicates: true });
            console.info(`[save-from-import] ProcessProductChar: ${pcRows.length}건 생성`);
          }
        }
        if (a.l3Functions?.length) {
          const l3fData = a.l3Functions.map((f: any) => {
            const pc = (f.processChar || '').trim();
            const fn = (f.functionName || '').trim();
            return { id: f.id, fmeaId: fId, l3StructId: f.l3StructId, l2StructId: f.l2StructId, functionName: fn || 'N/A', processChar: pc || fn || 'N/A', specialChar: f.specialChar || null };
          });
          const l3fResult = await tx.l3Function.createMany({ data: l3fData, skipDuplicates: true });
          if (l3fResult.count < l3fData.length) console.warn(`[save] L3Function: expected ${l3fData.length}, created ${l3fResult.count} (${l3fData.length - l3fResult.count} skipped)`);
        }
        if (a.failureEffects?.length) {
          const feData = a.failureEffects.map((fe: any) => ({ id: fe.id, fmeaId: fId, l1FuncId: fe.l1FuncId, category: (fe.category || '').trim() || 'USER', effect: (fe.effect || '').trim() || 'N/A', severity: Math.max(1, Math.min(10, Number(fe.severity) || 1)) }));
          const feResult = await tx.failureEffect.createMany({ data: feData, skipDuplicates: true });
          if (feResult.count < feData.length) console.warn(`[save] FailureEffect: expected ${feData.length}, created ${feResult.count} (${feData.length - feResult.count} skipped)`);
        }
        if (a.failureModes?.length) {
          const fmData = a.failureModes.map((fm: any) => ({ id: fm.id, fmeaId: fId, l2FuncId: fm.l2FuncId, l2StructId: fm.l2StructId, productCharId: fm.productCharId || null, mode: (fm.mode || '').trim() || 'N/A', specialChar: fm.specialChar ?? false }));
          const fmResult = await tx.failureMode.createMany({ data: fmData, skipDuplicates: true });
          if (fmResult.count < fmData.length) console.warn(`[save] FailureMode: expected ${fmData.length}, created ${fmResult.count} (${fmData.length - fmResult.count} skipped)`);
        }
        if (a.failureCauses?.length) {
          const fcData = a.failureCauses.map((fc: any) => ({ id: fc.id, fmeaId: fId, l3FuncId: fc.l3FuncId, l3StructId: fc.l3StructId, l2StructId: fc.l2StructId, processCharId: fc.processCharId || null, cause: (fc.cause || '').trim() || 'N/A', occurrence: fc.occurrence || null }));
          const fcResult = await tx.failureCause.createMany({ data: fcData, skipDuplicates: true });
          if (fcResult.count < fcData.length) console.warn(`[save] FailureCause: expected ${fcData.length}, created ${fcResult.count} (${fcData.length - fcResult.count} skipped)`);
        }

        // FailureLink 저장 — buildAtomicFromFlat이 FK 검증 완료 (Rule 1.7)
        if (a.failureLinks?.length) {
          const flData = a.failureLinks.map((l: any) => ({
            id: l.id, fmeaId: fId, fmId: l.fmId, feId: l.feId, fcId: l.fcId,
          }));
          const flResult = await tx.failureLink.createMany({ data: flData, skipDuplicates: true });
          if (flResult.count < flData.length) console.warn(`[save] FailureLink: expected ${flData.length}, created ${flResult.count} (${flData.length - flResult.count} skipped)`);
        }

        // RiskAnalysis 저장 — buildAtomicFromFlat이 1:1 with FL로 이미 생성
        if (a.riskAnalyses?.length) {
          const raRows = a.riskAnalyses.map((ra: any) => ({
            id: ra.id, fmeaId: fId, linkId: ra.linkId,
            severity: ra.severity, occurrence: ra.occurrence, detection: ra.detection,
            ap: ra.ap,
            preventionControl: ra.preventionControl || null,
            detectionControl: ra.detectionControl || null,
          }));
          const raResult = await tx.riskAnalysis.createMany({ data: raRows, skipDuplicates: true });
          if (raResult.count < raRows.length) console.warn(`[save] RiskAnalysis: expected ${raRows.length}, created ${raResult.count} (${raRows.length - raResult.count} skipped)`);
        }

        // ImportMapping 저장
        if (importMappingRecords.length > 0) {
          const { createImportJob, saveAllMappings } = await import('@/lib/import/importJobDb');
          await createImportJob(tx, importJobData);
          await saveAllMappings(tx, importJobData.id, importMappingRecords);
        }
      }, { timeout: 60000 });

      console.info(`[save-from-import] Atomic DB 직접 저장 완료 (buildAtomicFromFlat 기반)`);
    }

    // 9. Atomic 카운트 검증 (단순 — Legacy 무관)
    const [l1FuncCount, l2Count, l3Count, fmCount, fcCount, feCount, linkCount] = await Promise.all([
      prisma.l1Function.count({ where: { fmeaId: normalizedFmeaId } }),
      prisma.l2Structure.count({ where: { fmeaId: normalizedFmeaId } }),
      prisma.l3Structure.count({ where: { fmeaId: normalizedFmeaId } }),
      prisma.failureMode.count({ where: { fmeaId: normalizedFmeaId } }),
      prisma.failureCause.count({ where: { fmeaId: normalizedFmeaId } }),
      prisma.failureEffect.count({ where: { fmeaId: normalizedFmeaId } }),
      prisma.failureLink.count({ where: { fmeaId: normalizedFmeaId } }),
    ]);
    actualCounts = { l1Funcs: l1FuncCount, l2: l2Count, l3: l3Count, fm: fmCount, fc: fcCount, fe: feCount, links: linkCount };
    if (l2Count > 0 && fmCount > 0 && fcCount > 0 && linkCount > 0) verifyPassed = true;
    else gaps.push(`l2=${l2Count} fm=${fmCount} fc=${fcCount} fl=${linkCount}`);

    // ★★★ ImportMapping: verifyRoundTrip ★★★
    let importJobResult: { id: string; mappingCount: number; roundTrip?: { total: number; verified: number; missingCount: number } } | undefined;
    if (importMappingRecords.length > 0) {
      try {
        const { verifyRoundTrip: vrTrip, updateJobStatus: ujStatus } = await import('@/lib/import/importJobDb');
        const rt = await vrTrip(prisma, importJobData.id);
        await ujStatus(prisma, importJobData.id, 'completed');
        importJobResult = { id: importJobData.id, mappingCount: importMappingRecords.length, roundTrip: { total: rt.total, verified: rt.verified, missingCount: rt.missing.length } };
      } catch (e) { importJobResult = { id: importJobData.id, mappingCount: importMappingRecords.length }; }
    }

    // 10. 성공 응답
    return NextResponse.json({
      success: true,
      fmeaId: normalizedFmeaId,
      buildResult: {
        success: true,
        diagnostics: {
          l2Count: atomicDB.l2Structures.length,
          l3Count: atomicDB.l3Structures.length,
          l2FCount: atomicDB.l2Functions.length,
          l3FCount: atomicDB.l3Functions.length,
          l1FCount: atomicDB.l1Functions.length,
          fmCount: atomicDB.failureModes.length,
          fcCount: atomicDB.failureCauses.length,
          feCount: atomicDB.failureEffects.length,
          linkCount: atomicDB.failureLinks.length,
          raCount: atomicDB.riskAnalyses.length,
          // 진단
          _actualCounts: actualCounts,
        },
      },
      parseValidation: {
        summary: parseValidation.summary,
        itemCodeCounts: parseValidation.itemCodeCounts,
        criteria: parseValidation.criteria.filter(c => !c.pass || c.fixApplied),
        fixes: parseValidation.fixes.slice(0, 30),
        issues: parseValidation.issues,
      },
      atomicCounts: {
        l2Structures: actualCounts.l2,
        l3Structures: actualCounts.l3,
        failureModes: actualCounts.fm,
        failureCauses: actualCounts.fc,
        failureEffects: actualCounts.fe,
        failureLinks: actualCounts.links,
      },
      verified: verifyPassed,
      verifyGaps: gaps.length > 0 ? gaps : undefined,
      directAtomic: true,
      importJob: importJobResult,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[save-from-import] error:', msg);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(e) },
      { status: 500 }
    );
  }
}
