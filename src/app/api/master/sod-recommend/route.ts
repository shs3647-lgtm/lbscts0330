/**
 * POST /api/master/sod-recommend
 * @description Master FMEA SOD 일괄 추천 — MasterFmeaReference 기반
 *
 * Body: { fmeaId: string }
 * 프로젝트 스키마의 FailureLink/RA를 읽어 MasterFmeaReference에서 매칭된 S/O/D를 반환
 *
 * 매칭 우선순위:
 *  1순위: processNo + m4 + weName 정확 매칭 (공정번호 + 작업요소)
 *  2순위: m4 + weName 크로스프로세스 매칭
 *  3순위: FE 텍스트 → SeverityUsageRecord (S만)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma, getPrismaForSchema } from '@/lib/prisma';
import { getProjectSchemaName } from '@/lib/project-schema';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';

export const runtime = 'nodejs';

interface SODResult {
  linkId: string;
  severity: number | null;
  occurrence: number | null;
  detection: number | null;
  matchType: 'exact' | 'crossProcess' | 'category' | 'feUsage' | 'none';
  source: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fmeaId } = body;
    if (!fmeaId || !isValidFmeaId(fmeaId)) {
      return NextResponse.json({ success: false, error: 'fmeaId 필수' }, { status: 400 });
    }

    const publicPrisma = getPrisma();
    if (!publicPrisma) return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });

    const schema = getProjectSchemaName(fmeaId);
    const projectPrisma = getPrismaForSchema(schema);
    if (!projectPrisma) return NextResponse.json({ success: true, results: [], message: '프로젝트 스키마 없음' });

    // 1. 프로젝트 RA + FL 로드 (빈 SOD 대상)
    const ras = await projectPrisma.riskAnalysis.findMany({
      where: { fmeaId },
      select: {
        id: true,
        linkId: true,
        severity: true,
        occurrence: true,
        detection: true,
        failureLink: {
          select: {
            id: true,
            feText: true,
            fcText: true,
            fmText: true,
            fcWorkElem: true,
            fcM4: true,
            fmProcess: true,
          },
        },
      },
    });

    // 2. MasterFmeaReference 전체 로드 (407건 정도 — 메모리 OK)
    const masterRefs = await publicPrisma.masterFmeaReference.findMany({
      where: { isActive: true },
    });

    // 인덱스 빌드: processNo+m4+weName → ref, m4+weName → ref[]
    const exactMap = new Map<string, typeof masterRefs[0]>();
    const crossMap = new Map<string, typeof masterRefs[0][]>();
    const catMap = new Map<string, typeof masterRefs[0][]>();

    for (const ref of masterRefs) {
      const exactKey = `${ref.processNo}|${ref.m4}|${ref.weName}`;
      if (!exactMap.has(exactKey) || (ref.severity ?? 0) > (exactMap.get(exactKey)?.severity ?? 0)) {
        exactMap.set(exactKey, ref);
      }
      const crossKey = `${ref.m4}|${ref.weName}`;
      if (!crossMap.has(crossKey)) crossMap.set(crossKey, []);
      crossMap.get(crossKey)!.push(ref);

      if (!catMap.has(ref.m4)) catMap.set(ref.m4, []);
      catMap.get(ref.m4)!.push(ref);
    }

    // 3. SeverityUsageRecord 로드 (FE 텍스트 기반 S fallback)
    const feUsageRecords = await publicPrisma.severityUsageRecord.findMany({
      where: { usageCount: { gt: 0 } },
      orderBy: { usageCount: 'desc' },
    });
    const feUsageMap = new Map<string, number>();
    for (const rec of feUsageRecords) {
      const key = rec.feText.toLowerCase().trim();
      if (!feUsageMap.has(key)) feUsageMap.set(key, rec.severity);
    }

    // 4. 매칭 실행
    const results: SODResult[] = [];
    let filled = 0;
    let skipped = 0;

    for (const ra of ras) {
      const fl = (ra as any).failureLink;
      if (!fl) continue;

      // 이미 S, O, D 모두 채워져 있으면 스킵
      if ((ra.severity ?? 0) > 1 && (ra.occurrence ?? 0) > 1 && (ra.detection ?? 0) > 1) {
        skipped++;
        continue;
      }

      const m4 = (fl.fcM4 || '').trim().toUpperCase();
      const we = (fl.fcWorkElem || '').trim();
      const processNo = (fl.fmProcess || '').replace(/[^\d]/g, '').trim();
      const feText = (fl.feText || '').toLowerCase().trim();

      let matched: typeof masterRefs[0] | null = null;
      let matchType: SODResult['matchType'] = 'none';

      // 1순위: 정확 매칭
      if (processNo && m4 && we) {
        matched = exactMap.get(`${processNo}|${m4}|${we}`) || null;
        if (matched) matchType = 'exact';
      }

      // 2순위: 크로스프로세스
      if (!matched && m4 && we) {
        const candidates = crossMap.get(`${m4}|${we}`) || [];
        matched = pickBest(candidates);
        if (matched) matchType = 'crossProcess';
      }

      // 3순위: M4 카테고리
      if (!matched && m4) {
        const candidates = catMap.get(m4) || [];
        matched = pickBest(candidates);
        if (matched) matchType = 'category';
      }

      if (matched && (matched.severity ?? 0) > 0) {
        results.push({
          linkId: ra.linkId,
          severity: matched.severity,
          occurrence: matched.occurrence,
          detection: matched.detection,
          matchType,
          source: `MasterRef:${matched.m4}/${matched.weName}`,
        });
        filled++;
      } else if (feText && feUsageMap.has(feText)) {
        // FE 텍스트 fallback (S만)
        results.push({
          linkId: ra.linkId,
          severity: feUsageMap.get(feText)!,
          occurrence: null,
          detection: null,
          matchType: 'feUsage',
          source: `SeverityUsage:${feText.substring(0, 20)}`,
        });
        filled++;
      } else {
        results.push({
          linkId: ra.linkId,
          severity: null,
          occurrence: null,
          detection: null,
          matchType: 'none',
          source: '',
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      stats: {
        total: ras.length,
        filled,
        skipped,
        noMatch: ras.length - filled - skipped,
        masterRefs: masterRefs.length,
      },
    });
  } catch (error) {
    console.error('[master/sod-recommend] POST error:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}

function pickBest(candidates: any[]): any | null {
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => {
    const sodA = (a.severity ?? 0) + (a.occurrence ?? 0) + (a.detection ?? 0);
    const sodB = (b.severity ?? 0) + (b.occurrence ?? 0) + (b.detection ?? 0);
    if (sodB !== sodA) return sodB - sodA;
    return b.usageCount - a.usageCount;
  })[0];
}
