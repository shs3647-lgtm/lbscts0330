/**
 * @file import-validation.ts
 * @description Import 데이터 종합 검증 유틸리티
 * @created 2026-02-07
 * @codefreeze 2026-02-07
 *
 * 검증 항목:
 * 1. 시트 간 교차 중복 검출 (같은 공정 내 서로 다른 컬럼에 동일한 값)
 * 2. 데이터 형식 추론 검증 (컬럼에 맞지 않는 데이터 패턴)
 * 3. 구조 완전성 검증 (B1↔B2 매칭, B3/A3 누락 체크)
 *
 * ★★★ 핵심 규칙 (2026-02-07 확정) ★★★
 * - 공정번호가 다르면 다른 데이터 → 교차 검증은 같은 공정 내에서만 수행
 * - 같은 공정 내 같은 컬럼에 동일 값 복수 존재 = 정상 (다른 작업요소별 별도 항목)
 *   예: 공정 20의 A4(제품특성)에 "BURR"가 3회 → 3개 작업요소 각각의 제품특성이므로 정상
 * - 시트 내 동일 중복 검출은 수행하지 않음 (오탐 방지)
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


import { ParseResult, ProcessRelation, ProductRelation } from '../excel-parser';
import type { MasterFailureChain } from '../types/masterFailureChain';

// ─── 1. 시트 간 교차 중복 검출 ───────────────────────────────────

/** 같은 공정번호 내에서 서로 다른 컬럼에 동일한 값이 입력된 경우 검출 (공정별만 - 다른 공정은 비교 안함) */
function checkCrossColumnOverlap(processes: ProcessRelation[]): string[] {
  const warnings: string[] = [];

  // ★ 같은 공정번호 내에서만 교차 검증 (공정번호가 다르면 다른 데이터이므로 비교 안함)
  processes.forEach(p => {
    const pName = p.processName?.trim() || '';

    // A2(공정명) ↔ A4(제품특성)
    if (pName && p.productChars.some(v => v.trim() === pName)) {
      warnings.push(`  공정 ${p.processNo}: A2(공정명) ↔ A4(제품특성) 동일 값 "${pName}"`);
    }
    // A2(공정명) ↔ A5(고장형태)
    if (pName && p.failureModes.some(v => v.trim() === pName)) {
      warnings.push(`  공정 ${p.processNo}: A2(공정명) ↔ A5(고장형태) 동일 값 "${pName}"`);
    }
    // A2(공정명) ↔ B3(공정특성)
    if (pName && p.processChars.some(v => v.trim() === pName)) {
      warnings.push(`  공정 ${p.processNo}: A2(공정명) ↔ B3(공정특성) 동일 값 "${pName}"`);
    }
    // A4(제품특성) ↔ B3(공정특성) per-process
    if (p.productChars.length > 0 && p.processChars.length > 0) {
      const trimmedPC = p.processChars.map(c => c.trim());
      const overlap = p.productChars.filter(v => trimmedPC.includes(v.trim()));
      if (overlap.length > 0) {
        const samples = overlap.slice(0, 3).map(v => `"${v.trim()}"`).join(', ');
        warnings.push(`  공정 ${p.processNo}: A4(제품특성) ↔ B3(공정특성) ${overlap.length}건 동일: ${samples}`);
      }
    }
    // A5(고장형태) ↔ B4(고장원인) per-process
    if (p.failureModes.length > 0 && p.failureCauses.length > 0) {
      const trimmedFC = p.failureCauses.map(c => c.trim());
      const overlap = p.failureModes.filter(v => trimmedFC.includes(v.trim()));
      if (overlap.length > 0) {
        const samples = overlap.slice(0, 3).map(v => `"${v.trim()}"`).join(', ');
        warnings.push(`  공정 ${p.processNo}: A5(고장형태) ↔ B4(고장원인) ${overlap.length}건 동일: ${samples}`);
      }
    }
    // A3(공정기능) ↔ A4(제품특성) per-process
    if (p.processDesc.length > 0 && p.productChars.length > 0) {
      const trimmedPD = p.processDesc.map(c => c.trim());
      const overlap = p.productChars.filter(v => trimmedPD.includes(v.trim()));
      if (overlap.length > 0) {
        const samples = overlap.slice(0, 3).map(v => `"${v.trim()}"`).join(', ');
        warnings.push(`  공정 ${p.processNo}: A3(공정기능) ↔ A4(제품특성) ${overlap.length}건 동일: ${samples}`);
      }
    }
  });

  return warnings;
}

// ─── 2. 데이터 형식 추론 검증 ────────────────────────────────────

/** 컬럼에 맞지 않는 데이터 패턴 검출 */
function checkDataTypeInference(processes: ProcessRelation[]): string[] {
  const warnings: string[] = [];

  processes.forEach(p => {
    // 공정번호: 숫자 또는 숫자+문자 조합이어야 함 (예: 10, 20, 30, 10A)
    if (p.processNo && !/^[\d]+[A-Za-z]?$/.test(p.processNo.trim())) {
      warnings.push(`  공정번호 "${p.processNo}" - 비정상 형식 (예상: 10, 20, 30...)`);
    }

    // 공정명: 50자 초과는 다른 컬럼 데이터 오입력 가능성
    if (p.processName && p.processName.trim().length > 50) {
      warnings.push(`  공정 ${p.processNo}: A2(공정명) 50자 초과 - 다른 컬럼 데이터 가능성`);
    }

    // 제품특성(A4)에 숫자만 입력 → 공정번호 오입력 가능성
    p.productChars.forEach(v => {
      if (/^\d+$/.test(v.trim())) {
        warnings.push(`  공정 ${p.processNo}: A4(제품특성) "${v}" - 숫자만 입력됨 (공정번호 오입력 가능성)`);
      }
    });

    // 공정특성(B3)에 숫자만 입력 → 공정번호 오입력 가능성
    p.processChars.forEach(v => {
      if (/^\d+$/.test(v.trim())) {
        warnings.push(`  공정 ${p.processNo}: B3(공정특성) "${v}" - 숫자만 입력됨 (공정번호 오입력 가능성)`);
      }
    });

    // 고장형태(A5)에 숫자만 입력 → 공정번호 오입력 가능성
    p.failureModes.forEach(v => {
      if (/^\d+$/.test(v.trim())) {
        warnings.push(`  공정 ${p.processNo}: A5(고장형태) "${v}" - 숫자만 입력됨 (공정번호 오입력 가능성)`);
      }
    });

    // 고장원인(B4)에 숫자만 입력 → 공정번호 오입력 가능성
    p.failureCauses.forEach(v => {
      if (/^\d+$/.test(v.trim())) {
        warnings.push(`  공정 ${p.processNo}: B4(고장원인) "${v}" - 숫자만 입력됨 (공정번호 오입력 가능성)`);
      }
    });
  });

  return warnings;
}

// ─── 3. 구조 완전성 검증 (B1↔B2 매칭) ────────────────────────────

/** 작업요소(B1)에 대응하는 작업요소기능(B2)이 존재하는지 검증 */
function checkStructuralCompleteness(processes: ProcessRelation[]): string[] {
  const warnings: string[] = [];

  processes.forEach(p => {
    const b1Count = p.workElements.filter(v => v.trim()).length;
    const b2Count = p.elementFuncs.filter(v => v.trim()).length;

    // B1은 있는데 B2가 전혀 없으면 → 전체 누락
    if (b1Count > 0 && b2Count === 0) {
      warnings.push(`  공정 ${p.processNo}: B1(작업요소) ${b1Count}건 있으나 B2(작업요소기능) 0건 — 전체 누락`);
    }
    // B1보다 B2가 적으면 → 부분 누락 가능
    else if (b1Count > 0 && b2Count < b1Count) {
      warnings.push(`  공정 ${p.processNo}: B1(작업요소) ${b1Count}건 > B2(작업요소기능) ${b2Count}건 — ${b1Count - b2Count}건 누락 가능`);
    }

    // B3(공정특성) 누락 체크
    const b3Count = p.processChars.filter(v => v.trim()).length;
    if (b1Count > 0 && b3Count === 0) {
      warnings.push(`  공정 ${p.processNo}: B3(공정특성) 0건 — 전체 누락 (STEP A 보완 필요)`);
    }

    // A3(공정기능) 누락 체크
    const a3Count = p.processDesc.filter(v => v.trim()).length;
    if (a3Count === 0 && p.processName?.trim()) {
      warnings.push(`  공정 ${p.processNo}: A3(공정기능) 0건 — 누락`);
    }
  });

  return warnings;
}

// ─── 4. L1 요구사항↔고장영향 1:N 검증 (C3↔C4) ─────────────────

/** 각 구분(YP/SP/USER)별로 C3(요구사항) 대비 C4(고장영향) 부족 검출 */
function checkRequirementFECoverage(products: ProductRelation[]): string[] {
  const errors: string[] = [];

  for (const prod of products) {
    const typeName = prod.productProcessName?.trim() || '?';
    const c3Count = prod.requirements.filter(v => v.trim()).length;
    const c4Count = prod.failureEffects.filter(v => v.trim()).length;

    if (c3Count > 0 && c4Count === 0) {
      errors.push(`  구분 "${typeName}": C3(요구사항) ${c3Count}건 있으나 C4(고장영향) 0건 — 전체 누락`);
    } else if (c3Count > 0 && c4Count < c3Count) {
      // FE가 부족한 요구사항 목록 생성
      const missing = c3Count - c4Count;
      const missingReqs = prod.requirements.slice(0, missing).map(r => `"${r.trim().substring(0, 30)}"`);
      errors.push(
        `  구분 "${typeName}": C3(요구사항) ${c3Count}건 > C4(고장영향) ${c4Count}건` +
        ` — ${missing}건 고장영향 부족 (${missingReqs.join(', ')})`,
      );
    }
  }

  return errors;
}

// ─── 5. B1↔B2↔B3 교차매핑 사전검증 (V8-V13) ──────────────────────

/** 정규화 함수: 공백, 구두점, 특수문자 제거 후 소문자 */
function normStr(s: string): string {
  return s.replace(/[\s,.\-_\(\)]/g, '').toLowerCase();
}

/** B3/B2 텍스트에서 WE 이름 참조를 추출 (접두사 패턴: "WE명-특성명") */
function extractWERef(text: string, processNo: string): string {
  const cleaned = text.trim();
  // 패턴: "120번-EOL검사기-교정상태" → "120번-EOL검사기"
  // 패턴: "바코드스캐너-인식상태" → "바코드스캐너"
  const parts = cleaned.split('-');
  if (parts.length >= 2) {
    // 첫 파트가 공정번호면 다음 파트가 WE
    const firstPart = parts[0].replace(/번$/, '').trim();
    if (firstPart === processNo || /^\d+$/.test(firstPart)) {
      return parts.length >= 3 ? parts[1].trim() : '';
    }
    // 첫 파트가 WE명
    return parts[0].trim();
  }
  return '';
}

/** V8~V13: B1↔B2↔B3 교차매핑 위험 검출 */
function checkCrossMappingRisk(processes: ProcessRelation[]): string[] {
  const warnings: string[] = [];

  for (const p of processes) {
    const pNo = p.processNo;

    // 4M별 그룹 생성
    const b1ByM4 = new Map<string, string[]>();
    const b2ByM4 = new Map<string, string[]>();
    const b3ByM4 = new Map<string, string[]>();

    p.workElements.forEach((v, i) => {
      const m4 = p.workElements4M[i] || '';
      if (!m4) return;
      if (!b1ByM4.has(m4)) b1ByM4.set(m4, []);
      b1ByM4.get(m4)!.push(v);
    });
    p.elementFuncs.forEach((v, i) => {
      const m4 = p.elementFuncs4M[i] || '';
      if (!m4) return;
      if (!b2ByM4.has(m4)) b2ByM4.set(m4, []);
      b2ByM4.get(m4)!.push(v);
    });
    p.processChars.forEach((v, i) => {
      const m4 = p.processChars4M[i] || '';
      if (!m4) return;
      if (!b3ByM4.has(m4)) b3ByM4.set(m4, []);
      b3ByM4.get(m4)!.push(v);
    });

    for (const [m4, b1Items] of b1ByM4) {
      const b2Items = b2ByM4.get(m4) || [];
      const b3Items = b3ByM4.get(m4) || [];
      const weCount = b1Items.length;

      // V8: B1-B2 건수 정합성 (B2가 B1보다 적으면 기능 누락)
      if (weCount > 0 && b2Items.length > 0 && b2Items.length < weCount) {
        warnings.push(`  공정 ${pNo}[${m4}]: B1=${weCount} > B2=${b2Items.length} — 요소기능 ${weCount - b2Items.length}건 누락 가능`);
      }

      // V9: B1-B3 건수 정합성
      if (weCount > 0 && b3Items.length > 0 && b3Items.length < weCount) {
        warnings.push(`  공정 ${pNo}[${m4}]: B1=${weCount} > B3=${b3Items.length} — 공정특성 ${weCount - b3Items.length}건 누락 가능`);
      }

      // V10: B3 WE 접두사 정합성 (다중 WE 그룹만)
      if (weCount >= 2 && b3Items.length >= 2) {
        const b1Names = b1Items.map(n => normStr(n));
        let mismatchCount = 0;
        for (const b3Text of b3Items) {
          const weRef = extractWERef(b3Text, pNo);
          if (!weRef) continue; // 접두사 없는 항목은 스킵
          const normRef = normStr(weRef);
          const found = b1Names.some(n => n.includes(normRef) || normRef.includes(n));
          if (!found) mismatchCount++;
        }
        if (mismatchCount > 0) {
          warnings.push(`  공정 ${pNo}[${m4}]: B3 ${mismatchCount}건의 WE 참조가 B1에 없음 — 교차매핑 위험`);
        }
      }

      // V11: B2 WE 접두사 정합성
      if (weCount >= 2 && b2Items.length >= 2) {
        const b1Names = b1Items.map(n => normStr(n));
        let mismatchCount = 0;
        for (const b2Text of b2Items) {
          const weRef = extractWERef(b2Text, pNo);
          if (!weRef) continue;
          const normRef = normStr(weRef);
          const found = b1Names.some(n => n.includes(normRef) || normRef.includes(n));
          if (!found) mismatchCount++;
        }
        if (mismatchCount > 0) {
          warnings.push(`  공정 ${pNo}[${m4}]: B2 ${mismatchCount}건의 WE 참조가 B1에 없음 — 교차매핑 위험`);
        }
      }

      // V13: Extended 양식 작업요소 존재 검증
      const b3WeNames = p.processCharsWE.filter((w, i) => p.processChars4M[i] === m4 && w.trim());
      if (b3WeNames.length > 0) {
        const b1NormNames = b1Items.map(n => normStr(n));
        for (const weName of b3WeNames) {
          const normWe = normStr(weName);
          if (!normWe) continue;
          const found = b1NormNames.some(n => n === normWe || n.includes(normWe) || normWe.includes(n));
          if (!found) {
            warnings.push(`  공정 ${pNo}[${m4}]: B3 작업요소 "${weName}" → B1에 해당 WE 없음`);
          }
        }
      }

      const b2WeNames = (p.elementFuncsWE || []).filter((w, i) => p.elementFuncs4M[i] === m4 && w.trim());
      if (b2WeNames.length > 0) {
        const b1NormNames = b1Items.map(n => normStr(n));
        for (const weName of b2WeNames) {
          const normWe = normStr(weName);
          if (!normWe) continue;
          const found = b1NormNames.some(n => n === normWe || n.includes(normWe) || normWe.includes(n));
          if (!found) {
            warnings.push(`  공정 ${pNo}[${m4}]: B2 작업요소 "${weName}" → B1에 해당 WE 없음`);
          }
        }
      }
    }

    // V12: B3 m4-B1 m4 일치 검증
    const b1M4Set = new Set(p.workElements4M.filter(m => m));
    const b3M4Set = new Set(p.processChars4M.filter(m => m));
    for (const m4 of b3M4Set) {
      if (!b1M4Set.has(m4)) {
        warnings.push(`  공정 ${pNo}: B3에 4M="${m4}" 있으나 B1에 없음 — 배분 불가`);
      }
    }
    const b2M4Set = new Set(p.elementFuncs4M.filter(m => m));
    for (const m4 of b2M4Set) {
      if (!b1M4Set.has(m4)) {
        warnings.push(`  공정 ${pNo}: B2에 4M="${m4}" 있으나 B1에 없음 — 배분 불가`);
      }
    }
  }

  return warnings;
}

// ─── 6. FM/FC/FE 핵심 데이터 존재 검증 ─────────────────────────────

/** A5(고장형태), B4(고장원인), C4(고장영향) 데이터 존재 여부 검증 */
function checkFailureDataExistence(
  processes: ProcessRelation[],
  products: ProductRelation[],
): string[] {
  const errors: string[] = [];

  // A5 고장형태 전체 카운트
  const totalFM = processes.reduce((sum, p) => sum + p.failureModes.filter(v => v.trim()).length, 0);
  if (totalFM === 0) {
    errors.push('  A5(고장형태) 0건 — 전체 공정에 고장형태가 없습니다. 엑셀 A5 시트를 확인하세요.');
  }

  // B4 고장원인 전체 카운트
  const totalFC = processes.reduce((sum, p) => sum + p.failureCauses.filter(v => v.trim()).length, 0);
  if (totalFC === 0) {
    errors.push('  B4(고장원인) 0건 — 전체 공정에 고장원인이 없습니다. 엑셀 B4 시트를 확인하세요.');
  }

  // C4 고장영향 전체 카운트
  const totalFE = products.reduce((sum, p) => sum + p.failureEffects.filter(v => v.trim()).length, 0);
  if (totalFE === 0) {
    errors.push('  C4(고장영향) 0건 — 고장영향이 없습니다. 엑셀 C4 시트를 확인하세요.');
  }

  return errors;
}

// ─── 7. STEP A ↔ FC_고장사슬 교차 검증 (B4/C4 누락 검출) ──────────

/**
 * ★★★ 2026-02-28: STEP A 기초정보와 FC_고장사슬 시트 간 교차 검증 ★★★
 *
 * B4(고장원인) 시트의 FC가 FC_고장사슬에 모두 포함되어 있는지 확인
 * C4(고장영향) 시트의 FE가 FC_고장사슬에 모두 포함되어 있는지 확인
 *
 * 누락된 FC/FE는 워크시트에서 고장연결(failureLink)이 생성되지 않아
 * 고장연결 화면에서 "누락" 표시됨
 */
function checkFailureChainConsistency(
  processes: ProcessRelation[],
  products: ProductRelation[],
  failureChains: MasterFailureChain[],
): string[] {
  if (!failureChains || failureChains.length === 0) return [];

  const warnings: string[] = [];

  // ── 텍스트 정규화 (공백 축소 + 소문자) ──
  const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

  // ── 공정번호 정규화 (failureChainInjector.ts와 동일 로직) ──
  const normPNo = (pNo: string) => {
    let n = pNo.trim();
    n = n.replace(/^(공정|process|proc|p)[\s\-_]*/i, '');
    n = n.replace(/번$/, '');
    n = n.replace(/^0+(?=\d)/, '');
    return n;
  };

  // ── FC_고장사슬에 있는 FC 텍스트 수집 (processNo|text + text-only) ──
  const chainFCKeys = new Set<string>();
  const chainFCTexts = new Set<string>();
  for (const chain of failureChains) {
    if (chain.fcValue?.trim()) {
      const pNo = normPNo(chain.processNo || '');
      chainFCKeys.add(`${pNo}|${norm(chain.fcValue)}`);
      chainFCTexts.add(norm(chain.fcValue));
    }
  }

  // ── FC_고장사슬에 있는 FE 텍스트 수집 ──
  const chainFETexts = new Set<string>();
  for (const chain of failureChains) {
    if (chain.feValue?.trim()) {
      chainFETexts.add(norm(chain.feValue));
    }
  }

  // ── B4(고장원인) 교차 검증: STEP A에 있으나 FC_고장사슬에 없는 FC ──
  const missingFCs: { processNo: string; text: string }[] = [];
  for (const proc of processes) {
    const pNo = normPNo(proc.processNo);
    for (const fc of proc.failureCauses) {
      if (!fc.trim()) continue;
      const key = `${pNo}|${norm(fc)}`;
      if (!chainFCKeys.has(key) && !chainFCTexts.has(norm(fc))) {
        missingFCs.push({ processNo: proc.processNo, text: fc.trim() });
      }
    }
  }

  // ── C4(고장영향) 교차 검증: STEP A에 있으나 FC_고장사슬에 없는 FE ──
  const missingFEs: { scope: string; text: string }[] = [];
  for (const prod of products) {
    const scope = prod.productProcessName?.trim() || '?';
    for (const fe of prod.failureEffects) {
      if (!fe.trim()) continue;
      if (!chainFETexts.has(norm(fe))) {
        missingFEs.push({ scope, text: fe.trim() });
      }
    }
  }

  // ── 경고 메시지 생성 ──
  if (missingFCs.length > 0) {
    warnings.push(`  B4(고장원인) ${missingFCs.length}건이 FC_고장사슬 시트에 없음 → 고장연결 누락 예상:`);
    for (const fc of missingFCs.slice(0, 10)) {
      warnings.push(`    · 공정 ${fc.processNo}: "${fc.text.length > 50 ? fc.text.slice(0, 50) + '...' : fc.text}"`);
    }
    if (missingFCs.length > 10) {
      warnings.push(`    ... 외 ${missingFCs.length - 10}건`);
    }
  }

  if (missingFEs.length > 0) {
    warnings.push(`  C4(고장영향) ${missingFEs.length}건이 FC_고장사슬 시트에 없음 → 고장연결 누락 예상:`);
    for (const fe of missingFEs.slice(0, 10)) {
      warnings.push(`    · [${fe.scope}] "${fe.text.length > 50 ? fe.text.slice(0, 50) + '...' : fe.text}"`);
    }
    if (missingFEs.length > 10) {
      warnings.push(`    ... 외 ${missingFEs.length - 10}건`);
    }
  }

  return warnings;
}

// ─── 메인 검증 함수 ──────────────────────────────────────────────

export interface ValidationResult {
  /** 경고 메시지 (비차단 - 사용자 확인 후 진행 가능) */
  warnings: string[];
  /** 에러 메시지 (차단 - 수정 필요) */
  errors: string[];
  /** 총 검출 건수 */
  totalIssues: number;
}

/**
 * Import 데이터 종합 검증
 * 파싱 결과를 받아 2가지 검증을 수행하고 결과 반환
 *
 * ★★★ 시트 내 동일 중복 검출은 제거됨 (2026-02-07) ★★★
 * 이유: PFMEA에서 같은 공정 내 같은 컬럼에 동일 값이 여러 번 나오는 것은 정상
 * (다른 작업요소에 대한 별도 항목이므로 중복이 아님)
 */
export function validateImportData(result: ParseResult): ValidationResult {
  const allWarnings: string[] = [];
  const errors: string[] = [];

  // 1. 시트 간 교차 중복 검출
  const crossWarnings = checkCrossColumnOverlap(result.processes);
  if (crossWarnings.length > 0) {
    allWarnings.push('🔄 시트 간 데이터 불일치:');
    allWarnings.push(...crossWarnings);
  }

  // 2. 데이터 형식 추론 검증
  const typeWarnings = checkDataTypeInference(result.processes);
  if (typeWarnings.length > 0) {
    allWarnings.push('🔍 데이터 형식 의심:');
    allWarnings.push(...typeWarnings);
  }

  // 3. 구조 완전성 검증 (B1↔B2, B3, A3 누락 체크)
  const structWarnings = checkStructuralCompleteness(result.processes);
  if (structWarnings.length > 0) {
    allWarnings.push('⚠️ 구조 완전성 — 누락 항목:');
    allWarnings.push(...structWarnings);
  }

  // 4. L1 요구사항↔고장영향 1:N 검증 (C3↔C4)
  const feCoverageErrors = checkRequirementFECoverage(result.products);
  if (feCoverageErrors.length > 0) {
    errors.push('❌ 고장영향(C4) 부족 — 요구사항(C3) 1:N 위반:');
    errors.push(...feCoverageErrors);
  }

  // 5. B1↔B2↔B3 교차매핑 사전검증 (V8-V13)
  const crossMappingWarnings = checkCrossMappingRisk(result.processes);
  if (crossMappingWarnings.length > 0) {
    allWarnings.push('🔀 교차매핑 위험 감지 (B1↔B2↔B3):');
    allWarnings.push(...crossMappingWarnings);
  }

  // 6. ★ FM/FC/FE 핵심 데이터 존재 검증 (2026-02-23 추가)
  const failureDataErrors = checkFailureDataExistence(result.processes, result.products);
  if (failureDataErrors.length > 0) {
    errors.push('❌ 고장분석 핵심 데이터 누락:');
    errors.push(...failureDataErrors);
  }

  // 7. ★★★ STEP A ↔ FC_고장사슬 교차 검증 (2026-02-28 추가) ★★★
  // B4(고장원인)/C4(고장영향)가 FC_고장사슬 시트에 모두 포함되어 있는지 확인
  let chainConsistencyCount = 0;
  if (result.failureChains && result.failureChains.length > 0) {
    const chainWarnings = checkFailureChainConsistency(result.processes, result.products, result.failureChains);
    chainConsistencyCount = chainWarnings.length;
    if (chainWarnings.length > 0) {
      allWarnings.push('🔗 STEP A ↔ 고장사슬 불일치 — 고장연결 누락 예상:');
      allWarnings.push(...chainWarnings);
    }
  }

  return {
    warnings: allWarnings,
    errors,
    totalIssues: crossWarnings.length + typeWarnings.length + structWarnings.length + feCoverageErrors.length + crossMappingWarnings.length + failureDataErrors.length + chainConsistencyCount,
  };
}
