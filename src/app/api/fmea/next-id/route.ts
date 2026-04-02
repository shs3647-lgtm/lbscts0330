/**
 * FMEA 다음 ID 생성 API
 *
 * GET /api/fmea/next-id?type=P&module=pfmea&linkGroup=0
 * - DB에서 기존 fmeaId 목록 조회 → 다음 시퀀스 번호 계산
 *
 * @created 2026-02-07
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const fmeaType = (searchParams.get('type') || 'P').toUpperCase();
  const module = searchParams.get('module') || 'pfmea';
  const linkGroupNo = parseInt(searchParams.get('linkGroup') || '0');

  const year = new Date().getFullYear().toString().slice(-2);
  const typeChar = fmeaType.toLowerCase();
  // DFMEA: module=dfmea → dfm 프리픽스, PFMEA: pfm 프리픽스
  const modulePrefix = module === 'dfmea' ? 'dfm' : 'pfm';
  const prefix = `${modulePrefix}${year}-${typeChar}`;

  // 연동 접미사: Part FMEA만 사용 (Master/Family는 접미사 없음)
  const needsSuffix = fmeaType === 'P';
  const linkSuffix = needsSuffix
    ? (linkGroupNo > 0 ? `-L${String(linkGroupNo).padStart(2, '0')}` : '-S')
    : '';

  /** ID 조합 헬퍼 — ★ 항상 -r00 개정 접미사 포함 */
  const buildId = (seq: string) => `${prefix}${seq}${linkSuffix}-r00`;

  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: true, nextId: buildId('001'), source: 'default' });
    }

    // DB에서 해당 접두사로 시작하는 활성 fmeaId 목록 조회
    const activeProjects = await prisma.fmeaProject.findMany({
      where: { fmeaId: { startsWith: prefix, mode: 'insensitive' }, deletedAt: null },
      select: { fmeaId: true },
    });

    // 시퀀스 번호 추출 (pfm26-m001 → 001, pfm26-p001-S → 001)
    const escapedPrefix = prefix.replace(/[-]/g, '\\-');
    const activeSeqNumbers = activeProjects
      .map((p: { fmeaId: string }) => {
        const match = p.fmeaId.match(new RegExp(`${escapedPrefix}(\\d{3})`, 'i'));
        return match ? parseInt(match[1]) : 0;
      })
      .filter((n: number) => n > 0);

    const nextSeq = activeSeqNumbers.length > 0 ? Math.max(...activeSeqNumbers) + 1 : 1;
    const seqStr = nextSeq.toString().padStart(3, '0');

    return NextResponse.json({
      success: true,
      nextId: buildId(seqStr),
      source: 'db',
      existingCount: activeProjects.length,
    });
  } catch (error: any) {
    console.error('❌ next-id 생성 실패:', error.message);
    return NextResponse.json({ success: true, nextId: buildId('001'), source: 'fallback' });
  }
}
