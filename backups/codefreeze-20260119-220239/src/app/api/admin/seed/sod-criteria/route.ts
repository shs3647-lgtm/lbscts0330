/**
 * @file route.ts
 * @description PFMEA/DFMEA SOD 기준 데이터 시드 API
 * @version 1.0.0
 * @created 2026-01-13
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export const runtime = 'nodejs';

function getPool() {
  return new Pool({ connectionString: process.env.DATABASE_URL });
}

// PFMEA 심각도 기준 (AIAG VDA FMEA Handbook 기반)
const PFMEA_SEVERITY_DATA = [
  { rating: 10, scope: 'USER', effect: '경고 없이 안전에 영향', description: '잠재적 고장형태가 경고 없이 차량 운전이나 조작에 영향을 미침. 작업자 안전 위험', example: '브레이크 고장, 에어백 미작동', isActive: true },
  { rating: 9, scope: 'USER', effect: '경고 후 안전에 영향', description: '잠재적 고장형태가 경고 후 차량 운전이나 조작에 영향을 미침', example: '경고등 점등 후 엔진 정지', isActive: true },
  { rating: 8, scope: 'USER', effect: '차량/아이템 작동 불능', description: '차량이나 아이템이 작동하지 않음 (기본 기능 상실)', example: '시동 불가, 에어컨 미작동', isActive: true },
  { rating: 7, scope: 'USER', effect: '차량/아이템 기능저하', description: '차량이나 아이템의 성능이 저하됨', example: '연비 저하, 출력 감소', isActive: true },
  { rating: 6, scope: 'SP', effect: '라인 정지 (조립 불가)', description: '고객 라인 정지, 조립 불가', example: '부품 미삽입, 간섭', isActive: true },
  { rating: 5, scope: 'SP', effect: '라인 정지 (조립 가능)', description: '고객 라인 정지되나 조립은 가능', example: '조립 지연, 수작업 필요', isActive: true },
  { rating: 4, scope: 'YP', effect: '재작업/폐기 (라인외)', description: '자사 공장에서 라인 외 재작업 또는 폐기', example: '검사 불합격 후 수정', isActive: true },
  { rating: 3, scope: 'YP', effect: '재작업 (라인내)', description: '자사 공장에서 라인 내 재작업', example: '재조립, 재측정', isActive: true },
  { rating: 2, scope: 'YP', effect: '경미한 불편', description: '숙련된 작업자에 의한 경미한 불편', example: '조립 시 약간의 불편', isActive: true },
  { rating: 1, scope: 'YP', effect: '영향 없음', description: '영향이 인지되지 않음', example: '외관상 미세한 차이', isActive: true },
];

// PFMEA 발생도 기준
const PFMEA_OCCURRENCE_DATA = [
  { rating: 10, probability: '≥100/1,000', ppm: '≥100,000', description: '매우 높음: 거의 확실', prevention: '예방관리 없음', isActive: true },
  { rating: 9, probability: '50/1,000', ppm: '50,000', description: '매우 높음: 불가피', prevention: '예방관리 효과 미미', isActive: true },
  { rating: 8, probability: '20/1,000', ppm: '20,000', description: '높음: 반복적 고장', prevention: '예방관리 일부 효과', isActive: true },
  { rating: 7, probability: '10/1,000', ppm: '10,000', description: '높음: 자주 발생', prevention: '예방관리 부분적 효과', isActive: true },
  { rating: 6, probability: '2/1,000', ppm: '2,000', description: '보통: 가끔 발생', prevention: '예방관리 보통 효과', isActive: true },
  { rating: 5, probability: '0.5/1,000', ppm: '500', description: '보통: 드물게 발생', prevention: '예방관리 효과적', isActive: true },
  { rating: 4, probability: '0.1/1,000', ppm: '100', description: '낮음: 매우 드물게', prevention: '예방관리 매우 효과적', isActive: true },
  { rating: 3, probability: '0.01/1,000', ppm: '10', description: '낮음: 거의 발생 안함', prevention: '예방관리 입증됨', isActive: true },
  { rating: 2, probability: '≤0.001/1,000', ppm: '≤1', description: '매우 낮음: 극히 드묾', prevention: '예방관리 완전 입증', isActive: true },
  { rating: 1, probability: '발생 불가', ppm: '0', description: '매우 낮음: 발생 불가', prevention: '설계로 원인 제거', isActive: true },
];

// PFMEA 검출도 기준
const PFMEA_DETECTION_DATA = [
  { rating: 10, maturity: '검출 불가', description: '현재 공정관리로 고장형태/원인을 검출할 수 없거나 검출방법 없음', detection: '검출관리 없음', isActive: true },
  { rating: 9, maturity: '거의 검출 불가', description: '현재 공정관리로 고장형태/원인을 검출할 가능성이 매우 희박', detection: '육안검사만 실시', isActive: true },
  { rating: 8, maturity: '검출 희박', description: '현재 공정관리로 고장형태/원인을 검출할 가능성이 희박', detection: '이중 육안검사', isActive: true },
  { rating: 7, maturity: '매우 낮음', description: '현재 공정관리로 고장형태/원인을 검출할 가능성이 매우 낮음', detection: '샘플링 검사', isActive: true },
  { rating: 6, maturity: '낮음', description: '현재 공정관리로 고장형태/원인을 검출할 가능성이 낮음', detection: '통계적 공정관리 (SPC)', isActive: true },
  { rating: 5, maturity: '보통', description: '현재 공정관리로 고장형태/원인을 검출할 가능성이 보통', detection: '게이지/측정기 검사', isActive: true },
  { rating: 4, maturity: '약간 높음', description: '현재 공정관리로 고장형태/원인을 검출할 가능성이 약간 높음', detection: '자동검사 (후공정)', isActive: true },
  { rating: 3, maturity: '높음', description: '현재 공정관리로 고장형태/원인을 검출할 가능성이 높음', detection: '자동검사 (공정 내)', isActive: true },
  { rating: 2, maturity: '매우 높음', description: '현재 공정관리로 고장형태/원인을 검출할 가능성이 매우 높음', detection: 'Poka-Yoke (공정 내)', isActive: true },
  { rating: 1, maturity: '거의 확실', description: '현재 공정관리로 고장형태/원인을 거의 확실히 검출', detection: 'Poka-Yoke (원인 제거)', isActive: true },
];

// DFMEA 심각도 기준
const DFMEA_SEVERITY_DATA = [
  { rating: 10, scope: 'USER', effect: '경고 없이 안전에 영향', description: '설계 고장형태가 경고 없이 차량 안전운전에 영향을 미침', example: '조향 상실, 제동 불가', isActive: true },
  { rating: 9, scope: 'USER', effect: '경고 후 안전에 영향', description: '설계 고장형태가 경고 후 차량 안전운전에 영향을 미침', example: '경고등 점등 후 기능 상실', isActive: true },
  { rating: 8, scope: 'USER', effect: '차량 작동 불능', description: '차량이 작동하지 않음 (주요 기능 상실)', example: '엔진 시동 불가', isActive: true },
  { rating: 7, scope: 'USER', effect: '차량 성능 저하', description: '차량 성능이 저하됨', example: '가속 성능 저하', isActive: true },
  { rating: 6, scope: 'USER', effect: '편의기능 불량', description: '편의/쾌적 기능 작동 불량', example: '에어컨 미작동', isActive: true },
  { rating: 5, scope: 'SP', effect: '고객 불만 (100%)', description: '모든 고객이 인지하는 문제', example: '소음, 진동', isActive: true },
  { rating: 4, scope: 'SP', effect: '고객 불만 (대부분)', description: '대부분 고객이 인지하는 문제', example: '경미한 외관 문제', isActive: true },
  { rating: 3, scope: 'YP', effect: '고객 불만 (일부)', description: '일부 고객이 인지하는 문제', example: '약간의 불쾌함', isActive: true },
  { rating: 2, scope: 'YP', effect: '고객 불만 (거의 없음)', description: '고객이 거의 인지하지 못하는 문제', example: '미세한 차이', isActive: true },
  { rating: 1, scope: 'YP', effect: '영향 없음', description: '영향이 없음', example: '해당 없음', isActive: true },
];

// DFMEA 발생도 기준
const DFMEA_OCCURRENCE_DATA = [
  { rating: 10, probability: '≥100/1,000', ppm: '≥100,000', description: '매우 높음: 새로운 기술/설계, 적용 경험 없음', prevention: '설계 검증 없음', isActive: true },
  { rating: 9, probability: '50/1,000', ppm: '50,000', description: '높음: 유사 설계에서 문제 발생 이력', prevention: '검증 계획만 수립', isActive: true },
  { rating: 8, probability: '20/1,000', ppm: '20,000', description: '높음: 유사 설계에서 가끔 문제 발생', prevention: '설계 리뷰만 실시', isActive: true },
  { rating: 7, probability: '10/1,000', ppm: '10,000', description: '보통: 유사 설계에서 드물게 문제 발생', prevention: 'DVP&R 계획 수립', isActive: true },
  { rating: 6, probability: '2/1,000', ppm: '2,000', description: '보통: 유사 설계에서 매우 드물게 문제 발생', prevention: '가상 시험 실시', isActive: true },
  { rating: 5, probability: '0.5/1,000', ppm: '500', description: '낮음: 유사 설계로 문제 거의 없음', prevention: '물리 시험 계획', isActive: true },
  { rating: 4, probability: '0.1/1,000', ppm: '100', description: '낮음: 거의 동일한 설계로 문제 없음', prevention: '물리 시험 완료', isActive: true },
  { rating: 3, probability: '0.01/1,000', ppm: '10', description: '매우 낮음: 동일 설계/조건으로 문제 없음', prevention: '양산 경험 있음', isActive: true },
  { rating: 2, probability: '≤0.001/1,000', ppm: '≤1', description: '매우 낮음: 충분한 양산 실적', prevention: '양산 실적 풍부', isActive: true },
  { rating: 1, probability: '발생 불가', ppm: '0', description: '발생 불가: 설계로 원인 제거', prevention: '설계로 원인 제거', isActive: true },
];

// DFMEA 검출도 기준
const DFMEA_DETECTION_DATA = [
  { rating: 10, maturity: '검출 불가', description: '설계관리가 원인/고장형태를 검출할 수 없거나 방법 없음', detection: '검출방법 없음', isActive: true },
  { rating: 9, maturity: '거의 검출 불가', description: '설계관리가 원인/고장형태를 검출할 가능성 매우 희박', detection: '설계 리뷰만 실시', isActive: true },
  { rating: 8, maturity: '검출 희박', description: '설계관리가 원인/고장형태를 검출할 가능성 희박', detection: '체크리스트 리뷰', isActive: true },
  { rating: 7, maturity: '매우 낮음', description: '설계관리가 원인/고장형태를 검출할 가능성 매우 낮음', detection: '과거 데이터 분석', isActive: true },
  { rating: 6, maturity: '낮음', description: '설계관리가 원인/고장형태를 검출할 가능성 낮음', detection: '가상 시험 (CAE)', isActive: true },
  { rating: 5, maturity: '보통', description: '설계관리가 원인/고장형태를 검출할 가능성 보통', detection: '벤치 테스트', isActive: true },
  { rating: 4, maturity: '약간 높음', description: '설계관리가 원인/고장형태를 검출할 가능성 약간 높음', detection: '부품 테스트', isActive: true },
  { rating: 3, maturity: '높음', description: '설계관리가 원인/고장형태를 검출할 가능성 높음', detection: '시스템 테스트', isActive: true },
  { rating: 2, maturity: '매우 높음', description: '설계관리가 원인/고장형태를 검출할 가능성 매우 높음', detection: '차량 테스트', isActive: true },
  { rating: 1, maturity: '거의 확실', description: '설계관리가 원인/고장형태를 거의 확실히 검출', detection: '실주행 검증 완료', isActive: true },
];

/**
 * POST: SOD 기준 데이터 시드 (pg Pool 직접 사용)
 */
export async function POST(request: NextRequest) {
  const pool = getPool();

  try {
    const results: { table: string; created: number }[] = [];

    // Helper: 테이블에 데이터 시드
    async function seedTable(
      tableName: string,
      data: any[],
      columns: string[]
    ): Promise<number> {
      const countResult = await pool.query(`SELECT COUNT(*) FROM ${tableName}`);
      if (parseInt(countResult.rows[0].count, 10) > 0) {
        return 0;
      }

      let created = 0;
      for (const item of data) {
        const values = columns.map((col) => item[col] ?? null);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const colNames = columns.map((c) => `"${c}"`).join(', ');

        await pool.query(
          `INSERT INTO ${tableName} (id, ${colNames}, "sortOrder", "createdAt", "updatedAt") 
           VALUES (gen_random_uuid(), ${placeholders}, $${columns.length + 1}, NOW(), NOW())`,
          [...values, item.rating]
        );
        created++;
      }
      return created;
    }

    // 1. PFMEA 심각도 기준
    const pfmeaSevCount = await seedTable(
      'pfmea_severity_criteria',
      PFMEA_SEVERITY_DATA,
      ['rating', 'scope', 'effect', 'description', 'example', 'isActive']
    );
    results.push({ table: 'pfmea_severity_criteria', created: pfmeaSevCount });

    // 2. PFMEA 발생도 기준
    const pfmeaOccCount = await seedTable(
      'pfmea_occurrence_criteria',
      PFMEA_OCCURRENCE_DATA,
      ['rating', 'probability', 'ppm', 'description', 'prevention', 'isActive']
    );
    results.push({ table: 'pfmea_occurrence_criteria', created: pfmeaOccCount });

    // 3. PFMEA 검출도 기준
    const pfmeaDetCount = await seedTable(
      'pfmea_detection_criteria',
      PFMEA_DETECTION_DATA,
      ['rating', 'maturity', 'description', 'detection', 'isActive']
    );
    results.push({ table: 'pfmea_detection_criteria', created: pfmeaDetCount });

    // 4. DFMEA 심각도 기준
    const dfmeaSevCount = await seedTable(
      'dfmea_severity_criteria',
      DFMEA_SEVERITY_DATA,
      ['rating', 'scope', 'effect', 'description', 'example', 'isActive']
    );
    results.push({ table: 'dfmea_severity_criteria', created: dfmeaSevCount });

    // 5. DFMEA 발생도 기준
    const dfmeaOccCount = await seedTable(
      'dfmea_occurrence_criteria',
      DFMEA_OCCURRENCE_DATA,
      ['rating', 'probability', 'ppm', 'description', 'prevention', 'isActive']
    );
    results.push({ table: 'dfmea_occurrence_criteria', created: dfmeaOccCount });

    // 6. DFMEA 검출도 기준
    const dfmeaDetCount = await seedTable(
      'dfmea_detection_criteria',
      DFMEA_DETECTION_DATA,
      ['rating', 'maturity', 'description', 'detection', 'isActive']
    );
    results.push({ table: 'dfmea_detection_criteria', created: dfmeaDetCount });

    const totalCreated = results.reduce((sum, r) => sum + r.created, 0);

    await pool.end();

    return NextResponse.json({
      success: true,
      message: `SOD 기준 데이터 ${totalCreated}개 생성 완료`,
      results,
    });
  } catch (error: any) {
    console.error('[SOD Criteria Seed API] 오류:', error);
    await pool.end();
    return NextResponse.json(
      { success: false, error: error.message || '시드 실패' },
      { status: 500 }
    );
  }
}

/**
 * GET: SOD 기준 데이터 조회 (pg Pool 직접 사용)
 */
export async function GET(request: NextRequest) {
  const pool = getPool();

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // pfmea | dfmea
    const category = searchParams.get('category'); // severity | occurrence | detection

    const data: any = {};

    if (!type || type === 'pfmea') {
      if (!category || category === 'severity') {
        const result = await pool.query(
          'SELECT * FROM pfmea_severity_criteria ORDER BY rating DESC'
        );
        data.pfmeaSeverity = result.rows;
      }
      if (!category || category === 'occurrence') {
        const result = await pool.query(
          'SELECT * FROM pfmea_occurrence_criteria ORDER BY rating DESC'
        );
        data.pfmeaOccurrence = result.rows;
      }
      if (!category || category === 'detection') {
        const result = await pool.query(
          'SELECT * FROM pfmea_detection_criteria ORDER BY rating DESC'
        );
        data.pfmeaDetection = result.rows;
      }
    }

    if (!type || type === 'dfmea') {
      if (!category || category === 'severity') {
        const result = await pool.query(
          'SELECT * FROM dfmea_severity_criteria ORDER BY rating DESC'
        );
        data.dfmeaSeverity = result.rows;
      }
      if (!category || category === 'occurrence') {
        const result = await pool.query(
          'SELECT * FROM dfmea_occurrence_criteria ORDER BY rating DESC'
        );
        data.dfmeaOccurrence = result.rows;
      }
      if (!category || category === 'detection') {
        const result = await pool.query(
          'SELECT * FROM dfmea_detection_criteria ORDER BY rating DESC'
        );
        data.dfmeaDetection = result.rows;
      }
    }

    await pool.end();

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('[SOD Criteria API] 조회 오류:', error);
    await pool.end();
    return NextResponse.json(
      { success: false, error: error.message || '조회 실패' },
      { status: 500 }
    );
  }
}

