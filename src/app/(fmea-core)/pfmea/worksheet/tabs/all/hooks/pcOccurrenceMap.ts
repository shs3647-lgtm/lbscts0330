/**
 * @file pcOccurrenceMap.ts
 * @description 발생도(O) 키워드 추론 — v4.0 SOD기준표 + 산업DB 기반
 *
 *   ★ v4.0: SOD기준표(public.pfmea_occurrence_criteria) + 산업DB(kr_industry_prevention) 단어만 사용
 *   ★ 포카요케/에러프루프/Cpk 키워드 삭제 — AIAG-VDA FMEA에서 미사용
 *   ★ O=1 추천 금지 (엔지니어만 판단)
 *
 *   ─────────────────────────────────────────────────
 *   O=2  인터록, 자동차단, UPS/AVR, 진공도 인터록 (산업DB)
 *   O=3  SPC, 실시간 모니터링, 자동검사, 환경관리, 검교정 (산업DB)
 *   O=4  PM, MSA, 파라미터관리, Recipe 승인, 입고검사 (산업DB)
 *   O=5  교육/훈련, 작업표준, 역량인증 (산업DB)
 *   O≥6  키워드 미매칭 → 누락 (추천 안 함)
 *   ─────────────────────────────────────────────────
 *
 * @created 2026-02-05
 * @updated 2026-03-26 v4.0 SOD기준표+산업DB 기반 전면 개편
 */

interface MaturityRule {
  keywords: string[];
  maturityLevel: string;
  oDefault: number;
}

const MATURITY_RULES: MaturityRule[] = [
  // ══════════════════════════════════════════════
  // O=2: 실증된 예방관리 (SOD기준표: Cpk≥2.0, 고장이력 0건)
  // 산업DB: 인터록, UPS/AVR, 진공도 인터록
  // ══════════════════════════════════════════════
  {
    keywords: ['인터록', 'interlock', '자동차단', '투입중지', '투입차단',
               '라인정지', '자동정지'],
    maturityLevel: '인터록/자동차단 (산업DB: O=2)',
    oDefault: 2,
  },
  {
    keywords: ['UPS', 'AVR', '전원 안정화', '전원안정화'],
    maturityLevel: '전원 안정화 장치 (산업DB: O=2)',
    oDefault: 2,
  },
  {
    keywords: ['진공도 인터록', '진공 인터록', '기밀 점검'],
    maturityLevel: '진공 챔버 기밀 + 인터록 (산업DB: O=2)',
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
    // 산업DB: SPC 실시간 관리 (X-bar R Chart) → O=3
    keywords: ['SPC', '통계적 관리', '관리도', 'X-bar', '공정능력'],
    maturityLevel: 'SPC 실시간 관리 (산업DB: O=3)',
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
    maturityLevel: '측정시스템 예방관리 (MSA)',
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
  {
    // 산업DB: 입고 검사 (IQC) + CoA 확인 → O=4
    keywords: ['입고 검사', '입고검사', 'IQC', '수입검사', '수입품질',
               'CoA', 'COC', '성적서', '자재 성적서', '자재성적서',
               '입고품질', '수입품질 관리'],
    maturityLevel: '입고검사/IQC (산업DB: O=4)',
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
    return { correctedO: null, matchedLevel: '', reason: '예방관리 텍스트 없음' };
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
    return { correctedO: bestO, matchedLevel: bestLevel, reason: `예방관리(${bestLevel}) → O=${bestO}` };
  }

  return { correctedO: null, matchedLevel: '', reason: '키워드 미매칭 — 추천 없음' };
}
