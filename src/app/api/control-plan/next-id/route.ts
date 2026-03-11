/**
 * CP 다음 ID 생성 API
 *
 * GET /api/control-plan/next-id?type=P&linkGroup=0
 * - DB에서 기존 cpNo 목록 조회 -> 다음 시퀀스 번호 계산
 * - type: CP 유형 (M/F/P 레거시 또는 confidentialityLevel 문자열)
 *
 * CP ID 형식: cp{YY}-{typeChar}{NNN}-{linkSuffix}
 *   typeChar: m/f/p (레거시) 또는 t/l/p/s (Prototype/Pre-Launch/Production/Safe Launch)
 *   linkSuffix: L{NN} (linkGroup > 0) 또는 S (단독)
 *
 * @created 2026-03-05
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

/** CP 종류 -> 유형 코드 매핑 (레거시 + 신규 모두 지원) */
const CP_TYPE_CODE_MAP: Record<string, string> = {
  'Prototype': 't',
  'Pre-Launch': 'l',
  'Production': 'p',
  'Safe Launch': 's',
  'M': 'm',
  'F': 'f',
  'P': 'p',
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const cpType = searchParams.get('type') || 'P';
  const linkGroupNo = parseInt(searchParams.get('linkGroup') || '0');

  const year = new Date().getFullYear().toString().slice(-2);
  const typeChar = CP_TYPE_CODE_MAP[cpType] || cpType.charAt(0).toLowerCase();
  const prefix = `cp${year}-${typeChar}`;

  // 연동 접미사: 항상 사용 (-L{NN} 또는 -S)
  const linkSuffix = linkGroupNo > 0
    ? `-L${String(linkGroupNo).padStart(2, '0')}`
    : '-S';

  /** ID 조합 헬퍼 — ★ 항상 -r00 개정 접미사 포함 */
  const buildId = (seq: string) => `${prefix}${seq}${linkSuffix}-r00`;

  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: true, nextId: buildId('001'), source: 'default' });
    }

    // DB에서 해당 접두사로 시작하는 활성 cpNo 목록 조회
    const activeRegistrations = await prisma.cpRegistration.findMany({
      where: { cpNo: { startsWith: prefix, mode: 'insensitive' }, deletedAt: null },
      select: { cpNo: true },
    });

    // 시퀀스 번호 추출 (cp26-m001-S -> 001, cp26-p002-L01 -> 002)
    const escapedPrefix = prefix.replace(/[-]/g, '\\-');
    const activeSeqNumbers = activeRegistrations
      .map((r: { cpNo: string }) => {
        const match = r.cpNo.match(new RegExp(`${escapedPrefix}(\\d{3})`, 'i'));
        return match ? parseInt(match[1]) : 0;
      })
      .filter((n: number) => n > 0);

    const nextSeq = activeSeqNumbers.length > 0 ? Math.max(...activeSeqNumbers) + 1 : 1;
    const seqStr = nextSeq.toString().padStart(3, '0');

    return NextResponse.json({
      success: true,
      nextId: buildId(seqStr),
      source: 'db',
      existingCount: activeRegistrations.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[CP next-id] 생성 실패:', message);
    return NextResponse.json({ success: true, nextId: buildId('001'), source: 'fallback' });
  }
}
