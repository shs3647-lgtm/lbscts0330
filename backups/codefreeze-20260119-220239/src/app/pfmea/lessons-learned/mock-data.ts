/**
 * @file mock-data.ts
 * @description 습득교훈 샘플 데이터
 * @reference PRD-023-lessons-learned-screen.md
 * 
 * ★ 2026-01-12: 필드 변경
 * - result → fmeaId (FMEA ID 자동 입력)
 * - date → completedDate (LLD 완료일, 수동 입력)
 * - appliedDate 추가 (FMEA 적용일, 자동)
 */

import { LessonsLearnedRow } from './types';

// LLD 시리얼 번호 생성 (LLD26-001 형식)
let lldSeq = 0;
export const generateLldNo = (): string => {
  lldSeq++;
  return `LLD26-${String(lldSeq).padStart(3, '0')}`;
};

// 샘플 데이터 (Excel 파일 기준: lessons_learned.xlsx)
export const LESSONS_SAMPLE_DATA: LessonsLearnedRow[] = [
  {
    id: 'll-001',
    lldNo: 'LLD26-001',
    vehicle: 'HHH',
    target: '설계',
    failureMode: 'Audio> 출력 자동으로 Mute 됨',
    location: 'FIELD',
    cause: 'Mode 상의 Soft Bug',
    category: '예방관리',
    improvement: '각Mode 별로 Mute 제어함',
    completedDate: '2025-10-01',
    fmeaId: 'pfm26-001',
    status: 'G',
    appliedDate: '2025-11-12',
  },
  {
    id: 'll-002',
    lldNo: 'LLD26-002',
    vehicle: 'BBB',
    target: '부품',
    failureMode: 'AM>Side 주파수에서 Seek Stop',
    location: '고객공장',
    cause: 'IF를 체크하지않고 SD만 체크됨',
    category: '검출관리',
    improvement: 'IF도 체크하도록 Soft 수정',
    completedDate: '2025-04-15',
    fmeaId: '',
    status: 'R',
    appliedDate: '',
  },
  {
    id: 'll-003',
    lldNo: 'LLD26-003',
    vehicle: 'GVS',
    target: '제조',
    failureMode: 'AST 메모리가 강전계순이 아님',
    location: '',
    cause: 'SM 체크하지 않음',
    category: '예방관리',
    improvement: 'SM 체크하도록 Soft 수정',
    completedDate: '2025-03-20',
    fmeaId: '',
    status: 'Y',
    appliedDate: '',
  },
  {
    id: 'll-004',
    lldNo: 'LLD26-004',
    vehicle: 'ABC',
    target: '설계',
    failureMode: 'Bluetooth 연결 끊김 현상',
    location: 'FIELD',
    cause: '연결 유지 타이머 설정 오류',
    category: '예방관리',
    improvement: 'BT 연결 타이머 2초→5초 변경',
    completedDate: '2025-05-10',
    fmeaId: 'pfm26-002',
    status: 'G',
    appliedDate: '2025-06-15',
  },
  {
    id: 'll-005',
    lldNo: 'LLD26-005',
    vehicle: 'XYZ',
    target: '부품',
    failureMode: '커넥터 접촉 불량',
    location: '양산라인',
    cause: '핀 규격 미달 (0.3mm→0.25mm)',
    category: '검출관리',
    improvement: '입고검사 핀 규격 추가',
    completedDate: '2025-06-01',
    fmeaId: 'pfm26-001',
    status: 'G',
    appliedDate: '2025-07-20',
  },
  {
    id: 'll-006',
    lldNo: 'LLD26-006',
    vehicle: 'DEF',
    target: '제조',
    failureMode: '솔더 크랙 발생',
    location: '고객공장',
    cause: '리플로우 온도 프로파일 불량',
    category: '예방관리',
    improvement: '온도 프로파일 최적화 (245°C→250°C)',
    completedDate: '',
    fmeaId: '',
    status: 'Y',
    appliedDate: '',
  },
  {
    id: 'll-007',
    lldNo: 'LLD26-007',
    vehicle: 'GHI',
    target: '설계',
    failureMode: 'USB 인식 실패',
    location: 'FIELD',
    cause: 'USB 드라이버 호환성 문제',
    category: '예방관리',
    improvement: 'USB 드라이버 버전 업데이트',
    completedDate: '2025-07-15',
    fmeaId: 'pfm26-003',
    status: 'G',
    appliedDate: '2025-08-10',
  },
  {
    id: 'll-008',
    lldNo: 'LLD26-008',
    vehicle: 'JKL',
    target: '부품',
    failureMode: 'LCD 불량화소 발생',
    location: '입고검사',
    cause: '공급사 생산공정 변경',
    category: '검출관리',
    improvement: '입고검사 불량화소 검출 추가',
    completedDate: '',
    fmeaId: '',
    status: 'Y',
    appliedDate: '',
  },
  {
    id: 'll-009',
    lldNo: 'LLD26-009',
    vehicle: 'MNO',
    target: '제조',
    failureMode: 'PCB 휨 발생',
    location: '양산라인',
    cause: 'SMT 후 냉각속도 과다',
    category: '예방관리',
    improvement: '냉각 속도 조절 (5°C/sec→3°C/sec)',
    completedDate: '',
    fmeaId: '',
    status: 'R',
    appliedDate: '',
  },
  {
    id: 'll-010',
    lldNo: 'LLD26-010',
    vehicle: 'PQR',
    target: '설계',
    failureMode: 'CAN 통신 오류',
    location: 'FIELD',
    cause: '통신 프로토콜 불일치',
    category: '예방관리',
    improvement: 'CAN 프로토콜 버전 동기화',
    completedDate: '2025-08-20',
    fmeaId: 'pfm26-001',
    status: 'G',
    appliedDate: '2025-09-05',
  },
];

// 빈 행 생성 함수 (시퀀스 번호를 인자로 받음)
export const createEmptyRow = (seqNum?: number): LessonsLearnedRow => {
  const seq = seqNum ?? (LESSONS_SAMPLE_DATA.length + 1);
  return {
    id: `ll-${Date.now()}`,
    lldNo: `LLD26-${String(seq).padStart(3, '0')}`,
    vehicle: '',
    target: '설계',
    failureMode: '',
    location: '',
    cause: '',
    category: '예방관리',
    improvement: '',
    completedDate: '',
    fmeaId: '',
    status: 'R',
    appliedDate: '',
  };
};
