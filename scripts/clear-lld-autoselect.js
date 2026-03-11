/**
 * LLD 자동선택 데이터 초기화 스크립트 (raw SQL)
 * 사용법: node scripts/clear-lld-autoselect.js
 */
require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // riskData가 있는 워크시트 조회
  const { rows } = await client.query(
    'SELECT id, "fmeaId", "riskData" FROM "fmea_worksheet_data" WHERE "riskData" IS NOT NULL'
  );
  console.log('[LLD초기화] 워크시트 ' + rows.length + '건 조회');

  var totalCleaned = 0;

  for (var i = 0; i < rows.length; i++) {
    var ws = rows[i];
    var riskData = ws.riskData;
    if (!riskData || typeof riskData !== 'object') continue;

    var newRiskData = {};
    var cleaned = 0;
    var keys = Object.keys(riskData);

    for (var j = 0; j < keys.length; j++) {
      var key = keys[j];
      var value = riskData[key];

      // lesson-*, lesson-target-* 키 삭제
      if (key.startsWith('lesson-') || key.startsWith('lesson-target-')) {
        cleaned++;
        continue;
      }

      // [LLDxx-xxx] 접두어 텍스트 제거
      if ((key.startsWith('prevention-opt-') || key.startsWith('detection-opt-')) && typeof value === 'string') {
        var lines = value.split('\n');
        var filtered = lines.filter(function(l) { return !l.trim().startsWith('[LLD'); });
        var newVal = filtered.join('\n').trim();
        if (newVal !== value) {
          cleaned++;
          newRiskData[key] = newVal || value;
          continue;
        }
      }

      newRiskData[key] = value;
    }

    if (cleaned > 0) {
      await client.query(
        'UPDATE "fmea_worksheet_data" SET "riskData" = $1 WHERE id = $2',
        [JSON.stringify(newRiskData), ws.id]
      );
      console.log('  [' + ws.fmeaId + '] ' + cleaned + '개 키 정리');
      totalCleaned += cleaned;
    }
  }

  console.log('[완료] 총 ' + totalCleaned + '개 LLD 키 초기화');
  await client.end();
}

main().catch(console.error);
