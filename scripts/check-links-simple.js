const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const fmeaId = 'PFM26-001';
  console.log(`\n🔍 FMEA ID: ${fmeaId} 저장 데이터 진단...`);

  try {
    // 1. 레거시 데이터 (Single Source of Truth) 조회
    const legacy = await prisma.fmeaLegacyData.findUnique({
      where: { fmeaId }
    });

    console.log('\n--- 1. 레거시 데이터 (FmeaLegacyData) ---');
    if (!legacy) {
      console.log('❌ DB: 레코드가 없습니다.');
    } else {
      const data = legacy.data;
      console.log('✅ DB: 레코드 발견');
      console.log(`   - failureLinks: ${data.failureLinks?.length || 0} 개`);
      console.log(`   - failureLinkConfirmed: ${data.failureLinkConfirmed || 'false'}`);
      
      if (data.failureLinks && data.failureLinks.length > 0) {
        console.log('   - 데이터 샘플 (첫 번째):', {
          fm: data.failureLinks[0].fmText,
          fe: data.failureLinks[0].feText,
          fc: data.failureLinks[0].fcText
        });
      }
    }

    // 2. 확정 상태 조회
    const confirmed = await prisma.fmeaConfirmedState.findUnique({
      where: { fmeaId }
    });
    console.log('\n--- 2. 확정 상태 (FmeaConfirmedState) ---');
    if (!confirmed) {
      console.log('❌ DB: 레코드가 없습니다.');
    } else {
      console.log('✅ DB: 레코드 발견');
      console.log('   - failureLinkConfirmed:', confirmed.failureLinkConfirmed);
    }

    // 3. 원자성 데이터 (FailureLink 테이블) 조회
    const atomicLinks = await prisma.failureLink.count({
      where: { fmeaId }
    });
    console.log('\n--- 3. 원자성 데이터 (FailureLink 테이블) ---');
    console.log(`✅ DB: 총 ${atomicLinks} 개의 고장연결 레코드가 있습니다.`);

  } catch (error) {
    console.error('\n❌ 진단 중 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();













