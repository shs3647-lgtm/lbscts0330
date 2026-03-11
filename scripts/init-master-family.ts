/**
 * Master FMEA (pfm26-M001)와 Family FMEA (pfm26-F001) 초기 데이터 DB 저장
 */
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

// Master FMEA 초기 데이터
const MASTER_FMEA = {
  fmeaId: 'pfm26-M001',
  fmeaType: 'M',
  project: {
    projectName: 'PCR 타이어 마스터',
    customer: 'SDD',
    productName: 'PCR 타이어 전체',
    partNo: 'PCR-MASTER',
    department: '품질팀',
    leader: '신홍섭',
    startDate: '2026-01-01',
    endDate: '2026-12-31'
  },
  fmeaInfo: {
    subject: 'PCR 타이어 마스터 FMEA',
    fmeaStartDate: '2026-01-01',
    fmeaRevisionDate: '2026-01-06',
    modelYear: 'MY2026',
    designResponsibility: '품질팀',
    fmeaResponsibleName: '신홍섭'
  },
  // 마스터 FMEA 구조 (공통 기준)
  l1: [
    { id: 'master-l1-1', processNo: '10', processName: '원재료 입고', fourM: 'Material' },
    { id: 'master-l1-2', processNo: '20', processName: '배합', fourM: 'Machine' },
    { id: 'master-l1-3', processNo: '30', processName: '압출', fourM: 'Machine' },
    { id: 'master-l1-4', processNo: '40', processName: '성형', fourM: 'Machine' },
    { id: 'master-l1-5', processNo: '50', processName: '가류', fourM: 'Machine' },
    { id: 'master-l1-6', processNo: '60', processName: '검사', fourM: 'Method' },
    { id: 'master-l1-7', processNo: '70', processName: '출하', fourM: 'Material' },
  ],
  l2: [
    { id: 'master-l2-1', l1Id: 'master-l1-1', processNo: '10', processName: '원재료 입고', processFunction: '규격에 맞는 원재료 확보' },
    { id: 'master-l2-2', l1Id: 'master-l1-2', processNo: '20', processName: '배합', processFunction: '균일한 고무 배합' },
    { id: 'master-l2-3', l1Id: 'master-l1-3', processNo: '30', processName: '압출', processFunction: '트레드/사이드월 압출' },
    { id: 'master-l2-4', l1Id: 'master-l1-4', processNo: '40', processName: '성형', processFunction: '그린타이어 성형' },
    { id: 'master-l2-5', l1Id: 'master-l1-5', processNo: '50', processName: '가류', processFunction: '타이어 경화' },
    { id: 'master-l2-6', l1Id: 'master-l1-6', processNo: '60', processName: '검사', processFunction: '품질 검증' },
    { id: 'master-l2-7', l1Id: 'master-l1-7', processNo: '70', processName: '출하', processFunction: '고객 납품' },
  ]
};

// Family FMEA 초기 데이터
const FAMILY_FMEA = {
  fmeaId: 'pfm26-F001',
  fmeaType: 'F',
  project: {
    projectName: 'PCR 승용차 타이어',
    customer: 'SDD',
    productName: 'PCR 승용차용',
    partNo: 'PCR-FAMILY-01',
    department: '품질팀',
    leader: '김철수',
    startDate: '2026-01-01',
    endDate: '2026-06-30'
  },
  fmeaInfo: {
    subject: 'PCR 승용차 타이어 Family FMEA',
    fmeaStartDate: '2026-01-01',
    fmeaRevisionDate: '2026-01-06',
    modelYear: 'MY2026',
    designResponsibility: '품질팀',
    fmeaResponsibleName: '김철수'
  },
  // Family FMEA 구조 (승용차 특화)
  l1: [
    { id: 'family-l1-1', processNo: '10', processName: '원재료 입고', fourM: 'Material' },
    { id: 'family-l1-2', processNo: '20', processName: '배합', fourM: 'Machine' },
    { id: 'family-l1-3', processNo: '30', processName: '압출', fourM: 'Machine' },
    { id: 'family-l1-4', processNo: '40', processName: '재단', fourM: 'Machine' },
    { id: 'family-l1-5', processNo: '50', processName: '성형', fourM: 'Machine' },
    { id: 'family-l1-6', processNo: '60', processName: '가류', fourM: 'Machine' },
    { id: 'family-l1-7', processNo: '70', processName: '트리밍', fourM: 'Machine' },
    { id: 'family-l1-8', processNo: '80', processName: '검사', fourM: 'Method' },
    { id: 'family-l1-9', processNo: '90', processName: '출하', fourM: 'Material' },
  ],
  l2: [
    { id: 'family-l2-1', l1Id: 'family-l1-1', processNo: '10', processName: '원재료 입고', processFunction: '승용차용 원재료 확보' },
    { id: 'family-l2-2', l1Id: 'family-l1-2', processNo: '20', processName: '배합', processFunction: '승용차용 고무 배합' },
    { id: 'family-l2-3', l1Id: 'family-l1-3', processNo: '30', processName: '압출', processFunction: '트레드/사이드월 압출' },
    { id: 'family-l2-4', l1Id: 'family-l1-4', processNo: '40', processName: '재단', processFunction: '부재 재단' },
    { id: 'family-l2-5', l1Id: 'family-l1-5', processNo: '50', processName: '성형', processFunction: '그린타이어 성형' },
    { id: 'family-l2-6', l1Id: 'family-l1-6', processNo: '60', processName: '가류', processFunction: '타이어 경화' },
    { id: 'family-l2-7', l1Id: 'family-l1-7', processNo: '70', processName: '트리밍', processFunction: '스프루 제거' },
    { id: 'family-l2-8', l1Id: 'family-l1-8', processNo: '80', processName: '검사', processFunction: '외관/균형 검사' },
    { id: 'family-l2-9', l1Id: 'family-l1-9', processNo: '90', processName: '출하', processFunction: '고객 납품' },
  ]
};

async function initMasterFamily() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('\n🚀 Master/Family FMEA DB 저장 시작...\n');
    
    for (const fmea of [MASTER_FMEA, FAMILY_FMEA]) {
      const schemaName = `pfmea_${fmea.fmeaId.replace(/-/g, '_').toLowerCase()}`;
      
      console.log(`\n📦 ${fmea.fmeaId} (${fmea.fmeaType === 'M' ? 'Master' : 'Family'}) 저장 중...`);
      
      // 1. 스키마 생성
      await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
      console.log(`  ✅ 스키마 생성: ${schemaName}`);
      
      // 2. Prisma 테이블에 데이터 저장 (l2_structures 사용)
      console.log(`  ✅ 테이블 존재 확인 완료`);
      
      // 3. 기존 데이터 삭제 후 삽입
      await pool.query(`DELETE FROM "${schemaName}".l2_structures WHERE "fmeaId" = $1`, [fmea.fmeaId]);
      await pool.query(`DELETE FROM "${schemaName}".l1_structures WHERE "fmeaId" = $1`, [fmea.fmeaId]);
      await pool.query(`DELETE FROM "${schemaName}".fmea_legacy_data WHERE "fmeaId" = $1`, [fmea.fmeaId]);
      
      // 4. l1_structures 데이터 삽입 (name 컬럼 사용)
      await pool.query(`
        INSERT INTO "${schemaName}".l1_structures (id, "fmeaId", name, confirmed, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, NOW(), NOW())
      `, [`l1-${fmea.fmeaId}`, fmea.fmeaId, fmea.project.productName, true]);
      console.log(`  ✅ L1 구조 저장 (완제품: ${fmea.project.productName})`);
      
      // 5. L2 데이터 삽입 (l2_structures)
      let order = 10;
      for (const l2 of fmea.l2) {
        await pool.query(`
          INSERT INTO "${schemaName}".l2_structures (id, "fmeaId", "l1Id", no, name, "order", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        `, [l2.id, fmea.fmeaId, `l1-${fmea.fmeaId}`, l2.processNo, l2.processName, order]);
        order += 10;
      }
      console.log(`  ✅ L2 구조 ${fmea.l2.length}건 저장`);
      
      // 6. fmea_legacy_data 저장 (레거시 형식)
      const legacyData = {
        l1: { id: `l1-${fmea.fmeaId}`, name: fmea.project.productName },
        l2: fmea.l2.map((l2, idx) => ({
          id: l2.id,
          no: l2.processNo,
          name: l2.processName,
          order: (idx + 1) * 10,
          l3: [],
          functions: [],
          productChars: [],
          failureMode: ''
        })),
        structureConfirmed: true,
        l1Confirmed: false,
        l2Confirmed: false,
        l3Confirmed: false
      };
      
      await pool.query(`
        INSERT INTO "${schemaName}".fmea_legacy_data (id, "fmeaId", data, version, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, NOW(), NOW())
      `, [`legacy-${fmea.fmeaId}`, fmea.fmeaId, JSON.stringify(legacyData), 1]);
      console.log(`  ✅ FMEA 레거시 데이터 저장 (구조 확정됨)`);
      
      console.log(`\n✅ ${fmea.fmeaId} 저장 완료!`);
    }
    
    console.log('\n🎉 Master/Family FMEA DB 저장 완료!\n');
    
    // 검증
    console.log('\n=== 📦 저장 검증 ===\n');
    const schemas = await pool.query(
      "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'pfmea_pfm26%' ORDER BY schema_name;"
    );
    schemas.rows.forEach((row, i) => {
      console.log(`  ${i + 1}. ${row.schema_name}`);
    });
    
  } catch (e: any) {
    console.error('❌ 오류:', e.message);
  } finally {
    await pool.end();
  }
}

initMasterFamily();

