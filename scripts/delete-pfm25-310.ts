/**
 * pfm25-310 데이터 완전 삭제 스크립트
 */

import { getPrisma, getBaseDatabaseUrl, getPrismaForSchema } from '../src/lib/prisma';
import { Pool } from 'pg';

async function deleteProject() {
  const fmeaId = 'pfm25-310';
  
  console.log('=== pfm25-310 완전 삭제 시작 ===');
  
  const prisma = getPrisma();
  if (!prisma) {
    console.error('Prisma Client 초기화 실패');
    process.exit(1);
  }
  
  const dbUrl = getBaseDatabaseUrl();
  console.log('DB 연결 확인:', dbUrl ? '성공' : '실패');
  
  try {
    // 1. fmea_cft_members 삭제
    const cft = await prisma.fmeaCftMember.deleteMany({
      where: { 
        OR: [
          { fmeaId: fmeaId },
          { fmeaId: fmeaId.toUpperCase() },
          { fmeaId: fmeaId.toLowerCase() },
        ]
      }
    });
    console.log('FmeaCftMember 삭제:', cft.count);
    
    // 2. fmea_worksheet_data 삭제
    const ws = await prisma.fmeaWorksheetData.deleteMany({
      where: { 
        OR: [
          { fmeaId: fmeaId },
          { fmeaId: fmeaId.toUpperCase() },
          { fmeaId: fmeaId.toLowerCase() },
        ]
      }
    });
    console.log('FmeaWorksheetData 삭제:', ws.count);
    
    // 3. fmea_registrations 삭제
    const reg = await prisma.fmeaRegistration.deleteMany({
      where: { 
        OR: [
          { fmeaId: fmeaId },
          { fmeaId: fmeaId.toUpperCase() },
          { fmeaId: fmeaId.toLowerCase() },
        ]
      }
    });
    console.log('FmeaRegistration 삭제:', reg.count);
    
    // 4. fmea_projects 삭제
    const proj = await prisma.fmeaProject.deleteMany({
      where: { 
        OR: [
          { fmeaId: fmeaId },
          { fmeaId: fmeaId.toUpperCase() },
          { fmeaId: fmeaId.toLowerCase() },
        ]
      }
    });
    console.log('FmeaProject 삭제:', proj.count);
    
    console.log('=== 메인 테이블 삭제 완료 ===');
    
    // 5. 프로젝트별 스키마 삭제
    if (dbUrl) {
      const pool = new Pool({ connectionString: dbUrl });
      
      const schemas = [
        'pfmea_pfm25_310',
        'pfmea_pfm25-310',
      ];
      
      for (const schema of schemas) {
        try {
          await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
          console.log(`스키마 삭제: ${schema}`);
        } catch (e: any) {
          console.log(`스키마 ${schema}: ${e.message}`);
        }
      }
      
      await pool.end();
      console.log('=== 스키마 삭제 완료 ===');
    }
    
    // 6. 남은 데이터 확인
    const remaining = await prisma.fmeaProject.findMany({
      where: {
        fmeaId: {
          contains: 'pfm25-310',
          mode: 'insensitive'
        }
      },
      select: { fmeaId: true }
    });
    console.log('남은 pfm25-310 관련 데이터:', remaining);
    
  } catch (e: any) {
    console.error('삭제 오류:', e.message);
  }
  
  console.log('=== 모든 삭제 완료 ===');
  process.exit(0);
}

deleteProject();
