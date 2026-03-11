/**
 * @file migration.ts
 * @description 기존 중첩 구조 → 원자성 DB 구조 마이그레이션
 */

import {
  FMEAWorksheetDB,
  L1Structure,
  L2Structure,
  L3Structure,
  L1Function,
  L2Function,
  L3Function,
  FailureEffect,
  FailureMode,
  FailureCause,
  FailureLink,
  uid,
  createEmptyDB,
  getLinkedDataByFK,
  linkFunctionToStructure,
  linkFailureToFunction,
} from './schema';

// Re-export for external use
export { getLinkedDataByFK, linkFunctionToStructure, linkFailureToFunction };

// 기존 데이터 타입 (하위호환)
interface OldL1Type {
  id: string;
  name: string;
  functions: Array<{
    id: string;
    name: string;
    requirements: Array<{
      id: string;
      name: string;
      failureEffect?: string;
      severity?: number;
    }>;
  }>;
}

interface OldProcess {
  id: string;
  no: string;
  name: string;
  order: number;
  functions?: Array<{
    id: string;
    name: string;
    productChars?: Array<{ id: string; name: string; specialChar?: string }>;
  }>;
  failureModes?: Array<{ id: string; name: string; sc?: boolean }>;
  l3: Array<{
    id: string;
    m4: string;
    name: string;
    order: number;
    functions?: Array<{
      id: string;
      name: string;
      processChars?: Array<{ id: string; name: string; specialChar?: string }>;
    }>;
    failureCauses?: Array<{ id: string; name: string; occurrence?: number }>;
  }>;
}

interface OldL1Data {
  id: string;
  name: string;
  types: OldL1Type[];
  failureScopes?: Array<{
    id: string;
    name: string;
    reqId?: string; // FK: 요구사항 ID (하위호환용)
    requirement?: string; // 연결된 요구사항 (텍스트)
    scope?: string;
    effect?: string;
    severity?: number;
  }>;
}

interface OldWorksheetData {
  fmeaId: string;
  l1: OldL1Data;
  l2: OldProcess[];
  failureLinks?: Array<{
    fmId: string;
    fmText: string;
    fmProcess: string;
    feId?: string;
    feScope?: string;
    feText?: string;
    severity?: number;
    fcId?: string;
    fcText?: string;
    fcWorkElem?: string;
    fcProcess?: string;
  }>;
  structureConfirmed?: boolean;
  l1Confirmed?: boolean;
  l2Confirmed?: boolean;
  l3Confirmed?: boolean;
  failureL1Confirmed?: boolean;
  failureL2Confirmed?: boolean;
  failureL3Confirmed?: boolean;
}

/**
 * 기존 중첩 구조 데이터를 원자성 DB 구조로 마이그레이션
 */
export function migrateToAtomicDB(oldData: OldWorksheetData): FMEAWorksheetDB {
  const db = createEmptyDB(oldData.fmeaId);
  
  console.log('[마이그레이션] 시작:', oldData.fmeaId);
  
  // 1. L1 구조분석 (완제품 공정)
  if (oldData.l1) {
    db.l1Structure = {
      id: oldData.l1.id || uid(),
      fmeaId: oldData.fmeaId,
      name: oldData.l1.name || '',
      confirmed: oldData.structureConfirmed || false,
    };
  }
  
  // 2. L1 기능분석 (구분 → 기능 → 요구사항)
  const l1FuncMap = new Map<string, L1Function>();
  const l1Types = oldData.l1?.types || [];
  l1Types.forEach(type => {
    const category = type.name as 'Your Plant' | 'Ship to Plant' | 'User';
    const functions = type.functions || [];
    
    functions.forEach(func => {
      const requirements = func.requirements || [];
      
      if (requirements.length === 0) {
        // 요구사항 없는 경우에도 기능은 저장
        const l1Func: L1Function = {
          id: uid(),
          fmeaId: oldData.fmeaId,
          l1StructId: db.l1Structure?.id || '',
          category: category,
          functionName: func.name,
          requirement: '',
        };
        db.l1Functions.push(l1Func);
        l1FuncMap.set(l1Func.id, l1Func);
      } else {
        requirements.forEach(req => {
          const l1Func: L1Function = {
            id: req.id || uid(),  // 요구사항 ID 유지 (FE와 연결용)
            fmeaId: oldData.fmeaId,
            l1StructId: db.l1Structure?.id || '',
            category: category,
            functionName: func.name,
            requirement: req.name,
          };
          db.l1Functions.push(l1Func);
          l1FuncMap.set(l1Func.id, l1Func);
          
          // 요구사항에 고장영향이 있으면 FE 생성
          if (req.failureEffect) {
            db.failureEffects.push({
              id: uid(),
              fmeaId: oldData.fmeaId,
              l1FuncId: l1Func.id,
              category: category,
              effect: req.failureEffect,
              severity: req.severity || 0,
            });
          }
        });
      }
    });
  });

  // 2-1. L1 고장영향(failureScopes) → FailureEffect로 승격 (요구사항 FK 기준)
  const legacyScopes = oldData.l1?.failureScopes || [];
  console.log('[마이그레이션] failureScopes 변환 시작:', legacyScopes.length, '개');
  legacyScopes.forEach(fs => {
    // reqId로 l1Function 찾기
    let targetFunc = fs.reqId ? l1FuncMap.get(fs.reqId) : null;
    
    // reqId 매칭 실패 시, effect 텍스트로 요구사항을 찾아보기 (fallback)
    if (!targetFunc && fs.effect) {
      const matchedFunc = Array.from(l1FuncMap.values()).find(f => f.requirement === fs.requirement);
      if (matchedFunc) targetFunc = matchedFunc;
    }
    
    // 여전히 못 찾으면 첫 번째 함수 사용 (최후의 수단)
    if (!targetFunc && l1FuncMap.size > 0) {
      targetFunc = Array.from(l1FuncMap.values())[0];
      console.warn('[마이그레이션] failureScope reqId 매칭 실패, 첫 번째 함수 사용:', fs.reqId, fs.effect);
    }
    
    // targetFunc가 없으면 건너뛰기 (l1Function이 아예 없는 경우)
    if (!targetFunc) {
      console.warn('[마이그레이션] failureScope 건너뜀 (l1Function 없음):', fs.effect);
      return;
    }
    
    const category = (fs.scope as any) || targetFunc.category || 'Your Plant';
    db.failureEffects.push({
      id: fs.id || uid(),
      fmeaId: oldData.fmeaId,
      l1FuncId: targetFunc.id,
      category,
      effect: fs.effect || fs.name || '',
      severity: fs.severity ?? 0,
    });
  });
  console.log('[마이그레이션] failureScopes → FailureEffect 변환 완료:', db.failureEffects.length, '개');
  
  // 3. L2 구조분석 (메인공정) + L2 기능분석 + L3 구조/기능분석
  const l2Data = oldData.l2 || [];
  l2Data.forEach(proc => {
    // 빈 공정 스킵
    if (!proc.name || proc.name.includes('클릭') || proc.name.includes('선택')) {
      return;
    }
    
    // L2 구조분석
    const l2Struct: L2Structure = {
      id: proc.id || uid(),
      fmeaId: oldData.fmeaId,
      l1Id: db.l1Structure?.id || '',
      no: proc.no || '',
      name: proc.name,
      order: proc.order || 0,
    };
    db.l2Structures.push(l2Struct);
    
    // L2 기능분석 (메인공정 기능 → 제품특성)
    const procFuncs = proc.functions || [];
    procFuncs.forEach(func => {
      const productChars = func.productChars || [];
      
      if (productChars.length === 0) {
        db.l2Functions.push({
          id: uid(),
          fmeaId: oldData.fmeaId,
          l2StructId: l2Struct.id,
          functionName: func.name,
          productChar: '',
        });
      } else {
        productChars.forEach(pc => {
          const l2Func: L2Function = {
            id: pc.id || uid(),  // 제품특성 ID 유지 (FM과 연결용)
            fmeaId: oldData.fmeaId,
            l2StructId: l2Struct.id,
            functionName: func.name,
            productChar: pc.name,
            specialChar: pc.specialChar,
          };
          db.l2Functions.push(l2Func);
        });
      }
    });
    
    // L2 고장형태 (FM)
    const failureModes = proc.failureModes || [];
    failureModes.forEach(fm => {
      // 가장 최근 L2Function을 상위로 연결 (또는 첫 번째)
      const relatedL2Func = db.l2Functions.find(f => f.l2StructId === l2Struct.id);
      
      db.failureModes.push({
        id: fm.id || uid(),
        fmeaId: oldData.fmeaId,
        l2FuncId: relatedL2Func?.id || '',
        l2StructId: l2Struct.id,
        mode: fm.name,
        specialChar: fm.sc,
      });
    });
    
    // L3 구조분석 (작업요소) + L3 기능분석
    const l3Data = proc.l3 || [];
    l3Data.forEach(we => {
      // 빈 작업요소 스킵
      if (!we.name || we.name.includes('클릭') || we.name.includes('추가')) {
        return;
      }
      
      // L3 구조분석
      const l3Struct: L3Structure = {
        id: we.id || uid(),
        fmeaId: oldData.fmeaId,
        l1Id: db.l1Structure?.id || '',
        l2Id: l2Struct.id,
        m4: (we.m4 as any) || '',
        name: we.name,
        order: we.order || 0,
      };
      db.l3Structures.push(l3Struct);
      
      // L3 기능분석 (작업요소 기능 → 공정특성)
      const weFuncs = we.functions || [];
      weFuncs.forEach(func => {
        const processChars = func.processChars || [];
        
        if (processChars.length === 0) {
          db.l3Functions.push({
            id: uid(),
            fmeaId: oldData.fmeaId,
            l3StructId: l3Struct.id,
            l2StructId: l2Struct.id,
            functionName: func.name,
            processChar: '',
          });
        } else {
          processChars.forEach(pc => {
            const l3Func: L3Function = {
              id: pc.id || uid(),  // 공정특성 ID 유지 (FC와 연결용)
              fmeaId: oldData.fmeaId,
              l3StructId: l3Struct.id,
              l2StructId: l2Struct.id,
              functionName: func.name,
              processChar: pc.name,
              specialChar: pc.specialChar,
            };
            db.l3Functions.push(l3Func);
          });
        }
      });
      
      // L3 고장원인 (FC)
      const failureCauses = we.failureCauses || [];
      failureCauses.forEach(fc => {
        // 가장 최근 L3Function을 상위로 연결 (또는 첫 번째)
        const relatedL3Func = db.l3Functions.find(f => f.l3StructId === l3Struct.id);
        
        db.failureCauses.push({
          id: fc.id || uid(),
          fmeaId: oldData.fmeaId,
          l3FuncId: relatedL3Func?.id || '',
          l3StructId: l3Struct.id,
          l2StructId: l2Struct.id,
          cause: fc.name,
          occurrence: fc.occurrence,
        });
      });
    });
  });
  
  // 4. 기존 고장연결 데이터 마이그레이션
  const oldLinks = oldData.failureLinks || [];
  oldLinks.forEach(oldLink => {
    // FM 찾기
    const fm = db.failureModes.find(m => m.id === oldLink.fmId || m.mode === oldLink.fmText);
    if (!fm) return;
    
    // FE 찾기 (ID 또는 텍스트로)
    let fe = db.failureEffects.find(e => e.id === oldLink.feId);
    if (!fe && oldLink.feText) {
      fe = db.failureEffects.find(e => e.effect === oldLink.feText);
    }
    
    // FC 찾기 (ID 또는 텍스트로)
    let fc = db.failureCauses.find(c => c.id === oldLink.fcId);
    if (!fc && oldLink.fcText) {
      fc = db.failureCauses.find(c => c.cause === oldLink.fcText);
    }
    
    if (fe || fc) {
      db.failureLinks.push({
        id: uid(),
        fmeaId: oldData.fmeaId,
        fmId: fm.id,
        feId: fe?.id || '',
        fcId: fc?.id || '',
        cache: {
          fmText: fm.mode,
          fmProcess: oldLink.fmProcess || '',
          feText: fe?.effect || oldLink.feText || '',
          feCategory: fe?.category || oldLink.feScope || '',
          feSeverity: fe?.severity || oldLink.severity || 0,
          fcText: fc?.cause || oldLink.fcText || '',
          fcWorkElem: oldLink.fcWorkElem || '',
          fcProcess: oldLink.fcProcess || '',
        },
      });
    }
  });
  
  // 5. 확정 상태 마이그레이션
  db.confirmed = {
    structure: oldData.structureConfirmed || false,
    l1Function: oldData.l1Confirmed || false,
    l2Function: oldData.l2Confirmed || false,
    l3Function: oldData.l3Confirmed || false,
    l1Failure: oldData.failureL1Confirmed || false,
    l2Failure: oldData.failureL2Confirmed || false,
    l3Failure: oldData.failureL3Confirmed || false,
    failureLink: false,
    risk: false,
    optimization: false,
  };
  
  console.log('[마이그레이션] 완료:', {
    l1Structure: db.l1Structure?.name,
    l2Structures: db.l2Structures.length,
    l3Structures: db.l3Structures.length,
    l1Functions: db.l1Functions.length,
    l2Functions: db.l2Functions.length,
    l3Functions: db.l3Functions.length,
    failureEffects: db.failureEffects.length,
    failureModes: db.failureModes.length,
    failureCauses: db.failureCauses.length,
    failureLinks: db.failureLinks.length,
  });
  
  return db;
}

/**
 * 원자성 DB를 기존 중첩 구조로 역변환 (하위호환용)
 */
export function convertToLegacyFormat(db: FMEAWorksheetDB): OldWorksheetData {
  const result: OldWorksheetData = {
    fmeaId: db.fmeaId,
    l1: {
      id: db.l1Structure?.id || uid(),
      name: db.l1Structure?.name || '',
      types: [],
      failureScopes: [], // 초기값으로 빈 배열 설정
    },
    l2: [],
    failureLinks: [],
    structureConfirmed: db.confirmed.structure,
    l1Confirmed: db.confirmed.l1Function,
    l2Confirmed: db.confirmed.l2Function,
    l3Confirmed: db.confirmed.l3Function,
    failureL1Confirmed: db.confirmed.l1Failure,
    failureL2Confirmed: db.confirmed.l2Failure,
    failureL3Confirmed: db.confirmed.l3Failure,
  };
  
  console.log('[역변환] 시작, failureEffects:', db.failureEffects.length, '개');
  
  // FE를 다시 failureScopes로 역변환 (요구사항 기준)
  const l1FuncMap = new Map<string, { reqName: string; category: string }>();
  db.l1Functions.forEach(f => {
    l1FuncMap.set(f.id, { reqName: f.requirement, category: f.category });
  });
  const failureScopes = (db.failureEffects || []).map(fe => ({
    id: fe.id,
    reqId: fe.l1FuncId,
    requirement: l1FuncMap.get(fe.l1FuncId)?.reqName || '',
    scope: l1FuncMap.get(fe.l1FuncId)?.category || fe.category || 'Your Plant',
    effect: fe.effect,
    severity: fe.severity,
  }));
  // failureScopes 항상 설정 (빈 배열도 포함)
  (result.l1 as any).failureScopes = failureScopes;
  console.log('[역변환] failureScopes 복원:', failureScopes.length, '개');

  // L1 기능 → types 구조로 변환
  const categoryGroups = new Map<string, Map<string, L1Function[]>>();
  db.l1Functions.forEach(f => {
    if (!categoryGroups.has(f.category)) {
      categoryGroups.set(f.category, new Map());
    }
    const funcGroups = categoryGroups.get(f.category)!;
    if (!funcGroups.has(f.functionName)) {
      funcGroups.set(f.functionName, []);
    }
    funcGroups.get(f.functionName)!.push(f);
  });
  
  categoryGroups.forEach((funcGroups, category) => {
    const typeObj: OldL1Type = {
      id: uid(),
      name: category,
      functions: [],
    };
    
    funcGroups.forEach((funcs, funcName) => {
      typeObj.functions.push({
        id: funcs[0]?.id || uid(),
        name: funcName,
        requirements: funcs.map(f => ({
          id: f.id,
          name: f.requirement,
        })),
      });
    });
    
    result.l1.types.push(typeObj);
  });
  
  // L2/L3 구조 → 중첩 구조로 변환
  db.l2Structures.forEach(l2 => {
    const procObj: OldProcess = {
      id: l2.id,
      no: l2.no,
      name: l2.name,
      order: l2.order,
      functions: [],
      failureModes: [],
      l3: [],
    };
    
    // L2 기능 그룹화
    const l2Funcs = db.l2Functions.filter(f => f.l2StructId === l2.id);
    const funcGroups = new Map<string, L2Function[]>();
    l2Funcs.forEach(f => {
      if (!funcGroups.has(f.functionName)) {
        funcGroups.set(f.functionName, []);
      }
      funcGroups.get(f.functionName)!.push(f);
    });
    
    funcGroups.forEach((funcs, funcName) => {
      procObj.functions!.push({
        id: funcs[0]?.id || uid(),
        name: funcName,
        productChars: funcs.map(f => ({
          id: f.id,
          name: f.productChar,
          specialChar: f.specialChar,
        })),
      });
    });
    
    // FM
    const fms = db.failureModes.filter(m => m.l2StructId === l2.id);
    procObj.failureModes = fms.map(m => ({
      id: m.id,
      name: m.mode,
      sc: m.specialChar,
    }));
    
    // L3
    const l3s = db.l3Structures.filter(s => s.l2Id === l2.id);
    l3s.forEach(l3 => {
      const weObj: OldProcess['l3'][0] = {
        id: l3.id,
        m4: l3.m4,
        name: l3.name,
        order: l3.order,
        functions: [],
        failureCauses: [],
      };
      
      // L3 기능 그룹화
      const l3Funcs = db.l3Functions.filter(f => f.l3StructId === l3.id);
      const l3FuncGroups = new Map<string, L3Function[]>();
      l3Funcs.forEach(f => {
        if (!l3FuncGroups.has(f.functionName)) {
          l3FuncGroups.set(f.functionName, []);
        }
        l3FuncGroups.get(f.functionName)!.push(f);
      });
      
      l3FuncGroups.forEach((funcs, funcName) => {
        weObj.functions!.push({
          id: funcs[0]?.id || uid(),
          name: funcName,
          processChars: funcs.map(f => ({
            id: f.id,
            name: f.processChar,
            specialChar: f.specialChar,
          })),
        });
      });
      
      // FC
      const fcs = db.failureCauses.filter(c => c.l3StructId === l3.id);
      weObj.failureCauses = fcs.map(c => ({
        id: c.id,
        name: c.cause,
        occurrence: c.occurrence,
      }));
      
      procObj.l3.push(weObj);
    });
    
    result.l2.push(procObj);
  });
  
  // FailureLinks 변환
  db.failureLinks.forEach(link => {
    result.failureLinks!.push({
      fmId: link.fmId,
      fmText: link.cache?.fmText || '',
      fmProcess: link.cache?.fmProcess || '',
      feId: link.feId,
      feScope: link.cache?.feCategory,
      feText: link.cache?.feText,
      severity: link.cache?.feSeverity,
      fcId: link.fcId,
      fcText: link.cache?.fcText,
      fcWorkElem: link.cache?.fcWorkElem,
      fcProcess: link.cache?.fcProcess,
    });
  });
  
  return result;
}

/**
 * localStorage에서 데이터 로드 (마이그레이션 자동 적용)
 */
export function loadWorksheetDB(fmeaId: string): FMEAWorksheetDB | null {
  if (typeof window === 'undefined') return null;
  
  const keys = [`pfmea_atomic_${fmeaId}`, `pfmea_worksheet_${fmeaId}`, `fmea-worksheet-${fmeaId}`];
  
  for (const key of keys) {
    const stored = localStorage.getItem(key);
    if (!stored) continue;
    
    try {
      const parsed = JSON.parse(stored);
      
      // 이미 원자성 DB인 경우
      if (parsed.l1Structure !== undefined && parsed.l2Structures !== undefined) {
        console.log('[로드] 원자성 DB 발견:', key);
        return parsed as FMEAWorksheetDB;
      }
      
      // 기존 중첩 구조인 경우 마이그레이션
      if (parsed.l1 && parsed.l2) {
        console.log('[로드] 기존 구조 발견, 마이그레이션 수행:', key);
        const migrated = migrateToAtomicDB(parsed);
        // 마이그레이션 결과 저장
        saveWorksheetDB(migrated);
        return migrated;
      }
    } catch (e) {
      console.error('[로드] 파싱 오류:', key, e);
    }
  }
  
  console.log('[로드] 저장된 데이터 없음, 새 DB 생성');
  return createEmptyDB(fmeaId);
}

/**
 * localStorage에 원자성 DB 저장
 */
export function saveWorksheetDB(db: FMEAWorksheetDB): void {
  if (typeof window === 'undefined') return;
  
  db.savedAt = new Date().toISOString();
  const key = `pfmea_atomic_${db.fmeaId}`;
  localStorage.setItem(key, JSON.stringify(db));
  
  // 하위호환을 위해 기존 키에도 저장 (legacy format)
  const legacy = convertToLegacyFormat(db);
  localStorage.setItem(`pfmea_worksheet_${db.fmeaId}`, JSON.stringify(legacy));
  
  console.log('[저장] 원자성 DB 저장 완료:', db.fmeaId);
}

/**
 * 고장연결 확정 및 저장
 * - 자동 변환 없음! 사용자가 입력한 FK 관계만 저장
 * - 확정 상태 업데이트
 */
export function confirmFailureLink(db: FMEAWorksheetDB): FMEAWorksheetDB {
  console.log('[고장연결 확정] 시작...');
  
  // DB 복사
  const confirmedDB = { ...db };
  
  // 확정 상태 업데이트
  confirmedDB.confirmed.failureLink = true;
  
  // 저장
  saveWorksheetDB(confirmedDB);
  
  // FK 관계 기반 데이터 조회 (검증용)
  const linkedData = getLinkedDataByFK(confirmedDB);
  
  console.log('[고장연결 확정] 완료:', {
    failureLinks: confirmedDB.failureLinks.length,
    linkedRows: linkedData.rows.length,
    l1Functions: confirmedDB.l1Functions.length,
    l2Functions: confirmedDB.l2Functions.length,
    l3Functions: confirmedDB.l3Functions.length,
  });
  
  return confirmedDB;
}

