const BASE = 'http://localhost:3000';
const FMEA_ID = 'pfm26-m069';
const MASTER_ID = 'pfm26-m002';

async function main() {
  // 1. Master FMEA (pfm26-m002) Au Bump DB - L3Function.processChar 확인
  console.log('=== 1. Master FMEA (m002) L3Function.processChar ===');
  const m002s3 = await (await fetch(BASE + '/api/fmea/pipeline-detail?fmeaId=' + MASTER_ID + '&step=3')).json();
  const masterL3F = m002s3.data?.l3Functions || [];
  const masterEmpty = masterL3F.filter(f => !f.processChar || !f.processChar.trim());
  console.log('Total L3Func:', masterL3F.length, 'Empty processChar:', masterEmpty.length);
  if (masterEmpty.length > 0) {
    masterEmpty.forEach(f => console.log('  MASTER EMPTY: ' + f.id + ' fn=' + (f.name||'').substring(0,40)));
  }

  // 2. Import FMEA (pfm26-m069) L3Function.processChar 확인
  console.log('\n=== 2. Import FMEA (m069) L3Function.processChar ===');
  const m069s3 = await (await fetch(BASE + '/api/fmea/pipeline-detail?fmeaId=' + FMEA_ID + '&step=3')).json();
  const importL3F = m069s3.data?.l3Functions || [];
  const importEmpty = importL3F.filter(f => !f.processChar || !f.processChar.trim());
  console.log('Total L3Func:', importL3F.length, 'Empty processChar:', importEmpty.length);
  importEmpty.forEach(f => console.log('  IMPORT EMPTY: ' + f.id + ' fn=' + (f.name||'').substring(0,40)));

  // 3. 빈 7건의 functionName으로 Master에서 검색
  console.log('\n=== 3. Master에서 동일 함수 검색 ===');
  for (const emptyF of importEmpty) {
    const fnName = emptyF.name || '';
    const masterMatch = masterL3F.find(m => m.name === fnName);
    if (masterMatch) {
      console.log('  FOUND in master: "' + fnName.substring(0,40) + '"');
      console.log('    master.processChar = "' + (masterMatch.processChar || '(empty)') + '"');
    } else {
      console.log('  NOT FOUND in master: "' + fnName.substring(0,40) + '"');
    }
  }

  // 4. Master FlatItem에서 B3 데이터 확인
  console.log('\n=== 4. Master FlatItem B3 (Import용 데이터) ===');
  const masterSample = await (await fetch(BASE + '/api/fmea/pipeline-detail?fmeaId=' + FMEA_ID + '&step=0')).json();
  const flatItems = masterSample.data?.flatItems || [];
  // pipeline-detail step 0 might not return flatItems, try via step 2
  const s2detail = await (await fetch(BASE + '/api/fmea/pipeline-detail?fmeaId=' + FMEA_ID + '&step=2')).json();
  console.log('S2 details:', JSON.stringify(s2detail.data || {}).substring(0, 300));

  // 5. Import 파이프라인에서 B3 카운트 비교
  console.log('\n=== 5. Pipeline B3 카운트 비교 ===');
  const m002pv = await (await fetch(BASE + '/api/fmea/pipeline-verify?fmeaId=' + MASTER_ID)).json();
  const m069pv = await (await fetch(BASE + '/api/fmea/pipeline-verify?fmeaId=' + FMEA_ID)).json();
  
  const m002s2 = m002pv.steps.find(s => s.step === 2);
  const m069s2 = m069pv.steps.find(s => s.step === 2);
  
  console.log('Master (m002) B3:', m002s2?.details?.B3, 'emptyPC:', m002s2?.details?.emptyPC);
  console.log('Import (m069) B3:', m069s2?.details?.B3, 'emptyPC:', m069s2?.details?.emptyPC);
  
  // 6. 결론
  console.log('\n=== CONCLUSION ===');
  if (masterEmpty.length > 0) {
    console.log('PROBLEM: Master DB itself has empty processChar!');
    console.log('ROOT CAUSE: save-from-import creates L3Function without processChar for some work elements');
  } else if (importEmpty.length > 0 && masterEmpty.length === 0) {
    console.log('PROBLEM: Master is clean, but import creates empty processChar');
    console.log('ROOT CAUSE: Import pipeline (buildWorksheetState or migrateToAtomicDB) drops processChar');
  }
}

main().catch(console.error);
