/**
 * @file gatekeeper.test.ts
 * @description Gatekeeper 자동매핑 검증 단위 테스트
 *
 * 테스트 범위:
 * 1. buildRoomLocks — 각 탭별 방 목록 생성
 * 2. validateAutoMapping — 키-자물쇠 매칭 (matched/rejected 분류)
 * 3. 거부 사유 정확성 (NO_ROOM, WRONG_ROOM, EMPTY_KEY, WRONG_KEY_TYPE, HOTEL_MISMATCH)
 * 4. groupMatchedByRoom — matched 그룹핑
 * 5. 엣지 케이스: 빈 상태, 공백 processNo, 대소문자 m4
 */

import { describe, it, expect } from 'vitest';
import { buildRoomLocks, validateAutoMapping, groupMatchedByRoom } from './gatekeeper';
import type { DataKey, RoomLock, RejectionReason } from './gatekeeper';
import type { WorksheetState, Process, L1Data } from '../constants';

// ============ 테스트 헬퍼 ============

/** 최소한의 WorksheetState 생성 (필요한 필드만) */
function createMockState(overrides: { l1?: Partial<L1Data>; l2?: Partial<Process>[] } = {}): WorksheetState {
  const defaultL1: L1Data = {
    id: 'l1-1',
    name: '완제품',
    types: [
      { id: 't-yp', name: 'YP', functions: [] },
      { id: 't-sp', name: 'SP', functions: [] },
      { id: 't-user', name: 'USER', functions: [] },
    ],
    failureScopes: [],
  };

  const defaultL2: Process[] = [
    {
      id: 'p-10', no: '10', name: '프레스', order: 10,
      functions: [], productChars: [], failureModes: [],
      l3: [
        { id: 'we-10-mn', m4: 'MN', name: '작업자', order: 1, functions: [], processChars: [], failureCauses: [] },
        { id: 'we-10-mc', m4: 'MC', name: '설비', order: 2, functions: [], processChars: [], failureCauses: [] },
      ],
    },
    {
      id: 'p-20', no: '20', name: '용접', order: 20,
      functions: [], productChars: [], failureModes: [],
      l3: [
        { id: 'we-20-mn', m4: 'MN', name: '작업자', order: 1, functions: [], processChars: [], failureCauses: [] },
        { id: 'we-20-im', m4: 'IM', name: '부자재', order: 2, functions: [], processChars: [], failureCauses: [] },
        { id: 'we-20-en', m4: 'EN', name: '환경', order: 3, functions: [], processChars: [], failureCauses: [] },
      ],
    },
  ];

  return {
    l1: { ...defaultL1, ...overrides.l1 } as L1Data,
    l2: (overrides.l2 as Process[]) || defaultL2,
    selected: { type: 'L2', id: null },
    tab: 'structure',
    levelView: '2',
    search: '',
    visibleSteps: [2, 3, 4, 5, 6],
  };
}

/** DataKey 간편 생성 */
function dk(processNo: string, itemCode: string, value: string, m4?: string, sourceFmeaId?: string): DataKey {
  return { processNo, itemCode, value, m4, sourceFmeaId };
}

// ============ 1. buildRoomLocks 테스트 ============

describe('buildRoomLocks', () => {
  const state = createMockState();

  describe('L1 탭 (function-l1)', () => {
    it('L1 기능: 카테고리(YP/SP/USER)별 방 3개 × itemCode 3개 = 9개', () => {
      const rooms = buildRoomLocks('function-l1', state);
      expect(rooms.length).toBe(9); // 3 categories × 3 itemCodes (C1,C2,C3)
      expect(rooms.filter(r => r.processNo === 'YP').length).toBe(3);
      expect(rooms.filter(r => r.processNo === 'SP').length).toBe(3);
      expect(rooms.filter(r => r.processNo === 'USER').length).toBe(3);
    });

    it('L1 고장: 카테고리별 방 3개 × itemCode 1개 = 3개', () => {
      const rooms = buildRoomLocks('failure-l1', state);
      expect(rooms.length).toBe(3); // 3 categories × 1 itemCode (C4)
      expect(rooms.every(r => r.itemCode === 'C4')).toBe(true);
    });
  });

  describe('L2 탭 (function-l2, failure-l2)', () => {
    it('L2 기능: 공정 2개 × itemCode 2개 = 4개', () => {
      const rooms = buildRoomLocks('function-l2', state);
      expect(rooms.length).toBe(4); // 2 processes × 2 itemCodes (A3,A4)
      expect(rooms.filter(r => r.processNo === '10').length).toBe(2);
      expect(rooms.filter(r => r.processNo === '20').length).toBe(2);
    });

    it('L2 고장: 공정 2개 × itemCode 1개 = 2개', () => {
      const rooms = buildRoomLocks('failure-l2', state);
      expect(rooms.length).toBe(2); // 2 processes × 1 itemCode (A5)
      expect(rooms.every(r => r.itemCode === 'A5')).toBe(true);
    });

    it('빈 공정번호는 방 생성 안 함', () => {
      const emptyState = createMockState({
        l2: [
          { id: 'p-e', no: '', name: '빈공정', order: 0, functions: [], productChars: [], failureModes: [], l3: [] } as Process,
          { id: 'p-10', no: '10', name: '프레스', order: 10, functions: [], productChars: [], failureModes: [], l3: [] } as Process,
        ],
      });
      const rooms = buildRoomLocks('function-l2', emptyState);
      expect(rooms.length).toBe(2); // only process '10' × 2 itemCodes
      expect(rooms.every(r => r.processNo === '10')).toBe(true);
    });
  });

  describe('L3 탭 (function-l3, failure-l3)', () => {
    it('L3 기능: (공정10 × 2 WE + 공정20 × 3 WE) × 2 itemCodes = 10개', () => {
      const rooms = buildRoomLocks('function-l3', state);
      expect(rooms.length).toBe(10); // (2 + 3) WEs × 2 itemCodes (B2,B3)
    });

    it('L3 고장: (2 + 3) WE × 1 itemCode = 5개', () => {
      const rooms = buildRoomLocks('failure-l3', state);
      expect(rooms.length).toBe(5);
      expect(rooms.every(r => r.itemCode === 'B4')).toBe(true);
    });

    it('m4가 있는 방만 생성 (m4 없는 WE는 무시)', () => {
      const stateWithEmptyM4 = createMockState({
        l2: [{
          id: 'p-30', no: '30', name: '도장', order: 30,
          functions: [], productChars: [], failureModes: [],
          l3: [
            { id: 'we-ok', m4: 'MN', name: '작업자', order: 1, functions: [], processChars: [], failureCauses: [] },
            { id: 'we-no-m4', m4: '', name: '미분류', order: 2, functions: [], processChars: [], failureCauses: [] },
          ],
        } as Process],
      });
      const rooms = buildRoomLocks('function-l3', stateWithEmptyM4);
      expect(rooms.length).toBe(2); // only MN WE × 2 itemCodes (B2,B3)
      expect(rooms.every(r => r.m4 === 'MN')).toBe(true);
    });

    it('m4는 대문자로 정규화됨', () => {
      const stateWithLowerM4 = createMockState({
        l2: [{
          id: 'p-40', no: '40', name: '조립', order: 40,
          functions: [], productChars: [], failureModes: [],
          l3: [
            { id: 'we-lower', m4: 'mn', name: '작업자', order: 1, functions: [], processChars: [], failureCauses: [] },
          ],
        } as Process],
      });
      const rooms = buildRoomLocks('function-l3', stateWithLowerM4);
      expect(rooms.every(r => r.m4 === 'MN')).toBe(true);
    });
  });

  describe('빈 상태', () => {
    it('l2가 빈 배열이면 방 0개', () => {
      const emptyState = createMockState({ l2: [] });
      expect(buildRoomLocks('function-l2', emptyState).length).toBe(0);
      expect(buildRoomLocks('function-l3', emptyState).length).toBe(0);
    });

    it('l1.types가 빈 배열이면 방 0개', () => {
      const emptyL1State = createMockState({ l1: { types: [] } });
      expect(buildRoomLocks('function-l1', emptyL1State).length).toBe(0);
      expect(buildRoomLocks('failure-l1', emptyL1State).length).toBe(0);
    });
  });
});

// ============ 2. validateAutoMapping 테스트 ============

describe('validateAutoMapping', () => {
  const state = createMockState();

  describe('전체 통과 (passed=true)', () => {
    it('L2 기능: 올바른 processNo+itemCode → 전체 matched', () => {
      const items: DataKey[] = [
        dk('10', 'A3', '프레스 가공'),
        dk('10', 'A4', '외경 치수'),
        dk('20', 'A3', '용접 접합'),
      ];
      const result = validateAutoMapping('function-l2', state, items);
      expect(result.passed).toBe(true);
      expect(result.matched.length).toBe(3);
      expect(result.rejected.length).toBe(0);
    });

    it('L3 기능: processNo+m4 복합키 → 전체 matched', () => {
      const items: DataKey[] = [
        dk('10', 'B2', '나사 조임', 'MN'),
        dk('10', 'B3', '토크값', 'MC'),
        dk('20', 'B2', '용접봉 세팅', 'MN'),
      ];
      const result = validateAutoMapping('function-l3', state, items);
      expect(result.passed).toBe(true);
      expect(result.matched.length).toBe(3);
    });
  });

  describe('NO_ROOM — 구조에 없는 공정번호', () => {
    it('존재하지 않는 processNo → NO_ROOM', () => {
      const items: DataKey[] = [
        dk('99', 'A3', '없는공정 기능'),
      ];
      const result = validateAutoMapping('function-l2', state, items);
      expect(result.passed).toBe(false);
      expect(result.rejected.length).toBe(1);
      expect(result.rejected[0].reason).toBe('NO_ROOM');
    });

    it('L3에서 존재하지 않는 processNo → NO_ROOM', () => {
      const items: DataKey[] = [
        dk('99', 'B2', '없는공정 작업기능', 'MN'),
      ];
      const result = validateAutoMapping('function-l3', state, items);
      expect(result.rejected[0].reason).toBe('NO_ROOM');
    });
  });

  describe('WRONG_ROOM — m4 불일치/누락', () => {
    it('L3: m4가 비어있으면 WRONG_ROOM', () => {
      const items: DataKey[] = [
        dk('10', 'B2', '작업기능', ''), // m4 없음
      ];
      const result = validateAutoMapping('function-l3', state, items);
      expect(result.rejected.length).toBe(1);
      expect(result.rejected[0].reason).toBe('WRONG_ROOM');
      expect(result.rejected[0].detail).toContain('4M 값 누락');
    });

    it('L3: 구조에 없는 m4 → WRONG_ROOM', () => {
      const items: DataKey[] = [
        dk('10', 'B2', '작업기능', 'EN'), // 공정10에 EN은 없음
      ];
      const result = validateAutoMapping('function-l3', state, items);
      expect(result.rejected.length).toBe(1);
      expect(result.rejected[0].reason).toBe('WRONG_ROOM');
    });
  });

  describe('EMPTY_KEY — 빈 값', () => {
    it('value가 빈 문자열 → EMPTY_KEY', () => {
      const items: DataKey[] = [
        dk('10', 'A3', ''),   // 빈 value
        dk('10', 'A3', '  '), // 공백만 (trim → 빈 값)
      ];
      const result = validateAutoMapping('function-l2', state, items);
      expect(result.rejected.length).toBe(2);
      expect(result.rejected.every(r => r.reason === 'EMPTY_KEY')).toBe(true);
    });
  });

  describe('WRONG_KEY_TYPE — 잘못된 itemCode', () => {
    it('function-l2에 B2 itemCode → WRONG_KEY_TYPE', () => {
      const items: DataKey[] = [
        dk('10', 'B2', '잘못된 itemCode'), // B2는 L3 전용
      ];
      const result = validateAutoMapping('function-l2', state, items);
      expect(result.rejected.length).toBe(1);
      expect(result.rejected[0].reason).toBe('WRONG_KEY_TYPE');
    });

    it('failure-l2에 A3 itemCode → WRONG_KEY_TYPE', () => {
      const items: DataKey[] = [
        dk('10', 'A3', '기능 데이터를 고장탭에'), // A3은 기능 L2 전용
      ];
      const result = validateAutoMapping('failure-l2', state, items);
      expect(result.rejected[0].reason).toBe('WRONG_KEY_TYPE');
    });
  });

  describe('HOTEL_MISMATCH — sourceFmeaId 불일치', () => {
    it('sourceFmeaId가 currentFmeaId와 다르면 → HOTEL_MISMATCH', () => {
      const items: DataKey[] = [
        dk('10', 'A3', '다른 FMEA 데이터', undefined, 'fmea-other'),
      ];
      const result = validateAutoMapping('function-l2', state, items, 'fmea-mine');
      expect(result.rejected.length).toBe(1);
      expect(result.rejected[0].reason).toBe('HOTEL_MISMATCH');
    });

    it('sourceFmeaId 없으면 체크 스킵 → matched', () => {
      const items: DataKey[] = [
        dk('10', 'A3', 'fmeaId 없는 데이터'),
      ];
      const result = validateAutoMapping('function-l2', state, items, 'fmea-mine');
      expect(result.passed).toBe(true);
      expect(result.matched.length).toBe(1);
    });
  });

  describe('혼합 결과 (일부 통과, 일부 거부)', () => {
    it('3개 중 1개 NO_ROOM, 1개 EMPTY_KEY → matched=1, rejected=2', () => {
      const items: DataKey[] = [
        dk('10', 'A3', '정상 데이터'),
        dk('99', 'A3', '없는 공정'),
        dk('20', 'A3', ''),
      ];
      const result = validateAutoMapping('function-l2', state, items);
      expect(result.passed).toBe(false);
      expect(result.matched.length).toBe(1);
      expect(result.rejected.length).toBe(2);

      const reasons = result.rejected.map(r => r.reason);
      expect(reasons).toContain('NO_ROOM');
      expect(reasons).toContain('EMPTY_KEY');
    });
  });

  describe('전체 실패 (matched=0)', () => {
    it('모든 키가 거부되면 summary에 "자동매핑 불가" 메시지', () => {
      const items: DataKey[] = [
        dk('99', 'A3', '없는공정1'),
        dk('88', 'A3', '없는공정2'),
      ];
      const result = validateAutoMapping('function-l2', state, items);
      expect(result.matched.length).toBe(0);
      expect(result.summary).toContain('자동매핑 불가');
    });
  });

  describe('summary 메시지 포맷', () => {
    it('전체 통과 시 "로드 완료" 메시지', () => {
      const items: DataKey[] = [dk('10', 'A5', '균열')];
      const result = validateAutoMapping('failure-l2', state, items);
      expect(result.summary).toContain('로드 완료');
    });

    it('일부 통과 시 "검증 실패" 메시지 + 매핑/거부 건수', () => {
      const items: DataKey[] = [
        dk('10', 'A5', '균열'),
        dk('99', 'A5', '없는공정'),
      ];
      const result = validateAutoMapping('failure-l2', state, items);
      expect(result.summary).toContain('검증 실패');
      expect(result.summary).toContain('매핑 완료: 1건');
      expect(result.summary).toContain('거부: 1건');
    });

    it('빈 items → "매핑할 마스터 데이터가 없습니다"', () => {
      const result = validateAutoMapping('function-l2', state, []);
      expect(result.summary).toContain('매핑할 마스터 데이터가 없습니다');
    });
  });

  describe('processNo 공백 처리', () => {
    it('processNo 앞뒤 공백은 trim되어 매칭', () => {
      const items: DataKey[] = [
        dk(' 10 ', 'A3', '공백 포함 processNo'),
      ];
      const result = validateAutoMapping('function-l2', state, items);
      expect(result.passed).toBe(true);
      expect(result.matched.length).toBe(1);
    });
  });

  describe('m4 대소문자 정규화', () => {
    it('소문자 m4도 매칭됨 (mn → MN)', () => {
      const items: DataKey[] = [
        dk('10', 'B2', '소문자 m4 테스트', 'mn'),
      ];
      const result = validateAutoMapping('function-l3', state, items);
      expect(result.passed).toBe(true);
    });
  });
});

// ============ 3. groupMatchedByRoom 테스트 ============

describe('groupMatchedByRoom', () => {
  it('L2: processNo별로 그룹핑', () => {
    const matched = [
      { room: { processNo: '10', itemCode: 'A3' }, data: dk('10', 'A3', '기능1') },
      { room: { processNo: '10', itemCode: 'A3' }, data: dk('10', 'A3', '기능2') },
      { room: { processNo: '20', itemCode: 'A3' }, data: dk('20', 'A3', '기능3') },
      { room: { processNo: '10', itemCode: 'A4' }, data: dk('10', 'A4', '특성1') },
    ];

    const a3Map = groupMatchedByRoom(matched, 'A3');
    expect(a3Map.get('10')).toEqual(['기능1', '기능2']);
    expect(a3Map.get('20')).toEqual(['기능3']);

    const a4Map = groupMatchedByRoom(matched, 'A4');
    expect(a4Map.get('10')).toEqual(['특성1']);
  });

  it('L3: processNo::m4 복합키로 그룹핑', () => {
    const matched = [
      { room: { processNo: '10', m4: 'MN', itemCode: 'B2' }, data: dk('10', 'B2', '나사조임', 'MN') },
      { room: { processNo: '10', m4: 'MN', itemCode: 'B2' }, data: dk('10', 'B2', '볼트체결', 'MN') },
      { room: { processNo: '10', m4: 'MC', itemCode: 'B2' }, data: dk('10', 'B2', '프레스가동', 'MC') },
    ];

    const map = groupMatchedByRoom(matched, 'B2');
    expect(map.get('10::MN')).toEqual(['나사조임', '볼트체결']);
    expect(map.get('10::MC')).toEqual(['프레스가동']);
  });

  it('해당 itemCode가 없으면 빈 Map 반환', () => {
    const matched = [
      { room: { processNo: '10', itemCode: 'A3' }, data: dk('10', 'A3', '기능1') },
    ];
    const map = groupMatchedByRoom(matched, 'A5');
    expect(map.size).toBe(0);
  });

  it('빈 matched 배열 → 빈 Map', () => {
    const map = groupMatchedByRoom([], 'A3');
    expect(map.size).toBe(0);
  });
});
