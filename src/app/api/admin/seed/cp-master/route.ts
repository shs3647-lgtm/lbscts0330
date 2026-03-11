/**
 * @file route.ts
 * @description CP 기초정보 마스터 데이터 시드 API
 * @version 1.0.0
 * @created 2026-01-13
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export const runtime = 'nodejs';

function getPool() {
  return new Pool({ connectionString: process.env.DATABASE_URL });
}

// CP 공정현황 샘플 데이터
const CP_PROCESS_DATA = [
  { processNo: '10', processName: '자재입고', level: 'Main', processDesc: '원부자재 입고 및 검수', equipment: '자동창고, 지게차' },
  { processNo: '20', processName: '수입검사', level: 'Main', processDesc: '원부자재 샘플링 수입검사', equipment: 'Mooney Viscometer, 경도계' },
  { processNo: '30', processName: 'MB Mixing', level: 'Main', processDesc: 'Master Batch 배합 믹싱', equipment: '믹서, 온도계' },
  { processNo: '40', processName: 'FB Mixing', level: 'Main', processDesc: 'Final Batch 배합 믹싱', equipment: '믹서, 압출기' },
  { processNo: '50', processName: '압출', level: 'Main', processDesc: '고무 압출 공정', equipment: '압출기, 냉각기' },
  { processNo: '60', processName: '재단', level: 'Main', processDesc: '고무 시트 재단', equipment: '재단기, 계량기' },
  { processNo: '70', processName: '성형', level: 'Main', processDesc: '타이어 성형', equipment: '성형기, 드럼' },
  { processNo: '80', processName: '가류', level: 'Main', processDesc: '타이어 가류(가황)', equipment: '가류기, 온도센서' },
  { processNo: '90', processName: '최종검사', level: 'Main', processDesc: '완제품 최종 검사', equipment: '유니포미티 머신, X-Ray' },
  { processNo: '100', processName: '출하', level: 'Main', processDesc: '완제품 출하', equipment: '컨베이어, 적재기' },
];

// CP 검출장치 샘플 데이터
const CP_DETECTOR_DATA = [
  { processNo: '10', processName: '자재입고', ep: 'EP-001', autoDetector: '바코드 스캐너' },
  { processNo: '20', processName: '수입검사', ep: 'EP-002', autoDetector: '자동 측정기' },
  { processNo: '30', processName: 'MB Mixing', ep: 'EP-003', autoDetector: '온도 모니터링' },
  { processNo: '40', processName: 'FB Mixing', ep: 'EP-004', autoDetector: '레오미터' },
  { processNo: '50', processName: '압출', ep: 'EP-005', autoDetector: '두께 측정기' },
  { processNo: '60', processName: '재단', ep: 'EP-006', autoDetector: '중량 계량기' },
  { processNo: '70', processName: '성형', ep: 'EP-007', autoDetector: '비전 검사' },
  { processNo: '80', processName: '가류', ep: 'EP-008', autoDetector: '온도/압력 센서' },
  { processNo: '90', processName: '최종검사', ep: 'EP-009', autoDetector: 'X-Ray, 유니포미티' },
  { processNo: '100', processName: '출하', ep: 'EP-010', autoDetector: '라벨 검사기' },
];

// CP 관리항목 샘플 데이터
const CP_CONTROL_ITEM_DATA = [
  { processNo: '10', processName: '자재입고', productChar: '이물질', processChar: '입고 상태', specialChar: '', specTolerance: '이물질 없음' },
  { processNo: '10', processName: '자재입고', productChar: '포장 상태', processChar: '포장 무결성', specialChar: '', specTolerance: '파손 없음' },
  { processNo: '20', processName: '수입검사', productChar: 'Mooney', processChar: '측정 정확도', specialChar: 'CC', specTolerance: '50±5 MU' },
  { processNo: '30', processName: 'MB Mixing', productChar: 'Rheometer', processChar: '믹싱 RPM', specialChar: 'IC', specTolerance: 'T90: 5±1분' },
  { processNo: '30', processName: 'MB Mixing', productChar: 'Rheometer', processChar: '믹싱 온도', specialChar: 'IC', specTolerance: '120±10°C' },
  { processNo: '50', processName: '압출', productChar: '두께', processChar: '압출 속도', specialChar: 'SC', specTolerance: '3.0±0.1mm' },
  { processNo: '60', processName: '재단', productChar: '중량', processChar: '재단 정밀도', specialChar: '', specTolerance: '100±2g' },
  { processNo: '70', processName: '성형', productChar: '외관', processChar: '성형 압력', specialChar: '', specTolerance: '기포/주름 없음' },
  { processNo: '80', processName: '가류', productChar: '경도', processChar: '가류 시간', specialChar: 'CC', specTolerance: '65±3 Shore A' },
  { processNo: '90', processName: '최종검사', productChar: '유니포미티', processChar: '검사 정확도', specialChar: 'CC', specTolerance: 'RFV <10N' },
];

// CP 관리방법 샘플 데이터
const CP_CONTROL_METHOD_DATA = [
  { processNo: '10', processName: '자재입고', evalMethod: '육안검사', sampleSize: '전수', frequency: '입고시', owner1: '자재팀', owner2: '품질팀' },
  { processNo: '20', processName: '수입검사', evalMethod: 'Mooney 측정', sampleSize: 'n=5', frequency: '로트당', owner1: '품질팀', owner2: '' },
  { processNo: '30', processName: 'MB Mixing', evalMethod: 'Rheometer', sampleSize: 'n=3', frequency: '배치당', owner1: '생산팀', owner2: '품질팀' },
  { processNo: '50', processName: '압출', evalMethod: '두께 측정', sampleSize: 'n=5', frequency: '1회/시간', owner1: '생산팀', owner2: '' },
  { processNo: '60', processName: '재단', evalMethod: '중량 측정', sampleSize: 'n=10', frequency: '1회/시간', owner1: '생산팀', owner2: '' },
  { processNo: '70', processName: '성형', evalMethod: '육안검사', sampleSize: '전수', frequency: '연속', owner1: '생산팀', owner2: '' },
  { processNo: '80', processName: '가류', evalMethod: '경도 측정', sampleSize: 'n=3', frequency: '1회/2시간', owner1: '생산팀', owner2: '품질팀' },
  { processNo: '90', processName: '최종검사', evalMethod: '유니포미티', sampleSize: '전수', frequency: '연속', owner1: '품질팀', owner2: '' },
  { processNo: '100', processName: '출하', evalMethod: '외관검사', sampleSize: 'AQL', frequency: '로트당', owner1: '품질팀', owner2: '출하팀' },
];

// CP 대응계획 샘플 데이터
const CP_REACTION_PLAN_DATA = [
  { processNo: '10', processName: '자재입고', productChar: '이물질', processChar: '입고 상태', reactionPlan: '이물질 발견 시 반품 처리' },
  { processNo: '20', processName: '수입검사', productChar: 'Mooney', processChar: '측정 정확도', reactionPlan: '규격 미달 시 재검사 또는 반품' },
  { processNo: '30', processName: 'MB Mixing', productChar: 'Rheometer', processChar: '믹싱 RPM', reactionPlan: '규격 이탈 시 재배합 또는 폐기' },
  { processNo: '50', processName: '압출', productChar: '두께', processChar: '압출 속도', reactionPlan: '두께 이탈 시 설비 조정 후 재생산' },
  { processNo: '60', processName: '재단', productChar: '중량', processChar: '재단 정밀도', reactionPlan: '중량 이탈 시 재재단' },
  { processNo: '70', processName: '성형', productChar: '외관', processChar: '성형 압력', reactionPlan: '불량 발생 시 작업 중단 후 원인 분석' },
  { processNo: '80', processName: '가류', productChar: '경도', processChar: '가류 시간', reactionPlan: '경도 이탈 시 가류 조건 조정' },
  { processNo: '90', processName: '최종검사', productChar: '유니포미티', processChar: '검사 정확도', reactionPlan: '불합격 시 재검사 또는 폐기' },
  { processNo: '100', processName: '출하', productChar: '외관', processChar: '라벨', reactionPlan: '불량 발견 시 선별 및 재포장' },
];

/**
 * POST: CP 기초정보 마스터 데이터 시드
 */
export async function POST(request: NextRequest) {
  const pool = getPool();

  try {
    const results: { table: string; created: number }[] = [];

    // 1. CP 공정현황 마스터
    const processCount = await pool.query('SELECT COUNT(*) FROM cp_master_processes');
    if (parseInt(processCount.rows[0].count, 10) === 0) {
      for (const item of CP_PROCESS_DATA) {
        await pool.query(`
          INSERT INTO cp_master_processes 
          (id, "processNo", "processName", level, "processDesc", equipment, "isActive", "sortOrder", "createdAt", "updatedAt")
          VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, true, $6, NOW(), NOW())
        `, [item.processNo, item.processName, item.level, item.processDesc, item.equipment, parseInt(item.processNo, 10)]);
      }
      results.push({ table: 'cp_master_processes', created: CP_PROCESS_DATA.length });
    } else {
      results.push({ table: 'cp_master_processes', created: 0 });
    }

    // 2. CP 검출장치 마스터
    const detectorCount = await pool.query('SELECT COUNT(*) FROM cp_master_detectors');
    if (parseInt(detectorCount.rows[0].count, 10) === 0) {
      for (const item of CP_DETECTOR_DATA) {
        await pool.query(`
          INSERT INTO cp_master_detectors 
          (id, "processNo", "processName", ep, "autoDetector", "isActive", "sortOrder", "createdAt", "updatedAt")
          VALUES (gen_random_uuid(), $1, $2, $3, $4, true, $5, NOW(), NOW())
        `, [item.processNo, item.processName, item.ep, item.autoDetector, parseInt(item.processNo, 10)]);
      }
      results.push({ table: 'cp_master_detectors', created: CP_DETECTOR_DATA.length });
    } else {
      results.push({ table: 'cp_master_detectors', created: 0 });
    }

    // 3. CP 관리항목 마스터
    const controlItemCount = await pool.query('SELECT COUNT(*) FROM cp_master_control_items');
    if (parseInt(controlItemCount.rows[0].count, 10) === 0) {
      let idx = 0;
      for (const item of CP_CONTROL_ITEM_DATA) {
        await pool.query(`
          INSERT INTO cp_master_control_items 
          (id, "processNo", "processName", "productChar", "processChar", "specialChar", "specTolerance", "isActive", "sortOrder", "createdAt", "updatedAt")
          VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, $7, NOW(), NOW())
        `, [item.processNo, item.processName, item.productChar, item.processChar, item.specialChar, item.specTolerance, idx++]);
      }
      results.push({ table: 'cp_master_control_items', created: CP_CONTROL_ITEM_DATA.length });
    } else {
      results.push({ table: 'cp_master_control_items', created: 0 });
    }

    // 4. CP 관리방법 마스터
    const controlMethodCount = await pool.query('SELECT COUNT(*) FROM cp_master_control_methods');
    if (parseInt(controlMethodCount.rows[0].count, 10) === 0) {
      let idx = 0;
      for (const item of CP_CONTROL_METHOD_DATA) {
        await pool.query(`
          INSERT INTO cp_master_control_methods 
          (id, "processNo", "processName", "evalMethod", "sampleSize", frequency, owner1, owner2, "isActive", "sortOrder", "createdAt", "updatedAt")
          VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, true, $8, NOW(), NOW())
        `, [item.processNo, item.processName, item.evalMethod, item.sampleSize, item.frequency, item.owner1, item.owner2, idx++]);
      }
      results.push({ table: 'cp_master_control_methods', created: CP_CONTROL_METHOD_DATA.length });
    } else {
      results.push({ table: 'cp_master_control_methods', created: 0 });
    }

    // 5. CP 대응계획 마스터
    const reactionPlanCount = await pool.query('SELECT COUNT(*) FROM cp_master_reaction_plans');
    if (parseInt(reactionPlanCount.rows[0].count, 10) === 0) {
      let idx = 0;
      for (const item of CP_REACTION_PLAN_DATA) {
        await pool.query(`
          INSERT INTO cp_master_reaction_plans 
          (id, "processNo", "processName", "productChar", "processChar", "reactionPlan", "isActive", "sortOrder", "createdAt", "updatedAt")
          VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, true, $6, NOW(), NOW())
        `, [item.processNo, item.processName, item.productChar, item.processChar, item.reactionPlan, idx++]);
      }
      results.push({ table: 'cp_master_reaction_plans', created: CP_REACTION_PLAN_DATA.length });
    } else {
      results.push({ table: 'cp_master_reaction_plans', created: 0 });
    }

    const totalCreated = results.reduce((sum, r) => sum + r.created, 0);
    await pool.end();

    return NextResponse.json({
      success: true,
      message: `CP 기초정보 마스터 데이터 ${totalCreated}개 생성 완료`,
      results,
    });
  } catch (error: any) {
    console.error('[CP Master Seed API] 오류:', error);
    await pool.end();
    return NextResponse.json(
      { success: false, error: error.message || '시드 실패' },
      { status: 500 }
    );
  }
}

/**
 * GET: CP 기초정보 마스터 데이터 조회
 */
export async function GET(request: NextRequest) {
  const pool = getPool();

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category'); // process | detector | controlItem | controlMethod | reactionPlan

    const data: any = {};

    if (!category || category === 'process') {
      const result = await pool.query('SELECT * FROM cp_master_processes ORDER BY "sortOrder"');
      data.processes = result.rows;
    }
    if (!category || category === 'detector') {
      const result = await pool.query('SELECT * FROM cp_master_detectors ORDER BY "sortOrder"');
      data.detectors = result.rows;
    }
    if (!category || category === 'controlItem') {
      const result = await pool.query('SELECT * FROM cp_master_control_items ORDER BY "sortOrder"');
      data.controlItems = result.rows;
    }
    if (!category || category === 'controlMethod') {
      const result = await pool.query('SELECT * FROM cp_master_control_methods ORDER BY "sortOrder"');
      data.controlMethods = result.rows;
    }
    if (!category || category === 'reactionPlan') {
      const result = await pool.query('SELECT * FROM cp_master_reaction_plans ORDER BY "sortOrder"');
      data.reactionPlans = result.rows;
    }

    await pool.end();

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('[CP Master API] 조회 오류:', error);
    await pool.end();
    return NextResponse.json(
      { success: false, error: error.message || '조회 실패' },
      { status: 500 }
    );
  }
}


