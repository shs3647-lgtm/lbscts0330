/**
 * LLD 시드 데이터 생성 스크립트
 * 분류별 10건씩: RMA, ABN, CIP, ECN, DevIssue (총 50건)
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SEED_DATA = [
  // ═══════════════════════════════════════
  // RMA (반품) - 10건
  // ═══════════════════════════════════════
  { lldNo: 'LLD26-021', classification: 'RMA', applyTo: 'prevention', processNo: 'P-010', processName: '수입검사', productName: 'NE1', failureMode: '커넥터 핀 변형', cause: 'MN-운송 중 충격으로 핀 변형 발생', occurrence: 4, detection: null, improvement: '포장 완충재 2중 적용 및 운송 진동 테스트 기준 강화', vehicle: 'NE1', target: '부품', m4Category: 'MN', location: '수입검사', completedDate: '2026-01-10', status: 'G' },
  { lldNo: 'LLD26-022', classification: 'RMA', applyTo: 'detection', processNo: 'P-010', processName: '수입검사', productName: 'SU2', failureMode: '도금 두께 부족', cause: '협력사 도금 공정 관리 미흡', occurrence: null, detection: 4, improvement: '수입검사 시 도금 두께 전수검사 → 샘플링 AQL 강화(Level II→S-4)', vehicle: 'SU2', target: '부품', m4Category: null, location: '수입검사', completedDate: '2026-01-15', status: 'G' },
  { lldNo: 'LLD26-023', classification: 'RMA', applyTo: 'prevention', processNo: 'P-020', processName: '조립라인', productName: 'NE1', failureMode: '하우징 크랙', cause: 'IM-사출 조건 불안정으로 내부 응력 잔존', occurrence: 6, detection: null, improvement: '협력사 사출 조건 표준화 및 금형 정기 점검 주기 단축(분기→월)', vehicle: 'NE1', target: '부품', m4Category: 'IM', location: '조립라인', completedDate: '2026-01-20', status: 'G' },
  { lldNo: 'LLD26-024', classification: 'RMA', applyTo: 'detection', processNo: 'P-030', processName: '최종검사', productName: 'SU2', failureMode: '나사산 불량', cause: '탭핑 공구 마모 미감지', occurrence: null, detection: 5, improvement: '나사산 게이지 검사 빈도 증가(Lot당→시간당) 및 공구 수명 관리 시스템 도입', vehicle: 'SU2', target: '부품', m4Category: null, location: '최종검사', completedDate: '2026-02-01', status: 'G' },
  { lldNo: 'LLD26-025', classification: 'RMA', applyTo: 'prevention', processNo: 'P-015', processName: '프레스공정', productName: 'NE1', failureMode: '버(Burr) 과다', cause: 'MC-프레스 금형 클리어런스 과대', occurrence: 5, detection: null, improvement: 'MC-금형 클리어런스 정기 측정(주1회) 및 마모량 기준 초과 시 즉시 재연마', vehicle: 'NE1', target: '제조', m4Category: 'MC', location: '프레스공정', completedDate: '2026-02-10', status: 'G' },
  { lldNo: 'LLD26-026', classification: 'RMA', applyTo: 'detection', processNo: 'P-025', processName: '외관검사', productName: 'SU2', failureMode: '표면 스크래치', cause: '검사 조명 환경 부적합으로 미세 스크래치 미검출', occurrence: null, detection: 6, improvement: '외관검사 조명 1000lux→2000lux 업그레이드 및 확대경 배율 3X→5X 변경', vehicle: 'SU2', target: '제조', m4Category: null, location: '외관검사', completedDate: '2026-02-15', status: 'G' },
  { lldNo: 'LLD26-027', classification: 'RMA', applyTo: 'prevention', processNo: 'P-040', processName: '포장공정', productName: 'NE1', failureMode: '라벨 부착 오류', cause: 'MN-라벨 프린터 설정 변경 후 미확인', occurrence: 3, detection: null, improvement: '라벨 출력 후 바코드 자동 검증 시스템 도입 및 Lot 시작 시 첫 5매 확인 의무화', vehicle: 'NE1', target: '제조', m4Category: 'MN', location: '포장공정', completedDate: '2026-02-20', status: 'Y' },
  { lldNo: 'LLD26-028', classification: 'RMA', applyTo: 'detection', processNo: 'P-035', processName: '기능검사', productName: 'SU2', failureMode: '전류 이상(과전류)', cause: 'EN-내부 회로 쇼트 미검출', occurrence: null, detection: 3, improvement: '기능검사 시 전류 상한/하한 자동 판정 기능 추가 및 이상 시 라인 정지 인터락', vehicle: 'SU2', target: '부품', m4Category: 'EN', location: '기능검사', completedDate: '2026-03-01', status: 'Y' },
  { lldNo: 'LLD26-029', classification: 'RMA', applyTo: 'prevention', processNo: 'P-010', processName: '수입검사', productName: 'NE1', failureMode: '치수 공차 초과', cause: '협력사 CNC 가공 정밀도 저하', occurrence: 4, detection: null, improvement: '협력사 Cpk 1.33 이상 유지 의무화 및 분기별 공정능력 보고서 제출 요구', vehicle: 'NE1', target: '부품', m4Category: null, location: '수입검사', completedDate: '2026-03-05', status: 'R' },
  { lldNo: 'LLD26-030', classification: 'RMA', applyTo: 'detection', processNo: 'P-030', processName: '최종검사', productName: 'SU2', failureMode: '방수 불량', cause: '방수 시험기 압력 센서 노화', occurrence: null, detection: 4, improvement: '방수 시험기 압력 센서 교정 주기 단축(반기→분기) 및 마스터 샘플 일일 검증', vehicle: 'SU2', target: '제조', m4Category: null, location: '최종검사', completedDate: '2026-03-10', status: 'R' },

  // ═══════════════════════════════════════
  // ABN (이상) - 10건
  // ═══════════════════════════════════════
  { lldNo: 'LLD26-031', classification: 'ABN', applyTo: 'prevention', processNo: 'P-012', processName: '사출공정', productName: 'NE1', failureMode: '미성형(Short Shot)', cause: 'MC-사출기 노즐 막힘', occurrence: 5, detection: null, improvement: '사출기 노즐 정기 청소 주기 단축(주1→일1) 및 배압 모니터링 자동화', vehicle: 'NE1', target: '제조', m4Category: 'MC', location: '사출공정', completedDate: '2026-01-12', status: 'G' },
  { lldNo: 'LLD26-032', classification: 'ABN', applyTo: 'detection', processNo: 'P-022', processName: '용접공정', productName: 'SU2', failureMode: '용접 강도 부족', cause: '용접 전극 마모 미감지', occurrence: null, detection: 5, improvement: '용접 전극 팁 드레싱 주기 자동 카운트 및 교체 시기 알림 시스템 구축', vehicle: 'SU2', target: '제조', m4Category: null, location: '용접공정', completedDate: '2026-01-18', status: 'G' },
  { lldNo: 'LLD26-033', classification: 'ABN', applyTo: 'prevention', processNo: 'P-014', processName: '도포공정', productName: 'NE1', failureMode: '접착제 경화 불량', cause: 'EN-UV 램프 출력 저하', occurrence: 4, detection: null, improvement: 'UV 램프 출력 일일 측정 기록 및 기준값 80% 이하 시 즉시 교체', vehicle: 'NE1', target: '제조', m4Category: 'EN', location: '도포공정', completedDate: '2026-01-25', status: 'G' },
  { lldNo: 'LLD26-034', classification: 'ABN', applyTo: 'detection', processNo: 'P-018', processName: '비전검사', productName: 'SU2', failureMode: '이물 검출 누락', cause: '비전 카메라 해상도 부족', occurrence: null, detection: 6, improvement: '비전 카메라 해상도 2MP→5MP 업그레이드 및 알고리즘 민감도 재설정', vehicle: 'SU2', target: '제조', m4Category: null, location: '비전검사', completedDate: '2026-02-03', status: 'G' },
  { lldNo: 'LLD26-035', classification: 'ABN', applyTo: 'prevention', processNo: 'P-016', processName: '열처리공정', productName: 'NE1', failureMode: '경도 미달', cause: '열처리로 온도 편차 발생', occurrence: 5, detection: null, improvement: '열처리로 다점 온도 센서 추가 설치(3점→9점) 및 온도 균일도 분기 검증', vehicle: 'NE1', target: '제조', m4Category: null, location: '열처리공정', completedDate: '2026-02-08', status: 'G' },
  { lldNo: 'LLD26-036', classification: 'ABN', applyTo: 'detection', processNo: 'P-024', processName: '측정실', productName: 'SU2', failureMode: '3차원 측정 오차', cause: 'CMM 프로브 마모', occurrence: null, detection: 4, improvement: 'CMM 프로브 사용 횟수 관리 및 500회 사용 시 자동 교체 알림', vehicle: 'SU2', target: '제조', m4Category: null, location: '측정실', completedDate: '2026-02-14', status: 'G' },
  { lldNo: 'LLD26-037', classification: 'ABN', applyTo: 'prevention', processNo: 'P-020', processName: '조립라인', productName: 'NE1', failureMode: '조립 순서 오류', cause: 'MN-작업 표준서 미준수', occurrence: 6, detection: null, improvement: '조립 순서 Poka-Yoke 지그 도입 및 순서 미준수 시 다음 공정 이동 차단', vehicle: 'NE1', target: '제조', m4Category: 'MN', location: '조립라인', completedDate: '2026-02-22', status: 'Y' },
  { lldNo: 'LLD26-038', classification: 'ABN', applyTo: 'detection', processNo: 'P-028', processName: '리크검사', productName: 'SU2', failureMode: '미세 리크 미검출', cause: '리크 검사기 감도 부족', occurrence: null, detection: 5, improvement: '리크 검사기 감도 업그레이드(10cc→1cc/min) 및 마스터 리크 샘플 일일 검증', vehicle: 'SU2', target: '제조', m4Category: null, location: '리크검사', completedDate: '2026-03-02', status: 'Y' },
  { lldNo: 'LLD26-039', classification: 'ABN', applyTo: 'prevention', processNo: 'P-026', processName: '세정공정', productName: 'NE1', failureMode: '세정액 농도 이상', cause: '세정액 자동 보충 시스템 오작동', occurrence: 4, detection: null, improvement: '세정액 농도 실시간 모니터링 센서 설치 및 농도 이탈 시 자동 경보/라인 정지', vehicle: 'NE1', target: '제조', m4Category: null, location: '세정공정', completedDate: '2026-03-08', status: 'R' },
  { lldNo: 'LLD26-040', classification: 'ABN', applyTo: 'detection', processNo: 'P-030', processName: '최종검사', productName: 'SU2', failureMode: '진동 이상 미검출', cause: '진동 측정기 기준값 미설정', occurrence: null, detection: 6, improvement: '제품별 진동 기준값 DB 구축 및 자동 판정 시스템 도입', vehicle: 'SU2', target: '제조', m4Category: null, location: '최종검사', completedDate: '2026-03-15', status: 'R' },

  // ═══════════════════════════════════════
  // CIP (지속개선) - 10건
  // ═══════════════════════════════════════
  { lldNo: 'LLD26-041', classification: 'CIP', applyTo: 'prevention', processNo: 'P-012', processName: '사출공정', productName: 'NE1', failureMode: '웰드라인 발생', cause: '금형 게이트 위치 부적합', occurrence: 4, detection: null, improvement: '금형 게이트 위치 최적화(CAE 시뮬레이션) 및 금형 수정 완료', vehicle: 'NE1', target: '제조', m4Category: null, location: '사출공정', completedDate: '2026-01-08', status: 'G' },
  { lldNo: 'LLD26-042', classification: 'CIP', applyTo: 'detection', processNo: 'P-018', processName: '비전검사', productName: 'SU2', failureMode: '색상 편차 미검출', cause: '비전 검사 색상 판정 기준 미흡', occurrence: null, detection: 4, improvement: '색차계 기반 L*a*b* 정량 판정 도입으로 주관적 판정 제거', vehicle: 'SU2', target: '제조', m4Category: null, location: '비전검사', completedDate: '2026-01-22', status: 'G' },
  { lldNo: 'LLD26-043', classification: 'CIP', applyTo: 'prevention', processNo: 'P-020', processName: '조립라인', productName: 'NE1', failureMode: '체결 누락', cause: 'MN-다축 체결 시 카운트 오류', occurrence: 3, detection: null, improvement: '볼트 카운팅 센서 + PLC 연동으로 전수 체결 확인 시스템 구축', vehicle: 'NE1', target: '제조', m4Category: 'MN', location: '조립라인', completedDate: '2026-02-05', status: 'G' },
  { lldNo: 'LLD26-044', classification: 'CIP', applyTo: 'detection', processNo: 'P-024', processName: '품질검사', productName: 'SU2', failureMode: 'SPC 이상 패턴 미감지', cause: 'SPC 관리 수동 운영으로 실시간 대응 불가', occurrence: null, detection: 3, improvement: '실시간 SPC 모니터링 시스템 도입 및 Nelson Rule 8가지 패턴 자동 감지', vehicle: 'SU2', target: '제조', m4Category: null, location: '품질검사', completedDate: '2026-02-12', status: 'G' },
  { lldNo: 'LLD26-045', classification: 'CIP', applyTo: 'prevention', processNo: 'P-014', processName: '도포공정', productName: 'NE1', failureMode: '도포 위치 편차', cause: 'MC-디스펜서 X-Y 축 반복정밀도 저하', occurrence: 4, detection: null, improvement: 'MC-디스펜서 Ball Screw 교체 및 반복정밀도 ±0.1mm→±0.05mm 개선', vehicle: 'NE1', target: '제조', m4Category: 'MC', location: '도포공정', completedDate: '2026-02-18', status: 'G' },
  { lldNo: 'LLD26-046', classification: 'CIP', applyTo: 'detection', processNo: 'P-030', processName: '최종검사', productName: 'SU2', failureMode: '소음 이상 미검출', cause: '소음 측정 환경 소음 영향', occurrence: null, detection: 5, improvement: '방음 부스 설치 및 배경 소음 보정 알고리즘 적용으로 측정 정밀도 향상', vehicle: 'SU2', target: '제조', m4Category: null, location: '최종검사', completedDate: '2026-02-25', status: 'Y' },
  { lldNo: 'LLD26-047', classification: 'CIP', applyTo: 'prevention', processNo: 'P-016', processName: '열처리공정', productName: 'NE1', failureMode: '탈탄 발생', cause: '열처리 분위기 가스 순도 관리 미흡', occurrence: 5, detection: null, improvement: '분위기 가스 산소 농도 실시간 모니터링 및 기준 초과 시 자동 차단', vehicle: 'NE1', target: '제조', m4Category: null, location: '열처리공정', completedDate: '2026-03-04', status: 'Y' },
  { lldNo: 'LLD26-048', classification: 'CIP', applyTo: 'detection', processNo: 'P-022', processName: '용접검사', productName: 'SU2', failureMode: '용접 기공 미검출', cause: 'X-ray 검사 판독 기준 불명확', occurrence: null, detection: 4, improvement: 'X-ray 검사 AI 자동 판독 시스템 도입으로 판독자 편차 제거', vehicle: 'SU2', target: '제조', m4Category: null, location: '용접검사', completedDate: '2026-03-10', status: 'R' },
  { lldNo: 'LLD26-049', classification: 'CIP', applyTo: 'prevention', processNo: 'P-040', processName: '포장공정', productName: 'NE1', failureMode: '포장 훼손', cause: '포장 자재 강도 부족', occurrence: 3, detection: null, improvement: '포장 자재 낙하 시험 기준 강화(0.8m→1.2m) 및 신규 완충 구조 적용', vehicle: 'NE1', target: '제조', m4Category: null, location: '포장공정', completedDate: '2026-03-15', status: 'R' },
  { lldNo: 'LLD26-050', classification: 'CIP', applyTo: 'detection', processNo: 'P-028', processName: '기밀검사', productName: 'SU2', failureMode: '기밀 검사 시간 과다', cause: '검사 사이클 타임 비효율', occurrence: null, detection: 3, improvement: '2채널 동시 검사 지그 도입으로 사이클 타임 50% 단축(60초→30초)', vehicle: 'SU2', target: '제조', m4Category: null, location: '기밀검사', completedDate: '2026-03-20', status: 'R' },

  // ═══════════════════════════════════════
  // ECN (설계변경) - 10건
  // ═══════════════════════════════════════
  { lldNo: 'LLD26-051', classification: 'ECN', applyTo: 'prevention', processNo: 'P-010', processName: '수입검사', productName: 'NE1', failureMode: '소재 물성 미달', cause: 'EN-설계 스펙 대비 소재 강도 부족', occurrence: 4, detection: null, improvement: '소재 사양 변경(SS400→S45C) 및 협력사 소재 성적서 필수 첨부', vehicle: 'NE1', target: '설계', m4Category: 'EN', location: '수입검사', completedDate: '2026-01-05', status: 'G' },
  { lldNo: 'LLD26-052', classification: 'ECN', applyTo: 'detection', processNo: 'P-030', processName: '최종검사', productName: 'SU2', failureMode: '내구 시험 불합격', cause: '설계 안전율 부족(1.2→1.5 필요)', occurrence: null, detection: 3, improvement: '설계 안전율 1.5 이상으로 상향 및 FEA 시뮬레이션 검증 완료', vehicle: 'SU2', target: '설계', m4Category: null, location: '최종검사', completedDate: '2026-01-15', status: 'G' },
  { lldNo: 'LLD26-053', classification: 'ECN', applyTo: 'prevention', processNo: 'P-012', processName: '사출공정', productName: 'NE1', failureMode: '수축 변형', cause: 'EN-벽두께 불균일 설계', occurrence: 5, detection: null, improvement: '벽두께 균일화 설계 변경(2.0±0.5→2.0±0.2mm) 및 금형 수정', vehicle: 'NE1', target: '설계', m4Category: 'EN', location: '사출공정', completedDate: '2026-01-25', status: 'G' },
  { lldNo: 'LLD26-054', classification: 'ECN', applyTo: 'detection', processNo: 'P-024', processName: '품질검사', productName: 'SU2', failureMode: '도면 공차 불명확', cause: '도면 GD&T 표기 누락', occurrence: null, detection: 4, improvement: 'GD&T 표기 전면 재검토 및 측정 기준면 명확화(ECN-2026-012)', vehicle: 'SU2', target: '설계', m4Category: null, location: '품질검사', completedDate: '2026-02-05', status: 'G' },
  { lldNo: 'LLD26-055', classification: 'ECN', applyTo: 'prevention', processNo: 'P-020', processName: '조립라인', productName: 'NE1', failureMode: '조립 간섭', cause: 'EN-부품 간 클리어런스 부족', occurrence: 3, detection: null, improvement: '클리어런스 0.3mm→0.8mm 확대 설계 변경 및 3D 간섭 체크 프로세스 도입', vehicle: 'NE1', target: '설계', m4Category: 'EN', location: '조립라인', completedDate: '2026-02-12', status: 'G' },
  { lldNo: 'LLD26-056', classification: 'ECN', applyTo: 'detection', processNo: 'P-035', processName: '기능검사', productName: 'SU2', failureMode: '온도 특성 불합격', cause: '사용 온도 범위 설계 미고려', occurrence: null, detection: 4, improvement: '사용 온도 범위 -20~60℃→-40~85℃ 확대 설계 및 신뢰성 시험 추가', vehicle: 'SU2', target: '설계', m4Category: null, location: '기능검사', completedDate: '2026-02-20', status: 'G' },
  { lldNo: 'LLD26-057', classification: 'ECN', applyTo: 'prevention', processNo: 'P-014', processName: '도포공정', productName: 'NE1', failureMode: '접착 면적 부족', cause: 'EN-접착면 설계 면적 부족', occurrence: 4, detection: null, improvement: '접착면적 15mm²→25mm² 확대 설계 변경 및 접착강도 시험 기준 추가', vehicle: 'NE1', target: '설계', m4Category: 'EN', location: '도포공정', completedDate: '2026-03-01', status: 'Y' },
  { lldNo: 'LLD26-058', classification: 'ECN', applyTo: 'detection', processNo: 'P-018', processName: '비전검사', productName: 'SU2', failureMode: '외형 치수 기준 불명확', cause: '2D 도면 해석 모호성', occurrence: null, detection: 5, improvement: '3D 모델 기반 치수 검사 도입 및 2D 도면 해석 가이드 제작', vehicle: 'SU2', target: '설계', m4Category: null, location: '비전검사', completedDate: '2026-03-08', status: 'Y' },
  { lldNo: 'LLD26-059', classification: 'ECN', applyTo: 'prevention', processNo: 'P-022', processName: '용접공정', productName: 'NE1', failureMode: '용접 변형', cause: 'EN-판재 두께 불균일 설계', occurrence: 5, detection: null, improvement: '판재 두께 균일화(1.0→1.2mm 통일) 및 용접 순서 최적화', vehicle: 'NE1', target: '설계', m4Category: 'EN', location: '용접공정', completedDate: '2026-03-12', status: 'R' },
  { lldNo: 'LLD26-060', classification: 'ECN', applyTo: 'detection', processNo: 'P-030', processName: '최종검사', productName: 'SU2', failureMode: 'EMC 시험 불합격', cause: '차폐 설계 미흡', occurrence: null, detection: 3, improvement: '차폐 구조 추가(가스켓+도전성 도료) 및 EMC 사전 시뮬레이션 의무화', vehicle: 'SU2', target: '설계', m4Category: null, location: '최종검사', completedDate: '2026-03-18', status: 'R' },

  // ═══════════════════════════════════════
  // DevIssue (개발이슈) - 10건
  // ═══════════════════════════════════════
  { lldNo: 'LLD26-061', classification: 'DevIssue', applyTo: 'prevention', processNo: 'P-001', processName: '시작품제작', productName: 'NE1', failureMode: 'Proto 샘플 치수 불량', cause: '시작금형 정밀도 부족', occurrence: 6, detection: null, improvement: '시작금형 정밀도 기준 강화(±0.1→±0.05mm) 및 T1 샘플 전수 측정 의무화', vehicle: 'NE1', target: '개발', m4Category: null, location: '시작품제작', completedDate: '2026-01-03', status: 'G' },
  { lldNo: 'LLD26-062', classification: 'DevIssue', applyTo: 'detection', processNo: 'P-002', processName: '신뢰성시험', productName: 'SU2', failureMode: '고온고습 시험 불합격', cause: '방습 코팅 사양 미설정', occurrence: null, detection: 4, improvement: '방습 코팅(Conformal Coating) 적용 및 85℃/85%RH 1000시간 시험 통과 확인', vehicle: 'SU2', target: '개발', m4Category: null, location: '신뢰성시험', completedDate: '2026-01-10', status: 'G' },
  { lldNo: 'LLD26-063', classification: 'DevIssue', applyTo: 'prevention', processNo: 'P-003', processName: 'DVP시험', productName: 'NE1', failureMode: '진동 시험 파손', cause: 'EN-공진 주파수대 회피 설계 미적용', occurrence: 5, detection: null, improvement: '공진 주파수 해석(FEA) 후 리브 추가 설계 변경으로 고유진동수 상향', vehicle: 'NE1', target: '개발', m4Category: 'EN', location: 'DVP시험', completedDate: '2026-01-20', status: 'G' },
  { lldNo: 'LLD26-064', classification: 'DevIssue', applyTo: 'detection', processNo: 'P-004', processName: '양산적합성', productName: 'SU2', failureMode: '공정능력 미달(Cpk<1.33)', cause: '양산 조건 최적화 미완료', occurrence: null, detection: 5, improvement: 'DOE 기반 양산 조건 최적화 및 Cpk 1.67 이상 달성 후 양산 이관', vehicle: 'SU2', target: '개발', m4Category: null, location: '양산적합성', completedDate: '2026-02-01', status: 'G' },
  { lldNo: 'LLD26-065', classification: 'DevIssue', applyTo: 'prevention', processNo: 'P-001', processName: '시작품제작', productName: 'NE1', failureMode: '소재 호환성 문제', cause: 'IM-2차 소재 물성 데이터 미확보', occurrence: 4, detection: null, improvement: '소재 물성 DB 구축 및 대체 소재 사전 호환성 시험 프로세스 수립', vehicle: 'NE1', target: '개발', m4Category: 'IM', location: '시작품제작', completedDate: '2026-02-10', status: 'G' },
  { lldNo: 'LLD26-066', classification: 'DevIssue', applyTo: 'detection', processNo: 'P-005', processName: '초도품검사', productName: 'SU2', failureMode: 'PPAP 문서 불비', cause: '초도품 검사 체크리스트 미비', occurrence: null, detection: 3, improvement: 'PPAP Level 3 체크리스트 표준화 및 제출 전 내부 사전 심사 프로세스 도입', vehicle: 'SU2', target: '개발', m4Category: null, location: '초도품검사', completedDate: '2026-02-18', status: 'G' },
  { lldNo: 'LLD26-067', classification: 'DevIssue', applyTo: 'prevention', processNo: 'P-003', processName: 'DVP시험', productName: 'NE1', failureMode: '열충격 시험 크랙', cause: 'EN-소재 열팽창계수 불일치', occurrence: 5, detection: null, improvement: '접합 소재 간 열팽창계수 차이 5ppm 이내 소재 선정 및 검증 시험 추가', vehicle: 'NE1', target: '개발', m4Category: 'EN', location: 'DVP시험', completedDate: '2026-02-28', status: 'Y' },
  { lldNo: 'LLD26-068', classification: 'DevIssue', applyTo: 'detection', processNo: 'P-002', processName: '신뢰성시험', productName: 'SU2', failureMode: '염수분무 시험 부식', cause: '표면 처리 사양 미달', occurrence: null, detection: 4, improvement: '표면 처리 사양 Ni 도금 3μm→5μm 변경 및 SST 96시간 시험 통과 확인', vehicle: 'SU2', target: '개발', m4Category: null, location: '신뢰성시험', completedDate: '2026-03-05', status: 'Y' },
  { lldNo: 'LLD26-069', classification: 'DevIssue', applyTo: 'prevention', processNo: 'P-004', processName: '양산적합성', productName: 'NE1', failureMode: '금형 수명 미달', cause: 'MC-금형 소재 선정 오류', occurrence: 4, detection: null, improvement: '금형 소재 SKD11→SKH51 변경으로 수명 10만→30만 Shot 향상', vehicle: 'NE1', target: '개발', m4Category: 'MC', location: '양산적합성', completedDate: '2026-03-12', status: 'R' },
  { lldNo: 'LLD26-070', classification: 'DevIssue', applyTo: 'detection', processNo: 'P-005', processName: '초도품검사', productName: 'SU2', failureMode: '고객 승인 시험 불합격', cause: '고객 시험 조건 사전 미파악', occurrence: null, detection: 5, improvement: '고객 승인 시험 조건 사전 입수 프로세스 수립 및 사전 시험 의무화', vehicle: 'SU2', target: '개발', m4Category: null, location: '초도품검사', completedDate: '2026-03-20', status: 'R' },
];

async function main() {
  let created = 0;
  let skipped = 0;

  for (const item of SEED_DATA) {
    const existing = await prisma.lLDFilterCode.findUnique({ where: { lldNo: item.lldNo } });
    if (existing) {
      skipped++;
      continue;
    }

    await prisma.lLDFilterCode.create({
      data: {
        ...item,
        sourceType: 'seed',
        priority: 0,
        fmeaId: null,
        appliedDate: null,
      },
    });
    created++;
  }

  console.log(`Seed complete: ${created} created, ${skipped} skipped (already exist)`);
  console.log(`Total LLD records: ${await prisma.lLDFilterCode.count()}`);

  // Summary by classification
  const summary = await prisma.lLDFilterCode.groupBy({
    by: ['classification'],
    _count: { classification: true },
  });
  console.log('By classification:', summary.map(s => `${s.classification}: ${s._count.classification}`).join(', '));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
