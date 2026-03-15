/**
 * @file sync-from-cp/route.ts
 * @description CP → PFD 연동 API (DB 저장)
 * @version 2.0.0
 * @created 2026-01-27
 * @updated 2026-01-27 - ★★★ DB 저장 기능 추가 (치명적 버그 수정) ★★★
 * 
 * Control Plan 워크시트 데이터를 PFD 워크시트로 동기화합니다.
 * - 공정번호, 공정명, 공정설명, 부품명(workElement), 설비 등 복사
 * - 셀병합 상태 그대로 유지 (같은 값을 가진 연속 행은 자동 병합)
 * - ★★★ 기존 PFD가 있으면 업데이트, 없으면 새로 생성 (DB 저장) ★★★
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';
import { recordSyncLog } from '@/lib/sync-helpers';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { cpNo, pfdNo, items } = body;

        if (!cpNo) {
            return NextResponse.json(
                { success: false, error: 'cpNo is required' },
                { status: 400 }
            );
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json(
                { success: false, error: 'items array is required' },
                { status: 400 }
            );
        }


        // ★★★ DB 연결 ★★★
        const prisma = getPrisma();
        if (!prisma) {
            return NextResponse.json(
                { success: false, error: 'Database connection failed' },
                { status: 500 }
            );
        }

        // 대상 PFD 번호 결정 (소문자 정규화)
        const targetPfdNo = (pfdNo || `pfd-${cpNo.replace(/^cp-?/i, '')}`).toLowerCase();

        // ★★★ 기존 PFD 확인 ★★★
        let existingPfd = await prisma.pfdRegistration.findUnique({
            where: { pfdNo: targetPfdNo },
        });

        // ★★★ PFD가 없으면 새로 생성 ★★★
        if (!existingPfd) {
            existingPfd = await prisma.pfdRegistration.create({
                data: {
                    pfdNo: targetPfdNo,
                    cpNo: cpNo,
                    status: 'draft',
                    subject: `CP 연동 (${cpNo})`,
                },
            });
        } else {
            // 기존 PFD 업데이트 (cpNo 연결)
            await prisma.pfdRegistration.update({
                where: { id: existingPfd.id },
                data: {
                    cpNo: cpNo,
                    updatedAt: new Date(),
                },
            });
        }

        const pfdId = existingPfd.id;

        // ★ 트랜잭션으로 soft delete + create 원자성 보장
        const pfdItems: any[] = [];
        await prisma.$transaction(async (tx: any) => {
            // ★★★ 기존 PfdItem 삭제 (soft delete) ★★★
            await tx.pfdItem.updateMany({
                where: { pfdId },
                data: { isDeleted: true },
            });

            // ★★★ PFD 아이템 형식으로 변환 및 DB 저장 ★★★
            for (let idx = 0; idx < items.length; idx++) {
                const item = items[idx];

                // 특별특성 분리 — LBS: ★=제품, ◇=공정
                const specialChar = (item.specialChar || '').trim();
                let productSC = '';
                let processSC = '';

                // 레거시 CC/SC → ★/◇ 매핑
                const mapSC = (sc: string): string => {
                    if (sc === '★' || sc === '◇') return sc;
                    const up = sc.toUpperCase();
                    if (up === 'CC' || up === 'C') return '★';
                    if (up === 'SC' || up === 'S') return '◇';
                    return '';
                };
                const mappedSC = mapSC(specialChar);

                // 제품특성이 있으면 productSC에, 공정특성이 있으면 processSC에
                if (item.productChar && item.productChar.trim()) {
                    productSC = mappedSC;
                }
                if (item.processChar && item.processChar.trim()) {
                    processSC = mappedSC;
                }

                // ★★★ DB에 PfdItem 저장 ★★★
                const savedItem = await tx.pfdItem.create({
                    data: {
                        pfdId,
                        processNo: item.processNo || '',
                        processName: item.processName || '',
                        processLevel: item.processLevel || 'Main',  // ★ 레벨 추가
                        processDesc: item.processDesc || '',
                        // ★ CP→PFD 매핑 수정 (2026-01-27)
                        // CP.partName(부품명) → PFD.partName(부품명 컬럼)
                        partName: item.partName || '',
                        // ★ CP→PFD: workElement(작업요소) 매핑 (H1)
                        workElement: item.workElement || '',
                        // ★ CP.equipment(설비/금형/JIG) → PFD.equipment(설비 컬럼)
                        equipment: item.equipment || '',
                        equipmentM4: item.equipmentM4 || '',
                        productChar: item.productChar || '',
                        processChar: item.processChar || '',
                        specialChar: item.specialChar || '',
                        cpItemId: item.id || null,
                        sortOrder: idx * 10,
                        isDeleted: false,
                    },
                });

                pfdItems.push({
                    id: savedItem.id,
                    pfdId,
                    processNo: savedItem.processNo,
                    processName: savedItem.processName,
                    processLevel: savedItem.processLevel || 'Main',
                    processDesc: savedItem.processDesc,
                    partName: savedItem.partName,  // ★ partName으로 수정
                    equipment: savedItem.equipment,
                    productSC,
                    productChar: savedItem.productChar,
                    processSC,
                    processChar: savedItem.processChar,
                    charIndex: item.charIndex || idx,
                    sortOrder: idx,
                });
            }
        });

        // ★★★ ProjectLinkage에 pfdNo 등록 (삭제 연쇄를 위해 필수) ★★★
        try {
            // CP를 통해 연결된 ProjectLinkage 찾기
            const cpLinkage = await (prisma as any).projectLinkage.findFirst({
                where: { cpNo: { equals: cpNo.toLowerCase(), mode: 'insensitive' }, status: 'active' },
            });
            if (cpLinkage) {
                await (prisma as any).projectLinkage.update({
                    where: { id: cpLinkage.id },
                    data: { pfdNo: targetPfdNo },
                });
            } else {
                // cpNo로 linkage가 없으면 pfdNo로 검색 후 없으면 신규 생성
                const existingPfdLinkage = await (prisma as any).projectLinkage.findFirst({
                    where: { pfdNo: targetPfdNo, status: 'active' },
                });
                if (!existingPfdLinkage) {
                    await (prisma as any).projectLinkage.create({
                        data: {
                            cpNo: cpNo.toLowerCase(),
                            pfdNo: targetPfdNo,
                            linkType: 'auto',
                            status: 'active',
                        },
                    });
                }
            }
        } catch (linkErr) {
            console.error('[sync-from-cp] ProjectLinkage 업데이트 실패:', linkErr);
        }

        // ★★★ 문서 연결 생성/업데이트 ★★★
        const existingLink = await prisma.documentLink.findFirst({
            where: {
                sourceType: 'pfd',
                sourceId: pfdId,
                targetType: 'cp',
            },
        });

        if (!existingLink) {
            await prisma.documentLink.create({
                data: {
                    sourceType: 'pfd',
                    sourceId: pfdId,
                    targetType: 'cp',
                    targetId: cpNo,
                    linkType: 'synced_with',
                    syncPolicy: 'manual',
                    lastSyncAt: new Date(),
                },
            });
        } else {
            await prisma.documentLink.update({
                where: { id: existingLink.id },
                data: {
                    targetId: cpNo,
                    lastSyncAt: new Date(),
                },
            });
        }

        // P1-3: 역방향 DocumentLink 생성 (cp→pfd) — 양방향 탐색 지원
        try {
            const reverseLink = await prisma.documentLink.findFirst({
                where: {
                    sourceType: 'cp',
                    sourceId: cpNo,
                    targetType: 'pfd',
                },
            });
            if (!reverseLink) {
                await prisma.documentLink.create({
                    data: {
                        sourceType: 'cp',
                        sourceId: cpNo,
                        targetType: 'pfd',
                        targetId: pfdId,
                        linkType: 'synced_with',
                        syncPolicy: 'manual',
                        lastSyncAt: new Date(),
                    },
                });
            } else {
                await prisma.documentLink.update({
                    where: { id: reverseLink.id },
                    data: { targetId: pfdId, lastSyncAt: new Date() },
                });
            }
        } catch (reverseLinkErr) {
            console.error('[sync-from-cp] 역방향 DocumentLink 생성 실패:', reverseLinkErr);
        }

        // ★ M6: SyncLog 기록
        await recordSyncLog(prisma, {
            sourceType: 'cp',
            sourceId: cpNo,
            targetType: 'pfd',
            targetId: targetPfdNo,
            action: 'sync-from-cp-to-pfd',
            fieldChanges: JSON.stringify({ items: pfdItems.length }),
        });

        return NextResponse.json({
            success: true,
            message: `CP에서 ${pfdItems.length}건의 공정정보를 PFD로 전송 및 저장했습니다.`,
            data: {
                pfdNo: targetPfdNo,
                pfdId,
                cpNo,
                itemCount: pfdItems.length,
                items: pfdItems,
                syncedAt: new Date().toISOString(),
                redirectUrl: `/pfd/worksheet?pfdNo=${targetPfdNo}`,
            }
        });

    } catch (error: any) {
        console.error('[CP→PFD 연동] ❌ 오류:', error);
        return NextResponse.json(
            { success: false, error: safeErrorMessage(error) },
            { status: 500 }
        );
    }
}
