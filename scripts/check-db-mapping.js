/**
 * DB 매핑 상태 점검 스크립트
 * 실행: npx tsx scripts/check-db-mapping.js
 */

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL 환경 변수가 설정되지 않음');
    return;
  }

  const pool = new Pool({ connectionString: dbUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  
  try {
    console.log('📊 DB 매핑 상태 점검\n');
    
    // 1. FMEA 프로젝트 + 등록정보
    console.log('=== 1. FMEA 프로젝트 ===');
    const fmeas = await prisma.fmeaProject.findMany({
      include: { registration: true }
    });
    fmeas.forEach(f => {
      const reg = f.registration;
      console.log(`   - ${f.fmeaId}: ${reg?.partName || '(미등록)'} (${f.fmeaType})`);
    });
    
    // 2. 워크시트 데이터
    console.log('\n=== 2. 워크시트 데이터 ===');
    const worksheets = await prisma.fmeaWorksheetData.findMany({
      select: { id: true, fmeaId: true, version: true, updatedAt: true }
    });
    worksheets.forEach(w => {
      console.log(`   - FMEA: ${w.fmeaId?.substring(0, 8)}... v${w.version}`);
    });
    
    // 3. L1 구조 (완제품공정)
    console.log('\n=== 3. L1 구조 (완제품공정) ===');
    const l1Structs = await prisma.l1Structure.findMany({
      select: { id: true, name: true, fmeaId: true }
    });
    l1Structs.forEach(s => {
      console.log(`   - ${s.name} | fmeaId: ${s.fmeaId} (${s.id.substring(0, 8)}...)`);
    });
    
    // 4. L1 기능 (완제품기능)
    console.log('\n=== 4. L1 기능 (완제품기능) ===');
    const l1Funcs = await prisma.l1Function.findMany({
      select: { id: true, category: true, functionName: true, requirement: true, l1StructId: true }
    });
    console.log(`   총 ${l1Funcs.length}개`);
    l1Funcs.slice(0, 10).forEach(f => {
      console.log(`   - [${f.category}] 기능: ${(f.functionName || '').substring(0, 20)} | 요구: ${(f.requirement || '').substring(0, 20)}`);
    });
    if (l1Funcs.length > 10) console.log(`   ... 외 ${l1Funcs.length - 10}개`);
    
    // 5. L2 구조 (메인공정)
    console.log('\n=== 5. L2 구조 (메인공정) ===');
    const l2Structs = await prisma.l2Structure.findMany({
      select: { id: true, no: true, name: true, fmeaId: true, l1Id: true }
    });
    l2Structs.forEach(s => {
      console.log(`   - [${s.no}] ${s.name} | fmeaId: ${s.fmeaId} | l1Id: ${s.l1Id?.substring(0, 8)}...`);
    });
    
    // 6. L3 구조 (작업요소)
    console.log('\n=== 6. L3 구조 (작업요소) ===');
    const l3Structs = await prisma.l3Structure.findMany({
      select: { id: true, name: true, m4: true, l2Id: true, fmeaId: true }
    });
    console.log(`   총 ${l3Structs.length}개`);
    l3Structs.slice(0, 10).forEach(s => {
      console.log(`   - [${s.m4 || '-'}] ${(s.name || '').substring(0, 30)} | fmeaId: ${s.fmeaId}`);
    });
    if (l3Structs.length > 10) console.log(`   ... 외 ${l3Structs.length - 10}개`);
    
    // 7. L2 기능 (공정기능)
    console.log('\n=== 7. L2 기능 (공정기능) ===');
    const l2Funcs = await prisma.l2Function.findMany({
      select: { id: true, functionName: true, productChar: true }
    });
    console.log(`   총 ${l2Funcs.length}개`);
    l2Funcs.slice(0, 5).forEach(f => {
      console.log(`   - ${(f.functionName || '').substring(0, 30)} | 제품특성: ${(f.productChar || '').substring(0, 20)}`);
    });
    
    // 8. L3 기능 (작업요소기능)
    console.log('\n=== 8. L3 기능 (작업요소기능) ===');
    const l3Funcs = await prisma.l3Function.findMany({
      select: { id: true, functionName: true, processChar: true }
    });
    console.log(`   총 ${l3Funcs.length}개`);
    l3Funcs.slice(0, 5).forEach(f => {
      console.log(`   - ${(f.functionName || '').substring(0, 30)} | 공정특성: ${(f.processChar || '').substring(0, 20)}`);
    });
    
    // 9. 고장형태 (FM)
    console.log('\n=== 9. 고장형태 (FM) ===');
    const fms = await prisma.failureMode.findMany({
      select: { id: true, mode: true }
    });
    console.log(`   총 ${fms.length}개`);
    fms.slice(0, 5).forEach(f => {
      console.log(`   - ${(f.mode || '').substring(0, 40)}`);
    });
    
    // 10. 고장원인 (FC)
    console.log('\n=== 10. 고장원인 (FC) ===');
    const fcs = await prisma.failureCause.findMany({
      select: { id: true, cause: true }
    });
    console.log(`   총 ${fcs.length}개`);
    fcs.slice(0, 5).forEach(f => {
      console.log(`   - ${(f.cause || '').substring(0, 40)}`);
    });
    
    // 11. 마스터 데이터
    console.log('\n=== 11. 마스터 FlatItem ===');
    const masterItems = await prisma.pfmeaMasterFlatItem.groupBy({
      by: ['itemCode'],
      _count: { id: true }
    });
    if (masterItems.length === 0) {
      console.log('   (없음 - 레거시 삭제됨)');
    } else {
      masterItems.forEach(item => {
        console.log(`   - ${item.itemCode}: ${item._count.id}건`);
      });
    }
    
    // 12. 요약
    console.log('\n=== 📋 요약 ===');
    console.log(`   FMEA 프로젝트: ${fmeas.length}개`);
    console.log(`   워크시트: ${worksheets.length}개`);
    console.log(`   L1 구조: ${l1Structs.length}개`);
    console.log(`   L1 기능: ${l1Funcs.length}개`);
    console.log(`   L2 구조: ${l2Structs.length}개`);
    console.log(`   L2 기능: ${l2Funcs.length}개`);
    console.log(`   L3 구조: ${l3Structs.length}개`);
    console.log(`   L3 기능: ${l3Funcs.length}개`);
    console.log(`   고장형태: ${fms.length}개`);
    console.log(`   고장원인: ${fcs.length}개`);
    
    // 13. 자전거 관련 FMEA 상세 점검
    console.log('\n=== 13. 자전거 FMEA 상세 점검 ===');
    const bicycleFmeas = fmeas.filter(f => {
      const name = f.registration?.partName || '';
      return name.includes('자전거') || name.includes('자건거');
    });
    
    for (const fmea of bicycleFmeas) {
      console.log(`\n   📁 ${fmea.fmeaId}: ${fmea.registration?.partName}`);
      
      // L1 구조 조회
      const fmeaL1Structs = await prisma.l1Structure.findMany({
        where: { fmeaId: fmea.fmeaId },
        include: {
          l1Functions: true,
          l2Structures: {
            include: {
              l2Functions: true,
              l3Structures: {
                include: {
                  l3Functions: true,
                  failureCauses: true
                }
              },
              failureModes: true
            }
          }
        }
      });
      
      console.log(`      L1 구조: ${fmeaL1Structs.length}개`);
      for (const l1 of fmeaL1Structs) {
        console.log(`        - "${l1.name}" (기능 ${l1.l1Functions.length}개)`);
        console.log(`          L2 구조: ${l1.l2Structures.length}개`);
        for (const l2 of l1.l2Structures) {
          const fmCount = l2.failureModes.length;
          console.log(`            - [${l2.no}] ${l2.name} (기능 ${l2.l2Functions.length}개, FM ${fmCount}개)`);
          console.log(`              L3 구조: ${l2.l3Structures.length}개`);
          for (const l3 of l2.l3Structures.slice(0, 3)) {
            const fcCount = l3.failureCauses.length;
            console.log(`                - [${l3.m4 || '-'}] ${l3.name} (기능 ${l3.l3Functions.length}개, FC ${fcCount}개)`);
          }
          if (l2.l3Structures.length > 3) {
            console.log(`                ... 외 ${l2.l3Structures.length - 3}개`);
          }
        }
      }
    }
    
    // 14. 워크시트 데이터 내용 점검
    console.log('\n=== 14. 워크시트 데이터 내용 점검 ===');
    for (const ws of worksheets) {
      const fullWs = await prisma.fmeaWorksheetData.findUnique({
        where: { id: ws.id }
      });
      if (fullWs?.data) {
        const data = typeof fullWs.data === 'string' ? JSON.parse(fullWs.data) : fullWs.data;
        console.log(`   워크시트 ${ws.fmeaId?.substring(0, 8)}...:`);
        console.log(`     - 키: ${Object.keys(data).join(', ').substring(0, 60)}...`);
        if (data.rows) {
          console.log(`     - rows 수: ${data.rows.length}개`);
        }
        if (data.l1Structures) {
          console.log(`     - l1Structures 수: ${data.l1Structures.length}개`);
        }
        if (data.l2Structures) {
          console.log(`     - l2Structures 수: ${data.l2Structures.length}개`);
        }
        if (data.l3Structures) {
          console.log(`     - l3Structures 수: ${data.l3Structures.length}개`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 점검 실패:', error.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
