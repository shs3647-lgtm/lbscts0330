import fs from 'fs';
const d = JSON.parse(fs.readFileSync('data/master-fmea/pfm26-m002.json','utf8'));
const ch = d.chains;
console.log('총 chains:', ch.length);

const fields = ['feScope','feValue','processNo','fmValue','m4','workElement','fcValue','pcValue','dcValue','severity','occurrence','detection'];
for (const f of fields) {
  const empty = ch.filter(c => !c[f] || String(c[f]).trim() === '');
  const zero = ch.filter(c => c[f] === 0);
  if (empty.length > 0 || zero.length > 0) {
    console.log('  EMPTY', f + ':', empty.length, 'ZERO:', zero.length);
    if (empty.length <= 10) {
      empty.forEach((c,i) => console.log('    ['+i+']', 'pNo='+c.processNo, 'fm='+String(c.fmValue||'').substring(0,25), 'fc='+String(c.fcValue||'').substring(0,25)));
    }
  } else {
    console.log('  OK', f + ':', ch.length);
  }
}

const extra = ['l3Function','processChar','productChar','l2Function'];
for (const f of extra) {
  const empty = ch.filter(c => !c[f] || String(c[f]).trim() === '');
  console.log(empty.length > 0 ? '  EMPTY' : '  OK', f + ':', empty.length > 0 ? empty.length + ' empty' : ch.length);
  if (empty.length > 0 && empty.length <= 10) {
    empty.forEach((c,i) => console.log('    ['+i+']', 'pNo='+c.processNo, 'm4='+c.m4, 'we='+String(c.workElement||'').substring(0,20)));
  }
}

const ids = ['fmId','fcId','feId','fmFlatId','fcFlatId','feFlatId'];
for (const f of ids) {
  const empty = ch.filter(c => !c[f] || String(c[f]).trim() === '');
  console.log(empty.length > 0 ? '  EMPTY' : '  OK', f + ':', empty.length > 0 ? empty.length + ' empty' : ch.length);
}

// Excel 시트 검증: generate-master-sample이 만든 FC시트 데이터 시뮬레이션
const stripPrefix = (v) => (v || '').replace(/^[DP]:/gm, '').trim();
const fcRows = ch.map(c => [
  c.feScope || '',
  c.feValue || '',
  c.processNo || '',
  c.fmValue || '',
  c.m4 || '',
  c.workElement || '',
  c.fcValue || '',
  stripPrefix(c.pcValue || ''),
  stripPrefix(c.dcValue || ''),
  c.severity ? String(c.severity) : '',
  c.occurrence ? String(c.occurrence) : '',
  c.detection ? String(c.detection) : '',
]);

console.log('\n=== FC 시트 빈칸 전수 검증 ===');
const colNames = ['FE구분','FE','공정번호','FM','4M','작업요소','FC','PC','DC','S','O','D'];
for (let col = 0; col < colNames.length; col++) {
  const empties = [];
  fcRows.forEach((r, i) => {
    if (!r[col] || String(r[col]).trim() === '') empties.push(i);
  });
  if (empties.length > 0) {
    console.log('  FAIL', colNames[col] + ':', empties.length + '건 빈칸');
    empties.slice(0, 5).forEach(i => {
      const r = fcRows[i];
      console.log('    row', i+1, '| pNo='+r[2], 'fm='+String(r[3]).substring(0,20), 'fc='+String(r[6]).substring(0,20));
    });
  } else {
    console.log('  PASS', colNames[col] + ':', fcRows.length + '건 완전');
  }
}

// L3 시트 검증
const chainsByB1Key = new Map();
for (const c of ch) {
  const key = `${c.processNo||''}|${c.m4||''}|${c.workElement||''}`;
  if (!chainsByB1Key.has(key)) chainsByB1Key.set(key, []);
  chainsByB1Key.get(key).push(c);
}

const l3Rows = [];
for (const [key, arr] of chainsByB1Key) {
  for (const c of arr) {
    l3Rows.push([
      c.processNo || '',
      c.m4 || '',
      c.workElement || '',
      c.l3Function || '',
      c.processChar || '',
      '',
      c.fcValue || '',
      stripPrefix(c.pcValue || ''),
    ]);
  }
}

console.log('\n=== L3 시트 빈칸 전수 검증 ===');
const l3ColNames = ['공정번호','4M','작업요소(B1)','요소기능(B2)','공정특성(B3)','특별특성','고장원인(B4)','예방관리(B5)'];
for (let col = 0; col < l3ColNames.length; col++) {
  if (col === 5) continue; // 특별특성 skip
  const empties = [];
  l3Rows.forEach((r, i) => {
    if (!r[col] || String(r[col]).trim() === '') empties.push(i);
  });
  if (empties.length > 0) {
    console.log('  FAIL', l3ColNames[col] + ':', empties.length + '건 빈칸');
    empties.slice(0, 5).forEach(i => {
      const r = l3Rows[i];
      console.log('    row', i+1, '| pNo='+r[0], 'm4='+r[1], 'we='+String(r[2]).substring(0,20));
    });
  } else {
    console.log('  PASS', l3ColNames[col] + ':', l3Rows.length + '건 완전');
  }
}

console.log('\n총계: FC시트=' + fcRows.length + '행, L3시트=' + l3Rows.length + '행');
