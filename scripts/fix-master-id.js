/**
 * 마스터 FMEA 현황 확인 + m002 → m001 재부여
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    // 1. 전체 프로젝트
    const all = await prisma.fmeaProject.findMany({
      select: { id: true, fmeaId: true, fmeaType: true, parentFmeaId: true },
      orderBy: { fmeaId: 'asc' },
    });
    console.log('=== 전체 FMEA 프로젝트 ===');
    all.forEach(p => console.log(`  ${p.fmeaId} | type=${p.fmeaType} | parent=${p.parentFmeaId || '-'}`));

    // 2. 마스터별 기초정보 데이터 건수
    const masters = all.filter(p => p.fmeaType === 'M');
    console.log(`\n=== Master 프로젝트: ${masters.length}건 ===`);
    for (const m of masters) {
      const flatCount = await prisma.pfmeaMasterFlatItem.count({ where: { sourceFmeaId: m.fmeaId } });
      const childCount = all.filter(p => p.parentFmeaId === m.fmeaId && p.fmeaId !== m.fmeaId).length;
      console.log(`  ${m.fmeaId}: 기초정보=${flatCount}건, 하위=${childCount}건`);
    }

    // 3. m001 삭제 → m002를 m001로 변경
    const m001 = masters.find(p => p.fmeaId === 'pfm26-m001');
    const m002 = masters.find(p => p.fmeaId === 'pfm26-m002');

    if (!m002) {
      console.log('\n⚠️ pfm26-m002가 없습니다.');
      return;
    }

    if (m001) {
      console.log('\n🗑️ pfm26-m001 삭제 시작...');

      // m001의 하위 프로젝트 parentFmeaId를 m001(새)로 미리 변경할 것이므로
      // 먼저 m001의 하위를 확인
      const m001Children = all.filter(p => p.parentFmeaId === 'pfm26-m001' && p.fmeaId !== 'pfm26-m001');
      console.log(`  m001 하위 프로젝트: ${m001Children.length}건`);

      // m001 관련 구조 데이터 삭제 (cascade이면 자동, 아니면 수동)
      // FmeaProject 삭제 시 cascade 설정에 따라 처리됨
      // 먼저 m001 sourceFmeaId 참조 삭제
      await prisma.pfmeaMasterFlatItem.deleteMany({ where: { sourceFmeaId: 'pfm26-m001' } });

      // m001의 하위 프로젝트 parentFmeaId를 임시로 null로 변경
      if (m001Children.length > 0) {
        await prisma.fmeaProject.updateMany({
          where: { parentFmeaId: 'pfm26-m001' },
          data: { parentFmeaId: null },
        });
      }

      // m001 자기 자신의 parentFmeaId도 정리
      if (m001.parentFmeaId === 'pfm26-m001') {
        await prisma.fmeaProject.update({
          where: { id: m001.id },
          data: { parentFmeaId: null },
        });
      }

      // m001 프로젝트 삭제
      await prisma.fmeaProject.delete({ where: { id: m001.id } });
      console.log('  ✅ pfm26-m001 삭제 완료');
    }

    // 4. m002 → m001로 변경
    console.log('\n🔧 pfm26-m002 → pfm26-m001 변경...');
    await prisma.fmeaProject.update({
      where: { id: m002.id },
      data: { fmeaId: 'pfm26-m001' },
    });

    // 자기 참조 parentFmeaId 업데이트
    if (m002.parentFmeaId === 'pfm26-m002') {
      await prisma.fmeaProject.update({
        where: { id: m002.id },
        data: { parentFmeaId: 'pfm26-m001' },
      });
    }

    // 다른 프로젝트의 parentFmeaId 업데이트
    await prisma.fmeaProject.updateMany({
      where: { parentFmeaId: 'pfm26-m002' },
      data: { parentFmeaId: 'pfm26-m001' },
    });

    // sourceFmeaId 업데이트
    await prisma.pfmeaMasterFlatItem.updateMany({
      where: { sourceFmeaId: 'pfm26-m002' },
      data: { sourceFmeaId: 'pfm26-m001' },
    });

    console.log('  ✅ pfm26-m001로 변경 완료');

    // 5. 결과 확인
    const result = await prisma.fmeaProject.findMany({
      select: { fmeaId: true, fmeaType: true, parentFmeaId: true },
      orderBy: { fmeaId: 'asc' },
    });
    console.log('\n=== 최종 결과 ===');
    result.forEach(p => console.log(`  ${p.fmeaId} | type=${p.fmeaType} | parent=${p.parentFmeaId || '-'}`));

  } catch (e) {
    console.error('❌ 오류:', e.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}
main();
