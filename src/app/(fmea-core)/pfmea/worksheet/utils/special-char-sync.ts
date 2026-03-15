/**
 * @file special-char-sync.ts
 * @description 특별특성 마스터 연동 유틸리티
 *
 * 기능:
 * 1. FMEA 작성 시 마스터에 등록된 특별특성이면 자동으로 SC 지정
 * 2. FMEA에서 SC 지정 시 마스터에 저장
 */

import { SpecialCharMaster, getSpecialCharMaster } from '@/components/modals/SpecialCharMasterModal';

const SC_MASTER_KEY = 'pfmea_special_char_master';

/**
 * 마스터에서 제품특성으로 특별특성 조회
 * @param productCharName 제품특성명
 * @returns 매칭되는 특별특성 마스터 (없으면 null)
 */
export function findSCByProductChar(productCharName: string): SpecialCharMaster | null {
  if (!productCharName) return null;
  const masterData = getSpecialCharMaster();
  return masterData.find(item =>
    item.productChar === productCharName &&
    item.linkPFMEA
  ) || null;
}

/**
 * 마스터에서 공정특성으로 특별특성 조회
 * @param processCharName 공정특성명
 * @returns 매칭되는 특별특성 마스터 (없으면 null)
 */
export function findSCByProcessChar(processCharName: string): SpecialCharMaster | null {
  if (!processCharName) return null;
  const masterData = getSpecialCharMaster();
  return masterData.find(item =>
    item.processChar === processCharName &&
    item.linkPFMEA
  ) || null;
}

/**
 * 특별특성 마스터에 새 항목 추가 또는 업데이트
 * @param charName 특성명
 * @param charType 'product' | 'process'
 * @param scValue SC 지정 여부
 * @param customerSymbol 고객 기호 (예: IC, CC)
 */
export function syncSCToMaster(
  charName: string,
  charType: 'product' | 'process',
  scValue: boolean,
  customerSymbol: string = 'IC'
): void {
  if (!charName || typeof window === 'undefined') return;

  const saved = localStorage.getItem(SC_MASTER_KEY);
  const masterData: SpecialCharMaster[] = saved ? JSON.parse(saved) : [];

  const field = charType === 'product' ? 'productChar' : 'processChar';
  const existingIdx = masterData.findIndex(item => item[field] === charName);

  if (scValue) {
    // SC 지정됨 → 마스터에 추가/업데이트
    if (existingIdx === -1) {
      // 신규 추가
      const newItem: SpecialCharMaster = {
        id: `SC_AUTO_${Date.now()}`,
        customer: '자동등록',
        customerSymbol: customerSymbol,
        internalSymbol: customerSymbol,
        meaning: charType === 'product' ? '제품 특별특성' : '공정 특별특성',
        icon: customerSymbol,
        color: customerSymbol === '★' ? '#e65100' : customerSymbol === '◇' ? '#00838f' : '#9e9e9e',
        partName: '',
        processName: '',
        productChar: charType === 'product' ? charName : '',
        processChar: charType === 'process' ? charName : '',
        linkDFMEA: false,
        linkPFMEA: true,
        linkCP: true,
        linkPFD: false,
      };
      masterData.push(newItem);
    } else {
      // 기존 항목 업데이트 (linkPFMEA 활성화)
      masterData[existingIdx] = {
        ...masterData[existingIdx],
        linkPFMEA: true,
        linkCP: true,
      };
    }
  } else {
    // SC 해제됨 → 마스터에서 linkPFMEA 비활성화 (삭제하지 않음)
    if (existingIdx !== -1) {
      masterData[existingIdx] = {
        ...masterData[existingIdx],
        linkPFMEA: false,
      };
    }
  }

  localStorage.setItem(SC_MASTER_KEY, JSON.stringify(masterData));
}

/**
 * 고장형태 SC 자동 지정 (제품특성 기준)
 * @param productCharName 제품특성명
 * @returns SC 지정 여부
 */
export function autoSetSCForFailureMode(productCharName: string): boolean {
  const sc = findSCByProductChar(productCharName);
  if (sc) {
    return true;
  }
  return false;
}

/**
 * 고장원인 SC 자동 지정 (공정특성 기준)
 * @param processCharName 공정특성명
 * @returns SC 지정 여부
 */
export function autoSetSCForFailureCause(processCharName: string): boolean {
  const sc = findSCByProcessChar(processCharName);
  if (sc) {
    return true;
  }
  return false;
}

/**
 * 특별특성 마스터 통계
 */
export function getSCMasterStats(): { total: number; productSC: number; processSC: number; pfmeaLinked: number } {
  const masterData = getSpecialCharMaster();
  return {
    total: masterData.length,
    productSC: masterData.filter(m => m.productChar).length,
    processSC: masterData.filter(m => m.processChar).length,
    pfmeaLinked: masterData.filter(m => m.linkPFMEA).length,
  };
}

