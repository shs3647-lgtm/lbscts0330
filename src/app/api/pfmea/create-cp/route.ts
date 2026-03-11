/**
 * @file create-cp/route.ts
 * @description PFMEA → CP 신규 생성 API
 * @version 2.0.0
 * @created 2026-01-31
 * @modified 2026-02-23 데이터 구조 수정 — functions[].productChars/processChars 정상 참조
 *
 * PFMEA 워크시트 데이터를 기반으로 새로운 CP를 생성합니다.
 * - L2 공정 → CP 공정 행
 * - L3 작업요소 → CP 부품명/작업요소
 * - 제품특성(L2.functions[].productChars) / 공정특성(L3.functions[].processChars) → CP 특성 컬럼
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { normalizeM4WithOriginal, isValidProcessNo, recordSyncLog, buildCpPreservedFieldsMap, restorePreservedFields } from '@/lib/sync-helpers';

interface CharItem {
    id?: string;
    name?: string;
    specialChar?: string;
}

interface L2Function {
    id?: string;
    name?: string;
    productChars?: CharItem[];
}

interface L3Function {
    id?: string;
    name?: string;
    processChars?: CharItem[];
}

interface L3WorkElement {
    id: string;
    m4?: string;
    fourM?: string;
    name: string;
    functions?: L3Function[];
    processChars?: CharItem[];  // 하위호환 폴백
}

interface L2Process {
    id: string;
    no: string;
    name: string;
    level?: string;
    desc?: string;
    functions?: L2Function[];
    l3?: L3WorkElement[];
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
        const { fmeaId, cpNo, l2Data, subject, customer, riskData } = body;

        if (!fmeaId) {
            return NextResponse.json(
                { success: false, error: 'fmeaId is required' },
                { status: 400 }
            );
        }

        if (!l2Data || !Array.isArray(l2Data) || l2Data.length === 0) {
            return NextResponse.json(
                { success: false, error: 'l2Data array is required' },
                { status: 400 }
            );
        }

        // P0-2: riskData → refSeverity/O/D/AP 룩업 테이블 구축
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

        // 대상 CP 번호 결정
        const targetCpNo = cpNo || `cp-${fmeaId.replace(/^pfm-?/i, '')}`.toLowerCase();

        // 1. CP 등록정보 생성 또는 조회
        let existingCp = await prisma.controlPlan.findUnique({
            where: { cpNo: targetCpNo },
        });

        if (!existingCp) {
            existingCp = await prisma.controlPlan.create({
                data: {
                    cpNo: targetCpNo,
                    fmeaId: fmeaId,
                    partName: subject || '',
                    customer: customer || '',
                    revNo: 'A',
                    status: 'draft',
                    linkedPfmeaNo: fmeaId,
                },
            });
        }

        const cpId = existingCp.id;

        // C1: 사용자 편집 필드 보존 — deleteMany 전에 수집
        const preservedMap = await buildCpPreservedFieldsMap(prisma, cpId);

        // 트랜잭션으로 deleteMany + creates + 역링크 원자성 보장
        const cpItems: any[] = [];
        await prisma.$transaction(async (tx: any) => {
            // 2. 기존 ControlPlanItem 삭제 (덮어쓰기)
            await tx.controlPlanItem.deleteMany({
                where: { cpId },
            });

            // 3. L2/L3 데이터를 CP Item으로 변환 (분리배치 — all/route.ts와 동일 패턴)
            let sortOrder = 0;

            for (const l2 of l2Data as L2Process[]) {
                const processNo = (l2.no || '').trim();
                const processName = (l2.name || '').trim();
                const processLevel = (l2.level || 'Main').trim();
                const functions = l2.functions || [];
                const l3Elements = l2.l3 || [];

                // H8: processNo 유효성 검증 — 무효한 공정번호 스킵
                if (!isValidProcessNo(processNo)) continue;

                // 공정설명 생성 (functions 이름 조합)
                const filteredFuncNames = functions
                    .map(f => (f.name || '').trim())
                    .filter(n => n && !n.includes('클릭') && !n.includes('자동생성') && !n.includes('추가'));
                const processDesc = filteredFuncNames.join(', ') || l2.desc || `${processName} 공정`;

                const l2StartCount = cpItems.length;
                let charIndex = 0;

                // Phase A: 제품특성 행 (L2.functions[].productChars)
                const productCharDedup = new Set<string>();
                for (const func of functions) {
                    for (const pc of func.productChars || []) {
                        const pcName = (pc.name || '').trim();
                        if (!pcName || pcName.includes('클릭')) continue;
                        if (productCharDedup.has(pcName)) continue;
                        productCharDedup.add(pcName);

                        // C1: 사용자 편집 필드 복원
                        const restored = restorePreservedFields(preservedMap, processNo, '', pcName, '', '재작업 또는 폐기');
                        // P0-2: 제품특성 행 → L2 수준 최대 심각도 참조
                        const l2Risk = riskByL2.get(String(l2.id));

                        const savedItem = await tx.controlPlanItem.create({
                            data: {
                                cpId,
                                processNo,
                                processName,
                                processLevel,
                                processDesc,
                                partName: '',
                                workElement: '',
                                equipment: '',
                                productChar: pcName,
                                processChar: '',
                                specialChar: (pc.specialChar || '').trim(),
                                charIndex: ++charIndex,
                                rowType: 'product',
                                reactionPlan: restored.reactionPlan || '재작업 또는 폐기',
                                sortOrder: sortOrder++,
                                linkStatus: 'linked',
                                pfmeaProcessId: l2.id,
                                refSeverity: l2Risk?.maxSeverity,
                                ...restored,
                            },
                        });
                        cpItems.push(savedItem);
                    }
                }

                // Phase B: 공정특성 행 (L3.functions[].processChars)
                const validL3Elements = l3Elements.filter(l3 => {
                    const name = (l3.name || '').trim();
                    if (name.startsWith('00 ')) return false;
                    if (/^\d+\s+00\s/.test(name)) return false;
                    return name.length > 0;
                });

                const processCharDedup = new Set<string>();
                for (const l3 of validL3Elements) {
                    // C2/H7: M4 정규화 + 원본 보존
                    const m4Result = normalizeM4WithOriginal(l3.m4 || l3.fourM || '');
                    if (m4Result.normalized === 'MN') continue;  // MN(사람)은 CP 매핑 제외

                    const workElement = (l3.name || '').trim().replace(/^\d*번[-\s]?/, '');
                    const equipment = workElement;  // ★ 설비명만 표시 (4M 프리픽스 제거)

                    // L3에서 공정특성 수집
                    const l3ProcessChars: Array<{ name: string; specialChar: string }> = [];

                    // 1. L3.functions[].processChars (정상 구조)
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
                        for (const procChar of l3ProcessChars) {
                            const dedupKey = `${processNo}|${workElement}|${procChar.name}`;
                            if (processCharDedup.has(dedupKey)) continue;
                            processCharDedup.add(dedupKey);

                            // C1: 사용자 편집 필드 복원
                            const restored = restorePreservedFields(preservedMap, processNo, workElement, '', procChar.name, '조건조정');
                            // P0-2: 공정특성 행 → L3 수준 S/O/D/AP 참조
                            const l3Risk = riskByL2L3.get(`${l2.id}|${l3.id}`);

                            const savedItem = await tx.controlPlanItem.create({
                                data: {
                                    cpId,
                                    processNo,
                                    processName,
                                    processLevel,
                                    processDesc,
                                    partName: '',
                                    workElement,
                                    equipment,
                                    equipmentM4: m4Result.original,
                                    productChar: '',
                                    processChar: procChar.name,
                                    specialChar: procChar.specialChar,
                                    charIndex: ++charIndex,
                                    rowType: 'process',
                                    reactionPlan: restored.reactionPlan || '조건조정',
                                    sortOrder: sortOrder++,
                                    linkStatus: 'linked',
                                    pfmeaProcessId: l2.id,
                                    pfmeaWorkElemId: l3.id,
                                    refSeverity: l3Risk?.refSeverity,
                                    refOccurrence: l3Risk?.refOccurrence,
                                    refDetection: l3Risk?.refDetection,
                                    refAp: l3Risk?.refAp,
                                    ...restored,
                                },
                            });
                            cpItems.push(savedItem);
                        }
                    } else {
                        // L3에 공정특성 없음 → 설비/구조만 행 생성
                        // C1: 사용자 편집 필드 복원
                        const restored = restorePreservedFields(preservedMap, processNo, workElement, '', '', '');

                        const savedItem = await tx.controlPlanItem.create({
                            data: {
                                cpId,
                                processNo,
                                processName,
                                processLevel,
                                processDesc,
                                partName: '',
                                workElement,
                                equipment,
                                equipmentM4: m4Result.original,
                                productChar: '',
                                processChar: '',
                                charIndex: ++charIndex,
                                rowType: 'structure',
                                sortOrder: sortOrder++,
                                linkStatus: 'linked',
                                pfmeaProcessId: l2.id,
                                pfmeaWorkElemId: l3.id,
                                ...restored,
                            },
                        });
                        cpItems.push(savedItem);
                    }
                }

                // Fallback: 아무 행도 생성되지 않았으면 구조만 행
                if (cpItems.length === l2StartCount) {
                    const savedItem = await tx.controlPlanItem.create({
                        data: {
                            cpId,
                            processNo,
                            processName,
                            processLevel,
                            processDesc,
                            partName: '',
                            productChar: '',
                            processChar: '',
                            charIndex: ++charIndex,
                            rowType: 'structure',
                            sortOrder: sortOrder++,
                            linkStatus: 'linked',
                            pfmeaProcessId: l2.id,
                        },
                    });
                    cpItems.push(savedItem);
                }
            }

            // C4: FmeaRegistration.linkedCpNo 역링크 저장 (트랜잭션 내부)
            try {
                await tx.fmeaRegistration.updateMany({
                    where: { fmeaId },
                    data: { linkedCpNo: targetCpNo },
                });
            } catch (regErr) {
                // P1-7: 역링크 실패는 치명적이지 않으나 추적 필요
                console.error('[PFMEA→CP 생성] FmeaRegistration 역링크 저장 실패 — fmeaId:', fmeaId, ', cpNo:', targetCpNo, ', error:', regErr);
            }
        });

        // M6: SyncLog 기록
        await recordSyncLog(prisma, {
            sourceType: 'PFMEA',
            sourceId: fmeaId,
            targetType: 'ControlPlan',
            targetId: targetCpNo,
            action: 'create-cp',
            status: 'completed',
            fieldChanges: `${cpItems.length}건 생성`,
        });

        return NextResponse.json({
            success: true,
            message: `PFMEA에서 ${cpItems.length}건의 CP 항목을 생성했습니다.`,
            data: {
                cpNo: targetCpNo,
                cpId,
                fmeaId,
                itemCount: cpItems.length,
                redirectUrl: `/control-plan/worksheet?cpNo=${targetCpNo}&fromFmea=${fmeaId}`,
                createdAt: new Date().toISOString(),
            }
        });

    } catch (error: any) {
        console.error('[PFMEA→CP 생성] 오류:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
