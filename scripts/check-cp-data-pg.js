const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://postgres:postgres@localhost:5432/fmea_db'
});

async function checkCpData() {
  const cpNo = 'cp26-m001';
  console.log(`🔍 [Check DB] cpNo: ${cpNo}`);
  
  const tables = [
    'cp_registrations',
    'cp_cft_members',
    'cp_processes',
    'cp_detectors',
    'cp_control_items',
    'cp_control_methods',
    'cp_reaction_plans'
  ];
  
  for (const table of tables) {
    try {
      const result = await pool.query(`
        SELECT COUNT(*) as count 
        FROM public."${table}" 
        WHERE "cpNo" = $1
      `, [cpNo]);
      
      const count = parseInt(result.rows[0].count, 10);
      console.log(`- ${table}: ${count} rows`);
      
      if (count > 0 && table === 'cp_processes') {
        const samples = await pool.query(`
          SELECT * FROM public."${table}" 
          WHERE "cpNo" = $1
          LIMIT 3
        `, [cpNo]);
        console.log(`  Sample data:`, JSON.stringify(samples.rows, null, 2));
      }
    } catch (err) {
      console.error(`- ${table}: Error - ${err.message}`);
    }
  }
  
  // Also check lowercase just in case
  const lowerCpNo = cpNo.toLowerCase();
  if (lowerCpNo !== cpNo) {
    console.log(`\n🔍 [Check DB] lowerCase cpNo: ${lowerCpNo}`);
    for (const table of tables) {
      try {
        const result = await pool.query(`
          SELECT COUNT(*) as count 
          FROM public."${table}" 
          WHERE "cpNo" = $1
        `, [lowerCpNo]);
        
        const count = parseInt(result.rows[0].count, 10);
        if (count > 0) {
          console.log(`- ${table}: ${count} rows`);
        }
      } catch (err) {}
    }
  }

  await pool.end();
}

checkCpData();
