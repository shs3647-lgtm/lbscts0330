/**
 * 특별특성(specialChar) 진단 스크립트
 * - legacyData, failureChains, flatItems 모두 확인
 */
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/fmea_db?schema=public',
});

async function run() {
  const client = await pool.connect();
  try {
    // 1. Master dataset에서 failureChains의 specialChar 확인
    const masterRes = await client.query(
      'SELECT id, name, "failureChains", "relationData" FROM pfmea_master_datasets ORDER BY "createdAt" DESC LIMIT 1'
    );
    if (masterRes.rows.length === 0) {
      console.log('Master 없음');
      return;
    }

    const master = masterRes.rows[0];
    const fc = master.failureChains || [];
    const rd = master.relationData || {};

    console.log('=== Master:', master.name, '===');
    console.log('failureChains:', fc.length, '건');

    const withSC = fc.filter(c => c.specialChar && String(c.specialChar).trim());
    console.log('  specialChar 있음:', withSC.length, '건');

    if (withSC.length > 0) {
      withSC.slice(0, 10).forEach((c, i) => {
        console.log('   ', i, 'proc=' + c.processNo, 'sc="' + c.specialChar + '"', 'fm=' + (c.fmValue || '').substring(0, 25));
      });
    } else if (fc.length > 0) {
      console.log('  첫 3건 키 목록:');
      fc.slice(0, 3).forEach((c, i) => {
        console.log('   ', i, 'keys:', Object.keys(c).join(', '));
      });
    }

    // 2. flatItems에서 A4/B3의 specialChar 확인
    const flatItems = rd.flatItems || rd.items || [];
    const a4Items = flatItems.filter(i => i.itemCode === 'A4');
    const b3Items = flatItems.filter(i => i.itemCode === 'B3');
    const a4SC = a4Items.filter(i => i.specialChar && String(i.specialChar).trim());
    const b3SC = b3Items.filter(i => i.specialChar && String(i.specialChar).trim());

    console.log('\n=== flatItems specialChar ===');
    console.log('A4:', a4Items.length, '건 중 SC:', a4SC.length, '건');
    console.log('B3:', b3Items.length, '건 중 SC:', b3SC.length, '건');

    if (a4SC.length > 0) {
      a4SC.slice(0, 5).forEach(i => console.log('  A4:', i.processNo, (i.value || '').substring(0, 20), '=>', i.specialChar));
    }
    if (b3SC.length > 0) {
      b3SC.slice(0, 5).forEach(i => console.log('  B3:', i.processNo, (i.value || '').substring(0, 20), '=>', i.specialChar));
    }

    // 3. legacyData 확인
    const legRes = await client.query(
      'SELECT "fmeaId", data FROM fmea_legacy_data ORDER BY "updatedAt" DESC LIMIT 1'
    );
    if (legRes.rows.length > 0) {
      const data = legRes.rows[0].data;
      const fmeaId = legRes.rows[0].fmeaId;
      const l2 = data.l2 || [];

      let pcTotal = 0, pcSC = 0;
      let prcTotal = 0, prcSC = 0;

      for (const proc of l2) {
        for (const f of (proc.functions || [])) {
          for (const pc of (f.productChars || [])) {
            pcTotal++;
            if (pc.specialChar && String(pc.specialChar).trim()) pcSC++;
          }
        }
        for (const we of (proc.l3 || [])) {
          for (const wf of (we.functions || [])) {
            for (const pc of (wf.processChars || [])) {
              prcTotal++;
              if (pc.specialChar && String(pc.specialChar).trim()) prcSC++;
            }
          }
        }
      }

      console.log('\n=== legacyData:', fmeaId, '===');
      console.log('A4 제품특성:', pcTotal, '건 중 SC:', pcSC, '건');
      console.log('B3 공정특성:', prcTotal, '건 중 SC:', prcSC, '건');
    }

    // 결론
    console.log('\n=== 결론 ===');
    const sources = [];
    if (a4SC.length > 0 || b3SC.length > 0) sources.push('flatItems');
    if (withSC.length > 0) sources.push('failureChains');
    if (sources.length === 0) {
      console.log('▶ 특별특성 데이터 원본 0건!');
      console.log('  → 엑셀 A4/B3 시트에 "특별특성" 컬럼이 없거나');
      console.log('  → FC_고장사슬 시트에 "특별특성" 컬럼이 없습니다.');
      console.log('  → 파서가 specialChar 컬럼을 감지하지 못했을 수 있습니다.');
    } else {
      console.log('▶ 특별특성 원본 존재:', sources.join(', '));
      console.log('  → legacyData 주입 과정에서 누락 발생');
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
