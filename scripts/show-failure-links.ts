import { getPrisma, getPrismaForSchema } from '../src/lib/prisma';

async function main() {
  const prisma = getPrisma();
  
  if (!prisma) {
    console.log('❌ DATABASE_URL이 설정되지 않았습니다.');
    return;
  }
  
  const fmeaId = 'pfm26-m001';
  
  try {
    // 프로젝트 스키마에서 조회
    const schemaPrisma = getPrismaForSchema(fmeaId);
    if (schemaPrisma) {
      const legacyData = await schemaPrisma.fmeaLegacyData.findUnique({
        where: { fmeaId }
      });
      
      if (legacyData) {
        const data = legacyData.data as any;
        const links = data?.failureLinks || [];
        
        console.log('═'.repeat(120));
        console.log('                              고장연결 테이블 (' + links.length + '건)');
        console.log('═'.repeat(120));
        console.log('');
        console.log('번호 │ 공정         │ 고장형태(FM)          │ 고장영향(FE)      │ 심각도 │ 고장원인(FC)');
        console.log('─'.repeat(120));
        
        links.forEach((link: any, idx: number) => {
          const no = String(idx + 1).padStart(2);
          const proc = (link.fmProcess || '-').substring(0, 10).padEnd(10);
          const fm = (link.fmText || '-').substring(0, 18).padEnd(18);
          const fe = (link.feText || '-').substring(0, 14).padEnd(14);
          const sev = String(link.severity || 0).padStart(2);
          const fc = (link.fcText || '-').substring(0, 20);
          console.log(`${no}  │ ${proc} │ ${fm} │ ${fe} │  S=${sev}  │ ${fc}`);
        });
        
        console.log('─'.repeat(120));
        console.log('');
        console.log('📊 요약:');
        console.log('  - 총 연결 수:', links.length);
        
        // 고유 항목 수 계산
        const uniqueFM = new Set(links.map((l: any) => l.fmId)).size;
        const uniqueFE = new Set(links.map((l: any) => l.feId)).size;
        const uniqueFC = new Set(links.map((l: any) => l.fcId)).size;
        console.log('  - 고유 고장형태(FM):', uniqueFM, '개');
        console.log('  - 고유 고장영향(FE):', uniqueFE, '개');
        console.log('  - 고유 고장원인(FC):', uniqueFC, '개');
        
      } else {
        console.log('데이터 없음');
      }
    }
  } catch (e: any) {
    console.log('조회 실패:', e.message);
  }
}

main();
