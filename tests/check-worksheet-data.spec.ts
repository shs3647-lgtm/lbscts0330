/**
 * FMEA Worksheet 데이터 확인 테스트
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test('FMEA Worksheet Data 직접 조회', async ({ request }) => {
  // fmea_worksheet_data 조회용 API 호출 (fmea/route.ts GET)
  const res = await request.get(`${BASE_URL}/api/fmea?fmeaId=pfm26-m001`);
  const data = await res.json();
  
  console.log('📊 FMEA GET API 응답:');
  console.log('- status:', res.status());
  
  if (data) {
    console.log('- _isLegacyDirect:', data._isLegacyDirect);
    console.log('- l1.name:', data.l1?.name);
    console.log('- l2 count:', data.l2?.length || 0);
    
    if (data.l2?.length > 0) {
      console.log('- 첫 번째 L2:');
      console.log('  - no:', data.l2[0].no);
      console.log('  - name:', data.l2[0].name);
      console.log('  - l3 count:', data.l2[0].l3?.length || 0);
    }
  } else {
    console.log('- data is null');
  }
});

test('대소문자 테스트 - 대문자 fmeaId', async ({ request }) => {
  const res = await request.get(`${BASE_URL}/api/fmea?fmeaId=PFM26-M001`);
  const data = await res.json();
  
  console.log('📊 대문자 FMEA ID 응답:');
  console.log('- status:', res.status());
  console.log('- l2 count:', data?.l2?.length || 0);
});
