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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getRelationData: (tabOverride?: RelationTab) => any[]
): Promise<void> {
  try {
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();

    // 현재 선택된 탭에 따라 시트 생성
    const sheetName = relationTab === 'A' ? '고장형태' : relationTab === 'B' ? '고장원인' : '고장영향';
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
    a.download = `${sheetName}.xlsx`;
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
    // ✅ 파일명 검증 (고장형태, 고장원인, 고장영향 키워드 확인)
    const fileName = file.name.toLowerCase();
    const expectedKeyword = relationTab === 'A' ? '고장형태' : relationTab === 'B' ? '고장원인' : '고장영향';
    const tabLabel = relationTab === 'A' ? '고장형태 분석' : relationTab === 'B' ? '고장원인 분석' : '고장영향 분석';

    if (!fileName.includes(expectedKeyword.toLowerCase())) {
      const proceed = confirm(
        `⚠️ 파일명에 "${expectedKeyword}"가 포함되어 있지 않습니다.\n\n` +
        `현재 선택된 탭: ${tabLabel}\n` +
        `업로드 파일: ${file.name}\n\n` +
        `계속 진행하시겠습니까?`
      );
      if (!proceed) {
        if (relationFileInputRef.current) {
          relationFileInputRef.current.value = '';
        }
        return;
      }
    }

    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const buffer = await file.arrayBuffer();
    await workbook.xlsx.load(buffer);

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      alert('Excel 파일에서 시트를 찾을 수 없습니다.');
      return;
    }

    // ✅ 기초정보(A1)에서 공정번호(value) → processNo 매핑 생성
    const a1Items = flatData.filter(d => d.itemCode === 'A1');
    const processNoMap = new Map<string, string>(); // A1 value → processNo
    a1Items.forEach(item => {
      if (item.value) {
        processNoMap.set(item.value, item.processNo);
      }
    });

    const newData: ImportedFlatData[] = [];
    const category = relationTab;
    const unmatchedProcessNos: string[] = [];

    // 2행부터 데이터 읽기 (1행은 헤더)
    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const excelProcessNo = String(row.getCell(1).value || '').trim();  // 엑셀의 공정번호 (A1 value)
      if (!excelProcessNo) continue;

      // ✅ 엑셀 공정번호를 기초정보의 processNo로 변환
      let actualProcessNo: string;
      if (category === 'C') {
        actualProcessNo = 'ALL';
      } else {
        // 기초정보(A1)의 value와 매칭하여 processNo 찾기
        const mappedProcessNo = processNoMap.get(excelProcessNo);
        if (mappedProcessNo) {
          actualProcessNo = mappedProcessNo;
        } else {
          // 매칭되는 기초정보가 없으면 경고 목록에 추가
          if (!unmatchedProcessNos.includes(excelProcessNo)) {
            unmatchedProcessNos.push(excelProcessNo);
          }
          // 직접 매칭 시도 (processNo가 value와 같은 경우)
          actualProcessNo = excelProcessNo;
        }
      }

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
            id: `${actualProcessNo}-${itemCode}-${i}`,
            processNo: actualProcessNo,
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

    // ✅ 매칭되지 않은 공정번호 경고
    if (unmatchedProcessNos.length > 0 && category !== 'C') {
      const proceed = confirm(
        `⚠️ 기초정보(L2-1)에 없는 공정번호가 있습니다:\n${unmatchedProcessNos.join(', ')}\n\n` +
        `이 공정번호의 데이터는 기초정보와 연결되지 않을 수 있습니다.\n계속 진행하시겠습니까?`
      );
      if (!proceed) {
        if (relationFileInputRef.current) {
          relationFileInputRef.current.value = '';
        }
        return;
      }
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

    const warningMsg = unmatchedProcessNos.length > 0
      ? `\n⚠️ ${unmatchedProcessNos.length}개 공정번호 미매칭`
      : '';
    alert(`${relationTab} 관계형 데이터 ${newData.length}건 Import 완료!${warningMsg}`);

    // 파일 입력 초기화
    if (relationFileInputRef.current) {
      relationFileInputRef.current.value = '';
    }
  } catch (error) {
    console.error('관계형 입포트 오류:', error);
    alert('Import 중 오류가 발생했습니다.');
  }
}

