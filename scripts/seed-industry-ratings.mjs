/**
 * @file seed-industry-ratings.mjs
 * @description 산업DB DC/PC에 SOD 기본 레이팅 추가
 *
 * DC (검출관리) → defaultRating = D값 (1=검출확실, 10=검출불가)
 * PC (예방관리) → defaultRating = O값 (1=발생차단, 10=관리없음)
 *
 * 실행: node scripts/seed-industry-ratings.mjs
 */
import pg from 'pg';
const { Client } = pg;

async function main() {
  const c = new Client('postgresql://postgres:1234@localhost:5432/fmea_db');
  await c.connect();

  // ── DC 레이팅: 검출방법 효과 → D값 ──
  // D값이 낮을수록 검출이 확실함 (1=자동전수+정지, 10=검사없음)
  const dcRatings = {
    // semiconductor (반도체)
    '4-Point Probe 두께 측정':           3,  // 자동 전수 + 정량
    'Particle Counter 파티클 측정':      3,  // 자동 연속 모니터링
    'AVI 자동외관검사 장비':             3,  // 자동 전수 + 자동정지
    '3D Profiler 높이 측정':             3,  // 자동 정밀 정량
    'Overlay Measurement (오버레이 측정)': 4,  // 자동 연속 측정
    'Ball Shear Test (볼 전단 시험)':    5,  // 파괴 검사, 샘플링
    'Open/Short Test (전기 테스트)':     2,  // 전수 자동 전기검사
    'SEM 단면 분석 (샘플링)':            6,  // 샘플링, 고비용
    'CD-SEM 임계치수 측정':              3,  // 자동 정밀 측정
    '4-Point Probe 면저항 측정':         3,  // 자동 전수
    // plating
    'XRF 도금 두께 측정':                4,  // 비파괴 자동
    'Tape Test (테이프 밀착 시험)':      6,  // 수동, 주관적
    // sputter
    'Ellipsometer 박막 두께 측정':       3,  // 자동 정밀
    'EDS/WDS 성분 분석':                 5,  // 간헐적 샘플링
    // etching
    'Step Profiler 식각 깊이 측정':      4,  // 자동 정량
    // press
    '육안검사 + 확대경(10X)':            7,  // 수동, 작업자 의존
    '형광 침투 검사 (PT)':               5,  // 간헐적 + 전문가
    // welding
    '인장 강도 시험 + X-ray':            4,  // 파괴+비파괴 병행
    // coating
    '도막 두께 측정 + 밀착력 시험':      5,  // 복합 검사
    // assembly
    '토크 렌치 검사 + 디지털 토크계':    4,  // 정량 자동
    'Helium Leak Test (헬륨 누설 시험)': 2,  // 고감도 자동
    // cleaning
    'Ion Chromatography (이온 잔류량 분석)': 4, // 정량 분석
    // inspection
    'OCR Reader (자동 ID 판독)':         2,  // 자동 전수
    // automotive
    'CMM 3차원 측정':                    3,  // 자동 정밀 측정
    'Rockwell / Vickers 경도 시험':      5,  // 간헐적 파괴
  };

  // ── PC 레이팅: 예방방법 효과 → O값 ──
  // O값이 낮을수록 예방이 확실함 (1=물리적차단, 10=관리없음)
  const pcRatings = {
    // equipment
    '장비 정기 PM (Preventive Maintenance)': 4,
    '설비 일일 점검 + 주간 정비':         4,
    '전원 안정화 장치 (UPS/AVR) 설치':    2,  // 하드웨어 자동 보호
    '온도 실시간 모니터링 + 인터록':      2,  // 인터록 = 자동 차단
    '압력 센서 실시간 감시 + 알람':       3,  // 센서 + 알람
    '진공 챔버 기밀 점검 + 진공도 인터록': 2,  // 인터록
    // material
    '입고 검사 (IQC) + CoA 확인':         4,  // 수동 + 서류
    '약품 농도 주기적 분석 + 자동보충':   3,  // 자동보충 시스템
    'Target 잔량 자동 모니터링 + 소진 알람': 3, // 자동 모니터링
    '가스 순도 인증서 확인 + 정기 교체':  4,  // 수동 관리
    // operator
    '작업 표준서 교육 + 자격 인증':       5,  // 사람 의존
    '정기 숙련도 평가 + OJT 교육':        5,  // 사람 의존
    'Poka-Yoke (실수방지) 장치 설치':     1,  // 물리적 차단!
    // environment
    '클린룸 환경 모니터링 (온습도/파티클)': 3, // 자동 모니터링
    'ESD 방지 장비 + 접지 주기점검':      3,  // 하드웨어+점검
    '방진대 설치 + 진동 모니터링':        3,  // 하드웨어+모니터링
    // process
    'Recipe 변경 승인 제도 + Lock':       3,  // 시스템 잠금
    '계측기 정기 교정 (MSA/Gage R&R)':    4,  // 정기 수동
    'SPC 실시간 관리 (X-bar R Chart)':    3,  // 통계적 관리
    '예방 정비 계획 (PM Schedule)':       4,  // 계획 기반
    // solder
    '리플로우 프로파일 주기 검증':        4,  // 주기적 검증
    // plating
    '도금액 성분 분석 + Hull Cell Test':  4,  // 분석+시험
    // sputter
    'Sputter Recipe 승인제도 + 작업표준': 4,  // 관리 제도
    // etching
    '식각액 농도/온도 실시간 관리':       3,  // 실시간 자동
    // cleaning
    '세정액 교체주기 관리 + 잔류량 모니터링': 4, // 주기 관리
  };

  console.log('── DC 레이팅 업데이트 ──');
  let dcUpdated = 0;
  for (const [method, rating] of Object.entries(dcRatings)) {
    const res = await c.query(
      `UPDATE public.kr_industry_detection SET "defaultRating" = $1 WHERE method = $2`,
      [rating, method]
    );
    if (res.rowCount > 0) { dcUpdated++; console.log(`  D${rating} ← ${method}`); }
  }
  console.log(`  총 ${dcUpdated}건 업데이트\n`);

  console.log('── PC 레이팅 업데이트 ──');
  let pcUpdated = 0;
  for (const [method, rating] of Object.entries(pcRatings)) {
    const res = await c.query(
      `UPDATE public.kr_industry_prevention SET "defaultRating" = $1 WHERE method = $2`,
      [rating, method]
    );
    if (res.rowCount > 0) { pcUpdated++; console.log(`  O${rating} ← ${method}`); }
  }
  console.log(`  총 ${pcUpdated}건 업데이트\n`);

  // 검증
  console.log('=== 검증 ===');
  const vdc = await c.query('SELECT method, "defaultRating" FROM public.kr_industry_detection WHERE "defaultRating" IS NOT NULL ORDER BY "defaultRating"');
  console.log(`DC: ${vdc.rows.length}건 레이팅 완료`);
  const vpc = await c.query('SELECT method, "defaultRating" FROM public.kr_industry_prevention WHERE "defaultRating" IS NOT NULL ORDER BY "defaultRating"');
  console.log(`PC: ${vpc.rows.length}건 레이팅 완료`);
  const nullDc = await c.query('SELECT COUNT(*) FROM public.kr_industry_detection WHERE "defaultRating" IS NULL');
  const nullPc = await c.query('SELECT COUNT(*) FROM public.kr_industry_prevention WHERE "defaultRating" IS NULL');
  console.log(`DC 미레이팅: ${nullDc.rows[0].count}건, PC 미레이팅: ${nullPc.rows[0].count}건`);

  await c.end();
  console.log('\n✅ 산업DB SOD 레이팅 완료');
}

main().catch(console.error);
