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

  // 이미 모든 항목이 있으면 보충 불필요
  const REQUIRED = ['A1', 'A2', 'A3', 'B1', 'B2', 'C1', 'C2', 'C3', 'C4'];
  const missing = REQUIRED.filter(code => {
    const count = flatData.filter(d => d.itemCode === code).length;
    return count === 0;
  });
  if (missing.length === 0) return [];

  // ── 공정 정보 수집 (A-레벨 flatData에서) ──
  const processNos = new Set<string>();
  for (const d of flatData) {
    if (d.category === 'A' && d.processNo) processNos.add(d.processNo);
  }
  // 체인에서도 공정번호 수집
  for (const ch of failureChains) {
    if (ch.processNo) processNos.add(ch.processNo);
  }
  const sortedProcNos = [...processNos].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );

  // ── A1 공정번호 ──
  if (missing.includes('A1')) {
    for (const pno of sortedProcNos) {
      supplements.push({
        id: uuidv4(), processNo: pno, category: 'A', itemCode: 'A1',
        value: pno, createdAt: now,
      });
    }
  }

  // ── A2 공정명 ──
  if (missing.includes('A2')) {
    for (const pno of sortedProcNos) {
      // 체인에서 공정명 없음 → processNo 그대로 사용 (워크시트에서 수정 가능)
      supplements.push({
        id: uuidv4(), processNo: pno, category: 'A', itemCode: 'A2',
        value: `${pno}번 공정`, createdAt: now,
      });
    }
  }

  // ── A3 공정기능 ──
  if (missing.includes('A3')) {
    for (const pno of sortedProcNos) {
      supplements.push({
        id: uuidv4(), processNo: pno, category: 'A', itemCode: 'A3',
        value: `${pno}번 공정을 수행하여 품질을 확보한다`,
        inherited: true, createdAt: now,
      });
    }
  }

  // ── B1 작업요소 + B2 요소기능 ──
  if (missing.includes('B1') || missing.includes('B2')) {
    // 체인에서 workElement + m4 조합 추출
    const b1Seen = new Set<string>();
    const b1Items: { pno: string; m4: string; we: string; func: string }[] = [];

    for (const ch of failureChains) {
      if (!ch.processNo) continue;
      const m4 = ch.m4 || 'MC';
      const we = ch.workElement || '';
      if (!we) continue;
      const key = `${ch.processNo}|${m4}|${we}`;
      if (b1Seen.has(key)) continue;
      b1Seen.add(key);
      b1Items.push({
        pno: ch.processNo,
        m4,
        we,
        func: ch.l3Function || `${we}을(를) 수행하여 결과를 제공한다`,
      });
    }

    // B1이 없으면 B3/B4의 m4로부터 폴백 생성
    if (b1Items.length === 0) {
      const b3b4Items = flatData.filter(d =>
        (d.itemCode === 'B3' || d.itemCode === 'B4') && d.processNo && d.m4,
      );
      const fallbackSeen = new Set<string>();
      for (const d of b3b4Items) {
        const key = `${d.processNo}|${d.m4}`;
        if (fallbackSeen.has(key)) continue;
        fallbackSeen.add(key);
        b1Items.push({
          pno: d.processNo!,
          m4: d.m4!,
          we: d.belongsTo || `${d.m4} 작업요소`,
          func: `${d.m4} 작업을 수행한다`,
        });
      }
    }

    for (const item of b1Items) {
      if (missing.includes('B1')) {
        const b1Id = uuidv4();
        supplements.push({
          id: b1Id, processNo: item.pno, category: 'B', itemCode: 'B1',
          value: item.we, m4: item.m4, createdAt: now,
        });

        if (missing.includes('B2')) {
          supplements.push({
            id: uuidv4(), processNo: item.pno, category: 'B', itemCode: 'B2',
            value: item.func, m4: item.m4,
            belongsTo: item.we, parentItemId: b1Id,
            createdAt: now,
          });
        }
      } else if (missing.includes('B2')) {
        // B1 있지만 B2만 없는 경우
        supplements.push({
          id: uuidv4(), processNo: item.pno, category: 'B', itemCode: 'B2',
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
