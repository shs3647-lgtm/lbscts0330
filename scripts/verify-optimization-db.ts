/**
 * 최적화 데이터 DB 완전성 검증 스크립트
 * - riskData의 opt-* 키가 제대로 저장/로드되는지 확인
 * - 최적화 단계의 모든 필드가 DB에 저장되는지 확인
 */
import { getPrisma } from '../src/lib/prisma';

async function verifyOptimizationDB() {
  const prisma = getPrisma();
  if (!prisma) {
    console.error('❌ DB 연결 실패');
    return;
  }

  console.log('=== 최적화 데이터 DB 완전성 검증 ===\n');

  try {
    // 1. FmeaLegacyData에서 riskData 확인
    const legacyData = await prisma.fmeaLegacyData.findMany({
      where: { fmeaId: { startsWith: 'PFM26' } },
      select: { fmeaId: true, data: true },
      take: 5,
    });

    console.log(`📋 검증 대상 FMEA: ${legacyData.length}개\n`);

    for (const item of legacyData) {
      const data = item.data as any;
      const riskData = data?.riskData || {};

      // opt-* 키 추출
      const optKeys = Object.keys(riskData).filter(k => k.startsWith('opt-'));
      const optSODKeys = optKeys.filter(k => k.match(/opt-.*-[SOD]$/));
      const optTextKeys = optKeys.filter(k => 
        k.includes('person-opt-') || 
        k.includes('targetDate-opt-') || 
        k.includes('status-opt-') || 
        k.includes('result-opt-') || 
        k.includes('completeDate-opt-') || 
        k.includes('specialChar-opt-') || 
        k.includes('note-opt-')
      );

      console.log(`✅ ${item.fmeaId}:`);
      console.log(`   - opt-* 키: ${optKeys.length}개`);
      console.log(`   - SOD 키: ${optSODKeys.length}개`);
      console.log(`   - 텍스트/날짜 키: ${optTextKeys.length}개`);

      if (optKeys.length > 0) {
        console.log(`   - 예시 키: ${optKeys.slice(0, 3).join(', ')}`);
      }
      console.log('');
    }

    // 2. Optimization 테이블 확인
    const optimizations = await prisma.optimization.findMany({
      where: { fmeaId: { startsWith: 'PFM26' } },
      select: { id: true, fmeaId: true, newSeverity: true, newOccurrence: true, newDetection: true, newAP: true },
      take: 10,
    });

    console.log(`📊 Optimization 테이블: ${optimizations.length}개 레코드\n`);

    if (optimizations.length > 0) {
      optimizations.forEach((opt, idx) => {
        console.log(`   ${idx + 1}. ${opt.fmeaId}: S=${opt.newSeverity || '-'}, O=${opt.newOccurrence || '-'}, D=${opt.newDetection || '-'}, AP=${opt.newAP || '-'}`);
      });
    }

    console.log('\n✅ 최적화 데이터 DB 검증 완료');
  } catch (error: any) {
    console.error('❌ 검증 오류:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyOptimizationDB();








