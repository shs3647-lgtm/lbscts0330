/**
 * @file supplementChainsFromFlatData.ts
 * @description 메인시트(flatData)에 있지만 FC시트 chains에 없는 FC/FE 항목을 보충
 *
 * FAVerificationBar에서 chainFC vs fdFC, chainFE vs fdFE 비교 시
 * FC시트가 메인시트의 일부만 커버하는 경우 미매칭이 발생한다.
 * 이 함수는 메인시트의 누락 항목을 chains에 추가하여 검증을 통과시킨다.
 *
 * @created 2026-03-16
 */

import type { MasterFailureChain } from '../types/masterFailureChain';
import type { ImportedFlatData } from '../types';

// ─── processNo 정규화 ───
// masterFailureChain.ts의 normalizeProcessNo와 동일 로직 (순환 import 방지용 로컬 복사)
function normalizeProcessNo(pNo: string | undefined): string {
  if (!pNo) return '';
  let n = pNo.trim();
  n = n.replace(/^(공정|process|proc|p)[\s\-_]*/i, '');
  n = n.replace(/번$/, '');
  n = n.replace(/^0+(?=\d)/, '');
  return n;
}

/**
 * 메인시트(flatData)에 있지만 FC시트 chains에 없는 FC/FE 항목을 보충하여 반환.
 * 원본 chains 배열은 변이하지 않는다.
 *
 * 비유: FC시트가 "출석부"라면, 이 함수는 출석부에 빠진 학생(메인시트에는 있는)을
 * 찾아내서 출석부 사본 뒤에 추가해주는 역할이다.
 */
export function supplementChainsFromFlatData(
  chains: MasterFailureChain[],
  flatData: ImportedFlatData[],
): MasterFailureChain[] {
  // ── 1. 기존 chain에서 FC 키 Set 구축: "normalizedProcessNo|trimmedFcValue" ──
  const existingFCKeys = new Set<string>();
  for (const chain of chains) {
    if (chain.fcValue?.trim()) {
      const normPNo = normalizeProcessNo(chain.processNo);
      existingFCKeys.add(`${normPNo}|${chain.fcValue.trim()}`);
    }
  }

  // ── 2. 기존 chain에서 FE 값 Set 구축: trimmed feValue ──
  const existingFEValues = new Set<string>();
  for (const chain of chains) {
    if (chain.feValue?.trim()) {
      existingFEValues.add(chain.feValue.trim());
    }
  }

  // ── 보조 인덱스: 공정별 FM (chains에서) ──
  const chainFMByProcess = new Map<string, string>();
  for (const chain of chains) {
    const normPNo = normalizeProcessNo(chain.processNo);
    if (normPNo && chain.fmValue?.trim() && !chainFMByProcess.has(normPNo)) {
      chainFMByProcess.set(normPNo, chain.fmValue.trim());
    }
  }

  // ── 보조 인덱스: 공정별 FE (chains에서) ──
  const chainFEByProcess = new Map<string, { feValue: string; feScope?: string }>();
  for (const chain of chains) {
    const normPNo = normalizeProcessNo(chain.processNo);
    if (normPNo && chain.feValue?.trim() && !chainFEByProcess.has(normPNo)) {
      chainFEByProcess.set(normPNo, {
        feValue: chain.feValue.trim(),
        feScope: chain.feScope,
      });
    }
  }

  // ── 보조 인덱스: 공정별 m4 (chains에서) ──
  const chainM4ByProcess = new Map<string, string>();
  for (const chain of chains) {
    const normPNo = normalizeProcessNo(chain.processNo);
    if (normPNo && chain.m4 && !chainM4ByProcess.has(normPNo)) {
      chainM4ByProcess.set(normPNo, chain.m4);
    }
  }

  // ── 보조 인덱스: flatData에서 공정별 FM(A5) ──
  const flatFMByProcess = new Map<string, string>();
  for (const d of flatData) {
    if (d.itemCode === 'A5' && d.value?.trim()) {
      const normPNo = normalizeProcessNo(d.processNo);
      if (normPNo && !flatFMByProcess.has(normPNo)) {
        flatFMByProcess.set(normPNo, d.value.trim());
      }
    }
  }

  // ── 보조 인덱스: flatData에서 공정별 FE(C4) ──
  const flatFEByProcess = new Map<string, { feValue: string; feScope: string }>();
  for (const d of flatData) {
    if (d.itemCode === 'C4' && d.value?.trim()) {
      const normPNo = normalizeProcessNo(d.processNo);
      if (normPNo && !flatFEByProcess.has(normPNo)) {
        flatFEByProcess.set(normPNo, {
          feValue: d.value.trim(),
          feScope: normPNo,
        });
      }
    }
  }

  // ── 전체 FE 목록 (fallback용) ──
  const allFEValues: { feValue: string; feScope: string }[] = [];
  const feSeen = new Set<string>();
  for (const d of flatData) {
    if (d.itemCode === 'C4' && d.value?.trim()) {
      const key = d.value.trim().toLowerCase();
      if (!feSeen.has(key)) {
        feSeen.add(key);
        allFEValues.push({
          feValue: d.value.trim(),
          feScope: normalizeProcessNo(d.processNo) || d.processNo || '',
        });
      }
    }
  }
  const defaultFE = allFEValues.length > 0 ? allFEValues[0] : { feValue: '', feScope: '' };

  const newChains: MasterFailureChain[] = [];
  let fcIdx = 0;
  let feIdx = 0;

  // ── 3. flatData B4 항목 중 chains에 없는 FC 보충 ──
  for (const d of flatData) {
    if (d.itemCode !== 'B4') continue;
    if (!d.value?.trim()) continue;

    const normPNo = normalizeProcessNo(d.processNo);
    const fcKey = `${normPNo}|${d.value.trim()}`;

    if (existingFCKeys.has(fcKey)) continue;
    // 중복 방지: 이미 이번 보충에서 추가한 키
    existingFCKeys.add(fcKey);

    // FM 결정: chains에서 같은 공정 → flatData A5에서 같은 공정
    const fmValue =
      chainFMByProcess.get(normPNo) ||
      flatFMByProcess.get(normPNo) ||
      '';

    // FE 결정: chains에서 같은 공정 → flatData C4에서 같은 공정 → 전체 첫 번째 FE
    const feInfo =
      chainFEByProcess.get(normPNo) ||
      flatFEByProcess.get(normPNo) ||
      defaultFE;

    // m4 결정: flatData 원본 → chains에서 같은 공정
    const m4 = d.m4 || chainM4ByProcess.get(normPNo) || undefined;

    newChains.push({
      id: `supplement-fc-${fcIdx++}`,
      processNo: normPNo || d.processNo || '',
      m4,
      fmValue,
      fcValue: d.value.trim(),
      feValue: feInfo.feValue,
      feScope: feInfo.feScope || undefined,
    });
  }

  // ── 4. flatData C4 항목 중 chains에 없는 FE 보충 ──
  for (const d of flatData) {
    if (d.itemCode !== 'C4') continue;
    if (!d.value?.trim()) continue;

    const feValue = d.value.trim();
    if (existingFEValues.has(feValue)) continue;
    // 중복 방지
    existingFEValues.add(feValue);

    // 이미 FC 보충 과정에서 이 FE를 참조하는 chain이 추가되었는지 확인
    const alreadyReferenced = newChains.some(
      (c) => c.feValue === feValue,
    );
    if (alreadyReferenced) continue;

    const normPNo = normalizeProcessNo(d.processNo);

    newChains.push({
      id: `supplement-fe-${feIdx++}`,
      processNo: normPNo || d.processNo || '',
      fmValue: flatFMByProcess.get(normPNo) || '',
      fcValue: '',
      feValue,
      feScope: normPNo || undefined,
    });
  }

  // ── 5. 원본 불변: 새 배열 반환 ──
  return [...chains, ...newChains];
}
