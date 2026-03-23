/**
 * @file SODExcelUtils.ts
 * @description SOD 기준표 Excel 내보내기/가져오기 유틸리티
 */

import { SODItem, DEFAULT_STANDARD, uid } from './SODMasterData';

/** 컬럼 정의 타입 */
type ColDef = { header: string; sub: string; key: keyof SODItem; width: number; hdrColor?: string };

/** 카테고리/탭별 추가 컬럼 정의 */
function getExtraCols(activeCategory: 'S' | 'O' | 'D', activeTab: 'P-FMEA' | 'D-FMEA'): ColDef[] {
  if (activeCategory === 'S') {
    if (activeTab === 'P-FMEA') {
      return [
        { header: '귀사의 공장에 미치는 영향', sub: 'Impact to Your Plant', key: 'yourPlant', width: 50 },
        { header: '고객사에 미치는 영향', sub: 'Impact to Ship-to-Plant', key: 'shipToPlant', width: 50 },
        { header: '최종사용자에 대한 영향', sub: 'Impact to End User', key: 'endUser', width: 50 },
      ];
    }
    return [{ header: 'DFMEA 심각도 기준', sub: 'DFMEA Severity Criteria', key: 'endUser', width: 80 }];
  }
  if (activeCategory === 'O') {
    if (activeTab === 'P-FMEA') {
      return [
        { header: '관리유형', sub: 'Type of Control', key: 'controlType', width: 35, hdrColor: 'FFD97706' },
        { header: '예방관리', sub: 'Prevention Controls', key: 'preventionControl', width: 55, hdrColor: 'FFD97706' },
        { header: 'FMEA 대안1 발생빈도', sub: 'Incidents per 1,000 items', key: 'description', width: 35, hdrColor: 'FF991B1B' },
      ];
    }
    return [
      { header: 'DFMEA 발생도 기준', sub: 'DFMEA Occurrence Criteria', key: 'criteria', width: 60 },
      { header: 'FMEA 대안1', sub: 'Incidents per 1,000 item/vehicles', key: 'description', width: 35, hdrColor: 'FF991B1B' },
    ];
  }
  // D
  return [
    { header: '검출방법 성숙도', sub: 'Detection Method Maturity', key: 'criteria', width: 60 },
    { header: '검출기회', sub: 'Opportunity for Detection', key: 'description', width: 60 },
    { header: '검출방법 사례', sub: 'Detection Method Examples', key: 'detectionExamples', width: 50, hdrColor: 'FF00796B' },
  ];
}

/** Excel 내보내기 */
export async function exportSODToExcel(
  items: SODItem[],
  activeTab: 'P-FMEA' | 'D-FMEA',
  activeCategory: 'S' | 'O' | 'D',
  activeStandard: string,
) {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  const catLabel = activeCategory === 'S' ? '심각도' : activeCategory === 'O' ? '발생도' : '검출도';
  const sheet = workbook.addWorksheet(`${activeStandard} ${activeTab} ${catLabel}`);

  const filteredItems = items
    .filter(item => item.fmeaType === activeTab && item.category === activeCategory && (item.standard || DEFAULT_STANDARD) === activeStandard)
    .sort((a, b) => b.rating - a.rating);

  const baseCols: ColDef[] = [
    { header: '등급', sub: 'Rating', key: 'rating', width: 10 },
    { header: '레벨', sub: 'Level', key: 'levelKr', width: 20 },
  ];
  const extraCols = getExtraCols(activeCategory, activeTab);
  const allCols = [...baseCols, ...extraCols];
  allCols.forEach((col, i) => { sheet.getColumn(i + 1).width = col.width; });

  /** S 헤더: 과도한 적색 완화 (Material Red 700) */
  const catColors: Record<string, string> = { S: 'FFD32F2F', O: 'FF1565C0', D: 'FF2E7D32' };
  const defaultHdrColor = catColors[activeCategory];
  const thinBorder = {
    top: { style: 'thin' as const }, bottom: { style: 'thin' as const },
    left: { style: 'thin' as const }, right: { style: 'thin' as const },
  };

  // 헤더 행
  const hdrRow = sheet.addRow(allCols.map(c => `${c.header}\n${c.sub}`));
  hdrRow.height = 40;
  hdrRow.eachCell((cell, colNum) => {
    const bgColor = allCols[colNum - 1].hdrColor || defaultHdrColor;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder;
  });

  // 데이터 행
  filteredItems.forEach(item => {
    const vals = allCols.map(col => {
      if (col.key === 'rating') return item.rating;
      if (col.key === 'levelKr') return `${item.levelKr}\n${item.levelEn}`;
      return String(item[col.key] || '');
    });
    const row = sheet.addRow(vals);

    // 등급별 색상
    const r = item.rating;
    let rowBg: string, rBg: string, rFont: string;
    if (r >= 9) { rowBg = 'FFFFCDD2'; rBg = 'FFC62828'; rFont = 'FFFFFFFF'; }
    else if (r >= 7) { rowBg = 'FFFFE0B2'; rBg = 'FFEF6C00'; rFont = 'FFFFFFFF'; }
    else if (r >= 5) { rowBg = 'FFFFF9C4'; rBg = 'FFF9A825'; rFont = 'FF333333'; }
    else if (r >= 3) { rowBg = 'FFDCEDC8'; rBg = 'FF7CB342'; rFont = 'FFFFFFFF'; }
    else { rowBg = 'FFC8E6C9'; rBg = 'FF2E7D32'; rFont = 'FFFFFFFF'; }

    row.eachCell((cell, colNum) => {
      const isRating = colNum === 1;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isRating ? rBg : rowBg } };
      cell.font = { color: { argb: isRating ? rFont : 'FF333333' }, bold: isRating, size: isRating ? 12 : 10 };
      cell.alignment = { horizontal: isRating || colNum <= 2 ? 'center' : 'left', vertical: 'middle', wrapText: true };
      cell.border = thinBorder;
    });

    // D 카테고리 등급1: 검출방법 성숙도 + 검출기회 셀 병합
    if (activeCategory === 'D' && item.rating === 1) {
      const mergeStart = baseCols.length + 1;
      const mergeEnd = allCols.length;
      if (mergeEnd > mergeStart) {
        sheet.mergeCells(row.number, mergeStart, row.number, mergeEnd);
        const mergedCell = row.getCell(mergeStart);
        mergedCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      }
    }
    row.height = 50;
  });

  // 다운로드
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${activeStandard}_${activeTab}_${catLabel}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

/** 헤더 → 필드 매핑 */
const FIELD_MAP: Record<string, keyof SODItem | '_level'> = {
  '등급': 'rating', '레벨': '_level', '레벨(한글)': 'levelKr', '레벨(영문)': 'levelEn',
  '귀사의 공장에 미치는 영향': 'yourPlant', '고객사에 미치는 영향': 'shipToPlant',
  '최종사용자에 대한 영향': 'endUser', 'DFMEA 심각도 기준': 'endUser',
  '관리유형': 'controlType', '예방관리': 'preventionControl',
  'FMEA 대안1 발생빈도': 'description', 'DFMEA 발생도 기준': 'criteria',
  'FMEA 대안1': 'description', '검출방법 성숙도': 'criteria', '검출기회': 'description',
  '검출방법 사례': 'detectionExamples',
};

/** Excel 가져오기 - 파일 선택 후 파싱 */
export function importSODFromExcel(
  activeTab: 'P-FMEA' | 'D-FMEA',
  activeCategory: 'S' | 'O' | 'D',
  activeStandard: string,
  onComplete: (importedItems: SODItem[]) => void,
) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.xlsx,.xls';
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());

      const sheet = workbook.worksheets[0];
      if (!sheet) { alert('시트를 찾을 수 없습니다.'); return; }

      const colMap: { col: number; field: keyof SODItem | '_level' }[] = [];
      const headerRow = sheet.getRow(1);
      headerRow.eachCell((cell, colNum) => {
        const krHeader = String(cell.value || '').split('\n')[0].trim();
        const field = FIELD_MAP[krHeader];
        if (field) colMap.push({ col: colNum, field });
      });

      const importedItems: SODItem[] = [];
      sheet.eachRow((row, rowNum) => {
        if (rowNum === 1) return;
        const item: Partial<SODItem> = { id: uid(), fmeaType: activeTab, category: activeCategory, standard: activeStandard };
        colMap.forEach(({ col, field }) => {
          const val = row.getCell(col).value;
          if (field === 'rating') {
            (item as Record<string, unknown>).rating = typeof val === 'number' ? val : parseInt(String(val || '1'));
          } else if (field === '_level') {
            const parts = String(val || '').split('\n');
            item.levelKr = parts[0]?.trim() || '';
            item.levelEn = parts[1]?.trim() || '';
          } else {
            (item as Record<string, unknown>)[field] = String(val || '');
          }
        });
        if (item.rating && item.levelKr) importedItems.push(item as SODItem);
      });

      onComplete(importedItems);
      alert(`${importedItems.length}개 항목을 가져왔습니다.`);
    } catch (err) {
      alert('Excel 파일 읽기 실패: ' + (err instanceof Error ? err.message : String(err)));
    }
  };
  input.click();
}
