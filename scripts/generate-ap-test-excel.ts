/**
 * @file generate-ap-test-excel.ts
 * @description AP 개선관리 테스트 엑셀 파일 생성 스크립트
 * 실행: npx tsx scripts/generate-ap-test-excel.ts
 */

import * as XLSX from 'xlsx';
import { AP_TEST_DATA } from '../tests/ap-improvement-test-data';

const headers = [
  'CIP_No', 'AP등급', '대상', '공정번호', '공정명',
  'S', '고장형태(FM)', '고장원인(FC)',
  'O', 'D',
  '예방조치', '검출조치', '담당자',
  '상태', '목표일', '완료일', '비고',
];

const ws = XLSX.utils.json_to_sheet(AP_TEST_DATA, { header: headers });
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'AP개선');
XLSX.writeFile(wb, 'tests/temp-ap-test.xlsx');
console.log('✅ tests/temp-ap-test.xlsx 생성 완료 (5건)');
