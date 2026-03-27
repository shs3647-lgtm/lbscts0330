/**
 * @file seed-sod-m002.mjs
 * @description SOD 기준표에 m002 (12inch Au Bump) 반도체 공정 사례 추가
 * 실행: node scripts/seed-sod-m002.mjs
 */
import pg from 'pg';
const { Client } = pg;

async function main() {
  const c = new Client('postgresql://postgres:1234@localhost:5432/fmea_db');
  await c.connect();
  console.log('Connected');

  // ── Severity: example 필드에 m002 사례 ──
  const sevEx = [
    [1,  '표면 미세 색상 차이 (육안 식별 불가)'],
    [2,  'Bump 표면 미세 스크래치 (기능 무관)'],
    [3,  'Wafer 가장자리 약간의 막두께 편차 (스펙 이내)'],
    [4,  'Bump 외관 불균일 (고객 외관검사 지적 가능)'],
    [5,  'Bump 높이 편차로 Wire bonding 수율 소폭 저하'],
    [6,  '도금 두께 부족으로 Bump shear strength 미달'],
    [7,  'Sputter 접착력 저하 → 후공정 Delamination 발생'],
    [8,  'Bump void → 전기적 open 불량 (Die 기능 상실)'],
    [9,  'Au 오염물질 혼입 → 신뢰성 시험 중 폭발적 열화'],
    [10, 'Wafer 파손 → 장비 내 비산 → 작업자 안전 위협'],
  ];
  for (const [r, ex] of sevEx) {
    await c.query(
      `UPDATE public.pfmea_severity_criteria SET example = $1 WHERE rating = $2`,
      [ex, r]
    );
  }
  console.log('✅ Severity: 10건 m002 사례 추가');

  // ── Occurrence: description에 m002 사례 병기 ──
  const occEx = [
    [1,  '[m002] Poka-Yoke: Wafer 방향 센서 → 역삽입 물리적 차단'],
    [2,  '[m002] Sputter Target kWh 자동교체 (고장이력 0건)'],
    [3,  '[m002] Photo CD SPC (Cpk≥1.67), 간헐적 편차만'],
    [4,  '[m002] Plating 전류밀도 SPC (Cpk≥1.33)'],
    [5,  '[m002] 도금액 4hr ICP 분석, 500 wf당 1건 편차'],
    [6,  '[m002] Etch Bath ±1°C 관리, 200 wf당 1건 이탈'],
    [7,  '[m002] Strip 시간 기본관리, 100 wf당 1건 잔류물'],
    [8,  '[m002] 진공도 기본PM만, 50 wf당 1건 접착력 불량'],
    [9,  '[m002] Chamber 오염 미흡, 20 wf당 1건 파티클'],
    [10, '[m002] 신규 도금액, 기준 없음, 10 wf당 1건+ 불량'],
  ];
  for (const [r, ex] of occEx) {
    // 기존 description 뒤에 m002 사례 추가 (이미 있으면 스킵)
    const cur = await c.query(
      `SELECT description FROM public.pfmea_occurrence_criteria WHERE rating = $1`, [r]
    );
    const curDesc = cur.rows[0]?.description || '';
    if (!curDesc.includes('[m002]')) {
      await c.query(
        `UPDATE public.pfmea_occurrence_criteria SET description = $1 WHERE rating = $2`,
        [curDesc + '\n' + ex, r]
      );
    }
  }
  console.log('✅ Occurrence: 10건 m002 사례 추가');

  // ── Detection: detection 필드에 m002 사례 병기 ──
  const detEx = [
    [1,  '[m002] Wafer 방향 센서 자동정지 (물리적 차단)'],
    [2,  '[m002] 막두께 In-line 전수 9-point + 자동 Reject'],
    [3,  '[m002] AOI 전수검사 + 자동정지 + SEM 확인'],
    [4,  '[m002] CD-SEM 자동측정 (매 lot 5-point 전수)'],
    [5,  '[m002] X-ray Void 검사 (lot당 3매 샘플링)'],
    [6,  '[m002] SPC 모니터링 + 수동 현미경 (Shift별 1회)'],
    [7,  '[m002] 육안 + 수동 치수 (작업자 숙련도 의존)'],
    [8,  '[m002] 이중 육안검사 (QA+공정, 미세결함 한계)'],
    [9,  '[m002] 최종 외관검사만 (공정 중 검사 없음)'],
    [10, '[m002] 검사 미수립 (신규 결함, 기준/방법 없음)'],
  ];
  for (const [r, ex] of detEx) {
    const cur = await c.query(
      `SELECT detection FROM public.pfmea_detection_criteria WHERE rating = $1`, [r]
    );
    const curDet = cur.rows[0]?.detection || '';
    if (!curDet.includes('[m002]')) {
      await c.query(
        `UPDATE public.pfmea_detection_criteria SET detection = $1 WHERE rating = $2`,
        [curDet + '\n' + ex, r]
      );
    }
  }
  console.log('✅ Detection: 10건 m002 사례 추가');

  // ── 검증 ──
  console.log('\n=== 검증 ===');
  const vs = await c.query('SELECT rating, example FROM public.pfmea_severity_criteria ORDER BY rating');
  vs.rows.forEach(r => console.log(`  S${r.rating}: ${r.example || 'NULL'}`));

  const vo = await c.query('SELECT rating, description FROM public.pfmea_occurrence_criteria WHERE rating <= 3 ORDER BY rating');
  vo.rows.forEach(r => console.log(`  O${r.rating}: ${r.description?.substring(0, 80)}`));

  const vd = await c.query('SELECT rating, detection FROM public.pfmea_detection_criteria WHERE rating <= 3 ORDER BY rating');
  vd.rows.forEach(r => console.log(`  D${r.rating}: ${r.detection?.substring(0, 80)}`));

  await c.end();
  console.log('\n✅ SOD m002 사례 추가 완료');
}

main().catch(console.error);
