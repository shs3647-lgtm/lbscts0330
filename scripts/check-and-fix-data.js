/**
 * PFM26-M001 데이터 확인 및 복구
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://postgres:postgres@localhost:5432/fmea_db'
});

async function checkAndFix() {
  try {
    const fmeaId = 'PFM26-M001';
    console.log(`=== ${fmeaId} 데이터 확인 및 복구 ===\n`);
    
    // 1. fmea_legacy_data 확인
    console.log('1. fmea_legacy_data 확인:');
    const legacy = await pool.query(
      `SELECT "fmeaId", data FROM public.fmea_legacy_data WHERE "fmeaId" = $1`,
      [fmeaId]
    );
    
    let legacyData = null;
    if (legacy.rows.length > 0) {
      legacyData = legacy.rows[0].data;
      console.log('   - fmeaInfo:', legacyData.fmeaInfo ? '있음' : '없음');
      console.log('   - project:', legacyData.project ? '있음' : '없음');
      console.log('   - l1:', legacyData.l1?.name || '없음');
      console.log('   - l2 count:', legacyData.l2?.length || 0);
    } else {
      console.log('   데이터 없음');
    }
    
    // 2. 프로젝트별 스키마 FmeaInfo 확인
    console.log('\n2. pfmea_pfm26_m001.FmeaInfo 확인:');
    let schemaFmeaInfo = null;
    try {
      const schemaData = await pool.query(
        `SELECT * FROM "pfmea_pfm26_m001"."FmeaInfo" LIMIT 1`
      );
      if (schemaData.rows.length > 0) {
        schemaFmeaInfo = schemaData.rows[0];
        console.log('   - fmeaId:', schemaFmeaInfo.fmeaId);
        console.log('   - fmeaType:', schemaFmeaInfo.fmeaType);
        console.log('   - project:', schemaFmeaInfo.project ? '있음' : '없음');
        console.log('   - fmeaInfo:', schemaFmeaInfo.fmeaInfo ? '있음' : '없음');
        console.log('   - cftMembers:', schemaFmeaInfo.cftMembers?.length || 0, '명');
        if (schemaFmeaInfo.fmeaInfo) {
          console.log('   - subject:', schemaFmeaInfo.fmeaInfo.subject);
        }
      } else {
        console.log('   데이터 없음');
      }
    } catch (e) {
      console.log('   테이블 없음:', e.message);
    }
    
    // 3. fmea_registrations 확인
    console.log('\n3. fmea_registrations 확인:');
    const reg = await pool.query(
      `SELECT * FROM public.fmea_registrations WHERE "fmeaId" = $1`,
      [fmeaId]
    );
    if (reg.rows.length > 0) {
      const r = reg.rows[0];
      console.log('   - subject:', r.subject);
      console.log('   - companyName:', r.companyName);
      console.log('   - customerName:', r.customerName);
    } else {
      console.log('   데이터 없음');
    }
    
    // 4. 데이터 복구/업데이트
    console.log('\n4. 데이터 복구...');
    
    // 소스: 스키마 FmeaInfo 또는 레거시
    const source = schemaFmeaInfo || legacyData;
    
    if (source) {
      const fmeaInfo = schemaFmeaInfo?.fmeaInfo || legacyData?.fmeaInfo || {};
      const project = schemaFmeaInfo?.project || legacyData?.project || {};
      const cftMembers = schemaFmeaInfo?.cftMembers || legacyData?.cftMembers || [];
      
      // fmea_registrations 업데이트
      await pool.query(`
        UPDATE public.fmea_registrations SET
          "companyName" = COALESCE(NULLIF($2, ''), "companyName"),
          "customerName" = COALESCE(NULLIF($3, ''), "customerName"),
          subject = COALESCE(NULLIF($4, ''), subject),
          "fmeaStartDate" = COALESCE(NULLIF($5, ''), "fmeaStartDate"),
          "fmeaRevisionDate" = COALESCE(NULLIF($6, ''), "fmeaRevisionDate"),
          "fmeaProjectName" = COALESCE(NULLIF($7, ''), "fmeaProjectName"),
          "designResponsibility" = COALESCE(NULLIF($8, ''), "designResponsibility"),
          "fmeaResponsibleName" = COALESCE(NULLIF($9, ''), "fmeaResponsibleName"),
          "modelYear" = COALESCE(NULLIF($10, ''), "modelYear"),
          "updatedAt" = NOW()
        WHERE "fmeaId" = $1
      `, [
        fmeaId,
        fmeaInfo.companyName || '',
        fmeaInfo.customerName || project.customer || '',
        fmeaInfo.subject || project.projectName || fmeaId,
        fmeaInfo.fmeaStartDate || project.startDate || '',
        fmeaInfo.fmeaRevisionDate || '',
        fmeaInfo.fmeaProjectName || project.projectName || '',
        fmeaInfo.designResponsibility || project.department || '',
        fmeaInfo.fmeaResponsibleName || project.leader || '',
        fmeaInfo.modelYear || '',
      ]);
      console.log('   ✅ fmea_registrations 업데이트 완료');
      
      // CFT 멤버 추가
      if (cftMembers.length > 0) {
        await pool.query(`DELETE FROM public.fmea_cft_members WHERE "fmeaId" = $1`, [fmeaId]);
        for (let i = 0; i < cftMembers.length; i++) {
          const m = cftMembers[i];
          await pool.query(`
            INSERT INTO public.fmea_cft_members (id, "fmeaId", role, name, department, position, email, phone, "order", "createdAt", "updatedAt")
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
          `, [fmeaId, m.role || 'CFT 팀원', m.name || '', m.department || '', m.position || '', m.email || '', m.phone || '', i]);
        }
        console.log(`   ✅ fmea_cft_members ${cftMembers.length}명 추가 완료`);
      }
    }
    
    // 5. 결과 확인
    console.log('\n5. 최종 결과:');
    const finalReg = await pool.query(
      `SELECT * FROM public.fmea_registrations WHERE "fmeaId" = $1`,
      [fmeaId]
    );
    if (finalReg.rows.length > 0) {
      const r = finalReg.rows[0];
      console.log('   - fmeaId:', r.fmeaId);
      console.log('   - subject:', r.subject);
      console.log('   - companyName:', r.companyName);
      console.log('   - customerName:', r.customerName);
      console.log('   - fmeaProjectName:', r.fmeaProjectName);
    }
    
    const finalCft = await pool.query(
      `SELECT COUNT(*) FROM public.fmea_cft_members WHERE "fmeaId" = $1`,
      [fmeaId]
    );
    console.log('   - CFT 멤버:', finalCft.rows[0].count, '명');
    
    console.log('\n=== 완료 ===');
    
  } catch (e) {
    console.error('Error:', e.message);
    console.error(e.stack);
  } finally {
    await pool.end();
  }
}

checkAndFix();










