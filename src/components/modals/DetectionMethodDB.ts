/**
 * @file DetectionMethodDB.ts
 * @description 업종별 검출방법 사례 데이터베이스 (Detection Method Examples by Industry)
 * 출처: FMEA_검출도_DB_업종별.xlsx
 * AIAG & VDA FMEA Handbook 기반, 등급(1~10)별 업종 특화 검출방법 사례
 */

export interface DetectionExample {
  rating: number;
  examples: string; // 줄바꿈(\n)으로 구분된 사례 목록
}

export interface IndustryDetectionDB {
  id: string;
  nameKr: string;
  nameEn: string;
  data: DetectionExample[];
}

/** 업종 ID 상수 */
export const INDUSTRY_IDS = {
  SEMICONDUCTOR: 'semiconductor',
  AUTOMOTIVE_PARTS: 'automotive_parts',
  INJECTION_MOLDING: 'injection_molding',
  PRESS_STAMPING: 'press_stamping',
  PCB_SMT: 'pcb_smt',
} as const;

/** 전체 업종 목록 */
export const INDUSTRY_LIST: IndustryDetectionDB[] = [
  {
    id: INDUSTRY_IDS.SEMICONDUCTOR,
    nameKr: '반도체',
    nameEn: 'Semiconductor',
    data: [
      { rating: 10, examples: '검출방법 없음\n육안검사 불가 영역 (내부 배선, 접합부)\n게이트 산화막 내부 결함 등 물리적 접근 불가 영역' },
      { rating: 9, examples: '작업자 경험 기반 주관적 판단\n비정기 외관 확인 (배율 없음)\n로트 단위 무작위 발췌 육안검사' },
      { rating: 8, examples: '광학현미경 육안검사 (미숙련자, 50~200x)\n스테레오 현미경 외관검사 (Olympus SZX series)\n핀셋/프로브 수동 접촉 확인\n디지털 멀티미터 (Keysight 34401A) 수동 측정\n수동 프로브 스테이션 (미검증 레시피)\n소스미터 (Keithley 2400) 수동 IV 측정' },
      { rating: 7, examples: 'AOI 자동광학검사 (KLA Surfscan, 미검증 레시피)\nSEM 검사 (Hitachi S-9380, 미표준화)\nX-ray 검사 (Nordson DAGE, 미검증 조건)\nParametric Tester (Keithley 4200-SCS, 미검증 프로그램)\nFIB 단면 분석 (FEI Helios, 비정기)\nWafer Prober 반자동 (TSK UF3000, 미검증 조건)\nAFM 원자력현미경 (Bruker Dimension, 미표준화)\nEllipsometer (J.A. Woollam, 미검증 조건)' },
      { rating: 6, examples: '광학현미경 육안검사 (숙련자, 표준 샘플 비교, 200~1000x)\nSEM 검사 (표준화 레시피, CD-SEM Hitachi CG6300)\n수동 프로브 스테이션 검사 (숙련 엔지니어)\nLCR Meter (Keysight E4980A) 수동 측정\n표면조도계 (Mitutoyo SJ-410) 측정\n막두께 측정기 (Filmetrics F20) 샘플링\nDigital Microscope (Keyence VHX-7000) 표준 검사\nCurve Tracer (Keysight B1505A) IV 특성 확인\n4-Point Probe 면저항 측정 (Jandel RM3000)' },
      { rating: 5, examples: 'CP Test 샘플링 (Teradyne J750, Advantest V93K)\nEDS/WDS 성분 분석 (Oxford Instruments)\nEllipsometer 박막 측정 (J.A. Woollam, 검증 완료)\nKLA Surfscan 파티클 검사 (샘플링, 검증 레시피)\nNanoprober (Bruker) 전기적 특성 측정\nTDR 검사 (Tektronix DSA8300)\nC-SAM 초음파 검사 (Sonoscan D9600, 샘플링)\nSIMS 이차이온질량분석 (CAMECA IMS-7f)\nXRF 형광분석 (Bruker S8 Tiger) 조성 확인\nDektak 단차 측정기 (Bruker DektakXT)' },
      { rating: 4, examples: 'FT 전수검사 + SBL 관리 (Teradyne UltraFlex, Advantest T2000)\nAOI 전수검사 + 자동 분류 (KLA 2920/Candela)\nBurn-in Test 전수 (Delta Design, Aehr Test Systems)\nX-ray 전수검사 + 자동 불량 분류 (Nordson DAGE XD7800)\nWAT 전수 + SPC 관리\nHTOL/TC/HAST 신뢰성 시험 후 전수 검사\nEBI 전수 스캔 (KLA eScan)\nAutomated Probe Test 전수 + Auto Binning + MES Hold' },
      { rating: 3, examples: 'CP + FT 이중검사 + SPC/SBL 연동 관리\nIn-line AOI + Review SEM 이중검사 (KLA 2920 + Hitachi RS6000)\nATE 전수 + 자동 Binning + MES 연동 자동 Hold\nIn-line 파티클 모니터 + 실시간 공정 정지 (KLA Surfscan SP7)\nProbe Card 자동 교정 + Contact Resistance 실시간 모니터링\nOQC 전수 + 자동 Tape&Reel 불량 취출\nIn-line CD-SEM + 이탈 시 자동 공정 Hold' },
      { rating: 2, examples: 'In-line SPC 자동 관리 + 이탈 시 장비 자동 정지\nPoka-Yoke: 레시피 자동 매칭 + 불일치 시 공정 차단\nAPC 실시간 보정 + 이상 시 자동 정지\nFDC 실시간 장비 모니터링 + 자동 Interlock\nEES 통합 관리 + 이상 Lot 자동 Hold' },
      { rating: 1, examples: '설계적 원천 차단 (물리적 불량 생성 불가)\nDRC 자동 검증으로 설계 오류 원천 차단\nLVS 자동 검증\nERC 자동 검증\nDFM (Design for Manufacturing) Rule 자동 검증' },
    ],
  },
  {
    id: INDUSTRY_IDS.AUTOMOTIVE_PARTS,
    nameKr: '자동차부품',
    nameEn: 'Automotive Parts',
    data: [
      { rating: 10, examples: '검출방법 없음\n내부 용접부 비파괴검사 불가 영역\n밀폐 구조 내부 결함' },
      { rating: 9, examples: '작업자 무작위 순회점검\n비정기 외관 확인\n경험 기반 촉감/청감 검사' },
      { rating: 8, examples: '버니어 캘리퍼스 (Mitutoyo 500 series) 수동 측정\n마이크로미터 (Mitutoyo 293 series) 외경 측정\n내경 마이크로미터 (Mitutoyo 368 series)\n하이트 게이지 (Mitutoyo 192 series)\n다이얼 인디케이터 (Mitutoyo 2046S)\n강철자/줄자 수동 치수 측정\n표면조도계 (Mitutoyo SJ-210) 미숙련자\n수동 경도계 (Rockwell/Vickers/Brinell) 미검증\n토크 렌치 (Tohnichi) 수동 체결 확인\n틈새 게이지 (Feeler Gauge) 수동 확인' },
      { rating: 7, examples: 'CMM 3차원 측정기 (Zeiss CONTURA, 미검증 프로그램)\nVision 검사기 (Keyence CV-X, 미검증 레시피)\n초음파 두께 측정기 (Olympus 38DL Plus)\nUT 초음파 탐상기 (Olympus EPOCH 650)\nPT 침투탐상 검사 (형광/비형광)\nMT 자분탐상 검사 (Magnaflux)\nRT 방사선 투과 검사 (미검증 조건)\n경도계 자동 (Struers DuraScan, 미검증)\n누설 시험기 (Cosmo Instruments, 미검증)\n레이저 변위 센서 (Keyence LK-G, 미검증)' },
      { rating: 6, examples: '버니어 캘리퍼스 (숙련자, Gage R&R 합격)\n마이크로미터 (숙련자, Gage R&R 합격)\nGo/No-Go 게이지 (한계게이지) 수동 검사\nPin Gauge / Ring Gauge / Snap Gauge\nBore Gauge 내경 측정 (숙련자)\n검사구 (Checking Fixture) 수동 검사\n표면조도계 (SJ-410, 숙련자, 표준편 비교)\n경도계 (Rockwell/Vickers/Shore, 숙련자)\n토크 렌치 수동 체결 + 마킹 확인\n한도견본 비교 육안검사 (숙련자, 조명 완비)\n만능재료시험기 (Instron 5900) 인장/압축/굴곡\n충격시험기 (Charpy/Izod)\n금속현미경 (Olympus GX53) 조직 관찰' },
      { rating: 5, examples: 'CMM 3차원 측정기 (Zeiss CONTURA/ACCURA) 샘플링\nVision 측정기 (Keyence IM-8000) 샘플링\n윤곽 측정기 (Mitutoyo CV-3200) 프로파일\n진원도 측정기 (Mitutoyo RA-2200)\n3D 스캐너 (GOM ATOS Q) 형상 비교\nX-ray CT (Nikon XT H 225) 샘플링\n누설 시험기 (ATEQ/Cosmo) 검증 완료\nFARO Arm 좌표 측정\nTaylor Hobson 표면거칠기 측정\n디지털 토크 분석기 (Kistler) 샘플링\nEddy Current 검사기 (Foerster) 검증 완료\n마모시험기 (Taber Abraser) 내마모 시험\n염수분무시험기 (Q-FOG CCT) 내식 시험' },
      { rating: 4, examples: 'In-line Vision 전수검사 + 자동 NG 분리 (Cognex In-Sight)\nLeak Tester 전수 + 자동 판정/분류 (ATEQ F620)\nCMM 전수 자동 측정 + 이탈 시 Hold (Zeiss DuraMax)\n전수 기능시험 (EOL Test) + 자동 불합격 취출\nEddy Current 전수검사 + 자동 분류 (Foerster DEFECTOMAT)\nLaser 치수 전수 (Keyence LJ-X8000) + SPC 자동\n자동 하중시험 (Load Cell) 전수 + 자동 분류\n자동 초음파 탐상 전수 (Olympus OmniScan) + 자동 분류' },
      { rating: 3, examples: '공정 내 자동 게이지 + 이탈 시 자동 정지\nVision 전수 + 로봇 자동 취출 + MES 연동\n용접 전류/전압 실시간 모니터링 + 이상 시 자동 정지\nTorque 자동 체결 + 각도 감시 + NG 시 라인 정지 (Atlas Copco)\nIn-line CT 전수 + 자동 불합격 분류\nLaser Tracker (Leica AT960) 실시간 공정 내 측정\nServo Press 하중-변위 곡선 실시간 감시 + 이탈 시 자동 정지' },
      { rating: 2, examples: 'Poka-Yoke: 부품 방향 센서 + 잘못된 투입 시 장비 정지\nPoka-Yoke: 누락 검출 센서 (광전/근접) + 공정 차단\n자동 토크 체결 + 카운터 + 누락 시 라인 정지\nInterlock: 전 공정 완료 확인 후 다음 공정 진행\n바코드/QR 자동 스캔 + 부품 불일치 시 공정 차단' },
      { rating: 1, examples: '설계적 원천 차단 (비대칭 형상으로 오조립 물리적 불가)\nKeyed 커넥터 / 비대칭 핀 배열로 오삽입 불가\n금형/지그 구조상 불량 생성 불가 (Fool-Proof 설계)' },
    ],
  },
  {
    id: INDUSTRY_IDS.INJECTION_MOLDING,
    nameKr: '사출성형',
    nameEn: 'Injection Molding',
    data: [
      { rating: 10, examples: '검출방법 없음\n내부 보이드/기포 검출 불가\n잔류 응력 검출 불가' },
      { rating: 9, examples: '작업자 산발적 외관 확인\n비정기 중량 확인\n경험 기반 촉감 검사' },
      { rating: 8, examples: '버니어 캘리퍼스 수동 치수 측정 (미숙련자)\n마이크로미터 두께 측정\n높이 게이지 수동 측정\n육안검사 (한도견본 미비, 조명 부족)\n전자저울 수동 중량 측정\n색차계 (Konica Minolta CR-400) 미검증\n광택계 (BYK-Gardner) 미검증\nShore 경도계 (Durometer) 미숙련자\n핀 게이지 홀 직경 수동 확인' },
      { rating: 7, examples: 'Vision 검사기 (Keyence CV-X, 미검증 레시피)\n자동 치수 측정기 (미검증 프로그램)\nCT 스캐너 (내부 보이드 검사, 미표준화)\nDSC 열분석기 (TA Instruments, 미검증)\nMFI 용융지수 측정기 (CEAST, 미검증)\n수분 측정기 (Brabender Aquatrac)\nTGA 열중량 분석기 (미검증 조건)\n자동 광택 측정 시스템 (미검증)' },
      { rating: 6, examples: '버니어 캘리퍼스 (숙련자, Gage R&R 합격)\nPin Gauge / 플러그 게이지 홀 검사\nGo/No-Go 게이지 검사 (숙련자)\n한도견본 비교 육안검사 (숙련자, 조명 완비)\n색차계 (숙련자, 표준편 비교, ΔE 기준 설정)\n광택계 (숙련자, 각도별 측정 검증)\n전자저울 중량 검사 (관리도 운영)\nShore 경도계 수동 측정 (숙련자)\n만능재료시험기 (Instron) 인장/굴곡 시험\nVicat/HDT 열변형 온도 시험기\nIZOD/Charpy 충격시험기\n마모시험기 (Taber) 내마모 시험' },
      { rating: 5, examples: 'Vision 자동검사기 샘플링 (Keyence IM-8000, 검증 완료)\nCMM 3차원 측정기 샘플링 (Zeiss)\n영상 측정기 (Mitutoyo QV Apex) 샘플링\nCT 스캐너 샘플링 (Nikon XT H)\nDSC 열분석 (표준 조건 검증 완료)\nFTIR 적외선 분석 (원재료 수입검사)\nMFI 용융지수 측정 (검증 완료)\n자동 색차 측정 시스템 (샘플링)\n3D 스캐너 (GOM ATOS) 형상 비교\nAsh Content 분석 (Muffle Furnace)' },
      { rating: 4, examples: 'Vision 전수검사 + 자동 NG 분리 (Cognex/Keyence)\n자동 중량 선별기 전수 + 자동 분류 (Anritsu/Mettler Toledo)\n자동 치수 전수 + SPC 자동 관리\nLeak Tester 전수 (밀폐품)\nIn-line 색차 전수 + 자동 판정' },
      { rating: 3, examples: '금형 내 압력 센서 (Kistler) + 이상 시 자동 취출\n금형 내 온도 센서 실시간 모니터링 + 이탈 시 자동 정지\n사출기 공정 파라미터 실시간 감시 + 자동 정지\nHot Runner 온도 자동 제어 + 이상 시 자동 정지\nIn-mold Vision 검사 + 이상 시 로봇 분리\n취출 로봇 센서 + 미취출 감지 시 금형 닫힘 방지' },
      { rating: 2, examples: '금형 Cavity 센서 + 불량 조건 시 사출 즉시 정지\nPoka-Yoke: 원재료 바코드 검증 + 불일치 시 투입 차단\n건조기 이슬점 센서 + 기준 미달 시 공정 Interlock\n자동 원재료 배합 시스템 + 비율 이탈 시 차단' },
      { rating: 1, examples: '금형 구조상 불량 생성 불가 (언더컷 방지 슬라이드 필수 구조)\n금형 가이드 핀/부싱으로 코어 오정렬 물리적 불가\n제품 형상 비대칭 설계로 오조립 원천 차단' },
    ],
  },
  {
    id: INDUSTRY_IDS.PRESS_STAMPING,
    nameKr: '프레스판금',
    nameEn: 'Press/Stamping',
    data: [
      { rating: 10, examples: '검출방법 없음\n내부 균열(Micro-crack) 검출 불가\n잔류응력 분포 검출 불가' },
      { rating: 9, examples: '작업자 무작위 점검\n비정기 치수 확인\n경험 기반 외관 확인' },
      { rating: 8, examples: '버니어 캘리퍼스 수동 측정 (미숙련자)\n마이크로미터 두께 측정\n강철자/R게이지 수동 측정\n틈새 게이지 (Feeler Gauge) 수동 확인\n하이트 게이지 수동 측정\n다이얼 인디케이터 수동 측정\n육안검사 (게이지 없이)\n수동 경도계 미숙련자' },
      { rating: 7, examples: '자동 이송 중 센서 알림 (미검증)\nVision 검사기 (미검증 조건)\nCMM (미검증 프로그램)\n표면조도계 (미검증 조건)\nEddy Current 검사 (미검증)\n레이저 변위 센서 (Keyence LK-G, 미검증)\nSpring-back 측정 (미표준화)\n자동 두께 측정기 (미검증)' },
      { rating: 6, examples: 'Go/No-Go 게이지 (숙련자, Gage R&R 합격)\nPin Gauge / Plug Gauge 홀 검사\n버니어 캘리퍼스 (숙련자)\n검사구 (Checking Fixture) 수동 검사\n한도견본 비교 육안검사 (숙련자)\n표면조도계 (숙련자, 표준편 비교)\n버 높이 측정 (마이크로미터, 숙련자)\n만능재료시험기 인장 시험 (Instron/Shimadzu)\n경도계 (숙련자, 검증 완료)\nR게이지/각도기 형상 검사 (숙련자)' },
      { rating: 5, examples: 'CMM 3차원 측정기 샘플링 (Zeiss/Mitutoyo, Gage R&R 합격)\nVision 측정기 샘플링 (Keyence IM-8000)\n영상 측정기 (Mitutoyo QV) 프로파일\n3D 스캐너 (GOM ATOS) 형상 비교\nEddy Current 검사 (검증 완료, 샘플링)\n레이저 변위 센서 (Keyence) 샘플링\nSpring-back 각도 측정 (검증 완료)\n자동 두께 측정기 (검증 완료)' },
      { rating: 4, examples: 'In-line Vision 전수검사 + 자동 NG 분리\n레이저 치수 전수 + 자동 분류\n자동 하중 검사 (Load Cell) 전수 + 자동 분류\nEddy Current 전수 + 자동 불량 취출\nIn-line 두께 전수 (레이저/접촉식) + SPC 자동' },
      { rating: 3, examples: '금형 내 미스피드 센서 + 자동 정지\n금형 내 하사점 하중 센서 + 이상 시 자동 정지\n이중 송급 검출 센서 (Double Blank Detector) + 자동 정지\n금형 내 제품 잔류 감지 센서 + 자동 정지\nServo Press 하중-변위 곡선 실시간 감시 + 이탈 시 자동 정지' },
      { rating: 2, examples: 'Poka-Yoke: 소재 두께 자동 검출 + 규격외 투입 차단\nPoka-Yoke: 소재 방향 센서 + 오투입 시 프레스 정지\nServo Press 하중 제어 + 이상 조건 시 성형 중단\nCoil 재질 자동 판별 (바코드/RFID) + 불일치 시 차단' },
      { rating: 1, examples: '금형 구조상 불량 생성 불가 (Pilot Pin/가이드 구조)\n소재 폭 제한 가이드로 오투입 물리적 불가\n금형 비대칭 설계로 좌우 오삽입 원천 차단' },
    ],
  },
  {
    id: INDUSTRY_IDS.PCB_SMT,
    nameKr: 'PCB/SMT',
    nameEn: 'PCB & SMT Assembly',
    data: [
      { rating: 10, examples: '검출방법 없음\nBGA 하부 솔더 접합 내부 Void\n다층 PCB 내층 단선/단락' },
      { rating: 9, examples: '작업자 산발적 육안검사\n비정기 기판 외관 확인\n로트 단위 무작위 발췌 확인' },
      { rating: 8, examples: '확대경 육안검사 (미숙련자, 2~5x)\n스테레오 현미경 (20~40x, 미숙련자)\n디지털 멀티미터 (Fluke 87V) 수동 도통\nLCR 미터 수동 부품 측정 (미숙련자)\n납땜 상태 촉감 확인\n솔더링 인두 온도계 수동 확인' },
      { rating: 7, examples: 'SPI 솔더 페이스트 검사 (Koh Young, 미검증 레시피)\nAOI 자동광학검사 (Omron VT-S730, 미검증)\nX-ray 검사 (Nordson DAGE, 미검증)\nFlying Probe Tester (미검증 프로그램)\nBoundary Scan (JTAG, 미검증 벡터)\nThermal Profiler (KIC, 미검증 조건)' },
      { rating: 6, examples: '확대경/현미경 육안검사 (숙련자, IPC-A-610 기준)\n디지털 멀티미터 (숙련자, 도통/저항 검사)\nLCR 미터 (Keysight E4980A) 부품 특성 확인\n오실로스코프 (Keysight MSOX4000) 신호 파형\n전원공급기 부하 시험 수동 (Keysight E36300)\n열화상 카메라 (FLIR) 발열 이상 확인\n네트워크 분석기 (VNA) RF 특성 측정\nHi-Pot Tester 내전압 시험 수동\n접지저항 측정기 수동 측정' },
      { rating: 5, examples: 'SPI 검사 샘플링 (Koh Young KY-8030, 검증 완료)\nAOI 검사 샘플링 (Koh Young Zenith, 검증 완료)\nX-ray 검사 샘플링 (BGA Void 확인, 검증 완료)\nFlying Probe Tester 샘플링 (검증 프로그램)\nICT In-Circuit Tester 샘플링 (Keysight i3070)\nBoundary Scan (JTAG, 검증 벡터)\nImpedance Analyzer (Keysight E4990A) 샘플링' },
      { rating: 4, examples: 'AOI 전수검사 + 자동 NG 분류 (Koh Young Zenith)\nICT 전수검사 + 자동 Pass/Fail (Keysight i3070)\nFCT 기능시험 전수 + 자동 불합격 분류\nX-ray 전수검사 + 자동 Void 판정 (Nordson DAGE XD7800)\nBurn-in 시험 전수 + 자동 불량 검출' },
      { rating: 3, examples: 'SPI + AOI + X-ray 다단계 In-line 전수검사\nAOI 전수 + Review Station + MES 연동 자동 Hold\nICT + FCT 이중검사 + 자동 불합격 분리\nReflow 프로파일 실시간 모니터링 + 이탈 시 자동 정지 (KIC)\nPick & Place 부품 인식 카메라 + 이상 시 자동 정지' },
      { rating: 2, examples: 'Poka-Yoke: Feeder 부품 바코드 자동 검증 + 불일치 시 정지\nPoka-Yoke: PCB 방향 자동 인식 + 오투입 시 차단\nStencil 자동 인식 + 기판 불일치 시 인쇄 차단\nReflow 온도 Interlock + 기준 미달 시 투입 차단' },
      { rating: 1, examples: 'PCB 설계적 원천 차단 (BGA 패드 미배치로 오실장 불가)\n커넥터 Keying 설계로 오삽입 물리적 불가\n극성 표시 + 비대칭 패드 설계로 역삽 원천 차단' },
    ],
  },
];

/** 업종ID로 검출방법 사례 조회 */
export function getDetectionExamples(industryId: string, rating: number): string {
  const industry = INDUSTRY_LIST.find(i => i.id === industryId);
  if (!industry) return '';
  const item = industry.data.find(d => d.rating === rating);
  return item?.examples || '';
}

/** 전체 업종 이름 목록 (드롭다운용) */
export function getIndustryNames(): { id: string; nameKr: string; nameEn: string }[] {
  return INDUSTRY_LIST.map(({ id, nameKr, nameEn }) => ({ id, nameKr, nameEn }));
}
