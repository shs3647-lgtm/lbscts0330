/**
 * @file route.ts
 * @description 프로젝트 일괄 생성 API - 연동/단독 모드
 * @created 2026-01-29
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import {
    AppType,
    APP_CONFIGS,
    CreateDocumentRequest,
    CreateDocumentResponse,
} from '@/types/linkage';
import {
    getNextSerialNo,
    getNextLinkGroupNo,
    generateDocId,
} from '@/lib/utils/linkageIdGenerator';

// =====================================================
// POST: 연동 문서 일괄 생성
// =====================================================
export async function POST(request: NextRequest) {
    const prisma = getPrisma();

    if (!prisma) {
        return NextResponse.json({
            success: false,
            linkGroupNo: 0,
            createdDocs: {},
            error: 'Database connection not available',
        } as CreateDocumentResponse, { status: 500 });
    }

    try {
        const body = await request.json();
        const { linkMode, sourceApp, linkedApps, fmeaType, productName, customer, companyName, managerName, partNo, cpCount: rawCpCount, pfdCount: rawPfdCount } = body as CreateDocumentRequest & { productName?: string; customer?: string; companyName?: string; managerName?: string; partNo?: string; cpCount?: number; pfdCount?: number };
        const cpCount = Math.max(1, Math.min(rawCpCount || 1, 10));   // 1~10 범위
        const pfdCount = Math.max(1, Math.min(rawPfdCount || 1, 10));

        // ★★★ 기초정보는 모달에서 입력한 값 사용 (2026-02-02 수정) ★★★
        const basicInfo = {
            projectName: productName || '',  // ★ FMEA명 (모달 입력값)
            customerName: customer || '',    // ★ 고객사
            companyName: companyName || '',  // ★ 회사명 (작성회사)
            managerName: managerName || '',  // ★ 담당자
            partNo: partNo || '',            // ★ 품번
            modelYear: '',
            engineeringLocation: null,
            confidentialityLevel: null,
            processResponsibility: null,
        };


        // 생성할 앱 목록 (APQP 미개발 → 제외)
        const appsToCreate = Object.entries(linkedApps)
            .filter(([app, selected]) => selected && app !== 'apqp')
            .map(([app]) => app as AppType);

        if (appsToCreate.length === 0) {
            return NextResponse.json({
                success: false,
                linkGroupNo: 0,
                createdDocs: {},
                error: '생성할 앱을 선택해주세요.',
            } as CreateDocumentResponse);
        }

        // 기본 설정
        // ★ typeCode는 사용자가 선택한 fmeaType 사용 (기본값 P)
        const typeCode = (fmeaType || 'p').toLowerCase();  // 'm' | 'f' | 'p'
        const now = new Date();

        // ★★★ linkGroupNo: active linkage + 승인된 모듈이 있는 deleted linkage ★★★
        // 승인된 문서의 번호는 재사용 불가 → deleted linkage도 확인
        const allIdsForLinkGroup: string[] = [];

        // 1) active linkage → 무조건 포함
        const activeLinkages = await (prisma as any).projectLinkage.findMany({
            where: { status: 'active' },
            select: { pfmeaId: true, dfmeaId: true, pfdNo: true, cpNo: true, apqpNo: true },
        });
        for (const l of activeLinkages) {
            if (l.pfmeaId) allIdsForLinkGroup.push(l.pfmeaId);
            if (l.dfmeaId) allIdsForLinkGroup.push(l.dfmeaId);
            if (l.pfdNo) allIdsForLinkGroup.push(l.pfdNo);
            if (l.cpNo) allIdsForLinkGroup.push(l.cpNo);
            if (l.apqpNo) allIdsForLinkGroup.push(l.apqpNo);
        }

        // 2) deleted linkage 중 승인된 CP가 있는 것 → 번호 재사용 방지
        try {
            const deletedLinkages = await (prisma as any).projectLinkage.findMany({
                where: { status: 'deleted' },
                select: { cpNo: true, pfmeaId: true },
            });
            for (const dl of deletedLinkages) {
                if (dl.cpNo) {
                    const cp = await prisma.cpRegistration.findUnique({
                        where: { cpNo: dl.cpNo },
                        select: { status: true },
                    }).catch(() => null);
                    if (cp?.status === 'approved') {
                        // 승인된 CP의 linkage ID를 포함하여 번호 건너뜀
                        if (dl.pfmeaId) allIdsForLinkGroup.push(dl.pfmeaId);
                    }
                }
            }
        } catch { /* 무시 */ }

        const maxLinkGroupNo = getNextLinkGroupNo(allIdsForLinkGroup);

        // ★★★ serialNo: sourceApp 기준 + 해당 typeCode로만 계산 ★★★
        const sourcePrefix = APP_CONFIGS[sourceApp].prefix;
        const year = new Date().getFullYear().toString().slice(-2);
        let sourceIds: string[] = [];
        switch (sourceApp) {
            case 'apqp':
                sourceIds = (await prisma.apqpRegistration.findMany({ where: { deletedAt: null }, select: { apqpNo: true } })).map((r) => r.apqpNo);
                break;
            case 'pfmea':
            case 'dfmea':
                sourceIds = (await prisma.fmeaProject.findMany({ where: { deletedAt: null }, select: { fmeaId: true } })).map((r) => r.fmeaId)
                    .filter((id) => sourceApp === 'pfmea' ? id.toLowerCase().startsWith('pfm') : id.toLowerCase().startsWith('dfm'));
                // ★★★ typeCode별 필터링: Part(p)/Family(f)/Master(m) 각각 독립 시리얼 ★★★
                sourceIds = sourceIds.filter((id) =>
                    id.toLowerCase().startsWith(`${sourcePrefix}${year}-${typeCode}`)
                );
                break;
            case 'pfd':
                sourceIds = (await prisma.pfdRegistration.findMany({ where: { deletedAt: null }, select: { pfdNo: true } })).map((r) => r.pfdNo);
                break;
            case 'cp':
                sourceIds = (await prisma.cpRegistration.findMany({ where: { deletedAt: null }, select: { cpNo: true } })).map((r) => r.cpNo);
                break;
        }
        const maxSerialNo = getNextSerialNo(sourceIds, sourcePrefix);

        const serialNo = maxSerialNo || 1;
        const linkGroupNo = linkMode === 'linked' ? (maxLinkGroupNo || 1) : 0;


        // 앱별 ID 생성
        const createdDocs: Partial<Record<AppType, string>> = {};
        // ★ CP/PFD 다건 생성용 ID 배열
        const cpDocIds: string[] = [];
        const pfdDocIds: string[] = [];

        for (const app of appsToCreate) {
            if (app === 'cp') {
                // ★ CP 다건 생성: 기본ID-01, 기본ID-02 형식
                const baseId = generateDocId('cp', typeCode, serialNo, linkMode, linkGroupNo);
                if (cpCount === 1) {
                    cpDocIds.push(baseId);
                } else {
                    for (let i = 1; i <= cpCount; i++) {
                        cpDocIds.push(`${baseId}-${String(i).padStart(2, '0')}`);
                    }
                }
                createdDocs.cp = cpDocIds[0]; // 대표 ID (linkage 연동용)
            } else if (app === 'pfd') {
                // ★ PFD 다건 생성: 기본ID-01, 기본ID-02 형식
                const baseId = generateDocId('pfd', typeCode, serialNo, linkMode, linkGroupNo);
                if (pfdCount === 1) {
                    pfdDocIds.push(baseId);
                } else {
                    for (let i = 1; i <= pfdCount; i++) {
                        pfdDocIds.push(`${baseId}-${String(i).padStart(2, '0')}`);
                    }
                }
                createdDocs.pfd = pfdDocIds[0]; // 대표 ID
            } else {
                createdDocs[app] = generateDocId(app, typeCode, serialNo, linkMode, linkGroupNo);
            }
        }


        // 트랜잭션으로 일괄 생성
        let linkageId: string | undefined;

        await prisma.$transaction(async (tx: any) => {
            // 1. ProjectLinkage 레코드 생성 (연동 모드일 때만)
            // ★★★ 모든 기초정보를 중앙 저장 - 각 앱에서 조회하여 사용 ★★★
            if (linkMode === 'linked') {
                const linkage = await tx.projectLinkage.create({
                    data: {
                        apqpNo: createdDocs.apqp,
                        pfmeaId: createdDocs.pfmea,
                        dfmeaId: createdDocs.dfmea,
                        pfdNo: createdDocs.pfd,
                        cpNo: createdDocs.cp,
                        // ★★★ 기초정보 저장 (APQP에서 입력된 정보) ★★★
                        projectName: basicInfo?.projectName || '',
                        subject: basicInfo?.projectName || '',
                        partNo: basicInfo?.partNo || '',  // ★ 품번 추가
                        customerName: basicInfo?.customerName || '',
                        companyName: basicInfo?.companyName || '',
                        responsibleName: basicInfo?.managerName || '',
                        engineeringLocation: basicInfo?.engineeringLocation || null,
                        modelYear: basicInfo?.modelYear || null,
                        confidentialityLevel: basicInfo?.confidentialityLevel || null,
                        processResponsibility: basicInfo?.processResponsibility || null,
                        linkType: 'manual',
                        status: 'active',
                    },
                });
                linkageId = linkage.id;
            }

            // 2. 각 앱별 Registration 레코드 생성 (upsert: 기존 데이터 있으면 빈 값으로 리셋)
            for (const app of appsToCreate) {
                const docId = createdDocs[app];
                if (!docId) continue;

                switch (app) {
                    case 'apqp':
                        await tx.apqpRegistration.upsert({
                            where: { apqpNo: docId },
                            create: {
                                apqpNo: docId,
                                subject: basicInfo.projectName,
                                customerName: basicInfo.customerName,
                                companyName: basicInfo.companyName,
                                modelYear: '',
                                apqpResponsibleName: basicInfo.managerName,
                                engineeringLocation: '',
                                confidentialityLevel: '',
                                processResponsibility: '',
                                status: 'planning',
                                linkedFmea: createdDocs.pfmea || null,
                                linkedDfmea: createdDocs.dfmea || null,
                                linkedCp: createdDocs.cp || null,
                                linkedPfd: createdDocs.pfd || null,
                            },
                            update: {
                                subject: basicInfo.projectName,
                                customerName: basicInfo.customerName,
                                companyName: basicInfo.companyName,
                                apqpResponsibleName: basicInfo.managerName,
                                linkedFmea: createdDocs.pfmea || null,
                                linkedDfmea: createdDocs.dfmea || null,
                                linkedCp: createdDocs.cp || null,
                                linkedPfd: createdDocs.pfd || null,
                            },
                        });
                        break;

                    case 'pfmea':
                        // ★★★ PFMEA upsert ★★★
                        // FmeaProject는 upsert, Registration도 함께 처리
                        const existingPfmea = await tx.fmeaProject.findUnique({ where: { fmeaId: docId } });
                        // FMEA명: 완제품명 그대로 사용
                        const pfmeaSubject = basicInfo.projectName || '';
                        if (existingPfmea) {
                            // 기존 데이터 업데이트 (★ soft-delete 복구 포함)
                            await tx.fmeaProject.update({
                                where: { fmeaId: docId },
                                data: {
                                    parentApqpNo: createdDocs.apqp,
                                    fmeaType: fmeaType || 'P',
                                    status: 'active',
                                    deletedAt: null,  // ★ FIX: soft-delete된 레코드 복구
                                    registration: {
                                        update: {
                                            subject: pfmeaSubject,
                                            customerName: basicInfo.customerName,
                                            companyName: basicInfo.companyName,
                                            modelYear: '',
                                            fmeaResponsibleName: basicInfo.managerName,
                                            engineeringLocation: '',
                                            designResponsibility: '',
                                            partName: '',  // ★ 품명은 등록 화면에서 별도 입력
                                            partNo: basicInfo.partNo,         // ★ 품번
                                            linkedCpNo: createdDocs.cp || null,
                                            linkedPfdNo: createdDocs.pfd || null,
                                            linkedDfmeaNo: createdDocs.dfmea || null,  // ★ DFMEA 연동 추가
                                        },
                                    },
                                },
                            });
                        } else {
                            await tx.fmeaProject.create({
                                data: {
                                    fmeaId: docId,
                                    fmeaType: fmeaType || 'P',
                                    parentApqpNo: createdDocs.apqp,
                                    status: 'active',
                                    registration: {
                                        create: {
                                            subject: pfmeaSubject,
                                            customerName: basicInfo.customerName,
                                            companyName: basicInfo.companyName,
                                            modelYear: '',
                                            fmeaResponsibleName: basicInfo.managerName,
                                            partName: '',  // ★ 품명은 등록 화면에서 별도 입력
                                            partNo: basicInfo.partNo,         // ★ 품번
                                            linkedCpNo: createdDocs.cp || null,
                                            linkedPfdNo: createdDocs.pfd || null,
                                            linkedDfmeaNo: createdDocs.dfmea || null,  // ★ DFMEA 연동 추가
                                        },
                                    },
                                },
                            });
                        }
                        break;

                    case 'dfmea':
                        // ★★★ DFMEA upsert ★★★
                        const existingDfmea = await tx.fmeaProject.findUnique({ where: { fmeaId: docId } });
                        // ★★★ FMEA명: 품명 + DFMEA (2026-02-02) ★★★
                        const dfmeaSubject = basicInfo.projectName ? `${basicInfo.projectName} DFMEA` : '품명+DFMEA';
                        if (existingDfmea) {
                            await tx.fmeaProject.update({
                                where: { fmeaId: docId },
                                data: {
                                    parentApqpNo: createdDocs.apqp,
                                    fmeaType: 'D',
                                    status: 'active',
                                    deletedAt: null,  // ★ FIX: soft-delete된 레코드 복구
                                    registration: {
                                        update: {
                                            subject: dfmeaSubject,
                                            customerName: basicInfo.customerName,
                                            companyName: basicInfo.companyName,
                                            modelYear: '',
                                            fmeaResponsibleName: basicInfo.managerName,
                                            engineeringLocation: '',
                                            designResponsibility: '',
                                            partName: '',  // ★ 품명은 등록 화면에서 별도 입력
                                            partNo: basicInfo.partNo,         // ★ 품번
                                            linkedCpNo: createdDocs.cp || null,
                                            linkedPfdNo: createdDocs.pfd || null,
                                            linkedPfmeaNo: createdDocs.pfmea || null,
                                        },
                                    },
                                },
                            });
                        } else {
                            await tx.fmeaProject.create({
                                data: {
                                    fmeaId: docId,
                                    fmeaType: 'D',  // ★ DFMEA는 항상 'D' 타입
                                    parentApqpNo: createdDocs.apqp,
                                    status: 'active',
                                    registration: {
                                        create: {
                                            subject: dfmeaSubject,
                                            customerName: basicInfo.customerName,
                                            companyName: basicInfo.companyName,
                                            modelYear: '',
                                            fmeaResponsibleName: basicInfo.managerName,
                                            partName: '',  // ★ 품명은 등록 화면에서 별도 입력
                                            partNo: basicInfo.partNo,         // ★ 품번
                                            linkedCpNo: createdDocs.cp || null,
                                            linkedPfdNo: createdDocs.pfd || null,
                                            linkedPfmeaNo: createdDocs.pfmea || null,
                                        },
                                    },
                                },
                            });
                        }
                        break;

                    case 'pfd':
                        // ★ PFD 다건 생성 (pfdDocIds 사용)
                        for (const pfdId of (pfdDocIds.length > 0 ? pfdDocIds : [docId])) {
                            await tx.pfdRegistration.upsert({
                                where: { pfdNo: pfdId },
                                create: {
                                    pfdNo: pfdId,
                                    fmeaId: createdDocs.pfmea,
                                    apqpProjectId: createdDocs.apqp,
                                    parentApqpNo: createdDocs.apqp || null,
                                    linkedDfmeaNo: createdDocs.dfmea || null,
                                    linkedPfmeaNo: createdDocs.pfmea || null,
                                    linkedCpNos: cpDocIds.length > 0 ? JSON.stringify(cpDocIds) : (createdDocs.cp ? JSON.stringify([createdDocs.cp]) : null),
                                    subject: basicInfo.projectName,
                                    customerName: basicInfo.customerName,
                                    companyName: basicInfo.companyName,
                                    modelYear: '',
                                },
                                update: {
                                    fmeaId: createdDocs.pfmea,
                                    apqpProjectId: createdDocs.apqp,
                                    parentApqpNo: createdDocs.apqp || null,
                                    linkedDfmeaNo: createdDocs.dfmea || null,
                                    linkedPfmeaNo: createdDocs.pfmea || null,
                                    linkedCpNos: cpDocIds.length > 0 ? JSON.stringify(cpDocIds) : (createdDocs.cp ? JSON.stringify([createdDocs.cp]) : null),
                                    subject: basicInfo.projectName,
                                    customerName: basicInfo.customerName,
                                    companyName: basicInfo.companyName,
                                },
                            });
                        }
                        break;

                    case 'cp':
                        // ★ CP 다건 생성 (cpDocIds 사용)
                        for (const cpId of (cpDocIds.length > 0 ? cpDocIds : [docId])) {
                            await tx.cpRegistration.upsert({
                                where: { cpNo: cpId },
                                create: {
                                    cpNo: cpId,
                                    parentApqpNo: createdDocs.apqp,
                                    fmeaId: createdDocs.pfmea,
                                    linkedPfdNo: createdDocs.pfd || null,
                                    linkedDfmeaNo: createdDocs.dfmea || null,
                                    linkedPfmeaNo: createdDocs.pfmea || null,
                                    subject: basicInfo.projectName,
                                    customerName: basicInfo.customerName,
                                    companyName: basicInfo.companyName,
                                    modelYear: '',
                                },
                                update: {
                                    parentApqpNo: createdDocs.apqp,
                                    fmeaId: createdDocs.pfmea,
                                    linkedPfdNo: createdDocs.pfd || null,
                                    linkedDfmeaNo: createdDocs.dfmea || null,
                                    linkedPfmeaNo: createdDocs.pfmea || null,
                                    subject: basicInfo.projectName,
                                    customerName: basicInfo.customerName,
                                    companyName: basicInfo.companyName,
                                },
                            });
                        }
                        break;
                }
            }
        });


        return NextResponse.json({
            success: true,
            linkGroupNo,
            createdDocs,
            linkageId,
            // ★ 다건 생성된 CP/PFD ID 배열 (프론트에서 활용)
            ...(cpDocIds.length > 1 ? { cpDocIds } : {}),
            ...(pfdDocIds.length > 1 ? { pfdDocIds } : {}),
        } as CreateDocumentResponse);

    } catch (error: any) {
        console.error('[create-linked] ❌ 오류:', error);

        return NextResponse.json({
            success: false,
            linkGroupNo: 0,
            createdDocs: {},
            error: error.message || '문서 생성 실패',
        } as CreateDocumentResponse, { status: 500 });
    }
}
