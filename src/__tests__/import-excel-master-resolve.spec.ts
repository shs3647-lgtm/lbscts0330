import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  masterJsonMatchesFmeaId,
  normalizeFmeaId,
  resolveMasterJsonPath,
} from '@/lib/fmea-core/import-excel-master-resolve';

describe('import-excel-master-resolve', () => {
  it('normalizeFmeaId lowercases', () => {
    expect(normalizeFmeaId('PFM26-M002')).toBe('pfm26-m002');
  });

  it('resolveMasterJsonPath prefers explicit path when file exists', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fmea-resolve-'));
    const explicit = path.join(tmp, 'custom.json');
    fs.writeFileSync(explicit, '{}');
    const r = resolveMasterJsonPath(tmp, 'pfm26-m101', 'custom.json');
    expect(r.path).toBe(explicit);
    expect(r.tried[0]).toBe(explicit);
  });

  it('resolveMasterJsonPath tries -golden then bare fmeaId', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fmea-resolve-'));
    const dataDir = path.join(tmp, 'data', 'master-fmea');
    fs.mkdirSync(dataDir, { recursive: true });
    const bare = path.join(dataDir, 'pfm26-m002.json');
    fs.writeFileSync(bare, '{}');
    const r = resolveMasterJsonPath(tmp, 'pfm26-m002', undefined);
    expect(r.path).toBe(bare);
    expect(r.tried.length).toBeGreaterThanOrEqual(2);
  });

  it('masterJsonMatchesFmeaId accepts top-level or atomicDB fmeaId', () => {
    expect(masterJsonMatchesFmeaId({ fmeaId: 'pfm26-m101' }, 'pfm26-m101')).toBe(true);
    expect(masterJsonMatchesFmeaId({ atomicDB: { fmeaId: 'pfm26-m101' } }, 'pfm26-m101')).toBe(true);
    expect(masterJsonMatchesFmeaId({ fmeaId: 'pfm26-m002' }, 'pfm26-m101')).toBe(false);
  });
});
