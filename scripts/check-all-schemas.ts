import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set');
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    const schemas: any = await pool.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name LIKE 'pfmea_%'
    `);
    
    console.log('FMEA Schemas found:', schemas.rows.map((r: any) => r.schema_name));

    for (const schemaRow of schemas.rows) {
      const schema = schemaRow.schema_name;
      console.log(`\n--- Checking schema: ${schema} ---`);
      
      const tables: any = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = $1
      `, [schema]);
      
      for (const tableRow of tables.rows) {
        const table = tableRow.table_name;
        const countRes: any = await pool.query(`SELECT COUNT(*) FROM "${schema}"."${table}"`);
        console.log(`Table "${table}" has ${countRes.rows[0].count} rows.`);
      }
    }

  } catch (e) {
    console.error('Error querying DB:', e);
  } finally {
    await pool.end();
  }
}

main();









