/**
 * 회사명 통일 스크립트: AMPSYSTEM/에이엠피시스템/에이엠피/amp → AMP
 * 대소문자 무관하게 모든 변형을 AMP로 통일
 */
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  // 현재 상태 확인
  const before = await prisma.fmeaRegistration.findMany({
    select: { fmeaId: true, companyName: true, subject: true },
    orderBy: { fmeaId: 'asc' }
  });
  console.log('=== 변경 전 ===');
  before.forEach(r => console.log(`  ${r.fmeaId} | ${r.companyName} | ${r.subject}`));

  // 통일 대상 목록 (대소문자 모두)
  const targets = [
    'AMPSYSTEM', 'ampsystem', 'Ampsystem', 'AmpSystem', 'Amp System',
    'AMPSYSTE', // 잘린 값도 처리
    '에이엠피시스템', '에이엠피',
    'amp', 'Amp', 'AMP(샘플)', 'AMP(sample)',
  ];

  const result = await prisma.fmeaRegistration.updateMany({
    where: { companyName: { in: targets } },
    data: { companyName: 'AMP' }
  });
  console.log('\n통일 업데이트:', result.count, '건');

  // contains로 ampsystem 변형 추가 캐치 (raw query)
  const rawResult = await prisma.$executeRaw`
    UPDATE "fmea_registrations"
    SET "companyName" = 'AMP'
    WHERE LOWER("companyName") LIKE '%ampsystem%'
       OR LOWER("companyName") LIKE '%amp%system%'
       OR LOWER("companyName") = 'amp'
       OR "companyName" IS NULL
       OR TRIM("companyName") = ''
  `;
  console.log('Raw 추가 업데이트:', rawResult, '건');

  // T&F 매핑 (티앤에프/t&f 계열)
  const tfResult = await prisma.$executeRaw`
    UPDATE "fmea_registrations"
    SET "companyName" = 'T&F'
    WHERE LOWER("subject") LIKE '%티앤에프%'
       OR LOWER("subject") LIKE '%hud%'
  `;
  console.log('T&F 매핑:', tfResult, '건');

  // 최종 확인
  const after = await prisma.fmeaRegistration.findMany({
    select: { fmeaId: true, companyName: true, subject: true },
    orderBy: { fmeaId: 'asc' }
  });
  console.log('\n=== 최종 결과 ===');
  after.forEach(r => console.log(`  ${r.fmeaId} | ${r.companyName} | ${r.subject}`));
}

main()
  .catch(e => { console.error(e.message); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
