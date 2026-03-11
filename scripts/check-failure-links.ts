import { getPrismaForSchema } from '../src/lib/prisma';

async function checkLinks() {
  console.log('=== DB 고장연결 데이터 확인 ===\n');

  const prisma = getPrismaForSchema('pfm26-m001');

  if (!prisma) {
    console.log('❌ Prisma 클라이언트 생성 실패 (DATABASE_URL 확인)');
    return;
  }

  // FmeaLegacyData에서 failureLinks 확인
  const legacy = await prisma.fmeaLegacyData.findFirst();
  
  if (!legacy) {
    console.log('❌ DB에 FmeaLegacyData 없음');
    await prisma.$disconnect();
    return;
  }
  
  const data = legacy.data as any;
  const links = data?.failureLinks || [];
  
  console.log('총 연결 수:', links.length);
  
  if (links.length === 0) {
    console.log('\n❌ DB에 저장된 고장연결 데이터가 없습니다.');
    console.log('→ 고장연결을 다시 수행해야 합니다.');
    await prisma.$disconnect();
    return;
  }
  
  console.log('\n--- 모든 연결 목록 ---');
  links.forEach((link: any, i: number) => {
    const fmText = link.fmText || '(없음)';
    const feText = link.feText || '(없음)';
    const fcText = link.fcText || '(없음)';
    const fmProcess = link.fmProcess || '';
    console.log(`[${i+1}] 공정: ${fmProcess.padEnd(15)} | FM: ${fmText.substring(0,20).padEnd(22)} | FE: ${feText.substring(0,20).padEnd(22)} | FC: ${fcText.substring(0,20)}`);
  });
  
  // 자재입고 관련 검색
  const materialLinks = links.filter((l: any) => 
    (l.fmText || '').includes('자재') || 
    (l.fmProcess || '').includes('자재') ||
    (l.fcProcess || '').includes('자재') ||
    (l.fmText || '').includes('입고') ||
    (l.fmProcess || '').includes('입고')
  );
  
  console.log('\n--- 자재입고 관련 연결 ---');
  if (materialLinks.length > 0) {
    console.log(`✅ 자재입고 관련 연결: ${materialLinks.length}개`);
    materialLinks.forEach((link: any, i: number) => {
      console.log(`  [${i+1}] FM: ${link.fmText} | 공정: ${link.fmProcess}`);
    });
  } else {
    console.log('❌ 자재입고 관련 연결 데이터가 DB에 없습니다.');
  }
  
  // 공정별 연결 통계
  const processCounts = new Map<string, number>();
  links.forEach((link: any) => {
    const proc = link.fmProcess || '(공정없음)';
    processCounts.set(proc, (processCounts.get(proc) || 0) + 1);
  });
  
  console.log('\n--- 공정별 연결 현황 ---');
  processCounts.forEach((count, proc) => {
    console.log(`  ${proc}: ${count}개`);
  });
  
  await prisma.$disconnect();
}

checkLinks().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
