import { getPrisma, getPrismaForSchema } from '../src/lib/prisma';

async function main() {
  const prisma = getPrisma();
  
  if (!prisma) {
    console.log('❌ DATABASE_URL이 설정되지 않았습니다.');
    return;
  }
  
  const fmeaId = 'pfm26-m001';
  
  console.log('=== DB 데이터 검증 ===\n');
  console.log('FMEA ID:', fmeaId, '\n');
  
  // 1. FailureLink 테이블 조회 (원자성 DB)
  console.log('--- 1. FailureLink 테이블 (원자성 DB) ---');
  const links = await prisma.failureLink.findMany({
    where: { fmeaId },
    take: 5,
  });
  console.log('FailureLink 개수:', links.length, '건');
  if (links.length > 0) {
    console.log('샘플:', links[0]);
  }
  
  // 2. FmeaLegacyData 조회 (레거시 데이터 - 진짜 소스!)
  console.log('\n--- 2. FmeaLegacyData 테이블 (레거시 DB - Single Source of Truth) ---');
  try {
    // 프로젝트 스키마에서 조회
    const schemaPrisma = getPrismaForSchema(fmeaId);
    if (schemaPrisma) {
      const legacyData = await schemaPrisma.fmeaLegacyData.findUnique({
        where: { fmeaId }
      });
      
      if (legacyData) {
        const data = legacyData.data as any;
        console.log('✅ 레거시 데이터 존재');
        console.log('  l1.name:', data?.l1?.name);
        console.log('  l2 개수:', data?.l2?.length || 0);
        console.log('  failureLinks 개수:', data?.failureLinks?.length || 0);
        
        if (data?.failureLinks?.length > 0) {
          console.log('  failureLinks 샘플:', JSON.stringify(data.failureLinks[0], null, 2));
        } else {
          console.log('  ❌ failureLinks가 비어있음!');
        }
        
        // 확정 상태 확인
        console.log('\n  확정 상태:');
        console.log('    failureLinkConfirmed:', data?.failureLinkConfirmed);
      } else {
        console.log('❌ 레거시 데이터 없음');
      }
    }
  } catch (e: any) {
    console.log('레거시 데이터 조회 실패:', e.message);
  }
  
  // 3. public 스키마의 FmeaLegacyData도 확인
  console.log('\n--- 3. public 스키마 FmeaLegacyData ---');
  try {
    const publicLegacy = await prisma.fmeaLegacyData.findUnique({
      where: { fmeaId }
    });
    
    if (publicLegacy) {
      const data = publicLegacy.data as any;
      console.log('✅ public 레거시 데이터 존재');
      console.log('  failureLinks 개수:', data?.failureLinks?.length || 0);
    } else {
      console.log('❌ public 레거시 데이터 없음');
    }
  } catch (e: any) {
    console.log('public 레거시 조회 실패:', e.message);
  }
  
  // 4. localStorage 확인 안내
  console.log('\n--- 4. localStorage 확인 방법 ---');
  console.log('브라우저 콘솔에서 다음 명령 실행:');
  console.log(`  JSON.parse(localStorage.getItem('pfmea_worksheet_${fmeaId}'))?.failureLinks?.length`);
  
  await prisma.$disconnect();
}

main().catch(console.error);
