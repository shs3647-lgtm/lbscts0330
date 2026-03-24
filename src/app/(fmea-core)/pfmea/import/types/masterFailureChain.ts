/**
 * @file masterFailureChain.ts
 * @description 기존데이터 Import용 고장사슬(Failure Chain) 타입 + 자동 도출 유틸
 * - PfmeaMasterDataset.failureChains JSON 필드에 저장
 * - FC(Failure Chain) 미리보기, FA(Full Analysis) 미리보기에서 사용
 * @created 2026-02-21
 */
/**
 * ██████████████████████████████████████████████████████████████
 * ██  CODEFREEZE v3.1.0 — 이 파일을 수정하지 마세요!          ██
 * ██                                                          ██
 * ██  상태: DB중심 고장연결 + v3.0 아키텍처 완성 (2026-02-28)  ██
 * ██  검증: 270테스트 PASS / tsc 에러 0개                      ██
 * ██                                                          ██
 * ██  수정이 필요하면:                                         ██
 * ██  1. 반드시 별도 브랜치에서 작업                            ██
 * ██  2. 270 골든 테스트 전체 통과 필수                         ██
 * ██  3. 사용자 승인 후 머지                                   ██
 * ██████████████████████████████████████████████████████████████
 */


import type { ImportedFlatData } from '../types';
import type { CrossTab } from '../utils/template-delete-logic';

// ─── processNo 정규화 (로컬) ───
// failureChainInjector.ts와 동일 로직 (순환 import 방지용 로컬 복사)
function normalizeProcessNo(pNo: string | undefined): string {
  if (!pNo) return '';
  let n = pNo.trim();
  n = n.replace(/^(공정|process|proc|p)[\s\-_]*/i, '');
  n = n.replace(/번$/, '');
  n = n.replace(/^0+(?=\d)/, '');
  return n;
}

// ─── 고장사슬 레코드 타입 ───
// v3.1.1: pcValue(B5 예방관리), dcValue(A6 검출관리) FC 시트 Import 복원

/** 하나의 고장사슬 = FE↔FM↔FC 연결 + SOD/AP */
export interface MasterFailureChain {
  id: string;
  processNo: string;
  m4?: string;              // 4M 분류: MN|MC|IM|EN
  workElement?: string;     // B1 작업요소명

  // ── 고장 트라이어드 ──
  feValue: string;          // C4 고장영향
  feSeverity?: number;      // 심각도 (S)
  feScope?: string;         // YP / SP / USER

  fmValue: string;          // A5 고장형태

  fcValue: string;          // B4 고장원인

  // ── 예방/검출관리 (FC 시트에서 Import) ──
  pcValue?: string;         // B5 예방관리
  dcValue?: string;         // A6 검출관리

  // ── 리스크 ──
  severity?: number;        // S (1-10)
  occurrence?: number;      // O (1-10)
  detection?: number;       // D (1-10)
  ap?: string;              // H / M / L

  // ── 기능 매핑 (역전개용) ──
  l2Function?: string;      // A3 공정기능
  productChar?: string;     // A4 제품특성
  l3Function?: string;      // B2 요소기능
  processChar?: string;     // B3 공정특성

  // ── 특별특성 ──
  specialChar?: string;

  // ★★★ 2026-02-25: 위치/모자관계/병합 정보 ★★★
  excelRow?: number;         // 엑셀 원본 행 번호 (1-based)
  parentChainId?: string;    // 부모 사슬 ID (같은 FM 내 여러 FC 그룹)
  mergeGroupId?: string;     // 병합 그룹 ID (동일 병합셀 내 데이터)
  fmMergeSpan?: number;      // FM(A5) 병합 행 수 — FM 1건이 몇 FC를 커버하는지
  feMergeSpan?: number;      // FE(C4) 병합 행 수 — FE 1건이 몇 FM을 커버하는지

  // ★★★ 2026-03-13: 수정본 적색 표기 ★★★
  isRevised?: boolean;       // true = 엑셀에서 적색으로 표기된 수정 항목

  // ★★★ 2026-03-17: flatData ID 직접 참조 (텍스트 매칭 제거) ★★★
  // convertToImportFormat에서 A5/B4/C4 flatData ID를 직접 할당
  // buildWorksheetState에서 flatId→entityId 결정론적 매핑
  fmFlatId?: string;         // A5 flatData.id → fillL2Data에서 entityId로 매핑
  fcFlatId?: string;         // B4 flatData.id → fillL3Data에서 entityId로 매핑
  feFlatId?: string;         // C4 flatData.id → fillL1Data에서 entityId로 매핑

  // ★★★ 2026-03-15: UUID FK 직접 참조 (최종 엔티티 ID) ★★★
  // flatId→entityId 매핑 완료 후 여기에 최종 UUID가 설정됨
  fmId?: string;             // FailureMode(A5) UUID → L2FailureMode.id
  fcId?: string;             // FailureCause(B4) UUID → L3FailureCauseExtended.id
  feId?: string;             // FailureEffect(C4) UUID → L1FailureScope.id
}

// ─── flatData → failureChains 자동 도출 ───

/**
 * ★★★ 2026-02-28 FIX: 사실기반 FC 구축 (카테시안 곱 제거) ★★★
 *
 * 이전 문제: FM × FC 카테시안 곱 → 23,310건 (과다 생성)
 *   - 같은 공정의 모든 FM에 모든 FC를 연결 → 5배 이상 부풀려짐
 *
 * 수정: excelRow + rowSpan 기반 행 매칭
 *   - FM(A5)의 행 범위 내에 있는 FC(B4)만 연결 (엑셀 병합셀 구조 반영)
 *   - excelRow 없으면 순차 분배 (fallback, 카테시안 금지)
 *
 * ★ 2026-03-22: FE(C4) — 엑셀 행 기준
 *   - FM(A5)/FC(B4) 행 번호 기준으로 **그 이하(≤)의 가장 최근 C4** 행을 FE로 사용 (pickFeAtOrBeforeRow)
 * ★ 2026-03-24 FIX (MX5 등): 예전에는 max(C4행) < min(A5행)이면 canFeRowLink=false → carry-forward만 사용해
 *   모든 체인이 동일 feValue·feFlatId 없음 → assignChainUUIDs가 텍스트당 첫 FE UUID만 연결 → FE 누락 수백 건.
 *   **통합 시트에서 L1 블록이 위·L2 블록이 아래**여도 행 번호는 동일 좌표계이므로 pick이 정상 동작해야 함.
 *   (서로 다른 시트에서 행 번호가 충돌하는 예외는 파서/flat 병합 이슈 — 별도 대응)
 *
 * ★ 2026-03-23: FC(B4) 누락 방지 — **FM rowSpan 창 밖 FC는 버리지 않음**
 *   - 이전: FM 행~rowSpan 안의 FC만 연결 → span 추론 오류 시 FC 다수 미체인
 *   - ★ 2026-03-24: **구간 매칭** — `max FM row ≤ fc` 는 배열 순서·행 역전 시 잘못된 FM(M43)에만 FC가 몰리고
 *     상위 FM(M48)은 FC없음이 됨. **A5 행 번호 오름차순**으로 구간 [Rᵢ, Rᵢ₊₁) 을 두고 FC 행 f가 속한 구간의 FM에 연결.
 *     동일 행 A5가 여러 개면 해당 구간 내 라운드로빈. excelRow 없는 FM은 꼬리(tail) RR 풀에만 참여.
 *   - FM 행 없음/매칭 불가 시 라운드로빈. FC 없는 FM만 FM-only 체인.
 *
 * ★ 2026-03-23: Flat↔체인 **건수 100%** — A5 없이 B4만 있는 공정도 누락 금지
 *   - `processFMs`만 순회하면 FC-only 공정 전체가 사라짐 → **processFMs ∪ processFCs** 키 합집합 순회
 *   - 체인에 **fmFlatId / fcFlatId / feFlatId** 부여 → assignChainUUIDs 0단계 결정론적 매핑
 */

/** FM 아이템 (행 위치 포함) */
interface FMItem { value: string; excelRow?: number; rowSpan?: number; flatId?: string }
/** FC 아이템 (행 위치 포함) */
interface FCItem { value: string; m4?: string; excelRow?: number; flatId?: string }

export function buildFailureChainsFromFlat(
  flatData: ImportedFlatData[],
  _crossTab: CrossTab,
): MasterFailureChain[] {
  const chains: MasterFailureChain[] = [];

  // ── C4(FE) 수집 — scope+value 중복 제거 ──
  const feRawList: { scope: string; value: string }[] = [];
  for (const d of flatData) {
    if (d.itemCode === 'C4' && d.value?.trim()) {
      feRawList.push({ scope: normalizeProcessNo(d.processNo) || d.processNo || '', value: d.value.trim() });
    }
  }
  const feSeen = new Set<string>();
  const uniqueFEList = feRawList.filter(fe => {
    const key = `${fe.scope}|${fe.value.trim().toLowerCase()}`;
    if (feSeen.has(key)) return false;
    feSeen.add(key);
    return true;
  });
  const defaultFE = uniqueFEList.length > 0 ? uniqueFEList[0] : { scope: '', value: '' };

  // C4 행 정렬 (엑셀 행 기반 FE 매핑용) + flat id (feFlatId)
  const c4RowEntries: { excelRow: number; scope: string; value: string; flatId?: string }[] = [];
  for (const d of flatData) {
    if (d.itemCode !== 'C4' || !d.value?.trim() || d.excelRow == null) continue;
    const scope = normalizeProcessNo(d.processNo) || d.processNo || '';
    c4RowEntries.push({ excelRow: d.excelRow, scope, value: d.value.trim(), flatId: d.id });
  }
  c4RowEntries.sort((a, b) => a.excelRow - b.excelRow);

  const a5RowsAll = flatData
    .filter(d => d.itemCode === 'A5' && d.excelRow != null && d.value?.trim())
    .map(d => d.excelRow!);
  // ★ C4·A5 모두 행 번호가 있으면 행 기반 FE 매핑 활성화 (L1 위 / L2 아래 레이아웃 포함)
  const canFeRowLink = c4RowEntries.length > 0 && a5RowsAll.length > 0;

  /** FM/FC 행 번호 기준: 해당 행 이하의 가장 최근 C4(FE) */
  function pickFeAtOrBeforeRow(targetRow: number): { scope: string; value: string; feFlatId?: string } {
    if (c4RowEntries.length === 0) {
      return { scope: defaultFE.scope, value: defaultFE.value, feFlatId: undefined };
    }
    let pick = c4RowEntries[0]!;
    for (const e of c4RowEntries) {
      if (e.excelRow <= targetRow) pick = e;
      else break;
    }
    return { scope: pick.scope, value: pick.value, feFlatId: pick.flatId };
  }

  // ── 공정별 FM(A5) — excelRow/rowSpan 보존 ──
  const processFMs = new Map<string, FMItem[]>();
  // ── 공정별 FC(B4) — excelRow 보존 ──
  const processFCs = new Map<string, FCItem[]>();
  const processInfo = new Map<string, { A2: string; A3: string; A4: string; A4SC?: string }>();

  for (const d of flatData) {
    // ★★★ 2026-03-01: processNo 정규화 — 파싱 단계와 동일 포맷 보장 ★★★
    const pNo = normalizeProcessNo(d.processNo);
    // ★★★ 2026-03-17 FIX: 공통공정(01→1) 스킵 추가 — FC 비교에서 공통공정 제외
    if (!pNo || pNo === '00' || pNo === '0' || pNo === '1' || pNo === '01' || pNo === '공통') continue;
    if (!d.value?.trim()) continue;

    if (!processInfo.has(pNo)) processInfo.set(pNo, { A2: '', A3: '', A4: '' });
    const info = processInfo.get(pNo)!;

    switch (d.itemCode) {
      case 'A2': info.A2 = info.A2 || d.value; break;
      case 'A3': info.A3 = info.A3 || d.value; break;
      case 'A4':
        info.A4 = info.A4 || d.value;
        if (d.specialChar) info.A4SC = d.specialChar;
        break;
      case 'A5': {
        if (!processFMs.has(pNo)) processFMs.set(pNo, []);
        processFMs.get(pNo)!.push({
          value: d.value.trim(),
          excelRow: d.excelRow,
          rowSpan: d.rowSpan,
          flatId: d.id,
        });
        break;
      }
      case 'B4': {
        if (!processFCs.has(pNo)) processFCs.set(pNo, []);
        processFCs.get(pNo)!.push({
          value: d.value.trim(),
          m4: d.m4,
          excelRow: d.excelRow,
          flatId: d.id,
        });
        break;
      }
    }
  }

  // B1~B5 보조정보 매칭 (FC에 연결)
  const b1Items = flatData.filter(d => d.itemCode === 'B1' && d.value?.trim());
  const bSupp = new Map<string, Map<string, { B1: string; B2: string; B3: string; B5: string }>>();
  for (const b1 of b1Items) {
    const pNo = normalizeProcessNo(b1.processNo);
    const m4 = b1.m4 || '';
    if (!bSupp.has(pNo)) bSupp.set(pNo, new Map());
    if (!bSupp.get(pNo)!.has(m4)) {
      const b2 = flatData.find(d => normalizeProcessNo(d.processNo) === pNo && d.itemCode === 'B2' && d.m4 === m4);
      const b3 = flatData.find(d => normalizeProcessNo(d.processNo) === pNo && d.itemCode === 'B3' && d.m4 === m4);
      const b5 = flatData.find(d => normalizeProcessNo(d.processNo) === pNo && d.itemCode === 'B5' && d.m4 === m4);
      bSupp.get(pNo)!.set(m4, {
        B1: b1.value || '', B2: b2?.value || '', B3: b3?.value || '', B5: b5?.value || '',
      });
    }
  }

  // A6(검출관리) 수집 — 공정별 Map (L2 레벨)
  const processDCs = new Map<string, string>();
  for (const d of flatData) {
    if (d.itemCode === 'A6' && d.value?.trim() && d.processNo) {
      const npNo = normalizeProcessNo(d.processNo);
      if (npNo && !processDCs.has(npNo)) {
        processDCs.set(npNo, d.value.trim());
      }
    }
  }

  // ── ★ 사실기반 사슬 생성 — FC 1행 1체인 + FM carry (rowSpan 창에 FC 버리지 않음) ──
  let idx = 0;
  const cfFeValue = uniqueFEList.length > 0 ? uniqueFEList[0]! : defaultFE;

  /**
   * FC 행 f → FM 인덱스 (공정 내)
   * - 유효 excelRow 가진 FM만 오름차순 정렬해 구간 [Rᵢ, Rᵢ₊₁) 배정 (f < 첫 R → 첫 R 그룹, f ≥ 마지막 R → 마지막 R 그룹 + excelRow 없는 FM RR)
   * - 동일 R에 FM 여러 개면 해당 구간에서 roundRobinIdx로 분배
   */
  function pickFmIndexForFc(fms: FMItem[], fc: FCItem, roundRobinIdx: number): number {
    if (fms.length === 0) return 0;
    if (fms.length === 1) return 0;
    if (fc.excelRow == null) return roundRobinIdx % fms.length;

    const f = fc.excelRow;
    type Slot = { idx: number; r: number };
    const slots: Slot[] = [];
    const noRowIdx: number[] = [];
    for (let i = 0; i < fms.length; i++) {
      const r = fms[i].excelRow;
      if (r != null && r > 0) slots.push({ idx: i, r });
      else noRowIdx.push(i);
    }
    if (slots.length === 0) return roundRobinIdx % fms.length;

    slots.sort((a, b) => (a.r !== b.r ? a.r - b.r : a.idx - b.idx));

    const pickFromRow = (targetR: number): number => {
      const tie = slots.filter(s => s.r === targetR);
      if (tie.length === 1) return tie[0]!.idx;
      return tie[roundRobinIdx % tie.length]!.idx;
    };

    const firstR = slots[0]!.r;
    const lastR = slots[slots.length - 1]!.r;

    if (f < firstR) return pickFromRow(firstR);

    if (f >= lastR) {
      const tailIdx = [...slots.filter(s => s.r === lastR).map(s => s.idx), ...noRowIdx];
      if (tailIdx.length === 0) return pickFromRow(lastR);
      return tailIdx[roundRobinIdx % tailIdx.length]!;
    }

    for (let i = 0; i < slots.length - 1; i++) {
      const curR = slots[i]!.r;
      const nextR = slots[i + 1]!.r;
      if (curR <= f && f < nextR) return pickFromRow(curR);
    }

    return roundRobinIdx % fms.length;
  }

  function feForFm(fm: FMItem): { scope: string; value: string; feFlatId?: string } {
    if (canFeRowLink && fm.excelRow != null && c4RowEntries.length > 0) {
      return pickFeAtOrBeforeRow(fm.excelRow);
    }
    return { scope: cfFeValue.scope, value: cfFeValue.value, feFlatId: undefined };
  }

  function feForFc(fc: FCItem): { scope: string; value: string; feFlatId?: string } {
    if (canFeRowLink && fc.excelRow != null && c4RowEntries.length > 0) {
      return pickFeAtOrBeforeRow(fc.excelRow);
    }
    return { scope: cfFeValue.scope, value: cfFeValue.value, feFlatId: undefined };
  }

  const sortedProcessNos = [...new Set([...processFMs.keys(), ...processFCs.keys()])].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );

  for (const processNo of sortedProcessNos) {
    const fms = processFMs.get(processNo) || [];
    const fcs = processFCs.get(processNo) || [];
    const info = processInfo.get(processNo) || { A2: '', A3: '', A4: '' };

    if (fms.length === 0 && fcs.length === 0) continue;

    // ★ A5 없이 B4만 있는 공정 — 이전에는 전부 스킵되어 FC 누락
    if (fms.length === 0 && fcs.length > 0) {
      const fcOnlyIndexed = fcs.map((fc, i) => ({ fc, i }));
      fcOnlyIndexed.sort((a, b) => {
        const ra = a.fc.excelRow ?? 1e9;
        const rb = b.fc.excelRow ?? 1e9;
        if (ra !== rb) return ra - rb;
        return a.i - b.i;
      });
      for (const { fc } of fcOnlyIndexed) {
        const assignedFE = feForFc(fc);
        const supp = bSupp.get(processNo)?.get(fc.m4 || '') ||
          bSupp.get(processNo)?.values().next().value;
        chains.push({
          id: `fc-${idx++}`,
          processNo,
          m4: fc.m4 || undefined,
          workElement: supp?.B1 || undefined,
          fmValue: '',
          fcValue: fc.value,
          feValue: assignedFE.value,
          feScope: assignedFE.scope || undefined,
          l2Function: info.A3,
          productChar: info.A4,
          l3Function: supp?.B2 || undefined,
          processChar: supp?.B3 || undefined,
          specialChar: (info as any).A4SC || undefined,
          pcValue: supp?.B5 || undefined,
          dcValue: processDCs.get(processNo) || undefined,
          excelRow: fc.excelRow ?? undefined,
          fcFlatId: fc.flatId,
          feFlatId: assignedFE.feFlatId,
        });
      }
      continue;
    }

    if (fms.length > 0 && fcs.length === 0) {
      for (const fm of fms) {
        const assignedFE = feForFm(fm);
        chains.push({
          id: `fc-${idx++}`,
          processNo,
          fmValue: fm.value,
          fcValue: '',
          feValue: assignedFE.value,
          feScope: assignedFE.scope || undefined,
          l2Function: info.A3,
          productChar: info.A4,
          specialChar: (info as any).A4SC || undefined,
          excelRow: fm.excelRow ?? undefined,
          fmFlatId: fm.flatId,
          feFlatId: assignedFE.feFlatId,
        });
      }
      continue;
    }

    const fcIndexed = fcs.map((fc, i) => ({ fc, i }));
    fcIndexed.sort((a, b) => {
      const ra = a.fc.excelRow ?? 1e9;
      const rb = b.fc.excelRow ?? 1e9;
      if (ra !== rb) return ra - rb;
      return a.i - b.i;
    });

    const fmIndicesUsed = new Set<number>();

    for (let oi = 0; oi < fcIndexed.length; oi++) {
      const { fc } = fcIndexed[oi]!;
      const fmIndex = pickFmIndexForFc(fms, fc, oi);
      fmIndicesUsed.add(fmIndex);
      const fm = fms[fmIndex]!;
      const assignedFE = feForFm(fm);

      const supp = bSupp.get(processNo)?.get(fc.m4 || '') ||
        bSupp.get(processNo)?.values().next().value;

      chains.push({
        id: `fc-${idx++}`,
        processNo,
        m4: fc.m4 || undefined,
        workElement: supp?.B1 || undefined,
        fmValue: fm.value,
        fcValue: fc.value,
        feValue: assignedFE.value,
        feScope: assignedFE.scope || undefined,
        l2Function: info.A3,
        productChar: info.A4,
        l3Function: supp?.B2 || undefined,
        processChar: supp?.B3 || undefined,
        specialChar: (info as any).A4SC || undefined,
        pcValue: supp?.B5 || undefined,
        dcValue: processDCs.get(processNo) || undefined,
        excelRow: fc.excelRow ?? fm.excelRow ?? undefined,
        fmFlatId: fm.flatId,
        fcFlatId: fc.flatId,
        feFlatId: assignedFE.feFlatId,
      });
    }

    for (let i = 0; i < fms.length; i++) {
      if (fmIndicesUsed.has(i)) continue;
      const fm = fms[i]!;
      const assignedFE = feForFm(fm);
      chains.push({
        id: `fc-${idx++}`,
        processNo,
        fmValue: fm.value,
        fcValue: '',
        feValue: assignedFE.value,
        feScope: assignedFE.scope || undefined,
        l2Function: info.A3,
        productChar: info.A4,
        specialChar: (info as any).A4SC || undefined,
        excelRow: fm.excelRow ?? undefined,
        fmFlatId: fm.flatId,
        feFlatId: assignedFE.feFlatId,
      });
    }
  }

  return chains;
}

// ─── AP 자동 산출 (SOD → H/M/L) ───

/** AIAG-VDA FMEA 1st Edition AP 매트릭스 (S×O×D → H/M/L) */
export function calculateAP(s: number, o: number, d: number): 'H' | 'M' | 'L' {
  if (s <= 0 || o <= 0 || d <= 0) return 'L';
  if (s === 1) return 'L';

  // S=10
  if (s === 10) {
    if (o >= 7) return 'H';
    if (o === 6) return 'H';
    if (o === 5) return d >= 2 ? 'H' : 'M';
    if (o === 4) return d >= 4 ? 'H' : 'M';
    if (o === 3) return d >= 6 ? 'H' : 'M';
    if (o === 2) return d >= 3 ? (d >= 8 ? 'H' : 'M') : 'L';
    if (o === 1) return d >= 7 ? 'M' : 'L';
  }
  // S=9
  if (s === 9) {
    if (o >= 7) return 'H';
    if (o === 6) return d >= 2 ? 'H' : 'M';
    if (o === 5) return d >= 3 ? 'H' : 'M';
    if (o === 4) return d >= 5 ? 'H' : 'M';
    if (o === 3) return d >= 7 ? 'H' : (d >= 2 ? 'M' : 'L');
    if (o === 2) return d >= 9 ? 'H' : (d >= 4 ? 'M' : 'L');
    if (o === 1) return d >= 8 ? 'M' : 'L';
  }
  // S=8
  if (s === 8) {
    if (o >= 7) return 'H';
    if (o === 6) return d >= 2 ? 'H' : 'M';
    if (o === 5) return d >= 4 ? 'H' : 'M';
    if (o === 4) return d >= 6 ? 'H' : (d >= 2 ? 'M' : 'L');
    if (o === 3) return d >= 8 ? 'H' : (d >= 3 ? 'M' : 'L');
    if (o === 2) return d >= 10 ? 'H' : (d >= 5 ? 'M' : 'L');
    if (o === 1) return d >= 9 ? 'M' : 'L';
  }
  // S=7
  if (s === 7) {
    if (o >= 7) return 'H';
    if (o === 6) return d >= 3 ? 'H' : 'M';
    if (o === 5) return d >= 5 ? 'H' : (d >= 2 ? 'M' : 'L');
    if (o === 4) return d >= 7 ? 'H' : (d >= 3 ? 'M' : 'L');
    if (o === 3) return d >= 9 ? 'H' : (d >= 4 ? 'M' : 'L');
    if (o === 2) return d >= 6 ? 'M' : 'L';
    if (o === 1) return d >= 10 ? 'M' : 'L';
  }
  // S=5~6
  if (s >= 5 && s <= 6) {
    if (o >= 7) return d >= 3 ? 'H' : 'M';
    if (o === 6) return d >= 5 ? 'H' : (d >= 2 ? 'M' : 'L');
    if (o === 5) return d >= 7 ? 'H' : (d >= 3 ? 'M' : 'L');
    if (o === 4) return d >= 9 ? 'H' : (d >= 4 ? 'M' : 'L');
    if (o === 3) return d >= 5 ? 'M' : 'L';
    if (o === 2) return d >= 8 ? 'M' : 'L';
    if (o === 1) return 'L';
  }
  // S=2~4
  if (s >= 2 && s <= 4) {
    if (o >= 7) return d >= 6 ? 'H' : (d >= 2 ? 'M' : 'L');
    if (o === 6) return d >= 9 ? 'H' : (d >= 4 ? 'M' : 'L');
    if (o === 5) return d >= 5 ? 'M' : 'L';
    if (o === 4) return d >= 7 ? 'M' : 'L';
    if (o === 3) return d >= 9 ? 'M' : 'L';
    return 'L';
  }

  return 'L';
}
