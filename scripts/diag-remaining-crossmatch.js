/**
 * 잔여 교차매핑 상세 분석 스크립트
 */
const http = require('http');

function request(method, path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, 'http://localhost:3000');
    const options = {
      hostname: url.hostname, port: url.port,
      path: url.pathname + url.search, method,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function extractEquipmentRef(pcharName) {
  const m1 = pcharName.match(/^\d+번-(.+?)-[^-]+$/);
  if (m1) return m1[1];
  const m2 = pcharName.match(/^\d+번-(.+?)$/);
  if (m2) {
    const parts = m2[1].split('-');
    if (parts.length >= 2) return parts[0];
  }
  return null;
}

function extractEquipmentName(l3Name) {
  const m1 = l3Name.match(/^\d+번-(.+)$/);
  if (m1) return m1[1];
  const m2 = l3Name.match(/^\d+번\s+(.+)$/);
  if (m2) return m2[1];
  return l3Name;
}

function isSameEquipment(ref, l3EquipName) {
  if (!ref || !l3EquipName) return false;
  const normRef = ref.replace(/\s+/g, '').toLowerCase();
  const normL3 = l3EquipName.replace(/\s+/g, '').toLowerCase();
  if (normRef === normL3) return true;
  if (normRef.includes(normL3) || normL3.includes(normRef)) return true;
  return false;
}

async function main() {
  const wsData = await request('GET', '/api/fmea?fmeaId=pfm26-p008-l09');
  const l2Data = wsData.l2 || [];

  const crossList = [];
  for (const l2 of l2Data) {
    const l3Items = (l2.l3 || []).filter(l3 => {
      const m4 = (l3.m4 || l3.fourM || '').toUpperCase();
      return m4 !== 'MN' && (l3.name || '').trim().length > 0;
    });

    const l3Names = l3Items.map(l3 => {
      const nm = (l3.name || '').trim();
      return extractEquipmentName(nm);
    });

    for (const l3 of l3Items) {
      const l3Name = (l3.name || '').trim();
      const l3Equip = extractEquipmentName(l3Name);

      for (const func of (l3.functions || [])) {
        for (const pchar of (func.processChars || [])) {
          const pcharName = (pchar.name || '').trim();
          if (!pcharName) continue;

          const refEquip = extractEquipmentRef(pcharName);
          if (!refEquip) continue;

          const isCorrect = isSameEquipment(refEquip, l3Equip);
          if (!isCorrect) {
            // 퍼지 매칭 시도 (공백/하이픈 차이 무시)
            const normRef = refEquip.replace(/[\s-]+/g, '').toLowerCase();
            const fuzzyMatch = l3Names.find(nm => {
              const normNm = nm.replace(/[\s-]+/g, '').toLowerCase();
              return normNm.includes(normRef) || normRef.includes(normNm);
            });

            crossList.push({
              processNo: l2.no,
              processName: l2.name,
              l3Name,
              l3Equip,
              pcharName,
              refEquip,
              fuzzyMatch: fuzzyMatch || '(없음)',
              allL3Equips: l3Names.join(' | ')
            });
          }
        }
      }
    }
  }

  console.log('잔여 교차매핑:', crossList.length, '건\n');
  crossList.forEach((c, i) => {
    console.log(`--- #${i + 1} ---`);
    console.log(`  공정: ${c.processNo} ${c.processName}`);
    console.log(`  현재L3: ${c.l3Name} (장비: ${c.l3Equip})`);
    console.log(`  공정특성: ${c.pcharName}`);
    console.log(`  참조장비: "${c.refEquip}"`);
    console.log(`  퍼지매칭: ${c.fuzzyMatch}`);
    console.log(`  동일공정 L3: ${c.allL3Equips}`);
    console.log('');
  });
}

main().catch(console.error);
