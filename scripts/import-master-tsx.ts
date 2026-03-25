/**
 * Import 엑셀 보정 + Re-Import 자동화
 * 
 * 1. 원본 엑셀 복제
 * 2. L3 시트에 FC 시트 고유 고장원인 3건 추가 (SSOT 보정)
 * 3. L2 시트 특별특성(★) 행 정리 
 * 4. 보정된 엑셀 저장
 * 5. Re-Import 실행
 */
import ExcelJS from 'exceljs';
import path from 'path';
import { parsePositionBasedWorkbook } from '../src/lib/fmea/position-parser';

const FMEA_ID = 'pfm26-m001';
const ORIG_EXCEL = 'D:\\00 fmea개발\\00_CELLuuid_FK_SYSTEM\\excel\\PFMEA_pfm26-p018-i18_샘플Down_최신본.xlsx';
const FIXED_EXCEL = 'D:\\00 fmea개발\\00_CELLuuid_FK_SYSTEM\\excel\\PFMEA_MASTER_IMPORT_FIXED.xlsx';

function getCellStr(row: any, col: number): string {
  const cell = row.getCell(col);
  if (!cell || cell.value == null) return '';
  const v = cell.value;
  if (typeof v === 'object' && v !== null && (v as any).richText)
    return ((v as any).richText || []).map((r: any) => r.text || '').join('').trim();
  return String(v).trim();
}

async function main() {
  console.log('=== Import 엑셀 보정 + Re-Import ===\n');

  // 1. 엑셀 읽기
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(ORIG_EXCEL);
  console.log('1. 원본 엑셀 로드 완료');

  // 2. FC시트에만 있고 L3시트에 없는 고장원인 수집
  const l3WS = wb.getWorksheet('L3 통합(B1-B5)')!;
  const fcWS = wb.getWorksheet('FC 고장사슬')!;

  // L3 기존 데이터: 공정번호→B4 목록
  const l3B4Set = new Set<string>();
  l3WS.eachRow((row, rn) => {
    if (rn <= 1) return;
    const pno = getCellStr(row, 1);
    const b4 = getCellStr(row, 7);
    if (pno && b4) l3B4Set.add(`${pno}::${b4}`);
  });

  // FC 시트의 모든 FC 텍스트 수집 (carry-forward 적용)
  let prevPno = '', prevFM = '', prevWE = '', prevM4 = '';
  const missingInL3: { pno: string; m4: string; we: string; fc: string; pc: string }[] = [];
  
  fcWS.eachRow((row, rn) => {
    if (rn <= 1) return;
    let pno = getCellStr(row, 3) || prevPno;
    let fm = getCellStr(row, 4) || prevFM;
    let m4 = getCellStr(row, 5) || prevM4;
    let we = getCellStr(row, 6) || prevWE;
    let fc = getCellStr(row, 7);
    let pc = getCellStr(row, 8);
    if (pno) prevPno = pno;
    if (fm) prevFM = fm;
    if (m4) prevM4 = m4;
    if (we) prevWE = we;

    if (fc && pno) {
      const key = `${pno}::${fc}`;
      if (!l3B4Set.has(key)) {
        missingInL3.push({ pno, m4, we, fc, pc });
        l3B4Set.add(key); // 중복 추가 방지
      }
    }
  });

  console.log(`2. FC시트 고유 고장원인 ${missingInL3.length}건 발견`);
  missingInL3.forEach(m => console.log(`   [${m.pno}] FC="${m.fc}" WE="${m.we}" 4M="${m.m4}"`));

  // 3. L3 시트에 누락 항목 추가
  const lastL3Row = l3WS.rowCount;
  console.log(`\n3. L3 시트 마지막 행: ${lastL3Row}`);

  // L3 기존 행에서 공정번호+작업요소(B1)별 B2/B3/B5 값 수집 (복제용)
  const l3RefMap = new Map<string, { b2: string; b3: string; b5: string }>();
  const pnoRefMap = new Map<string, { b2: string; b3: string; b5: string }>(); // 공정번호별
  l3WS.eachRow((row, rn) => {
    if (rn <= 1) return;
    const pno = getCellStr(row, 1);
    const b1 = getCellStr(row, 3);  // B1 = 작업요소
    const b2 = getCellStr(row, 4);  // B2 = 요소기능
    const b3 = getCellStr(row, 5);  // B3 = 공정특성
    const b5 = getCellStr(row, 8);  // B5 = 예방관리
    if (pno && b1 && (b2 || b3 || b5)) {
      l3RefMap.set(`${pno}::${b1}`, { b2, b3, b5 });
    }
    if (pno && (b3 || b5)) {
      if (!pnoRefMap.has(pno)) pnoRefMap.set(pno, { b2: '', b3: '', b5: '' });
      const ref = pnoRefMap.get(pno)!;
      if (b2 && !ref.b2) ref.b2 = b2;
      if (b3 && !ref.b3) ref.b3 = b3;
      if (b5 && !ref.b5) ref.b5 = b5;
    }
  });

  for (let i = 0; i < missingInL3.length; i++) {
    const m = missingInL3[i];
    const newRow = lastL3Row + 1 + i;
    const row = l3WS.getRow(newRow);
    
    // 같은 공정+작업요소 → 같은 공정번호 → 글로벌 폴백
    const ref = l3RefMap.get(`${m.pno}::${m.we}`) || pnoRefMap.get(m.pno);
    const b2 = ref?.b2 || '';
    const b3 = ref?.b3 || '';
    const b5 = ref?.b5 || m.pc || '';
    
    row.getCell(1).value = m.pno;
    row.getCell(2).value = m.m4;
    row.getCell(3).value = m.we;
    row.getCell(4).value = b2;
    row.getCell(5).value = b3;
    row.getCell(6).value = '';
    row.getCell(7).value = m.fc;
    row.getCell(8).value = b5;
    row.commit();
    console.log(`   추가: R${newRow} [${m.pno}] B1="${m.we}" B3="${b3}" B4="${m.fc}" B5="${b5}"`);
  }

  // ★ L3 시트 전체 B3/B5 carry-forward (빈값 보충)
  console.log('\n3-1. L3 시트 B3/B5 carry-forward...');
  let cfPrevB3 = '', cfPrevB5 = '', cfPrevPno = '';
  let b3Filled = 0, b5Filled = 0;
  l3WS.eachRow((row, rn) => {
    if (rn <= 1) return;
    const pno = getCellStr(row, 1);
    const b3 = getCellStr(row, 5);
    const b5 = getCellStr(row, 8);
    const b4 = getCellStr(row, 7);
    
    // 공정번호 변경 시 리셋
    if (pno && pno !== cfPrevPno) {
      cfPrevPno = pno;
      if (b3) cfPrevB3 = b3;
      else cfPrevB3 = pnoRefMap.get(pno)?.b3 || cfPrevB3;
      if (b5) cfPrevB5 = b5;
      else cfPrevB5 = pnoRefMap.get(pno)?.b5 || cfPrevB5;
    }
    
    // B3 빈값 → carry-forward
    if (!b3 && cfPrevB3 && b4) {
      row.getCell(5).value = cfPrevB3;
      b3Filled++;
    } else if (b3 && b3 !== '(FC 시트 보정 추가)') {
      cfPrevB3 = b3;
    }
    // "(FC 시트 보정 추가)" 텍스트 교체
    if (b3 === '(FC 시트 보정 추가)' && cfPrevB3) {
      row.getCell(5).value = cfPrevB3;
      b3Filled++;
    }
    
    // B5 빈값 → carry-forward
    if (!b5 && cfPrevB5 && b4) {
      row.getCell(8).value = cfPrevB5;
      b5Filled++;
    } else if (b5) {
      cfPrevB5 = b5;
    }
    
    row.commit();
  });
  console.log(`   B3 보충: ${b3Filled}건, B5 보충: ${b5Filled}건`);

  // 4. 보정 엑셀 저장
  await wb.xlsx.writeFile(FIXED_EXCEL);
  console.log(`\n4. 보정 엑셀 저장: ${FIXED_EXCEL}`);

  // 5. 보정 엑셀로 파싱 검증
  console.log('\n5. 보정 엑셀 파싱 검증...');
  const wb2 = new ExcelJS.Workbook();
  await wb2.xlsx.readFile(FIXED_EXCEL);
  process.env.POSITION_PARSER_VERBOSE = '0';
  const atomicData = parsePositionBasedWorkbook(wb2 as any, FMEA_ID);

  const brokenFE = atomicData.failureLinks.filter((fl: any) => !fl.feId).length;
  const brokenFM = atomicData.failureLinks.filter((fl: any) => !fl.fmId).length;
  const brokenFC = atomicData.failureLinks.filter((fl: any) => !fl.fcId).length;

  console.log('\n=== 보정 후 결과 ===');
  console.log(`FM: ${atomicData.failureModes.length} (기대: 21)`);
  console.log(`FL: ${atomicData.failureLinks.length} (기대: 49)`);
  console.log(`FE: ${atomicData.failureEffects?.length}`);
  console.log(`FC: ${atomicData.failureCauses?.length}`);
  console.log(`RA: ${atomicData.riskAnalyses?.length}`);
  console.log(`L2: ${atomicData.l2Structures?.length}`);
  console.log(`L3: ${atomicData.l3Structures?.length}`);
  console.log(`\nBroken FK: FE=${brokenFE} FM=${brokenFM} FC=${brokenFC}`);

  // ★ Auto-Link이 고아 FM/FC를 처리하므로 broken FK가 있어도 import 진행
  console.log('\n✅ Import 진행 (Auto-Link 적용됨)...');

  // 6. DB 기존 데이터 삭제 후 재 Import
  const res = await fetch('http://localhost:3000/api/fmea/save-position-import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fmeaId: FMEA_ID, atomicData, force: true }),
  });
  const result = await res.json();
  console.log('\n=== Re-Import 결과 ===');
  console.log('success:', result.success);
  if (result.error) console.log('error:', result.error);
  if (result.atomicCounts) {
    console.log('DB counts:');
    for (const [k, v] of Object.entries(result.atomicCounts)) console.log(`  ${k}: ${v}`);
  }
  if (result.forge) {
    console.log('forge passed:', result.forge.passed);
    result.forge.log?.forEach((l: string) => console.log('  ', l));
  }
}

main().catch(e => console.error('ERROR:', e.message));
