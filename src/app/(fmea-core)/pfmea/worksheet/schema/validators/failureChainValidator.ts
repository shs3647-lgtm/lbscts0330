/**
 * @file schema/validators/failureChainValidator.ts
 * @description 고장사슬 검증 함수 (v2.3.0)
 *
 * 7개 핵심 검증 규칙:
 *   V1: FM-FE 미연결
 *   V2: FM-FC 미연결
 *   V3: FC 다중 FM 연결 (warning)
 *   V4: S(심각도) 누락
 *   V5: O/D 누락
 *   V6: PC(예방관리) 누락
 *   V7: DC(검출관리) 누락
 */

import { FMEAWorksheetDB } from '../types';
import { ChainValidationError, ChainValidationResult } from './types';

/**
 * 고장사슬 검증 — 사용자 요청 시에만 실행
 */
export function validateFailureChain(db: FMEAWorksheetDB): ChainValidationResult {
    const chainErrors: ChainValidationError[] = [];
    const summary: Record<string, number> = {};

    function addError(err: ChainValidationError) {
        chainErrors.push(err);
        summary[err.errorType] = (summary[err.errorType] || 0) + 1;
    }

    // ─── V1: FM에 FE 미연결 ───
    const fmLinkedFE = new Map<string, Set<string>>();
    const fmLinkedFC = new Map<string, Set<string>>();
    const fcToFMs = new Map<string, Set<string>>(); // FC별 연결된 FM set

    for (const link of db.failureLinks) {
        // FE 연결 추적
        if (!fmLinkedFE.has(link.fmId)) fmLinkedFE.set(link.fmId, new Set());
        if (link.feId) fmLinkedFE.get(link.fmId)!.add(link.feId);

        // FC 연결 추적
        if (!fmLinkedFC.has(link.fmId)) fmLinkedFC.set(link.fmId, new Set());
        if (link.fcId) fmLinkedFC.get(link.fmId)!.add(link.fcId);

        // FC→FM 역추적 (V3용)
        if (link.fcId) {
            if (!fcToFMs.has(link.fcId)) fcToFMs.set(link.fcId, new Set());
            fcToFMs.get(link.fcId)!.add(link.fmId);
        }
    }

    for (const fm of db.failureModes) {
        const feSet = fmLinkedFE.get(fm.id);
        const fcSet = fmLinkedFC.get(fm.id);

        // V1: FM에 FE 미연결
        if (!feSet || feSet.size === 0) {
            addError({
                level: 'error',
                field: `failureMode.${fm.id}`,
                message: `고장형태 "${fm.mode || ''}"에 고장영향(FE)이 연결되지 않았습니다.`,
                itemId: fm.id,
                fmText: fm.mode || '',
                errorType: 'V1',
            });
        }

        // V2: FM에 FC 미연결
        if (!fcSet || fcSet.size === 0) {
            addError({
                level: 'error',
                field: `failureMode.${fm.id}`,
                message: `고장형태 "${fm.mode || ''}"에 고장원인(FC)이 연결되지 않았습니다.`,
                itemId: fm.id,
                fmText: fm.mode || '',
                errorType: 'V2',
            });
        }
    }

    // ─── V3: FC 다중 FM 연결 (warning) ───
    for (const [fcId, fmSet] of fcToFMs) {
        if (fmSet.size > 1) {
            const fc = db.failureCauses.find(c => c.id === fcId);
            addError({
                level: 'warning',
                field: `failureCause.${fcId}`,
                message: `고장원인 "${fc?.cause || ''}"이(가) ${fmSet.size}개 FM에 중복 연결되었습니다.`,
                itemId: fcId,
                fcText: fc?.cause || '',
                errorType: 'V3',
            });
        }
    }

    // ─── V4: S(심각도) 누락 ───
    for (const fe of db.failureEffects) {
        if (!fe.severity || fe.severity < 1 || fe.severity > 10) {
            addError({
                level: 'error',
                field: `failureEffect.${fe.id}.severity`,
                message: `고장영향 "${fe.effect || ''}"의 심각도(S)가 누락되었습니다.`,
                itemId: fe.id,
                feText: fe.effect || '',
                errorType: 'V4',
            });
        }
    }

    // ─── V5/V6/V7: riskAnalyses 기반 검증 ───
    for (const risk of db.riskAnalyses) {
        const link = db.failureLinks.find(l => l.id === risk.linkId);
        const fmText = link ? (db.failureModes.find(m => m.id === link.fmId)?.mode || '') : '';

        // V5: O 또는 D 누락
        if (!risk.occurrence || risk.occurrence < 1 || !risk.detection || risk.detection < 1) {
            const missing = [];
            if (!risk.occurrence || risk.occurrence < 1) missing.push('O(발생도)');
            if (!risk.detection || risk.detection < 1) missing.push('D(검출도)');
            addError({
                level: 'warning',
                field: `riskAnalysis.${risk.linkId}`,
                message: `${missing.join(', ')} 누락 (FM: "${fmText}")`,
                chainId: risk.linkId,
                fmText,
                errorType: 'V5',
            });
        }

        // V6: PC(예방관리) 누락
        if (!risk.preventionControl || risk.preventionControl.trim() === '') {
            addError({
                level: 'warning',
                field: `riskAnalysis.${risk.linkId}.pc`,
                message: `예방관리(PC) 누락 (FM: "${fmText}")`,
                chainId: risk.linkId,
                fmText,
                errorType: 'V6',
            });
        }

        // V7: DC(검출관리) 누락
        if (!risk.detectionControl || risk.detectionControl.trim() === '') {
            addError({
                level: 'warning',
                field: `riskAnalysis.${risk.linkId}.dc`,
                message: `검출관리(DC) 누락 (FM: "${fmText}")`,
                chainId: risk.linkId,
                fmText,
                errorType: 'V7',
            });
        }
    }

    // 결과 분리
    const errors = chainErrors.filter(e => e.level === 'error');
    const warnings = chainErrors.filter(e => e.level === 'warning');


    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        missingCount: errors.length,
        totalCount: db.failureLinks.length,
        chainErrors,
        summary,
    };
}
