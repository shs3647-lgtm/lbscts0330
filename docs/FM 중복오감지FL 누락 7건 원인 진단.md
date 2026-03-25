/**
 * diagnose-orphan.js
 * FM 중복/★ 오감지 + FL 누락 7건 원인 진단
 *
 * 실행: node scripts/diagnose-orphan.js
 * 위치: C:\autom-fmea\scripts\diagnose-orphan.js
 */

require('dotenv').config()
const { Client } = require('pg')

const SCHEMA = 'pfmea_pfm26_m001'
const DB_URL = process.env.DATABASE_URL

async function main() {
  const client = new Client({ connectionString: DB_URL })
  await client.connect()

  console.log('=== FMEA 고아 데이터 진단 ===\n')

  // ────────────────────────────────────────────────────
  // 1. FM 전체 목록 + 중복 확인
  // ────────────────────────────────────────────────────
  console.log('■ 1. FM 전체 목록 (공정번호 + FM 텍스트)')
  console.log('─'.repeat(60))

  const fmList = await client.query(`
    SELECT
      fm.id,
      fm.mode_name,
      s.process_no,
      s.process_name,
      COUNT(*) OVER (PARTITION BY s.process_no, fm.mode_name) AS dup_count
    FROM ${SCHEMA}.failure_modes fm
    LEFT JOIN ${SCHEMA}.l2_structures s ON s.id = fm.l2_structure_id
    ORDER BY s.process_no, fm.mode_name
  `)

  let dupFound = false
  for (const row of fmList.rows) {
    const dupFlag = row.dup_count > 1 ? ' ← ★중복★' : ''
    console.log(`  [${row.process_no}] ${row.mode_name}${dupFlag}`)
    if (row.dup_count > 1) dupFound = true
  }
  console.log(`\n  총 FM: ${fmList.rows.length}건`)
  console.log(`  중복 존재: ${dupFound ? '⚠️  있음' : '✅ 없음'}`)

  // ★ 기호 포함 FM 확인
  const starFm = fmList.rows.filter(r => r.mode_name && r.mode_name.includes('★'))
  if (starFm.length > 0) {
    console.log(`\n  ⚠️  ★ 기호 포함 FM ${starFm.length}건:`)
    starFm.forEach(r => console.log(`     [${r.process_no}] "${r.mode_name}"`))
  } else {
    console.log(`\n  ✅ ★ 기호 포함 FM: 없음`)
  }

  // ────────────────────────────────────────────────────
  // 2. FL 전체 목록 + 연결 상태
  // ────────────────────────────────────────────────────
  console.log('\n■ 2. FailureLink 연결 상태')
  console.log('─'.repeat(60))

  const flCount = await client.query(`
    SELECT COUNT(*) AS cnt FROM ${SCHEMA}.failure_links
  `)
  console.log(`  저장된 FL: ${flCount.rows[0].cnt}건 (기대: 49건, 차이: ${49 - flCount.rows[0].cnt}건 누락)`)

  // ────────────────────────────────────────────────────
  // 3. FK 고아 전수 검사 (컬럼명 자동 감지)
  // ────────────────────────────────────────────────────
  console.log('\n■ 3. FK 고아 전수 검사')
  console.log('─'.repeat(60))

  // failure_links 컬럼 목록 먼저 확인
  const flCols = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = '${SCHEMA}' AND table_name = 'failure_links'
    ORDER BY ordinal_position
  `)
  const colNames = flCols.rows.map(r => r.column_name)
  console.log(`  failure_links 컬럼: ${colNames.join(', ')}`)

  // FM FK 컬럼 감지
  const fmFkCol = colNames.find(c =>
    c.includes('failure_mode') || c.includes('fm_id') || c === 'fm_cell_id'
  )
  const feFkCol = colNames.find(c =>
    c.includes('failure_effect') || c.includes('fe_id') || c === 'fe_cell_id'
  )
  const fcFkCol = colNames.find(c =>
    c.includes('failure_cause') || c.includes('fc_id') || c === 'cause_cell_id'
  )

  console.log(`  FM FK 컬럼: ${fmFkCol ?? '⚠️ 미감지'}`)
  console.log(`  FE FK 컬럼: ${feFkCol ?? '⚠️ 미감지'}`)
  console.log(`  FC FK 컬럼: ${fcFkCol ?? '⚠️ 미감지'}`)

  if (fmFkCol) {
    const orphanFM = await client.query(`
      SELECT fl.id, fl.${fmFkCol}
      FROM ${SCHEMA}.failure_links fl
      LEFT JOIN ${SCHEMA}.failure_modes fm ON fm.id = fl.${fmFkCol}
      WHERE fm.id IS NULL
    `)
    console.log(`\n  orphan FL→FM: ${orphanFM.rows.length}건 ${orphanFM.rows.length === 0 ? '✅' : '⚠️'}`)
    if (orphanFM.rows.length > 0) {
      orphanFM.rows.forEach(r => console.log(`    FL.id=${r.id}, ${fmFkCol}=${r[fmFkCol]}`))
    }
  }

  if (feFkCol) {
    const orphanFE = await client.query(`
      SELECT fl.id, fl.${feFkCol}
      FROM ${SCHEMA}.failure_links fl
      LEFT JOIN ${SCHEMA}.failure_effects fe ON fe.id = fl.${feFkCol}
      WHERE fe.id IS NULL
    `)
    console.log(`  orphan FL→FE: ${orphanFE.rows.length}건 ${orphanFE.rows.length === 0 ? '✅' : '⚠️'}`)
  }

  if (fcFkCol) {
    const orphanFC = await client.query(`
      SELECT fl.id, fl.${fcFkCol}
      FROM ${SCHEMA}.failure_links fl
      LEFT JOIN ${SCHEMA}.failure_causes fc ON fc.id = fl.${fcFkCol}
      WHERE fc.id IS NULL
    `)
    console.log(`  orphan FL→FC: ${orphanFC.rows.length}건 ${orphanFC.rows.length === 0 ? '✅' : '⚠️'}`)
  }

  // ────────────────────────────────────────────────────
  // 4. 누락 FL 원인 추정 — FC 시트에서 매칭 안 된 FM 목록
  // ────────────────────────────────────────────────────
  console.log('\n■ 4. FL 누락 원인 — DB에 FM은 있지만 FL이 없는 FM')
  console.log('─'.repeat(60))

  let fmWithNoFL
  if (fmFkCol) {
    fmWithNoFL = await client.query(`
      SELECT
        fm.id,
        fm.mode_name,
        s.process_no,
        s.process_name,
        COUNT(fl.id) AS fl_count
      FROM ${SCHEMA}.failure_modes fm
      LEFT JOIN ${SCHEMA}.l2_structures s ON s.id = fm.l2_structure_id
      LEFT JOIN ${SCHEMA}.failure_links fl ON fl.${fmFkCol} = fm.id
      GROUP BY fm.id, fm.mode_name, s.process_no, s.process_name
      HAVING COUNT(fl.id) = 0
      ORDER BY s.process_no
    `)

    if (fmWithNoFL.rows.length === 0) {
      console.log('  ✅ 모든 FM에 FL 연결 있음')
    } else {
      console.log(`  ⚠️  FL이 없는 FM ${fmWithNoFL.rows.length}건: ← 이것이 누락 원인`)
      fmWithNoFL.rows.forEach(r => {
        console.log(`    [공정 ${r.process_no}] "${r.mode_name}"`)
        console.log(`      → FC 시트에 이 FM이 없거나 명칭 불일치`)
      })
    }
  }

  // ────────────────────────────────────────────────────
  // 5. 공정별 FM/FL 현황 요약
  // ────────────────────────────────────────────────────
  console.log('\n■ 5. 공정별 FM / FL 현황')
  console.log('─'.repeat(60))

  const procSummary = await client.query(`
    SELECT
      s.process_no,
      s.process_name,
      COUNT(DISTINCT fm.id) AS fm_count,
      COUNT(fl.id) AS fl_count
    FROM ${SCHEMA}.l2_structures s
    LEFT JOIN ${SCHEMA}.failure_modes fm ON fm.l2_structure_id = s.id
    LEFT JOIN ${SCHEMA}.failure_links fl ON fl.${fmFkCol ?? 'failure_mode_id'} = fm.id
    GROUP BY s.process_no, s.process_name
    ORDER BY s.process_no
  `)

  console.log('  공정번호  공정명                FM건  FL건  상태')
  for (const r of procSummary.rows) {
    const status = r.fl_count === 0 && r.fm_count > 0
      ? '⚠️  FL 없음'
      : r.fl_count > 0
        ? '✅'
        : '─ (FM없음)'
    console.log(
      `  ${String(r.process_no).padEnd(8)} ${r.process_name.substring(0, 20).padEnd(22)} FM=${r.fm_count}  FL=${r.fl_count}  ${status}`
    )
  }

  // ────────────────────────────────────────────────────
  // 6. 진단 결론 + 권고 조치
  // ────────────────────────────────────────────────────
  console.log('\n■ 6. 진단 결론 및 권고 조치')
  console.log('═'.repeat(60))

  const totalFm = fmList.rows.length
  const totalFl = parseInt(flCount.rows[0].cnt)
  const missingFl = 49 - totalFl
  const fllessFM = fmWithNoFL ? fmWithNoFL.rows.length : '?'

  console.log(`
  현재 상태:
    FM = ${totalFm}건 (고유값 17건 vs 파싱 18건 → 중복 ${dupFound ? '있음⚠️' : '없음✅'})
    FL = ${totalFl}건 / 기대 49건 → ${missingFl}건 누락
    FL 없는 FM = ${fllessFL}건

  권고 조치:
`)

  if (dupFound || starFm.length > 0) {
    console.log(`  [FM 중복/★ 오감지]
    → 엑셀 L2통합 시트에서 해당 FM 행 확인
    → ★ 기호가 셀 값으로 있으면 해당 행 삭제 후 재import
    → 중복 FM이면 두 행 중 하나 삭제 후 재import
`)
  }

  if (missingFl > 0) {
    console.log(`  [FL 누락 ${missingFl}건 — 엑셀 보완 필요]
    → FC 시트에서 위 "FL 없는 FM" 목록의 공정번호+FM을 검색
    → FC 시트에 해당 FM 행이 없으면 → 엑셀에 추가 후 재import
    → FC 시트에 있지만 명칭이 다르면 → A5/FC 명칭 통일 후 재import
    → 데이터 삭제나 추정 보완은 하지 말 것 (원본 엑셀 수정이 SSOT)
`)
  }

  await client.end()
  console.log('진단 완료')
}

main().catch(e => {
  console.error('오류:', e.message)
  process.exit(1)
})