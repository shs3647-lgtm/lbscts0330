/**
 * @file route.ts
 * @description 한국 제조업 산업 공통 DB 시드 API
 * - KrIndustryDetection: FM 키워드 → 검출방법 (23개 카테고리)
 * - KrIndustryPrevention: FC 키워드 → 예방관리 (17개 카테고리)
 * @version 1.0.0
 * @created 2026-02-23
 *
 * 실행: POST /api/admin/seed/kr-industry
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export const runtime = 'nodejs';

function getPool() {
  return new Pool({ connectionString: process.env.DATABASE_URL });
}

// ============================================================
// 검출관리 (KrIndustryDetection) — FM 키워드 → 검출방법
// detectionKeywordMap.ts의 23개 규칙과 동일 데이터
// ============================================================
interface DCEntry {
  category: string;
  fmKeyword: string;
  method: string;
  methodType: 'primary' | 'secondary';
  description: string;
  sortOrder: number;
}

const KR_DETECTION_DATA: DCEntry[] = [
  // 1. 사양/품명/규격
  { category: 'identification', fmKeyword: '사양,품명,품번,규격,버전,모델,식별,라벨,표시,이종', method: '바코드 스캐너', methodType: 'primary', description: '사양/품명 불일치 검출 — 바코드/QR 스캔 확인', sortOrder: 1 },
  { category: 'identification', fmKeyword: '사양,품명,품번,규격,버전,모델,식별,라벨,표시,이종', method: 'PDA 스캔검사', methodType: 'primary', description: '사양/품명 불일치 검출 — PDA 기반 식별', sortOrder: 2 },
  { category: 'identification', fmKeyword: '사양,품명,품번,규격,버전,모델,식별,라벨,표시,이종', method: '버전 검사기', methodType: 'primary', description: '사양/품명 불일치 검출 — S/W 버전 검사', sortOrder: 3 },
  { category: 'identification', fmKeyword: '사양,품명,품번,규격,버전,모델,식별,라벨,표시,이종', method: '육안검사', methodType: 'secondary', description: '사양/품명 불일치 검출 — 육안 확인 (보조)', sortOrder: 4 },

  // 2. 휘도/점등/영상
  { category: 'luminance', fmKeyword: '휘도,점등,영상,암전류,밝기,광도,발광,LED,화면,디스플레이', method: 'EOL 검사기', methodType: 'primary', description: '휘도/영상 불량 검출 — EOL(End-of-Line) 종합검사', sortOrder: 5 },
  { category: 'luminance', fmKeyword: '휘도,점등,영상,암전류,밝기,광도,발광,LED,화면,디스플레이', method: '휘도측정기', methodType: 'primary', description: '휘도/영상 불량 검출 — 휘도/광도 정량측정', sortOrder: 6 },
  { category: 'luminance', fmKeyword: '휘도,점등,영상,암전류,밝기,광도,발광,LED,화면,디스플레이', method: '육안검사', methodType: 'secondary', description: '휘도/영상 불량 검출 — 육안 확인 (보조)', sortOrder: 7 },

  // 3. 치수/형상
  { category: 'dimension', fmKeyword: '치수,형상,PV값,변형,편차,공차,두께,높이,폭,길이,간격,갭', method: '치수측정기', methodType: 'primary', description: '치수/형상 불량 검출 — 정밀 치수 측정', sortOrder: 8 },
  { category: 'dimension', fmKeyword: '치수,형상,PV값,변형,편차,공차,두께,높이,폭,길이,간격,갭', method: '3차원 측정기(CMM)', methodType: 'primary', description: '치수/형상 불량 검출 — 3차원 정밀 측정', sortOrder: 9 },
  { category: 'dimension', fmKeyword: '치수,형상,PV값,변형,편차,공차,두께,높이,폭,길이,간격,갭', method: '캘리퍼/마이크로미터', methodType: 'primary', description: '치수/형상 불량 검출 — 일반 치수 측정', sortOrder: 10 },
  { category: 'dimension', fmKeyword: '치수,형상,PV값,변형,편차,공차,두께,높이,폭,길이,간격,갭', method: '핀게이지', methodType: 'secondary', description: '치수/형상 불량 검출 — 핀/갭 게이지 (보조)', sortOrder: 11 },

  // 4. 핀휨/단자
  { category: 'pin', fmKeyword: '핀휨,핀 휨,핀,단자,커넥터 핀,리드', method: '핀휨 검사기', methodType: 'primary', description: '핀/단자 불량 검출 — 전용 핀휨 검사', sortOrder: 12 },
  { category: 'pin', fmKeyword: '핀휨,핀 휨,핀,단자,커넥터 핀,리드', method: '비전검사', methodType: 'primary', description: '핀/단자 불량 검출 — 카메라 비전 검사', sortOrder: 13 },

  // 5. 동작/기능
  { category: 'function', fmKeyword: '미작동,오작동,동작,이음,소음,진동,기능,작동,NVH', method: '기능검사기', methodType: 'primary', description: '동작/기능 불량 검출 — 전용 기능 테스트', sortOrder: 14 },
  { category: 'function', fmKeyword: '미작동,오작동,동작,이음,소음,진동,기능,작동,NVH', method: 'EOL 검사기', methodType: 'primary', description: '동작/기능 불량 검출 — EOL 종합 기능 테스트', sortOrder: 15 },

  // 6. 도포/접착
  { category: 'dispense', fmKeyword: '도포,그리스,접착,실란트,도포량,도포상태,도포위치', method: '중량측정(발란스)', methodType: 'primary', description: '도포량 불량 검출 — 도포 전후 중량차 측정', sortOrder: 16 },
  { category: 'dispense', fmKeyword: '도포,그리스,접착,실란트,도포량,도포상태,도포위치', method: '도포검사기', methodType: 'primary', description: '도포 불량 검출 — 전용 도포 상태 검사', sortOrder: 17 },

  // 7. 조립/체결
  { category: 'assembly', fmKeyword: '조립,체결,누락,토크,풀림,미체결,오삽입,미삽입,역삽입,장착', method: '토크검사', methodType: 'primary', description: '체결 불량 검출 — 토크 정량 검사', sortOrder: 18 },
  { category: 'assembly', fmKeyword: '조립,체결,누락,토크,풀림,미체결,오삽입,미삽입,역삽입,장착', method: '체결검사기', methodType: 'primary', description: '조립 불량 검출 — 체결 상태 확인', sortOrder: 19 },
  { category: 'assembly', fmKeyword: '조립,체결,누락,토크,풀림,미체결,오삽입,미삽입,역삽입,장착', method: '바코드 스캐너', methodType: 'secondary', description: '조립 불량 검출 — 부품 식별/누락 확인 (보조)', sortOrder: 20 },

  // 8. 외관/파손
  { category: 'appearance', fmKeyword: '외관,파손,이물,스크래치,긁힘,찍힘,흠집,크랙,균열,덴트,버', method: '육안검사', methodType: 'primary', description: '외관 불량 검출 — 육안 목시 검사', sortOrder: 21 },
  { category: 'appearance', fmKeyword: '외관,파손,이물,스크래치,긁힘,찍힘,흠집,크랙,균열,덴트,버', method: '비전검사(카메라)', methodType: 'primary', description: '외관 불량 검출 — 카메라 자동 검사', sortOrder: 22 },
  { category: 'appearance', fmKeyword: '외관,파손,이물,스크래치,긁힘,찍힘,흠집,크랙,균열,덴트,버', method: '확대경검사', methodType: 'secondary', description: '외관 불량 검출 — 확대경/현미경 정밀 검사 (보조)', sortOrder: 23 },

  // 9. 균일도/색상
  { category: 'uniformity', fmKeyword: '균일도,얼룩,색상,색차,변색,무라', method: '비전검사(카메라)', methodType: 'primary', description: '색상/균일도 검출 — 카메라 이미지 분석', sortOrder: 24 },
  { category: 'uniformity', fmKeyword: '균일도,얼룩,색상,색차,변색,무라', method: 'EOL 검사기', methodType: 'primary', description: '색상/균일도 검출 — EOL 영상 검사', sortOrder: 25 },
  { category: 'uniformity', fmKeyword: '균일도,얼룩,색상,색차,변색,무라', method: '색차계', methodType: 'primary', description: '색상 검출 — 색차 정량 측정', sortOrder: 26 },

  // 10. 포장/수량
  { category: 'packaging', fmKeyword: '포장,수량,출하,납품,적재,선입선출,FIFO', method: '바코드 스캐너', methodType: 'primary', description: '포장/수량 검출 — 바코드 스캔 확인', sortOrder: 27 },
  { category: 'packaging', fmKeyword: '포장,수량,출하,납품,적재,선입선출,FIFO', method: '중량검사', methodType: 'primary', description: '포장/수량 검출 — 중량 기준 수량 확인', sortOrder: 28 },

  // 11. 환경/산화
  { category: 'environment', fmKeyword: '산화,습도,오염,온도,결로,부식,녹,환경', method: '환경측정기(온습도계)', methodType: 'primary', description: '환경 관련 검출 — 온습도 모니터링', sortOrder: 29 },
  { category: 'environment', fmKeyword: '산화,습도,오염,온도,결로,부식,녹,환경', method: '육안검사', methodType: 'primary', description: '환경 관련 검출 — 육안 확인', sortOrder: 30 },

  // 12. MSA/검교정
  { category: 'msa', fmKeyword: '마스터,미검출,불량판정,오판,검출률,MSA,반복성,재현성', method: 'MSA 검증', methodType: 'primary', description: '측정 시스템 검출 — MSA 분석', sortOrder: 31 },
  { category: 'msa', fmKeyword: '마스터,미검출,불량판정,오판,검출률,MSA,반복성,재현성', method: 'Gage R&R', methodType: 'primary', description: '측정 시스템 검출 — 게이지 R&R 분석', sortOrder: 32 },

  // 13. 용접/강도
  { category: 'welding', fmKeyword: '용접,너겟,스패터,비드,용접강도,접합,인장', method: '인장시험기', methodType: 'primary', description: '용접 불량 검출 — 인장강도 시험', sortOrder: 33 },
  { category: 'welding', fmKeyword: '용접,너겟,스패터,비드,용접강도,접합,인장', method: '비파괴검사', methodType: 'primary', description: '용접 불량 검출 — 비파괴 검사(UT/RT)', sortOrder: 34 },

  // 14. 누설/기밀
  { category: 'leak', fmKeyword: '누설,누유,기밀,리크,누출', method: '기밀시험기', methodType: 'primary', description: '누설 검출 — 기밀 시험', sortOrder: 35 },
  { category: 'leak', fmKeyword: '누설,누유,기밀,리크,누출', method: '리크테스트', methodType: 'primary', description: '누설 검출 — 리크 테스트', sortOrder: 36 },

  // 15. 전기/통전
  { category: 'electrical', fmKeyword: '전압,전류,저항,합선,단선,절연,통전,단락', method: '절연저항계', methodType: 'primary', description: '전기 불량 검출 — 절연저항 측정', sortOrder: 37 },
  { category: 'electrical', fmKeyword: '전압,전류,저항,합선,단선,절연,통전,단락', method: '통전검사', methodType: 'primary', description: '전기 불량 검출 — 통전/단선 검사', sortOrder: 38 },
  { category: 'electrical', fmKeyword: '전압,전류,저항,합선,단선,절연,통전,단락', method: 'EOL 검사기', methodType: 'primary', description: '전기 불량 검출 — EOL 전기 종합 검사', sortOrder: 39 },

  // 16. 압력/유압
  { category: 'pressure', fmKeyword: '압력,유압,공압,에어압,진공,압력이탈,기준이탈', method: '압력게이지', methodType: 'primary', description: '압력 불량 검출 — 압력 게이지 측정', sortOrder: 40 },
  { category: 'pressure', fmKeyword: '압력,유압,공압,에어압,진공,압력이탈,기준이탈', method: '기밀시험기', methodType: 'primary', description: '압력 불량 검출 — 기밀/리크 시험', sortOrder: 41 },

  // 17. 설비/파라미터
  { category: 'equipment', fmKeyword: '설비이상,파라미터,조건이탈,설정값,도포기,펌프,모터,밸브', method: '파라미터 모니터링(PLC)', methodType: 'primary', description: '설비 이상 검출 — PLC 파라미터 모니터링', sortOrder: 42 },
  { category: 'equipment', fmKeyword: '설비이상,파라미터,조건이탈,설정값,도포기,펌프,모터,밸브', method: '설비점검 체크리스트', methodType: 'primary', description: '설비 이상 검출 — 일일 점검 체크리스트', sortOrder: 43 },

  // 18. 경도/물성
  { category: 'hardness', fmKeyword: '경도,강도,물성,인장강도,피로,경화,취성', method: '경도시험기', methodType: 'primary', description: '물성 불량 검출 — 경도 시험', sortOrder: 44 },
  { category: 'hardness', fmKeyword: '경도,강도,물성,인장강도,피로,경화,취성', method: '인장시험기', methodType: 'primary', description: '물성 불량 검출 — 인장강도 시험', sortOrder: 45 },

  // 산업 특화 (v2.7.0)
  // 19. HUD/디스플레이
  { category: 'hud-display', fmKeyword: 'HUD,헤드업,미러,비구면,렌즈,커버렌즈', method: 'EOL 검사기(영상)', methodType: 'primary', description: 'HUD/디스플레이 검출 — 영상 EOL 검사', sortOrder: 46 },
  { category: 'hud-display', fmKeyword: 'HUD,헤드업,미러,비구면,렌즈,커버렌즈', method: '비전검사(카메라)', methodType: 'primary', description: 'HUD/디스플레이 검출 — 비전 카메라 검사', sortOrder: 47 },
  { category: 'hud-display', fmKeyword: 'HUD,헤드업,미러,비구면,렌즈,커버렌즈', method: '한도견본 비교', methodType: 'secondary', description: 'HUD/디스플레이 검출 — 한도견본 비교 (보조)', sortOrder: 48 },

  // 20. PCB/전자부품
  { category: 'pcb-smt', fmKeyword: 'PCB,SMT,솔더,납땜,실장,BGA,IC', method: 'AOI(자동광학검사)', methodType: 'primary', description: 'PCB/SMT 검출 — AOI 자동 광학 검사', sortOrder: 49 },
  { category: 'pcb-smt', fmKeyword: 'PCB,SMT,솔더,납땜,실장,BGA,IC', method: 'X-ray 검사', methodType: 'primary', description: 'PCB/SMT 검출 — X-ray 비파괴 검사', sortOrder: 50 },
  { category: 'pcb-smt', fmKeyword: 'PCB,SMT,솔더,납땜,실장,BGA,IC', method: 'ICT(인서킷테스트)', methodType: 'secondary', description: 'PCB/SMT 검출 — ICT 인서킷 테스트 (보조)', sortOrder: 51 },

  // 21. 사출/프레스
  { category: 'injection-press', fmKeyword: '사출,프레스,성형,버,웰드라인,싱크마크,쇼트', method: '초중종물 치수검사', methodType: 'primary', description: '사출/프레스 검출 — 초·중·종물 치수 검사', sortOrder: 52 },
  { category: 'injection-press', fmKeyword: '사출,프레스,성형,버,웰드라인,싱크마크,쇼트', method: '중량 측정', methodType: 'primary', description: '사출/프레스 검출 — 제품 중량 편차 확인', sortOrder: 53 },
  { category: 'injection-press', fmKeyword: '사출,프레스,성형,버,웰드라인,싱크마크,쇼트', method: '외관 검사(한도견본)', methodType: 'secondary', description: '사출/프레스 검출 — 한도견본 비교 (보조)', sortOrder: 54 },

  // 22. 도장/코팅
  { category: 'coating', fmKeyword: '도장,코팅,도막,박리,기포,흘러내림,오렌지필', method: '도막두께 측정기', methodType: 'primary', description: '도장/코팅 검출 — 도막 두께 측정', sortOrder: 55 },
  { category: 'coating', fmKeyword: '도장,코팅,도막,박리,기포,흘러내림,오렌지필', method: '부착력 테스트(Cross-cut)', methodType: 'primary', description: '도장/코팅 검출 — Cross-cut 부착력 시험', sortOrder: 56 },
  { category: 'coating', fmKeyword: '도장,코팅,도막,박리,기포,흘러내림,오렌지필', method: '광택도 측정', methodType: 'secondary', description: '도장/코팅 검출 — 광택도 측정 (보조)', sortOrder: 57 },

  // 23. 열처리
  { category: 'heat-treatment', fmKeyword: '열처리,담금질,뜨임,침탄,질화,고주파', method: '경도시험기', methodType: 'primary', description: '열처리 검출 — 경도 시험 (표면/심부)', sortOrder: 58 },
  { category: 'heat-treatment', fmKeyword: '열처리,담금질,뜨임,침탄,질화,고주파', method: '금속조직 검사', methodType: 'primary', description: '열처리 검출 — 금속조직 검사 (경화층 확인)', sortOrder: 59 },
  { category: 'heat-treatment', fmKeyword: '열처리,담금질,뜨임,침탄,질화,고주파', method: '잔류응력 측정', methodType: 'secondary', description: '열처리 검출 — 잔류응력 측정 (보조)', sortOrder: 60 },
];

// ============================================================
// 예방관리 (KrIndustryPrevention) — FC 키워드 → 예방관리
// preventionKeywordMap.ts의 17개 FC 규칙과 동일 데이터
// ============================================================
interface PCEntry {
  category: string;
  fcKeyword: string;
  method: string;
  m4Category: string;
  description: string;
  sortOrder: number;
}

const KR_PREVENTION_DATA: PCEntry[] = [
  // 1. 지그/치구
  { category: 'jig', fcKeyword: '지그,치구,고정구,클램프,바이스,척', method: '지그 정기점검(마모/변형)', m4Category: 'MC', description: '지그/치구 고장원인 → 정기 점검 관리', sortOrder: 1 },
  { category: 'jig', fcKeyword: '지그,치구,고정구,클램프,바이스,척', method: '지그 수명관리 및 교체주기', m4Category: 'MC', description: '지그/치구 고장원인 → 수명/교체 관리', sortOrder: 2 },

  // 2. 금형/다이
  { category: 'mold', fcKeyword: '금형,다이,몰드,캐비티,코어', method: '금형 PM 주기 관리', m4Category: 'MC', description: '금형 고장원인 → 예방보전 주기 관리', sortOrder: 3 },
  { category: 'mold', fcKeyword: '금형,다이,몰드,캐비티,코어', method: '금형 타수 관리', m4Category: 'MC', description: '금형 고장원인 → 타수(Shot) 기반 교체', sortOrder: 4 },

  // 3. 체결공구/토크
  { category: 'torque-tool', fcKeyword: '전동드라이버,토크드라이버,토크렌치,임팩트,체결공구,너트러너', method: '공구 교정(Calibration) 주기 관리', m4Category: 'MC', description: '체결공구 고장원인 → 교정 주기 관리', sortOrder: 5 },
  { category: 'torque-tool', fcKeyword: '전동드라이버,토크드라이버,토크렌치,임팩트,체결공구,너트러너', method: '토크 설정값 일일 확인', m4Category: 'MC', description: '체결공구 고장원인 → 일일 설정값 확인', sortOrder: 6 },

  // 4. 도포기/디스펜서
  { category: 'dispenser', fcKeyword: '도포기,디스펜서,노즐,도포,그리스,접착제,실란트', method: '도포량 정량 관리(중량 체크)', m4Category: 'MC', description: '도포기 고장원인 → 도포량 중량 관리', sortOrder: 7 },
  { category: 'dispenser', fcKeyword: '도포기,디스펜서,노즐,도포,그리스,접착제,실란트', method: '노즐 교체주기 관리', m4Category: 'MC', description: '도포기 고장원인 → 노즐 교체 주기', sortOrder: 8 },

  // 5. 압력/유압/공압
  { category: 'pressure', fcKeyword: '압력,에어압,AIR,공압,유압,레귤레이터,밸브,실린더', method: '압력게이지 교정 주기 관리', m4Category: 'MC', description: '압력 고장원인 → 게이지 교정 관리', sortOrder: 9 },
  { category: 'pressure', fcKeyword: '압력,에어압,AIR,공압,유압,레귤레이터,밸브,실린더', method: '에어 필터/레귤레이터 점검', m4Category: 'MC', description: '압력 고장원인 → 필터/레귤레이터 점검', sortOrder: 10 },

  // 6. 센서/검사기
  { category: 'sensor', fcKeyword: '센서,카메라,비전,검사기,EOL,측정기,게이지', method: '센서 교정(Calibration) 주기 관리', m4Category: 'MC', description: '센서/검사기 고장원인 → 교정 주기', sortOrder: 11 },
  { category: 'sensor', fcKeyword: '센서,카메라,비전,검사기,EOL,측정기,게이지', method: '마스터 샘플 정기 검증', m4Category: 'MC', description: '센서/검사기 고장원인 → 마스터 샘플 검증', sortOrder: 12 },

  // 7. 구동부/모터
  { category: 'motor', fcKeyword: '모터,서보,스핀들,베어링,기어,벨트,체인', method: '구동부 윤활 주기 관리', m4Category: 'MC', description: '구동부 고장원인 → 윤활 주기 관리', sortOrder: 13 },
  { category: 'motor', fcKeyword: '모터,서보,스핀들,베어링,기어,벨트,체인', method: '베어링 진동/소음 측정', m4Category: 'MC', description: '구동부 고장원인 → 진동/소음 모니터링', sortOrder: 14 },

  // 8. 용접/스팟
  { category: 'welding', fcKeyword: '용접,스팟,아크,MIG,TIG,전극,팁', method: '용접팁 드레싱/교체 주기', m4Category: 'MC', description: '용접 고장원인 → 팁 교체 주기 관리', sortOrder: 15 },
  { category: 'welding', fcKeyword: '용접,스팟,아크,MIG,TIG,전극,팁', method: '용접 전류/전압 파라미터 관리', m4Category: 'MC', description: '용접 고장원인 → 파라미터 관리', sortOrder: 16 },

  // 9. 온도/가열
  { category: 'temperature', fcKeyword: '온도,가열,건조,경화,오븐,히터', method: '온도 프로파일 정기 확인', m4Category: 'MC', description: '온도 고장원인 → 온도 프로파일 관리', sortOrder: 17 },
  { category: 'temperature', fcKeyword: '온도,가열,건조,경화,오븐,히터', method: '온도센서 교정 주기 관리', m4Category: 'MC', description: '온도 고장원인 → 센서 교정 관리', sortOrder: 18 },

  // 10. 이송/로봇
  { category: 'conveyor', fcKeyword: '컨베이어,이송,로봇,피더,슈트,호퍼', method: '이송 설비 일상점검', m4Category: 'MC', description: '이송 고장원인 → 일상 점검', sortOrder: 19 },
  { category: 'conveyor', fcKeyword: '컨베이어,이송,로봇,피더,슈트,호퍼', method: '로봇 원점/위치 확인', m4Category: 'MC', description: '이송 고장원인 → 로봇 원점 확인', sortOrder: 20 },

  // 11. 작업자/숙련도
  { category: 'operator', fcKeyword: '숙련도,미숙,작업자,오조작,실수,부주의,피로,교대', method: '작업자 교육/숙련도 평가', m4Category: 'MN', description: '작업자 고장원인 → 교육/평가', sortOrder: 21 },
  { category: 'operator', fcKeyword: '숙련도,미숙,작업자,오조작,실수,부주의,피로,교대', method: '작업표준서(WI) 교육', m4Category: 'MN', description: '작업자 고장원인 → 표준서 교육', sortOrder: 22 },

  // 12. 오염/이물
  { category: 'contamination', fcKeyword: '오염,이물,세척,청소,먼지,유분,잔류물', method: '세척/청소 주기 기준 관리', m4Category: 'EN', description: '오염 고장원인 → 세척 주기 관리', sortOrder: 23 },
  { category: 'contamination', fcKeyword: '오염,이물,세척,청소,먼지,유분,잔류물', method: '에어블로우/집진 설비 점검', m4Category: 'MC', description: '오염 고장원인 → 집진 설비 점검', sortOrder: 24 },

  // 13. 보관/환경
  { category: 'storage', fcKeyword: '보관,습도,산화,부식,결로,환경,온습도', method: '보관 조건(온습도) 관리', m4Category: 'EN', description: '보관 고장원인 → 온습도 관리', sortOrder: 25 },
  { category: 'storage', fcKeyword: '보관,습도,산화,부식,결로,환경,온습도', method: '방습/방청 포장 관리', m4Category: 'EN', description: '보관 고장원인 → 방습/방청 포장', sortOrder: 26 },

  // 14. 선입선출/LOT
  { category: 'fifo', fcKeyword: '선입선출,FIFO,LOT,이종,혼입,오삽입', method: '선입선출(FIFO) 시스템 운영', m4Category: 'MN', description: 'LOT 고장원인 → FIFO 시스템', sortOrder: 27 },
  { category: 'fifo', fcKeyword: '선입선출,FIFO,LOT,이종,혼입,오삽입', method: 'LOT 추적(바코드/QR)', m4Category: 'MN', description: 'LOT 고장원인 → 바코드/QR 추적', sortOrder: 28 },

  // 15. 마모/수명
  { category: 'wear', fcKeyword: '마모,수명,열화,노후,피로,크랙,파손,변형', method: '소모품 교체주기 관리', m4Category: 'MC', description: '마모 고장원인 → 교체주기 관리', sortOrder: 29 },
  { category: 'wear', fcKeyword: '마모,수명,열화,노후,피로,크랙,파손,변형', method: '마모량 정기 측정', m4Category: 'MC', description: '마모 고장원인 → 마모량 측정', sortOrder: 30 },

  // 16. 파라미터/설정값
  { category: 'parameter', fcKeyword: '파라미터,설정값,조건,레시피,프로그램,PLC', method: '공정 파라미터 관리표 운영', m4Category: 'MC', description: '파라미터 고장원인 → 관리표 운영', sortOrder: 31 },
  { category: 'parameter', fcKeyword: '파라미터,설정값,조건,레시피,프로그램,PLC', method: '설정값 변경 이력 관리', m4Category: 'MC', description: '파라미터 고장원인 → 변경 이력 관리', sortOrder: 32 },

  // 17. 체결/토크
  { category: 'fastening', fcKeyword: '스크류,볼트,너트,체결,풀림,토크,누락', method: '토크 관리 기준 설정', m4Category: 'MC', description: '체결 고장원인 → 토크 기준 설정', sortOrder: 33 },
  { category: 'fastening', fcKeyword: '스크류,볼트,너트,체결,풀림,토크,누락', method: '체결 순서/패턴 표준화', m4Category: 'MN', description: '체결 고장원인 → 체결 순서 표준화', sortOrder: 34 },
];

export async function POST(request: NextRequest) {
  const pool = getPool();

  try {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. KrIndustryDetection 시드
      await client.query('DELETE FROM kr_industry_detection');
      let dcCount = 0;
      for (const item of KR_DETECTION_DATA) {
        await client.query(
          `INSERT INTO kr_industry_detection (id, category, "fmKeyword", method, "methodType", description, "isActive", "sortOrder", "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, true, $6, NOW(), NOW())`,
          [item.category, item.fmKeyword, item.method, item.methodType, item.description, item.sortOrder]
        );
        dcCount++;
      }

      // 2. KrIndustryPrevention 시드
      await client.query('DELETE FROM kr_industry_prevention');
      let pcCount = 0;
      for (const item of KR_PREVENTION_DATA) {
        await client.query(
          `INSERT INTO kr_industry_prevention (id, category, "fcKeyword", method, "m4Category", description, "isActive", "sortOrder", "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, true, $6, NOW(), NOW())`,
          [item.category, item.fcKeyword, item.method, item.m4Category, item.description, item.sortOrder]
        );
        pcCount++;
      }

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: `한국산업 DB 시드 완료 — DC ${dcCount}건, PC ${pcCount}건`,
        detection: dcCount,
        prevention: pcCount,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[kr-industry seed] 오류:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '시드 오류' },
      { status: 500 }
    );
  } finally {
    await pool.end();
  }
}
