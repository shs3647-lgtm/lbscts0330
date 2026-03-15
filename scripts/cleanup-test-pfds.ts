/**
 * @file cleanup-test-pfds.ts
 * @description 통합 테스트에서 생성된 테스트 PFD/CP/ProjectLinkage/DocumentLink 정리
 *
 * 실행: npx tsx scripts/cleanup-test-pfds.ts
 *
 * 정리 대상:
 * - pfd-test-* (pfd-cp-sync, round-trip-edge-cases 테스트)
 * - pfd-integrity-* (pfd-cp-sync 무결성 테스트)
 * - pfd-special-* (pfd-cp-sync 특별특성 테스트)
 * - cp-test-* (연동 테스트)
 * - cp-test2-* (연동 테스트)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
  console.log('🧹 테스트 데이터 정리 시작...\n');

  // 1. 테스트 PFD 정리
  const testPfds = await prisma.pfdRegistration.findMany({
    where: {
      OR: [
        { pfdNo: { startsWith: 'pfd-test' } },
        { pfdNo: { startsWith: 'pfd-integrity' } },
        { pfdNo: { startsWith: 'pfd-special' } },
      ],
    },
    select: { id: true, pfdNo: true },
  });

  if (testPfds.length > 0) {
    console.log(`📋 테스트 PFD ${testPfds.length}건 발견:`);
    for (const pfd of testPfds) {
      console.log(`   - ${pfd.pfdNo}`);
    }

    // PfdItem 삭제
    const pfdIds = testPfds.map(p => p.id);
    const deletedItems = await prisma.pfdItem.deleteMany({
      where: { pfdId: { in: pfdIds } },
    });
    console.log(`   → PfdItem ${deletedItems.count}건 삭제`);

    // DocumentLink 삭제
    const pfdNos = testPfds.map(p => p.pfdNo);
    const deletedLinks = await prisma.documentLink.deleteMany({
      where: {
        OR: [
          { sourceId: { in: pfdIds }, sourceType: 'pfd' },
          { targetId: { in: pfdNos }, targetType: 'pfd' },
          ...pfdIds.map(id => ({ sourceId: id })),
        ],
      },
    });
    console.log(`   → DocumentLink ${deletedLinks.count}건 삭제`);

    // ProjectLinkage pfdNo null 처리
    try {
      for (const pfdNo of pfdNos) {
        await (prisma as any).projectLinkage.updateMany({
          where: { pfdNo: { equals: pfdNo, mode: 'insensitive' } },
          data: { pfdNo: null },
        });
      }
    } catch {
      // projectLinkage 테이블 미존재 시 무시
    }

    // PFD 등록 삭제
    const deletedPfds = await prisma.pfdRegistration.deleteMany({
      where: { id: { in: pfdIds } },
    });
    console.log(`   → PfdRegistration ${deletedPfds.count}건 삭제\n`);
  } else {
    console.log('✅ 테스트 PFD 없음\n');
  }

  // 2. 테스트 CP 관련 ProjectLinkage 정리
  try {
    const testLinkages = await (prisma as any).projectLinkage.findMany({
      where: {
        OR: [
          { cpNo: { startsWith: 'cp-test' } },
          { pfdNo: { startsWith: 'pfd-test' } },
        ],
      },
      select: { id: true, cpNo: true, pfdNo: true },
    });
    if (testLinkages.length > 0) {
      console.log(`📋 테스트 ProjectLinkage ${testLinkages.length}건 삭제`);
      await (prisma as any).projectLinkage.deleteMany({
        where: { id: { in: testLinkages.map((l: any) => l.id) } },
      });
    }
  } catch {
    // 테이블 미존재 시 무시
  }

  console.log('✅ 정리 완료!');
}

cleanup()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
