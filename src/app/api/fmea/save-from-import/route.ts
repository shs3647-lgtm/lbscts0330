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
import { getBaseDatabaseUrl, getPrismaForSchema, getPrisma } from '@/lib/prisma';
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

    // 1.5. ★ 누락 항목 보충 — buildWorksheetState 전에 B1 등 누락 보충
    const { supplementMissingItems } = await import(
      '@/app/(fmea-core)/pfmea/import/utils/supplementMissingItems'
    );
    const chainsArray = Array.isArray(failureChains) && failureChains.length > 0
      ? failureChains : undefined;
    const supplements = supplementMissingItems(flatData, chainsArray || []);
    const enrichedFlatData = supplements.length > 0 ? [...flatData, ...supplements] : flatData;
    // ★ DEBUG: A6/B5 flatData 카운트
    const a6cnt = flatData.filter((d: any) => d.itemCode === 'A6').length;
    const b5cnt = flatData.filter((d: any) => d.itemCode === 'B5').length;
    if (a6cnt > 0 || b5cnt > 0) console.log(`[save-from-import] flatData A6=${a6cnt} B5=${b5cnt}`);
    else console.warn(`[save-from-import] ⚠️ flatData에 A6/B5 없음! total=${flatData.length}`);
    if (supplements.length > 0) {
      console.info(`[save-from-import] 누락 보충: ${supplements.length}건 (${supplements.map((s: { itemCode?: string }) => s.itemCode).filter((v: string | undefined, i: number, a: (string | undefined)[]) => a.indexOf(v) === i).join(',')})`);
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
            const [l2s, l3s, l1Funcs, l2Funcs, l3Funcs, fes, fms, fcs, links, risks] = await Promise.all([
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
            ]);
            reverseExistingDB = {
              fmeaId: normalizedFmeaId, savedAt: new Date().toISOString(),
              l1Structure: null, l2Structures: l2s, l3Structures: l3s,
              l1Functions: l1Funcs, l2Functions: l2Funcs, l3Functions: l3Funcs,
              failureEffects: fes, failureModes: fms, failureCauses: fcs,
              failureLinks: links, failureAnalyses: [], riskAnalyses: risks, optimizations: [],
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

    // 3. Phase 3 결과 추출 (buildWorksheetState 내부에서 이미 실행됨)
    const injectedLinks: unknown[] = (buildResult.state.failureLinks || []) as unknown[];
    const injectedRisk: Record<string, number | string> =
      (buildResult.state.riskData || {}) as Record<string, number | string>;
    if (buildResult.diagnostics.linkStats) {
      const ls = buildResult.diagnostics.linkStats;
      console.info(
        `[save-from-import] DB중심 링크: injected=${ls.injectedCount} skipped=${ls.skippedCount} ` +
        `(noProc=${ls.skipReasons.noProc} noFE=${ls.skipReasons.noFE} ` +
        `noFM=${ls.skipReasons.noFM} noFC=${ls.skipReasons.noFC})`
      );
    }

    // 3.5. ★★★ Phase 4 안전망: A6/B5 riskData 보충 ★★★
    // buildWorksheetState Phase 4에서 이미 처리되지만,
    // 전용시트 A6/B5가 flatData에만 있고 enrichedFlatData에 누락될 경우 대비
    // (if (!existing) 가드로 중복 방지)
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

    // 5. legacyData 구성
    // ★★★ 리버스 경로: convertToLegacyFormat 결과 직접 사용 (FC processCharId 보존) ★★★
    // forward 경로: buildWorksheetState 결과 사용 (기존 방식)
    const legacyData = useReversePath && reverseLegacyData ? {
      fmeaId: normalizedFmeaId,
      l1: reverseLegacyData.l1,
      l2: reverseLegacyData.l2,
      failureLinks: reverseLegacyData.failureLinks || [],
      riskData: injectedRisk,
      forceOverwrite: true,
      structureConfirmed: reverseLegacyData.structureConfirmed ?? false,
      l1Confirmed: reverseLegacyData.l1Confirmed ?? false,
      l2Confirmed: reverseLegacyData.l2Confirmed ?? false,
      l3Confirmed: reverseLegacyData.l3Confirmed ?? false,
      failureL1Confirmed: reverseLegacyData.failureL1Confirmed ?? false,
      failureL2Confirmed: reverseLegacyData.failureL2Confirmed ?? false,
      failureL3Confirmed: reverseLegacyData.failureL3Confirmed ?? false,
      failureLinkConfirmed: reverseLegacyData.failureLinkConfirmed ?? true,
      riskConfirmed: false,
      optimizationConfirmed: false,
    } : {
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
    };

    // 6. migrateToAtomicDB
    const { migrateToAtomicDB } = await import(
      '@/app/(fmea-core)/pfmea/worksheet/migration'
    );
    const { uid } = await import(
      '@/app/(fmea-core)/pfmea/worksheet/constants'
    );
    const { genFC } = await import('@/lib/uuid-generator');

    // ★★★ 리버스 경로: atomic DB가 이미 정확 → migrateToAtomicDB 스킵 ★★★
    // forward 경로만 migrateToAtomicDB 실행 (기존 방식)
    const legacyCopy = JSON.parse(JSON.stringify(legacyData));
    const atomicDB = useReversePath ? null : migrateToAtomicDB(legacyCopy);
    if (atomicDB) Object.assign(atomicDB, { forceOverwrite: true });

    // ★★★ 6-B. failureLinks 복구: migrateToAtomicDB가 ID 매칭 실패로 drop한 links를 텍스트 매칭으로 복구
    // 리버스 경로: atomic DB 이미 정확 → 복구 불필요
    const migrationLinkCount = atomicDB?.failureLinks?.length ?? 0;
    const originalLinkCount = injectedLinks.length;
    if (!useReversePath && atomicDB && migrationLinkCount < originalLinkCount && originalLinkCount > 0) {
      console.log(`[save-from-import] Links 복구 시작: migration=${migrationLinkCount}, original=${originalLinkCount}`);

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
        if (fm.mode) fmByText.set(fm.mode, fm);
        fmById.set(fm.id, fm);
      }
      for (const fe of (atomicDB.failureEffects || []) as FE[]) {
        if (fe.effect) feByText.set(fe.effect, fe);
        feById.set(fe.id, fe);
      }
      for (const fc of (atomicDB.failureCauses || []) as FC[]) {
        if (fc.cause) fcByText.set(fc.cause, fc);
        fcById.set(fc.id, fc);
      }

      let recoveredCount = 0;
      type InjectedLink = { fmId?: string; feId?: string; fcId?: string; fmText?: string; feText?: string; fcText?: string; severity?: number; fmMergeSpan?: number };
      for (const link of injectedLinks as InjectedLink[]) {
        // ID로 먼저 매칭, 실패하면 텍스트로 매칭
        const fm = fmById.get(link.fmId || '') || (link.fmText ? fmByText.get(link.fmText) : undefined);
        const fe = feById.get(link.feId || '') || (link.feText ? feByText.get(link.feText) : undefined);
        const fc = fcById.get(link.fcId || '') || (link.fcText ? fcByText.get(link.fcText) : undefined);

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
        console.log(`[save-from-import] ✅ Links 복구 완료: ${recoveredCount}건 (총 ${atomicDB.failureLinks?.length}건)`);
      } else if (migrationLinkCount === 0) {
        console.warn(`[save-from-import] ⚠️ Links 복구 실패: FM/FE/FC 텍스트 매칭 불가`);
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

    // ★★★ 8. legacyData 직접 저장 + rebuild-atomic (POST /api/fmea FK 검증 우회) ★★★
    // 이전 방식: POST /api/fmea → FK validation이 FM/FC/Link를 drop → 데이터 손실
    // 새 방식: legacyData를 먼저 저장 → rebuild-atomic으로 atomic 테이블 생성

    // 8-A. 기존 legacyData 로드하여 "더 나은 쪽" 선택 (덮어쓰기 방어)
    const existingLegacy = await prisma.fmeaLegacyData.findUnique({
      where: { fmeaId: normalizedFmeaId },
    }).catch(() => null);

    const newL2 = Array.isArray(legacyData.l2) ? legacyData.l2 : [];
    const newL2Valid = newL2.filter((p: { name?: string }) =>
      p.name && !p.name.includes('클릭') && !p.name.includes('선택')
    );

    type LegacyRecord = { l2?: Array<{ name?: string }>; l1?: unknown; failureLinks?: unknown[]; riskData?: unknown; [key: string]: unknown };
    const existingData = (existingLegacy?.data ?? {}) as LegacyRecord;
    const existingL2 = Array.isArray(existingData.l2) ? existingData.l2 : [];
    const existingL2Valid = existingL2.filter((p: { name?: string }) =>
      p.name && !p.name.includes('클릭') && !p.name.includes('선택')
    );

    // ★ 핵심: 빌드 vs 기존 데이터 "풍부도" 비교 (FM+FC 총합 기준, 공정 수만 비교하면 FM 누락 발생)
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const countRichness = (l2Arr: Array<Record<string, unknown>>) => {
      let fm = 0, fc = 0;
      for (const proc of l2Arr) {
        const fms = proc.failureModes as unknown[] | undefined;
        const fcs = proc.failureCauses as unknown[] | undefined;
        fm += Array.isArray(fms) ? fms.length : 0;
        fc += Array.isArray(fcs) ? fcs.length : 0;
        // l3 내부 FC도 카운트
        const l3s = proc.l3 as Array<Record<string, unknown>> | undefined;
        if (Array.isArray(l3s)) {
          for (const we of l3s) {
            const weFcs = we.failureCauses as unknown[] | undefined;
            fc += Array.isArray(weFcs) ? weFcs.length : 0;
          }
        }
      }
      return { fm, fc, total: fm + fc };
    };

    const newRich = countRichness(newL2 as any[]);
    const existingRich = countRichness(existingL2 as any[]);

    let legacyDataForSave: any;
    // 빌드 결과가 풍부하거나, 기존이 비어있으면 → 새 데이터 사용
    // 빌드 결과가 완전히 비어있고 기존이 풍부하면 → 기존 보존 (빌드 실패 방어)
    const useNewData = newRich.total >= existingRich.total || newL2Valid.length >= existingL2Valid.length || existingRich.total === 0;

    if (useNewData) {
      legacyDataForSave = JSON.parse(JSON.stringify(legacyData));
      console.log(
        `[save-from-import] 새 데이터 사용: 빌드 FM=${newRich.fm} FC=${newRich.fc} (기존 FM=${existingRich.fm} FC=${existingRich.fc})`
      );
    } else {
      // 기존 l2가 더 풍부 → 기존 구조 보존 + 새 데이터(l1, riskData, confirmations) 머지
      console.warn(
        `[save-from-import] l2 보호: 빌드 FM=${newRich.fm}+FC=${newRich.fc}=${newRich.total} < 기존 FM=${existingRich.fm}+FC=${existingRich.fc}=${existingRich.total} → 기존 구조 보존`
      );
      legacyDataForSave = {
        ...existingData,
        fmeaId: normalizedFmeaId,
        l1: legacyData.l1 ?? existingData.l1,
        // l2는 기존 유지 (더 풍부)
        riskData: legacyData.riskData ?? existingData.riskData,
        // failureLinks: 기존 것이 더 많으면 기존 유지
        failureLinks: (injectedLinks.length >= (existingData.failureLinks?.length ?? 0))
          ? injectedLinks
          : existingData.failureLinks,
        forceOverwrite: true,
        structureConfirmed: legacyData.structureConfirmed,
        l1Confirmed: legacyData.l1Confirmed,
        l2Confirmed: legacyData.l2Confirmed,
        l3Confirmed: legacyData.l3Confirmed,
        failureL1Confirmed: legacyData.failureL1Confirmed,
        failureL2Confirmed: legacyData.failureL2Confirmed,
        failureL3Confirmed: legacyData.failureL3Confirmed,
        failureLinkConfirmed: legacyData.failureLinkConfirmed,
      };
    }

    // ★★★ 8-B/C. legacyData 저장 — 프로젝트 + public 스키마 트랜잭션 ★★★
    // 프로젝트 스키마 저장은 반드시 성공해야 하므로 트랜잭션으로 보호
    await prisma.$transaction(async (tx) => {
      await tx.fmeaLegacyData.upsert({
        where: { fmeaId: normalizedFmeaId },
        create: { fmeaId: normalizedFmeaId, data: legacyDataForSave, version: '1.0.0' },
        update: { data: legacyDataForSave },
      });
    }, { timeout: 30000, isolationLevel: 'Serializable' });

    const savedL2Len = Array.isArray((legacyDataForSave as LegacyRecord).l2)
      ? (legacyDataForSave as LegacyRecord).l2!.length : 0;
    console.log(`[save-from-import] 8-B. legacyData 저장 완료 l2=${savedL2Len}`);

    // 8-C. public 스키마에도 백업 저장 (비치명적 — 실패해도 Import 성공)
    const publicPrisma = getPrisma();
    if (publicPrisma) {
      await publicPrisma.$transaction(async (tx) => {
        await tx.fmeaLegacyData.upsert({
          where: { fmeaId: normalizedFmeaId },
          create: { fmeaId: normalizedFmeaId, data: legacyDataForSave, version: '1.0.0' },
          update: { data: legacyDataForSave },
        });
      }).catch((e: unknown) => {
        console.error('[save-from-import] public 백업 실패 (비치명적):', e instanceof Error ? e.message : String(e));
      });
    }

    // 8-D. rebuild-atomic API로 atomic 테이블 생성 (FK validation 우회)
    // ★★★ 리버스 경로: atomic DB 이미 정확 → rebuild 스킵 (FC 손실 방지) ★★★
    const origin = request.nextUrl.origin;
    const rebuildUrl = `${origin}/api/fmea/rebuild-atomic?fmeaId=${encodeURIComponent(normalizedFmeaId)}`;
    if (!useReversePath) {
      const rebuildRes = await fetch(rebuildUrl, { method: 'POST' });
      const rebuildResult = await rebuildRes.json();

      if (!rebuildRes.ok || (!rebuildResult.ok && !rebuildResult.success)) {
        console.error('[save-from-import] rebuild-atomic 실패:', rebuildResult);
      } else {
        console.log('[save-from-import] 8-D. rebuild-atomic 완료:', JSON.stringify(rebuildResult.rebuilt));
      }
    } else {
      console.info('[save-from-import] 8-D. 리버스 경로 → rebuild-atomic 스킵 (atomic 데이터 이미 정확)');
    }

    // ★★★ 9. Verify Loop — FM/FC/FE/Links 종합 검증 + legacyData 무결성 보호 ★★★
    const savedRich = countRichness(
      Array.isArray((legacyDataForSave as LegacyRecord).l2) ? (legacyDataForSave as LegacyRecord).l2 as any[] : []
    );
    const savedL2Valid = Array.isArray((legacyDataForSave as LegacyRecord).l2)
      ? (legacyDataForSave as LegacyRecord).l2!.filter((p: { name?: string }) =>
          p.name && !p.name.includes('클릭') && !p.name.includes('선택')
        ).length
      : 0;
    const expectedL2 = savedL2Valid;
    const expectedFM = savedRich.fm;
    const expectedFC = savedRich.fc;
    const expectedLinks = Array.isArray((legacyDataForSave as LegacyRecord).failureLinks)
      ? (legacyDataForSave as LegacyRecord).failureLinks!.length : 0;
    const legacyL1 = (legacyDataForSave as LegacyRecord).l1 as any;
    const expectedL1Funcs = Array.isArray(legacyL1?.types)
      ? legacyL1.types.reduce((sum: number, t: any) => sum + (Array.isArray(t.functions) ? t.functions.length : 0), 0)
      : 0;

    console.log(
      `[save-from-import] 기대값: l1Funcs=${expectedL1Funcs} l2=${expectedL2} FM=${expectedFM} FC=${expectedFC} Links=${expectedLinks}`
    );

    const MAX_VERIFY_RETRIES = 3;
    let verifyPassed = false;
    let actualCounts = { l1Funcs: 0, l2: 0, l3: 0, fm: 0, fc: 0, fe: 0, links: 0 };
    const gaps: string[] = [];

    for (let attempt = 0; attempt <= MAX_VERIFY_RETRIES; attempt++) {
      // 9-A. atomic 카운트 검증
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

      // FM/FC/Links 종합 검증 (migration skip 조건 때문에 약간의 차이 허용: 90% 이상이면 통과)
      gaps.length = 0;
      if (expectedL1Funcs > 0 && l1FuncCount < expectedL1Funcs) gaps.push(`L1Funcs: ${l1FuncCount}/${expectedL1Funcs}`);
      if (expectedL2 > 0 && l2Count < expectedL2) gaps.push(`l2: ${l2Count}/${expectedL2}`);
      // migration.ts는 '클릭'/'추가' 포함 FM을 skip하므로, atomic FM은 legacy FM보다 적을 수 있음
      // 90% 이상이면 정상 (migration skip 허용)
      if (expectedFM > 0 && fmCount < Math.ceil(expectedFM * 0.9)) gaps.push(`FM: ${fmCount}/${expectedFM}`);
      if (expectedFC > 0 && fcCount < Math.ceil(expectedFC * 0.9)) gaps.push(`FC: ${fcCount}/${expectedFC}`);
      if (expectedLinks > 0 && linkCount < Math.ceil(expectedLinks * 0.5)) gaps.push(`Links: ${linkCount}/${expectedLinks}`);

      if (gaps.length === 0) {
        verifyPassed = true;
        console.log(
          `[save-from-import] ✅ 검증 통과 (attempt ${attempt}): ` +
          `L1Funcs=${l1FuncCount}/${expectedL1Funcs} l2=${l2Count}/${expectedL2} FM=${fmCount}/${expectedFM} FC=${fcCount}/${expectedFC} ` +
          `FE=${feCount} Links=${linkCount}/${expectedLinks}`
        );
        break;
      }

      if (attempt >= MAX_VERIFY_RETRIES) {
        console.warn(
          `[save-from-import] ⚠️ 검증 ${MAX_VERIFY_RETRIES}회 재시도 초과 — 잔여 GAP: ${gaps.join(', ')}`
        );
        break;
      }

      console.warn(`[save-from-import] 검증 실패 (attempt ${attempt}): ${gaps.join(', ')} — 재시도`);

      // 9-B. legacyData 무결성 검증 — 덮어쓰기 방어
      const currentLegacy = await prisma.fmeaLegacyData.findUnique({
        where: { fmeaId: normalizedFmeaId },
      });
      const currentRich = countRichness(
        Array.isArray((currentLegacy?.data as LegacyRecord)?.l2)
          ? (currentLegacy?.data as LegacyRecord).l2 as any[] : []
      );

      if (currentRich.total < savedRich.total) {
        console.warn(
          `[save-from-import] legacyData 손상 감지: FM=${currentRich.fm}+FC=${currentRich.fc} < saved FM=${savedRich.fm}+FC=${savedRich.fc} → 복원`
        );
        await prisma.$transaction(async (tx) => {
          await tx.fmeaLegacyData.update({
            where: { fmeaId: normalizedFmeaId },
            data: { data: legacyDataForSave },
          });
        });
      }

      // 9-C. rebuild-atomic 재시도 (리버스 경로에서는 스킵)
      if (!useReversePath) {
        await fetch(rebuildUrl, { method: 'POST' });
      }
    }

    // ★★★ 9-D. 최종 legacyData 보호 — 어떤 이유로든 풍부도가 축소되었으면 원본 복원 ★★★
    if (savedRich.total > 0) {
      const finalLegacy = await prisma.fmeaLegacyData.findUnique({
        where: { fmeaId: normalizedFmeaId },
      });
      const finalRich = countRichness(
        Array.isArray((finalLegacy?.data as LegacyRecord)?.l2)
          ? (finalLegacy?.data as LegacyRecord).l2 as any[] : []
      );
      if (finalRich.total < savedRich.total) {
        console.warn(`[save-from-import] 최종 legacyData 보호: FM+FC=${finalRich.total}→${savedRich.total} 강제 복원`);
        await prisma.$transaction(async (tx) => {
          await tx.fmeaLegacyData.update({
            where: { fmeaId: normalizedFmeaId },
            data: { data: legacyDataForSave },
          });
        });
      }
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
      expected: { l2: expectedL2, fm: expectedFM, fc: expectedFC, links: expectedLinks },
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
