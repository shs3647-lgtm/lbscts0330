/**
 * @file compareData.ts
 * @description 기초정보 변경 비교 유틸리티 - 기존 데이터와 새 데이터 비교
 * @author AI Assistant
 * @created 2026-01-18
 */

import { ImportedFlatData } from '../types';
import { ChangeItem, ChangeType } from '../components/DataCompareModal';

/** 아이템 코드 → 레이블 매핑 */
const ITEM_LABELS: Record<string, string> = {
  A1: '공정번호',
  A2: '공정명',
  A3: '공정기능',
  A4: '제품특성',
  A5: '고장형태',
  A6: '검출관리',
  B1: '작업요소',
  B2: '요소기능',
  B3: '공정특성',
  B4: '고장원인',
  B5: '예방관리',
  C1: '구분',
  C2: '제품기능',
  C3: '요구사항',
  C4: '고장영향',
};

/**
 * 두 데이터셋 비교하여 변경 목록 생성
 * @param oldData 기존 데이터
 * @param newData 새 데이터
 * @returns 변경 항목 배열
 */
export function compareData(
  oldData: ImportedFlatData[],
  newData: ImportedFlatData[]
): ChangeItem[] {
  const changes: ChangeItem[] = [];

  // 기존 데이터를 맵으로 변환 (processNo + itemCode로 키 생성)
  const oldMap = new Map<string, ImportedFlatData>();
  oldData.forEach(item => {
    const key = `${item.processNo}:${item.itemCode}`;
    oldMap.set(key, item);
  });

  // 새 데이터를 맵으로 변환
  const newMap = new Map<string, ImportedFlatData>();
  newData.forEach(item => {
    const key = `${item.processNo}:${item.itemCode}`;
    newMap.set(key, item);
  });

  // 새 데이터 기준으로 비교 (추가/수정/동일)
  newData.forEach(newItem => {
    const key = `${newItem.processNo}:${newItem.itemCode}`;
    const oldItem = oldMap.get(key);

    let changeType: ChangeType;
    let oldValue = '';

    if (!oldItem) {
      // 기존에 없음 → 추가
      changeType = 'added';
    } else if (oldItem.value !== newItem.value) {
      // 값이 다름 → 수정
      changeType = 'modified';
      oldValue = oldItem.value;
    } else {
      // 값이 같음 → 동일
      changeType = 'unchanged';
      oldValue = oldItem.value;
    }

    changes.push({
      id: `change-${newItem.processNo}-${newItem.itemCode}-${Date.now()}-${Math.random()}`,
      processNo: newItem.processNo,
      itemCode: newItem.itemCode,
      itemLabel: ITEM_LABELS[newItem.itemCode] || newItem.itemCode,
      changeType,
      oldValue,
      newValue: newItem.value,
      selected: changeType !== 'unchanged', // 변경된 항목만 기본 선택
    });
  });

  // 기존 데이터에만 있는 항목 (삭제됨)
  oldData.forEach(oldItem => {
    const key = `${oldItem.processNo}:${oldItem.itemCode}`;
    if (!newMap.has(key)) {
      changes.push({
        id: `change-del-${oldItem.processNo}-${oldItem.itemCode}-${Date.now()}-${Math.random()}`,
        processNo: oldItem.processNo,
        itemCode: oldItem.itemCode,
        itemLabel: ITEM_LABELS[oldItem.itemCode] || oldItem.itemCode,
        changeType: 'removed',
        oldValue: oldItem.value,
        newValue: '',
        selected: false, // 삭제는 기본적으로 선택 안 함 (위험)
      });
    }
  });

  // 공정번호(숫자 우선) 기준 정렬
  changes.sort((a, b) => {
    const numA = parseInt(a.processNo, 10);
    const numB = parseInt(b.processNo, 10);
    if (!isNaN(numA) && !isNaN(numB)) {
      if (numA !== numB) return numA - numB;
    } else {
      const cmp = a.processNo.localeCompare(b.processNo, 'ko');
      if (cmp !== 0) return cmp;
    }
    // 같은 공정번호면 itemCode로 정렬
    return a.itemCode.localeCompare(b.itemCode);
  });

  return changes;
}

/**
 * 선택된 변경 항목을 기존 데이터에 적용
 * @param oldData 기존 데이터
 * @param selectedChanges 적용할 변경 항목들
 * @returns 적용된 새 데이터
 */
export function applyChanges(
  oldData: ImportedFlatData[],
  selectedChanges: ChangeItem[]
): ImportedFlatData[] {
  // 기존 데이터 복사
  const result = [...oldData];
  const resultMap = new Map<string, number>(); // key → index

  result.forEach((item, idx) => {
    const key = `${item.processNo}:${item.itemCode}`;
    resultMap.set(key, idx);
  });

  selectedChanges.forEach(change => {
    const key = `${change.processNo}:${change.itemCode}`;
    const existingIdx = resultMap.get(key);

    switch (change.changeType) {
      case 'added':
        // 새 항목 추가
        const newItem: ImportedFlatData = {
          id: `imported-${change.processNo}-${change.itemCode}-${Date.now()}`,
          processNo: change.processNo,
          category: change.itemCode.charAt(0) as 'A' | 'B' | 'C',
          itemCode: change.itemCode,
          value: change.newValue,
          createdAt: new Date(),
        };
        result.push(newItem);
        break;

      case 'modified':
        // 기존 항목 수정
        if (existingIdx !== undefined) {
          result[existingIdx] = {
            ...result[existingIdx],
            value: change.newValue,
          };
        }
        break;

      case 'removed':
        // 기존 항목 삭제 (인덱스 역순으로 삭제해야 함)
        // 나중에 일괄 처리
        break;
    }
  });

  // 삭제 항목 처리 (역순으로)
  const keysToRemove = new Set(
    selectedChanges
      .filter(c => c.changeType === 'removed')
      .map(c => `${c.processNo}:${c.itemCode}`)
  );

  if (keysToRemove.size > 0) {
    return result.filter(item => {
      const key = `${item.processNo}:${item.itemCode}`;
      return !keysToRemove.has(key);
    });
  }

  return result;
}

/**
 * 워크시트 데이터와 기초정보 비교
 * @param worksheetData 워크시트에 저장된 공정 데이터
 * @param flatData 새로 Import된 기초정보
 * @returns 변경 항목 배열
 */
export function compareWithWorksheet(
  worksheetData: { processNo: string; processName: string }[],
  flatData: ImportedFlatData[]
): ChangeItem[] {
  const changes: ChangeItem[] = [];

  // 워크시트 공정 맵
  const wsMap = new Map<string, string>(); // processNo → processName
  worksheetData.forEach(p => {
    wsMap.set(p.processNo, p.processName);
  });

  // 기초정보에서 공정명 추출 (A2)
  const newProcesses = flatData
    .filter(d => d.itemCode === 'A2')
    .map(d => ({ processNo: d.processNo, processName: d.value }));

  // 새 공정 맵
  const newMap = new Map<string, string>();
  newProcesses.forEach(p => {
    newMap.set(p.processNo, p.processName);
  });

  // 새 기초정보 기준 비교
  newProcesses.forEach(newP => {
    const oldName = wsMap.get(newP.processNo);

    let changeType: ChangeType;
    if (!oldName) {
      changeType = 'added';
    } else if (oldName !== newP.processName) {
      changeType = 'modified';
    } else {
      changeType = 'unchanged';
    }

    changes.push({
      id: `ws-${newP.processNo}-${Date.now()}-${Math.random()}`,
      processNo: newP.processNo,
      itemCode: 'A2',
      itemLabel: '공정명',
      changeType,
      oldValue: oldName || '',
      newValue: newP.processName,
      selected: changeType !== 'unchanged',
    });
  });

  // 워크시트에만 있는 공정 (삭제됨)
  worksheetData.forEach(wsP => {
    if (!newMap.has(wsP.processNo)) {
      changes.push({
        id: `ws-del-${wsP.processNo}-${Date.now()}-${Math.random()}`,
        processNo: wsP.processNo,
        itemCode: 'A2',
        itemLabel: '공정명',
        changeType: 'removed',
        oldValue: wsP.processName,
        newValue: '',
        selected: false,
      });
    }
  });

  // 정렬
  changes.sort((a, b) => {
    const numA = parseInt(a.processNo, 10);
    const numB = parseInt(b.processNo, 10);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    return a.processNo.localeCompare(b.processNo, 'ko');
  });

  return changes;
}
