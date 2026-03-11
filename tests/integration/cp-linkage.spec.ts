import { test, expect } from '@playwright/test';

test('Verify CP Linkage to WS and PM', async ({ request }) => {
    const CP_NO = 'CP26-TEST-001';

    // 1. Fetch WS items linked to this CP
    const wsRes = await request.get(`http://localhost:3001/api/ws?cpNo=${CP_NO}`);
    expect(wsRes.ok()).toBeTruthy();
    const wsJson = await wsRes.json();

    // Should find the item created in seed-link-test.ts
    const linkedWs = wsJson.data.find((i: any) => i.wsNo === 'WS26-LINK-001');
    expect(linkedWs).toBeDefined();
    expect(linkedWs.cpNo).toBe(CP_NO);
    expect(linkedWs.subject).toBe('Linked Assembly Inst');
    console.log('WS Linkage Verified:', linkedWs.wsNo);

    // 2. Fetch PM items linked to this CP
    const pmRes = await request.get(`http://localhost:3001/api/pm?cpNo=${CP_NO}`);
    expect(pmRes.ok()).toBeTruthy();
    const pmJson = await pmRes.json();

    // Should find the item created in seed-link-test.ts
    const linkedPm = pmJson.data.find((i: any) => i.pmNo === 'PM26-LINK-001');
    expect(linkedPm).toBeDefined();
    expect(linkedPm.cpNo).toBe(CP_NO);
    expect(linkedPm.subject).toBe('Linked Press Check');
    console.log('PM Linkage Verified:', linkedPm.pmNo);
});
