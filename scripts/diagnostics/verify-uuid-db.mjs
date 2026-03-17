/**
 * scripts/verify-uuid-db.mjs
 * PFMEA Import 후 FC 사슬 UUID와 고장연결(FailureLink) DB 완전성 검증
 *
 * 실행: node scripts/verify-uuid-db.mjs
 */

import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('[ERROR] DATABASE_URL 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

// schema 파라미터 제거 후 연결
const baseUrl = dbUrl.replace(/\?.*$/, '');
const pool = new Pool({ connectionString: baseUrl });

async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    const res = await client.query(sql, params);
    return res.rows;
  } finally {
    client.release();
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('PFMEA Import DB 완전성 검증 스크립트');
  console.log('='.repeat(70));

  // 1. 전체 FMEA 프로젝트 목록 조회 (camelCase 컬럼명)
  const fmeaProjects = await query(`
    SELECT fp."fmeaId", fp."fmeaType", fp.status,
           fr.subject, fr."partName", fr."partNo"
    FROM fmea_projects fp
    LEFT JOIN fmea_registrations fr ON fr."fmeaId" = fp."fmeaId"
    WHERE fp."deletedAt" IS NULL
    ORDER BY fp."createdAt" DESC
  `);

  if (fmeaProjects.length === 0) {
    console.log('\n[INFO] 등록된 FMEA 프로젝트가 없습니다.');
    await pool.end();
    return;
  }

  console.log(`\n총 FMEA 프로젝트: ${fmeaProjects.length}건\n`);

  let totalIssues = 0;

  for (const fmea of fmeaProjects) {
    const fmeaId = fmea.fmeaId;
    const label = fmea.subject || fmea.partName || fmea.partNo || fmeaId;

    console.log('─'.repeat(70));
    console.log(`[FMEA: ${fmeaId}]  ${label}  (타입: ${fmea.fmeaType})`);

    // 2a. L2Structure count
    const [l2] = await query(
      `SELECT COUNT(*) AS cnt FROM l2_structures WHERE "fmeaId" = $1`,
      [fmeaId]
    );
    // 2b. L3Structure count
    const [l3] = await query(
      `SELECT COUNT(*) AS cnt FROM l3_structures WHERE "fmeaId" = $1`,
      [fmeaId]
    );
    // 2c. FailureMode count
    const [fm] = await query(
      `SELECT COUNT(*) AS cnt FROM failure_modes WHERE "fmeaId" = $1`,
      [fmeaId]
    );
    // 2d. FailureEffect count
    const [fe] = await query(
      `SELECT COUNT(*) AS cnt FROM failure_effects WHERE "fmeaId" = $1`,
      [fmeaId]
    );
    // 2e. FailureCause count
    const [fc] = await query(
      `SELECT COUNT(*) AS cnt FROM failure_causes WHERE "fmeaId" = $1`,
      [fmeaId]
    );
    // 2f. FailureLink count (active, non-soft-deleted)
    const [fl] = await query(
      `SELECT COUNT(*) AS cnt FROM failure_links WHERE "fmeaId" = $1 AND "deletedAt" IS NULL`,
      [fmeaId]
    );
    // 2l. ProcessProductChar count
    const [ppc] = await query(
      `SELECT COUNT(*) AS cnt FROM process_product_chars WHERE "fmeaId" = $1`,
      [fmeaId]
    );

    console.log('\n  엔티티 카운트:');
    console.log(`    L2Structure:        ${l2.cnt}건`);
    console.log(`    L3Structure:        ${l3.cnt}건`);
    console.log(`    FailureMode:        ${fm.cnt}건`);
    console.log(`    FailureEffect:      ${fe.cnt}건`);
    console.log(`    FailureCause:       ${fc.cnt}건`);
    console.log(`    FailureLink:        ${fl.cnt}건  (soft-delete 제외)`);
    console.log(`    ProcessProductChar: ${ppc.cnt}건`);

    // 2g. FailureLink → FM FK broken
    const [flFmBroken] = await query(`
      SELECT COUNT(*) AS cnt
      FROM failure_links fl
      WHERE fl."fmeaId" = $1
        AND fl."deletedAt" IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM failure_modes fm WHERE fm.id = fl."fmId"
        )
    `, [fmeaId]);

    // 2h. FailureLink → FE FK broken
    const [flFeBroken] = await query(`
      SELECT COUNT(*) AS cnt
      FROM failure_links fl
      WHERE fl."fmeaId" = $1
        AND fl."deletedAt" IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM failure_effects fe WHERE fe.id = fl."feId"
        )
    `, [fmeaId]);

    // 2i. FailureLink → FC FK broken
    const [flFcBroken] = await query(`
      SELECT COUNT(*) AS cnt
      FROM failure_links fl
      WHERE fl."fmeaId" = $1
        AND fl."deletedAt" IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM failure_causes fc WHERE fc.id = fl."fcId"
        )
    `, [fmeaId]);

    // 2k. FailureMode → ProcessProductChar FK broken (productCharId가 있는데 PPC 없는 건)
    const [fmPpcBroken] = await query(`
      SELECT COUNT(*) AS cnt
      FROM failure_modes fm
      WHERE fm."fmeaId" = $1
        AND fm."productCharId" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM process_product_chars ppc WHERE ppc.id = fm."productCharId"
        )
    `, [fmeaId]);

    console.log('\n  FK 정합성:');

    const fmBrokenN  = parseInt(flFmBroken.cnt,  10);
    const feBrokenN  = parseInt(flFeBroken.cnt,  10);
    const fcBrokenN  = parseInt(flFcBroken.cnt,  10);
    const ppcBrokenN = parseInt(fmPpcBroken.cnt, 10);

    const fkIssues = fmBrokenN + feBrokenN + fcBrokenN + ppcBrokenN;
    totalIssues += fkIssues;

    console.log(`    FailureLink → FM FK broken:     ${fmBrokenN}건  ${fmBrokenN === 0 ? '✓ 정상' : '⚠ 문제!'}`);
    console.log(`    FailureLink → FE FK broken:     ${feBrokenN}건  ${feBrokenN === 0 ? '✓ 정상' : '⚠ 문제!'}`);
    console.log(`    FailureLink → FC FK broken:     ${fcBrokenN}건  ${fcBrokenN === 0 ? '✓ 정상' : '⚠ 문제!'}`);
    console.log(`    FM → ProcessProductChar broken: ${ppcBrokenN}건  ${ppcBrokenN === 0 ? '✓ 정상' : '⚠ 문제!'}`);

    // 2j. FailureLink 텍스트 캐시 null 건수
    const [flNullFmText] = await query(`
      SELECT COUNT(*) AS cnt FROM failure_links
      WHERE "fmeaId" = $1 AND "deletedAt" IS NULL AND "fmText" IS NULL
    `, [fmeaId]);
    const [flNullFeText] = await query(`
      SELECT COUNT(*) AS cnt FROM failure_links
      WHERE "fmeaId" = $1 AND "deletedAt" IS NULL AND "feText" IS NULL
    `, [fmeaId]);
    const [flNullFcText] = await query(`
      SELECT COUNT(*) AS cnt FROM failure_links
      WHERE "fmeaId" = $1 AND "deletedAt" IS NULL AND "fcText" IS NULL
    `, [fmeaId]);
    const [flNullFeScope] = await query(`
      SELECT COUNT(*) AS cnt FROM failure_links
      WHERE "fmeaId" = $1 AND "deletedAt" IS NULL AND "feScope" IS NULL
    `, [fmeaId]);

    const nullFmN    = parseInt(flNullFmText.cnt,  10);
    const nullFeN    = parseInt(flNullFeText.cnt,  10);
    const nullFcN    = parseInt(flNullFcText.cnt,  10);
    const nullScopeN = parseInt(flNullFeScope.cnt, 10);

    console.log('\n  텍스트 캐시 (FailureLink):');
    console.log(`    fmText null:  ${nullFmN}건  ${nullFmN === 0 ? '✓' : '△ 캐시 누락'}`);
    console.log(`    feText null:  ${nullFeN}건  ${nullFeN === 0 ? '✓' : '△ 캐시 누락'}`);
    console.log(`    fcText null:  ${nullFcN}건  ${nullFcN === 0 ? '✓' : '△ 캐시 누락'}`);
    console.log(`    feScope null: ${nullScopeN}건  ${nullScopeN === 0 ? '✓' : '△ 캐시 누락'}`);

    // FailureAnalysis 커버리지
    const [fa] = await query(
      `SELECT COUNT(*) AS cnt FROM failure_analyses WHERE "fmeaId" = $1`,
      [fmeaId]
    );
    const flN = parseInt(fl.cnt, 10);
    const faN = parseInt(fa.cnt, 10);
    const faCoverage = flN > 0 ? `${((faN / flN) * 100).toFixed(1)}%` : 'N/A';

    console.log('\n  FailureAnalysis 커버리지:');
    console.log(`    FailureAnalysis: ${faN}건 / FailureLink ${flN}건 (${faCoverage})`);

    // FK broken 상세 샘플 (최대 3건)
    if (fmBrokenN > 0) {
      const samples = await query(`
        SELECT fl.id, fl."fmId", fl."fmText"
        FROM failure_links fl
        WHERE fl."fmeaId" = $1
          AND fl."deletedAt" IS NULL
          AND NOT EXISTS (SELECT 1 FROM failure_modes fm WHERE fm.id = fl."fmId")
        LIMIT 3
      `, [fmeaId]);
      console.log('\n  [샘플] FM FK broken:');
      samples.forEach(r => console.log(`    - linkId=${r.id}  fmId=${r.fmId}  fmText=${r.fmText}`));
    }
    if (feBrokenN > 0) {
      const samples = await query(`
        SELECT fl.id, fl."feId", fl."feText"
        FROM failure_links fl
        WHERE fl."fmeaId" = $1
          AND fl."deletedAt" IS NULL
          AND NOT EXISTS (SELECT 1 FROM failure_effects fe WHERE fe.id = fl."feId")
        LIMIT 3
      `, [fmeaId]);
      console.log('\n  [샘플] FE FK broken:');
      samples.forEach(r => console.log(`    - linkId=${r.id}  feId=${r.feId}  feText=${r.feText}`));
    }
    if (fcBrokenN > 0) {
      const samples = await query(`
        SELECT fl.id, fl."fcId", fl."fcText"
        FROM failure_links fl
        WHERE fl."fmeaId" = $1
          AND fl."deletedAt" IS NULL
          AND NOT EXISTS (SELECT 1 FROM failure_causes fc WHERE fc.id = fl."fcId")
        LIMIT 3
      `, [fmeaId]);
      console.log('\n  [샘플] FC FK broken:');
      samples.forEach(r => console.log(`    - linkId=${r.id}  fcId=${r.fcId}  fcText=${r.fcText}`));
    }
  }

  console.log('\n' + '='.repeat(70));
  if (totalIssues === 0) {
    console.log('✓ 전체 FK 정합성 검증 통과 — 이상 없음');
  } else {
    console.log(`⚠ 총 FK 정합성 문제: ${totalIssues}건 발견`);
  }
  console.log('='.repeat(70));

  await pool.end();
}

main().catch(err => {
  console.error('[FATAL]', err);
  pool.end();
  process.exit(1);
});
