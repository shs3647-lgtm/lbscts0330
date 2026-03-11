/**
 * @file exportFmea4Excel.ts
 * @description FMEA 4판 Excel Export 기능
 */

import { Fmea4Row, FMEA4_COLUMNS, FMEA4_HEADER_GROUPS, getRPNLevel } from '../../types/fmea4';

interface Fmea4ExportOptions {
  fileName?: string;
  includeHeader?: boolean;
}

/**
 * FMEA 4판 데이터를 Excel로 내보내기
 */
export async function exportFmea4Excel(
  rows: Fmea4Row[],
  options: Fmea4ExportOptions = {}
): Promise<void> {
  try {
    const XLSX = await import('xlsx');

    const {
      fileName = `FMEA_4판_${new Date().toISOString().slice(0, 10)}`,
      includeHeader = true
    } = options;

    // 워크북 생성
    const wb = XLSX.utils.book_new();

    // 데이터 배열 생성
    const data: (string | number)[][] = [];

    // 헤더 행 추가
    if (includeHeader) {
      // 1행: 그룹 헤더
      const groupRow: string[] = [];
      FMEA4_HEADER_GROUPS.forEach(group => {
        for (let i = 0; i < group.colspan; i++) {
          groupRow.push(i === 0 ? group.label : '');
        }
      });
      data.push(groupRow);

      // 2행: 열 헤더
      const headerRow = FMEA4_COLUMNS.map(col => col.label);
      data.push(headerRow);
    }

    // 데이터 행 추가
    rows.forEach(row => {
      const dataRow = [
        row.processNo,
        row.processName,
        row.processFunction,
        row.failureMode,
        row.specialChar1,
        row.failureEffect,
        row.severity || '',
        row.specialChar2,
        row.failureCause,
        row.preventionControl,
        row.occurrence || '',
        row.detectionControl,
        row.detection || '',
        row.rpn || '',
        row.preventionImprove,
        row.detectionImprove,
        row.responsible,
        row.targetDate,
        row.severityAfter || '',
        row.occurrenceAfter || '',
        row.detectionAfter || '',
        row.rpnAfter || '',
        row.remarks,
      ];
      data.push(dataRow);
    });

    // 워크시트 생성
    const ws = XLSX.utils.aoa_to_sheet(data);

    // 열 너비 설정
    ws['!cols'] = FMEA4_COLUMNS.map(col => ({ wch: Math.floor(col.width / 7) }));

    // 병합 설정 (그룹 헤더)
    if (includeHeader) {
      const merges: any[] = [];
      let colIndex = 0;
      FMEA4_HEADER_GROUPS.forEach(group => {
        if (group.colspan > 1) {
          merges.push({
            s: { r: 0, c: colIndex },
            e: { r: 0, c: colIndex + group.colspan - 1 }
          });
        }
        colIndex += group.colspan;
      });
      ws['!merges'] = merges;
    }

    // 워크북에 시트 추가
    XLSX.utils.book_append_sheet(wb, ws, 'FMEA 4판');

    // 통계 시트 추가
    const statsData = [
      ['FMEA 4판 통계'],
      [''],
      ['총 행 수', rows.length],
      [''],
      ['RPN 분포'],
      ['높음 (≥200)', rows.filter(r => r.rpn >= 200).length],
      ['중간 (100-199)', rows.filter(r => r.rpn >= 100 && r.rpn < 200).length],
      ['낮음 (<100)', rows.filter(r => r.rpn > 0 && r.rpn < 100).length],
      [''],
      ['개선 현황'],
      ['개선 완료', rows.filter(r => r.rpnAfter > 0).length],
      ['RPN 감소', rows.filter(r => r.rpnAfter > 0 && r.rpnAfter < r.rpn).length],
    ];
    const statsWs = XLSX.utils.aoa_to_sheet(statsData);
    XLSX.utils.book_append_sheet(wb, statsWs, '통계');

    // 파일 다운로드
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  } catch (error) {
    console.error('[exportFmea4Excel] 엑셀 내보내기 실패:', error);
    alert('FMEA 4판 엑셀 내보내기 중 오류가 발생했습니다.');
  }
}

/**
 * 4판 데이터를 CSV로 내보내기
 */
export function exportFmea4CSV(rows: Fmea4Row[], fileName: string = 'FMEA_4판'): void {
  const headers = FMEA4_COLUMNS.map(col => col.label);
  const csvData = [
    headers.join(','),
    ...rows.map(row => [
      row.processNo,
      `"${row.processName}"`,
      `"${row.processFunction}"`,
      `"${row.failureMode}"`,
      row.specialChar1,
      `"${row.failureEffect}"`,
      row.severity || '',
      row.specialChar2,
      `"${row.failureCause}"`,
      `"${row.preventionControl}"`,
      row.occurrence || '',
      `"${row.detectionControl}"`,
      row.detection || '',
      row.rpn || '',
      `"${row.preventionImprove}"`,
      `"${row.detectionImprove}"`,
      `"${row.responsible}"`,
      row.targetDate,
      row.severityAfter || '',
      row.occurrenceAfter || '',
      row.detectionAfter || '',
      row.rpnAfter || '',
      `"${row.remarks}"`,
    ].join(','))
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvData], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${fileName}.csv`;
  link.click();
}

