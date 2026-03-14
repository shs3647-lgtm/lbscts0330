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
 */

/** FM 아이템 (행 위치 포함) */
interface FMItem { value: string; excelRow?: number; rowSpan?: number }
/** FC 아이템 (행 위치 포함) */
interface FCItem { value: string; m4?: string; excelRow?: number }

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

  // ── 공정별 FM(A5) — excelRow/rowSpan 보존 ──
  const processFMs = new Map<string, FMItem[]>();
  // ── 공정별 FC(B4) — excelRow 보존 ──
  const processFCs = new Map<string, FCItem[]>();
  const processInfo = new Map<string, { A2: string; A3: string; A4: string; A4SC?: string }>();

  for (const d of flatData) {
    // ★★★ 2026-03-01: processNo 정규화 — 파싱 단계와 동일 포맷 보장 ★★★
    const pNo = normalizeProcessNo(d.processNo);
    if (!pNo || pNo === '00' || pNo === '공통') continue;
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
        });
        break;
      }
      case 'B4': {
        if (!processFCs.has(pNo)) processFCs.set(pNo, []);
        processFCs.get(pNo)!.push({
          value: d.value.trim(),
          m4: d.m4,
          excelRow: d.excelRow,
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

  // ── ★ 사실기반 사슬 생성 — 행 매칭 (카테시안 금지) ──
  let idx = 0;
  // ★★★ 2026-03-14 I-1: round-robin → carry-forward (FE는 L1 글로벌 레벨이므로 직전 FE 유지) ★★★
  let cfFeValue = uniqueFEList.length > 0 ? uniqueFEList[0] : defaultFE;
  for (const [processNo, fms] of processFMs.entries()) {
    const fcs = processFCs.get(processNo) || [];
    const info = processInfo.get(processNo) || { A2: '', A3: '', A4: '' };

    // excelRow 데이터 존재 여부 판별
    const hasRowData = fms.some(fm => fm.excelRow != null) && fcs.some(fc => fc.excelRow != null);

    // ★ rowSpan 미설정 시 FM 간 간격으로 추론 (파서가 rowSpan을 채우지 않으므로)
    // ★ P4: 마지막 FM의 범위를 실제 FC 데이터 범위로 정확하게 제한
    if (hasRowData) {
      const sorted = fms.filter(fm => fm.excelRow != null).sort((a, b) => a.excelRow! - b.excelRow!);
      const maxFcRow = Math.max(0, ...fcs.filter(fc => fc.excelRow != null).map(fc => fc.excelRow!));
      const minFcRow = Math.min(Infinity, ...fcs.filter(fc => fc.excelRow != null).map(fc => fc.excelRow!));
      for (let i = 0; i < sorted.length; i++) {
        if (sorted[i].rowSpan == null || sorted[i].rowSpan === 0) {
          if (i + 1 < sorted.length) {
            // 다음 FM까지의 간격
            sorted[i].rowSpan = sorted[i + 1].excelRow! - sorted[i].excelRow!;
          } else {
            // ★ P4: 마지막 FM — 자신의 행 이후에 있는 FC만 카운트하여 범위 제한
            const fcsAfterLastFm = fcs.filter(fc => fc.excelRow != null && fc.excelRow! >= sorted[i].excelRow!);
            sorted[i].rowSpan = fcsAfterLastFm.length > 0
              ? Math.max(...fcsAfterLastFm.map(fc => fc.excelRow!)) - sorted[i].excelRow! + 1
              : 1;
          }
        }
      }
    }

    for (let fmIdx = 0; fmIdx < fms.length; fmIdx++) {
      const fm = fms[fmIdx];

      // ★ FE 할당 (carry-forward — 직전 FE 유지, L1 글로벌 레벨)
      const assignedFE = cfFeValue;

      // ── FM에 매칭되는 FC 결정 (사실 기반) ──
      let matchedFCs: FCItem[];

      if (hasRowData && fm.excelRow != null && fm.rowSpan) {
        // ★ 행 기반 매칭: FM 행 범위 내의 FC만 연결
        const rowEnd = fm.excelRow + fm.rowSpan - 1;
        matchedFCs = fcs.filter(fc =>
          fc.excelRow != null && fc.excelRow >= fm.excelRow! && fc.excelRow <= rowEnd,
        );
      } else if (fcs.length > 0) {
        // ★★★ 2026-03-01 FIX: 라운드로빈 분배 — 모든 FM에 최소 1개 FC 보장 ★★★
        // 이전(Math.ceil chunking): 앞쪽 FM이 FC 과다소비 → 뒤쪽 FM에 FC 미할당 (16건 누락)
        // 수정: floor + 나머지 균등 분배 → FM ≤ FC이면 모든 FM에 최소 1건 보장
        const base = Math.floor(fcs.length / fms.length);
        const remainder = fcs.length % fms.length;
        let offset = 0;
        for (let i = 0; i < fmIdx; i++) {
          offset += base + (i < remainder ? 1 : 0);
        }
        const count = base + (fmIdx < remainder ? 1 : 0);
        matchedFCs = fcs.slice(offset, offset + count);
      } else {
        matchedFCs = [];
      }

      if (matchedFCs.length === 0) {
        // FM만 있고 매칭 FC 없음 → FM 전용 사슬 1개
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
        });
      } else {
        // FM + 매칭된 FC들만 사슬 생성
        for (const fc of matchedFCs) {
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
          });
        }
      }
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
