/**
 * @file gatekeeper.ts
 * @description 자동매핑 문지기 — 호텔 자물쇠-키 시스템
 * @created 2026-02-17
 *
 * ★ 호텔 비유:
 *   - 호텔(구조) = 구조분석에서 확정된 L1/L2/L3 계층 (절대 불변)
 *   - 방(Room) = 각 셀 위치 (processNo + m4 + itemCode)
 *   - 자물쇠(Lock) = 셀이 기대하는 매핑 기준
 *   - 키(Key) = 마스터에서 가져온 데이터
 *   - 키가 맞으면 문 열림(렌더링), 안 맞으면 거부
 */

import type { AutoMappingTab } from './columnSchema';
import { COLUMN_SCHEMA } from './columnSchema';
import type { WorksheetState, Process, L1Data } from '../constants';

// ============ 타입 정의 ============

/** 호텔의 방 = 워크시트 셀 위치 (자물쇠가 달린 방) */
export interface RoomLock {
  processNo: string;    // 층수 = 공정번호 (L1은 카테고리: YP/SP/USER)
  m4?: string;          // 호수 = 4M (L3 탭 전용)
  itemCode: string;     // 방 타입 = 기대 데이터 종류
}

/** 마스터 데이터 아이템 = 키 */
export interface DataKey {
  processNo: string;
  m4?: string;
  itemCode: string;
  value: string;
  sourceFmeaId?: string;
  specialChar?: string;  // ★ 2026-02-23: A4/B3 특별특성 메타데이터
  parentItemId?: string; // ★ 2026-03-16: C3→C2 부모관계 매핑용
}

/** 키가 맞아서 입장한 데이터 */
export interface MatchedEntry {
  room: RoomLock;
  data: DataKey;
}

/** 키가 안 맞아서 거부된 데이터 */
export interface RejectedEntry {
  data: DataKey;
  reason: RejectionReason;
  detail: string;
}

/** 거부 사유 코드 */
export type RejectionReason =
  | 'NO_ROOM'           // 해당 방 없음 (구조에 없는 공정번호)
  | 'WRONG_ROOM'        // 호수 불일치 (m4 불일치 또는 누락)
  | 'EMPTY_KEY'         // 빈 키 (value 비어있음)
  | 'WRONG_KEY_TYPE'    // 키 타입 불일치 (itemCode 불일치)
  | 'HOTEL_MISMATCH'    // 호텔 불일치 (sourceFmeaId 불일치)
  | 'CASCADE';          // 연쇄 삭제 — 같은 그룹(processNo+m4)의 다른 항목이 거부됨

/** Gatekeeper 검증 결과 */
export interface GatekeeperResult {
  passed: boolean;           // 전체 통과 여부 (rejected=0)
  matched: MatchedEntry[];   // 입장 허용된 데이터
  rejected: RejectedEntry[]; // 거부된 데이터
  summary: string;           // 사용자 표시용 요약 메시지
}

// ============ 거부 사유 한국어 ============

const REASON_LABELS: Record<RejectionReason, string> = {
  NO_ROOM: '구조에 없는 공정번호',
  WRONG_ROOM: '4M 불일치/누락',
  EMPTY_KEY: '빈 값',
  WRONG_KEY_TYPE: 'itemCode 불일치',
  HOTEL_MISMATCH: 'FMEA ID 불일치',
  CASCADE: '연쇄 삭제 (같은 그룹의 다른 항목이 비정상)',
};

/**
 * 연쇄 삭제 대상 사유 — 이 사유로 거부된 항목이 있으면
 * 같은 processNo(+m4) 그룹의 모든 matched 항목도 거부
 *
 * EMPTY_KEY는 제외: 빈 값은 단순 누락이므로 같은 그룹의 정상 데이터까지 삭제할 필요 없음
 */
const CASCADE_TRIGGER_REASONS: Set<RejectionReason> = new Set([
  'NO_ROOM',
  'WRONG_ROOM',
  'WRONG_KEY_TYPE',
  'HOTEL_MISMATCH',
]);

// ============ Step 1: 호텔 건설 — 방 목록(RoomLock[]) 생성 ============

/** L1 탭용 방 목록 생성 (카테고리 기반) */
function buildRoomLocksL1(l1: L1Data, itemCodes: string[]): RoomLock[] {
  const rooms: RoomLock[] = [];
  const categories = (l1.types || []).map(t => (t.name || '').trim()).filter(Boolean);

  // L1 기능: 카테고리(YP/SP/USER)별 방
  for (const cat of categories) {
    for (const ic of itemCodes) {
      rooms.push({ processNo: cat, itemCode: ic });
    }
  }
  return rooms;
}

/** L2 탭용 방 목록 생성 (공정번호 기반) */
function buildRoomLocksL2(l2: Process[], itemCodes: string[]): RoomLock[] {
  const rooms: RoomLock[] = [];
  for (const proc of l2) {
    const pNo = (proc.no || '').trim();
    if (!pNo) continue;
    for (const ic of itemCodes) {
      rooms.push({ processNo: pNo, itemCode: ic });
    }
  }
  return rooms;
}

/** L3 탭용 방 목록 생성 (공정번호 + m4 복합키) */
function buildRoomLocksL3(l2: Process[], itemCodes: string[]): RoomLock[] {
  const rooms: RoomLock[] = [];
  for (const proc of l2) {
    const pNo = (proc.no || '').trim();
    if (!pNo) continue;
    for (const we of proc.l3 || []) {
      const weM4 = (we.m4 || '').trim().toUpperCase();
      if (!weM4) continue; // m4 없는 부품(컴포넌트)는 방 생성 안 함
      for (const ic of itemCodes) {
        rooms.push({ processNo: pNo, m4: weM4, itemCode: ic });
      }
    }
  }
  return rooms;
}

/** 탭에 맞는 방 목록 생성 */
export function buildRoomLocks(tab: AutoMappingTab, state: WorksheetState): RoomLock[] {
  const schema = COLUMN_SCHEMA[tab];
  const itemCodes = schema.allowedItemCodes;

  switch (tab) {
    case 'function-l1':
    case 'failure-l1':
      return buildRoomLocksL1(state.l1, itemCodes);
    case 'function-l2':
    case 'failure-l2':
      return buildRoomLocksL2(state.l2, itemCodes);
    case 'function-l3':
    case 'failure-l3':
      return buildRoomLocksL3(state.l2, itemCodes);
    default:
      return [];
  }
}

// ============ Step 2: 키 검증 — 자물쇠에 키 대조 ============

/** RoomLock을 조회 키로 변환 (Set 용) */
function roomToKey(room: RoomLock): string {
  return room.m4
    ? `${room.processNo}::${room.m4}::${room.itemCode}`
    : `${room.processNo}::${room.itemCode}`;
}

/** 마스터 데이터를 조회 키로 변환 */
function dataToKey(data: DataKey, hasM4: boolean): string {
  if (hasM4) {
    const m4 = (data.m4 || '').trim().toUpperCase();
    return `${(data.processNo || '').trim()}::${m4}::${data.itemCode}`;
  }
  return `${(data.processNo || '').trim()}::${data.itemCode}`;
}

/**
 * 메인 검증 함수 — 마스터 데이터(키)를 방 목록(자물쇠)에 대조
 *
 * @param tab - 현재 탭 식별자
 * @param state - 현재 워크시트 상태 (호텔 구조)
 * @param items - 마스터 데이터 아이템 목록 (키 묶음)
 * @param currentFmeaId - 현재 워크시트의 FMEA ID
 */
export function validateAutoMapping(
  tab: AutoMappingTab,
  state: WorksheetState,
  items: DataKey[],
  currentFmeaId?: string,
): GatekeeperResult {
  const schema = COLUMN_SCHEMA[tab];
  const rooms = buildRoomLocks(tab, state);

  // 방 목록을 Set으로 변환 (빠른 조회)
  const isL3Tab = tab === 'function-l3' || tab === 'failure-l3';
  const roomSet = new Set(rooms.map(r => roomToKey(r)));

  const matched: MatchedEntry[] = [];
  const rejected: RejectedEntry[] = [];

  // 로그: 호텔 구조 요약
  if (rooms.length > 0) {
  }

  for (const item of items) {
    const processNo = (item.processNo || '').trim();
    const m4 = (item.m4 || '').trim().toUpperCase();
    const value = (item.value || '').trim();
    const itemCode = item.itemCode;

    // 검증 1: sourceFmeaId 확인
    if (currentFmeaId && item.sourceFmeaId && item.sourceFmeaId !== currentFmeaId) {
      rejected.push({
        data: item,
        reason: 'HOTEL_MISMATCH',
        detail: `FMEA ID 불일치: 기대=${currentFmeaId}, 실제=${item.sourceFmeaId}`,
      });
      continue;
    }

    // 검증 2: itemCode 유효성
    if (!schema.allowedItemCodes.includes(itemCode)) {
      rejected.push({
        data: item,
        reason: 'WRONG_KEY_TYPE',
        detail: `${tab}에서 허용하지 않는 itemCode: ${itemCode} (허용: ${schema.allowedItemCodes.join(',')})`,
      });
      continue;
    }

    // 검증 3: value 비어있음
    if (!value) {
      rejected.push({
        data: item,
        reason: 'EMPTY_KEY',
        detail: `공정 "${processNo}" ${m4 ? `(${m4})` : ''} — 빈 값`,
      });
      continue;
    }

    // 검증 4: 방 존재 확인 (processNo + m4 + itemCode)
    // ★ DB 기반 정확한 매칭만 수행 — 와일드카드 분배 없음
    // (공통공정은 파서에서 processNo='공통'으로 저장되며, 모달에서 별도 처리됨)
    const key = dataToKey(item, isL3Tab);

    if (!roomSet.has(key)) {
      // 세부 거부 사유 판별
      if (isL3Tab && !m4) {
        rejected.push({
          data: item,
          reason: 'WRONG_ROOM',
          detail: `공정 "${processNo}" — 4M 값 누락 (m4 없음)`,
        });
      } else {
        // processNo 자체가 없는 건지 확인
        const hasProcess = rooms.some(r => r.processNo === processNo);
        if (!hasProcess) {
          rejected.push({
            data: item,
            reason: 'NO_ROOM',
            detail: `구조에 없는 공정번호: "${processNo}"`,
          });
        } else {
          rejected.push({
            data: item,
            reason: 'WRONG_ROOM',
            detail: `공정 "${processNo}" — 4M "${m4}" 부품(컴포넌트)가 구조에 없음`,
          });
        }
      }
      continue;
    }

    // ✅ 키가 자물쇠에 맞음 → 입장 허용
    const room = rooms.find(r => roomToKey(r) === key)!;
    matched.push({ room, data: item });
  }

  // ============ 연쇄 삭제 (Cascade Rejection) ============
  // 비정상 데이터(NO_ROOM, WRONG_ROOM 등)가 발견된 processNo+m4 그룹의
  // 모든 matched 항목도 함께 거부 → 해당 위치는 [데이타 누락]으로 렌더링

  const cascadePoisonedKeys = new Set<string>();

  // Step 1: 연쇄 삭제 트리거 사유로 거부된 항목의 그룹 키 수집
  for (const r of rejected) {
    if (CASCADE_TRIGGER_REASONS.has(r.reason)) {
      const pNo = (r.data.processNo || '').trim();
      const m4 = (r.data.m4 || '').trim().toUpperCase();
      const groupKey = isL3Tab ? `${pNo}::${m4}` : pNo;
      cascadePoisonedKeys.add(groupKey);
    }
  }

  // Step 2: matched에서 오염된 그룹의 항목을 제거 → rejected로 이동
  if (cascadePoisonedKeys.size > 0) {
    const cascadeMatched: MatchedEntry[] = [];
    for (const entry of matched) {
      const pNo = entry.room.processNo;
      const m4 = (entry.room.m4 || '').toUpperCase();
      const groupKey = isL3Tab ? `${pNo}::${m4}` : pNo;

      if (cascadePoisonedKeys.has(groupKey)) {
        // 연쇄 삭제 대상 → rejected로 이동
        rejected.push({
          data: entry.data,
          reason: 'CASCADE',
          detail: `공정 "${pNo}"${m4 ? ` (${m4})` : ''} — 같은 그룹의 다른 항목이 비정상이므로 연쇄 삭제`,
        });
      } else {
        cascadeMatched.push(entry);
      }
    }

    const cascadedCount = matched.length - cascadeMatched.length;
    if (cascadedCount > 0) {
    }

    // matched를 정화된 목록으로 교체
    matched.length = 0;
    matched.push(...cascadeMatched);
  }

  // 결과 요약 메시지 생성
  const summary = buildSummaryMessage(tab, matched, rejected);

  if (rejected.length > 0) {
  }

  return {
    passed: rejected.length === 0,
    matched,
    rejected,
    summary,
  };
}

// ============ 요약 메시지 생성 ============

function buildSummaryMessage(
  tab: AutoMappingTab,
  matched: MatchedEntry[],
  rejected: RejectedEntry[],
): string {
  if (rejected.length === 0 && matched.length > 0) {
    return `✅ 마스터 데이터 로드 완료!\n\n📋 매핑 완료: ${matched.length}건`;
  }

  if (matched.length === 0 && rejected.length > 0) {
    const reasons = groupRejectionReasons(rejected);
    return `❌ 자동매핑 불가!\n\n마스터 데이터가 현재 구조와 일치하지 않습니다.\n수동 모드로 직접 입력해주세요.\n\n${reasons}`;
  }

  if (matched.length > 0 && rejected.length > 0) {
    const reasons = groupRejectionReasons(rejected);
    return `⚠️ 일부 데이터 검증 실패!\n\n✅ 매핑 완료: ${matched.length}건\n❌ 거부: ${rejected.length}건\n\n${reasons}\n\n오류 항목은 수동으로 입력해주세요.`;
  }

  return '⚠️ 매핑할 마스터 데이터가 없습니다.\n수동으로 입력해주세요.';
}

/** 거부 사유별 그룹핑하여 문자열 생성 */
function groupRejectionReasons(rejected: RejectedEntry[]): string {
  const groups = new Map<RejectionReason, string[]>();
  for (const r of rejected) {
    if (!groups.has(r.reason)) groups.set(r.reason, []);
    groups.get(r.reason)!.push(r.detail);
  }

  const lines: string[] = [];
  for (const [reason, details] of groups) {
    const label = REASON_LABELS[reason];
    // 같은 사유는 최대 3건만 표시
    const shown = details.slice(0, 3);
    const more = details.length > 3 ? ` 외 ${details.length - 3}건` : '';
    lines.push(`[${label}] ${shown.join(', ')}${more}`);
  }
  return lines.join('\n');
}

// ============ 유틸리티: matched 데이터를 itemCode별로 분류 ============

/** matched 데이터를 processNo(+m4)별로 그룹핑 */
export function groupMatchedByRoom(
  matched: MatchedEntry[],
  itemCode: string,
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const entry of matched) {
    if (entry.data.itemCode !== itemCode) continue;
    const key = entry.room.m4
      ? `${entry.room.processNo}::${entry.room.m4}`
      : entry.room.processNo;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(entry.data.value);
  }
  return map;
}

/** ★ 2026-02-23: matched 데이터를 메타데이터(specialChar 등) 포함하여 그룹핑 */
export function groupMatchedByRoomMeta(
  matched: MatchedEntry[],
  itemCode: string,
): Map<string, { value: string; specialChar: string }[]> {
  const map = new Map<string, { value: string; specialChar: string }[]>();
  for (const entry of matched) {
    if (entry.data.itemCode !== itemCode) continue;
    const key = entry.room.m4
      ? `${entry.room.processNo}::${entry.room.m4}`
      : entry.room.processNo;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push({
      value: entry.data.value,
      specialChar: entry.data.specialChar || '',
    });
  }
  return map;
}
