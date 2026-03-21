// CODEFREEZE 해제 — 2026-03-18 FM/FC strict 매칭 추가 (사용자 승인)
/**
 * @file migration.ts
 * @description 기존 중첩 구조 → 원자성 DB 구조 마이그레이션
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

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
import { 
  createHybridId,
  createL2Path,
  createL3Path,
  createMergeGroupId,
  extractFmeaSeq,
  parseHybridId,
  AtomicType,
} from './constants';
import { buildFailureAnalyses } from './utils/failure-analysis-builder';
import { calculateAP } from './tabs/all/apCalculator';
import type { RiskAnalysis } from './schema';

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
  failureModes?: Array<{ id: string; name: string; sc?: boolean; productCharId?: string }>;
  failureCauses?: Array<{ id: string; name: string; occurrence?: number; processCharId?: string }>;
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
    failureCauses?: Array<{ id: string; name: string; occurrence?: number; processCharId?: string }>;
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
    fmProcessNo?: string;  // ★ 공정번호 (DB L2Structure.no)
    fmProcessName?: string;  // ★ 공정명 (processFailureLinks 호환)
    fmProcessFunction?: string;  // ★ 공정기능 (역전개)
    fmProductChar?: string;  // ★ 제품특성 (역전개)
    fmProductCharSC?: string;  // ★ 제품 특별특성
    feId?: string;
    feScope?: string;
    feCategory?: string;  // ★ 구분 (processFailureLinks 호환)
    feText?: string;
    feFunctionName?: string;  // ★ 완제품기능 (역전개)
    feRequirement?: string;  // ★ 요구사항 (역전개)
    severity?: number;
    fcId?: string;
    fcText?: string;
    fcWorkFunction?: string;  // ★ 작업요소기능 (역전개)
    fcProcessChar?: string;  // ★ 공정특성 (역전개)
    fcProcessCharSC?: string;  // ★ 공정 특별특성
    fcWorkElem?: string;
    fcProcess?: string;
    fcM4?: string;
  }>;
  structureConfirmed?: boolean;
  l1Confirmed?: boolean;
  l2Confirmed?: boolean;
  l3Confirmed?: boolean;
  failureL1Confirmed?: boolean;
  failureL2Confirmed?: boolean;
  failureL3Confirmed?: boolean;
  failureLinkConfirmed?: boolean;  // ✅ 고장연결 확정 상태
}

/**
 * 기존 중첩 구조 데이터를 원자성 DB 구조로 마이그레이션
 */
export function migrateToAtomicDB(oldData: OldWorksheetData | any): FMEAWorksheetDB {
  const db = createEmptyDB(oldData.fmeaId);
  
  
  // ★★★ 고장 데이터 입력 확인 ★★★
  const inputL2 = oldData.l2 || [];
  const totalFMCount = inputL2.reduce((acc: number, p: any) => acc + (Array.isArray(p?.failureModes) ? p.failureModes.length : 0), 0);
  const totalFCCount = inputL2.reduce((acc: number, p: any) => acc + (Array.isArray(p?.failureCauses) ? p.failureCauses.length : 0), 0);
  const totalL3FCCount = inputL2.reduce((acc: number, p: any) => {
    const l3s = Array.isArray(p?.l3) ? p.l3 : [];
    return acc + l3s.reduce((a2: number, we: any) => a2 + (Array.isArray(we?.failureCauses) ? we.failureCauses.length : 0), 0);
  }, 0);
  const feCount = Array.isArray(oldData?.l1?.failureScopes) ? oldData.l1.failureScopes.length : 0;
  const linkCount = Array.isArray(oldData?.failureLinks) ? oldData.failureLinks.length : 0;
  
  
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
  l1Types.forEach((type: { name?: string; functions?: any[] }) => {
    const category = type.name as 'Your Plant' | 'Ship to Plant' | 'User';
    const functions = type.functions || [];
    
    functions.forEach((func: { name?: string; requirements?: any[]; id?: string }) => {
      const requirements = func.requirements || [];

      if (requirements.length === 0) {
        // 요구사항 없는 경우에도 기능은 저장
        // ★ 2026-03-17: func.id (genC2) 보존 — uid() 대신 원본 ID 유지
        const l1Func: L1Function = {
          id: func.id || uid(),
          fmeaId: oldData.fmeaId,
          l1StructId: db.l1Structure?.id || '',
          category: category,
          functionName: func.name || '',
          requirement: '',
        };
        db.l1Functions.push(l1Func);
        l1FuncMap.set(l1Func.id, l1Func);
      } else {
        requirements.forEach((req: { id?: string; name?: string; failureEffect?: string; severity?: number }) => {
          const l1Func: L1Function = {
            id: req.id || uid(),  // 요구사항 ID 유지 (FE와 연결용)
            fmeaId: oldData.fmeaId,
            l1StructId: db.l1Structure?.id || '',
            category: category,
            functionName: func.name || '',
            requirement: req.name || '',
          };
          db.l1Functions.push(l1Func);
          l1FuncMap.set(l1Func.id, l1Func);
          
          // ★★★ 2026-02-08: req.failureEffect는 failureScopes가 없을 때만 FE 생성 ★★★
          // failureScopes가 정의되어 있으면 (빈 배열이라도) 거기서만 FE를 생성 → 중복/좀비 방지
          const usesFailureScopes = Array.isArray(oldData.l1?.failureScopes);
          if (req.failureEffect && !usesFailureScopes) {
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
  // ★★★ FK 원자성 보장 + 인덱싱 ID 적용 + 누락 절대 금지 ★★★
  const legacyScopes = oldData.l1?.failureScopes || [];
  let feIdx = 0; // FE 항목 인덱스
  legacyScopes.forEach((fs: { id?: string; reqId?: string; effect?: string; name?: string; severity?: number; scope?: string; requirement?: string }, fsLocalIdx: number) => {
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
    }
    
    // ★★★ targetFunc가 없으면 자동 생성 (누락 금지) ★★★
    if (!targetFunc) {
      // ★ 2026-03-17: fs.reqId(genC3) 보존 — 결정론적 ID (uid() 대신)
      const tempL1FuncId = fs.reqId || uid();
      targetFunc = {
        id: tempL1FuncId,
        fmeaId: oldData.fmeaId,
        l1StructId: db.l1Structure?.id || '',
        category: (fs.scope as any) || 'Your Plant',
        functionName: '',
        requirement: fs.requirement || '',
      };
      db.l1Functions.push(targetFunc);
      l1FuncMap.set(targetFunc.id, targetFunc);
    }
    
    const category = (fs.scope as any) || targetFunc.category || 'Your Plant';
    
    // ★★★ P7: uid()로 통일 — 충돌 위험 제거 ★★★
    const feId = fs.id || uid();
    
    db.failureEffects.push({
      id: feId,
      fmeaId: oldData.fmeaId,
      l1FuncId: targetFunc.id,
      category,
      effect: fs.effect || fs.name || '',
      severity: fs.severity ?? 0,
    });
    feIdx++;
  });
  
  // 3. L2 구조분석 (메인공정) + L2 기능분석 + L3 구조/기능분석
  // ★★★ 2026-02-05: rowIndex 계산을 위한 글로벌 카운터 ★★★
  let globalRowIndex = 0;  // 전체 워크시트 행 인덱스
  
  const l2Data = oldData.l2 || [];
  l2Data.forEach((proc: any, pIdx: number) => {
    // 빈 공정 스킵
    if (!proc.name || proc.name.includes('클릭') || proc.name.includes('선택')) {
      return;
    }
    
    // L2 구조분석
    // ★★★ 2026-02-05: rowIndex 추가 ★★★
    const l2RowIndex = globalRowIndex;
    const l2Struct: L2Structure = {
      id: proc.id || uid(),
      fmeaId: oldData.fmeaId,
      l1Id: db.l1Structure?.id || '',
      no: proc.no || '',
      name: proc.name,
      order: proc.order || 0,
      rowIndex: l2RowIndex,  // ★ 행 위치
      colIndex: 1,           // ★ L2는 컬럼 1
    };
    db.l2Structures.push(l2Struct);
    
    // L2 기능분석 (메인공정 기능 → 제품특성)
    const procFuncs = proc.functions || [];
    procFuncs.forEach((func: any) => {
      const productChars = func.productChars || [];
      
      if (productChars.length === 0) {
        db.l2Functions.push({
          id: func.id || uid(),
          fmeaId: oldData.fmeaId,
          l2StructId: l2Struct.id,
          functionName: (func.name ?? '').trim() || 'N/A',
          productChar: (func.name ?? '').trim() || 'N/A',
        });
      } else {
        productChars.forEach((pc: any) => {
          const l2Func: L2Function = {
            id: pc.id || uid(),
            fmeaId: oldData.fmeaId,
            l2StructId: l2Struct.id,
            functionName: (func.name ?? '').trim() || 'N/A',
            productChar: (pc.name ?? '').trim() || (func.name ?? '').trim() || 'N/A',
            specialChar: pc.specialChar,
          };
          db.l2Functions.push(l2Func);
        });
      }
    });
    // INV-01: L2Structure에 L2Function이 하나도 없으면 공정명으로 기본 1건 생성
    if (!db.l2Functions.some(f => f.l2StructId === l2Struct.id)) {
      db.l2Functions.push({
        id: uid(),
        fmeaId: oldData.fmeaId,
        l2StructId: l2Struct.id,
        functionName: l2Struct.name || 'N/A',
        productChar: l2Struct.name || 'N/A',
      });
    }
    
    // L2 고장형태 (FM) - ✅ productCharId 보존
    // ★★★ 하이브리드 ID + 모자관계 + 병합그룹 ★★★
    const fmeaSeq = extractFmeaSeq(oldData.fmeaId);
    const failureModes = proc.failureModes || [];
    let fmIdx = 0; // FM 항목 인덱스 (1-based)
    
    failureModes.forEach((fm: any, fmLocalIdx: number) => {
      if (!fm.name || fm.name.includes('클릭') || fm.name.includes('추가')) {
        return; // 빈 FM 스킵
      }
      
      // productCharId가 있으면 해당 제품특성의 L2Function 연결
      let relatedL2Func = fm.productCharId 
        ? db.l2Functions.find(f => f.id === fm.productCharId)
        : null;
      // 없으면 첫 번째 L2Function 사용
      if (!relatedL2Func) {
        relatedL2Func = db.l2Functions.find(f => f.l2StructId === l2Struct.id);
      }
      // ★★★ 핵심: L2Function이 없으면 기본 생성하여 FK 오류 방지 ★★★
      if (!relatedL2Func && db.l2Functions.length > 0) {
        relatedL2Func = db.l2Functions[0];
      }
      // L2Function이 여전히 없으면 임시 생성
      if (!relatedL2Func) {
        const tempPath = createL2Path(pIdx + 1, 0, 0);
        const tempL2FuncId = createHybridId({ 
          fmeaSeq, type: 'L2F', path: tempPath, seq: 1 
        });
        const tempFuncName = (fm.name || '').replace(/\s*부적합$/, '').trim() || l2Struct.name || 'N/A';
        const tempL2Func = {
          id: tempL2FuncId,
          fmeaId: oldData.fmeaId,
          l2StructId: l2Struct.id,
          parentId: l2Struct.id,
          functionName: tempFuncName,
          productChar: tempFuncName,
          specialChar: '',
        };
        db.l2Functions.push(tempL2Func);
        relatedL2Func = tempL2Func;
      }
      
      fmIdx++;
      
      // ★★★ 하이브리드 ID: {FMEA_SEQ}-FM-{PATH}-{SEQ} ★★★
      const funcIdx = db.l2Functions.findIndex(f => f.id === relatedL2Func!.id);
      const charIdx = fm.productCharId ? 1 : 0;
      const fmPath = createL2Path(pIdx + 1, funcIdx + 1, charIdx);
      const fmId = fm.id || createHybridId({
        fmeaSeq,
        type: 'FM',
        path: fmPath,
        seq: fmIdx,
      });
      
      // ★★★ 병합 그룹: 같은 공정+특성은 같은 그룹 ★★★
      const mergeGroupId = createMergeGroupId(fmeaSeq, 'FM', fmPath);
      
      db.failureModes.push({
        id: fmId,
        fmeaId: oldData.fmeaId,
        l2FuncId: relatedL2Func.id, // ★ 항상 유효한 ID
        l2StructId: l2Struct.id,
        productCharId: fm.productCharId || null,
        mode: fm.name,
        specialChar: fm.sc,
        // ★★★ 모자관계 + 병합그룹 ★★★
        parentId: relatedL2Func.id,  // 부모: L2Function (제품특성)
        mergeGroupId,                 // 병합 그룹
        rowSpan: 1,                   // 기본값 (렌더링 시 계산)
      });
    });
    
    // L3 구조분석 (작업요소) + L3 기능분석
    // ★★★ 2026-02-05: L3별 rowIndex 카운터 ★★★
    let l3LocalRowIndex = 0;
    
    const l3Data = proc.l3 || [];
    l3Data.forEach((we: any, weIdx: number) => {
      // 빈 작업요소 스킵
      if (!we.name || we.name.includes('클릭') || we.name.includes('추가')) {
        return;
      }
      
      // L3 구조분석
      // ★★★ 2026-02-05: rowIndex 추가 ★★★
      const l3Struct: L3Structure = {
        id: we.id || uid(),
        fmeaId: oldData.fmeaId,
        l1Id: db.l1Structure?.id || '',
        l2Id: l2Struct.id,
        m4: (we.m4 as any) || '',
        name: we.name,
        order: we.order || 0,
        rowIndex: globalRowIndex + l3LocalRowIndex,  // ★ 행 위치
        colIndex: 3,  // ★ L3는 컬럼 3 (4M+1E)
        parentId: l2Struct.id,  // ★ 부모는 L2
      };
      db.l3Structures.push(l3Struct);
      l3LocalRowIndex++;
      
      // L3 기능분석 (작업요소 기능 → 공정특성)
      // ★★★ 2026-03-01: 빈 functionName/processChar 안전 처리 (500 에러 방지) ★★★
      const weFuncs = we.functions || [];
      const weName = (we.name || '').trim();
      weFuncs.forEach((func: any) => {
        const funcName = (func.name ?? '').trim();
        const processChars = func.processChars || [];
        const effectiveFuncName = funcName || weName;

        if (processChars.length === 0) {
          if (!effectiveFuncName) return;
          db.l3Functions.push({
            id: func.id || uid(),
            fmeaId: oldData.fmeaId,
            l3StructId: l3Struct.id,
            l2StructId: l2Struct.id,
            functionName: effectiveFuncName,
            processChar: effectiveFuncName,
          });
        } else {
          processChars.forEach((pc: any) => {
            const pcName = (pc.name ?? '').trim();
            if (!effectiveFuncName && !pcName) return;
            const l3Func: L3Function = {
              id: pc.id || uid(),
              fmeaId: oldData.fmeaId,
              l3StructId: l3Struct.id,
              l2StructId: l2Struct.id,
              functionName: effectiveFuncName,
              processChar: pcName || effectiveFuncName,
              specialChar: pc.specialChar,
            };
            db.l3Functions.push(l3Func);
          });
        }
      });
      // WE에 function이 없거나 모두 스킵된 경우 → WE 이름으로 L3Function 1건 보장
      if (weName && !db.l3Functions.some(f => f.l3StructId === l3Struct.id)) {
        db.l3Functions.push({
          id: `${l3Struct.id}-L3F`,
          fmeaId: oldData.fmeaId,
          l3StructId: l3Struct.id,
          l2StructId: l2Struct.id,
          functionName: weName,
          processChar: weName,
        });
      }

      // ★ 2026-03-20: 폴백 생성 제거 — Excel 원본 데이터만 사용 (Atomic DB SSoT)
    });

    // ✅ L3 고장원인 (FC) - proc.failureCauses에서 읽기
    // ★★★ 하이브리드 ID + 모자관계 + 병합그룹 ★★★
    const procFailureCauses = proc.failureCauses || [];
    let fcIdx = 0; // FC 항목 인덱스 (1-based)
    
    procFailureCauses.forEach((fc: any, fcLocalIdx: number) => {
      const fcNameTrimmed = (fc.name || '').trim();
      if (!fcNameTrimmed
        || fcNameTrimmed === '고장원인 선택'
        || fcNameTrimmed === '클릭하여 추가'
        || fcNameTrimmed === '여기를 클릭하여 추가'
        || fcNameTrimmed === '고장원인을 입력하세요') {
        return;
      }
      
      // ★★★ 2026-03-15 FIX: processCharId → L3Function 다단계 매칭 (FC 누락 방지) ★★★
      // 1순위: processCharId로 직접 ID 매칭 (L3Function.id === processChar.id)
      let relatedL3Func = fc.processCharId
        ? db.l3Functions.find(f => f.id === fc.processCharId)
        : null;
      // 2순위: processChar 이름으로 매칭 (ID 불일치 시 이름 기반 복구)
      if (!relatedL3Func && fc.processCharId) {
        const fcPcName = (fc.name || '').replace(/\s*부적합$/, '').trim();
        if (fcPcName) {
          relatedL3Func = db.l3Functions.find(f =>
            f.l2StructId === l2Struct.id && f.processChar === fcPcName
          );
        }
      }
      // 3순위: 같은 공정의 m4 일치 L3Function
      if (!relatedL3Func && fc.m4) {
        const m4Key = String(fc.m4).toUpperCase();
        const l3StructsForM4 = db.l3Structures.filter(s =>
          s.l2Id === l2Struct.id && String(s.m4 || '').toUpperCase() === m4Key
        );
        if (l3StructsForM4.length > 0) {
          const l3StructIds = new Set(l3StructsForM4.map(s => s.id));
          relatedL3Func = db.l3Functions.find(f => l3StructIds.has(f.l3StructId));
        }
      }
      // 4순위: 해당 공정의 첫 번째 L3Function
      if (!relatedL3Func) {
        relatedL3Func = db.l3Functions.find(f => f.l2StructId === l2Struct.id);
      }
      // ★ 2026-03-20: L3Function 매칭 실패 시 해당 FC 스킵 (폴백 생성 제거)
      if (!relatedL3Func) {
        console.warn(`[migration] FC "${fc.name}" 매칭 실패 — L3Function 없음 (공정: ${l2Struct.name}). 스킵.`);
        return;
      }
      
      fcIdx++;
      
      // ★★★ 하이브리드 ID: {FMEA_SEQ}-FC-{PATH}-{SEQ} ★★★
      const weIdx = db.l3Structures.findIndex(s => s.id === relatedL3Func!.l3StructId);
      const funcIdx = db.l3Functions.findIndex(f => f.id === relatedL3Func!.id);
      const charIdx = fc.processCharId ? 1 : 0;
      const fcPath = createL3Path(pIdx + 1, weIdx + 1, funcIdx + 1, charIdx);
      const fcId = fc.id || createHybridId({
        fmeaSeq,
        type: 'FC',
        path: fcPath,
        seq: fcIdx,
      });
      
      // ★★★ 동일공정 동일원인 중복 방지 (2026-03-19) ★★★
      const dupFc = db.failureCauses.find(
        c => c.l2StructId === l2Struct.id && c.cause === fc.name
      );
      if (dupFc) return;

      // ★★★ 병합 그룹: 같은 공정+작업요소+특성은 같은 그룹 ★★★
      const fcMergeGroupId = createMergeGroupId(fmeaSeq, 'FC', fcPath);
      
      db.failureCauses.push({
        id: fcId,
        fmeaId: oldData.fmeaId,
        l3FuncId: relatedL3Func!.id,
        l3StructId: relatedL3Func!.l3StructId,
        l2StructId: l2Struct.id,
        processCharId: fc.processCharId || null,
        cause: fc.name,
        occurrence: fc.occurrence,
        // ★★★ 모자관계 + 병합그룹 ★★★
        parentId: relatedL3Func.id, // 부모: L3Function (공정특성)
        mergeGroupId: fcMergeGroupId,
        rowSpan: 1,
      });
      // ★ 2026-03-17 FIX: fcIdx++ 이중증가 제거 (line 548에서 이미 증가함)
    });
    
    // ✅ 하위 호환: we.failureCauses도 확인 (기존 데이터 마이그레이션용)
    l3Data.forEach((we: any) => {
      if (we.failureCauses && we.failureCauses.length > 0) {
        const l3Struct = db.l3Structures.find(s => s.id === we.id);
        if (l3Struct) {
          we.failureCauses.forEach((fc: any) => {
            const relatedL3Func = db.l3Functions.find(f => f.l3StructId === l3Struct.id);
            if (relatedL3Func) {
              // ★★★ 동일공정 동일원인 중복 방지 (2026-03-19) ★★★
              const dupFc = db.failureCauses.find(
                c => c.l2StructId === relatedL3Func.l2StructId && c.cause === fc.name
              );
              if (dupFc) return;

              db.failureCauses.push({
                id: fc.id || uid(),
                fmeaId: oldData.fmeaId,
                l3FuncId: relatedL3Func.id,
                l3StructId: relatedL3Func.l3StructId,
                l2StructId: relatedL3Func.l2StructId,
                cause: fc.name,
                occurrence: fc.occurrence,
              });
            }
          });
        }
      }
    });
    
    // ★★★ 2026-02-05: 공정 처리 완료 후 globalRowIndex 업데이트 ★★★
    const l3CountForProc = l3Data.filter((we: any) => 
      we.name && !we.name.includes('클릭') && !we.name.includes('추가')
    ).length;
    globalRowIndex += Math.max(1, l3CountForProc);
  });
  
  // 4. 기존 고장연결 데이터 마이그레이션
  // ★★★ FK 원자성 보장 + 인덱싱 ID 적용 + 누락 절대 금지 ★★★
  const oldLinks = oldData.failureLinks || [];
  let linkIdx = 0; // Link 항목 인덱스
  oldLinks.forEach((oldLink: any, linkLocalIdx: number) => {
    // FM 찾기 — ★★★ 2026-03-17: ID 우선 매칭 (텍스트 fallback 분리) ★★★
    // 이전: find(m => m.id === fmId || m.mode === fmText) → 동일 텍스트의 다른 공정 FM이 먼저 매칭
    // 수정: ID 매칭 우선, 실패 시에만 텍스트 fallback (동명 FM 충돌 방지)
    let fm = db.failureModes.find(m => m.id === oldLink.fmId)
      || (oldLink.fmText ? db.failureModes.find(m => m.mode === oldLink.fmText) : undefined);
    // strict 매칭: 공백 제거 후 비교 (띄어쓰기 차이로 인한 uid() 신규 FM 생성 방지)
    if (!fm && oldLink.fmText) {
      const strictText = oldLink.fmText.replace(/\s+/g, '').toLowerCase();
      fm = db.failureModes.find(m => m.mode && m.mode.replace(/\s+/g, '').toLowerCase() === strictText);
    }
    if (!fm) {
      if (oldLink.fmText && db.l2Functions.length > 0) {
        const tempFmId = uid();
        fm = {
          id: tempFmId,
          fmeaId: oldData.fmeaId,
          l2FuncId: db.l2Functions[0].id,
          l2StructId: db.l2Structures[0]?.id || '',
          productCharId: undefined,
          mode: oldLink.fmText,
          specialChar: false,
        };
        db.failureModes.push(fm);
      } else {
        console.error('[마이그레이션] FailureLink 저장 불가 (FM 생성 실패):', oldLink);
        return;
      }
    }
    
    // FE 찾기 (ID 또는 텍스트로)
    let fe = db.failureEffects.find(e => e.id === oldLink.feId);
    if (!fe && oldLink.feText) {
      fe = db.failureEffects.find(e => e.effect === oldLink.feText);
    }
    // ★ FE 매칭 실패 시 해당 FailureLink 스킵 (폴백 생성 제거)
    if (!fe) {
      console.warn(`[migration] FailureLink 스킵 — FE 매칭 실패: feId=${oldLink.feId}, link=${oldLink.id || linkLocalIdx}`);
      return;
    }
    
    // FC 찾기 (ID → 텍스트 → strict 매칭)
    let fc = db.failureCauses.find(c => c.id === oldLink.fcId);
    if (!fc && oldLink.fcText) {
      fc = db.failureCauses.find(c => c.cause === oldLink.fcText);
    }
    if (!fc && oldLink.fcText) {
      const strictFc = oldLink.fcText.replace(/\s+/g, '').toLowerCase();
      fc = db.failureCauses.find(c => c.cause && c.cause.replace(/\s+/g, '').toLowerCase() === strictFc);
    }
    // ★ 2026-03-20: FC 자동생성 폴백 제거 — FC 매칭 실패 시 해당 FailureLink 스킵
    if (!fc) {
      console.warn(`[migration] FailureLink 스킵 — FC 매칭 실패: fcId=${oldLink.fcId}, fcText=${oldLink.fcText}`);
      return;
    }
    
    // ★★★ 핵심: FM, FE, FC 모두 유효해야 저장 ★★★
    if (fm && fe && fc) {
      // ★★★ 동일 FM+FE+FC 트리플 FL 중복 방지 (2026-03-20) ★★★
      // Prisma @@unique([fmeaId, fmId, feId, fcId]) 기준 — 동일 FC가 다른 FM에 연결 허용
      if (db.failureLinks.some(l => l.fmId === fm!.id && l.feId === fe!.id && l.fcId === fc!.id)) return;

      linkIdx++;
      
      // ★★★ 2026-03-16: 기존 link.id 보존 (genFC() 계층 UUID가 Legacy JSON에 저장됨) ★★★
      const linkId = oldLink.id || uid();
      const linkFmeaSeq = extractFmeaSeq(oldData.fmeaId);
      const fmSeq = db.failureModes.findIndex(m => m.id === fm!.id) + 1;
      const feSeq = db.failureEffects.findIndex(e => e.id === fe!.id) + 1;
      const fcSeq = db.failureCauses.findIndex(c => c.id === fc!.id) + 1;

      // FM 경로에서 추출 (역전개 추적용)
      const fmParsed = parseHybridId(fm.id);
      const feParsed = parseHybridId(fe.id);
      const fcParsed = parseHybridId(fc.id);
      
      db.failureLinks.push({
        id: linkId,
        fmeaId: oldData.fmeaId,
        fmId: fm.id,
        feId: fe.id,
        fcId: fc.id,
        // ★★★ 순번 및 경로 정보 (역전개 추적용) ★★★
        fmSeq,
        feSeq,
        fcSeq,
        fmPath: fmParsed?.path || '',
        fePath: feParsed?.path || '',
        fcPath: fcParsed?.path || '',
        parentId: fm.id,
        mergeGroupId: createMergeGroupId(linkFmeaSeq, 'LK', `FM${fmSeq.toString().padStart(3, '0')}`),
        rowSpan: oldLink.fmMergeSpan && oldLink.fmMergeSpan > 1 ? oldLink.fmMergeSpan : 1,
        cache: {
          fmText: fm.mode || oldLink.fmText || '',
          fmProcess: oldLink.fmProcess || oldLink.fmProcessNo || '',
          feText: fe.effect || oldLink.feText || '',
          feCategory: fe.category || oldLink.feScope || '',
          feSeverity: fe.severity || oldLink.severity || 0,
          fcText: fc.cause || oldLink.fcText || '',
          fcWorkElem: oldLink.fcWorkElem || '',
          fcProcess: oldLink.fcProcess || '',
        },
      } as FailureLink);
    } else {
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
    failureLink: oldData.failureLinkConfirmed || false,
    risk: false,
    optimization: false,
  };
  
  
  // ============ 고장분석 통합 데이터 생성 ============
  // 고장연결 확정 시 자동 생성 (역전개 기능분석 + 역전개 구조분석 포함)
  if (db.failureLinks.length > 0 && db.confirmed.failureLink) {
    try {
      db.failureAnalyses = buildFailureAnalyses(db);
    } catch (error) {
      db.failureAnalyses = [];
    }
  } else {
    db.failureAnalyses = [];
  }
  
  // ============ 리스크분석 데이터 생성 ============
  // ★★★ 2026-03-18 재설계: FailureLink 기반 RA 생성은 riskData 유무와 무관하게 실행 ★★★
  // 이전: if (Object.keys(riskData).length > 0) 으로 감싸 → riskData 빈 객체면 RA 0건 (구멍)
  // 수정: FailureLink 1:1 RA 보장을 riskData 조건 밖으로 이동
  const riskData = (oldData as any).riskData || {};
  db.riskAnalyses = [];

  // ★ 1단계: 모든 FailureLink에 대해 RiskAnalysis 무조건 생성 (riskData 유무 무관)
  if (db.failureLinks.length > 0) {
    db.failureLinks.forEach((link) => {
      const uniqueKey = `${link.fmId}-${link.fcId}`;

      // riskData에서 SOD 값 추출 (있으면 사용, 없으면 0)
      const oKey = `risk-${uniqueKey}-O`;
      const dKey = `risk-${uniqueKey}-D`;
      const preventionKey = `prevention-${uniqueKey}`;
      const detectionKey = `detection-${uniqueKey}`;

      const oVal = typeof riskData[oKey] === 'number' ? riskData[oKey] : Number(riskData[oKey]);
      const occurrence = (!isNaN(oVal) && oVal >= 1 && oVal <= 10) ? oVal : 0;
      const dVal = typeof riskData[dKey] === 'number' ? riskData[dKey] : Number(riskData[dKey]);
      const detection = (!isNaN(dVal) && dVal >= 1 && dVal <= 10) ? dVal : 0;

      // 심각도: link.severity → cache.feSeverity → failureEffect.severity → 0
      let severity = 0;
      if (typeof (link as any).severity === 'number' && (link as any).severity > 0) {
        severity = (link as any).severity;
      } else if ((link as any).cache?.feSeverity) {
        severity = (link as any).cache.feSeverity;
      } else {
        const fe = db.failureEffects.find(e => e.id === link.feId);
        if (fe && fe.severity) {
          severity = fe.severity;
        }
      }

      const preventionControl = typeof riskData[preventionKey] === 'string' ? riskData[preventionKey] : undefined;
      const detectionControl = typeof riskData[detectionKey] === 'string' ? riskData[detectionKey] : undefined;
      const lldReference = typeof riskData[`lesson-${uniqueKey}`] === 'string' ? (riskData[`lesson-${uniqueKey}`] as string) : undefined;

      const apValue = (severity > 0 && occurrence > 0 && detection > 0)
        ? calculateAP(severity, occurrence, detection)
        : 'L';

      db.riskAnalyses.push({
        id: uid(),
        fmeaId: db.fmeaId,
        linkId: link.id,
        severity,
        occurrence,
        detection,
        ap: apValue as 'H' | 'M' | 'L',
        preventionControl,
        detectionControl,
        lldReference,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });
  }

  // ★ 2단계: rowIndex 기반 레거시 키 처리 (riskData 있을 때만)
  if (Object.keys(riskData).length > 0) {
    const rowIndexPattern = /^risk-(\d+)-[OD]$/;
    const rowIndexKeys = Object.keys(riskData).filter(k => rowIndexPattern.test(k));

    if (rowIndexKeys.length > 0) {
      const rowIndices = new Set<number>();
      rowIndexKeys.forEach(k => {
        const match = k.match(rowIndexPattern);
        if (match) rowIndices.add(parseInt(match[1], 10));
      });

      rowIndices.forEach(rowIdx => {
        const oKey = `risk-${rowIdx}-O`;
        const dKey = `risk-${rowIdx}-D`;

        const occurrence = typeof riskData[oKey] === 'number' ? riskData[oKey] : 0;
        const detection = typeof riskData[dKey] === 'number' ? riskData[dKey] : 0;

        if (occurrence > 0 || detection > 0) {
          const matchingLink = db.failureLinks[rowIdx];
          if (!matchingLink) return; // 유효한 FailureLink 없으면 스킵 (무효 linkId 방지)

          const alreadyExists = db.riskAnalyses.some(r => r.linkId === matchingLink.id);
          if (!alreadyExists) {
            db.riskAnalyses.push({
              id: uid(),
              fmeaId: db.fmeaId,
              linkId: matchingLink.id,
              severity: 0,
              occurrence,
              detection,
              ap: 'L' as 'H' | 'M' | 'L',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        }
      });
    }
  }
  
  
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
    failureLinkConfirmed: db.confirmed.failureLink,  // ✅ 고장연결 확정 상태 추가
  };
  
  
  // FE를 다시 failureScopes로 역변환 (요구사항 기준)
  const l1FuncMap = new Map<string, { reqName: string; category: string }>();
  db.l1Functions.forEach((f: any) => {
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

  // L1 기능 → types 구조로 변환
  const categoryGroups = new Map<string, Map<string, L1Function[]>>();
  db.l1Functions.forEach((f: any) => {
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
    l2Funcs.forEach((f: any) => {
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
    
    // FM - ✅ productCharId 복원
    const fms = db.failureModes.filter(m => m.l2StructId === l2.id);
    procObj.failureModes = fms.map(m => ({
      id: m.id,
      name: m.mode,
      sc: m.specialChar,
      productCharId: m.productCharId || '', // ✅ productCharId 복원
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
      l3Funcs.forEach((f: any) => {
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
      
      procObj.l3.push(weObj);
    });
    
    // ✅ FC는 proc.failureCauses에 저장 (l2StructId 기준으로 그룹화)
    // ✅ processCharId 복원: DB에 processCharId가 없으면 l3FuncId로 fallback
    // (워크시트에서 processChar.id === L3Function.id 이므로 동일한 FK)
    const allFcs = db.failureCauses.filter(c => c.l2StructId === l2.id);
    procObj.failureCauses = allFcs.map(fc => ({
      id: fc.id,
      name: fc.cause,
      occurrence: fc.occurrence,
      processCharId: fc.processCharId || fc.l3FuncId || '', // ✅ l3FuncId fallback (FC 누락 방지)
    }));
    
    result.l2.push(procObj);
  });
  
  // FailureLinks 변환 (failureAnalyses 또는 원자성 테이블 기준으로 텍스트 복원)
  const feById = new Map(db.failureEffects.map(fe => [fe.id, fe]));
  const fmById = new Map(db.failureModes.map(fm => [fm.id, fm]));
  const fcById = new Map(db.failureCauses.map(fc => [fc.id, fc]));
  const l2ById = new Map(db.l2Structures.map(l2 => [l2.id, l2]));
  const l3ById = new Map(db.l3Structures.map(l3 => [l3.id, l3]));
  const analysisByLinkId = new Map(db.failureAnalyses.map(fa => [fa.linkId, fa]));

  db.failureLinks.forEach((link: any) => {
    const analysis = analysisByLinkId.get(link.id);
    const fm = fmById.get(link.fmId);
    const fe = feById.get(link.feId);
    const fc = fcById.get(link.fcId);
    // ★ FM → L2Structure에서 공정명/공정번호 확보 (DB 관계 기반)
    const fmL2 = fm?.l2StructId ? l2ById.get(fm.l2StructId) : null;
    const fmProcessName = analysis?.fmProcessName || fmL2?.name || '';
    const fmProcessNo = link.fmProcessNo || fmL2?.no || '';
    const fcWorkElem = analysis?.fcWorkElementName || (fc?.l3StructId ? l3ById.get(fc.l3StructId)?.name : '') || '';
    const fcProcess = analysis?.l2StructName || (fc?.l2StructId ? l2ById.get(fc.l2StructId)?.name : '') || '';
    const fcM4 = analysis?.fcM4 || (fc?.l3StructId ? l3ById.get(fc.l3StructId)?.m4 : '') || '';

    result.failureLinks!.push({
      fmId: link.fmId,
      fmText: analysis?.fmText || fm?.mode || '',
      fmProcess: fmProcessName,
      fmProcessNo,  // ★ 공정번호 (DB 관계 기반 — 역추적 아님)
      fmProcessName: fmProcessName,  // ★ processFailureLinks 호환
      fmProcessFunction: analysis?.l2FuncName || '',  // ★ 공정기능 (역전개)
      fmProductChar: analysis?.l2ProductChar || '',    // ★ 제품특성 (역전개)
      fmProductCharSC: analysis?.l2SpecialChar || '',  // ★ 제품 특별특성
      feId: link.feId,
      feScope: analysis?.feCategory || fe?.category,
      feCategory: analysis?.feCategory || fe?.category || '',  // ★ processFailureLinks 호환
      feText: analysis?.feText || fe?.effect || '',
      feFunctionName: analysis?.l1FuncName || '',      // ★ 완제품기능 (역전개)
      feRequirement: analysis?.l1Requirement || '',    // ★ 요구사항 (역전개)
      severity: analysis?.feSeverity ?? fe?.severity ?? 0,
      fcId: link.fcId,
      fcText: analysis?.fcText || fc?.cause || '',
      fcWorkFunction: analysis?.l3FuncName || '',      // ★ 작업요소기능 (역전개)
      fcProcessChar: analysis?.l3ProcessChar || '',    // ★ 공정특성 (역전개)
      fcProcessCharSC: analysis?.l3SpecialChar || '',  // ★ 공정 특별특성
      fcWorkElem,
      fcProcess,
      fcM4,
    });
  });

  // ★★★ 2026-02-16: DB Only 정책 - riskData도 riskAnalyses에서 역변환 ★★★
  const riskData: { [key: string]: number | string } = {};
  if (db.riskAnalyses && db.riskAnalyses.length > 0) {
    const riskByLinkId = new Map(db.riskAnalyses.map(r => [r.linkId, r]));
    db.failureLinks.forEach((link: any) => {
      const risk = riskByLinkId.get(link.id);
      if (!risk) return;
      const fm = fmById.get(link.fmId);
      const fc = fcById.get(link.fcId);
      if (!fm || !fc) return;
      const uniqueKey = `${link.fmId}-${link.fcId}`;
      if (risk.severity > 0) riskData[`risk-${uniqueKey}-S`] = risk.severity;
      if (risk.occurrence > 0) riskData[`risk-${uniqueKey}-O`] = risk.occurrence;
      if (risk.detection > 0) riskData[`risk-${uniqueKey}-D`] = risk.detection;
      if (risk.preventionControl) riskData[`prevention-${uniqueKey}`] = risk.preventionControl;
      if (risk.detectionControl) riskData[`detection-${uniqueKey}`] = risk.detectionControl;
    });
  }

  // ★★★ 2026-03-15: Optimization 데이터 복원 (6단계 최적화) ★★★
  if (db.optimizations && db.optimizations.length > 0) {
    // Group optimizations by riskId
    const optByRiskId = new Map<string, typeof db.optimizations>();
    for (const opt of db.optimizations) {
      const arr = optByRiskId.get(opt.riskId) || [];
      arr.push(opt);
      optByRiskId.set(opt.riskId, arr);
    }

    // For each riskAnalysis, reconstruct optimization keys
    if (db.riskAnalyses) {
      for (const risk of db.riskAnalyses) {
        const link = db.failureLinks?.find(l => l.id === risk.linkId);
        if (!link) continue;

        const fmId = link.fmId;
        const fcId = link.fcId;
        const uniqueKey = `${fmId}-${fcId}`;

        const opts = optByRiskId.get(risk.id) || [];
        if (opts.length > 0) {
          riskData[`opt-rows-${uniqueKey}`] = opts.length;
        }

        opts.forEach((opt, idx) => {
          // ★ 2026-03-18 FIX: suffix 형식을 UI(multiOptUtils)와 일치시킴 — '#N' 형식
          const suffix = idx === 0 ? '' : `#${idx}`;
          const sodSuffix = idx === 0 ? '' : `#${idx}`;
          if (opt.newSeverity != null) riskData[`opt-${uniqueKey}${sodSuffix}-S`] = opt.newSeverity;
          if (opt.newOccurrence != null) riskData[`opt-${uniqueKey}${sodSuffix}-O`] = opt.newOccurrence;
          if (opt.newDetection != null) riskData[`opt-${uniqueKey}${sodSuffix}-D`] = opt.newDetection;
          if (opt.newAP) riskData[`opt-${uniqueKey}${sodSuffix}-AP`] = opt.newAP;
          if (opt.recommendedAction) riskData[`prevention-opt-${uniqueKey}${suffix}`] = opt.recommendedAction;
          if (opt.responsible) riskData[`person-opt-${uniqueKey}${suffix}`] = opt.responsible;
          if (opt.targetDate) riskData[`targetDate-opt-${uniqueKey}${suffix}`] = opt.targetDate;
          if (opt.completedDate) riskData[`completeDate-opt-${uniqueKey}${suffix}`] = opt.completedDate;
          if (opt.status) riskData[`status-opt-${uniqueKey}${suffix}`] = opt.status;
          if (opt.remarks) riskData[`note-opt-${uniqueKey}${suffix}`] = opt.remarks;
        });
      }
    }
  }

  (result as any).riskData = riskData;

  // ★★★ 2026-03-15: 리스크/최적화 확정 상태 복원 ★★★
  if (db.confirmed) {
    (result as any).riskConfirmed = db.confirmed.risk ?? false;
    (result as any).optimizationConfirmed = db.confirmed.optimization ?? false;
  }

  return result;
}

/**
 * 고장연결 확정 및 저장
 * - 자동 변환 없음! 사용자가 입력한 FK 관계만 저장
 * - 확정 상태 업데이트
 */
export function confirmFailureLink(db: FMEAWorksheetDB): FMEAWorksheetDB {

  // DB 복사
  const confirmedDB = { ...db };

  // 확정 상태 업데이트
  confirmedDB.confirmed.failureLink = true;

  // ★★★ 2026-02-16: localStorage 저장 제거 (DB Only 정책) ★★★
  // 호출측에서 saveAtomicDB()를 통해 DB 저장

  // FK 관계 기반 데이터 조회 (검증용)
  const linkedData = getLinkedDataByFK(confirmedDB);
  
  
  return confirmedDB;
}

