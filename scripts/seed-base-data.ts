/**
 * @file seed-base-data.ts
 * @description FMEA 시스템 기초 데이터 시드 (클론 직후 실행)
 *
 * 포함 데이터:
 *   1. 사용자 (Users) — 관리자 + 부서별 담당자 10명
 *   2. 고객사 (Customers) — 반도체/자동차 주요 고객 15사
 *   3. CFT 역할 템플릿 (FmeaCftMember 참조용)
 *   4. 특별특성 기준 (SpecialCharacteristicCriteria) — ★/◇ 등 8종
 *   5. S/O/D 평가 기준 (AIAG-VDA 1st Edition)
 *   6. 산업 공통 검출관리 (KrIndustryDetection) — 25건
 *   7. 산업 공통 예방관리 (KrIndustryPrevention) — 25건
 *   8. 평가방법 라이브러리 (EvalMethodLibrary) — 15건
 *   9. 관리방법 라이브러리 (ControlMethodLibrary) — 15건
 *  10. 대응계획 템플릿 (ReactionPlanTemplate) — 10건
 *  11. 부품 마스터 (Part) — 10건
 *  12. 공정 마스터 (MasterProcess) — 반도체 표준 21공정
 *
 * 실행: npx tsx scripts/seed-base-data.ts
 * 필수: DATABASE_URL 환경변수 (.env)
 */

import { getPrisma } from '../src/lib/prisma';
import { INDUSTRY_DETECTION_ROWS, INDUSTRY_PREVENTION_ROWS } from '../src/lib/fmea/kr-industry-seed-rows';
import * as crypto from 'crypto';

const prisma = getPrisma();
if (!prisma) {
  console.error('❌ DATABASE_URL 환경변수가 설정되지 않았습니다. .env 파일을 확인하세요.');
  process.exit(1);
}

// ─── 비밀번호 해싱 (bcrypt 없이 간단 해싱 — 초기 시드용) ───
function hashPassword(plain: string): string {
  return crypto.createHash('sha256').update(plain).digest('hex');
}

// ============================================================
// 1. Users — 사용자 10명 (관리자 + 부서별)
// ============================================================
const USERS = [
  { factory: 'LBS반도체', department: '품질보증팀', name: '김관리자', position: '팀장', email: 'admin@fmea.local', role: 'admin', permPfmea: 'admin', permDfmea: 'admin', permCp: 'admin', permPfd: 'admin' },
  { factory: 'LBS반도체', department: '품질보증팀', name: '이품질', position: '과장', email: 'qa1@fmea.local', role: 'editor', permPfmea: 'editor', permDfmea: 'editor', permCp: 'editor', permPfd: 'editor' },
  { factory: 'LBS반도체', department: '품질보증팀', name: '박검사', position: '대리', email: 'qa2@fmea.local', role: 'editor', permPfmea: 'editor', permDfmea: 'viewer', permCp: 'editor', permPfd: 'viewer' },
  { factory: 'LBS반도체', department: '공정기술팀', name: '최공정', position: '팀장', email: 'process1@fmea.local', role: 'editor', permPfmea: 'editor', permDfmea: 'editor', permCp: 'editor', permPfd: 'editor' },
  { factory: 'LBS반도체', department: '공정기술팀', name: '정설비', position: '과장', email: 'process2@fmea.local', role: 'editor', permPfmea: 'editor', permDfmea: 'viewer', permCp: 'viewer', permPfd: 'editor' },
  { factory: 'LBS반도체', department: '설계팀', name: '강설계', position: '팀장', email: 'design1@fmea.local', role: 'editor', permPfmea: 'viewer', permDfmea: 'editor', permCp: 'viewer', permPfd: 'viewer' },
  { factory: 'LBS반도체', department: '설계팀', name: '윤개발', position: '과장', email: 'design2@fmea.local', role: 'editor', permPfmea: 'viewer', permDfmea: 'editor', permCp: 'viewer', permPfd: 'viewer' },
  { factory: 'LBS반도체', department: '생산팀', name: '한생산', position: '팀장', email: 'prod1@fmea.local', role: 'viewer', permPfmea: 'viewer', permDfmea: 'none', permCp: 'viewer', permPfd: 'viewer' },
  { factory: 'LBS반도체', department: '구매팀', name: '오구매', position: '과장', email: 'purchase@fmea.local', role: 'viewer', permPfmea: 'viewer', permDfmea: 'none', permCp: 'none', permPfd: 'none' },
  { factory: 'LBS반도체', department: '고객품질팀', name: '서고객', position: '차장', email: 'customer@fmea.local', role: 'editor', permPfmea: 'editor', permDfmea: 'editor', permCp: 'editor', permPfd: 'editor' },
];

// ============================================================
// 2. Customers — 고객사 15사
// ============================================================
const CUSTOMERS = [
  { name: 'Samsung Electronics', code: 'SEC', factory: '화성/평택', description: '메모리/파운드리' },
  { name: 'SK hynix', code: 'SKH', factory: '이천/청주', description: 'DRAM/NAND' },
  { name: 'TSMC', code: 'TSMC', factory: 'Hsinchu/Tainan', description: '파운드리' },
  { name: 'Intel', code: 'INTC', factory: 'Oregon/Arizona', description: 'IDM' },
  { name: 'Micron Technology', code: 'MU', factory: 'Boise/Hiroshima', description: 'DRAM/NAND' },
  { name: 'Texas Instruments', code: 'TXN', factory: 'Dallas/Aizu', description: '아날로그 IC' },
  { name: 'Infineon Technologies', code: 'IFX', factory: 'Dresden/Villach', description: '파워반도체' },
  { name: 'STMicroelectronics', code: 'STM', factory: 'Crolles/Catania', description: 'MCU/센서' },
  { name: 'Hyundai Motor', code: 'HMMA', factory: '울산/아산', description: '자동차 완성차' },
  { name: 'Kia Corporation', code: 'KIA', factory: '광주/화성', description: '자동차 완성차' },
  { name: 'LG Electronics', code: 'LGE', factory: '창원/구미', description: '가전/차량부품' },
  { name: 'Samsung SDI', code: 'SDI', factory: '천안/울산', description: '배터리/전자재료' },
  { name: 'ASE Group', code: 'ASE', factory: 'Kaohsiung', description: 'OSAT 패키징' },
  { name: 'Amkor Technology', code: 'AMKR', factory: 'Incheon/Manila', description: 'OSAT 패키징' },
  { name: 'DB HiTek', code: 'DBH', factory: '부천', description: '파운드리 (8인치)' },
];

// ============================================================
// 3. 특별특성 기준 (SpecialCharacteristicCriteria)
// ============================================================
const SPECIAL_CHARS = [
  { code: 'CC', name: '안전 특별특성', symbol: '★', description: '안전 및 법규 관련 제품 특별특성 (Critical Characteristic)', customer: null, color: '#DC2626' },
  { code: 'SC', name: '공정 특별특성', symbol: '◇', description: '고객 만족에 영향을 미치는 공정 특별특성 (Significant Characteristic)', customer: null, color: '#2563EB' },
  { code: 'KPC', name: 'Key Product Char', symbol: '★', description: 'Key Product Characteristic (고객사 지정)', customer: 'Hyundai/Kia', color: '#DC2626' },
  { code: 'KCC', name: 'Key Control Char', symbol: '◇', description: 'Key Control Characteristic (고객사 지정)', customer: 'Hyundai/Kia', color: '#2563EB' },
  { code: 'S', name: 'Safety', symbol: '▲', description: '안전 관련 특별특성 (GM/Ford/Stellantis)', customer: 'GM/Ford', color: '#DC2626' },
  { code: 'F', name: 'Fit/Function', symbol: '◆', description: '기능 관련 특별특성', customer: 'GM/Ford', color: '#7C3AED' },
  { code: 'YP', name: '완제품특성', symbol: '★', description: 'AIAG-VDA: 완제품에 영향을 미치는 특성 (Y Performance)', customer: null, color: '#EA580C' },
  { code: 'SP', name: '보조특성', symbol: '◇', description: 'AIAG-VDA: 공정에서 관리하는 보조 특성 (S Process)', customer: null, color: '#0891B2' },
];

// ============================================================
// 4. Severity 기준 (AIAG-VDA 1st Edition, 1~10)
// ============================================================
const SEVERITY_CRITERIA = [
  { rating: 10, scope: '안전/법규', effect: '경고 없이 안전 관련 고장', description: '잠재적 안전 문제. 정부 규정 미준수. 경고 없음' },
  { rating: 9,  scope: '안전/법규', effect: '경고 있는 안전 관련 고장', description: '잠재적 안전 문제. 정부 규정 미준수. 경고 있음' },
  { rating: 8,  scope: '기능 상실', effect: '주요 기능 상실/작동 불능', description: '차량/제품이 작동하지 않음 (주 기능 상실)' },
  { rating: 7,  scope: '기능 저하', effect: '주요 기능 저하', description: '차량/제품이 작동하나 성능 저하' },
  { rating: 6,  scope: '기능 저하', effect: '편의 기능 상실', description: '편의 기능 또는 보조 기능이 작동하지 않음' },
  { rating: 5,  scope: '기능 저하', effect: '편의 기능 저하', description: '편의 기능 성능 저하. 고객이 불편함을 느낌' },
  { rating: 4,  scope: '외관/소음', effect: '외관, 소음 등 감지 결함', description: '대부분의 고객(75% 이상)이 결함을 감지' },
  { rating: 3,  scope: '외관/소음', effect: '보통 수준 감지 결함', description: '50%의 고객이 결함을 감지' },
  { rating: 2,  scope: '외관/소음', effect: '경미한 결함', description: '식별력이 있는 고객만 감지 (25% 이하)' },
  { rating: 1,  scope: '영향 없음', effect: '영향 없음', description: '고객이 인지할 수 없는 수준' },
];

// ============================================================
// 5. Occurrence 기준 (AIAG-VDA 1st Edition, 1~10)
// ============================================================
const OCCURRENCE_CRITERIA = [
  { rating: 10, probability: '극히 높음', ppm: '≥100,000', description: '새로운 기술/공정, 관리 기준 없음', prevention: '관리기준 미수립' },
  { rating: 9,  probability: '매우 높음', ppm: '50,000', description: '유사 공정에서 빈번한 고장', prevention: '관리기준 미흡' },
  { rating: 8,  probability: '높음', ppm: '20,000', description: '유사 공정에서 가끔 고장', prevention: '기본 관리 수립' },
  { rating: 7,  probability: '다소 높음', ppm: '10,000', description: '유사 공정에서 가끔 고장 (문서화)', prevention: '기본 관리 문서화' },
  { rating: 6,  probability: '보통', ppm: '2,000', description: '유사 공정에서 간헐적 고장', prevention: '관리계획 수립/준수' },
  { rating: 5,  probability: '다소 낮음', ppm: '500', description: '유사 공정에서 드문 고장', prevention: '관리계획 효과적 운용' },
  { rating: 4,  probability: '낮음', ppm: '100', description: '유사 공정에서 매우 드문 고장', prevention: 'SPC 관리, Cpk≥1.33' },
  { rating: 3,  probability: '매우 낮음', ppm: '10', description: '거의 동일 공정에서 간헐적 고장만', prevention: 'SPC 관리, Cpk≥1.67' },
  { rating: 2,  probability: '극히 낮음', ppm: '1', description: '동일 공정에서 고장 이력 없음', prevention: '실증된 예방관리, Cpk≥2.0' },
  { rating: 1,  probability: '발생 불가', ppm: '0', description: '고장 메커니즘이 방지됨 (Poka-Yoke)', prevention: '실수방지 (Error-Proofing)' },
];

// ============================================================
// 6. Detection 기준 (AIAG-VDA 1st Edition, 1~10)
// ============================================================
const DETECTION_CRITERIA = [
  { rating: 10, maturity: '검출 불가', description: '현재 관리로 검출 불가', detection: '검출 기준/방법 없음' },
  { rating: 9,  maturity: '거의 불가', description: '검출될 가능성이 매우 낮음', detection: '주관적 육안 검사' },
  { rating: 8,  maturity: '매우 낮음', description: '부적합이 검출될 가능성 낮음', detection: '이중 육안 검사' },
  { rating: 7,  maturity: '낮음', description: '부적합이 일부 검출됨', detection: '수동 치수 검사' },
  { rating: 6,  maturity: '다소 낮음', description: '부적합이 간헐적 검출됨', detection: 'SPC + 수동 검사' },
  { rating: 5,  maturity: '보통', description: '부적합이 50% 확률로 검출됨', detection: '자동 검사 (간헐적)' },
  { rating: 4,  maturity: '다소 높음', description: '부적합이 높은 확률로 검출됨', detection: '자동 검사 (연속)' },
  { rating: 3,  maturity: '높음', description: '부적합이 거의 확실히 검출됨', detection: '자동 전수검사 + 자동정지' },
  { rating: 2,  maturity: '매우 높음', description: '부적합이 확실히 검출됨', detection: '실수방지 (Error-Proofing) 검출' },
  { rating: 1,  maturity: '검출 확실', description: '부적합 발생 자체가 방지됨', detection: '실수방지 (Error-Proofing) 예방' },
];

// ============================================================
// 9. 평가방법 라이브러리 (EvalMethodLibrary)
// ============================================================
const EVAL_METHODS = [
  { code: 'EM-001', name: '육안 검사', category: '육안', description: '목시 확인 또는 확대경 사용', equipment: '확대경 10X/20X' },
  { code: 'EM-002', name: '치수 측정', category: '계측', description: '마이크로미터, 버니어 캘리퍼스 사용', equipment: '마이크로미터' },
  { code: 'EM-003', name: 'CMM 3차원 측정', category: '계측', description: '좌표 측정기로 정밀 치수 검사', equipment: 'CMM (Zeiss/Mitutoyo)' },
  { code: 'EM-004', name: 'SEM 분석', category: '분석', description: '주사전자현미경 표면/단면 관찰', equipment: 'SEM (Hitachi/JEOL)' },
  { code: 'EM-005', name: 'XRF 분석', category: '분석', description: 'X선 형광 분석으로 두께/성분 측정', equipment: 'XRF (Fischer/Oxford)' },
  { code: 'EM-006', name: '인장 시험', category: '물성', description: '시편 인장강도/연신율 측정', equipment: 'UTM (만능시험기)' },
  { code: 'EM-007', name: '경도 시험', category: '물성', description: 'Rockwell/Vickers 경도 측정', equipment: '경도 시험기' },
  { code: 'EM-008', name: '전기 시험', category: '전기', description: 'Open/Short, 저항, 절연저항 측정', equipment: 'Tester (Advantest)' },
  { code: 'EM-009', name: '누설 시험', category: '기밀', description: 'He Leak / Air Leak 시험', equipment: 'Leak Detector' },
  { code: 'EM-010', name: '염수분무 시험', category: '내식', description: 'Salt Spray Test (SST)', equipment: '염수분무 시험기' },
  { code: 'EM-011', name: '밀착력 시험', category: '도금', description: 'Tape Test / Scratch Test', equipment: 'Tape + Pull Tester' },
  { code: 'EM-012', name: '전수 자동검사', category: 'AOI', description: 'AVI/AOI 전수 자동 외관검사', equipment: 'AVI/AOI 장비' },
  { code: 'EM-013', name: '파티클 검사', category: '청정', description: 'Particle Counter로 오염도 측정', equipment: 'Particle Counter' },
  { code: 'EM-014', name: 'Ball Shear Test', category: '접합', description: '범프/와이어본드 전단강도 시험', equipment: 'Shear Tester (Dage)' },
  { code: 'EM-015', name: 'Profiler 측정', category: '계측', description: '3D Surface Profiler 높이/거칠기', equipment: '3D Profiler (KLA/Bruker)' },
];

// ============================================================
// 10. 관리방법 라이브러리 (ControlMethodLibrary)
// ============================================================
const CONTROL_METHODS = [
  { code: 'CM-001', name: '초중종물 검사', category: '공정검사', description: 'Lot 시작/중간/종료 시 샘플 검사', frequency: '매 Lot' },
  { code: 'CM-002', name: '전수 검사', category: '공정검사', description: '전 수량 100% 검사', frequency: '전수' },
  { code: 'CM-003', name: '샘플링 검사', category: '공정검사', description: 'AQL 기준 샘플링', frequency: 'AQL Level II' },
  { code: 'CM-004', name: 'SPC 관리', category: '통계관리', description: 'X-bar R Chart 실시간 관리', frequency: '연속' },
  { code: 'CM-005', name: '일일 점검', category: '설비점검', description: '작업 시작 전 설비 일일 점검', frequency: '1회/교대' },
  { code: 'CM-006', name: '주간 PM', category: '설비점검', description: '설비 주간 예방정비', frequency: '1회/주' },
  { code: 'CM-007', name: '월간 PM', category: '설비점검', description: '설비 월간 정기정비 + 교정', frequency: '1회/월' },
  { code: 'CM-008', name: '자동 인터록', category: '실수방지', description: '규격 이탈 시 자동 정지', frequency: '연속' },
  { code: 'CM-009', name: 'Poka-Yoke', category: '실수방지', description: '실수방지 장치로 불량 투입 차단', frequency: '연속' },
  { code: 'CM-010', name: 'Recipe Lock', category: '실수방지', description: 'Recipe 변경 시 승인 필수', frequency: '변경 시' },
  { code: 'CM-011', name: '입고 검사 (IQC)', category: '수입검사', description: '자재 입고 시 CoA + 샘플 검사', frequency: '매 입고' },
  { code: 'CM-012', name: '출하 검사 (OQC)', category: '출하검사', description: '출하 전 최종 검사', frequency: '매 출하' },
  { code: 'CM-013', name: '환경 모니터링', category: '환경관리', description: '온습도/파티클 실시간 감시', frequency: '연속' },
  { code: 'CM-014', name: 'MSA/Gage R&R', category: '계측관리', description: '측정시스템 분석 (반복성/재현성)', frequency: '1회/년' },
  { code: 'CM-015', name: '교육/자격 인증', category: '인적관리', description: '작업자 교육 + 자격 인증 관리', frequency: '1회/반기' },
];

// ============================================================
// 11. 대응계획 템플릿 (ReactionPlanTemplate)
// ============================================================
const REACTION_PLANS = [
  { code: 'RP-001', name: '즉시 라인 정지', defectType: 'safety', severity: 'critical', actionSteps: '1.라인 정지 2.불량품 격리 3.원인 분석 4.시정조치 5.재발방지 6.라인 재가동', responsible: '품질팀장', escalation: '공장장 즉시 보고' },
  { code: 'RP-002', name: '불량 격리 + 전수 선별', defectType: 'functional', severity: 'high', actionSteps: '1.해당 Lot 격리 2.전수 선별 3.원인 분석 4.시정조치 5.후속 Lot 검증', responsible: '공정담당', escalation: '품질팀장 4시간 내 보고' },
  { code: 'RP-003', name: 'SPC 이상 대응', defectType: 'process', severity: 'medium', actionSteps: '1.생산 일시 중지 2.SPC 이탈 원인 확인 3.공정 조건 조정 4.Cpk 재확인 5.생산 재개', responsible: '공정엔지니어', escalation: '공정팀장 보고' },
  { code: 'RP-004', name: '자재 불량 대응', defectType: 'material', severity: 'high', actionSteps: '1.자재 사용 중지 2.재고 전수 확인 3.공급업체 통보 4.대체 자재 확보 5.SCAR 발행', responsible: '구매담당', escalation: '구매팀장 + 품질팀장' },
  { code: 'RP-005', name: '설비 이상 대응', defectType: 'equipment', severity: 'medium', actionSteps: '1.설비 정지 2.비상 정비 3.정비 완료 후 시운전 4.초품 검사 5.생산 재개', responsible: '설비엔지니어', escalation: '설비팀장 보고' },
  { code: 'RP-006', name: '외관 불량 대응', defectType: 'cosmetic', severity: 'low', actionSteps: '1.불량 Lot 격리 2.외관 기준 재확인 3.작업표준 재교육 4.추가 샘플링 검사', responsible: '품질검사원', escalation: '품질과장 보고' },
  { code: 'RP-007', name: '치수 이탈 대응', defectType: 'dimensional', severity: 'medium', actionSteps: '1.해당 Lot 격리 2.치수 전수 재측정 3.금형/설비 점검 4.공정 조건 조정 5.초품 확인', responsible: '공정담당', escalation: '공정팀장 보고' },
  { code: 'RP-008', name: '고객 클레임 대응', defectType: 'customer', severity: 'critical', actionSteps: '1.긴급 회의 소집 2.8D Report 발행 3.즉시 대응 조치 4.근본 원인 분석 5.시정조치 6.유효성 확인 7.수평전개', responsible: '고객품질팀', escalation: '품질본부장 즉시 보고' },
  { code: 'RP-009', name: '환경 이탈 대응', defectType: 'environment', severity: 'medium', actionSteps: '1.해당 구역 생산 중지 2.환경 조건 복원 3.영향 범위 확인 4.해당 Lot 선별 검사', responsible: '시설담당', escalation: '시설팀장 보고' },
  { code: 'RP-010', name: '경미 이상 대응', defectType: 'minor', severity: 'low', actionSteps: '1.이상 기록 2.추이 모니터링 3.개선 계획 수립 (필요 시)', responsible: '공정담당', escalation: '주간 회의 보고' },
];

// ============================================================
// 12. 부품 마스터 (Part)
// ============================================================
const PARTS = [
  { partNo: 'WFR-12-AU', partName: '12inch Au Bump Wafer', customer: 'Samsung Electronics' },
  { partNo: 'WFR-12-CU', partName: '12inch Cu Pillar Wafer', customer: 'Samsung Electronics' },
  { partNo: 'WFR-08-AU', partName: '8inch Au Bump Wafer', customer: 'DB HiTek' },
  { partNo: 'PKG-BGA-001', partName: 'BGA Package (12x12mm)', customer: 'ASE Group' },
  { partNo: 'PKG-QFN-001', partName: 'QFN Package (5x5mm)', customer: 'Amkor Technology' },
  { partNo: 'SUB-FR4-001', partName: 'FR-4 PCB Substrate', customer: 'Samsung SDI' },
  { partNo: 'DIE-ASIC-001', partName: 'ASIC Die (7nm)', customer: 'TSMC' },
  { partNo: 'WB-AU25', partName: 'Au Wire 25um', customer: 'SK hynix' },
  { partNo: 'EMC-001', partName: 'EMC Molding Compound', customer: 'Intel' },
  { partNo: 'LF-SAC305', partName: 'Lead-Free Solder (SAC305)', customer: 'Texas Instruments' },
];

// ============================================================
// 13. 공정 마스터 (MasterProcess) — 반도체 표준 21공정
// ============================================================
const MASTER_PROCESSES = [
  { processNo: '01', processName: '작업환경 관리', level: 'L2', equipment: '클린룸, FFU' },
  { processNo: '10', processName: 'IQA (Incoming Quality Assurance)', level: 'L2', equipment: '두께 측정기, HIGH POWER SCOPE' },
  { processNo: '20', processName: 'Sorter', level: 'L2', equipment: 'Sorter 장비, OCR Reader' },
  { processNo: '30', processName: 'Lamination', level: 'L2', equipment: 'Laminator, UV Exposure' },
  { processNo: '40', processName: 'UBM Sputter', level: 'L2', equipment: 'Sputter 장비, DC Power Supply' },
  { processNo: '50', processName: 'PR Coating', level: 'L2', equipment: 'Spin Coater, Hot Plate' },
  { processNo: '60', processName: 'Exposure', level: 'L2', equipment: 'Stepper/Scanner, Aligner' },
  { processNo: '70', processName: 'Develop', level: 'L2', equipment: 'Developer, Rinser' },
  { processNo: '80', processName: 'Etching', level: 'L2', equipment: 'Wet Etch Station' },
  { processNo: '90', processName: 'PR Strip', level: 'L2', equipment: 'Stripper, Asher' },
  { processNo: '100', processName: 'Au Plating', level: 'L2', equipment: 'Au Plating Tank, 정류기' },
  { processNo: '110', processName: 'Resist Strip (Post-Plating)', level: 'L2', equipment: 'Stripper' },
  { processNo: '120', processName: 'UBM Etching', level: 'L2', equipment: 'Wet Etch Station' },
  { processNo: '130', processName: 'Reflow', level: 'L2', equipment: 'Reflow Oven' },
  { processNo: '140', processName: 'Flux Clean', level: 'L2', equipment: '세정 장비, DI Water' },
  { processNo: '150', processName: 'Final Inspection', level: 'L2', equipment: 'AVI 장비, 높이 측정기' },
  { processNo: '160', processName: 'Tape Lamination', level: 'L2', equipment: 'Tape Laminator' },
  { processNo: '170', processName: 'Backside Grinding', level: 'L2', equipment: 'Grinder, 두께 측정기' },
  { processNo: '180', processName: 'Dicing', level: 'L2', equipment: 'Dicing Saw' },
  { processNo: '190', processName: 'Packing', level: 'L2', equipment: '진공 포장기, 라벨 프린터' },
  { processNo: '200', processName: 'OQA (Outgoing Quality Assurance)', level: 'L2', equipment: '검사대, 포장 검사' },
];

// ============================================================
// 14. L1 Functions (C1/C2/C3) — 구분/완제품기능/요구사항 폴백 데이터
// ============================================================
const L1_FUNCTION_FALLBACK = {
  // C1 구분
  C1: ['YP', 'SP', 'USER'],
  
  // C2 완제품기능 (구분별)
  C2: {
    YP: [
      { name: 'Au Bump 제품특성(높이·순도·외관)이 자사 공정 수율 기준을 충족하는 Wafer를 제공한다', requirements: ['Au Bump 높이 규격 충족', 'Au 순도 99.9% 이상', '외관 결함 0.1% 이하', '공정 수율 95% 이상'] },
      { name: 'UBM·PR·Etch 공정특성이 규격을 충족하여 Bump 형성 안정성을 확보한다', requirements: ['UBM 두께 규격 충족', 'PR 패턴 정밀도 확보', 'Etch 균일도 98% 이상'] },
    ],
    SP: [
      { name: 'RoHS 등 환경·안전 규제 기준을 준수하는 제품을 제공한다', requirements: ['환경 규제 준수', '안전 기준 충족', 'RoHS 인증 유지'] },
      { name: 'Wafer 청정도(파티클 수)가 공정 기준을 충족하여 공정 중 오염 없는 환경을 제공한다', requirements: ['파티클 기준 충족', '청정도 검사 통과', '오염 방지 확인'] },
    ],
    USER: [
      { name: '고객 납품 기준(높이·외관·포장)을 충족하는 Wafer를 제공한다', requirements: ['고객 납품 기준 충족', '포장 규격 준수', '외관 검사 통과'] },
      { name: '고객 요청 사항에 따른 추가 검사/포장 옵션을 제공한다', requirements: ['추가 검사 완료', '특별 포장 옵션', '고객 요청사항 반영'] },
    ],
  },
};

/**
 * L1 Functions (C1/C2/C3) 폴백 데이터 시드
 * - 활성 데이터셋에 C1(구분), C2(완제품기능), C3(요구사항) 추가
 * - C3는 C2에 parentItemId로 연결됨
 */
async function seedL1FunctionFallback() {
  // 활성 데이터셋 조회
  const activeDatasets = await prisma.pfmeaMasterDataset.findMany({
    where: { isActive: true },
  });
  
  if (activeDatasets.length === 0) {
    console.log('  ⚠️ 활성 데이터셋이 없습니다. 폴백 데이터를 추가하지 않습니다.');
    return;
  }
  
  let c1Count = 0, c2Count = 0, c3Count = 0;
  
  for (const dataset of activeDatasets) {
    // 기존 C1/C2/C3 삭제 (중복 방지)
    await prisma.pfmeaMasterFlatItem.deleteMany({
      where: { datasetId: dataset.id, itemCode: { in: ['C1', 'C2', 'C3'] } },
    });
    
    // C1 구분 추가
    for (const category of L1_FUNCTION_FALLBACK.C1) {
      await prisma.pfmeaMasterFlatItem.create({
        data: {
          datasetId: dataset.id,
          processNo: category,
          category: 'L1',
          itemCode: 'C1',
          value: category,
          rowSpan: 1,
          inherited: false,
        },
      });
      c1Count++;
    }
    
    // C2 완제품기능 + C3 요구사항 추가
    for (const [category, functions] of Object.entries(L1_FUNCTION_FALLBACK.C2)) {
      for (const func of functions) {
        // C2 생성
        const c2Item = await prisma.pfmeaMasterFlatItem.create({
          data: {
            datasetId: dataset.id,
            processNo: category,
            category: 'L1',
            itemCode: 'C2',
            value: func.name,
            rowSpan: 1,
            inherited: false,
          },
        });
        c2Count++;
        
        // C3 요구사항 생성 (parentItemId = C2.id)
        for (const req of func.requirements) {
          await prisma.pfmeaMasterFlatItem.create({
            data: {
              datasetId: dataset.id,
              processNo: category,
              category: 'L1',
              itemCode: 'C3',
              value: req,
              rowSpan: 1,
              inherited: false,
              parentItemId: c2Item.id, // ★ C2에 연결
            },
          });
          c3Count++;
        }
      }
    }
  }
  
  console.log(`  ✅ C1(구분): ${c1Count}건, C2(완제품기능): ${c2Count}건, C3(요구사항): ${c3Count}건`);
}

// ============================================================
// MAIN — Seed 실행
// ============================================================
async function main() {
  console.log('🌱 FMEA 기초 데이터 시드 시작...\n');

  // 1. Users
  console.log('👤 Users...');
  for (const u of USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, department: u.department, position: u.position, role: u.role, permPfmea: u.permPfmea, permDfmea: u.permDfmea, permCp: u.permCp, permPfd: u.permPfd },
      create: { ...u, password: hashPassword('fmea1234!'), engineeringLocation: '천안공장' },
    });
  }
  console.log(`  ✅ ${USERS.length}명 upsert 완료`);

  // 2. Customers
  console.log('🏢 Customers...');
  for (const c of CUSTOMERS) {
    await prisma.customer.upsert({
      where: { code: c.code },
      update: { name: c.name, factory: c.factory, description: c.description },
      create: { ...c },
    });
  }
  console.log(`  ✅ ${CUSTOMERS.length}사 upsert 완료`);

  // 3. SpecialCharacteristicCriteria
  console.log('⭐ Special Characteristics...');
  for (const [i, sc] of SPECIAL_CHARS.entries()) {
    await prisma.specialCharacteristicCriteria.upsert({
      where: { code: sc.code },
      update: { name: sc.name, symbol: sc.symbol, description: sc.description, customer: sc.customer, color: sc.color },
      create: { ...sc, sortOrder: i },
    });
  }
  console.log(`  ✅ ${SPECIAL_CHARS.length}건 upsert 완료`);

  // 4. Severity Criteria
  console.log('📊 Severity Criteria (S)...');
  for (const [i, s] of SEVERITY_CRITERIA.entries()) {
    await prisma.pfmeaSeverityCriteria.upsert({
      where: { rating: s.rating },
      update: { scope: s.scope, effect: s.effect, description: s.description },
      create: { ...s, sortOrder: i },
    });
  }
  console.log(`  ✅ ${SEVERITY_CRITERIA.length}건`);

  // 5. Occurrence Criteria
  console.log('📊 Occurrence Criteria (O)...');
  for (const [i, o] of OCCURRENCE_CRITERIA.entries()) {
    await prisma.pfmeaOccurrenceCriteria.upsert({
      where: { rating: o.rating },
      update: { probability: o.probability, ppm: o.ppm, description: o.description, prevention: o.prevention },
      create: { ...o, sortOrder: i },
    });
  }
  console.log(`  ✅ ${OCCURRENCE_CRITERIA.length}건`);

  // 6. Detection Criteria
  console.log('📊 Detection Criteria (D)...');
  for (const [i, d] of DETECTION_CRITERIA.entries()) {
    await prisma.pfmeaDetectionCriteria.upsert({
      where: { rating: d.rating },
      update: { maturity: d.maturity, description: d.description, detection: d.detection },
      create: { ...d, sortOrder: i },
    });
  }
  console.log(`  ✅ ${DETECTION_CRITERIA.length}건`);

  // 7. KrIndustryDetection
  console.log('🔍 Industry Detection Methods...');
  // deleteMany + createMany for bulk
  await prisma.krIndustryDetection.deleteMany({});
  await prisma.krIndustryDetection.createMany({
    data: [...INDUSTRY_DETECTION_ROWS].map((d, i) => ({ ...d, sortOrder: i })),
  });
  console.log(`  ✅ ${INDUSTRY_DETECTION_ROWS.length}건`);

  // 8. KrIndustryPrevention
  console.log('🛡️ Industry Prevention Methods...');
  await prisma.krIndustryPrevention.deleteMany({});
  await prisma.krIndustryPrevention.createMany({
    data: [...INDUSTRY_PREVENTION_ROWS].map((p, i) => ({ ...p, sortOrder: i })),
  });
  console.log(`  ✅ ${INDUSTRY_PREVENTION_ROWS.length}건`);

  // 9. EvalMethodLibrary
  console.log('📐 Evaluation Methods...');
  for (const em of EVAL_METHODS) {
    await prisma.evalMethodLibrary.upsert({
      where: { code: em.code },
      update: { name: em.name, category: em.category, description: em.description, equipment: em.equipment },
      create: em,
    });
  }
  console.log(`  ✅ ${EVAL_METHODS.length}건`);

  // 10. ControlMethodLibrary
  console.log('📋 Control Methods...');
  for (const cm of CONTROL_METHODS) {
    await prisma.controlMethodLibrary.upsert({
      where: { code: cm.code },
      update: { name: cm.name, category: cm.category, description: cm.description, frequency: cm.frequency },
      create: cm,
    });
  }
  console.log(`  ✅ ${CONTROL_METHODS.length}건`);

  // 11. ReactionPlanTemplate
  console.log('🚨 Reaction Plan Templates...');
  for (const rp of REACTION_PLANS) {
    await prisma.reactionPlanTemplate.upsert({
      where: { code: rp.code },
      update: { name: rp.name, defectType: rp.defectType, severity: rp.severity, actionSteps: rp.actionSteps, responsible: rp.responsible, escalation: rp.escalation },
      create: rp,
    });
  }
  console.log(`  ✅ ${REACTION_PLANS.length}건`);

  // 12. Parts
  console.log('🔧 Parts...');
  for (const p of PARTS) {
    await prisma.part.upsert({
      where: { partNo: p.partNo },
      update: { partName: p.partName, customer: p.customer },
      create: p,
    });
  }
  console.log(`  ✅ ${PARTS.length}건`);

  // 13. MasterProcess
  console.log('🏭 Master Processes...');
  for (const [i, mp] of MASTER_PROCESSES.entries()) {
    await prisma.masterProcess.upsert({
      where: { processNo_processName: { processNo: mp.processNo, processName: mp.processName } },
      update: { level: mp.level, equipment: mp.equipment },
      create: { ...mp, sortOrder: i },
    });
  }
  console.log(`  ✅ ${MASTER_PROCESSES.length}건`);

  // 14. L1 Function Fallback Data (C1/C2/C3)
  console.log('📋 L1 Functions (C1/C2/C3) Fallback Data...');
  await seedL1FunctionFallback();

  console.log('\n🎉 기초 데이터 시드 완료!');
  console.log('─'.repeat(50));
  console.log(`  Users:           ${USERS.length}명`);
  console.log(`  Customers:       ${CUSTOMERS.length}사`);
  console.log(`  Special Chars:   ${SPECIAL_CHARS.length}건`);
  console.log(`  S/O/D Criteria:  ${SEVERITY_CRITERIA.length + OCCURRENCE_CRITERIA.length + DETECTION_CRITERIA.length}건`);
  console.log(`  Detection:       ${INDUSTRY_DETECTION_ROWS.length}건`);
  console.log(`  Prevention:      ${INDUSTRY_PREVENTION_ROWS.length}건`);
  console.log(`  Eval Methods:    ${EVAL_METHODS.length}건`);
  console.log(`  Control Methods: ${CONTROL_METHODS.length}건`);
  console.log(`  Reaction Plans:  ${REACTION_PLANS.length}건`);
  console.log(`  Parts:           ${PARTS.length}건`);
  console.log(`  Processes:       ${MASTER_PROCESSES.length}건`);
  console.log(`  L1 Functions:    C1/C2/C3 폴백 데이터 (완제품기능별 요구사항 연결)`);
  console.log('─'.repeat(50));
  console.log('\n다음 단계:');
  console.log('  1. npx tsx scripts/seed-lld-data.mjs     — LLD 50건 시드');
  console.log('  2. npx tsx scripts/seed-m002.ts           — Au Bump FMEA 프로젝트 시드');
  console.log('  3. npm run dev → localhost:3000 접속 확인');
}

main()
  .catch((e) => {
    console.error('❌ Seed 실패:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
