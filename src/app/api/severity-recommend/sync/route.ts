/**
 * @file /api/severity-recommend/sync/route.ts
 * @description 워크시트 저장 후 FE-S + RA-S 쌍을 프로젝트 스키마에서 추출하여 SeverityUsageRecord에 기록
 *
 * POST /api/severity-recommend/sync
 * body: { fmeaId: string }
 *
 * ★ 2026-03-25: FE severity + RA severity 양쪽 동기화
 *   - FE: failure_effects.effect + failure_effects.severity
 *   - RA: risk_analyses → failure_links → failure_effects 조인으로 FE 텍스트 + RA severity
 * SeverityUsageRecord는 public 스키마에 저장 (전사 공유)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma, getPrismaForSchema } from '@/lib/prisma';
import { getProjectSchemaName } from '@/lib/project-schema';

async function upsertSeverityRecord(
  publicPrisma: any,
  feText: string,
  severity: number,
  feCategory: string,
  processName: string,
  fmeaId: string,
): Promise<boolean> {
  if (!feText?.trim() || !severity || severity <= 0) return false;
  try {
    await publicPrisma.severityUsageRecord.upsert({
      where: { feText_severity: { feText, severity } },
      update: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
        feCategory: feCategory || '',
        processName: processName || '',
        sourceFmeaId: fmeaId,
      },
      create: {
        feText,
        severity,
        feCategory: feCategory || '',
        processName: processName || '',
        sourceFmeaId: fmeaId,
        usageCount: 1,
        lastUsedAt: new Date(),
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fmeaId } = body;
    if (!fmeaId) return NextResponse.json({ success: false, error: 'fmeaId 필수' }, { status: 400 });

    const publicPrisma = getPrisma();
    if (!publicPrisma) return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });

    const schema = getProjectSchemaName(fmeaId);
    const projectPrisma = getPrismaForSchema(schema);
    if (!projectPrisma) return NextResponse.json({ success: true, saved: 0, message: '프로젝트 스키마 없음' });

    let savedFE = 0;
    let savedRA = 0;

    // ── 1. FE severity 동기화 (기존 로직) ──
    const effects = await projectPrisma.failureEffect.findMany({
      where: { fmeaId, severity: { gt: 0 } },
      select: { effect: true, severity: true, category: true },
    }).catch(() => [] as { effect: string; severity: number; category: string }[]);

    for (const fe of effects) {
      if (await upsertSeverityRecord(publicPrisma, fe.effect, fe.severity, fe.category || '', '', fmeaId)) {
        savedFE++;
      }
    }

    // ── 2. RA severity 동기화 (★ 신규: RA→FL→FE 조인) ──
    // RA의 severity가 FE severity와 다를 수 있음 (사용자가 수정한 경우)
    // 이 데이터가 Family 클론 후 추천에 사용됨
    try {
      const ras = await projectPrisma.riskAnalysis.findMany({
        where: { fmeaId, severity: { gt: 1 } },
        select: {
          severity: true,
          failureLink: {
            select: {
              feText: true,
              fmProcess: true,
            },
          },
        },
      }).catch(() => []);

      // FE 텍스트 + RA severity 조합으로 upsert
      const seen = new Set<string>();
      for (const ra of ras) {
        const fl = (ra as any).failureLink;
        if (!fl) continue;
        const feText = fl.feText || '';
        const processName = fl.fmProcess || '';
        const key = `${feText}|${ra.severity}`;
        if (seen.has(key)) continue;
        seen.add(key);

        if (await upsertSeverityRecord(publicPrisma, feText, ra.severity, '', processName, fmeaId)) {
          savedRA++;
        }
      }
    } catch (raErr) {
      console.warn('[severity-recommend/sync] RA sync warn:', raErr);
    }

    return NextResponse.json({
      success: true,
      savedFE,
      savedRA,
      total: effects.length,
      fmeaId,
    });
  } catch (error) {
    console.error('[severity-recommend/sync] POST error:', error);
    return NextResponse.json({ success: false, error: '심각도 동기화 실패' }, { status: 500 });
  }
}
