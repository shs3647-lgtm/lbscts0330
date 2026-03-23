/**
 * @file severityKeywordMap.ts
 * @description P-FMEA 고장영향(FE) 텍스트 → 심각도(S) 키워드 기반 매핑
 *
 * AIAG VDA FMEA 1st Edition (2차 정오표) 기준
 * P-FMEA 심각도: 3열 구조 (자사공장/고객사/최종사용자)
 *
 * 매칭 우선순위:
 *   1. 규칙 기반 키워드 매칭 (가장 정확)
 *   2. 복합 키워드 조합 (2개 이상 키워드 동시 매칭)
 *   3. 단일 키워드 매칭 (폴백)
 *
 * @created 2026-02-23
 */

// =====================================================
// P-FMEA 심각도 키워드 규칙 (AIAG VDA 1st Edition)
// =====================================================

interface SeverityRule {
  /** 심각도 등급 (1~10) */
  rating: number;
  /** AIAG VDA 등급명 */
  level: string;
  /** 필수 키워드 — 하나라도 매칭되면 후보 */
  keywords: string[];
  /** 제외 키워드 — 이 키워드가 있으면 이 규칙 제외 */
  excludes?: string[];
  /** 복합 조건 — 이 키워드가 함께 있어야 매칭 (AND 조건) */
  requires?: string[];
  /** 매칭 가중치 (기본 1.0) */
  weight?: number;
}

/**
 * AIAG VDA P-FMEA 심각도 등급명 (1st Edition, 2차 정오표)
 *
 *   S=10,9: 매우 높음 (Very High)
 *   S=8,7:  보통 높음 (High)
 *   S=6,5,4: 중간 (Moderate)
 *   S=3,2:  낮음 (Low)
 *   S=1:    매우 낮음 (Very Low)
 *
 * ★ 자사공장(YP) 관점 표준 FE 서술 기준:
 *   S=10: 근로자 건강/안전 리스크
 *   S=9:  공장 내 규제 미준수
 *   S=8:  100% 폐기 / 1shift 이상 라인 중단 / 출하 중단
 *   S=7:  선별 및 일부 폐기 / 기준 이탈 / 라인속도 저하 / 인력 추가
 *   S=6:  100% 라인 밖 재작업
 *   S=5:  일부 라인 밖 재작업
 *   S=4:  100% 스테이션 내 재작업
 *   S=3:  일부 스테이션 내 재작업
 *   S=2:  작업자에게 약간의 불편
 *   S=1:  식별 가능한 영향 없음
 */

/**
 * P-FMEA 심각도 규칙 (높은 등급부터 → 첫 매칭 우선)
 *
 * ★ 자사공장 관점 위주 (PFMEA FE는 대부분 자사공장 영향 서술)
 *
 * 규칙 구조:
 *   - 각 등급에 [표준 AIAG-VDA 규칙] + [제조 현장 확장 규칙] 배치
 *   - 확장 규칙은 weight를 낮추어 표준 규칙보다 후순위
 *   - 최하단에 [제네릭 폴백 규칙] 배치 (불량/부적합 단독)
 */
export const PFMEA_SEVERITY_RULES: SeverityRule[] = [
  // ══════════════════════════════════════════
  // S=10: 근로자 건강/안전 리스크 (AIAG: 매우 높음)
  // YP: 제조/조립 근로자의 건강 및/또는 안전 리스크 초래
  // ══════════════════════════════════════════
  {
    rating: 10,
    level: '매우 높음',
    keywords: ['사망', '중상', '화재', '폭발', '감전', '중독', '질식'],
    weight: 1.5,
  },
  {
    rating: 10,
    level: '매우 높음',
    keywords: ['안전', '건강', '인체', '부상', '안전 리스크'],
    requires: ['위험', '심각', '중대', '리스크', '초래'],
    weight: 1.3,
  },

  // ══════════════════════════════════════════
  // S=9: 공장 내 규제 미준수 (AIAG: 매우 높음)
  // YP: 공장 내 규제 미준수로 이어질 수 있음
  // ══════════════════════════════════════════
  {
    rating: 9,
    level: '매우 높음',
    keywords: ['규제', '법규', '인증', '규격위반', '환경규제', '배출기준', '안전규격', '규제 미준수'],
    weight: 1.4,
  },
  {
    rating: 9,
    level: '매우 높음',
    keywords: ['규제사항', '법적', '인증취소', '리콜'],
    weight: 1.5,
  },

  // ══════════════════════════════════════════
  // S=8: 100% 폐기 / 1shift 이상 라인 중단 (AIAG: 보통 높음)
  // YP: 영향받은 생산 제품의 100%가 폐기될 수 있음
  // ══════════════════════════════════════════
  {
    rating: 8,
    level: '보통 높음',
    keywords: ['전량 폐기', '100% 폐기', '전수 폐기', '완전 폐기'],
    weight: 1.4,
  },
  {
    rating: 8,
    level: '보통 높음',
    keywords: ['주요기능 상실', '기능상실', '작동불능', '시동불가'],
    weight: 1.3,
  },
  {
    rating: 8,
    level: '보통 높음',
    keywords: ['출하중단', '출하정지', '납품중단', '출하 중단'],
    weight: 1.3,
  },
  {
    rating: 8,
    level: '보통 높음',
    keywords: ['라인중단', '라인정지', '생산중단', '라인 중단'],
    requires: ['1shift', '전체', '장기', '이상'],
    weight: 1.2,
  },
  // ── S=8 확장: 파괴적 결함 → 폐기 수준 ──
  {
    rating: 8,
    level: '보통 높음',
    keywords: ['파손', '파열', '파단', '단선', '절단', '단락'],
    excludes: ['경미', '미세', '약간'],
    weight: 1.1,
  },
  {
    rating: 8,
    level: '보통 높음',
    keywords: ['균열', '크랙', '깨짐', '파괴'],
    excludes: ['미세', '마이크로'],
    weight: 1.1,
  },
  // ── S=8 확장: 필드 수리/교체 (고객사/최종사용자 관점) ──
  {
    rating: 8,
    level: '보통 높음',
    keywords: ['필드 수리', '필드 교체', '현장 수리', '현장 교체'],
    weight: 1.2,
  },

  // ══════════════════════════════════════════
  // S=7: 선별/일부 폐기, 기준이탈, 라인속도 저하 (AIAG: 보통 높음)
  // YP: ① 선별 후 일부(100% 미만) 폐기 ② 기준 이탈; 라인속도 저하, 인력 추가
  // ══════════════════════════════════════════
  {
    rating: 7,
    level: '보통 높음',
    keywords: ['이종자재', '오사양', '혼입', '혼류', '오삽입'],
    weight: 1.3,
  },
  {
    rating: 7,
    level: '보통 높음',
    keywords: ['선별', '폐기'],
    excludes: ['재작업'],
    weight: 1.2,
  },
  {
    rating: 7,
    level: '보통 높음',
    keywords: ['일부 폐기', '선별 폐기', '부분 폐기'],
    weight: 1.3,
  },
  {
    rating: 7,
    level: '보통 높음',
    keywords: ['라인속도', '속도저하', '속도 저하', '인력추가', '추가인력', '인력 추가'],
    weight: 1.1,
  },
  {
    rating: 7,
    level: '보통 높음',
    keywords: ['기준이탈', '기준 이탈', '공정이탈', '공정 이탈', '주요기능 저하'],
    weight: 1.1,
  },
  {
    rating: 7,
    level: '보통 높음',
    keywords: ['분해', '재작업'],
    requires: ['선별'],
    weight: 1.2,
  },
  {
    rating: 7,
    level: '보통 높음',
    keywords: ['lot', '로트'],
    requires: ['불량', '불일치', '생산'],
    weight: 1.1,
  },
  // ── S=7 확장: 한국 FMEA 표준 FE 관용구 ──
  {
    rating: 7,
    level: '보통 높음',
    keywords: ['기능에 이상', '기능 이상', '이상 발생'],
    excludes: ['경미', '약간', '미세', '보조', '외관'],
    weight: 1.0,
  },
  {
    rating: 7,
    level: '보통 높음',
    keywords: ['성능 저하', '성능저하', '성능 감소', '출력 저하', '출력 감소'],
    excludes: ['경미', '약간', '미세'],
    weight: 1.0,
  },
  {
    rating: 7,
    level: '보통 높음',
    keywords: ['기능 저하', '기능저하'],
    excludes: ['경미', '약간', '미세', '보조', '부기능'],
    weight: 1.0,
  },
  {
    rating: 7,
    level: '보통 높음',
    keywords: ['작동 불가', '작동불가', '동작 불가', '동작불가'],
    weight: 1.1,
  },
  // ── S=7 확장: 고객사 관점 (1시간~1shift 라인 중단, 필드 수리/교체) ──
  {
    rating: 7,
    level: '보통 높음',
    keywords: ['대책서', '시정조치', '시정요구'],
    weight: 1.2,
  },
  {
    rating: 7,
    level: '보통 높음',
    keywords: ['반품', '클레임', '고객불만', '고객 불만'],
    weight: 1.2,
  },
  {
    rating: 7,
    level: '보통 높음',
    keywords: ['조립불가', '장착불가', '사용불가', '조립 불가', '장착 불가', '사용 불가'],
    weight: 1.2,
  },
  {
    rating: 7,
    level: '보통 높음',
    keywords: ['누설', '누유', '누수', '리크', 'leak'],
    excludes: ['미세', '약간'],
    weight: 1.1,
  },
  {
    rating: 7,
    level: '보통 높음',
    keywords: ['탈락', '이탈', '빠짐'],
    excludes: ['공정이탈', '기준이탈', '외관'],
    weight: 1.0,
  },

  // ══════════════════════════════════════════
  // S=6: 100% 라인 밖 재작업 (AIAG: 중간)
  // YP: 100% 라인 밖에서 재작업 및 승인
  // ══════════════════════════════════════════
  {
    rating: 6,
    level: '중간',
    keywords: ['100% 재작업', '전수 재작업', '전량 재작업'],
    weight: 1.3,
  },
  {
    rating: 6,
    level: '중간',
    keywords: ['라인밖', '라인외', '라인 밖', '라인 외'],
    requires: ['재작업'],
    weight: 1.2,
  },
  {
    rating: 6,
    level: '중간',
    keywords: ['분해', '해체'],
    requires: ['재작업', '재조립'],
    excludes: ['선별'],
    weight: 1.1,
  },
  {
    rating: 6,
    level: '중간',
    keywords: ['보조기능 상실', '부기능 상실', '보조 기능 상실'],
    weight: 1.2,
  },
  {
    rating: 6,
    level: '중간',
    keywords: ['라인중단', '라인정지', '라인 중단', '라인 정지'],
    excludes: ['1shift', '전체', '장기'],
    weight: 1.0,
  },
  // ── S=6 확장: 요구사항 미충족 패턴 ──
  {
    rating: 6,
    level: '중간',
    keywords: ['충족 불가', '미충족', '미달성', '확보 불가'],
    weight: 1.1,
  },
  // ── S=6 확장: 전수검사/수리/교체 ──
  {
    rating: 6,
    level: '중간',
    keywords: ['전수검사', '전수 검사', '100% 검사'],
    weight: 1.1,
  },
  {
    rating: 6,
    level: '중간',
    keywords: ['수리', '교체', '교환'],
    excludes: ['일부', '경미', '약간', '필드'],
    weight: 1.0,
  },
  {
    rating: 6,
    level: '중간',
    keywords: ['재작업'],
    excludes: ['일부', '부분', '스테이션', '공정내', '라인내', '라인밖', '선별'],
    weight: 0.9,
  },

  // ══════════════════════════════════════════
  // S=5: 일부 라인 밖 재작업 (AIAG: 중간)
  // YP: 일부 제품을 라인 밖에서 재작업 및 승인
  // ══════════════════════════════════════════
  {
    rating: 5,
    level: '중간',
    keywords: ['일부 재작업', '부분 재작업'],
    requires: ['라인밖', '라인 밖'],
    weight: 1.2,
  },
  {
    rating: 5,
    level: '중간',
    keywords: ['선별'],
    requires: ['재작업'],
    excludes: ['폐기', '분해'],
    weight: 1.1,
  },
  {
    rating: 5,
    level: '중간',
    keywords: ['보조기능 저하', '부기능 저하', '보조 기능 저하'],
    weight: 1.1,
  },
  // ── S=5 확장: 손상/발생 패턴 (중간 수준) ──
  {
    rating: 5,
    level: '중간',
    keywords: ['손상'],
    excludes: ['경미', '약간', '미세', '파손', '파열', '파괴'],
    weight: 0.95,
  },
  {
    rating: 5,
    level: '중간',
    keywords: ['발생 우려', '우려'],
    excludes: ['경미', '약간', '미세', '안전', '화재'],
    weight: 0.85,
  },
  // ── S=5 확장: 부적합/결함/변형 (중간 수준) ──
  {
    rating: 5,
    level: '중간',
    keywords: ['부적합', '부적합품'],
    excludes: ['경미', '약간', '미세'],
    weight: 0.9,
  },
  {
    rating: 5,
    level: '중간',
    keywords: ['결함', '하자'],
    excludes: ['경미', '약간', '미세', '외관'],
    weight: 0.9,
  },
  {
    rating: 5,
    level: '중간',
    keywords: ['변형', '휨', '뒤틀림', '벤딩'],
    excludes: ['경미', '약간', '미세'],
    weight: 0.9,
  },
  {
    rating: 5,
    level: '중간',
    keywords: ['오염', '이물', '이물질'],
    excludes: ['경미', '약간', '미세'],
    weight: 0.9,
  },

  // ══════════════════════════════════════════
  // S=4: 100% 스테이션 내 재작업 (AIAG: 중간)
  // YP: 100% 스테이션에서 재작업
  // ══════════════════════════════════════════
  {
    rating: 4,
    level: '중간',
    keywords: ['스테이션', '공정내', '공정 내'],
    requires: ['재작업', '100%', '전수'],
    weight: 1.2,
  },
  {
    rating: 4,
    level: '중간',
    keywords: ['라인내 재작업', '라인 내 재작업'],
    excludes: ['일부', '선별'],
    weight: 1.1,
  },
  {
    rating: 4,
    level: '중간',
    keywords: ['외관'],
    requires: ['심한', '매우', '중대', '불량'],
    weight: 1.0,
  },
  // ── S=4 확장: 치수/규격/공차 관련 결함 ──
  {
    rating: 4,
    level: '중간',
    keywords: ['치수', '규격이탈', '공차이탈', '공차초과', '치수불량', '치수 불량'],
    weight: 0.95,
  },
  {
    rating: 4,
    level: '중간',
    keywords: ['누락', '미삽입', '미장착', '미체결'],
    excludes: ['안전', '중대', '출하'],
    weight: 0.95,
  },
  {
    rating: 4,
    level: '중간',
    keywords: ['마모', '마멸', '침식'],
    weight: 0.9,
  },
  {
    rating: 4,
    level: '중간',
    keywords: ['편심', '편차', '틀어짐', '어긋남'],
    weight: 0.9,
  },

  // ══════════════════════════════════════════
  // S=3: 일부 스테이션 내 재작업 (AIAG: 낮음)
  // YP: 일부 제품을 스테이션 내에서 재작업
  // ══════════════════════════════════════════
  {
    rating: 3,
    level: '낮음',
    keywords: ['일부', '경미한'],
    requires: ['재작업'],
    excludes: ['라인밖', '선별', '분해', '폐기'],
    weight: 1.0,
  },
  {
    rating: 3,
    level: '낮음',
    keywords: ['외관'],
    excludes: ['심한', '매우', '중대'],
    weight: 0.9,
  },
  // ── S=3 확장: 소음/진동/경미 결함 ──
  {
    rating: 3,
    level: '낮음',
    keywords: ['소음', '진동', 'nvh', '떨림'],
    excludes: ['심한', '중대', '안전'],
    weight: 0.85,
  },
  {
    rating: 3,
    level: '낮음',
    keywords: ['흠집', '스크래치', '찍힘', '눌림자국', '긁힘'],
    weight: 0.85,
  },

  // ══════════════════════════════════════════
  // S=2: 약간의 불편 (AIAG: 낮음)
  // YP: 공정, 작업 또는 작업자에게 약간의 불편
  // ══════════════════════════════════════════
  {
    rating: 2,
    level: '낮음',
    keywords: ['불편', '약간', '미세'],
    excludes: ['재작업', '폐기', '중단'],
    weight: 0.8,
  },

  // ══════════════════════════════════════════
  // S=1: 식별 가능한 영향 없음 (AIAG: 매우 낮음)
  // YP: 식별 가능한 영향이 없거나 영향이 없음
  // ══════════════════════════════════════════
  {
    rating: 1,
    level: '매우 낮음',
    keywords: ['영향없음', '영향 없음', '없음', '무영향', '식별 가능한 영향 없음'],
    weight: 0.7,
  },

  // ══════════════════════════════════════════
  // ★ 제네릭 폴백 규칙 (다른 규칙에 매칭되지 않을 때만 적용)
  //   weight를 낮추어 구체적 규칙보다 항상 후순위
  // ══════════════════════════════════════════
  {
    rating: 5,
    level: '중간 (추정)',
    keywords: ['불량'],
    excludes: ['외관', '경미', '약간', '미세', '재작업', '폐기', '선별', '영향없음'],
    weight: 0.6,
  },
  {
    rating: 3,
    level: '낮음 (추정)',
    keywords: ['불량'],
    requires: ['경미', '약간', '미세'],
    weight: 0.55,
  },
];

/**
 * FE 텍스트 전처리 — S접두사/번호/코드 제거, 괄호→공백, 소문자 정규화
 *
 * "S7:고객 대책서 요구(선별/재작업)" → "고객 대책서 요구 선별 재작업"
 */
function normalizeFE(text: string): string {
  return text
    // S접두사 제거: "S6:", "S10:" 등
    .replace(/^[Ss]\d{1,2}[:\-_]?\s*/g, '')
    // 번호 프리픽스 제거: "120번-", "A01-" 등
    .replace(/^\d+[번호#]?[\-_]?\s*/g, '')
    // 괄호 → 공백 (괄호 안 키워드도 매칭 가능하게)
    .replace(/[()[\]{}]/g, ' ')
    // 슬래시/콤마 → 공백 ("선별/재작업" → "선별 재작업")
    .replace(/[/,·]/g, ' ')
    // 공백 정규화
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * FE 텍스트에서 S접두사 심각도 추출 (예: "S6:..." → 6)
 * @returns 심각도 숫자 (1~10), 없으면 null
 */
function parseSeverityPrefix(text: string): number | null {
  const match = text.match(/^[Ss](\d{1,2})[:\-_]/);
  if (!match) return null;
  const val = parseInt(match[1], 10);
  return (val >= 1 && val <= 10) ? val : null;
}

/**
 * FE 텍스트에서 키워드가 포함되는지 확인 (공백 무시 매칭 포함)
 */
function containsKeyword(text: string, keyword: string): boolean {
  const kwLower = keyword.toLowerCase();
  if (text.includes(kwLower)) return true;
  // 공백 무시 매칭: "보조기능 상실" ↔ "보조 기능 상실"
  const textNoSpace = text.replace(/\s/g, '');
  const kwNoSpace = kwLower.replace(/\s/g, '');
  return textNoSpace.includes(kwNoSpace);
}

/**
 * 키워드 리스트 중 하나라도 텍스트에 포함되는지
 */
function containsAny(text: string, keywords: string[]): boolean {
  return keywords.some(kw => containsKeyword(text, kw));
}

/**
 * 키워드 리스트가 모두 텍스트에 포함되는지
 */
function containsAll(text: string, keywords: string[]): boolean {
  return keywords.every(kw => containsKeyword(text, kw));
}

export interface SeverityMatch {
  rating: number;
  level: string;
  score: number;
  matchedKeywords: string[];
  ruleIndex: number;
}

// =====================================================
// FE 직접 매핑 테이블 (AIAG-VDA 근거 — 키워드 매칭보다 1순위)
// =====================================================

interface FEDirectEntry {
  fe: string;
  severity: number;
  scope?: string;
  rationale: string;
}

const FE_DIRECT_MAP: FEDirectEntry[] = [
  // USER
  { fe: '제품 손실', severity: 8, scope: 'USER', rationale: '고객 사용 불가, 제품 전수 폐기' },
  { fe: 'N/A', severity: 1, rationale: '영향 없음' },
  // SP — Customer Yield Spec
  { fe: 'FT Yield 저하', severity: 6, scope: 'SP', rationale: '고객 생산 편의기능 저하(부분 수율 감소)' },
  { fe: 'Yield Drop→고객 Capa Drop', severity: 7, scope: 'SP', rationale: '고객 생산능력 심각 저하' },
  { fe: '수율 감소/저하', severity: 6, scope: 'SP', rationale: '고객 생산 편의기능 저하' },
  { fe: '제품 수율감소/저하', severity: 6, scope: 'SP', rationale: '고객 생산 편의기능 저하' },
  // SP — Visual / Customer Spec
  { fe: '외관 불량', severity: 5, scope: 'SP', rationale: '고객 인지 가능 결함(불편)' },
  { fe: '인식 불량', severity: 6, scope: 'SP', rationale: '고객 Lot 관리 기능 저하' },
  { fe: '제품 손실', severity: 8, scope: 'SP', rationale: '고객 제품 전수 폐기' },
  { fe: '제품 특성 이상', severity: 6, scope: 'SP', rationale: '고객 제품 부분 기능 저하' },
  { fe: '패널 불량', severity: 6, scope: 'SP', rationale: '고객 후공정 부분 기능 저하' },
  // SP — Assembly Spec
  { fe: '제품 조립 불가', severity: 8, scope: 'SP', rationale: '고객 조립 공정 운행 불가 (기능 상실)' },
  { fe: '조립 불량', severity: 7, scope: 'SP', rationale: '고객 조립 성능 심각 저하' },
  { fe: '조립 수율 감소', severity: 6, scope: 'SP', rationale: '고객 조립 편의기능 저하' },
  // SP — Functional Test Spec
  { fe: 'PKG TEST 불량', severity: 7, scope: 'SP', rationale: '고객 기능시험 불합격 → 성능 심각 저하' },
  { fe: '기능 불량', severity: 7, scope: 'SP', rationale: '고객 제품 기능 상실 수준' },
  { fe: '기능 저하', severity: 6, scope: 'SP', rationale: '고객 제품 부분 기능 저하' },
  { fe: '부품 기능 이상', severity: 7, scope: 'SP', rationale: '고객 제품 기능 심각 저하' },
  { fe: '제품 기능 손실', severity: 8, scope: 'SP', rationale: '고객 제품 기능 완전 상실' },
  { fe: '제품 기능 이상/저하', severity: 7, scope: 'SP', rationale: '고객 제품 기능 심각 저하' },
  { fe: '고객불만', severity: 8, scope: 'SP', rationale: '고객 클레임, 납품 중단 위험' },
  // YP — Process Yield Spec (Wafer)
  { fe: 'Wafer LOSS/Broken', severity: 8, scope: 'YP', rationale: '자사 Wafer 전수 폐기 (기능 상실)' },
  { fe: 'Wafer Yield 저하', severity: 6, scope: 'YP', rationale: '자사 수율 부분 저하' },
  // YP — Process Yield Spec (Au Bump)
  { fe: 'Yield Drop', severity: 6, scope: 'YP', rationale: '자사 공정 수율 편의기능 저하' },
  { fe: 'Yield Drop+Test Fail', severity: 7, scope: 'YP', rationale: '자사 수율+기능 복합 심각 저하' },
  { fe: 'Yield Drop→Capa Drop', severity: 7, scope: 'YP', rationale: '자사 생산능력 심각 저하' },
  { fe: 'Yield Mismatch', severity: 7, scope: 'YP', rationale: '자사 Lot 관리 기능 심각 저하' },
  { fe: '수율 감소/저하', severity: 6, scope: 'YP', rationale: '자사 공정 수율 부분 저하' },
  { fe: '제품 기능이상', severity: 7, scope: 'YP', rationale: '자사 제품 기능 심각 저하' },
  { fe: '제품 손상', severity: 7, scope: 'YP', rationale: '자사 Wafer 부분 손상 → 성능 저하' },
  { fe: '제품 손실', severity: 8, scope: 'YP', rationale: '자사 Wafer 전수 폐기' },
  { fe: '제품 특성 불량/이상', severity: 6, scope: 'YP', rationale: '자사 Spec Out → 부분 기능 저하' },
  { fe: '고객불만', severity: 8, scope: 'YP', rationale: '고객 클레임, 자사 신뢰도 상실' },
  { fe: '공정 skip/미진행', severity: 7, scope: 'YP', rationale: '공정 누락 → 후공정 전수 불량 위험' },
  { fe: '불량 유출', severity: 8, scope: 'YP', rationale: '불량 Wafer 후공정 유출 → 고객 영향' },
  { fe: '외관 불량', severity: 5, scope: 'YP', rationale: '자사 외관 결함 인지 (불편)' },
  { fe: '환경 이상', severity: 4, scope: 'YP', rationale: '환경 기준 이탈 → 경미 결함 가능' },
];

/** 정규화된 FE 텍스트로 직접 매핑 조회 (scope 우선, 없으면 scope 무관 매칭) */
function matchDirectFE(feText: string, feScope?: string): FEDirectEntry | undefined {
  const n = feText.normalize('NFKC').trim().replace(/\s+/g, ' ');
  const nLower = n.toLowerCase();

  // 1순위: scope + 텍스트 정확 매칭
  if (feScope) {
    const scopeUpper = feScope.toUpperCase();
    const exact = FE_DIRECT_MAP.find(e =>
      e.scope === scopeUpper && e.fe.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase() === nLower
    );
    if (exact) return exact;
  }

  // 2순위: 텍스트만 매칭 (scope 무관 — 첫 번째 매칭)
  return FE_DIRECT_MAP.find(e =>
    e.fe.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase() === nLower
  );
}

/**
 * ★ FE 텍스트 → 심각도(S) 추천
 *
 * 우선순위: 1) 직접 매핑 테이블  2) S접두사  3) 키워드 규칙
 *
 * @param feText 고장영향(FE) 텍스트
 * @param feScope FE 구분 (YP/SP/USER) — 직접 매핑 시 scope 우선 매칭
 * @returns 매칭된 심각도 후보 (점수 내림차순), 없으면 빈 배열
 */
export function matchFESeverity(feText: string, feScope?: string): SeverityMatch[] {
  if (!feText || !feText.trim()) return [];

  // ★ 1순위: 직접 매핑 테이블 (AIAG-VDA 확정값)
  const direct = matchDirectFE(feText, feScope);
  if (direct) {
    const rule = PFMEA_SEVERITY_RULES.find(r => r.rating === direct.severity);
    return [{
      rating: direct.severity,
      level: rule?.level || `S=${direct.severity}`,
      score: 3.0,  // 직접 매핑 = 최고 점수
      matchedKeywords: [`직접매핑: ${direct.rationale}`],
      ruleIndex: -1,
    }];
  }

  // ★ 2순위: S접두사 파싱 ("S6:보조 기능 상실..." → S=6)
  const prefixS = parseSeverityPrefix(feText.trim());
  if (prefixS !== null) {
    const rule = PFMEA_SEVERITY_RULES.find(r => r.rating === prefixS);
    return [{
      rating: prefixS,
      level: rule?.level || `S=${prefixS}`,
      score: 2.0,  // 접두사 매칭 = 최고 점수
      matchedKeywords: [`S${prefixS}: prefix`],
      ruleIndex: rule ? PFMEA_SEVERITY_RULES.indexOf(rule) : -1,
    }];
  }

  const normalized = normalizeFE(feText);
  const matches: SeverityMatch[] = [];

  PFMEA_SEVERITY_RULES.forEach((rule, ruleIdx) => {
    // 1. 제외 키워드 체크 — 있으면 이 규칙 스킵
    if (rule.excludes && containsAny(normalized, rule.excludes)) return;

    // 2. 필수 키워드 매칭 (OR 조건)
    const matchedKws = rule.keywords.filter(kw => containsKeyword(normalized, kw));
    if (matchedKws.length === 0) return;

    // 3. requires 조건 체크 (AND 조건)
    if (rule.requires && !containsAny(normalized, rule.requires)) return;

    // 4. 점수 계산
    const keywordRatio = matchedKws.length / rule.keywords.length;
    const weight = rule.weight ?? 1.0;
    const score = keywordRatio * weight;

    matches.push({
      rating: rule.rating,
      level: rule.level,
      score,
      matchedKeywords: matchedKws,
      ruleIndex: ruleIdx,
    });
  });

  // 점수 내림차순 정렬 (동점 시 높은 rating 우선)
  matches.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.rating - a.rating;
  });

  return matches;
}

/**
 * FE 텍스트 → 최적 심각도 1건 반환
 */
export function getBestSeverity(feText: string): SeverityMatch | null {
  const matches = matchFESeverity(feText);
  return matches.length > 0 ? matches[0] : null;
}
