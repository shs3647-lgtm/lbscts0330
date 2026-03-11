/**
 * @file integration.test.ts
 * @description PFMEA-CP-PFD 동기화 통합 테스트
 *
 * 시나리오:
 * 1. PFMEA 데이터 변경 → SharedMaster 동기화 → SyncTracker 기록
 * 2. CP 앱 폴링 → 변경사항 감지 → CP 데이터 업데이트
 * 3. PFMEA 상태 변경 → CP 구조 잠금/해제
 * 4. 4M 필터링 규칙 검증
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  recordSyncChange,
  pollPendingChanges,
  handlePfmeaStateChange,
  applySyncChangesToCp,
  M4_CP_FILTER,
} from '@/lib/sync/polling-sync-service';
import { createMockPrismaClient } from '../mocks/prisma';

describe('PFMEA-CP-PFD 동기화 통합 테스트', () => {
  let mockPrisma: ReturnType<typeof createMockPrismaClient>;

  beforeEach(() => {
    mockPrisma = createMockPrismaClient();
    vi.clearAllMocks();
  });

  describe('시나리오 1: PFMEA 데이터 변경 → CP/PFD 동기화 흐름', () => {
    it('PFMEA 공정 변경 시 변경 추적 기록이 생성되어야 함', async () => {
      // 1. PFMEA에서 공정명 변경
      await recordSyncChange(mockPrisma as never, {
        sourceType: 'pfmea',
        sourceId: 'fmea-001',
        sourceTable: 'shared_process_master',
        sourceRowId: 'spm-001',
        changeType: 'update',
        changedFields: ['processName', 'processDesc'],
        oldValues: { processName: '용접 공정 v1' },
        newValues: { processName: '용접 공정 v2' },
      });

      // 2. SyncTracker에 기록 확인
      expect(mockPrisma.syncTracker.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sourceType: 'pfmea',
          sourceId: 'fmea-001',
          changeType: 'update',
          status: 'pending',
          targetTypes: JSON.stringify(['cp', 'pfd']),
        }),
      });
    });

    it('CP 앱이 폴링하면 대기 중인 변경사항을 가져와야 함', async () => {
      // 1. 대기 중인 변경사항 설정
      const pendingChange = {
        id: 'sync-001',
        sourceType: 'pfmea',
        sourceId: 'fmea-001',
        sourceTable: 'shared_process_master',
        sourceRowId: 'spm-001',
        changeType: 'update',
        changedFields: JSON.stringify(['processName']),
        newValues: JSON.stringify({ processName: '용접 공정 v2' }),
        targetTypes: JSON.stringify(['cp', 'pfd']),
        status: 'pending',
        retryCount: 0,
        errorMessage: null,
        createdAt: new Date(),
        processedAt: null,
      };

      mockPrisma.pollingSyncState.findUnique.mockResolvedValueOnce({
        id: 'poll-001',
        clientId: 'cp-CP26-001',
        appType: 'cp',
        documentId: 'CP26-001',
        lastPolledAt: new Date(Date.now() - 5000),
        lastSyncedId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.syncTracker.findMany.mockResolvedValueOnce([pendingChange]);

      // 2. CP 앱에서 폴링
      const result = await pollPendingChanges(
        mockPrisma as never,
        'cp',
        'CP26-001'
      );

      // 3. 변경사항 확인
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].sourceType).toBe('pfmea');
      expect(result.changes[0].newValues).toEqual({ processName: '용접 공정 v2' });
    });

    it('CP에 변경사항을 적용하면 항목이 업데이트되어야 함', async () => {
      const changes = [
        {
          id: 'sync-001',
          sourceTable: 'shared_process_master',
          changeType: 'update',
          newValues: {
            processNo: '10',
            processName: '용접 공정 v2',
            processDesc: '업데이트된 설명',
            workElement: '1. 스폿 용접',
          },
        },
      ];

      const result = await applySyncChangesToCp(
        mockPrisma as never,
        'CP26-001',
        changes
      );

      expect(result.applied).toBe(1);
      expect(mockPrisma.controlPlanItem.updateMany).toHaveBeenCalled();
      expect(mockPrisma.syncTracker.update).toHaveBeenCalledWith({
        where: { id: 'sync-001' },
        data: expect.objectContaining({
          status: 'completed',
        }),
      });
    });
  });

  describe('시나리오 2: PFMEA 상태 변경 → CP 잠금 제어', () => {
    it('PFMEA 승인 시 CP 구조가 잠겨야 함', async () => {
      // 연결된 CP 설정
      mockPrisma.pfmeaCpMapping.findMany.mockResolvedValueOnce([
        {
          id: 'pcm-001',
          sharedProcessId: 'spm-001',
          cpNo: 'CP26-001',
          cpRev: 'A',
          cpItemId: 'cpi-001',
          fmeaId: 'fmea-001',
          fmeaRev: 'A',
          pfmeaRowUid: 'row-001',
          linkStatus: 'active',
          changeFlag: false,
          syncStatus: 'synced',
          lastSyncAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'pcm-002',
          sharedProcessId: 'spm-002',
          cpNo: 'CP26-002',
          cpRev: 'A',
          cpItemId: 'cpi-002',
          fmeaId: 'fmea-001',
          fmeaRev: 'A',
          pfmeaRowUid: 'row-002',
          linkStatus: 'active',
          changeFlag: false,
          syncStatus: 'synced',
          lastSyncAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      // PFMEA 승인
      await handlePfmeaStateChange(
        mockPrisma as never,
        'fmea-001',
        'draft',
        'approved',
        'user-001'
      );

      // CP 상태 변경 확인
      expect(mockPrisma.controlPlan.updateMany).toHaveBeenCalledWith({
        where: { cpNo: 'CP26-001', status: 'draft' },
        data: { status: 'structure_locked' },
      });
      expect(mockPrisma.controlPlan.updateMany).toHaveBeenCalledWith({
        where: { cpNo: 'CP26-002', status: 'draft' },
        data: { status: 'structure_locked' },
      });

      // 상태 이력 기록 확인
      expect(mockPrisma.pfmeaStateHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fmeaId: 'fmea-001',
          fromState: 'draft',
          toState: 'approved',
          cpAction: 'lock_structure',
        }),
      });
    });

    it('PFMEA 개정 시 기존 CP가 Obsolete 되어야 함', async () => {
      mockPrisma.pfmeaCpMapping.findMany.mockResolvedValueOnce([
        {
          id: 'pcm-001',
          sharedProcessId: 'spm-001',
          cpNo: 'CP26-001',
          cpRev: 'A',
          cpItemId: 'cpi-001',
          fmeaId: 'fmea-001',
          fmeaRev: 'A',
          pfmeaRowUid: 'row-001',
          linkStatus: 'active',
          changeFlag: false,
          syncStatus: 'synced',
          lastSyncAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      // PFMEA 개정
      await handlePfmeaStateChange(
        mockPrisma as never,
        'fmea-001',
        'approved',
        'revised'
      );

      // CP Obsolete 처리 확인
      expect(mockPrisma.controlPlan.updateMany).toHaveBeenCalledWith({
        where: { cpNo: 'CP26-001', status: { not: 'obsolete' } },
        data: { status: 'obsolete' },
      });

      // 매핑 상태 업데이트 확인
      expect(mockPrisma.pfmeaCpMapping.updateMany).toHaveBeenCalledWith({
        where: { cpNo: 'CP26-001', fmeaId: 'fmea-001' },
        data: { linkStatus: 'obsolete' },
      });
    });
  });

  describe('시나리오 3: 4M 필터링 규칙 검증', () => {
    it('MC, IM, EN은 CP 연동 대상이어야 함', () => {
      expect(M4_CP_FILTER).toContain('MC');
      expect(M4_CP_FILTER).toContain('IM');
      expect(M4_CP_FILTER).toContain('EN');
    });

    it('MN은 CP 연동 대상이 아니어야 함', () => {
      expect(M4_CP_FILTER).not.toContain('MN');
    });

    it('4M 값이 null인 경우 CP 연동 대상이어야 함', () => {
      const process = { m4: null };
      const isCpEligible = !process.m4 || M4_CP_FILTER.includes(process.m4);
      expect(isCpEligible).toBe(true);
    });

    it('4M 값이 MN인 경우 CP 연동 대상이 아니어야 함', () => {
      const process = { m4: 'MN' };
      const isCpEligible = !process.m4 || M4_CP_FILTER.includes(process.m4);
      expect(isCpEligible).toBe(false);
    });
  });

  describe('시나리오 4: 에러 처리 및 재시도', () => {
    it('동기화 적용 실패 시 실패 상태로 기록되어야 함', async () => {
      mockPrisma.controlPlanItem.updateMany.mockRejectedValueOnce(
        new Error('Database connection lost')
      );

      const changes = [
        {
          id: 'sync-error-001',
          sourceTable: 'shared_process_master',
          changeType: 'update',
          newValues: { processNo: '10', processName: 'Test' },
        },
      ];

      const result = await applySyncChangesToCp(
        mockPrisma as never,
        'CP26-001',
        changes
      );

      expect(result.skipped).toBe(1);
      expect(mockPrisma.syncTracker.update).toHaveBeenCalledWith({
        where: { id: 'sync-error-001' },
        data: expect.objectContaining({
          status: 'failed',
          errorMessage: 'Database connection lost',
          retryCount: { increment: 1 },
        }),
      });
    });

    it('여러 변경사항 중 일부 실패해도 나머지는 처리되어야 함', async () => {
      // 첫 번째 성공, 두 번째 실패, 세 번째 성공
      mockPrisma.controlPlanItem.updateMany
        .mockResolvedValueOnce({ count: 1 }) // 성공
        .mockRejectedValueOnce(new Error('Failed')) // 실패
        .mockResolvedValueOnce({ count: 1 }); // 성공

      const changes = [
        {
          id: 'sync-001',
          sourceTable: 'shared_process_master',
          changeType: 'update',
          newValues: { processNo: '10', processName: 'A' },
        },
        {
          id: 'sync-002',
          sourceTable: 'shared_process_master',
          changeType: 'update',
          newValues: { processNo: '20', processName: 'B' },
        },
        {
          id: 'sync-003',
          sourceTable: 'shared_process_master',
          changeType: 'update',
          newValues: { processNo: '30', processName: 'C' },
        },
      ];

      const result = await applySyncChangesToCp(
        mockPrisma as never,
        'CP26-001',
        changes
      );

      expect(result.applied).toBe(2);
      expect(result.skipped).toBe(1);
    });
  });

  describe('시나리오 5: 역전파 방지', () => {
    it('CP 변경은 PFMEA에 전파되지 않아야 함', async () => {
      await recordSyncChange(mockPrisma as never, {
        sourceType: 'cp',
        sourceId: 'CP26-001',
        sourceTable: 'control_plan_items',
        sourceRowId: 'cpi-001',
        changeType: 'update',
        changedFields: ['controlMethod'],
        newValues: { controlMethod: '육안검사' },
      });

      // SyncTracker에 기록이 생성되지 않아야 함
      expect(mockPrisma.syncTracker.create).not.toHaveBeenCalled();
    });

    it('PFD 변경은 PFMEA에 전파되지 않아야 함', async () => {
      await recordSyncChange(mockPrisma as never, {
        sourceType: 'pfd',
        sourceId: 'PFD26-001',
        sourceTable: 'pfd_items',
        sourceRowId: 'pfi-001',
        changeType: 'update',
        changedFields: ['symbolType'],
        newValues: { symbolType: 'operation' },
      });

      expect(mockPrisma.syncTracker.create).not.toHaveBeenCalled();
    });
  });

  describe('시나리오 6: 특성 변경 동기화', () => {
    it('제품특성/공정특성/특별특성 변경이 CP에 반영되어야 함', async () => {
      const changes = [
        {
          id: 'sync-char-001',
          sourceTable: 'shared_characteristics_master',
          changeType: 'update',
          newValues: {
            productCharacteristic: '용접 강도 (변경)',
            processCharacteristic: '전류 세기 (변경)',
            specialCharacteristic: 'CC',
          },
        },
      ];

      await applySyncChangesToCp(mockPrisma as never, 'CP26-001', changes);

      expect(mockPrisma.controlPlanItem.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          productChar: '용접 강도 (변경)',
        }),
        data: expect.objectContaining({
          processChar: '전류 세기 (변경)',
          specialChar: 'CC',
          changeFlag: true,
        }),
      });
    });
  });

  describe('시나리오 7: 리스크 정보 참조용 동기화', () => {
    it('S/O/D/AP 정보가 CP에 참조용으로 반영되어야 함', async () => {
      const changes = [
        {
          id: 'sync-risk-001',
          sourceTable: 'shared_risk_references',
          changeType: 'update',
          newValues: {
            severity: 9,
            occurrence: 5,
            detection: 4,
            ap: 'H',
          },
        },
      ];

      await applySyncChangesToCp(mockPrisma as never, 'CP26-001', changes);

      expect(mockPrisma.controlPlanItem.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            refSeverity: 9,
            refOccurrence: 5,
            refDetection: 4,
            refAp: 'H',
          }),
        })
      );
    });
  });
});
