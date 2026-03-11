/**
 * DB에 저장된 CFT 멤버 확인 스크립트
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

async function checkCftMembers() {
  try {
    const fmeaId = 'PFM26-M001';
    
    console.log(`\n=== DB에 저장된 CFT 멤버 확인 (FMEA ID: ${fmeaId}) ===\n`);
    
    const members = await prisma.fmeaCftMember.findMany({
      where: { fmeaId },
      orderBy: { order: 'asc' }
    });
    
    console.log(`📊 총 ${members.length}명 저장됨\n`);
    
    if (members.length === 0) {
      console.log('⚠️ 저장된 멤버가 없습니다.\n');
      return;
    }
    
    console.log('📋 멤버 목록:');
    console.log('─'.repeat(80));
    members.forEach((m, idx) => {
      const name = m.name && m.name.trim() !== '' ? m.name : '(이름없음)';
      const role = m.role && m.role.trim() !== '' ? m.role : '(role없음)';
      const department = m.department && m.department.trim() !== '' ? m.department : '(부서없음)';
      console.log(`${idx + 1}. ${name.padEnd(10)} | ${role.padEnd(10)} | ${department}`);
    });
    console.log('─'.repeat(80));
    console.log('');
    
    // name 있는 멤버와 없는 멤버 분류
    const withName = members.filter(m => m.name && String(m.name).trim() !== '');
    const withoutName = members.filter(m => !m.name || String(m.name).trim() === '');
    
    console.log(`✅ name 있는 멤버: ${withName.length}명`);
    if (withName.length > 0) {
      console.log('   -', withName.map(m => m.name).join(', '));
    }
    
    if (withoutName.length > 0) {
      console.log(`⚠️ name 없는 멤버: ${withoutName.length}명`);
      console.log('   -', withoutName.map((m, idx) => `[${idx}] role: ${m.role || '(없음)'}`).join(', '));
    }
    console.log('');
    
    // 결과 요약
    if (members.length === 6 && withName.length === 6) {
      console.log('✅ 성공: 6명 모두 저장되었고, 모든 멤버에 name이 있습니다!');
    } else if (members.length === 6 && withName.length < 6) {
      console.log(`⚠️ 주의: 6명 저장되었지만, ${withoutName.length}명의 멤버에 name이 없습니다.`);
    } else if (members.length < 6) {
      console.log(`❌ 문제: ${members.length}명만 저장되었습니다. (예상: 6명)`);
    } else {
      console.log(`⚠️ 예상보다 많은 멤버가 저장되었습니다: ${members.length}명`);
    }
    console.log('');
    
  } catch (error: any) {
    console.error('❌ 오류:', error.message);
    if (error.stack) {
      console.error('스택:', error.stack.substring(0, 500));
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkCftMembers();









