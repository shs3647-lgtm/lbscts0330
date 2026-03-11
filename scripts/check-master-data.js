const http = require('http');
const options = { hostname: 'localhost', port: 3000, path: '/api/fmea?fmeaId=pfm26-p004-l05-r01', method: 'GET' };
const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    json.l2.forEach((proc, i) => {
      console.log('L2[' + i + '] no:', proc.no, '| name:', proc.name);
    });
    const pNos = [...new Set(json.failureLinks.map(l => l.fmProcessNo).filter(Boolean))];
    console.log('\nfailureLinks processNos:', pNos);
    const fcByProcess = {};
    json.failureLinks.forEach(fl => {
      const pno = fl.fmProcessNo || 'unknown';
      if (!fcByProcess[pno]) fcByProcess[pno] = new Set();
      if (fl.fcText) fcByProcess[pno].add(fl.fcText);
    });
    console.log('\nFC by processNo:');
    Object.entries(fcByProcess).forEach(([pno, fcs]) => {
      console.log('  ' + pno + ': ' + [...fcs].length + ' FCs');
      [...fcs].slice(0, 5).forEach(fc => console.log('    - ' + fc.substring(0, 80)));
    });
  });
});
req.on('error', e => console.error(e.message));
req.end();
