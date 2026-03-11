/**
 * 자전거 프레임 데이터 매핑 수정
 * - 삼천리자전거 고객사로 새 PFMEA 생성
 * - L1/L2/L3 구조를 새 PFMEA에 연결
 * 
 * 실행: npx tsx scripts/fix-bicycle-mapping.js
 */

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  
  try {
    console.log('🔧 자전거 프레임 데이터 매핑 수정 시작\n');
    
    const NEW_PFMEA_ID = 'pfm26-p001-l01';
    const OLD_PFMEA_ID = 'pfm26-p006-l06'; // 도어패널 (이건 그대로 둠)
    
    // 1. 새 PFMEA 프로젝트 생성 (삼천리자전거)
    console.log('=== 1. 삼천리자전거용 PFMEA 프로젝트 생성 ===');
    
    const existingProject = await prisma.fmeaProject.findUnique({
      where: { fmeaId: NEW_PFMEA_ID }
    });
    
    if (existingProject) {
      console.log('   이미 존재함, 등록정보만 업데이트');
      await prisma.fmeaRegistration.upsert({
        where: { fmeaId: NEW_PFMEA_ID },
        update: {
          partName: '자전거 프레임',
          customerName: '삼천리자전거',
          fmeaProjectName: '자전거 프레임 PFMEA',
          subject: '자전거 (고객사 품명)'
        },
        create: {
          fmeaId: NEW_PFMEA_ID,
          partName: '자전거 프레임',
          customerName: '삼천리자전거',
          fmeaProjectName: '자전거 프레임 PFMEA',
          subject: '자전거 (고객사 품명)'
        }
      });
    } else {
      console.log('   새 PFMEA 프로젝트 생성:', NEW_PFMEA_ID);
      await prisma.fmeaProject.create({
        data: {
          fmeaId: NEW_PFMEA_ID,
          fmeaType: 'P',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      await prisma.fmeaRegistration.create({
        data: {
          fmeaId: NEW_PFMEA_ID,
          partName: '자전거 프레임',
          customerName: '삼천리자전거',
          fmeaProjectName: '자전거 프레임 PFMEA',
          subject: '자전거 (고객사 품명)'
        }
      });
    }
    console.log('   ✅ 완료');
    
    // 2. L1 구조 수정 (자전거 관련만)
    console.log('\n=== 2. L1 구조 fmeaId 수정 ===');
    
    const l1Structs = await prisma.l1Structure.findMany({
      where: {
        OR: [
          { name: { contains: '자전거' } },
          { name: { contains: '자건거' } },
          { fmeaId: OLD_PFMEA_ID }
        ]
      }
    });
    
    for (const l1 of l1Structs) {
      // 오타 수정: 자건거 → 자전거
      const newName = l1.name === '자건거' ? '자전거' : l1.name;
      
      console.log('   L1:', l1.name, '→', newName, '| fmeaId:', l1.fmeaId, '→', NEW_PFMEA_ID);
      
      await prisma.l1Structure.update({
        where: { id: l1.id },
        data: { 
          name: newName,
          fmeaId: NEW_PFMEA_ID 
        }
      });
    }
    console.log('   ✅ L1 구조', l1Structs.length, '개 수정 완료');
    
    // 3. L2 구조 수정
    console.log('\n=== 3. L2 구조 fmeaId 수정 ===');
    
    const l2Structs = await prisma.l2Structure.findMany({
      where: { fmeaId: OLD_PFMEA_ID }
    });
    
    for (const l2 of l2Structs) {
      await prisma.l2Structure.update({
        where: { id: l2.id },
        data: { fmeaId: NEW_PFMEA_ID }
      });
    }
    console.log('   ✅ L2 구조', l2Structs.length, '개 수정 완료');
    
    // 4. L3 구조 수정
    console.log('\n=== 4. L3 구조 fmeaId 수정 ===');
    
    const l3Structs = await prisma.l3Structure.findMany({
      where: { fmeaId: OLD_PFMEA_ID }
    });
    
    for (const l3 of l3Structs) {
      await prisma.l3Structure.update({
        where: { id: l3.id },
        data: { fmeaId: NEW_PFMEA_ID }
      });
    }
    console.log('   ✅ L3 구조', l3Structs.length, '개 수정 완료');
    
    // 5. L1 기능 수정
    console.log('\n=== 5. L1 기능 fmeaId 수정 ===');
    
    const l1Funcs = await prisma.l1Function.findMany({
      where: { fmeaId: OLD_PFMEA_ID }
    });
    
    for (const func of l1Funcs) {
      await prisma.l1Function.update({
        where: { id: func.id },
        data: { fmeaId: NEW_PFMEA_ID }
      });
    }
    console.log('   ✅ L1 기능', l1Funcs.length, '개 수정 완료');
    
    // 6. L2 기능 수정
    console.log('\n=== 6. L2 기능 fmeaId 수정 ===');
    
    const l2Funcs = await prisma.l2Function.findMany({
      where: { fmeaId: OLD_PFMEA_ID }
    });
    
    for (const func of l2Funcs) {
      await prisma.l2Function.update({
        where: { id: func.id },
        data: { fmeaId: NEW_PFMEA_ID }
      });
    }
    console.log('   ✅ L2 기능', l2Funcs.length, '개 수정 완료');
    
    // 7. L3 기능 수정
    console.log('\n=== 7. L3 기능 fmeaId 수정 ===');
    
    const l3Funcs = await prisma.l3Function.findMany({
      where: { fmeaId: OLD_PFMEA_ID }
    });
    
    for (const func of l3Funcs) {
      await prisma.l3Function.update({
        where: { id: func.id },
        data: { fmeaId: NEW_PFMEA_ID }
      });
    }
    console.log('   ✅ L3 기능', l3Funcs.length, '개 수정 완료');
    
    // 8. 고장형태 수정
    console.log('\n=== 8. 고장형태 fmeaId 수정 ===');
    
    const fms = await prisma.failureMode.findMany({
      where: { fmeaId: OLD_PFMEA_ID }
    });
    
    for (const fm of fms) {
      await prisma.failureMode.update({
        where: { id: fm.id },
        data: { fmeaId: NEW_PFMEA_ID }
      });
    }
    console.log('   ✅ 고장형태', fms.length, '개 수정 완료');
    
    // 9. 고장원인 수정
    console.log('\n=== 9. 고장원인 fmeaId 수정 ===');
    
    const fcs = await prisma.failureCause.findMany({
      where: { fmeaId: OLD_PFMEA_ID }
    });
    
    for (const fc of fcs) {
      await prisma.failureCause.update({
        where: { id: fc.id },
        data: { fmeaId: NEW_PFMEA_ID }
      });
    }
    console.log('   ✅ 고장원인', fcs.length, '개 수정 완료');
    
    // 10. 도어패널 PFMEA 정리
    console.log('\n=== 10. 도어패널 PFMEA 정리 ===');
    
    await prisma.fmeaRegistration.update({
      where: { fmeaId: OLD_PFMEA_ID },
      data: {
        fmeaProjectName: '도어패널 PFMEA',
        subject: '도어패널 PFMEA'
      }
    });
    console.log('   ✅ 도어패널 fmeaProjectName 수정 완료');
    
    // 11. 결과 확인
    console.log('\n=== 📋 수정 결과 확인 ===');
    
    const newReg = await prisma.fmeaRegistration.findUnique({
      where: { fmeaId: NEW_PFMEA_ID }
    });
    
    console.log('\n[삼천리자전거 PFMEA]');
    console.log('  fmeaId:', NEW_PFMEA_ID);
    console.log('  partName(완제품명):', newReg?.partName);
    console.log('  customerName(고객사):', newReg?.customerName);
    console.log('  subject(고객사품명):', newReg?.subject);
    
    const newL1 = await prisma.l1Structure.findMany({
      where: { fmeaId: NEW_PFMEA_ID }
    });
    const newL2 = await prisma.l2Structure.findMany({
      where: { fmeaId: NEW_PFMEA_ID }
    });
    const newL3 = await prisma.l3Structure.findMany({
      where: { fmeaId: NEW_PFMEA_ID }
    });
    
    console.log('\n  연결된 구조:');
    console.log('    L1 구조:', newL1.length, '개');
    console.log('    L2 구조:', newL2.length, '개');
    console.log('    L3 구조:', newL3.length, '개');
    
    const oldReg = await prisma.fmeaRegistration.findUnique({
      where: { fmeaId: OLD_PFMEA_ID }
    });
    
    console.log('\n[도어패널 PFMEA - 정리됨]');
    console.log('  fmeaId:', OLD_PFMEA_ID);
    console.log('  partName:', oldReg?.partName);
    console.log('  customerName:', oldReg?.customerName);
    console.log('  fmeaProjectName:', oldReg?.fmeaProjectName);
    
    const oldL1 = await prisma.l1Structure.findMany({
      where: { fmeaId: OLD_PFMEA_ID }
    });
    console.log('  연결된 L1 구조:', oldL1.length, '개 (자전거 데이터 분리됨)');
    
    console.log('\n✅ 자전거 프레임 데이터 매핑 수정 완료!');
    
  } catch (error) {
    console.error('❌ 수정 실패:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
