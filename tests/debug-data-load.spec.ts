/**
 * @file debug-data-load.spec.ts
 * @description SDD 데이터 로드 문제 디버깅 테스트
 */

import { test, expect } from '@playwright/test';

test.describe('SDD 데이터 로드 디버깅', () => {
  test('localStorage에 저장된 FMEA 데이터 확인', async ({ page }) => {
    // 먼저 localhost에 접속
    await page.goto('http://localhost:3000/pfmea/worksheet?id=PFM25-310');
    
    // 페이지 로드 대기
    await page.waitForTimeout(2000);
    
    // localStorage에서 모든 FMEA 관련 키 확인
    const localStorageData = await page.evaluate(() => {
      const result: { [key: string]: any } = {};
      const allKeys = Object.keys(localStorage);
      
      console.log('=== 모든 localStorage 키 ===');
      allKeys.forEach(key => {
        if (key.includes('pfmea') || key.includes('fmea')) {
          const value = localStorage.getItem(key);
          try {
            result[key] = JSON.parse(value || '');
          } catch {
            result[key] = value;
          }
        }
      });
      
      // 프로젝트 목록 확인
      const projectsData = localStorage.getItem('pfmea-projects');
      if (projectsData) {
        result['pfmea-projects'] = JSON.parse(projectsData);
      }
      
      return result;
    });
    
    console.log('=== localStorage 데이터 ===');
    console.log('키 목록:', Object.keys(localStorageData));
    
    // 프로젝트 목록 확인
    if (localStorageData['pfmea-projects']) {
      console.log('프로젝트 수:', localStorageData['pfmea-projects'].length);
      localStorageData['pfmea-projects'].forEach((p: any, idx: number) => {
        console.log(`  [${idx}] ID: ${p.id}, 이름: ${p.fmeaInfo?.subject || p.name || '(없음)'}`);
      });
    }
    
    // PFM25-310 데이터 확인
    const targetKeys = [
      'pfmea_atomic_PFM25-310',
      'pfmea_worksheet_PFM25-310',
      'fmea-worksheet-PFM25-310'
    ];
    
    for (const key of targetKeys) {
      if (localStorageData[key]) {
        console.log(`\n=== ${key} 발견 ===`);
        const data = localStorageData[key];
        console.log('  l1Name:', data.l1?.name || data.l1Structure?.name || '(없음)');
        console.log('  l2 공정 수:', data.l2?.length || data.l2Structures?.length || 0);
        if (data.l2 && data.l2.length > 0) {
          console.log('  첫 공정:', data.l2[0]?.name || '(없음)');
        }
      } else {
        console.log(`${key}: (없음)`);
      }
    }
    
    // URL의 현재 ID 파라미터 확인
    const urlId = await page.evaluate(() => {
      const params = new URLSearchParams(window.location.search);
      return params.get('id');
    });
    console.log('\nURL ID 파라미터:', urlId);
    
    // 화면에서 완제품명 필드 값 확인
    const l1NameInput = page.locator('input[placeholder="완제품명+라인 입력"]');
    const hasL1Input = await l1NameInput.count();
    
    if (hasL1Input > 0) {
      const l1Value = await l1NameInput.inputValue();
      console.log('완제품명 입력 필드 값:', l1Value || '(빈 값)');
    } else {
      console.log('완제품명 입력 필드를 찾을 수 없음');
    }
    
    // 공정 표시 확인
    const processCell = page.locator('td:has-text("클릭하여 공정 선택")');
    const hasPlaceholder = await processCell.count();
    console.log('공정 placeholder 표시:', hasPlaceholder > 0 ? '있음 (데이터 없음)' : '없음 (데이터 있음)');
    
    // 스크린샷 저장
    await page.screenshot({ path: 'tests/screenshots/debug-data-load.png', fullPage: true });
    
    // 테스트는 항상 통과 (디버깅 목적)
    expect(true).toBe(true);
  });
  
  test('FMEA 프로젝트 목록 생성 및 데이터 저장', async ({ page }) => {
    await page.goto('http://localhost:3000/pfmea/list');
    await page.waitForTimeout(2000);
    
    // 프로젝트 목록 상세 확인
    const projectInfo = await page.evaluate(() => {
      const projectsData = localStorage.getItem('pfmea-projects');
      if (!projectsData) return { count: 0, projects: [] };
      
      const projects = JSON.parse(projectsData);
      return {
        count: projects.length,
        projects: projects.map((p: any) => ({
          id: p.id,
          subject: p.fmeaInfo?.subject || '(없음)',
          productName: p.project?.productName || '(없음)',
          hasWorksheetData: !!localStorage.getItem(`pfmea_worksheet_${p.id}`)
        }))
      };
    });
    
    console.log('=== FMEA 프로젝트 목록 ===');
    console.log('등록된 프로젝트 수:', projectInfo.count);
    projectInfo.projects.forEach((p: any, idx: number) => {
      console.log(`  [${idx + 1}] ID: ${p.id}`);
      console.log(`      FMEA명(subject): ${p.subject}`);
      console.log(`      제품명(productName): ${p.productName}`);
      console.log(`      워크시트 데이터: ${p.hasWorksheetData ? '있음' : '없음'}`);
    });
    
    if (projectInfo.count === 0) {
      console.log('⚠️ 등록된 프로젝트가 없습니다!');
      console.log('FMEA 리스트 화면에서 프로젝트를 등록해 주세요.');
    }
    
    expect(true).toBe(true);
  });
  
  test('프로젝트 정보 설정 후 데이터 로드 테스트', async ({ page }) => {
    // 콘솔 로그 캡처 먼저 설정
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('[워크시트]') || text.includes('[기초정보]') || text.includes('[데이터 로드]')) {
        consoleLogs.push(text);
      }
    });
    
    // 먼저 앱 페이지로 이동 (localStorage 접근 가능)
    await page.goto('http://localhost:3000/pfmea/list');
    await page.waitForTimeout(1000);
    
    // localStorage에 프로젝트 정보 설정 (실제 사용자 환경 시뮬레이션)
    await page.evaluate(() => {
      // 프로젝트 정보 설정
      const projects = [{
        id: 'PFM25-310',
        fmeaInfo: {
          subject: 'SDD NEW FMEA 개발'
        },
        project: {
          productName: 'PCR 컨트롤러'
        }
      }];
      localStorage.setItem('pfmea-projects', JSON.stringify(projects));
      
      // 빈 워크시트 데이터 설정 (문제 상황 시뮬레이션)
      const emptyWorksheet = {
        fmeaId: 'PFM25-310',
        l1: { id: 'test-l1', name: '', types: [], failureScopes: [] },
        l2: [],
        failureLinks: [],
        structureConfirmed: false
      };
      localStorage.setItem('pfmea_worksheet_PFM25-310', JSON.stringify(emptyWorksheet));
    });
    
    console.log('localStorage 설정 완료');
    
    // 워크시트 페이지로 이동
    await page.goto('http://localhost:3000/pfmea/worksheet?id=PFM25-310');
    await page.waitForTimeout(3000);
    
    console.log('\n=== 콘솔 로그 (데이터 로드 관련) ===');
    consoleLogs.forEach(log => console.log(log));
    
    // 화면에서 L1 이름 확인
    const l1NameInput = page.locator('input[placeholder="완제품명+라인 입력"]');
    if (await l1NameInput.count() > 0) {
      const value = await l1NameInput.inputValue();
      console.log('\n완제품명 입력 필드 값:', value || '(빈 값)');
    } else {
      console.log('\n완제품명 입력 필드를 찾을 수 없음 (데이터가 표시되었을 수 있음)');
      // 다른 방법으로 L1 이름 확인
      const pageContent = await page.content();
      if (pageContent.includes('SDD NEW FMEA 개발')) {
        console.log('✅ "SDD NEW FMEA 개발" 텍스트가 화면에 표시됨!');
      }
    }
    
    // 스크린샷
    await page.screenshot({ path: 'tests/screenshots/after-project-setup.png', fullPage: true });
    
    expect(true).toBe(true);
  });
});

