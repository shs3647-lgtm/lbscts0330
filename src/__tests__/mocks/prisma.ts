/**
 * @file prisma.ts
 * @description Prisma Client 모킹 유틸리티
 */

import { vi } from 'vitest';

// 기본 모킹 데이터
export const mockSharedProcessMaster = {
  id: 'spm-001',
  projectId: 'project-001',
  fmeaId: 'fmea-001',
  processNo: '10',
  processName: '용접 공정',
  processDesc: '자동 용접 공정 설명',
  partName: 'PART-A',
  m4: 'MC',
  workElement: '1. 스폿 용접',
  pfmeaL2Id: 'l2-001',
  pfmeaL3Id: 'l3-001',
  version: 1,
  syncHash: 'hash-001',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockSharedCharacteristicsMaster = {
  id: 'scm-001',
  processId: 'spm-001',
  productCharacteristic: '용접 강도',
  processCharacteristic: '전류 세기',
  specialCharacteristic: 'CC',
  pfmeaL2FuncId: 'l2func-001',
  version: 1,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockSyncTracker = {
  id: 'sync-001',
  sourceType: 'pfmea',
  sourceId: 'fmea-001',
  sourceTable: 'shared_process_master',
  sourceRowId: 'spm-001',
  changeType: 'update',
  changedFields: JSON.stringify(['processName', 'processDesc']),
  oldValues: null,
  newValues: JSON.stringify({ processName: '용접 공정 v2' }),
  targetTypes: JSON.stringify(['cp', 'pfd']),
  status: 'pending',
  retryCount: 0,
  errorMessage: null,
  createdAt: new Date('2024-01-01'),
  processedAt: null,
};

export const mockPollingSyncState = {
  id: 'poll-001',
  clientId: 'client-001',
  appType: 'cp',
  documentId: 'CP26-001',
  lastPolledAt: new Date('2024-01-01'),
  lastSyncedId: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockPfmeaCpMapping = {
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
  lastSyncAt: new Date('2024-01-01'),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockPfmeaPfdMapping = {
  id: 'ppm-001',
  sharedProcessId: 'spm-001',
  pfdNo: 'PFD26-001',
  pfdItemId: 'pfi-001',
  fmeaId: 'fmea-001',
  fmeaRev: 'A',
  linkStatus: 'active',
  changeFlag: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockPfmeaStateHistory = {
  id: 'psh-001',
  fmeaId: 'fmea-001',
  fmeaNo: 'FMEA26-001',
  fromState: 'draft',
  toState: 'approved',
  changedBy: 'user-001',
  cpAction: 'lock_structure',
  affectedCpNos: JSON.stringify(['CP26-001']),
  createdAt: new Date('2024-01-01'),
};

// 모킹 Prisma 클라이언트 생성
export function createMockPrismaClient() {
  return {
    sharedProcessMaster: {
      findMany: vi.fn().mockResolvedValue([mockSharedProcessMaster]),
      findFirst: vi.fn().mockResolvedValue(mockSharedProcessMaster),
      findUnique: vi.fn().mockResolvedValue(mockSharedProcessMaster),
      create: vi.fn().mockResolvedValue(mockSharedProcessMaster),
      update: vi.fn().mockResolvedValue(mockSharedProcessMaster),
      upsert: vi.fn().mockResolvedValue(mockSharedProcessMaster),
      delete: vi.fn().mockResolvedValue(mockSharedProcessMaster),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    sharedCharacteristicsMaster: {
      findMany: vi.fn().mockResolvedValue([mockSharedCharacteristicsMaster]),
      findFirst: vi.fn().mockResolvedValue(mockSharedCharacteristicsMaster),
      findUnique: vi.fn().mockResolvedValue(mockSharedCharacteristicsMaster),
      create: vi.fn().mockResolvedValue(mockSharedCharacteristicsMaster),
      update: vi.fn().mockResolvedValue(mockSharedCharacteristicsMaster),
      upsert: vi.fn().mockResolvedValue(mockSharedCharacteristicsMaster),
      delete: vi.fn().mockResolvedValue(mockSharedCharacteristicsMaster),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    syncTracker: {
      findMany: vi.fn().mockResolvedValue([mockSyncTracker]),
      findFirst: vi.fn().mockResolvedValue(mockSyncTracker),
      findUnique: vi.fn().mockResolvedValue(mockSyncTracker),
      create: vi.fn().mockResolvedValue(mockSyncTracker),
      update: vi.fn().mockResolvedValue(mockSyncTracker),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      delete: vi.fn().mockResolvedValue(mockSyncTracker),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    pollingSyncState: {
      findMany: vi.fn().mockResolvedValue([mockPollingSyncState]),
      findFirst: vi.fn().mockResolvedValue(mockPollingSyncState),
      findUnique: vi.fn().mockResolvedValue(mockPollingSyncState),
      create: vi.fn().mockResolvedValue(mockPollingSyncState),
      update: vi.fn().mockResolvedValue(mockPollingSyncState),
      upsert: vi.fn().mockResolvedValue(mockPollingSyncState),
      delete: vi.fn().mockResolvedValue(mockPollingSyncState),
    },
    pfmeaCpMapping: {
      findMany: vi.fn().mockResolvedValue([mockPfmeaCpMapping]),
      findFirst: vi.fn().mockResolvedValue(mockPfmeaCpMapping),
      findUnique: vi.fn().mockResolvedValue(mockPfmeaCpMapping),
      create: vi.fn().mockResolvedValue(mockPfmeaCpMapping),
      update: vi.fn().mockResolvedValue(mockPfmeaCpMapping),
      upsert: vi.fn().mockResolvedValue(mockPfmeaCpMapping),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      delete: vi.fn().mockResolvedValue(mockPfmeaCpMapping),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    pfmeaPfdMapping: {
      findMany: vi.fn().mockResolvedValue([mockPfmeaPfdMapping]),
      findFirst: vi.fn().mockResolvedValue(mockPfmeaPfdMapping),
      findUnique: vi.fn().mockResolvedValue(mockPfmeaPfdMapping),
      create: vi.fn().mockResolvedValue(mockPfmeaPfdMapping),
      update: vi.fn().mockResolvedValue(mockPfmeaPfdMapping),
      upsert: vi.fn().mockResolvedValue(mockPfmeaPfdMapping),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      delete: vi.fn().mockResolvedValue(mockPfmeaPfdMapping),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    pfmeaStateHistory: {
      findMany: vi.fn().mockResolvedValue([mockPfmeaStateHistory]),
      findFirst: vi.fn().mockResolvedValue(mockPfmeaStateHistory),
      create: vi.fn().mockResolvedValue(mockPfmeaStateHistory),
    },
    controlPlan: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    controlPlanItem: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    sharedRiskReference: {
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue({}),
    },
    failureLink: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    $transaction: vi.fn((fn) => fn({
      sharedProcessMaster: {
        upsert: vi.fn().mockResolvedValue(mockSharedProcessMaster),
      },
      sharedCharacteristicsMaster: {
        upsert: vi.fn().mockResolvedValue(mockSharedCharacteristicsMaster),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      syncTracker: {
        create: vi.fn().mockResolvedValue(mockSyncTracker),
      },
    })),
  };
}

// 기본 모킹 Prisma 클라이언트
export const mockPrismaClient = createMockPrismaClient();
