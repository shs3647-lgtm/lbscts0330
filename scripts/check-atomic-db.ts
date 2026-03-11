/**
 * 원자성 DB 검증 스크립트
 * CASCADE 연결 상태 확인
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// .env 로드
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function checkAtomicDB() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL이 설정되지 않았습니다.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const fmeaId = 'PFM26-M001';
  
  console.log('=== 원자성 DB 검증 ===');
  console.log('FMEA ID:', fmeaId);
  console.log('DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 50) + '...');
  
  try {
    // 1. 고장분석 테이블 카운트
    const fmCount = await prisma.failureMode.count({ where: { fmeaId } });
    const feCount = await prisma.failureEffect.count({ where: { fmeaId } });
    const fcCount = await prisma.failureCause.count({ where: { fmeaId } });
    const linkCount = await prisma.failureLink.count({ where: { fmeaId } });
    
    console.log('\n[고장분석 테이블 카운트]');
    console.log('FailureMode (고장형태):', fmCount);
    console.log('FailureEffect (고장영향):', feCount);
    console.log('FailureCause (고장원인):', fcCount);
    console.log('FailureLink (연결):', linkCount);
    
    // 2. 구조/기능 테이블 카운트
    const l1Count = await prisma.l1Structure.count({ where: { fmeaId } });
    const l2Count = await prisma.l2Structure.count({ where: { fmeaId } });
    const l3Count = await prisma.l3Structure.count({ where: { fmeaId } });
    const l1FuncCount = await prisma.l1Function.count({ where: { fmeaId } });
    const l2FuncCount = await prisma.l2Function.count({ where: { fmeaId } });
    const l3FuncCount = await prisma.l3Function.count({ where: { fmeaId } });
    
    console.log('\n[구조/기능 테이블 카운트]');
    console.log('L1Structure:', l1Count);
    console.log('L2Structure:', l2Count);
    console.log('L3Structure:', l3Count);
    console.log('L1Function:', l1FuncCount);
    console.log('L2Function:', l2FuncCount);
    console.log('L3Function:', l3FuncCount);
    
    // 3. FailureMode 상세 (L2Function, L2Structure 연결 확인)
    if (fmCount > 0) {
      const fms = await prisma.failureMode.findMany({
        where: { fmeaId },
        include: {
          l2Function: true,
          l2Structure: true
        }
      });
      
      console.log('\n[FailureMode → L2Function/L2Structure CASCADE 확인]');
      fms.forEach((fm, i) => {
        console.log(`FM${i+1}: "${fm.mode}"`);
        console.log(`  → l2FuncId: ${fm.l2FuncId}`);
        console.log(`  → l2StructId: ${fm.l2StructId}`);
        console.log(`  → L2Func연결: ${fm.l2Function ? '✅ ' + fm.l2Function.functionName : '❌ NULL'}`);
        console.log(`  → L2Struct연결: ${fm.l2Structure ? '✅ ' + fm.l2Structure.name : '❌ NULL'}`);
      });
    } else {
      console.log('\n⚠️ FailureMode 테이블이 비어있습니다!');
    }
    
    // 4. FailureEffect 상세 (L1Function 연결 확인)
    if (feCount > 0) {
      const fes = await prisma.failureEffect.findMany({
        where: { fmeaId },
        include: {
          l1Function: { include: { l1Structure: true } }
        }
      });
      
      console.log('\n[FailureEffect → L1Function → L1Structure CASCADE 확인]');
      fes.forEach((fe, i) => {
        console.log(`FE${i+1}: "${fe.effect}" (S=${fe.severity})`);
        console.log(`  → l1FuncId: ${fe.l1FuncId}`);
        console.log(`  → L1Func연결: ${fe.l1Function ? '✅ ' + fe.l1Function.functionName : '❌ NULL'}`);
        console.log(`  → L1Struct연결: ${fe.l1Function?.l1Structure ? '✅ ' + fe.l1Function.l1Structure.name : '❌ NULL'}`);
      });
    } else {
      console.log('\n⚠️ FailureEffect 테이블이 비어있습니다!');
    }
    
    // 5. FailureCause 상세 (L3Function, L3Structure 연결 확인)
    if (fcCount > 0) {
      const fcs = await prisma.failureCause.findMany({
        where: { fmeaId },
        include: {
          l3Function: true,
          l3Structure: { include: { l2Structure: true } }
        }
      });
      
      console.log('\n[FailureCause → L3Function/L3Structure CASCADE 확인]');
      fcs.forEach((fc, i) => {
        console.log(`FC${i+1}: "${fc.cause}" (O=${fc.occurrence})`);
        console.log(`  → l3FuncId: ${fc.l3FuncId}`);
        console.log(`  → l3StructId: ${fc.l3StructId}`);
        console.log(`  → L3Func연결: ${fc.l3Function ? '✅ ' + fc.l3Function.functionName : '❌ NULL'}`);
        console.log(`  → L3Struct연결: ${fc.l3Structure ? '✅ ' + fc.l3Structure.name : '❌ NULL'}`);
        console.log(`  → L2Struct연결: ${fc.l3Structure?.l2Structure ? '✅ ' + fc.l3Structure.l2Structure.name : '❌ NULL'}`);
      });
    } else {
      console.log('\n⚠️ FailureCause 테이블이 비어있습니다!');
    }
    
    // 6. FailureLink 상세 (전체 CASCADE 연결 확인)
    if (linkCount > 0) {
      const links = await prisma.failureLink.findMany({
        where: { fmeaId },
        include: {
          failureMode: { include: { l2Function: true, l2Structure: { include: { l1Structure: true } } } },
          failureEffect: { include: { l1Function: { include: { l1Structure: true } } } },
          failureCause: { include: { l3Function: true, l3Structure: { include: { l2Structure: true } } } }
        }
      });
      
      console.log('\n[FailureLink 전체 CASCADE 연결]');
      links.forEach((link, i) => {
        console.log(`\n=== Link ${i+1} ===`);
        console.log('FM:', link.failureMode?.mode || 'NULL');
        console.log('  └─ L2Func:', link.failureMode?.l2Function?.functionName || 'NULL');
        console.log('  └─ L2Struct:', link.failureMode?.l2Structure?.name || 'NULL');
        console.log('  └─ L1Struct:', link.failureMode?.l2Structure?.l1Structure?.name || 'NULL');
        console.log('FE:', link.failureEffect?.effect || 'NULL', '(S=' + link.failureEffect?.severity + ')');
        console.log('  └─ L1Func:', link.failureEffect?.l1Function?.functionName || 'NULL');
        console.log('  └─ L1Struct:', link.failureEffect?.l1Function?.l1Structure?.name || 'NULL');
        console.log('FC:', link.failureCause?.cause || 'NULL', '(O=' + link.failureCause?.occurrence + ')');
        console.log('  └─ L3Func:', link.failureCause?.l3Function?.functionName || 'NULL');
        console.log('  └─ L3Struct:', link.failureCause?.l3Structure?.name || 'NULL');
        console.log('  └─ L2Struct:', link.failureCause?.l3Structure?.l2Structure?.name || 'NULL');
      });
    } else {
      console.log('\n⚠️ FailureLink 테이블이 비어있습니다!');
      console.log('고장연결이 저장되지 않았거나 삭제되었습니다.');
    }
    
    // 7. Legacy Data 확인
    const legacyData = await prisma.fmeaLegacyData.findUnique({
      where: { fmeaId }
    });
    
    if (legacyData) {
      console.log('\n[Legacy Data 확인]');
      console.log('Legacy Data ID:', legacyData.id);
      console.log('Version:', legacyData.version);
      const data = legacyData.data as Record<string, unknown>;
      console.log('Data Keys:', Object.keys(data));
      if (data.failureLinks) {
        console.log('failureLinks 수:', Array.isArray(data.failureLinks) ? data.failureLinks.length : 'N/A');
      }
    } else {
      console.log('\n⚠️ Legacy Data가 없습니다!');
    }

  } catch (error) {
    console.error('오류:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

checkAtomicDB();
