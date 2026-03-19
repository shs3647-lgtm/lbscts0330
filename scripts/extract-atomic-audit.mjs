/**
 * @file extract-atomic-audit.mjs
 * @description fmeaId 기준 PostgreSQL Atomic DB 전체 추출 → JSON + 매칭표 MD
 *
 * Usage: node scripts/extract-atomic-audit.mjs pfm26-m066
 *        node scripts/extract-atomic-audit.mjs pfm26-m069
 *
 * 출력:
 *   data/{shortId}-atomic-audit.json    — Atomic DB 전체 (L1~Opt)
 *   data/{shortId}-matching-table.md    — UUID/PG/PK/SW 매칭표
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';

const fmeaId = process.argv[2] || 'pfm26-m066';
const shortId = fmeaId.replace('pfm26-', '');
const schema = `pfmea_${fmeaId.replace(/-/g, '_')}`;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:1234@localhost:5432/fmea_db';
const pool = new pg.Pool({ connectionString: DATABASE_URL });

async function q(sql) {
  const { rows } = await pool.query(sql);
  return rows;
}

const S = (col) => `"${schema}"."${col}"`;

async function main() {
  console.log(`[extract] fmeaId=${fmeaId} schema=${schema}`);

  const fid = fmeaId;

  // ── L1 ──
  const l1Structs = await q(`SELECT id, name FROM ${S('l1_structures')} WHERE "fmeaId"='${fid}'`);
  const l1Funcs = await q(`SELECT id, "l1StructId", category, "functionName", requirement FROM ${S('l1_functions')} WHERE "fmeaId"='${fid}' ORDER BY "l1StructId", category`);
  const fes = await q(`SELECT id, "l1FuncId", category, effect, severity FROM ${S('failure_effects')} WHERE "fmeaId"='${fid}' ORDER BY category, effect`);

  // ── L2 ──
  const l2Structs = await q(`SELECT id, "l1Id", no, name, "order" FROM ${S('l2_structures')} WHERE "fmeaId"='${fid}' ORDER BY "order"`);
  const l2Funcs = await q(`SELECT id, "l2StructId", "functionName", "productChar", "specialChar" FROM ${S('l2_functions')} WHERE "fmeaId"='${fid}' ORDER BY "l2StructId"`);
  const ppc = await q(`SELECT id, "l2StructId", name, "specialChar" FROM ${S('process_product_chars')} WHERE "fmeaId"='${fid}' ORDER BY "l2StructId"`);
  const fms = await q(`SELECT id, "l2StructId", "productCharId", mode, "specialChar" FROM ${S('failure_modes')} WHERE "fmeaId"='${fid}' ORDER BY "l2StructId"`);

  // ── L3 ──
  const l3Structs = await q(`SELECT id, "l2Id", name, m4 FROM ${S('l3_structures')} WHERE "fmeaId"='${fid}' ORDER BY "l2Id", m4`);
  const l3Funcs = await q(`SELECT id, "l3StructId", "l2StructId", "functionName", "processChar", "specialChar" FROM ${S('l3_functions')} WHERE "fmeaId"='${fid}' ORDER BY "l3StructId"`);
  const fcs = await q(`SELECT id, "l3FuncId", "l3StructId", "l2StructId", "processCharId", cause, occurrence FROM ${S('failure_causes')} WHERE "fmeaId"='${fid}' ORDER BY "l2StructId", "l3StructId"`);

  // ── FK ──
  const links = await q(`SELECT id, "fmId", "feId", "fcId", "fmText", "feText", "fcText", severity FROM ${S('failure_links')} WHERE "fmeaId"='${fid}' AND "deletedAt" IS NULL ORDER BY id`);
  const fas = await q(`SELECT id, "linkId", "fmId", "fmText", "feId", "feText", "fcId", "fcText", "feSeverity", "fcOccurrence" FROM ${S('failure_analyses')} WHERE "fmeaId"='${fid}' ORDER BY "linkId"`);

  // ── Risk + Opt ──
  const ras = await q(`SELECT id, "linkId", severity, occurrence, detection, ap, "preventionControl", "detectionControl", "lldReference" FROM ${S('risk_analyses')} WHERE "fmeaId"='${fid}' ORDER BY "linkId"`);
  const opts = await q(`SELECT id, "riskId", "recommendedAction", responsible, "targetDate", "newSeverity", "newOccurrence", "newDetection", "newAP", status, remarks FROM ${S('optimizations')} WHERE "fmeaId"='${fid}' ORDER BY "riskId"`);

  const audit = {
    fmeaId,
    schema,
    extractedAt: new Date().toISOString(),
    counts: {
      l1Structure: l1Structs.length,
      l1Function: l1Funcs.length,
      failureEffect: fes.length,
      l2Structure: l2Structs.length,
      l2Function: l2Funcs.length,
      processProductChar: ppc.length,
      failureMode: fms.length,
      l3Structure: l3Structs.length,
      l3Function: l3Funcs.length,
      failureCause: fcs.length,
      failureLink: links.length,
      failureAnalysis: fas.length,
      riskAnalysis: ras.length,
      optimization: opts.length,
    },
    atomicDB: {
      l1Structures: l1Structs,
      l1Functions: l1Funcs,
      failureEffects: fes,
      l2Structures: l2Structs,
      l2Functions: l2Funcs,
      processProductChars: ppc,
      failureModes: fms,
      l3Structures: l3Structs,
      l3Functions: l3Funcs,
      failureCauses: fcs,
      failureLinks: links,
      failureAnalyses: fas,
      riskAnalyses: ras,
      optimizations: opts,
    },
  };

  fs.mkdirSync('data', { recursive: true });

  const jsonPath = path.join('data', `${shortId}-atomic-audit.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(audit, null, 2), 'utf8');
  console.log(`[extract] ${jsonPath} (${(fs.statSync(jsonPath).size / 1024).toFixed(1)} KB)`);

  const md = buildMatchingTable(audit);
  const mdPath = path.join('data', `${shortId}-matching-table.md`);
  fs.writeFileSync(mdPath, md, 'utf8');
  console.log(`[extract] ${mdPath}`);

  console.log('\n=== Counts ===');
  for (const [k, v] of Object.entries(audit.counts)) console.log(`  ${k}: ${v}`);

  await pool.end();
}

// ──────────────────────────────────────────────────────
// 매칭표 MD 생성
// ──────────────────────────────────────────────────────

function short(uuid) { return uuid ? uuid.substring(0, 8) : '-'; }
function trim(s, n) { return (s || '').substring(0, n); }

function buildMatchingTable(audit) {
  const { atomicDB: db, counts } = audit;
  const L = [];

  L.push(`# ${audit.fmeaId} 구조분석→최적화 UUID/PG/PK/SW 매칭표`);
  L.push(`> 생성: ${audit.extractedAt} | Schema: \`${audit.schema}\``);
  L.push('');

  // ── 카운트 요약 ──
  L.push('## 1. 엔티티 카운트');
  L.push('| 단계 | 엔티티 | 수량 | PG 테이블 |');
  L.push('|------|--------|------|-----------|');
  const rows = [
    ['L1', 'L1Structure', counts.l1Structure, 'l1_structures'],
    ['L1', 'L1Function', counts.l1Function, 'l1_functions'],
    ['L1', 'FailureEffect(FE)', counts.failureEffect, 'failure_effects'],
    ['L2', 'L2Structure', counts.l2Structure, 'l2_structures'],
    ['L2', 'L2Function', counts.l2Function, 'l2_functions'],
    ['L2', 'ProcessProductChar', counts.processProductChar, 'process_product_chars'],
    ['L2', 'FailureMode(FM)', counts.failureMode, 'failure_modes'],
    ['L3', 'L3Structure', counts.l3Structure, 'l3_structures'],
    ['L3', 'L3Function', counts.l3Function, 'l3_functions'],
    ['L3', 'FailureCause(FC)', counts.failureCause, 'failure_causes'],
    ['FK', 'FailureLink', counts.failureLink, 'failure_links'],
    ['분석', 'FailureAnalysis', counts.failureAnalysis, 'failure_analyses'],
    ['위험', 'RiskAnalysis', counts.riskAnalysis, 'risk_analyses'],
    ['최적화', 'Optimization', counts.optimization, 'optimizations'],
  ];
  for (const [s, e, c, t] of rows) L.push(`| ${s} | ${e} | **${c}** | ${t} |`);
  L.push('');

  // ── L1 구조 ──
  L.push('## 2. L1 완제품 (구조분석 최상위)');
  L.push('| L1 UUID | 이름 |');
  L.push('|---------|------|');
  for (const s of db.l1Structures) L.push(`| \`${short(s.id)}\` | ${s.name || ''} |`);
  L.push('');

  // L1Func → FE
  L.push('### 2.1 L1Function → FailureEffect');
  L.push('| L1Func | 구분 | 기능 | 요구사항 | FE UUID | 고장영향 | S |');
  L.push('|--------|------|------|----------|---------|----------|---|');
  for (const f of db.l1Functions) {
    const relFes = db.failureEffects.filter(e => e.l1FuncId === f.id);
    if (!relFes.length) {
      L.push(`| \`${short(f.id)}\` | ${f.category} | ${trim(f.functionName, 25)} | ${trim(f.requirement, 20)} | - | - | - |`);
    } else {
      for (let i = 0; i < relFes.length; i++) {
        const fe = relFes[i];
        const fp = i === 0 ? `\`${short(f.id)}\` | ${f.category} | ${trim(f.functionName, 25)} | ${trim(f.requirement, 20)}` : '↑|↑|↑|↑';
        L.push(`| ${fp} | \`${short(fe.id)}\` | ${trim(fe.effect, 25)} | ${fe.severity} |`);
      }
    }
  }
  L.push('');

  // ── L2 공정 ──
  L.push('## 3. L2 공정');
  L.push('| No | L2 UUID | 공정명 | L2Func | 제품특성(PPC) | FM UUID | 고장형태 |');
  L.push('|----|---------|--------|--------|---------------|---------|----------|');
  for (const s of db.l2Structures) {
    const funcs = db.l2Functions.filter(f => f.l2StructId === s.id);
    const chars = db.processProductChars.filter(c => c.l2StructId === s.id);
    const modes = db.failureModes.filter(m => m.l2StructId === s.id);
    const mx = Math.max(1, funcs.length, chars.length, modes.length);
    for (let i = 0; i < mx; i++) {
      const l2p = i === 0 ? `${s.no} | \`${short(s.id)}\` | ${trim(s.name, 20)}` : '↑|↑|↑';
      const fn = funcs[i] ? trim(funcs[i].functionName, 15) : '';
      const ch = chars[i] ? `${trim(chars[i].name, 15)}${chars[i].specialChar ? ' '+chars[i].specialChar : ''}` : '';
      const fm = modes[i] ? `\`${short(modes[i].id)}\` | ${trim(modes[i].mode, 20)}` : '|';
      L.push(`| ${l2p} | ${fn} | ${ch} | ${fm} |`);
    }
  }
  L.push('');

  // ── L3 작업요소 ──
  const l2Map = new Map();
  for (const s of db.l2Structures) l2Map.set(s.id, s);

  L.push('## 4. L3 작업요소');
  L.push('| 공정No | L3 UUID | 작업요소 | 4M | L3Func | 공정특성 | FC UUID | 고장원인 |');
  L.push('|--------|---------|----------|----|--------|----------|---------|----------|');
  for (const s of db.l3Structures) {
    const l2 = l2Map.get(s.l2Id);
    const funcs = db.l3Functions.filter(f => f.l3StructId === s.id);
    const causes = db.failureCauses.filter(c => c.l3StructId === s.id);
    const mx = Math.max(1, funcs.length, causes.length);
    for (let i = 0; i < mx; i++) {
      const l3p = i === 0 ? `${l2?.no || '?'} | \`${short(s.id)}\` | ${trim(s.name, 16)} | ${s.m4 || ''}` : '↑|↑|↑|↑';
      const fn = funcs[i] ? `${trim(funcs[i].functionName, 15)} | ${trim(funcs[i].processChar, 12)}${funcs[i].specialChar ? ' '+funcs[i].specialChar : ''}` : '|';
      const fc = causes[i] ? `\`${short(causes[i].id)}\` | ${trim(causes[i].cause, 20)}` : '|';
      L.push(`| ${l3p} | ${fn} | ${fc} |`);
    }
  }
  L.push('');

  // ── FailureLink ──
  const fmMap = new Map(); for (const m of db.failureModes) fmMap.set(m.id, m);
  const feMap = new Map(); for (const e of db.failureEffects) feMap.set(e.id, e);
  const fcMap = new Map(); for (const c of db.failureCauses) fcMap.set(c.id, c);

  L.push('## 5. FailureLink 고장사슬 (FK)');
  L.push('| Link | FM | 고장형태 | FE | 고장영향 | FC | 고장원인 | S |');
  L.push('|------|-----|---------|-----|---------|-----|---------|---|');
  for (const lk of db.failureLinks) {
    const fm = fmMap.get(lk.fmId);
    const fe = feMap.get(lk.feId);
    const fc = fcMap.get(lk.fcId);
    L.push(`| \`${short(lk.id)}\` | \`${short(lk.fmId)}\` | ${trim(fm?.mode || lk.fmText, 18)} | \`${short(lk.feId)}\` | ${trim(fe?.effect || lk.feText, 18)} | \`${short(lk.fcId)}\` | ${trim(fc?.cause || lk.fcText, 18)} | ${lk.severity || ''} |`);
  }
  L.push('');

  // ── RiskAnalysis ──
  L.push('## 6. RiskAnalysis 위험분석');
  L.push('| Link | S | O | D | AP | 예방관리(PC) | 검출관리(DC) |');
  L.push('|------|---|---|---|----|-------------|-------------|');
  for (const ra of db.riskAnalyses) {
    L.push(`| \`${short(ra.linkId)}\` | ${ra.severity} | ${ra.occurrence} | ${ra.detection} | ${ra.ap} | ${trim(ra.preventionControl, 20)} | ${trim(ra.detectionControl, 20)} |`);
  }
  L.push('');

  // ── Optimization ──
  L.push('## 7. Optimization 최적화');
  if (db.optimizations.length > 0) {
    L.push('| Risk | 추천조치 | 담당 | 신S | 신O | 신D | 신AP | 상태 |');
    L.push('|------|----------|------|-----|-----|-----|------|------|');
    for (const o of db.optimizations) {
      L.push(`| \`${short(o.riskId)}\` | ${trim(o.recommendedAction, 20)} | ${o.responsible || ''} | ${o.newSeverity ?? ''} | ${o.newOccurrence ?? ''} | ${o.newDetection ?? ''} | ${o.newAP ?? ''} | ${o.status || ''} |`);
    }
  } else {
    L.push('> (최적화 데이터 없음)');
  }
  L.push('');

  // ── SW 연동 매칭 ──
  L.push('## 8. Import→DB→WS 연동 매칭');
  L.push('| 단계 | flatData | Atomic DB(PG) | Worksheet(Legacy) | FK |');
  L.push('|------|---------|---------------|-------------------|-----|');
  L.push('| 구조 L1 | C1~C4 | l1_structures/functions/failure_effects | l1 {} | l1StructId |');
  L.push('| 구조 L2 | A1~A6 | l2_structures/functions/process_product_chars/failure_modes | l2[] | l2StructId |');
  L.push('| 구조 L3 | B1~B5 | l3_structures/functions/failure_causes | l2[].l3[] | l3StructId, l2StructId |');
  L.push('| 고장사슬 | FC chains | failure_links | savedLinks[] | fmId, feId, fcId |');
  L.push('| 고장분석 | — | failure_analyses | — | linkId |');
  L.push('| 위험분석 | SOD/PC/DC | risk_analyses | riskData{} | linkId |');
  L.push('| 최적화 | — | optimizations | riskData{lesson-opt-*} | riskId |');
  L.push('');

  return L.join('\n');
}

main().catch(e => { console.error(e); process.exit(1); });
