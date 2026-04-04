/**
 * @file polling-sync-service.ts
 * @description PFMEA-CP-PFD 실시간 동기화 서비스 (Polling 기반)
 *
 * 설계 원칙:
 * 1. PFMEA가 SSOT (Single Source of Truth)
 * 2. CP/PFD는 공유 데이터를 참조 (Read-only)
 * 3. PFMEA 변경 시 SyncTracker에 변경 기록 → CP/PFD가 Polling으로 감지
 *
 * 동기화 규칙 (CP_PFMEA_데이터연계성.md 기반):
 * - 구조정보: 완제품공정명, 메인공정명, 작업요소 → 자동연계, Read-only
 * - 특성정보: 제품특성, 공정특성, 특별특성 → 핵심연계
 * - 리스크정보: S, O, D, AP, RPN → 참조용
 * - 4M 필터링: MC, IM, EN만 CP 연동 (MN 제외)
 */

import type { PrismaClient } from '@prisma/client';

// Polling 설정
export const POLLING_CONFIG = {
  DEFAULT_INTERVAL_MS: 3000, // 3초 기본 폴링 간격
  MIN_INTERVAL_MS: 1000,     // 최소 1초
  MAX_INTERVAL_MS: 30000,    // 최대 30초
  BATCH_SIZE: 100,           // 한 번에 처리할 최대 변경사항 수
  RETRY_MAX: 3,              // 최대 재시도 횟수
};

// 동기화 대상 테이블 매핑
export const SYNC_TABLE_MAPPING = {
  // PFMEA 테이블 → 공유 데이터 연결
  'l2_structures': { sharedTable: 'shared_process_master', fields: ['no', 'name'] },
  'l3_structures': { sharedTable: 'shared_process_master', fields: ['m4', 'name'] },
  'l2_functions': { sharedTable: 'shared_characteristics_master', fields: ['productChar', 'specialChar'] },
  'l3_functions': { sharedTable: 'shared_characteristics_master', fields: ['processChar', 'specialChar'] },
  'risk_analyses': { sharedTable: 'shared_risk_references', fields: ['severity', 'occurrence', 'detection', 'ap'] },
};

// 4M 필터링 규칙 (CP 연동 대상)
export const M4_CP_FILTER = ['MC', 'IM', 'EN']; // MN 제외

/**
 * 변경 추적 기록 생성
 */
export interface SyncTrackerInput {
  sourceType: 'pfmea' | 'cp' | 'pfd';
  sourceId: string;
  sourceTable: string;
  sourceRowId: string;
  changeType: 'insert' | 'update' | 'delete';
  changedFields?: string[];
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  targetTypes?: ('pfmea' | 'cp' | 'pfd')[];
}

/**
 * SyncTracker에 변경사항 기록
 */
export async function recordSyncChange(
  prisma: PrismaClient,
  input: SyncTrackerInput
): Promise<void> {
  // 기본 동기화 대상 결정
  let targets = input.targetTypes || [];

  if (input.sourceType === 'pfmea') {
    // PFMEA 변경 → CP, PFD에 전파
    targets = ['cp', 'pfd'];
  } else if (input.sourceType === 'cp') {
    // CP 전용 데이터 변경 → PFMEA에 역전파하지 않음 (문서 규칙)
    targets = [];
  } else if (input.sourceType === 'pfd') {
    targets = [];
  }

  if (targets.length === 0) return;

  await prisma.syncTracker.create({
    data: {
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      sourceTable: input.sourceTable,
      sourceRowId: input.sourceRowId,
      changeType: input.changeType,
      changedFields: input.changedFields ? JSON.stringify(input.changedFields) : null,
      oldValues: input.oldValues ? JSON.stringify(input.oldValues) : null,
      newValues: input.newValues ? JSON.stringify(input.newValues) : null,
      targetTypes: JSON.stringify(targets),
      status: 'pending',
    },
  });
}

/**
 * 대기 중인 변경사항 조회 (Polling)
 */
export async function pollPendingChanges(
  prisma: PrismaClient,
  appType: 'pfmea' | 'cp' | 'pfd',
  documentId: string,
  since?: Date
): Promise<{
  changes: Array<{
    id: string;
    sourceType: string;
    sourceTable: string;
    changeType: string;
    changedFields: string[] | null;
    newValues: Record<string, unknown> | null;
    createdAt: Date;
  }>;
  lastPolledAt: Date;
}> {
  const clientId = `${appType}-${documentId}`;
  const now = new Date();

  // 마지막 폴링 시점 조회/생성
  let pollState = await prisma.pollingSyncState.findUnique({
    where: { clientId },
  });

  if (!pollState) {
    pollState = await prisma.pollingSyncState.create({
      data: {
        clientId,
        appType,
        documentId,
        lastPolledAt: since || new Date(0),
      },
    });
  }

  const sinceTime = since || pollState.lastPolledAt;

  // 해당 앱에 대한 대기 중인 변경사항 조회
  const pendingChanges = await prisma.syncTracker.findMany({
    where: {
      createdAt: { gt: sinceTime },
      status: 'pending',
      targetTypes: { contains: appType },
    },
    orderBy: { createdAt: 'asc' },
    take: POLLING_CONFIG.BATCH_SIZE,
  });

  // 폴링 상태 업데이트
  await prisma.pollingSyncState.update({
    where: { clientId },
    data: {
      lastPolledAt: now,
      lastSyncedId: pendingChanges.length > 0
        ? pendingChanges[pendingChanges.length - 1].id
        : pollState.lastSyncedId,
    },
  });

  return {
    changes: pendingChanges.map(c => ({
      id: c.id,
      sourceType: c.sourceType,
      sourceTable: c.sourceTable,
      changeType: c.changeType,
      changedFields: c.changedFields ? JSON.parse(c.changedFields) : null,
      newValues: c.newValues ? JSON.parse(c.newValues) : null,
      createdAt: c.createdAt,
    })),
    lastPolledAt: now,
  };
}

/**
 * PFMEA 데이터를 공유 마스터에 동기화
 */
export async function syncPfmeaToSharedMaster(
  prisma: PrismaClient,
  fmeaId: string,
  projectId: string
): Promise<{ processCount: number; characteristicCount: number }> {
  let processCount = 0;
  let characteristicCount = 0;

  // L2Structure (메인공정) 조회
  const l2Structures = await prisma.l2Structure.findMany({
    where: { fmeaId },
    include: {
      l3Structures: true,
      l2Functions: true,
    },
  });

  for (const l2 of l2Structures) {
    // L3Structure 중 CP 연동 대상만 필터링 (MN 제외)
    const cpEligibleL3s = l2.l3Structures.filter(
      l3 => !l3.m4 || M4_CP_FILTER.includes(l3.m4)
    );

    for (const l3 of cpEligibleL3s) {
      // SharedProcessMaster upsert
      const sharedProcess = await prisma.sharedProcessMaster.upsert({
        where: {
          projectId_processNo_workElement: {
            projectId,
            processNo: l2.no,
            workElement: l3.name || '',
          },
        },
        create: {
          projectId,
          fmeaId,
          processNo: l2.no,
          processName: l2.name,
          processDesc: '', // L2Function.functionName에서 가져옴
          m4: l3.m4,
          workElement: l3.name,
          pfmeaL2Id: l2.id,
          pfmeaL3Id: l3.id,
          version: 1,
        },
        update: {
          processName: l2.name,
          m4: l3.m4,
          workElement: l3.name,
          pfmeaL2Id: l2.id,
          pfmeaL3Id: l3.id,
          version: { increment: 1 },
        },
      });
      processCount++;

      // L2Function에서 제품특성 조회
      const l2Funcs = l2.l2Functions;

      // L3Function 조회
      const l3Funcs = await prisma.l3Function.findMany({
        where: { l3StructId: l3.id },
      });

      // SharedCharacteristicsMaster 생성
      for (const l2Func of l2Funcs) {
        for (const l3Func of l3Funcs) {
          await prisma.sharedCharacteristicsMaster.upsert({
            where: {
              id: `${sharedProcess.id}-${l2Func.id}-${l3Func.id}`,
            },
            create: {
              id: `${sharedProcess.id}-${l2Func.id}-${l3Func.id}`,
              processId: sharedProcess.id,
              productCharacteristic: l2Func.productChar,
              processCharacteristic: l3Func.processChar,
              specialCharacteristic: l2Func.specialChar || l3Func.specialChar,
              pfmeaL2FuncId: l2Func.id,
              pfmeaL3FuncId: l3Func.id,
              version: 1,
            },
            update: {
              productCharacteristic: l2Func.productChar,
              processCharacteristic: l3Func.processChar,
              specialCharacteristic: l2Func.specialChar || l3Func.specialChar,
              version: { increment: 1 },
            },
          });
          characteristicCount++;
        }
      }
    }
  }

  return { processCount, characteristicCount };
}

/**
 * PFMEA 상태 변경 처리 (CP 잠금 제어)
 */
export async function handlePfmeaStateChange(
  prisma: PrismaClient,
  fmeaId: string,
  fromState: string,
  toState: string,
  changedBy?: string
): Promise<void> {
  // 연결된 CP 조회
  const linkedCps = await prisma.pfmeaCpMapping.findMany({
    where: { fmeaId, linkStatus: 'active' },
    select: { cpNo: true },
  });
  const cpNos = [...new Set(linkedCps.map(c => c.cpNo))];

  let cpAction: string | null = null;

  // 상태 변경에 따른 CP 액션 결정
  if (toState === 'approved' && fromState === 'draft') {
    // PFMEA 승인 → CP 구조 잠금
    cpAction = 'lock_structure';
  } else if (toState === 'revised') {
    // PFMEA 개정 → 기존 CP Obsolete, 신규 CP 생성 필요
    cpAction = 'mark_obsolete';
  }

  // 상태 이력 기록
  await prisma.pfmeaStateHistory.create({
    data: {
      fmeaId,
      fromState,
      toState,
      cpAction,
      cpNos: cpNos.length > 0 ? JSON.stringify(cpNos) : null,
      changedBy,
    },
  });

  // CP 상태 업데이트 (cpAction에 따라)
  if (cpAction === 'lock_structure') {
    // CP 구조 컬럼 잠금 처리
    for (const cpNo of cpNos) {
      await prisma.controlPlan.updateMany({
        where: { cpNo, status: 'draft' },
        data: { status: 'structure_locked' },
      });
    }
  } else if (cpAction === 'mark_obsolete') {
    // 기존 CP를 Obsolete 처리
    for (const cpNo of cpNos) {
      await prisma.controlPlan.updateMany({
        where: { cpNo, status: { not: 'obsolete' } },
        data: { status: 'obsolete' },
      });

      // 매핑 상태 업데이트
      await prisma.pfmeaCpMapping.updateMany({
        where: { cpNo, fmeaId },
        data: { linkStatus: 'obsolete' },
      });
    }
  }

  // 변경 추적 기록
  await recordSyncChange(prisma, {
    sourceType: 'pfmea',
    sourceId: fmeaId,
    sourceTable: 'fmea_projects',
    sourceRowId: fmeaId,
    changeType: 'update',
    changedFields: ['status'],
    oldValues: { status: fromState },
    newValues: { status: toState, cpAction },
    targetTypes: ['cp'],
  });
}

/**
 * CP에 PFMEA 변경사항 적용
 */
export async function applySyncChangesToCp(
  prisma: PrismaClient,
  cpNo: string,
  changes: Array<{
    id: string;
    sourceTable: string;
    changeType: string;
    newValues: Record<string, unknown> | null;
  }>
): Promise<{ applied: number; skipped: number }> {
  let applied = 0;
  let skipped = 0;

  for (const change of changes) {
    try {
      // 테이블별 처리
      if (change.sourceTable === 'shared_process_master') {
        // 공정 정보 변경 → CP 공정 업데이트 (Read-only 필드)
        const values = change.newValues;
        if (!values) continue;

        await prisma.controlPlanItem.updateMany({
          where: {
            controlPlan: { cpNo },
            processNo: values.processNo as string,
          },
          data: {
            processName: values.processName as string,
            processDesc: values.processDesc as string | undefined,
            workElement: values.workElement as string | undefined,
            changeFlag: true,
            linkStatus: 'changed',
          },
        });
        applied++;
      } else if (change.sourceTable === 'shared_characteristics_master') {
        // 특성 정보 변경 → CP 관리항목 업데이트
        const values = change.newValues;
        if (!values) continue;

        await prisma.controlPlanItem.updateMany({
          where: {
            controlPlan: { cpNo },
            productChar: values.productCharacteristic as string | undefined,
          },
          data: {
            processChar: values.processCharacteristic as string | undefined,
            specialChar: values.specialCharacteristic as string | undefined,
            changeFlag: true,
          },
        });
        applied++;
      } else {
        skipped++;
      }

      // 변경 처리 완료 표시
      await prisma.syncTracker.update({
        where: { id: change.id },
        data: {
          status: 'completed',
          processedAt: new Date(),
        },
      });
    } catch (error) {
      skipped++;
      await prisma.syncTracker.update({
        where: { id: change.id },
        data: {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          retryCount: { increment: 1 },
        },
      });
    }
  }

  // CP 변경 카운트 업데이트
  await prisma.controlPlan.update({
    where: { cpNo },
    data: {
      changeCount: { increment: applied },
      syncStatus: applied > 0 ? 'modified' : 'synced',
      lastSyncAt: new Date(),
    },
  });

  return { applied, skipped };
}

/**
 * 변경사항 해시 생성 (변경 감지용)
 */
export function generateSyncHash(data: Record<string, unknown>): string {
  const str = JSON.stringify(data, Object.keys(data).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}
