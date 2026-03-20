/**
 * @file create-from-cp/route.ts
 * @description CP에서 PFMEA 신규 생성 API
 * @version 1.0.0
 * @created 2026-01-31
 * 
 * CP 워크시트 데이터를 기반으로 새로운 PFMEA를 생성합니다.
 * - 공정번호, 공정명 → L2 (구조분석)
 * - 부품명/작업요소 → L3 (구조분석)
 * - 특성정보 → 기능분석 기초 데이터
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

interface CpItem {
    processNo: string;
    processName: string;
    processLevel: string;
    processDesc: string;
    partName?: string;
    workElement?: string;
    equipment?: string;
    productChar?: string;
    processChar?: string;
    specialChar?: string;
}

/** 유효한 특별특성 코드 목록 (AIAG-VDA 기준) */
const VALID_SPECIAL_CHAR_CODES = new Set([
    'CC', 'SC', 'IC', 'HC', 'PC', 'F/F', 'YC', 'YS', 'OS', 'HI', 'C',
    'S', 'Q', 'QS', 'SQ', 'CR', 'SI', 'FIT', 'A', 'B', 'D',
    // 기호 형태
    '◇', '◆', '△', '▲', '○', '●', '☆', '★',
]);

/**
 * 특별특성 코드 유효성 검증
 * - 유효한 SC 코드이면 true
 * - 평가방법 이름 등 긴 텍스트이면 false
 */
function isValidSpecialChar(value: string): boolean {
    if (!value || !value.trim()) return false;
    const trimmed = value.trim().toUpperCase();
    // 정확히 일치하거나 기호 1자
    if (VALID_SPECIAL_CHAR_CODES.has(trimmed)) return true;
    if (VALID_SPECIAL_CHAR_CODES.has(value.trim())) return true;
    // 5자 이상이면 코드가 아닌 텍스트로 판단
    if (trimmed.length >= 5) return false;
    return false;
}

/**
 * CP 항목의 specialChar / productChar 값을 정규화
 * - specialChar에 평가방법 등 잘못된 값이 들어온 경우 제거
 * - productChar와 specialChar가 뒤바뀐 경우 교환
 */
function normalizeSpecialChar(item: CpItem): { productChar: string; specialChar: string } {
    const rawProduct = (item.productChar || '').trim();
    const rawSpecial = (item.specialChar || '').trim();

    // Case 1: specialChar가 유효한 코드 → 정상
    if (isValidSpecialChar(rawSpecial)) {
        return { productChar: rawProduct, specialChar: rawSpecial };
    }

    // Case 2: productChar가 유효한 SC 코드이고 specialChar가 텍스트 → 값이 뒤바뀜
    if (isValidSpecialChar(rawProduct) && rawSpecial.length >= 3) {
        return { productChar: rawSpecial, specialChar: rawProduct };
    }

    // Case 3: specialChar가 유효하지 않은 텍스트 → 제거
    return { productChar: rawProduct, specialChar: '' };
}

interface L3WorkElement {
    id: string;
    m4: string;
    name: string;
    order: number;
    functions: any[];
    processChars: string[];
}

interface L2Process {
    id: string;
    no: string;
    name: string;
    level: string;
    desc: string;
    order: number;
    functions: any[];
    productChars: string[];
    l3: L3WorkElement[];
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
        const { cpNo, fmeaId, items, subject, customer } = body;

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

        // CP 데이터를 FMEA L2/L3 구조로 변환
        const processMap = new Map<string, L2Process>();
        let processOrder = 10;

        items.forEach((item: CpItem, idx: number) => {
            // 빈 공정번호 제외
            if (!item.processNo || !item.processNo.trim()) return;

            const processKey = `${item.processNo}-${item.processName}`;

            if (!processMap.has(processKey)) {
                processMap.set(processKey, {
                    id: `l2-${Date.now()}-${idx}`,
                    no: item.processNo || '',
                    name: item.processName || '',
                    level: item.processLevel || 'Main',
                    desc: item.processDesc || '',
                    order: processOrder,
                    functions: [],
                    productChars: [],
                    l3: []
                });
                processOrder += 10;
            }

            const process = processMap.get(processKey)!;

            // ★★★ 2L 연동 규칙 (2026-02-01 수정) ★★★
            // D열(processDesc) → 메인공정기능 (L2.functions[].name)
            // J열(productChar) → 제품특성 (L2.functions[].productChars[].name)

            // 1. D열(공정설명/공정기능) → L2 메인공정기능으로 추가
            const processDescName = (item.processDesc || '').trim();
            if (processDescName) {
                // 기존 함수 중에서 같은 이름이 있는지 확인
                let existingFunc = process.functions.find((f: any) => f.name === processDescName);

                if (!existingFunc) {
                    // 새 메인공정기능 생성
                    existingFunc = {
                        id: `func-l2-${process.no}-${process.functions.length}`,
                        name: processDescName,
                        desc: '',
                        type: 'function',  // 메인공정기능
                        productChars: [],  // 제품특성 배열
                    };
                    process.functions.push(existingFunc);
                }

                // 2. J열(제품특성)이 있으면 해당 기능의 productChars에 추가
                // ★ 2026-03-05: specialChar 유효성 검증 + 값 교환 감지
                const normalized = normalizeSpecialChar(item);
                const productCharName = normalized.productChar;
                const validSpecialChar = normalized.specialChar;

                if (productCharName) {
                    const displayName = validSpecialChar
                        ? `[${validSpecialChar}] ${productCharName}`
                        : productCharName;

                    // 중복 체크
                    const existingChar = existingFunc.productChars?.find((c: any) =>
                        typeof c === 'string' ? c === displayName : c.name === displayName
                    );
                    if (!existingChar) {
                        if (!existingFunc.productChars) existingFunc.productChars = [];
                        existingFunc.productChars.push({
                            id: `char-${Date.now()}-${(existingFunc.productChars || []).length}`,
                            name: displayName,
                            specialChar: validSpecialChar,
                        });
                    }

                    // 역호환: process.productChars에도 추가
                    if (!process.productChars.includes(displayName)) {
                        process.productChars.push(displayName);
                    }
                }
            } else if (item.productChar && item.productChar.trim()) {
                // D열이 없고 J열만 있는 경우
                // ★ 2026-03-05: specialChar 유효성 검증
                const norm = normalizeSpecialChar(item);
                const productCharStr = norm.specialChar
                    ? `[${norm.specialChar}] ${norm.productChar}`
                    : norm.productChar;
                if (productCharStr && !process.productChars.includes(productCharStr)) {
                    process.productChars.push(productCharStr);
                }
            }

            // ★★★ 문서 기준: 설비(equipment)만 L3 Structure로 매핑 ★★★
            // - 부품명(partName)은 연동하지 않음 (제외)
            // - 4M = MC (Machine - 설비, 금형, 지그, 치공구)
            // - "스틸 파이프", "탑튜브", "다운튜브" 등 부품명 문자열 제외
            const equipmentName = item.equipment || '';

            // 부품명으로 판단되는 문자열 제외
            const isPartName = (name: string) => {
                if (!name || !name.trim()) return true;
                const partNamePatterns = [
                    /스틸\s*파이프/i, /탑\s*튜브/i, /다운\s*튜브/i, /시트\s*튜브/i,
                    /헤드\s*튜브/i, /체인\s*스테이/i, /시트\s*스테이/i,
                    /프레임/i, /포크/i, /핸들/i, /휠/i, /타이어/i,
                    /파이프/i, /튜브/i, /플레이트/i, /브라켓/i,
                ];
                return partNamePatterns.some(pattern => pattern.test(name));
            };

            // 설비가 있고 부품명이 아닌 경우에만 L3 생성
            if (equipmentName.trim() && !isPartName(equipmentName)) {
                const existingL3 = process.l3.find((l3) => l3.name === equipmentName);

                if (!existingL3) {
                    const newL3: L3WorkElement = {
                        id: `l3-${Date.now()}-${process.l3.length}`,
                        m4: 'MC', // ★★★ 4M 분류: MC (Machine - 설비, 금형, 지그, 치공구)
                        name: equipmentName,
                        order: (process.l3.length + 1) * 10,
                        functions: [],
                        processChars: []
                    };

                    // 공정특성 추가
                    if (item.processChar && item.processChar.trim()) {
                        newL3.processChars.push(item.processChar);
                    }

                    process.l3.push(newL3);
                } else {
                    // 기존 L3에 공정특성 추가 (중복 제거)
                    if (item.processChar && item.processChar.trim()) {
                        if (!existingL3.processChars.includes(item.processChar)) {
                            existingL3.processChars.push(item.processChar);
                        }
                    }
                }
            }
        });

        const l2Structures = Array.from(processMap.values());

        // ★★★ 2026-02-02: 3L 연동 규칙 수정 ★★★
        // - L3.functions[].name (작업요소기능) = CP/PFD에 없음 → FMEA 자체 입력 또는 기초정보 연동
        // - L3.functions[].processChars[].name (공정특성) = CP K열 (processChar)

        l2Structures.forEach((l2) => {
            l2.l3.forEach((l3) => {
                // 공정특성이 있으면 기본 function을 생성하고 processChars에 추가
                if (l3.processChars && l3.processChars.length > 0) {
                    // 기존 function이 없으면 기본 function 생성
                    if (l3.functions.length === 0) {
                        l3.functions.push({
                            id: `func-l3-${l2.no}-${l3.m4}-0`,
                            name: '',  // ★ 작업요소기능: CP/PFD에 없음 → 빈값 (FMEA 직접 입력)
                            desc: '',
                            type: 'function',
                            processChars: [],  // 공정특성 배열
                        });
                    }

                    // 첫 번째 function에 공정특성 추가
                    const mainFunc = l3.functions[0];
                    if (!mainFunc.processChars) mainFunc.processChars = [];

                    l3.processChars.forEach((char: string, idx: number) => {
                        // 중복 체크
                        const existing = mainFunc.processChars.find((c: any) =>
                            typeof c === 'string' ? c === char : c.name === char
                        );
                        if (!existing) {
                            mainFunc.processChars.push({
                                id: `pchar-${Date.now()}-${idx}`,
                                name: char,
                            });
                        }
                    });
                }
            });
        });

        // 대상 FMEA ID 생성 (미지정 시 자동 생성)
        const targetFmeaId = fmeaId || cpNo.toLowerCase().replace(/^cp/, 'pfm');

        // FMEA 워크시트 초기 상태 생성
        // ★ L1 = "품명 생산공정" 형식으로 표시
        const l1Name = subject ? `${subject} 생산공정` : `CP연동_${cpNo}`;

        // ★★★ 2026-02-02: L1 기본 types/functions 추가 (1L 탭에서 1행 표시) ★★★
        const defaultL1Type = {
            id: `type-${Date.now()}`,
            name: 'YP',  // 기본 구분
            functions: [{
                id: `func-${Date.now()}`,
                name: '(기능 입력)',
                requirements: [{
                    id: `req-${Date.now()}`,
                    name: '(요구사항 입력)',
                }],
            }],
        };

        const worksheetState = {
            l1: {
                name: l1Name,
                completedProductName: l1Name,
                type: '',
                productFunction: '',
                productFailure: '',
                types: [defaultL1Type],  // ★ 기본 구분 추가
                failureScopes: [],       // ★ 고장영향 배열 초기화
            },
            l2: l2Structures,
            tab: 'structure',  // 구조분석 탭으로 시작
            search: '',
            visibleSteps: [2, 3, 4, 5, 6],
            _createdFromCp: true,
            _cpNo: cpNo,
            _createdAt: new Date().toISOString(),
        };

        // ★★★ ControlPlan.linkedPfmeaNo 역링크 저장 ★★★
        try {
            await prisma.controlPlan.updateMany({
                where: { cpNo },
                data: { linkedPfmeaNo: targetFmeaId, fmeaId: targetFmeaId },
            });
        } catch (linkErr: any) {
            console.error('[CP→FMEA 생성] ControlPlan 역링크 저장 실패:', linkErr.message);
        }

        // ★★★ FmeaRegistration.linkedCpNo 역링크 저장 ★★★
        try {
            await prisma.fmeaRegistration.updateMany({
                where: { fmeaId: targetFmeaId },
                data: { linkedCpNo: cpNo },
            });
        } catch (regErr: any) {
            console.error('[CP→FMEA 생성] FmeaRegistration 역링크 저장 실패:', regErr.message);
        }

        // localStorage 저장 키 (클라이언트에서 처리 - 임시 저장용)
        const localStorageKey = `pfmea_worksheet_${targetFmeaId}`;

        return NextResponse.json({
            success: true,
            message: `CP에서 새 FMEA를 생성했습니다. (${l2Structures.length}개 공정, ${l2Structures.reduce((sum, l2) => sum + l2.l3.length, 0)}개 작업요소)`,
            data: {
                fmeaId: targetFmeaId,
                cpNo,
                l2Count: l2Structures.length,
                l3Count: l2Structures.reduce((sum, l2) => sum + l2.l3.length, 0),
                worksheetState,
                localStorageKey,
                redirectUrl: `/pfmea/worksheet?id=${targetFmeaId}&tab=structure&fromCp=${cpNo}`,
                createdAt: new Date().toISOString(),
            }
        });

    } catch (error: any) {
        console.error('[CP→FMEA 생성] 오류:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
