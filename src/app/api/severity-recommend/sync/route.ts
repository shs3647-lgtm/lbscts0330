/**
 * @file /api/severity-recommend/sync/route.ts
 * @description 워크시트 저장 후 FE-S 쌍을 프로젝트 스키마에서 추출하여 SeverityUsageRecord에 기록
 *
 * POST /api/severity-recommend/sync
 * body: { fmeaId: string }
 *
 * 실제 데이터 경로: 프로젝트 스키마 failure_effects.effect + failure_effects.severity
 * SeverityUsageRecord는 public 스키마에 저장 (전사 공유)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma, getPrismaForSchema } from '@/lib/prisma';
import { getProjectSchemaName } from '@/lib/project-schema';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fmeaId } = body;
    if (!fmeaId) return NextResponse.json({ success: false, error: 'fmeaId 필수' }, { status: 400 });

    const publicPrisma = getPrisma();
    if (!publicPrisma) return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });

    // 프로젝트 스키마에서 failure_effects 읽기 (실제 FE+severity 저장 위치)
    const schema = getProjectSchemaName(fmeaId);
    const projectPrisma = getPrismaForSchema(schema);
    if (!projectPrisma) return NextResponse.json({ success: true, saved: 0, message: '프로젝트 스키마 없음' });

    const effects = await projectPrisma.failureEffect.findMany({
      where: { fmeaId, severity: { gt: 0 } },
      select: { effect: true, severity: true, category: true },
    }).catch(() => [] as { effect: string; severity: number; category: string }[]);

    if (effects.length === 0) {
      return NextResponse.json({ success: true, saved: 0, message: 'FE-S 데이터 없음 (severity=0)' });
    }

    // public 스키마 SeverityUsageRecord에 upsert
    let saved = 0;
    for (const fe of effects) {
      if (!fe.effect?.trim() || !fe.severity) continue;
      try {
        await publicPrisma.severityUsageRecord.upsert({
          where: { feText_severity: { feText: fe.effect, severity: fe.severity } },
          update: {
            usageCount: { increment: 1 },
            lastUsedAt: new Date(),
            feCategory: fe.category || '',
            sourceFmeaId: fmeaId,
          },
          create: {
            feText: fe.effect,
            severity: fe.severity,
            feCategory: fe.category || '',
            sourceFmeaId: fmeaId,
            usageCount: 1,
            lastUsedAt: new Date(),
          },
        });
        saved++;
      } catch {
        // 무시 (unique 충돌 등)
      }
    }

    return NextResponse.json({ success: true, saved, total: effects.length, fmeaId });
  } catch (error) {
    console.error('[severity-recommend/sync] POST error:', error);
    return NextResponse.json({ success: false, error: '심각도 동기화 실패' }, { status: 500 });
  }
}
