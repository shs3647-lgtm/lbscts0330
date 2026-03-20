/**
 * @file snapshot-manager.ts
 * @description FMEA 프로젝트별 스냅샷 백업/복원 관리자
 * - Atomic DB 기반 경량 스냅샷 (50~200KB)
 * - 자동(AUTO_CONFIRM, AUTO_PERIODIC) + 수동(MANUAL) 백업
 * - 보존 정책: 자동 20개, 수동 10개
 * @created 2026-02-23
 */

import type { WorksheetState } from '@/app/(fmea-core)/pfmea/worksheet/constants';

// ============================================================================
// 타입 정의
// ============================================================================

export type SnapshotTriggerType = 'MANUAL' | 'AUTO_CONFIRM' | 'AUTO_PERIODIC';

export interface SnapshotStats {
  processes: number;
  workElements: number;
  functions: number;
  failureLinks: number;
  confirmedSteps: string[];
}

export interface SnapshotMetadata {
  id: string;
  fmeaId: string;
  version: string;
  triggerType: string;
  changeNote: string | null;
  dataSize: number;
  createdAt: string;
  stats?: SnapshotStats;
}

export interface SnapshotListResponse {
  success: boolean;
  snapshots: SnapshotMetadata[];
  autoCount: number;
  manualCount: number;
}

export interface SnapshotRestoreResult {
  success: boolean;
  restoredVersion: string;
  message: string;
  data?: Record<string, unknown>;
}

// ============================================================================
// 보존 정책 상수
// ============================================================================

const MAX_AUTO_SNAPSHOTS = 20;
const MAX_MANUAL_SNAPSHOTS = 10;

// ============================================================================
// 통계 계산
// ============================================================================

function calculateStats(state: WorksheetState): SnapshotStats {
  const confirmedSteps: string[] = [];
  if (state.structureConfirmed) confirmedSteps.push('구조분석');
  if (state.l1Confirmed) confirmedSteps.push('1L기능');
  if (state.l2Confirmed) confirmedSteps.push('2L기능');
  if (state.l3Confirmed) confirmedSteps.push('3L기능');
  if (state.failureLinkConfirmed) confirmedSteps.push('고장연결');
  if (state.riskConfirmed) confirmedSteps.push('리스크');
  if ((state as unknown as Record<string, unknown>).optimizationConfirmed) confirmedSteps.push('최적화');

  return {
    processes: state.l2?.length || 0,
    workElements: state.l2?.reduce((sum, p) => sum + (p.l3?.length || 0), 0) || 0,
    functions:
      (state.l1?.types?.reduce((sum, t) => sum + (t.functions?.length || 0), 0) || 0) +
      (state.l2?.reduce((sum, p) => sum + (p.functions?.length || 0), 0) || 0) +
      (state.l2?.reduce((sum, p) => sum + (p.l3?.reduce((s, w) => s + (w.functions?.length || 0), 0) || 0), 0) || 0),
    failureLinks: (state.failureLinks || []).length,
    confirmedSteps,
  };
}

// ============================================================================
// 다음 버전 번호 계산
// ============================================================================

function getNextVersion(existing: SnapshotMetadata[], prefix: 'A' | 'M'): string {
  const filtered = existing.filter(s => s.version.startsWith(prefix + '.'));
  if (filtered.length === 0) return `${prefix}.001`;

  const maxSeq = filtered.reduce((max, s) => {
    const seq = parseInt(s.version.split('.')[1], 10) || 0;
    return seq > max ? seq : max;
  }, 0);

  return `${prefix}.${String(maxSeq + 1).padStart(3, '0')}`;
}

// ============================================================================
// 스냅샷 생성
// ============================================================================

export async function createSnapshot(
  fmeaId: string,
  state: WorksheetState,
  triggerType: SnapshotTriggerType,
  changeNote?: string,
): Promise<{ success: boolean; version: string } | null> {
  try {
    if (!fmeaId || !state) return null;

    const stats = calculateStats(state);

    // 기존 스냅샷 목록 조회 (버전 번호 결정용)
    const listRes = await fetch(`/api/fmea/backup/snapshot?fmeaId=${encodeURIComponent(fmeaId)}`);
    const listData = listRes.ok ? await listRes.json() : { snapshots: [] };
    const existing: SnapshotMetadata[] = listData.snapshots || [];

    const prefix = triggerType === 'MANUAL' ? 'M' : 'A';
    const version = getNextVersion(existing, prefix);

    // backupData: 전체 state + stats
    const backupData = {
      state: {
        l1: state.l1,
        l2: state.l2,
        failureLinks: state.failureLinks,
        riskData: state.riskData,
        fmea4Rows: state.fmea4Rows,
        structureConfirmed: state.structureConfirmed,
        l1Confirmed: state.l1Confirmed,
        l2Confirmed: state.l2Confirmed,
        l3Confirmed: state.l3Confirmed,
        failureL1Confirmed: (state as unknown as Record<string, unknown>).failureL1Confirmed,
        failureL2Confirmed: (state as unknown as Record<string, unknown>).failureL2Confirmed,
        failureL3Confirmed: (state as unknown as Record<string, unknown>).failureL3Confirmed,
        failureLinkConfirmed: state.failureLinkConfirmed,
        riskConfirmed: state.riskConfirmed,
        optimizationConfirmed: (state as unknown as Record<string, unknown>).optimizationConfirmed,
      },
      stats,
      triggerContext: changeNote || triggerType,
    };

    const res = await fetch('/api/fmea/backup/snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fmeaId,
        version,
        triggerType,
        changeNote: changeNote || null,
        backupData,
      }),
    });

    if (!res.ok) {
      console.error('[스냅샷] 생성 실패:', await res.text());
      return null;
    }

    const result = await res.json();
    return { success: true, version: result.version || version };
  } catch (error) {
    console.error('[스냅샷] 생성 오류:', error);
    return null;
  }
}

// ============================================================================
// 스냅샷 목록 조회
// ============================================================================

export async function listSnapshots(fmeaId: string): Promise<SnapshotListResponse> {
  try {
    const res = await fetch(`/api/fmea/backup/snapshot?fmeaId=${encodeURIComponent(fmeaId)}`);
    if (!res.ok) {
      return { success: false, snapshots: [], autoCount: 0, manualCount: 0 };
    }
    const data = await res.json();
    const snapshots: SnapshotMetadata[] = data.snapshots || [];
    const autoCount = snapshots.filter(s => s.version.startsWith('A.')).length;
    const manualCount = snapshots.filter(s => s.version.startsWith('M.')).length;
    return { success: true, snapshots, autoCount, manualCount };
  } catch (error) {
    console.error('[스냅샷] 목록 조회 오류:', error);
    return { success: false, snapshots: [], autoCount: 0, manualCount: 0 };
  }
}

// ============================================================================
// 스냅샷 복원
// ============================================================================

export async function restoreSnapshot(
  fmeaId: string,
  version: string,
): Promise<SnapshotRestoreResult> {
  try {
    const res = await fetch('/api/fmea/backup/snapshot', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fmeaId, version }),
    });
    if (!res.ok) {
      const errText = await res.text();
      return { success: false, restoredVersion: version, message: `복원 실패: ${errText}` };
    }
    const data = await res.json();
    return {
      success: true,
      restoredVersion: version,
      message: data.message || '복원 완료',
      data: data.restoredData,
    };
  } catch (error) {
    console.error('[스냅샷] 복원 오류:', error);
    return { success: false, restoredVersion: version, message: '복원 중 오류 발생' };
  }
}

// ============================================================================
// 스냅샷 삭제
// ============================================================================

export async function deleteSnapshot(fmeaId: string, version: string): Promise<boolean> {
  try {
    const res = await fetch('/api/fmea/backup/snapshot', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fmeaId, version }),
    });
    return res.ok;
  } catch (error) {
    console.error('[스냅샷] 삭제 오류:', error);
    return false;
  }
}

// ============================================================================
// 보존 정책 적용 (retention enforcement)
// ============================================================================

export { MAX_AUTO_SNAPSHOTS, MAX_MANUAL_SNAPSHOTS };
