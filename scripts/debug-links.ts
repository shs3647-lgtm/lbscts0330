import { getPrismaForSchema } from '../src/lib/prisma';

async function main() {
  const prisma = getPrismaForSchema('pfm26-m001');
  if (!prisma) {
    console.log('Prisma 없음');
    return;
  }
  
  const data = await prisma.fmeaLegacyData.findUnique({ where: { fmeaId: 'pfm26-m001' } });
  const links = (data?.data as any)?.failureLinks || [];
  
  console.log('총 링크 수:', links.length);
  console.log('\n=== 샘플 5개 ===');
  links.slice(0, 5).forEach((l: any, i: number) => {
    console.log(`\n[${i+1}]`, JSON.stringify(l, null, 2));
  });
  
  // 텍스트가 있는 링크 확인
  const withText = links.filter((l: any) => l.fmText || l.feText || l.fcText);
  console.log('\n텍스트가 있는 링크:', withText.length, '/', links.length);
  
  if (withText.length > 0) {
    console.log('\n텍스트 있는 샘플:');
    console.log(JSON.stringify(withText[0], null, 2));
  }
}

main();
