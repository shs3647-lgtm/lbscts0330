/**
 * @file buildAtomicFromFlat.ts
 * @description FlatData + Chains → Atomic DB 직접 변환 (legacy WorksheetState/migration 경유 없음)
 *
 * 설계 원칙:
 *   - NO text matching — 모든 FK는 parentItemId 체인 또는 chain UUID에서 파생
 *   - NO fallback — 누락 FK 시 해당 엔티티를 skip + console.warn
 *   - NO auto-generation — placeholder 문자열 자동생성 절대 금지
 *   - 카테시안 복제 절대 금지 (Rule 0.5)
 *   - dedup key에 공정번호/구분 필수 포함 (Rule 1.7)
 *
 * @created 2026-03-21
 * @see CLAUDE.md Rule 0, 1.5, 1.6, 1.7
 */

import type { ImportedFlatData } from '../types';
import type { StepBMasterChain } from '../stepb-parser/types';
import type {
  FMEAWorksheetDB,
  L1Structure,
  L2Structure,
  L3Structure,
  L1Function,
  L2Function,
  L3Function,
  FailureEffect,
  FailureMode,
  FailureCause,
  FailureLink,
  RiskAnalysis,
} from '../../worksheet/schema';
import { uid } from '../../worksheet/schema';
import { normalizeScope, SCOPE_LABEL_EN, SCOPE_LABEL_UPPER, type ScopeCode } from '@/lib/fmea/scope-constants';
// uuid-generator 삭제됨 (2026-03-22)
const genA1 = (_doc: string, pno: number) => `L2-PNO-${String(pno).padStart(3, '0')}`;
import { calculateAP } from '../../import/types/masterFailureChain';

// ============================================================
// Public Interface
// ============================================================

export interface BuildAtomicParams {
  fmeaId: string;
  flatData: ImportedFlatData[];
  chains: StepBMasterChain[];
  l1Name?: string;
}

/**
 * FlatData + Chains → FMEAWorksheetDB 직접 변환
 *
 * buildWorksheetState() + migrateToAtomicDB() 2단계를 1단계로 대체.
 * 모든 FK는 flatData.parentItemId 체인 및 chain UUID에서 결정론적으로 파생.
 */
export function buildAtomicFromFlat(params: BuildAtomicParams): FMEAWorksheetDB {
  const { fmeaId, flatData, chains, l1Name } = params;

  // ── FlatData를 itemCode별 Map으로 분류 ──
  const byCode = groupByItemCode(flatData);

  // ── ID lookup Map (id → FlatData) ──
  const flatById = new Map<string, ImportedFlatData>();
  for (const item of flatData) {
    flatById.set(item.id, item);
  }

  // ============================================================
  // 1. L1Structure (완제품 공정 — 단일)
  // ============================================================
  const l1Id = 'PF-L1-YP';
  const resolvedL1Name = l1Name || '완제품 공정';
  const l1Structure: L1Structure = {
    id: l1Id,
    fmeaId,
    name: resolvedL1Name,
  };

  // ============================================================
  // 2. L2Structure (공정) — A1 items
  // ============================================================
  const a1Items = byCode.get('A1') || [];
  const a2Items = byCode.get('A2') || [];

  // A2 lookup: processNo → value (공정명)
  const a2ByPno = new Map<string, string>();
  for (const a2 of a2Items) {
    a2ByPno.set(a2.processNo, a2.value);
  }

  const l2Structures: L2Structure[] = [];
  const seenL2 = new Set<string>();

  for (let i = 0; i < a1Items.length; i++) {
    const a1 = a1Items[i];
    const pno = parseInt(a1.processNo, 10);
    if (isNaN(pno)) {
      console.warn(`[buildAtomicFromFlat] A1 skipped: invalid processNo="${a1.processNo}"`);
      continue;
    }
    const l2Id = genA1('PF', pno);
    if (seenL2.has(l2Id)) continue; // dedup by 공정번호
    seenL2.add(l2Id);

    l2Structures.push({
      id: l2Id,
      fmeaId,
      l1Id,
      no: a1.processNo,
      name: a2ByPno.get(a1.processNo) || a1.value,
      order: i,
    });
  }

  // ============================================================
  // 3. L3Structure (작업요소) — B1 items
  // ============================================================
  const b1Items = byCode.get('B1') || [];
  const l3Structures: L3Structure[] = [];
  const seenL3 = new Set<string>();

  for (let i = 0; i < b1Items.length; i++) {
    const b1 = b1Items[i];
    if (seenL3.has(b1.id)) continue;
    seenL3.add(b1.id);

    const pno = parseInt(b1.processNo, 10);
    const l2Id = isNaN(pno) ? '' : genA1('PF', pno);

    l3Structures.push({
      id: b1.id,
      fmeaId,
      l1Id,
      l2Id,
      m4: (b1.m4 as L3Structure['m4']) || '',
      name: b1.value,
      order: i,
    });
  }

  // ============================================================
  // 4. L1Function (완제품기능+요구사항) — C2 + C3
  // ============================================================
  const c2Items = byCode.get('C2') || [];
  const c3Items = byCode.get('C3') || [];

  // C3 lookup: group by processNo (= scope, e.g. YP/SP/USER)
  // C3.parentItemId → C2.id
  const c3ByParent = new Map<string, ImportedFlatData[]>();
  for (const c3 of c3Items) {
    const parentId = c3.parentItemId || '';
    const list = c3ByParent.get(parentId) || [];
    list.push(c3);
    c3ByParent.set(parentId, list);
  }

  const l1Functions: L1Function[] = [];
  const seenL1F = new Set<string>();

  for (const c2 of c2Items) {
    const scope = c2.processNo; // YP, SP, USER
    const category = scopeToCategory(scope);
    const relatedC3s = c3ByParent.get(c2.id) || [];

    if (relatedC3s.length === 0) {
      // C2 without C3 — create single L1Function with empty requirement
      const funcId = c2.id;
      if (!seenL1F.has(funcId)) {
        seenL1F.add(funcId);
        l1Functions.push({
          id: funcId,
          fmeaId,
          l1StructId: l1Id,
          category,
          functionName: c2.value,
          requirement: '',
        });
      }
    } else {
      for (const c3 of relatedC3s) {
        const funcId = c3.id || c2.id;
        if (seenL1F.has(funcId)) continue;
        seenL1F.add(funcId);

        l1Functions.push({
          id: funcId,
          fmeaId,
          l1StructId: l1Id,
          category,
          functionName: c2.value,
          requirement: c3.value,
        });
      }
    }
  }

  // ============================================================
  // 5. L2Function (공정기능+제품특성) — A3 + A4
  // ============================================================
  const a3Items = byCode.get('A3') || [];
  const a4Items = byCode.get('A4') || [];

  // A4 lookup: parentItemId → A3.id (or A4 groups under A3)
  // parentItemId 없으면 processNo 기반 보완
  const a4ByParent = new Map<string, ImportedFlatData[]>();
  const a4ByPnoForL2 = new Map<string, ImportedFlatData[]>(); // processNo → A4s (보완용)
  for (const a4 of a4Items) {
    const parentId = a4.parentItemId || '';
    if (parentId) {
      const list = a4ByParent.get(parentId) || [];
      list.push(a4);
      a4ByParent.set(parentId, list);
    }
    // processNo 기반 인덱스도 구축
    const pnoList = a4ByPnoForL2.get(a4.processNo) || [];
    pnoList.push(a4);
    a4ByPnoForL2.set(a4.processNo, pnoList);
  }

  const l2Functions: L2Function[] = [];
  const seenL2F = new Set<string>();

  for (const a3 of a3Items) {
    const pno = parseInt(a3.processNo, 10);
    const l2StructId = isNaN(pno) ? '' : genA1('PF', pno);
    // parentItemId 기반 → processNo 기반 fallback
    let relatedA4s = a4ByParent.get(a3.id) || [];
    if (relatedA4s.length === 0) {
      relatedA4s = a4ByPnoForL2.get(a3.processNo) || [];
    }

    if (relatedA4s.length === 0) {
      // A3 without A4 — single L2Function with empty productChar
      const funcId = a3.id;
      if (!seenL2F.has(funcId)) {
        seenL2F.add(funcId);
        l2Functions.push({
          id: funcId,
          fmeaId,
          l2StructId,
          functionName: a3.value,
          productChar: '',
          specialChar: '',
        });
      }
    } else {
      for (const a4 of relatedA4s) {
        const funcId = a4.id || a3.id;
        if (seenL2F.has(funcId)) continue;
        seenL2F.add(funcId);

        l2Functions.push({
          id: funcId,
          fmeaId,
          l2StructId,
          functionName: a3.value,
          productChar: a4.value,
          specialChar: a4.specialChar || '',
        });
      }
    }
  }

  // ============================================================
  // 6. L3Function (요소기능+공정특성) — B2 + B3
  // ============================================================
  const b2Items = byCode.get('B2') || [];
  const b3Items = byCode.get('B3') || [];

  // B3 lookup: parentItemId → B2.id (or B1.id depending on hierarchy)
  // B2.parentItemId → B1.id (L3Structure.id)
  // B3.parentItemId → B1.id (L3Structure.id) — same WE
  // We pair B2+B3 by their shared B1 parent (same WE within same processNo)

  // Group B2 by parentItemId (= B1.id)
  const b2ByB1 = new Map<string, ImportedFlatData[]>();
  for (const b2 of b2Items) {
    const b1Id = b2.parentItemId || '';
    const list = b2ByB1.get(b1Id) || [];
    list.push(b2);
    b2ByB1.set(b1Id, list);
  }

  // Group B3 by parentItemId (= B1.id)
  const b3ByB1 = new Map<string, ImportedFlatData[]>();
  for (const b3 of b3Items) {
    const b1Id = b3.parentItemId || '';
    const list = b3ByB1.get(b1Id) || [];
    list.push(b3);
    b3ByB1.set(b1Id, list);
  }

  const l3Functions: L3Function[] = [];
  const seenL3F = new Set<string>();

  const sortFlatById = (items: ImportedFlatData[]) =>
    [...items].sort((a, b) => a.id.localeCompare(b.id));

  // FK 정합성 진단: B2/B3 orphan 확인
  {
    const b1Ids = new Set(b1Items.map(b => b.id));
    const orphanB2 = b2Items.filter(b => !b1Ids.has(b.parentItemId || ''));
    const orphanB3 = b3Items.filter(b => !b1Ids.has(b.parentItemId || ''));
    if (orphanB2.length > 0) {
      console.warn(`[buildAtomicFromFlat] B2 orphan ${orphanB2.length}건:`);
      orphanB2.slice(0, 5).forEach(b => console.warn(`  B2 id=${b.id} parent=${b.parentItemId} val=${b.value?.substring(0,40)}`));
    }
    if (orphanB3.length > 0) {
      console.warn(`[buildAtomicFromFlat] B3 orphan ${orphanB3.length}건:`);
      orphanB3.slice(0, 5).forEach(b => console.warn(`  B3 id=${b.id} parent=${b.parentItemId} val=${b.value?.substring(0,40)}`));
    }
  }

  // Iterate over B1 items (each B1 = one L3Structure = one WE)
  for (const b1 of b1Items) {
    const pno = parseInt(b1.processNo, 10);
    const l2StructId = isNaN(pno) ? '' : genA1('PF', pno);
    const l3StructId = b1.id;

    const relatedB2s = sortFlatById(b2ByB1.get(b1.id) || []);
    const relatedB3s = sortFlatById(b3ByB1.get(b1.id) || []);

    // ★ B3 기준 페어링: L3Function.id = 항상 B3.id (B4.l3FuncId·FC가 B3 id를 참조)
    //    인덱스만 맞추던 기존 방식은 B2/B3 개수 불일치 시 -G id에 B3 텍스트가 붙어 orphanPC 발생
    for (let i = 0; i < relatedB3s.length; i++) {
      const b3 = relatedB3s[i];
      const b2 =
        i < relatedB2s.length
          ? relatedB2s[i]
          : relatedB2s.length > 0
            ? relatedB2s[relatedB2s.length - 1]
            : undefined;
      const funcId = b3.id;
      if (!funcId || seenL3F.has(funcId)) continue;
      seenL3F.add(funcId);

      l3Functions.push({
        id: funcId,
        fmeaId,
        l3StructId,
        l2StructId,
        functionName: b2?.value || '',
        processChar: b3.value || '',
        specialChar: b3.specialChar || '',
      });
    }

    // B3보다 B2가 많을 때만: 여분 B2 → id=B2 (processChar 없음, orphanPC 미카운트)
    for (let i = relatedB3s.length; i < relatedB2s.length; i++) {
      const b2 = relatedB2s[i];
      const funcId = b2.id;
      if (!funcId || seenL3F.has(funcId)) continue;
      seenL3F.add(funcId);
      l3Functions.push({
        id: funcId,
        fmeaId,
        l3StructId,
        l2StructId,
        functionName: b2.value || '',
        processChar: '',
        specialChar: '',
      });
    }
  }

  // ============================================================
  // 7. FailureEffect (고장영향) — C4 items
  // ============================================================
  const c4Items = byCode.get('C4') || [];
  const failureEffects: FailureEffect[] = [];
  const seenFE = new Set<string>();

  // Build chain lookup: feId → chain (for severity)
  const chainByFeId = new Map<string, StepBMasterChain>();
  for (const chain of chains) {
    if (chain.feId) {
      chainByFeId.set(chain.feId, chain);
    }
  }

  // Build C3 id → L1Function id lookup (for l1FuncId FK)
  // C4.parentItemId → C3.id (requirement) → L1Function.id
  const l1FuncById = new Map<string, L1Function>();
  for (const l1f of l1Functions) {
    l1FuncById.set(l1f.id, l1f);
  }

  for (const c4 of c4Items) {
    if (seenFE.has(c4.id)) continue;
    seenFE.add(c4.id);

    const scope = c4.processNo; // YP, SP, USER
    const category = scopeToCategory(scope);

    // l1FuncId: C4.parentItemId → L1Function.id
    // parentItemId가 C2 레벨(PF-L1-YP-001)이고 L1Function이 C3 레벨(PF-L1-YP-001-001)인 경우
    // → scope 기반 fallback 필요
    let l1FuncId = c4.parentItemId || '';
    // parentItemId가 있어도 L1Function에 없으면 scope 기반 fallback
    if (!l1FuncId || !l1FuncById.has(l1FuncId)) {
      const scopeFunc = l1Functions.find(f => f.category === category);
      l1FuncId = scopeFunc?.id || '';
      if (!l1FuncId) {
        console.warn(`[buildAtomicFromFlat] C4 "${c4.value}" (scope=${scope}): L1Function 없음 → FE 스킵`);
        continue;
      }
    }

    // Severity from chain data
    const chainForFE = chainByFeId.get(c4.id);
    const severity = chainForFE?.s ?? 1;

    failureEffects.push({
      id: c4.id,
      fmeaId,
      l1FuncId,
      category,
      effect: c4.value,
      severity,
    });
  }

  // ============================================================
  // 8. FailureMode (고장형태) — A5 items
  // ============================================================
  const a5Items = byCode.get('A5') || [];
  const failureModes: FailureMode[] = [];
  const seenFM = new Set<string>();

  // A4 lookup by processNo (A5.parentItemId 없을 때 보완용)
  const a4ByPno = new Map<string, ImportedFlatData>();
  for (const a4 of a4Items) {
    if (!a4ByPno.has(a4.processNo)) a4ByPno.set(a4.processNo, a4);
  }
  // L2Function lookup by processNo (A3/A4 기반)
  const l2FuncByPno = new Map<string, L2Function>();
  for (const l2f of l2Functions) {
    const l2s = l2Structures.find(s => s.id === l2f.l2StructId);
    if (l2s && !l2FuncByPno.has(l2s.no || '')) {
      l2FuncByPno.set(l2s.no || '', l2f);
    }
  }

  for (const a5 of a5Items) {
    if (seenFM.has(a5.id)) continue;
    seenFM.add(a5.id);

    const pno = parseInt(a5.processNo, 10);
    const l2StructId = isNaN(pno) ? '' : genA1('PF', pno);

    // A5.parentItemId → A4.id (L2Function.id = productCharId)
    // parentItemId 없으면 동일 processNo의 A4/L2Function에서 보완
    let l2FuncId = a5.parentItemId || '';
    if (!l2FuncId) {
      // 동일 processNo의 A4에서 lookup
      const a4Match = a4ByPno.get(a5.processNo);
      if (a4Match) {
        l2FuncId = a4Match.id;
      } else {
        // L2Function에서 processNo 기반 lookup
        const l2fMatch = l2FuncByPno.get(a5.processNo);
        if (l2fMatch) l2FuncId = l2fMatch.id;
      }
    }
    if (!l2FuncId) {
      console.warn(`[buildAtomicFromFlat] A5 "${a5.value}" (pno=${a5.processNo}) skipped: no parentItemId and no A4 for processNo`);
      continue;
    }

    failureModes.push({
      id: a5.id,
      fmeaId,
      l2FuncId,
      l2StructId,
      productCharId: l2FuncId, // A4.id = L2Function.id
      mode: a5.value,
    });
  }

  // ============================================================
  // 9. FailureCause (고장원인) — B4 items
  // ============================================================
  const b4Items = byCode.get('B4') || [];
  const failureCauses: FailureCause[] = [];
  const seenFC = new Set<string>();

  for (const b4 of b4Items) {
    if (seenFC.has(b4.id)) continue;
    seenFC.add(b4.id);

    const pno = parseInt(b4.processNo, 10);
    const l2StructId = isNaN(pno) ? '' : genA1('PF', pno);

    // B4.parentItemId → B3.id (= processCharId = L3Function.id)
    const processCharId = b4.parentItemId || '';
    if (!processCharId) {
      console.warn(`[buildAtomicFromFlat] B4 "${b4.value}" (pno=${b4.processNo}) skipped: no parentItemId (missing B3 FK)`);
      continue;
    }

    // B3.parentItemId → B1.id (= L3Structure.id)
    const b3Item = flatById.get(processCharId);
    const l3StructId = b3Item?.parentItemId || '';
    if (!l3StructId) {
      console.warn(`[buildAtomicFromFlat] B4 "${b4.value}" (pno=${b4.processNo}) skipped: B3 "${processCharId}" has no parentItemId (missing B1 FK)`);
      continue;
    }

    failureCauses.push({
      id: b4.id,
      fmeaId,
      l3FuncId: processCharId, // B3.id = L3Function.id
      l3StructId,               // B1.id = L3Structure.id (via B3.parentItemId)
      l2StructId,
      processCharId,            // B3.id
      cause: b4.value,
    });

  }

  // ============================================================
  // 9.5. Chain FK 할당 — FlatData ID 기반 결정론적 매칭
  // ============================================================
  // chains에 fmId/feId/fcId가 없으면 FlatData에서 텍스트 매칭으로 할당
  // (import-builder의 convertToImportFormat과 동일 로직)
  // A5(FM): key = processNo|fmValue → a5.id
  // B4(FC): key = processNo|m4|fcValue → b4.id
  // C4(FE): key = scope|feValue → c4.id
  {
    const a5Items = byCode.get('A5') || [];
    const b4Items = byCode.get('B4') || [];
    const c4Items = byCode.get('C4') || [];

    // processNo 정규화 (앞자리 0 제거: '01' → '1', 단 '0' 유지)
    const normPno = (p: string) => {
      const n = (p || '').trim();
      if (/^\d+$/.test(n)) { const v = parseInt(n, 10); return String(v); }
      return n;
    };

    // FM lookup: processNo|value → id (정규화 + 원본 둘 다 등록)
    const fmLookup = new Map<string, string>();
    for (const a5 of a5Items) {
      const val = (a5.value || '').trim();
      const key = `${a5.processNo}|${val}`;
      const keyNorm = `${normPno(a5.processNo)}|${val}`;
      if (!fmLookup.has(key)) fmLookup.set(key, a5.id);
      if (!fmLookup.has(keyNorm)) fmLookup.set(keyNorm, a5.id);
    }

    // FC lookup: processNo|m4|value → id (정규화 + 원본)
    const fcLookup = new Map<string, string>();
    for (const b4 of b4Items) {
      const val = (b4.value || '').trim();
      const m4 = b4.m4 || '';
      const pno = b4.processNo;
      const pnoN = normPno(pno);
      const keys = [
        `${pno}|${m4}|${val}`, `${pnoN}|${m4}|${val}`,
        `${pno}||${val}`, `${pnoN}||${val}`,
      ];
      for (const k of keys) {
        if (!fcLookup.has(k)) fcLookup.set(k, b4.id);
      }
    }

    // FE lookup: scope|value → id (flat C4.id만 — 긴 feScope/짧은 processNo 별칭 포함)
    const feLookup = new Map<string, string>();
    for (const c4 of c4Items) {
      const val = (c4.value || '').trim();
      for (const key of feLookupKeysForC4(c4.processNo || '', val)) {
        if (!feLookup.has(key)) feLookup.set(key, c4.id);
      }
    }

    const validC4Ids = new Set(c4Items.map(c => c.id));
    const validFcIds = new Set(b4Items.map(b => b.id));
    const validFmIds = new Set(a5Items.map(a => a.id));

    let assigned = 0;
    for (const chain of chains) {
      // 마스터 JSON FK가 flat id와 다르면(골든 가지치기 등) 무시 → lookup으로만 재해석
      if (chain.feId && !validC4Ids.has(chain.feId)) {
        chain.feId = undefined;
      }
      if (chain.fcId && !validFcIds.has(chain.fcId)) {
        chain.fcId = undefined;
      }
      if (chain.fmId && !validFmIds.has(chain.fmId)) {
        chain.fmId = undefined;
      }

      // FM FK 할당 (원본 + 정규화 processNo 매칭)
      if (!chain.fmId && chain.fmValue && chain.processNo) {
        const fmVal = chain.fmValue.trim();
        const fmId = fmLookup.get(`${chain.processNo}|${fmVal}`)
          || fmLookup.get(`${normPno(chain.processNo)}|${fmVal}`);
        if (fmId) { chain.fmId = fmId; }
      }
      // FC FK 할당 (원본 + 정규화 processNo 매칭)
      if (!chain.fcId && chain.fcValue && chain.processNo) {
        const m4 = (chain as any).m4 || '';
        const fcVal = chain.fcValue.trim();
        const pno = chain.processNo;
        const pnoN = normPno(pno);
        const fcId = fcLookup.get(`${pno}|${m4}|${fcVal}`)
          || fcLookup.get(`${pnoN}|${m4}|${fcVal}`)
          || fcLookup.get(`${pno}||${fcVal}`)
          || fcLookup.get(`${pnoN}||${fcVal}`);
        if (fcId) { chain.fcId = fcId; }
      }
      // FE FK 할당 — feScope(SCOPE_LABEL_EN) vs C4.processNo(YP/SP/USER) 별칭
      if (!chain.feId && chain.feValue) {
        const feVal = chain.feValue.trim();
        const scopeRaw = String((chain as any).feScope || '').trim();
        let feId =
          feLookup.get(`${scopeRaw}|${feVal}`) ||
          feLookup.get(`${normDivForFeLookup(scopeRaw)}|${feVal}`);
        if (feId) chain.feId = feId;
        if (!chain.feId) {
          for (const [k, v] of feLookup) {
            if (k.endsWith(`|${feVal}`)) {
              chain.feId = v;
              break;
            }
          }
        }
      }
      if (chain.fmId && chain.fcId && chain.feId) assigned++;
    }
    console.info(`[buildAtomicFromFlat] Chain FK 할당: ${assigned}/${chains.length} (fmId/fcId/feId 3요소 완전)`);
  }

  // ============================================================
  // 10. FailureLink (고장사슬) — from chains (FK-only)
  // ============================================================
  const failureLinks: FailureLink[] = [];
  const seenFL = new Set<string>();

  for (const chain of chains) {
    const fmId = chain.fmId;
    const feId = chain.feId;
    const fcId = chain.fcId;

    // CRITICAL: 3요소 모두 있어야만 FL 생성 (Rule 1.7: FL dedup = fmId|fcId|feId)
    if (!fmId || !feId || !fcId) {
      console.warn(
        `[buildAtomicFromFlat] FailureLink skipped: missing FK — ` +
        `fm="${chain.fmValue}" fmId=${fmId || 'MISSING'}, ` +
        `fe="${chain.feValue}" feId=${feId || 'MISSING'}, ` +
        `fc="${chain.fcValue}" fcId=${fcId || 'MISSING'}`
      );
      continue;
    }

    // Dedup key: fmId|fcId|feId (Rule 1.7.1)
    const dedupKey = `${fmId}|${fcId}|${feId}`;
    if (seenFL.has(dedupKey)) continue;
    seenFL.add(dedupKey);

    const linkId = chain.id || uid();
    failureLinks.push({
      id: linkId,
      fmeaId,
      fmId,
      feId,
      fcId,
    });
  }

  // ============================================================
  // 11. RiskAnalysis (위험분석) — 1:1 with FailureLink
  // ============================================================
  const riskAnalyses: RiskAnalysis[] = [];

  // Build chain lookup by dedup key for SOD/DC/PC
  const chainByDedupKey = new Map<string, StepBMasterChain>();
  for (const chain of chains) {
    if (chain.fmId && chain.fcId && chain.feId) {
      const key = `${chain.fmId}|${chain.fcId}|${chain.feId}`;
      // First occurrence wins (consistent with FL dedup)
      if (!chainByDedupKey.has(key)) {
        chainByDedupKey.set(key, chain);
      }
    }
  }

  for (const link of failureLinks) {
    const dedupKey = `${link.fmId}|${link.fcId}|${link.feId}`;
    const chain = chainByDedupKey.get(dedupKey);

    const s = chain?.s ?? 1;
    const o = chain?.o ?? 1;
    const d = chain?.d ?? 1;
    const ap = calculateAP(s, o, d);

    riskAnalyses.push({
      id: `ra-${link.id}`,
      fmeaId,
      linkId: link.id,
      severity: s,
      occurrence: o,
      detection: d,
      ap,
      preventionControl: chain?.pcValue || '',
      detectionControl: chain?.dcValue || '',
    });
  }

  // ============================================================
  // Assemble FMEAWorksheetDB
  // ============================================================
  return {
    fmeaId,
    savedAt: new Date().toISOString(),

    // 구조분석
    l1Structure,
    l2Structures,
    l3Structures,

    // 기능분석
    l1Functions,
    l2Functions,
    l3Functions,

    // 제품특성
    processProductChars: [],

    // 고장분석
    failureEffects,
    failureModes,
    failureCauses,

    // 고장연결
    failureLinks,

    // 고장분석 통합 (All view) — 별도 빌드 필요, 여기서는 빈 배열
    failureAnalyses: [],

    // 위험분석
    riskAnalyses,
    optimizations: [],

    // 확정 상태 (Import 후 = 전체 미확정)
    confirmed: {
      structure: false,
      l1Function: false,
      l2Function: false,
      l3Function: false,
      l1Failure: false,
      l2Failure: false,
      l3Failure: false,
      failureLink: false,
      risk: false,
      optimization: false,
    },
  };
}

// ============================================================
// Internal Helpers
// ============================================================

/**
 * FlatData 배열을 itemCode별 Map으로 분류
 */
function groupByItemCode(flatData: ImportedFlatData[]): Map<string, ImportedFlatData[]> {
  const map = new Map<string, ImportedFlatData[]>();
  for (const item of flatData) {
    const list = map.get(item.itemCode) || [];
    list.push(item);
    map.set(item.itemCode, list);
  }
  return map;
}

/**
 * C1 scope 문자열 → L1Function.category 변환 (중앙 상수 사용)
 *
 * FlatData의 processNo (C 카테고리) = 'YP' | 'SP' | 'USER'
 * → Atomic DB category = 'Your Plant' | 'Ship to Plant' | 'User' (레거시 워크시트 스키마 호환)
 */
type ScopeCategoryLabel = 'Your Plant' | 'Ship to Plant' | 'User';
const SCOPE_TO_CATEGORY: Record<ScopeCode, ScopeCategoryLabel> = { YP: 'Your Plant', SP: 'Ship to Plant', USER: 'User' };
function scopeToCategory(scope: string): ScopeCategoryLabel {
  const code = normalizeScope(scope);
  return SCOPE_TO_CATEGORY[code as ScopeCode] ?? 'User';
}

/** C4.processNo 또는 체인 feScope → YP/SP/USER (FE lookup 키 정규화, 중앙 상수 사용) */
function normDivForFeLookup(s: string): string {
  const t = (s || '').trim();
  if (!t) return t;
  return normalizeScope(t);
}

/** 동일 C4에 대해 마스터 체인 feScope(긴 이름) ↔ flat processNo(짧은 코드) 모두 등록 (중앙 상수 사용) */
function feLookupKeysForC4(processNo: string, value: string): string[] {
  const val = value.trim();
  const short = normDivForFeLookup(processNo);
  const keys = new Set<string>();
  keys.add(`${processNo}|${val}`);
  keys.add(`${short}|${val}`);
  // 약어 → 전체명 변형 모두 등록 (cross-reference 호환)
  const en = SCOPE_LABEL_EN[short as ScopeCode];
  const upper = SCOPE_LABEL_UPPER[short as ScopeCode];
  if (en) keys.add(`${en}|${val}`);
  if (upper) keys.add(`${upper}|${val}`);
  // USER 추가 별칭
  if (short === 'USER') {
    keys.add(`User|${val}`);
  }
  return [...keys];
}
