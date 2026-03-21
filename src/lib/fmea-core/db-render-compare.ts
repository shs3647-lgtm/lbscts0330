/**
 * @file db-render-compare.ts
 * @description DB 원본 카운트 ↔ 렌더링(Atomic API) 카운트 비교 로직
 *
 * DB Viewer 대시보드에서 Import된 DB 데이터와
 * 실제 FMEA 워크시트에 렌더링되는 데이터 건수를 비교하여
 * 불일치(discrepancy)를 탐지한다.
 */

export interface EntityCount {
  label: string;
  dbCount: number;
  renderCount: number;
}

export interface CompareResult {
  items: EntityCount[];
  totalMismatch: number;
  hasMismatch: boolean;
}

/**
 * DB 카운트와 렌더링 카운트를 비교하여 불일치 목록 반환
 */
export function compareDbVsRender(
  dbCounts: Record<string, number>,
  renderCounts: Record<string, number>,
): CompareResult {
  const keys = [
    { key: 'l2', label: 'L2 공정' },
    { key: 'l3', label: 'L3 작업요소' },
    { key: 'l2Func', label: 'L2 공정기능' },
    { key: 'l3Func', label: 'L3 요소기능' },
    { key: 'fm', label: 'FM 고장형태' },
    { key: 'fe', label: 'FE 고장영향' },
    { key: 'fc', label: 'FC 고장원인' },
    { key: 'fl', label: 'FailureLink' },
    { key: 'ra', label: 'RiskAnalysis' },
    { key: 'opt', label: 'Optimization' },
  ];

  const items: EntityCount[] = keys.map(({ key, label }) => ({
    label,
    dbCount: dbCounts[key] ?? 0,
    renderCount: renderCounts[key] ?? 0,
  }));

  const totalMismatch = items.filter(i => i.dbCount !== i.renderCount).length;

  return {
    items,
    totalMismatch,
    hasMismatch: totalMismatch > 0,
  };
}

/**
 * Atomic API 응답에서 렌더링될 엔티티 카운트를 추출
 */
export function extractRenderCounts(atomicData: {
  l2Structures?: unknown[];
  l3Structures?: unknown[];
  l2Functions?: unknown[];
  l3Functions?: unknown[];
  failureModes?: unknown[];
  failureEffects?: unknown[];
  failureCauses?: unknown[];
  failureLinks?: unknown[];
  riskAnalyses?: unknown[];
  optimizations?: unknown[];
}): Record<string, number> {
  return {
    l2: atomicData.l2Structures?.length ?? 0,
    l3: atomicData.l3Structures?.length ?? 0,
    l2Func: atomicData.l2Functions?.length ?? 0,
    l3Func: atomicData.l3Functions?.length ?? 0,
    fm: atomicData.failureModes?.length ?? 0,
    fe: atomicData.failureEffects?.length ?? 0,
    fc: atomicData.failureCauses?.length ?? 0,
    fl: atomicData.failureLinks?.length ?? 0,
    ra: atomicData.riskAnalyses?.length ?? 0,
    opt: atomicData.optimizations?.length ?? 0,
  };
}

/**
 * 비교 결과를 HTML 테이블로 렌더링 (DB Viewer 대시보드용)
 */
export function renderCompareHtml(
  result: CompareResult,
  fmeaId: string,
): string {
  const statusIcon = result.hasMismatch ? '🔴' : '🟢';
  const statusText = result.hasMismatch
    ? `${result.totalMismatch}건 불일치`
    : '전체 일치';

  let html = `
    <h2 style="color:#f97316;font-size:15px;margin:20px 0 8px">
      ${statusIcon} DB ↔ 렌더링 비교 검증 <span style="font-size:12px;color:#94a3b8">(${statusText})</span>
    </h2>
    <p style="color:#64748b;font-size:11px;margin:0 0 8px">
      DB에 저장된 원본 건수와 워크시트에 실제 렌더링되는 건수를 비교합니다.
      불일치 시 자동개선을 실행하세요.
    </p>
    <table>
      <tr>
        <th>항목</th>
        <th style="text-align:center">DB 원본</th>
        <th style="text-align:center">렌더링</th>
        <th style="text-align:center">차이</th>
        <th>상태</th>
      </tr>`;

  for (const item of result.items) {
    const diff = item.renderCount - item.dbCount;
    const isMismatch = diff !== 0;
    const rowBg = isMismatch ? 'background:#7f1d1d33;' : '';
    const diffColor = isMismatch ? (diff > 0 ? '#fbbf24' : '#ef4444') : '#22c55e';
    const diffText = diff === 0 ? '0' : (diff > 0 ? `+${diff}` : `${diff}`);
    const statusEmoji = isMismatch ? '❌' : '✅';

    html += `
      <tr style="${rowBg}">
        <td>${item.label}</td>
        <td style="text-align:center;font-weight:700;color:#38bdf8">${item.dbCount}</td>
        <td style="text-align:center;font-weight:700;color:#a78bfa">${item.renderCount}</td>
        <td style="text-align:center;font-weight:700;color:${diffColor}">${diffText}</td>
        <td style="text-align:center">${statusEmoji}</td>
      </tr>`;
  }

  html += '</table>';

  // 불일치 시 자동개선 버튼 추가
  if (result.hasMismatch) {
    html += `
      <div style="margin:12px 0;display:flex;gap:8px">
        <button onclick="autoFix('${fmeaId}')"
          style="background:#dc2626;color:white;border:none;padding:8px 20px;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px">
          ⚡ 자동개선 실행
        </button>
        <button onclick="autoFix('${fmeaId}', true)"
          style="background:#2563eb;color:white;border:none;padding:8px 20px;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px">
          🔄 rebuild-atomic 포함
        </button>
        <span id="fixStatus" style="color:#94a3b8;font-size:12px;align-self:center"></span>
      </div>`;
  }

  return html;
}

/**
 * 자동개선 JS 스크립트 (DB Viewer HTML에 삽입용)
 */
export function renderAutoFixScript(): string {
  return `
async function autoFix(fmeaId, includeRebuild) {
  var status = document.getElementById('fixStatus');
  if (status) status.textContent = '⏳ 자동개선 실행 중...';

  try {
    // Step 1: pipeline-verify POST (자동수정)
    var res1 = await fetch('/api/fmea/pipeline-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fmeaId: fmeaId })
    });
    var data1 = await res1.json();
    var msg = 'pipeline-verify: ' + (data1.allGreen ? 'ALL GREEN' : 'issues remain');

    // Step 2: rebuild-atomic (선택)
    if (includeRebuild) {
      if (status) status.textContent = '⏳ rebuild-atomic 실행 중...';
      var res2 = await fetch('/api/fmea/rebuild-atomic?fmeaId=' + fmeaId, { method: 'POST' });
      var data2 = await res2.json();
      msg += ' | rebuild-atomic: ' + (data2.success ? 'OK' : 'FAIL');
    }

    if (status) status.textContent = '✅ ' + msg + ' — 새로고침 중...';
    setTimeout(function() { location.reload(); }, 1500);
  } catch (e) {
    if (status) status.textContent = '❌ 오류: ' + e.message;
  }
}`;
}
