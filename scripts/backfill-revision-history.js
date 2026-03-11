/**
 * 기존 개정 프로젝트에 원본 이력을 소급 복사하는 스크립트
 * 실행: node scripts/backfill-revision-history.js
 */
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function backfill() {
  const revProjects = await prisma.fmeaProject.findMany({
    where: { fmeaId: { contains: '-r' }, parentFmeaId: { not: null } },
    select: { fmeaId: true, parentFmeaId: true },
  });

  console.log('revision projects: ' + revProjects.length);

  for (const proj of revProjects) {
    var parentId = proj.parentFmeaId;
    var childId = proj.fmeaId;

    var childRevs = await prisma.fmeaRevisionHistory.findMany({
      where: { fmeaId: childId },
      orderBy: { revisionNumber: 'asc' },
    });

    var parentRevs = await prisma.fmeaRevisionHistory.findMany({
      where: { fmeaId: parentId },
      orderBy: { revisionNumber: 'asc' },
    });

    console.log('[' + childId + '] child=' + childRevs.length + ', parent(' + parentId + ')=' + parentRevs.length);

    var childRevNums = new Set(childRevs.map(function(r) { return r.revisionNumber; }));
    var missing = parentRevs.filter(function(r) { return !childRevNums.has(r.revisionNumber); });

    console.log('  missing: ' + missing.length);

    for (var i = 0; i < missing.length; i++) {
      var rev = missing[i];
      await prisma.fmeaRevisionHistory.create({
        data: {
          fmeaId: childId,
          revisionNumber: rev.revisionNumber,
          revisionHistory: rev.revisionHistory || '',
          createPosition: rev.createPosition || '',
          createName: rev.createName || '',
          createDate: rev.createDate || '',
          createStatus: rev.createStatus || '',
          reviewPosition: rev.reviewPosition || '',
          reviewName: rev.reviewName || '',
          reviewDate: rev.reviewDate || '',
          reviewStatus: rev.reviewStatus || '',
          approvePosition: rev.approvePosition || '',
          approveName: rev.approveName || '',
          approveDate: rev.approveDate || '',
          approveStatus: rev.approveStatus || '',
        },
      });
      console.log('  + copied: ' + rev.revisionNumber + ' - ' + (rev.revisionHistory || ''));
    }
  }

  await prisma.$disconnect();
  await pool.end();
  console.log('Done');
}

backfill().catch(function(e) { console.error(e); process.exit(1); });
