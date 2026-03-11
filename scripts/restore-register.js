/**
 * DB에서 등록화면 데이터 복구 (pfmea-projects 형식으로)
 */
const { chromium } = require('playwright');
const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fmea_db' 
});

(async () => {
  const fmeaId = process.argv[2] || 'pfm26-M001';
  const schemaName = `pfmea_${fmeaId.toLowerCase().replace(/-/g, '_')}`;
  
  console.log('=== DB에서 등록화면 데이터 복구 ===');
  console.log('FMEA ID:', fmeaId);
  console.log('Schema:', schemaName);
  
  try {
    // DB에서 FmeaInfo 조회
    const infoResult = await pool.query(`SELECT * FROM ${schemaName}."FmeaInfo" LIMIT 1`);
    
    if (infoResult.rows.length === 0) {
      console.log('❌ DB에 FmeaInfo 데이터 없음');
      await pool.end();
      return;
    }
    
    const dbInfo = infoResult.rows[0];
    console.log('DB FmeaInfo:', JSON.stringify(dbInfo, null, 2));
    
    // localStorage 형식으로 변환
    const projectData = {
      id: fmeaId,
      fmeaInfo: {
        companyName: dbInfo.project?.customer || dbInfo.fmeaInfo?.companyName || '',
        engineeringLocation: dbInfo.fmeaInfo?.engineeringLocation || '',
        customerName: dbInfo.project?.customer || '',
        modelYear: dbInfo.fmeaInfo?.modelYear || '',
        subject: dbInfo.fmeaInfo?.subject || dbInfo.project?.projectName || '',
        fmeaStartDate: dbInfo.fmeaInfo?.fmeaStartDate || '',
        fmeaRevisionDate: dbInfo.fmeaInfo?.fmeaRevisionDate || '',
        fmeaProjectName: dbInfo.project?.projectName || '',
        fmeaId: fmeaId,
        fmeaType: dbInfo.fmeaType || 'M',
        designResponsibility: dbInfo.fmeaInfo?.designResponsibility || '',
        confidentialityLevel: dbInfo.fmeaInfo?.confidentialityLevel || '',
        fmeaResponsibleName: dbInfo.fmeaInfo?.fmeaResponsibleName || '',
      },
      project: dbInfo.project || {},
      cftMembers: dbInfo.cftMembers || [],
      createdAt: dbInfo.createdAt || new Date().toISOString(),
    };
    
    console.log('\n변환된 프로젝트 데이터:', JSON.stringify(projectData, null, 2));
    
    await pool.end();
    
    // Playwright로 브라우저에서 localStorage 업데이트
    console.log('\n브라우저에서 localStorage 업데이트 중...');
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    await page.goto(`http://localhost:3000/pfmea/register?id=${fmeaId}`);
    await page.waitForTimeout(2000);
    
    // localStorage에 프로젝트 데이터 저장
    await page.evaluate((data) => {
      // 기존 프로젝트 목록 가져오기
      let projects = [];
      try {
        const stored = localStorage.getItem('pfmea-projects');
        if (stored) {
          projects = JSON.parse(stored);
        }
      } catch (e) {}
      
      // 기존 동일 ID 제거
      projects = projects.filter(p => p.id !== data.id);
      
      // 새 데이터를 맨 앞에 추가
      projects.unshift(data);
      
      // 저장
      localStorage.setItem('pfmea-projects', JSON.stringify(projects));
      console.log('✅ pfmea-projects 저장 완료:', data.id);
    }, projectData);
    
    // 페이지 새로고침
    console.log('페이지 새로고침...');
    await page.reload();
    await page.waitForTimeout(3000);
    
    console.log('✅ 복구 완료! 브라우저를 확인하세요.');
    
  } catch (e) {
    console.error('오류:', e.message);
    await pool.end();
  }
})();











