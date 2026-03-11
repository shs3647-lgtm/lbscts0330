/**
 * B5(예방관리) 마스터 데이터 시드 스크립트
 * - 각 공정별 FC(고장원인)에 대응하는 PC(예방관리) 항목 생성
 * - processNo 기반 매칭
 */
const http = require('http');

const FMEA_ID = 'pfm26-p004-l05-r01';

// 공정별 예방관리 데이터 (실제 자전거 프레임 공정에 맞춤)
const B5_DATA = [
  // 10번 컷팅
  { processNo: '10', value: 'Cutting MC 주요부품 정기점검 및 예방정비', m4: 'MC' },
  { processNo: '10', value: '절단면 검사 교육 및 체크시트 운용', m4: 'MN' },
  { processNo: '10', value: '톱날(DISC) 교환주기 관리 및 마모도 점검', m4: 'MC' },

  // 20번 프레스
  { processNo: '20', value: '프레스 설비 정기점검 및 금형 예방정비', m4: 'MC' },
  { processNo: '20', value: '지그 정밀도 정기 검교정', m4: 'MC' },
  { processNo: '20', value: '프레스 작업 표준서 교육 및 숙련도 관리', m4: 'MN' },

  // 30번 용접
  { processNo: '30', value: '용접기 정기점검 및 전극 교환주기 관리', m4: 'MC' },
  { processNo: '30', value: '용접봉 입고검사 및 보관조건 관리', m4: 'IM' },
  { processNo: '30', value: '용접 작업자 자격인증 및 교육훈련', m4: 'MN' },

  // 40번 조립
  { processNo: '40', value: '조립 지그 정기 검교정 및 마모도 관리', m4: 'MC' },
  { processNo: '40', value: '토크 드라이버 교정 및 예방정비', m4: 'MC' },
  { processNo: '40', value: '조립 순서도 작업표준서 교육', m4: 'MN' },
  { processNo: '40', value: '조립부품 입고검사 및 선입선출 관리', m4: 'IM' },
  { processNo: '40', value: '체결부위 검사 체크시트 운용', m4: 'MN' },

  // 50번 도장
  { processNo: '50', value: '전처리 설비(탈지/화성) 정기점검 및 약품농도 관리', m4: 'MC' },
  { processNo: '50', value: '도장 로봇/스프레이건 정기 세척 및 노즐 교환', m4: 'MC' },
  { processNo: '50', value: '도료 입고검사 및 유효기간 관리', m4: 'IM' },
  { processNo: '50', value: '도장 부스 온습도 관리 및 환경조건 모니터링', m4: 'EN' },
  { processNo: '50', value: '도장 작업자 숙련도 교육 및 자격관리', m4: 'MN' },
  { processNo: '50', value: '건조로 온도 프로파일 정기 검증', m4: 'MC' },
];

// flatData 생성
const flatData = B5_DATA.map((item, idx) => ({
  id: `seed-b5-${item.processNo}-${idx}`,
  processNo: item.processNo,
  category: 'B',
  itemCode: 'B5',
  value: item.value,
  m4: item.m4 || '',
}));

const body = JSON.stringify({
  fmeaId: FMEA_ID,
  fmeaType: 'P',
  name: 'MASTER',
  replace: false,
  replaceItemCodes: ['B5'],
  flatData: flatData,
});

console.log('Sending', flatData.length, 'B5 items for', FMEA_ID);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/pfmea/master',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  },
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    try {
      const json = JSON.parse(data);
      console.log('Response:', JSON.stringify(json, null, 2).substring(0, 500));
    } catch(e) {
      console.log('Raw:', data.substring(0, 500));
    }
  });
});
req.on('error', e => console.error('Error:', e.message));
req.write(body);
req.end();
