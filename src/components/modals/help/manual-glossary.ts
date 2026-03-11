/**
 * @file manual-glossary.ts
 * @description FMEA 용어집 도움말
 *
 * 카테고리: 용어집
 * 소스: 00_glossary.md
 */

import type { ManualItem } from './types';

export const GLOSSARY_ITEMS_KO: ManualItem[] = [
  {
    category: '용어집',
    title: 'FMEA 기본 용어',
    content:
      '■ FMEA (Failure Mode and Effects Analysis)\n' +
      '고장모드 영향분석. 잠재적 고장을 사전에 분석하여 예방하는 품질 도구\n\n' +
      '■ PFMEA (Process FMEA)\n' +
      '공정 고장모드 영향분석. 제조 공정 대상\n\n' +
      '■ DFMEA (Design FMEA)\n' +
      '설계 고장모드 영향분석. 제품 설계 대상\n\n' +
      '■ AIAG (Automotive Industry Action Group)\n' +
      '미국 자동차산업 실행그룹. FMEA 표준 발행 기관\n\n' +
      '■ VDA (Verband der Automobilindustrie)\n' +
      '독일 자동차산업협회\n\n' +
      '■ IATF 16949\n' +
      '자동차 품질경영시스템 국제 표준\n\n' +
      '■ APQP (Advanced Product Quality Planning)\n' +
      '양산품 품질 사전계획. 5단계 제품 개발 프로세스\n\n' +
      '■ CFT (Cross Functional Team)\n' +
      '다기능팀. 설계/품질/생산 등 다부서 합동 팀',
    keywords: ['FMEA', 'PFMEA', 'DFMEA', 'AIAG', 'VDA', 'IATF', 'APQP', 'CFT', '용어', '정의'],
  },
  {
    category: '용어집',
    title: '고장사슬 용어 (FE-FM-FC)',
    content:
      '■ 고장사슬 (Failure Chain)\n' +
      '고장영향(FE) ↔ 고장형태(FM) ↔ 고장원인(FC)의 연결 관계\n\n' +
      '■ FE (Failure Effect) — 고장영향\n' +
      '고장이 발생했을 때의 결과/영향\n\n' +
      '■ FM (Failure Mode) — 고장형태\n' +
      '잠재적으로 발생할 수 있는 고장의 유형\n\n' +
      '■ FC (Failure Cause) — 고장원인\n' +
      '고장형태를 발생시키는 근본 원인\n\n' +
      '■ failureLinks\n' +
      'DB에서 고장사슬 연결 정보를 저장하는 필드\n\n' +
      '■ 노드 (Node)\n' +
      'FMEA 워크시트의 계층 구조 각 항목 (공정/기능/고장형태 등)\n\n' +
      '■ 리프 노드 (Leaf Node)\n' +
      '하위 자식이 없는 최하위 노드',
    keywords: ['고장', 'FE', 'FM', 'FC', '영향', '형태', '원인', '고장사슬', 'failure', 'chain', '연결', '노드'],
  },
  {
    category: '용어집',
    title: '리스크 평가 용어 (SOD, RPN, AP)',
    content:
      '■ S (Severity) — 심각도\n' +
      '고장영향의 심각한 정도 (1~10). 1=무영향, 10=안전/규제\n\n' +
      '■ O (Occurrence) — 발생도\n' +
      '고장원인의 발생 가능성 (1~10). 1=극히 낮음, 10=극히 높음\n\n' +
      '■ D (Detection) — 검출도\n' +
      '현재 관리방법의 검출 능력 (1~10). 1=거의 확실, 10=불가능\n\n' +
      '■ RPN (Risk Priority Number)\n' +
      '위험우선순위 = S × O × D (1~1000). AIAG 4판 방식\n\n' +
      '■ AP (Action Priority)\n' +
      'AIAG-VDA 1st Edition의 개선활동 우선순위\n' +
      'S×O×D 조합으로 H(High)/M(Medium)/L(Low) 결정\n\n' +
      '■ SOD\n' +
      'Severity, Occurrence, Detection의 약칭\n\n' +
      '■ Cpk (Process Capability Index)\n' +
      '공정능력지수. 공정이 규격 내에서 안정적인지 나타내는 지표',
    keywords: ['SOD', 'S', 'O', 'D', 'RPN', 'AP', '심각도', '발생도', '검출도', '리스크', '우선순위', 'severity', 'occurrence', 'detection'],
  },
  {
    category: '용어집',
    title: '구조/관리 용어 (L1-L3, 4M, PC, DC)',
    content:
      '■ L1 (Level 1) — 완제품/시스템\n' +
      'FMEA 기초정보 1레벨\n\n' +
      '■ L2 (Level 2) — 메인 공정\n' +
      'FMEA 기초정보 2레벨\n\n' +
      '■ L3 (Level 3) — 작업요소\n' +
      'FMEA 기초정보 3레벨\n\n' +
      '■ 4M — Man, Machine, Material, Method\n' +
      '작업자(MN), 설비(MC), 부자재(IM), 방법(EN). 공정의 4가지 구성 요소\n\n' +
      '■ PC (Prevention Control) — 예방관리\n' +
      '고장원인의 발생을 방지하는 관리활동\n\n' +
      '■ DC (Detection Control) — 검출관리\n' +
      '고장형태/원인을 검출하는 관리활동\n\n' +
      '■ CP (Control Plan) — 관리계획서\n' +
      '양산 품질 관리 항목/방법 정의 문서\n\n' +
      '■ PFD (Process Flow Diagram) — 공정흐름도\n\n' +
      '■ LLD (Lessons Learned Database) — 습득교훈 데이터베이스',
    keywords: ['L1', 'L2', 'L3', '4M', 'PC', 'DC', 'CP', 'PFD', 'LLD', '예방관리', '검출관리', '레벨', '구조'],
  },
  {
    category: '용어집',
    title: '특별특성 용어 (CC, SC, YC, YS)',
    content:
      '■ CC (Critical Characteristic)\n' +
      '치명적 특성. 안전/법규 관련 (S=9~10)\n\n' +
      '■ SC (Significant Characteristic)\n' +
      '중요 특성. 기능/성능 관련 (S=5~8)\n\n' +
      '■ IC (Important Characteristic)\n' +
      '중요 특성 (현대/기아). 기능/성능 관련 (S=5~8)\n\n' +
      '■ GC (General Characteristic)\n' +
      '일반 특성 (현대/기아)\n\n' +
      '■ YC (Potentially Critical)\n' +
      'DFMEA에서 식별된 잠재적 치명특성 (S=9~10)\n\n' +
      '■ YS (Potentially Significant)\n' +
      'DFMEA에서 식별된 잠재적 중요특성 (S=5~8)\n\n' +
      '■ HI (High Impact)\n' +
      '높은 영향 특성 (Ford). S=5~8 AND O=4~10, CFT 판단\n\n' +
      '■ OS (Operator Safety)\n' +
      '작업자 안전 특성 (Ford)\n\n' +
      '■ SCCAF (Special Characteristics Communication and Agreement Form)\n' +
      'Ford의 특별특성 합의서 양식',
    keywords: ['CC', 'SC', 'IC', 'GC', 'YC', 'YS', 'HI', 'OS', 'SCCAF', '특별특성', 'critical', 'significant', '치명', '중요'],
  },
  {
    category: '용어집',
    title: 'PFMEA 워크시트 25컬럼',
    content:
      '■ 1단계 구조분석 (컬럼 1~2)\n' +
      '① 공정번호 ② 공정명\n\n' +
      '■ 2단계 기능분석 (컬럼 3~4)\n' +
      '③ 기능 ④ 요구사항\n\n' +
      '■ 3단계 고장분석 (컬럼 5~6, 9)\n' +
      '⑤ 고장형태 ⑥ 고장영향 ⑨ 고장원인\n\n' +
      '■ 리스크 평가 (컬럼 7~8, 11, 13~14)\n' +
      '⑦ 심각도(S) ⑧ 특별특성 ⑪ 발생도(O) ⑬ 검출도(D) ⑭ RPN 또는 AP\n\n' +
      '■ 4단계 리스크분석 (컬럼 10, 12)\n' +
      '⑩ 예방관리 ⑫ 검출관리\n\n' +
      '■ 5단계 최적화 (컬럼 15~21)\n' +
      '⑮ 예방관리 개선계획 ⑯ 검출관리 개선계획\n' +
      '⑰ 책임자 ⑱ 완료예정일\n' +
      '⑲ 예방관리 개선결과 ⑳ 검출관리 개선결과 ㉑ 완료일자\n\n' +
      '■ 개선 후 재평가 (컬럼 22~25)\n' +
      '㉒ 심각도(개선후) ㉓ 발생도(개선후) ㉔ 검출도(개선후) ㉕ RPN/AP(개선후)',
    keywords: ['25컬럼', '컬럼', 'column', '워크시트', '구조', '기능', '고장', '리스크', '최적화', '재평가'],
  },
];

export const GLOSSARY_ITEMS_EN: ManualItem[] = [];
