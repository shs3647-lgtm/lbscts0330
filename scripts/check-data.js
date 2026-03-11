const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fmea_db' });

(async () => {
  try {
    const result = await pool.query(`SELECT "fmeaId", LEFT("legacyData"::text, 300) as preview FROM pfmea_pfm26_m001."FmeaLegacyData"`);
    console.log('FmeaLegacyData:');
    console.log(JSON.stringify(result.rows, null, 2));
    
    const result2 = await pool.query(`SELECT "fmeaId", project, "fmeaInfo" FROM pfmea_pfm26_m001."FmeaInfo"`);
    console.log('\nFmeaInfo:');
    console.log(JSON.stringify(result2.rows, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
})();











