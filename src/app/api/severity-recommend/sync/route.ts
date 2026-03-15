/**
 * @file /api/severity-recommend/sync/route.ts
 * @description 워크시트 상태에서 FE-S 쌍을 추출하여 DB에 일괄 기록
 *
 * 워크시트 확정 또는 저장 후 클라이언트에서 호출:
 *   POST /api/severity-recommend/sync
 *   body: { fmeaId: string }
 *
 * 워크시트 상태(FmeaWorksheetState)에서 FE + severity를 읽어
 * SeverityUsageRecord에 자동 기록 → 다음 프로젝트 추천에 활용
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });

    const body = await req.json();
    const { fmeaId } = body;
    if (!fmeaId) return NextResponse.json({ success: false, error: 'fmeaId 필수' }, { status: 400 });

    // 워크시트 상태에서 FE + severity 데이터 추출
    const wsState = await prisma.fmeaWorksheetData.findUnique({
      where: { fmeaId },
      select: { l1Data: true, riskData: true, failureLinks: true },
    });

    if (!wsState) {
      return NextResponse.json({ success: false, error: '워크시트 데이터 없음' }, { status: 404 });
    }

    const records: Array<{ feText: string; severity: number; feCategory: string }> = [];

    // l1Data에서 failureScopes (고장영향) 추출
    const l1Data = wsState.l1Data as Record<string, unknown> | null;
    if (l1Data) {
      const l1Items = (l1Data as { items?: Array<{ failureScopes?: Array<{ effect?: string; severity?: number; category?: string }> }> }).items;
      if (Array.isArray(l1Items)) {
        for (const l1 of l1Items) {
          if (!Array.isArray(l1.failureScopes)) continue;
          for (const fe of l1.failureScopes) {
            if (fe.effect && fe.severity && fe.severity > 0) {
              records.push({
                feText: fe.effect,
                severity: fe.severity,
                feCategory: fe.category || '',
              });
            }
          }
        }
      }
    }

    // failureLinks에서도 FE + severity 추출 (보완)
    const links = wsState.failureLinks;
    if (Array.isArray(links)) {
      for (const link of links as Array<{ feText?: string; feSeverity?: number; feCategory?: string }>) {
        if (link.feText && link.feSeverity && link.feSeverity > 0) {
          // 중복 제거 (같은 feText+severity 조합)
          const exists = records.some(r => r.feText === link.feText && r.severity === link.feSeverity);
          if (!exists) {
            records.push({
              feText: link.feText,
              severity: link.feSeverity,
              feCategory: link.feCategory || '',
            });
          }
        }
      }
    }

    if (records.length === 0) {
      return NextResponse.json({ success: true, saved: 0, message: 'FE-S 데이터 없음' });
    }

    // DB에 upsert
    let saved = 0;
    for (const rec of records) {
      try {
        await prisma.severityUsageRecord.upsert({
          where: { feText_severity: { feText: rec.feText, severity: rec.severity } },
          update: {
            usageCount: { increment: 1 },
            lastUsedAt: new Date(),
            feCategory: rec.feCategory,
            sourceFmeaId: fmeaId,
          },
          create: {
            feText: rec.feText,
            severity: rec.severity,
            feCategory: rec.feCategory,
            sourceFmeaId: fmeaId,
          },
        });
        saved++;
      } catch {
        // unique 충돌 등 무시
      }
    }

    return NextResponse.json({
      success: true,
      saved,
      total: records.length,
      fmeaId,
    });
  } catch (error) {
    console.error('[severity-recommend/sync] POST error:', error);
    return NextResponse.json({ success: false, error: '심각도 동기화 실패' }, { status: 500 });
  }
}
