/**
 * 프로젝트 스키마에 새 필드(parentId, mergeGroupId, rowSpan, colSpan) 추가
 */
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db'
  });

  const projectSchema = 'pfmea_pfm26_m001';
  
  try {
    console.log(`\n=== ${projectSchema} 스키마 테이블 업데이트 ===\n`);
    
    // 하이브리드 ID 시스템 필드 추가
    const newFields = [
      { name: 'parentId', type: 'TEXT' },
      { name: 'mergeGroupId', type: 'TEXT' },
      { name: 'rowSpan', type: 'INTEGER DEFAULT 1' },
      { name: 'colSpan', type: 'INTEGER DEFAULT 1' },
    ];
    
    // 고장 테이블에 필드 추가
    const tables = [
      'failure_effects', 'failure_modes', 'failure_causes', 'failure_links',
      'l1_structures', 'l2_structures', 'l3_structures',
      'l1_functions', 'l2_functions', 'l3_functions'
    ];
    
    for (const table of tables) {
      console.log(`📋 ${table} 테이블 업데이트...`);
      for (const field of newFields) {
        try {
          await pool.query(`
            ALTER TABLE "${projectSchema}"."${table}" 
            ADD COLUMN IF NOT EXISTS "${field.name}" ${field.type}
          `);
        } catch (e) {
          // 이미 존재하면 무시
        }
      }
    }
    
    // failure_causes에 processCharId 추가
    await pool.query(`
      ALTER TABLE "${projectSchema}"."failure_causes" 
      ADD COLUMN IF NOT EXISTS "processCharId" TEXT
    `);
    
    // failure_links에 새 필드 추가
    const linkFields = ['fmSeq', 'feSeq', 'fcSeq'];
    for (const f of linkFields) {
      await pool.query(`
        ALTER TABLE "${projectSchema}"."failure_links" 
        ADD COLUMN IF NOT EXISTS "${f}" INTEGER
      `);
    }
    const pathFields = ['fmPath', 'fePath', 'fcPath'];
    for (const f of pathFields) {
      await pool.query(`
        ALTER TABLE "${projectSchema}"."failure_links" 
        ADD COLUMN IF NOT EXISTS "${f}" TEXT
      `);
    }
    
    console.log('\n✅ 스키마 업데이트 완료!');
    
    // 이제 데이터 이동
    console.log(`\n=== public → ${projectSchema} 고장 데이터 이동 ===\n`);
    
    const fmeaId = 'PFM26-M001';
    
    // 먼저 프로젝트 스키마의 기존 데이터 삭제
    await pool.query(`DELETE FROM "${projectSchema}"."failure_links" WHERE "fmeaId" = $1`, [fmeaId]);
    await pool.query(`DELETE FROM "${projectSchema}"."failure_causes" WHERE "fmeaId" = $1`, [fmeaId]);
    await pool.query(`DELETE FROM "${projectSchema}"."failure_modes" WHERE "fmeaId" = $1`, [fmeaId]);
    await pool.query(`DELETE FROM "${projectSchema}"."failure_effects" WHERE "fmeaId" = $1`, [fmeaId]);
    
    // 컬럼 이름으로 명시적 이동
    // FailureEffects
    const fe = await pool.query(`SELECT * FROM public."failure_effects" WHERE "fmeaId" = $1`, [fmeaId]);
    for (const row of fe.rows) {
      await pool.query(`
        INSERT INTO "${projectSchema}"."failure_effects" 
        (id, "fmeaId", "l1FuncId", category, effect, severity, "createdAt", "updatedAt", "parentId", "mergeGroupId", "rowSpan", "colSpan")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO NOTHING
      `, [row.id, row.fmeaId, row.l1FuncId, row.category, row.effect, row.severity, row.createdAt, row.updatedAt, row.parentId, row.mergeGroupId, row.rowSpan, row.colSpan]);
    }
    console.log(`✅ FailureEffects: ${fe.rows.length}개`);
    
    // FailureModes
    const fm = await pool.query(`SELECT * FROM public."failure_modes" WHERE "fmeaId" = $1`, [fmeaId]);
    for (const row of fm.rows) {
      await pool.query(`
        INSERT INTO "${projectSchema}"."failure_modes" 
        (id, "fmeaId", "l2FuncId", "l2StructId", "productCharId", mode, "specialChar", "createdAt", "updatedAt", "parentId", "mergeGroupId", "rowSpan", "colSpan")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO NOTHING
      `, [row.id, row.fmeaId, row.l2FuncId, row.l2StructId, row.productCharId, row.mode, row.specialChar, row.createdAt, row.updatedAt, row.parentId, row.mergeGroupId, row.rowSpan, row.colSpan]);
    }
    console.log(`✅ FailureModes: ${fm.rows.length}개`);
    
    // FailureCauses
    const fc = await pool.query(`SELECT * FROM public."failure_causes" WHERE "fmeaId" = $1`, [fmeaId]);
    for (const row of fc.rows) {
      await pool.query(`
        INSERT INTO "${projectSchema}"."failure_causes" 
        (id, "fmeaId", "l3FuncId", "l3StructId", "l2StructId", "processCharId", cause, occurrence, "createdAt", "updatedAt", "parentId", "mergeGroupId", "rowSpan", "colSpan")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) DO NOTHING
      `, [row.id, row.fmeaId, row.l3FuncId, row.l3StructId, row.l2StructId, row.processCharId, row.cause, row.occurrence, row.createdAt, row.updatedAt, row.parentId, row.mergeGroupId, row.rowSpan, row.colSpan]);
    }
    console.log(`✅ FailureCauses: ${fc.rows.length}개`);
    
    // FailureLinks
    const links = await pool.query(`SELECT * FROM public."failure_links" WHERE "fmeaId" = $1`, [fmeaId]);
    for (const row of links.rows) {
      await pool.query(`
        INSERT INTO "${projectSchema}"."failure_links" 
        (id, "fmeaId", "fmId", "feId", "fcId", "createdAt", "updatedAt", "fmSeq", "feSeq", "fcSeq", "fmPath", "fePath", "fcPath", "parentId", "mergeGroupId", "rowSpan", "colSpan")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (id) DO NOTHING
      `, [row.id, row.fmeaId, row.fmId, row.feId, row.fcId, row.createdAt, row.updatedAt, row.fmSeq, row.feSeq, row.fcSeq, row.fmPath, row.fePath, row.fcPath, row.parentId, row.mergeGroupId, row.rowSpan, row.colSpan]);
    }
    console.log(`✅ FailureLinks: ${links.rows.length}개`);
    
    console.log('\n✅ 데이터 이동 완료!');
    
  } catch (e) {
    console.error('오류:', e.message);
    console.error(e.stack);
  } finally {
    await pool.end();
  }
}

main();








