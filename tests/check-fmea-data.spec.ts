/**
 * FMEA 데이터 확인 테스트
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test('FMEA 워크시트 데이터 확인', async ({ request }) => {
  // FMEA 워크시트 데이터 조회
  const res = await request.get(`${BASE_URL}/api/pfmea/pfm26-m001`);
  const data = await res.json();
  
  console.log('📊 FMEA 워크시트 데이터:');
  console.log('- success:', data.success);
  
  if (data.success && data.data) {
    const ws = data.data;
    console.log('- l2 count:', ws.l2?.length || 0);
    
    if (ws.l2?.length > 0) {
      console.log('- 첫 번째 L2:');
      console.log('  - no:', ws.l2[0].no);
      console.log('  - name:', ws.l2[0].name);
      console.log('  - l3 count:', ws.l2[0].l3?.length || 0);
      console.log('  - functions count:', ws.l2[0].functions?.length || 0);
    }
  } else {
    console.log('- error:', data.error);
  }
});
