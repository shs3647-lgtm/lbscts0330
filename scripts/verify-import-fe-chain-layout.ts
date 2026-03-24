/**
 * Import 고장체인 — L1(C4) 위 / L2(A5) 아래 레이아웃 + pipeline-verify (선택)
 *
 * 1) 서버 불필요: buildFailureChainsFromFlat → feFlatId·feValue 검증
 * 2) assignEntityUUIDsToChains + flatMap → feId 결정론적 할당 검증
 * 3) 선택: VERIFY_BASE_URL + VERIFY_FMEA_ID 있으면 GET pipeline-verify
 *
 * 사용:
 *   npx tsx scripts/verify-import-fe-chain-layout.ts
 *   VERIFY_BASE_URL=http://127.0.0.1:3000 VERIFY_FMEA_ID=pfm26-m066 npx tsx scripts/verify-import-fe-chain-layout.ts
 *
 * 종료: 0 = PASS, 1 = FAIL
 */

import type { ImportedFlatData } from '@/app/(fmea-core)/pfmea/import/types';
import { buildFailureChainsFromFlat } from '@/app/(fmea-core)/pfmea/import/types/masterFailureChain';
import { assignEntityUUIDsToChains } from '@/app/(fmea-core)/pfmea/import/utils/assignChainUUIDs';
import type { FlatToEntityMap } from '@/app/(fmea-core)/pfmea/import/utils/buildWorksheetState';
import type { CrossTab } from '@/app/(fmea-core)/pfmea/import/utils/template-delete-logic';
import type { WorksheetState } from '@/app/(fmea-core)/pfmea/worksheet/constants';

const emptyCrossTab = (): CrossTab =>
  ({ aRows: [], bRows: [], cRows: [], total: 0 }) as CrossTab;

function now(): Date {
  return new Date();
}

function fail(msg: string): never {
  console.error(`[FAIL] ${msg}`);
  process.exit(1);
}

function ok(msg: string): void {
  console.log(`[OK]   ${msg}`);
}

/** MX5형: max(C4행) < min(A5행) — 예전에는 canFeRowLink=false 였음 */
function syntheticMx5LayoutFlat(): ImportedFlatData[] {
  return [
    {
      id: 'flat-c4-5',
      processNo: 'YP',
      category: 'C',
      itemCode: 'C4',
      value: 'FE-초기',
      excelRow: 5,
      createdAt: now(),
    },
    {
      id: 'flat-c4-12',
      processNo: 'YP',
      category: 'C',
      itemCode: 'C4',
      value: 'FE-후속',
      excelRow: 12,
      createdAt: now(),
    },
    {
      id: 'flat-a5-100',
      processNo: '10',
      category: 'A',
      itemCode: 'A5',
      value: 'FM-하단',
      excelRow: 100,
      createdAt: now(),
    },
    {
      id: 'flat-b4-101',
      processNo: '10',
      category: 'B',
      itemCode: 'B4',
      value: 'FC-연결',
      m4: 'MC',
      excelRow: 101,
      createdAt: now(),
    },
  ];
}

function runChainBuildAssertions(): void {
  const flatData = syntheticMx5LayoutFlat();
  const maxC4 = Math.max(5, 12);
  const minA5 = 100;
  if (!(maxC4 < minA5)) {
    fail(`테스트 데이터 전제 깨짐: maxC4=${maxC4} < minA5=${minA5} 기대`);
  }

  const chains = buildFailureChainsFromFlat(flatData, emptyCrossTab());
  if (chains.length !== 1) {
    fail(`체인 수 기대 1, 실제 ${chains.length}`);
  }
  const c = chains[0]!;
  if (c.feValue !== 'FE-후속') {
    fail(`feValue 기대 FE-후속, 실제 "${c.feValue}"`);
  }
  if (c.feFlatId !== 'flat-c4-12') {
    fail(`feFlatId 기대 flat-c4-12, 실제 "${c.feFlatId}"`);
  }
  if (c.fmFlatId !== 'flat-a5-100' || c.fcFlatId !== 'flat-b4-101') {
    fail(`fmFlatId/fcFlatId 불일치: fm=${c.fmFlatId} fc=${c.fcFlatId}`);
  }
  ok('buildFailureChainsFromFlat — L1위/L2아래 레이아웃에서 feFlatId·feValue');
}

function runAssignUuidAssertions(): void {
  const flatData = syntheticMx5LayoutFlat();
  const chains = buildFailureChainsFromFlat(flatData, emptyCrossTab());

  const state = {
    l1: {
      failureScopes: [
        { id: 'fe-early-uuid', effect: 'FE-초기', scope: 'YP', reqId: '' },
        { id: 'fe-late-uuid', effect: 'FE-후속', scope: 'YP', reqId: '' },
      ],
      types: [],
      name: '',
    },
    l2: [
      {
        id: 'p10',
        no: '10',
        name: '공정10',
        failureModes: [{ id: 'fm-1', name: 'FM-하단', productCharId: '' }],
        l3: [
          {
            id: 'we1',
            name: '작업요소',
            m4: 'MC',
            failureCauses: [{ id: 'fc-1', name: 'FC-연결', processCharId: '' }],
            functions: [],
          },
        ],
        functions: [],
        failureCauses: [],
      },
    ],
  } as unknown as WorksheetState;

  const flatMap: FlatToEntityMap = {
    fm: new Map([
      ['flat-a5-100', 'fm-1'],
    ]),
    fc: new Map([
      ['flat-b4-101', 'fc-1'],
    ]),
    fe: new Map([
      ['flat-c4-12', 'fe-late-uuid'],
    ]),
  };

  assignEntityUUIDsToChains(state, chains, flatMap);
  const ch = chains[0]!;
  if (ch.feId !== 'fe-late-uuid') {
    fail(`assignEntityUUIDsToChains 후 feId 기대 fe-late-uuid, 실제 "${ch.feId}"`);
  }
  if (ch.fmId !== 'fm-1' || ch.fcId !== 'fc-1') {
    fail(`fmId/fcId 불일치: fm=${ch.fmId} fc=${ch.fcId}`);
  }
  ok('assignEntityUUIDsToChains — feFlatId→feId (0단계 flatMap)');
}

type PipelineJson = {
  success?: boolean;
  error?: string;
  allGreen?: boolean;
  fmeaId?: string;
  steps?: Array<{ step: number; name: string; status: string; issues?: string[] }>;
};

async function optionalPipelineVerify(): Promise<void> {
  const base = (process.env.VERIFY_BASE_URL || '').replace(/\/$/, '');
  const fmeaId = process.env.VERIFY_FMEA_ID || '';
  if (!base || !fmeaId) {
    console.log('[SKIP] pipeline-verify — VERIFY_BASE_URL·VERIFY_FMEA_ID 미설정');
    return;
  }

  const url = `${base}/api/fmea/pipeline-verify?fmeaId=${encodeURIComponent(fmeaId)}`;
  let res: Response;
  try {
    res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
  } catch (e) {
    fail(`pipeline-verify fetch 실패: ${e instanceof Error ? e.message : String(e)}\n  URL: ${url}`);
  }

  const data = JSON.parse(await res.text()) as PipelineJson;
  if (!data.success) {
    fail(`pipeline-verify API: ${data.error || res.status}`);
  }

  console.log(`[INFO] pipeline-verify fmeaId=${data.fmeaId} allGreen=${data.allGreen}`);
  for (const s of data.steps || []) {
    const iss = (s.issues || []).length ? ` issues=${(s.issues || []).join('; ')}` : '';
    console.log(`       [${s.step}] ${s.name} → ${s.status}${iss}`);
  }
  if (data.allGreen !== true) {
    fail('pipeline-verify allGreen=false');
  }
  ok(`pipeline-verify GET 전 단계 통과 (${fmeaId})`);
}

async function main(): Promise<void> {
  console.log('[verify-import-fe-chain-layout] 로컬 체인 로직 검증 시작\n');
  runChainBuildAssertions();
  runAssignUuidAssertions();
  await optionalPipelineVerify();
  console.log('\n[PASS] 전체 검증 완료');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
