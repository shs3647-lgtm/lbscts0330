/**
 * cp26-m001 데이터 확인 스크립트
 */
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env 파일 로드
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  const cpNo = 'cp26-m001';
  
  console.log(`🔍 ${cpNo} 데이터 확인 시작...\n`);

  // CP 등록정보 확인
  const registration = await prisma.cpRegistration.findUnique({
    where: { cpNo },
  });
  
  console.log('📋 CP 등록정보:', registration ? '✅ 존재' : '❌ 없음');
  if (registration) {
    console.log('   ', JSON.stringify(registration, null, 2));
  }

  // CP 공정현황 확인
  const processes = await prisma.cpProcess.findMany({
    where: { cpNo },
    take: 5,
  });
  
  console.log(`\n📋 CP 공정현황: ${processes.length}개 (최대 5개 표시)`);
  if (processes.length > 0) {
    processes.forEach((p, idx) => {
      console.log(`   ${idx + 1}.`, {
        id: p.id,
        cpNo: p.cpNo,
        processNo: p.processNo,
        processName: p.processName,
      });
    });
  } else {
    // 대소문자 구분 없이 확인
    const allProcesses = await prisma.cpProcess.findMany({
      take: 10,
    });
    console.log('   ⚠️ cp26-m001 데이터 없음. 전체 데이터 샘플:');
    allProcesses.forEach((p, idx) => {
      console.log(`   ${idx + 1}.`, {
        cpNo: p.cpNo,
        processNo: p.processNo,
        processName: p.processName,
      });
    });
  }

  // CP 검출장치 확인
  const detectors = await prisma.cpDetector.findMany({
    where: { cpNo },
  });
  console.log(`\n📋 CP 검출장치: ${detectors.length}개`);

  // CP 관리항목 확인
  const controlItems = await prisma.cpControlItem.findMany({
    where: { cpNo },
  });
  console.log(`\n📋 CP 관리항목: ${controlItems.length}개`);

  // CP 관리방법 확인
  const controlMethods = await prisma.cpControlMethod.findMany({
    where: { cpNo },
  });
  console.log(`\n📋 CP 관리방법: ${controlMethods.length}개`);

  // CP 대응계획 확인
  const reactionPlans = await prisma.cpReactionPlan.findMany({
    where: { cpNo },
  });
  console.log(`\n📋 CP 대응계획: ${reactionPlans.length}개`);

  // 전체 요약
  console.log(`\n📊 ${cpNo} 데이터 요약:`);
  console.log(`   등록정보: ${registration ? '✅' : '❌'}`);
  console.log(`   공정현황: ${processes.length}개`);
  console.log(`   검출장치: ${detectors.length}개`);
  console.log(`   관리항목: ${controlItems.length}개`);
  console.log(`   관리방법: ${controlMethods.length}개`);
  console.log(`   대응계획: ${reactionPlans.length}개`);

  // 다른 cpNo 확인
  const allCpNos = await prisma.cpProcess.groupBy({
    by: ['cpNo'],
    _count: true,
  });
  
  console.log(`\n📋 전체 CP 프로젝트 목록:`);
  allCpNos.forEach((item) => {
    console.log(`   ${item.cpNo}: ${item._count}개 공정`);
  });
}

main()
  .catch((e) => {
    console.error('❌ 에러:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

