require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL });
const S = 'pfmea_pfm26_m005';
async function main() {
  const tables = [
    'risk_analyses', 'failure_links', 'failure_effects', 'failure_modes', 'failure_causes',
    'process_product_chars', 'l3_special_chars', 'l3_process_chars', 'l3_work_elements',
    'l3_four_ms', 'l3_process_nos', 'l3_functions', 'l3_structures',
    'l2_special_chars', 'l2_functions', 'l2_process_names', 'l2_process_nos', 'l2_structures',
    'l1_requirements', 'l1_scopes', 'l1_functions', 'l1_structures'
  ];
  for (const t of tables) {
    try { await p.query(`TRUNCATE TABLE "${S}"."${t}" CASCADE`); } catch(e) {}
  }
  console.log('TRUNCATE done');
  await p.end();
}
main();
