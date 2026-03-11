/**
 * @file route.ts
 * @description PFMEA/DFMEA SOD 기준 데이터 시드 API
 * @version 2.0.0 — AIAG VDA FMEA 1st Edition (2차 정오표 반영)
 * @created 2026-01-13
 * @updated 2026-02-21 — PFMEA+DFMEA 최종본(정오표반영_최종.xlsx) 기반 전면 업데이트
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export const runtime = 'nodejs';

function getPool() {
  return new Pool({ connectionString: process.env.DATABASE_URL });
}

// ============================================================
// PFMEA 심각도 기준 — AIAG VDA FMEA 1st Edition (TABLE P1)
// 3열 구조: 자사공장(YP) | 고객사(SP) | 최종사용자(USER)
// ============================================================
const PFMEA_SEVERITY_DATA = [
  { rating: 10, scope: 'USER', effect: '매우 높음', description: '[정오표] 자사: 제조/조립 근로자 건강·안전 리스크 초래 가능 | 고객사: 동일 | 최종: 차량 안전운행, 운전자·승객·보행자 건강에 영향', example: '브레이크 고장, 에어백 미작동', isActive: true },
  { rating: 9, scope: 'USER', effect: '매우 높음', description: '자사: 공장 내 규제 미준수 | 고객사: 공장 내 규제 미준수 | 최종: 규제사항 미준수', example: '배출가스 기준 초과, 안전규격 미충족', isActive: true },
  { rating: 8, scope: 'USER', effect: '보통 높음', description: '[정오표] 자사: 생산 제품 100% 폐기 가능 | 고객사: 1Shift 이상 라인중단, 출하중단, 규정미준수 이외 필드수리/교체 | 최종: 정상주행에 필요한 주요기능 상실', example: '엔진 시동 불가, 변속기 작동 불능', isActive: true },
  { rating: 7, scope: 'USER', effect: '보통 높음', description: '자사: 제품 선별·일부(100%미만) 폐기, 공정 기준이탈·라인속도저하·인력추가 | 고객사: 1시간~1Shift 라인중단, 출하중단, 규정미준수 이외 필드수리/교체 | 최종: 주요기능 저하', example: '연비 저하, 출력 감소, 조향 이상', isActive: true },
  { rating: 6, scope: 'SP', effect: '중간', description: '자사: 100% 라인밖 재작업 및 승인 | 고객사: 최대 1시간 라인중단 | 최종: 보조기능 상실', example: '에어컨 미작동, 와이퍼 불량', isActive: true },
  { rating: 5, scope: 'SP', effect: '중간', description: '자사: 일부 라인밖 재작업 및 승인 | 고객사: 100%미만 영향, 선별필요, 라인중단 없음 | 최종: 보조기능 저하', example: '에어컨 성능 저하, 윈도우 느림', isActive: true },
  { rating: 4, scope: 'YP', effect: '중간', description: '자사: 100% 스테이션 내 재작업 | 고객사: 중대한 대응계획 유발, 추가결함 없음, 선별불필요 | 최종: 매우 좋지않은 외관·소리·진동·거친소리·촉각', example: '심한 소음, 진동, 외관 결함', isActive: true },
  { rating: 3, scope: 'YP', effect: '낮음', description: '자사: 일부 스테이션 내 재작업 | 고객사: 경미한 대응계획 유발, 추가결함 없음, 선별불필요 | 최종: 중간정도 좋지않은 외관·소리·진동·거친소리·촉각', example: '경미한 소음, 약간의 진동', isActive: true },
  { rating: 2, scope: 'YP', effect: '낮음', description: '자사: 공정·작업·작업자에게 약간의 불편 | 고객사: 대응계획 없음, 선별불필요, 공급자 피드백 요구 | 최종: 약간 좋지않은 외관·소리·진동·거친소리·촉각', example: '미세한 외관 차이, 약간의 불편', isActive: true },
  { rating: 1, scope: 'YP', effect: '매우 낮음', description: '자사: 식별 가능한 영향 없음 | 고객사: 식별 가능한 영향 없음 | 최종: 인지할 수 있는 영향 없음', example: '영향 없음', isActive: true },
];

// ============================================================
// PFMEA 발생도 기준 — AIAG VDA FMEA 1st Edition (TABLE P2)
// 관리유형: 없음 / 행동적(Behavioral) / 기술적(Technical) / 모범사례
// ============================================================
const PFMEA_OCCURRENCE_DATA = [
  { rating: 10, probability: '≥100/1,000', ppm: '≥100,000', description: '극도로 높음: 관리유형 없음, 예방관리 없음', prevention: '예방관리 없음', isActive: true },
  { rating: 9, probability: '50/1,000', ppm: '50,000', description: '매우 높음: 행동적 관리, 예방관리가 고장원인 예방에 거의 효과 없음', prevention: '예방관리 효과 거의 없음 (행동적)', isActive: true },
  { rating: 8, probability: '20/1,000', ppm: '20,000', description: '매우 높음: 행동적 관리, 예방관리가 고장원인 예방에 거의 효과 없음', prevention: '예방관리 효과 미미 (행동적)', isActive: true },
  { rating: 7, probability: '10/1,000', ppm: '10,000', description: '높음: 행동적 또는 기술적 관리, 예방관리가 고장원인 예방에 다소 효과적', prevention: '예방관리 다소 효과적 (행동적/기술적)', isActive: true },
  { rating: 6, probability: '2/1,000', ppm: '2,000', description: '높음: 행동적 또는 기술적 관리, 예방관리가 고장원인 예방에 다소 효과적', prevention: '예방관리 다소 효과적 (행동적/기술적)', isActive: true },
  { rating: 5, probability: '0.5/1,000', ppm: '500', description: '중간: 행동적 또는 기술적 관리, 예방관리가 고장원인 예방에 효과적', prevention: '예방관리 효과적 (행동적/기술적)', isActive: true },
  { rating: 4, probability: '0.1/1,000', ppm: '100', description: '중간: 행동적 또는 기술적 관리, 예방관리가 고장원인 예방에 효과적', prevention: '예방관리 효과적 (행동적/기술적)', isActive: true },
  { rating: 3, probability: '0.01/1,000', ppm: '10', description: '낮음: 모범사례/행동적/기술적 관리, 예방관리가 고장원인 예방에 매우 효과적', prevention: '예방관리 매우 효과적 (모범사례)', isActive: true },
  { rating: 2, probability: '≤0.001/1,000', ppm: '≤1', description: '매우 낮음: 모범사례/기술적 관리, 예방관리가 고장원인 예방에 매우 효과적', prevention: '예방관리 매우 효과적 (기술적)', isActive: true },
  { rating: 1, probability: '발생 불가', ppm: '0', description: '극도로 낮음: 기술적 관리, 설계(부품형상) 또는 공정(지그/치공구)으로 고장원인 제거, 물리적 생산 불가', prevention: '설계/공정으로 고장원인 제거 (기술적)', isActive: true },
];

// ============================================================
// PFMEA 검출도 기준 — AIAG VDA FMEA 1st Edition (TABLE P3)
// 2열 구조: 검출방법 성숙도(Detection Method Maturity) + 검출기회(Opportunity for Detection)
// ============================================================
const PFMEA_DETECTION_DATA = [
  { rating: 10, maturity: '매우 낮음', description: '시험 또는 검사방법이 수립되거나 알려지지 않음', detection: '고장형태가 검출되지 않거나 검출될 수 없음', isActive: true },
  { rating: 9, maturity: '매우 낮음', description: '시험 또는 검사방법이 고장형태를 검출할 가능성이 낮음', detection: '무작위 또는 산발적 심사를 통해 쉽게 검출되지 않음', isActive: true },
  { rating: 8, maturity: '낮음', description: '시험/검사방법이 효과적이고 신뢰할 만한 것으로 입증되지 않음 (경험 없음, 게이지 R&R 미비)', detection: '사람의 검사(시각/촉각/청각) 또는 수동 게이지(계량형/계수형)로 검출해야 함', isActive: true },
  { rating: 7, maturity: '낮음', description: '시험/검사방법이 효과적이고 신뢰할 만한 것으로 입증되지 않음', detection: '기계기반 검출(조명/부저, 자동/반자동) 또는 CMM 등 검사장비로 검출해야 함', isActive: true },
  { rating: 6, maturity: '중간', description: '시험/검사방법이 효과적이고 신뢰할 수 있으며 입증됨 (경험 있음, 게이지 R&R 수용 가능)', detection: '사람의 검사(시각/촉각/청각) 또는 수동 게이지(계량형/계수형)로 검출 가능', isActive: true },
  { rating: 5, maturity: '중간', description: '시험/검사방법이 효과적이고 신뢰할 수 있으며 입증됨', detection: '기계기반 검출(반자동, 조명/부저) 또는 CMM 등 검사장비로 검출 가능 (제품샘플검사 포함)', isActive: true },
  { rating: 4, maturity: '높음', description: '시스템이 효과적이고 신뢰할 수 있으며 입증됨 (경험 있음, 게이지 R&R 수용 가능)', detection: '하류부문에서 기계기반 자동검출, 추가유출 방지, 불합격 자동취출', isActive: true },
  { rating: 3, maturity: '높음', description: '시스템이 효과적이고 신뢰할 수 있으며 입증됨 (동일 공정/적용 경험)', detection: '스테이션내에서 기계기반 자동검출, 추가유출 방지, 불합격 자동취출', isActive: true },
  { rating: 2, maturity: '높음', description: '검출방법이 효과적이고 신뢰할 수 있음 (경험 있음, 실수방지 검증)', detection: '원인을 검출하고 고장형태(불량품)가 생산되지 않도록 하는 기계기반 검출', isActive: true },
  { rating: 1, maturity: '매우 높음', description: '고장형태는 물리적으로 설계 또는 생산될 수 없으며, 항상 검출이 입증됨', detection: '고장형태 또는 고장원인의 검출이 항상 입증된 방법', isActive: true },
];

// ============================================================
// DFMEA 심각도 기준 — AIAG VDA FMEA 1st Edition (TABLE D1)
// 최종사용자 관점 단일 기준
// ============================================================
const DFMEA_SEVERITY_DATA = [
  { rating: 10, scope: 'USER', effect: '매우 높음', description: '자동차 및/또는 다른 자동차의 안전 운행, 운전자, 승객 또는 도로 사용자나 보행자의 건강에 영향을 미침', example: '조향 상실, 제동 불가', isActive: true },
  { rating: 9, scope: 'USER', effect: '매우 높음', description: '규제사항 미준수', example: '배출가스 기준 초과, 안전규격 미충족', isActive: true },
  { rating: 8, scope: 'USER', effect: '높음', description: '기대되는 사용 수명 기간 동안 정상 주행에 필요한 자동차 주요 기능의 상실', example: '엔진 시동 불가, 변속기 고장', isActive: true },
  { rating: 7, scope: 'USER', effect: '높음', description: '기대되는 사용 수명 기간 동안 정상 주행에 필요한 자동차 주요 기능의 저하', example: '가속 성능 저하, 제동거리 증가', isActive: true },
  { rating: 6, scope: 'USER', effect: '중간', description: '자동차 보조 기능 상실', example: '에어컨 미작동, 오디오 고장', isActive: true },
  { rating: 5, scope: 'USER', effect: '중간', description: '자동차 보조 기능 저하', example: '에어컨 성능 저하, 오디오 잡음', isActive: true },
  { rating: 4, scope: 'USER', effect: '중간', description: '매우 좋지 않은 외관, 소리, 진동, 거친소리(harshness) 또는 촉각(haptics)', example: '심한 소음, 진동, 외관 결함', isActive: true },
  { rating: 3, scope: 'USER', effect: '낮음', description: '중간 정도의 (좋지 않은) 외관, 소리, 진동, 거친 소리 또는 촉각', example: '경미한 소음, 약간의 진동', isActive: true },
  { rating: 2, scope: 'USER', effect: '낮음', description: '약간의 (좋지 않은) 외관, 소리, 진동, 거친 소리 또는 촉각', example: '미세한 외관 차이', isActive: true },
  { rating: 1, scope: 'USER', effect: '매우 낮음', description: '인지할 수 있는 영향 없음', example: '영향 없음', isActive: true },
];

// ============================================================
// DFMEA 발생도 기준 — AIAG VDA FMEA 1st Edition (TABLE D2, 2차 정오표)
// 각 등급별 ①~⑤ 하위 판단기준 포함
// ============================================================
const DFMEA_OCCURRENCE_DATA = [
  { rating: 10, probability: '≥100/1,000', ppm: '≥100,000', description: '극도로 높음: 운행 경험 없이 새로운 기술 최초 적용(통제되지 않는 운행 조건). 제품 검증/실현성확인/타당성확인 경험 없음. 표준 미존재. 예방관리가 필드 성능 예측 불가', prevention: '예방관리 없음 또는 필드성능 예측 불가', isActive: true },
  { rating: 9, probability: '50/1,000', ppm: '50,000', description: '매우 높음: 사내 기술 혁신/재료 최초 사용. Duty cycle/운행 조건 변경. 제품 검증/실현성확인/타당성확인 경험 없음. 예방관리가 특정 요구사항 성능 미표적', prevention: '예방관리가 특정 요구사항 성능 미표적', isActive: true },
  { rating: 8, probability: '20/1,000', ppm: '20,000', description: '매우 높음: 새 적용에 기술 혁신/재료 최초 사용. Duty cycle/운행 조건 변경. 검증 경험 없음. 기존 표준/모범 사례 부족. 예방관리가 필드 성능에 신뢰할 수 있는 지표 아님', prevention: '예방관리가 필드성능에 신뢰할 만한 지표 아님', isActive: true },
  { rating: 7, probability: '10/1,000', ppm: '10,000', description: '높음: 유사 기술/재료 기반 새 설계. Duty cycle/운행 조건 변경. 검증 경험 없음. 표준/모범 사례가 기본 설계만 적용(혁신 미적용). 예방관리 제한적 지표', prevention: '표준/모범사례가 혁신에는 미적용', isActive: true },
  { rating: 6, probability: '2/1,000', ppm: '2,000', description: '높음: 기존 기술/재료의 이전 설계와 유사. Duty cycle/운행 조건 변경. 시험/필드 경험 있음. 표준 존재하나 불충분. 예방관리 일부 능력 제공', prevention: '예방관리가 고장원인 예방 일부 능력 제공', isActive: true },
  { rating: 5, probability: '0.5/1,000', ppm: '500', description: '중간: 입증된 기술/재료의 이전 설계 세부 변경. 유사 적용/duty cycle. 시험/필드 경험 있음. 학습 교훈 적용, 모범 사례 재평가(미입증). 예방관리 일부 성능 지표 제공', prevention: '학습교훈 적용, 모범사례 재평가(미입증)', isActive: true },
  { rating: 4, probability: '0.1/1,000', ppm: '100', description: '중간: 단기 필드 노출의 거의 동일 설계. Duty cycle/운행 조건 약간 변경. 시험/필드 경험 있음. 모범 사례/표준/시방 부합. 예방관리 설계 적합성 표시', prevention: '모범사례/표준/시방 준수, 설계적합성 표시', isActive: true },
  { rating: 3, probability: '0.01/1,000', ppm: '10', description: '낮음: 알려진 설계 세부 변경. 비교 가능한 운행 조건 시험/필드 경험. 성공적 시험 절차 보유. 표준/모범 사례 적합 기대. 예방관리 생산 설계 적합성 예측', prevention: '성공적 시험절차 보유, 생산설계 적합성 예측', isActive: true },
  { rating: 2, probability: '<0.001/1,000', ppm: '≤1', description: '매우 낮음: 장기 필드 노출의 거의 동일 성숙 설계. 비교 가능한 duty cycle/운행 조건. 표준/학습 교훈/모범 사례 적합 설계. 예방관리 설계 적합성 확신', prevention: '표준/학습교훈/모범사례 적합, 설계적합성 확신', isActive: true },
  { rating: 1, probability: '발생 불가', ppm: '0', description: '극도로 낮음: 예방관리를 통해 고장이 제거되며, 고장 원인은 설계상 발생이 불가능', prevention: '예방관리로 고장 제거, 설계로 발생 불가', isActive: true },
];

// ============================================================
// DFMEA 검출도 기준 — AIAG VDA FMEA 1st Edition (TABLE D3)
// 2열 구조: 검출방법 성숙도 + 검출기회(시험유형: 합격-불합격/불합격/성능저하)
// ============================================================
const DFMEA_DETECTION_DATA = [
  { rating: 10, maturity: '매우 낮음', description: '아직 개발되지 않은 시험 절차', detection: '시험 방법이 정의되지 않음', isActive: true },
  { rating: 9, maturity: '매우 낮음', description: '고장 형태 또는 원인을 검출하도록 구체적으로 설계되지 않은 시험 방법', detection: '합격-불합격, 불합격 시험, 저하 시험', isActive: true },
  { rating: 8, maturity: '낮음', description: '새로운 시험 방법; 입증되지 않음', detection: '합격-불합격, 불합격 시험, 저하 시험', isActive: true },
  { rating: 7, maturity: '낮음', description: '새로운 시험방법; 양산승인 전 양산 툴 변경을 위한 시간이 충분하지 못함', detection: '합격-불합격 시험', isActive: true },
  { rating: 6, maturity: '중간', description: '기능 검증 또는 성능, 품질, 신뢰성 및 내구성의 유효성확인을 위한 입증된 시험방법; 제품개발 사이클 후반부에 계획됨', detection: '불합격 시험(Test-to-Failure)', isActive: true },
  { rating: 5, maturity: '중간', description: '기능 검증 또는 성능, 품질, 신뢰성 및 내구성의 유효성확인을 위한 입증된 시험방법; 제품개발 사이클 후반부에 계획됨', detection: '저하 시험 (성능저하/열화)', isActive: true },
  { rating: 4, maturity: '높음', description: '성능, 품질, 신뢰성 및 내구성의 기능검증 또는 실현성확인/타당성확인을 위한 입증된 시험방법; 불출 전 생산 도구 수정에 충분한 타이밍', detection: '합격-불합격, 불합격 시험', isActive: true },
  { rating: 3, maturity: '높음', description: '성능, 품질, 신뢰성 및 내구성의 기능검증 또는 실현성확인/타당성확인을 위한 입증된 시험방법; 불출 전 생산 도구 수정에 충분한 타이밍', detection: '불합격 시험(Test-to-Failure)', isActive: true },
  { rating: 2, maturity: '높음', description: '성능, 품질, 신뢰성 및 내구성의 기능검증 또는 실현성확인/타당성확인을 위한 입증된 시험방법; 불출 전 생산 도구 수정에 충분한 타이밍', detection: '저하 시험 (성능저하/열화)', isActive: true },
  { rating: 1, maturity: '매우 높음', description: '시험 전에 고장 형태 또는 원인이 발생할 수 없음을 확인하거나, 항상 검출이 입증된 검출 방법', detection: '고장형태/원인이 항상 검출되는 것으로 입증', isActive: true },
];

/**
 * POST: SOD 기준 데이터 시드 (pg Pool 직접 사용)
 */
export async function POST(request: NextRequest) {
  const pool = getPool();

  try {
    const results: { table: string; created: number }[] = [];

    // Helper: 테이블에 데이터 시드 (테이블명은 하드코딩된 값만 허용)
    const VALID_SOD_TABLES = new Set([
      'pfmea_severity_criteria', 'pfmea_occurrence_criteria', 'pfmea_detection_criteria',
      'dfmea_severity_criteria', 'dfmea_occurrence_criteria', 'dfmea_detection_criteria',
    ]);
    async function seedTable(
      tableName: string,
      data: any[],
      columns: string[]
    ): Promise<number> {
      // SQL Injection 방지: 허용된 테이블명만 사용
      if (!VALID_SOD_TABLES.has(tableName)) throw new Error(`Invalid table: ${tableName}`);
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

    // ★ SOD 기준표는 변경이 드문 참조 데이터 → 5분 캐시
    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=60' },
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

