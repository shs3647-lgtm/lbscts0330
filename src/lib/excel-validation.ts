/**
 * @file excel-validation.ts
 * @description 엑셀 파일 형식 검증 유틸리티
 * @created 2026-02-05
 * 
 * ★★★ 지원 형식 (하드코딩) ★★★
 * - .xlsx (Excel 2007+) : 지원 ✓
 * - .xls (Excel 97-2003) : 미지원 ✗
 * - .xlsb (바이너리) : 미지원 ✗
 * - .xlsm (매크로) : 미지원 ✗
 * - .csv : 미지원 ✗
 * - .ods (OpenDocument) : 미지원 ✗
 */

/** 지원되는 엑셀 확장자 */
export const ALLOWED_EXCEL_EXTENSIONS = ['.xlsx'];

/** 확장자별 경고 메시지 */
const WARNING_MESSAGES: Record<string, string> = {
  '.xls': '⚠️ .xls (Excel 97-2003) 형식은 지원되지 않습니다.\n\n.xlsx 형식으로 다시 저장 후 업로드해주세요.\n(Excel에서 "다른 이름으로 저장" → "Excel 통합 문서(*.xlsx)" 선택)',
  '.xlsb': '⚠️ .xlsb (Excel 바이너리) 형식은 지원되지 않습니다.\n\n.xlsx 형식으로 다시 저장 후 업로드해주세요.\n(Excel에서 "다른 이름으로 저장" → "Excel 통합 문서(*.xlsx)" 선택)',
  '.xlsm': '⚠️ .xlsm (매크로 포함) 형식은 지원되지 않습니다.\n\n.xlsx 형식으로 다시 저장 후 업로드해주세요.\n(Excel에서 "다른 이름으로 저장" → "Excel 통합 문서(*.xlsx)" 선택)',
  '.csv': '⚠️ .csv 형식은 지원되지 않습니다.\n\n다중 시트 구조가 필요하므로 .xlsx 형식을 사용해주세요.',
  '.ods': '⚠️ .ods (OpenDocument) 형식은 지원되지 않습니다.\n\n.xlsx 형식으로 다시 저장 후 업로드해주세요.',
};

/**
 * 엑셀 파일 형식 검증
 * @param fileName 파일명
 * @returns { valid: boolean, extension: string, message?: string }
 */
export function validateExcelFile(fileName: string): {
  valid: boolean;
  extension: string;
  message?: string;
} {
  const lowerName = fileName.toLowerCase();
  const extension = lowerName.substring(lowerName.lastIndexOf('.'));
  
  if (ALLOWED_EXCEL_EXTENSIONS.includes(extension)) {
    return { valid: true, extension };
  }
  
  const message = WARNING_MESSAGES[extension] || 
    `⚠️ "${extension}" 형식은 지원되지 않습니다.\n\n지원 형식: .xlsx (Excel 2007 이상)\n\nExcel에서 "다른 이름으로 저장" → "Excel 통합 문서(*.xlsx)" 선택 후 업로드해주세요.`;
  
  return { valid: false, extension, message };
}

/**
 * 파일 선택 이벤트에서 엑셀 형식 검증
 * @param file 선택된 파일
 * @returns 유효하면 true, 아니면 false (alert 표시)
 */
export function validateExcelFileWithAlert(file: File): boolean {
  const result = validateExcelFile(file.name);
  
  if (!result.valid) {
    alert(result.message);
    console.error(`❌ 지원되지 않는 파일 형식: ${result.extension}`);
    return false;
  }
  
  return true;
}
