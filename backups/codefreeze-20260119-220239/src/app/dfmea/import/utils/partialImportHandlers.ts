/**
 * @file partialImportHandlers.ts
 * @description 개별 항목 입포트 핸들러 유틸리티
 */

import { ImportedFlatData } from '../types';

interface PartialImportState {
  partialItemCode: string;
  setPartialFileName: React.Dispatch<React.SetStateAction<string>>;
  setIsPartialParsing: React.Dispatch<React.SetStateAction<boolean>>;
  setPartialPendingData: React.Dispatch<React.SetStateAction<ImportedFlatData[]>>;
}

/**
 * 개별 입포트 파일 선택 및 파싱
 */
export async function handlePartialFileSelect(
  file: File,
  state: PartialImportState
): Promise<void> {
  const { partialItemCode, setPartialFileName, setIsPartialParsing, setPartialPendingData } = state;

  setPartialFileName(file.name);
  setIsPartialParsing(true);

  try {
    // Excel 파일 읽기
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const buffer = await file.arrayBuffer();
    await workbook.xlsx.load(buffer);

    // 선택한 항목 코드에 해당하는 시트 찾기
    const targetSheet = workbook.getWorksheet(partialItemCode);
    if (!targetSheet) {
      alert(`시트 "${partialItemCode}"를 찾을 수 없습니다.\n\n시트 이름이 "${partialItemCode}"인지 확인해주세요.`);
      setIsPartialParsing(false);
      return;
    }

    // 데이터 파싱
    const newData: ImportedFlatData[] = [];
    const category = partialItemCode.charAt(0) as 'A' | 'B' | 'C';

    // 2행 또는 3행부터 읽기 (1행이 헤더, 2행이 안내일 수 있음)
    const startRow = 2;

    for (let i = startRow; i <= targetSheet.rowCount; i++) {
      const row = targetSheet.getRow(i);
      const processNo = String(row.getCell(1).value || '').trim();

      // 2열부터 모든 값 읽기
      for (let col = 2; col <= Math.max(row.cellCount, 5); col++) {
        const value = String(row.getCell(col).value || '').trim();
        if (processNo && value) {
          newData.push({
            id: `${processNo}-${partialItemCode}-${i}-${col}`,
            processNo: category === 'C' ? 'ALL' : processNo,
            category,
            itemCode: partialItemCode,
            value,
            createdAt: new Date(),
          });
        }
      }
    }

    if (newData.length === 0) {
      alert('파싱된 데이터가 없습니다. Excel 파일 형식을 확인해주세요.\n\n1열: 공정번호, 2열~: 데이터');
      setIsPartialParsing(false);
      return;
    }

    setPartialPendingData(newData);
    console.log(`개별 입포트 파싱 완료: ${newData.length}건`);
  } catch (error) {
    console.error('개별 입포트 파싱 오류:', error);
    alert('파일 파싱 중 오류가 발생했습니다.');
  } finally {
    setIsPartialParsing(false);
  }
}

/**
 * 개별 입포트 실행
 */
export function handlePartialImport(
  partialItemCode: string,
  partialPendingData: ImportedFlatData[],
  flatData: ImportedFlatData[],
  setFlatData: React.Dispatch<React.SetStateAction<ImportedFlatData[]>>,
  setPartialPendingData: React.Dispatch<React.SetStateAction<ImportedFlatData[]>>,
  setPreviewColumn: React.Dispatch<React.SetStateAction<string>>,
  setIsSaved: React.Dispatch<React.SetStateAction<boolean>>
): void {
  if (partialPendingData.length === 0) {
    alert('Import할 데이터가 없습니다. 먼저 Excel 파일을 선택해주세요.');
    return;
  }

  // 기존 데이터에서 해당 항목 코드의 데이터 제거 후 새 데이터 추가 (중복 방지)
  const otherData = flatData.filter((d) => d.itemCode !== partialItemCode);
  const mergedData = [...otherData, ...partialPendingData];

  setFlatData(mergedData);
  setPartialPendingData([]);
  setPreviewColumn(partialItemCode); // 미리보기를 해당 항목으로 변경
  setIsSaved(false); // Import 후에는 저장 안 된 상태

  alert(`${partialItemCode} 항목 ${partialPendingData.length}건 Import 완료!`);
}



