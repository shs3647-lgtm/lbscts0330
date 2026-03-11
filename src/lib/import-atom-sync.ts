/**
 * @file import-atom-sync.ts
 * @description Atom map 생성 및 저장 동기화
 *
 * Import가 워크시트 데이터를 DB에 저장한 후 호출되어:
 * 1. /api/fmea에서 워크시트 데이터를 가져오고
 * 2. extractAtomMap()으로 atom 엔트리를 생성하고
 * 3. /api/fmea/atom-map에 POST하여 DB에 저장한다
 */

import type { AtomMapEntry } from '@/lib/import-atom-extractor';
import { extractAtomMap } from '@/lib/import-atom-extractor';

// ─── Types ────────────────────────────────────────────────────

export interface AtomSyncResult {
  success: boolean;
  fmeaId: string;
  totalAtoms: number;
  byType: Record<string, number>;
  parentLinks: number;
  error?: string;
}

export interface AtomIntegrityReport {
  valid: boolean;
  totalAtoms: number;
  orphans: string[];
  missingParents: string[];
  duplicateIds: string[];
}

// ─── Helpers ──────────────────────────────────────────────────

function buildSummary(fmeaId: string, entries: AtomMapEntry[]): Omit<AtomSyncResult, 'error'> {
  const byType: Record<string, number> = {};
  let parentLinks = 0;

  for (const entry of entries) {
    byType[entry.elementType] = (byType[entry.elementType] ?? 0) + 1;
    if (entry.parentElementId) {
      parentLinks++;
    }
  }

  return {
    success: true,
    fmeaId,
    totalAtoms: entries.length,
    byType,
    parentLinks,
  };
}

function buildErrorResult(fmeaId: string, message: string): AtomSyncResult {
  return {
    success: false,
    fmeaId,
    totalAtoms: 0,
    byType: {},
    parentLinks: 0,
    error: message,
  };
}

// ─── Server-side sync ─────────────────────────────────────────

/**
 * Server-side function: generates and saves atom map for a given FMEA.
 * Called after Import saves worksheet data to DB.
 *
 * Uses localhost fetch so this must run on the same server as the API.
 */
export async function syncAtomMap(fmeaId: string): Promise<AtomSyncResult> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

    // 1) Fetch worksheet data
    const wsRes = await fetch(`${baseUrl}/api/fmea?fmeaId=${encodeURIComponent(fmeaId)}`);
    if (!wsRes.ok) {
      return buildErrorResult(fmeaId, `Failed to fetch worksheet: ${wsRes.status} ${wsRes.statusText}`);
    }

    const wsData = await wsRes.json();

    // 2) Extract atom entries
    const entries = extractAtomMap(fmeaId, wsData);
    if (entries.length === 0) {
      return buildErrorResult(fmeaId, 'extractAtomMap returned 0 entries');
    }

    // 3) POST to atom-map API
    const saveRes = await fetch(`${baseUrl}/api/fmea/atom-map`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fmeaId, atoms: entries }),
    });

    if (!saveRes.ok) {
      const body = await saveRes.text();
      return buildErrorResult(fmeaId, `Failed to save atom map: ${saveRes.status} — ${body}`);
    }

    return buildSummary(fmeaId, entries);
  } catch (error) {
    console.error('[syncAtomMap] Unexpected error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return buildErrorResult(fmeaId, message);
  }
}

// ─── Client-side sync ─────────────────────────────────────────

/**
 * Client-side function: triggers atom map sync via relative API calls.
 * Safe to call from React components or event handlers.
 */
export async function triggerAtomSync(fmeaId: string): Promise<AtomSyncResult> {
  try {
    // 1) Fetch worksheet data (relative URL — browser resolves)
    const wsRes = await fetch(`/api/fmea?fmeaId=${encodeURIComponent(fmeaId)}`);
    if (!wsRes.ok) {
      return buildErrorResult(fmeaId, `Failed to fetch worksheet: ${wsRes.status} ${wsRes.statusText}`);
    }

    const wsData = await wsRes.json();

    // 2) Extract atom entries
    const entries = extractAtomMap(fmeaId, wsData);
    if (entries.length === 0) {
      return buildErrorResult(fmeaId, 'extractAtomMap returned 0 entries');
    }

    // 3) POST to atom-map API
    const saveRes = await fetch('/api/fmea/atom-map', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fmeaId, atoms: entries }),
    });

    if (!saveRes.ok) {
      const body = await saveRes.text();
      return buildErrorResult(fmeaId, `Failed to save atom map: ${saveRes.status} — ${body}`);
    }

    return buildSummary(fmeaId, entries);
  } catch (error) {
    console.error('[triggerAtomSync] Unexpected error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return buildErrorResult(fmeaId, message);
  }
}

// ─── Integrity verification ──────────────────────────────────

/**
 * Verify atom map completeness for a given FMEA.
 * Returns orphan elements, missing parents, and duplicate IDs.
 */
export async function verifyAtomIntegrity(fmeaId: string): Promise<AtomIntegrityReport> {
  try {
    const wsRes = await fetch(`/api/fmea?fmeaId=${encodeURIComponent(fmeaId)}`);
    if (!wsRes.ok) {
      return { valid: false, totalAtoms: 0, orphans: [], missingParents: [], duplicateIds: [] };
    }

    const wsData = await wsRes.json();
    const entries = extractAtomMap(fmeaId, wsData);

    const idSet = new Set<string>();
    const duplicateIds: string[] = [];
    const orphans: string[] = [];
    const missingParents: string[] = [];

    // Collect all elementIds and detect duplicates
    for (const entry of entries) {
      if (idSet.has(entry.elementId)) {
        duplicateIds.push(entry.elementId);
      } else {
        idSet.add(entry.elementId);
      }
    }

    // Check parent references
    const reportedMissing = new Set<string>();
    for (const entry of entries) {
      if (!entry.parentElementId) {
        // Top-level elements (e.g. L1) are expected to have no parent
        // But L2/L3/FM/FE/FC without a parent are orphans
        const typesRequiringParent = ['L2', 'L3', 'FM', 'FE', 'FC'];
        if (typesRequiringParent.includes(entry.elementType)) {
          orphans.push(entry.elementId);
        }
        continue;
      }

      if (!idSet.has(entry.parentElementId) && !reportedMissing.has(entry.parentElementId)) {
        missingParents.push(entry.parentElementId);
        reportedMissing.add(entry.parentElementId);
      }
    }

    const valid = orphans.length === 0 && missingParents.length === 0 && duplicateIds.length === 0;

    return {
      valid,
      totalAtoms: entries.length,
      orphans,
      missingParents,
      duplicateIds,
    };
  } catch (error) {
    console.error('[verifyAtomIntegrity] Unexpected error:', error);
    return { valid: false, totalAtoms: 0, orphans: [], missingParents: [], duplicateIds: [] };
  }
}
