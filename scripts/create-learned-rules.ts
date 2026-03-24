import pg from 'pg';
const pool = new pg.Pool({ host:'localhost', port:5432, user:'postgres', password:'1234', database:'fmea_db' });

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.learned_rules (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      rule_type   VARCHAR(10) NOT NULL,
      input_text  TEXT NOT NULL,
      output_text TEXT NOT NULL,
      m4_code     VARCHAR(4),
      sod_value   INTEGER,
      confidence  INTEGER DEFAULT 100,
      use_count   INTEGER DEFAULT 1,
      source_fmea VARCHAR(100),
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_learned_rules_type ON public.learned_rules(rule_type)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_learned_rules_input ON public.learned_rules(input_text)`);
  const { rows } = await pool.query(`SELECT count(*) as c FROM public.learned_rules`);
  console.log('OK learned_rules rows:', rows[0].c);
  await pool.end();
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
