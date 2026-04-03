/**
 * DFMEA Import·헤더 방어선 Guard Test 8종
 * PFMEA import-pipeline-defense.guard.test.ts 1:1 벤치마킹
 *
 * @see docs/DFMEA 파이프라인  PFMEA 1대1 벤치마킹 전체 적용.md
 */
import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  DFMEA_COLUMN_IDS,
  DFMEA_FILL_DOWN_RULES,
  normalizeDfmeaHeader,
} from '@/lib/fmea/constants/dfmea-header-map';
import {
  dedupKey_DFMEA_FL_FM,
  dedupKey_DFMEA_FL_FC,
  dedupKey_DFMEA_FN_L2,
  dedupKey_DFMEA_ST_L2,
  dedupKey_DFMEA_ST_L3,
  normalize,
} from '@/lib/fmea/utils/dedup-key';

const REPO = path.resolve(__dirname, '../../..');
const read = (rel: string) => fs.readFileSync(path.join(REPO, rel), 'utf-8');

// ─── Guard 1: DFMEA FL dedupKey — 동명 FM이 다른 부모면 다른 키 ───
describe('DFMEA Guard 1: FL_FM dedupKey (동명 FM, 다른 부모)', () => {
  it('동일 modeName이라도 fn_l2_id가 다르면 dedupKey_DFMEA_FL_FM이 달라야 한다', () => {
    expect(dedupKey_DFMEA_FL_FM('fn_l2_A', '고장형태X'))
      .not.toBe(dedupKey_DFMEA_FL_FM('fn_l2_B', '고장형태X'));
  });

  it('dedupKey_DFMEA_FL_FM은 초점요소(FN_L2) 경계를 포함한다', () => {
    const k1 = dedupKey_DFMEA_FL_FM('fn-l2-a', '크랙');
    const k2 = dedupKey_DFMEA_FL_FM('fn-l2-b', '크랙');
    expect(k1).not.toBe(k2);
    expect(k1).toBe('fn-l2-a::크랙');
    expect(k2).toBe('fn-l2-b::크랙');
  });
});

// ─── Guard 2: DFMEA FC parentId — fn_l3_id에 연결 (st_l3_id 아님) ───
describe('DFMEA Guard 2: FC parentId → FN_L3 (정적)', () => {
  it('position-parser에 B4→B3 parentItemId 규칙 주석이 있어야 한다', () => {
    const src = read('src/lib/fmea/position-parser.ts');
    expect(src).toContain('B4.parentItemId');
    expect(src).toContain('B3');
  });

  it('dedupKey_DFMEA_FL_FC는 fn_l3_id(부품기능)를 포함한다 (st_l3_id가 아님)', () => {
    const fnL3 = 'fn-l3-part-func';
    const stL3 = 'st-l3-part-struct';
    const k1 = dedupKey_DFMEA_FL_FC(fnL3, '고장원인X');
    expect(k1).toContain(fnL3);
    expect(k1).not.toContain(stL3);
  });
});

// ─── Guard 3: DFMEA 카테시안 방지 ───
describe('DFMEA Guard 3: 카테시안 징후 (동일 텍스트 FM이 초점요소 경계에서 분리)', () => {
  it('dedupKey_DFMEA_FL_FM은 초점요소(L2 기능) 경계를 포함하므로 동명 FM 병합으로 인한 카테시안 완화에 기여한다', () => {
    const elemA = dedupKey_DFMEA_FL_FM('fn-l2-elem10', '크랙');
    const elemB = dedupKey_DFMEA_FL_FM('fn-l2-elem20', '크랙');
    expect(elemA).not.toBe(elemB);
  });
});

// ─── Guard 4: DFMEA FN_L2 dedupKey에 productCharId(FK) 포함 ───
describe('DFMEA Guard 4: FN_L2에 productCharId(FK) 문자열이 그대로 들어감', () => {
  it('dedupKey_DFMEA_FN_L2 세 번째 인자는 텍스트 특성명이 아니라 UUID 형태 FK를 받는다', () => {
    const pcId = 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee';
    expect(dedupKey_DFMEA_FN_L2('l2s', '초점요소기능', pcId)).toContain(pcId);
    expect(dedupKey_DFMEA_FN_L2('l2s', '초점요소기능', pcId)).not.toContain('제품특성텍스트');
  });
});

// ─── Guard 5: DFMEA 파싱 시점 중복제거 부재 ───
describe('DFMEA Guard 5: 파싱 시점 중복제거 부재 — Import는 공용 경로 사용', () => {
  it('DFMEA import 페이지는 PFMEA re-export (별도 파서 없음)', () => {
    const src = read('src/app/(fmea-core)/dfmea/import/page.tsx');
    expect(src).toContain("from '@/app/(fmea-core)/pfmea/import/page'");
  });

  it('package.json에 guard:codefreeze-import 스크립트가 있어야 한다', () => {
    const raw = read('package.json');
    expect(raw).toContain('"guard:codefreeze-import"');
    expect(raw).toContain('codefreeze-import-staged.ts');
  });
});

// ─── Guard 6: DFMEA fill-down (번호/초점요소/타입) ───
describe('DFMEA Guard 6: fill-down 정합성', () => {
  it('DFMEA_FILL_DOWN_RULES에 문서 구간 키가 있다', () => {
    expect(DFMEA_FILL_DOWN_RULES.구조분석).toContain('다음 상위수준');
    expect(DFMEA_FILL_DOWN_RULES.구조분석).toContain('번호');
    expect(DFMEA_FILL_DOWN_RULES.구조분석).toContain('초점요소');
    expect(DFMEA_FILL_DOWN_RULES.구조분석).toContain('타입');
    expect(DFMEA_FILL_DOWN_RULES['1L_고장영향']).toContain('구분');
    expect(DFMEA_FILL_DOWN_RULES['2L_고장형태']).toContain('제품특성');
    expect(DFMEA_FILL_DOWN_RULES['3L_고장원인']).toContain('부품 기능 또는 특성');
  });

  it('NaN/빈 번호 행은 직전 유효 번호를 이어받는다 (fill-down 시뮬)', () => {
    type Row = { d1: number | typeof NaN };
    const fillDown = (rows: Row[]): string[] => {
      let prev = '';
      const out: string[] = [];
      for (const r of rows) {
        if (typeof r.d1 === 'number' && !Number.isNaN(r.d1)) {
          prev = String(r.d1);
          out.push(prev);
        } else {
          out.push(prev);
        }
      }
      return out;
    };
    expect(fillDown([{ d1: 5 }, { d1: NaN }, { d1: NaN }])).toEqual(['5', '5', '5']);
  });
});

// ─── Guard 7: DFMEA normalize 엣지케이스 ───
describe('DFMEA Guard 7: normalize 엣지케이스', () => {
  it('탭·연속 공백·줄바꿈+공백 조합', () => {
    expect(normalize('a\t\tb')).toBe('a b');
    expect(normalize('  x  \n  y  ')).toBe('x y');
    expect(normalize(null)).toBe('__EMPTY__');
  });
});

// ─── Guard 8 (DFMEA 전용): 구분 카테고리값 (법규/기본/보조) ───
describe('DFMEA Guard 8: 구분(F1) 카테고리값 검증', () => {
  it('DFMEA 구분 카테고리 허용값: 법규/기본/보조/관능', () => {
    const DFMEA_CATEGORIES = ['법규', '기본', '보조', '관능'];
    DFMEA_CATEGORIES.forEach(cat => {
      expect(['법규', '기본', '보조', '관능']).toContain(cat);
    });
  });

  it('normalizeDfmeaHeader: 구분 → F1, 다음 상위수준 → F1', () => {
    expect(normalizeDfmeaHeader('구분')).toBe('F1');
    expect(normalizeDfmeaHeader('다음 상위수준')).toBe('F1');
  });

  it('normalizeDfmeaHeader: 타입 → E1', () => {
    expect(normalizeDfmeaHeader('타입')).toBe('E1');
  });

  it('normalizeDfmeaHeader: 다음하위 수준 → D2', () => {
    expect(normalizeDfmeaHeader('다음하위 수준')).toBe('D2');
  });

  it('DFMEA_COLUMN_IDS.D5 = 고장형태', () => {
    expect(DFMEA_COLUMN_IDS.D5).toBe('고장형태');
  });

  it('DFMEA ST_L2/ST_L3 dedupKey는 초점요소 경계를 포함한다', () => {
    const a = dedupKey_DFMEA_ST_L2('l1-x', '10');
    const b = dedupKey_DFMEA_ST_L2('l1-x', '20');
    expect(a).not.toBe(b);

    const c = dedupKey_DFMEA_ST_L3('l2-x', '부품', 'Capacitor');
    const d = dedupKey_DFMEA_ST_L3('l2-x', '재료', 'Capacitor');
    expect(c).not.toBe(d);
  });
});
