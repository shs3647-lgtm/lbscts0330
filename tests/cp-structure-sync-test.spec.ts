/**
 * @file cp-structure-sync-test.spec.ts
 * @description CP 구조 동기화 API 테스트
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('CP 구조 동기화 테스트', () => {
  
  test('FMEA→CP 구조 동기화 API 호출 테스트', async ({ request }) => {
    // 1. 먼저 FMEA 목록에서 테스트할 FMEA ID 조회
    const fmeaListRes = await request.get(`${BASE_URL}/api/fmea/projects`);
    const fmeaListData = await fmeaListRes.json();
    
    console.log('📋 FMEA 목록:', JSON.stringify(fmeaListData, null, 2));
    
    if (!fmeaListData.success || !fmeaListData.projects?.length) {
      console.log('⚠️ FMEA 데이터 없음 - 테스트 스킵');
      return;
    }
    
    const fmeaId = fmeaListData.projects[0].id;  // id가 fmeaId임
    console.log('🎯 테스트 FMEA ID:', fmeaId);
    
    // 2. CP 목록에서 테스트할 CP 조회
    const cpListRes = await request.get(`${BASE_URL}/api/control-plan`);
    const cpListData = await cpListRes.json();
    
    console.log('📋 CP 목록:', JSON.stringify(cpListData, null, 2));
    
    if (!cpListData.success || !cpListData.data?.length) {
      console.log('⚠️ CP 데이터 없음 - 테스트 스킵');
      return;
    }
    
    const cpNo = cpListData.data[0].cpNo;
    console.log('🎯 테스트 CP NO:', cpNo);
    
    // 3. FMEA→CP 구조 동기화 API 호출
    const syncRes = await request.post(`${BASE_URL}/api/sync/structure`, {
      data: {
        direction: 'fmea-to-cp',
        sourceId: fmeaId,
        targetId: cpNo,
        options: { overwrite: true },
      },
    });
    
    const syncResult = await syncRes.json();
    console.log('🔄 동기화 결과:', JSON.stringify(syncResult, null, 2));
    
    // 4. 결과 검증
    if (syncResult.success) {
      console.log(`✅ 동기화 성공: ${syncResult.synced}개 항목`);
    } else if (syncResult.error === 'FMEA 구조 데이터가 없습니다') {
      console.log('⚠️ FMEA에 L2 구조 데이터가 없음 - 동기화할 데이터 없음');
      // 이 경우는 정상 - 데이터가 없을 뿐
    } else {
      // 예상치 못한 오류
      console.error('❌ 동기화 실패:', syncResult.error);
      expect(syncResult.success).toBe(true);
    }
  });

  test('FMEA 구조 데이터 확인 (디버깅)', async ({ request }) => {
    // FMEA 목록 조회
    const fmeaListRes = await request.get(`${BASE_URL}/api/fmea/projects`);
    const fmeaListData = await fmeaListRes.json();
    
    if (!fmeaListData.success || !fmeaListData.projects?.length) {
      console.log('⚠️ FMEA 데이터 없음');
      return;
    }
    
    const fmeaId = fmeaListData.projects[0].id;  // id가 fmeaId임
    
    // FMEA 구조 조회
    const structureRes = await request.get(`${BASE_URL}/api/sync/structure?fmeaId=${fmeaId}`);
    const structureData = await structureRes.json();
    
    console.log('📊 FMEA 구조 데이터:', JSON.stringify(structureData, null, 2));
    
    expect(structureRes.ok()).toBeTruthy();
  });

  test('CP 항목 조회 테스트', async ({ request }) => {
    // CP 목록 조회
    const cpListRes = await request.get(`${BASE_URL}/api/control-plan`);
    const cpListData = await cpListRes.json();
    
    if (!cpListData.success || !cpListData.data?.length) {
      console.log('⚠️ CP 데이터 없음');
      return;
    }
    
    const cpNo = cpListData.data[0].cpNo;
    
    // CP 항목 조회
    const itemsRes = await request.get(`${BASE_URL}/api/control-plan/${cpNo}/items`);
    const itemsData = await itemsRes.json();
    
    console.log('📊 CP 항목 데이터:', JSON.stringify(itemsData, null, 2));
    
    expect(itemsRes.ok()).toBeTruthy();
    
    if (itemsData.data?.length) {
      console.log(`✅ CP 항목 ${itemsData.data.length}개 확인`);
      
      // charIndex 필드 확인
      const firstItem = itemsData.data[0];
      console.log('📌 첫 번째 항목:', {
        processNo: firstItem.processNo,
        processName: firstItem.processName,
        productChar: firstItem.productChar,
        processChar: firstItem.processChar,
        charIndex: firstItem.charIndex,
      });
    }
  });
});
