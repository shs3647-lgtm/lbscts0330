/**
 * @file verify-integrity/dedup/route.ts
 * @description L2 3중 복제 + FE 중복 정리 API
 *
 * POST /api/fmea/verify-integrity/dedup
 * Body: { fmeaId: string, dryRun?: boolean }
 *
 * 전략:
 * 1. L2: processNo 그룹에서 첫 번째 L2만 유지
 *    → 중복 L2의 종속 L3/L2Function/FM/PC를 첫 번째 L2로 재할당
 *    → 중복 L2 삭제
 * 2. FE: 동일 effect 텍스트 → 첫 번째만 유지
 *    → FailureLink.feId를 첫 번째 FE로 재할당
 *    → 중복 FE 삭제
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBaseDatabaseUrl, getPrismaForSchema } from '@/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';

export const runtime = 'nodejs';

interface DedupResult {
  table: string;
  action: string;
  count: number;
  detail: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const fmeaId = (body.fmeaId as string)?.toLowerCase();
    const dryRun = body.dryRun === true;

    if (!fmeaId) {
      return NextResponse.json({ success: false, error: 'fmeaId required' }, { status: 400 });
    }

    const baseUrl = getBaseDatabaseUrl();
    if (!baseUrl) {
      return NextResponse.json({ success: false, error: 'DB not configured' }, { status: 500 });
    }

    const schema = getProjectSchemaName(fmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });

    const prisma = getPrismaForSchema(schema);
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Prisma not configured' }, { status: 500 });
    }

    const results: DedupResult[] = [];

    // ─── 1. L2 중복 그룹 분석 ───
    const l2All = await prisma.l2Structure.findMany({
      where: { fmeaId },
      select: { id: true, no: true, name: true, order: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const l2ByNo = new Map<string, Array<{ id: string; no: string; name: string }>>();
    for (const l2 of l2All) {
      const arr = l2ByNo.get(l2.no) || [];
      arr.push({ id: l2.id, no: l2.no, name: l2.name });
      l2ByNo.set(l2.no, arr);
    }

    // 중복 그룹만 필터
    const l2DupGroups = [...l2ByNo.entries()].filter(([, items]) => items.length > 1);

    if (l2DupGroups.length === 0) {
      results.push({ table: 'L2Structure', action: 'skip', count: 0, detail: 'L2 중복 없음' });
    } else {
      // 각 그룹에서 첫 번째(가장 오래된) L2를 유지, 나머지 삭제
      const keepIds: string[] = [];
      const deleteIds: string[] = [];
      // keepId → [duplicateIds]
      const reassignMap = new Map<string, string[]>();

      for (const [, items] of l2DupGroups) {
        const keep = items[0];
        const dups = items.slice(1);
        keepIds.push(keep.id);
        const dupIds = dups.map(d => d.id);
        deleteIds.push(...dupIds);
        reassignMap.set(keep.id, dupIds);
      }

      results.push({
        table: 'L2Structure',
        action: 'plan',
        count: l2DupGroups.length,
        detail: `${l2DupGroups.length}개 processNo 그룹, 유지=${keepIds.length}, 삭제=${deleteIds.length}`,
      });

      if (!dryRun) {
        await prisma.$transaction(async (tx: any) => {
          // 1a. 중복 L2의 종속 레코드를 첫 번째 L2로 재할당
          for (const [keepId, dupIds] of reassignMap) {
            // L3Structure.l2Id 재할당
            const l3Upd = await tx.l3Structure.updateMany({
              where: { l2Id: { in: dupIds } },
              data: { l2Id: keepId },
            });
            if (l3Upd.count > 0) {
              results.push({
                table: 'L3Structure',
                action: 'reassign',
                count: l3Upd.count,
                detail: `L3.l2Id → ${keepId.slice(0, 15)}...`,
              });
            }

            // L2Function.l2StructId 재할당
            const l2FuncUpd = await tx.l2Function.updateMany({
              where: { l2StructId: { in: dupIds } },
              data: { l2StructId: keepId },
            });
            if (l2FuncUpd.count > 0) {
              results.push({
                table: 'L2Function',
                action: 'reassign',
                count: l2FuncUpd.count,
                detail: `L2Func.l2StructId → ${keepId.slice(0, 15)}...`,
              });
            }

            // ProcessProductChar.l2StructId 재할당
            const pcUpd = await tx.processProductChar.updateMany({
              where: { l2StructId: { in: dupIds } },
              data: { l2StructId: keepId },
            });
            if (pcUpd.count > 0) {
              results.push({
                table: 'ProcessProductChar',
                action: 'reassign',
                count: pcUpd.count,
                detail: `PC.l2StructId → ${keepId.slice(0, 15)}...`,
              });
            }

            // FailureMode.l2StructId 재할당
            const fmUpd = await tx.failureMode.updateMany({
              where: { l2StructId: { in: dupIds } },
              data: { l2StructId: keepId },
            });
            if (fmUpd.count > 0) {
              results.push({
                table: 'FailureMode',
                action: 'reassign',
                count: fmUpd.count,
                detail: `FM.l2StructId → ${keepId.slice(0, 15)}...`,
              });
            }
          }

          // 1b. 중복 L2Function 정리 (동일 l2StructId + functionName 중복)
          const l2Funcs = await tx.l2Function.findMany({
            where: { fmeaId },
            select: { id: true, l2StructId: true, functionName: true },
            orderBy: { createdAt: 'asc' },
          });

          const l2FuncByKey = new Map<string, string[]>();
          for (const f of l2Funcs) {
            const key = `${f.l2StructId}|${f.functionName}`;
            const arr = l2FuncByKey.get(key) || [];
            arr.push(f.id);
            l2FuncByKey.set(key, arr);
          }

          for (const [, ids] of l2FuncByKey) {
            if (ids.length > 1) {
              const keepFuncId = ids[0];
              const dupFuncIds = ids.slice(1);

              // FM.l2FuncId 재할당
              await tx.failureMode.updateMany({
                where: { l2FuncId: { in: dupFuncIds } },
                data: { l2FuncId: keepFuncId },
              });

              // 중복 L2Function 삭제
              await tx.l2Function.deleteMany({
                where: { id: { in: dupFuncIds } },
              });
            }
          }

          const l2FuncDupGroups = [...l2FuncByKey.values()].filter(ids => ids.length > 1);
          if (l2FuncDupGroups.length > 0) {
            const totalDel = l2FuncDupGroups.reduce((s, ids) => s + ids.length - 1, 0);
            results.push({
              table: 'L2Function',
              action: 'dedup',
              count: totalDel,
              detail: `${totalDel}개 중복 L2Function 삭제 (FM.l2FuncId 재할당)`,
            });
          }

          // 1c. 중복 L2 삭제
          const l2Del = await tx.l2Structure.deleteMany({
            where: { id: { in: deleteIds } },
          });
          results.push({
            table: 'L2Structure',
            action: 'delete',
            count: l2Del.count,
            detail: `${l2Del.count}개 중복 L2 삭제`,
          });
        });
      }
    }

    // ─── 2. FE 중복 정리 (동일 effect 텍스트) ───
    const feAll = await prisma.failureEffect.findMany({
      where: { fmeaId },
      select: { id: true, effect: true },
      orderBy: { createdAt: 'asc' },
    });

    const feByEffect = new Map<string, string[]>();
    for (const fe of feAll) {
      const arr = feByEffect.get(fe.effect) || [];
      arr.push(fe.id);
      feByEffect.set(fe.effect, arr);
    }

    const feDupGroups = [...feByEffect.entries()].filter(([, ids]) => ids.length > 1);

    if (feDupGroups.length === 0) {
      results.push({ table: 'FailureEffect', action: 'skip', count: 0, detail: 'FE 중복 없음' });
    } else if (!dryRun) {
      await prisma.$transaction(async (tx: any) => {
        for (const [, ids] of feDupGroups) {
          const keepId = ids[0];
          const dupIds = ids.slice(1);

          // FailureLink.feId 재할당
          await tx.failureLink.updateMany({
            where: { feId: { in: dupIds } },
            data: { feId: keepId },
          });

          // 중복 FE 삭제
          await tx.failureEffect.deleteMany({
            where: { id: { in: dupIds } },
          });
        }

        const totalFeDel = feDupGroups.reduce((s, [, ids]) => s + ids.length - 1, 0);
        results.push({
          table: 'FailureEffect',
          action: 'dedup',
          count: totalFeDel,
          detail: `${totalFeDel}개 중복 FE 삭제 (FailureLink.feId 재할당)`,
        });
      });
    } else {
      const totalFeDel = feDupGroups.reduce((s, [, ids]) => s + ids.length - 1, 0);
      results.push({
        table: 'FailureEffect',
        action: 'plan',
        count: totalFeDel,
        detail: `${feDupGroups.length}개 effect 그룹, ${totalFeDel}개 삭제 예정`,
      });
    }

    // ─── 3. L3 중복 정리 (동일 l2Id + name) ───
    const l3All = await prisma.l3Structure.findMany({
      where: { fmeaId, name: { not: '' } },
      select: { id: true, l2Id: true, name: true },
      orderBy: { createdAt: 'asc' },
    });

    const l3ByKey = new Map<string, string[]>();
    for (const l3 of l3All) {
      const key = `${l3.l2Id}|${l3.name}`;
      const arr = l3ByKey.get(key) || [];
      arr.push(l3.id);
      l3ByKey.set(key, arr);
    }

    const l3DupGroups = [...l3ByKey.entries()].filter(([, ids]) => ids.length > 1);

    if (l3DupGroups.length > 0 && !dryRun) {
      await prisma.$transaction(async (tx: any) => {
        for (const [, ids] of l3DupGroups) {
          const keepId = ids[0];
          const dupIds = ids.slice(1);

          // L3Function.l3StructId 재할당
          await tx.l3Function.updateMany({
            where: { l3StructId: { in: dupIds } },
            data: { l3StructId: keepId },
          });

          // FailureCause 재할당 (l3StructId 있으면)
          await tx.failureCause.updateMany({
            where: { l3StructId: { in: dupIds } },
            data: { l3StructId: keepId },
          });

          // 중복 L3 삭제
          await tx.l3Structure.deleteMany({
            where: { id: { in: dupIds } },
          });
        }

        const totalL3Del = l3DupGroups.reduce((s, [, ids]) => s + ids.length - 1, 0);
        results.push({
          table: 'L3Structure',
          action: 'dedup',
          count: totalL3Del,
          detail: `${totalL3Del}개 중복 L3 삭제 (종속 L3Func/FC 재할당)`,
        });
      });
    }

    // ─── 4. L3Function 중복 정리 (동일 l3StructId + functionName) ───
    const l3FuncAll = await prisma.l3Function.findMany({
      where: { fmeaId },
      select: { id: true, l3StructId: true, functionName: true, processChar: true },
      orderBy: { createdAt: 'asc' },
    });

    const l3FuncByKey = new Map<string, string[]>();
    for (const f of l3FuncAll) {
      const key = `${f.l3StructId}|${f.functionName}|${f.processChar}`;
      const arr = l3FuncByKey.get(key) || [];
      arr.push(f.id);
      l3FuncByKey.set(key, arr);
    }

    const l3FuncDupGroups = [...l3FuncByKey.entries()].filter(([, ids]) => ids.length > 1);

    if (l3FuncDupGroups.length > 0 && !dryRun) {
      await prisma.$transaction(async (tx: any) => {
        for (const [, ids] of l3FuncDupGroups) {
          const keepId = ids[0];
          const dupIds = ids.slice(1);

          // FC.l3FuncId 재할당
          await tx.failureCause.updateMany({
            where: { l3FuncId: { in: dupIds } },
            data: { l3FuncId: keepId },
          });

          // 중복 L3Function 삭제
          await tx.l3Function.deleteMany({
            where: { id: { in: dupIds } },
          });
        }

        const totalDel = l3FuncDupGroups.reduce((s, [, ids]) => s + ids.length - 1, 0);
        results.push({
          table: 'L3Function',
          action: 'dedup',
          count: totalDel,
          detail: `${totalDel}개 중복 L3Function 삭제 (FC.l3FuncId 재할당)`,
        });
      });
    }

    // ─── 5. FM 중복 정리 (동일 l2StructId + mode — Cartesian 해소) ───
    const fmAll = await prisma.failureMode.findMany({
      where: { fmeaId },
      select: { id: true, l2StructId: true, mode: true },
      orderBy: { createdAt: 'asc' },
    });

    const fmByKey = new Map<string, string[]>();
    for (const fm of fmAll) {
      const key = `${fm.l2StructId}|${fm.mode}`;
      const arr = fmByKey.get(key) || [];
      arr.push(fm.id);
      fmByKey.set(key, arr);
    }

    const fmDupGroups = [...fmByKey.entries()].filter(([, ids]) => ids.length > 1);

    if (fmDupGroups.length > 0 && !dryRun) {
      await prisma.$transaction(async (tx: any) => {
        for (const [, ids] of fmDupGroups) {
          const keepId = ids[0];
          const dupIds = ids.slice(1);

          // FailureLink.fmId 재할당
          await tx.failureLink.updateMany({
            where: { fmId: { in: dupIds } },
            data: { fmId: keepId },
          });

          // 중복 FM 삭제
          await tx.failureMode.deleteMany({
            where: { id: { in: dupIds } },
          });
        }

        const totalDel = fmDupGroups.reduce((s, [, ids]) => s + ids.length - 1, 0);
        results.push({
          table: 'FailureMode',
          action: 'dedup',
          count: totalDel,
          detail: `${totalDel}개 중복 FM 삭제 (FailureLink.fmId 재할당)`,
        });
      });
    }

    // ─── 6. FC 중복 정리 (동일 l2StructId + cause — 공정 내 동일 원인 텍스트) ───
    const fcAll = await prisma.failureCause.findMany({
      where: { fmeaId },
      select: { id: true, cause: true, l3FuncId: true, l2StructId: true },
      orderBy: { createdAt: 'asc' },
    });

    const fcByKey = new Map<string, string[]>();
    for (const fc of fcAll) {
      // l2StructId 기준: 같은 공정 내에서 동일 cause 텍스트면 중복
      const key = `${fc.l2StructId}|${fc.cause}`;
      const arr = fcByKey.get(key) || [];
      arr.push(fc.id);
      fcByKey.set(key, arr);
    }

    const fcDupGroups = [...fcByKey.entries()].filter(([, ids]) => ids.length > 1);

    if (fcDupGroups.length > 0 && !dryRun) {
      await prisma.$transaction(async (tx: any) => {
        for (const [, ids] of fcDupGroups) {
          const keepId = ids[0];
          const dupIds = ids.slice(1);

          // FailureLink.fcId 재할당
          await tx.failureLink.updateMany({
            where: { fcId: { in: dupIds } },
            data: { fcId: keepId },
          });

          // 중복 FC 삭제
          await tx.failureCause.deleteMany({
            where: { id: { in: dupIds } },
          });
        }

        const totalFcDel = fcDupGroups.reduce((s, [, ids]) => s + ids.length - 1, 0);
        results.push({
          table: 'FailureCause',
          action: 'dedup',
          count: totalFcDel,
          detail: `${totalFcDel}개 중복 FC 삭제 (FailureLink.fcId 재할당)`,
        });
      });
    }

    // ─── 7. FailureLink 중복 정리 (동일 fmId + feId + fcId) ───
    const linkAll = await prisma.failureLink.findMany({
      where: { fmeaId, deletedAt: null },
      select: { id: true, fmId: true, feId: true, fcId: true },
      orderBy: { createdAt: 'asc' },
    });

    const linkByKey = new Map<string, string[]>();
    for (const lk of linkAll) {
      const key = `${lk.fmId}|${lk.feId}|${lk.fcId}`;
      const arr = linkByKey.get(key) || [];
      arr.push(lk.id);
      linkByKey.set(key, arr);
    }

    const linkDupGroups = [...linkByKey.entries()].filter(([, ids]) => ids.length > 1);

    if (linkDupGroups.length > 0 && !dryRun) {
      await prisma.$transaction(async (tx: any) => {
        for (const [, ids] of linkDupGroups) {
          const keepId = ids[0];
          const dupIds = ids.slice(1);

          // 종속 레코드 재할당 또는 삭제
          await tx.failureAnalysis.updateMany({
            where: { linkId: { in: dupIds } },
            data: { linkId: keepId },
          });
          await tx.riskAnalysis.updateMany({
            where: { linkId: { in: dupIds } },
            data: { linkId: keepId },
          });
          await tx.optimization.updateMany({
            where: { linkId: { in: dupIds } },
            data: { linkId: keepId },
          });

          // 중복 Link 삭제
          await tx.failureLink.deleteMany({
            where: { id: { in: dupIds } },
          });
        }

        const totalDel = linkDupGroups.reduce((s, [, ids]) => s + ids.length - 1, 0);
        results.push({
          table: 'FailureLink',
          action: 'dedup',
          count: totalDel,
          detail: `${totalDel}개 중복 FailureLink 삭제 (FA/RA/Opt 재할당)`,
        });
      });
    }

    // ─── 8. L1Function 중복 정리 (동일 requirement 텍스트) ───
    const l1FuncAll = await prisma.l1Function.findMany({
      where: { fmeaId, requirement: { not: '' } },
      select: { id: true, requirement: true },
      orderBy: { createdAt: 'asc' },
    });

    const l1FuncByReq = new Map<string, string[]>();
    for (const f of l1FuncAll) {
      const arr = l1FuncByReq.get(f.requirement) || [];
      arr.push(f.id);
      l1FuncByReq.set(f.requirement, arr);
    }

    const l1FuncDupGroups = [...l1FuncByReq.entries()].filter(([, ids]) => ids.length > 1);

    if (l1FuncDupGroups.length > 0 && !dryRun) {
      await prisma.$transaction(async (tx: any) => {
        for (const [, ids] of l1FuncDupGroups) {
          const dupIds = ids.slice(1);
          await tx.l1Function.deleteMany({ where: { id: { in: dupIds } } });
        }

        const totalDel = l1FuncDupGroups.reduce((s, [, ids]) => s + ids.length - 1, 0);
        results.push({
          table: 'L1Function',
          action: 'dedup',
          count: totalDel,
          detail: `${totalDel}개 중복 L1Function(requirement) 삭제`,
        });
      });
    }

    const totalFixed = results
      .filter(r => r.action !== 'skip' && r.action !== 'plan')
      .reduce((sum, r) => sum + r.count, 0);

    return NextResponse.json({
      success: true,
      fmeaId,
      dryRun,
      totalFixed,
      results,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[verify-integrity/dedup] error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
