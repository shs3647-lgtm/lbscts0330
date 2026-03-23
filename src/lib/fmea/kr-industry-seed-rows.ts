/**
 * @file kr-industry-seed-rows.ts
 * @description KrIndustryDetection / KrIndustryPrevention 시드 행 — 단일 소스
 * @remarks `scripts/seed-base-data.ts`가 이 파일을 import하여 DB 시딩한다.
 *          FC 비교 플랜C(산업DB 근거 매칭)도 동일 데이터를 사용한다.
 */

export const INDUSTRY_DETECTION_ROWS = [
  { category: 'semiconductor', fmKeyword: '두께', method: '4-Point Probe 두께 측정', methodType: 'primary' as const },
  { category: 'semiconductor', fmKeyword: '오염', method: 'Particle Counter 파티클 측정', methodType: 'primary' as const },
  { category: 'semiconductor', fmKeyword: '외관', method: 'AVI 자동외관검사 장비', methodType: 'primary' as const },
  { category: 'semiconductor', fmKeyword: '높이', method: '3D Profiler 높이 측정', methodType: 'primary' as const },
  { category: 'semiconductor', fmKeyword: '정렬', method: 'Overlay Measurement (오버레이 측정)', methodType: 'primary' as const },
  { category: 'semiconductor', fmKeyword: '접착', method: 'Ball Shear Test (볼 전단 시험)', methodType: 'primary' as const },
  { category: 'semiconductor', fmKeyword: '단락', method: 'Open/Short Test (전기 테스트)', methodType: 'primary' as const },
  { category: 'semiconductor', fmKeyword: '균열', method: 'SEM 단면 분석 (샘플링)', methodType: 'primary' as const },
  { category: 'semiconductor', fmKeyword: '치수', method: 'CD-SEM 임계치수 측정', methodType: 'primary' as const },
  { category: 'semiconductor', fmKeyword: '저항', method: '4-Point Probe 면저항 측정', methodType: 'primary' as const },
  { category: 'plating', fmKeyword: '도금', method: 'XRF 도금 두께 측정', methodType: 'primary' as const },
  { category: 'plating', fmKeyword: '밀착', method: 'Tape Test (테이프 밀착 시험)', methodType: 'primary' as const },
  { category: 'sputter', fmKeyword: '박막', method: 'Ellipsometer 박막 두께 측정', methodType: 'primary' as const },
  { category: 'sputter', fmKeyword: '조성', method: 'EDS/WDS 성분 분석', methodType: 'secondary' as const },
  { category: 'etching', fmKeyword: '식각', method: 'Step Profiler 식각 깊이 측정', methodType: 'primary' as const },
  { category: 'press', fmKeyword: '버', method: '육안검사 + 확대경(10X)', methodType: 'primary' as const },
  { category: 'press', fmKeyword: '균열', method: '형광 침투 검사 (PT)', methodType: 'primary' as const },
  { category: 'welding', fmKeyword: '용접', method: '인장 강도 시험 + X-ray', methodType: 'primary' as const },
  { category: 'coating', fmKeyword: '도장', method: '도막 두께 측정 + 밀착력 시험', methodType: 'primary' as const },
  { category: 'assembly', fmKeyword: '토크', method: '토크 렌치 검사 + 디지털 토크계', methodType: 'primary' as const },
  { category: 'assembly', fmKeyword: '누설', method: 'Helium Leak Test (헬륨 누설 시험)', methodType: 'primary' as const },
  { category: 'cleaning', fmKeyword: '세정', method: 'Ion Chromatography (이온 잔류량 분석)', methodType: 'primary' as const },
  { category: 'inspection', fmKeyword: 'ID', method: 'OCR Reader (자동 ID 판독)', methodType: 'primary' as const },
  { category: 'automotive', fmKeyword: '치수', method: 'CMM 3차원 측정', methodType: 'primary' as const },
  { category: 'automotive', fmKeyword: '경도', method: 'Rockwell / Vickers 경도 시험', methodType: 'primary' as const },
] as const;

export const INDUSTRY_PREVENTION_ROWS = [
  { category: 'equipment', fcKeyword: '장비', method: '장비 정기 PM (Preventive Maintenance)', m4Category: 'MC' },
  { category: 'equipment', fcKeyword: '설비', method: '설비 일일 점검 + 주간 정비', m4Category: 'MC' },
  { category: 'equipment', fcKeyword: '전력', method: '전원 안정화 장치 (UPS/AVR) 설치', m4Category: 'MC' },
  { category: 'equipment', fcKeyword: '온도', method: '온도 실시간 모니터링 + 인터록', m4Category: 'MC' },
  { category: 'equipment', fcKeyword: '압력', method: '압력 센서 실시간 감시 + 알람', m4Category: 'MC' },
  { category: 'equipment', fcKeyword: '진공', method: '진공 챔버 기밀 점검 + 진공도 인터록', m4Category: 'MC' },
  { category: 'material', fcKeyword: '소재', method: '입고 검사 (IQC) + CoA 확인', m4Category: 'IM' },
  { category: 'material', fcKeyword: '약품', method: '약품 농도 주기적 분석 + 자동보충', m4Category: 'IM' },
  { category: 'material', fcKeyword: 'Target', method: 'Target 잔량 자동 모니터링 + 소진 알람', m4Category: 'IM' },
  { category: 'material', fcKeyword: '가스', method: '가스 순도 인증서 확인 + 정기 교체', m4Category: 'IM' },
  { category: 'operator', fcKeyword: '작업자', method: '작업 표준서 교육 + 자격 인증', m4Category: 'MN' },
  { category: 'operator', fcKeyword: '숙련도', method: '정기 숙련도 평가 + OJT 교육', m4Category: 'MN' },
  { category: 'operator', fcKeyword: '실수', method: 'Poka-Yoke (실수방지) 장치 설치', m4Category: 'MN' },
  { category: 'environment', fcKeyword: '클린룸', method: '클린룸 환경 모니터링 (온습도/파티클)', m4Category: 'EN' },
  { category: 'environment', fcKeyword: '정전기', method: 'ESD 방지 장비 + 접지 주기점검', m4Category: 'EN' },
  { category: 'environment', fcKeyword: '진동', method: '방진대 설치 + 진동 모니터링', m4Category: 'EN' },
  { category: 'process', fcKeyword: 'Recipe', method: 'Recipe 변경 승인 제도 + Lock', m4Category: 'MC' },
  { category: 'process', fcKeyword: '교정', method: '계측기 정기 교정 (MSA/Gage R&R)', m4Category: 'MC' },
  { category: 'process', fcKeyword: 'SPC', method: 'SPC 실시간 관리 (X-bar R Chart)', m4Category: 'MC' },
  { category: 'process', fcKeyword: '유지보수', method: '예방 정비 계획 (PM Schedule)', m4Category: 'MC' },
  { category: 'solder', fcKeyword: '납땜', method: '리플로우 프로파일 주기 검증', m4Category: 'MC' },
  { category: 'plating', fcKeyword: '도금', method: '도금액 성분 분석 + Hull Cell Test', m4Category: 'IM' },
  { category: 'sputter', fcKeyword: 'Sputter', method: 'Sputter Recipe 승인제도 + 작업표준', m4Category: 'MC' },
  { category: 'etching', fcKeyword: '식각', method: '식각액 농도/온도 실시간 관리', m4Category: 'IM' },
  { category: 'cleaning', fcKeyword: '세정', method: '세정액 교체주기 관리 + 잔류량 모니터링', m4Category: 'IM' },
] as const;
