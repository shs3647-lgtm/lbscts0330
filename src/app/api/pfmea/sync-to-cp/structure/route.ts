/**
 * @file sync-to-cp/structure/route.ts
 * @description PFMEA → CP 구조 연동 API (2단계)
 * @created 2026-02-03
 * 
 * L2 공정 데이터를 기반으로 CP에 구조 정보 연동:
 * - 공정번호 (processNo)
 * - 공정명 (processName)
 * - 설비/금형/지그 (equipment)
 * - 작업요소 (workElement)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { findOrCreateCp } from '../utils';
import { normalizeM4WithOriginal, isValidProcessNo, recordSyncLog, buildCpPreservedFieldsMap, restorePreservedFields } from '@/lib/sync-helpers';

interface L2Function {
    id?: string;
    name?: string;
}

interface L3WorkElement {
    id?: string;
    m4?: string;
    fourM?: string;  // 4M 대체 필드명
    name?: string;
}

interface L2Process {
    id?: string;
    no?: string;
    name?: string;
    level?: string;
    desc?: string;
    functions?: L2Function[];  // 메인공정 기능들
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
        const { fmeaId, cpNo, l2Data } = body;

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

        // 1. 대상 CP 조회 또는 생성
        const cp = await findOrCreateCp(prisma as any, cpNo, fmeaId);

        // 3. L2 데이터를 CP Item으로 변환
        const cpItems: any[] = [];
        let sortOrder = 0;

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
                mergedL2Map.set(key, { ...l2, l3: [...(l2.l3 || [])], functions: [...(l2.functions || [])] });
            }
        }
        const mergedL2Data = Array.from(mergedL2Map.values());

        // C1: 사용자 편집 보존을 위해 삭제 전 기존 필드 룩업
        const preservedMap = await buildCpPreservedFieldsMap(prisma as any, cp.id);

        // ★ 트랜잭션으로 deleteMany + create 원자성 보장
        await prisma.$transaction(async (tx: any) => {
            // 2. 기존 CP Item 삭제 (새로 생성)
            await tx.controlPlanItem.deleteMany({
                where: { cpId: cp.id },
            });

            for (const l2 of mergedL2Data) {
                // H8: processNo 유효성 검증 — 무효 항목 스킵
                if (!isValidProcessNo(l2.no)) continue;

                const l3Elements = l2.l3 || [];

                const rawFunctions = l2.functions || [];
                const filteredFuncNames = rawFunctions
                    .map(f => (f.name || '').trim())
                    .filter(n => n && !n.includes('클릭') && !n.includes('자동생성') && !n.includes('추가'));
                const processDesc = filteredFuncNames.join(', ')
                    || (l2.desc || '').trim()
                    || (l2.name || '').trim()
                    || '공정';

                if (l3Elements.length > 0) {
                    // ★ L3 작업요소의 4M은 L3Structure.m4에 원자성 DB 저장됨
                    // 유효한 L3만 필터 (00 작업자 등 공통 행 제외)
                    const validL3Elements = l3Elements.filter(l3 => {
                        const name = (l3.name || '').trim();
                        if (name.startsWith('00 ')) return false;
                        // ★ "{공정번호} 00 {이름}" 패턴 제외 (예: "10 00 작업자", "20 00 셋업엔지니어")
                        if (/^\d+\s+00\s/.test(name)) return false;
                        return name.length > 0;
                    });

                    for (const l3 of validL3Elements) {
                        // C2/H7: normalizeM4WithOriginal로 원본 보존 + 정규화
                        const m4Result = normalizeM4WithOriginal(l3.m4 || l3.fourM || '');
                        const m4 = m4Result.normalized;
                        if (m4 === 'MN') continue;  // MN은 CP/PFD 매핑 제외
                        const workElement = (l3.name || '').trim().replace(/^\d*번[-\s]?/, '');

                        // ★ 설비명만 표시 (4M 프리픽스 제거)
                        const equipment = workElement;

                        const processNo = (l2.no || '').trim();
                        // C1: 보존된 사용자 편집 필드 복원
                        const preserved = restorePreservedFields(preservedMap, processNo, workElement, '', '', '');

                        const savedItem = await tx.controlPlanItem.create({
                            data: {
                                cpId: cp.id,
                                processNo,
                                processName: (l2.name || '').trim(),
                                processLevel: (l2.level || 'Main').trim(),
                                processDesc: processDesc,
                                workElement: workElement,
                                equipment: equipment,
                                equipmentM4: m4Result.original,  // H7: 원본 M4 보존
                                partName: '',
                                productChar: '',
                                processChar: '',
                                rowType: 'structure',
                                sortOrder: sortOrder++,
                                linkStatus: 'linked',
                                pfmeaProcessId: l2.id,
                                pfmeaWorkElemId: l3.id,
                                ...preserved,
                            },
                        });
                        cpItems.push(savedItem);
                    }
                } else {
                    // L3 없으면 L2만 행 생성
                    const processNo = (l2.no || '').trim();
                    // C1: 보존된 사용자 편집 필드 복원
                    const preserved = restorePreservedFields(preservedMap, processNo, '', '', '', '');

                    const savedItem = await tx.controlPlanItem.create({
                        data: {
                            cpId: cp.id,
                            processNo,
                            processName: (l2.name || '').trim(),
                            processLevel: (l2.level || 'Main').trim(),
                            processDesc: processDesc,
                            workElement: '',
                            equipment: '',
                            partName: '',
                            productChar: '',
                            processChar: '',
                            rowType: 'structure',
                            sortOrder: sortOrder++,
                            linkStatus: 'linked',
                            pfmeaProcessId: l2.id,
                            ...preserved,
                        },
                    });
                    cpItems.push(savedItem);
                }
            }

            // 4. CP fmeaId 업데이트
            await tx.controlPlan.update({
                where: { id: cp.id },
                data: {
                    fmeaId,
                    linkedPfmeaNo: fmeaId,
                    syncStatus: 'synced',
                    lastSyncAt: new Date(),
                },
            });

            // C4: FmeaRegistration.linkedCpNo 역링크 저장 (트랜잭션 내부)
            try {
                await tx.fmeaRegistration.updateMany({
                    where: { fmeaId },
                    data: { linkedCpNo: cpNo },
                });
            } catch (regErr: unknown) {
                console.error('[FMEA→CP 구조연동] 역링크 저장 실패:', regErr);
            }
        });

        // M6: SyncLog 기록
        await recordSyncLog(prisma as any, {
            sourceType: 'PFMEA',
            sourceId: fmeaId,
            targetType: 'ControlPlan',
            targetId: cp.id,
            action: 'structure-sync',
            status: 'completed',
            fieldChanges: `synced=${cpItems.length}, processes=${l2Data.length}`,
        });

        return NextResponse.json({
            success: true,
            message: `구조 연동 완료: ${cpItems.length}건`,
            data: {
                cpNo,
                cpId: cp.id,
                synced: cpItems.length,
                processCount: l2Data.length,
            },
        });

    } catch (error: any) {
        console.error('[FMEA→CP 구조연동] 오류:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
