import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import {
  isL1UnifiedEmptyEffectDash,
  normalizeL1UnifiedScopeKey,
  resolveL1UnifiedRowScopeKey,
} from '@/app/(fmea-core)/pfmea/import/l1-unified-scope';

describe('L1 통합시트 구분(C1) / C4 대시', () => {
  it('normalizeL1UnifiedScopeKey: 대시·N/A 는 빈 키', () => {
    expect(normalizeL1UnifiedScopeKey('-')).toBe('');
    expect(normalizeL1UnifiedScopeKey('—')).toBe('');
    expect(normalizeL1UnifiedScopeKey('N/A')).toBe('');
    expect(normalizeL1UnifiedScopeKey('YP')).toBe('YP');
  });

  it('isL1UnifiedEmptyEffectDash: C4 미해당 표시', () => {
    expect(isL1UnifiedEmptyEffectDash('-')).toBe(true);
    expect(isL1UnifiedEmptyEffectDash('')).toBe(true);
    expect(isL1UnifiedEmptyEffectDash('PR 두께 Spec Out')).toBe(false);
  });

  it('resolveL1UnifiedRowScopeKey: 1행 구분이 "-"이면 다음 행 YP를 참고', () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('L1');
    ws.getRow(2).getCell(2).value = '-';
    ws.getRow(3).getCell(2).value = 'YP';
    const r = resolveL1UnifiedRowScopeKey(ws, 2, 2, '');
    expect(r.keyVal).toBe('YP');
    expect(r.nextCfKey).toBe('YP');
  });

  it('resolveL1UnifiedRowScopeKey: 병합된 구분은 마스터 값', () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('L1');
    ws.mergeCells(2, 2, 3, 2);
    ws.getCell(2, 2).value = 'YP';
    const r3 = resolveL1UnifiedRowScopeKey(ws, 3, 2, '');
    expect(r3.keyVal).toBe('YP');
  });
});
