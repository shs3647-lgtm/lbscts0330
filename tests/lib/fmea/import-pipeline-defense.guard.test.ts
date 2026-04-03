/**
 * Import 파이프라인 방어선 — Phase 4 Guard 7종 (docs/Import 파이프라인 방어선.md 작업 1)
 */
import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  dedupKey_FL_FM,
  dedupKey_FN_L2,
  normalize,
} from '@/lib/fmea/utils/dedup-key';
import { validateImportData } from '@/lib/fmea-core/validate-import';
import type { ImportedFlatData } from '@/app/(fmea-core)/pfmea/import/types';

const REPO = path.resolve(__dirname, '../../..');
const read = (rel: string) => fs.readFileSync(path.join(REPO, rel), 'utf-8');

describe('Import pipeline defense — Guard 1: FL_FM dedupKey (동명 FM, 다른 부모)', () => {
  it('동일 modeName이라도 fn_l2_id가 다르면 dedupKey_FL_FM이 달라야 한다', () => {
    const k1 = dedupKey_FL_FM('l2-fn-a', '표면 불량');
    const k2 = dedupKey_FL_FM('l2-fn-b', '표면 불량');
    expect(k1).not.toBe(k2);
    expect(k1).toBe('l2-fn-a::표면 불량');
    expect(k2).toBe('l2-fn-b::표면 불량');
  });
});

describe('Import pipeline defense — Guard 2: B4 parentItemId → B3 (정적·런타임)', () => {
  it('position-parser에 B4→B3 parentItemId 규칙 주석이 있어야 한다', () => {
    const src = read('src/lib/fmea/position-parser.ts');
    expect(src).toContain('B4.parentItemId');
    expect(src).toContain('B3');
  });

  it('B4의 parent가 B1이면 validateImportData가 FAIL (FC는 ST_L3/FN_L3 안티패턴 방지)', () => {
    const b1Id = 'pno1-B1-0';
    const b3Id = 'pno1-B3-0';
    const flat: ImportedFlatData[] = [
      {
        id: 'a1-1',
        itemCode: 'A1',
        processNo: '1',
        category: 'A',
        value: '1',
        orderIndex: 0,
      } as ImportedFlatData,
      {
        id: 'a4-1',
        itemCode: 'A4',
        processNo: '1',
        category: 'A',
        value: '제품특성',
      } as ImportedFlatData,
      {
        id: 'a5-1',
        parentItemId: 'a4-1',
        itemCode: 'A5',
        processNo: '1',
        category: 'A',
        value: 'FM',
      } as ImportedFlatData,
      {
        id: b1Id,
        itemCode: 'B1',
        processNo: '1',
        category: 'B',
        value: 'WE',
        m4: 'MN',
      } as ImportedFlatData,
      {
        id: b3Id,
        parentItemId: b1Id,
        itemCode: 'B3',
        processNo: '1',
        category: 'B',
        value: 'PC',
        m4: 'MN',
      } as ImportedFlatData,
      {
        id: 'b4-wrong',
        parentItemId: b1Id,
        itemCode: 'B4',
        processNo: '1',
        category: 'B',
        value: '원인',
        m4: 'MN',
      } as ImportedFlatData,
      {
        id: 'c4-1',
        itemCode: 'C4',
        processNo: 'YP',
        category: 'C',
        value: '영향',
      } as ImportedFlatData,
    ];
    const report = validateImportData(flat);
    const chain = report.checks.find((c) => c.name === 'parentItemIdChain');
    expect(chain?.status).toBe('FAIL');
    expect(chain?.details?.some((d) => d.issue.includes('instead of B3'))).toBe(true);
  });
});

describe('Import pipeline defense — Guard 3: 카테시안 징후 (동일 텍스트 FM이 공정 경계에서 분리)', () => {
  it('dedupKey_FL_FM은 공정(L2 기능) 경계를 포함하므로 동명 FM 병합으로 인한 카테시안 완화에 기여한다', () => {
    const procA = dedupKey_FL_FM('fn-l2-proc10', '크랙');
    const procB = dedupKey_FL_FM('fn-l2-proc20', '크랙');
    expect(procA).not.toBe(procB);
  });
});

describe('Import pipeline defense — Guard 4: FN_L2에 productCharId(FK) 문자열이 그대로 들어감', () => {
  it('dedupKey_FN_L2 세 번째 인자는 텍스트 특성명이 아니라 UUID 형태 FK를 받는다', () => {
    const pcId = 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee';
    expect(dedupKey_FN_L2('l2s', '공정기능', pcId)).toContain(pcId);
    expect(dedupKey_FN_L2('l2s', '공정기능', pcId)).not.toContain('제품특성텍스트');
  });
});

describe('Import pipeline defense — Guard 5: parentItemIdChain 검증 로직 존재 (파싱 단계 임의 Set dedup 대체 방지)', () => {
  it('validate-import.ts에 B4→B3 검증 메시지가 남아 있어야 한다', () => {
    const src = read('src/lib/fmea-core/validate-import.ts');
    expect(src).toContain('B4 parentItemId points to');
    expect(src).toContain('instead of B3');
  });
});

describe('Import pipeline defense — Guard 6: fill-down 정합성 (공정번호 carry 시뮬)', () => {
  it('NaN/빈 공정번호 행은 직전 유효 공정번호를 이어받는다', () => {
    type Row = { a1: number | typeof NaN };
    const fillDownProcessNo = (rows: Row[]): string[] => {
      let prev = '';
      const out: string[] = [];
      for (const r of rows) {
        if (typeof r.a1 === 'number' && !Number.isNaN(r.a1)) {
          prev = String(r.a1);
          out.push(prev);
        } else {
          out.push(prev);
        }
      }
      return out;
    };
    expect(fillDownProcessNo([{ a1: 5 }, { a1: NaN }, { a1: NaN }])).toEqual(['5', '5', '5']);
  });
});

describe('Import pipeline defense — Guard 7: normalize 엣지케이스', () => {
  it('탭·연속 공백·줄바꿈+공백 조합', () => {
    expect(normalize('a\t\tb')).toBe('a b');
    expect(normalize('  x  \n  y  ')).toBe('x y');
    expect(normalize(null)).toBe('__EMPTY__');
  });
});
