/**
 * @file downloadFmeaSample.ts
 * @description FMEA 샘플 데이터 Excel 다운로드 유틸리티
 */

import { FMEAProject } from '../constants';

interface WorksheetData {
  l1?: {
    name?: string;
    types?: Array<{
      typeName: string;
      functions?: Array<{
        name: string;
        requirements?: Array<{
          name: string;
          failureEffects?: Array<{ name?: string; severity?: number }>;
        }>;
      }>;
    }>;
  };
  l2?: Array<{
    name: string;
    functions?: Array<{
      name: string;
      productChars?: Array<{
        name: string;
        failureModes?: Array<{ name?: string }>;
      }>;
    }>;
    l3?: Array<{
      name: string;
      functions?: Array<{
        name: string;
        processChars?: Array<{
          name: string;
          failureCauses?: Array<{ name?: string; occurrence?: number }>;
        }>;
      }>;
    }>;
  }>;
}

/**
 * FMEA 샘플 데이터 Excel 다운로드
 */
export async function downloadFmeaSample(
  fmeaId: string,
  level: 'L0' | 'L1' | 'L2' | 'L3',
  fmeaList: FMEAProject[]
): Promise<void> {
  if (!fmeaId) {
    alert('FMEA를 선택해주세요.');
    return;
  }

  const wsData = localStorage.getItem(`pfmea-worksheet-${fmeaId}`);
  if (!wsData) {
    alert('해당 FMEA의 워크시트 데이터가 없습니다.');
    return;
  }

  const ws: WorksheetData = JSON.parse(wsData);
  const fmea = fmeaList.find((f) => f.id === fmeaId);
  const fmeaName = fmea?.fmeaNo || fmea?.fmeaInfo?.subject || 'FMEA';

  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();

  if (level === 'L1') {
    // 고장영향 데이터 (L1)
    const sheet = workbook.addWorksheet('L1_고장영향');
    sheet.columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: '구분', key: 'type', width: 15 },
      { header: '완제품기능', key: 'func', width: 30 },
      { header: '요구사항', key: 'req', width: 25 },
      { header: '고장영향', key: 'effect', width: 30 },
      { header: '심각도', key: 'severity', width: 8 },
    ];
    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EF4444' } };
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
    });

    let rowNo = 1;
    (ws.l1?.types || []).forEach((t) => {
      (t.functions || []).forEach((fn) => {
        (fn.requirements || []).forEach((req) => {
          (req.failureEffects || [{ name: '' }]).forEach((fe) => {
            sheet.addRow({
              no: rowNo++,
              type: t.typeName,
              func: fn.name,
              req: req.name,
              effect: fe.name || '',
              severity: fe.severity || '',
            });
          });
        });
      });
    });

    await downloadWorkbook(workbook, `${fmeaName}_L1_고장영향`);
  } else if (level === 'L2') {
    // 고장형태 데이터 (L2)
    const sheet = workbook.addWorksheet('L2_고장형태');
    sheet.columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: '공정명', key: 'proc', width: 15 },
      { header: '공정기능', key: 'func', width: 25 },
      { header: '제품특성', key: 'char', width: 25 },
      { header: '고장형태', key: 'mode', width: 30 },
    ];
    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '3B82F6' } };
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
    });

    let rowNo = 1;
    (ws.l2 || []).forEach((proc) => {
      (proc.functions || []).forEach((fn) => {
        (fn.productChars || []).forEach((pc) => {
          (pc.failureModes || [{ name: '' }]).forEach((fm) => {
            sheet.addRow({
              no: rowNo++,
              proc: proc.name,
              func: fn.name,
              char: pc.name,
              mode: fm.name || '',
            });
          });
        });
      });
    });

    await downloadWorkbook(workbook, `${fmeaName}_L2_고장형태`);
  } else if (level === 'L3') {
    // 고장원인 데이터 (L3)
    const sheet = workbook.addWorksheet('L3_고장원인');
    sheet.columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: '공정명', key: 'proc', width: 12 },
      { header: '작업요소', key: 'we', width: 15 },
      { header: '요소기능', key: 'func', width: 25 },
      { header: '공정특성', key: 'char', width: 25 },
      { header: '고장원인', key: 'cause', width: 30 },
      { header: '발생도', key: 'occ', width: 8 },
    ];
    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '22C55E' } };
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
    });

    let rowNo = 1;
    (ws.l2 || []).forEach((proc) => {
      (proc.l3 || []).forEach((we) => {
        (we.functions || []).forEach((fn) => {
          (fn.processChars || []).forEach((pc) => {
            (pc.failureCauses || [{ name: '' }]).forEach((fc) => {
              sheet.addRow({
                no: rowNo++,
                proc: proc.name,
                we: we.name,
                func: fn.name,
                char: pc.name,
                cause: fc.name || '',
                occ: fc.occurrence || '',
              });
            });
          });
        });
      });
    });

    await downloadWorkbook(workbook, `${fmeaName}_L3_고장원인`);
  } else {
    // L0 기초정보
    const sheet = workbook.addWorksheet('L0_기초정보');
    sheet.columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: '완제품공정명', key: 'l1', width: 20 },
      { header: '메인공정', key: 'l2', width: 20 },
      { header: '작업요소', key: 'l3', width: 20 },
    ];
    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '00587A' } };
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
    });

    let rowNo = 1;
    (ws.l2 || []).forEach((proc) => {
      (proc.l3 || []).forEach((we) => {
        sheet.addRow({ no: rowNo++, l1: ws.l1?.name || '', l2: proc.name, l3: we.name });
      });
    });

    await downloadWorkbook(workbook, `${fmeaName}_L0_기초정보`);
  }
}

async function downloadWorkbook(workbook: import('exceljs').Workbook, fileName: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}



