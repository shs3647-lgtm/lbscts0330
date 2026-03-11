/**
 * 프로젝트별 자동 백업 관리자
 * - FMEA 확정 시 자동 백업 트리거
 * - Excel/JSON/스냅샷 백업 생성
 * - 백업 파일 자동 정리 (30일 이상 된 파일 삭제)
 */
import { WorksheetState } from '@/app/pfmea/worksheet/constants';

export interface BackupMetadata {
  fmeaId: string;
  fmeaName: string;
  backupType: 'auto' | 'manual';
  backupDate: string;
  filePaths: {
    excel?: string;
    json?: string;
    snapshot?: string;
  };
  stats: {
    processes: number;
    workElements: number;
    functions: number;
    failureLinks: number;
    risks: number;
    optimizations: number;
  };
}

export interface BackupListResponse {
  success: boolean;
  backups: BackupMetadata[];
  total: number;
}

/**
 * FMEA 확정 시 자동 백업 트리거
 */
export async function triggerAutoBackup(
  fmeaId: string,
  fmeaName: string,
  state: WorksheetState
): Promise<BackupMetadata | null> {
  try {
    console.log(`[백업] 자동 백업 시작: ${fmeaId}`);
    
    // 1. Excel 백업
    const excelPath = await createExcelBackup(fmeaId, fmeaName, state);
    
    // 2. JSON 백업
    const jsonPath = await createJsonBackup(fmeaId, fmeaName, state);
    
    // 3. 스냅샷 백업 (클라이언트에서 처리)
    // const snapshotPath = await createSnapshotBackup(fmeaId);
    
    // 4. 메타데이터 생성
    const stats = calculateStats(state);
    const metadata: BackupMetadata = {
      fmeaId,
      fmeaName,
      backupType: 'auto',
      backupDate: new Date().toISOString(),
      filePaths: {
        excel: excelPath,
        json: jsonPath,
      },
      stats,
    };
    
    // 5. 백업 메타데이터 저장
    await saveBackupMetadata(metadata);
    
    console.log(`[백업] 자동 백업 완료: ${fmeaId}`);
    return metadata;
  } catch (error) {
    console.error('[백업] 자동 백업 실패:', error);
    return null;
  }
}

/**
 * Excel 백업 생성
 */
async function createExcelBackup(
  fmeaId: string,
  fmeaName: string,
  state: WorksheetState
): Promise<string> {
  try {
    const response = await fetch('/api/fmea/backup/excel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fmeaId, fmeaName, state }),
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.filePath || '';
    }
    return '';
  } catch (error) {
    console.error('[백업] Excel 백업 실패:', error);
    return '';
  }
}

/**
 * JSON 백업 생성 (export-package API 활용)
 */
async function createJsonBackup(
  fmeaId: string,
  fmeaName: string,
  state: WorksheetState
): Promise<string> {
  try {
    const response = await fetch('/api/fmea/export-package', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fmeaId, fmeaName, exportedBy: 'Auto Backup' }),
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.exportPath || '';
    }
    return '';
  } catch (error) {
    console.error('[백업] JSON 백업 실패:', error);
    return '';
  }
}

/**
 * 통계 계산
 */
function calculateStats(state: WorksheetState): BackupMetadata['stats'] {
  return {
    processes: state.l2?.length || 0,
    workElements: state.l2?.reduce((sum, p) => sum + (p.l3?.length || 0), 0) || 0,
    functions: 
      (state.l1?.types?.reduce((sum, t) => sum + (t.functions?.length || 0), 0) || 0) +
      (state.l2?.reduce((sum, p) => sum + (p.functions?.length || 0), 0) || 0) +
      (state.l2?.reduce((sum, p) => sum + (p.l3?.reduce((s, w) => s + (w.functions?.length || 0), 0) || 0), 0) || 0),
    failureLinks: (state as any).failureLinks?.length || 0,
    risks: 0, // TODO: 리스크 분석 개수
    optimizations: 0, // TODO: 최적화 개수
  };
}

/**
 * 백업 메타데이터 저장
 */
async function saveBackupMetadata(metadata: BackupMetadata): Promise<void> {
  try {
    await fetch('/api/fmea/backup/metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metadata),
    });
  } catch (error) {
    console.error('[백업] 메타데이터 저장 실패:', error);
  }
}

/**
 * 백업 목록 조회
 */
export async function getBackupList(fmeaId: string): Promise<BackupListResponse> {
  try {
    const response = await fetch(`/api/fmea/backup/list?fmeaId=${fmeaId}`);
    if (response.ok) {
      return await response.json();
    }
    return { success: false, backups: [], total: 0 };
  } catch (error) {
    console.error('[백업] 목록 조회 실패:', error);
    return { success: false, backups: [], total: 0 };
  }
}

/**
 * 오래된 백업 파일 자동 정리 (30일 이상)
 */
export async function cleanupOldBackups(fmeaId?: string): Promise<number> {
  try {
    const response = await fetch('/api/fmea/backup/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fmeaId, days: 30 }),
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.deletedCount || 0;
    }
    return 0;
  } catch (error) {
    console.error('[백업] 정리 실패:', error);
    return 0;
  }
}








