/**
 * CP Import 데이터 디버깅 스크립트
 * 
 * 사용법: npx tsx scripts/debug-cp-import-data.ts
 */

import { getPrisma } from '../src/lib/prisma';

async function main() {
  const prisma = getPrisma();
  if (!prisma) {
    console.error('❌ DB 연결 실패');
    process.exit(1);
  }

  const cpNo = 'cp26-m001';

  console.log('🔍 CP Import 데이터 디버깅 시작...\n');

  // 1. CP 등록정보 확인
  console.log('1️⃣ CP 등록정보 확인:');
  const registration = await prisma.cpRegistration.findUnique({
    where: { cpNo },
  });
  console.log('   등록정보:', registration ? '✅ 존재' : '❌ 없음');
  if (registration) {
    console.log('   cpNo:', registration.cpNo);
    console.log('   subject:', registration.subject);
  }

  // 2. 마스터 데이터셋 확인
  console.log('\n2️⃣ 마스터 데이터셋 확인:');
  const masterDataset = await prisma.cpMasterDataset.findFirst({
    where: { isActive: true },
    include: {
      flatItems: {
        take: 10,
      },
    },
  });
  console.log('   활성 데이터셋:', masterDataset ? '✅ 존재' : '❌ 없음');
  if (masterDataset) {
    console.log('   데이터셋 ID:', masterDataset.id);
    console.log('   이름:', masterDataset.name);
    console.log('   Flat Items:', masterDataset.flatItems.length, '건');
    console.log('   샘플 데이터:', masterDataset.flatItems.slice(0, 3).map(item => ({
      processNo: item.processNo,
      category: item.category,
      itemCode: item.itemCode,
      value: item.value?.substring(0, 30),
    })));
  }

  // 3. 워크시트 테이블 확인
  console.log('\n3️⃣ 워크시트 테이블 확인:');
  
  const processes = await prisma.cpProcess.findMany({
    where: { cpNo },
    take: 5,
  });
  console.log('   CP 공정현황:', processes.length, '건');
  if (processes.length > 0) {
    console.log('   샘플:', processes.map(p => ({
      processNo: p.processNo,
      processName: p.processName,
    })));
  }

  const detectors = await prisma.cpDetector.findMany({
    where: { cpNo },
    take: 5,
  });
  console.log('   CP 검출장치:', detectors.length, '건');

  const controlItems = await prisma.cpControlItem.findMany({
    where: { cpNo },
    take: 5,
  });
  console.log('   CP 관리항목:', controlItems.length, '건');

  const controlMethods = await prisma.cpControlMethod.findMany({
    where: { cpNo },
    take: 5,
  });
  console.log('   CP 관리방법:', controlMethods.length, '건');

  const reactionPlans = await prisma.cpReactionPlan.findMany({
    where: { cpNo },
    take: 5,
  });
  console.log('   CP 대응계획:', reactionPlans.length, '건');

  // 4. 데이터 분석
  console.log('\n4️⃣ 데이터 분석:');
  if (masterDataset) {
    const categoryCounts = masterDataset.flatItems.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log('   카테고리별 개수:', categoryCounts);

    const itemCodeCounts = masterDataset.flatItems.reduce((acc, item) => {
      acc[item.itemCode] = (acc[item.itemCode] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log('   itemCode별 개수 (A1, A2):', {
      A1: itemCodeCounts['A1'] || 0,
      A2: itemCodeCounts['A2'] || 0,
    });

    const processNos = [...new Set(masterDataset.flatItems.map(item => item.processNo))];
    console.log('   고유 processNo 개수:', processNos.length);
    console.log('   processNo 목록:', processNos.slice(0, 10));
  }

  console.log('\n✅ 디버깅 완료');
}

main().catch(console.error);




