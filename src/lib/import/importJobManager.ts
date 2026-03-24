/**
 * @file importJobManager.ts
 * @description ImportJob/ImportMapping 순수 함수 — DB 호출 없음
 *
 * 비유: 이 모듈은 "출입명부 작성자"다.
 * flatMap(인메모리 매핑)을 읽어서 출입명부(ImportMappingRecord[])를 작성하고,
 * 나중에 DB("공식 장부")에 기록할 수 있도록 준비한다.
 */

import { randomUUID } from 'crypto';

// ============================================================
// Types
// ============================================================

/** Import 파이프라인 인메모리 매핑 (flatData.id → entity.id) */
export interface FlatToEntityMap {
  fm: Map<string, string>;  // A5 flatData.id → L2FailureMode.id
  fc: Map<string, string>;  // B4 flatData.id → L3FailureCause.id
  fe: Map<string, string>;  // C4 flatData.id → L1FailureEffect.id
}

/** DB 저장용 매핑 레코드 (ImportMapping 테이블 대응) */
export interface ImportMappingRecord {
  flatDataId: string;
  entityId: string;
  entityType: 'FM' | 'FC' | 'FE';
  processNo?: string;
  itemCode: string;        // A5|B4|C4
  entityText?: string;
}

/** ImportJob 생성 데이터 */
export interface ImportJobData {
  id: string;
  fmeaId: string;
  fileName?: string;
  flatDataCount: number;
  chainCount: number;
  status: 'pending' | 'building' | 'saving' | 'verifying' | 'completed' | 'failed';
  usedReversePath: boolean;
  errorMessage?: string;
}

// ============================================================
// Entity Type → ItemCode 매핑
// ============================================================

const ENTITY_TO_ITEM_CODE: Record<string, string> = {
  FM: 'A5',
  FC: 'B4',
  FE: 'C4',
};

// ============================================================
// serializeFlatMap
// ============================================================

/**
 * 인메모리 FlatToEntityMap을 DB 저장용 ImportMappingRecord[] 배열로 변환한다.
 *
 * @param flatMap - Import 파이프라인이 반환한 매핑 (fm/fc/fe 3개 Map)
 * @returns 불변 배열 — DB createMany에 바로 사용 가능
 */
export function serializeFlatMap(flatMap: FlatToEntityMap): ImportMappingRecord[] {
  const records: ImportMappingRecord[] = [];

  const mapEntries: Array<{ map: Map<string, string>; entityType: 'FM' | 'FC' | 'FE' }> = [
    { map: flatMap.fm, entityType: 'FM' },
    { map: flatMap.fc, entityType: 'FC' },
    { map: flatMap.fe, entityType: 'FE' },
  ];

  for (const { map, entityType } of mapEntries) {
    for (const [flatDataId, entityId] of map) {
      records.push({
        flatDataId,
        entityId,
        entityType,
        itemCode: ENTITY_TO_ITEM_CODE[entityType],
      });
    }
  }

  return records;
}

// ============================================================
// createImportJobData
// ============================================================

interface CreateImportJobOptions {
  flatDataCount?: number;
  chainCount?: number;
  fileName?: string;
  usedReversePath?: boolean;
}

/**
 * ImportJob 생성 데이터를 만든다. DB에 저장하기 전 준비 단계.
 *
 * @param fmeaId - FMEA 프로젝트 ID
 * @param opts - 추가 옵션 (flatData 수, chain 수, 파일명)
 * @returns 불변 ImportJobData 객체
 */
export function createImportJobData(
  fmeaId: string,
  opts: CreateImportJobOptions = {},
): ImportJobData {
  return {
    id: randomUUID(),
    fmeaId,
    fileName: opts.fileName,
    flatDataCount: opts.flatDataCount ?? 0,
    chainCount: opts.chainCount ?? 0,
    status: 'pending',
    usedReversePath: opts.usedReversePath ?? false,
  };
}
