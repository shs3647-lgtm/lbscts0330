/**
 * @file useSpecialCharVerify.ts
 * @description 워크시트 로드 후 Atomic DB와 Master DB 간 specialChar 불일치 검증
 *
 * ★ Single Source of Truth: Atomic DB의 specialChar
 * ★ 이 훅은 데이터를 수정하지 않음 — 불일치 시 console.warn만 출력
 * ★ 마이그레이션 스크립트(scripts/migrate-specialchar.ts)로 일괄 보충 후
 *   런타임에는 검증/경고 역할만 수행
 *
 * @created 2026-02-06
 */

import { useEffect, useRef } from 'react';

interface SpecialCharVerifyOptions {
  fmeaId: string | undefined;
  stateL2: any[];
}

export function useSpecialCharVerify({ fmeaId, stateL2 }: SpecialCharVerifyOptions) {
  const verifiedRef = useRef(false);

  useEffect(() => {
    if (!fmeaId || !stateL2?.length || verifiedRef.current) return;
    verifiedRef.current = true;

    fetch(`/api/pfmea/master?fmeaId=${encodeURIComponent(fmeaId)}&includeItems=true`)
      .then(res => res.json())
      .then(result => {
        const masterMap = new Map<string, string>();

        if (result.dataset?.flatItems) {
          for (const item of result.dataset.flatItems) {
            if (!item.specialChar) continue;
            if (item.itemCode === 'A4' || item.itemCode === 'B3') {
              masterMap.set(`${item.processNo}|${item.itemCode}|${item.value}`, item.specialChar);
            }
          }
        }

        if (masterMap.size === 0) return;

        const mismatches: string[] = [];

        for (const proc of stateL2) {
          const procNo = String(proc.no || '').trim();

          for (const fn of (proc.functions || [])) {
            for (const c of (fn.productChars || [])) {
              if (!c.name?.trim()) continue;
              const masterSC = masterMap.get(`${procNo}|A4|${c.name}`);
              if (masterSC && !c.specialChar) {
                mismatches.push(`A4 [${procNo}] "${c.name}": atomicDB=없음, master="${masterSC}"`);
              } else if (masterSC && c.specialChar && masterSC !== c.specialChar) {
                mismatches.push(`A4 [${procNo}] "${c.name}": atomicDB="${c.specialChar}", master="${masterSC}"`);
              }
            }
          }

          for (const we of (proc.l3 || [])) {
            for (const fn of (we.functions || [])) {
              for (const c of (fn.processChars || [])) {
                if (!c.name?.trim()) continue;
                const masterSC = masterMap.get(`${procNo}|B3|${c.name}`);
                if (masterSC && !c.specialChar) {
                  mismatches.push(`B3 [${procNo}] "${c.name}": atomicDB=없음, master="${masterSC}"`);
                } else if (masterSC && c.specialChar && masterSC !== c.specialChar) {
                  mismatches.push(`B3 [${procNo}] "${c.name}": atomicDB="${c.specialChar}", master="${masterSC}"`);
                }
              }
            }
          }
        }

        if (mismatches.length > 0) {
        }
      })
      .catch(() => {});
  }, [fmeaId, stateL2]);
}
