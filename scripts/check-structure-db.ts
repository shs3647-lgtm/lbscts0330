import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  console.log('\n=== PUBLIC 스키마 구조분석 데이터 ===\n');
  
  // L2 구조 (공정)
  try {
    const l2 = await pool.query('SELECT id, "fmeaId", no, name FROM public.l2_structures ORDER BY "order"');
    console.log('📋 L2 공정 (' + l2.rows.length + '개):');
    l2.rows.forEach((r: any) => console.log('   [' + r.fmeaId + '] ' + r.no + ' - ' + r.name));
  } catch(e: any) { console.log('   L2 오류:', e.message); }
  
  // L3 구조 (작업요소)
  console.log('');
  try {
    const l3 = await pool.query('SELECT id, "fmeaId", m4, name FROM public.l3_structures ORDER BY "order"');
    console.log('🔧 L3 작업요소 (' + l3.rows.length + '개):');
    l3.rows.forEach((r: any) => console.log('   [' + r.fmeaId + '] ' + r.m4 + ' - ' + r.name));
  } catch(e: any) { console.log('   L3 오류:', e.message); }
  
  // 확정 상태
  console.log('');
  try {
    const conf = await pool.query('SELECT * FROM public.fmea_confirmed_states');
    console.log('✅ 확정 상태 (' + conf.rows.length + '개):');
    conf.rows.forEach((c: any) => {
      console.log('   [' + c.fmeaId + ']');
      console.log('      구조분석: ' + (c.structureConfirmed ? '✅' : '❌'));
      console.log('      기능L1: ' + (c.l1FunctionConfirmed ? '✅' : '❌'));
      console.log('      기능L2: ' + (c.l2FunctionConfirmed ? '✅' : '❌'));
      console.log('      기능L3: ' + (c.l3FunctionConfirmed ? '✅' : '❌'));
    });
  } catch(e: any) { console.log('   확정 상태 오류:', e.message); }
  
  // Legacy 데이터
  console.log('');
  try {
    const legacy = await pool.query('SELECT "fmeaId", version, "updatedAt" FROM public.fmea_legacy_data ORDER BY "updatedAt" DESC');
    console.log('📁 Legacy 데이터 (' + legacy.rows.length + '개):');
    legacy.rows.forEach((r: any) => console.log('   [' + r.fmeaId + '] v' + r.version + ' - ' + r.updatedAt));
  } catch(e: any) { console.log('   Legacy 오류:', e.message); }
  
  await pool.end();
}

check().catch(console.error);

