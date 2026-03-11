const http = require('http');

const data = JSON.stringify({ fmeaId: 'pfm26-p001-l50', pfdNo: 'pfd26-p001-l50' });

const req = http.request({
  hostname: 'localhost', port: 3000,
  path: '/api/pfd/sync-from-fmea', method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
}, (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    console.log('status:', res.statusCode);
    try {
      const json = JSON.parse(body);
      console.log('success:', json.success);
      if (!json.success) {
        console.log('ERROR:', json.error);
        return;
      }
      const items = json.data?.items || [];
      console.log('itemCount:', json.data?.itemCount);

      // Check key fields
      const withDesc = items.filter(i => i.processDesc && i.processDesc !== '');
      const withProdChar = items.filter(i => i.productChar && i.productChar !== '');
      const withProcChar = items.filter(i => i.processChar && i.processChar !== '');
      const withProdSC = items.filter(i => i.productSC && i.productSC !== '');
      const withProcSC = items.filter(i => i.processSC && i.processSC !== '');

      console.log('\n=== Field Coverage ===');
      console.log('processDesc:', withDesc.length, '/', items.length);
      console.log('productChar:', withProdChar.length, '/', items.length);
      console.log('processChar:', withProcChar.length, '/', items.length);
      console.log('productSC:', withProdSC.length, '/', items.length);
      console.log('processSC:', withProcSC.length, '/', items.length);

      // Show first 5 items
      console.log('\n=== First 5 items ===');
      items.slice(0, 5).forEach((item, i) => {
        console.log(`[${i}] no=${item.processNo} name=${item.processName} desc="${(item.processDesc || '').substring(0, 40)}" part="${item.partName}" equip="${item.equipment}" | prodSC="${item.productSC}" prodChar="${(item.productChar || '').substring(0, 30)}" procSC="${item.processSC}" procChar="${(item.processChar || '').substring(0, 30)}"`);
      });
    } catch(e) {
      console.log('Parse error:', e.message);
      console.log('Body:', body.substring(0, 500));
    }
  });
});
req.on('error', (e) => console.error('Request error:', e.message));
req.write(data);
req.end();
