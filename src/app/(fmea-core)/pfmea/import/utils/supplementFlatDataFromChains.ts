import type { ImportedFlatData } from '../types';
import type { MasterFailureChain } from '../types/masterFailureChain';

function normalize(v?: string): string {
  return (v || '').trim();
}

export function supplementFlatDataFromChains(
  flatData: ImportedFlatData[],
  chains: MasterFailureChain[],
): ImportedFlatData[] {
  if (!Array.isArray(chains) || chains.length === 0) return flatData;

  const next = [...flatData];
  const now = new Date();

  const hasA6ByProcess = new Set(
    next.filter(item => item.itemCode === 'A6' && normalize(item.value)).map(item => normalize(item.processNo))
  );
  const hasB5ByProcessM4 = new Set(
    next
      .filter(item => item.itemCode === 'B5' && normalize(item.value))
      .map(item => `${normalize(item.processNo)}|${normalize(item.m4)}`)
  );
  const hasB4ByProcessM4Cause = new Set(
    next
      .filter(item => item.itemCode === 'B4' && normalize(item.value))
      .map(item => `${normalize(item.processNo)}|${normalize(item.m4)}|${normalize(item.value)}`)
  );

  const b3Items = next.filter(item => item.itemCode === 'B3');
  const b4Items = next.filter(item => item.itemCode === 'B4');
  const b3ById = new Map(b3Items.map(item => [item.id, item]));

  const resolveFromFcId = (chain: MasterFailureChain): ImportedFlatData | undefined => {
    const fcId = normalize(chain.fcId);
    if (!fcId) return undefined;
    const guessedB3Id = fcId.replace(/-C7$/, '-C5-B3');
    return b3ById.get(guessedB3Id);
  };

  const findB3ParentId = (chain: MasterFailureChain): string | undefined => {
    const fromFcId = resolveFromFcId(chain);
    if (fromFcId?.id) return fromFcId.id;

    const pNo = normalize(chain.processNo);
    const m4 = normalize(chain.m4);
    const processChar = normalize(chain.processChar);
    const workElement = normalize(chain.workElement);

    const exactProcessChar = processChar
      ? b3Items.find(item =>
          normalize(item.processNo) === pNo &&
          normalize(item.m4) === m4 &&
          normalize(item.value) === processChar
        )
      : undefined;
    if (exactProcessChar?.id) return exactProcessChar.id;

    const exactWorkElement = workElement
      ? b3Items.find(item =>
          normalize(item.processNo) === pNo &&
          normalize(item.m4) === m4 &&
          normalize(item.belongsTo) === workElement
        )
      : undefined;
    if (exactWorkElement?.id) return exactWorkElement.id;

    return b3Items.find(item =>
      normalize(item.processNo) === pNo &&
      normalize(item.m4) === m4
    )?.id;
  };

  const findB4ParentId = (chain: MasterFailureChain): string | undefined => {
    const directId = normalize(chain.fcId);
    if (directId && b4Items.some(item => item.id === directId)) return directId;

    const pNo = normalize(chain.processNo);
    const m4 = normalize(chain.m4);
    const fc = normalize(chain.fcValue);
    const exact = b4Items.find(item =>
      normalize(item.processNo) === pNo &&
      normalize(item.m4) === m4 &&
      normalize(item.value) === fc
    );
    if (exact?.id) return exact.id;
    return b4Items.find(item =>
      normalize(item.processNo) === pNo &&
      normalize(item.m4) === m4
    )?.id;
  };

  let addedB4 = 0;
  let addedB5 = 0;
  let addedA6 = 0;

  chains.forEach((chain, index) => {
    const rowMatchedB3 = resolveFromFcId(chain);
    const pNo = normalize(chain.processNo) || normalize(rowMatchedB3?.processNo);
    const m4 = normalize(chain.m4) || normalize(rowMatchedB3?.m4);
    const fc = normalize(chain.fcValue);
    const pc = normalize(chain.pcValue);
    const dc = normalize(chain.dcValue);

    if (pNo && fc) {
      const b4Key = `${pNo}|${m4}|${fc}`;
      if (!hasB4ByProcessM4Cause.has(b4Key)) {
        const parentItemId = findB3ParentId(chain);
        const id = chain.fcFlatId || `${chain.id || `chain-${index}`}-B4-SUP`;
        next.push({
          id: normalize(chain.fcId) || id,
          processNo: pNo,
          category: 'B',
          itemCode: 'B4',
          value: fc,
          m4,
          belongsTo: chain.workElement || rowMatchedB3?.belongsTo || undefined,
          parentItemId,
          createdAt: now,
        });
        hasB4ByProcessM4Cause.add(b4Key);
        b4Items.push(next[next.length - 1]);
        addedB4++;
      }
    }

    if (pNo && m4 && pc) {
      const b5Key = `${pNo}|${m4}`;
      if (!hasB5ByProcessM4.has(b5Key)) {
        next.push({
          id: `${chain.id || `chain-${index}`}-B5-SUP`,
          processNo: pNo,
          category: 'B',
          itemCode: 'B5',
          value: pc,
          m4,
          parentItemId: findB4ParentId(chain),
          createdAt: now,
        });
        hasB5ByProcessM4.add(b5Key);
        addedB5++;
      }
    }

    if (pNo && dc && !hasA6ByProcess.has(pNo)) {
      next.push({
        id: `${chain.id || `chain-${index}`}-A6-SUP`,
        processNo: pNo,
        category: 'A',
        itemCode: 'A6',
        value: dc,
        createdAt: now,
      });
      hasA6ByProcess.add(pNo);
      addedA6++;
    }
  });

  if (addedB4 > 0 || addedB5 > 0 || addedA6 > 0) {
    console.info(`[supplementFlatDataFromChains] B4=${addedB4} B5=${addedB5} A6=${addedA6}`);
  }

  return next;
}
