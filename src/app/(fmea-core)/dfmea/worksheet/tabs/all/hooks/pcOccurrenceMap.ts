/**
 * @file pcOccurrenceMap.ts
 * @description 발생도(O) AIAG-VDA FMEA Handbook 1st Edition 보수적 기준 — v3.0
 *
 *   설계검증 예방(PC) 텍스트에서 키워드를 매칭하여 O값 직접 산정.
 *   ★ v3.0: AIAG-VDA 1st Ed. 보수적 기준 전면 적용
 *
 *   ─────────────────────────────────────────────────
 *   O=1  고장 원천 제거 (설계적 원천차단, 자동화 대체)
 *   O=2  에러프루프 / 인터록 (물리적 차단, 사람 개입 無)
 *   O=3  자동식별 + SPC + 환경관리 + 검교정 (기계/시스템 기반)
 *   O=4  MSA + PM + 파라미터관리 + 공구관리 (간접/체계적 관리)
 *   O=5  교육/훈련 + 표준/절차 + 역량인증 + 이종자재관리 (사람/문서 의존)
 *   O≥6  설계검증 예방 없음 / 키워드 미매칭
 *   ─────────────────────────────────────────────────
 *
 *   ★ 핵심 변경 (v2.1 → v3.0):
 *     - SPC: O=4→O=3 (자동 기반 관리)
 *     - MSA: O=3→O=4 (보수적: 간접 관리)
 *     - 교육/훈련: O=4→O=5 (사람 의존 = 보수적)
 *     - 표준/절차/WI/체크리스트: O=4→O=5 (문서 기반 = 보수적)
 *     - 역량인증: O=4→O=5 (사람 의존)
 *     - 이종자재/선입선출/세척: O=4→O=5 (사람 의존)
 *     - PM/정기점검: O=4→O=4 (유지)
 *     - 파라미터관리: O=4→O=4 (유지)
 *
 * @created 2026-02-05
 * @updated 2026-03-02 v3.0 AIAG-VDA 보수적 기준 전면 개편
 */

interface MaturityRule {
  keywords: string[];
  maturityLevel: string;
  oDefault: number;
}

const MATURITY_RULES: MaturityRule[] = [
  // ══════════════════════════════════════════════
  // O=2: 에러프루프 / 인터록 (물리적 차단, 사람 개입 無)
  // ══════════════════════════════════════════════
  {
    keywords: ['Poka-Yoke', 'poka-yoke', '포카요케', '에러프루프', '에러프루핑',
               '실수방지', '풀프루프', '물리적 차단', '원천차단', 'error-proof'],
    maturityLevel: '에러프루프 (원인 물리적 차단)',
    oDefault: 2,
  },
  {
    keywords: ['인터록', 'interlock', '자동차단', '투입중지', '투입차단',
               '라인정지', '자동정지'],
    maturityLevel: '인터록/자동차단 (투입중지 연계)',
    oDefault: 2,
  },
  {
    keywords: ['물리적 방지', '구조적 방지'],
    maturityLevel: '구조적 물리 방지',
    oDefault: 2,
  },

  // ══════════════════════════════════════════════
  // O=3: 자동식별 + SPC + 환경관리 + 검교정 (기계/시스템 기반)
  // ══════════════════════════════════════════════
  {
    keywords: ['바코드', 'QR 스캔', 'QR스캔', 'PDA 스캔', 'PDA스캔',
               'RFID', '자동식별', '바코드 스캔', '자동스캔'],
    maturityLevel: '자동식별 (잘못된 투입 방지)',
    oDefault: 3,
  },
  {
    keywords: ['자동검사', '비전검사', '인라인 검사', '자동판정', '자동계측',
               '카메라검사', 'AOI', '자동광학'],
    maturityLevel: '자동검사/자동판정',
    oDefault: 3,
  },
  {
    // ★ SPC: O=4→O=3 (자동 기반 통계적 관리 = 기계 기반)
    keywords: ['SPC', '통계적 관리', '관리도', 'X-bar', 'Cpk', 'Ppk', '공정능력'],
    maturityLevel: 'SPC/통계적 공정관리 (자동기반)',
    oDefault: 3,
  },
  {
    // 검교정: O=3 유지 (기계적 계측관리)
    keywords: ['검교정', 'Calibration', 'calibration', '교정주기', '정기교정',
               '센서 교정', '마스터 검증', '교정 주기', '교정('],
    maturityLevel: '체계적 계측관리 (검교정)',
    oDefault: 3,
  },
  {
    // ★ 환경관리: O=3 (자동/시스템 기반 — 온습도 항온항습 자동제어)
    keywords: ['온습도', '항온항습', '환경관리', '환경 관리', '클린룸', '청정실',
               '환기', '온도제어', '습도제어', '공조', '에어컨'],
    maturityLevel: '환경관리 (자동제어 시스템)',
    oDefault: 3,
  },

  // ══════════════════════════════════════════════
  // O=4: MSA + PM + 파라미터관리 + 공구관리 (간접/체계적 관리)
  // ══════════════════════════════════════════════
  {
    // ★ MSA: O=3→O=4 (보수적: 간접 관리 — 측정 '시스템'을 관리하는 것)
    keywords: ['MSA', 'Gage R&R', 'GR&R', 'gage r&r', 'gr&r',
               '측정시스템분석', '측정시스템 분석'],
    maturityLevel: '측정시스템 설계검증 예방 (MSA)',
    oDefault: 4,
  },
  {
    // 공구/토크 관리: O=4 유지
    keywords: ['토크 관리', '토크관리', '토크 설정', '토크설정', '전동드라이버',
               '토크렌치', '토크 모니터링'],
    maturityLevel: '공구/파라미터 관리',
    oDefault: 4,
  },
  {
    // PM/예방보전: O=4 유지
    keywords: ['예방보전', '설비 PM', 'PM 관리', 'PM관리', '금형 PM', '정기점검',
               '설비점검', '예방정비', '지그 수명', '설비 점검', '에어블로우', '집진',
               '필터 교체', '일상점검', '시업점검', '설비 관리', '설비관리', '정기 점검',
               'PM', 'TPM', '교체주기', '교체 주기', '수명관리', '수명 관리',
               '윤활', '드레싱', '레귤레이터', '필터/'],
    maturityLevel: '예방보전(PM)',
    oDefault: 4,
  },
  {
    // 파라미터/셋업 관리: O=4 유지
    keywords: ['도포기 파라미터', '설정값 관리', '공정 파라미터', '파라미터 관리', '레시피 관리',
               '설정값', '파라미터', '이력 관리', '이력관리', '변경 이력', '조건 관리',
               '온도', '프로파일', '온도프로파일', '온도 프로파일', '온도관리', '온도 관리',
               '온도설정', '온도 설정', '히터', '냉각', '가열', 'PLC', '모니터링',
               '정량 관리', '정량관리', '관리표', '전류', '전압', '타수', '압력',
               '도포량', '보관 조건', '보관조건', '습도'],
    maturityLevel: '공정 파라미터 관리',
    oDefault: 4,
  },
  {
    // 로봇/설비/마스터 관리: O=4 유지
    keywords: ['마스터 샘플', '마스터샘플', '마스터 관리', '기준편', '한도견본 관리',
               '로봇', '원점', '소모품', '마모량', '마모 측정', '진동', '소음',
               '유효기간'],
    maturityLevel: '설비/기구 관리',
    oDefault: 4,
  },

  // ══════════════════════════════════════════════
  // O=5: 교육/훈련 + 표준/절차 + 역량인증 + 이종자재 (사람/문서 의존)
  // ══════════════════════════════════════════════
  {
    // ★ 교육/훈련: O=4→O=5 (사람 의존 = 보수적 평가)
    keywords: ['교육', '숙련', '훈련', 'OJT', '직무교육', '안전교육',
               '정기교육', '정기 교육', '숙련도', '교육훈련', '정도관리'],
    maturityLevel: '체계적 교육/훈련 (사람 의존)',
    oDefault: 5,
  },
  {
    // ★ 표준/절차/WI: O=4→O=5 (문서 기반 = 보수적 평가)
    keywords: ['작업표준서', 'WI', '작업표준', '기술표준', '품질표준', '검사표준', '관리표준',
               '표준작업', '작업지도', '작업절차', '절차서', '지침서', '매뉴얼',
               '표준화', '표준 관리', '설정표준', '설정 표준', '관리 체계', '검사 체계'],
    maturityLevel: '표준/절차 관리 (문서 기반)',
    oDefault: 5,
  },
  {
    // ★ 역량인증/자격: O=4→O=5 (사람 의존)
    keywords: ['역량인증', '자격인증', '숙련도 인증', '작업자 인증', '기능사',
               '면허', '자격증', '기능검정'],
    maturityLevel: '인적역량 인증 체계 (사람 의존)',
    oDefault: 5,
  },
  {
    // ★ 이종자재/식별관리: O=4→O=5 (사람 의존)
    keywords: ['이종자재', '이종품', '혼입방지', '식별교육', '식별표시',
               '자재 식별', '혼입 방지', '이종 자재', '선입선출', 'FIFO',
               'LOT 추적', 'LOT추적', '포장 관리', '포장관리', '방습', '방청',
               '세척', '청소'],
    maturityLevel: '이종자재 식별 관리 (사람 의존)',
    oDefault: 5,
  },
  {
    // ★ 체크리스트/점검표: O=4→O=5 (문서 기반)
    keywords: ['체크리스트', '확인표', '검사기준서', '판정', '합격 판정'],
    maturityLevel: '체크리스트/점검표 관리 (문서 기반)',
    oDefault: 5,
  },
];

/**
 * PC 텍스트에서 AIAG-VDA 1st Ed. 보수적 기준으로 O값을 직접 산정
 * 복수 키워드 매칭 시 가장 낮은(효과 높은) O값 적용
 */
export function correctOccurrence(pcText: string): { correctedO: number | null; matchedLevel: string; reason: string } {
  if (!pcText || !pcText.trim()) {
    return { correctedO: null, matchedLevel: '', reason: '설계검증 예방 텍스트 없음' };
  }

  // ★ 접두사 제거: P: 자동추천 + m4 카테고리 (MC_, MN_, IM_, EN_)
  const text = pcText.toLowerCase()
    .replace(/^p[: ]\s*/gm, '')
    .replace(/^(mn|mc|im|en)_\s*/gm, '')
    .trim();
  let bestO = 10;
  let bestLevel = '';
  let matched = false;

  for (const rule of MATURITY_RULES) {
    for (const kw of rule.keywords) {
      if (text.includes(kw.toLowerCase())) {
        matched = true;
        if (rule.oDefault < bestO) {
          bestO = rule.oDefault;
          bestLevel = rule.maturityLevel;
        }
        break;
      }
    }
  }

  if (matched) {
    return { correctedO: bestO, matchedLevel: bestLevel, reason: `설계검증 예방(${bestLevel}) → O=${bestO}` };
  }

  return { correctedO: null, matchedLevel: '', reason: '키워드 미매칭 — 추천 없음' };
}
