/**
 * @file bilingual-labels.ts
 * @description FMEA 한글(약어) + tooltip(원어) 용어사전
 *
 * 사용법:
 *   import { bl, blText, blTitle } from '@/lib/bilingual-labels';
 *
 *   // JSX에서:
 *   <th title={blTitle('심각도')}>{ blText('심각도') }</th>
 *   // 결과: <th title="Severity">심각도(S)</th>
 *
 *   // 약어가 없는 경우:
 *   <th title={blTitle('공정명')}>{ blText('공정명') }</th>
 *   // 결과: <th title="Process Name">공정명(Process Name)</th>
 */

interface BilingualEntry {
  /** 약어 (있으면 사용, 없으면 full 사용) */
  abbr?: string;
  /** 영문 전체명 (tooltip에 표시) */
  full: string;
}

/** FMEA 전문용어 사전: key = 한글 원문 */
const DICT: Record<string, BilingualEntry> = {
  // ═══════════════════════════════════════
  // FMEA 핵심 용어 (약어 있음)
  // ═══════════════════════════════════════
  '심각도': { abbr: 'S', full: 'Severity' },
  '발생도': { abbr: 'O', full: 'Occurrence' },
  '검출도': { abbr: 'D', full: 'Detection' },
  '고장영향': { abbr: 'FE', full: 'Failure Effect' },
  '고장형태': { abbr: 'FM', full: 'Failure Mode' },
  '고장원인': { abbr: 'FC', full: 'Failure Cause' },
  '고장영향(FE)': { abbr: 'FE', full: 'Failure Effect' },
  '고장형태(FM)': { abbr: 'FM', full: 'Failure Mode' },
  '고장원인(FC)': { abbr: 'FC', full: 'Failure Cause' },
  '예방관리': { abbr: 'PC', full: 'Prevention Control' },
  '검출관리': { abbr: 'DC', full: 'Detection Control' },
  '예방관리(PC)': { abbr: 'PC', full: 'Prevention Control' },
  '검출관리(DC)': { abbr: 'DC', full: 'Detection Control' },
  'AP': { abbr: 'AP', full: 'Action Priority' },
  'RPN': { abbr: 'RPN', full: 'Risk Priority Number' },
  '특별특성': { abbr: 'SC', full: 'Special Characteristic' },
  '제품특성': { abbr: 'PC', full: 'Product Characteristic' },
  '공정특성': { abbr: 'PC', full: 'Process Characteristic' },
  '습득교훈': { abbr: 'LLD', full: 'Lessons Learned Document' },

  // ═══════════════════════════════════════
  // 구조/기능 분석 (약어 없음 → full 표시)
  // ═══════════════════════════════════════
  '완제품 공정명': { full: 'Product Process Name' },
  '완제품공정명': { full: 'Product Process Name' },
  'NO+공정명': { full: 'NO+Process Name' },
  '작업요소': { full: 'Work Element' },
  '완제품기능': { full: 'Product Function' },
  '요구사항': { full: 'Requirement' },
  '공정 기능': { full: 'Process Function' },
  '공정기능': { full: 'Process Function' },
  '작업요소 기능': { full: 'Work Element Function' },
  '작업요소기능': { full: 'Work Element Function' },

  // ═══════════════════════════════════════
  // 공정 관련
  // ═══════════════════════════════════════
  '공정번호': { abbr: 'P-No', full: 'Process Number' },
  '공정명': { full: 'Process Name' },
  '공정설명': { full: 'Process Description' },
  '공정현황': { full: 'Process Status' },
  '공정흐름': { full: 'Process Flow' },
  '공정상세': { full: 'Process Detail' },
  '레벨': { full: 'Level' },
  '부품명': { full: 'Part Name' },
  '설비/금형/JIG': { full: 'Equipment/Mold/JIG' },
  '설비/금형': { full: 'Equipment/Mold' },

  // ═══════════════════════════════════════
  // 최적화 (6단계)
  // ═══════════════════════════════════════
  '예방관리개선': { full: 'Prevention Control Improvement' },
  '검출관리개선': { full: 'Detection Control Improvement' },
  '예방개선': { full: 'Prevention Improvement' },
  '검출개선': { full: 'Detection Improvement' },
  '책임자성명': { full: 'Responsible Person' },
  '책임자': { full: 'Responsible Person' },
  '목표완료일자': { full: 'Target Completion Date' },
  '목표완료일': { full: 'Target Completion Date' },
  '목표일': { full: 'Target Date' },
  '개선결과근거': { full: 'Improvement Evidence' },
  '개선결과': { full: 'Improvement Result' },
  '완료일자': { full: 'Completion Date' },
  '완료일': { full: 'Completion Date' },
  '상태': { full: 'Status' },
  '비고': { full: 'Remarks' },

  // ═══════════════════════════════════════
  // CP (Control Plan) 컬럼
  // ═══════════════════════════════════════
  'EP': { abbr: 'EP', full: 'Error Proofing' },
  '자동': { full: 'Auto Detection' },
  'NO': { abbr: 'NO', full: 'Number' },
  'no': { abbr: 'No', full: 'Number' },
  '스펙/공차': { full: 'Spec/Tolerance' },
  '평가방법': { full: 'Evaluation Method' },
  '샘플크기': { full: 'Sample Size' },
  '주기': { full: 'Frequency' },
  '관리방법': { full: 'Control Method' },
  '책임1': { full: 'Owner 1' },
  '책임2': { full: 'Owner 2' },
  '조치방법': { full: 'Reaction Plan' },
  '관리항목': { full: 'Control Items' },
  '대응계획': { full: 'Reaction Plan' },
  'EP검사장치': { abbr: 'EP', full: 'Error Proofing Device' },

  // ═══════════════════════════════════════
  // PFD 컬럼
  // ═══════════════════════════════════════
  '작업': { full: 'Operation' },
  '운반': { full: 'Transport' },
  '저장(흐름)': { full: 'Storage' },
  '검사': { full: 'Inspection' },
  '제품SC': { abbr: 'SC', full: 'Product Special Characteristic' },
  '공정SC': { abbr: 'SC', full: 'Process Special Characteristic' },

  // ═══════════════════════════════════════
  // 워크시트 탭/단계
  // ═══════════════════════════════════════
  '구조분석': { full: 'Structure Analysis' },
  '기능분석': { full: 'Function Analysis' },
  '고장분석': { full: 'Failure Analysis' },
  '리스크분석': { full: 'Risk Analysis' },
  '최적화': { full: 'Optimization' },
  '전체보기': { full: 'All View' },
  '고장연결': { full: 'Failure Link' },
  '단계': { abbr: 'ST', full: 'Step' },

  // ═══════════════════════════════════════
  // 모달 제목
  // ═══════════════════════════════════════
  '고장영향 선택': { full: 'Select Failure Effect' },
  '고장형태 선택': { full: 'Select Failure Mode' },
  '고장원인 선택': { full: 'Select Failure Cause' },
  '사용자 선택': { full: 'Select User' },
  '특별특성 관리': { full: 'Special Characteristic Management' },
  'SOD 기준': { full: 'SOD Criteria' },
  '데이터 선택': { full: 'Data Select' },
  'FMEA 선택': { full: 'Select FMEA' },
  'APQP 선택': { full: 'Select APQP' },
  '문서 연결': { full: 'Document Link' },
  '사업장 정보': { full: 'Business Info' },
  'AP 기준': { full: 'Action Priority Criteria' },
  'AP 결과': { full: 'Action Priority Result' },

  // ═══════════════════════════════════════
  // 등록 폼 / 기초정보
  // ═══════════════════════════════════════
  '프로젝트명': { full: 'Project Name' },
  '완제품명': { full: 'Product Name' },
  '모델명': { full: 'Model Name' },
  '시작일': { full: 'Start Date' },
  '종료일': { full: 'End Date' },
  '담당자': { full: 'Responsible Person' },
  '품번': { full: 'Part Number' },
  '차종': { full: 'Vehicle Type' },
  '고객사': { full: 'Customer' },
  '사업장': { full: 'Business Site' },
  '부서': { full: 'Department' },
  '고객사명': { full: 'Customer Name' },
  '코드': { full: 'Code' },
  '공장': { full: 'Factory' },
  '등록일': { full: 'Registration Date' },

  // ═══════════════════════════════════════
  // 4M 카테고리
  // ═══════════════════════════════════════
  '4M': { abbr: '4M', full: 'Man/Machine/Material/Method' },
  '사람': { abbr: 'Man', full: 'Man' },
  '설비': { abbr: 'M/C', full: 'Machine' },
  '자재': { abbr: 'Mat', full: 'Material' },
  '환경': { abbr: 'Env', full: 'Environment' },
  '투입자재': { full: 'Input Material' },

  // ═══════════════════════════════════════
  // LLD (습득교훈) 컬럼
  // ═══════════════════════════════════════
  '구분': { full: 'Classification' },
  '적용': { full: 'Application' },
  '제품명': { full: 'Product Name' },
  'O값': { abbr: 'O', full: 'Occurrence Value' },
  'D값': { abbr: 'D', full: 'Detection Value' },
  '개선대책': { full: 'Improvement Action' },
  '대상': { full: 'Target' },
  '발생장소': { full: 'Occurrence Location' },
  '적용FMEA': { full: 'Applied FMEA' },
  '적용일자': { full: 'Application Date' },
  '고장모드': { full: 'Failure Mode' },

  // ═══════════════════════════════════════
  // 개정관리
  // ═══════════════════════════════════════
  '개정번호': { abbr: 'Rev', full: 'Revision Number' },
  '개정일': { full: 'Revision Date' },
  '변경이력': { full: 'Change History' },
  '검토': { full: 'Review' },
  '승인': { full: 'Approve' },
  '작성자': { full: 'Author' },
  '검토자': { full: 'Reviewer' },
  '승인자': { full: 'Approver' },

  // ═══════════════════════════════════════
  // 공통 버튼/라벨
  // ═══════════════════════════════════════
  '저장': { full: 'Save' },
  '취소': { full: 'Cancel' },
  '삭제': { full: 'Delete' },
  '추가': { full: 'Add' },
  '선택': { full: 'Select' },
  '확인': { full: 'OK' },
  '적용하기': { full: 'Apply' },
  '닫기': { full: 'Close' },
  '수정': { full: 'Edit' },
  '확정': { full: 'Confirm' },
  '행추가': { full: 'Add Row' },

  // ═══════════════════════════════════════
  // APQP
  // ═══════════════════════════════════════
  '작성일': { full: 'Created Date' },
  '개발레벨': { full: 'Development Level' },
  '현황': { full: 'Progress' },
  '활동명': { full: 'Activity Name' },
  '계획 시작': { full: 'Plan Start' },
  '계획 종료': { full: 'Plan End' },
  '실제 시작': { full: 'Actual Start' },
  '실제 종료': { full: 'Actual End' },
};

/**
 * locale별 bilingual 텍스트 반환
 * KO: 한글(약어) — 예: 심각도(S), 공정명(Process Name)
 * EN: English Full(한글) — 예: Severity(심각도), Process Name(공정명)
 */
export function blText(korean: string, locale: 'ko' | 'en' = 'ko'): string {
  let entry = DICT[korean];

  // Fallback: '고장영향(FE)' → '고장영향'으로 재검색
  const parenMatch = korean.match(/^(.+?)\(([^)]+)\)$/);
  if (!entry && parenMatch) {
    entry = DICT[parenMatch[1]];
  }

  if (!entry) return korean;

  if (locale === 'en') {
    const pureKorean = parenMatch ? parenMatch[1] : korean;
    return `${entry.full}(${pureKorean})`;
  }
  if (parenMatch) return korean; // 이미 '한글(약어)' 형식
  const display = entry.abbr || entry.full;
  return `${korean}(${display})`;
}

/**
 * tooltip용 반대 언어 반환
 * KO: '심각도' → 'Severity' (영문 풀단어)
 * EN: '심각도' → '심각도' (한글)
 */
export function blTitle(korean: string, locale: 'ko' | 'en' = 'ko'): string | undefined {
  let entry = DICT[korean];
  const parenMatch = korean.match(/^(.+?)\(([^)]+)\)$/);
  if (!entry && parenMatch) {
    entry = DICT[parenMatch[1]];
  }
  if (!entry) return undefined;
  const pureKorean = parenMatch ? parenMatch[1] : korean;
  return locale === 'en' ? pureKorean : entry.full;
}

/**
 * { text, title } 객체 반환 (JSX spread 용)
 * 예: const { text, title } = bl('심각도', locale)
 *     <th title={title}>{text}</th>
 */
export function bl(korean: string, locale: 'ko' | 'en' = 'ko'): { text: string; title: string | undefined } {
  return {
    text: blText(korean, locale),
    title: blTitle(korean, locale),
  };
}

/**
 * 컬럼 정의 name 필드를 bilingual로 변환 + title 추가
 * KO: colBl('심각도') → { name: '심각도(S)', title: 'Severity' }
 * EN: colBl('심각도', 'en') → { name: 'Severity(심각도)', title: '심각도' }
 */
export function colBl(name: string, locale: 'ko' | 'en' = 'ko'): { name: string; title?: string } {
  const entry = DICT[name];
  if (!entry) return { name };

  if (locale === 'en') {
    return {
      name: `${entry.full}(${name})`,
      title: name,
    };
  }
  const display = entry.abbr || entry.full;
  return {
    name: `${name}(${display})`,
    title: entry.full,
  };
}

/** 사전 엔트리 직접 조회 */
export function getBilingualEntry(korean: string): BilingualEntry | undefined {
  return DICT[korean];
}

/** 사전에 등록된 모든 키 */
export function getAllKeys(): string[] {
  return Object.keys(DICT);
}
