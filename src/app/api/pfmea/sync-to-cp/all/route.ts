/**
 * @file sync-to-cp/all/route.ts
 * @description PFMEA → CP 통합 연동 API (전체 단계 한번에 실행)
 * @created 2026-02-03
 * @modified 2026-02-07 분리배치 로직 적용 (Cartesian Product 제거)
 *
 * ★ 핵심 규칙 (PRD v2.0 §2.3):
 * - 같은 행에 제품특성(J열) + 공정특성(K열) 동시 배치 절대 금지
 * - 제품특성 행과 공정특성 행은 별도 행으로 분리 (분리배치)
 * - 표시 순서: 같은 공정 내에서 제품특성 행 → 공정특성 행
 * - 대응계획 기본값: 제품='재작업 또는 폐기', 공정='조건조정'
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { findOrCreateCp } from '../utils';
import { normalizeM4WithOriginal, isValidProcessNo, recordSyncLog, buildCpPreservedFieldsMap, restorePreservedFields } from '@/lib/sync-helpers';

interface L2Function {
    id?: string;
    name?: string;
    productChars?: Array<{
        id?: string;
        name?: string;
        specialChar?: string;
    }>;
}

interface L3Function {
    id?: string;
    name?: string;
    processChars?: Array<{
        id?: string;
        name?: string;
        specialChar?: string;
    }>;
}

interface L3WorkElement {
    id?: string;
    m4?: string;
    fourM?: string;
    name?: string;
    functions?: L3Function[];
    processChars?: Array<{
        id?: string;
        name?: string;
        specialChar?: string;
    }>;
}

interface L2Process {
    id?: string;
    no?: string;
    name?: string;
    level?: string;
    functions?: L2Function[];
    l3?: L3WorkElement[];
}

interface SyncResult {
    step: number;
    name: string;
    success: boolean;
    count: number;
    message: string;
}

export async function POST(request: NextRequest) {
    const prisma = getPrisma();
    if (!prisma) {
        return NextResponse.json(
            { success: false, error: 'Database connection failed' },
            { status: 500 }
        );
    }

    try {
        const body = await request.json();
        const { fmeaId, cpNo, l2Data, riskData } = body;

        if (!fmeaId || !cpNo) {
            return NextResponse.json(
                { success: false, error: 'fmeaId and cpNo are required' },
                { status: 400 }
            );
        }

        if (!l2Data || !Array.isArray(l2Data) || l2Data.length === 0) {
            return NextResponse.json(
                { success: false, error: 'l2Data array is required' },
                { status: 400 }
            );
        }

        const results: SyncResult[] = [];
        const startTime = Date.now();

        // ============================================
        // P0-2: riskData → refSeverity/O/D/AP 룩업 테이블 구축
        // riskData 키 형식: severity-{flatRowIdx}, occurrence-{flatRowIdx}, detection-{flatRowIdx}, ap-{flatRowIdx}
        // flatRowIdx는 모든 L2의 L3를 순서대로 펼친 인덱스
        // ============================================
        const riskByL2L3 = new Map<string, { refSeverity?: number; refOccurrence?: number; refDetection?: number; refAp?: string }>();
        const riskByL2 = new Map<string, { maxSeverity?: number }>();
        if (riskData && typeof riskData === 'object') {
            let flatIdx = 0;
            for (const l2 of l2Data as L2Process[]) {
                let l2MaxSeverity: number | undefined;
                for (const l3 of l2.l3 || []) {
                    const s = parseInt(riskData[`severity-${flatIdx}`]) || undefined;
                    const o = parseInt(riskData[`occurrence-${flatIdx}`]) || undefined;
                    const d = parseInt(riskData[`detection-${flatIdx}`]) || undefined;
                    const ap = riskData[`ap-${flatIdx}`] || undefined;
                    if (s || o || d || ap) {
                        riskByL2L3.set(`${l2.id}|${l3.id}`, { refSeverity: s, refOccurrence: o, refDetection: d, refAp: ap ? String(ap) : undefined });
                    }
                    if (s && (!l2MaxSeverity || s > l2MaxSeverity)) l2MaxSeverity = s;
                    flatIdx++;
                }
                if (l2MaxSeverity) {
                    riskByL2.set(String(l2.id), { maxSeverity: l2MaxSeverity });
                }
            }
        }

        // ============================================
        // 1단계: CP 조회/생성 및 초기화
        // ============================================
        const cp = await findOrCreateCp(prisma as any, cpNo, fmeaId);

        // ============================================
        // 2단계: L2 병합 + 분리배치 행 생성
        // ============================================
        const cpItems: any[] = [];
        let sortOrder = 0;
        let productCharCount = 0;
        let processCharCount = 0;
        let specialCharCount = 0;

        // ★ L2 공정번호 기준 병합 (같은 공정번호의 L2가 여러 행일 때 L3/functions 합침)
        const mergedL2Map = new Map<string, L2Process>();
        for (const l2 of l2Data as L2Process[]) {
            const key = (l2.no || '').trim();
            if (!key) continue;
            const existing = mergedL2Map.get(key);
            if (existing) {
                const existingL3Names = new Set((existing.l3 || []).map(l => (l.name || '').trim()));
                for (const l3 of l2.l3 || []) {
                    const l3Name = (l3.name || '').trim();
                    if (l3Name && !existingL3Names.has(l3Name)) {
                        existing.l3 = existing.l3 || [];
                        existing.l3.push(l3);
                        existingL3Names.add(l3Name);
                    }
                }
                const existingFuncNames = new Set((existing.functions || []).map(f => (f.name || '').trim()));
                for (const func of l2.functions || []) {
                    const funcName = (func.name || '').trim();
                    if (funcName && !existingFuncNames.has(funcName)) {
                        existing.functions = existing.functions || [];
                        existing.functions.push(func);
                        existingFuncNames.add(funcName);
                    }
                }
            } else {
                mergedL2Map.set(key, {
                    ...l2,
                    l3: [...(l2.l3 || [])],
                    functions: [...(l2.functions || [])],
                });
            }
        }
        const mergedL2Data = Array.from(mergedL2Map.values());

        // ★ C1: deleteMany 전에 사용자 편집 필드 보존
        const preservedMap = await buildCpPreservedFieldsMap(prisma, cp.id);

        // ★ 트랜잭션으로 deleteMany + create 원자성 보장
        await prisma.$transaction(async (tx: any) => {
            await tx.controlPlanItem.deleteMany({
                where: { cpId: cp.id },
            });

            // P1-8: 특성 타입 검증 — 제품특성과 공정특성 동시 존재 경고
            for (const l2 of mergedL2Data) {
                for (const l3 of l2.l3 || []) {
                    const l3Funcs = l3.functions || [];
                    const hasProcessCharsOnL3 = l3Funcs.some(f => (f.processChars || []).length > 0) || (l3.processChars || []).length > 0;
                    const hasProductCharsOnL2 = (l2.functions || []).some(f => (f.productChars || []).length > 0);
                    if (hasProcessCharsOnL3 && hasProductCharsOnL2) {
                        console.warn(`[FMEA→CP] 분리배치 검증: L2(${l2.no}) 제품특성 + L3(${(l3.name || '').substring(0, 20)}) 공정특성 동시 존재 → 별도 행으로 분리됨`);
                    }
                }
            }

            // ============================================
            // ★ 분리배치 로직: 제품특성/공정특성을 별도 행으로 분리
            // ============================================
            for (const l2 of mergedL2Data) {
                const processNo = (l2.no || '').trim();
                // ★ H8: processNo 포맷 검증 — 유효하지 않으면 스킵
                if (!isValidProcessNo(processNo)) continue;
                const processName = (l2.name || '').trim();
                const processLevel = (l2.level || 'Main').trim();
                const functions = l2.functions || [];
                const l3Elements = l2.l3 || [];

                // 공정설명 생성 (functions 이름 조합)
                const filteredFuncNames = functions
                    .map(f => (f.name || '').trim())
                    .filter(n => n && !n.includes('클릭') && !n.includes('자동생성') && !n.includes('추가'));
                const processDesc = filteredFuncNames.join(', ') || `${processName} 공정`;

                // 이 L2에서 생성된 행 수 추적 (fallback 판단용)
                const l2StartCount = cpItems.length;
                // ★ 공정별 NO 채번 (charIndex: 공정 내 순번 1, 2, 3...)
                let charIndex = 0;

                // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                // Phase A: 제품특성 행 (L2.functions[].productChars)
                // ★ L2 수준에서 수집 — L3 루프 밖에서 처리
                // ★ 표시 순서: 제품특성 행이 공정특성 행보다 위
                // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                const productCharDedup = new Set<string>();
                for (const func of functions) {
                    for (const pc of func.productChars || []) {
                        const pcName = (pc.name || '').trim();
                        if (!pcName || pcName.includes('클릭')) continue;
                        if (productCharDedup.has(pcName)) continue;
                        productCharDedup.add(pcName);

                        const specialChar = (pc.specialChar || '').trim();
                        if (specialChar) specialCharCount++;
                        productCharCount++;

                        // ★ C1: 사용자 편집 필드 복원
                        const restored = restorePreservedFields(preservedMap, processNo, '', pcName, '', '재작업 또는 폐기');
                        // P0-2: 제품특성 행 → L2 수준 최대 심각도 참조
                        const l2Risk = riskByL2.get(String(l2.id));
                        const savedItem = await tx.controlPlanItem.create({
                            data: {
                                cpId: cp.id,
                                processNo,
                                processName,
                                processLevel,
                                processDesc,
                                partName: '',              // ★ 빈값 — CP에서 사용자가 부품 추가 후 병합
                                workElement: '',          // 제품특성은 L2 수준
                                equipment: '',            // 제품특성은 설비 불필요
                                productChar: pcName,
                                processChar: '',          // ★ 분리배치: 공정특성 없음
                                specialChar,
                                charIndex: ++charIndex,   // ★ 공정별 NO 채번
                                rowType: 'product',
                                sortOrder: sortOrder++,
                                linkStatus: 'linked',
                                pfmeaProcessId: l2.id,
                                refSeverity: l2Risk?.maxSeverity,
                                // ★★★ 2026-03-14: 제품특성 FK 전파 (FMEA→CP 원자성 연동) ★★★
                                productCharId: (pc as { id?: string }).id || null,
                                ...restored,
                            },
                        });
                        cpItems.push(savedItem);
                    }
                }

                // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                // Phase B: 공정특성 행 (L3 작업요소 수준)
                // ★ 공정명 → 설비명(L3) → 공정특성 매핑
                // ★ MN(사람)은 CP 매핑 제외 (하드코딩)
                // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                const validL3Elements = l3Elements.filter(l3 => {
                    const name = (l3.name || '').trim();
                    if (name.startsWith('00 ')) return false;
                    if (/^\d+\s+00\s/.test(name)) return false;
                    return name.length > 0;
                });

                const processCharDedup = new Set<string>();

                for (const l3 of validL3Elements) {
                    // ★ 교차매핑 방어: L3 id 존재 여부 경고
                    const l3Any = l3 as Record<string, unknown>;
                    if (l3Any.l2StructureId && l3Any.l2StructureId !== l2.id) {
                    }
                    // ★ C2/H7: M4 정규화 + 원본 보존
                    const { normalized: m4, original: m4Original } = normalizeM4WithOriginal(l3.m4 || l3.fourM || '');
                    if (m4 === 'MN') continue;  // MN(사람)은 CP 매핑 제외

                    const workElement = (l3.name || '').trim().replace(/^\d*번[-\s]?/, '');
                    const equipment = workElement;  // ★ 설비명만 표시 (4M 프리픽스 제거)

                    // L3에서 공정특성 수집
                    const l3ProcessChars: Array<{ name: string; specialChar: string }> = [];

                    // 1. L3.functions[].processChars (신규 구조)
                    for (const l3Func of l3.functions || []) {
                        for (const pchar of l3Func.processChars || []) {
                            const pcharName = (pchar.name || '').trim();
                            if (pcharName && !pcharName.includes('클릭')) {
                                l3ProcessChars.push({
                                    name: pcharName,
                                    specialChar: (pchar.specialChar || '').trim(),
                                });
                            }
                        }
                    }

                    // 2. l3.processChars 폴백 (하위호환)
                    if (l3ProcessChars.length === 0) {
                        for (const pchar of l3.processChars || []) {
                            const pcharName = (pchar.name || '').trim();
                            if (pcharName && !pcharName.includes('클릭')) {
                                l3ProcessChars.push({
                                    name: pcharName,
                                    specialChar: (pchar.specialChar || '').trim(),
                                });
                            }
                        }
                    }

                    if (l3ProcessChars.length > 0) {
                        // ★ 공정특성 행 생성 (중복 제거: processNo|workElement|processChar)
                        for (const procChar of l3ProcessChars) {
                            const dedupKey = `${processNo}|${workElement}|${procChar.name}`;
                            if (processCharDedup.has(dedupKey)) continue;
                            processCharDedup.add(dedupKey);

                            if (procChar.specialChar) specialCharCount++;
                            processCharCount++;

                            // ★ C1: 사용자 편집 필드 복원
                            const restoredProc = restorePreservedFields(preservedMap, processNo, workElement, '', procChar.name, '조건조정');
                            // P0-2: 공정특성 행 → L3 수준 S/O/D/AP 참조
                            const l3Risk = riskByL2L3.get(`${l2.id}|${l3.id}`);
                            const savedItem = await tx.controlPlanItem.create({
                                data: {
                                    cpId: cp.id,
                                    processNo,
                                    processName,
                                    processLevel,
                                    processDesc,
                                    partName: '',
                                    workElement,
                                    equipment,
                                    equipmentM4: m4Original,  // ★ C2/H7: 4M 원본 코드 보존
                                    productChar: '',     // ★ 분리배치: 제품특성 없음
                                    processChar: procChar.name,
                                    specialChar: procChar.specialChar,
                                    charIndex: ++charIndex,  // ★ 공정별 NO 채번
                                    rowType: 'process',
                                    sortOrder: sortOrder++,
                                    linkStatus: 'linked',
                                    pfmeaProcessId: l2.id,
                                    pfmeaWorkElemId: l3.id,
                                    refSeverity: l3Risk?.refSeverity,
                                    refOccurrence: l3Risk?.refOccurrence,
                                    refDetection: l3Risk?.refDetection,
                                    refAp: l3Risk?.refAp,
                                    ...restoredProc,
                                },
                            });
                            cpItems.push(savedItem);
                        }
                    } else {
                        // L3에 공정특성 없음 → 설비/구조만 행 생성
                        // ★ C1: 사용자 편집 필드 복원
                        const restoredStruct = restorePreservedFields(preservedMap, processNo, workElement, '', '', '');
                        const savedItem = await tx.controlPlanItem.create({
                            data: {
                                cpId: cp.id,
                                processNo,
                                processName,
                                processLevel,
                                processDesc,
                                partName: '',
                                workElement,
                                equipment,
                                equipmentM4: m4Original,  // ★ C2/H7: 4M 원본 코드 보존
                                productChar: '',
                                processChar: '',
                                specialChar: '',
                                charIndex: ++charIndex,
                                rowType: 'structure',
                                sortOrder: sortOrder++,
                                linkStatus: 'linked',
                                pfmeaProcessId: l2.id,
                                pfmeaWorkElemId: l3.id,
                                ...restoredStruct,
                            },
                        });
                        cpItems.push(savedItem);
                    }
                }

                // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                // Fallback: 이 L2에서 아무 행도 생성되지 않았으면 구조만 행
                // (L3 전부 MN이거나, L3도 없고 제품특성도 없는 경우)
                // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                if (cpItems.length === l2StartCount) {
                    const savedItem = await tx.controlPlanItem.create({
                        data: {
                            cpId: cp.id,
                            processNo,
                            processName,
                            processLevel,
                            processDesc,
                            partName: '',
                            workElement: '',
                            equipment: '',
                            productChar: '',
                            processChar: '',
                            specialChar: '',
                            charIndex: ++charIndex,
                            rowType: 'structure',
                            reactionPlan: '',
                            sortOrder: sortOrder++,
                            linkStatus: 'linked',
                            pfmeaProcessId: l2.id,
                        },
                    });
                    cpItems.push(savedItem);
                }
            }

            // ============================================
            // CP 상태 업데이트
            // ============================================
            await tx.controlPlan.update({
                where: { id: cp.id },
                data: {
                    fmeaId,
                    linkedPfmeaNo: fmeaId,
                    syncStatus: 'synced',
                    lastSyncAt: new Date(),
                },
            });

            // ★★★ C4: FmeaRegistration.linkedCpNo 역링크 저장 (트랜잭션 내부) ★★★
            try {
                await tx.fmeaRegistration.updateMany({
                    where: { fmeaId },
                    data: { linkedCpNo: cp.cpNo },
                });
            } catch (regErr: unknown) {
                // P1-7: 역링크 실패는 치명적이지 않으나 추적 필요
                console.error('[FMEA→CP] FmeaRegistration 역링크 저장 실패 — fmeaId:', fmeaId, ', cpNo:', cp.cpNo, ', error:', regErr);
            }
        });

        // ★ M6: SyncLog 기록
        await recordSyncLog(prisma, {
            sourceType: 'pfmea',
            sourceId: fmeaId,
            targetType: 'cp',
            targetId: cp.cpNo,
            action: 'sync-to-cp-all',
            fieldChanges: JSON.stringify({ items: cpItems.length }),
        });

        results.push({
            step: 1, name: '데이터 준비', success: true,
            count: l2Data.length, message: `CP(${cpNo}) 초기화 완료`,
        });

        // ============================================
        // 결과 리포트
        // ============================================
        results.push({
            step: 2, name: '구조 연동', success: true,
            count: mergedL2Data.length, message: `${mergedL2Data.length}개 공정 구조 연동`,
        });
        results.push({
            step: 3, name: '제품특성 연동', success: true,
            count: productCharCount, message: `${productCharCount}개 제품특성 연동`,
        });
        results.push({
            step: 4, name: '공정특성 연동', success: true,
            count: processCharCount, message: `${processCharCount}개 공정특성 연동`,
        });
        results.push({
            step: 5, name: '특별특성 연동', success: true,
            count: specialCharCount, message: `${specialCharCount}개 특별특성 연동`,
        });

        const duration = Date.now() - startTime;

        return NextResponse.json({
            success: true,
            message: `CP 연동 완료: ${cpItems.length}건 (${duration}ms)`,
            data: {
                cpNo: cp.cpNo,
                cpId: cp.id,
                totalItems: cpItems.length,
                results,
                duration,
                redirectUrl: `/control-plan/worksheet?cpNo=${cp.cpNo}`,
            },
        });

    } catch (error: any) {
        console.error('[FMEA→CP 통합연동] 오류:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
