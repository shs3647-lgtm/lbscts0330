/// <reference lib="webworker" />

declare const self: DedicatedWorkerGlobalScope;

/* ── Shared style constants (never recreated) ── */
const THIN: any = { style: 'thin', color: { argb: 'FFD0D0D0' } };
const THIN_BORDER: any = { top: THIN, left: THIN, bottom: THIN, right: THIN };
const FILL_EVEN: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9F9F9' } };
const FILL_ODD: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
const FONT_DATA: any = { size: 9, name: '맑은 고딕' };
const ALIGN_DATA: any = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
const FONT_HDR: any = { size: 9, name: '맑은 고딕', bold: true };
const ALIGN_HDR: any = { vertical: 'middle', horizontal: 'center', wrapText: true };
const FILL_HDR: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };

interface AllViewMsg {
  type: 'buildAllView';
  columns: { id: string; label: string; width: number }[];
  groups: { name: string; count: number; color: string }[];
  dataRows: (string | number | null)[][];
  merges: [number, number, number, number][];
}

self.onmessage = async (e: MessageEvent<AllViewMsg>) => {
  try {
    const { columns, groups, dataRows, merges } = e.data;
    const ExcelJS = await import('exceljs');
    const wb: any = new ExcelJS.Workbook();
    const ws: any = wb.addWorksheet('D-FMEA 전체보기', {
      properties: { tabColor: { argb: 'FF1565C0' } },
      views: [{ state: 'frozen', xSplit: 0, ySplit: 3 }],
    });

    const colCount = columns.length;

    /* ── Row 1: Group headers ── */
    const r1: any = ws.getRow(1);
    let ci = 1;
    for (const g of groups) {
      const cell: any = r1.getCell(ci);
      cell.value = g.name;
      cell.font = { ...FONT_HDR, color: { argb: 'FFFFFFFF' } };
      cell.alignment = ALIGN_HDR;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + g.color.replace('#', '') } };
      cell.border = THIN_BORDER;
      if (g.count > 1) {
        try { ws.mergeCells(1, ci, 1, ci + g.count - 1); } catch { /* overlap */ }
      }
      ci += g.count;
    }
    r1.height = 22;

    /* ── Row 2: Column headers ── */
    const r2: any = ws.getRow(2);
    for (let c = 0; c < colCount; c++) {
      const cell: any = r2.getCell(c + 1);
      cell.value = columns[c].label;
      cell.font = FONT_HDR;
      cell.alignment = ALIGN_HDR;
      cell.fill = FILL_HDR;
      cell.border = THIN_BORDER;
    }
    r2.height = 28;

    /* ── Column widths ── */
    for (let c = 0; c < colCount; c++) {
      ws.getColumn(c + 1).width = columns[c].width;
    }

    /* ── Data rows (row 3+) ── */
    for (let r = 0; r < dataRows.length; r++) {
      const row: any = ws.getRow(r + 3);
      const fill = r % 2 === 0 ? FILL_EVEN : FILL_ODD;
      const src = dataRows[r];
      for (let c = 0; c < colCount; c++) {
        const cell: any = row.getCell(c + 1);
        cell.value = src[c] ?? '';
        cell.font = FONT_DATA;
        cell.alignment = ALIGN_DATA;
        cell.fill = fill;
        cell.border = THIN_BORDER;
      }
      row.height = 20;
    }

    /* ── Merges ── */
    for (const [sr, sc, er, ec] of merges) {
      try { ws.mergeCells(sr, sc, er, ec); } catch { /* overlapping merge */ }
    }

    /* ── Write & transfer ── */
    const buf: ArrayBuffer = await wb.xlsx.writeBuffer();
    self.postMessage({ type: 'done', buffer: buf }, [buf]);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    self.postMessage({ type: 'error', message: msg });
  }
};

export {};
