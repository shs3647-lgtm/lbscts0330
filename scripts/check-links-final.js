const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// .env 로드
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function checkSchema(fmeaId) {
  const safeId = fmeaId.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const schema = `pfmea_${safeId}`;
  const baseUrl = process.env.DATABASE_URL;
  
  if (!baseUrl) {
    console.error('❌ DATABASE_URL이 설정되지 않았습니다.');
    return;
  }

  // schema를 포함한 URL 생성
  const url = new URL(baseUrl);
  url.searchParams.set('schema', schema);
  const connectionString = url.toString();

  console.log(`\n🔍 진단 대상: FMEA ID [${fmeaId}] / SCHEMA [${schema}]`);

  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({
    adapter: new PrismaPg(pool)
  });

  try {
    // 1. 레거시 데이터 조회
    const legacy = await prisma.fmeaLegacyData.findUnique({
      where: { fmeaId }
    });

    console.log('\n--- 1. 레거시 데이터 (FmeaLegacyData) ---');
    if (!legacy) {
      console.log('❌ DB: 레코드가 없습니다.');
    } else {
      const data = legacy.data;
      const linksCount = (data.failureLinks || []).length;
      console.log('✅ DB: 레코드 발견');
      console.log(`   - failureLinks: ${linksCount} 개`);
      console.log(`   - failureLinkConfirmed: ${data.failureLinkConfirmed || false}`);
      
      if (linksCount > 0) {
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
    if (error.code === 'P2021') {
      console.log(`❌ DB: 스키마 [${schema}] 또는 테이블이 존재하지 않습니다.`);
    } else {
      console.error('\n❌ 진단 중 오류 발생:', error.message);
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

async function main() {
  const fmeaId = 'PFM26-001';
  await checkSchema(fmeaId);
  
  // public 스키마도 확인 (이전 데이터 백업 용도)
  console.log('\n--- [참고] Public 스키마 데이터 확인 ---');
  const poolPublic = new Pool({ connectionString: process.env.DATABASE_URL });
  const prismaPublic = new PrismaClient({ adapter: new PrismaPg(poolPublic) });
  try {
    const pubLegacy = await prismaPublic.fmeaLegacyData.findUnique({ where: { fmeaId } });
    console.log(`Public Legacy 존재 여부: ${!!pubLegacy}`);
    if (pubLegacy) {
        console.log(`   - failureLinks: ${(pubLegacy.data.failureLinks || []).length} 개`);
    }
  } catch (e) {} finally {
    await prismaPublic.$disconnect();
    await poolPublic.end();
  }
}

main();













