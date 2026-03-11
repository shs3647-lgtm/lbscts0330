const http = require('http');
http.get('http://localhost:3000/api/fmea?fmeaId=pfm26-p001-l50', (res) => {
  const chunks = [];
  res.on('data', c => chunks.push(c));
  res.on('end', () => {
    const j = JSON.parse(Buffer.concat(chunks).toString());
    const rd = j.riskData || {};
    const keys = Object.keys(rd).filter(k => k.startsWith('risk-') && k.endsWith('-S'));
    const sodCounts = {};
    for (const sk of keys) {
      const uk = sk.replace('risk-','').replace('-S','');
      const dv = (rd['detection-opt-'+uk]||'').trim();
      const pv = (rd['prevention-opt-'+uk]||'').trim();
      if(dv==='-' || pv==='-') {
        const s = Number(rd['risk-'+uk+'-S'])||0;
        const o = Number(rd['risk-'+uk+'-O'])||0;
        const d2 = Number(rd['risk-'+uk+'-D'])||0;
        const key = 'S='+s+' O='+o+' D='+d2;
        if(!sodCounts[key]) sodCounts[key] = {prevDash:0,detDash:0};
        if(pv==='-') sodCounts[key].prevDash++;
        if(dv==='-') sodCounts[key].detDash++;
      }
    }
    console.log('=== "-" 값 항목의 SOD 분포 ===');
    for(const [k,v] of Object.entries(sodCounts).sort((a,b)=>b[1].detDash-a[1].detDash)) {
      console.log(k, '| prev-dash:', v.prevDash, '| det-dash:', v.detDash);
    }
  });
});
