/**
 * @file Master-00 Overview API
 * GET: 모든 FamilyMaster와 하위 FamilyFmea 현황 조회
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';

export async function GET(_request: NextRequest) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
    }

    const familyMasters = await prisma.familyMaster.findMany({
      include: {
        masterFmea: { select: { code: true, productName: true } },
        familyFmeas: {
          include: {
            _count: { select: { controlPlans: true, processFlows: true } },
          },
          orderBy: { processNo: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const masters = familyMasters.map((fm) => ({
      master: {
        id: fm.id,
        code: fm.code,
        name: fm.name,
        version: fm.version,
        status: fm.status,
        updatedAt: fm.updatedAt.toISOString(),
        masterFmeaCode: fm.masterFmea.code,
        productName: fm.masterFmea.productName,
      },
      processes: fm.familyFmeas.map((ff) => ({
        id: ff.id,
        familyCode: ff.familyCode,
        processNo: ff.processNo,
        processName: ff.processName,
        status: ff.status,
        version: ff.version,
        authorName: ff.authorName ?? '-',
        cpCount: ff._count.controlPlans,
        pfdCount: ff._count.processFlows,
      })),
    }));

    return NextResponse.json({ success: true, masters });
  } catch (error: unknown) {
    console.error('[family-fmea/master-overview] Error:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}
