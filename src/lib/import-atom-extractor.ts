/**
 * @file import-atom-extractor.ts
 * @description Extracts atomic metadata from FMEA worksheet data into flat AtomMapEntry list.
 *              Traverses L1/L2/L3 hierarchy including functions, failure effects/modes/causes,
 *              and process characteristics.
 */

// ---------------------------------------------------------------------------
// Types -- worksheet input shapes (subset relevant for extraction)
// ---------------------------------------------------------------------------

interface WsIdName { id: string; name: string }

interface WsProcessChar extends WsIdName { specialChar?: string }
interface WsL3Function extends WsIdName { processChars?: WsProcessChar[] }
interface WsFailureCause extends WsIdName { occurrence?: number; processCharId?: string }

interface WsWorkElement extends WsIdName {
  order: number; m4?: string;
  functions: WsL3Function[];
  failureCauses?: WsFailureCause[];
}

interface WsFailureMode {
  id: string; name?: string; mode?: string;
  sc?: boolean; productCharId?: string;
}

interface WsL2Function extends WsIdName {
  functionName?: string; productChar?: string; specialChar?: string;
  productChars?: WsProcessChar[];
  failureModes?: WsFailureMode[];
}

interface WsProcess extends WsIdName {
  no: string; order: number;
  l3: WsWorkElement[];
  functions: WsL2Function[];
  failureModes?: WsFailureMode[];
  failureCauses?: WsFailureCause[];
}

interface WsL1FailureEffect extends WsIdName { severity?: number }
interface WsL1FailureScope extends WsIdName {
  scope?: string; effect?: string; severity?: number;
  effects?: WsL1FailureEffect[];
}
interface WsL1Function extends WsIdName { requirements?: WsIdName[] }
interface WsL1Type extends WsIdName { functions?: WsL1Function[] }

interface WsL1Data extends WsIdName {
  types?: WsL1Type[];
  functions?: WsL1Function[];
  failureScopes?: WsL1FailureScope[];
}

interface WorksheetData {
  fmeaId: string;
  l1: WsL1Data | WsL1Data[];
  l2: WsProcess[];
  riskData?: Record<string, number | string>;
}

// ---------------------------------------------------------------------------
// Output type
// ---------------------------------------------------------------------------

export interface AtomMapEntry {
  fmeaId: string;
  elementId: string;
  elementType: string;
  name: string;
  parentElementId: string | null;
  grandParentId: string | null;
  sortOrder: number;
  variableName: string;
  rowSpan: number;
  colSpan: number;
  mergeGroupId: string | null;
  metadata: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function entry(
  fmeaId: string, elementId: string, elementType: string, name: string,
  parentElementId: string | null, grandParentId: string | null,
  sortOrder: number, variableName: string,
  metadata: Record<string, unknown> | null = null,
): AtomMapEntry {
  return {
    fmeaId, elementId, elementType, name,
    parentElementId, grandParentId, sortOrder, variableName,
    rowSpan: 1, colSpan: 1, mergeGroupId: null, metadata,
  };
}

// ---------------------------------------------------------------------------
// Main extractor
// ---------------------------------------------------------------------------

export function extractAtomMap(
  fmeaId: string,
  worksheetData: WorksheetData,
): AtomMapEntry[] {
  const results: AtomMapEntry[] = [];
  let order = 0;

  // --- L1 ---
  const l1Raw = worksheetData.l1;
  const l1List: WsL1Data[] = Array.isArray(l1Raw) ? l1Raw : [l1Raw];

  for (let li = 0; li < l1List.length; li++) {
    const l1 = l1List[li];
    results.push(entry(fmeaId, l1.id, 'l1', l1.name, null, null, order++, `l1[${li}]`));

    // L1 functions (via types or direct)
    const l1Fns: WsL1Function[] = [];
    if (l1.types) {
      for (const t of l1.types) { if (t.functions) l1Fns.push(...t.functions); }
    }
    if (l1.functions) l1Fns.push(...l1.functions);

    for (let fi = 0; fi < l1Fns.length; fi++) {
      const fn = l1Fns[fi];
      results.push(entry(fmeaId, fn.id, 'l1func', fn.name, l1.id, null, order++,
        `l1[${li}].functions[${fi}]`));
    }

    // L1 failure effects (via failureScopes)
    if (l1.failureScopes) {
      for (let si = 0; si < l1.failureScopes.length; si++) {
        const scope = l1.failureScopes[si];
        const sp = `l1[${li}].failureScopes[${si}]`;
        results.push(entry(fmeaId, scope.id, 'fe', scope.name || scope.effect || '',
          l1Fns[0]?.id ?? l1.id, l1.id, order++, sp,
          { scope: scope.scope, severity: scope.severity }));

        if (scope.effects) {
          for (let ei = 0; ei < scope.effects.length; ei++) {
            const eff = scope.effects[ei];
            results.push(entry(fmeaId, eff.id, 'fe', eff.name,
              scope.id, l1Fns[0]?.id ?? l1.id, order++,
              `${sp}.effects[${ei}]`, { severity: eff.severity }));
          }
        }
      }
    }
  }

  const firstL1Id = l1List[0]?.id ?? null;

  // --- L2 (Processes) ---
  for (let pi = 0; pi < worksheetData.l2.length; pi++) {
    const proc = worksheetData.l2[pi];
    const pp = `l2[${pi}]`;

    results.push(entry(fmeaId, proc.id, 'l2', proc.name,
      firstL1Id, null, order++, pp, { no: proc.no }));

    // L2 functions
    for (let fi = 0; fi < proc.functions.length; fi++) {
      const fn = proc.functions[fi];
      const fp = `${pp}.functions[${fi}]`;
      results.push(entry(fmeaId, fn.id, 'l2func', fn.functionName ?? fn.name,
        proc.id, firstL1Id, order++, fp,
        { productChar: fn.productChar, specialChar: fn.specialChar }));

      // Failure modes under L2 function
      if (fn.failureModes) {
        for (let mi = 0; mi < fn.failureModes.length; mi++) {
          const fm = fn.failureModes[mi];
          results.push(entry(fmeaId, fm.id, 'fm', fm.mode ?? fm.name ?? '',
            fn.id, proc.id, order++, `${fp}.failureModes[${mi}]`,
            { sc: fm.sc, productCharId: fm.productCharId }));
        }
      }
    }

    // Top-level failure modes on process (deduplicated)
    if (proc.failureModes) {
      for (let mi = 0; mi < proc.failureModes.length; mi++) {
        const fm = proc.failureModes[mi];
        if (results.some((r) => r.elementId === fm.id && r.elementType === 'fm')) continue;
        results.push(entry(fmeaId, fm.id, 'fm', fm.mode ?? fm.name ?? '',
          proc.functions[0]?.id ?? proc.id, proc.id, order++,
          `${pp}.failureModes[${mi}]`, { sc: fm.sc }));
      }
    }

    // --- L3 (Work elements) ---
    for (let wi = 0; wi < proc.l3.length; wi++) {
      const we = proc.l3[wi];
      const wp = `${pp}.l3[${wi}]`;

      results.push(entry(fmeaId, we.id, 'l3', we.name,
        proc.id, firstL1Id, order++, wp, { m4: we.m4 }));

      // L3 functions
      for (let fi = 0; fi < we.functions.length; fi++) {
        const fn = we.functions[fi];
        const fp = `${wp}.functions[${fi}]`;
        results.push(entry(fmeaId, fn.id, 'l3func', fn.name, we.id, proc.id, order++, fp));

        if (fn.processChars) {
          for (let ci = 0; ci < fn.processChars.length; ci++) {
            const pc = fn.processChars[ci];
            results.push(entry(fmeaId, pc.id, 'processChar', pc.name, fn.id, we.id, order++,
              `${fp}.processChars[${ci}]`, { specialChar: pc.specialChar }));
          }
        }
      }

      // Failure causes under work element
      if (we.failureCauses) {
        for (let ci = 0; ci < we.failureCauses.length; ci++) {
          const fc = we.failureCauses[ci];
          const parentFuncId = we.functions[0]?.id ?? we.id;
          results.push(entry(fmeaId, fc.id, 'fc', fc.name, parentFuncId, we.id, order++,
            `${wp}.failureCauses[${ci}]`,
            { occurrence: fc.occurrence, processCharId: fc.processCharId }));
        }
      }
    }

    // Top-level failure causes on process (deduplicated)
    if (proc.failureCauses) {
      for (let ci = 0; ci < proc.failureCauses.length; ci++) {
        const fc = proc.failureCauses[ci];
        if (results.some((r) => r.elementId === fc.id && r.elementType === 'fc')) continue;
        results.push(entry(fmeaId, fc.id, 'fc', fc.name, proc.id, firstL1Id, order++,
          `${pp}.failureCauses[${ci}]`, { occurrence: fc.occurrence }));
      }
    }
  }

  return results;
}
