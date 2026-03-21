/**
 * 프로젝트 PFMEA 스키마만 DROP CASCADE (public 메타는 유지)
 * 사용: dotenv -- node scripts/reset-pfmea-project-schema.mjs pfm26-m100
 */
import pg from 'pg';
import { config } from 'dotenv';

config();

/** project-schema.ts 와 동일 */
function getProjectSchemaName(fmeaId) {
  const base = String(fmeaId || '').trim().toLowerCase();
  const safe = base.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return `pfmea_${safe || 'unknown'}`;
}

const fmeaId = process.argv[2] || 'pfm26-m100';
const safe = getProjectSchemaName(fmeaId);

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL 없음');
  process.exit(1);
}

const client = new pg.Client({ connectionString: url.replace(/\?.*$/, '') });
await client.connect();
try {
  await client.query(`DROP SCHEMA IF EXISTS "${safe.replace(/"/g, '""')}" CASCADE`);
  console.log(`OK: DROP SCHEMA ${safe} CASCADE`);
} finally {
  await client.end();
}
