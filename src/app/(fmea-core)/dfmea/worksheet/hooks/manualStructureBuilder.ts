/**
 * @file manualStructureBuilder.ts
 * @description 수동모드 신규 FMEA — WorksheetState.l2[] → PositionAtomicData 최소 변환
 *
 * 근본 원인:
 *   신규 FMEA(Import 없음)에서 atomicDB = null → useWorksheetSave의 저장 조건 실패
 *   → 수동 추가된 공정이 DB에 전혀 저장되지 않음
 *
 * 해결:
 *   atomicDB가 null/비어있을 때 state.l2를 최소 PositionAtomicData로 변환
 *   → /api/fmea/save-position-import 로 전송 (upsert, skipDuplicates)
 */

import type {
  PositionAtomicData,
  PosL1Structure,
  PosL2Structure,
  PosL2ProcessNo,
  PosL2ProcessName,
  PosL3Structure,
  PosL3WorkElement,
  PosL3ProcessNo,
  PosL3FourM,
} from '@/types/position-import';

interface SimpleL3 {
  id?: string;
  name?: string;
  m4?: string;
  order?: number;
}

interface SimpleL2 {
  id?: string;
  no?: string;
  name?: string;
  order?: number;
  l3?: SimpleL3[];
}

/**
 * WorksheetState.l2[] → PositionAtomicData 최소 변환
 * L1/L2/L3 구조만 생성 (FM/FC/RA는 빈 배열)
 *
 * @returns null — 유효한 공정이 없으면 저장 불필요
 */
export function buildManualPositionData(
  fmeaId: string,
  l1Name: string,
  l2Items: SimpleL2[]
): PositionAtomicData | null {
  const normalizedId = fmeaId.toLowerCase();

  // 유효한 공정(이름 또는 번호가 있는 것)만 처리
  const validL2 = l2Items.filter(p => p.name?.trim() || p.no?.trim());
  if (validL2.length === 0) return null;

  const L1_ID = 'L1-STRUCT';

  const l1Structure: PosL1Structure = {
    id: L1_ID,
    fmeaId: normalizedId,
    name: l1Name || '완제품 공정',
  };

  const l2Structures: PosL2Structure[] = [];
  const l2ProcessNos: PosL2ProcessNo[] = [];
  const l2ProcessNames: PosL2ProcessName[] = [];
  const l3Structures: PosL3Structure[] = [];
  const l3WorkElements: PosL3WorkElement[] = [];
  const l3ProcessNos: PosL3ProcessNo[] = [];
  const l3FourMs: PosL3FourM[] = [];

  validL2.forEach((l2, i) => {
    // ID 보존: 모달에서 생성된 proc_new_xxx ID 그대로 사용
    const l2Id = l2.id?.trim() || `L2-MAN-${normalizedId}-${i}`;
    const processNo = l2.no?.trim() || String((i + 1) * 10);
    const processName = l2.name?.trim() || '';

    l2Structures.push({
      id: l2Id,
      fmeaId: normalizedId,
      l1Id: L1_ID,
      parentId: L1_ID,
      no: processNo,
      name: processName,
      order: i,
    });

    l2ProcessNos.push({
      id: `${l2Id}-C1`,
      fmeaId: normalizedId,
      l2StructId: l2Id,
      parentId: l2Id,
      no: processNo,
    });

    l2ProcessNames.push({
      id: `${l2Id}-C2`,
      fmeaId: normalizedId,
      l2StructId: l2Id,
      parentId: l2Id,
      name: processName,
    });

    // L3: 빈 placeholder 포함 (수동 입력된 부품(컴포넌트))
    const l3s = (l2.l3 || []);
    l3s.forEach((l3, j) => {
      const l3Id = l3.id?.trim() || `L3-MAN-${l2Id}-${j}`;
      const weName = l3.name?.trim() || '';
      const m4 = l3.m4?.trim() || '';

      l3Structures.push({
        id: l3Id,
        fmeaId: normalizedId,
        l1Id: L1_ID,
        l2Id,
        parentId: l2Id,
        m4,
        name: weName,
        order: j,
      });

      l3ProcessNos.push({
        id: `${l3Id}-C1`,
        fmeaId: normalizedId,
        l3StructId: l3Id,
        parentId: l3Id,
        no: processNo,
      });

      if (weName) {
        l3WorkElements.push({
          id: `${l3Id}-C3`,
          fmeaId: normalizedId,
          l3StructId: l3Id,
          parentId: l3Id,
          name: weName,
        });
      }

      if (m4) {
        l3FourMs.push({
          id: `${l3Id}-C2`,
          fmeaId: normalizedId,
          l3StructId: l3Id,
          parentId: l3Id,
          m4,
        });
      }
    });
  });

  return {
    fmeaId: normalizedId,
    l1Structure,
    l1Functions: [],
    l1Requirements: [],
    l1Scopes: [],
    l2Structures,
    l2Functions: [],
    l2ProcessNos,
    l2ProcessNames,
    l2SpecialChars: [],
    l3Structures,
    l3Functions: [],
    l3ProcessChars: [],
    l3ProcessNos,
    l3FourMs,
    l3WorkElements,
    l3SpecialChars: [],
    processProductChars: [],
    failureEffects: [],
    failureModes: [],
    failureCauses: [],
    failureLinks: [],
    riskAnalyses: [],
    stats: {
      l2: l2Structures.length,
      l3: l3Structures.length,
    },
  };
}
