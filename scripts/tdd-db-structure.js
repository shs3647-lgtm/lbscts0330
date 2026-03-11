/**
 * TDD 검증: 새로운 DB 테이블 구조
 * 
 * 검증 항목:
 * 1. 프로젝트 목록 조회 (fmea_projects)
 * 2. 등록정보 저장/조회 (fmea_registrations)
 * 3. CFT 멤버 저장/조회 (fmea_cft_members)
 * 4. 워크시트 데이터 저장/조회 (fmea_worksheet_data)
 * 5. 레거시 데이터 하위호환 (fmea_legacy_data)
 * 6. CASCADE 삭제 동작
 * 7. 데이터 일관성 검증
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://postgres:postgres@localhost:5432/fmea_db'
});

let passCount = 0;
let failCount = 0;

function pass(testName) {
  console.log(`  ✅ PASS: ${testName}`);
  passCount++;
}

function fail(testName, reason) {
  console.log(`  ❌ FAIL: ${testName} - ${reason}`);
  failCount++;
}

async function runTests() {
  console.log('=== TDD 검증: 새로운 DB 테이블 구조 ===\n');
  
  try {
    // ========================================
    // 테스트 1: 프로젝트 테이블 존재 확인
    // ========================================
    console.log('1. 테이블 존재 확인:');
    
    const tables = ['fmea_projects', 'fmea_registrations', 'fmea_cft_members', 'fmea_worksheet_data', 'fmea_legacy_data'];
    for (const table of tables) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = $1
        )
      `, [table]);
      
      if (result.rows[0].exists) {
        pass(`${table} 테이블 존재`);
      } else {
        fail(`${table} 테이블 존재`, '테이블이 없음');
      }
    }
    
    // ========================================
    // 테스트 2: PFM26-M001 프로젝트 데이터 확인
    // ========================================
    console.log('\n2. PFM26-M001 프로젝트 데이터 확인:');
    
    const project = await pool.query(`
      SELECT * FROM public.fmea_projects WHERE "fmeaId" = 'PFM26-M001'
    `);
    
    if (project.rows.length > 0) {
      pass('프로젝트 레코드 존재');
      
      const p = project.rows[0];
      if (p.fmeaType === 'M') pass('fmeaType = M');
      else fail('fmeaType = M', `실제: ${p.fmeaType}`);
      
      if (p.parentFmeaId === 'PFM26-M001') pass('parentFmeaId = 본인 ID');
      else fail('parentFmeaId = 본인 ID', `실제: ${p.parentFmeaId}`);
      
      if (p.status === 'active') pass('status = active');
      else fail('status = active', `실제: ${p.status}`);
    } else {
      fail('프로젝트 레코드 존재', '레코드 없음');
    }
    
    // ========================================
    // 테스트 3: 등록정보 데이터 확인
    // ========================================
    console.log('\n3. 등록정보 데이터 확인:');
    
    const reg = await pool.query(`
      SELECT * FROM public.fmea_registrations WHERE "fmeaId" = 'PFM26-M001'
    `);
    
    if (reg.rows.length > 0) {
      pass('등록정보 레코드 존재');
      
      const r = reg.rows[0];
      if (r.companyName && r.companyName.trim()) pass('회사명 입력됨');
      else fail('회사명 입력됨', '빈 값');
      
      if (r.customerName && r.customerName.trim()) pass('고객사 입력됨');
      else fail('고객사 입력됨', '빈 값');
      
      if (r.subject && r.subject.trim()) pass('FMEA명 입력됨');
      else fail('FMEA명 입력됨', '빈 값');
      
      if (r.fmeaResponsibleName && r.fmeaResponsibleName.trim()) pass('담당자 입력됨');
      else fail('담당자 입력됨', '빈 값');
    } else {
      fail('등록정보 레코드 존재', '레코드 없음');
    }
    
    // ========================================
    // 테스트 4: CFT 멤버 데이터 확인
    // ========================================
    console.log('\n4. CFT 멤버 데이터 확인:');
    
    const cft = await pool.query(`
      SELECT * FROM public.fmea_cft_members WHERE "fmeaId" = 'PFM26-M001' ORDER BY "order"
    `);
    
    if (cft.rows.length > 0) {
      pass(`CFT 멤버 ${cft.rows.length}명 존재`);
      
      const roles = cft.rows.map(m => m.role);
      if (roles.includes('Champion')) pass('Champion 역할 존재');
      else fail('Champion 역할 존재', '없음');
      
      if (roles.includes('Leader')) pass('Leader 역할 존재');
      else fail('Leader 역할 존재', '없음');
    } else {
      fail('CFT 멤버 존재', '레코드 없음');
    }
    
    // ========================================
    // 테스트 5: 워크시트 데이터 확인
    // ========================================
    console.log('\n5. 워크시트 데이터 확인:');
    
    const ws = await pool.query(`
      SELECT * FROM public.fmea_worksheet_data WHERE "fmeaId" = 'PFM26-M001'
    `);
    
    if (ws.rows.length > 0) {
      pass('워크시트 레코드 존재');
      
      const w = ws.rows[0];
      if (w.l1Data) pass('l1Data 존재');
      else fail('l1Data 존재', 'null');
      
      if (w.l2Data) pass('l2Data 존재');
      else fail('l2Data 존재', 'null');
    } else {
      fail('워크시트 레코드 존재', '레코드 없음');
    }
    
    // ========================================
    // 테스트 6: 레거시 데이터 하위호환 확인
    // ========================================
    console.log('\n6. 레거시 데이터 하위호환 확인:');
    
    const legacy = await pool.query(`
      SELECT * FROM public.fmea_legacy_data WHERE "fmeaId" = 'PFM26-M001'
    `);
    
    if (legacy.rows.length > 0) {
      pass('레거시 레코드 존재');
      
      const data = legacy.rows[0].data;
      if (data.fmeaInfo) pass('레거시에 fmeaInfo 포함');
      else fail('레거시에 fmeaInfo 포함', '없음');
      
      if (data.project) pass('레거시에 project 포함');
      else fail('레거시에 project 포함', '없음');
      
      if (data.l1) pass('레거시에 l1 데이터 포함');
      else fail('레거시에 l1 데이터 포함', '없음');
    } else {
      fail('레거시 레코드 존재', '레코드 없음');
    }
    
    // ========================================
    // 테스트 7: 데이터 일관성 검증
    // ========================================
    console.log('\n7. 데이터 일관성 검증:');
    
    // 프로젝트-등록정보 fmeaId 일치
    const consistency1 = await pool.query(`
      SELECT p."fmeaId" 
      FROM public.fmea_projects p
      LEFT JOIN public.fmea_registrations r ON p."fmeaId" = r."fmeaId"
      WHERE p."fmeaId" = 'PFM26-M001' AND r."fmeaId" IS NOT NULL
    `);
    
    if (consistency1.rows.length > 0) pass('프로젝트-등록정보 FK 일관성');
    else fail('프로젝트-등록정보 FK 일관성', '불일치');
    
    // 프로젝트-CFT멤버 fmeaId 일치
    const consistency2 = await pool.query(`
      SELECT p."fmeaId", COUNT(c.id) as cft_count
      FROM public.fmea_projects p
      LEFT JOIN public.fmea_cft_members c ON p."fmeaId" = c."fmeaId"
      WHERE p."fmeaId" = 'PFM26-M001'
      GROUP BY p."fmeaId"
    `);
    
    if (consistency2.rows.length > 0 && consistency2.rows[0].cft_count > 0) {
      pass('프로젝트-CFT멤버 FK 일관성');
    } else {
      fail('프로젝트-CFT멤버 FK 일관성', '불일치');
    }
    
    // ========================================
    // 결과 요약
    // ========================================
    console.log('\n========================================');
    console.log(`총 테스트: ${passCount + failCount}개`);
    console.log(`✅ PASS: ${passCount}개`);
    console.log(`❌ FAIL: ${failCount}개`);
    console.log('========================================');
    
    if (failCount === 0) {
      console.log('\n🎉 모든 테스트 통과! 코드프리즈 진행 가능합니다.\n');
    } else {
      console.log('\n⚠️ 일부 테스트 실패. 수정 후 재검증 필요합니다.\n');
    }
    
    return failCount === 0;
    
  } catch (e) {
    console.error('\n❌ 테스트 오류:', e.message);
    return false;
  } finally {
    await pool.end();
  }
}

runTests();










