/**
 * @file cleanup-soft-deleted-links.js
 * @description 30일 이상된 soft-deleted FailureLink 완전 삭제
 *
 * 실행: DATABASE_URL="postgresql://..." node scripts/cleanup-soft-deleted-links.js
 * cron 예시: 0 3 * * 0 (매주 일요일 새벽 3시)
 */

const { PrismaClient } = require('../src/generated/prisma');

async function main() {
  const prisma = new PrismaClient();

  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    console.log(`[cleanup] 기준일: ${cutoff.toISOString()} 이전 soft-deleted 링크 삭제`);

    const { count } = await prisma.failureLink.deleteMany({
      where: {
        deletedAt: { not: null, lt: cutoff },
      },
    });

    console.log(`[cleanup] 완료: ${count}건 완전 삭제`);
  } catch (error) {
    console.error('[cleanup] 오류:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
