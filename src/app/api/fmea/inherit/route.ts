/**
 * @file route.ts
 * @description FMEA 상속 API - Master/Family FMEA 데이터를 Part FMEA로 복사
 * @version 1.1.0
 * @created 2026-01-10
 * @updated 2026-03-18 — 테이블명을 Prisma @@map 기준 소문자로 통일
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { isValidFmeaId, isValidIdentifier, safeErrorMessage } from '@/lib/security';

export const runtime = 'nodejs';

function getPool() {
  return new Pool({ connectionString: process.env.DATABASE_URL });
}

/**
 * GET: 상속 데이터 조회 및 복사
 *
 * Query Parameters:
 * - sourceId: 원본 FMEA ID (예: pfm26-M001)
 * - targetId: 대상 FMEA ID (예: pfm26-P002)
 */
export async function GET(req: NextRequest) {
  const pool = getPool();

  try {
    const { searchParams } = new URL(req.url);
    const sourceId = searchParams.get('sourceId')?.toLowerCase();
    const targetId = searchParams.get('targetId')?.toLowerCase();

    if (!sourceId) {
      return NextResponse.json({ success: false, error: 'sourceId is required' }, { status: 400 });
    }

    if (!isValidFmeaId(sourceId) || (targetId && !isValidFmeaId(targetId))) {
      return NextResponse.json({ success: false, error: 'Invalid ID format' }, { status: 400 });
    }
    
    const sourceSchema = `pfmea_${sourceId.replace(/-/g, '_').toLowerCase()}`;
    
    // 1. 원본 스키마 존재 확인
    const schemaCheck = await pool.query(`
      SELECT schema_name FROM information_schema.schemata 
      WHERE schema_name = $1
    `, [sourceSchema]);
    
    if (schemaCheck.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: `원본 FMEA(${sourceId})를 찾을 수 없습니다.` 
      }, { status: 404 });
    }
    
    // 2. 원본 데이터 조회 (레거시 데이터 우선)
    let legacyData = null;
    try {
      const legacyResult = await pool.query(`
        SELECT data FROM "${sourceSchema}".fmea_legacy_data 
        WHERE id = $1
        LIMIT 1
      `, [`legacy-${sourceId}`]);
      
      if (legacyResult.rows.length > 0 && legacyResult.rows[0].data) {
        legacyData = legacyResult.rows[0].data;
      }
    } catch {
      // fmea_legacy_data 테이블이 없을 수 있음
    }
    
    // 3. 레거시 데이터가 없으면 원자성 테이블에서 조회
    let inherited = {
      l1: null as any,
      l2: [] as any[],
      functions: {
        l1: [] as any[],
        l2: [] as any[],
        l3: [] as any[],
      },
      failures: {
        effects: [] as any[],
        modes: [] as any[],
        causes: [] as any[],
      },
      failureLinks: [] as any[],
      riskAnalyses: [] as any[],
    };
    
    let stats = {
      processes: 0,
      workElements: 0,
      l1Functions: 0,
      l2Functions: 0,
      l3Functions: 0,
      failureEffects: 0,
      failureModes: 0,
      failureCauses: 0,
      failureLinks: 0,
      riskAnalyses: 0,
    };
    
    // SOD 데이터 로드 (risk_analyses — Atomic DB)
    let sourceRiskAnalyses: any[] = [];
    try {
      const raResult = await pool.query(`
        SELECT * FROM "${sourceSchema}".risk_analyses
        WHERE "fmeaId" = $1
      `, [sourceId]);
      sourceRiskAnalyses = raResult.rows;
    } catch {
      // risk_analyses 테이블이 없을 수 있음 (마이그레이션 전)
    }

    if (legacyData) {
      inherited = {
        l1: legacyData.l1 || null,
        l2: legacyData.l2 || [],
        functions: {
          l1: [],
          l2: [],
          l3: [],
        },
        failures: {
          effects: (legacyData.l1?.failureScopes || []),
          modes: (legacyData.l2 || []).flatMap((p: any) => p.failureModes || []),
          causes: (legacyData.l2 || []).flatMap((p: any) => p.failureCauses || []),
        },
        failureLinks: legacyData.failureLinks || [],
        riskAnalyses: sourceRiskAnalyses,
      };
      
      stats = {
        processes: legacyData.l2?.length || 0,
        workElements: (legacyData.l2 || []).reduce((sum: number, p: any) => sum + (p.l3?.length || 0), 0),
        l1Functions: (legacyData.l1?.types || []).reduce((sum: number, t: any) => 
          sum + (t.functions?.length || 0), 0),
        l2Functions: (legacyData.l2 || []).reduce((sum: number, p: any) => 
          sum + (p.functions?.length || 0), 0),
        l3Functions: (legacyData.l2 || []).reduce((sum: number, p: any) => 
          sum + (p.l3 || []).reduce((s2: number, w: any) => s2 + (w.functions?.length || 0), 0), 0),
        failureEffects: (legacyData.l1?.failureScopes || []).length,
        failureModes: (legacyData.l2 || []).reduce((sum: number, p: any) => 
          sum + (p.failureModes?.length || 0), 0),
        failureCauses: (legacyData.l2 || []).reduce((sum: number, p: any) => 
          sum + (p.failureCauses?.length || 0), 0),
        failureLinks: legacyData.failureLinks?.length || 0,
        riskAnalyses: sourceRiskAnalyses.length,
      };
    } else {
      // 원자성 테이블에서 조회
      try {
        const l1Result = await pool.query(`
          SELECT * FROM "${sourceSchema}".l1_structures 
          WHERE "fmeaId" = $1 LIMIT 1
        `, [sourceId]);
        
        if (l1Result.rows.length > 0) {
          inherited.l1 = {
            id: l1Result.rows[0].id,
            name: l1Result.rows[0].name || '',
            types: [],
          };
        }
        
        const l2Result = await pool.query(`
          SELECT * FROM "${sourceSchema}".l2_structures 
          WHERE "fmeaId" = $1 
          ORDER BY "order", no
        `, [sourceId]);
        
        stats.processes = l2Result.rows.length;
        
        for (const l2Row of l2Result.rows) {
          const l3Result = await pool.query(`
            SELECT * FROM "${sourceSchema}".l3_structures 
            WHERE "l2Id" = $1 
            ORDER BY "order"
          `, [l2Row.id]);
          
          stats.workElements += l3Result.rows.length;
          
          inherited.l2.push({
            id: l2Row.id,
            no: l2Row.no || '',
            name: l2Row.name || '',
            order: l2Row.order || 10,
            functions: [],
            productChars: [],
            failureModes: [],
            failureCauses: [],
            l3: l3Result.rows.map((l3Row: any) => ({
              id: l3Row.id,
              m4: l3Row.m4 || '',
              name: l3Row.name || '',
              order: l3Row.order || 10,
              functions: [],
              processChars: [],
            })),
          });
        }
      } catch (e: any) {
        console.error(`[상속 API] 원자성 테이블 조회 오류:`, e.message);
      }
      inherited.riskAnalyses = sourceRiskAnalyses;
      stats.riskAnalyses = sourceRiskAnalyses.length;
    }
    
    // 4. 원본 FMEA 정보 조회
    const sourceInfo = {
      fmeaId: sourceId,
      fmeaType: sourceId.match(/pfm\d{2}-([MFP])/i)?.[1]?.toUpperCase() || 'P',
      subject: sourceId,
    };
    
    try {
      const infoResult = await pool.query(`
        SELECT * FROM "${sourceSchema}".fmea_projects 
        WHERE "fmeaId" = $1 LIMIT 1
      `, [sourceId]);
      
      if (infoResult.rows.length > 0) {
        const info = infoResult.rows[0];
        sourceInfo.fmeaType = info.fmeaType || sourceInfo.fmeaType;
        sourceInfo.subject = info.subject || sourceId;
      }
    } catch {
      // fmea_projects 테이블이 없을 수 있음
    }
    
    
    return NextResponse.json({
      success: true,
      inherited,
      source: sourceInfo,
      stats,
      message: `${sourceInfo.subject}에서 데이터를 상속받았습니다.`,
    });
    
  } catch (error: unknown) {
    console.error('[상속 API] 조회 오류:', error instanceof Error ? error.message : error);
    return NextResponse.json({
      success: false,
      error: safeErrorMessage(error)
    }, { status: 500 });
  } finally {
    await pool.end();
  }
}

/**
 * POST: 상속 데이터를 대상 FMEA에 저장
 */
export async function POST(req: NextRequest) {
  const pool = getPool();

  try {
    const body = await req.json();
    const sourceId = body.sourceId?.toLowerCase();
    const targetId = body.targetId?.toLowerCase();
    const { inherited } = body;

    if (!sourceId || !targetId || !inherited) {
      return NextResponse.json({
        success: false,
        error: 'sourceId, targetId, inherited are required'
      }, { status: 400 });
    }

    if (!isValidFmeaId(sourceId) || !isValidFmeaId(targetId)) {
      return NextResponse.json({ success: false, error: 'Invalid ID format' }, { status: 400 });
    }

    const targetSchema = `pfmea_${targetId.replace(/-/g, '_').toLowerCase()}`;
    if (!isValidIdentifier(targetSchema)) {
      return NextResponse.json({ success: false, error: 'Invalid schema name' }, { status: 400 });
    }
    
    // 1. 대상 스키마 생성
    await pool.query(`CREATE SCHEMA IF NOT EXISTS "${targetSchema}"`);
    
    // 2. fmea_projects 테이블에 상속 정보 저장
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${targetSchema}".fmea_projects (LIKE public.fmea_projects INCLUDING ALL)
    `);
    
    const sourceType = sourceId.match(/pfm\d{2}-([MFP])/i)?.[1]?.toUpperCase() || 'P';
    
    await pool.query(`
      INSERT INTO "${targetSchema}".fmea_projects 
      (id, "fmeaId", "fmeaType", "parentFmeaId", "createdAt", "updatedAt")
      VALUES ($1, $2, 'P', $3, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        "parentFmeaId" = $3,
        "updatedAt" = NOW()
    `, [`info-${targetId}`, targetId, sourceId]);
    
    // 3. 레거시 데이터 저장 (상속된 데이터)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${targetSchema}".fmea_legacy_data (LIKE public.fmea_legacy_data INCLUDING ALL)
    `);
    
    const regenerateId = (oldId: string, prefix: string) => {
      const suffix = oldId.split('-').pop() || Math.random().toString(36).substr(2, 9);
      return `${prefix}-${targetId}-${suffix}`;
    };
    
    const newL1 = inherited.l1 ? {
      ...inherited.l1,
      id: regenerateId(inherited.l1.id, 'l1'),
    } : null;
    
    const newL2 = (inherited.l2 || []).map((proc: any, idx: number) => ({
      ...proc,
      id: regenerateId(proc.id || `proc-${idx}`, 'l2'),
      l3: (proc.l3 || []).map((we: any, weIdx: number) => ({
        ...we,
        id: regenerateId(we.id || `we-${idx}-${weIdx}`, 'l3'),
      })),
    }));
    
    // SOD 데이터: riskAnalyses를 riskData 형식으로 변환
    const sourceRisks = inherited.riskAnalyses || [];
    const riskData: Record<string, any> = {};
    for (const ra of sourceRisks) {
      const linkId = ra.linkId || ra.link_id;
      if (!linkId) continue;
      riskData[linkId] = {
        severity: ra.severity ?? 0,
        occurrence: ra.occurrence ?? 0,
        detection: ra.detection ?? 0,
        ap: ra.ap || '',
        preventionControl: ra.preventionControl || ra.prevention_control || '',
        detectionControl: ra.detectionControl || ra.detection_control || '',
        lldReference: ra.lldReference || ra.lld_reference || '',
      };
    }

    const legacyData = {
      fmeaId: targetId,
      l1: newL1,
      l2: newL2,
      failureLinks: inherited.failureLinks || [],
      riskData,
      structureConfirmed: false,
      l1Confirmed: false,
      l2Confirmed: false,
      l3Confirmed: false,
      failureL1Confirmed: false,
      failureL2Confirmed: false,
      failureL3Confirmed: false,
      failureLinkConfirmed: false,
      _inherited: true,
      _inheritedFrom: sourceId,
      _inheritedAt: new Date().toISOString(),
    };
    
    await pool.query(`
      INSERT INTO "${targetSchema}".fmea_legacy_data 
      (id, "fmeaId", data)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO UPDATE SET
        data = $3,
        "updatedAt" = NOW()
    `, [`legacy-${targetId}`, targetId, JSON.stringify(legacyData)]);

    // 4. RiskAnalysis Atomic DB 복사 (target 스키마)
    if (sourceRisks.length > 0) {
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS "${targetSchema}".risk_analyses (LIKE public.risk_analyses INCLUDING ALL)
        `);

        for (const ra of sourceRisks) {
          const raId = `ra-${targetId}-${(ra.linkId || ra.link_id || '').split('-').pop() || Math.random().toString(36).substring(2, 9)}`;
          const linkId = ra.linkId || ra.link_id || '';
          await pool.query(`
            INSERT INTO "${targetSchema}".risk_analyses
            (id, "fmeaId", "linkId", severity, occurrence, detection, ap, "preventionControl", "detectionControl", "lldReference")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (id) DO UPDATE SET
              severity = $4, occurrence = $5, detection = $6,
              ap = $7, "preventionControl" = $8, "detectionControl" = $9,
              "lldReference" = $10,
              "updatedAt" = NOW()
          `, [
            raId, targetId, linkId,
            ra.severity ?? 0, ra.occurrence ?? 0, ra.detection ?? 0,
            ra.ap || 'L',
            ra.preventionControl || ra.prevention_control || '',
            ra.detectionControl || ra.detection_control || '',
            ra.lldReference || ra.lld_reference || '',
          ]);
        }
      } catch (e: any) {
        console.error('[상속 API] risk_analyses 복사 오류:', e.message);
      }
    }
    
    return NextResponse.json({
      success: true,
      targetId,
      parentFmeaId: sourceId,
      riskCopied: sourceRisks.length,
      message: `${sourceId}에서 ${targetId}로 상속이 완료되었습니다 (SOD ${sourceRisks.length}건 포함).`,
    });
    
  } catch (error: unknown) {
    console.error('[상속 API] 저장 오류:', error instanceof Error ? error.message : error);
    return NextResponse.json({
      success: false,
      error: safeErrorMessage(error)
    }, { status: 500 });
  } finally {
    await pool.end();
  }
}
