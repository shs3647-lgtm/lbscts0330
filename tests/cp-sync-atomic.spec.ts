import { test, expect } from '@playwright/test';

type FmeaAtomic = {
  fmeaId: string;
  l2Structures: Array<{ id: string; no: string; name: string }>;
  l3Structures: Array<{ id: string; l2Id: string; name: string; m4?: string }>;
  l2Functions: Array<{ id: string; l2StructId: string; productChar?: string; specialChar?: string }>;
  l3Functions: Array<{ id: string; l2StructId: string; l3StructId: string; processChar?: string; specialChar?: string }>;
};

type CpItem = {
  id: string;
  processNo: string;
  processName: string;
  processDesc?: string;
  workElement?: string;
  equipment?: string;
  productChar?: string;
  processChar?: string;
  specialChar?: string;
  pfmeaProcessId?: string;
};

const pickFmeaCp = async (request: any) => {
  const fmeaRes = await request.get('/api/fmea/projects');
  expect(fmeaRes.ok()).toBeTruthy();
  const fmeaJson = await fmeaRes.json();
  const fmeaId = fmeaJson.projects?.[0]?.id;
  expect(fmeaId).toBeTruthy();

  const cpRes = await request.get('/api/control-plan');
  expect(cpRes.ok()).toBeTruthy();
  const cpJson = await cpRes.json();
  const cpNo = cpJson.data?.[0]?.cpNo;
  expect(cpNo).toBeTruthy();

  return { fmeaId, cpNo };
};

const getAtomicFmea = async (request: any, fmeaId: string) => {
  const res = await request.get(`/api/fmea?fmeaId=${encodeURIComponent(fmeaId)}&format=atomic`);
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as FmeaAtomic;
};

const getCpItems = async (request: any, cpNo: string) => {
  const res = await request.get(`/api/control-plan/${cpNo}/items`);
  expect(res.ok()).toBeTruthy();
  const json = await res.json();
  return json.data as CpItem[];
};

const putCpItems = async (request: any, cpNo: string, items: CpItem[]) => {
  const res = await request.put(`/api/control-plan/${cpNo}/items`, { data: { items } });
  expect(res.ok()).toBeTruthy();
};

const syncStructure = async (request: any, fmeaId: string, cpNo: string) => {
  const res = await request.post('/api/sync/structure', {
    data: {
      direction: 'fmea-to-cp',
      sourceId: fmeaId,
      targetId: cpNo,
      options: { overwrite: true },
    },
  });
  expect(res.ok()).toBeTruthy();
  const json = await res.json();
  expect(json.success).toBeTruthy();
};

const syncData = async (request: any, fmeaId: string, cpNo: string, payload: Record<string, any>) => {
  const res = await request.post('/api/sync/data', {
    data: { fmeaId, cpNo, ...payload },
  });
  expect(res.ok()).toBeTruthy();
  return res.json();
};

test.describe.serial('FMEA-CP atomic sync cases', () => {
  test('특성/특별특성/설비/작업요소 fmea-wins 복구', async ({ request }) => {
    const { fmeaId, cpNo } = await pickFmeaCp(request);
    await syncStructure(request, fmeaId, cpNo);

    const atomic = await getAtomicFmea(request, fmeaId);
    const l2Target = atomic.l2Structures.find((l2) =>
      atomic.l2Functions.some((fn) => fn.l2StructId === l2.id && fn.productChar)
    ) || atomic.l2Structures[0];
    expect(l2Target).toBeTruthy();

    const l3ForL2 = atomic.l3Structures.filter((l3) => l3.l2Id === l2Target.id);
    const l3First = l3ForL2[0];
    const equipmentNames = l3ForL2
      .filter((l3) => l3.m4 && ['MC', 'IM', 'EN'].includes(l3.m4))
      .map((l3) => l3.name)
      .filter(Boolean);

    const productChar = atomic.l2Functions.find(
      (fn) => fn.l2StructId === l2Target.id && fn.productChar
    )?.productChar;
    const productSpecial = atomic.l2Functions.find(
      (fn) => fn.l2StructId === l2Target.id && fn.productChar
    )?.specialChar;

    const processChar = atomic.l3Functions.find(
      (fn) => fn.l2StructId === l2Target.id && fn.processChar
    )?.processChar;
    const processSpecial = atomic.l3Functions.find(
      (fn) => fn.l2StructId === l2Target.id && fn.processChar
    )?.specialChar;

    const expectedSpecial = productSpecial || processSpecial || '';
    const expectedWorkElement = l3First?.name || '';
    const expectedEquipment = equipmentNames.join(', ');

    const items = await getCpItems(request, cpNo);
    const targetItem = items.find(
      (item) =>
        item.pfmeaProcessId === l2Target.id &&
        (item.productChar || item.processChar)
    );
    expect(targetItem).toBeTruthy();
    const targetKey = {
      processNo: targetItem?.processNo || '',
      productChar: targetItem?.productChar || '',
      processChar: targetItem?.processChar || '',
    };

    const dirtyItems = items.map((item) => {
      if (
        item.processNo === targetKey.processNo &&
        (targetKey.productChar ? item.productChar === targetKey.productChar : true) &&
        (targetKey.processChar ? item.processChar === targetKey.processChar : true)
      ) {
        return {
          ...item,
          equipment: 'DIRTY_EQUIP',
          workElement: 'DIRTY_WORK',
          specialChar: 'ZZ',
        };
      }
      return item;
    });
    await putCpItems(request, cpNo, dirtyItems);

    await syncData(request, fmeaId, cpNo, {
      conflictPolicy: 'fmea-wins',
      fields: ['equipment', 'workElement', 'productChar', 'processChar', 'specialChar'],
    });

    const after = await getCpItems(request, cpNo);
    const targetAfter = after.find((item) =>
      item.processNo === targetKey.processNo &&
      (targetKey.productChar ? item.productChar === targetKey.productChar : true) &&
      (targetKey.processChar ? item.processChar === targetKey.processChar : true)
    );
    expect(targetAfter).toBeTruthy();
    expect(targetAfter?.workElement || '').toBe(expectedWorkElement);
    expect(targetAfter?.equipment || '').toBe(expectedEquipment);

    if (expectedSpecial) {
      expect(targetAfter?.specialChar || '').toBe(expectedSpecial);
    }
  });

  test('작업요소 cp-wins → FMEA 반영', async ({ request }) => {
    const { fmeaId, cpNo } = await pickFmeaCp(request);
    await syncStructure(request, fmeaId, cpNo);

    const atomic = await getAtomicFmea(request, fmeaId);
    const l2Target = atomic.l2Structures[0];
    const l3Target = atomic.l3Structures.find((l3) => l3.l2Id === l2Target.id);
    expect(l3Target).toBeTruthy();

    const items = await getCpItems(request, cpNo);
    const updatedWork = `CP_WORK_${Date.now()}`;
    const originalWork = l3Target?.name || '';

    const updatedItems = items.map((item) =>
      item.pfmeaProcessId === l2Target.id
        ? { ...item, workElement: updatedWork }
        : item
    );
    await putCpItems(request, cpNo, updatedItems);

    await syncData(request, fmeaId, cpNo, {
      conflictPolicy: 'cp-wins',
      fields: ['workElement'],
    });

    const atomicAfter = await getAtomicFmea(request, fmeaId);
    const l3After = atomicAfter.l3Structures.find((l3) => l3.l2Id === l2Target.id);
    expect(l3After?.name || '').toBe(updatedWork);

    // restore
    const restoredItems = (await getCpItems(request, cpNo)).map((item) =>
      item.pfmeaProcessId === l2Target.id
        ? { ...item, workElement: originalWork }
        : item
    );
    await putCpItems(request, cpNo, restoredItems);
    await syncData(request, fmeaId, cpNo, {
      conflictPolicy: 'cp-wins',
      fields: ['workElement'],
    });
  });

  test('제품특성/공정특성 원자성 행(특성별) fmea-wins 복구', async ({ request }) => {
    const { fmeaId, cpNo } = await pickFmeaCp(request);
    await syncStructure(request, fmeaId, cpNo);

    const atomic = await getAtomicFmea(request, fmeaId);
    const l2Target = atomic.l2Structures.find((l2) =>
      atomic.l2Functions.some((fn) => fn.l2StructId === l2.id && fn.productChar)
    ) || atomic.l2Structures.find((l2) =>
      atomic.l3Functions.some((fn) => fn.l2StructId === l2.id && fn.processChar)
    ) || atomic.l2Structures[0];
    expect(l2Target).toBeTruthy();

    const expectedProductChars = atomic.l2Functions
      .filter((fn) => fn.l2StructId === l2Target.id && fn.productChar)
      .map((fn) => fn.productChar)
      .filter(Boolean);
    const expectedProcessChars = atomic.l3Functions
      .filter((fn) => fn.l2StructId === l2Target.id && fn.processChar)
      .map((fn) => fn.processChar)
      .filter(Boolean);

    const items = await getCpItems(request, cpNo);
    const targetRows = items.filter(
      (item) =>
        item.pfmeaProcessId === l2Target.id &&
        (item.productChar || item.processChar)
    );
    expect(targetRows.length).toBeGreaterThan(0);

    const dirtyItems = items.map((item) => {
      if (item.pfmeaProcessId === l2Target.id && (item.productChar || item.processChar)) {
        return {
          ...item,
          productChar: item.productChar ? `DIRTY_${item.productChar}` : item.productChar,
          processChar: item.processChar ? `DIRTY_${item.processChar}` : item.processChar,
        };
      }
      return item;
    });
    await putCpItems(request, cpNo, dirtyItems);

    await syncData(request, fmeaId, cpNo, {
      conflictPolicy: 'fmea-wins',
      fields: ['productChar', 'processChar'],
    });

    const after = await getCpItems(request, cpNo);
    const afterTargets = after.filter(
      (item) =>
        item.pfmeaProcessId === l2Target.id &&
        (item.productChar || item.processChar)
    );
    const afterProductChars = afterTargets
      .map((item) => item.productChar)
      .filter(Boolean);
    const afterProcessChars = afterTargets
      .map((item) => item.processChar)
      .filter(Boolean);

    if (expectedProductChars.length > 0) {
      expect(new Set(afterProductChars)).toEqual(new Set(expectedProductChars));
    }
    if (expectedProcessChars.length > 0) {
      expect(new Set(afterProcessChars)).toEqual(new Set(expectedProcessChars));
    }
  });
});
