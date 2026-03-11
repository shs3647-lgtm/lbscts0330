/**
 * @file mock-data.ts
 * @description PFMEA 기초정보 목업 데이터 (단순화된 16컬럼 형식)
 * @author AI Assistant
 * @created 2025-12-26
 * @updated 2025-12-26 - 1시트 16컬럼 방식으로 변경
 */

import { ImportRowData, ImportColumn, GeneratedRelation, CommonItem } from './types';

/** 
 * 16개 컬럼 정의 (번호 체계)
 * A: 공정 레벨 (A1-A6)
 * B: 작업요소 레벨 (B1-B5)
 * C: 완제품 레벨 (C1-C4)
 * D: 검사장비 (추가)
 */
export const importColumns: ImportColumn[] = [
  // A: 공정 레벨 (6개)
  { key: 'processNo', label: 'A1.공정번호', level: 'A', required: true, width: 80 },
  { key: 'processName', label: 'A2.공정명', level: 'A', required: true, width: 100 },
  { key: 'processDesc', label: 'A3.공정기능(설명)', level: 'A', required: false, width: 200 },
  { key: 'productChar', label: 'A4.제품특성', level: 'A', required: false, width: 120 },
  { key: 'failureMode', label: 'A5.고장형태', level: 'A', required: false, width: 120 },
  { key: 'detectionCtrl', label: 'A6.검출관리', level: 'A', required: false, width: 100 },
  // B: 작업요소 레벨 (5개)
  { key: 'workElement', label: 'B1.작업요소(설비)', level: 'B', required: false, width: 100 },
  { key: 'workElementFunc', label: 'B2.요소기능', level: 'B', required: false, width: 150 },
  { key: 'processChar', label: 'B3.공정특성', level: 'B', required: false, width: 100 },
  { key: 'failureCause', label: 'B4.고장원인', level: 'B', required: false, width: 120 },
  { key: 'preventionCtrl', label: 'B5.예방관리', level: 'B', required: false, width: 100 },
  // C: 완제품 레벨 (4개)
  { key: 'category', label: 'C1.구분', level: 'C', required: false, width: 120 },  // YOUR PLANT, SHIP TO PLANT, USER
  { key: 'productFunc', label: 'C2.제품(반)기능', level: 'C', required: false, width: 120 },
  { key: 'requirement', label: 'C3.제품(반)요구사항', level: 'C', required: false, width: 120 },
  { key: 'failureEffect', label: 'C4.고장영향', level: 'C', required: false, width: 120 },
  // D: 검사장비
  { key: 'inspectionEquip', label: 'D.검사장비', level: 'D', required: false, width: 100 },
];

/** 
 * 샘플 Import 데이터 (16컬럼 형식) - 타이어 제조 공정 기반 20행
 * 공정번호: 10(원료입고), 20(수입검사), 30(정련), 40(압출), 50(압연)
 */
export const sampleImportData: ImportRowData[] = [
  // 10 원료입고 (3행) - YOUR PLANT
  { processNo: '10', processName: '원료입고', processDesc: '입고된 원재료를 입수하여 지정된 창고에 입고', productChar: '원료 외관', workElement: '저장탱크', workElementFunc: '원료 저장', processChar: '보관 온도', productFunction: 'YOUR PLANT', requirement: '선입선출', failureEffect: '원료 혼입, 품질 불량', failureMode: '외관 불량', failureCause: '보관방법 미준수', detectionCtrl: '수입검사 체크시트', preventionCtrl: 'QR코드 스캔', equipment: '저장탱크', inspectionEquip: '바코드리더' },
  { processNo: '10', processName: '원료입고', processDesc: '입고된 원재료를 입수하여 지정된 창고에 입고', productChar: '유효기간', workElement: '자동창고', workElementFunc: '자동 입출고', processChar: '습도', productFunction: 'YOUR PLANT', requirement: '선입선출', failureEffect: '품질 저하', failureMode: '유효기간 초과', failureCause: 'FIFO 미준수', detectionCtrl: '시스템 알람', preventionCtrl: 'WMS 자동관리', equipment: '자동창고', inspectionEquip: 'WMS' },
  { processNo: '10', processName: '원료입고', processDesc: '입고된 원재료를 입수하여 지정된 창고에 입고', productChar: 'ID카드', workElement: '계량대', workElementFunc: '입고 계량', processChar: '온습도', productFunction: 'YOUR PLANT', requirement: '선입선출', failureEffect: '원료 불일치', failureMode: 'ID카드 불량', failureCause: '라벨링 오류', detectionCtrl: 'ID 확인', preventionCtrl: '바코드 스캔', equipment: '전자저울', inspectionEquip: '전자저울' },
  
  // 20 수입검사 (4행) - YOUR PLANT
  { processNo: '20', processName: '수입검사', processDesc: '입고자재의 샘플링 수입검사', productChar: 'Mooney Viscosity', workElement: 'MOONEY VISCOMETER', workElementFunc: '점도 측정', processChar: '샘플링', productFunction: 'YOUR PLANT', requirement: '규격 적합', failureEffect: '부적합품 유출', failureMode: 'Mooney 불만족', failureCause: '검사기 오류', detectionCtrl: 'MILL CON', preventionCtrl: '일상점검', equipment: '점도계', inspectionEquip: 'Mooney Viscometer' },
  { processNo: '20', processName: '수입검사', processDesc: '입고자재의 샘플링 수입검사', productChar: '인장강도', workElement: '인장시험기', workElementFunc: '강도 시험', processChar: '시료 준비', productFunction: 'YOUR PLANT', requirement: '규격 적합', failureEffect: '강도 부족', failureMode: '인장강도 불만족', failureCause: '시험조건 오류', detectionCtrl: '시험성적서', preventionCtrl: '장비 교정', equipment: '인장시험기', inspectionEquip: 'UTM' },
  { processNo: '20', processName: '수입검사', processDesc: '입고자재의 샘플링 수입검사', productChar: 'DBP Oil', workElement: 'DBP ABSORPMETER', workElementFunc: 'DBP 측정', processChar: '시약 관리', productFunction: 'YOUR PLANT', requirement: '규격 적합', failureEffect: '배합 불량', failureMode: 'DBP 불만족', failureCause: '시약 오염', detectionCtrl: '성적서 확인', preventionCtrl: '시약 교체주기', equipment: 'DBP계', inspectionEquip: 'DBP Meter' },
  { processNo: '20', processName: '수입검사', processDesc: '입고자재의 샘플링 수입검사', productChar: 'Appearance', workElement: '외관검사대', workElementFunc: '외관 확인', processChar: '조명 환경', productFunction: 'YOUR PLANT', requirement: '규격 적합', failureEffect: '외관 불량 유출', failureMode: 'Appearance 불량', failureCause: '검사자 실수', detectionCtrl: '육안검사', preventionCtrl: '교육 실시', equipment: '조명대', inspectionEquip: '육안' },
  
  // 30 정련 (5행) - SHIP TO PLANT
  { processNo: '30', processName: '정련', processDesc: '고무,카본블랙,오일,화학약품을 믹싱하여 FM컴파운드 생산', productChar: 'Mooney Viscosity', workElement: '혼련설비', workElementFunc: '원료 혼합', processChar: '혼련 온도', productFunction: 'SHIP TO PLANT', requirement: 'Compound Durability', failureEffect: '접착 불량, 크랙 발생', failureMode: 'Mooney 불만족', failureCause: '배합비 오류', detectionCtrl: 'MILL CON검사', preventionCtrl: '온도 모니터링', equipment: 'MB 믹서', inspectionEquip: '점도계' },
  { processNo: '30', processName: '정련', processDesc: '고무,카본블랙,오일,화학약품을 믹싱하여 FM컴파운드 생산', productChar: 'Scorch Time', workElement: '혼련설비', workElementFunc: '원료 혼합', processChar: '혼련 시간', productFunction: 'SHIP TO PLANT', requirement: 'Compound Durability', failureEffect: '가황 불량', failureMode: 'Scorch Time 불만족', failureCause: '타이머 오류', detectionCtrl: 'Rheometer', preventionCtrl: '파라미터 확인', equipment: 'MB 믹서', inspectionEquip: 'Rheometer' },
  { processNo: '30', processName: '정련', processDesc: '고무,카본블랙,오일,화학약품을 믹싱하여 FM컴파운드 생산', productChar: 'Rheometer', workElement: 'FB 믹서', workElementFunc: '최종 혼련', processChar: 'Drop Temp', productFunction: 'SHIP TO PLANT', requirement: 'Compound Durability', failureEffect: '물성 불량', failureMode: 'Rheometer 불만족', failureCause: 'Drop 온도 오류', detectionCtrl: '측정 성적서', preventionCtrl: '온도 센서 점검', equipment: 'FB 믹서', inspectionEquip: 'Rheometer' },
  { processNo: '30', processName: '정련', processDesc: '고무,카본블랙,오일,화학약품을 믹싱하여 FM컴파운드 생산', productChar: 'Specific Gravity', workElement: 'FB 믹서', workElementFunc: '최종 혼련', processChar: 'RPM', productFunction: 'SHIP TO PLANT', requirement: 'Compound Durability', failureEffect: '비중 이탈', failureMode: 'S.G. 불만족', failureCause: '계량 오류', detectionCtrl: '비중 측정', preventionCtrl: '계량기 교정', equipment: 'FB 믹서', inspectionEquip: '비중계' },
  { processNo: '30', processName: '정련', processDesc: '고무,카본블랙,오일,화학약품을 믹싱하여 FM컴파운드 생산', productChar: '배치 외관', workElement: 'MILL', workElementFunc: '시트화', processChar: '롤 간격', productFunction: 'SHIP TO PLANT', requirement: 'Compound Durability', failureEffect: '이물 혼입', failureMode: '외관 불량', failureCause: '청소 미실시', detectionCtrl: '육안검사', preventionCtrl: '청소 점검표', equipment: 'MILL', inspectionEquip: '육안' },
  
  // 40 압출 (4행) - SHIP TO PLANT
  { processNo: '40', processName: '압출', processDesc: 'FM컴파운드를 압출하여 TREAD, SIDE를 성형', productChar: 'Tread 폭', workElement: 'TREAD 압출기', workElementFunc: 'Tread 압출', processChar: '압출 온도', productFunction: 'SHIP TO PLANT', requirement: 'Uniformity', failureEffect: '외관 불량', failureMode: 'Tread 폭 불만족', failureCause: '다이 마모', detectionCtrl: '온라인 게이지', preventionCtrl: '다이 교체주기', equipment: '압출기', inspectionEquip: '게이지 카메라' },
  { processNo: '40', processName: '압출', processDesc: 'FM컴파운드를 압출하여 TREAD, SIDE를 성형', productChar: 'Tread 두께', workElement: 'TREAD 압출기', workElementFunc: 'Tread 압출', processChar: '압출 속도', productFunction: 'SHIP TO PLANT', requirement: 'Uniformity', failureEffect: '두께 편차', failureMode: 'Tread 두께 불만족', failureCause: '속도 변동', detectionCtrl: '두께 측정', preventionCtrl: '속도 모니터링', equipment: '압출기', inspectionEquip: '두께 게이지' },
  { processNo: '40', processName: '압출', processDesc: 'FM컴파운드를 압출하여 TREAD, SIDE를 성형', productChar: 'Side Wall 폭', workElement: 'Side 압출기', workElementFunc: 'Side 압출', processChar: '압출 압력', productFunction: 'SHIP TO PLANT', requirement: 'Uniformity', failureEffect: '접합 불량', failureMode: 'Side 폭 불만족', failureCause: '압력 변동', detectionCtrl: '온라인 게이지', preventionCtrl: '압력 모니터링', equipment: '압출기', inspectionEquip: '게이지 카메라' },
  { processNo: '40', processName: '압출', processDesc: 'FM컴파운드를 압출하여 TREAD, SIDE를 성형', productChar: 'Side Wall 두께', workElement: 'Side 압출기', workElementFunc: 'Side 압출', processChar: '냉각 온도', productFunction: 'SHIP TO PLANT', requirement: 'Uniformity', failureEffect: '치수 불량', failureMode: 'Side 두께 불만족', failureCause: '냉각 불량', detectionCtrl: '두께 측정', preventionCtrl: '냉각수 점검', equipment: '압출기', inspectionEquip: '두께 게이지' },
  
  // 50 압연 (4행) - USER
  { processNo: '50', processName: '압연', processDesc: '스틸코드, 패브릭코드에 고무를 코팅하여 반제품 생산', productChar: 'Steel Cord 폭', workElement: '스틸 카렌다', workElementFunc: '스틸코드 코팅', processChar: 'EPI', productFunction: 'USER', requirement: 'Structural Integrity', failureEffect: '내구 저하, 분리', failureMode: 'Steel 폭 불만족', failureCause: 'EPI 오류', detectionCtrl: '폭 측정', preventionCtrl: 'EPI 센서 점검', equipment: '카렌다', inspectionEquip: '폭 게이지' },
  { processNo: '50', processName: '압연', processDesc: '스틸코드, 패브릭코드에 고무를 코팅하여 반제품 생산', productChar: 'Steel Cord 두께', workElement: '스틸 카렌다', workElementFunc: '스틸코드 코팅', processChar: '롤 간격', productFunction: 'USER', requirement: 'Structural Integrity', failureEffect: '접착 불량', failureMode: 'Steel 두께 불만족', failureCause: '롤 간격 오류', detectionCtrl: '두께 측정', preventionCtrl: '롤 간격 점검', equipment: '카렌다', inspectionEquip: '두께 게이지' },
  { processNo: '50', processName: '압연', processDesc: '스틸코드, 패브릭코드에 고무를 코팅하여 반제품 생산', productChar: 'Fabric Cord 폭', workElement: '텍스타일 카렌다', workElementFunc: '패브릭 코팅', processChar: 'TCU 온도', productFunction: 'USER', requirement: 'Structural Integrity', failureEffect: '분리 발생', failureMode: 'Fabric 폭 불만족', failureCause: '온도 오류', detectionCtrl: '폭 측정', preventionCtrl: 'TCU 점검', equipment: '카렌다', inspectionEquip: '폭 게이지' },
  { processNo: '50', processName: '압연', processDesc: '스틸코드, 패브릭코드에 고무를 코팅하여 반제품 생산', productChar: 'Fabric Cord 두께', workElement: '텍스타일 카렌다', workElementFunc: '패브릭 코팅', processChar: '드럼 온도', productFunction: 'USER', requirement: 'Structural Integrity', failureEffect: '두께 편차', failureMode: 'Fabric 두께 불만족', failureCause: '드럼 온도 변동', detectionCtrl: '두께 측정', preventionCtrl: '온도 모니터링', equipment: '카렌다', inspectionEquip: '두께 게이지' },
];

/** 공정번호로 관계형 데이터 자동 생성 */
export const generateRelations = (data: ImportRowData[]): GeneratedRelation[] => {
  const processMap = new Map<string, GeneratedRelation>();

  data.forEach(row => {
    const key = row.processNo;
    
    if (!processMap.has(key)) {
      processMap.set(key, {
        processNo: row.processNo,
        processName: row.processName,
        l1: {
          productFunction: row.productFunction || row.productFunc || '',
          requirement: row.requirement,
          failureEffect: row.failureEffect,
        },
        l2: { productChars: [], failureModes: [], detectionCtrls: [], inspectionEquips: [] },
        l3: { workElements: [], processChars: [], failureCauses: [], preventionCtrls: [], equipments: [] },
      });
    }

    const rel = processMap.get(key)!;

    // L2 데이터 추가 (중복 제거)
    if (row.productChar && !rel.l2.productChars.includes(row.productChar)) {
      rel.l2.productChars.push(row.productChar);
    }
    if (row.failureMode && !rel.l2.failureModes.includes(row.failureMode)) {
      rel.l2.failureModes.push(row.failureMode);
    }
    if (row.detectionCtrl && !rel.l2.detectionCtrls.includes(row.detectionCtrl)) {
      rel.l2.detectionCtrls.push(row.detectionCtrl);
    }
    if (row.inspectionEquip && !rel.l2.inspectionEquips.includes(row.inspectionEquip)) {
      rel.l2.inspectionEquips.push(row.inspectionEquip);
    }

    // L3 데이터 추가 (중복 제거)
    if (row.workElement && !rel.l3.workElements.find(w => w.name === row.workElement)) {
      rel.l3.workElements.push({ name: row.workElement, func: row.workElementFunc || row.elementFunc || '' });
    }
    if (row.processChar && !rel.l3.processChars.includes(row.processChar)) {
      rel.l3.processChars.push(row.processChar);
    }
    if (row.failureCause && !rel.l3.failureCauses.includes(row.failureCause)) {
      rel.l3.failureCauses.push(row.failureCause);
    }
    if (row.preventionCtrl && !rel.l3.preventionCtrls.includes(row.preventionCtrl)) {
      rel.l3.preventionCtrls.push(row.preventionCtrl);
    }
    if (row.equipment && !rel.l3.equipments.includes(row.equipment)) {
      rel.l3.equipments.push(row.equipment);
    }
  });

  return Array.from(processMap.values());
};

/** 미리보기 통계 계산 */
export const calculateStats = (data: ImportRowData[]) => {
  const uniqueProcesses = new Set(data.map(d => d.processNo)).size;
  const l1Items = new Set(data.flatMap(d => [d.productFunction, d.requirement, d.failureEffect].filter(Boolean))).size;
  const l2Items = new Set(data.flatMap(d => [d.productChar, d.failureMode, d.detectionCtrl, d.inspectionEquip].filter(Boolean))).size;
  const l3Items = new Set(data.flatMap(d => [d.workElement, d.processChar, d.failureCause, d.preventionCtrl, d.equipment].filter(Boolean))).size;

  return { totalRows: data.length, uniqueProcesses, l1Items, l2Items, l3Items };
};

/** 공통 기초정보 (모든 공정에서 사용) */
export const commonItems: CommonItem[] = [
  // MN: Man (사람) - 5개
  { id: 'MN01', category: 'MN', categoryName: 'Man (사람)', name: '셋업엔지니어', description: '설비 셋업 및 조정 담당', failureCauses: ['셋업 파라미터 설정 오류', '셋업 절차 미준수'] },
  { id: 'MN02', category: 'MN', categoryName: 'Man (사람)', name: '작업자', description: '생산 작업 수행', failureCauses: ['작업표준서 미준수', '작업 실수', '교육 부족'] },
  { id: 'MN03', category: 'MN', categoryName: 'Man (사람)', name: '운반원', description: '자재 및 제품 운반', failureCauses: ['운반 중 손상', '오배송', '취급 부주의'] },
  { id: 'MN04', category: 'MN', categoryName: 'Man (사람)', name: '보전원', description: '설비 유지보수 담당', failureCauses: ['예방정비 미실시', '정비 오류', '점검 누락'] },
  { id: 'MN05', category: 'MN', categoryName: 'Man (사람)', name: '검사원', description: '품질 검사 수행', failureCauses: ['검사 누락', '오판정', '검사 기준 미준수'] },

  // EN: Environment (환경) - 5개
  { id: 'EN01', category: 'EN', categoryName: 'Environment (환경)', name: '온도', description: '작업장 온도 조건', failureCauses: ['온도 범위 이탈', '온도 변동 과다'] },
  { id: 'EN02', category: 'EN', categoryName: 'Environment (환경)', name: '습도', description: '작업장 습도 조건', failureCauses: ['습도 범위 이탈', '결로 발생'] },
  { id: 'EN03', category: 'EN', categoryName: 'Environment (환경)', name: '이물', description: '이물질 오염 요인', failureCauses: ['이물 혼입', '청정도 미달'] },
  { id: 'EN04', category: 'EN', categoryName: 'Environment (환경)', name: '정전기', description: '정전기 발생 조건', failureCauses: ['정전기 방전', 'ESD 손상'] },
  { id: 'EN05', category: 'EN', categoryName: 'Environment (환경)', name: '진동', description: '설비/작업장 진동', failureCauses: ['진동으로 인한 이완', '정밀도 저하'] },

  // IM: Indirect Material (부자재) - 6개
  { id: 'IM01', category: 'IM', categoryName: 'Indirect Material (부자재)', name: '그리이스', description: '윤활용 그리이스', failureCauses: ['도포량 과다/부족', '종류 오적용', '유효기간 초과'] },
  { id: 'IM02', category: 'IM', categoryName: 'Indirect Material (부자재)', name: '작동유', description: '유압 작동유', failureCauses: ['오일 오염', '오일량 부족', '점도 불량'] },
  { id: 'IM03', category: 'IM', categoryName: 'Indirect Material (부자재)', name: '냉각수', description: '설비 냉각용 냉각수', failureCauses: ['냉각수 부족', '온도 이상', '오염'] },
  { id: 'IM04', category: 'IM', categoryName: 'Indirect Material (부자재)', name: '윤활유', description: '설비 윤활용 오일', failureCauses: ['윤활 불량', '오일 누유', '교환주기 초과'] },
  { id: 'IM05', category: 'IM', categoryName: 'Indirect Material (부자재)', name: '이형제', description: '금형 이형제', failureCauses: ['도포 불균일', '종류 오적용'] },
  { id: 'IM06', category: 'IM', categoryName: 'Indirect Material (부자재)', name: '비닐커버', description: '보호용 비닐커버', failureCauses: ['손상된 커버 사용', '미적용'] },
];

/** 공통 항목을 관계형 데이터에 추가 (커스텀 목록 지원) */
export const addCommonItemsToRelation = (relation: GeneratedRelation, items?: CommonItem[]): GeneratedRelation => {
  const itemsToUse = items || commonItems;
  
  const commonWorkElements = itemsToUse.map(item => ({
    name: `[${item.category}] ${item.name}`,
    func: item.description || ''
  }));
  
  const commonFailureCauses = itemsToUse.flatMap(item => 
    (item.failureCauses || []).map(fc => `[${item.category}] ${fc}`)
  );

  return {
    ...relation,
    l3: {
      ...relation.l3,
      workElements: [...relation.l3.workElements, ...commonWorkElements],
      failureCauses: [...relation.l3.failureCauses, ...commonFailureCauses],
    }
  };
};
