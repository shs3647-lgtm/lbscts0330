import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import {
  compareDbVsRender,
  renderCompareHtml,
  renderAutoFixScript,
} from '@/lib/fmea-core/db-render-compare';

const CSS = `
* { box-sizing: border-box; }
body { font-family: 'Segoe UI', -apple-system, sans-serif; margin: 0; background: #0f172a; color: #e2e8f0; }
.top { background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); padding: 16px 24px; border-bottom: 1px solid #334155; position: sticky; top: 0; z-index: 100; }
.top h1 { margin: 0 0 12px; font-size: 18px; color: #38bdf8; letter-spacing: -0.5px; }
.search-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.search-row select, .search-row input { background: #1e293b; border: 1px solid #475569; color: #e2e8f0; padding: 6px 12px; border-radius: 6px; font-size: 13px; }
.search-row select { min-width: 140px; }
.search-row input { min-width: 200px; }
.search-row button { background: #2563eb; color: white; border: none; padding: 6px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; }
.search-row button:hover { background: #1d4ed8; }
.search-row .btn-outline { background: transparent; border: 1px solid #475569; color: #94a3b8; }
.search-row .btn-outline:hover { background: #1e293b; color: #e2e8f0; }
.layout { display: flex; height: calc(100vh - 110px); }
.sidebar { width: 260px; min-width: 260px; background: #1e293b; border-right: 1px solid #334155; overflow-y: auto; padding: 8px 0; }
.sidebar .group { padding: 6px 14px 4px; font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-top: 8px; }
.sidebar a { display: flex; justify-content: space-between; align-items: center; padding: 5px 14px; color: #94a3b8; text-decoration: none; font-size: 12.5px; border-left: 3px solid transparent; }
.sidebar a:hover { background: #334155; color: #e2e8f0; }
.sidebar a.active { background: #1e3a5f; color: #38bdf8; border-left-color: #38bdf8; font-weight: 600; }
.sidebar .cnt { font-size: 11px; padding: 1px 7px; border-radius: 10px; background: #334155; color: #94a3b8; }
.sidebar a.active .cnt { background: #2563eb; color: white; }
.sidebar a.key .cnt { background: #dc2626; color: white; }
.main { flex: 1; overflow: auto; padding: 0; }
.main-inner { padding: 16px 20px; }
.stats { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
.stat { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 12px 16px; min-width: 120px; }
.stat .num { font-size: 22px; font-weight: 700; color: #38bdf8; }
.stat .label { font-size: 11px; color: #64748b; margin-top: 2px; }
table { border-collapse: collapse; width: 100%; font-size: 12px; }
th { background: #1e293b; color: #94a3b8; padding: 7px 10px; text-align: left; position: sticky; top: 0; border-bottom: 2px solid #334155; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; }
td { padding: 5px 10px; border-bottom: 1px solid #1e293b; max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
td:hover { white-space: normal; overflow: visible; background: #334155; border-radius: 4px; position: relative; z-index: 1; }
tr:nth-child(even) { background: #0f172a; }
tr:nth-child(odd) { background: #111827; }
tr:hover td { background: #1e3a5f; }
.id-cell { font-family: 'Cascadia Code', monospace; font-size: 10.5px; color: #64748b; }
.null { color: #475569; font-style: italic; }
.pager { padding: 12px 0; display: flex; gap: 8px; }
.pager a { padding: 5px 14px; background: #1e293b; border: 1px solid #334155; border-radius: 6px; color: #94a3b8; text-decoration: none; font-size: 12px; }
.pager a:hover { background: #334155; color: white; }
.chain-row { cursor: pointer; }
.chain-detail { background: #1a2332; }
.chain-detail td { padding: 8px 14px; font-size: 12px; white-space: normal; }
.tag { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 10px; margin-right: 4px; }
.tag-fe { background: #7c3aed22; color: #a78bfa; border: 1px solid #7c3aed44; }
.tag-fm { background: #dc262622; color: #fca5a5; border: 1px solid #dc262644; }
.tag-fc { background: #2563eb22; color: #93c5fd; border: 1px solid #2563eb44; }
.tag-ra { background: #05966922; color: #6ee7b7; border: 1px solid #05966944; }
.empty { text-align: center; padding: 60px 20px; color: #475569; }
.empty h3 { color: #64748b; }
`;

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function GET(req: NextRequest) {
  const fmeaId = req.nextUrl.searchParams.get('fmeaId') || '';
  const table = req.nextUrl.searchParams.get('table') || '';
  const view = req.nextUrl.searchParams.get('view') || '';
  const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0');
  const pubTable = req.nextUrl.searchParams.get('pub') || ''; // public 스키마 테이블
  const limit = 100;

  const client = new Client(process.env.DATABASE_URL!);
  await client.connect();

  try {
    // 사용 가능한 프로젝트 스키마 목록 조회
    const schemas = await client.query(`
      SELECT schema_name FROM information_schema.schemata
      WHERE schema_name LIKE 'pfmea_%'
      ORDER BY schema_name
    `);
    const projectList = schemas.rows.map(r => {
      const id = r.schema_name.replace('pfmea_', '').replace(/_/g, '-');
      return { id, schema: r.schema_name };
    });

    // CP/PFD 조회
    let cpList: { cpNo: string; subject: string }[] = [];
    let pfdList: { pfdNo: string; subject: string }[] = [];
    try {
      const cpRes = await client.query(`SELECT "cpNo", subject FROM public.cp_registrations ORDER BY "createdAt" DESC LIMIT 50`);
      cpList = cpRes.rows;
    } catch { /* table might not exist */ }
    try {
      const pfdRes = await client.query(`SELECT "pfdNo", subject FROM public.pfd_registrations ORDER BY "createdAt" DESC LIMIT 50`);
      pfdList = pfdRes.rows;
    } catch { /* table might not exist */ }

    // 메인 검색 폼 (프로젝트 미선택 시)
    if (!fmeaId) {
      let html = page('DB Viewer', `
        <div class="main-inner">
          <div class="empty">
            <h3>프로젝트를 선택하세요</h3>
            <p>상단 검색창에서 FMEA / CP / PFD ID로 검색하거나, 드롭다운에서 선택하세요.</p>
          </div>
        </div>
      `, '', projectList, cpList, pfdList, fmeaId);
      return html;
    }

    const schema = `pfmea_${fmeaId.replace(/-/g, '_')}`;

    // 스키마 존재 확인
    const schemaCheck = await client.query(`SELECT 1 FROM information_schema.schemata WHERE schema_name = '${schema}'`);
    if (schemaCheck.rows.length === 0) {
      return page('DB Viewer', `<div class="main-inner"><div class="empty"><h3>스키마 "${schema}" 없음</h3><p>해당 fmeaId의 데이터가 없습니다.</p></div></div>`, '', projectList, cpList, pfdList, fmeaId);
    }

    // 테이블 목록
    const tables = await client.query(`
      SELECT table_name,
        (xpath('/row/cnt/text()', query_to_xml(format('SELECT COUNT(*) AS cnt FROM "${schema}"."%s"', table_name), false, true, '')))[1]::text::int AS row_count
      FROM information_schema.tables
      WHERE table_schema = '${schema}'
      ORDER BY table_name
    `);

    const keyTables = ['failure_links', 'failure_modes', 'failure_effects', 'failure_causes', 'risk_analyses'];
    const structTables = ['l1_structures', 'l1_functions', 'l2_structures', 'l2_functions', 'l3_structures', 'l3_functions', 'l3_process_chars', 'process_product_chars'];
    const desc: Record<string, string> = {
      failure_links: '고장사슬 FE↔FM↔FC', failure_modes: 'FM 고장형태', failure_effects: 'FE 고장영향',
      failure_causes: 'FC 고장원인', risk_analyses: '위험분석 S/O/D', failure_analyses: '고장분석',
      l1_structures: 'L1 완제품', l1_functions: 'L1 기능', l2_structures: 'L2 공정',
      l2_functions: 'L2 공정기능', l3_structures: 'L3 작업요소', l3_functions: 'L3 요소기능',
      l3_process_chars: 'B3 공정특성', process_product_chars: 'A4 제품특성',
      optimizations: '최적화', control_plan_items: 'CP항목',
      pfd_items: 'PFD항목', unified_process_items: '통합공정',
      // LLD
      lld_filter_code: 'LLD 통합 교훈DB', lessons_learned: 'LLD 레거시',
      // 산업DB
      kr_industry_detection: '검출관리 DC 산업DB', kr_industry_prevention: '예방관리 PC 산업DB',
      // AP/개선
      continuous_improvement_plan: 'CIP 지속개선',
      // SOD 기준
      pfmea_severity_criteria: '심각도 S 기준표', pfmea_occurrence_criteria: '발생도 O 기준표',
      pfmea_detection_criteria: '검출도 D 기준표',
      // 마스터
      master_fmea_reference: '마스터 FMEA 레퍼런스',
    };

    // ── public 스키마 테이블 (LLD / 산업DB / AP / SOD / 마스터) ──
    const pubCategories = {
      lld: { label: 'LLD (교훈 DB)', tables: ['lld_filter_code', 'lessons_learned'], color: '#f59e0b' },
      industry: { label: '산업DB (DC/PC)', tables: ['kr_industry_detection', 'kr_industry_prevention'], color: '#8b5cf6' },
      ap: { label: 'AP 개선 DB', tables: ['continuous_improvement_plan'], color: '#10b981' },
      sod: { label: 'SOD 기준표', tables: ['pfmea_severity_criteria', 'pfmea_occurrence_criteria', 'pfmea_detection_criteria'], color: '#06b6d4' },
      master: { label: '마스터 참조 DB', tables: ['master_fmea_reference'], color: '#ec4899' },
    };
    const allPubTables = Object.values(pubCategories).flatMap(c => c.tables);

    // public 테이블 row count 조회
    const pubCounts = new Map<string, number>();
    for (const tbl of allPubTables) {
      try {
        const r = await client.query(`SELECT COUNT(*) AS cnt FROM public."${tbl}"`);
        pubCounts.set(tbl, parseInt(r.rows[0].cnt));
      } catch { pubCounts.set(tbl, -1); }
    }

    // 사이드바
    let sidebar = '<div class="group">고장사슬 (핵심)</div>';
    for (const t of tables.rows.filter(r => keyTables.includes(r.table_name))) {
      const active = t.table_name === table ? ' active' : '';
      sidebar += `<a class="key${active}" href="?fmeaId=${fmeaId}&table=${t.table_name}"><span>${t.table_name.replace('failure_', '').replace('risk_', '')} <span style="color:#64748b;font-size:10px">${desc[t.table_name] || ''}</span></span><span class="cnt">${t.row_count}</span></a>`;
    }
    sidebar += '<div class="group">구조 (Structure)</div>';
    for (const t of tables.rows.filter(r => structTables.includes(r.table_name))) {
      const active = t.table_name === table ? ' active' : '';
      sidebar += `<a class="${active}" href="?fmeaId=${fmeaId}&table=${t.table_name}"><span>${t.table_name.replace('_structures', '').replace('_functions', '_func')} <span style="color:#64748b;font-size:10px">${desc[t.table_name] || ''}</span></span><span class="cnt">${t.row_count}</span></a>`;
    }
    sidebar += '<div class="group">기타</div>';
    for (const t of tables.rows.filter(r => !keyTables.includes(r.table_name) && !structTables.includes(r.table_name) && r.row_count > 0)) {
      const active = t.table_name === table ? ' active' : '';
      sidebar += `<a class="${active}" href="?fmeaId=${fmeaId}&table=${t.table_name}"><span>${t.table_name.substring(0, 22)} <span style="color:#64748b;font-size:10px">${desc[t.table_name] || ''}</span></span><span class="cnt">${t.row_count}</span></a>`;
    }

    // ── public 스키마 카테고리 (LLD / 산업DB / AP / SOD / 마스터) ──
    for (const [, cat] of Object.entries(pubCategories)) {
      sidebar += `<div class="group" style="color:${cat.color}">${cat.label}</div>`;
      for (const tbl of cat.tables) {
        const cnt = pubCounts.get(tbl) ?? 0;
        if (cnt < 0) continue; // 테이블 미존재
        const active = pubTable === tbl ? ' active' : '';
        const shortName = tbl.replace('kr_industry_', '').replace('pfmea_', '').replace('_criteria', '').replace('continuous_improvement_plan', 'CIP');
        sidebar += `<a class="${active}" href="?fmeaId=${fmeaId}&pub=${tbl}"><span>${shortName} <span style="color:#64748b;font-size:10px">${desc[tbl] || ''}</span></span><span class="cnt">${cnt}</span></a>`;
      }
    }

    // ── public 스키마 테이블 조회 (LLD / 산업DB / AP / SOD / 마스터) ──
    if (pubTable && allPubTables.includes(pubTable)) {
      const countRes = await client.query(`SELECT COUNT(*) AS cnt FROM public."${pubTable}"`);
      const total = parseInt(countRes.rows[0].cnt);
      const dataRes = await client.query(`SELECT * FROM public."${pubTable}" ORDER BY 1 LIMIT ${limit} OFFSET ${offset}`);
      const columns = dataRes.fields.map(f => f.name);

      let pubHtml = `<div class="main-inner">
        <h2 style="color:#38bdf8;font-size:15px;margin:0 0 4px">${pubTable} <span style="color:#64748b;font-size:12px">${desc[pubTable] || ''}</span> <span style="color:#475569;font-size:11px">(public 스키마)</span></h2>
        <p style="color:#64748b;font-size:12px;margin:0 0 12px">총 ${total}건 | 표시: ${offset + 1}~${Math.min(offset + limit, total)}</p>`;

      if (total > limit) {
        pubHtml += '<div class="pager">';
        if (offset > 0) pubHtml += `<a href="?fmeaId=${fmeaId}&pub=${pubTable}&offset=${Math.max(0, offset - limit)}">← 이전</a>`;
        if (offset + limit < total) pubHtml += `<a href="?fmeaId=${fmeaId}&pub=${pubTable}&offset=${offset + limit}">다음 →</a>`;
        pubHtml += '</div>';
      }

      pubHtml += '<div style="overflow-x:auto"><table><tr>';
      for (const col of columns) pubHtml += `<th>${escHtml(col)}</th>`;
      pubHtml += '</tr>';
      for (const row of dataRes.rows) {
        pubHtml += '<tr>';
        for (const col of columns) {
          let val = row[col];
          if (val === null || val === undefined) val = '<span class="null">NULL</span>';
          else if (val instanceof Date) val = val.toISOString().slice(0, 19);
          else if (Array.isArray(val)) val = escHtml(val.join(', ').substring(0, 200));
          else if (typeof val === 'object') val = escHtml(JSON.stringify(val).substring(0, 120));
          else val = escHtml(String(val));
          const isId = col === 'id' || col.endsWith('Id') || col.endsWith('_id');
          pubHtml += `<td${isId ? ' class="id-cell"' : ''}>${val}</td>`;
        }
        pubHtml += '</tr>';
      }
      pubHtml += '</table></div>';

      if (total > limit) {
        pubHtml += '<div class="pager">';
        if (offset > 0) pubHtml += `<a href="?fmeaId=${fmeaId}&pub=${pubTable}&offset=${Math.max(0, offset - limit)}">← 이전</a>`;
        if (offset + limit < total) pubHtml += `<a href="?fmeaId=${fmeaId}&pub=${pubTable}&offset=${offset + limit}">다음 →</a>`;
        pubHtml += '</div>';
      }
      pubHtml += '</div>';
      return page(`${pubTable} — public`, pubHtml, sidebar, projectList, cpList, pfdList, fmeaId);
    }

    // 테이블 미선택 시 — 대시보드
    if (!table || view === 'dashboard') {
      const fm = tables.rows.find(r => r.table_name === 'failure_modes')?.row_count || 0;
      const fe = tables.rows.find(r => r.table_name === 'failure_effects')?.row_count || 0;
      const fc = tables.rows.find(r => r.table_name === 'failure_causes')?.row_count || 0;
      const fl = tables.rows.find(r => r.table_name === 'failure_links')?.row_count || 0;
      const ra = tables.rows.find(r => r.table_name === 'risk_analyses')?.row_count || 0;
      const l2 = tables.rows.find(r => r.table_name === 'l2_structures')?.row_count || 0;
      const l3 = tables.rows.find(r => r.table_name === 'l3_structures')?.row_count || 0;
      const opt = tables.rows.find(r => r.table_name === 'optimizations')?.row_count || 0;
      const l2Func = tables.rows.find(r => r.table_name === 'l2_functions')?.row_count || 0;
      const l3Func = tables.rows.find(r => r.table_name === 'l3_functions')?.row_count || 0;

      // ── DB ↔ 렌더링 비교 검증 ──
      // Atomic API가 반환하는 렌더링 카운트를 가져옴 (deletedAt IS NULL 필터 적용)
      let compareHtml = '';
      try {
        // 렌더링 카운트: Atomic API가 실제 조회하는 조건과 동일
        // FailureLink만 deletedAt IS NULL 필터 (soft delete 지원)
        // 나머지 테이블은 deletedAt 컬럼 없음 → 전체 COUNT
        const renderQueries = [
          { key: 'l2', sql: `SELECT COUNT(*) FROM "${schema}".l2_structures` },
          { key: 'l3', sql: `SELECT COUNT(*) FROM "${schema}".l3_structures` },
          { key: 'l2Func', sql: `SELECT COUNT(*) FROM "${schema}".l2_functions` },
          { key: 'l3Func', sql: `SELECT COUNT(*) FROM "${schema}".l3_functions` },
          { key: 'fm', sql: `SELECT COUNT(*) FROM "${schema}".failure_modes` },
          { key: 'fe', sql: `SELECT COUNT(*) FROM "${schema}".failure_effects` },
          { key: 'fc', sql: `SELECT COUNT(*) FROM "${schema}".failure_causes` },
          { key: 'fl', sql: `SELECT COUNT(*) FROM "${schema}".failure_links WHERE "deletedAt" IS NULL` },
          { key: 'ra', sql: `SELECT COUNT(*) FROM "${schema}".risk_analyses` },
          { key: 'opt', sql: `SELECT COUNT(*) FROM "${schema}".optimizations` },
        ];

        const renderCounts: Record<string, number> = {};
        for (const q of renderQueries) {
          try {
            const r = await client.query(q.sql);
            renderCounts[q.key] = parseInt(r.rows[0].count);
          } catch { renderCounts[q.key] = 0; }
        }

        const dbCounts: Record<string, number> = {
          l2, l3, l2Func, l3Func, fm, fe, fc, fl, ra, opt,
        };

        const compareResult = compareDbVsRender(dbCounts, renderCounts);
        compareHtml = renderCompareHtml(compareResult, fmeaId);
      } catch (compareErr) {
        console.error('[db-viewer] compare error:', compareErr);
        compareHtml = '<p style="color:#ef4444">비교 검증 실행 실패</p>';
      }

      // N:1:N 요약
      let chainHtml = '';
      try {
        const chains = await client.query(`
          SELECT fm."mode" AS fm, COUNT(DISTINCT fl."feId") AS fe_cnt, COUNT(DISTINCT fl."fcId") AS fc_cnt, COUNT(fl.id) AS links
          FROM "${schema}".failure_links fl
          JOIN "${schema}".failure_modes fm ON fl."fmId" = fm.id
          WHERE fl."deletedAt" IS NULL
          GROUP BY fm.id, fm."mode" ORDER BY COUNT(fl.id) DESC LIMIT 15
        `);
        chainHtml = '<table><tr><th>FM (고장형태)</th><th>FE수</th><th>FC수</th><th>Link수</th><th>관계</th></tr>';
        for (const r of chains.rows) {
          chainHtml += `<tr><td>${escHtml(r.fm)}</td><td style="text-align:center">${r.fe_cnt}</td><td style="text-align:center">${r.fc_cnt}</td><td style="text-align:center;font-weight:700;color:#38bdf8">${r.links}</td>
          <td><span class="tag tag-fe">FE:${r.fe_cnt}</span><span class="tag tag-fm">FM:1</span><span class="tag tag-fc">FC:${r.fc_cnt}</span></td></tr>`;
        }
        chainHtml += '</table>';
      } catch { chainHtml = '<p>조회 실패</p>'; }

      // public DB 통계
      const lldCnt = pubCounts.get('lld_filter_code') ?? 0;
      const llCnt = pubCounts.get('lessons_learned') ?? 0;
      const krDcCnt = pubCounts.get('kr_industry_detection') ?? 0;
      const krPcCnt = pubCounts.get('kr_industry_prevention') ?? 0;
      const masterRefCnt = pubCounts.get('master_fmea_reference') ?? 0;

      const content = `<div class="main-inner">
        <div class="stats">
          <div class="stat"><div class="num">${l2}</div><div class="label">L2 공정</div></div>
          <div class="stat"><div class="num">${l3}</div><div class="label">L3 작업요소</div></div>
          <div class="stat"><div class="num">${fm}</div><div class="label">FM 고장형태</div></div>
          <div class="stat"><div class="num">${fe}</div><div class="label">FE 고장영향</div></div>
          <div class="stat"><div class="num">${fc}</div><div class="label">FC 고장원인</div></div>
          <div class="stat"><div class="num" style="color:#f59e0b">${fl}</div><div class="label">FailureLink</div></div>
          <div class="stat"><div class="num" style="color:#10b981">${ra}</div><div class="label">RiskAnalysis</div></div>
          <div class="stat"><div class="num" style="color:#8b5cf6">${opt}</div><div class="label">Optimization</div></div>
        </div>
        <h2 style="color:#f59e0b;font-size:15px;margin:20px 0 8px">Living DB 현황</h2>
        <div class="stats">
          <div class="stat"><div class="num" style="color:#f59e0b">${lldCnt}</div><div class="label">LLD 필터코드</div></div>
          <div class="stat"><div class="num" style="color:#f59e0b">${llCnt}</div><div class="label">LLD 레거시</div></div>
          <div class="stat"><div class="num" style="color:#8b5cf6">${krDcCnt}</div><div class="label">산업DB DC</div></div>
          <div class="stat"><div class="num" style="color:#8b5cf6">${krPcCnt}</div><div class="label">산업DB PC</div></div>
          <div class="stat"><div class="num" style="color:#ec4899">${masterRefCnt}</div><div class="label">마스터 참조</div></div>
        </div>
        ${compareHtml}
        <h2 style="color:#38bdf8;font-size:15px;margin:20px 0 8px">고장사슬 N:1:N 연결 현황 (FM별)</h2>
        ${chainHtml}
      </div>`;
      return page(`DB Viewer — ${fmeaId}`, content, sidebar, projectList, cpList, pfdList, fmeaId);
    }

    // 테이블 데이터 조회
    const countRes = await client.query(`SELECT COUNT(*) AS cnt FROM "${schema}"."${table}"`);
    const total = parseInt(countRes.rows[0].cnt);
    const dataRes = await client.query(`SELECT * FROM "${schema}"."${table}" ORDER BY 1 LIMIT ${limit} OFFSET ${offset}`);
    const columns = dataRes.fields.map(f => f.name);

    let tableHtml = `<div class="main-inner">
      <h2 style="color:#38bdf8;font-size:15px;margin:0 0 4px">${table} <span style="color:#64748b;font-size:12px">${desc[table] || ''}</span></h2>
      <p style="color:#64748b;font-size:12px;margin:0 0 12px">총 ${total}건 | 표시: ${offset + 1}~${Math.min(offset + limit, total)}</p>`;

    if (total > limit) {
      tableHtml += '<div class="pager">';
      if (offset > 0) tableHtml += `<a href="?fmeaId=${fmeaId}&table=${table}&offset=${Math.max(0, offset - limit)}">← 이전</a>`;
      if (offset + limit < total) tableHtml += `<a href="?fmeaId=${fmeaId}&table=${table}&offset=${offset + limit}">다음 →</a>`;
      tableHtml += '</div>';
    }

    tableHtml += '<div style="overflow-x:auto"><table><tr>';
    for (const col of columns) {
      tableHtml += `<th>${escHtml(col)}</th>`;
    }
    tableHtml += '</tr>';

    for (const row of dataRes.rows) {
      tableHtml += '<tr>';
      for (const col of columns) {
        let val = row[col];
        if (val === null || val === undefined) val = '<span class="null">NULL</span>';
        else if (val instanceof Date) val = val.toISOString().slice(0, 19);
        else if (typeof val === 'object') val = escHtml(JSON.stringify(val).substring(0, 120));
        else val = escHtml(String(val));

        const isId = col === 'id' || col.endsWith('Id') || col.endsWith('_id');
        tableHtml += `<td${isId ? ' class="id-cell"' : ''}>${val}</td>`;
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</table></div>';

    if (total > limit) {
      tableHtml += '<div class="pager">';
      if (offset > 0) tableHtml += `<a href="?fmeaId=${fmeaId}&table=${table}&offset=${Math.max(0, offset - limit)}">← 이전</a>`;
      if (offset + limit < total) tableHtml += `<a href="?fmeaId=${fmeaId}&table=${table}&offset=${offset + limit}">다음 →</a>`;
      tableHtml += '</div>';
    }
    tableHtml += '</div>';

    return page(`${table} — ${fmeaId}`, tableHtml, sidebar, projectList, cpList, pfdList, fmeaId);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    await client.end();
  }
}

function page(
  title: string, content: string, sidebar: string,
  projectList: { id: string; schema: string }[],
  cpList: { cpNo: string; subject: string }[],
  pfdList: { pfdNo: string; subject: string }[],
  currentFmeaId: string
): NextResponse {
  const projOptions = projectList.map(p =>
    `<option value="${p.id}" ${p.id === currentFmeaId ? 'selected' : ''}>${p.id}</option>`
  ).join('');
  const cpOptions = cpList.map(c =>
    `<option value="${c.cpNo}">${c.cpNo} ${c.subject ? '- ' + escHtml(c.subject.substring(0, 30)) : ''}</option>`
  ).join('');
  const pfdOptions = pfdList.map(p =>
    `<option value="${p.pfdNo}">${p.pfdNo} ${p.subject ? '- ' + escHtml(p.subject.substring(0, 30)) : ''}</option>`
  ).join('');

  const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><title>${escHtml(title)}</title>
<style>${CSS}</style></head><body>
<div class="top">
  <h1>FMEA DB Viewer</h1>
  <div class="search-row">
    <select id="fmeaSel" onchange="goFmea(this.value)">
      <option value="">-- FMEA 선택 --</option>
      ${projOptions}
    </select>
    <select id="cpSel" onchange="goCp(this.value)">
      <option value="">-- CP 선택 --</option>
      ${cpOptions}
    </select>
    <select id="pfdSel" onchange="goPfd(this.value)">
      <option value="">-- PFD 선택 --</option>
      ${pfdOptions}
    </select>
    <input id="searchInput" type="text" placeholder="fmeaId / cpNo / pfdNo 직접 입력" value="${escHtml(currentFmeaId)}" onkeydown="if(event.key==='Enter')goSearch()" />
    <button onclick="goSearch()">검색</button>
    ${currentFmeaId ? `<button class="btn-outline" onclick="location.href='?fmeaId=${currentFmeaId}'">대시보드</button>` : ''}
  </div>
</div>
<div class="layout">
  ${sidebar ? `<div class="sidebar">${sidebar}</div>` : ''}
  <div class="main">${content}</div>
</div>
<script>
function goFmea(v){if(v)location.href='?fmeaId='+v}
function goCp(v){if(v)location.href='?fmeaId='+v}
function goPfd(v){if(v)location.href='?fmeaId='+v}
function goSearch(){var v=document.getElementById('searchInput').value.trim();if(v)location.href='?fmeaId='+v}
${renderAutoFixScript()}
</script>
</body></html>`;
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
