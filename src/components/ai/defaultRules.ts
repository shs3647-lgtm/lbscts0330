/**
 * @file defaultRules.ts
 * @description AI 추천용 기본 규칙 데이터 (Cold Start 해결)
 * @version 1.0.0
 * @created 2026-01-04
 * 
 * 초기 학습 데이터가 부족할 때 사용되는 기본 규칙입니다.
 * 실제 사용 데이터가 축적되면 AI 추천으로 대체됩니다.
 */

import { RankedItem, RecommendContext } from '@/lib/ai-recommendation';

// =====================================================
// 4M 분류별 기본 고장원인
// =====================================================

const DEFAULT_CAUSES_BY_4M: Record<string, string[]> = {
  // MN - 사람 (Man)
  MN: [
    '작업자 실수',
    '교육 미흡',
    '숙련도 부족',
    '작업표준 미준수',
    '피로/부주의',
    '의사소통 오류',
    '인력 부족',
  ],
  // MC - 기계/설비 (Machine)
  MC: [
    '설비 마모',
    '설비 고장',
    '정비 미흡',
    '노후화',
    '정밀도 저하',
    '캘리브레이션 미실시',
    '설비 세팅 오류',
  ],
  // MT - 방법 (Method)
  MT: [
    '작업표준 부재',
    '절차 미준수',
    '검사 방법 부적합',
    '공정 순서 오류',
    '측정 방법 오류',
    '관리 기준 미설정',
  ],
  // ME - 환경/재료 (Material/Environment)
  ME: [
    '원자재 불량',
    '재료 혼입',
    '부자재 불량',
    '온도 부적합',
    '습도 부적합',
    '이물 혼입',
    '보관 조건 불량',
  ],
  // EN - 환경
  EN: [
    '온도 변화',
    '습도 변화',
    '진동/충격',
    '먼지/분진',
    '조명 부적합',
    '소음',
  ],
  // IM - 재료/투입물
  IM: [
    '입고 검사 미흡',
    '원자재 규격 미달',
    '부품 불량',
    '혼입/오염',
    '유효기간 초과',
  ],
};

// =====================================================
// 공정 유형별 기본 고장형태
// =====================================================

const DEFAULT_MODES_BY_PROCESS: Record<string, string[]> = {
  // 사출 공정
  사출: ['치수 불량', '외관 불량', '충진 부족', '기포 발생', '변형', '균열', '버(Burr) 발생'],
  // 조립 공정
  조립: ['조립 불량', '누락', '역조립', '체결 불량', '간섭', '유격 과다', '이탈'],
  // 검사 공정
  검사: ['검사 누락', '오검사', '판정 오류', '측정 오차', '불량 유출'],
  // 도장 공정
  도장: ['도막 두께 불량', '색상 불량', '흐름', '기포', '박리', '이물 부착'],
  // 가공 공정
  가공: ['치수 불량', '면조도 불량', '가공 누락', '버(Burr)', '크랙', '변형'],
  // 용접 공정
  용접: ['용접 불량', '기공', '슬래그 혼입', '언더컷', '오버랩', '변형'],
  // 프레스 공정
  프레스: ['균열', '주름', '찢어짐', '치수 불량', '변형', '버(Burr)'],
  // 포장 공정
  포장: ['포장 누락', '오포장', '라벨 오류', '수량 과부족', '파손'],
  // 열처리 공정
  열처리: ['경도 불량', '변형', '균열', '산화', '탈탄'],
  // 세척 공정
  세척: ['세척 불량', '이물 잔존', '부식', '변색', '건조 불량'],
  // 기본 (매칭 안될 경우)
  기본: ['규격 미달', '기능 불량', '외관 불량', '성능 저하', '누락', '오작동'],
};

// =====================================================
// 공통 고장영향 (FE)
// =====================================================

const DEFAULT_EFFECTS = {
  // YP (Your Plant) - 자사 공장
  YP: [
    '라인 정지',
    '재작업 필요',
    '폐기 처리',
    '공정 지연',
    '품질 저하',
    '원가 상승',
    '검사 강화',
  ],
  // SP (Ship to Plant) - 고객사
  SP: [
    '고객 불만',
    '반품 발생',
    '납기 지연',
    '클레임 발생',
    '신뢰도 하락',
    '거래 중단 위험',
  ],
  // User - 최종 사용자
  User: [
    '안전 사고 위험',
    '제품 고장',
    '사용 불가',
    '리콜 위험',
    '법적 책임',
    '생명 위험',
  ],
};

// =====================================================
// 추천 함수
// =====================================================

/**
 * 컨텍스트 기반 기본 추천 반환
 */
export function getDefaultRecommendations(
  context: RecommendContext & { parentItem?: string },
  type: 'cause' | 'mode' | 'effect' | 'requirement' | 'workElement'
): RankedItem[] {
  let items: string[] = [];

  switch (type) {
    case 'cause':
      // 4M 분류에 따른 고장원인 추천
      const m4 = context.m4Category?.toUpperCase() || '';
      items = DEFAULT_CAUSES_BY_4M[m4] || DEFAULT_CAUSES_BY_4M['MN'];
      break;

    case 'mode':
      // 공정명에 따른 고장형태 추천
      const processName = context.processName || '';
      const matchedProcess = Object.keys(DEFAULT_MODES_BY_PROCESS).find(
        key => processName.toLowerCase().includes(key.toLowerCase())
      );
      items = DEFAULT_MODES_BY_PROCESS[matchedProcess || '기본'];
      break;

    case 'effect':
      // 모든 영향 범위 통합
      items = [
        ...DEFAULT_EFFECTS.YP.slice(0, 2),
        ...DEFAULT_EFFECTS.SP.slice(0, 2),
        ...DEFAULT_EFFECTS.User.slice(0, 2),
      ];
      break;

    case 'requirement':
      // 기본 요구사항
      items = [
        '규격 준수',
        '외관 양호',
        '기능 정상',
        '치수 만족',
        '내구성 확보',
      ];
      break;

    case 'workElement':
      // 기본 작업요소
      items = [
        '투입 작업',
        '가공 작업',
        '조립 작업',
        '검사 작업',
        '포장 작업',
      ];
      break;
  }

  // RankedItem 형식으로 변환
  return items.slice(0, 5).map((value, idx) => ({
    value,
    frequency: 10 - idx, // 순서에 따른 가상 빈도
    confidence: 0.5 - idx * 0.05, // 기본 규칙은 50%부터 시작
    source: 'rule' as const,
  }));
}

/**
 * 4M 분류별 고장원인 직접 조회
 */
export function getCausesByM4(m4Category: string): string[] {
  const m4 = m4Category?.toUpperCase() || 'MN';
  return DEFAULT_CAUSES_BY_4M[m4] || DEFAULT_CAUSES_BY_4M['MN'];
}

/**
 * 공정별 고장형태 직접 조회
 */
export function getModesByProcess(processName: string): string[] {
  const matched = Object.keys(DEFAULT_MODES_BY_PROCESS).find(
    key => processName?.toLowerCase().includes(key.toLowerCase())
  );
  return DEFAULT_MODES_BY_PROCESS[matched || '기본'];
}

/**
 * 영향 범위별 고장영향 조회
 */
export function getEffectsByScope(scope: 'YP' | 'SP' | 'User'): string[] {
  return DEFAULT_EFFECTS[scope] || DEFAULT_EFFECTS.YP;
}

// =====================================================
// 산업별 확장 데이터 (향후 확장)
// =====================================================

export const INDUSTRY_TEMPLATES = {
  automotive: {
    name: '자동차',
    processes: ['사출', '프레스', '용접', '도장', '조립', '검사'],
    criticalChars: ['안전 관련', '법규 관련', '외관 관련'],
  },
  electronics: {
    name: '전자',
    processes: ['SMT', '조립', '검사', '포장'],
    criticalChars: ['정전기 민감', 'ESD 관련', '정밀도 관련'],
  },
  food: {
    name: '식품',
    processes: ['원료 투입', '혼합', '가열', '냉각', '포장', '검사'],
    criticalChars: ['위생 관련', '유통기한 관련', '이물 관련'],
  },
} as const;




