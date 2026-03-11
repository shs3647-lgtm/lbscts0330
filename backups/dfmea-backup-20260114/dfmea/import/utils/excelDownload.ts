/**
 * @file excelDownload.ts
 * @description Import 페이지 Excel 다운로드 유틸리티
 */

import ExcelJS from 'exceljs';

/** Excel 파일 다운로드 헬퍼 */
export async function downloadExcelBuffer(buffer: ArrayBuffer | ExcelJS.Buffer, fileName: string) {
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

/** L1 고장영향 다운로드 */
export async function downloadL1FailureEffect(ws: any, fmeaName: string) {
  const workbook = new ExcelJS.Workbook();
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
  (ws.l1?.types || []).forEach((t: any) => {
    (t.functions || []).forEach((fn: any) => {
      (fn.requirements || []).forEach((req: any) => {
        (req.failureEffects || [{ name: '' }]).forEach((fe: any) => {
          sheet.addRow({
            no: rowNo++,
            type: t.typeName,
            func: fn.name,
            req: req.name,
            effect: fe.name || '',
            severity: fe.severity || ''
          });
        });
      });
    });
  });
  
  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `${fmeaName}_L1_고장영향_${new Date().toISOString().slice(0, 10)}`;
  await downloadExcelBuffer(buffer, fileName);
}

/** L2 고장형태 다운로드 */
export async function downloadL2FailureMode(ws: any, fmeaName: string) {
  const workbook = new ExcelJS.Workbook();
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
  (ws.l2 || []).forEach((proc: any) => {
    (proc.functions || []).forEach((fn: any) => {
      (fn.productChars || []).forEach((pc: any) => {
        (pc.failureModes || [{ name: '' }]).forEach((fm: any) => {
          sheet.addRow({
            no: rowNo++,
            proc: proc.name,
            func: fn.name,
            char: pc.name,
            mode: fm.name || ''
          });
        });
      });
    });
  });
  
  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `${fmeaName}_L2_고장형태_${new Date().toISOString().slice(0, 10)}`;
  await downloadExcelBuffer(buffer, fileName);
}

/** L3 고장원인 다운로드 */
export async function downloadL3FailureCause(ws: any, fmeaName: string) {
  const workbook = new ExcelJS.Workbook();
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
  (ws.l2 || []).forEach((proc: any) => {
    (proc.l3 || []).forEach((we: any) => {
      (we.functions || []).forEach((fn: any) => {
        (fn.processChars || []).forEach((pc: any) => {
          (pc.failureCauses || [{ name: '' }]).forEach((fc: any) => {
            sheet.addRow({
              no: rowNo++,
              proc: proc.name,
              we: we.name,
              func: fn.name,
              char: pc.name,
              cause: fc.name || '',
              occ: fc.occurrence || ''
            });
          });
        });
      });
    });
  });
  
  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `${fmeaName}_L3_고장원인_${new Date().toISOString().slice(0, 10)}`;
  await downloadExcelBuffer(buffer, fileName);
}

/** L0 기초정보 다운로드 */
export async function downloadL0BasicInfo(ws: any, fmeaName: string) {
  const workbook = new ExcelJS.Workbook();
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
  (ws.l2 || []).forEach((proc: any) => {
    (proc.l3 || []).forEach((we: any) => {
      sheet.addRow({
        no: rowNo++,
        l1: ws.l1?.name || '',
        l2: proc.name,
        l3: we.name
      });
    });
  });
  
  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `${fmeaName}_L0_기초정보_${new Date().toISOString().slice(0, 10)}`;
  await downloadExcelBuffer(buffer, fileName);
}

/** FMEA 샘플 다운로드 (레벨별) */
export async function downloadFmeaSample(
  ws: any,
  fmeaName: string,
  level: 'L0' | 'L1' | 'L2' | 'L3'
) {
  switch (level) {
    case 'L0':
      await downloadL0BasicInfo(ws, fmeaName);
      break;
    case 'L1':
      await downloadL1FailureEffect(ws, fmeaName);
      break;
    case 'L2':
      await downloadL2FailureMode(ws, fmeaName);
      break;
    case 'L3':
      await downloadL3FailureCause(ws, fmeaName);
      break;
  }
}



