/**
 * @file relationHandlers.ts
 * @description 관계형 데이터 다운로드/입포트 핸들러 유틸리티
 */

import { ImportedFlatData } from '../types';

type RelationTab = 'A' | 'B' | 'C';

interface RelationData {
  [key: string]: string | undefined;
}

/**
 * 관계형 데이터 Excel 다운로드
 */
export async function handleRelationDownload(
  relationTab: RelationTab,
  getRelationData: () => RelationData[]
): Promise<void> {
  try {
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();

    // 현재 선택된 탭에 따라 시트 생성
    const sheetName = relationTab === 'A' ? 'A_공정' : relationTab === 'B' ? 'B_작업요소' : 'C_완제품';
    const sheet = workbook.addWorksheet(sheetName);

    // 헤더 설정
    if (relationTab === 'A') {
      sheet.columns = [
        { header: 'A1 No', key: 'A1', width: 10 },
        { header: 'A2 공정명', key: 'A2', width: 15 },
        { header: 'A3 기능', key: 'A3', width: 20 },
        { header: 'A4 특성', key: 'A4', width: 15 },
        { header: 'A5 고장', key: 'A5', width: 15 },
        { header: 'A6 검출', key: 'A6', width: 15 },
      ];
    } else if (relationTab === 'B') {
      sheet.columns = [
        { header: 'A1 No', key: 'A1', width: 10 },
        { header: 'B1 작업요소', key: 'B1', width: 15 },
        { header: 'B2 기능', key: 'B2', width: 20 },
        { header: 'B3 특성', key: 'B3', width: 15 },
        { header: 'B4 원인', key: 'B4', width: 15 },
        { header: 'B5 예방', key: 'B5', width: 15 },
      ];
    } else {
      sheet.columns = [
        { header: 'No', key: 'A1', width: 10 },
        { header: 'C1 구분', key: 'C1', width: 15 },
        { header: 'C2 기능', key: 'C2', width: 20 },
        { header: 'C3 요구', key: 'C3', width: 15 },
        { header: 'C4 영향', key: 'C4', width: 15 },
        { header: '비고', key: 'note', width: 15 },
      ];
    }

    // 헤더 스타일
    sheet.getRow(1).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '00587a' } };
      cell.font = { color: { argb: 'FFFFFF' }, bold: true };
      cell.alignment = { horizontal: 'center' };
    });

    // 데이터 추가
    const relationData = getRelationData();
    relationData.forEach((row) => {
      sheet.addRow(row);
    });

    // 다운로드
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `관계형_${sheetName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);

    console.log(`✅ ${sheetName} 다운로드 완료: ${relationData.length}건`);
  } catch (error) {
    console.error('다운로드 오류:', error);
    alert('다운로드 중 오류가 발생했습니다.');
  }
}

/**
 * 관계형 데이터 Excel 입포트
 */
export async function handleRelationImport(
  file: File,
  relationTab: RelationTab,
  flatData: ImportedFlatData[],
  setFlatData: React.Dispatch<React.SetStateAction<ImportedFlatData[]>>,
  setIsSaved: React.Dispatch<React.SetStateAction<boolean>>,
  relationFileInputRef: React.RefObject<HTMLInputElement | null>
): Promise<void> {
  try {
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const buffer = await file.arrayBuffer();
    await workbook.xlsx.load(buffer);

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      alert('Excel 파일에서 시트를 찾을 수 없습니다.');
      return;
    }

    const newData: ImportedFlatData[] = [];
    const category = relationTab;

    // 2행부터 데이터 읽기 (1행은 헤더)
    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const processNo = String(row.getCell(1).value || '').trim();
      if (!processNo) continue;

      // 각 열을 해당 itemCode로 변환
      const colMapping =
        relationTab === 'A'
          ? ['A1', 'A2', 'A3', 'A4', 'A5', 'A6']
          : relationTab === 'B'
          ? ['A1', 'B1', 'B2', 'B3', 'B4', 'B5']
          : ['A1', 'C1', 'C2', 'C3', 'C4'];

      for (let col = 2; col <= colMapping.length; col++) {
        const value = String(row.getCell(col).value || '').trim();
        const itemCode = colMapping[col - 1];
        if (value && itemCode) {
          newData.push({
            id: `${processNo}-${itemCode}-${i}`,
            processNo: category === 'C' ? 'ALL' : processNo,
            category: itemCode.charAt(0) as 'A' | 'B' | 'C',
            itemCode,
            value,
            createdAt: new Date(),
          });
        }
      }
    }

    if (newData.length === 0) {
      alert('Import할 데이터가 없습니다.');
      return;
    }

    // 기존 데이터에 병합 (해당 카테고리만 대체)
    const itemCodes =
      relationTab === 'A'
        ? ['A2', 'A3', 'A4', 'A5', 'A6']
        : relationTab === 'B'
        ? ['B1', 'B2', 'B3', 'B4', 'B5']
        : ['C1', 'C2', 'C3', 'C4'];

    const otherData = flatData.filter((d) => !itemCodes.includes(d.itemCode));
    setFlatData([...otherData, ...newData]);
    setIsSaved(false);

    alert(`${relationTab} 관계형 데이터 ${newData.length}건 Import 완료!`);

    // 파일 입력 초기화
    if (relationFileInputRef.current) {
      relationFileInputRef.current.value = '';
    }
  } catch (error) {
    console.error('관계형 입포트 오류:', error);
    alert('Import 중 오류가 발생했습니다.');
  }
}



