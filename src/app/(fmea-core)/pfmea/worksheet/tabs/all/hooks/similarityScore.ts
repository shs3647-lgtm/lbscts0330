/**
 * @file similarityScore.ts
 * @description FC(고장원인) ↔ B5/A6(예방/검출관리) 텍스트 유사도 점수 계산
 * - 한국산업 데이터 규칙 기반 키워드 매칭
 * - 고장유형→예방조치 매핑 (오염→세척, 마모→교체 등)
 * - 설비명 직접 매칭 (지그, 드라이버 등)
 * - 토큰 오버랩 + 바이그램 + 키워드 매칭 + 도메인 동의어 보너스
 * @created 2026-02-22
 * @updated 2026-02-23 — 한국산업 데이터 규칙 강화
 */

// =====================================================
// 한국 제조업 도메인 용어 시소러스 (동의어/관련어 그룹)
// =====================================================
const DOMAIN_SYNONYM_GROUPS: string[][] = [
  // 체결/조립
  ['볼트', '너트', '토크', '체결', '조립', '나사', '클램프', '리벳', '탭', '와셔', '스크류', '렌치', '풀림', '조임'],
  // 용접
  ['용접', '너겟', '스패터', '비드', '스폿', '아크', '납땜', '브레이징', '솔더', '접합', '강도부족'],
  // 도장/도포/코팅
  ['도장', '도포', '코팅', '프라이머', '건조', '경화', '도막', '박리', '부착', '도료', '페인트'],
  // 스캐너/검사장비/인식
  ['스캐너', 'pda', '바코드', 'qr', '카메라', '센서', '인식', '판독', '검출', '비전', '리더기'],
  // 금형/치공구/프레스
  ['금형', '지그', '치공구', '다이', '캐비티', '프레스', '펀치', '성형', '타발', '벤딩', '드로잉'],
  // 윤활/유압/오일
  ['오일', '그리스', '윤활', '유압', '누유', '씰', '패킹', '오링', '유량', '유압유', '작동유'],
  // 치수/측정/공차
  ['치수', '측정', '게이지', '공차', '변형', '편차', '마이크로미터', '캘리퍼', '검사', '측정기'],
  // 열처리/경도
  ['열처리', '경도', '템퍼링', '소입', '소려', '담금질', '어닐링', '퀜칭', '경화', '취성'],
  // 표면/외관/이물
  ['표면', '스크래치', '찍힘', '긁힘', '이물', '오염', '외관', '흠집', '타흔', '덴트', '버'],
  // 전기/전장
  ['전압', '전류', '저항', '합선', '단선', '절연', '통전', '배선', '커넥터', '납땜', 'pcb'],
  // 운반/물류/포장
  ['운반', '이송', '적재', '포장', '낙하', '충격', '컨베이어', '호이스트', '파렛트', '보관'],
  // 교육/숙련/작업표준
  ['교육', '훈련', '숙련', '작업표준', '표준서', 'ojt', '역량', '자격', '인증', '매뉴얼'],
  // 점검/유지보수/보전
  ['점검', '정비', '보전', '교체', '세척', '청소', '캘리브레이션', '교정', '검교정', '유지보수'],
  // 누출/기밀/리크
  ['누출', '기밀', '리크', '누유', '씰링', '패킹', '밀봉', '기포', '에어', '진공'],
  // 소재/재질/강도
  ['소재', '재질', '강도', '인장', '피로', '크랙', '파단', '균열', '부식', '녹', '산화'],
  // 온도/습도/환경
  ['온도', '습도', '환경', '항온', '항습', '냉각', '가열', '결로', '방습', '제습'],
  // 혼입/혼류/이종
  ['혼입', '혼류', '이종', '오삽입', '오조립', '역삽입', '미삽입', '식별', '라벨', '표시'],
  // 드라이버/공구
  ['드라이버', '전동드라이버', '에어드라이버', '임팩트', '소켓', '공구', '비트', '토크렌치'],
  // 실란트/접착
  ['실란트', '접착제', '본드', '실링', '시공', '도포량', '도포위치', '경화시간', '접착'],
];

// =====================================================
// ★★★ 고장유형 → 예방조치 매핑 (한국산업 데이터 규칙) ★★★
// FC 키워드 → PC에서 우선 매칭해야 할 키워드
// =====================================================
const FAILURE_TO_PREVENTION: Array<{ triggers: string[]; actions: string[] }> = [
  // 오염 관련
  { triggers: ['오염', '이물', '먼지', '분진', '잔류물'], actions: ['세척', '청소', '클리닝', '에어블로', '이물제거', '오염방지'] },
  // 마모 관련
  { triggers: ['마모', '닳음', '감모', '소모'], actions: ['교체', '점검', '마모점검', '교체주기', '수명관리', '정기교체'] },
  // 변형 관련
  { triggers: ['변형', '휨', '뒤틀림', '구부러짐', '벤딩'], actions: ['점검', '교정', '변형점검', '정기점검', '치수검사'] },
  // 파손/손상 관련
  { triggers: ['파손', '파괴', '손상', '깨짐', '균열', '크랙'], actions: ['교체', '점검', '파손점검', '손상점검', '외관검사'] },
  // 풀림/체결 관련
  { triggers: ['풀림', '이완', '느슨', '체결불량', '미체결'], actions: ['토크', '체결확인', '토크관리', '재체결', '토크점검', '조임'] },
  // 누설/누유 관련
  { triggers: ['누설', '누유', '누출', '리크', '유출'], actions: ['씰', '패킹', '교체', '기밀시험', '누유점검', '씰링'] },
  // 오작동/고장 관련
  { triggers: ['오작동', '미작동', '고장', '불량', '에러', '이상'], actions: ['점검', '보전', '유지보수', '정비', '예방보전', '정기점검'] },
  // 과다/과소 (토크, 압력, 양 등)
  { triggers: ['과다', '과소', '미달', '초과', '부족', '과대'], actions: ['검교정', '교정', '설정확인', '파라미터', '조건관리'] },
  // 위치/정렬 관련
  { triggers: ['오삽입', '미삽입', '역삽입', '오조립', '위치불량', '편심', '미스'], actions: ['지그', 'fool proof', '포카요케', '삽입확인', '위치확인', '정렬'] },
  // 온도/환경 관련
  { triggers: ['과열', '과냉', '온도이상', '습도이상', '결로'], actions: ['온도관리', '환경관리', '항온', '항습', '온도점검'] },
  // 숙련도/실수 관련
  { triggers: ['숙련도', '실수', '부주의', '미숙', '교육부족', '작업미숙'], actions: ['교육', '훈련', 'ojt', '작업표준', '표준서', '교육훈련'] },
  // 조립상태 관련
  { triggers: ['조립상태', '조립불량', '결합상태', '장착불량'], actions: ['조립확인', '체크리스트', '조립점검', '장착확인', '조립검사'] },
  // 설정/세팅 관련
  { triggers: ['설정오류', '세팅', '파라미터', '조건설정', '프로그램'], actions: ['설정확인', '조건관리', '파라미터관리', '검교정', '세팅확인'] },
  // 압력 관련
  { triggers: ['압력', '유압', '공압', '에어압'], actions: ['압력점검', '게이지', '검교정', '압력관리', '유압점검'] },
];

/**
 * 도메인 용어 역인덱스: 키워드 → 그룹번호 Set
 */
const KEYWORD_TO_GROUPS = new Map<string, Set<number>>();
DOMAIN_SYNONYM_GROUPS.forEach((group, groupIdx) => {
  group.forEach(keyword => {
    const key = keyword.toLowerCase();
    const existing = KEYWORD_TO_GROUPS.get(key) || new Set<number>();
    existing.add(groupIdx);
    KEYWORD_TO_GROUPS.set(key, existing);
  });
});

// =====================================================
// ★ 성능최적화: 내부 캐시 (매칭 세션 단위로 재사용)
// =====================================================
const _tokenCache = new Map<string, string[]>();
const _bigramCache = new Map<string, Set<string>>();
const _keywordCache = new Map<string, string[]>();
const _groupCache = new Map<string, Set<number>>();

/** 매칭 세션 시작 시 호출 — 이전 세션 캐시 정리 */
export function clearSimilarityCaches(): void {
  _tokenCache.clear();
  _bigramCache.clear();
  _keywordCache.clear();
  _groupCache.clear();
}

/** 텍스트 → 도메인 동의어 그룹 (캐시) */
function getTextSynonymGroups(text: string): Set<number> {
  const cached = _groupCache.get(text);
  if (cached) return cached;
  const lower = text.toLowerCase();
  const groups = new Set<number>();
  KEYWORD_TO_GROUPS.forEach((gSet, keyword) => {
    if (lower.includes(keyword)) gSet.forEach(g => groups.add(g));
  });
  _groupCache.set(text, groups);
  return groups;
}

/**
 * 한국어 텍스트를 토큰으로 분리
 * - 공백/특수문자 기준 분할
 * - 1글자 토큰 제거 (조사/접속사 노이즈)
 * - 소문자 정규화
 */
function tokenize(text: string): string[] {
  const cached = _tokenCache.get(text);
  if (cached) return cached;
  const result = text
    .replace(/[()[\]{}<>,.;:!?·…'""/\\|~`@#$%^&*+=\-_]/g, ' ')
    .split(/\s+/)
    .map(t => t.trim().toLowerCase())
    .filter(t => t.length >= 2);
  _tokenCache.set(text, result);
  return result;
}

/**
 * ★ FC 텍스트에서 핵심 키워드 추출 (한국산업 데이터 규칙)
 * - 번호/코드 프리픽스 제거 (예: "80번_MC_041-2")
 * - M4 코드 제거 (MN, MC, IM, EN)
 * - 설비명/공구명/자재명 + 고장유형 추출
 */
export function extractCoreKeywords(fcText: string): string[] {
  const cached = _keywordCache.get(fcText);
  if (cached) return cached;

  let clean = fcText
    // 번호 프리픽스 제거: "80번_MC_041-2", "A01-", "10#" 등
    .replace(/^\d+[번호#]?[_\-]?/g, '')
    .replace(/^[A-Z]\d+[\-_]?/gi, '')
    // M4 코드 제거: "MC_041-2", "MN_", "IM_", "EN_"
    .replace(/\b(MN|MC|MD|JG|IM|EN)[_\-]?(\d[\w\-]*)?/gi, '')
    // 특수문자 정리
    .replace(/[_\-]+/g, ' ')
    .trim();

  // 빈 문자열 방지
  if (!clean) clean = fcText;

  const tokens = tokenize(clean);
  // 불용어 제거 (너무 일반적인 단어)
  const stopwords = new Set(['불량', '발생', '원인', '인한', '의한', '따른', '관련', '미흡', '상태', '현상', '결과', '경우', '때문', '으로', '에서', '까지']);
  const result = tokens.filter(t => !stopwords.has(t));
  _keywordCache.set(fcText, result);
  return result;
}

/**
 * ★★★ 고장유형→예방조치 매핑 점수 (한국산업 데이터 규칙)
 * FC의 고장키워드가 FAILURE_TO_PREVENTION에 매칭되면,
 * PC 텍스트에 해당 예방조치 키워드가 있는지 체크
 * @returns 0 ~ 1 (매칭된 조치 키워드 비율)
 */
function failureToPreventionScore(fcKeywords: string[], pcText: string): number {
  const pcLower = pcText.toLowerCase();
  let matchedRules = 0;
  let totalRules = 0;

  for (const rule of FAILURE_TO_PREVENTION) {
    // FC에 trigger 키워드가 있는지
    const hasTrigger = rule.triggers.some(t => fcKeywords.some(k => k.includes(t) || t.includes(k)));
    if (!hasTrigger) continue;

    totalRules++;
    // PC에 action 키워드가 있는지
    const hasAction = rule.actions.some(a => pcLower.includes(a));
    if (hasAction) matchedRules++;
  }

  return totalRules > 0 ? matchedRules / totalRules : 0;
}

/**
 * ★ 설비명/공구명 직접 매칭 점수 (0 ~ 1)
 * FC와 PC에 동일한 설비명이 있으면 높은 점수
 */
function equipmentNameScore(fcKeywords: string[], pcText: string): number {
  const pcLower = pcText.toLowerCase();
  // 2글자 이상 키워드 중 PC에 포함된 것
  let matched = 0;
  let total = 0;
  for (const kw of fcKeywords) {
    if (kw.length < 2) continue;
    total++;
    if (pcLower.includes(kw)) matched++;
  }
  return total > 0 ? matched / total : 0;
}

/**
 * 문자열에서 2-gram (바이그램) 집합 추출
 */
function bigrams(text: string): Set<string> {
  const cached = _bigramCache.get(text);
  if (cached) return cached;
  const clean = text.replace(/\s+/g, '').toLowerCase();
  const set = new Set<string>();
  for (let i = 0; i < clean.length - 1; i++) {
    set.add(clean.slice(i, i + 2));
  }
  _bigramCache.set(text, set);
  return set;
}

/**
 * Jaccard 유사도 (두 집합의 교집합 / 합집합)
 */
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  a.forEach(v => { if (b.has(v)) intersection++; });
  const union = a.size + b.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * 도메인 동의어 보너스 점수 (0 ~ 1)
 */
function domainSynonymScore(fcText: string, controlText: string): number {
  // ★ 캐시된 그룹 조회 (동일 텍스트 반복 조회 방지)
  const fcGroups = getTextSynonymGroups(fcText);
  if (fcGroups.size === 0) return 0;

  const ctlGroups = getTextSynonymGroups(controlText);
  if (ctlGroups.size === 0) return 0;

  let sharedGroups = 0;
  fcGroups.forEach(g => { if (ctlGroups.has(g)) sharedGroups++; });
  const totalGroups = new Set([...fcGroups, ...ctlGroups]).size;
  return totalGroups > 0 ? sharedGroups / totalGroups : 0;
}

/**
 * FC(고장원인) ↔ B5/A6(예방/검출관리) 유사도 점수 (0 ~ 1)
 *
 * ★ 2026-02-23 개선: 6가지 기법 가중 합산 (한국산업 데이터 규칙 강화)
 *   1) 설비명/공구명 직접 매칭            — 25% (신규: 지그→지그, 드라이버→드라이버)
 *   2) 고장유형→예방조치 매핑 보너스      — 25% (신규: 오염→세척, 마모→교체)
 *   3) 토큰 오버랩 (Jaccard on words)     — 15%
 *   4) 바이그램 오버랩 (Jaccard on 2-grams) — 10%
 *   5) 부분문자열 포함 보너스              — 5%
 *   6) 제조업 도메인 동의어 보너스         — 20%
 */
export function scoreSimilarity(fcText: string, b5Value: string): number {
  if (!fcText || !b5Value) return 0;

  const fcClean = fcText.trim();
  const b5Clean = b5Value.trim();
  if (!fcClean || !b5Clean) return 0;

  // ★ 핵심 키워드 추출 (번호/M4코드 제거)
  const fcKeywords = extractCoreKeywords(fcClean);

  // 1. ★ 설비명/공구명 직접 매칭 (25%)
  const equipScore = equipmentNameScore(fcKeywords, b5Clean);

  // 2. ★ 고장유형→예방조치 매핑 (25%)
  const f2pScore = failureToPreventionScore(fcKeywords, b5Clean);

  // 3. 토큰 오버랩 (15%)
  const fcTokens = new Set(tokenize(fcClean));
  const b5Tokens = new Set(tokenize(b5Clean));
  const tokenScore = jaccard(fcTokens, b5Tokens);

  // 4. 바이그램 오버랩 (10%)
  const fcBigrams = bigrams(fcClean);
  const b5Bigrams = bigrams(b5Clean);
  const bigramScore = jaccard(fcBigrams, b5Bigrams);

  // 5. 부분문자열 포함 보너스 (5%)
  let substringBonus = 0;
  const b5Lower = b5Clean.toLowerCase();
  const fcLower = fcClean.toLowerCase();
  let containCount = 0;
  let totalTokens = 0;
  fcTokens.forEach(t => { totalTokens++; if (b5Lower.includes(t)) containCount++; });
  b5Tokens.forEach(t => { totalTokens++; if (fcLower.includes(t)) containCount++; });
  if (totalTokens > 0) substringBonus = containCount / totalTokens;

  // 6. 도메인 동의어 보너스 (20%)
  const domainScore = domainSynonymScore(fcClean, b5Clean);

  return equipScore * 0.25 + f2pScore * 0.25 + tokenScore * 0.15 + bigramScore * 0.10 + substringBonus * 0.05 + domainScore * 0.20;
}

/**
 * 후보 목록을 FC 텍스트와의 유사도 기준으로 정렬
 * @param fcText 고장원인 텍스트
 * @param candidates B5 후보 목록
 * @returns 유사도 내림차순 정렬된 후보 (원본 불변)
 */
export function rankBySimlarity<T extends { value: string }>(
  fcText: string,
  candidates: T[],
): T[] {
  if (candidates.length <= 1) return candidates;
  return [...candidates].sort((a, b) => {
    const scoreA = scoreSimilarity(fcText, a.value);
    const scoreB = scoreSimilarity(fcText, b.value);
    return scoreB - scoreA;
  });
}
