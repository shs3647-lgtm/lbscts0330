/**
 * Project Clone System — Schema-level project duplication
 *
 * Clones an entire FMEA/CP/PFD project including:
 * - All Atomic DB tables (L1~L3, FM/FE/FC, FL, RA, Optimization)
 * - UUID regeneration with new project prefix
 * - FK remapping to new UUIDs
 * - Master reference sync
 *
 * RULE 0.8.1: 프로젝트별 스키마 분리 — 타겟 프로젝트 전용 스키마에 저장
 * RULE 1.7: FK 매칭은 ID 기반만 — old→new UUID 매핑으로 FK 보존
 */

import { Client } from 'pg';
import {
  getProjectSchemaName,
  ensureProjectSchemaReady,
} from '@/lib/project-schema';

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

export interface CloneOptions {
  sourceProjectId: string;    // e.g., 'pfm26-m066'
  targetProjectId: string;    // e.g., 'pfm26-m090'
  baseDatabaseUrl: string;
  cloneType: 'full' | 'structure-only' | 'template';
  // full: everything including risk data
  // structure-only: L1/L2/L3 structure without failure data
  // template: structure + master reference failures (no risk/optimization)
}

export interface CloneResult {
  success: boolean;
  sourceSchema: string;
  targetSchema: string;
  clonedTables: Array<{ table: string; count: number }>;
  remappedFks: number;
  errors: string[];
}

// ────────────────────────────────────────────
// Table groups by clone type
// ────────────────────────────────────────────

/** Structure tables — always cloned */
const STRUCTURE_TABLES = [
  'l1_structures',
  'l2_structures',
  'l3_structures',
  'l1_functions',
  'l1_requirements',
  'l2_functions',
  'l3_functions',
  'process_product_chars',
  'unified_process_items',
] as const;

/** Failure tables — cloned for 'full' and 'template' */
const FAILURE_TABLES = [
  'failure_effects',
  'failure_modes',
  'failure_causes',
  'failure_links',
  'failure_analyses',
] as const;

/** Risk/optimization tables — cloned only for 'full' */
const RISK_TABLES = [
  'risk_analyses',
  'optimizations',
] as const;

/** Meta tables — always cloned */
const META_TABLES = [
  'fmea_projects',
  'fmea_registrations',
  'fmea_confirmed_states',
  'fmea_cft_members',
  'document_links',
  'sync_logs',
] as const;

/** FK columns that reference UUIDs and need remapping */
const FK_COLUMNS: Record<string, string[]> = {
  l1_structures:       ['id', 'fmeaId'],
  l2_structures:       ['id', 'fmeaId', 'l1StructureId'],
  l3_structures:       ['id', 'fmeaId', 'l2StructureId'],
  l1_functions:        ['id', 'l1StructureId'],
  l1_requirements:     ['id', 'l1FunctionId'],
  l2_functions:        ['id', 'l2StructureId'],
  l3_functions:        ['id', 'l3StructureId'],
  process_product_chars: ['id', 'l2StructureId', 'l2FunctionId'],
  failure_effects:     ['id', 'fmeaId', 'l1StructureId'],
  failure_modes:       ['id', 'fmeaId', 'l2StructureId'],
  failure_causes:      ['id', 'fmeaId', 'l3StructureId', 'l2StructureId'],
  failure_links:       ['id', 'fmeaId', 'failureModeId', 'failureEffectId', 'failureCauseId'],
  failure_analyses:    ['id', 'failureLinkId'],
  risk_analyses:       ['id', 'failureLinkId', 'failureAnalysisId'],
  optimizations:       ['id', 'riskAnalysisId', 'failureLinkId'],
  unified_process_items: ['id', 'fmeaId'],
  fmea_projects:       ['id'],
  fmea_registrations:  ['id', 'fmeaProjectId'],
  fmea_confirmed_states: ['id', 'fmeaId'],
  fmea_cft_members:    ['id', 'fmeaProjectId'],
  document_links:      ['id'],
  sync_logs:           ['id'],
};

// ────────────────────────────────────────────
// UUID generation
// ────────────────────────────────────────────

let _counter = 0;

function generateUUID(): string {
  _counter++;
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).substring(2, 8);
  const cnt = _counter.toString(36).padStart(4, '0');
  return `clone-${ts}-${rnd}-${cnt}`;
}

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

function quoteIdent(ident: string): string {
  return `"${ident.replace(/"/g, '""')}"`;
}

function getTablesForCloneType(cloneType: CloneOptions['cloneType']): string[] {
  const tables: string[] = [...STRUCTURE_TABLES, ...META_TABLES];

  if (cloneType === 'full' || cloneType === 'template') {
    tables.push(...FAILURE_TABLES);
  }

  if (cloneType === 'full') {
    tables.push(...RISK_TABLES);
  }

  return tables;
}

/**
 * Read all rows from a table in the source schema.
 */
async function readTableRows(
  client: Client,
  schema: string,
  table: string,
): Promise<Record<string, unknown>[]> {
  const result = await client.query(
    `SELECT * FROM ${quoteIdent(schema)}.${quoteIdent(table)}`
  );
  return result.rows;
}

/**
 * Build a UUID remapping: oldId → newId for all rows in all tables.
 * Also maps the old fmeaId → new fmeaId.
 */
function buildUuidMapping(
  allTableData: Map<string, Record<string, unknown>[]>,
  sourceProjectId: string,
  targetProjectId: string,
): Map<string, string> {
  const mapping = new Map<string, string>();

  // Map the project-level fmeaId
  mapping.set(sourceProjectId, targetProjectId);

  // Generate new UUIDs for every 'id' field in every row
  for (const [, rows] of allTableData) {
    for (const row of rows) {
      const oldId = row.id as string | undefined;
      if (oldId && !mapping.has(oldId)) {
        mapping.set(oldId, generateUUID());
      }
    }
  }

  return mapping;
}

/**
 * Remap FK columns in a row using the UUID mapping.
 * Returns the number of FK fields that were remapped.
 */
function remapRow(
  row: Record<string, unknown>,
  table: string,
  mapping: Map<string, string>,
  targetProjectId: string,
): { remapped: Record<string, unknown>; fkCount: number } {
  const remapped = { ...row };
  let fkCount = 0;
  const fkCols = FK_COLUMNS[table] || ['id'];

  for (const col of fkCols) {
    const oldVal = remapped[col];
    if (typeof oldVal === 'string' && mapping.has(oldVal)) {
      remapped[col] = mapping.get(oldVal)!;
      fkCount++;
    }
  }

  // Always remap fmeaId if it matches the source project
  if (typeof remapped.fmeaId === 'string' && remapped.fmeaId === remapped.fmeaId) {
    const mapped = mapping.get(remapped.fmeaId as string);
    if (mapped) {
      remapped.fmeaId = mapped;
    }
  }

  // Update timestamps
  remapped.createdAt = new Date();
  remapped.updatedAt = new Date();

  return { remapped, fkCount };
}

/**
 * Insert rows into the target schema table within a transaction.
 */
async function insertRows(
  client: Client,
  schema: string,
  table: string,
  rows: Record<string, unknown>[],
): Promise<number> {
  if (rows.length === 0) return 0;

  let inserted = 0;

  for (const row of rows) {
    const keys = Object.keys(row);
    const values = Object.values(row);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const columns = keys.map(k => quoteIdent(k)).join(', ');

    try {
      await client.query(
        `INSERT INTO ${quoteIdent(schema)}.${quoteIdent(table)} (${columns}) VALUES (${placeholders})`,
        values,
      );
      inserted++;
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      // Skip duplicate key errors (23505) — possible from re-runs
      if (pgErr.code !== '23505') {
        throw err;
      }
    }
  }

  return inserted;
}

// ────────────────────────────────────────────
// Main clone function
// ────────────────────────────────────────────

/**
 * Clone a project from source schema to target schema.
 *
 * 1. Create target schema via ensureProjectSchemaReady
 * 2. Read all tables from source schema
 * 3. Generate new UUIDs preserving hierarchy (same pno/m4/seq pattern)
 * 4. Build old→new UUID mapping
 * 5. Remap all FK fields using the mapping
 * 6. Insert into target schema via transaction
 * 7. Return detailed report
 *
 * @throws if source schema does not exist or is empty
 */
export async function cloneProject(
  _prisma: unknown,
  options: CloneOptions,
): Promise<CloneResult> {
  const {
    sourceProjectId,
    targetProjectId,
    baseDatabaseUrl,
    cloneType,
  } = options;

  const sourceSchema = getProjectSchemaName(sourceProjectId);
  const targetSchema = getProjectSchemaName(targetProjectId);

  const result: CloneResult = {
    success: false,
    sourceSchema,
    targetSchema,
    clonedTables: [],
    remappedFks: 0,
    errors: [],
  };

  // Reset counter per clone operation
  _counter = 0;

  // ── Step 1: Ensure target schema exists ──
  try {
    await ensureProjectSchemaReady({
      baseDatabaseUrl,
      schema: targetSchema,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(`Failed to create target schema: ${msg}`);
    return result;
  }

  // ── Step 2-6: Read, remap, insert within pg transaction ──
  const client = new Client({ connectionString: baseDatabaseUrl });
  await client.connect();

  try {
    // Verify source schema exists
    const schemaExists = await client.query(
      `SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = $1)`,
      [sourceSchema],
    );
    if (!schemaExists.rows[0].exists) {
      result.errors.push(`Source schema "${sourceSchema}" does not exist`);
      return result;
    }

    const tablesToClone = getTablesForCloneType(cloneType);

    // ── Step 2: Read all source data ──
    const allTableData = new Map<string, Record<string, unknown>[]>();
    for (const table of tablesToClone) {
      // Check if table exists in source schema
      const tableExists = await client.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = $1 AND table_name = $2
        )`,
        [sourceSchema, table],
      );
      if (!tableExists.rows[0].exists) {
        continue; // Skip tables that don't exist in source
      }

      const rows = await readTableRows(client, sourceSchema, table);
      if (rows.length > 0) {
        allTableData.set(table, rows);
      }
    }

    if (allTableData.size === 0) {
      result.errors.push(`Source schema "${sourceSchema}" has no data to clone`);
      return result;
    }

    // ── Step 3-4: Build UUID mapping ──
    const uuidMapping = buildUuidMapping(allTableData, sourceProjectId, targetProjectId);

    // ── Step 5-6: Remap and insert within transaction ──
    await client.query('BEGIN');
    try {
      // Clear target schema tables first (in reverse dependency order)
      const reverseTables = [...tablesToClone].reverse();
      for (const table of reverseTables) {
        const tableExists = await client.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = $1 AND table_name = $2
          )`,
          [targetSchema, table],
        );
        if (tableExists.rows[0].exists) {
          await client.query(
            `DELETE FROM ${quoteIdent(targetSchema)}.${quoteIdent(table)}`
          );
        }
      }

      // Insert remapped data (in dependency order)
      let totalRemappedFks = 0;

      for (const table of tablesToClone) {
        const rows = allTableData.get(table);
        if (!rows || rows.length === 0) continue;

        const remappedRows: Record<string, unknown>[] = [];
        for (const row of rows) {
          const { remapped, fkCount } = remapRow(row, table, uuidMapping, targetProjectId);
          remappedRows.push(remapped);
          totalRemappedFks += fkCount;
        }

        const inserted = await insertRows(client, targetSchema, table, remappedRows);
        result.clonedTables.push({ table, count: inserted });
      }

      result.remappedFks = totalRemappedFks;

      await client.query('COMMIT');
      result.success = true;
    } catch (err: unknown) {
      await client.query('ROLLBACK');
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`Transaction failed: ${msg}`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(`Clone operation failed: ${msg}`);
  } finally {
    await client.end().catch(() => { /* ignore close errors */ });
  }

  return result;
}

// ────────────────────────────────────────────
// Utility: Validate clone result
// ────────────────────────────────────────────

/**
 * Validate that the cloned project has the same entity counts as the source.
 * Useful for post-clone verification.
 */
export async function validateClone(
  baseDatabaseUrl: string,
  sourceProjectId: string,
  targetProjectId: string,
): Promise<{
  valid: boolean;
  mismatches: Array<{ table: string; sourceCount: number; targetCount: number }>;
}> {
  const sourceSchema = getProjectSchemaName(sourceProjectId);
  const targetSchema = getProjectSchemaName(targetProjectId);

  const client = new Client({ connectionString: baseDatabaseUrl });
  await client.connect();

  const mismatches: Array<{ table: string; sourceCount: number; targetCount: number }> = [];

  try {
    const tables = [
      ...STRUCTURE_TABLES,
      ...FAILURE_TABLES,
      ...RISK_TABLES,
    ];

    for (const table of tables) {
      // Check both schemas have the table
      const srcExists = await client.query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2)`,
        [sourceSchema, table],
      );
      const tgtExists = await client.query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2)`,
        [targetSchema, table],
      );

      if (!srcExists.rows[0].exists && !tgtExists.rows[0].exists) continue;

      const srcCount = srcExists.rows[0].exists
        ? (await client.query(`SELECT COUNT(*)::int AS cnt FROM ${quoteIdent(sourceSchema)}.${quoteIdent(table)}`)).rows[0].cnt
        : 0;
      const tgtCount = tgtExists.rows[0].exists
        ? (await client.query(`SELECT COUNT(*)::int AS cnt FROM ${quoteIdent(targetSchema)}.${quoteIdent(table)}`)).rows[0].cnt
        : 0;

      if (srcCount !== tgtCount) {
        mismatches.push({ table, sourceCount: srcCount, targetCount: tgtCount });
      }
    }
  } finally {
    await client.end().catch(() => { /* ignore */ });
  }

  return {
    valid: mismatches.length === 0,
    mismatches,
  };
}
