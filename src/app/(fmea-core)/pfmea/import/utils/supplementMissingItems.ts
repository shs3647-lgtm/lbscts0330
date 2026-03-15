/**
 * @file supplementMissingItems.ts
 * @description FC 체인 기반 Import에서 누락된 항목코드(A1-A3, B1-B2, C1-C4)를 자동 보충
 *
 * useImportFileHandlers FC 체인 추출은 A4-A6, B3-B5만 생성.
 * 이 유틸은 기존 flatData + failureChains에서 나머지 항목을 추론 생성.
 *
 * @created 2026-03-15
 */

import { v4 as uuidv4 } from 'uuid';
import type { ImportedFlatData } from '../types';
import type { MasterFailureChain } from '../types/masterFailureChain';

/**
 * ★ processNo 정규화 — '01' vs '1' 불일치 방지
 * FC 시트 sanitizeProcessNo는 앞자리 0 제거, L3 시트는 원본 유지 → Set.has() 실패
 */
function normPno(pno: string | undefined): string {
  if (!pno) return '';
  const trimmed = pno.trim();
  if (!trimmed) return '';
  // 숫자만으로 구성된 경우: 앞자리 0 제거 (단, '0' 자체는 유지)
  if (/^\d+$/.test(trimmed)) {
    const n = parseInt(trimmed, 10);
    return String(n); // '01'→'1', '10'→'10', '0'→'0'
  }
  return trimmed;
}

/**
 * flatData에서 누락된 항목코드를 FC 체인으로부터 보충 생성
 * @returns 보충할 새 항목 배열 (기존 flatData에 추가해야 함)
 */
export function supplementMissingItems(
  flatData: ImportedFlatData[],
  failureChains: MasterFailureChain[],
): ImportedFlatData[] {
  const now = new Date();
  const supplements: ImportedFlatData[] = [];

  // 기존 항목코드별 카운트
  const existingCodes = new Set<string>();
  for (const d of flatData) {
    if (d.itemCode) existingCodes.add(d.itemCode);
  }

  // 누락 코드 + 계층 불균형 감지
  const REQUIRED = ['A1', 'A2', 'A3', 'B1', 'B2', 'C1', 'C2', 'C3', 'C4'];
  const missing = REQUIRED.filter(code => {
    const count = flatData.filter(d => d.itemCode === code).length;
    return count === 0;
  });

  // A4 계층 보충 필요 여부 (A3가 있거나 보충될 때, A4 없는 공정 보충)
  const needsA4Supplement = missing.includes('A3') || flatData.some(d => d.itemCode === 'A3');

  // ★ B1 공정별 갭 감지 — normPno로 정규화하여 '01' vs '1' 매칭 보장
  const b1Procs = new Set(flatData.filter(d => d.itemCode === 'B1').map(d => normPno(d.processNo)));
  const b3b4Procs = new Set(flatData.filter(d => (d.itemCode === 'B3' || d.itemCode === 'B4') && d.processNo).map(d => normPno(d.processNo)));
  // ★★ 모든 공정(A-카테고리 포함)에서 B1 없는 공정도 감지
  const allProcNos = new Set<string>();
  for (const d of flatData) {
    if (d.processNo && (d.category === 'A' || d.category === 'B')) allProcNos.add(normPno(d.processNo));
  }
  for (const ch of failureChains) {
    if (ch.processNo) allProcNos.add(normPno(ch.processNo));
  }
  const needsPerProcessB1 = !missing.includes('B1') && [...allProcNos].some(pno => !b1Procs.has(pno));

  if (missing.length === 0 && !needsA4Supplement && !needsPerProcessB1) return [];

  // ── 공정 정보 수집 (A-레벨 flatData에서) — normPno 정규화 ──
  // ★ 원본 processNo 보존 (보충 항목에 원본 형식 사용)
  const procOriginal = new Map<string, string>(); // normPno → original processNo
  const processNos = new Set<string>();
  for (const d of flatData) {
    if (d.category === 'A' && d.processNo) {
      const norm = normPno(d.processNo);
      processNos.add(norm);
      if (!procOriginal.has(norm)) procOriginal.set(norm, d.processNo);
    }
  }
  // 체인에서도 공정번호 수집
  for (const ch of failureChains) {
    if (ch.processNo) {
      const norm = normPno(ch.processNo);
      processNos.add(norm);
      if (!procOriginal.has(norm)) procOriginal.set(norm, ch.processNo);
    }
  }
  const sortedProcNos = [...processNos].sort((a, b) => {
    const na = parseInt(a, 10) || 0;
    const nb = parseInt(b, 10) || 0;
    return na - nb || a.localeCompare(b);
  });
  // ★ 보충 항목에 사용할 원본 processNo 조회
  const getOrigPno = (norm: string) => procOriginal.get(norm) || norm;

  // ── A1 공정번호 ──
  if (missing.includes('A1')) {
    for (const pno of sortedProcNos) {
      const origPno = getOrigPno(pno);
      supplements.push({
        id: uuidv4(), processNo: origPno, category: 'A', itemCode: 'A1',
        value: origPno, createdAt: now,
      });
    }
  }

  // ── A2 공정명 ──
  if (missing.includes('A2')) {
    for (const pno of sortedProcNos) {
      const origPno = getOrigPno(pno);
      supplements.push({
        id: uuidv4(), processNo: origPno, category: 'A', itemCode: 'A2',
        value: `${origPno}번 공정`, createdAt: now,
      });
    }
  }

  // ── A3 공정기능 ──
  if (missing.includes('A3')) {
    for (const pno of sortedProcNos) {
      const origPno = getOrigPno(pno);
      supplements.push({
        id: uuidv4(), processNo: origPno, category: 'A', itemCode: 'A3',
        value: `${origPno}번 공정을 수행하여 품질을 확보한다`,
        inherited: true, createdAt: now,
      });
    }
  }

  // ── A4 제품특성 — 계층 보충 (A3 있는 공정에 A4 없으면 보충) ──
  {
    const a4Procs = new Set(
      [...flatData, ...supplements].filter(d => d.itemCode === 'A4').map(d => normPno(d.processNo)),
    );
    const a3Procs = [...flatData, ...supplements]
      .filter(d => d.itemCode === 'A3')
      .map(d => normPno(d.processNo))
      .filter(Boolean);
    for (const pno of a3Procs) {
      if (!pno || a4Procs.has(pno)) continue;
      const origPno = getOrigPno(pno);
      // ★ 2026-03-15 FIX: ch.processChar(B3) → ch.productChar(A4) 버그 수정
      const chainChars = failureChains
        .filter(ch => normPno(ch.processNo) === pno && ch.productChar)
        .map(ch => ch.productChar!);
      const uniqueChars = [...new Set(chainChars)];
      if (uniqueChars.length > 0) {
        for (const char of uniqueChars) {
          supplements.push({
            id: uuidv4(), processNo: origPno, category: 'A', itemCode: 'A4',
            value: char, createdAt: now,
          });
        }
      } else {
        // 폴백: 공정명 기반 기본 제품특성
        supplements.push({
          id: uuidv4(), processNo: origPno, category: 'A', itemCode: 'A4',
          value: `${origPno}번 공정 특성`, inherited: true, createdAt: now,
        });
      }
      a4Procs.add(pno);
    }
  }

  // ── B1 작업요소 + B2 요소기능 (전역 누락 + 공정별 갭 통합 처리) ──
  if (missing.includes('B1') || missing.includes('B2') || needsPerProcessB1) {
    // ★ normPno로 정규화하여 '01' vs '1' 매칭 보장
    const existingB1Procs = new Set(
      [...flatData, ...supplements].filter(d => d.itemCode === 'B1').map(d => normPno(d.processNo)).filter(Boolean),
    );
    const existingB2Procs = new Set(
      [...flatData, ...supplements].filter(d => d.itemCode === 'B2').map(d => normPno(d.processNo)).filter(Boolean),
    );

    // B1 보충이 필요한 공정 식별 (normalized 기준)
    const procsNeedingB1 = new Set<string>();
    if (missing.includes('B1')) {
      for (const pno of sortedProcNos) procsNeedingB1.add(pno);
    } else {
      for (const pno of sortedProcNos) {
        if (!existingB1Procs.has(pno)) procsNeedingB1.add(pno);
      }
    }

    // B2 보충이 필요한 공정 식별
    const procsNeedingB2 = new Set<string>();
    if (missing.includes('B2')) {
      for (const pno of sortedProcNos) procsNeedingB2.add(pno);
    }

    // 체인에서 workElement + m4 조합 추출 (공정별, normalized 비교)
    const b1Seen = new Set<string>();
    const b1Items: { pno: string; m4: string; we: string; func: string }[] = [];

    for (const ch of failureChains) {
      if (!ch.processNo) continue;
      const chNorm = normPno(ch.processNo);
      if (!procsNeedingB1.has(chNorm) && !procsNeedingB2.has(chNorm)) continue;
      const m4 = ch.m4 || 'MC';
      const we = ch.workElement || '';
      if (!we) continue;
      const key = `${chNorm}|${m4}|${we}`;
      if (b1Seen.has(key)) continue;
      b1Seen.add(key);
      b1Items.push({
        pno: chNorm, // ★ normalized pno
        m4,
        we,
        func: ch.l3Function || `${we}을(를) 수행하여 결과를 제공한다`,
      });
    }

    // ★ 공정별 폴백: 체인에서 workElement 못 찾은 공정은 B3/B4의 m4로 생성
    const procNameMap = new Map<string, string>();
    for (const d of [...flatData, ...supplements]) {
      if (d.itemCode === 'A2' && d.processNo && d.value) {
        procNameMap.set(normPno(d.processNo), d.value);
      }
    }
    const getProcLabel = (pno: string) => procNameMap.get(pno) || `${getOrigPno(pno)}번 공정`;

    const coveredProcs = new Set(b1Items.map(i => i.pno));
    const uncoveredProcs = [...procsNeedingB1].filter(pno => !coveredProcs.has(pno));
    if (uncoveredProcs.length > 0) {
      const b3b4Items = flatData.filter(d =>
        (d.itemCode === 'B3' || d.itemCode === 'B4') && d.processNo && d.m4,
      );
      const fallbackSeen = new Set<string>();
      for (const d of b3b4Items) {
        const dNorm = normPno(d.processNo);
        if (!dNorm || !uncoveredProcs.includes(dNorm)) continue;
        const key = `${dNorm}|${d.m4}`;
        if (fallbackSeen.has(key)) continue;
        fallbackSeen.add(key);
        b1Items.push({
          pno: dNorm,
          m4: d.m4!,
          we: d.belongsTo || `${getProcLabel(dNorm)} ${d.m4} 작업요소`,
          func: `${getProcLabel(dNorm)} ${d.m4} 작업을 수행한다`,
        });
      }

      // ★★ 최종 폴백: B3/B4에도 없는 공정 → 체인의 m4로 기본 WE 생성
      const stillUncovered = uncoveredProcs.filter(pno => !b1Items.some(i => i.pno === pno));
      for (const pno of stillUncovered) {
        const chainM4s = new Set(
          failureChains.filter(ch => normPno(ch.processNo) === pno && ch.m4).map(ch => ch.m4!),
        );
        if (chainM4s.size > 0) {
          for (const m4 of chainM4s) {
            b1Items.push({
              pno, m4,
              we: `${getProcLabel(pno)} ${m4} 작업요소`,
              func: `${getProcLabel(pno)} ${m4} 작업을 수행한다`,
            });
          }
        } else {
          b1Items.push({
            pno, m4: 'MC',
            we: `${getProcLabel(pno)} 작업요소`,
            func: `${getProcLabel(pno)} 작업을 수행한다`,
          });
        }
      }
    }

    for (const item of b1Items) {
      const origPno = getOrigPno(item.pno);
      if (procsNeedingB1.has(item.pno) && !existingB1Procs.has(item.pno)) {
        const b1Id = uuidv4();
        supplements.push({
          id: b1Id, processNo: origPno, category: 'B', itemCode: 'B1',
          value: item.we, m4: item.m4, createdAt: now,
        });
        existingB1Procs.add(item.pno);

        if (procsNeedingB2.has(item.pno) && !existingB2Procs.has(item.pno)) {
          supplements.push({
            id: uuidv4(), processNo: origPno, category: 'B', itemCode: 'B2',
            value: item.func, m4: item.m4,
            belongsTo: item.we, parentItemId: b1Id,
            createdAt: now,
          });
        }
      } else if (procsNeedingB2.has(item.pno) && !existingB2Procs.has(item.pno)) {
        supplements.push({
          id: uuidv4(), processNo: origPno, category: 'B', itemCode: 'B2',
          value: item.func, m4: item.m4,
          belongsTo: item.we, createdAt: now,
        });
      }
    }
  }

  // ── C1 구분 ──
  if (missing.includes('C1')) {
    const scopes = new Set<string>();
    for (const ch of failureChains) {
      const scope = ch.feScope || 'YP';
      scopes.add(scope);
    }
    const sortedScopes = [...scopes].sort((a, b) => {
      const order: Record<string, number> = { YP: 0, SP: 1, USER: 2 };
      return (order[a] ?? 9) - (order[b] ?? 9);
    });
    for (const scope of sortedScopes) {
      supplements.push({
        id: uuidv4(), processNo: scope, category: 'C', itemCode: 'C1',
        value: scope, createdAt: now,
      });
    }
  }

  // ── C4 고장영향 ──
  if (missing.includes('C4')) {
    const feSeen = new Set<string>();
    // 1차: 체인의 feValue에서 C4 생성
    for (const ch of failureChains) {
      const fe = ch.feValue?.trim();
      if (!fe) continue;
      const scope = ch.feScope || 'YP';
      const key = `${scope}|${fe}`;
      if (feSeen.has(key)) continue;
      feSeen.add(key);
      supplements.push({
        id: uuidv4(), processNo: scope, category: 'C', itemCode: 'C4',
        value: fe, createdAt: now,
      });
    }

    // ★ 2차 폴백: 체인에 feValue 없지만 fmValue 있으면 FM 기반 기본 FE 생성
    // FC 시트에 고장영향 컬럼 없는 경우 대응
    if (feSeen.size === 0 && failureChains.length > 0) {
      // FM 텍스트에서 scope별 고유 FE 추론
      const fmByScope = new Map<string, Set<string>>();
      for (const ch of failureChains) {
        const fm = ch.fmValue?.trim();
        if (!fm) continue;
        const scope = ch.feScope || 'YP';
        if (!fmByScope.has(scope)) fmByScope.set(scope, new Set());
        fmByScope.get(scope)!.add(fm);
      }
      for (const [scope, fmSet] of fmByScope) {
        for (const fm of fmSet) {
          const fe = `${fm}에 의한 품질 저하`;
          const key = `${scope}|${fe}`;
          if (feSeen.has(key)) continue;
          feSeen.add(key);
          supplements.push({
            id: uuidv4(), processNo: scope, category: 'C', itemCode: 'C4',
            value: fe, inherited: true, createdAt: now,
          });
        }
      }
    }
  }

  // ── C2 제품기능 / C3 요구사항 — scope별 자동생성 ──
  if (missing.includes('C2') || missing.includes('C3')) {
    const scopes = new Set<string>();
    // C1이 이미 있거나 위에서 보충했으면 그 scope 사용
    const c1Items = [...flatData, ...supplements].filter(d => d.itemCode === 'C1');
    for (const c1 of c1Items) {
      if (c1.processNo) scopes.add(c1.processNo);
    }
    if (scopes.size === 0) scopes.add('YP'); // 최소 1개 scope

    for (const scope of scopes) {
      if (missing.includes('C2')) {
        supplements.push({
          id: uuidv4(), processNo: scope, category: 'C', itemCode: 'C2',
          value: `${scope === 'YP' ? '후속공정' : scope === 'SP' ? '안전/법규' : '사용자'} 요구사항을 만족한다`,
          inherited: true, createdAt: now,
        });
      }
      if (missing.includes('C3')) {
        supplements.push({
          id: uuidv4(), processNo: scope, category: 'C', itemCode: 'C3',
          value: `${scope === 'YP' ? '후속공정' : scope === 'SP' ? '안전/법규' : '사용자'} 품질 기준 충족`,
          inherited: true, createdAt: now,
        });
      }
    }
  }

  return supplements;
}
