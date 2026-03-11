/**
 * CP 저장 테스트 스크립트
 * 실제로 데이터가 저장되는지 확인
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testCPSave() {
  try {
    // 1. CP 등록정보 확인
    const registrations = await prisma.cpRegistration.findMany({
      take: 5,
    });
    console.log('📋 CP 등록정보:', registrations.map(r => ({ cpNo: r.cpNo, subject: r.subject })));

    // 2. cp_processes 테이블 확인
    const processes = await prisma.cpProcess.findMany({
      take: 10,
    });
    console.log('📊 cp_processes 데이터:', processes.length, '개');
    if (processes.length > 0) {
      console.log('샘플:', processes[0]);
    }

    // 3. cp_detectors 테이블 확인
    const detectors = await prisma.cpDetector.findMany({
      take: 10,
    });
    console.log('📊 cp_detectors 데이터:', detectors.length, '개');

    // 4. cp_control_items 테이블 확인
    const controlItems = await prisma.cpControlItem.findMany({
      take: 10,
    });
    console.log('📊 cp_control_items 데이터:', controlItems.length, '개');

    // 5. cp_control_methods 테이블 확인
    const controlMethods = await prisma.cpControlMethod.findMany({
      take: 10,
    });
    console.log('📊 cp_control_methods 데이터:', controlMethods.length, '개');

    // 6. cp_reaction_plans 테이블 확인
    const reactionPlans = await prisma.cpReactionPlan.findMany({
      take: 10,
    });
    console.log('📊 cp_reaction_plans 데이터:', reactionPlans.length, '개');

  } catch (error) {
    console.error('❌ 테스트 실패:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCPSave();




