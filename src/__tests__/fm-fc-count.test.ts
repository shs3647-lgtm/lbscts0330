/**
 * @file fm-fc-count.test.ts
 * @description FM/FC 고유 카운트 로직 단위 테스트
 */

import { describe, it, expect } from 'vitest';

// FM 고유 카운트 로직 (FailureL2Tab에서 사용하는 것과 동일)
function countUniqueFMs(rows: Array<{ procNo: string; modeName: string }>) {
  const uniqueFMs = new Set<string>();
  for (const r of rows) {
    if (r.modeName && r.modeName.trim()) {
      uniqueFMs.add(`${r.procNo}|${r.modeName.trim()}`);
    }
  }
  return uniqueFMs.size;
}

// FC 고유 카운트 로직 (FailureL3Tab에서 사용하는 것과 동일)
function countUniqueFCs(processes: Array<{ no: string; failureCauses: Array<{ name: string }> }>) {
  const uniqueFCs = new Set<string>();
  for (const p of processes) {
    for (const c of (p.failureCauses || [])) {
      const n = String(c?.name || '').trim();
      if (n) uniqueFCs.add(`${p.no}|${n}`);
    }
  }
  return uniqueFCs.size;
}

describe('FM 고유 카운트', () => {
  it('중복 FM 이름은 1번만 카운트', () => {
    const rows = [
      { procNo: '10', modeName: '품명,규격,사양 불일치' },
      { procNo: '10', modeName: '품명,규격,사양 불일치' },
      { procNo: '10', modeName: '포장 손상' },
    ];
    expect(countUniqueFMs(rows)).toBe(2);
  });

  it('다른 공정의 동일 FM은 별도 카운트', () => {
    const rows = [
      { procNo: '10', modeName: '치수 불량' },
      { procNo: '20', modeName: '치수 불량' },
    ];
    expect(countUniqueFMs(rows)).toBe(2);
  });

  it('빈 modeName은 카운트 제외', () => {
    const rows = [
      { procNo: '10', modeName: '' },
      { procNo: '10', modeName: '치수 불량' },
      { procNo: '20', modeName: '  ' },
    ];
    expect(countUniqueFMs(rows)).toBe(1);
  });

  it('107개 고유 FM 시뮬레이션', () => {
    const rows: Array<{ procNo: string; modeName: string }> = [];
    for (let i = 1; i <= 107; i++) {
      const procNo = String(Math.ceil(i / 6));
      const modeName = `FM_${i}`;
      rows.push({ procNo, modeName });
      // 중복 추가 (제품특성 여러 개에 연결)
      rows.push({ procNo, modeName });
    }
    // 214행이지만 고유 FM은 107개
    expect(rows.length).toBe(214);
    expect(countUniqueFMs(rows)).toBe(107);
  });
});

describe('FC 고유 카운트', () => {
  it('중복 FC 이름은 1번만 카운트', () => {
    const processes = [{
      no: '10',
      failureCauses: [
        { name: '작업자 부주의' },
        { name: '작업자 부주의' },
        { name: '설비 고장' },
      ],
    }];
    expect(countUniqueFCs(processes)).toBe(2);
  });

  it('다른 공정의 동일 FC는 별도 카운트', () => {
    const processes = [
      { no: '10', failureCauses: [{ name: '작업자 부주의' }] },
      { no: '20', failureCauses: [{ name: '작업자 부주의' }] },
    ];
    expect(countUniqueFCs(processes)).toBe(2);
  });

  it('빈 name은 카운트 제외', () => {
    const processes = [{
      no: '10',
      failureCauses: [
        { name: '' },
        { name: '설비 고장' },
        { name: '  ' },
      ],
    }];
    expect(countUniqueFCs(processes)).toBe(1);
  });

  it('251개 고유 FC 시뮬레이션', () => {
    const processes: Array<{ no: string; failureCauses: Array<{ name: string }> }> = [];
    let fcIdx = 0;
    for (let p = 1; p <= 17; p++) {
      const causes: Array<{ name: string }> = [];
      const count = Math.ceil(251 / 17) + (p <= 251 % 17 ? 1 : 0);
      for (let c = 0; c < count; c++) {
        fcIdx++;
        if (fcIdx > 251) break;
        causes.push({ name: `FC_${fcIdx}` });
        causes.push({ name: `FC_${fcIdx}` }); // 중복
      }
      processes.push({ no: String(p), failureCauses: causes });
    }
    expect(countUniqueFCs(processes)).toBe(251);
  });
});

describe('이전 행 수 기반 카운트 vs 고유 카운트 비교', () => {
  it('행 수=207, 고유 FM=107 시나리오 검증', () => {
    const rows: Array<{ procNo: string; modeName: string }> = [];

    // 107개 FM이 각각 평균 ~2개 제품특성에 연결 → 약 207행
    for (let i = 1; i <= 107; i++) {
      const procNo = String(Math.ceil(i / 6));
      const modeName = `FM_${i}`;
      rows.push({ procNo, modeName });
      if (i <= 100) { // 100개는 2번씩 (중복)
        rows.push({ procNo, modeName });
      }
    }

    // 행 수 (이전 방식)
    const rowCount = rows.filter(r => r.modeName && r.modeName.trim()).length;
    expect(rowCount).toBe(207);

    // 고유 FM 수 (수정 후 방식)
    expect(countUniqueFMs(rows)).toBe(107);
  });
});
