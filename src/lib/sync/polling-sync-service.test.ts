/**
 * @file polling-sync-service.test.ts
 * @description Polling 동기화 서비스 단위 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  recordSyncChange,
  pollPendingChanges,
  handlePfmeaStateChange,
  applySyncChangesToCp,
  generateSyncHash,
  POLLING_CONFIG,
  M4_CP_FILTER,
} from './polling-sync-service';
import {
  createMockPrismaClient,
  mockSyncTracker,
  mockPollingSyncState,
  mockPfmeaCpMapping,
} from '@/__tests__/mocks/prisma';

describe('polling-sync-service', () => {
  let mockPrisma: ReturnType<typeof createMockPrismaClient>;

  beforeEach(() => {
    mockPrisma = createMockPrismaClient();
    vi.clearAllMocks();
  });

  describe('POLLING_CONFIG', () => {
    it('should have correct default values', () => {
      expect(POLLING_CONFIG.DEFAULT_INTERVAL_MS).toBe(3000);
      expect(POLLING_CONFIG.MIN_INTERVAL_MS).toBe(1000);
      expect(POLLING_CONFIG.MAX_INTERVAL_MS).toBe(30000);
      expect(POLLING_CONFIG.BATCH_SIZE).toBe(100);
      expect(POLLING_CONFIG.RETRY_MAX).toBe(3);
    });
  });

  describe('M4_CP_FILTER', () => {
    it('should include MC, IM, EN and exclude MN', () => {
      expect(M4_CP_FILTER).toContain('MC');
      expect(M4_CP_FILTER).toContain('IM');
      expect(M4_CP_FILTER).toContain('EN');
      expect(M4_CP_FILTER).not.toContain('MN');
    });
  });

  describe('recordSyncChange', () => {
    it('should record PFMEA changes with CP and PFD targets', async () => {
      await recordSyncChange(mockPrisma as never, {
        sourceType: 'pfmea',
        sourceId: 'fmea-001',
        sourceTable: 'shared_process_master',
        sourceRowId: 'spm-001',
        changeType: 'update',
        changedFields: ['processName'],
        newValues: { processName: '용접 공정 v2' },
      });

      expect(mockPrisma.syncTracker.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sourceType: 'pfmea',
          sourceId: 'fmea-001',
          targetTypes: JSON.stringify(['cp', 'pfd']),
          status: 'pending',
        }),
      });
    });

    it('should not record CP changes (no reverse sync)', async () => {
      await recordSyncChange(mockPrisma as never, {
        sourceType: 'cp',
        sourceId: 'CP26-001',
        sourceTable: 'control_plan_items',
        sourceRowId: 'cpi-001',
        changeType: 'update',
      });

      expect(mockPrisma.syncTracker.create).not.toHaveBeenCalled();
    });

    it('should not record PFD changes (no reverse sync)', async () => {
      await recordSyncChange(mockPrisma as never, {
        sourceType: 'pfd',
        sourceId: 'PFD26-001',
        sourceTable: 'pfd_items',
        sourceRowId: 'pfi-001',
        changeType: 'update',
      });

      expect(mockPrisma.syncTracker.create).not.toHaveBeenCalled();
    });

    it('should stringify complex fields properly', async () => {
      const changedFields = ['processName', 'processDesc'];
      const oldValues = { processName: 'Old Name' };
      const newValues = { processName: 'New Name' };

      await recordSyncChange(mockPrisma as never, {
        sourceType: 'pfmea',
        sourceId: 'fmea-001',
        sourceTable: 'shared_process_master',
        sourceRowId: 'spm-001',
        changeType: 'update',
        changedFields,
        oldValues,
        newValues,
      });

      expect(mockPrisma.syncTracker.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          changedFields: JSON.stringify(changedFields),
          oldValues: JSON.stringify(oldValues),
          newValues: JSON.stringify(newValues),
        }),
      });
    });
  });

  describe('pollPendingChanges', () => {
    it('should create poll state if not exists', async () => {
      mockPrisma.pollingSyncState.findUnique.mockResolvedValueOnce(null);
      mockPrisma.pollingSyncState.create.mockResolvedValueOnce({
        ...mockPollingSyncState,
        clientId: 'cp-CP26-001',
      });
      mockPrisma.syncTracker.findMany.mockResolvedValueOnce([]);

      const result = await pollPendingChanges(
        mockPrisma as never,
        'cp',
        'CP26-001'
      );

      expect(mockPrisma.pollingSyncState.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          clientId: 'cp-CP26-001',
          appType: 'cp',
          documentId: 'CP26-001',
        }),
      });
      expect(result.changes).toEqual([]);
    });

    it('should return pending changes for the app', async () => {
      const pendingChange = {
        ...mockSyncTracker,
        changedFields: JSON.stringify(['processName']),
        newValues: JSON.stringify({ processName: '용접 공정 v2' }),
      };
      mockPrisma.pollingSyncState.findUnique.mockResolvedValueOnce(mockPollingSyncState);
      mockPrisma.syncTracker.findMany.mockResolvedValueOnce([pendingChange]);

      const result = await pollPendingChanges(
        mockPrisma as never,
        'cp',
        'CP26-001'
      );

      expect(result.changes).toHaveLength(1);
      expect(result.changes[0]).toEqual(
        expect.objectContaining({
          id: mockSyncTracker.id,
          sourceType: 'pfmea',
          changedFields: ['processName'],
          newValues: { processName: '용접 공정 v2' },
        })
      );
    });

    it('should update poll state after polling', async () => {
      mockPrisma.pollingSyncState.findUnique.mockResolvedValueOnce(mockPollingSyncState);
      mockPrisma.syncTracker.findMany.mockResolvedValueOnce([]);

      await pollPendingChanges(mockPrisma as never, 'cp', 'CP26-001');

      expect(mockPrisma.pollingSyncState.update).toHaveBeenCalledWith({
        where: { clientId: 'cp-CP26-001' },
        data: expect.objectContaining({
          lastPolledAt: expect.any(Date),
        }),
      });
    });

    it('should filter by since parameter', async () => {
      const since = new Date('2024-01-01');
      mockPrisma.pollingSyncState.findUnique.mockResolvedValueOnce(null);
      mockPrisma.pollingSyncState.create.mockResolvedValueOnce({
        ...mockPollingSyncState,
        lastPolledAt: since,
      });
      mockPrisma.syncTracker.findMany.mockResolvedValueOnce([]);

      await pollPendingChanges(mockPrisma as never, 'pfd', 'PFD26-001', since);

      expect(mockPrisma.syncTracker.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gt: since },
            status: 'pending',
            targetTypes: { contains: 'pfd' },
          }),
        })
      );
    });

    it('should respect BATCH_SIZE limit', async () => {
      mockPrisma.pollingSyncState.findUnique.mockResolvedValueOnce(mockPollingSyncState);
      mockPrisma.syncTracker.findMany.mockResolvedValueOnce([]);

      await pollPendingChanges(mockPrisma as never, 'cp', 'CP26-001');

      expect(mockPrisma.syncTracker.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: POLLING_CONFIG.BATCH_SIZE,
        })
      );
    });
  });

  describe('handlePfmeaStateChange', () => {
    beforeEach(() => {
      mockPrisma.pfmeaCpMapping.findMany.mockResolvedValue([mockPfmeaCpMapping]);
    });

    it('should lock CP structure when PFMEA is approved', async () => {
      await handlePfmeaStateChange(
        mockPrisma as never,
        'fmea-001',
        'draft',
        'approved',
        'user-001'
      );

      expect(mockPrisma.pfmeaStateHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fmeaId: 'fmea-001',
          fromState: 'draft',
          toState: 'approved',
          cpAction: 'lock_structure',
        }),
      });

      expect(mockPrisma.controlPlan.updateMany).toHaveBeenCalledWith({
        where: { cpNo: 'CP26-001', status: 'draft' },
        data: { status: 'structure_locked' },
      });
    });

    it('should mark CP obsolete when PFMEA is revised', async () => {
      await handlePfmeaStateChange(
        mockPrisma as never,
        'fmea-001',
        'approved',
        'revised',
        'user-001'
      );

      expect(mockPrisma.pfmeaStateHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          cpAction: 'mark_obsolete',
        }),
      });

      expect(mockPrisma.controlPlan.updateMany).toHaveBeenCalledWith({
        where: { cpNo: 'CP26-001', status: { not: 'obsolete' } },
        data: { status: 'obsolete' },
      });

      expect(mockPrisma.pfmeaCpMapping.updateMany).toHaveBeenCalledWith({
        where: { cpNo: 'CP26-001', fmeaId: 'fmea-001' },
        data: { linkStatus: 'obsolete' },
      });
    });

    it('should record sync change for CP and PFD', async () => {
      await handlePfmeaStateChange(
        mockPrisma as never,
        'fmea-001',
        'draft',
        'approved'
      );

      // PFMEA 변경은 항상 CP와 PFD 모두에 전파됨
      expect(mockPrisma.syncTracker.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sourceType: 'pfmea',
          sourceId: 'fmea-001',
          changeType: 'update',
          changedFields: JSON.stringify(['status']),
          targetTypes: JSON.stringify(['cp', 'pfd']),
        }),
      });
    });

    it('should handle case with no linked CPs', async () => {
      mockPrisma.pfmeaCpMapping.findMany.mockResolvedValueOnce([]);

      await handlePfmeaStateChange(
        mockPrisma as never,
        'fmea-001',
        'draft',
        'approved'
      );

      expect(mockPrisma.pfmeaStateHistory.create).toHaveBeenCalled();
      // CP updateMany는 빈 배열이므로 호출되지 않음
      expect(mockPrisma.controlPlan.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('applySyncChangesToCp', () => {
    it('should apply shared_process_master changes to CP', async () => {
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

      expect(mockPrisma.controlPlanItem.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          processNo: '10',
        }),
        data: expect.objectContaining({
          processName: '용접 공정 v2',
          changeFlag: true,
          linkStatus: 'changed',
        }),
      });
      expect(result.applied).toBe(1);
    });

    it('should apply shared_characteristics_master changes to CP', async () => {
      const changes = [
        {
          id: 'sync-002',
          sourceTable: 'shared_characteristics_master',
          changeType: 'update',
          newValues: {
            productCharacteristic: '용접 강도',
            processCharacteristic: '전류 세기',
            specialCharacteristic: 'CC',
          },
        },
      ];

      const result = await applySyncChangesToCp(
        mockPrisma as never,
        'CP26-001',
        changes
      );

      expect(mockPrisma.controlPlanItem.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          productChar: '용접 강도',
        }),
        data: expect.objectContaining({
          processChar: '전류 세기',
          specialChar: 'CC',
          changeFlag: true,
        }),
      });
      expect(result.applied).toBe(1);
    });

    it('should apply shared_risk_references changes to CP', async () => {
      const changes = [
        {
          id: 'sync-003',
          sourceTable: 'shared_risk_references',
          changeType: 'update',
          newValues: {
            severity: 8,
            occurrence: 4,
            detection: 3,
            ap: 'H',
          },
        },
      ];

      const result = await applySyncChangesToCp(
        mockPrisma as never,
        'CP26-001',
        changes
      );

      expect(mockPrisma.controlPlanItem.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            refSeverity: 8,
            refOccurrence: 4,
            refDetection: 3,
            refAp: 'H',
          }),
        })
      );
      expect(result.applied).toBe(1);
    });

    it('should skip unknown source tables', async () => {
      const changes = [
        {
          id: 'sync-004',
          sourceTable: 'unknown_table',
          changeType: 'update',
          newValues: { foo: 'bar' },
        },
      ];

      const result = await applySyncChangesToCp(
        mockPrisma as never,
        'CP26-001',
        changes
      );

      expect(result.skipped).toBe(1);
      expect(result.applied).toBe(0);
    });

    it('should skip changes with null newValues', async () => {
      const changes = [
        {
          id: 'sync-005',
          sourceTable: 'shared_process_master',
          changeType: 'delete',
          newValues: null,
        },
      ];

      const result = await applySyncChangesToCp(
        mockPrisma as never,
        'CP26-001',
        changes
      );

      expect(mockPrisma.controlPlanItem.updateMany).not.toHaveBeenCalled();
    });

    it('should update sync tracker status on success', async () => {
      const changes = [
        {
          id: 'sync-006',
          sourceTable: 'shared_process_master',
          changeType: 'update',
          newValues: { processNo: '10', processName: 'Test' },
        },
      ];

      await applySyncChangesToCp(mockPrisma as never, 'CP26-001', changes);

      expect(mockPrisma.syncTracker.update).toHaveBeenCalledWith({
        where: { id: 'sync-006' },
        data: {
          status: 'completed',
          processedAt: expect.any(Date),
        },
      });
    });

    it('should handle errors and update sync tracker with failed status', async () => {
      mockPrisma.controlPlanItem.updateMany.mockRejectedValueOnce(
        new Error('Database error')
      );

      const changes = [
        {
          id: 'sync-007',
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
        where: { id: 'sync-007' },
        data: {
          status: 'failed',
          errorMessage: 'Database error',
          retryCount: { increment: 1 },
        },
      });
    });

    it('should update control plan sync status', async () => {
      const changes = [
        {
          id: 'sync-008',
          sourceTable: 'shared_process_master',
          changeType: 'update',
          newValues: { processNo: '10', processName: 'Test' },
        },
      ];

      await applySyncChangesToCp(mockPrisma as never, 'CP26-001', changes);

      expect(mockPrisma.controlPlan.update).toHaveBeenCalledWith({
        where: { cpNo: 'CP26-001' },
        data: {
          changeCount: { increment: 1 },
          syncStatus: 'modified',
          lastSyncAt: expect.any(Date),
        },
      });
    });
  });

  describe('generateSyncHash', () => {
    it('should generate consistent hash for same data', () => {
      const data = { name: 'Test', value: 123 };
      const hash1 = generateSyncHash(data);
      const hash2 = generateSyncHash(data);
      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different data', () => {
      const hash1 = generateSyncHash({ name: 'Test1' });
      const hash2 = generateSyncHash({ name: 'Test2' });
      expect(hash1).not.toBe(hash2);
    });

    it('should handle complex nested objects', () => {
      const data = {
        level1: {
          level2: {
            value: 'nested',
          },
        },
        array: [1, 2, 3],
      };
      const hash = generateSyncHash(data);
      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
    });

    it('should produce same hash regardless of key order', () => {
      const data1 = { a: 1, b: 2, c: 3 };
      const data2 = { c: 3, a: 1, b: 2 };
      expect(generateSyncHash(data1)).toBe(generateSyncHash(data2));
    });
  });
});
