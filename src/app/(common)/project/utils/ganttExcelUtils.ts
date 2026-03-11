
import ExcelJS from 'exceljs';

// Helper to parse various date formats from Excel
const parseExcelDate = (value: any): string => {
    if (!value) return '';

    // 1. If it's already a Date object
    if (value instanceof Date) {
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, '0');
        const day = String(value.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // 2. If it's a number (Excel Serial Date)
    if (typeof value === 'number') {
        // Excel date serial: 1 = 1900-01-01. JS: 0 = 1970-01-01.
        // Difference is 25569 days.
        // Note: Excel incorrectly assumes 1900 was a leap year, so day 60 is Feb 29, 1900 (which didn't exist).
        // Modern ExcelJS usually handles this if we read .value, but if we get raw number:
        const utc_days = Math.floor(value - 25569);
        const utc_value = utc_days * 86400;
        const date_info = new Date(utc_value * 1000);

        const year = date_info.getFullYear();
        const month = String(date_info.getMonth() + 1).padStart(2, '0');
        const day = String(date_info.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // 3. If it's a string
    if (typeof value === 'string') {
        // Check for YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

        // Check for YYYY.MM.DD or YYYY/MM/DD
        if (/^\d{4}[\.\/]\d{2}[\.\/]\d{2}$/.test(value)) {
            return value.replace(/[\.\/]/g, '-');
        }

        // Try generic parsing
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
    }

    return '';
};

export const exportToExcel = async (data: any[]) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('WBS');

    // 1. Define Columns
    worksheet.columns = [
        { header: 'Level', key: 'level', width: 12 },
        { header: 'Task Name', key: 'task', width: 50 },
        { header: 'Plan Start', key: 'pStart', width: 15, style: { numFmt: 'yyyy-mm-dd' } },
        { header: 'Plan Finish', key: 'pFinish', width: 15, style: { numFmt: 'yyyy-mm-dd' } },
        { header: 'Act Start', key: 'aStart', width: 15, style: { numFmt: 'yyyy-mm-dd' } },
        { header: 'Act Finish', key: 'aFinish', width: 15, style: { numFmt: 'yyyy-mm-dd' } },
        { header: 'CFT', key: 'cft', width: 15 },
        { header: 'Manager', key: 'manager', width: 12 },
        { header: 'State', key: 'state', width: 10 },
        { header: 'Critical', key: 'path', width: 10 },
    ];

    // 2. Add Rows
    data.forEach(task => {
        // Convert string dates to Date objects for Excel to recognize them
        const pStart = task.planStart ? new Date(task.planStart) : null;
        const pFinish = task.planFinish ? new Date(task.planFinish) : null;
        const aStart = task.actStart ? new Date(task.actStart) : null;
        const aFinish = task.actFinish ? new Date(task.actFinish) : null;

        worksheet.addRow({
            level: task.id, // Use 'id' as 'level' for reconstruction (e.g. 1.100)
            task: task.taskName,
            pStart: pStart,
            pFinish: pFinish,
            aStart: aStart,
            aFinish: aFinish,
            cft: task.department,
            manager: task.owner,
            state: task.state,
            path: task.path,
        });
    });

    // 3. Style Header
    const headerRow = worksheet.getRow(1);
    headerRow.height = 24;
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF005A8D' } // Deep Blue
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // 4. Style Data Rows (Alternating colors not applied here to keep it simple for re-import, but borders are good)
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
            row.alignment = { vertical: 'middle' };
            row.getCell('level').alignment = { horizontal: 'center' };
            row.getCell('pStart').alignment = { horizontal: 'center' };
            row.getCell('pFinish').alignment = { horizontal: 'center' };
            row.getCell('aStart').alignment = { horizontal: 'center' };
            row.getCell('aFinish').alignment = { horizontal: 'center' };
            row.getCell('cft').alignment = { horizontal: 'center' };
            row.getCell('manager').alignment = { horizontal: 'center' };
            row.getCell('state').alignment = { horizontal: 'center' };
            row.getCell('path').alignment = { horizontal: 'center' };
        }
    });

    // 5. Download File
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const filename = `APQP_WBS_${new Date().toISOString().slice(0, 10)}.xlsx`;

    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();

    // 지연 후 정리
    setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }, 100);
};

export const importFromExcel = async (file: File): Promise<any[]> => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    const worksheet = workbook.getWorksheet('WBS') || workbook.worksheets[0];

    const newData: any[] = [];

    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip Header

        // Cell A: Level (ID)
        const level = row.getCell(1).text?.toString() || '';
        if (!level) return;

        // Robust Date Parsing
        const pStart = parseExcelDate(row.getCell(3).value);
        const pFinish = parseExcelDate(row.getCell(4).value);
        const aStart = parseExcelDate(row.getCell(5).value);
        const aFinish = parseExcelDate(row.getCell(6).value);

        // Calculate indentLevel & parentId
        let indentLevel = 0;
        let parentId = null;

        if (level.includes('.')) {
            const lastDotIndex = level.lastIndexOf('.');
            parentId = level.substring(0, lastDotIndex);

            const parts = level.split('.');
            if (parts.length === 2 && parts[0] === '0') indentLevel = 1;
            else if (parts.length === 2 && parts[0] !== '0') indentLevel = 1;
            else if (parts.length === 3) indentLevel = 2;
        } else {
            indentLevel = 0;
        }

        const isMilestone = ['0.1', '0.2', '0.3', '0.4', '0.5'].includes(level);

        newData.push({
            id: level,
            parentId: parentId,
            level: indentLevel,
            taskName: row.getCell(2).text?.toString() || '',
            planStart: pStart,
            planFinish: pFinish,
            actStart: aStart,
            actFinish: aFinish,
            department: row.getCell(7).text?.toString() || '',
            owner: row.getCell(8).text?.toString() || '',
            state: row.getCell(9).text?.toString() || '',
            path: row.getCell(10).text?.toString() || '',
            type: isMilestone ? 'milestone' : 'task',
        });
    });

    return newData;
};
