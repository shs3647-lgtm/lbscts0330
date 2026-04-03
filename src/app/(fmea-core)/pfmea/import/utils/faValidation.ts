/**
 * @file faValidation.ts
 * @description FA(통합분석) 확정 전 검증 — PRD 15개 검증항목 (FA_C0~FA_C5, S1~S10)
 * @see docs/fa 검증_prd.md
 *
 * ⚠️ 네임스페이스 분리 (2026-04-03):
 *   PRD 체크리스트 코드: FA_C0~FA_C5 (FA 전용)
 *   FMEA 컬럼 코드: C1~C4 (PFMEA Import 표준)
 *   이전에는 둘 다 'C4' 같은 문자열을 사용하여 혼동 위험이 있었음.
 * 
 * ★★★ 2026-02-24: 3중 검증 추가 (엑셀수식 vs 스캐너 vs 파서) ★★★
 */

import type { ImportedFlatData } from '../types';
import type { MasterFailureChain } from '../types/masterFailureChain';
import type { ExcelFormulaVerify } from '../excel-parser-verification';

/**
 * FA PRD 체크리스트 코드 — FMEA 컬럼 코드(C1~C4)와 별개 네임스페이스
 * @see docs/CODE_NAMESPACE_MAP.md 섹션 2
 */
const FA_PRD = {
  C0: 'FA_C0',  // 엑셀 수식 vs 파서 불일치
  C1: 'FA_C1',  // FC시트 없음 / 체인 건수 불일치
  C2: 'FA_C2',  // FM 고유건수 불일치
  C3: 'FA_C3',  // FC 고유건수 불일치
  C4: 'FA_C4',  // FE 고유건수 불일치
  C5: 'FA_C5',  // verificationPass 실패
} as const;

export interface FAValidationExpected {
  chainCount: number;
  fmCount: number;
  fcCount: number;
  feCount: number;
  hasVerification: boolean;
  verificationPass: boolean;
  // ★★★ 2026-02-24: 엑셀 수식 검증값 (진정한 독립 기준) ★★★
  excelFormulas?: ExcelFormulaVerify;
}

export interface FAValidationResult {
  pass: boolean;
  issues: string[];
  /** PRD 항목 번호 (C1~C5, S1~S10) — 디버깅·추적용 */
  failedItems?: string[];
}

const M4_ALLOWED = new Set(['mn', 'mc', 'im', 'en']);

function norm(v: string | undefined): string {
  return (v || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function has(v: string | undefined): boolean {
  return !!v && v.trim().length > 0;
}

function byProcessValues(flatData: ImportedFlatData[], itemCode: string): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const row of flatData) {
    if (row.itemCode !== itemCode || !has(row.processNo) || !has(row.value)) continue;
    const pNo = row.processNo.trim();
    if (!map.has(pNo)) map.set(pNo, new Set<string>());
    map.get(pNo)!.add(norm(row.value));
  }
  return map;
}

/** B1(작업요소) per processNo — S9 workElement 매핑 검증용 */
function b1ByProcess(flatData: ImportedFlatData[]): Map<string, Set<string>> {
  return byProcessValues(flatData, 'B1');
}

export function validateFADataConsistency(
  chains: MasterFailureChain[],
  flatData: ImportedFlatData[],
  expected: FAValidationExpected,
): FAValidationResult {
  const issues: string[] = [];
  const failedItems: string[] = [];

  if (!chains || chains.length === 0) {
    return { pass: false, issues: ['FC 시트 데이터가 없습니다.'], failedItems: [FA_PRD.C1] };
  }

  // ─── C1~C5: Count 검증 ───
  const fmUnique = new Set(chains.map(c => norm(c.fmValue)).filter(Boolean)).size;
  const fcUnique = new Set(chains.map(c => norm(c.fcValue)).filter(Boolean)).size;
  const feUnique = new Set(chains.map(c => norm(c.feValue)).filter(Boolean)).size;
  const chainCount = chains.length;

  // ★★★ 2026-02-24: 엑셀 수식 기반 3중 검증 (진정한 독립 기준) ★★★
  const excel = expected.excelFormulas;
  if (excel && excel.hasVerifySheet) {
    const eChain = excel.chainCount ?? 0;
    const eFm = excel.fmCount ?? 0;
    const eFc = excel.fcCount ?? 0;
    const eFe = excel.feCount ?? 0;
    const eS3 = excel.s3Miss ?? 0;
    const eS4 = excel.s4Miss ?? 0;
    const eS5 = excel.s5Miss ?? 0;
    if (eChain > 0 && eChain !== chainCount) {
      issues.push(`[엑셀수식↔파서] 체인건수 불일치 (엑셀=${eChain}, 파서=${chainCount})`);
      failedItems.push(FA_PRD.C0);
    }
    if (eFm > 0 && eFm !== fmUnique) {
      issues.push(`[엑셀수식↔파서] FM건수 불일치 (엑셀=${eFm}, 파서=${fmUnique})`);
      failedItems.push(FA_PRD.C0);
    }
    if (eFc > 0 && eFc !== fcUnique) {
      issues.push(`[엑셀수식↔파서] FC건수 불일치 (엑셀=${eFc}, 파서=${fcUnique})`);
      failedItems.push(FA_PRD.C0);
    }
    if (eFe > 0 && eFe !== feUnique) {
      issues.push(`[엑셀수식↔파서] FE건수 불일치 (엑셀=${eFe}, 파서=${feUnique})`);
      failedItems.push(FA_PRD.C0);
    }
    if (eS3 > 0) {
      issues.push(`[엑셀수식] 공정번호 누락 ${eS3}건 (FC→A1)`);
      failedItems.push('S3');
    }
    if (eS4 > 0) {
      issues.push(`[엑셀수식] FM 누락 ${eS4}건 (FC→A5)`);
      failedItems.push('S4');
    }
    if (eS5 > 0) {
      issues.push(`[엑셀수식] FC 누락 ${eS5}건 (FC→B4)`);
      failedItems.push('S5');
    }
  }

  if (expected.hasVerification && !expected.verificationPass) {
    issues.push('원본대조 검증 실패');
    failedItems.push(FA_PRD.C5);
  }
  if (expected.chainCount > 0 && chainCount !== expected.chainCount) {
    issues.push(`체인 건수 불일치 (기대 ${expected.chainCount}, 실제 ${chainCount})`);
    failedItems.push(FA_PRD.C1);
  }
  if (expected.fmCount > 0 && fmUnique !== expected.fmCount) {
    issues.push(`FM 고유건수 불일치 (예상 ${expected.fmCount}, 현재 ${fmUnique})`);
    failedItems.push(FA_PRD.C2);
  }
  if (expected.fcCount > 0 && fcUnique !== expected.fcCount) {
    issues.push(`FC 고유건수 불일치 (예상 ${expected.fcCount}, 현재 ${fcUnique})`);
    failedItems.push(FA_PRD.C3);
  }
  if (expected.feCount > 0 && feUnique !== expected.feCount) {
    issues.push(`FE 고유건수 불일치 (예상 ${expected.feCount}, 현재 ${feUnique})`);
    failedItems.push(FA_PRD.C4);
  }

  // ─── S1~S8: Consistency 필수 ───
  const processSet = new Set(
    flatData
      .filter(r => r.itemCode === 'A1' && has(r.processNo))
      .map(r => r.processNo.trim()),
  );
  const fmByProcess = byProcessValues(flatData, 'A5');
  const fcByProcess = byProcessValues(flatData, 'B4');
  const feSet = new Set(
    flatData
      .filter(r => r.itemCode === 'C4' && has(r.value))
      .map(r => norm(r.value)),
  );
  const b1ByP = b1ByProcess(flatData);

  let missingRequired = 0;
  let unknownProcess = 0;
  let fmMismatch = 0;
  let fcMismatch = 0;
  let feMismatch = 0;
  const missingRows: number[] = [];
  const unknownProcessNos: string[] = [];
  const fmMismatchDetails: { processNo: string; value: string }[] = [];
  const fcMismatchDetails: { processNo: string; value: string }[] = [];
  const feMismatchDetails: string[] = [];

  for (let i = 0; i < chains.length; i++) {
    const c = chains[i];
    const pNo = (c.processNo || '').trim();
    const fm = norm(c.fmValue);
    const fc = norm(c.fcValue);
    const fe = norm(c.feValue);

    if (!has(pNo) || !has(c.fmValue) || !has(c.fcValue) || !has(c.feValue)) {
      missingRequired++;
      missingRows.push(i + 1);
      continue;
    }
    if (!processSet.has(pNo)) {
      unknownProcess++;
      if (!unknownProcessNos.includes(pNo)) unknownProcessNos.push(pNo);
      continue;
    }
    if (!fmByProcess.get(pNo)?.has(fm)) {
      fmMismatch++;
      fmMismatchDetails.push({ processNo: pNo, value: c.fmValue });
    }
    if (!fcByProcess.get(pNo)?.has(fc)) {
      fcMismatch++;
      fcMismatchDetails.push({ processNo: pNo, value: c.fcValue });
    }
    if (!feSet.has(fe)) {
      feMismatch++;
      feMismatchDetails.push(c.feValue);
    }
  }

  if (missingRequired > 0) {
    const sample = missingRows.slice(0, 3).join(', ');
    issues.push(`필수값 누락 ${missingRequired}건 (processNo/FM/FC/FE) — 행 ${sample}${missingRows.length > 3 ? '…' : ''}`);
    failedItems.push('S1', 'S2', 'S3', 'S4');
  }
  if (unknownProcess > 0) {
    issues.push(`processNo 미존재 (공정: ${unknownProcessNos.slice(0, 5).join(', ')}${unknownProcessNos.length > 5 ? '…' : ''})`);
    failedItems.push('S5');
  }
  if (fmMismatch > 0) {
    const d = fmMismatchDetails[0];
    issues.push(`fmValue 공정 불일치 ${fmMismatch}건 (예: 공정 ${d?.processNo}, 값 "${d?.value}")`);
    failedItems.push('S6');
  }
  if (fcMismatch > 0) {
    const d = fcMismatchDetails[0];
    issues.push(`fcValue 공정 불일치 ${fcMismatch}건 (예: 공정 ${d?.processNo}, 값 "${d?.value}")`);
    failedItems.push('S7');
  }
  if (feMismatch > 0) {
    const sample = [...new Set(feMismatchDetails)].slice(0, 3).join('", "');
    issues.push(`feValue 미존재 ${feMismatch}건 (예: "${sample}")`);
    failedItems.push('S8');
  }

  // ─── S9: m4 허용값·매핑 ───
  const chainsWithM4 = chains.filter(c => has(c.m4));
  if (chainsWithM4.length > 0) {
    const invalidM4: string[] = [];
    let workElementMismatch = 0;
    for (const c of chainsWithM4) {
      const m4Norm = norm(c.m4);
      if (!M4_ALLOWED.has(m4Norm)) invalidM4.push(c.m4 || '');
      // workElement(B1) 매핑: m4 사용 시 workElement가 해당 공정 B1에 존재해야 함
      if (has(c.workElement)) {
        const b1Set = b1ByP.get((c.processNo || '').trim());
        if (b1Set && !b1Set.has(norm(c.workElement))) workElementMismatch++;
      }
    }
    if (invalidM4.length > 0) {
      const uniq = [...new Set(invalidM4)].slice(0, 3).join(', ');
      issues.push(`m4 허용값 위반 (값: ${uniq}) — MN|MC|IM|EN만 허용`);
      failedItems.push('S9');
    }
    if (workElementMismatch > 0) {
      issues.push(`m4-workElement 매핑 오류 ${workElementMismatch}건`);
      failedItems.push('S9');
    }
  }

  // ─── S10: 선택컬럼 전건검증 (A3,A4,B2,B3,PC,DC,S/O/D/AP) ───
  // 1건이라도 있으면 해당 필드 형식 검증 (S/O/D 1~10, AP는 H/M/L)
  if (chains.some(c => c.severity != null || c.occurrence != null || c.detection != null)) {
    const invalidSod = chains.filter(c => {
      const s = c.severity, o = c.occurrence, d = c.detection;
      if (s == null && o == null && d == null) return false;
      return (s != null && (s < 1 || s > 10)) ||
        (o != null && (o < 1 || o > 10)) ||
        (d != null && (d < 1 || d > 10));
    });
    if (invalidSod.length > 0) {
      issues.push(`선택컬럼 값 오류 (S/O/D, 1~10 범위 위반 ${invalidSod.length}건)`);
      failedItems.push('S10');
    }
  }
  const invalidAp = chains.filter(c => has(c.ap) && !/^[HML]$/i.test(norm(c.ap)));
  if (invalidAp.length > 0) {
    issues.push(`선택컬럼 값 오류 (AP, H/M/L만 허용, ${invalidAp.length}건 위반)`);
    failedItems.push('S10');
  }

  const uniqueFailed = [...new Set(failedItems)];
  return { pass: issues.length === 0, issues, failedItems: uniqueFailed };
}

