/**
 * fmea_legacy_data 테이블의 누락된 등록정보 복구
 * - 기존 워크시트 데이터는 유지하면서 등록정보만 추가
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://postgres:postgres@localhost:5432/fmea_db'
});

async function fixLegacyData() {
  try {
    console.log('=== fmea_legacy_data 등록정보 복구 시작 ===\n');
    
    // 1. 현재 fmea_legacy_data 데이터 조회
    const legacyResult = await pool.query(`SELECT * FROM public.fmea_legacy_data`);
    
    for (const row of legacyResult.rows) {
      const fmeaId = row.fmeaId;
      const existingData = row.data || {};
      
      console.log(`\n[${fmeaId}] 현재 데이터 키:`, Object.keys(existingData));
      
      // 등록정보가 누락된 경우 기본값 추가
      if (!existingData.fmeaInfo || Object.keys(existingData.fmeaInfo || {}).length === 0) {
        console.log(`  → fmeaInfo 누락, 기본값 추가`);
        
        const updatedData = {
          ...existingData,
          fmeaInfo: {
            subject: fmeaId,
            fmeaId: fmeaId,
            fmeaType: fmeaId.includes('-M') ? 'M' : fmeaId.includes('-F') ? 'F' : 'P',
            companyName: '',
            engineeringLocation: '',
            customerName: '',
            modelYear: '',
            fmeaStartDate: '',
            fmeaRevisionDate: '',
            fmeaProjectName: fmeaId,
            designResponsibility: '',
            confidentialityLevel: '',
            fmeaResponsibleName: '',
          },
          project: existingData.project || {
            projectName: fmeaId,
            customer: '',
            productName: fmeaId,
            partNo: '',
            department: '',
            leader: '',
            startDate: '',
            endDate: '',
          },
          cftMembers: existingData.cftMembers || [],
          fmeaType: fmeaId.includes('-M') ? 'M' : fmeaId.includes('-F') ? 'F' : 'P',
          parentFmeaId: fmeaId.includes('-M') ? fmeaId : null,
          parentFmeaType: fmeaId.includes('-M') ? 'M' : null,
        };
        
        await pool.query(`
          UPDATE public.fmea_legacy_data 
          SET data = $1, "updatedAt" = NOW()
          WHERE "fmeaId" = $2
        `, [JSON.stringify(updatedData), fmeaId]);
        
        console.log(`  ✅ ${fmeaId} 등록정보 추가 완료`);
      } else {
        console.log(`  ✅ ${fmeaId} 등록정보 이미 존재`);
      }
    }
    
    // 2. 결과 확인
    console.log('\n=== 복구 후 데이터 확인 ===');
    const verifyResult = await pool.query(`SELECT "fmeaId", data FROM public.fmea_legacy_data`);
    
    for (const row of verifyResult.rows) {
      console.log(`\n[${row.fmeaId}]`);
      console.log('  fmeaInfo:', row.data.fmeaInfo ? '있음' : '없음');
      console.log('  project:', row.data.project ? '있음' : '없음');
      console.log('  cftMembers:', row.data.cftMembers?.length || 0, '명');
      if (row.data.fmeaInfo) {
        console.log('  subject:', row.data.fmeaInfo.subject);
      }
    }
    
    console.log('\n=== 복구 완료 ===');
    
  } catch (e) {
    console.error('오류:', e.message);
  } finally {
    await pool.end();
  }
}

fixLegacyData();










