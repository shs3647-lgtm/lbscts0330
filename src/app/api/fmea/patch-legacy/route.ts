/**
 * @file patch-legacy/route.ts
 * @description Atomic DB 직접 패치 + Legacy 삭제/재생성 API
 *
 * POST /api/fmea/patch-legacy
 * body: {
 *   fmeaId,
 *   atomicFixes?: [{ table, id, field, value }],  // Atomic DB 직접 수정
 *   deleteLegacy?: boolean,                        // Legacy 삭제 → Atomic DB에서 재생성
 * }
 */
import { NextRequest, NextResponse } from 'next/server';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import { getBaseDatabaseUrl, getPrismaForSchema } from '@/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';

export const runtime = 'nodejs';

interface AtomicFix {
  table: string;
  id: string;
  field: string;
  value: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const fmeaId = body.fmeaId?.toLowerCase();
    if (!fmeaId || !isValidFmeaId(fmeaId)) {
      return NextResponse.json({ success: false, error: 'fmeaId 필요' }, { status: 400 });
    }

    const baseUrl = getBaseDatabaseUrl();
    if (!baseUrl) return NextResponse.json({ success: false, error: 'DB 미설정' }, { status: 500 });

    const schema = getProjectSchemaName(fmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
    const prisma = getPrismaForSchema(schema);
    if (!prisma) return NextResponse.json({ success: false, error: 'Prisma 실패' }, { status: 500 });

    const results: string[] = [];

    // 1. Atomic DB 직접 수정
    const fixes: AtomicFix[] = body.atomicFixes || [];
    const allowedTables: Record<string, any> = {
      l3Function: prisma.l3Function,
      l2Function: prisma.l2Function,
      l3Structure: prisma.l3Structure,
      l2Structure: prisma.l2Structure,
      failureMode: prisma.failureMode,
      failureCause: prisma.failureCause,
      failureEffect: prisma.failureEffect,
      processProductChar: prisma.processProductChar,
    };

    for (const fix of fixes) {
      const model = allowedTables[fix.table];
      if (!model) {
        results.push(`SKIP: ${fix.table} — 허용되지 않는 테이블`);
        continue;
      }
      try {
        await model.update({
          where: { id: fix.id },
          data: { [fix.field]: fix.value },
        });
        results.push(`OK: ${fix.table}.${fix.id}.${fix.field} = "${fix.value}"`);
      } catch (e: unknown) {
        results.push(`ERR: ${fix.table}.${fix.id} — ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // 2. Legacy 삭제
    if (body.deleteLegacy) {
      try {
        await prisma.fmeaLegacyData.delete({ where: { fmeaId } });
        results.push('OK: Legacy 삭제 완료');
      } catch {
        results.push('SKIP: Legacy 없음 (이미 삭제됨)');
      }
    }

    // 3. Legacy의 특정 processChar 패치 (Atomic → Legacy 동기화)
    if (body.syncProcessChars) {
      try {
        const legacyRecord = await prisma.fmeaLegacyData.findUnique({ where: { fmeaId } });
        if (legacyRecord?.data) {
          const legacyData = JSON.parse(JSON.stringify(legacyRecord.data));
          const l3Funcs = await prisma.l3Function.findMany({
            where: { fmeaId },
            select: { id: true, l3StructId: true, processChar: true, functionName: true },
          });
          const l3Structs = await prisma.l3Structure.findMany({
            where: { fmeaId },
            select: { id: true, l2Id: true, name: true, m4: true },
          });
          const l3ById = new Map(l3Structs.map(s => [s.id, s]));

          let patchCount = 0;
          for (const l3Func of l3Funcs) {
            if (!l3Func.processChar?.trim()) continue;
            const l3 = l3ById.get(l3Func.l3StructId);
            if (!l3) continue;

            for (const proc of (legacyData.l2 || [])) {
              for (const we of (proc.l3 || [])) {
                if (we.id !== l3.id && !(we.name === l3.name && we.m4 === l3.m4)) continue;
                for (const func of (we.functions || [])) {
                  for (const pc of (func.processChars || [])) {
                    if (!pc.name || pc.name.trim() === '') {
                      pc.name = l3Func.processChar;
                      patchCount++;
                      results.push(`SYNC: proc=${proc.no} WE=${we.name} PC="${l3Func.processChar}"`);
                    }
                  }
                }
              }
            }
          }

          if (patchCount > 0) {
            await prisma.fmeaLegacyData.update({
              where: { fmeaId },
              data: { data: legacyData },
            });
            results.push(`OK: Legacy processChar ${patchCount}건 동기화`);
          } else {
            results.push('SKIP: 동기화 불필요 (빈 PC 없음)');
          }
        } else {
          results.push('SKIP: Legacy 없음');
        }
      } catch (e: unknown) {
        results.push(`ERR: syncProcessChars — ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (e) {
    console.error('[patch-legacy] 에러:', e);
    return NextResponse.json({ success: false, error: safeErrorMessage(e) }, { status: 500 });
  }
}
