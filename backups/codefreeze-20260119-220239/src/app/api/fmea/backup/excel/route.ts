/**
 * FMEA Excel 백업 API
 * - 전체 FMEA 데이터를 Excel로 내보내기
 */
import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import ExcelJS from 'exceljs';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { fmeaId, fmeaName, state } = await req.json();
    
    if (!fmeaId || !state) {
      return NextResponse.json(
        { success: false, error: 'FMEA ID and state are required' },
        { status: 400 }
      );
    }
    
    // 백업 디렉토리 생성
    const backupsDir = path.join(process.cwd(), 'backups', 'projects', fmeaId);
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }
    
    // 파일명 생성 (타임스탬프 포함)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `${fmeaId}_${timestamp}.xlsx`;
    const filePath = path.join(backupsDir, fileName);
    
    // Excel 워크북 생성 (exportAllViewExcel 로직 활용)
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('P-FMEA 전체보기', {
      properties: { tabColor: { argb: '1565C0' } },
      views: [{ state: 'frozen', xSplit: 0, ySplit: 3 }],
    });

    // 전체보기 컬럼 정의 (exportAllViewExcel과 동일)
    const ALLVIEW_COLUMNS = [
      { id: 'l1Name', label: '완제품공정명', width: 15 },
      { id: 'l2No', label: '공정번호', width: 8 },
      { id: 'l2Name', label: '공정명', width: 15 },
      { id: 'm4', label: '4M', width: 5 },
      { id: 'workElem', label: '작업요소', width: 15 },
      { id: 'l1Type', label: '구분', width: 10 },
      { id: 'l1Function', label: '완제품기능', width: 25 },
      { id: 'l1Requirement', label: '요구사항', width: 20 },
      { id: 'l2Function', label: '공정기능', width: 25 },
      { id: 'productChar', label: '제품특성', width: 15 },
      { id: 'l3WorkElement', label: '작업요소', width: 12 },
      { id: 'l3Function', label: '작업요소기능', width: 20 },
      { id: 'processChar', label: '공정특성', width: 15 },
      { id: 'feScopeF', label: '구분', width: 5 },
      { id: 'failureEffect', label: '고장영향', width: 18 },
      { id: 'severity', label: 'S', width: 4 },
      { id: 'failureMode', label: '고장형태', width: 18 },
      { id: 'fcWorkElem', label: '작업요소', width: 12 },
      { id: 'failureCause', label: '고장원인', width: 18 },
      { id: 'prevention', label: '예방관리', width: 15 },
      { id: 'occurrence', label: 'O', width: 4 },
      { id: 'detection', label: '검출관리', width: 15 },
      { id: 'detectability', label: 'D', width: 4 },
      { id: 'ap', label: 'AP', width: 4 },
      { id: 'rpn', label: 'RPN', width: 5 },
      { id: 'specialChar', label: '특별특성', width: 8 },
      { id: 'lesson', label: '습득교훈', width: 12 },
      { id: 'preventionImprove', label: '예방개선', width: 12 },
      { id: 'detectionImprove', label: '검출개선', width: 12 },
      { id: 'responsible', label: '책임자', width: 8 },
      { id: 'targetDate', label: '목표일', width: 10 },
      { id: 'status', label: '상태', width: 6 },
      { id: 'evidence', label: '개선근거', width: 12 },
      { id: 'completionDate', label: '완료일', width: 10 },
      { id: 'newS', label: 'S', width: 4 },
      { id: 'newO', label: 'O', width: 4 },
      { id: 'newD', label: 'D', width: 4 },
      { id: 'newSpecial', label: '특별특성', width: 8 },
      { id: 'newAP', label: 'AP', width: 4 },
      { id: 'newRPN', label: 'RPN', width: 5 },
      { id: 'remarks', label: '비고', width: 10 },
    ];

    worksheet.columns = ALLVIEW_COLUMNS.map(col => ({ key: col.id, width: col.width }));

    // 헤더 스타일 함수
    const applyHeaderStyle = (cell: ExcelJS.Cell, color: string) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: color }
      };
      cell.font = {
        color: { argb: 'FFFFFF' },
        bold: true,
        size: 10,
        name: '맑은 고딕'
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    };

    const applyDataStyle = (cell: ExcelJS.Cell, isEven: boolean) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEven ? 'F9F9F9' : 'FFFFFF' }
      };
      cell.font = {
        size: 9,
        name: '맑은 고딕'
      };
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    };

    // 1-2행: 그룹 헤더
    const groups = [
      { name: '구조분석', count: 5, color: '1565C0' },
      { name: '기능분석', count: 8, color: '1B5E20' },
      { name: 'P-FMEA 고장분석(4단계)', count: 6, color: 'C62828' },
      { name: 'P-FMEA 리스크분석(5단계)', count: 8, color: '6A1B9A' },
      { name: 'P-FMEA 최적화(6단계)', count: 14, color: 'E65100' },
    ];

    let colIdx = 1;
    groups.forEach(g => {
      worksheet.mergeCells(1, colIdx, 1, colIdx + g.count - 1);
      const cell = worksheet.getCell(1, colIdx);
      cell.value = g.name;
      applyHeaderStyle(cell, g.color);
      colIdx += g.count;
    });

    const headerRow = worksheet.getRow(2);
    ALLVIEW_COLUMNS.forEach((col, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = col.label;
      applyHeaderStyle(cell, 'f5f5f5');
      cell.font = { bold: true, size: 9, color: { argb: '333333' } };
    });

    // 데이터 생성 (exportAllViewExcel 로직 활용)
    const l1Name = state.l1?.name || '';
    const failureLinks = (state as any).failureLinks || [];
    const finalRows: any[] = [];

    if (state.l1?.types) {
      state.l1.types.forEach((type: any) => {
        type.functions?.forEach((fn: any) => {
          fn.requirements?.forEach((req: any) => {
            const linkedItems = failureLinks.filter((l: any) => l.feId === req.id);
            if (linkedItems.length === 0) {
              finalRows.push({ l1Name, l1Type: type.name, l1Function: fn.name, l1Requirement: req.name });
            } else {
              linkedItems.forEach((link: any) => {
                const proc = state.l2?.find((p: any) => p.id === link.fmProcessId || p.name === link.fmProcess);
                const riskData = (state as any).riskData || {};
                const uniqueKey = link.fmId && link.fcId ? `${link.fmId}-${link.fcId}` : '';
                const prevention = riskData[`prevention-${uniqueKey}`] || '';
                const detection = riskData[`detection-${uniqueKey}`] || '';
                const occurrence = riskData[`risk-${uniqueKey}-O`] || '';
                const detectability = riskData[`risk-${uniqueKey}-D`] || '';
                
                finalRows.push({
                  l1Name, l1Type: type.name, l1Function: fn.name, l1Requirement: req.name,
                  l2No: proc?.no || '', l2Name: proc?.name || link.fmProcess || '',
                  m4: link.fcM4 || '', workElem: link.fcWorkElem || '',
                  l2Function: proc?.functions?.map((f: any) => f.name).join(', ') || '',
                  productChar: link.fmText || '',
                  l3WorkElement: link.fcWorkElem || '',
                  processChar: link.fcText || '',
                  feScopeF: type.name, failureEffect: req.name, severity: link.severity || link.feSeverity || '',
                  failureMode: link.fmText || '', fcWorkElem: link.fcWorkElem || '', failureCause: link.fcText || '',
                  prevention, occurrence, detection, detectability,
                  ap: '', rpn: '', specialChar: '', lesson: '',
                  preventionImprove: '', detectionImprove: '', responsible: '', targetDate: '',
                  status: '', evidence: '', completionDate: '',
                  newS: '', newO: '', newD: '', newSpecial: '', newAP: '', newRPN: '', remarks: '',
                });
              });
            }
          });
        });
      });
    }

    finalRows.forEach((row, idx) => {
      const worksheetRow = worksheet.getRow(idx + 3);
      ALLVIEW_COLUMNS.forEach((col, colIdx) => {
        worksheetRow.getCell(colIdx + 1).value = row[col.id] || '';
        applyDataStyle(worksheetRow.getCell(colIdx + 1), idx % 2 === 0);
      });
    });
    
    // Excel 파일 저장
    await workbook.xlsx.writeFile(filePath);
    
    console.log(`✅ Excel 백업 완료: ${filePath}`);
    
    return NextResponse.json({
      success: true,
      filePath: `backups/projects/${fmeaId}/${fileName}`,
      fileName,
    });
  } catch (error: any) {
    console.error('[Excel 백업] 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

