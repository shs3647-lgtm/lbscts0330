/**
 * PFM26-M001 등록정보 샘플 데이터 입력
 * 사용자가 등록화면에서 입력한 데이터 기반
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://postgres:postgres@localhost:5432/fmea_db'
});

async function insertSampleData() {
  try {
    const fmeaId = 'PFM26-M001';
    console.log(`=== ${fmeaId} 등록정보 입력 ===\n`);
    
    // 등록정보 업데이트
    await pool.query(`
      UPDATE public.fmea_registrations SET
        "companyName" = $2,
        "engineeringLocation" = $3,
        "customerName" = $4,
        "modelYear" = $5,
        subject = $6,
        "fmeaStartDate" = $7,
        "fmeaRevisionDate" = $8,
        "fmeaProjectName" = $9,
        "designResponsibility" = $10,
        "confidentialityLevel" = $11,
        "fmeaResponsibleName" = $12,
        "updatedAt" = NOW()
      WHERE "fmeaId" = $1
    `, [
      fmeaId,
      'SDD FMEA Inc.',            // 회사명
      '서울 R&D 센터',              // 엔지니어링 위치
      'Hyundai Motor',             // 고객사
      '2026 EV Platform',          // 모델 연식/플랫폼
      '타이어 제조공정 PFMEA',      // FMEA명 (subject)
      '2026-01-10',                // 시작일자
      '2026-01-11',                // 개정일자
      'SDD NEW FMEA',              // 프로젝트명
      '품질보증팀',                 // 공정책임
      '일반',                       // 기밀유지수준
      '홍길동',                     // 담당자
    ]);
    console.log('✅ fmea_registrations 업데이트 완료');
    
    // CFT 멤버 추가
    const cftMembers = [
      { role: 'Champion', name: '김대표', department: '경영지원팀', position: '이사' },
      { role: 'Leader', name: '이리더', department: '품질보증팀', position: '부장' },
      { role: 'PM', name: '박매니저', department: '생산관리팀', position: '과장' },
      { role: 'Moderator', name: '최진행', department: '기술개발팀', position: '차장' },
      { role: 'CFT 팀원', name: '정팀원', department: '설계팀', position: '대리' },
    ];
    
    // 기존 CFT 멤버 삭제 후 새로 추가
    await pool.query(`DELETE FROM public.fmea_cft_members WHERE "fmeaId" = $1`, [fmeaId]);
    
    for (let i = 0; i < cftMembers.length; i++) {
      const m = cftMembers[i];
      await pool.query(`
        INSERT INTO public.fmea_cft_members (id, "fmeaId", role, name, department, position, "order", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())
      `, [fmeaId, m.role, m.name, m.department, m.position, i]);
    }
    console.log(`✅ fmea_cft_members ${cftMembers.length}명 추가 완료`);
    
    // fmea_legacy_data도 업데이트 (하위호환)
    await pool.query(`
      UPDATE public.fmea_legacy_data SET
        data = jsonb_set(
          jsonb_set(
            data,
            '{fmeaInfo}',
            $2::jsonb
          ),
          '{project}',
          $3::jsonb
        ),
        "updatedAt" = NOW()
      WHERE "fmeaId" = $1
    `, [
      fmeaId,
      JSON.stringify({
        companyName: 'SDD FMEA Inc.',
        engineeringLocation: '서울 R&D 센터',
        customerName: 'Hyundai Motor',
        modelYear: '2026 EV Platform',
        subject: '타이어 제조공정 PFMEA',
        fmeaStartDate: '2026-01-10',
        fmeaRevisionDate: '2026-01-11',
        fmeaProjectName: 'SDD NEW FMEA',
        fmeaId: fmeaId,
        fmeaType: 'M',
        designResponsibility: '품질보증팀',
        confidentialityLevel: '일반',
        fmeaResponsibleName: '홍길동',
      }),
      JSON.stringify({
        projectName: 'SDD NEW FMEA',
        customer: 'Hyundai Motor',
        productName: '타이어 제조공정 PFMEA',
        department: '품질보증팀',
        leader: '홍길동',
        startDate: '2026-01-10',
      }),
    ]);
    console.log('✅ fmea_legacy_data 업데이트 완료');
    
    // 결과 확인
    console.log('\n=== 결과 확인 ===');
    const result = await pool.query(`
      SELECT r.*, 
             (SELECT COUNT(*) FROM public.fmea_cft_members WHERE "fmeaId" = r."fmeaId") as cft_count
      FROM public.fmea_registrations r 
      WHERE r."fmeaId" = $1
    `, [fmeaId]);
    
    if (result.rows.length > 0) {
      const r = result.rows[0];
      console.log('fmeaId:', r.fmeaId);
      console.log('회사명:', r.companyName);
      console.log('고객사:', r.customerName);
      console.log('FMEA명:', r.subject);
      console.log('프로젝트명:', r.fmeaProjectName);
      console.log('모델연식:', r.modelYear);
      console.log('공정책임:', r.designResponsibility);
      console.log('담당자:', r.fmeaResponsibleName);
      console.log('시작일자:', r.fmeaStartDate);
      console.log('개정일자:', r.fmeaRevisionDate);
      console.log('CFT 멤버:', r.cft_count, '명');
    }
    
    console.log('\n=== 완료 ===');
    
  } catch (e) {
    console.error('Error:', e.message);
    console.error(e.stack);
  } finally {
    await pool.end();
  }
}

insertSampleData();










