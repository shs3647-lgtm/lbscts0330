/**
 * Date Formatter 유틸리티
 * 
 * @file date-formatter.ts
 * @description 날짜 포맷팅 유틸리티 함수
 */

/**
 * Date 객체를 YY/MM/DD 형식으로 포맷
 */
export function formatDateDisplay(date: Date): string {
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}/${month}/${day}`;
}

/**
 * YYYY-MM-DD 문자열을 YY/MM/DD 형식으로 변환
 */
export function formatDateString(dateStr: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[0].slice(-2)}/${parts[1]}/${parts[2]}`;
}

/**
 * YY/MM/DD 문자열을 Date 객체로 변환
 */
export function parseDisplayDate(displayDate: string): Date {
    const parts = displayDate.split('/');
    if (parts.length !== 3) return new Date();
    const year = 2000 + parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
}
