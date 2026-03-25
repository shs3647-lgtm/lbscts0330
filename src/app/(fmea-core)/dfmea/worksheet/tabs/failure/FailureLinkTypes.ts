/**
 * @file FailureLinkTypes.ts
 * @description 고장연결 탭 타입 정의
 * @note 기존 FailureLinkTab.tsx에서 분리됨 (2026-01-19)
 */
/**
 * ██████████████████████████████████████████████████████████████
 * ██  CODEFREEZE v3.1.0 — 이 파일을 수정하지 마세요!          ██
 * ██                                                          ██
 * ██  상태: DB중심 고장연결 + v3.0 아키텍처 완성 (2026-02-28)  ██
 * ██  검증: 270테스트 PASS / tsc 에러 0개                      ██
 * ██                                                          ██
 * ██  수정이 필요하면:                                         ██
 * ██  1. 반드시 별도 브랜치에서 작업                            ██
 * ██  2. 270 골든 테스트 전체 통과 필수                         ██
 * ██  3. 사용자 승인 후 머지                                   ██
 * ██████████████████████████████████████████████████████████████
 */


/** FE (고장영향) 항목 */
export interface FEItem { 
  id: string; 
  scope: string; 
  feNo: string; 
  text: string; 
  severity?: number;
  // ★ 역전개 정보
  functionName?: string;
  requirement?: string; 
}

/** FM (고장형태) 항목 */
export interface FMItem {
  id: string;
  fmNo: string;
  processName: string;
  processNo: string;         // ★ 공정번호
  text: string;
  // ★ 역전개 정보 (설계기능, 설계특성)
  processFunction?: string;  // 설계기능
  productChar?: string;      // 설계특성
}

/** FC (고장원인) 항목 */
export interface FCItem { 
  id: string; 
  fcNo: string; 
  processName: string; 
  m4: string; 
  workElem: string; 
  text: string;
  // ★ 역전개 정보 (부품(컴포넌트) 기능, 설계파라미터)
  workFunction?: string;  // 부품(컴포넌트) 기능
  processChar?: string;   // 설계파라미터
}

/** 연결 결과 (FM-FE-FC 연결) */
export interface LinkResult {
  id?: string;     // ★ DB FailureLink UUID (2026-03-17: 저장 안정성을 위해 추가)
  fmId: string;
  fmNo?: string;  // FM 순번
  fmText: string;
  fmProcess: string;
  fmProcessNo?: string;  // ★ 공정번호
  feId: string;
  feNo: string;
  feScope: string;
  feText: string;
  severity: number;
  // ★ FE 역전개 정보
  feFunctionName?: string;
  feRequirement?: string;
  fcId: string;
  fcNo: string;
  fcProcess: string;
  fcM4: string;
  fcWorkElem: string;
  fcText: string;
  // ★ FC 역전개 정보
  fcWorkFunction?: string;  // 부품(컴포넌트) 기능
  fcProcessChar?: string;   // 설계파라미터
  // ★★★ 2026-02-28: P5 — seq/path 필드 (DB중심 고장연결) ★★★
  fmSeq?: number;    // FM 순서 (같은 FE 그룹 내, 1-based)
  feSeq?: number;    // FE 순서 (같은 공정 내, 1-based)
  fcSeq?: number;    // FC 순서 (같은 FM 그룹 내, 1-based)
  fmPath?: string;   // FM 경로 (공정번호/FM텍스트)
  fePath?: string;   // FE 경로 (scope/FE텍스트)
  fcPath?: string;   // FC 경로 (공정번호/4M/FC텍스트)
}
