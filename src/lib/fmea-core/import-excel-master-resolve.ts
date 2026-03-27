/**
 * import-excel-file: fmeaId별 마스터 JSON 경로 결정 + JSON이 현재 프로젝트와 일치하는지 검사
 * (다른 프로젝트 m002 골든을 임포트에 재사용하면 Rule 0/1.7 위반)
 */
import * as fs from 'fs';
import * as path from 'path';

export interface MasterJsonLike {
  fmeaId?: string;
  atomicDB?: { fmeaId?: string };
}

export function normalizeFmeaId(id: string): string {
  return id.trim().toLowerCase();
}

/**
 * 명시 경로 → 프로젝트별 파일 순으로 시도. m002 등 타 프로젝트 자동 폴백 없음.
 */
export function resolveMasterJsonPath(
  projectRoot: string,
  fmeaId: string,
  explicitRelativePath?: string | null,
): { path: string | null; tried: string[] } {
  const tried: string[] = [];
  const fid = normalizeFmeaId(fmeaId);

  if (explicitRelativePath?.trim()) {
    const p = path.resolve(projectRoot, explicitRelativePath.trim());
    tried.push(p);
    if (fs.existsSync(p)) return { path: p, tried };
  }

  const candidates = [
    path.join(projectRoot, 'data', 'master-fmea', `${fid}-golden.json`),
    path.join(projectRoot, 'data', 'master-fmea', `${fid}.json`),
  ];

  for (const p of candidates) {
    tried.push(p);
    if (fs.existsSync(p)) return { path: p, tried };
  }

  return { path: null, tried };
}

export function masterJsonMatchesFmeaId(
  parsed: MasterJsonLike | null | undefined,
  fmeaId: string,
): boolean {
  if (!parsed) return false;
  const fid = normalizeFmeaId(fmeaId);
  const top = parsed.fmeaId ? normalizeFmeaId(parsed.fmeaId) : '';
  const atomic = parsed.atomicDB?.fmeaId ? normalizeFmeaId(parsed.atomicDB.fmeaId) : '';
  if (top && top === fid) return true;
  if (atomic && atomic === fid) return true;
  return false;
}
