const http = require('http');

// Master FMEA ID를 먼저 조회
async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname, port: u.port, path: u.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => {
      let resData = '';
      res.on('data', chunk => resData += chunk);
      res.on('end', () => resolve(JSON.parse(resData)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

const PROCESSES = [
  { no: '10', name: 'IQA' },
  { no: '20', name: 'Backgrind' },
  { no: '30', name: 'Cleaning' },
  { no: '40', name: 'UBM Sputter' },
  { no: '50', name: 'PR Coating' },
  { no: '60', name: 'Exposure' },
  { no: '70', name: 'Develop' },
  { no: '80', name: 'Etch' },
  { no: '90', name: 'PR Strip' },
  { no: '100', name: 'Au Plating' },
  { no: '110', name: 'Resist Strip' },
  { no: '120', name: 'Seed Etch' },
  { no: '130', name: 'Reflow' },
  { no: '140', name: 'Flux Clean' },
  { no: '150', name: 'FVI' },
  { no: '160', name: 'Tape Lamination' },
  { no: '170', name: 'Sawing' },
  { no: '190', name: 'FQA' },
  { no: '200', name: 'Packing' },
];

async function main() {
  // Get master FMEA ID
  const list = await fetchJson('http://localhost:3000/api/master-fmea');
  if (!list.success || !list.data || list.data.length === 0) {
    console.error('Master FMEA not found');
    return;
  }
  const masterFmeaId = list.data[0].id;
  console.log('Master FMEA ID:', masterFmeaId);
  console.log('Code:', list.data[0].code, '| Name:', list.data[0].name);
  console.log('');

  // Register processes
  let ok = 0;
  for (const p of PROCESSES) {
    try {
      const result = await postJson(
        `http://localhost:3000/api/master-fmea/${masterFmeaId}/processes`,
        { processNo: p.no, processName: p.name }
      );
      if (result.success) {
        ok++;
        console.log('  OK:', p.no, p.name);
      } else {
        console.log('  FAIL:', p.no, p.name, result.error);
      }
    } catch(e) {
      console.log('  ERROR:', p.no, e.message);
    }
  }
  console.log('\n공정 등록 결과:', ok + '/' + PROCESSES.length, ok === PROCESSES.length ? '✅' : '❌');
}

main().catch(e => console.error(e));
