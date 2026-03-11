/**
 * CP DB 데이터 확인 스크립트
 * 
 * 사용법: npx tsx scripts/check-cp-db-data.ts
 */

import { getPrisma } from '../src/lib/prisma';

async function main() {
  const prisma = getPrisma();
  if (!prisma) {
    console.error('❌ DB 연결 실패');
    process.exit(1);
  }

  const cpNo = 'cp26-m001';

  console.log('🔍 CP DB 데이터 확인 시작...\n');

  try {
    // 1. CP 등록정보 확인
    console.log('1️⃣ CP 등록정보 확인:');
    const allRegistrations = await prisma.cpRegistration.findMany({
      take: 10,
      select: { cpNo: true, subject: true },
    });
    
    console.log('   등록된 CP 목록:', allRegistrations.map(r => r.cpNo));
    
    const registration = await prisma.cpRegistration.findUnique({
      where: { cpNo },
    });
    
    if (!registration) {
      // 대소문자 변형 시도
      const upper = await prisma.cpRegistration.findFirst({
        where: { cpNo: cpNo.toUpperCase() },
      });
      const lower = await prisma.cpRegistration.findFirst({
        where: { cpNo: cpNo.toLowerCase() },
      });
      
      if (upper) {
        console.log('   ✅ 대문자로 찾음:', upper.cpNo);
      } else if (lower) {
        console.log('   ✅ 소문자로 찾음:', lower.cpNo);
      } else {
        console.log('   ❌ CP 등록정보 없음:', cpNo);
        process.exit(1);
      }
    } else {
      console.log('   ✅ CP 등록정보 존재:', registration.cpNo);
    }

    // 2. 워크시트 테이블 확인
    console.log('\n2️⃣ 워크시트 테이블 확인:');
    
    // 모든 cpNo 변형으로 확인
    const cpNoVariants = [cpNo, cpNo.toUpperCase(), cpNo.toLowerCase()];
    
    for (const variant of cpNoVariants) {
      console.log(`\n   📋 cpNo: ${variant}`);
      
      const processes = await prisma.cpProcess.findMany({
        where: { cpNo: variant },
      });
      console.log(`   CP 공정현황: ${processes.length}건`);
      if (processes.length > 0) {
        console.log('   샘플:', processes.slice(0, 3).map(p => ({
          processNo: p.processNo,
          processName: p.processName,
        })));
      }

      const detectors = await prisma.cpDetector.findMany({
        where: { cpNo: variant },
      });
      console.log(`   CP 검출장치: ${detectors.length}건`);

      const controlItems = await prisma.cpControlItem.findMany({
        where: { cpNo: variant },
      });
      console.log(`   CP 관리항목: ${controlItems.length}건`);

      const controlMethods = await prisma.cpControlMethod.findMany({
        where: { cpNo: variant },
      });
      console.log(`   CP 관리방법: ${controlMethods.length}건`);

      const reactionPlans = await prisma.cpReactionPlan.findMany({
        where: { cpNo: variant },
      });
      console.log(`   CP 대응계획: ${reactionPlans.length}건`);
    }

    // 3. 마스터 데이터 확인
    console.log('\n3️⃣ 마스터 데이터 확인:');
    const masterDataset = await prisma.cpMasterDataset.findFirst({
      where: { isActive: true },
      include: {
        flatItems: {
          take: 20,
        },
      },
    });
    
    if (masterDataset) {
      console.log('   활성 데이터셋:', masterDataset.name);
      console.log('   Flat Items:', masterDataset.flatItems.length, '건');
      console.log('   샘플:', masterDataset.flatItems.slice(0, 5).map(item => ({
        processNo: item.processNo,
        category: item.category,
        itemCode: item.itemCode,
        value: item.value?.substring(0, 30),
      })));
      
      // processInfo 카테고리 확인
      const processInfoItems = masterDataset.flatItems.filter(i => i.category === 'processInfo');
      console.log('   processInfo 데이터:', processInfoItems.length, '건');
      console.log('   A1 (공정번호):', processInfoItems.filter(i => i.itemCode === 'A1').length, '건');
      console.log('   A2 (공정명):', processInfoItems.filter(i => i.itemCode === 'A2').length, '건');
    } else {
      console.log('   ❌ 활성 마스터 데이터셋 없음');
    }

    console.log('\n✅ 확인 완료');
  } catch (error: any) {
    console.error('❌ 확인 실패:', error);
    process.exit(1);
  }
}

main().catch(console.error);




