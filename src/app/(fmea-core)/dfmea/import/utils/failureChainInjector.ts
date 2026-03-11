/**
 * @file failureChainInjector.ts
 * @description MasterFailureChain[] → WorksheetState에 failureLinks + riskData 주입
 *
 * 별도 함수 — useWorksheetDataLoader의 l2: 할당 라인은 절대 수정하지 않음 (Rule 10.5)
 * saveWorksheetFromImport에서 buildWorksheetState 결과에 후처리로 적용
 *
 * 2026-02-21: 매칭 실패 시 자동 FM/FC/FE 생성 로직 추가
 *   - 기존: 3개 모두 매칭 필수 → 실패 시 스킵
 *   - 변경: 매칭 실패 항목을 state에 자동 생성 → 링크 생성 보장
 * 
 * 2026-02-24: 공정번호 정규화 + FE scope 3단계 매칭 개선
 * 2026-02-25: 고장연결 완성
 *   - normalizeProcessNo: '번' 접미사 제거 (STEP A "20번" ↔ FC시트 "20" 매칭)
 *   - 1차 패스: FE/FM/FC 중 빈 값 시 같은 공정 기존 항목 자동 보완
 *   - 2차 패스 전면 제거 (카테시안 초과 링크 방지 → 퍼지매칭만 유지)
 *
 * @created 2026-02-21
 * 
 * CODEFREEZE 해제 2026-02-28 — P5: seq/path 필드 추가 (DB중심 고장연결 완성)
 */

import type { MasterFailureChain } from '../types/masterFailureChain';
import type {
  WorksheetState,
  L1FailureScope,
  L2FailureMode,
  L3FailureCauseExtended,
  Process,
} from '@/app/(fmea-core)/dfmea/worksheet/constants';
import { uid } from '@/app/(fmea-core)/dfmea/worksheet/constants';

// ─── Types ───

export interface FailureLinkEntry {
  id: string;
  fmId: string;
  feId: string;
  fcId: string;
  fmText?: string;
  feText?: string;
  fcText?: string;
  fcM4?: string;
  fmProcess?: string;
  fmProcessNo?: string;  // ★ 공정번호
  feScope?: string;
  severity?: number;
  pcText?: string;       // B5 예방관리
  dcText?: string;       // A6 검출관리
  // ★★★ 2026-02-28: P5 해결 — seq/path 필드 추가 ★★★
  fmSeq?: number;    // FM 순서 (같은 FE 그룹 내, 1-based)
  feSeq?: number;    // FE 순서 (같은 공정 내, 1-based)
  fcSeq?: number;    // FC 순서 (같은 FM 그룹 내, 1-based)
  fmPath?: string;   // FM 경로 (공정번호/FM텍스트)
  fePath?: string;   // FE 경로 (scope/FE텍스트)
  fcPath?: string;   // FC 경로 (공정번호/4M/FC텍스트)
}

interface RiskDataEntry {
  [key: string]: number | string;
}

export interface InjectionResult {
  failureLinks: FailureLinkEntry[];
  riskData: RiskDataEntry;
  injectedCount: number;
  skippedCount: number;
  autoCreated: { fe: number; fm: number; fc: number };
}

// ─── 텍스트 매칭 유틸 ───

function normalize(s: string | undefined): string {
  return (s || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/** 공백 완전 제거 정규화 — 띄어쓰기 차이 극복 (예: "사양 부적합" vs "사양부적합") */
function normalizeNoSpace(s: string | undefined): string {
  return normalize(s).replace(/\s/g, '');
}

/**
 * ★ v3.1.2: FM/FC 이름에서 공정번호 접두사 제거 — 퍼지 매칭용
 *
 * SA 파서: "PCB 사양 부적합 미검출" (접두사 없음)
 * FC 파서: "20번 PCB 사양 부적합 미검출" (접두사 있음) 또는 반대
 *
 * 패턴:
 *   "20번 PCB..." → "pcb..."
 *   "20번-PCB..." → "pcb..."
 *   "130번F03_외관..." → "외관..."
 *   "140F04_이음..." → "이음..."
 *   "80번-접지바..." → "접지바..."
 */
function stripProcessPrefix(s: string): string {
  return normalize(s)
    .replace(/^\d+번?[\s\-]*/, '')          // "20번 " / "20번-" / "20 " 제거
    .replace(/^f\d+[_\-\s]*/i, '')          // "F03_" / "F04_" 제거
    .replace(/^\d+번?f\d+[_\-\s]*/i, '')    // "130번F03_" 제거 (복합)
    .trim();
}

/**
 * ★★★ 2026-02-24: 공정번호 정규화 — 형식 불일치 해결 ★★★
 * 
 * 문제: FC 시트 "010" vs A1 시트 "10번" → 매칭 실패 → FM 누락
 * 해결: 선행 0 제거, 접두사 제거, "번" 접미사 제거, 숫자만 추출
 * 
 * 예시:
 *   "010" → "10"
 *   "공정10" → "10"
 *   "Process 10" → "10"
 *   "10번" → "10"   ★ STEP A "번" 접미사 처리
 *   "20번" → "20"   ★ STEP A "번" 접미사 처리
 *   "10" → "10"
 */
function normalizeProcessNo(pNo: string | undefined): string {
  if (!pNo) return '';
  let n = pNo.trim();
  // ★★★ 2026-03-03: 공통공정 정규화 (buildWorksheetState와 동일) ★★★
  const lower = n.toLowerCase();
  if (lower === '0' || lower === '공통공정' || lower === '공통') {
    return '00';
  }
  // 접두사 제거 (공정, Process, P 등)
  n = n.replace(/^(공정|process|proc|p)[\s\-_]*/i, '');
  // ★★★ 2026-02-24 수정: "번" 접미사 제거 (STEP A 형식 "20번" → "20") ★★★
  n = n.replace(/번$/, '');
  // 선행 0 제거 (단, "0" 자체는 유지, "00"도 유지)
  if (n !== '0' && n !== '00') {
    n = n.replace(/^0+(?=\d)/, '');
  }
  return n;
}

/**
 * ★ v3.1.3: 글자수 기반 근사 매칭 — FC 시트 원자성 매칭 보완
 *
 * FC 시트에서 같은 행에 있는 FM↔FC는 "사실(fact)"이므로,
 * 텍스트가 약간 다르더라도 (공백/오타/약어) 같은 공정 내에서 가장 유사한 항목을 찾음.
 *
 * 유사도 기준: 공백제거 후 공통 글자 비율 (2-gram overlap)
 * 임계값: 60% 이상 → 매칭 허용
 */
function charOverlapRatio(a: string, b: string): number {
  const sa = normalizeNoSpace(a);
  const sb = normalizeNoSpace(b);
  if (!sa || !sb) return 0;
  if (sa === sb) return 1;
  // 2-gram 기반 유사도
  const gramsA = new Set<string>();
  for (let i = 0; i < sa.length - 1; i++) gramsA.add(sa.substring(i, i + 2));
  const gramsB = new Set<string>();
  for (let i = 0; i < sb.length - 1; i++) gramsB.add(sb.substring(i, i + 2));
  if (gramsA.size === 0 || gramsB.size === 0) return 0;
  let common = 0;
  for (const g of gramsA) { if (gramsB.has(g)) common++; }
  return (2 * common) / (gramsA.size + gramsB.size);  // Dice coefficient
}

// ★ v3.2.1: FC 빈값 보완 헬퍼 — 같은 공정의 모든 FC 수집
function collectAllFCs(proc: Process): (L3FailureCauseExtended & { processNo?: string; m4?: string })[] {
  const fcs: (L3FailureCauseExtended & { processNo?: string; m4?: string })[] = [];
  // L3 레벨 FC
  for (const we of (proc.l3 || [])) {
    for (const fc of (we.failureCauses || [])) {
      fcs.push({ ...fc, processNo: proc.no, m4: we.m4 });
    }
  }
  // L2 레벨 FC (fallback)
  for (const fc of (proc.failureCauses || [])) {
    fcs.push({ ...fc, processNo: proc.no });
  }
  return fcs;
}

// ★ v3.2.1: FC ID로 검색 헬퍼
function findFcById(proc: Process, fcId: string): (L3FailureCauseExtended & { processNo?: string; m4?: string }) | undefined {
  for (const we of (proc.l3 || [])) {
    for (const fc of (we.failureCauses || [])) {
      if (fc.id === fcId) return { ...fc, processNo: proc.no, m4: we.m4 };
    }
  }
  for (const fc of (proc.failureCauses || [])) {
    if (fc.id === fcId) return { ...fc, processNo: proc.no };
  }
  return undefined;
}

// ─── 메인 함수 ───

/**
 * failureChains → failureLinks + riskData 변환
 *
 * 동작:
 * 1. state의 FE/FM/FC를 텍스트 기반으로 인덱싱
 * 2. 각 chain에 대해 FE↔FM↔FC ID를 매칭
 * 3. 매칭 실패 시 스킵 (FC 데이터에 없으면 연결하지 않음 — 추론 금지)
 * 4. failureLink + riskData 엔트리 생성
 */
export function injectFailureChains(
  state: WorksheetState,
  chains: MasterFailureChain[],
): InjectionResult {
  if (!chains || chains.length === 0) {
    return { failureLinks: [], riskData: {}, injectedCount: 0, skippedCount: 0, autoCreated: { fe: 0, fm: 0, fc: 0 } };
  }

  const autoCreated = { fe: 0, fm: 0, fc: 0 };

  // ─── 공정 인덱스 (processNo → Process) ───
  // ★ 2026-02-24: 정규화된 공정번호 + 원본 모두 저장 (형식 불일치 해결)
  const procByNo = new Map<string, Process>();
  for (const proc of (state.l2 || [])) {
    if (proc.no) {
      procByNo.set(proc.no, proc);  // 원본 (항상 등록)
      const normalized = normalizeProcessNo(proc.no);
      // 정규화된 버전: 첫 번째만 등록 (중복 방지 — cross-contamination 방지)
      if (normalized && normalized !== proc.no && !procByNo.has(normalized)) {
        procByNo.set(normalized, proc);
      }
    }
  }

  // ─── FE 인덱스 (l1.failureScopes) ───
  const feByText = new Map<string, L1FailureScope>();
  const feByScopeText = new Map<string, L1FailureScope>();
  const feByNoSpace = new Map<string, L1FailureScope>();  // ★ 공백제거 매칭
  const feByStripped = new Map<string, L1FailureScope>();  // ★ 접두사 제거 매칭
  const feAll: L1FailureScope[] = [];  // ★ contains 매칭용 전체 목록
  for (const fe of (state.l1?.failureScopes || [])) {
    if (fe.name || fe.effect) {
      const text = normalize(fe.effect || fe.name);
      if (!feByText.has(text)) {
        feByText.set(text, fe);
      }
      const nsText = normalizeNoSpace(fe.effect || fe.name);
      if (nsText && !feByNoSpace.has(nsText)) {
        feByNoSpace.set(nsText, fe);
      }
      // ★ 접두사 제거 버전 등록 (FM/FC와 동일 패턴)
      const sText = stripProcessPrefix(fe.effect || fe.name);
      if (sText && sText !== text && !feByStripped.has(sText)) {
        feByStripped.set(sText, fe);
      }
      if (fe.scope) {
        feByScopeText.set(`${normalize(fe.scope)}|${text}`, fe);
      }
      feAll.push(fe);
    }
  }

  // ─── FM 인덱스 (l2[].failureModes[]) ───
  // ★ 2026-02-24: 정규화된 공정번호도 등록
  // ★ v3.1.2: 접두사 제거 매칭도 등록 (퍼지 매칭)
  // ★ v3.1.3: 공백제거 매칭 추가 (띄어쓰기 차이 극복)
  const fmByProcessAndText = new Map<string, L2FailureMode & { processNo?: string }>();
  for (const proc of (state.l2 || [])) {
    const normalizedPNo = normalizeProcessNo(proc.no);
    for (const fm of (proc.failureModes || [])) {
      const nfm = normalize(fm.name);
      const sfm = stripProcessPrefix(fm.name);  // ★ 접두사 제거 버전
      const nsfm = normalizeNoSpace(fm.name);    // ★ 공백제거 버전
      const fmEntry = { ...fm, processNo: proc.no };
      // 원본 공정번호 (★ first-wins: useLinkData와 동일 우선순위 — 중복 FM ID 불일치 방지)
      if (!fmByProcessAndText.has(`${proc.no}|${nfm}`)) {
        fmByProcessAndText.set(`${proc.no}|${nfm}`, fmEntry);
      }
      // 정규화된 공정번호
      if (normalizedPNo && normalizedPNo !== proc.no) {
        if (!fmByProcessAndText.has(`${normalizedPNo}|${nfm}`)) {
          fmByProcessAndText.set(`${normalizedPNo}|${nfm}`, fmEntry);
        }
      }
      // ★ v3.1.2: 접두사 제거 키 등록 (퍼지 매칭)
      if (sfm && sfm !== nfm) {
        if (!fmByProcessAndText.has(`${proc.no}|${sfm}`)) {
          fmByProcessAndText.set(`${proc.no}|${sfm}`, fmEntry);
        }
        if (normalizedPNo && !fmByProcessAndText.has(`${normalizedPNo}|${sfm}`)) {
          fmByProcessAndText.set(`${normalizedPNo}|${sfm}`, fmEntry);
        }
      }
      // ★ v3.1.3: 공백제거 키 등록 (띄어쓰기 차이 극복)
      if (nsfm && nsfm !== nfm) {
        if (!fmByProcessAndText.has(`${proc.no}|${nsfm}`)) {
          fmByProcessAndText.set(`${proc.no}|${nsfm}`, fmEntry);
        }
        if (normalizedPNo && normalizedPNo !== proc.no && !fmByProcessAndText.has(`${normalizedPNo}|${nsfm}`)) {
          fmByProcessAndText.set(`${normalizedPNo}|${nsfm}`, fmEntry);
        }
      }
      // 공정번호 없이도 매칭 가능하도록 (fallback)
      if (!fmByProcessAndText.has(`|${nfm}`)) {
        fmByProcessAndText.set(`|${nfm}`, fmEntry);
      }
      if (nsfm && nsfm !== nfm && !fmByProcessAndText.has(`|${nsfm}`)) {
        fmByProcessAndText.set(`|${nsfm}`, fmEntry);
      }
    }
  }

  // ─── FC 인덱스 (l2[].l3[].failureCauses[] 또는 l2[].failureCauses[]) ───
  // ★ 2026-02-24: 정규화된 공정번호도 등록
  // ★ v3.1.3: 공백제거 매칭 추가
  const fcByProcessM4Text = new Map<string, (L3FailureCauseExtended & { processNo?: string; m4?: string })>();
  for (const proc of (state.l2 || [])) {
    const normalizedPNo = normalizeProcessNo(proc.no);
    // L3 레벨 FC
    for (const we of (proc.l3 || [])) {
      for (const fc of (we.failureCauses || [])) {
        const nfc = normalize(fc.name);
        const sfc = stripProcessPrefix(fc.name);
        const nsfc = normalizeNoSpace(fc.name);
        const fcEntry = { ...fc, processNo: proc.no, m4: we.m4 };
        // 원본 키 (★ first-wins: useLinkData와 동일 우선순위)
        if (!fcByProcessM4Text.has(`${proc.no}|${we.m4}|${nfc}`)) {
          fcByProcessM4Text.set(`${proc.no}|${we.m4}|${nfc}`, fcEntry);
        }
        // 정규화된 공정번호
        if (normalizedPNo && normalizedPNo !== proc.no) {
          if (!fcByProcessM4Text.has(`${normalizedPNo}|${we.m4}|${nfc}`)) {
            fcByProcessM4Text.set(`${normalizedPNo}|${we.m4}|${nfc}`, fcEntry);
          }
        }
        // 느슨한 매칭 (m4 무관)
        if (!fcByProcessM4Text.has(`${proc.no}||${nfc}`)) {
          fcByProcessM4Text.set(`${proc.no}||${nfc}`, fcEntry);
        }
        if (normalizedPNo && normalizedPNo !== proc.no && !fcByProcessM4Text.has(`${normalizedPNo}||${nfc}`)) {
          fcByProcessM4Text.set(`${normalizedPNo}||${nfc}`, fcEntry);
        }
        // ★ v3.1.2: 접두사 제거 키 등록
        if (sfc && sfc !== nfc) {
          if (!fcByProcessM4Text.has(`${proc.no}|${we.m4}|${sfc}`)) {
            fcByProcessM4Text.set(`${proc.no}|${we.m4}|${sfc}`, fcEntry);
          }
          if (!fcByProcessM4Text.has(`${proc.no}||${sfc}`)) {
            fcByProcessM4Text.set(`${proc.no}||${sfc}`, fcEntry);
          }
        }
        // ★ v3.1.3: 공백제거 키 등록
        if (nsfc && nsfc !== nfc) {
          if (!fcByProcessM4Text.has(`${proc.no}||${nsfc}`)) {
            fcByProcessM4Text.set(`${proc.no}||${nsfc}`, fcEntry);
          }
          if (normalizedPNo && normalizedPNo !== proc.no && !fcByProcessM4Text.has(`${normalizedPNo}||${nsfc}`)) {
            fcByProcessM4Text.set(`${normalizedPNo}||${nsfc}`, fcEntry);
          }
        }
      }
    }
    // L2 레벨 FC (fallback)
    for (const fc of (proc.failureCauses || [])) {
      const nfc = normalize(fc.name);
      const sfc = stripProcessPrefix(fc.name);
      const nsfc = normalizeNoSpace(fc.name);
      if (!fcByProcessM4Text.has(`${proc.no}||${nfc}`)) {
        fcByProcessM4Text.set(`${proc.no}||${nfc}`, { ...fc, processNo: proc.no });
      }
      if (normalizedPNo && normalizedPNo !== proc.no && !fcByProcessM4Text.has(`${normalizedPNo}||${nfc}`)) {
        fcByProcessM4Text.set(`${normalizedPNo}||${nfc}`, { ...fc, processNo: proc.no });
      }
      // ★ v3.1.2: 접두사 제거 키
      if (sfc && sfc !== nfc && !fcByProcessM4Text.has(`${proc.no}||${sfc}`)) {
        fcByProcessM4Text.set(`${proc.no}||${sfc}`, { ...fc, processNo: proc.no });
      }
      // ★ v3.1.3: 공백제거 키
      if (nsfc && nsfc !== nfc && !fcByProcessM4Text.has(`${proc.no}||${nsfc}`)) {
        fcByProcessM4Text.set(`${proc.no}||${nsfc}`, { ...fc, processNo: proc.no });
      }
    }
  }

  // ─── ★ v3.2.0: FE carry-forward 복구 ───
  // FC 파서가 공정 변경 시 cfFeValue를 초기화하지만, FE는 L1(글로벌) 레벨이므로
  // 공정 간 carry-forward가 올바른 동작. 여기서 빈 feValue를 복구.
  // 복구 방법: (1) 같은 FM에 이미 FE가 있는 chain에서 참조 (2) 순서 기반 carry-forward
  const fmToFeValue = new Map<string, string>();  // normalize(fmValue) → feValue
  for (const c of chains) {
    if (c.feValue?.trim() && c.fmValue?.trim()) {
      const key = normalize(c.fmValue);
      if (!fmToFeValue.has(key)) fmToFeValue.set(key, c.feValue);
    }
  }
  let cfFERecovery = '';
  let feRecoveredCount = 0;
  for (const c of chains) {
    if (c.feValue?.trim()) {
      cfFERecovery = c.feValue;
    } else if (c.fmValue?.trim()) {
      // 1차: 같은 FM의 FE 참조
      const fromFm = fmToFeValue.get(normalize(c.fmValue));
      if (fromFm) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (c as any).feValue = fromFm;
        feRecoveredCount++;
      } else if (cfFERecovery) {
        // 2차: 순서 기반 carry-forward (직전 chain의 FE)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (c as any).feValue = cfFERecovery;
        feRecoveredCount++;
      }
    }
  }
  if (feRecoveredCount > 0) {
  }

  // ─── 체인 매칭 ───
  const failureLinks: FailureLinkEntry[] = [];
  const riskData: RiskDataEntry = {};
  let injectedCount = 0;
  let skippedCount = 0;
  // ★ v3.1.3: 진단용 — 실패 사유별 카운트 + 샘플
  let skipNoProc = 0;
  let skipNoFE = 0;
  let skipNoFM = 0;
  let skipNoFC = 0;
  const skipSamples: string[] = []; // 첫 10건만
  // ★ v3.2.1: FC 빈값 보완용 round-robin 카운터
  const fcRoundRobinMap = new Map<string, number>();
  let fcAutoFilledCount = 0;

  for (const chain of chains) {
    const { processNo, m4, feValue, fmValue, fcValue } = chain;

    // 빈 값 체인은 스킵
    if (!feValue?.trim() && !fmValue?.trim() && !fcValue?.trim()) {
      skippedCount++;
      continue;
    }

    // 해당 공정 찾기 (★ 2026-02-24: 정규화된 fallback 추가)
    let proc = procByNo.get(processNo);
    if (!proc) {
      const normalizedPNo = normalizeProcessNo(processNo);
      proc = procByNo.get(normalizedPNo);
    }
    if (!proc) {
      skippedCount++;
      skipNoProc++;
      if (skipSamples.length < 10) skipSamples.push(`PROC미발견 pNo="${processNo}" FM="${fmValue?.substring(0, 30)}"`);
      continue;
    }
    // 실제 공정번호 사용 (매칭된 proc.no)
    const actualProcessNo = proc.no;

    // FE 매칭: scope+text → text → 공백제거 → contains (4단계)
    let fe: L1FailureScope | undefined;
    if (feValue?.trim()) {
      const nfe = normalize(feValue);
      const nsfe = normalizeNoSpace(feValue);

      // 1단계: scope+text 매칭 (FC 시트 scope 사용)
      if (chain.feScope) {
        const scopeKey = `${normalize(chain.feScope)}|${nfe}`;
        fe = feByScopeText.get(scopeKey);
      }

      // 2단계: text만으로 매칭 (기존 FE 재사용 — 중복 방지)
      if (!fe) {
        fe = feByText.get(nfe);
      }

      // 3단계: 공백제거 매칭 (띄어쓰기 차이 극복)
      if (!fe && nsfe) {
        fe = feByNoSpace.get(nsfe);
      }

      // 3.5단계: 접두사 제거 매칭 (FM/FC와 동일 — 공정번호 접두사 차이 극복)
      if (!fe) {
        const sfe = stripProcessPrefix(feValue);
        if (sfe && sfe !== nfe) {
          fe = feByStripped.get(sfe) || feByText.get(sfe);
        }
      }

      // 4단계: contains 매칭 (FC시트 FE가 메인시트 FE의 부분/전체)
      if (!fe && nfe.length >= 3) {
        for (const candidate of feAll) {
          const candidateText = normalize(candidate.effect || candidate.name);
          if (candidateText.includes(nfe) || nfe.includes(candidateText)) {
            fe = candidate;
            break;
          }
        }
      }

      // 5단계: 글자수 근사 매칭 (60% 이상 2-gram 유사도)
      if (!fe && nfe.length >= 3) {
        let bestScore = 0;
        let bestFe: L1FailureScope | undefined;
        for (const candidate of feAll) {
          const score = charOverlapRatio(feValue, candidate.effect || candidate.name);
          if (score > bestScore && score >= 0.5) {
            bestScore = score;
            bestFe = candidate;
          }
        }
        if (bestFe) fe = bestFe;
      }
    }

    // FM 매칭 (퍼지매칭: 정규화 + 접두사 제거 + 공백제거 + 글자수 근사)
    const nfmValue = normalize(fmValue);
    const sfmValue = stripProcessPrefix(fmValue);
    const nsfmValue = normalizeNoSpace(fmValue);
    let fm = fmByProcessAndText.get(`${actualProcessNo}|${nfmValue}`)
      || fmByProcessAndText.get(`${processNo}|${nfmValue}`)         // 원본 pNo fallback
      || fmByProcessAndText.get(`${actualProcessNo}|${sfmValue}`)   // 접두사 제거 매칭
      || fmByProcessAndText.get(`${processNo}|${sfmValue}`)         // 원본+접두사 제거
      || fmByProcessAndText.get(`${actualProcessNo}|${nsfmValue}`)  // 공백제거
      || fmByProcessAndText.get(`${processNo}|${nsfmValue}`)        // 원본pNo+공백제거
      || fmByProcessAndText.get(`|${nfmValue}`)                     // 공정 무관 fallback
      || fmByProcessAndText.get(`|${sfmValue}`)                     // 공정무관+접두사 제거
      || fmByProcessAndText.get(`|${nsfmValue}`);                   // 공정무관+공백제거

    // ★ NEW: FM contains 매칭 — 같은 공정 내 FM 텍스트 포함 관계
    if (!fm && nfmValue.length >= 3 && proc) {
      for (const candidate of (proc.failureModes || [])) {
        const cNorm = normalize(candidate.name);
        const cNoSpace = normalizeNoSpace(candidate.name);
        if ((cNorm.length >= 3 && (cNorm.includes(nfmValue) || nfmValue.includes(cNorm))) ||
          (cNoSpace.length >= 3 && (cNoSpace.includes(nsfmValue) || nsfmValue.includes(cNoSpace)))) {
          fm = { ...candidate, processNo: proc.no };
          break;
        }
      }
    }

    // ★ v3.1.3: FM 글자수 근사 매칭 (같은 공정 내, 60% 이상 유사도)
    if (!fm && fmValue?.trim() && proc) {
      let bestScore = 0;
      let bestFm: (L2FailureMode & { processNo?: string }) | undefined;
      for (const candidate of (proc.failureModes || [])) {
        const score = charOverlapRatio(fmValue, candidate.name);
        if (score > bestScore && score >= 0.5) {
          bestScore = score;
          bestFm = { ...candidate, processNo: proc.no };
        }
      }
      if (bestFm) fm = bestFm;
    }

    // FC 매칭 (퍼지매칭: 정규화 + 접두사 제거 + m4 무관 + 공백제거 + 글자수 근사)
    const nfcValue = normalize(fcValue);
    const sfcValue = stripProcessPrefix(fcValue);
    const nsfcValue = normalizeNoSpace(fcValue);
    let fc = fcByProcessM4Text.get(`${actualProcessNo}|${m4 || ''}|${nfcValue}`)
      || fcByProcessM4Text.get(`${processNo}|${m4 || ''}|${nfcValue}`)           // 원본 pNo
      || fcByProcessM4Text.get(`${actualProcessNo}||${nfcValue}`)                // m4 무관
      || fcByProcessM4Text.get(`${processNo}||${nfcValue}`)                      // 원본+m4무관
      || fcByProcessM4Text.get(`${actualProcessNo}|${m4 || ''}|${sfcValue}`)     // 접두사 제거
      || fcByProcessM4Text.get(`${processNo}|${m4 || ''}|${sfcValue}`)
      || fcByProcessM4Text.get(`${actualProcessNo}||${sfcValue}`)
      || fcByProcessM4Text.get(`${processNo}||${sfcValue}`)
      || fcByProcessM4Text.get(`${actualProcessNo}||${nsfcValue}`)               // 공백제거
      || fcByProcessM4Text.get(`${processNo}||${nsfcValue}`);                    // 원본pNo+공백제거

    // ★ NEW: FC contains 매칭 — 같은 공정 내 FC 텍스트 포함 관계
    if (!fc && nfcValue.length >= 3 && proc) {
      // L3 레벨 FC
      for (const we of (proc.l3 || [])) {
        if (fc) break;
        for (const candidate of (we.failureCauses || [])) {
          const cNorm = normalize(candidate.name);
          const cNoSpace = normalizeNoSpace(candidate.name);
          if ((cNorm.length >= 3 && (cNorm.includes(nfcValue) || nfcValue.includes(cNorm))) ||
            (cNoSpace.length >= 3 && (cNoSpace.includes(nsfcValue) || nsfcValue.includes(cNoSpace)))) {
            fc = { ...candidate, processNo: proc.no, m4: we.m4 };
            break;
          }
        }
      }
      // L2 레벨 FC fallback
      if (!fc) {
        for (const candidate of (proc.failureCauses || [])) {
          const cNorm = normalize(candidate.name);
          const cNoSpace = normalizeNoSpace(candidate.name);
          if ((cNorm.length >= 3 && (cNorm.includes(nfcValue) || nfcValue.includes(cNorm))) ||
            (cNoSpace.length >= 3 && (cNoSpace.includes(nsfcValue) || nsfcValue.includes(cNoSpace)))) {
            fc = { ...candidate, processNo: proc.no };
            break;
          }
        }
      }
    }

    // ★ v3.1.3: FC 글자수 근사 매칭 (같은 공정 내, 60% 이상 유사도)
    if (!fc && fcValue?.trim() && proc) {
      let bestScore = 0;
      let bestFc: (L3FailureCauseExtended & { processNo?: string; m4?: string }) | undefined;
      // L3 레벨 FC
      for (const we of (proc.l3 || [])) {
        for (const candidate of (we.failureCauses || [])) {
          const score = charOverlapRatio(fcValue, candidate.name);
          if (score > bestScore && score >= 0.5) {
            bestScore = score;
            bestFc = { ...candidate, processNo: proc.no, m4: we.m4 };
          }
        }
      }
      // L2 레벨 FC
      for (const candidate of (proc.failureCauses || [])) {
        const score = charOverlapRatio(fcValue, candidate.name);
        if (score > bestScore && score >= 0.5) {
          bestScore = score;
          bestFc = { ...candidate, processNo: proc.no };
        }
      }
      if (bestFc) fc = bestFc;
    }

    // ★★★ v3.2.1: fcValue 빈 체인 FC 자동 보완 ★★★
    // 근본원인: buildFailureChainsFromFlat의 순차분배(chunk)에서 FM > FC 시
    // 마지막 FM들에 FC 미할당 → fcValue="" → FC 매칭 불가 → 스킵
    // 해결: 같은 공정+FM의 다른 체인에 FC가 있으면 공유, 없으면 같은 공정 FC 순환 할당
    if (!fc && fe && fm && (!fcValue || !fcValue.trim()) && proc) {
      // 1차: 같은 FM의 다른 링크에서 이미 매칭된 FC 찾기
      const existingFcForFm = failureLinks.find(l => l.fmId === fm.id && l.fcId);
      if (existingFcForFm) {
        const foundFc = findFcById(proc, existingFcForFm.fcId);
        if (foundFc) fc = foundFc;
      }

      // 2차: 같은 공정의 전체 FC 풀에서 순환 할당 (round-robin)
      if (!fc) {
        const allFcs = collectAllFCs(proc);
        if (allFcs.length > 0) {
          // fcRoundRobin 카운터로 공정별 순환
          const rrKey = proc.no;
          const rrIdx = fcRoundRobinMap.get(rrKey) || 0;
          fc = allFcs[rrIdx % allFcs.length];
          fcRoundRobinMap.set(rrKey, rrIdx + 1);
          fcAutoFilledCount++;
        }
      }
    }

    // ★ 3개 모두 매칭 성공 시에만 링크 생성
    if (fe && fm && fc) {
      const linkId = uid();
      // ★ path 필드 계산
      const linkFeScope = chain.feScope || undefined;
      const linkFeText = feValue || (fe as L1FailureScope).effect || (fe as L1FailureScope).name;
      const linkFmText = fmValue || fm.name;
      const linkFcText = fcValue || fc.name;

      failureLinks.push({
        id: linkId,
        fmId: fm.id,
        feId: fe.id,
        fcId: fc.id,
        fmText: linkFmText,
        feText: linkFeText,
        fcText: linkFcText,
        fcM4: m4 || undefined,
        fmProcess: actualProcessNo,
        fmProcessNo: actualProcessNo,
        feScope: linkFeScope,
        severity: chain.severity || (fe as L1FailureScope).severity || undefined,
        pcText: chain.pcValue || undefined,
        dcText: chain.dcValue || undefined,
        // ★★★ 2026-02-28: path 필드 즉시 설정 ★★★
        fmPath: `${actualProcessNo}/${linkFmText}`,
        fePath: linkFeScope ? `${linkFeScope}/${linkFeText}` : linkFeText,
        fcPath: m4 ? `${actualProcessNo}/${m4}/${linkFcText}` : `${actualProcessNo}/${linkFcText}`,
      });

      // ★★★ 2026-03-02: riskData 키를 워크시트 표준 형식으로 저장 (risk-{fmId}-{fcId}-S/O/D)
      const uniqueKey = `${fm.id}-${fc.id}`;
      if (chain.severity) {
        riskData[`risk-${uniqueKey}-S`] = chain.severity;
      }
      if (chain.occurrence) {
        riskData[`risk-${uniqueKey}-O`] = chain.occurrence;
      }
      if (chain.detection) {
        riskData[`risk-${uniqueKey}-D`] = chain.detection;
      }

      // PC/DC → riskData 저장 (리스크 탭 모달에서 표시)
      if (chain.pcValue) {
        riskData[`prevention-${uniqueKey}`] = chain.pcValue;
      }
      if (chain.dcValue) {
        riskData[`detection-${uniqueKey}`] = chain.dcValue;
      }

      // ★ specialChar → riskData 저장 (ALL 탭 uniqueKey = fmId-fcId)
      if (chain.specialChar) {
        const scKey = `specialChar-${fm.id}-${fc.id}`;
        riskData[scKey] = chain.specialChar;
      }

      injectedCount++;
    } else {
      skippedCount++;
      // ★ v3.1.3: 진단 — 어떤 항목이 매칭 실패했는지 기록
      if (!fe) skipNoFE++;
      if (!fm) skipNoFM++;
      if (!fc) skipNoFC++;
      if (skipSamples.length < 10) {
        const parts: string[] = [];
        if (!fe) {
          // 글자수 비교: 가장 유사한 FE 후보 표시
          const bestFe = feAll.length > 0
            ? feAll.reduce((best, c) => {
              const s = charOverlapRatio(feValue || '', c.effect || c.name);
              return s > (best.s || 0) ? { s, name: (c.effect || c.name).substring(0, 20) } : best;
            }, { s: 0, name: '' } as { s: number; name: string })
            : { s: 0, name: '' };
          parts.push(`FE✗="${feValue?.substring(0, 20)}"(${feValue?.length || 0}자) 최근사="${bestFe.name}"(${Math.round(bestFe.s * 100)}%)`);
        }
        if (!fm) {
          const bestFmC = (proc?.failureModes || []).reduce((best, c) => {
            const s = charOverlapRatio(fmValue || '', c.name);
            return s > (best.s || 0) ? { s, name: c.name.substring(0, 20) } : best;
          }, { s: 0, name: '' } as { s: number; name: string });
          parts.push(`FM✗="${fmValue?.substring(0, 20)}"(${fmValue?.length || 0}자) 최근사="${bestFmC.name}"(${Math.round(bestFmC.s * 100)}%)`);
        }
        if (!fc) {
          parts.push(`FC✗="${fcValue?.substring(0, 20)}"(${fcValue?.length || 0}자)`);
        }
        skipSamples.push(`pNo=${processNo} ${parts.join(' ')}`);
      }
    }
  }

  // ★ v3.1.3: 매칭 결과 요약 (누락 원인 진단)
  if (skipSamples.length > 0) {
  }

  // ★★★ 역방향 진단: 워크시트 FM 중 링크 없는 항목 + 원인 분석 ★★★
  const linkedFmIds = new Set(failureLinks.map(l => l.fmId));
  const unlinkedDiag: string[] = [];
  for (const proc of (state.l2 || [])) {
    for (const fm of (proc.failureModes || [])) {
      if (linkedFmIds.has(fm.id)) continue;
      const nfm = normalize(fm.name);
      const npNo = normalizeProcessNo(proc.no);
      // 같은 공정+FM텍스트의 체인 찾기
      const sameProc = chains.filter(c => {
        const cn = normalizeProcessNo(c.processNo);
        return (cn === npNo || c.processNo === proc.no) && normalize(c.fmValue) === nfm;
      });
      if (sameProc.length > 0) {
        // 체인은 있으나 FE/FC 매칭 실패 → 어떤 게 실패했는지 표시
        const c = sameProc[0];
        const feOk = c.feValue ? (feByText.has(normalize(c.feValue)) || feByNoSpace.has(normalizeNoSpace(c.feValue)) || feByStripped.has(stripProcessPrefix(c.feValue))) : false;
        const fcKey1 = `${proc.no}||${normalize(c.fcValue)}`;
        const fcKey2 = `${proc.no}||${normalizeNoSpace(c.fcValue)}`;
        const fcOk = fcByProcessM4Text.has(fcKey1) || fcByProcessM4Text.has(fcKey2);
        unlinkedDiag.push(
          `pNo=${proc.no} FM="${fm.name?.substring(0, 25)}" ` +
          `→ 체인${sameProc.length}건 FE=${feOk ? 'OK' : `NG"${c.feValue?.substring(0, 20)}"`} ` +
          `FC=${fcOk ? 'OK' : `NG"${c.fcValue?.substring(0, 20)}"`}`,
        );
      } else {
        // 다른 공정에서 같은 FM텍스트 체인 찾기
        const diffProc = chains.filter(c => normalize(c.fmValue) === nfm);
        if (diffProc.length > 0) {
          unlinkedDiag.push(
            `pNo=${proc.no} FM="${fm.name?.substring(0, 25)}" → 공정불일치! ` +
            `체인pNo=${diffProc[0].processNo}(≠${proc.no})`,
          );
        } else {
          // FM텍스트 자체가 체인에 없음
          const bestChain = chains.reduce((best, c) => {
            const s = charOverlapRatio(fm.name, c.fmValue || '');
            return s > best.s ? { s, pNo: c.processNo, fm: c.fmValue } : best;
          }, { s: 0, pNo: '', fm: '' });
          unlinkedDiag.push(
            `pNo=${proc.no} FM="${fm.name?.substring(0, 25)}" → 체인없음! ` +
            `최근사="${bestChain.fm?.substring(0, 20)}"(${Math.round(bestChain.s * 100)}%) pNo=${bestChain.pNo}`,
          );
        }
      }
    }
  }
  if (unlinkedDiag.length > 0) {
  }

  // ─── specialChar 전파: chain → productChars/processChars (이름 매칭) ───
  for (const chain of chains) {
    if (!chain.specialChar || !chain.processNo) continue;
    const proc = (state.l2 || []).find(p => p.no === chain.processNo);
    if (!proc) continue;
    if (chain.productChar) {
      for (const func of (proc.functions || [])) {
        for (const pc of (func.productChars || [])) {
          if (normalize(pc.name) === normalize(chain.productChar) && !pc.specialChar) {
            pc.specialChar = chain.specialChar;
          }
        }
      }
    }
    if (chain.processChar) {
      for (const we of (proc.l3 || [])) {
        for (const weFunc of (we.functions || [])) {
          for (const prc of (weFunc.processChars || [])) {
            if (normalize(prc.name) === normalize(chain.processChar) && !prc.specialChar) {
              prc.specialChar = chain.specialChar;
            }
          }
        }
      }
    }
  }

  // ★★★ 2026-02-28: P5 해결 — seq 필드 계산 (post-processing) ★★★
  // 링크 생성 순서 유지하며 seq 값을 계산
  computeSeqFields(failureLinks);

  return { failureLinks, riskData, injectedCount, skippedCount, autoCreated };
}

// ─── seq 필드 계산 ───

/**
 * failureLinks 배열의 feSeq/fmSeq/fcSeq를 in-place로 설정
 *
 * - feSeq: 같은 공정(fmProcessNo) 내 FE 출현 순서 (1-based)
 * - fmSeq: 같은 FE(feId) 그룹 내 FM 출현 순서 (1-based)
 * - fcSeq: 같은 FM(fmId) 그룹 내 FC 출현 순서 (1-based)
 *
 * 순서는 배열 인덱스(=체인 처리 순서) 기준, 첫 등장 순
 */
function computeSeqFields(links: FailureLinkEntry[]): void {
  if (links.length === 0) return;

  // ── 1. fcSeq: 같은 fmId 내 FC 순서 ──
  const fmGroupFcCount = new Map<string, number>();
  for (const link of links) {
    const count = (fmGroupFcCount.get(link.fmId) || 0) + 1;
    fmGroupFcCount.set(link.fmId, count);
    link.fcSeq = count;
  }

  // ── 2. fmSeq: 같은 feId 내 FM 순서 ──
  // 같은 feId 내에서 고유 fmId가 등장하는 순서
  const feGroupFmOrder = new Map<string, Map<string, number>>();
  for (const link of links) {
    if (!feGroupFmOrder.has(link.feId)) {
      feGroupFmOrder.set(link.feId, new Map());
    }
    const fmOrder = feGroupFmOrder.get(link.feId)!;
    if (!fmOrder.has(link.fmId)) {
      fmOrder.set(link.fmId, fmOrder.size + 1);
    }
    link.fmSeq = fmOrder.get(link.fmId)!;
  }

  // ── 3. feSeq: 같은 공정(fmProcessNo) 내 FE 순서 ──
  // 같은 공정 내에서 고유 feId가 등장하는 순서
  const procFeOrder = new Map<string, Map<string, number>>();
  for (const link of links) {
    const pNo = link.fmProcessNo || '';
    if (!procFeOrder.has(pNo)) {
      procFeOrder.set(pNo, new Map());
    }
    const feOrder = procFeOrder.get(pNo)!;
    if (!feOrder.has(link.feId)) {
      feOrder.set(link.feId, feOrder.size + 1);
    }
    link.feSeq = feOrder.get(link.feId)!;
  }
}
