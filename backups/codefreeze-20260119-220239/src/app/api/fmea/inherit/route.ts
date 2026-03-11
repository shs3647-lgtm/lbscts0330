/**
 * @file route.ts
 * @description FMEA 상속 API - Master/Family FMEA 데이터를 Part FMEA로 복사
 * @version 1.0.0
 * @created 2026-01-10
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export const runtime = 'nodejs';

// DB 연결
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
    // ✅ FMEA ID는 항상 대문자로 정규화 (DB 일관성 보장)
    const sourceId = searchParams.get('sourceId')?.toUpperCase();
    const targetId = searchParams.get('targetId')?.toUpperCase();
    
    if (!sourceId) {
      return NextResponse.json({ 
        success: false, 
        error: 'sourceId is required' 
      }, { status: 400 });
    }
    
    // 원본 스키마 이름 생성: PFM26-M001 → pfmea_pfm26_m001
    const sourceSchema = `pfmea_${sourceId.replace(/-/g, '_').toLowerCase()}`;
    
    console.log(`[상속 API] 원본: ${sourceId} (${sourceSchema})`);
    console.log(`[상속 API] 대상: ${targetId}`);
    
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
        SELECT "legacyData" FROM "${sourceSchema}"."FmeaLegacyData" 
        WHERE id = $1
        LIMIT 1
      `, [`legacy-${sourceId}`]);
      
      if (legacyResult.rows.length > 0 && legacyResult.rows[0].legacyData) {
        legacyData = legacyResult.rows[0].legacyData;
        console.log(`[상속 API] 레거시 데이터 발견:`, {
          l1Name: legacyData.l1?.name,
          l2Count: legacyData.l2?.length || 0,
        });
      }
    } catch (e: any) {
      console.log(`[상속 API] 레거시 테이블 없음:`, e.message);
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
    };
    
    if (legacyData) {
      // 레거시 데이터 사용
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
      };
    } else {
      // 원자성 테이블에서 조회
      try {
        // L1 구조
        const l1Result = await pool.query(`
          SELECT * FROM "${sourceSchema}"."L1Structure" 
          WHERE "fmeaId" = $1 LIMIT 1
        `, [sourceId]);
        
        if (l1Result.rows.length > 0) {
          inherited.l1 = {
            id: l1Result.rows[0].id,
            name: l1Result.rows[0].processName || l1Result.rows[0].name || '',
            types: [],
          };
        }
        
        // L2 구조 (공정)
        const l2Result = await pool.query(`
          SELECT * FROM "${sourceSchema}"."L2Structure" 
          WHERE "fmeaId" = $1 
          ORDER BY "order", "processNo"
        `, [sourceId]);
        
        stats.processes = l2Result.rows.length;
        
        for (const l2Row of l2Result.rows) {
          // L3 구조 (작업요소)
          const l3Result = await pool.query(`
            SELECT * FROM "${sourceSchema}"."L3Structure" 
            WHERE "l2Id" = $1 
            ORDER BY "order"
          `, [l2Row.id]);
          
          stats.workElements += l3Result.rows.length;
          
          inherited.l2.push({
            id: l2Row.id,
            no: l2Row.processNo || l2Row.no || '',
            name: l2Row.processName || l2Row.name || '',
            order: l2Row.order || 10,
            functions: [],
            productChars: [],
            failureModes: [],
            failureCauses: [],
            l3: l3Result.rows.map((l3Row: any) => ({
              id: l3Row.id,
              m4: l3Row.fourM || l3Row.m4 || '',
              name: l3Row.workElementName || l3Row.name || '',
              order: l3Row.order || 10,
              functions: [],
              processChars: [],
            })),
          });
        }
      } catch (e: any) {
        console.error(`[상속 API] 원자성 테이블 조회 오류:`, e.message);
      }
    }
    
    // 4. 원본 FMEA 정보 조회
    let sourceInfo = {
      fmeaId: sourceId,
      fmeaType: sourceId.match(/pfm\d{2}-([MFP])/i)?.[1]?.toUpperCase() || 'P',
      subject: sourceId,
    };
    
    try {
      const infoResult = await pool.query(`
        SELECT "fmeaInfo", "fmeaType" FROM "${sourceSchema}"."FmeaInfo" 
        WHERE "fmeaId" = $1 LIMIT 1
      `, [sourceId]);
      
      if (infoResult.rows.length > 0) {
        const info = infoResult.rows[0];
        sourceInfo.fmeaType = info.fmeaType || sourceInfo.fmeaType;
        if (info.fmeaInfo) {
          sourceInfo.subject = info.fmeaInfo.subject || sourceId;
        }
      }
    } catch (e: any) {
      console.log(`[상속 API] FmeaInfo 조회 실패:`, e.message);
    }
    
    console.log(`[상속 API] ✅ 상속 데이터 조회 완료:`, stats);
    
    return NextResponse.json({
      success: true,
      inherited,
      source: sourceInfo,
      stats,
      message: `${sourceInfo.subject}에서 데이터를 상속받았습니다.`,
    });
    
  } catch (error: any) {
    console.error('❌ 상속 API 오류:', error.message);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
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
    // ✅ FMEA ID는 항상 대문자로 정규화 (DB 일관성 보장)
    const sourceId = body.sourceId?.toUpperCase();
    const targetId = body.targetId?.toUpperCase();
    const { inherited } = body;
    
    if (!sourceId || !targetId || !inherited) {
      return NextResponse.json({ 
        success: false, 
        error: 'sourceId, targetId, inherited are required' 
      }, { status: 400 });
    }
    
    // 대상 스키마 이름 생성 (PFM26-M001 → pfmea_pfm26_m001)
    const targetSchema = `pfmea_${targetId.replace(/-/g, '_').toLowerCase()}`;
    
    console.log(`[상속 저장] ${sourceId} → ${targetId}`);
    
    // 1. 대상 스키마 생성
    await pool.query(`CREATE SCHEMA IF NOT EXISTS "${targetSchema}"`);
    
    // 2. FmeaInfo 테이블 생성 및 저장 (parentFmeaId 포함)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${targetSchema}"."FmeaInfo" (
        id TEXT PRIMARY KEY,
        "fmeaId" TEXT NOT NULL,
        "fmeaType" TEXT,
        "parentFmeaId" TEXT,
        "parentFmeaType" TEXT,
        "inheritedAt" TIMESTAMP,
        project JSONB,
        "fmeaInfo" JSONB,
        "structureConfirmed" BOOLEAN DEFAULT FALSE,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // 원본 유형 추출
    const sourceType = sourceId.match(/pfm\d{2}-([MFP])/i)?.[1]?.toUpperCase() || 'P';
    
    // FmeaInfo 저장 (상속 정보 포함)
    await pool.query(`
      INSERT INTO "${targetSchema}"."FmeaInfo" 
      (id, "fmeaId", "fmeaType", "parentFmeaId", "parentFmeaType", "inheritedAt")
      VALUES ($1, $2, 'P', $3, $4, NOW())
      ON CONFLICT (id) DO UPDATE SET
        "parentFmeaId" = $3,
        "parentFmeaType" = $4,
        "inheritedAt" = NOW(),
        "updatedAt" = NOW()
    `, [`info-${targetId}`, targetId, sourceId, sourceType]);
    
    // 3. 레거시 데이터 저장 (상속된 데이터)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "${targetSchema}"."FmeaLegacyData" (
        id TEXT PRIMARY KEY,
        "fmeaId" TEXT NOT NULL,
        "legacyData" JSONB,
        "legacyVersion" TEXT DEFAULT '2.0',
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // ID 재생성 함수 (원본 ID → 대상 ID)
    const regenerateId = (oldId: string, prefix: string) => {
      const suffix = oldId.split('-').pop() || Math.random().toString(36).substr(2, 9);
      return `${prefix}-${targetId}-${suffix}`;
    };
    
    // 상속 데이터의 ID 재생성
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
    
    const legacyData = {
      fmeaId: targetId,
      l1: newL1,
      l2: newL2,
      failureLinks: inherited.failureLinks || [],
      structureConfirmed: false,
      l1Confirmed: false,
      l2Confirmed: false,
      l3Confirmed: false,
      failureL1Confirmed: false,
      failureL2Confirmed: false,
      failureL3Confirmed: false,
      failureLinkConfirmed: false,
      // 상속 메타데이터
      _inherited: true,
      _inheritedFrom: sourceId,
      _inheritedAt: new Date().toISOString(),
    };
    
    await pool.query(`
      INSERT INTO "${targetSchema}"."FmeaLegacyData" 
      (id, "fmeaId", "legacyData", "legacyVersion")
      VALUES ($1, $2, $3, '2.0')
      ON CONFLICT (id) DO UPDATE SET
        "legacyData" = $3,
        "updatedAt" = NOW()
    `, [`legacy-${targetId}`, targetId, JSON.stringify(legacyData)]);
    
    console.log(`[상속 저장] ✅ 완료: ${targetId}`);
    
    return NextResponse.json({
      success: true,
      targetId,
      parentFmeaId: sourceId,
      message: `${sourceId}에서 ${targetId}로 상속이 완료되었습니다.`,
    });
    
  } catch (error: any) {
    console.error('❌ 상속 저장 오류:', error.message);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  } finally {
    await pool.end();
  }
}


