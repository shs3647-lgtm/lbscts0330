import { parseMultiSheetExcel } from '@/app/(fmea-core)/pfmea/import/excel-parser';
import fs from 'fs';

async function test() {
  const buffer = fs.readFileSync('C:/Users/Administrator/Desktop/LB쎄미콘/aubump/aubump_import.xlsx');
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const file = new File([blob], 'aubump_import.xlsx', { type: blob.type });
  
  const result = await parseMultiSheetExcel(file);
  console.log('=== 간소화 4시트 파싱 결과 ===');
  console.log('processes:', result.processes.length);
  console.log('products:', result.products.length);
  console.log('failureChains:', result.failureChains.length);
  
  // 핵심 카운트
  const stats = result.statistics;
  const items = stats?.itemStats || [];
  for (const s of items) {
    console.log(`  ${s.itemCode}(${s.label}): ${s.rawCount}`);
  }
  console.log('chainCount:', stats?.chainCount);
  
  if (result.errors?.length) {
    console.log('\nERRORS:');
    result.errors.forEach((e: string) => console.log(' -', e));
  }
  
  // L2↔FC processNo 일치 검증
  const l2Pnos = new Set(result.processes.map(p => p.processNo));
  const fcPnos = new Set(result.failureChains.map(c => c.processNo));
  const mismatch = [...fcPnos].filter(p => !l2Pnos.has(p));
  console.log('\n=== processNo 교차 검증 ===');
  console.log('L2 공정:', l2Pnos.size, '개');
  console.log('FC 공정:', fcPnos.size, '개');
  if (mismatch.length) console.log('❌ FC에만 있는 공정:', mismatch);
  else console.log('✅ L2↔FC 공정번호 완전 일치');
}
test().catch(e => console.error(e));
