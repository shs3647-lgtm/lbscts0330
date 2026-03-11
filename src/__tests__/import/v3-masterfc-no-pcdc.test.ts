/**
 * @file v3-masterfc-no-pcdc.test.ts
 * @description TDD: v3.1.1 masterFailureChain.ts — pcValue/dcValue 복원
 *
 * v3.1.1 변경:
 *   - MasterFailureChain에 pcValue, dcValue 필드 복원
 *   - buildFailureChainsFromFlat()에서 A6/B5 수집·할당 로직 복원
 *   - PreventionPool, DetectionPool 인터페이스는 복원하지 않음
 *
 * @created 2026-02-28
 */

import { describe, it, expect } from 'vitest';
import type { ImportedFlatData } from '../../app/(fmea-core)/pfmea/import/types';
import {
  buildFailureChainsFromFlat,
  type MasterFailureChain,
} from '../../app/(fmea-core)/pfmea/import/types/masterFailureChain';

describe('v3.1.1: masterFailureChain.ts — pcValue/dcValue 복원', () => {

  // ─── 타입 레벨 검증 (소스코드 패턴) ───

  it('PreventionPool 인터페이스가 export되지 않아야 함 (별도 Pool은 불필요)', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      'src/app/(fmea-core)/pfmea/import/types/masterFailureChain.ts',
      'utf-8',
    );
    expect(content).not.toMatch(/export\s+interface\s+PreventionPool/);
  });

  it('DetectionPool 인터페이스가 export되지 않아야 함 (별도 Pool은 불필요)', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      'src/app/(fmea-core)/pfmea/import/types/masterFailureChain.ts',
      'utf-8',
    );
    expect(content).not.toMatch(/export\s+interface\s+DetectionPool/);
  });

  it('MasterFailureChain에 pcValue 필드가 있어야 함', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      'src/app/(fmea-core)/pfmea/import/types/masterFailureChain.ts',
      'utf-8',
    );
    expect(content).toMatch(/pcValue\?\s*:\s*string/);
  });

  it('MasterFailureChain에 dcValue 필드가 있어야 함', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      'src/app/(fmea-core)/pfmea/import/types/masterFailureChain.ts',
      'utf-8',
    );
    expect(content).toMatch(/dcValue\?\s*:\s*string/);
  });

  // ─── buildFailureChainsFromFlat() 결과 검증 ───

  it('buildFailureChainsFromFlat 결과에 pcValue/dcValue 속성이 있어야 함', () => {
    const flatData: ImportedFlatData[] = [
      // FE (C4)
      { id: 'c4-1', processNo: 'YP', category: 'C', itemCode: 'C4', value: '재작업', createdAt: new Date() },
      // FM (A5)
      { id: 'a5-1', processNo: '10', category: 'A', itemCode: 'A5', value: '치수불량', createdAt: new Date() },
      // FC (B4)
      { id: 'b4-1', processNo: '10', category: 'B', itemCode: 'B4', value: '공구마모', m4: 'MC', createdAt: new Date() },
      // B1 (작업요소)
      { id: 'b1-1', processNo: '10', category: 'B', itemCode: 'B1', value: 'CNC선반', m4: 'MC', createdAt: new Date() },
      // A6 (검출관리) — pcValue로 수집
      { id: 'a6-1', processNo: '10', category: 'A', itemCode: 'A6', value: '최종검사', createdAt: new Date() },
      // B5 (예방관리) — dcValue로 수집
      { id: 'b5-1', processNo: '10', category: 'B', itemCode: 'B5', value: '정기점검', m4: 'MC', createdAt: new Date() },
    ];

    const chains = buildFailureChainsFromFlat(flatData, {} as any);
    expect(chains.length).toBeGreaterThan(0);

    // pcValue (B5 예방관리) 또는 dcValue (A6 검출관리)가 포함되어야 함
    const hasPC = chains.some(c => c.pcValue);
    const hasDC = chains.some(c => c.dcValue);
    expect(hasPC || hasDC).toBe(true);
  });

  it('buildFailureChainsFromFlat에서 A6 데이터를 수집해야 함', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      'src/app/(fmea-core)/pfmea/import/types/masterFailureChain.ts',
      'utf-8',
    );
    // A6 수집 로직이 존재해야 함 (itemCode === 'A6' 패턴)
    const codeLines = content.split('\n').filter(l => !l.trim().startsWith('//'));
    const codeOnly = codeLines.join('\n');
    expect(codeOnly).toMatch(/['"]A6['"]/);
  });

  it('buildFailureChainsFromFlat에서 B5 보조정보를 수집해야 함', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync(
      'src/app/(fmea-core)/pfmea/import/types/masterFailureChain.ts',
      'utf-8',
    );
    // bSupp에서 B5 수집 로직이 존재해야 함
    expect(content).toMatch(/['"]B5['"]/);
  });
});
