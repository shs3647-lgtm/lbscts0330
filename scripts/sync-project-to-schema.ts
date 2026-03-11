import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { ensureProjectSchemaReady, getProjectSchemaName } from '../src/lib/project-schema';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function main() {
  const fmeaId = 'PFM26-M001';
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    console.error('DATABASE_URL not set');
    return;
  }

  const schema = getProjectSchemaName(fmeaId);
  console.log(`Targeting schema: ${schema} for FMEA ID: ${fmeaId}`);

  // 1. Ensure schema and tables exist
  await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
  console.log(`Schema ${schema} is ready with all tables.`);

  const client = new Client({ connectionString: baseUrl });
  await client.connect();

  try {
    // 2. Copy fmea_projects
    console.log(`Copying fmea_projects for ${fmeaId}...`);
    await client.query(`
      INSERT INTO "${schema}"."fmea_projects" 
      SELECT * FROM "public"."fmea_projects" 
      WHERE "fmeaId" = $1
      ON CONFLICT ("id") DO NOTHING
    `, [fmeaId]);

    // 3. Copy fmea_registrations
    console.log(`Copying fmea_registrations for ${fmeaId}...`);
    await client.query(`
      INSERT INTO "${schema}"."fmea_registrations" 
      SELECT * FROM "public"."fmea_registrations" 
      WHERE "fmeaId" = $1
      ON CONFLICT ("id") DO NOTHING
    `, [fmeaId]);

    // 4. Copy fmea_cft_members
    console.log(`Copying fmea_cft_members for ${fmeaId}...`);
    await client.query(`
      INSERT INTO "${schema}"."fmea_cft_members" 
      SELECT * FROM "public"."fmea_cft_members" 
      WHERE "fmeaId" = $1
      ON CONFLICT ("id") DO NOTHING
    `, [fmeaId]);

    // 5. Copy fmea_legacy_data
    console.log(`Copying fmea_legacy_data for ${fmeaId}...`);
    await client.query(`
      INSERT INTO "${schema}"."fmea_legacy_data" 
      SELECT * FROM "public"."fmea_legacy_data" 
      WHERE "fmeaId" = $1
      ON CONFLICT ("fmeaId") DO NOTHING
    `, [fmeaId]);

    console.log('Successfully copied all project info to the project schema.');

  } catch (e) {
    console.error('Error during data copy:', e);
  } finally {
    await client.end();
  }
}

main();









