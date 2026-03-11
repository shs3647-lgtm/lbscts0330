import { test, expect } from '@playwright/test';

test('Verify WS and PM Integration', async ({ request }) => {
    // 1. Verify WS Data
    const wsRes = await request.get('http://localhost:3000/api/ws');
    expect(wsRes.ok()).toBeTruthy();
    const wsJson = await wsRes.json();
    expect(wsJson.success).toBeTruthy();
    expect(wsJson.data.length).toBeGreaterThanOrEqual(7);

    // Verify content of first item
    const firstWs = wsJson.data.find((i: any) => i.wsNo === 'WS26-001');
    expect(firstWs).toBeDefined();
    expect(firstWs.subject).toBe('Engine Assembly Guide');

    // 2. Verify PM Data
    const pmRes = await request.get('http://localhost:3000/api/pm');
    expect(pmRes.ok()).toBeTruthy();
    const pmJson = await pmRes.json();
    expect(pmJson.success).toBeTruthy();
    expect(pmJson.data.length).toBeGreaterThanOrEqual(7);

    // Verify content of first item
    const firstPm = pmJson.data.find((i: any) => i.pmNo === 'PM26-001');
    expect(firstPm).toBeDefined();
    expect(firstPm.subject).toBe('Hydraulic Press #1 Check');
});

test('Verify MyJob Stats Calculation', async ({ request }) => {
    const statsRes = await request.get('http://localhost:3000/api/myjob/stats');
    expect(statsRes.ok()).toBeTruthy();
    const stats = await statsRes.json();

    // Counts shoud reflect at least the seeded data (7 WS + 7 PM)
    // Total is likely > 14
    expect(stats.total).toBeGreaterThanOrEqual(14);
});
