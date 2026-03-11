/**
 * specialChar 파서 자동 검증 스크립트
 * ExcelJS로 테스트 엑셀 생성 → 파서 로직 재현 → specialChar 감지 확인
 */
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// excel-parser.ts의 cellValueToString 재현
function cellValueToString(cellValue) {
  if (cellValue === null || cellValue === undefined) return '';
  if (typeof cellValue === 'string') return cellValue.trim();
  if (typeof cellValue === 'number' || typeof cellValue === 'boolean') return String(cellValue);
  if (cellValue instanceof Date) return cellValue.toISOString().slice(0, 10);
  if (typeof cellValue === 'object') {
    if (cellValue.richText && Array.isArray(cellValue.richText)) {
      return cellValue.richText.map(r => r.text || '').join('').trim();
    }
    if ('text' in cellValue && typeof cellValue.text === 'string') return cellValue.text.trim();
    if ('name' in cellValue && typeof cellValue.name === 'string') return cellValue.name.trim();
    try { const j = JSON.stringify(cellValue); if (j && j !== '{}') return j; } catch {}
    return '';
  }
  return String(cellValue).trim();
}

async function run() {
  const testFile = path.join(__dirname, 'test-sc.xlsx');

  // ── 1단계: 테스트 엑셀 생성 ──
  console.log('=== 1단계: 테스트 엑셀 생성 ===');
  const wb = new ExcelJS.Workbook();

  // A4 시트: 공정번호 | 제품특성 | 특별특성
  const a4 = wb.addWorksheet('L2-4(A4) 제품특성');
  a4.getRow(1).values = ['공정번호', '제품특성', '특별특성'];
  a4.getRow(2).values = ['10', '외관 치수', 'C'];
  a4.getRow(3).values = ['10', '표면 조도', ''];
  a4.getRow(4).values = ['20', '도막 두께', 'C'];
  a4.getRow(5).values = ['20', '색상', ''];

  // B3 시트: 공정번호 | 4M | 공정특성 | 특별특성
  const b3 = wb.addWorksheet('L3-3(B3) 공정특성');
  b3.getRow(1).values = ['공정번호', '4M', '공정특성', '특별특성'];
  b3.getRow(2).values = ['10', 'MN', '작업자-셋업점검', 'C'];
  b3.getRow(3).values = ['10', 'MC', '설비-온도관리', ''];
  b3.getRow(4).values = ['20', 'MN', '작업자-도포압력', 'C'];
  b3.getRow(5).values = ['20', 'MC', '설비-속도', ''];

  await wb.xlsx.writeFile(testFile);
  console.log('  테스트 파일 생성:', testFile);

  // ── 2단계: ExcelJS로 읽고 파서 로직 재현 ──
  console.log('\n=== 2단계: 파서 로직 재현 ===');
  const wb2 = new ExcelJS.Workbook();
  await wb2.xlsx.readFile(testFile);

  wb2.eachSheet((sheet) => {
    const sheetName = sheet.name;
    console.log(`\n--- 시트: "${sheetName}" ---`);

    // 헤더 읽기 (eachCell)
    const headers = [];
    const headerColMap = [];
    const headerRow = sheet.getRow(1);

    headerRow.eachCell((cell, colNumber) => {
      headers.push(cellValueToString(cell.value));
      headerColMap.push(colNumber);
    });

    console.log('  headers:', headers);
    console.log('  headerColMap:', headerColMap);

    // specialCharCol 감지
    let specialCharCol = 0;
    for (let i = 0; i < headers.length; i++) {
      const h = (headers[i] || '').replace(/\s/g, '');
      if (h.includes('특별특성') || h.includes('특별') || h.toLowerCase().includes('sc') || h.includes('Special')) {
        specialCharCol = headerColMap[i];
        console.log(`  ★ 특별특성 컬럼 발견: headers[${i}]="${headers[i]}" → col=${specialCharCol}`);
        break;
      }
    }
    if (specialCharCol === 0) {
      console.log('  ⚠️ 특별특성 컬럼 미발견!');
    }

    // 데이터 행 읽기
    for (let r = 2; r <= 5; r++) {
      const row = sheet.getRow(r);
      const key = cellValueToString(row.getCell(1).value);

      if (specialCharCol > 0) {
        const rawVal = row.getCell(specialCharCol).value;
        const scVal = cellValueToString(rawVal);
        console.log(`  row${r}: key=${key} col${specialCharCol}.raw=${JSON.stringify(rawVal)} → sc="${scVal}"`);
      }
    }
  });

  // ── 3단계: 사용자의 실제 엑셀 파일도 테스트 ──
  console.log('\n=== 3단계: 사용자 엑셀 파일 탐색 ===');
  const searchDirs = [
    'c:\\Users\\Administrator\\Downloads',
    'D:\\00 SMART FMEA TUTOR',
    'D:\\',
    'c:\\Users\\Administrator\\Desktop',
  ];

  let userExcel = null;
  for (const dir of searchDirs) {
    try {
      const files = fs.readdirSync(dir);
      const xlsxFiles = files.filter(f => f.endsWith('.xlsx') && !f.startsWith('~$'));
      if (xlsxFiles.length > 0) {
        console.log(`  ${dir}: ${xlsxFiles.length}개 엑셀 파일 발견`);
        xlsxFiles.forEach(f => {
          const stat = fs.statSync(path.join(dir, f));
          const age = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60); // hours
          console.log(`    ${f} (${(stat.size/1024).toFixed(0)}KB, ${age.toFixed(1)}시간 전)`);
          // 가장 최근 수정된 xlsx 선택
          if (!userExcel || stat.mtimeMs > userExcel.mtime) {
            userExcel = { path: path.join(dir, f), mtime: stat.mtimeMs, name: f };
          }
        });
      }
    } catch {}
  }

  if (userExcel) {
    console.log(`\n=== 4단계: 사용자 엑셀 분석: ${userExcel.name} ===`);
    const uwb = new ExcelJS.Workbook();
    await uwb.xlsx.readFile(userExcel.path);

    uwb.eachSheet((sheet) => {
      const name = sheet.name;

      // 헤더
      const hdrs = [];
      const hmap = [];
      sheet.getRow(1).eachCell((cell, col) => {
        hdrs.push(cellValueToString(cell.value));
        hmap.push(col);
      });

      // A4/B3 시트만 상세 분석
      const isA4 = name.includes('A4') || name.includes('제품특성') || name.includes('L2-4');
      const isB3 = name.includes('B3') || name.includes('공정특성') || name.includes('L3-3');

      if (isA4 || isB3) {
        console.log(`\n--- 시트: "${name}" (${isA4 ? 'A4' : 'B3'}) ---`);
        console.log('  헤더:', hdrs.map((h, i) => `[${i}]col${hmap[i]}="${h}"`).join(' | '));

        // specialCharCol 감지
        let scCol = 0;
        for (let i = 0; i < hdrs.length; i++) {
          const h = (hdrs[i] || '').replace(/\s/g, '');
          if (h.includes('특별특성') || h.includes('특별') || h.toLowerCase().includes('sc') || h.includes('Special')) {
            scCol = hmap[i];
            console.log(`  ★ 특별특성 컬럼: headers[${i}]="${hdrs[i]}" → col=${scCol}`);
            break;
          }
        }
        if (scCol === 0) {
          console.log('  ⚠️ 특별특성 컬럼 미발견!');
          // 모든 헤더의 charCode 출력 (숨겨진 문자 확인)
          hdrs.forEach((h, i) => {
            const codes = [...h].map(c => c.charCodeAt(0).toString(16)).join(' ');
            console.log(`    header[${i}] "${h}" charCodes: ${codes}`);
          });
        }

        // 데이터 행 (최대 10행)
        const maxRow = Math.min(sheet.rowCount, 12);
        let scCount = 0;
        for (let r = 2; r <= maxRow; r++) {
          const row = sheet.getRow(r);
          const key = cellValueToString(row.getCell(1).value);
          if (!key) continue;

          if (scCol > 0) {
            const rawVal = row.getCell(scCol).value;
            const scVal = cellValueToString(rawVal);
            if (scVal) scCount++;
            console.log(`  row${r}: key=${key} col${scCol} raw=${JSON.stringify(rawVal)} → sc="${scVal}"`);
          } else {
            // scCol 미감지 시 모든 컬럼 값 덤프
            const vals = [];
            for (let c = 1; c <= Math.min(hmap.length + 2, 10); c++) {
              const v = row.getCell(c).value;
              if (v !== null && v !== undefined) {
                vals.push(`col${c}=${JSON.stringify(v)}`);
              }
            }
            console.log(`  row${r}: ${vals.join(' | ')}`);
          }
        }
        console.log(`  → specialChar 보유: ${scCount}건`);
      } else {
        console.log(`  시트 "${name}": 헤더=${hdrs.slice(0, 4).join(', ')} (A4/B3 아님, 스킵)`);
      }
    });
  } else {
    console.log('  사용자 엑셀 파일 미발견');
  }

  // 정리
  try { fs.unlinkSync(testFile); } catch {}
  console.log('\n=== 검증 완료 ===');
}

run().catch(err => console.error('Error:', err.message));
