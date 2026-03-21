/**
 * Undo/Redo System — DB-persistent change stack
 *
 * Each edit creates a reversible change entry stored in a DB table.
 * Supports Ctrl+Z (undo) and Ctrl+Y (redo).
 * Changes survive browser refresh (DB-backed).
 *
 * Architecture:
 * - Uses a pointer-based stack: entries are never deleted on undo,
 *   only a pointer moves backward/forward.
 * - When a new change is recorded after an undo, all redo entries
 *   beyond the pointer are pruned.
 * - Group support: multi-cell paste operations share a groupId
 *   and are undone/redone together.
 * - Max history: configurable (default 200 entries per project),
 *   oldest entries are auto-cleaned.
 *
 * RULE 0.8.1: 프로젝트 스키마에 저장 — public에 직접 저장 금지
 * RULE 7: DB 원자성 보장 — 모든 변경은 트랜잭션 래핑
 */

import { Client } from 'pg';

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

export interface ChangeEntry {
  id: string;
  projectId: string;
  tableName: string;
  recordId: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  timestamp: number;
  groupId?: string;   // group related changes (e.g., multi-cell paste)
}

export interface UndoResult {
  success: boolean;
  undone: ChangeEntry[];
  canUndo: boolean;
  canRedo: boolean;
}

export interface RedoResult {
  success: boolean;
  redone: ChangeEntry[];
  canUndo: boolean;
  canRedo: boolean;
}

export interface UndoRedoState {
  undoCount: number;
  redoCount: number;
  canUndo: boolean;
  canRedo: boolean;
}

export interface UndoRedoService {
  /** Record a single change (called on every cell edit) */
  record(entry: Omit<ChangeEntry, 'id' | 'timestamp'>): Promise<void>;

  /** Record multiple changes as a batch (optionally grouped) */
  recordBatch(
    entries: Array<Omit<ChangeEntry, 'id' | 'timestamp'>>,
    groupId?: string,
  ): Promise<void>;

  /** Undo last change (or group of changes) */
  undo(projectId: string): Promise<UndoResult>;

  /** Redo last undone change (or group of changes) */
  redo(projectId: string): Promise<RedoResult>;

  /** Get current undo/redo state */
  getState(projectId: string): Promise<UndoRedoState>;

  /** Clear all history for a project */
  clear(projectId: string): Promise<void>;
}

// ────────────────────────────────────────────
// Internal: table/column names
// ────────────────────────────────────────────

const STACK_TABLE = '_undo_redo_stack';
const POINTER_TABLE = '_undo_redo_pointer';

// ────────────────────────────────────────────
// UUID generation
// ────────────────────────────────────────────

let _seq = 0;

function uid(): string {
  _seq++;
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).substring(2, 8);
  const s = _seq.toString(36).padStart(4, '0');
  return `ur-${ts}-${rnd}-${s}`;
}

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

function quoteIdent(ident: string): string {
  return `"${ident.replace(/"/g, '""')}"`;
}

/**
 * Ensure the undo/redo tables exist in the given schema.
 * Creates them if they don't exist.
 */
async function ensureTables(client: Client, schema: string): Promise<void> {
  const sq = quoteIdent(schema);

  await client.query(`
    CREATE TABLE IF NOT EXISTS ${sq}.${quoteIdent(STACK_TABLE)} (
      "id"          TEXT PRIMARY KEY,
      "projectId"   TEXT NOT NULL,
      "tableName"   TEXT NOT NULL,
      "recordId"    TEXT NOT NULL,
      "fieldName"   TEXT NOT NULL,
      "oldValue"    TEXT,
      "newValue"    TEXT,
      "timestamp"   BIGINT NOT NULL,
      "groupId"     TEXT,
      "seq"         SERIAL
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_undo_stack_project_seq
    ON ${sq}.${quoteIdent(STACK_TABLE)} ("projectId", "seq")
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS ${sq}.${quoteIdent(POINTER_TABLE)} (
      "projectId"   TEXT PRIMARY KEY,
      "pointerSeq"  INT NOT NULL DEFAULT 0
    )
  `);
}

/**
 * Get the current pointer position for a project.
 * Returns 0 if no pointer exists (start of history).
 */
async function getPointer(
  client: Client,
  schema: string,
  projectId: string,
): Promise<number> {
  const sq = quoteIdent(schema);
  const res = await client.query(
    `SELECT "pointerSeq" FROM ${sq}.${quoteIdent(POINTER_TABLE)} WHERE "projectId" = $1`,
    [projectId],
  );
  if (res.rows.length === 0) return 0;
  return res.rows[0].pointerSeq as number;
}

/**
 * Set the pointer position for a project.
 */
async function setPointer(
  client: Client,
  schema: string,
  projectId: string,
  seq: number,
): Promise<void> {
  const sq = quoteIdent(schema);
  await client.query(
    `INSERT INTO ${sq}.${quoteIdent(POINTER_TABLE)} ("projectId", "pointerSeq")
     VALUES ($1, $2)
     ON CONFLICT ("projectId") DO UPDATE SET "pointerSeq" = $2`,
    [projectId, seq],
  );
}

/**
 * Get the max seq in the stack for a project.
 */
async function getMaxSeq(
  client: Client,
  schema: string,
  projectId: string,
): Promise<number> {
  const sq = quoteIdent(schema);
  const res = await client.query(
    `SELECT COALESCE(MAX("seq"), 0)::int AS max_seq
     FROM ${sq}.${quoteIdent(STACK_TABLE)}
     WHERE "projectId" = $1`,
    [projectId],
  );
  return res.rows[0].max_seq as number;
}

/**
 * Prune entries beyond pointer (redo entries that are invalidated by a new edit).
 */
async function pruneAfterPointer(
  client: Client,
  schema: string,
  projectId: string,
  pointerSeq: number,
): Promise<void> {
  const sq = quoteIdent(schema);
  await client.query(
    `DELETE FROM ${sq}.${quoteIdent(STACK_TABLE)}
     WHERE "projectId" = $1 AND "seq" > $2`,
    [projectId, pointerSeq],
  );
}

/**
 * Auto-cleanup: keep only the last `maxHistory` entries for a project.
 */
async function autoCleanup(
  client: Client,
  schema: string,
  projectId: string,
  maxHistory: number,
): Promise<void> {
  const sq = quoteIdent(schema);
  const count = await client.query(
    `SELECT COUNT(*)::int AS cnt FROM ${sq}.${quoteIdent(STACK_TABLE)} WHERE "projectId" = $1`,
    [projectId],
  );
  const total = count.rows[0].cnt as number;

  if (total <= maxHistory) return;

  const excess = total - maxHistory;
  await client.query(
    `DELETE FROM ${sq}.${quoteIdent(STACK_TABLE)}
     WHERE "id" IN (
       SELECT "id" FROM ${sq}.${quoteIdent(STACK_TABLE)}
       WHERE "projectId" = $1
       ORDER BY "seq" ASC
       LIMIT $2
     )`,
    [projectId, excess],
  );
}

/**
 * Apply a change to the actual data table (for undo or redo).
 */
async function applyChange(
  client: Client,
  schema: string,
  tableName: string,
  recordId: string,
  fieldName: string,
  value: string | null,
): Promise<void> {
  const sq = quoteIdent(schema);
  await client.query(
    `UPDATE ${sq}.${quoteIdent(tableName)}
     SET ${quoteIdent(fieldName)} = $1, "updatedAt" = NOW()
     WHERE "id" = $2`,
    [value, recordId],
  );
}

/**
 * Convert a DB row to a ChangeEntry.
 */
function rowToEntry(row: Record<string, unknown>): ChangeEntry {
  return {
    id: row.id as string,
    projectId: row.projectId as string,
    tableName: row.tableName as string,
    recordId: row.recordId as string,
    fieldName: row.fieldName as string,
    oldValue: (row.oldValue as string) ?? null,
    newValue: (row.newValue as string) ?? null,
    timestamp: Number(row.timestamp),
    groupId: (row.groupId as string) || undefined,
  };
}

// ────────────────────────────────────────────
// Factory
// ────────────────────────────────────────────

/**
 * Create an UndoRedoService backed by a PostgreSQL schema.
 *
 * @param connectionString - PostgreSQL connection string
 * @param schema - Project schema name (e.g., 'pfmea_pfm26_m066')
 * @param maxHistory - Maximum entries per project (default 200)
 */
export function createUndoRedoService(
  connectionString: string,
  schema: string,
  maxHistory: number = 200,
): UndoRedoService {
  let _initialized = false;

  async function withClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
    const client = new Client({ connectionString });
    await client.connect();
    try {
      if (!_initialized) {
        await ensureTables(client, schema);
        _initialized = true;
      }
      return await fn(client);
    } finally {
      await client.end().catch(() => { /* ignore close errors */ });
    }
  }

  const service: UndoRedoService = {
    // ── record ──
    async record(entry) {
      await withClient(async (client) => {
        const pointer = await getPointer(client, schema, entry.projectId);

        // Prune any redo entries beyond current pointer
        if (pointer > 0) {
          await pruneAfterPointer(client, schema, entry.projectId, pointer);
        }

        const id = uid();
        const now = Date.now();
        const sq = quoteIdent(schema);

        await client.query(
          `INSERT INTO ${sq}.${quoteIdent(STACK_TABLE)}
           ("id", "projectId", "tableName", "recordId", "fieldName", "oldValue", "newValue", "timestamp", "groupId")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            id,
            entry.projectId,
            entry.tableName,
            entry.recordId,
            entry.fieldName,
            entry.oldValue ?? null,
            entry.newValue ?? null,
            now,
            entry.groupId ?? null,
          ],
        );

        // Update pointer to new max
        const newMax = await getMaxSeq(client, schema, entry.projectId);
        await setPointer(client, schema, entry.projectId, newMax);

        // Auto-cleanup
        await autoCleanup(client, schema, entry.projectId, maxHistory);
      });
    },

    // ── recordBatch ──
    async recordBatch(entries, groupId) {
      if (entries.length === 0) return;

      await withClient(async (client) => {
        const projectId = entries[0].projectId;
        const pointer = await getPointer(client, schema, projectId);

        // Prune redo entries
        if (pointer > 0) {
          await pruneAfterPointer(client, schema, projectId, pointer);
        }

        const batchGroupId = groupId || `batch-${uid()}`;
        const now = Date.now();
        const sq = quoteIdent(schema);

        await client.query('BEGIN');
        try {
          for (const entry of entries) {
            const id = uid();
            await client.query(
              `INSERT INTO ${sq}.${quoteIdent(STACK_TABLE)}
               ("id", "projectId", "tableName", "recordId", "fieldName", "oldValue", "newValue", "timestamp", "groupId")
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
              [
                id,
                entry.projectId,
                entry.tableName,
                entry.recordId,
                entry.fieldName,
                entry.oldValue ?? null,
                entry.newValue ?? null,
                now,
                entry.groupId || batchGroupId,
              ],
            );
          }
          await client.query('COMMIT');
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        }

        // Update pointer to new max
        const newMax = await getMaxSeq(client, schema, projectId);
        await setPointer(client, schema, projectId, newMax);

        // Auto-cleanup
        await autoCleanup(client, schema, projectId, maxHistory);
      });
    },

    // ── undo ──
    async undo(projectId) {
      return withClient(async (client) => {
        const pointer = await getPointer(client, schema, projectId);
        const sq = quoteIdent(schema);

        if (pointer <= 0) {
          return {
            success: false,
            undone: [],
            canUndo: false,
            canRedo: false,
          };
        }

        // Get the entry at the current pointer
        const currentRes = await client.query(
          `SELECT * FROM ${sq}.${quoteIdent(STACK_TABLE)}
           WHERE "projectId" = $1 AND "seq" = $2`,
          [projectId, pointer],
        );

        if (currentRes.rows.length === 0) {
          return {
            success: false,
            undone: [],
            canUndo: false,
            canRedo: await getMaxSeq(client, schema, projectId) > 0,
          };
        }

        const currentEntry = currentRes.rows[0];
        const groupId = currentEntry.groupId as string | null;

        let entriesToUndo: Record<string, unknown>[];

        if (groupId) {
          // Undo all entries in the same group
          const groupRes = await client.query(
            `SELECT * FROM ${sq}.${quoteIdent(STACK_TABLE)}
             WHERE "projectId" = $1 AND "groupId" = $2 AND "seq" <= $3
             ORDER BY "seq" DESC`,
            [projectId, groupId, pointer],
          );
          entriesToUndo = groupRes.rows;
        } else {
          // Undo single entry
          entriesToUndo = [currentEntry];
        }

        // Apply undo (restore oldValue)
        await client.query('BEGIN');
        try {
          for (const row of entriesToUndo) {
            await applyChange(
              client,
              schema,
              row.tableName as string,
              row.recordId as string,
              row.fieldName as string,
              row.oldValue as string | null,
            );
          }
          await client.query('COMMIT');
        } catch (err) {
          await client.query('ROLLBACK');
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[UndoRedo] undo failed: ${msg}`);
          return {
            success: false,
            undone: [],
            canUndo: pointer > 0,
            canRedo: true,
          };
        }

        // Move pointer back
        const minSeqInGroup = entriesToUndo.length > 0
          ? Math.min(...entriesToUndo.map(r => r.seq as number))
          : pointer;
        const newPointer = minSeqInGroup - 1;
        await setPointer(client, schema, projectId, Math.max(0, newPointer));

        const maxSeq = await getMaxSeq(client, schema, projectId);

        return {
          success: true,
          undone: entriesToUndo.map(rowToEntry),
          canUndo: newPointer > 0,
          canRedo: newPointer < maxSeq,
        };
      });
    },

    // ── redo ──
    async redo(projectId) {
      return withClient(async (client) => {
        const pointer = await getPointer(client, schema, projectId);
        const maxSeq = await getMaxSeq(client, schema, projectId);
        const sq = quoteIdent(schema);

        if (pointer >= maxSeq) {
          return {
            success: false,
            redone: [],
            canUndo: pointer > 0,
            canRedo: false,
          };
        }

        // Get the next entry after the pointer
        const nextRes = await client.query(
          `SELECT * FROM ${sq}.${quoteIdent(STACK_TABLE)}
           WHERE "projectId" = $1 AND "seq" > $2
           ORDER BY "seq" ASC LIMIT 1`,
          [projectId, pointer],
        );

        if (nextRes.rows.length === 0) {
          return {
            success: false,
            redone: [],
            canUndo: pointer > 0,
            canRedo: false,
          };
        }

        const nextEntry = nextRes.rows[0];
        const groupId = nextEntry.groupId as string | null;

        let entriesToRedo: Record<string, unknown>[];

        if (groupId) {
          // Redo all entries in the same group
          const groupRes = await client.query(
            `SELECT * FROM ${sq}.${quoteIdent(STACK_TABLE)}
             WHERE "projectId" = $1 AND "groupId" = $2 AND "seq" > $3
             ORDER BY "seq" ASC`,
            [projectId, groupId, pointer],
          );
          entriesToRedo = groupRes.rows;
        } else {
          // Redo single entry
          entriesToRedo = [nextEntry];
        }

        // Apply redo (restore newValue)
        await client.query('BEGIN');
        try {
          for (const row of entriesToRedo) {
            await applyChange(
              client,
              schema,
              row.tableName as string,
              row.recordId as string,
              row.fieldName as string,
              row.newValue as string | null,
            );
          }
          await client.query('COMMIT');
        } catch (err) {
          await client.query('ROLLBACK');
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[UndoRedo] redo failed: ${msg}`);
          return {
            success: false,
            redone: [],
            canUndo: true,
            canRedo: pointer < maxSeq,
          };
        }

        // Move pointer forward
        const maxSeqInGroup = entriesToRedo.length > 0
          ? Math.max(...entriesToRedo.map(r => r.seq as number))
          : pointer + 1;
        await setPointer(client, schema, projectId, maxSeqInGroup);

        const updatedMaxSeq = await getMaxSeq(client, schema, projectId);

        return {
          success: true,
          redone: entriesToRedo.map(rowToEntry),
          canUndo: true,
          canRedo: maxSeqInGroup < updatedMaxSeq,
        };
      });
    },

    // ── getState ──
    async getState(projectId) {
      return withClient(async (client) => {
        const pointer = await getPointer(client, schema, projectId);
        const maxSeq = await getMaxSeq(client, schema, projectId);

        return {
          undoCount: pointer,
          redoCount: Math.max(0, maxSeq - pointer),
          canUndo: pointer > 0,
          canRedo: pointer < maxSeq,
        };
      });
    },

    // ── clear ──
    async clear(projectId) {
      await withClient(async (client) => {
        const sq = quoteIdent(schema);
        await client.query('BEGIN');
        try {
          await client.query(
            `DELETE FROM ${sq}.${quoteIdent(STACK_TABLE)} WHERE "projectId" = $1`,
            [projectId],
          );
          await client.query(
            `DELETE FROM ${sq}.${quoteIdent(POINTER_TABLE)} WHERE "projectId" = $1`,
            [projectId],
          );
          await client.query('COMMIT');
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        }
      });
    },
  };

  return service;
}
