import { describe, it, expect } from 'vitest';
import { isL3FunctionIdB2Pattern } from '@/lib/uuid-rules';

describe('isL3FunctionIdB2Pattern', () => {
  it('genB2 funcIdx=1 (-G) 및 funcIdx≥2 (-G-00n) 인 L3Function id는 true', () => {
    expect(isL3FunctionIdB2Pattern('PF-L3-001-EN-002-G')).toBe(true);
    expect(isL3FunctionIdB2Pattern('PF-L3-040-MC-001-G-002')).toBe(true);
  });

  it('genB3 공정특성(-C-) id는 false', () => {
    expect(isL3FunctionIdB2Pattern('PF-L3-001-EN-002-C-001')).toBe(false);
  });

  it('PF-L3- 접두사 없음 / 다른 레벨은 false', () => {
    expect(isL3FunctionIdB2Pattern('PF-L2-001')).toBe(false);
    expect(isL3FunctionIdB2Pattern('')).toBe(false);
  });
});
