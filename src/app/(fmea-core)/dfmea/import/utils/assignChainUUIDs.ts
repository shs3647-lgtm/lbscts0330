/**
 * @file assignChainUUIDs.ts
 * @description chain에 엔티티 UUID FK를 할당하는 독립 유틸 (순환 import 방지)
 *
 * ★★★ 2026-03-15: 텍스트 매칭 완전 제거의 핵심 ★★★
 * buildWorksheetState가 생성한 FM/FC/FE 엔티티의 UUID를 chain에 할당.
 * 이후 모든 링크 생성은 UUID FK만 사용.
 *
 * ★★★ 2026-03-15 v2: NFKC 정규화 + FE scope 접두사 제거 + 고아 자동보충 ★★★
 * - Unicode NFKC 정규화 (Å↔Å, μ↔µ 등 통합)
 * - FE scope 접두사 제거 ("C3-4:효과명" → "효과명")
 * - 메인시트 FM/FC 중 FC시트 미포함 항목 자동보충 chain 생성
 *
 * ★★★ 2026-03-15 v3: FE 3단계 자동할당으로 FE 100% 달성 ★★★
 * - 1단계: 텍스트 직접 매칭 (기존 — feValue ↔ C4)
 * - 2단계: 같은 FM의 다른 chain에서 feId 복사 (같은 FM = 같은 FE, PFMEA 규칙)
 * - 3단계: scope 기반 + 공정별 carry-forward + 전역 fallback
 *
 * @created 2026-03-15
 */

import type { MasterFailureChain } from '../types/masterFailureChain';
import type {
  WorksheetState,
} from '@/app/(fmea-core)/pfmea/worksheet/constants';
import type { FlatToEntityMap } from './saveWorksheetFromImport';

// ─── 정규화 함수 (NFKC 강화) ───

function normalizeText(s: string | undefined): string {
  return (s || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeNoSpaceText(s: string | undefined): string {
  return normalizeText(s).replace(/\s/g, '');
}

/** FE scope 접두사 제거: "C3-4:효과명" → "효과명", "Y6-3:설명" → "설명" */
function stripFeScopePrefix(s: string | undefined): string {
  if (!s) return '';
  return s.replace(/^[A-Za-z]+\d+[-:][\d]*[-:]?\s*/i, '').trim();
}

function normalizeProcessNo(pNo: string | undefined): string {
  if (!pNo) return '';
  let n = pNo.trim();
  const lower = n.toLowerCase();
  if (lower === '0' || lower === '공통공정' || lower === '공통') return '00';
  n = n.replace(/^(공정|process|proc|p)[\s\-_]*/i, '');
  n = n.replace(/번$/, '');
  if (n !== '0' && n !== '00') n = n.replace(/^0+(?=\d)/, '');
  return n;
}

/**
 * chain에 엔티티 UUID FK 할당
 *
 * ★★★ 2026-03-17: flatId 기반 결정론적 매핑 우선 ★★★
 * 1차: chain.fmFlatId/fcFlatId/feFlatId → flatMap → entityId (100% 결정론적)
 * 2차: 텍스트 매칭 fallback (flatId 없는 레거시 chain 대응)
 *
 * 이 함수 실행 후 chain.fmId / chain.fcId / chain.feId가 설정됨.
 */
export function assignEntityUUIDsToChains(
  state: WorksheetState,
  chains: MasterFailureChain[],
  flatMap?: FlatToEntityMap,
): void {
  // ★★★ 2026-03-17: UUID 사전할당된 chain은 텍스트 매칭 스킵 ★★★
  // convertToImportFormat에서 genXxx() 결정론적 UUID를 직접 할당한 경우,
  // 텍스트 매칭이 불필요 — 100% 결정론적 FK 연결 보장
  const preAssignedCount = chains.filter(c => c.fmId && c.fcId && c.feId).length;
  if (preAssignedCount === chains.length && chains.length > 0) {
    console.info(
      `[assignChainUUIDs] ${chains.length}/${chains.length} chain UUID 사전할당 완료 — 텍스트 매칭 스킵`
    );
    return;
  }

  // 부분 할당: 할당된 chain은 스킵, 미할당만 텍스트 매칭
  if (preAssignedCount > 0) {
    console.info(
      `[assignChainUUIDs] ${preAssignedCount}/${chains.length} chain 사전할당됨 — 미할당 ${chains.length - preAssignedCount}건만 텍스트 매칭`
    );
  }

  // ─── FE 인덱스: normalizedText → FE.id ───
  const feIdByText = new Map<string, string>();
  const feIdByNoSpace = new Map<string, string>();
  for (const fe of (state.l1?.failureScopes || [])) {
    const raw = fe.effect || fe.name;
    const text = normalizeText(raw);
    if (text && !feIdByText.has(text)) feIdByText.set(text, fe.id);
    const ns = normalizeNoSpaceText(raw);
    if (ns && !feIdByNoSpace.has(ns)) feIdByNoSpace.set(ns, fe.id);
    // scope 접두사 제거 버전도 등록 (FC시트에 "C3-4:효과명" 형태로 들어올 때 대응)
    const stripped = stripFeScopePrefix(raw);
    if (stripped) {
      const nStripped = normalizeText(stripped);
      if (nStripped && !feIdByText.has(nStripped)) feIdByText.set(nStripped, fe.id);
      const nsStripped = normalizeNoSpaceText(stripped);
      if (nsStripped && !feIdByNoSpace.has(nsStripped)) feIdByNoSpace.set(nsStripped, fe.id);
    }
  }

  // ─── FM 인덱스: processNo|fmName → FM.id ───
  const fmIdByKey = new Map<string, string>();
  for (const proc of (state.l2 || [])) {
    const npNo = normalizeProcessNo(proc.no);
    for (const fm of (proc.failureModes || [])) {
      const nfm = normalizeText(fm.name);
      const nsfm = normalizeNoSpaceText(fm.name);
      if (!fmIdByKey.has(`${proc.no}|${nfm}`)) fmIdByKey.set(`${proc.no}|${nfm}`, fm.id);
      if (npNo !== proc.no && !fmIdByKey.has(`${npNo}|${nfm}`)) fmIdByKey.set(`${npNo}|${nfm}`, fm.id);
      if (nsfm !== nfm) {
        if (!fmIdByKey.has(`${proc.no}|${nsfm}`)) fmIdByKey.set(`${proc.no}|${nsfm}`, fm.id);
        if (npNo !== proc.no && !fmIdByKey.has(`${npNo}|${nsfm}`)) fmIdByKey.set(`${npNo}|${nsfm}`, fm.id);
      }
    }
  }

  // ─── FC 인덱스: processNo|m4|fcName → FC.id ───
  const fcIdByKey = new Map<string, string>();
  for (const proc of (state.l2 || [])) {
    const npNo = normalizeProcessNo(proc.no);
    for (const we of (proc.l3 || [])) {
      for (const fc of (we.failureCauses || [])) {
        const nfc = normalizeText(fc.name);
        const nsfc = normalizeNoSpaceText(fc.name);
        if (!fcIdByKey.has(`${proc.no}|${we.m4}|${nfc}`)) fcIdByKey.set(`${proc.no}|${we.m4}|${nfc}`, fc.id);
        if (npNo !== proc.no && !fcIdByKey.has(`${npNo}|${we.m4}|${nfc}`)) fcIdByKey.set(`${npNo}|${we.m4}|${nfc}`, fc.id);
        if (!fcIdByKey.has(`${proc.no}||${nfc}`)) fcIdByKey.set(`${proc.no}||${nfc}`, fc.id);
        if (npNo !== proc.no && !fcIdByKey.has(`${npNo}||${nfc}`)) fcIdByKey.set(`${npNo}||${nfc}`, fc.id);
        if (nsfc !== nfc) {
          if (!fcIdByKey.has(`${proc.no}||${nsfc}`)) fcIdByKey.set(`${proc.no}||${nsfc}`, fc.id);
          if (npNo !== proc.no && !fcIdByKey.has(`${npNo}||${nsfc}`)) fcIdByKey.set(`${npNo}||${nsfc}`, fc.id);
        }
      }
    }
    for (const fc of (proc.failureCauses || [])) {
      const nfc = normalizeText(fc.name);
      const nsfc = normalizeNoSpaceText(fc.name);
      if (!fcIdByKey.has(`${proc.no}||${nfc}`)) fcIdByKey.set(`${proc.no}||${nfc}`, fc.id);
      if (npNo !== proc.no && !fcIdByKey.has(`${npNo}||${nfc}`)) fcIdByKey.set(`${npNo}||${nfc}`, fc.id);
      if (nsfc !== nfc) {
        if (!fcIdByKey.has(`${proc.no}||${nsfc}`)) fcIdByKey.set(`${proc.no}||${nsfc}`, fc.id);
      }
    }
  }

  // ─── 0단계: flatId 기반 결정론적 매핑 (텍스트 매칭 불필요) ───
  let flatMapped = 0;
  if (flatMap) {
    for (const chain of chains) {
      if (!chain.fmId && chain.fmFlatId) {
        const entityId = flatMap.fm.get(chain.fmFlatId);
        if (entityId) { chain.fmId = entityId; flatMapped++; }
      }
      if (!chain.fcId && chain.fcFlatId) {
        const entityId = flatMap.fc.get(chain.fcFlatId);
        if (entityId) { chain.fcId = entityId; flatMapped++; }
      }
      if (!chain.feId && chain.feFlatId) {
        const entityId = flatMap.fe.get(chain.feFlatId);
        if (entityId) { chain.feId = entityId; flatMapped++; }
      }
    }
    if (flatMapped > 0) {
      console.info(`[assignChainUUIDs] 0단계 flatId 매핑: ${flatMapped}건 결정론적 할당`);
    }
  }

  // ─── 1단계: 텍스트 매칭 fallback (flatId 없는 레거시 chain 대응) ───
  let assignedFM = 0, assignedFC = 0, assignedFE = 0;
  for (const chain of chains) {
    const npNo = normalizeProcessNo(chain.processNo);

    if (!chain.feId && chain.feValue?.trim()) {
      const nfe = normalizeText(chain.feValue);
      const nsfe = normalizeNoSpaceText(chain.feValue);
      // 1차: 원본 정규화 매칭
      let feId = feIdByText.get(nfe) || feIdByNoSpace.get(nsfe);
      // 2차: scope 접두사 제거 후 재시도 ("C3-4:효과명" → "효과명")
      if (!feId) {
        const stripped = stripFeScopePrefix(chain.feValue);
        if (stripped) {
          const nStripped = normalizeText(stripped);
          const nsStripped = normalizeNoSpaceText(stripped);
          feId = feIdByText.get(nStripped) || feIdByNoSpace.get(nsStripped);
        }
      }
      if (feId) { chain.feId = feId; assignedFE++; }
    }

    if (!chain.fmId && chain.fmValue?.trim()) {
      const nfm = normalizeText(chain.fmValue);
      const nsfm = normalizeNoSpaceText(chain.fmValue);
      const fmId = fmIdByKey.get(`${chain.processNo}|${nfm}`)
        || fmIdByKey.get(`${npNo}|${nfm}`)
        || fmIdByKey.get(`${chain.processNo}|${nsfm}`)
        || fmIdByKey.get(`${npNo}|${nsfm}`);
      if (fmId) { chain.fmId = fmId; assignedFM++; }
    }

    if (!chain.fcId && chain.fcValue?.trim()) {
      const nfc = normalizeText(chain.fcValue);
      const nsfc = normalizeNoSpaceText(chain.fcValue);
      const m4 = chain.m4 || '';
      const fcId = fcIdByKey.get(`${chain.processNo}|${m4}|${nfc}`)
        || fcIdByKey.get(`${npNo}|${m4}|${nfc}`)
        || fcIdByKey.get(`${chain.processNo}||${nfc}`)
        || fcIdByKey.get(`${npNo}||${nfc}`)
        || fcIdByKey.get(`${chain.processNo}||${nsfc}`)
        || fcIdByKey.get(`${npNo}||${nsfc}`);
      if (fcId) { chain.fcId = fcId; assignedFC++; }
    }
  }

  if (assignedFM > 0 || assignedFC > 0 || assignedFE > 0) {
    console.info(
      `[assignChainUUIDs] 1단계 텍스트 매칭: FM=${assignedFM}/${chains.length} FC=${assignedFC}/${chains.length} FE=${assignedFE}/${chains.length}`
    );
  }

  // ══════════════════════════════════════════════════════════════
  // 2단계: FE:FM:FC = N:1:N — "같은 FM = 같은 FE" 규칙 제거
  //
  // 하나의 FM에 복수의 FE가 연결될 수 있음 (N:1:N 고장사슬).
  // 각 chain은 자신의 feValue/feScope로 독립적으로 FE를 결정.
  // FM이 같아도 FE가 다를 수 있다.
  // ══════════════════════════════════════════════════════════════
  const feFromFM = 0; // legacy 호환: 로깅용 (0 고정)

  // ══════════════════════════════════════════════════════════════
  // 3단계: scope 기반 FE 할당 + 공정별 carry-forward
  //
  // 3a: chain.feScope(YP/SP/USER) → state.l1.failureScopes에서 같은 scope FE 찾기
  // 3b: 같은 공정(processNo)의 이전 chain에서 feId carry-forward
  // 3c: 전체 FE 중 첫 번째 fallback (최후의 수단)
  //
  // 비유: 3a = "이 공정은 사용자 안전(USER) 영향" → USER scope FE 할당
  //       3b = "같은 공정의 직전 항목과 같은 영향" (연속된 행 = 같은 FE)
  //       3c = "아무 정보도 없으면 첫 번째 FE" (누락보다 나음)
  // ══════════════════════════════════════════════════════════════
  const feByScopeMap = new Map<string, string>();
  for (const fe of (state.l1?.failureScopes || [])) {
    const scope = normalizeText(fe.scope || '');
    if (scope && !feByScopeMap.has(scope)) {
      feByScopeMap.set(scope, fe.id);
    }
  }

  const procToFeId = new Map<string, string>();
  let feFromScope = 0;
  let feFromCarry = 0;

  // 이미 할당된 chain에서 공정별 feId 초기값 수집
  for (const chain of chains) {
    if (chain.feId && chain.processNo) {
      if (!procToFeId.has(chain.processNo)) {
        procToFeId.set(chain.processNo, chain.feId);
      }
    }
  }

  for (const chain of chains) {
    if (chain.feId) {
      // 이 공정의 최근 feId 갱신
      if (chain.processNo) procToFeId.set(chain.processNo, chain.feId);
      continue;
    }

    // 3a: feScope로 매칭 (YP/SP/USER → 해당 scope의 첫 FE)
    if (chain.feScope) {
      const scopeKey = normalizeText(chain.feScope);
      const feId = feByScopeMap.get(scopeKey);
      if (feId) {
        chain.feId = feId;
        feFromScope++;
        if (chain.processNo) procToFeId.set(chain.processNo, feId);
        continue;
      }
    }

    // 3b: 같은 공정 carry-forward (직전 chain의 feId 재사용)
    if (chain.processNo && procToFeId.has(chain.processNo)) {
      chain.feId = procToFeId.get(chain.processNo)!;
      feFromCarry++;
      continue;
    }

    // 3c: 전체 FE 중 첫 번째 fallback (최후의 수단 — 누락보다 낫다)
    const allFEs = state.l1?.failureScopes || [];
    if (allFEs.length > 0) {
      chain.feId = allFEs[0].id;
      feFromCarry++;
    }
  }

  // ── FE 할당 결과 로깅 ──
  const totalFeAssigned = chains.filter(c => c.feId).length;
  const totalFEs = new Set(
    (state.l1?.failureScopes || []).map(fe => fe.id)
  ).size;

  console.info(
    `[assignChainUUIDs] FE 보충: FM그룹=${feFromFM} scope=${feFromScope} carry=${feFromCarry} | ` +
    `FE 최종: ${totalFeAssigned}/${chains.length} chains에 할당, ` +
    `${totalFEs}개 고유 FE 중 ${new Set(chains.filter(c => c.feId).map(c => c.feId!)).size}개 사용`
  );
}

// ═══════════════════════════════════════════════════════
// 고아 FM/FC 자동보충: 메인시트에 있지만 FC시트에 없는 항목 → 합성 chain 생성
// ═══════════════════════════════════════════════════════

/**
 * 메인시트(state) 엔티티 중 FC시트(chains)에 매칭되지 않은 FM/FC를 자동보충.
 * 합성 chain을 생성하여 chains 배열에 push → UUID 할당 + 링크 생성 가능.
 *
 * 호출 시점: assignEntityUUIDsToChains 직후, buildFailureLinksDBCentric 직전
 */
export function supplementOrphanChains(
  state: WorksheetState,
  chains: MasterFailureChain[],
): { addedFM: number; addedFC: number } {
  let addedFM = 0;
  let addedFC = 0;

  // 이미 매칭된 FM/FC ID 수집
  const matchedFmIds = new Set(chains.filter(c => c.fmId).map(c => c.fmId!));
  const matchedFcIds = new Set(chains.filter(c => c.fcId).map(c => c.fcId!));

  for (const proc of (state.l2 || [])) {
    // ── 고아 FM 보충 ──
    for (const fm of (proc.failureModes || [])) {
      if (matchedFmIds.has(fm.id)) continue;

      // 같은 공정의 첫 번째 FC를 짝으로 사용
      let pairedFcId: string | undefined;
      let pairedFcValue = '';
      let pairedM4 = '';
      for (const we of (proc.l3 || [])) {
        if (pairedFcId) break;
        for (const fc of (we.failureCauses || [])) {
          pairedFcId = fc.id;
          pairedFcValue = fc.name;
          pairedM4 = we.m4 || '';
          break;
        }
      }
      if (!pairedFcId) {
        for (const fc of (proc.failureCauses || [])) {
          pairedFcId = fc.id;
          pairedFcValue = fc.name;
          break;
        }
      }

      const synthetic: MasterFailureChain = {
        id: `auto-fm-${fm.id}`,
        processNo: proc.no,
        m4: pairedM4 || undefined,
        fmValue: fm.name,
        fmId: fm.id,
        fcValue: pairedFcValue,
        fcId: pairedFcId,
        feValue: '',
        // feId: buildFailureLinksDBCentric — 공정 carry 또는 글로벌 단일 FE(failureScopes[0])
      };
      chains.push(synthetic);
      matchedFmIds.add(fm.id);
      if (pairedFcId) matchedFcIds.add(pairedFcId);
      addedFM++;
    }

    // ── 고아 FC 보충 — 모든 공정에서 미연결 FC 보충 ──
    // ★★★ 2026-03-17 FIX: procHasChains 조건 제거 — MC chain 있는 공정에서도
    // MN/IM/EN m4의 미연결 FC를 보충 (50건 누락 해결)
    for (const we of (proc.l3 || [])) {
      for (const fc of (we.failureCauses || [])) {
        if (matchedFcIds.has(fc.id)) continue;

        // 같은 공정의 첫 번째 FM을 짝으로 사용
        const pairedFm = (proc.failureModes || [])[0];
        if (!pairedFm) continue;

        const synthetic: MasterFailureChain = {
          id: `auto-fc-${fc.id}`,
          processNo: proc.no,
          m4: we.m4 || undefined,
          fcValue: fc.name,
          fcId: fc.id,
          fmValue: pairedFm.name,
          fmId: pairedFm.id,
          feValue: '',
          // feId: buildFailureLinksDBCentric — 공정 carry 또는 글로벌 단일 FE
        };
        chains.push(synthetic);
        matchedFcIds.add(fc.id);
        addedFC++;
      }
    }
    // process-level FCs
    for (const fc of (proc.failureCauses || [])) {
      if (matchedFcIds.has(fc.id)) continue;
      const pairedFm = (proc.failureModes || [])[0];
      if (!pairedFm) continue;
      const synthetic: MasterFailureChain = {
        id: `auto-fc-${fc.id}`,
        processNo: proc.no,
        fcValue: fc.name,
        fcId: fc.id,
        fmValue: pairedFm.name,
        fmId: pairedFm.id,
        feValue: '',
      };
      chains.push(synthetic);
      matchedFcIds.add(fc.id);
      addedFC++;
    }
  }

  if (addedFM > 0 || addedFC > 0) {
    console.info(`[supplementOrphanChains] 고아 보충: FM+${addedFM} FC+${addedFC}`);
  }

  return { addedFM, addedFC };
}
