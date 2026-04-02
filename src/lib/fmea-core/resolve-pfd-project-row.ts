/**
 * ██████████████████████████████████████████████████████████████████████████
 * ██  CODEFREEZE — 2026-04-03                                           ██
 * ██  public↔project 간 pfd_registrations ID 해석 유틸.                 ██
 * ██  resolveProjectPfdRegistration / loadPfdItemsWithPublicFallback     ██
 * ██  수정 시 반드시 사용자 승인 필수.                                   ██
 * ██████████████████████████████████████████████████████████████████████████
 *
 * public pfd_registrations 와 프로젝트 스키마 pfd_registrations.id 불일치 시
 * pfdItem 조회·저장이 빈 결과가 되는 문제를 해소한다 (SSoT = 프로젝트 스키마 행).
 */

import { derivePfmeaIdFromPfdNo, derivePfdNoFromFmeaId } from '@/lib/utils/derivePfdNo';

export type PfdRegistrationRef = {
  id: string;
  pfdNo: string;
  fmeaId: string | null;
  linkedPfmeaNo?: string | null;
};

/**
 * 프로젝트 스키마에서 public 등록과 대응되는 pfd_registration 행을 찾는다.
 * @param projPrisma — getPrismaForSchema / getPrismaForPfd 클라이언트
 */
export async function resolveProjectPfdRegistration(
  projPrisma: any,
  publicReg: PfdRegistrationRef,
): Promise<{ id: string; pfdNo: string } | null> {
  if (!projPrisma) return null;

  const fmeaKey =
    String(publicReg.fmeaId || publicReg.linkedPfmeaNo || '')
      .trim()
      .toLowerCase() || derivePfmeaIdFromPfdNo(publicReg.pfdNo) || '';

  const byPublicNo = await projPrisma.pfdRegistration.findFirst({
    where: { pfdNo: publicReg.pfdNo },
  });
  if (byPublicNo) return { id: byPublicNo.id, pfdNo: byPublicNo.pfdNo };

  if (fmeaKey) {
    const canonical = derivePfdNoFromFmeaId(fmeaKey);
    const byCanon = await projPrisma.pfdRegistration.findFirst({
      where: { pfdNo: canonical },
    });
    if (byCanon) return { id: byCanon.id, pfdNo: byCanon.pfdNo };

    const byFmea = await projPrisma.pfdRegistration.findFirst({
      where: {
        OR: [{ fmeaId: fmeaKey }, { linkedPfmeaNo: fmeaKey }],
      },
      orderBy: { updatedAt: 'desc' },
    });
    if (byFmea) return { id: byFmea.id, pfdNo: byFmea.pfdNo };
  }

  return null;
}

export async function loadPfdItemsForPublicRegistration(
  projPrisma: any,
  publicReg: PfdRegistrationRef,
): Promise<{
  items: unknown[];
  projectRow: { id: string; pfdNo: string } | null;
  correctedPfdNo?: string;
}> {
  if (!projPrisma) {
    return { items: [], projectRow: null };
  }

  const row = await resolveProjectPfdRegistration(projPrisma, publicReg);
  if (row) {
    const items = (await projPrisma.pfdItem.findMany({
      where: { pfdId: row.id, isDeleted: false },
      orderBy: { sortOrder: 'asc' },
    })) as unknown[];
    const correctedPfdNo = row.pfdNo !== publicReg.pfdNo ? row.pfdNo : undefined;
    return { items, projectRow: row, correctedPfdNo };
  }

  const byPublicId = (await projPrisma.pfdItem.findMany({
    where: { pfdId: publicReg.id, isDeleted: false },
    orderBy: { sortOrder: 'asc' },
  })) as unknown[];

  return {
    items: byPublicId,
    projectRow: byPublicId.length > 0 ? { id: publicReg.id, pfdNo: publicReg.pfdNo } : null,
  };
}

/**
 * 프로젝트 스키마에서 행을 못 찾았을 때 public pfd_items를 폴백으로 조회
 */
export async function loadPfdItemsWithPublicFallback(
  projPrisma: any,
  publicPrisma: any,
  publicReg: PfdRegistrationRef,
): Promise<{
  items: unknown[];
  projectRow: { id: string; pfdNo: string } | null;
  correctedPfdNo?: string;
  source: 'project' | 'public';
}> {
  const projectResult = await loadPfdItemsForPublicRegistration(projPrisma, publicReg);
  if (projectResult.items.length > 0) {
    return { ...projectResult, source: 'project' };
  }

  if (!publicPrisma) return { ...projectResult, source: 'project' };

  const publicItems = (await publicPrisma.pfdItem.findMany({
    where: { pfdId: publicReg.id, isDeleted: false },
    orderBy: { sortOrder: 'asc' },
  })) as unknown[];

  return {
    items: publicItems,
    projectRow: publicItems.length > 0 ? { id: publicReg.id, pfdNo: publicReg.pfdNo } : null,
    correctedPfdNo: projectResult.correctedPfdNo,
    source: publicItems.length > 0 ? 'public' : 'project',
  };
}
