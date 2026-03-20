// CODEFREEZE — 2026-03-19 Legacy 경유 제거, Atomic DB 직접 저장 방식으로 전환
/**
 * @file save-from-import/route.ts
 * @description Import→DB 서버사이드 저장 API
 *
 * POST /api/fmea/save-from-import
 * Body: { fmeaId, flatData, l1Name?, failureChains? }
 *
 * 클라이언트에서 buildWorksheetState + migrateToAtomicDB를 실행하면
 * 모듈 해석/직렬화 차이로 실패할 수 있으므로, 서버에서 일괄 처리.
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

    // 1.5. ★ 누락 항목 보충 — buildWorksheetState 전에 B1 등 누락 보충
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
      { autoFix: true },
    );
    if (parseValidation.fixes.length > 0 || parseValidation.summary.failed > 0) {
      console.info(formatValidationReport(parseValidation));
    }

    // 2. buildWorksheetState (엔티티 생성)
    const { buildWorksheetState, buildFailureLinksDBCentric } = await import(
      '@/app/(fmea-core)/pfmea/import/utils/buildWorksheetState'
    );

    // ★★★ 2026-03-17 FIX: 리버스 경로 — DB 데이터가 있으면 convertToLegacyFormat 직접 사용 ★★★
    // 이전: atomicToFlatData → buildWorksheetState → migrateToAtomicDB (손실 라운드트립)
    //   → processCharId genB3↔hybridId 불일치로 FC 매칭 실패 → FC 6건 재발
    // 수정: convertToLegacyFormat(existingDB)로 직접 legacyData 구성 → 라운드트립 제거
    let useReversePath = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let reverseExistingDB: any = undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let reverseLegacyData: any = undefined;
    try {
      const baseUrl = getBaseDatabaseUrl();
      if (baseUrl) {
        const schema = getProjectSchemaName(normalizedFmeaId);
        await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
        const checkPrisma = getPrismaForSchema(schema);
        if (checkPrisma) {
          const existingLinkCount = await checkPrisma.failureLink.count({
            where: { fmeaId: normalizedFmeaId },
          });
          if (existingLinkCount > 0) {
            const [l2s, l3s, l1Funcs, l2Funcs, l3Funcs, fes, fms, fcs, links, risks, pcs] = await Promise.all([
              checkPrisma.l2Structure.findMany({ where: { fmeaId: normalizedFmeaId }, orderBy: { order: 'asc' } }),
              checkPrisma.l3Structure.findMany({ where: { fmeaId: normalizedFmeaId }, orderBy: { order: 'asc' } }),
              checkPrisma.l1Function.findMany({ where: { fmeaId: normalizedFmeaId } }),
              checkPrisma.l2Function.findMany({ where: { fmeaId: normalizedFmeaId } }),
              checkPrisma.l3Function.findMany({ where: { fmeaId: normalizedFmeaId } }),
              checkPrisma.failureEffect.findMany({ where: { fmeaId: normalizedFmeaId } }),
              checkPrisma.failureMode.findMany({ where: { fmeaId: normalizedFmeaId } }),
              checkPrisma.failureCause.findMany({ where: { fmeaId: normalizedFmeaId } }),
              checkPrisma.failureLink.findMany({ where: { fmeaId: normalizedFmeaId } }),
              checkPrisma.riskAnalysis.findMany({ where: { fmeaId: normalizedFmeaId } }),
              checkPrisma.processProductChar.findMany({ where: { fmeaId: normalizedFmeaId } }),
            ]);
            reverseExistingDB = {
              fmeaId: normalizedFmeaId, savedAt: new Date().toISOString(),
              l1Structure: null, l2Structures: l2s, l3Structures: l3s,
              l1Functions: l1Funcs, l2Functions: l2Funcs, l3Functions: l3Funcs,
              failureEffects: fes, failureModes: fms, failureCauses: fcs,
              failureLinks: links, failureAnalyses: [], riskAnalyses: risks, optimizations: [],
              processProductChars: pcs,
              confirmed: { structure: true, l1Function: true, l2Function: true, l3Function: true, l1Failure: true, l2Failure: true, l3Failure: true, failureLink: true, risk: true, optimization: true },
            };
            // ★ 핵심: convertToLegacyFormat으로 직접 변환 (손실 라운드트립 제거)
            const { convertToLegacyFormat } = await import(
              '@/app/(fmea-core)/pfmea/worksheet/migration'
            );
            reverseLegacyData = convertToLegacyFormat(reverseExistingDB);
            useReversePath = Array.isArray(reverseLegacyData?.l2) && reverseLegacyData.l2.length > 0;
            if (useReversePath) {
              const rlFc = reverseLegacyData.l2.reduce((a: number, p: { failureCauses?: unknown[] }) =>
                a + (Array.isArray(p.failureCauses) ? p.failureCauses.length : 0), 0);
              console.info(`[save-from-import] ★ 리버스 경로(직접변환) 활성화: l2=${reverseLegacyData.l2.length} FC=${rlFc} links=${existingLinkCount}`);
            }
          }
        }
      }
    } catch (reverseErr) {
      console.warn('[save-from-import] 리버스 경로 실패 (기존 경로로 fallback):', reverseErr instanceof Error ? reverseErr.message : String(reverseErr));
    }

    // ★★★ Chain-Driven 통합 ★★★
    // 리버스 경로 성공 시 → buildWorksheetState는 riskData 추출용으로만 실행
    // 리버스 경로 실패 시 → 기존 forward path (flatData + chains)
    const buildResult = buildWorksheetState(enrichedFlatData, {
      fmeaId: normalizedFmeaId,
      l1Name,
      chains: chainsArray,
    });

    if (!buildResult.success) {
      return NextResponse.json({
        success: false,
        error: '데이터 빌드 실패',
        diagnostics: buildResult.diagnostics,
      });
    }

    // ★★★ ImportMapping: flatMap → ImportMappingRecord[] 직렬화 ★★★
    const importMappingRecords = buildResult.flatMap
      ? serializeFlatMap(buildResult.flatMap)
      : [];
    importJobData.usedReversePath = useReversePath;

    // 3. Phase 3 결과 추출 (buildWorksheetState 내부에서 이미 실행됨)
    const injectedLinks: unknown[] = (buildResult.state.failureLinks || []) as unknown[];
    const injectedRisk: Record<string, number | string> =
      (buildResult.state.riskData || {}) as Record<string, number | string>;
    if (buildResult.diagnostics.linkStats) {
      const ls = buildResult.diagnostics.linkStats;
      console.info(`[save-from-import] 링크: injected=${ls.injectedCount} skipped=${ls.skippedCount}`);
    }

    // 3.5. A6/B5 riskData 보충 (Phase 4 안전망)
    {
      const a6Items = flatData.filter((d: { itemCode?: string; value?: string }) =>
        d.itemCode === 'A6' && d.value?.trim()
      );
      const b5Items = flatData.filter((d: { itemCode?: string; value?: string }) =>
        d.itemCode === 'B5' && d.value?.trim()
      );
      const fLinks = (buildResult.state.failureLinks || []) as Array<{
        fmId: string; fcId: string; fmProcessNo?: string; fmProcess?: string;
      }>;

      if ((a6Items.length > 0 || b5Items.length > 0) && fLinks.length > 0) {
        const riskData = injectedRisk;

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

        // failureLinks를 공정번호별로 그룹핑
        const linksByProc = new Map<string, Array<{ fmId: string; fcId: string }>>();
        for (const link of fLinks) {
          const pNo = link.fmProcessNo || link.fmProcess || '';
          if (!pNo || !link.fmId || !link.fcId) continue;
          if (!linksByProc.has(pNo)) linksByProc.set(pNo, []);
          linksByProc.get(pNo)!.push({ fmId: link.fmId, fcId: link.fcId });
        }

        // A6 → riskData detection-* 키 보충
        let a6Injected = 0;
        for (const [pNo, dcValues] of a6ByProc) {
          const procLinks = linksByProc.get(pNo);
          if (!procLinks || procLinks.length === 0) continue;
          dcValues.forEach((dc, i) => {
            const link = procLinks[i % procLinks.length];
            const uKey = `${link.fmId}-${link.fcId}`;
            const existing = String(riskData[`detection-${uKey}`] ?? '').trim();
            if (!existing) {
              riskData[`detection-${uKey}`] = dc;
              a6Injected++;
            } else if (!existing.includes(dc)) {
              riskData[`detection-${uKey}`] = `${existing}\n${dc}`;
              a6Injected++;
            }
          });
        }

        // B5 → riskData prevention-* 키 보충
        let b5Injected = 0;
        for (const [pNo, pcValues] of b5ByProc) {
          const procLinks = linksByProc.get(pNo);
          if (!procLinks || procLinks.length === 0) continue;
          pcValues.forEach((pc, i) => {
            const link = procLinks[i % procLinks.length];
            const uKey = `${link.fmId}-${link.fcId}`;
            const existing = String(riskData[`prevention-${uKey}`] ?? '').trim();
            if (!existing) {
              riskData[`prevention-${uKey}`] = pc;
              b5Injected++;
            } else if (!existing.includes(pc)) {
              riskData[`prevention-${uKey}`] = `${existing}\n${pc}`;
              b5Injected++;
            }
          });
        }

        if (a6Injected > 0 || b5Injected > 0) {
          console.info(`[save-from-import] Phase 4 A6/B5 보충: A6=${a6Injected}건, B5=${b5Injected}건`);
        }
      }
    }

    // 4. FM 갭 피드백
    const { applyFmGapFeedback } = await import(
      '@/app/(fmea-core)/pfmea/import/utils/fm-gap-feedback'
    );
    const feedback = applyFmGapFeedback(buildResult.state, flatData);

    // 6. migrateToAtomicDB (Legacy 구성 제거 — Atomic DB 직접 저장)
    const { migrateToAtomicDB } = await import(
      '@/app/(fmea-core)/pfmea/worksheet/migration'
    );
    const { genFC } = await import('@/lib/uuid-generator');

    // ★★★ 리버스 경로: atomic DB가 이미 정확 → migrateToAtomicDB 스킵 ★★★
    // forward 경로: buildWorksheetState 결과에서 직접 atomicDB 생성
    const atomicDB = useReversePath ? null : migrateToAtomicDB({
      fmeaId: normalizedFmeaId,
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
    } as any);
    if (atomicDB) Object.assign(atomicDB, { forceOverwrite: true });

    // ★★★ 6-B. failureLinks 복구: migrateToAtomicDB가 ID 매칭 실패로 drop한 links를 텍스트 매칭으로 복구
    // 리버스 경로: atomic DB 이미 정확 → 복구 불필요
    const migrationLinkCount = atomicDB?.failureLinks?.length ?? 0;
    const originalLinkCount = injectedLinks.length;
    if (!useReversePath && atomicDB && migrationLinkCount < originalLinkCount && originalLinkCount > 0) {
      console.info(`[save-from-import] Links 복구: migration=${migrationLinkCount}/${originalLinkCount}`);

      // atomicDB에 이미 있는 link의 FM-FE-FC 조합 추적 (중복 방지)
      type AtomicLink = { fmId: string; feId: string; fcId: string };
      const existingCombos = new Set(
        (atomicDB.failureLinks || []).map((l: AtomicLink) => `${l.fmId}|${l.feId}|${l.fcId}`)
      );

      // 텍스트 기반 인덱스 생성 (mode/effect/cause → atomic ID)
      type FM = { id: string; mode?: string };
      type FE = { id: string; effect?: string };
      type FC = { id: string; cause?: string };
      const fmByText = new Map<string, FM>();
      const feByText = new Map<string, FE>();
      const fcByText = new Map<string, FC>();
      const fmById = new Map<string, FM>();
      const feById = new Map<string, FE>();
      const fcById = new Map<string, FC>();

      for (const fm of (atomicDB.failureModes || []) as FM[]) {
        if (fm.mode) {
          // Process-scoped key for precise matching
          fmByText.set(`${(fm as any).l2StructId || ''}|${fm.mode}`, fm);
          // Global fallback (first-wins)
          if (!fmByText.has(fm.mode)) fmByText.set(fm.mode, fm);
        }
        fmById.set(fm.id, fm);
      }
      for (const fe of (atomicDB.failureEffects || []) as FE[]) {
        if (fe.effect) {
          feByText.set(`${(fe as any).l1FuncId || ''}|${fe.effect}`, fe);
          if (!feByText.has(fe.effect)) feByText.set(fe.effect, fe);
        }
        feById.set(fe.id, fe);
      }
      for (const fc of (atomicDB.failureCauses || []) as FC[]) {
        if (fc.cause) {
          fcByText.set(`${(fc as any).l2StructId || ''}|${fc.cause}`, fc);
          if (!fcByText.has(fc.cause)) fcByText.set(fc.cause, fc);
        }
        fcById.set(fc.id, fc);
      }

      let recoveredCount = 0;
      type InjectedLink = { fmId?: string; feId?: string; fcId?: string; fmText?: string; feText?: string; fcText?: string; severity?: number; fmMergeSpan?: number };
      for (const link of injectedLinks as InjectedLink[]) {
        // ID로 먼저 매칭, 실패하면 텍스트로 매칭
        const fm = fmById.get(link.fmId || '')
          || (link.fmText ? (fmByText.get(`${(link as any).l2StructId || ''}|${link.fmText}`) || fmByText.get(link.fmText)) : undefined);
        const fe = feById.get(link.feId || '')
          || (link.feText ? (feByText.get(`${(link as any).l1FuncId || ''}|${link.feText}`) || feByText.get(link.feText)) : undefined);
        const fc = fcById.get(link.fcId || '')
          || (link.fcText ? (fcByText.get(`${(link as any).l2StructId || ''}|${link.fcText}`) || fcByText.get(link.fcText)) : undefined);

        if (fm && fe && fc) {
          const combo = `${fm.id}|${fe.id}|${fc.id}`;
          if (!existingCombos.has(combo)) {
            existingCombos.add(combo);
            atomicDB.failureLinks = atomicDB.failureLinks || [];
            // FM/FC id에서 seq 파싱하여 genFC 호출
            const fmSeqMatch = fm.id.match(/M-(\d+)$/);
            const mseq = fmSeqMatch ? parseInt(fmSeqMatch[1]) : 1;
            const fcSeqMatch = fc.id.match(/(\w+)-(\d+)-K-(\d+)$/);
            const fcM4 = fcSeqMatch ? fcSeqMatch[1] : '';
            const fcB1seq = fcSeqMatch ? parseInt(fcSeqMatch[2]) : 1;
            const fcKseq = fcSeqMatch ? parseInt(fcSeqMatch[3]) : 1;
            const pnoMatch = fm.id.match(/L2-(\d+)/);
            const pnoForLink = pnoMatch ? parseInt(pnoMatch[1]) : 0;
            atomicDB.failureLinks.push({
              id: genFC('PF', pnoForLink, mseq, fcM4, fcB1seq, fcKseq),
              fmeaId: normalizedFmeaId,
              fmId: fm.id,
              feId: fe.id,
              fcId: fc.id,
              parentId: fm.id,
              mergeGroupId: undefined,
              rowSpan: link.fmMergeSpan || 1,
              colSpan: 1,
              cache: {
                fmText: link.fmText || fm.mode || '',
                fmProcess: '',
                feText: link.feText || fe.effect || '',
                feCategory: (fe as any).category || '',
                feSeverity: link.severity ?? (fe as any).severity ?? 0,
                fcText: link.fcText || fc.cause || '',
                fcWorkElem: '',
                fcProcess: '',
              },
            });
            recoveredCount++;
          }
        }
      }

      if (recoveredCount > 0) {
        console.info(`[save-from-import] Links 복구: +${recoveredCount}건`);
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

    // ★★★ 8. Atomic DB 직접 저장 (Legacy 경유 제거 — 2026-03-19) ★★★
    // 설계: flatData → buildWorksheetState → migrateToAtomicDB → Atomic DB 직접 INSERT
    // Legacy는 Atomic 저장 후 캐시로만 생성 (SSoT = Atomic DB)
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const atomicSource = useReversePath ? reverseExistingDB : atomicDB;
    if (!atomicSource && !useReversePath) {
      return NextResponse.json({ success: false, error: 'Atomic DB 변환 실패' }, { status: 500 });
    }

    let actualCounts = { l1Funcs: 0, l2: 0, l3: 0, fm: 0, fc: 0, fe: 0, links: 0 };
    const gaps: string[] = [];
    let verifyPassed = false;

    if (!useReversePath && atomicSource) {
      const fId = normalizedFmeaId;
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

        const a = atomicSource;
        if (a.l1Structure) {
          await tx.l1Structure.create({ data: { id: a.l1Structure.id, fmeaId: fId, name: a.l1Structure.name, confirmed: a.l1Structure.confirmed ?? false } });
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
        // ★★★ 2026-03-20 FLAW-3 FIX: FK 불일치 시 DROP 대신 AUTO-FIX ★★★
        // 비유: 기존 로직은 "신분증 불일치면 문전 박대" → FC는 입장했는데 FL은 거부 → 고아 FC 발생
        // 수정: "신분증 불일치면 가장 가까운 유효 신분증으로 재발급" → FC↔FL↔RA 체인 보존
        let fixedLinks: any[] = [];
        if (a.failureLinks?.length) {
          const fmIdSet = new Set((a.failureModes || []).map((fm: any) => fm.id));
          const feIdSet = new Set((a.failureEffects || []).map((fe: any) => fe.id));
          const fcIdSet = new Set((a.failureCauses || []).map((fc: any) => fc.id));

          let fixedCount = 0;
          fixedLinks = a.failureLinks.map((l: any) => {
            let { fmId, feId, fcId } = l;
            let fixed = false;

            // Auto-fix fmId: FC의 l2StructId와 같은 공정의 FM 찾기, 없으면 첫 번째 FM
            if (!fmIdSet.has(fmId)) {
              const fc = (a.failureCauses || []).find((c: any) => c.id === fcId);
              const processMatch = fc?.l2StructId
                ? (a.failureModes || []).find((m: any) => m.l2StructId === fc.l2StructId)
                : undefined;
              fmId = processMatch?.id || (a.failureModes || [])[0]?.id || fmId;
              fixed = true;
            }

            // Auto-fix feId: 첫 번째 FE fallback
            if (!feIdSet.has(feId)) {
              feId = (a.failureEffects || [])[0]?.id || feId;
              fixed = true;
            }

            // fcId: FC가 존재하지 않으면 link를 drop (FC 없는 link는 의미 없음)
            if (!fcIdSet.has(fcId)) {
              console.warn(`[save-from-import] fcId ${fcId} not found — link dropped`);
              return null;
            }

            if (fixed) fixedCount++;
            return { ...l, fmId, feId, fcId };
          }).filter(Boolean);

          const droppedCount = a.failureLinks.length - fixedLinks.length;
          if (fixedCount > 0) {
            console.info(`[save-from-import] ${fixedCount} links auto-fixed (FK re-mapped)`);
          }
          if (droppedCount > 0) {
            console.warn(`[save-from-import] ${droppedCount} links dropped: fcId not found`);
            gaps.push(`${droppedCount} links dropped (FC missing)`);
          }
          if (fixedLinks.length > 0) {
            const flData = fixedLinks.map((l: any) => ({
              id: l.id, fmeaId: fId, fmId: l.fmId, feId: l.feId, fcId: l.fcId,
              fmText: l.cache?.fmText || l.fmText || null,
              fmProcess: l.cache?.fmProcess || l.fmProcess || null,
              feText: l.cache?.feText || l.feText || null,
              feScope: l.cache?.feCategory || l.feScope || null,
              fcText: l.cache?.fcText || l.fcText || null,
              fcWorkElem: l.cache?.fcWorkElem || l.fcWorkElem || null,
              fcM4: l.fcM4 || l.m4 || null,
              severity: l.cache?.feSeverity || l.severity || null,
            }));
            const flResult = await tx.failureLink.createMany({ data: flData, skipDuplicates: true });
            if (flResult.count < flData.length) console.warn(`[save] FailureLink: expected ${flData.length}, created ${flResult.count} (${flData.length - flResult.count} skipped)`);
          }
        }

        // RiskAnalysis 직접 생성 (riskData에서 SOD/DC/PC 추출)
        // ★ 2026-03-20: fixedLinks 사용 — 위에서 FK 자동수정된 links 기준으로 RA 생성
        const riskData = injectedRisk || {};
        const savedFLs = fixedLinks;
        if (savedFLs.length > 0) {
          const feMap = new Map((a.failureEffects || []).map((fe: any) => [fe.id, fe]));
          const calculateAP = (s: number, o: number, d: number): string => {
            if (s >= 9 || (s >= 6 && o >= 4) || (s >= 4 && o >= 4 && d >= 4)) return 'H';
            if (s >= 6 || (s >= 4 && o >= 3) || (d >= 5 && o >= 3)) return 'M';
            return 'L';
          };
          const raRows = savedFLs.map((fl: any) => {
            const uk = `${fl.fmId}-${fl.fcId}`;
            const s = Number(riskData[`risk-${uk}-S`]) || fl.severity || (feMap.get(fl.feId) as any)?.severity || 1;
            const o = Number(riskData[`risk-${uk}-O`]) || 1;
            const d = Number(riskData[`risk-${uk}-D`]) || 1;
            const pc = String(riskData[`prevention-${uk}`] || '').trim() || null;
            const dc = String(riskData[`detection-${uk}`] || '').trim() || null;
            return { id: `ra-${fl.id}`, fmeaId: fId, linkId: fl.id, severity: s, occurrence: o, detection: d, ap: calculateAP(s, o, d), preventionControl: pc, detectionControl: dc };
          });
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

      console.info(`[save-from-import] Atomic DB 직접 저장 완료 (Legacy 경유 없음)`);
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
        success: buildResult.success,
        diagnostics: buildResult.diagnostics,
      },
      feedback: feedback.totalAdded > 0 ? { summary: feedback.summary, totalAdded: feedback.totalAdded } : undefined,
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
