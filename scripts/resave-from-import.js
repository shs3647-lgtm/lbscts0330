/**
 * resave-from-import.js
 *
 * DB에 저장된 flatData + failureChains를 HTTP API로 로드하여
 * /api/fmea/save-from-import API를 재호출하는 스크립트
 *
 * Usage: node scripts/resave-from-import.js <fmeaId> [port]
 * Example: node scripts/resave-from-import.js pfm26-f001-l68-r03 3000
 */

const fmeaId = process.argv[2];
const port = process.argv[3] || '3000';
const BASE = `http://localhost:${port}`;

if (!fmeaId) {
  console.error('Usage: node scripts/resave-from-import.js <fmeaId> [port]');
  process.exit(1);
}

async function main() {
  console.log(`[resave] Target: ${fmeaId} on port ${port}`);

  // 1. Load dataset + failureChains via master API
  const detailRes = await fetch(`${BASE}/api/pfmea/master?action=detail&fmeaId=${fmeaId}`);
  const detailData = await detailRes.json();
  const dataset = detailData.dataset || detailData;

  if (!dataset || !dataset.id) {
    console.error('[resave] Dataset not found');
    return;
  }
  console.log(`[resave] Dataset ID: ${dataset.id}`);

  const failureChains = Array.isArray(dataset.failureChains) ? dataset.failureChains : [];
  console.log(`[resave] FailureChains: ${failureChains.length}`);

  // 2. Load flat items via diagnose-save (it loads them from DB and builds state)
  // We need the raw flat items. diagnose-save loads them but doesn't return raw data.
  // Let's use the internal API path to get flat items directly.
  const diagnoseRes = await fetch(`${BASE}/api/fmea/diagnose-save?fmeaId=${fmeaId}`);
  const diagnoseData = await diagnoseRes.json();
  const steps = diagnoseData.steps || {};
  const flatTotal = steps['2_flatItems']?.total || 0;
  console.log(`[resave] Flat items in DB: ${flatTotal}`);

  // 3. We need to get the actual flatData. Let's load it via a direct approach.
  // Create a helper endpoint or use existing one that returns flat items.
  // Since we can't get raw flat items from existing APIs, let's use
  // the save-from-import which accepts flatData in request body.
  // We need to construct flatData from the DB.

  // Use the diagnose-save approach: load flat items -> convert to flatData format
  // But diagnose-save only returns summary. We need the actual items.

  // Let's check if there's an API to get flat items...
  // Actually, let's try creating a temporary endpoint or using Prisma through Next.js API.

  // Alternative: Call a custom API that loads and re-saves
  const resaveUrl = `${BASE}/api/fmea/diagnose-save?fmeaId=${fmeaId}&resave=true`;
  console.log(`[resave] Trying custom resave via diagnose-save...`);

  // Since diagnose-save doesn't support resave with chains, let's create our own
  // Let's just POST to a test endpoint that does the full pipeline

  // Actually, let's build the request ourselves by loading flat items through
  // a small inline API call using the Next.js server

  // The simplest approach: modify diagnose-save to support failureChains
  // But that's CODEFREEZE. Instead, let's create a new endpoint.

  console.log(`[resave] Need to create a resave endpoint. Checking existing...`);

  // Check what happens if we call save-from-import with the diagnose data
  // The save-from-import needs: { fmeaId, flatData, l1Name, failureChains }
  // We have failureChains from dataset, but need flatData (raw items from DB)

  // Let's try another approach: call the internal DB via Next.js API route
  // by creating a simple GET endpoint that returns flat items

  console.log('[resave] Creating resave API endpoint...');
  console.log('[resave] Done with analysis. Need to create /api/fmea/resave-import endpoint.');
}

main().catch(err => console.error('[resave] Error:', err.message));
