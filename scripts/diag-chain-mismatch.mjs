import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://postgres:1234@localhost:5432/fmea_db' });
const q = async (sql, p = []) => (await pool.query(sql, p)).rows;

async function main() {
  const fmeaId = 'pfm26-m081';
  const schema = 'pfmea_pfm26_m081';

  // 1. Legacy riskData 키 분석
  const [leg] = await q(`SELECT data FROM fmea_legacy_data WHERE "fmeaId" = $1`, [fmeaId]);
  const rd = leg.data.riskData || {};
  const chains = leg.data.failureLinks || [];

  // risk-* 키에서 유니크 fmId-fcId 조합 추출
  const riskKeys = Object.keys(rd).filter(k => k.startsWith('risk-') && k.endsWith('-S'));
  const riskPairs = riskKeys.map(k => k.replace('risk-', '').replace('-S', ''));
  console.log(`riskData SOD 키: ${riskKeys.length}개 (유니크 FM-FC 쌍)`);

  // prevention/detection 키 분석
  const prevKeys = Object.keys(rd).filter(k => k.startsWith('prevention-'));
  const detKeys = Object.keys(rd).filter(k => k.startsWith('detection-'));
  console.log(`prevention 키: ${prevKeys.length}개, detection 키: ${detKeys.length}개`);

  // 2. Legacy failureLinks에서 FM-FC 쌍 추출
  const legPairs = chains.map(c => `${c.fmId}-${c.fcId}`);
  console.log(`\nlegacy failureLinks: ${chains.length}개`);
  console.log(`유니크 FM-FC 쌍: ${new Set(legPairs).size}개`);

  // 3. riskData에 없는 FL 찾기
  console.log('\n=== riskData에 SOD가 없는 legacy FL ===');
  for (const c of chains) {
    const uk = `${c.fmId}-${c.fcId}`;
    const hasS = rd[`risk-${uk}-S`] !== undefined;
    const hasPC = rd[`prevention-${uk}`] !== undefined;
    const hasDC = rd[`detection-${uk}`] !== undefined;
    if (!hasS || !hasPC || !hasDC) {
      console.log(`  FM=${c.fmId}  FC=${c.fcId}  FE=${c.feId}`);
      console.log(`    SOD: ${hasS ? 'O' : 'X'}  PC: ${hasPC ? 'O' : 'X'}  DC: ${hasDC ? 'O' : 'X'}`);
    }
  }

  // 4. Atomic DB에서 빈 RA의 FC 이름 확인
  await q(`SET search_path TO "${schema}", public`);
  const emptyRA = await q(`
    SELECT ra.id, fl."fmId", fl."fcId", fl."feId",
           fc.cause as fc_name, fm.mode as fm_name
    FROM risk_analyses ra
    JOIN failure_links fl ON fl.id = ra."linkId"
    JOIN failure_causes fc ON fc.id = fl."fcId"
    JOIN failure_modes fm ON fm.id = fl."fmId"
    WHERE ra."fmeaId" = $1 AND (ra.severity <= 0 OR ra."preventionControl" IS NULL)
  `, [fmeaId]);
  console.log('\n=== 빈 RA의 FC/FM 이름 ===');
  for (const r of emptyRA) {
    console.log(`  FC: "${r.fc_name}"`);
    console.log(`  FM: "${r.fm_name}"`);
    console.log(`  fcId: ${r.fcId}`);
    console.log(`  fmId: ${r.fmId}`);
  }

  // 5. 같은 FC 이름으로 다른 FM에 연결된 chain이 있는지?
  if (emptyRA.length > 0) {
    const fcName = emptyRA[0].fc_name;
    const fmName = emptyRA[0].fm_name;
    
    // Legacy l2에서 이 FC가 어디에 있는지
    const l2s = leg.data.l2 || [];
    console.log(`\n=== FC "${fcName}" 추적 ===`);
    for (const proc of l2s) {
      // FM에서 찾기
      for (const fm of (proc.failureModes || [])) {
        if (fm.name === fmName || fm.id === emptyRA[0].fmId) {
          console.log(`  공정 ${proc.processNo} "${proc.name}" → FM "${fm.name}" (${fm.id})`);
          // 이 FM의 failureLinks 확인
          const fmLinks = chains.filter(c => c.fmId === fm.id);
          console.log(`    이 FM의 chain 수: ${fmLinks.length}`);
          for (const link of fmLinks) {
            const uk = `${link.fmId}-${link.fcId}`;
            const hasRD = rd[`risk-${uk}-S`] !== undefined;
            console.log(`    → FC=${link.fcId} riskData=${hasRD ? 'O' : 'X'}`);
          }
        }
      }
      // FC에서 찾기
      for (const we of (proc.l3 || [])) {
        for (const fc of (we.failureCauses || [])) {
          if (fc.name === fcName || fc.id === emptyRA[0].fcId) {
            console.log(`  공정 ${proc.processNo} WE "${we.name}" → FC "${fc.name}" (${fc.id})`);
          }
        }
      }
    }

    // 이 FC 이름이 riskData의 어떤 키에든 매핑되어 있는지
    // fcId 부분만으로 검색
    const fcId = emptyRA[0].fcId;
    const allFCs = await q(`SELECT id, cause FROM failure_causes WHERE "fmeaId" = $1`, [fmeaId]);
    const sameName = allFCs.filter(f => f.cause === fcName);
    console.log(`\n  같은 이름의 FC: ${sameName.length}개`);
    for (const f of sameName) {
      const matching = Object.keys(rd).filter(k => k.includes(f.id));
      console.log(`    ${f.id}: riskData 키 ${matching.length}개`);
    }
  }
}

main().catch(console.error).finally(() => pool.end());
