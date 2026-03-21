/**
 * @file audit-trail.ts
 * Audit Trail System — DB-persistent change tracking
 *
 * Records WHO changed WHAT, WHEN, and WHY for all FMEA/CP/PFD data modifications.
 * Uses raw SQL with a dedicated `_audit_logs` table (auto-created per schema).
 *
 * Design:
 * - Each project schema gets its own `_audit_logs` table
 * - Batch insert support for bulk operations (Import, rebuild-atomic)
 * - Query by project, table, record, field, date range
 */

// ─── Types ───────────────────────────────────────────────────────

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'IMPORT' | 'EXPORT' | 'RESTORE';
export type AuditModule = 'PFMEA' | 'DFMEA' | 'CP' | 'PFD' | 'WS' | 'PM';

export interface AuditEntry {
  id?: string;
  module: AuditModule;
  action: AuditAction;
  tableName: string;
  recordId: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  userId?: string;
  userName?: string;
  projectId: string;       // fmeaId / cpNo / pfdNo
  processNo?: string;      // 공정번호 (traceability)
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface AuditQueryOptions {
  tableName?: string;
  recordId?: string;
  action?: AuditAction;
  module?: AuditModule;
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface AuditTrailService {
  /** Log a single audit entry */
  log(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<void>;

  /** Log multiple audit entries in a single transaction */
  logBatch(entries: Array<Omit<AuditEntry, 'id' | 'timestamp'>>): Promise<void>;

  /** Query audit history for a project */
  getHistory(
    projectId: string,
    options?: AuditQueryOptions
  ): Promise<{ entries: AuditEntry[]; total: number }>;

  /** Get change history for a specific field of a specific record */
  getFieldHistory(
    projectId: string,
    recordId: string,
    fieldName: string
  ): Promise<AuditEntry[]>;

  /** Ensure the _audit_logs table exists in the target schema */
  ensureTable(schema?: string): Promise<void>;
}

// ─── SQL ─────────────────────────────────────────────────────────

/**
 * SQL DDL for the _audit_logs table.
 * Can be used standalone or within ensureTable().
 */
export function createAuditTableSQL(schema?: string): string {
  const prefix = schema ? `"${schema}".` : '';
  return `
CREATE TABLE IF NOT EXISTS ${prefix}_audit_logs (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  module        TEXT NOT NULL,
  action        TEXT NOT NULL,
  table_name    TEXT NOT NULL,
  record_id     TEXT NOT NULL,
  field_name    TEXT,
  old_value     TEXT,
  new_value     TEXT,
  user_id       TEXT,
  user_name     TEXT,
  project_id    TEXT NOT NULL,
  process_no    TEXT,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ${prefix ? `"${schema}"."` : ''}idx_audit_project_id${prefix ? '"' : ''}
  ON ${prefix}_audit_logs (project_id);

CREATE INDEX IF NOT EXISTS ${prefix ? `"${schema}"."` : ''}idx_audit_record_id${prefix ? '"' : ''}
  ON ${prefix}_audit_logs (record_id);

CREATE INDEX IF NOT EXISTS ${prefix ? `"${schema}"."` : ''}idx_audit_created_at${prefix ? '"' : ''}
  ON ${prefix}_audit_logs (created_at);
`.trim();
}

// ─── Row ↔ AuditEntry mapping ────────────────────────────────────

interface AuditRow {
  id: string;
  module: string;
  action: string;
  table_name: string;
  record_id: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  user_id: string | null;
  user_name: string | null;
  project_id: string;
  process_no: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date | string;
}

function rowToEntry(row: AuditRow): AuditEntry {
  return {
    id: row.id,
    module: row.module as AuditModule,
    action: row.action as AuditAction,
    tableName: row.table_name,
    recordId: row.record_id,
    fieldName: row.field_name ?? undefined,
    oldValue: row.old_value ?? undefined,
    newValue: row.new_value ?? undefined,
    userId: row.user_id ?? undefined,
    userName: row.user_name ?? undefined,
    projectId: row.project_id,
    processNo: row.process_no ?? undefined,
    timestamp: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
    metadata: row.metadata ?? undefined,
  };
}

// ─── Service factory ─────────────────────────────────────────────

/**
 * Create an AuditTrailService backed by Prisma raw SQL.
 *
 * @param prisma - Prisma client (project-schema or public)
 * @param defaultSchema - optional schema name (e.g. 'pfmea_pfm26_m066')
 */
export function createAuditTrailService(
  prisma: { $executeRawUnsafe: (q: string, ...args: unknown[]) => Promise<number>;
             $queryRawUnsafe: (q: string, ...args: unknown[]) => Promise<unknown[]> },
  defaultSchema?: string
): AuditTrailService {
  const tableRef = defaultSchema ? `"${defaultSchema}"._audit_logs` : '_audit_logs';

  // Track whether we already ensured the table exists this session
  let tableEnsured = false;

  async function ensureOnce(): Promise<void> {
    if (tableEnsured) return;
    await service.ensureTable(defaultSchema);
    tableEnsured = true;
  }

  const service: AuditTrailService = {
    // ── ensureTable ──────────────────────────────────────────────
    async ensureTable(schema?: string): Promise<void> {
      const sql = createAuditTableSQL(schema ?? defaultSchema);
      // Split by semicolons and execute each statement
      const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
      for (const stmt of statements) {
        try {
          await prisma.$executeRawUnsafe(stmt);
        } catch (err) {
          // Index creation may fail if name conflict — non-fatal
          const msg = err instanceof Error ? err.message : String(err);
          if (!msg.includes('already exists')) {
            console.error('[audit-trail] ensureTable error:', msg);
          }
        }
      }
      tableEnsured = true;
    },

    // ── log (single entry) ───────────────────────────────────────
    async log(entry): Promise<void> {
      await ensureOnce();
      const metaJson = entry.metadata ? JSON.stringify(entry.metadata) : null;
      await prisma.$executeRawUnsafe(
        `INSERT INTO ${tableRef}
           (module, action, table_name, record_id, field_name,
            old_value, new_value, user_id, user_name,
            project_id, process_no, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)`,
        entry.module,
        entry.action,
        entry.tableName,
        entry.recordId,
        entry.fieldName ?? null,
        entry.oldValue ?? null,
        entry.newValue ?? null,
        entry.userId ?? null,
        entry.userName ?? null,
        entry.projectId,
        entry.processNo ?? null,
        metaJson
      );
    },

    // ── logBatch ─────────────────────────────────────────────────
    async logBatch(entries): Promise<void> {
      if (entries.length === 0) return;
      await ensureOnce();

      // Build a multi-row INSERT for efficiency
      const params: unknown[] = [];
      const valueRows: string[] = [];
      let idx = 1;

      for (const e of entries) {
        const metaJson = e.metadata ? JSON.stringify(e.metadata) : null;
        const placeholders = Array.from({ length: 12 }, (_, i) => {
          const p = `$${idx + i}`;
          return i === 11 ? `${p}::jsonb` : p;
        }).join(',');
        valueRows.push(`(${placeholders})`);
        params.push(
          e.module, e.action, e.tableName, e.recordId,
          e.fieldName ?? null, e.oldValue ?? null, e.newValue ?? null,
          e.userId ?? null, e.userName ?? null,
          e.projectId, e.processNo ?? null, metaJson
        );
        idx += 12;
      }

      const sql = `INSERT INTO ${tableRef}
        (module, action, table_name, record_id, field_name,
         old_value, new_value, user_id, user_name,
         project_id, process_no, metadata)
        VALUES ${valueRows.join(',\n')}`;

      await prisma.$executeRawUnsafe(sql, ...params);
    },

    // ── getHistory ───────────────────────────────────────────────
    async getHistory(projectId, options = {}): Promise<{ entries: AuditEntry[]; total: number }> {
      await ensureOnce();

      const conditions: string[] = ['project_id = $1'];
      const params: unknown[] = [projectId];
      let paramIdx = 2;

      if (options.tableName) {
        conditions.push(`table_name = $${paramIdx++}`);
        params.push(options.tableName);
      }
      if (options.recordId) {
        conditions.push(`record_id = $${paramIdx++}`);
        params.push(options.recordId);
      }
      if (options.action) {
        conditions.push(`action = $${paramIdx++}`);
        params.push(options.action);
      }
      if (options.module) {
        conditions.push(`module = $${paramIdx++}`);
        params.push(options.module);
      }
      if (options.startDate) {
        conditions.push(`created_at >= $${paramIdx++}`);
        params.push(options.startDate.toISOString());
      }
      if (options.endDate) {
        conditions.push(`created_at <= $${paramIdx++}`);
        params.push(options.endDate.toISOString());
      }

      const where = conditions.join(' AND ');
      const limit = options.limit ?? 100;
      const offset = options.offset ?? 0;

      // Count query
      const countRows = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int AS cnt FROM ${tableRef} WHERE ${where}`,
        ...params
      ) as Array<{ cnt: number }>;
      const total = countRows[0]?.cnt ?? 0;

      // Data query
      const dataRows = await prisma.$queryRawUnsafe(
        `SELECT * FROM ${tableRef}
         WHERE ${where}
         ORDER BY created_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
        ...params
      ) as AuditRow[];

      return {
        entries: dataRows.map(rowToEntry),
        total,
      };
    },

    // ── getFieldHistory ──────────────────────────────────────────
    async getFieldHistory(projectId, recordId, fieldName): Promise<AuditEntry[]> {
      await ensureOnce();

      const rows = await prisma.$queryRawUnsafe(
        `SELECT * FROM ${tableRef}
         WHERE project_id = $1 AND record_id = $2 AND field_name = $3
         ORDER BY created_at DESC
         LIMIT 500`,
        projectId,
        recordId,
        fieldName
      ) as AuditRow[];

      return rows.map(rowToEntry);
    },
  };

  return service;
}
