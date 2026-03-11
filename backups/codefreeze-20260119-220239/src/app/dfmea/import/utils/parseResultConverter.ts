/**
 * @file parseResultConverter.ts
 * @description ParseResult를 ImportedFlatData로 변환하는 유틸리티
 */

import { ImportedFlatData } from '../types';
import { ParseResult } from '../excel-parser';

/**
 * ParseResult를 ImportedFlatData 배열로 변환
 */
export function convertParseResultToFlatData(result: ParseResult): ImportedFlatData[] {
  const flat: ImportedFlatData[] = [];

  result.processes.forEach((p) => {
    flat.push({
      id: `${p.processNo}-A1`,
      processNo: p.processNo,
      category: 'A',
      itemCode: 'A1',
      value: p.processNo,
      createdAt: new Date(),
    });
    flat.push({
      id: `${p.processNo}-A2`,
      processNo: p.processNo,
      category: 'A',
      itemCode: 'A2',
      value: p.processName,
      createdAt: new Date(),
    });
    p.processDesc.forEach((v, i) =>
      flat.push({
        id: `${p.processNo}-A3-${i}`,
        processNo: p.processNo,
        category: 'A',
        itemCode: 'A3',
        value: v,
        createdAt: new Date(),
      })
    );
    p.productChars.forEach((v, i) =>
      flat.push({
        id: `${p.processNo}-A4-${i}`,
        processNo: p.processNo,
        category: 'A',
        itemCode: 'A4',
        value: v,
        createdAt: new Date(),
      })
    );
    p.failureModes.forEach((v, i) =>
      flat.push({
        id: `${p.processNo}-A5-${i}`,
        processNo: p.processNo,
        category: 'A',
        itemCode: 'A5',
        value: v,
        createdAt: new Date(),
      })
    );
    p.detectionCtrls.forEach((v, i) =>
      flat.push({
        id: `${p.processNo}-A6-${i}`,
        processNo: p.processNo,
        category: 'A',
        itemCode: 'A6',
        value: v,
        createdAt: new Date(),
      })
    );
    p.workElements.forEach((v, i) =>
      flat.push({
        id: `${p.processNo}-B1-${i}`,
        processNo: p.processNo,
        category: 'B',
        itemCode: 'B1',
        value: v,
        createdAt: new Date(),
      })
    );
    p.elementFuncs.forEach((v, i) =>
      flat.push({
        id: `${p.processNo}-B2-${i}`,
        processNo: p.processNo,
        category: 'B',
        itemCode: 'B2',
        value: v,
        createdAt: new Date(),
      })
    );
    p.processChars.forEach((v, i) =>
      flat.push({
        id: `${p.processNo}-B3-${i}`,
        processNo: p.processNo,
        category: 'B',
        itemCode: 'B3',
        value: v,
        createdAt: new Date(),
      })
    );
    p.failureCauses.forEach((v, i) =>
      flat.push({
        id: `${p.processNo}-B4-${i}`,
        processNo: p.processNo,
        category: 'B',
        itemCode: 'B4',
        value: v,
        createdAt: new Date(),
      })
    );
    p.preventionCtrls.forEach((v, i) =>
      flat.push({
        id: `${p.processNo}-B5-${i}`,
        processNo: p.processNo,
        category: 'B',
        itemCode: 'B5',
        value: v,
        createdAt: new Date(),
      })
    );
  });

  result.products.forEach((p) => {
    flat.push({
      id: `C1-${p.productProcessName}`,
      processNo: 'ALL',
      category: 'C',
      itemCode: 'C1',
      value: p.productProcessName,
      createdAt: new Date(),
    });
    p.productFuncs.forEach((v, i) =>
      flat.push({
        id: `C2-${p.productProcessName}-${i}`,
        processNo: 'ALL',
        category: 'C',
        itemCode: 'C2',
        value: v,
        createdAt: new Date(),
      })
    );
    p.requirements.forEach((v, i) =>
      flat.push({
        id: `C3-${p.productProcessName}-${i}`,
        processNo: 'ALL',
        category: 'C',
        itemCode: 'C3',
        value: v,
        createdAt: new Date(),
      })
    );
    p.failureEffects.forEach((v, i) =>
      flat.push({
        id: `C4-${p.productProcessName}-${i}`,
        processNo: 'ALL',
        category: 'C',
        itemCode: 'C4',
        value: v,
        createdAt: new Date(),
      })
    );
  });

  return flat;
}



