/**
 * 5시트 position-parser 테스트:
 * - m102_clean_import.xlsx 파싱
 * - m002 연결표 JSON과 FK 비교
 */
import { parsePositionBasedExcel } from '../src/lib/fmea-core/position-parser';
import * as fs from 'fs';

async function main() {
  const excelPath = 'data/m102_clean_import.xlsx';
  console.log(`Parsing: ${excelPath}`);

  const result = await parsePositionBasedExcel(excelPath);
  console.log('\n=== flatData stats ===');
  console.log(JSON.stringify(result.stats, null, 2));

  // Load connection table
  const conn = JSON.parse(fs.readFileSync('data/master-fmea/m002-connection-table.json', 'utf8'));

  console.log('\n=== Comparison ===');
  console.log(`FE (C4): parser=${result.stats.C4 || 0}, conn=${conn.stats.feCount}`);
  console.log(`FM (A5): parser=${result.stats.A5 || 0}, conn=${conn.stats.fmCount}`);
  console.log(`FC (B4): parser=${result.stats.B4 || 0}, conn=${conn.stats.fcCount}`);
  console.log(`FL chains: parser=${result.stats.chainTotal}, conn=${conn.stats.linkCount}`);

  // Chain FK resolution
  console.log(`\nChains with all 3 FK: ${result.stats.chains3FK} / ${result.stats.chainTotal}`);
  console.log(`  with FE: ${result.stats.chainsWithFE}`);
  console.log(`  with FM: ${result.stats.chainsWithFM}`);
  console.log(`  with FC: ${result.stats.chainsWithFC}`);

  // Check unresolved
  const unresolved = result.chains.filter(c => !c.feId || !c.fmId || !c.fcId);
  if (unresolved.length > 0) {
    console.log(`\n⚠ Unresolved chains: ${unresolved.length}`);
    for (const c of unresolved.slice(0, 5)) {
      console.log(`  Row ${c.excelRow}: FE=${c.feId ? 'OK' : 'MISS'} FM=${c.fmId ? 'OK' : 'MISS'} FC=${c.fcId ? 'OK' : 'MISS'}`);
    }
  } else {
    console.log('\n✅ All chains resolved with 3 FK!');
  }

  // Unique FM/FC/FE in chains
  const uniqueFM = new Set(result.chains.map(c => c.fmId).filter(Boolean));
  const uniqueFC = new Set(result.chains.map(c => c.fcId).filter(Boolean));
  const uniqueFE = new Set(result.chains.map(c => c.feId).filter(Boolean));
  console.log(`\nUnique in chains: FM=${uniqueFM.size}, FC=${uniqueFC.size}, FE=${uniqueFE.size}`);

  // Verify N:M FC→FM
  const fcToFMs = new Map<string, Set<string>>();
  for (const c of result.chains) {
    if (!c.fcId || !c.fmId) continue;
    if (!fcToFMs.has(c.fcId)) fcToFMs.set(c.fcId, new Set());
    fcToFMs.get(c.fcId)!.add(c.fmId);
  }
  const multiFC = Array.from(fcToFMs.values()).filter(s => s.size > 1).length;
  console.log(`FC→multi-FM: ${multiFC} (expected ~30)`);
}

main().catch(console.error);
