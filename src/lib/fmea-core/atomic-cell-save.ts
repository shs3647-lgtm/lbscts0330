/**
 * @file atomic-cell-save.ts
 * Atomic Cell Save — Immediate DB persistence for worksheet cell edits
 *
 * Instead of debounce + bulk save, each cell edit is queued and
 * persisted to Atomic DB within a short window (default 500ms).
 * Prevents data loss on browser close.
 *
 * Design:
 * - Queue changes in memory with dedup (last-write-wins per record+field)
 * - Flush to DB via $transaction batch UPDATE
 * - beforeunload warning if pending changes exist
 * - Audit trail integration (optional)
 */

import type { AuditTrailService } from './audit-trail';

// ─── Types ───────────────────────────────────────────────────────

export interface CellChange {
  tableName: string;       // e.g., 'l2_functions', 'failure_modes'
  recordId: string;        // UUID of the record
  fieldName: string;       // column name
  oldValue: unknown;
  newValue: unknown;
  processNo?: string;      // for audit trail
  timestamp: number;
}

export interface SaveResult {
  saved: number;
  failed: number;
  errors: Array<{ change: CellChange; error: string }>;
}

export interface SaveQueue {
  /** Add a cell change to the queue (deduped by recordId+fieldName) */
  enqueue(change: CellChange): void;

  /** Immediately flush all pending changes to DB */
  flush(): Promise<SaveResult>;

  /** Number of pending changes awaiting flush */
  getPendingCount(): number;

  /** Whether there are unsaved changes */
  hasPendingChanges(): boolean;

  /** Stop the auto-flush timer and flush remaining changes */
  destroy(): Promise<void>;
}

export interface SaveQueueOptions {
  prisma: {
    $executeRawUnsafe: (q: string, ...args: unknown[]) => Promise<number>;
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => Promise<unknown>;
  };
  projectId: string;
  schema: string;
  flushIntervalMs?: number;   // default 500
  maxBatchSize?: number;      // default 50
  onSaveComplete?: (result: SaveResult) => void;
  onSaveError?: (error: Error) => void;
  auditService?: AuditTrailService;
}

// ─── Cell → DB mapping ──────────────────────────────────────────

/**
 * Maps WorksheetState field paths to their corresponding
 * Atomic DB table and column names (Prisma @@map snake_case).
 *
 * Key format: "stateSection.fieldName"
 * e.g. "l2Function.name" → { table: 'l2_functions', column: 'name' }
 */
export const CELL_TO_DB_MAP: Record<string, { table: string; column: string }> = {
  // ── L2 (공정) ──
  'l2Structure.name':           { table: 'l2_structures', column: 'name' },
  'l2Structure.processNo':      { table: 'l2_structures', column: 'no' },
  'l2Function.name':            { table: 'l2_functions',  column: 'name' },

  // ── L3 (작업요소) ──
  'l3Structure.name':           { table: 'l3_structures', column: 'name' },
  'l3Function.name':            { table: 'l3_functions',  column: 'name' },

  // ── L1 (완제품) ──
  'l1Structure.name':           { table: 'l1_structures', column: 'name' },
  'l1Function.name':            { table: 'l1_functions',  column: 'name' },
  'l1Function.category':        { table: 'l1_functions',  column: 'category' },

  // ── Failure entities ──
  'failureMode.mode':           { table: 'failure_modes',   column: 'mode' },
  'failureEffect.effect':       { table: 'failure_effects', column: 'effect' },
  'failureCause.cause':         { table: 'failure_causes',  column: 'cause' },

  // ── Product / Process characteristics ──
  'productChar.name':           { table: 'process_product_chars', column: 'name' },
  'processChar.name':           { table: 'l3_functions',          column: '"processCharName"' },

  // ── Risk Analysis ──
  'riskAnalysis.severity':          { table: 'risk_analyses', column: 'severity' },
  'riskAnalysis.occurrence':        { table: 'risk_analyses', column: 'occurrence' },
  'riskAnalysis.detection':         { table: 'risk_analyses', column: 'detection' },
  'riskAnalysis.detectionControl':  { table: 'risk_analyses', column: '"detectionControl"' },
  'riskAnalysis.preventionControl': { table: 'risk_analyses', column: '"preventionControl"' },

  // ── Optimization ──
  'optimization.recommendedAction':  { table: 'optimizations', column: '"recommendedAction"' },
  'optimization.responsible':        { table: 'optimizations', column: 'responsible' },
  'optimization.targetDate':         { table: 'optimizations', column: '"targetDate"' },
  'optimization.actionTaken':        { table: 'optimizations', column: '"actionTaken"' },
  'optimization.completionDate':     { table: 'optimizations', column: '"completionDate"' },
  'optimization.newSeverity':        { table: 'optimizations', column: '"newSeverity"' },
  'optimization.newOccurrence':      { table: 'optimizations', column: '"newOccurrence"' },
  'optimization.newDetection':       { table: 'optimizations', column: '"newDetection"' },
};

// ─── Helpers ─────────────────────────────────────────────────────

/** Create a dedup key for a cell change */
function changeKey(change: CellChange): string {
  return `${change.tableName}|${change.recordId}|${change.fieldName}`;
}

/** Generate UPDATE SQL for a single cell change within a schema */
function buildUpdateSQL(schema: string, change: CellChange): { sql: string; params: unknown[] } {
  const { tableName, recordId, fieldName } = change;
  // fieldName may already be quoted (e.g. "detectionControl") — use as-is from CELL_TO_DB_MAP
  const columnRef = fieldName.startsWith('"') ? fieldName : `"${fieldName}"`;
  const tableRef = `"${schema}".${tableName}`;

  return {
    sql: `UPDATE ${tableRef} SET ${columnRef} = $1 WHERE id = $2`,
    params: [change.newValue, recordId],
  };
}

// ─── SaveQueue factory ──────────────────────────────────────────

/**
 * Create a SaveQueue that batches cell changes and flushes to the
 * project's Atomic DB schema.
 */
export function createSaveQueue(options: SaveQueueOptions): SaveQueue {
  const {
    prisma,
    projectId,
    schema,
    flushIntervalMs = 500,
    maxBatchSize = 50,
    onSaveComplete,
    onSaveError,
    auditService,
  } = options;

  // Pending changes map (last-write-wins dedup)
  const pending = new Map<string, CellChange>();

  // Auto-flush timer
  let flushTimer: ReturnType<typeof setInterval> | null = null;
  let flushing = false;
  let destroyed = false;

  // Start auto-flush timer
  function startTimer(): void {
    if (flushTimer || destroyed) return;
    flushTimer = setInterval(() => {
      if (pending.size > 0 && !flushing) {
        flush().catch((err) => {
          console.error('[atomic-cell-save] auto-flush error:', err);
          if (onSaveError) onSaveError(err instanceof Error ? err : new Error(String(err)));
        });
      }
    }, flushIntervalMs);
  }

  function stopTimer(): void {
    if (flushTimer) {
      clearInterval(flushTimer);
      flushTimer = null;
    }
  }

  // ── flush implementation ───────────────────────────────────────
  async function flush(): Promise<SaveResult> {
    if (pending.size === 0) {
      return { saved: 0, failed: 0, errors: [] };
    }
    if (flushing) {
      // Another flush in progress — skip
      return { saved: 0, failed: 0, errors: [] };
    }

    flushing = true;

    // Snapshot and clear pending
    const batch = Array.from(pending.values());
    pending.clear();

    // Limit batch size — put excess back
    if (batch.length > maxBatchSize) {
      const excess = batch.splice(maxBatchSize);
      for (const c of excess) {
        pending.set(changeKey(c), c);
      }
    }

    const result: SaveResult = { saved: 0, failed: 0, errors: [] };

    try {
      // Execute all updates in a single transaction
      await prisma.$transaction(async (tx: unknown) => {
        const txPrisma = tx as { $executeRawUnsafe: (q: string, ...a: unknown[]) => Promise<number> };

        for (const change of batch) {
          try {
            const { sql, params } = buildUpdateSQL(schema, change);
            await txPrisma.$executeRawUnsafe(sql, ...params);
            result.saved++;
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            console.error(`[atomic-cell-save] UPDATE failed: ${change.tableName}.${change.fieldName} id=${change.recordId}`, errorMsg);
            result.failed++;
            result.errors.push({ change, error: errorMsg });
          }
        }
      });

      // Audit trail (fire-and-forget, non-blocking)
      if (auditService && result.saved > 0) {
        const auditEntries = batch
          .filter((_, i) => i < result.saved) // only saved ones
          .map((c) => ({
            module: 'WS' as const,
            action: 'UPDATE' as const,
            tableName: c.tableName,
            recordId: c.recordId,
            fieldName: c.fieldName,
            oldValue: c.oldValue != null ? String(c.oldValue) : undefined,
            newValue: c.newValue != null ? String(c.newValue) : undefined,
            projectId,
            processNo: c.processNo,
          }));

        auditService.logBatch(auditEntries).catch((err: unknown) => {
          console.error('[atomic-cell-save] audit log error:', err);
        });
      }

      if (onSaveComplete) onSaveComplete(result);
    } catch (err) {
      // Transaction-level failure — put changes back
      console.error('[atomic-cell-save] transaction failed:', err);
      for (const c of batch) {
        const key = changeKey(c);
        if (!pending.has(key)) {
          pending.set(key, c);
        }
      }
      result.failed = batch.length;
      result.saved = 0;
      if (onSaveError) onSaveError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      flushing = false;
    }

    return result;
  }

  // Start auto-flush
  startTimer();

  // ── Public API ─────────────────────────────────────────────────
  const queue: SaveQueue = {
    enqueue(change: CellChange): void {
      if (destroyed) {
        console.error('[atomic-cell-save] enqueue called after destroy');
        return;
      }
      const key = changeKey(change);
      pending.set(key, { ...change, timestamp: Date.now() });
    },

    flush,

    getPendingCount(): number {
      return pending.size;
    },

    hasPendingChanges(): boolean {
      return pending.size > 0;
    },

    async destroy(): Promise<void> {
      destroyed = true;
      stopTimer();
      if (pending.size > 0) {
        await flush();
      }
    },
  };

  return queue;
}

// ─── Browser beforeunload helper ─────────────────────────────────

/**
 * Register a beforeunload handler that warns the user if there are
 * unsaved changes in the queue. Returns a cleanup function.
 *
 * Usage (in a React useEffect):
 * ```ts
 * useEffect(() => {
 *   return registerBeforeUnloadGuard(saveQueue);
 * }, [saveQueue]);
 * ```
 */
export function registerBeforeUnloadGuard(queue: SaveQueue): () => void {
  const handler = (e: BeforeUnloadEvent): string | undefined => {
    if (queue.hasPendingChanges()) {
      const msg = '저장되지 않은 변경사항이 있습니다. 페이지를 떠나시겠습니까?';
      e.preventDefault();
      e.returnValue = msg;
      return msg;
    }
    return undefined;
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }

  return () => {};
}
