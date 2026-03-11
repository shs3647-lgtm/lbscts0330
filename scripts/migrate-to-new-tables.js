/**
 * 기존 fmea_legacy_data 데이터를 새 테이블 구조로 마이그레이션
 * 
 * 마이그레이션 대상:
 * - fmea_legacy_data → fmea_projects + fmea_registrations + fmea_cft_members
 * 
 * 실행: node scripts/migrate-to-new-tables.js
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://postgres:postgres@localhost:5432/fmea_db'
});

async function migrate() {
  console.log('=== 데이터 마이그레이션 시작 ===\n');

  try {
    // 1. fmea_legacy_data에서 모든 데이터 조회
    const legacyResult = await pool.query(`
      SELECT "fmeaId", data FROM public.fmea_legacy_data
    `);
    
    console.log(`총 ${legacyResult.rows.length}개 레거시 데이터 발견\n`);

    for (const row of legacyResult.rows) {
      const fmeaId = row.fmeaId;
      const data = row.data || {};
      
      console.log(`[${fmeaId}] 마이그레이션 시작...`);
      
      // FMEA 유형 추출
      const fmeaType = data.fmeaType || (fmeaId.includes('-M') ? 'M' : fmeaId.includes('-F') ? 'F' : 'P');
      const parentFmeaId = data.parentFmeaId || (fmeaType === 'M' ? fmeaId : null);
      const parentFmeaType = data.parentFmeaType || (fmeaType === 'M' ? 'M' : null);
      
      // 2. fmea_projects 테이블에 저장 (UUID 자동 생성)
      await pool.query(`
        INSERT INTO public.fmea_projects (id, "fmeaId", "fmeaType", "parentFmeaId", "parentFmeaType", status, step, "revisionNo", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), $1, $2, $3, $4, 'active', 1, 'Rev.01', NOW(), NOW())
        ON CONFLICT ("fmeaId") DO UPDATE SET 
          "fmeaType" = EXCLUDED."fmeaType",
          "parentFmeaId" = EXCLUDED."parentFmeaId",
          "parentFmeaType" = EXCLUDED."parentFmeaType",
          "updatedAt" = NOW()
      `, [fmeaId, fmeaType, parentFmeaId, parentFmeaType]);
      console.log(`  ✅ fmea_projects 저장 완료`);
      
      // 3. fmea_registrations 테이블에 저장
      const fmeaInfo = data.fmeaInfo || {};
      const project = data.project || {};
      
      await pool.query(`
        INSERT INTO public.fmea_registrations (
          id, "fmeaId", "companyName", "engineeringLocation", "customerName", "modelYear",
          subject, "fmeaStartDate", "fmeaRevisionDate", "fmeaProjectName",
          "designResponsibility", "confidentialityLevel", "fmeaResponsibleName",
          "createdAt", "updatedAt"
        )
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        ON CONFLICT ("fmeaId") DO UPDATE SET
          "companyName" = COALESCE(EXCLUDED."companyName", public.fmea_registrations."companyName"),
          "engineeringLocation" = COALESCE(EXCLUDED."engineeringLocation", public.fmea_registrations."engineeringLocation"),
          "customerName" = COALESCE(EXCLUDED."customerName", public.fmea_registrations."customerName"),
          "modelYear" = COALESCE(EXCLUDED."modelYear", public.fmea_registrations."modelYear"),
          subject = COALESCE(EXCLUDED.subject, public.fmea_registrations.subject),
          "fmeaStartDate" = COALESCE(EXCLUDED."fmeaStartDate", public.fmea_registrations."fmeaStartDate"),
          "fmeaRevisionDate" = COALESCE(EXCLUDED."fmeaRevisionDate", public.fmea_registrations."fmeaRevisionDate"),
          "fmeaProjectName" = COALESCE(EXCLUDED."fmeaProjectName", public.fmea_registrations."fmeaProjectName"),
          "designResponsibility" = COALESCE(EXCLUDED."designResponsibility", public.fmea_registrations."designResponsibility"),
          "confidentialityLevel" = COALESCE(EXCLUDED."confidentialityLevel", public.fmea_registrations."confidentialityLevel"),
          "fmeaResponsibleName" = COALESCE(EXCLUDED."fmeaResponsibleName", public.fmea_registrations."fmeaResponsibleName"),
          "updatedAt" = NOW()
      `, [
        fmeaId,
        fmeaInfo.companyName || '',
        fmeaInfo.engineeringLocation || '',
        fmeaInfo.customerName || project.customer || '',
        fmeaInfo.modelYear || '',
        fmeaInfo.subject || project.projectName || fmeaId,
        fmeaInfo.fmeaStartDate || project.startDate || '',
        fmeaInfo.fmeaRevisionDate || '',
        fmeaInfo.fmeaProjectName || project.projectName || '',
        fmeaInfo.designResponsibility || project.department || '',
        fmeaInfo.confidentialityLevel || '',
        fmeaInfo.fmeaResponsibleName || project.leader || '',
      ]);
      console.log(`  ✅ fmea_registrations 저장 완료`);
      
      // 4. fmea_cft_members 테이블에 저장
      const cftMembers = data.cftMembers || [];
      if (cftMembers.length > 0) {
        // 기존 멤버 삭제
        await pool.query(`DELETE FROM public.fmea_cft_members WHERE "fmeaId" = $1`, [fmeaId]);
        
        // 새 멤버 추가
        for (let i = 0; i < cftMembers.length; i++) {
          const m = cftMembers[i];
          await pool.query(`
            INSERT INTO public.fmea_cft_members (
              id, "fmeaId", role, name, department, position, responsibility, email, phone, remarks, "order", "createdAt", "updatedAt"
            )
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
          `, [
            fmeaId,
            m.role || 'CFT 팀원',
            m.name || '',
            m.department || '',
            m.position || '',
            m.responsibility || '',
            m.email || '',
            m.phone || '',
            m.remarks || '',
            i,
          ]);
        }
        console.log(`  ✅ fmea_cft_members ${cftMembers.length}명 저장 완료`);
      }
      
      // 5. fmea_worksheet_data 테이블에 저장
      const l1Data = data.l1 || null;
      const l2Data = data.l2 || null;
      const riskData = data.riskData || null;
      const failureLinks = data.failureLinks || null;
      
      if (l1Data || l2Data) {
        await pool.query(`
          INSERT INTO public.fmea_worksheet_data (
            id, "fmeaId", "l1Data", "l2Data", "riskData", "failureLinks", tab, version, "savedAt", "createdAt", "updatedAt"
          )
          VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, '1.0.0', NOW(), NOW(), NOW())
          ON CONFLICT ("fmeaId") DO UPDATE SET
            "l1Data" = COALESCE(EXCLUDED."l1Data", public.fmea_worksheet_data."l1Data"),
            "l2Data" = COALESCE(EXCLUDED."l2Data", public.fmea_worksheet_data."l2Data"),
            "riskData" = COALESCE(EXCLUDED."riskData", public.fmea_worksheet_data."riskData"),
            "failureLinks" = COALESCE(EXCLUDED."failureLinks", public.fmea_worksheet_data."failureLinks"),
            "updatedAt" = NOW()
        `, [
          fmeaId,
          l1Data ? JSON.stringify(l1Data) : null,
          l2Data ? JSON.stringify(l2Data) : null,
          riskData ? JSON.stringify(riskData) : null,
          failureLinks ? JSON.stringify(failureLinks) : null,
          data.tab || 'structure',
        ]);
        console.log(`  ✅ fmea_worksheet_data 저장 완료`);
      }
      
      console.log(`[${fmeaId}] 마이그레이션 완료\n`);
    }

    // 6. 결과 확인
    console.log('=== 마이그레이션 결과 확인 ===');
    
    const projectsCount = await pool.query(`SELECT COUNT(*) FROM public.fmea_projects`);
    const regsCount = await pool.query(`SELECT COUNT(*) FROM public.fmea_registrations`);
    const cftCount = await pool.query(`SELECT COUNT(*) FROM public.fmea_cft_members`);
    const wsCount = await pool.query(`SELECT COUNT(*) FROM public.fmea_worksheet_data`);
    
    console.log(`- fmea_projects: ${projectsCount.rows[0].count}개`);
    console.log(`- fmea_registrations: ${regsCount.rows[0].count}개`);
    console.log(`- fmea_cft_members: ${cftCount.rows[0].count}개`);
    console.log(`- fmea_worksheet_data: ${wsCount.rows[0].count}개`);
    
    console.log('\n=== 마이그레이션 완료 ===');

  } catch (e) {
    console.error('마이그레이션 오류:', e.message);
    console.error(e.stack);
  } finally {
    await pool.end();
  }
}

migrate();

