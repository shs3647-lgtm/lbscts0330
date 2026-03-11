/**
 * @file exportCPExcel.ts
 * @description Control Plan Excel Export 기능
 */

import { CPRow, CP_COLUMNS, CP_HEADER_GROUPS } from '../../types/controlPlan';

interface CPExportOptions {
  fileName?: string;
  includeHeader?: boolean;
}

/**
 * Control Plan 데이터를 Excel로 내보내기
 */
export async function exportCPExcel(
  rows: CPRow[],
  headerInfo?: {
    cpNo?: string;
    partName?: string;
    partNo?: string;
    customer?: string;
  },
  options: CPExportOptions = {}
): Promise<void> {
  try {
    const XLSX = await import('xlsx');

    const {
      fileName = `Control_Plan_${new Date().toISOString().slice(0, 10)}`,
      includeHeader = true
    } = options;

    const wb = XLSX.utils.book_new();
    const data: any[][] = [];

    // 문서 헤더 정보
    if (headerInfo) {
      data.push(['Control Plan (관리계획서)']);
      data.push([]);
      data.push(['CP No:', headerInfo.cpNo || '', '', '품명:', headerInfo.partName || '']);
      data.push(['품번:', headerInfo.partNo || '', '', '고객:', headerInfo.customer || '']);
      data.push([]);
    }

    // 테이블 헤더
    if (includeHeader) {
      // 그룹 헤더
      const groupRow: string[] = [];
      CP_HEADER_GROUPS.forEach(group => {
        for (let i = 0; i < group.colspan; i++) {
          groupRow.push(i === 0 ? group.label : '');
        }
      });
      data.push(groupRow);

      // 열 헤더
      const headerRow = CP_COLUMNS.map(col => col.label);
      data.push(headerRow);
    }

    // 데이터 행
    rows.forEach(row => {
      const dataRow = [
        row.processNo,
        row.processName,
        row.processType,
        row.processDesc,
        row.workElement,
        row.ep ? '●' : '',
        row.autoInspect ? '●' : '',
        row.itemNo,
        row.productChar,
        row.processChar,
        row.specialChar,
        row.specTolerance,
        row.measureMethod,
        row.sampleSize,
        row.frequency,
        row.controlMethod,
        row.production ? '●' : '',
        row.quality ? '●' : '',
        row.actionMethod,
      ];
      data.push(dataRow);
    });

    // 워크시트 생성
    const ws = XLSX.utils.aoa_to_sheet(data);

    // 열 너비 설정
    ws['!cols'] = CP_COLUMNS.map(col => ({ wch: Math.floor(col.width / 7) }));

    // 병합 설정
    if (includeHeader) {
      const merges: any[] = [];
      const startRow = headerInfo ? 5 : 0;
      let colIndex = 0;

      CP_HEADER_GROUPS.forEach(group => {
        if (group.colspan > 1) {
          merges.push({
            s: { r: startRow, c: colIndex },
            e: { r: startRow, c: colIndex + group.colspan - 1 }
          });
        }
        colIndex += group.colspan;
      });

      // 문서 제목 병합
      if (headerInfo) {
        merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 18 } });
      }

      ws['!merges'] = merges;
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Control Plan');

    // 파일 다운로드
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  } catch (error) {
    console.error('[exportCPExcel] 엑셀 내보내기 실패:', error);
    alert('Control Plan 엑셀 내보내기 중 오류가 발생했습니다.');
  }
}

