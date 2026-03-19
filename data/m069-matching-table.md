# pfm26-m069 구조분석→최적화 UUID/PG/PK/SW 매칭표
> 생성: 2026-03-18T23:46:08.606Z | Schema: `pfmea_pfm26_m069`

## 1. 엔티티 카운트
| 단계 | 엔티티 | 수량 | PG 테이블 |
|------|--------|------|-----------|
| L1 | L1Structure | **1** | l1_structures |
| L1 | L1Function | **17** | l1_functions |
| L1 | FailureEffect(FE) | **20** | failure_effects |
| L2 | L2Structure | **21** | l2_structures |
| L2 | L2Function | **26** | l2_functions |
| L2 | ProcessProductChar | **143** | process_product_chars |
| L2 | FailureMode(FM) | **26** | failure_modes |
| L3 | L3Structure | **91** | l3_structures |
| L3 | L3Function | **117** | l3_functions |
| L3 | FailureCause(FC) | **117** | failure_causes |
| FK | FailureLink | **118** | failure_links |
| 분석 | FailureAnalysis | **0** | failure_analyses |
| 위험 | RiskAnalysis | **118** | risk_analyses |
| 최적화 | Optimization | **0** | optimizations |

## 2. L1 완제품 (구조분석 최상위)
| L1 UUID | 이름 |
|---------|------|
| `PF-L1-YP` | 12INCH AU BUMP |

### 2.1 L1Function → FailureEffect
| L1Func | 구분 | 기능 | 요구사항 | FE UUID | 고장영향 | S |
|--------|------|------|----------|---------|----------|---|
| `PF-L1-SP` | SP | 고객 기능 안정성을 위한 Au 순도 및 IMC | IMC 두께 고객 규격(IMC Thi | `PF-L1-SP` | IMC 과성장에 의한 접합부 열화 | 5 |
| `PF-L1-SP` | SP | 고객 기능 안정성을 위한 Au 순도 및 IMC | 포장 기준 적합성(Packaging  | `PF-L1-SP` | Particle 오염 불량 유출로 인한 고객  | 5 |
| `PF-L1-SP` | SP | 고객 기능 안정성을 위한 Au 순도 및 IMC | Au 순도 고객 규격(Au Purit | `PF-L1-SP` | 라벨 불일치로 인한 Lot 혼입 불량 유출 | 5 |
| `PF-L1-SP` | SP | 고객 납품 기준(높이·외관·포장)을 충족하는  | Au Bump 높이 고객 출하 규격( | `PF-L1-SP` | 외관 결함 불량 유출(고객 Outgoing D | 4 |
| `PF-L1-SP` | SP | 고객 납품 기준(높이·외관·포장)을 충족하는  | Au Bump 외관 고객 기준(Cus | `PF-L1-SP` | 고객 Packing 기준 부적합으로 인한 납품 | 5 |
| `PF-L1-SP` | SP | 고객 납품 기준(높이·외관·포장)을 충족하는  | 고객 납품 파티클 기준(Custome | `PF-L1-SP` | IMC 두께 Spec Out으로 인한 접합부  | 7 |
| `PF-L1-US` | USER | 최종 사용자 전기적·기계적 신뢰성 기준을 충족 | Au Bump 전기적 신뢰성 기준(E | `PF-L1-US` | 고객 라인 정지, 클레임 | 6 |
| `PF-L1-US` | USER | 최종 사용자 전기적·기계적 신뢰성 기준을 충족 | ESD 민감도 기준(ESD Sensi | `PF-L1-US` | 고객 신뢰도 하락 | 7 |
| `PF-L1-US` | USER | RoHS 등 환경·안전 규제 기준을 준수하는  | RoHS 유해물질 기준 적합성(RoH | `PF-L1-US` | RoHS 부적합으로 인한 리콜·법적 조치 | 9 |
| `PF-L1-YP` | YP | Wafer 청정도(파티클 수)가 공정 기준을  | PR 두께 규격(PR Thicknes | `PF-L1-YP` | Particle 오염으로 인한 제품 특성 이상 | 5 |
| `PF-L1-YP` | YP | Wafer 청정도(파티클 수)가 공정 기준을  | UBM 두께 규격(UBM Thickn | `PF-L1-YP` | Wafer 표면 결함 미검출로 인한 후공정 유 | 5 |
| `PF-L1-YP` | YP | Wafer 청정도(파티클 수)가 공정 기준을  | CD 규격(Critical Dimen | `PF-L1-YP` | Lot 혼입으로 인한 Wafer 수율 손실 | 7 |
| `PF-L1-YP` | YP | UBM·PR·Etch 공정특성이 규격을 충족하 | PR 잔사 허용 기준(PR Resid | `PF-L1-YP` | 전기적 Open/Short | 5 |
| `PF-L1-YP` | YP | UBM·PR·Etch 공정특성이 규격을 충족하 | Seed 잔류물 허용 기준(Seed  | `PF-L1-YP` | Bump Lift-off | 7 |
| `PF-L1-YP` | YP | UBM·PR·Etch 공정특성이 규격을 충족하 | Au Bump 높이 규격(Bump H | `PF-L1-YP` | PR 두께 Spec Out으로 인한 패턴 불량 | 5 |
| `PF-L1-YP` | YP | Au Bump 제품특성(높이·순도·외관)이 자 | Au Bump 외관 결함 기준(Vis | `PF-L1-YP` | Bump간 Bridge | 5 |
| `PF-L1-YP` | YP | Au Bump 제품특성(높이·순도·외관)이 자 | 파티클 수 허용 기준(Max Part | `PF-L1-YP` | Bump Height Spec Out으로 인한 | 5 |
| ↑|↑|↑|↑ | `PF-L1-YP` | CD Spec Out으로 인한 Bump 형성  | 5 |
| ↑|↑|↑|↑ | `PF-L1-YP` | Plating 균일도 Spec Out으로 인한 | 4 |
| ↑|↑|↑|↑ | `PF-L1-YP` | PR Scum 잔류로 인한 Au Bump 형성 | 5 |

## 3. L2 공정
| No | L2 UUID | 공정명 | L2Func | 제품특성(PPC) | FM UUID | 고장형태 |
|----|---------|--------|--------|---------------|---------|----------|
| 01 | `PF-L2-00` | 작업환경 | 클린룸 환경을 온습도·청정도 | 습도(Humidity, %R | `PF-L2-00` | 파티클 초과 |
| ↑|↑|↑ |  | 온도(Temperature, | | |
| ↑|↑|↑ |  | 작업 숙련도 | | |
| ↑|↑|↑ |  | 파티클 수 | | |
| ↑|↑|↑ |  | 풍속(Air Velocity | | |
| ↑|↑|↑ |  | FFU가 청정 공기를 순환· | | |
| ↑|↑|↑ |  | 풍속(Air Velocity | | |
| ↑|↑|↑ |  | 청정도 등급(ISO Clas | | |
| ↑|↑|↑ |  | 자재 규격 기준(Materi | | |
| 10 | `PF-L2-01` | IQA(수입검사) | IQA(입고검사)를 통해 입 | Wafer 두께(Wafer  | `PF-L2-01` | 두께 규격 이탈 |
| ↑|↑|↑ | IQA(입고검사)를 통해 입 | 검사 숙련도 | `PF-L2-01` | TTV 규격 초과 |
| ↑|↑|↑ |  | 측정 정밀도(Accuracy | | |
| ↑|↑|↑ |  | 청정도 등급(ISO Clas | | |
| ↑|↑|↑ |  | Wafer TTV(Total | | |
| ↑|↑|↑ |  | 표면 결함 밀도(Defect | | |
| ↑|↑|↑ |  | 광학 해상도(Optical  | | |
| ↑|↑|↑ |  | HIGH POWER SCOP | | |
| ↑|↑|↑ |  | 광학 해상도(Optical  | | |
| 20 | `PF-L2-02` | Sorter | Sorter 장비를 이용하여 | 인식 정확도(Recognit | `PF-L2-02` | OCR ID 오인식 또는 Lot 혼입 |
| ↑|↑|↑ | Sorter 장비를 이용하여 | OCR ID 인식 정확도 | `PF-L2-02` | Wafer 정렬 불량 |
| ↑|↑|↑ |  | Wafer 정렬 정확도 | | |
| ↑|↑|↑ |  | 작업 숙련도 | | |
| ↑|↑|↑ |  | 정렬 반복 정밀도(Repea | | |
| ↑|↑|↑ |  | 인식 정확도(Recognit | | |
| ↑|↑|↑ |  | OCR Reader가 Waf | | |
| ↑|↑|↑ |  | 자재 규격 기준(Materi | | |
| ↑|↑|↑ |  | 청정도 등급(ISO Clas | | |
| 30 | `PF-L2-03` | Scrubber | Scrubber 장비로 Wa | 청정도 등급(ISO Clas | `PF-L2-03` | Wafer 표면 이물 잔류(Parti |
| ↑|↑|↑ |  | 비저항(Resistivity | | |
| ↑|↑|↑ |  | 파티클 잔류수(Particl | | |
| ↑|↑|↑ |  | 분사 압력(Spray Pre | | |
| ↑|↑|↑ |  | 작업 숙련도 | | |
| 40 | `PF-L2-04` | UBM Sputter | Sputter 장비로 Waf | 막질 균일도(Film Uni ◇ | `PF-L2-04` | UBM 두께 부족(Thickness  |
| ↑|↑|↑ | Sputter 장비로 Waf | UBM 두께(UBM Thic ◇ | `PF-L2-04` | 막질 불균일(Film Non-unif |
| ↑|↑|↑ |  | DC Power Supply | | |
| ↑|↑|↑ |  | Cu Target이 스퍼터링 | | |
| ↑|↑|↑ |  | Target 두께 잔량(Re | | |
| ↑|↑|↑ |  | Target 두께 잔량(Re | | |
| ↑|↑|↑ |  | 진공도(Base Pressu | | |
| ↑|↑|↑ |  | Au Thickness(Å) ◇ | | |
| ↑|↑|↑ |  | TiW Thickness(Å ◇ | | |
| ↑|↑|↑ |  | 증착 속도(Depositio | | |
| ↑|↑|↑ |  | DC Power(kW) | | |
| ↑|↑|↑ |  | 전압 안정도(Voltage  | | |
| ↑|↑|↑ |  | RF Etch Amount( ◇ | | |
| ↑|↑|↑ |  | 작업 숙련도 | | |
| ↑|↑|↑ |  | 전압 안정도(Voltage  | | |
| 50 | `PF-L2-05` | Scrubber2 | UBM Sputter 후 W | 파티클 잔류수(Particl | `PF-L2-05` | Wafer 표면 이물 잔류(Parti |
| ↑|↑|↑ |  | 작업 숙련도 | | |
| ↑|↑|↑ |  | 청정도 등급(ISO Clas | | |
| ↑|↑|↑ |  | 비저항(Resistivity | | |
| ↑|↑|↑ |  | 분사 압력(Spray Pre | | |
| 60 | `PF-L2-06` | PR Coating | Coater 장비로 Wafe | 점도(Viscosity, c | `PF-L2-06` | PR 두께 불균일(PR Thickne |
| ↑|↑|↑ |  | PR 두께(PR Thickn | | |
| ↑|↑|↑ |  | 작업 숙련도 | | |
| ↑|↑|↑ |  | 회전 속도(RPM) | | |
| ↑|↑|↑ |  | 청정도 등급(ISO Clas | | |
| 70 | `PF-L2-07` | Exposure | Stepper/Scanner | 작업 숙련도 | `PF-L2-07` | CD 규격 이탈(CD Out of S |
| ↑|↑|↑ |  | 노광 에너지(UV Energ | | |
| ↑|↑|↑ |  | CD 정밀도(Reticle  | | |
| ↑|↑|↑ |  | CD(Critical Dim | | |
| ↑|↑|↑ |  | 청정도 등급(ISO Clas | | |
| 80 | `PF-L2-08` | Develop | Developer로 노광된  | TMAH 농도(Concent | `PF-L2-08` | Under/Over develop(O |
| ↑|↑|↑ |  | 작업 숙련도 | | |
| ↑|↑|↑ |  | 현상 시간(Develop T | | |
| ↑|↑|↑ |  | 청정도 등급(ISO Clas | | |
| ↑|↑|↑ |  | Opening 정확도(Ope | | |
| 90 | `PF-L2-09` | Descum | Descum 장비로 O₂ P | PR 잔사 수(Scum Co | `PF-L2-09` | PR Scum 잔류(Descum 불완 |
| ↑|↑|↑ |  | Gas 유량(Flow Rat | | |
| ↑|↑|↑ |  | 청정도 등급(ISO Clas | | |
| ↑|↑|↑ |  | 작업 숙련도 | | |
| ↑|↑|↑ |  | O₂ Plasma Power | | |
| 100 | `PF-L2-10` | Au Plating | Au Plating Tank | 도금 시간(Plating T ★ | `PF-L2-10` | Au Bump 높이 편차(Height |
| ↑|↑|↑ | Au Plating Tank | 출력 전류(Output Cu ★ | `PF-L2-10` | Au 순도 저하(Purity Degr |
| ↑|↑|↑ |  | 청정도 등급(ISO Clas ★ | | |
| ↑|↑|↑ |  | Au 순도(Au Purity ★ | | |
| ↑|↑|↑ |  | Au Bump 높이(Bump ★ | | |
| ↑|↑|↑ |  | Au 이온 농도(Au Con ★ | | |
| ↑|↑|↑ |  | 출력 전류(Output Cu | | |
| ↑|↑|↑ |  | 정류기(Rectifier)가 | | |
| ↑|↑|↑ |  | 작업 숙련도 ★ | | |
| ↑|↑|↑ |  | 도금 전류밀도(Current ★ | | |
| ↑|↑|↑ |  | 도금 균일도(Plating  | | |
| 110 | `PF-L2-11` | PR Strip | Strip 장비로 도금 후  | Strip 온도(Temper | `PF-L2-11` | PR 잔사 잔류(Strip 불완전) |
| ↑|↑|↑ |  | 용제 농도(Concentra | | |
| ↑|↑|↑ |  | PR 잔사(Strip Res | | |
| ↑|↑|↑ |  | 청정도 등급(ISO Clas | | |
| ↑|↑|↑ |  | 작업 숙련도 | | |
| 120 | `PF-L2-12` | Au Etch | Au Etchant를 이용하 | Au Etch Rate(Å/ ◇ | `PF-L2-12` | 에칭 부족/과다(Under/Over  |
| ↑|↑|↑ |  | 에칭 잔류물(Etch Res ◇ | | |
| ↑|↑|↑ |  | 작업 숙련도 | | |
| ↑|↑|↑ |  | 식각 시간(Etch Time | | |
| ↑|↑|↑ |  | Etchant 농도(Conc | | |
| ↑|↑|↑ |  | H₂O₂ Etch Rate( ◇ | | |
| ↑|↑|↑ |  | 청정도 등급(ISO Clas | | |
| 130 | `PF-L2-13` | TiW Etch | TiW Etchant를 이용 | Etchant 농도(Conc | `PF-L2-13` | TiW Etch 후 잔류 Film 이 |
| ↑|↑|↑ |  | 청정도 등급(ISO Clas | | |
| ↑|↑|↑ |  | Seed 잔류물(Seed R ◇ | | |
| ↑|↑|↑ |  | 작업 숙련도 | | |
| ↑|↑|↑ |  | 식각 온도(Etch Temp | | |
| ↑|↑|↑ |  | Etch Rate(Å/min ◇ | | |
| 140 | `PF-L2-14` | Anneal | Anneal 장비로 열처리하 | 열처리 시간(Anneal T | `PF-L2-14` | IMC 과성장(IMC Overgrow |
| ↑|↑|↑ |  | 열처리 온도(Anneal T | | |
| ↑|↑|↑ |  | IMC 두께(IMC Thic | | |
| ↑|↑|↑ |  | 작업 숙련도 | | |
| ↑|↑|↑ |  | N₂ 유량(Flow Rate | | |
| ↑|↑|↑ |  | 자재 규격 기준(Materi | | |
| 150 | `PF-L2-15` | Final Inspection | AVI 장비 및 높이 측정기 | Bump 외관 결함(Visu ★ | `PF-L2-15` | Bump 외관 불량(Visual De |
| ↑|↑|↑ | AVI 장비 및 높이 측정기 | Bump 높이(Bump He ★ | `PF-L2-15` | Bump 높이 규격 이탈(Height |
| ↑|↑|↑ |  | 검사 숙련도 ★ | | |
| ↑|↑|↑ |  | 해상도(Resolution, ★ | | |
| ↑|↑|↑ |  | 측정 정밀도(Accuracy ★ | | |
| ↑|↑|↑ |  | 공간적 균일도 측정 정밀도( ★ | | |
| ↑|↑|↑ |  | 높이 측정기가 Bump 높이 | | |
| ↑|↑|↑ |  | 측정 정밀도(Accuracy | | |
| ↑|↑|↑ |  | 공간적 균일도 측정 정밀도( | | |
| ↑|↑|↑ |  | 자재 규격 기준(Materi ★ | | |
| ↑|↑|↑ |  | 청정도 등급(ISO Clas ★ | | |
| 160 | `PF-L2-16` | Clean | Clean 장비로 Wafer | 작업 숙련도 | `PF-L2-16` | Wafer 표면 이물 잔류(Parti |
| ↑|↑|↑ |  | 분사 압력(Spray Pre | | |
| ↑|↑|↑ |  | 비저항(Resistivity | | |
| ↑|↑|↑ |  | 청정도 등급(ISO Clas | | |
| ↑|↑|↑ |  | 파티클 잔류수(Particl | | |
| 170 | `PF-L2-17` | Scrubber3 | Scrubber3 장비로 최 | 작업 숙련도 | `PF-L2-17` | Wafer 표면 이물 잔류(Parti |
| ↑|↑|↑ |  | 비저항(Resistivity | | |
| ↑|↑|↑ |  | 청정도 등급(ISO Clas | | |
| ↑|↑|↑ |  | 파티클 잔류수(Particl | | |
| ↑|↑|↑ |  | 분사 압력(Spray Pre | | |
| 180 | `PF-L2-18` | Sorter3 | Sorter3 장비로 Waf | 정렬 반복 정밀도(Repea | `PF-L2-18` | Wafer 정렬 불량 |
| ↑|↑|↑ |  | Wafer 정렬 정확도 | | |
| ↑|↑|↑ |  | 청정도 등급(ISO Clas | | |
| ↑|↑|↑ |  | 작업 숙련도 | | |
| ↑|↑|↑ |  | 자재 규격 기준(Materi | | |
| 190 | `PF-L2-19` | AVI | AVI 장비로 Wafer 전 | 자재 규격 기준(Materi | `PF-L2-19` | AVI 검사 불량 미검출(Visual |
| ↑|↑|↑ |  | 청정도 등급(ISO Clas | | |
| ↑|↑|↑ |  | Defect 수(Defect | | |
| ↑|↑|↑ |  | 검사 숙련도 | | |
| ↑|↑|↑ |  | 해상도(Resolution, | | |
| 200 | `PF-L2-20` | OGI/Packing | 포장 장비 및 절차에 따라  | 작업 숙련도 | `PF-L2-20` | 포장 불량(Packaging Defe |
| ↑|↑|↑ |  | 자재 규격 기준(Materi | | |
| ↑|↑|↑ |  | 청정도 등급(ISO Clas | | |
| ↑|↑|↑ |  | 포장 상태(Packaging | | |
| ↑|↑|↑ |  | 진공 압력(Vacuum Pr | | |

## 4. L3 작업요소
| 공정No | L3 UUID | 작업요소 | 4M | L3Func | 공정특성 | FC UUID | 고장원인 |
|--------|---------|----------|----|--------|----------|---------|----------|
| 01 | `PF-L3-00` | 클린룸 | EN | 클린룸이 외부 오염을 차단하 | 풍속(Air Veloc | `PF-L3-00` | FFU가 청정 공기를 순환·공급하여  |
| ↑|↑|↑|↑ | FFU가 청정 공기를 순환· | FFU가 청정 공기를  | `PF-L3-00` | 풍속(Air Velocity, m/s |
| ↑|↑|↑|↑ | 클린룸이 외부 오염을 차단하 | 청정도 등급(ISO C | `PF-L3-00` | 온습도 제어 이탈 |
| 01 | `PF-L3-00` | FFU(Fan Filter U | EN | FFU가 청정 공기를 순환· | 풍속(Air Veloc | `PF-L3-00` | 풍속 저하 |
| 01 | `PF-L3-00` | HEPA 필터 소모품 | IM | HEPA 필터가 유입 공기를 | 자재 규격 기준(Mat | `PF-L3-00` | HEPA 필터 성능 저하 |
| 01 | `PF-L3-00` | 항온항습기 | MC | 항온항습기가 클린룸 온습도를 | 온도(Temperatu | `PF-L3-00` | 설비 가동률 저하 |
| ↑|↑|↑|↑ | 항온항습기가 클린룸 온습도를 | 습도(Humidity, | `PF-L3-00` | 습도(Humidity, %RH) 부적 |
| 01 | `PF-L3-00` | 클린룸 담당자 | MN | 클린룸 담당자가 온습도·파티 | 작업 숙련도 | `PF-L3-00` | 작업 숙련도 부족 |
| 10 | `PF-L3-01` | 검사실 | EN | 검사실이 조도·청정도를 유지 | 청정도 등급(ISO C | `PF-L3-01` | 환경 조건 이탈 |
| 10 | `PF-L3-01` | 입고 Wafer | IM | 입고 Wafer가 공정 투입 | 표면 결함 밀도(Def | `PF-L3-01` | 자재 품질 부적합 |
| 10 | `PF-L3-01` | 두께 측정기 | MC | HIGH POWER SCOP | HIGH POWER S | `PF-L3-01` | HIGH POWER SCOPE가 Wa |
| ↑|↑|↑|↑ | 두께 측정기가 Wafer 두 | 측정 정밀도(Accur | `PF-L3-01` | 측정 오차 |
| ↑|↑|↑|↑ | 두께 측정기가 Wafer 두 | 광학 해상도(Optic | `PF-L3-01` | 광학 해상도(Optical Resol |
| 10 | `PF-L3-01` | HIGH POWER SCOPE | MC | HIGH POWER SCOP | 광학 해상도(Optic | `PF-L3-01` | 광학 해상도(Optical Resol |
| 10 | `PF-L3-01` | IQA 검사원 | MN | IQA 검사원이 입고 Waf | 검사 숙련도 | `PF-L3-01` | 판정 기준 오적용 |
| 20 | `PF-L3-02` | Sorter 작업영역 | EN | Sorter 작업영역이 ES | 청정도 등급(ISO C | `PF-L3-02` | 환경 조건 이탈 |
| 20 | `PF-L3-02` | Wafer Cassette | IM | Wafer Cassette가 | 자재 규격 기준(Mat | `PF-L3-02` | 자재 품질 부적합 |
| 20 | `PF-L3-02` | OCR Reader | MC | OCR Reader가 Waf | 인식 정확도(Recog | `PF-L3-02` | OCR 인식 오류 |
| 20 | `PF-L3-02` | Sorter 장비 | MC | Sorter 장비가 Wafe | 인식 정확도(Recog | `PF-L3-02` | 정렬 센서 오작동 |
| ↑|↑|↑|↑ | Sorter 장비가 Wafe | 정렬 반복 정밀도(Re | `PF-L3-02` | OCR Reader가 Wafer ID |
| ↑|↑|↑|↑ | OCR Reader가 Waf | OCR Reader가  | `PF-L3-02` | 인식 정확도(Recognition R |
| 20 | `PF-L3-02` | Sorter 작업자 | MN | Sorter 작업자가 카세트 | 작업 숙련도 | `PF-L3-02` | 작업 숙련도 부족 |
| 30 | `PF-L3-03` | Scrubber 작업영역 | EN | Scrubber 작업영역이  | 청정도 등급(ISO C | `PF-L3-03` | 환경 조건 이탈 |
| 30 | `PF-L3-03` | DI Water | IM | DI Water가 Wafer | 비저항(Resistiv | `PF-L3-03` | DI Water 비저항 저하 |
| 30 | `PF-L3-03` | Scrubber 장비 | MC | Scrubber 장비가 DI | 분사 압력(Spray  | `PF-L3-03` | 노즐 막힘 |
| 30 | `PF-L3-03` | Scrubber 작업자 | MN | Scrubber 작업자가 세 | 작업 숙련도 | `PF-L3-03` | 작업 숙련도 부족 |
| 40 | `PF-L3-04` | 진공 챔버 | EN | 진공 챔버가 고진공 환경을  | 진공도(Base Pre | `PF-L3-04` | 진공 누설 |
| 40 | `PF-L3-04` | Ti Target | IM | Cu Target이 스퍼터링 | Cu Target이 스 | `PF-L3-04` | Cu Target이 스퍼터링 소재를  |
| ↑|↑|↑|↑ | Ti Target이 스퍼터링 | Target 두께 잔량 | `PF-L3-04` | Target 두께 잔량(Remaini |
| 40 | `PF-L3-04` | Cu Target | IM | Cu Target이 스퍼터링 | Target 두께 잔량 | `PF-L3-04` | Target 소진 |
| 40 | `PF-L3-04` | DC Power Supply | MC | DC Power Supply | 전압 안정도(Volta | `PF-L3-04` | 전압 안정도(Voltage Stabi |
| 40 | `PF-L3-04` | Sputter 장비 | MC | DC Power Supply | DC Power Sup | `PF-L3-04` | TiW 증착 두께 편차 |
| ↑|↑|↑|↑ | Sputter 장비가 Ti/ | RF Etch Amou ◇ | `PF-L3-04` | DC Power Supply가 안정적 |
| ↑|↑|↑|↑ | Sputter 장비가 Ti/ | DC Power(kW) | `PF-L3-04` | Power 변동 |
| ↑|↑|↑|↑ | Sputter 장비가 Ti/ | 증착 속도(Deposi | `PF-L3-04` | 전압 변동 |
| ↑|↑|↑|↑ | Sputter 장비가 Ti/ | TiW Thicknes ◇ | `PF-L3-04` | RF Etch Amount 규격 이탈 |
| ↑|↑|↑|↑ | Sputter 장비가 Ti/ | Au Thickness ◇ | `PF-L3-04` | Au 증착 두께 편차 |
| ↑|↑|↑|↑ | Sputter 장비가 Ti/ | 전압 안정도(Volta | `PF-L3-04` | 전압 안정도(Voltage Stabi |
| 40 | `PF-L3-04` | Sputter 작업자 | MN | Sputter 작업자가 Re | 작업 숙련도 | `PF-L3-04` | 작업 숙련도 부족 |
| 50 | `PF-L3-05` | Scrubber2 작업영역 | EN | Scrubber2 작업영역이 | 청정도 등급(ISO C | `PF-L3-05` | 환경 조건 이탈 |
| 50 | `PF-L3-05` | DI Water | IM | DI Water가 Wafer | 비저항(Resistiv | `PF-L3-05` | DI Water 비저항 저하 |
| 50 | `PF-L3-05` | Scrubber 장비 | MC | Scrubber 장비가 DI | 분사 압력(Spray  | `PF-L3-05` | 노즐 막힘 |
| 50 | `PF-L3-05` | Scrubber2 작업자 | MN | Scrubber2 작업자가  | 작업 숙련도 | `PF-L3-05` | 작업 숙련도 부족 |
| 60 | `PF-L3-06` | Yellow Room | EN | Yellow Room이 UV | 청정도 등급(ISO C | `PF-L3-06` | 환경 조건 이탈 |
| 60 | `PF-L3-06` | PR(Photo Resist) | IM | PR(Photo Resist | 점도(Viscosity | `PF-L3-06` | PR 열화 |
| 60 | `PF-L3-06` | Coater | MC | Coater가 Wafer를  | 회전 속도(RPM) | `PF-L3-06` | RPM 편차 |
| 60 | `PF-L3-06` | Coating 작업자 | MN | Coating 작업자가 Co | 작업 숙련도 | `PF-L3-06` | 작업 숙련도 부족 |
| 70 | `PF-L3-07` | Exposure 챔버 | EN | Exposure 챔버가 온습 | 청정도 등급(ISO C | `PF-L3-07` | 환경 조건 이탈 |
| 70 | `PF-L3-07` | Mask(Reticle) | IM | Mask(Reticle)이  | CD 정밀도(Retic | `PF-L3-07` | Mask 결함 |
| 70 | `PF-L3-07` | Stepper/Scanner | MC | Stepper/Scanner | 노광 에너지(UV En | `PF-L3-07` | 에너지 편차 |
| 70 | `PF-L3-07` | Exposure 작업자 | MN | Exposure 작업자가 M | 작업 숙련도 | `PF-L3-07` | 작업 숙련도 부족 |
| 80 | `PF-L3-08` | Develop 작업영역 | EN | Develop 작업영역이 온 | 청정도 등급(ISO C | `PF-L3-08` | 환경 조건 이탈 |
| 80 | `PF-L3-08` | 현상액(TMAH) | IM | 현상액(TMAH)이 노광 P | TMAH 농도(Conc | `PF-L3-08` | 농도 편차 |
| 80 | `PF-L3-08` | Developer | MC | Developer가 현상액을 | 현상 시간(Develo | `PF-L3-08` | 현상 시간 편차 |
| 80 | `PF-L3-08` | Develop 작업자 | MN | Develop 작업자가 현상 | 작업 숙련도 | `PF-L3-08` | 작업 숙련도 부족 |
| 90 | `PF-L3-09` | Descum 챔버 | EN | Descum 챔버가 균일한  | 청정도 등급(ISO C | `PF-L3-09` | 환경 조건 이탈 |
| 90 | `PF-L3-09` | O₂ Gas | IM | O₂ Gas가 Plasma  | Gas 유량(Flow  | `PF-L3-09` | Gas 유량 편차 |
| 90 | `PF-L3-09` | Descum 장비 | MC | Descum 장비가 O₂ P | O₂ Plasma Po | `PF-L3-09` | Power 불안정 |
| 90 | `PF-L3-09` | Descum 작업자 | MN | Descum 작업자가 O₂  | 작업 숙련도 | `PF-L3-09` | 작업 숙련도 부족 |
| 100 | `PF-L3-10` | Plating 작업영역 | EN | Plating 작업영역이 온 | 청정도 등급(ISO C ★ | `PF-L3-10` | 환경 조건 이탈 |
| 100 | `PF-L3-10` | Au 도금액(Au Ion So | IM | Au 도금액(Au Ion S | Au 이온 농도(Au  ★ | `PF-L3-10` | 농도 저하 |
| 100 | `PF-L3-10` | Au Plating Tank | MC | Au Plating Tank | 도금 균일도(Plati | `PF-L3-10` | 도금 균일도 편차 |
| ↑|↑|↑|↑ | Au Plating Tank | 도금 전류밀도(Curr ★ | `PF-L3-10` | 전류밀도 편차 |
| ↑|↑|↑|↑ | Au Plating Tank | 도금 시간(Platin ★ | `PF-L3-10` | 전류 변동 |
| ↑|↑|↑|↑ | Au Plating Tank | 출력 전류(Output ★ | `PF-L3-10` | 정류기(Rectifier)가 안정적인 |
| ↑|↑|↑|↑ | 정류기(Rectifier)가 | 정류기(Rectifie | `PF-L3-10` | 출력 전류(Output Current |
| 100 | `PF-L3-10` | 정류기(Rectifier) | MC | 정류기(Rectifier)가 | 출력 전류(Output | `PF-L3-10` | 출력 전류(Output Current |
| 100 | `PF-L3-10` | Plating 작업자 | MN | Plating 작업자가 전류 | 작업 숙련도 ★ | `PF-L3-10` | 작업 숙련도 부족 |
| 110 | `PF-L3-11` | Strip 작업영역 | EN | Strip 작업영역이 환기· | 청정도 등급(ISO C | `PF-L3-11` | 환경 조건 이탈 |
| 110 | `PF-L3-11` | Strip 용제 | IM | Strip 용제가 PR을 용 | 용제 농도(Concen | `PF-L3-11` | 자재 품질 부적합 |
| 110 | `PF-L3-11` | Strip 장비 | MC | Strip 장비가 용제를 공 | Strip 온도(Tem | `PF-L3-11` | 온도 편차 |
| 110 | `PF-L3-11` | Strip 작업자 | MN | Strip 작업자가 Stri | 작업 숙련도 | `PF-L3-11` | 작업 숙련도 부족 |
| 120 | `PF-L3-12` | Etch 작업영역 | EN | Etch 작업영역이 약액 안 | 청정도 등급(ISO C | `PF-L3-12` | 환경 조건 이탈 |
| 120 | `PF-L3-12` | Au Etchant | IM | Au Etchant가 Au  | Etchant 농도(C | `PF-L3-12` | 자재 품질 부적합 |
| ↑|↑|↑|↑ | Au Etchant가 Au  | H₂O₂ Etch Ra ◇ | `PF-L3-12` | H₂O₂ 농도 편차에 의한 Etch  |
| 120 | `PF-L3-12` | Au Etch 장비 | MC | Au Etch 장비가 Au  | 식각 시간(Etch T | `PF-L3-12` | Au Etch Rate 편차 |
| ↑|↑|↑|↑ | Au Etch 장비가 Au  | Au Etch Rate ◇ | `PF-L3-12` | 에칭 시간 편차 |
| 120 | `PF-L3-12` | Au Etch 작업자 | MN | Au Etch 작업자가 식각 | 작업 숙련도 | `PF-L3-12` | 작업 숙련도 부족 |
| 130 | `PF-L3-13` | TiW Etch 작업영역 | EN | TiW Etch 작업영역이  | 청정도 등급(ISO C | `PF-L3-13` | 환경 조건 이탈 |
| 130 | `PF-L3-13` | TiW Etchant | IM | TiW Etchant가 Ti | Etchant 농도(C | `PF-L3-13` | 자재 품질 부적합 |
| 130 | `PF-L3-13` | TiW Etch 장비 | MC | TiW Etch 장비가 Ti | 식각 온도(Etch T | `PF-L3-13` | 온도 편차 |
| ↑|↑|↑|↑ | TiW Etch 장비가 Ti | Etch Rate(Å/ ◇ | `PF-L3-13` | Etch Rate 편차 |
| 130 | `PF-L3-13` | TiW Etch 작업자 | MN | TiW Etch 작업자가 식 | 작업 숙련도 | `PF-L3-13` | 작업 숙련도 부족 |
| 140 | `PF-L3-14` | N₂ 공급장치 | EN | N₂ 공급장치가 N₂ Gas | N₂ 유량(Flow R | `PF-L3-14` | 유량 부족 |
| 140 | `PF-L3-14` | N₂ Gas | IM | N₂ Gas가 불활성 분위기 | 자재 규격 기준(Mat | `PF-L3-14` | 자재 품질 부적합 |
| 140 | `PF-L3-14` | Anneal 장비 | MC | Anneal 장비가 설정 온 | 열처리 온도(Annea | `PF-L3-14` | 열처리 시간(Anneal Time,  |
| ↑|↑|↑|↑ | Anneal 장비가 설정 온 | 열처리 시간(Annea | `PF-L3-14` | 온도 과다/부족 |
| 140 | `PF-L3-14` | Anneal 작업자 | MN | Anneal 작업자가 온도· | 작업 숙련도 | `PF-L3-14` | 작업 숙련도 부족 |
| 150 | `PF-L3-15` | 검사실 | EN | 검사실이 조도·청정도를 유지 | 청정도 등급(ISO C ★ | `PF-L3-15` | 환경 조건 이탈 |
| 150 | `PF-L3-15` | 한도 견본 | IM | 한도 견본이 외관 판정 기준 | 자재 규격 기준(Mat ★ | `PF-L3-15` | 자재 품질 부적합 |
| 150 | `PF-L3-15` | AVI 장비 | MC | 높이 측정기가 Bump 높이 | 높이 측정기가 Bump | `PF-L3-15` | 공간적 균일도 측정 정밀도(Co-pl |
| ↑|↑|↑|↑ | AVI 장비가 Wafer 전 | 측정 정밀도(Accur ★ | `PF-L3-15` | 해상도 저하 |
| ↑|↑|↑|↑ | AVI 장비가 Wafer 전 | 해상도(Resoluti ★ | `PF-L3-15` | 측정 정밀도(Accuracy, μm) |
| ↑|↑|↑|↑ | AVI 장비가 Wafer 전 | 공간적 균일도 측정 정 ★ | `PF-L3-15` | 높이 측정기가 Bump 높이를 전수  |
| 150 | `PF-L3-15` | 높이 측정기 | MC | 높이 측정기가 Bump 높이 | 측정 정밀도(Accur | `PF-L3-15` | 측정 균일도 편차 |
| ↑|↑|↑|↑ | 높이 측정기가 Bump 높이 | 공간적 균일도 측정 정 | `PF-L3-15` | 측정 오차 |
| 150 | `PF-L3-15` | Final 검사원 | MN | Final 검사원이 AVI  | 검사 숙련도 ★ | `PF-L3-15` | 판정 기준 오적용 |
| 160 | `PF-L3-16` | Clean 작업영역 | EN | Clean 작업영역이 재오염 | 청정도 등급(ISO C | `PF-L3-16` | 환경 조건 이탈 |
| 160 | `PF-L3-16` | DI Water | IM | DI Water가 Wafer | 비저항(Resistiv | `PF-L3-16` | 자재 품질 부적합 |
| 160 | `PF-L3-16` | Clean 장비 | MC | Clean 장비가 DI Wa | 분사 압력(Spray  | `PF-L3-16` | 노즐 막힘 |
| 160 | `PF-L3-16` | Clean 작업자 | MN | Clean 작업자가 세정 조 | 작업 숙련도 | `PF-L3-16` | 작업 숙련도 부족 |
| 170 | `PF-L3-17` | Scrubber3 작업영역 | EN | Scrubber3 작업영역이 | 청정도 등급(ISO C | `PF-L3-17` | 환경 조건 이탈 |
| 170 | `PF-L3-17` | DI Water | IM | DI Water가 Wafer | 비저항(Resistiv | `PF-L3-17` | 자재 품질 부적합 |
| 170 | `PF-L3-17` | Scrubber 장비 | MC | Scrubber 장비가 DI | 분사 압력(Spray  | `PF-L3-17` | 노즐 막힘 |
| 170 | `PF-L3-17` | Scrubber3 작업자 | MN | Scrubber3 작업자가  | 작업 숙련도 | `PF-L3-17` | 작업 숙련도 부족 |
| 180 | `PF-L3-18` | Sorter3 작업영역 | EN | Sorter3 작업영역이 E | 청정도 등급(ISO C | `PF-L3-18` | 환경 조건 이탈 |
| 180 | `PF-L3-18` | Wafer Cassette | IM | Wafer Cassette가 | 자재 규격 기준(Mat | `PF-L3-18` | 자재 품질 부적합 |
| 180 | `PF-L3-18` | Sorter 장비 | MC | Sorter 장비가 Wafe | 정렬 반복 정밀도(Re | `PF-L3-18` | 정렬 센서 오작동 |
| 180 | `PF-L3-18` | Sorter3 작업자 | MN | Sorter3 작업자가 카세 | 작업 숙련도 | `PF-L3-18` | 작업 숙련도 부족 |
| 190 | `PF-L3-19` | AVI 작업영역 | EN | AVI 작업영역이 조도·진동 | 청정도 등급(ISO C | `PF-L3-19` | 환경 조건 이탈 |
| 190 | `PF-L3-19` | 한도 견본 | IM | 한도 견본이 AVI 기준 이 | 자재 규격 기준(Mat | `PF-L3-19` | 자재 품질 부적합 |
| 190 | `PF-L3-19` | AVI 장비 | MC | AVI 장비가 Wafer 전 | 해상도(Resoluti | `PF-L3-19` | 해상도 저하 |
| 190 | `PF-L3-19` | AVI 작업자 | MN | AVI 작업자가 AVI 결과 | 검사 숙련도 | `PF-L3-19` | 작업 숙련도 부족 |
| 200 | `PF-L3-20` | 포장 작업영역 | EN | 포장 작업영역이 ESD·파티 | 청정도 등급(ISO C | `PF-L3-20` | 환경 조건 이탈 |
| 200 | `PF-L3-20` | 포장재 | IM | 포장재가 Wafer를 외부  | 자재 규격 기준(Mat | `PF-L3-20` | 자재 품질 부적합 |
| 200 | `PF-L3-20` | 포장 장비 | MC | 포장 장비가 Wafer를 진 | 진공 압력(Vacuum | `PF-L3-20` | 진공 누설 |
| 200 | `PF-L3-20` | 포장 작업자 | MN | 포장 작업자가 포장 기준을  | 작업 숙련도 | `PF-L3-20` | 체크리스트 누락 |

## 5. FailureLink 고장사슬 (FK)
| Link | FM | 고장형태 | FE | 고장영향 | FC | 고장원인 | S |
|------|-----|---------|-----|---------|-----|---------|---|
| `01bc2fa9` | `PF-L2-02` | OCR ID 오인식 또는 Lot  | `PF-L1-YP` | Lot 혼입으로 인한 Wafer  | `PF-L3-02` | OCR Reader가 Wafer  | 7 |
| `5433f5bd` | `PF-L2-04` | UBM 두께 부족(Thicknes | `PF-L1-YP` | PR 두께 Spec Out으로 인 | `PF-L3-04` | Cu Target이 스퍼터링 소재 | 5 |
| `84cd474c` | `PF-L2-01` | 두께 규격 이탈 | `PF-L1-YP` | Particle 오염으로 인한 제 | `PF-L3-01` | HIGH POWER SCOPE가  | 5 |
| `auto-PF-` | `PF-L2-00` | 파티클 초과 | `PF-L1-YP` | PR 두께 Spec Out으로 인 | `PF-L3-00` | 풍속(Air Velocity, m | 5 |
| `auto-PF-` | `PF-L2-01` | 두께 규격 이탈 | `PF-L1-YP` | Particle 오염으로 인한 제 | `PF-L3-01` | 광학 해상도(Optical Res | 5 |
| `auto-PF-` | `PF-L2-02` | OCR ID 오인식 또는 Lot  | `PF-L1-YP` | Lot 혼입으로 인한 Wafer  | `PF-L3-02` | 인식 정확도(Recognition | 7 |
| `auto-PF-` | `PF-L2-04` | UBM 두께 부족(Thicknes | `PF-L1-YP` | PR 두께 Spec Out으로 인 | `PF-L3-04` | Target 두께 잔량(Remai | 5 |
| `auto-PF-` | `PF-L2-04` | UBM 두께 부족(Thicknes | `PF-L1-YP` | PR 두께 Spec Out으로 인 | `PF-L3-04` | 전압 안정도(Voltage Sta | 5 |
| `auto-PF-` | `PF-L2-10` | Au Bump 높이 편차(Heig | `PF-L1-SP` | Particle 오염 불량 유출로 | `PF-L3-10` | 출력 전류(Output Curre | 5 |
| `auto-PF-` | `PF-L2-15` | Bump 외관 불량(Visual  | `PF-L1-US` | 고객 신뢰도 하락 | `PF-L3-15` | 측정 정밀도(Accuracy, μ | 7 |
| `auto-PF-` | `PF-L2-15` | Bump 외관 불량(Visual  | `PF-L1-US` | 고객 신뢰도 하락 | `PF-L3-15` | 공간적 균일도 측정 정밀도(Co- | 7 |
| `e40b9c16` | `PF-L2-15` | Bump 외관 불량(Visual  | `PF-L1-US` | 고객 신뢰도 하락 | `PF-L3-15` | 높이 측정기가 Bump 높이를 전 | 7 |
| `ec21d651` | `PF-L2-10` | Au Bump 높이 편차(Heig | `PF-L1-SP` | Particle 오염 불량 유출로 | `PF-L3-10` | 정류기(Rectifier)가 안정 | 5 |
| `f17a0c18` | `PF-L2-00` | 파티클 초과 | `PF-L1-YP` | PR 두께 Spec Out으로 인 | `PF-L3-00` | FFU가 청정 공기를 순환·공급하 | 5 |
| `f96d4ec2` | `PF-L2-04` | UBM 두께 부족(Thicknes | `PF-L1-YP` | PR 두께 Spec Out으로 인 | `PF-L3-04` | DC Power Supply가 안 | 5 |
| `PF-FC-00` | `PF-L2-00` | 파티클 초과 | `PF-L1-YP` | PR 두께 Spec Out으로 인 | `PF-L3-00` | 온습도 제어 이탈 | 5 |
| `PF-FC-00` | `PF-L2-00` | 파티클 초과 | `PF-L1-YP` | PR 두께 Spec Out으로 인 | `PF-L3-00` | 풍속 저하 | 5 |
| `PF-FC-00` | `PF-L2-00` | 파티클 초과 | `PF-L1-YP` | PR 두께 Spec Out으로 인 | `PF-L3-00` | HEPA 필터 성능 저하 | 5 |
| `PF-FC-00` | `PF-L2-00` | 파티클 초과 | `PF-L1-YP` | PR 두께 Spec Out으로 인 | `PF-L3-00` | 설비 가동률 저하 | 5 |
| `PF-FC-00` | `PF-L2-00` | 파티클 초과 | `PF-L1-YP` | PR 두께 Spec Out으로 인 | `PF-L3-00` | 습도(Humidity, %RH)  | 5 |
| `PF-FC-00` | `PF-L2-00` | 파티클 초과 | `PF-L1-YP` | PR 두께 Spec Out으로 인 | `PF-L3-00` | 작업 숙련도 부족 | 5 |
| `PF-FC-01` | `PF-L2-01` | 두께 규격 이탈 | `PF-L1-YP` | Particle 오염으로 인한 제 | `PF-L3-01` | 측정 오차 | 5 |
| `PF-FC-01` | `PF-L2-01` | 두께 규격 이탈 | `PF-L1-YP` | Particle 오염으로 인한 제 | `PF-L3-01` | 광학 해상도(Optical Res | 5 |
| `PF-FC-01` | `PF-L2-01` | 두께 규격 이탈 | `PF-L1-YP` | Particle 오염으로 인한 제 | `PF-L3-01` | 판정 기준 오적용 | 5 |
| `PF-FC-01` | `PF-L2-01` | TTV 규격 초과 | `PF-L1-YP` | Wafer 표면 결함 미검출로 인 | `PF-L3-01` | 환경 조건 이탈 | 5 |
| `PF-FC-01` | `PF-L2-01` | TTV 규격 초과 | `PF-L1-YP` | Wafer 표면 결함 미검출로 인 | `PF-L3-01` | 자재 품질 부적합 | 5 |
| `PF-FC-02` | `PF-L2-02` | OCR ID 오인식 또는 Lot  | `PF-L1-YP` | Lot 혼입으로 인한 Wafer  | `PF-L3-02` | 정렬 센서 오작동 | 7 |
| `PF-FC-02` | `PF-L2-02` | OCR ID 오인식 또는 Lot  | `PF-L1-YP` | Lot 혼입으로 인한 Wafer  | `PF-L3-02` | OCR 인식 오류 | 7 |
| `PF-FC-02` | `PF-L2-02` | OCR ID 오인식 또는 Lot  | `PF-L1-YP` | Lot 혼입으로 인한 Wafer  | `PF-L3-02` | 작업 숙련도 부족 | 7 |
| `PF-FC-02` | `PF-L2-02` | Wafer 정렬 불량 | `PF-L1-YP` | 전기적 Open/Short | `PF-L3-02` | 환경 조건 이탈 | 5 |
| `PF-FC-02` | `PF-L2-02` | Wafer 정렬 불량 | `PF-L1-YP` | 전기적 Open/Short | `PF-L3-02` | 자재 품질 부적합 | 5 |
| `PF-FC-03` | `PF-L2-03` | Wafer 표면 이물 잔류(Par | `PF-L1-YP` | Bump Lift-off | `PF-L3-03` | 환경 조건 이탈 | 7 |
| `PF-FC-03` | `PF-L2-03` | Wafer 표면 이물 잔류(Par | `PF-L1-YP` | Bump Lift-off | `PF-L3-03` | DI Water 비저항 저하 | 7 |
| `PF-FC-03` | `PF-L2-03` | Wafer 표면 이물 잔류(Par | `PF-L1-YP` | Bump Lift-off | `PF-L3-03` | 노즐 막힘 | 7 |
| `PF-FC-03` | `PF-L2-03` | Wafer 표면 이물 잔류(Par | `PF-L1-YP` | Bump Lift-off | `PF-L3-03` | 작업 숙련도 부족 | 7 |
| `PF-FC-04` | `PF-L2-04` | UBM 두께 부족(Thicknes | `PF-L1-YP` | PR 두께 Spec Out으로 인 | `PF-L3-04` | Target 소진 | 5 |
| `PF-FC-04` | `PF-L2-04` | UBM 두께 부족(Thicknes | `PF-L1-YP` | PR 두께 Spec Out으로 인 | `PF-L3-04` | Power 변동 | 5 |
| `PF-FC-04` | `PF-L2-04` | UBM 두께 부족(Thicknes | `PF-L1-YP` | PR 두께 Spec Out으로 인 | `PF-L3-04` | 전압 변동 | 5 |
| `PF-FC-04` | `PF-L2-04` | UBM 두께 부족(Thicknes | `PF-L1-YP` | PR 두께 Spec Out으로 인 | `PF-L3-04` | RF Etch Amount 규격  | 5 |
| `PF-FC-04` | `PF-L2-04` | UBM 두께 부족(Thicknes | `PF-L1-YP` | PR 두께 Spec Out으로 인 | `PF-L3-04` | 전압 안정도(Voltage Sta | 5 |
| `PF-FC-04` | `PF-L2-04` | UBM 두께 부족(Thicknes | `PF-L1-YP` | PR 두께 Spec Out으로 인 | `PF-L3-04` | 작업 숙련도 부족 | 5 |
| `PF-FC-04` | `PF-L2-04` | 막질 불균일(Film Non-un | `PF-L1-YP` | Bump간 Bridge | `PF-L3-04` | 진공 누설 | 5 |
| `PF-FC-04` | `PF-L2-04` | 막질 불균일(Film Non-un | `PF-L1-YP` | Bump간 Bridge | `PF-L3-04` | Target 소진 | 5 |
| `PF-FC-04` | `PF-L2-04` | 막질 불균일(Film Non-un | `PF-L1-YP` | Bump간 Bridge | `PF-L3-04` | TiW 증착 두께 편차 | 5 |
| `PF-FC-04` | `PF-L2-04` | 막질 불균일(Film Non-un | `PF-L1-YP` | Bump간 Bridge | `PF-L3-04` | Au 증착 두께 편차 | 5 |
| `PF-FC-05` | `PF-L2-05` | Wafer 표면 이물 잔류(Par | `PF-L1-YP` | CD Spec Out으로 인한 B | `PF-L3-05` | 환경 조건 이탈 | 5 |
| `PF-FC-05` | `PF-L2-05` | Wafer 표면 이물 잔류(Par | `PF-L1-YP` | CD Spec Out으로 인한 B | `PF-L3-05` | DI Water 비저항 저하 | 5 |
| `PF-FC-05` | `PF-L2-05` | Wafer 표면 이물 잔류(Par | `PF-L1-YP` | CD Spec Out으로 인한 B | `PF-L3-05` | 노즐 막힘 | 5 |
| `PF-FC-05` | `PF-L2-05` | Wafer 표면 이물 잔류(Par | `PF-L1-YP` | CD Spec Out으로 인한 B | `PF-L3-05` | 작업 숙련도 부족 | 5 |
| `PF-FC-06` | `PF-L2-06` | PR 두께 불균일(PR Thick | `PF-L1-YP` | PR Scum 잔류로 인한 Au  | `PF-L3-06` | 환경 조건 이탈 | 5 |
| `PF-FC-06` | `PF-L2-06` | PR 두께 불균일(PR Thick | `PF-L1-YP` | PR Scum 잔류로 인한 Au  | `PF-L3-06` | PR 열화 | 5 |
| `PF-FC-06` | `PF-L2-06` | PR 두께 불균일(PR Thick | `PF-L1-YP` | PR Scum 잔류로 인한 Au  | `PF-L3-06` | RPM 편차 | 5 |
| `PF-FC-06` | `PF-L2-06` | PR 두께 불균일(PR Thick | `PF-L1-YP` | PR Scum 잔류로 인한 Au  | `PF-L3-06` | 작업 숙련도 부족 | 5 |
| `PF-FC-07` | `PF-L2-07` | CD 규격 이탈(CD Out of | `PF-L1-YP` | Bump Height Spec O | `PF-L3-07` | 환경 조건 이탈 | 5 |
| `PF-FC-07` | `PF-L2-07` | CD 규격 이탈(CD Out of | `PF-L1-YP` | Bump Height Spec O | `PF-L3-07` | Mask 결함 | 5 |
| `PF-FC-07` | `PF-L2-07` | CD 규격 이탈(CD Out of | `PF-L1-YP` | Bump Height Spec O | `PF-L3-07` | 에너지 편차 | 5 |
| `PF-FC-07` | `PF-L2-07` | CD 규격 이탈(CD Out of | `PF-L1-YP` | Bump Height Spec O | `PF-L3-07` | 작업 숙련도 부족 | 5 |
| `PF-FC-08` | `PF-L2-08` | Under/Over develop | `PF-L1-YP` | Plating 균일도 Spec O | `PF-L3-08` | 환경 조건 이탈 | 4 |
| `PF-FC-08` | `PF-L2-08` | Under/Over develop | `PF-L1-YP` | Plating 균일도 Spec O | `PF-L3-08` | 농도 편차 | 4 |
| `PF-FC-08` | `PF-L2-08` | Under/Over develop | `PF-L1-YP` | Plating 균일도 Spec O | `PF-L3-08` | 현상 시간 편차 | 4 |
| `PF-FC-08` | `PF-L2-08` | Under/Over develop | `PF-L1-YP` | Plating 균일도 Spec O | `PF-L3-08` | 작업 숙련도 부족 | 4 |
| `PF-FC-09` | `PF-L2-09` | PR Scum 잔류(Descum  | `PF-L1-SP` | IMC 과성장에 의한 접합부 열화 | `PF-L3-09` | 환경 조건 이탈 | 5 |
| `PF-FC-09` | `PF-L2-09` | PR Scum 잔류(Descum  | `PF-L1-SP` | IMC 과성장에 의한 접합부 열화 | `PF-L3-09` | Gas 유량 편차 | 5 |
| `PF-FC-09` | `PF-L2-09` | PR Scum 잔류(Descum  | `PF-L1-SP` | IMC 과성장에 의한 접합부 열화 | `PF-L3-09` | Power 불안정 | 5 |
| `PF-FC-09` | `PF-L2-09` | PR Scum 잔류(Descum  | `PF-L1-SP` | IMC 과성장에 의한 접합부 열화 | `PF-L3-09` | 작업 숙련도 부족 | 5 |
| `PF-FC-10` | `PF-L2-10` | Au Bump 높이 편차(Heig | `PF-L1-SP` | Particle 오염 불량 유출로 | `PF-L3-10` | 전류밀도 편차 | 5 |
| `PF-FC-10` | `PF-L2-10` | Au Bump 높이 편차(Heig | `PF-L1-SP` | Particle 오염 불량 유출로 | `PF-L3-10` | 전류 변동 | 5 |
| `PF-FC-10` | `PF-L2-10` | Au Bump 높이 편차(Heig | `PF-L1-SP` | Particle 오염 불량 유출로 | `PF-L3-10` | 출력 전류(Output Curre | 5 |
| `PF-FC-10` | `PF-L2-10` | Au Bump 높이 편차(Heig | `PF-L1-SP` | Particle 오염 불량 유출로 | `PF-L3-10` | 작업 숙련도 부족 | 5 |
| `PF-FC-10` | `PF-L2-10` | Au 순도 저하(Purity De | `PF-L1-SP` | 라벨 불일치로 인한 Lot 혼입  | `PF-L3-10` | 환경 조건 이탈 | 5 |
| `PF-FC-10` | `PF-L2-10` | Au 순도 저하(Purity De | `PF-L1-SP` | 라벨 불일치로 인한 Lot 혼입  | `PF-L3-10` | 농도 저하 | 5 |
| `PF-FC-10` | `PF-L2-10` | Au 순도 저하(Purity De | `PF-L1-SP` | 라벨 불일치로 인한 Lot 혼입  | `PF-L3-10` | 도금 균일도 편차 | 5 |
| `PF-FC-11` | `PF-L2-11` | PR 잔사 잔류(Strip 불완전 | `PF-L1-SP` | 외관 결함 불량 유출(고객 Out | `PF-L3-11` | 환경 조건 이탈 | 4 |
| `PF-FC-11` | `PF-L2-11` | PR 잔사 잔류(Strip 불완전 | `PF-L1-SP` | 외관 결함 불량 유출(고객 Out | `PF-L3-11` | 자재 품질 부적합 | 4 |
| `PF-FC-11` | `PF-L2-11` | PR 잔사 잔류(Strip 불완전 | `PF-L1-SP` | 외관 결함 불량 유출(고객 Out | `PF-L3-11` | 온도 편차 | 4 |
| `PF-FC-11` | `PF-L2-11` | PR 잔사 잔류(Strip 불완전 | `PF-L1-SP` | 외관 결함 불량 유출(고객 Out | `PF-L3-11` | 작업 숙련도 부족 | 4 |
| `PF-FC-12` | `PF-L2-12` | 에칭 부족/과다(Under/Ove | `PF-L1-SP` | 고객 Packing 기준 부적합으 | `PF-L3-12` | 환경 조건 이탈 | 5 |
| `PF-FC-12` | `PF-L2-12` | 에칭 부족/과다(Under/Ove | `PF-L1-SP` | 고객 Packing 기준 부적합으 | `PF-L3-12` | 자재 품질 부적합 | 5 |
| `PF-FC-12` | `PF-L2-12` | 에칭 부족/과다(Under/Ove | `PF-L1-SP` | 고객 Packing 기준 부적합으 | `PF-L3-12` | H₂O₂ 농도 편차에 의한 Etc | 5 |
| `PF-FC-12` | `PF-L2-12` | 에칭 부족/과다(Under/Ove | `PF-L1-SP` | 고객 Packing 기준 부적합으 | `PF-L3-12` | 에칭 시간 편차 | 5 |
| `PF-FC-12` | `PF-L2-12` | 에칭 부족/과다(Under/Ove | `PF-L1-SP` | 고객 Packing 기준 부적합으 | `PF-L3-12` | Au Etch Rate 편차 | 5 |
| `PF-FC-12` | `PF-L2-12` | 에칭 부족/과다(Under/Ove | `PF-L1-SP` | 고객 Packing 기준 부적합으 | `PF-L3-12` | 작업 숙련도 부족 | 5 |
| `PF-FC-13` | `PF-L2-13` | TiW Etch 후 잔류 Film | `PF-L1-SP` | IMC 두께 Spec Out으로  | `PF-L3-13` | 환경 조건 이탈 | 7 |
| `PF-FC-13` | `PF-L2-13` | TiW Etch 후 잔류 Film | `PF-L1-SP` | IMC 두께 Spec Out으로  | `PF-L3-13` | 자재 품질 부적합 | 7 |
| `PF-FC-13` | `PF-L2-13` | TiW Etch 후 잔류 Film | `PF-L1-SP` | IMC 두께 Spec Out으로  | `PF-L3-13` | 온도 편차 | 7 |
| `PF-FC-13` | `PF-L2-13` | TiW Etch 후 잔류 Film | `PF-L1-SP` | IMC 두께 Spec Out으로  | `PF-L3-13` | Etch Rate 편차 | 7 |
| `PF-FC-13` | `PF-L2-13` | TiW Etch 후 잔류 Film | `PF-L1-SP` | IMC 두께 Spec Out으로  | `PF-L3-13` | 작업 숙련도 부족 | 7 |
| `PF-FC-14` | `PF-L2-14` | IMC 과성장(IMC Overgr | `PF-L1-US` | 고객 라인 정지, 클레임 | `PF-L3-14` | 유량 부족 | 6 |
| `PF-FC-14` | `PF-L2-14` | IMC 과성장(IMC Overgr | `PF-L1-US` | 고객 라인 정지, 클레임 | `PF-L3-14` | 자재 품질 부적합 | 6 |
| `PF-FC-14` | `PF-L2-14` | IMC 과성장(IMC Overgr | `PF-L1-US` | 고객 라인 정지, 클레임 | `PF-L3-14` | 온도 과다/부족 | 6 |
| `PF-FC-14` | `PF-L2-14` | IMC 과성장(IMC Overgr | `PF-L1-US` | 고객 라인 정지, 클레임 | `PF-L3-14` | 열처리 시간(Anneal Time | 6 |
| `PF-FC-14` | `PF-L2-14` | IMC 과성장(IMC Overgr | `PF-L1-US` | 고객 라인 정지, 클레임 | `PF-L3-14` | 작업 숙련도 부족 | 6 |
| `PF-FC-15` | `PF-L2-15` | Bump 외관 불량(Visual  | `PF-L1-US` | 고객 신뢰도 하락 | `PF-L3-15` | 해상도 저하 | 7 |
| `PF-FC-15` | `PF-L2-15` | Bump 외관 불량(Visual  | `PF-L1-US` | 고객 신뢰도 하락 | `PF-L3-15` | 측정 오차 | 7 |
| `PF-FC-15` | `PF-L2-15` | Bump 외관 불량(Visual  | `PF-L1-US` | 고객 신뢰도 하락 | `PF-L3-15` | 판정 기준 오적용 | 7 |
| `PF-FC-15` | `PF-L2-15` | Bump 높이 규격 이탈(Heig | `PF-L1-US` | RoHS 부적합으로 인한 리콜·법 | `PF-L3-15` | 환경 조건 이탈 | 9 |
| `PF-FC-15` | `PF-L2-15` | Bump 높이 규격 이탈(Heig | `PF-L1-US` | RoHS 부적합으로 인한 리콜·법 | `PF-L3-15` | 자재 품질 부적합 | 9 |
| `PF-FC-15` | `PF-L2-15` | Bump 높이 규격 이탈(Heig | `PF-L1-US` | RoHS 부적합으로 인한 리콜·법 | `PF-L3-15` | 측정 균일도 편차 | 9 |
| `PF-FC-16` | `PF-L2-16` | Wafer 표면 이물 잔류(Par | `PF-L1-YP` | Particle 오염으로 인한 제 | `PF-L3-16` | 환경 조건 이탈 | 5 |
| `PF-FC-16` | `PF-L2-16` | Wafer 표면 이물 잔류(Par | `PF-L1-YP` | Particle 오염으로 인한 제 | `PF-L3-16` | 자재 품질 부적합 | 5 |
| `PF-FC-16` | `PF-L2-16` | Wafer 표면 이물 잔류(Par | `PF-L1-YP` | Particle 오염으로 인한 제 | `PF-L3-16` | 노즐 막힘 | 5 |
| `PF-FC-16` | `PF-L2-16` | Wafer 표면 이물 잔류(Par | `PF-L1-YP` | Particle 오염으로 인한 제 | `PF-L3-16` | 작업 숙련도 부족 | 5 |
| `PF-FC-17` | `PF-L2-17` | Wafer 표면 이물 잔류(Par | `PF-L1-YP` | Wafer 표면 결함 미검출로 인 | `PF-L3-17` | 환경 조건 이탈 | 5 |
| `PF-FC-17` | `PF-L2-17` | Wafer 표면 이물 잔류(Par | `PF-L1-YP` | Wafer 표면 결함 미검출로 인 | `PF-L3-17` | 자재 품질 부적합 | 5 |
| `PF-FC-17` | `PF-L2-17` | Wafer 표면 이물 잔류(Par | `PF-L1-YP` | Wafer 표면 결함 미검출로 인 | `PF-L3-17` | 노즐 막힘 | 5 |
| `PF-FC-17` | `PF-L2-17` | Wafer 표면 이물 잔류(Par | `PF-L1-YP` | Wafer 표면 결함 미검출로 인 | `PF-L3-17` | 작업 숙련도 부족 | 5 |
| `PF-FC-18` | `PF-L2-18` | Wafer 정렬 불량 | `PF-L1-YP` | Lot 혼입으로 인한 Wafer  | `PF-L3-18` | 환경 조건 이탈 | 7 |
| `PF-FC-18` | `PF-L2-18` | Wafer 정렬 불량 | `PF-L1-YP` | Lot 혼입으로 인한 Wafer  | `PF-L3-18` | 자재 품질 부적합 | 7 |
| `PF-FC-18` | `PF-L2-18` | Wafer 정렬 불량 | `PF-L1-YP` | Lot 혼입으로 인한 Wafer  | `PF-L3-18` | 정렬 센서 오작동 | 7 |
| `PF-FC-18` | `PF-L2-18` | Wafer 정렬 불량 | `PF-L1-YP` | Lot 혼입으로 인한 Wafer  | `PF-L3-18` | 작업 숙련도 부족 | 7 |
| `PF-FC-19` | `PF-L2-19` | AVI 검사 불량 미검출(Visu | `PF-L1-YP` | 전기적 Open/Short | `PF-L3-19` | 환경 조건 이탈 | 5 |
| `PF-FC-19` | `PF-L2-19` | AVI 검사 불량 미검출(Visu | `PF-L1-YP` | 전기적 Open/Short | `PF-L3-19` | 자재 품질 부적합 | 5 |
| `PF-FC-19` | `PF-L2-19` | AVI 검사 불량 미검출(Visu | `PF-L1-YP` | 전기적 Open/Short | `PF-L3-19` | 해상도 저하 | 5 |
| `PF-FC-19` | `PF-L2-19` | AVI 검사 불량 미검출(Visu | `PF-L1-YP` | 전기적 Open/Short | `PF-L3-19` | 작업 숙련도 부족 | 5 |
| `PF-FC-20` | `PF-L2-20` | 포장 불량(Packaging De | `PF-L1-YP` | Bump Lift-off | `PF-L3-20` | 환경 조건 이탈 | 7 |
| `PF-FC-20` | `PF-L2-20` | 포장 불량(Packaging De | `PF-L1-YP` | Bump Lift-off | `PF-L3-20` | 자재 품질 부적합 | 7 |
| `PF-FC-20` | `PF-L2-20` | 포장 불량(Packaging De | `PF-L1-YP` | Bump Lift-off | `PF-L3-20` | 진공 누설 | 7 |
| `PF-FC-20` | `PF-L2-20` | 포장 불량(Packaging De | `PF-L1-YP` | Bump Lift-off | `PF-L3-20` | 체크리스트 누락 | 7 |

## 6. RiskAnalysis 위험분석
| Link | S | O | D | AP | 예방관리(PC) | 검출관리(DC) |
|------|---|---|---|----|-------------|-------------|
| `01bc2fa9` | 7 | 3 | 7 | M | P:센서 교정(Calibration) | D:육안 검사, 외관 확인, 매 LO |
| `5433f5bd` | 5 | 4 | 4 | L | P:수입품질 관리(IQC), 자재 성 | D:치수측정기 |
| `84cd474c` | 5 | 4 | 3 | L | P:예방유지보전(PM) | D:바코드 스캐너, 검사, 매 LOT |
| `auto-PF-` | 5 | 3 | 8 | L | P:클린룸 작업자 교육 및 인증, 작 | D:Particle Counter 파 |
| `auto-PF-` | 5 | 4 | 5 | L | P:두께 측정기 정기 교정(MSA), | D:두께 측정기 전수 측정, 버니어  |
| `auto-PF-` | 7 | 3 | 7 | M | P:센서 교정(Calibration) | D:OCR Reader 자동 인식 확 |
| `auto-PF-` | 5 | 4 | 4 | L | P:Au 증착 두께 인라인 모니터링, | D:4-Point Probe 두께 측 |
| `auto-PF-` | 5 | 4 | 4 | L | P:Au 증착 두께 인라인 모니터링, | D:4-Point Probe 두께 측 |
| `auto-PF-` | 5 | 4 | 4 | L | P:Au Plating Tank 정기 | D:높이 측정기 전수 높이 측정, X |
| `auto-PF-` | 7 | 4 | 7 | H | P:검사원 인증 교육, 판정 기준서  | D:AVI 장비 전수 외관검사, 높이 |
| `auto-PF-` | 7 | 4 | 7 | H | P:검사원 인증 교육, 판정 기준서  | D:AVI 장비 전수 외관검사, 높이 |
| `e40b9c16` | 7 | 4 | 7 | H | P:예방유지보전(PM) | D:비전검사, 매 LOT |
| `ec21d651` | 5 | 4 | 4 | L | P:예방유지보전(PM) | D:치수측정기 |
| `f17a0c18` | 5 | 3 | 7 | L | P:보관 조건(온습도) 관리 | D:육안 검사, 외관 확인, 매 LO |
| `f96d4ec2` | 5 | 4 | 4 | L | P:예방유지보전(PM) | D:치수측정기 |
| `PF-FC-00` | 5 | 2 | 8 | L | P:FFU 풍속 정기 측정 및 PM, | D:Particle Counter 파 |
| `PF-FC-00` | 5 | 2 | 8 | L | P:FFU 풍속 정기 측정 및 PM, | D:Particle Counter 파 |
| `PF-FC-00` | 5 | 4 | 8 | M | P:HEPA 필터 정기 교체 주기 관 | D:Particle Counter 파 |
| `PF-FC-00` | 5 | 3 | 8 | L | P:항온항습기 정기 PM 및 교정,  | D:Particle Counter 파 |
| `PF-FC-00` | 5 | 3 | 8 | L | P:항온항습기 정기 PM 및 교정,  | D:Particle Counter 파 |
| `PF-FC-00` | 5 | 3 | 8 | L | P:클린룸 작업자 교육 및 인증, 작 | D:Particle Counter 파 |
| `PF-FC-01` | 5 | 3 | 5 | L | P:두께 측정기 정기 교정(MSA), | D:두께 측정기 전수 측정, 버니어  |
| `PF-FC-01` | 5 | 3 | 5 | L | P:두께 측정기 정기 교정(MSA), | D:두께 측정기 전수 측정, 버니어  |
| `PF-FC-01` | 5 | 5 | 5 | L | P:검사원 인증 교육, 판정 기준서  | D:두께 측정기 전수 측정, 버니어  |
| `PF-FC-01` | 5 | 4 | 5 | L | P:검사실 청정도 및 조도 정기 점검 | D:두께 측정기 전수 측정, 버니어  |
| `PF-FC-01` | 5 | 4 | 5 | L | P:입고 Wafer 성적서 검토, 공 | D:두께 측정기 전수 측정, 버니어  |
| `PF-FC-02` | 7 | 3 | 7 | M | P:Sorter 장비 정기 PM, 정 | D:OCR Reader 자동 인식 확 |
| `PF-FC-02` | 7 | 3 | 7 | M | P:OCR Reader 정기 교정,  | D:OCR Reader 자동 인식 확 |
| `PF-FC-02` | 7 | 5 | 7 | H | P:Sorter 작업 표준 교육, 인 | D:OCR Reader 자동 인식 확 |
| `PF-FC-02` | 5 | 4 | 1 | L | P:Sorter 작업영역 ESD 매트 | D:OCR Reader 자동 인식 확 |
| `PF-FC-02` | 5 | 4 | 1 | L | P:Wafer Cassette 이상  | D:OCR Reader 자동 인식 확 |
| `PF-FC-03` | 7 | 4 | 1 | M | P:Scrubber 작업영역 청정도  | D:Particle Counter 세 |
| `PF-FC-03` | 7 | 4 | 1 | M | P:DI Water 비저항 일일 측정 | D:Particle Counter 세 |
| `PF-FC-03` | 7 | 4 | 1 | M | P:Scrubber 장비 정기 PM, | D:Particle Counter 세 |
| `PF-FC-03` | 7 | 5 | 1 | M | P:Scrubber 작업 표준 교육, | D:Particle Counter 세 |
| `PF-FC-04` | 5 | 4 | 4 | L | P:Ti Target 잔량 자동 모니 | D:4-Point Probe 두께 측 |
| `PF-FC-04` | 5 | 4 | 4 | L | P:Sputter 장비 정기 PM,  | D:4-Point Probe 두께 측 |
| `PF-FC-04` | 5 | 4 | 4 | L | P:DC Power Supply 전압 | D:4-Point Probe 두께 측 |
| `PF-FC-04` | 5 | 4 | 4 | L | P:Au 증착 두께 인라인 모니터링, | D:4-Point Probe 두께 측 |
| `PF-FC-04` | 5 | 4 | 4 | L | P:Au 증착 두께 인라인 모니터링, | D:4-Point Probe 두께 측 |
| `PF-FC-04` | 5 | 5 | 4 | L | P:Sputter Recipe 승인제 | D:4-Point Probe 두께 측 |
| `PF-FC-04` | 5 | 2 | 4 | L | P:진공 챔버 기밀 점검, 진공도 실 | D:4-Point Probe 두께 측 |
| `PF-FC-04` | 5 | 4 | 4 | L | P:Ti Target 잔량 자동 모니 | D:4-Point Probe 두께 측 |
| `PF-FC-04` | 5 | 4 | 4 | L | P:Au 증착 두께 인라인 모니터링, | D:4-Point Probe 두께 측 |
| `PF-FC-04` | 5 | 4 | 4 | L | P:Au 증착 두께 인라인 모니터링, | D:4-Point Probe 두께 측 |
| `PF-FC-05` | 5 | 4 | 1 | L | P:Scrubber2 작업영역 청정도 | D:Particle Counter 세 |
| `PF-FC-05` | 5 | 4 | 1 | L | P:DI Water 비저항 일일 측정 | D:Particle Counter 세 |
| `PF-FC-05` | 5 | 4 | 1 | L | P:Scrubber 장비 정기 PM, | D:Particle Counter 세 |
| `PF-FC-05` | 5 | 5 | 1 | L | P:Scrubber2 작업 표준 교육 | D:Particle Counter 세 |
| `PF-FC-06` | 5 | 4 | 1 | L | P:Yellow Room UV 조도  | D:α-step/Ellipsomete |
| `PF-FC-06` | 5 | 4 | 1 | L | P:PR 보관 온도·유효기간 관리,  | D:α-step/Ellipsomete |
| `PF-FC-06` | 5 | 4 | 1 | L | P:Coater 정기 PM, RPM  | D:α-step/Ellipsomete |
| `PF-FC-06` | 5 | 5 | 1 | L | P:Coater Recipe 승인제도 | D:α-step/Ellipsomete |
| `PF-FC-07` | 5 | 3 | 1 | L | P:Exposure 챔버 온습도·진동 | D:CD-SEM CD 측정, 매 Lo |
| `PF-FC-07` | 5 | 4 | 1 | L | P:Mask 이물·손상 입고 검사,  | D:CD-SEM CD 측정, 매 Lo |
| `PF-FC-07` | 5 | 4 | 1 | L | P:Stepper/Scanner 광원 | D:CD-SEM CD 측정, 매 Lo |
| `PF-FC-07` | 5 | 5 | 1 | L | P:Exposure Recipe 승인 | D:CD-SEM CD 측정, 매 Lo |
| `PF-FC-08` | 4 | 4 | 1 | L | P:Develop 작업영역 온도·습도 | D:SEM Opening 치수 측정, |
| `PF-FC-08` | 4 | 4 | 1 | L | P:현상액 농도 정기 측정, 기준 이 | D:SEM Opening 치수 측정, |
| `PF-FC-08` | 4 | 4 | 1 | L | P:Developer 현상 시간 자동 | D:SEM Opening 치수 측정, |
| `PF-FC-08` | 4 | 5 | 1 | L | P:Develop Recipe 승인제 | D:SEM Opening 치수 측정, |
| `PF-FC-09` | 5 | 4 | 1 | L | P:Descum 챔버 기밀 및 균일도 | D:SEM Scum 유무 확인, 매  |
| `PF-FC-09` | 5 | 2 | 1 | L | P:O₂ Gas 유량 자동 제어, 기 | D:SEM Scum 유무 확인, 매  |
| `PF-FC-09` | 5 | 4 | 1 | L | P:Descum 장비 Power 안정 | D:SEM Scum 유무 확인, 매  |
| `PF-FC-09` | 5 | 5 | 1 | L | P:Descum Recipe 승인제도 | D:SEM Scum 유무 확인, 매  |
| `PF-FC-10` | 5 | 4 | 4 | L | P:Au Plating Tank 정기 | D:높이 측정기 전수 높이 측정, X |
| `PF-FC-10` | 5 | 4 | 4 | L | P:정류기(Rectifier) 정기  | D:높이 측정기 전수 높이 측정, X |
| `PF-FC-10` | 5 | 3 | 4 | L | P:도금 균일도 SPC 관리, 정기  | D:높이 측정기 전수 높이 측정, X |
| `PF-FC-10` | 5 | 4 | 4 | L | P:도금 Recipe 승인제도, 전류 | D:높이 측정기 전수 높이 측정, X |
| `PF-FC-10` | 5 | 4 | 4 | L | P:Plating 작업영역 온도·습도 | D:높이 측정기 전수 높이 측정, X |
| `PF-FC-10` | 5 | 4 | 4 | L | P:Au 도금액 Au 이온 농도 정기 | D:높이 측정기 전수 높이 측정, X |
| `PF-FC-10` | 5 | 4 | 4 | L | P:Au Plating Tank 정기 | D:높이 측정기 전수 높이 측정, X |
| `PF-FC-11` | 4 | 3 | 1 | L | P:Strip 작업영역 환기 상태 정 | D:SEM PR 잔사 확인, 매 Lo |
| `PF-FC-11` | 4 | 4 | 1 | L | P:Strip 용제 농도 정기 측정, | D:SEM PR 잔사 확인, 매 Lo |
| `PF-FC-11` | 4 | 4 | 1 | L | P:Strip 장비 온도 교정, 정기 | D:SEM PR 잔사 확인, 매 Lo |
| `PF-FC-11` | 4 | 4 | 1 | L | P:Strip Recipe 승인제도, | D:SEM PR 잔사 확인, 매 Lo |
| `PF-FC-12` | 5 | 3 | 1 | L | P:Etch 작업영역 환기 및 약액  | D:SEM 에칭 잔류물 확인, 매 L |
| `PF-FC-12` | 5 | 4 | 1 | L | P:Au Etchant 농도 정기 측 | D:SEM 에칭 잔류물 확인, 매 L |
| `PF-FC-12` | 5 | 4 | 1 | L | P:H₂O₂ 농도 정기 측정, 기준  | D:SEM 에칭 잔류물 확인, 매 L |
| `PF-FC-12` | 5 | 4 | 1 | L | P:Au Etch 장비 식각 시간 자 | D:SEM 에칭 잔류물 확인, 매 L |
| `PF-FC-12` | 5 | 4 | 1 | L | P:Au Etch Rate 정기 모니 | D:SEM 에칭 잔류물 확인, 매 L |
| `PF-FC-12` | 5 | 5 | 1 | L | P:Au Etch Recipe 승인제 | D:SEM 에칭 잔류물 확인, 매 L |
| `PF-FC-13` | 7 | 3 | 1 | L | P:TiW Etch 작업영역 환기 및 | D:SEM Seed 잔류물 확인, 매 |
| `PF-FC-13` | 7 | 4 | 1 | M | P:TiW Etchant 농도 정기  | D:SEM Seed 잔류물 확인, 매 |
| `PF-FC-13` | 7 | 4 | 1 | M | P:TiW Etch 장비 온도 교정, | D:SEM Seed 잔류물 확인, 매 |
| `PF-FC-13` | 7 | 4 | 1 | M | P:Etch Rate 정기 모니터링, | D:SEM Seed 잔류물 확인, 매 |
| `PF-FC-13` | 7 | 5 | 1 | M | P:TiW Etch Recipe 승인 | D:SEM Seed 잔류물 확인, 매 |
| `PF-FC-14` | 6 | 4 | 1 | L | P:N₂ 공급장치 유량 모니터링, 기 | D:TEM/SEM IMC 두께 분석, |
| `PF-FC-14` | 6 | 4 | 1 | L | P:N₂ Gas 유량 자동 제어, 순 | D:TEM/SEM IMC 두께 분석, |
| `PF-FC-14` | 6 | 4 | 1 | L | P:Anneal 장비 온도 교정, 정 | D:TEM/SEM IMC 두께 분석, |
| `PF-FC-14` | 6 | 4 | 1 | L | P:Anneal 장비 온도 교정, 정 | D:TEM/SEM IMC 두께 분석, |
| `PF-FC-14` | 6 | 4 | 1 | L | P:Anneal Recipe 승인제도 | D:TEM/SEM IMC 두께 분석, |
| `PF-FC-15` | 7 | 3 | 7 | M | P:AVI 장비 해상도 정기 교정,  | D:AVI 장비 전수 외관검사, 높이 |
| `PF-FC-15` | 7 | 3 | 7 | M | P:높이 측정기 정기 교정(MSA), | D:AVI 장비 전수 외관검사, 높이 |
| `PF-FC-15` | 7 | 5 | 7 | H | P:검사원 인증 교육, 판정 기준서  | D:AVI 장비 전수 외관검사, 높이 |
| `PF-FC-15` | 9 | 4 | 7 | H | P:검사실 조도·청정도 정기 점검 | D:AVI 장비 전수 외관검사, 높이 |
| `PF-FC-15` | 9 | 4 | 7 | H | P:한도 견본 정기 최신화, 승인 기 | D:AVI 장비 전수 외관검사, 높이 |
| `PF-FC-15` | 9 | 3 | 7 | H | P:높이 측정기 Co-planarit | D:AVI 장비 전수 외관검사, 높이 |
| `PF-FC-16` | 5 | 4 | 1 | L | P:Clean 작업영역 청정도 정기  | D:Particle Counter 세 |
| `PF-FC-16` | 5 | 4 | 1 | L | P:DI Water 비저항 일일 측정 | D:Particle Counter 세 |
| `PF-FC-16` | 5 | 4 | 1 | L | P:Clean 장비 정기 PM, 노즐 | D:Particle Counter 세 |
| `PF-FC-16` | 5 | 5 | 1 | L | P:Clean 작업 표준 교육, 인증 | D:Particle Counter 세 |
| `PF-FC-17` | 5 | 4 | 1 | L | P:Scrubber3 작업영역 청정도 | D:Particle Counter 파 |
| `PF-FC-17` | 5 | 4 | 1 | L | P:DI Water 비저항 일일 측정 | D:Particle Counter 파 |
| `PF-FC-17` | 5 | 4 | 1 | L | P:Scrubber 장비 정기 PM, | D:Particle Counter 파 |
| `PF-FC-17` | 5 | 5 | 1 | L | P:Scrubber3 작업 표준 교육 | D:Particle Counter 파 |
| `PF-FC-18` | 7 | 4 | 1 | M | P:Sorter3 작업영역 ESD 매 | D:Sorter3 정렬 센서 자동 확 |
| `PF-FC-18` | 7 | 4 | 1 | M | P:Wafer Cassette 이상  | D:Sorter3 정렬 센서 자동 확 |
| `PF-FC-18` | 7 | 3 | 1 | L | P:Sorter 장비 정기 PM, 정 | D:Sorter3 정렬 센서 자동 확 |
| `PF-FC-18` | 7 | 5 | 1 | M | P:Sorter3 작업 표준 교육,  | D:Sorter3 정렬 센서 자동 확 |
| `PF-FC-19` | 5 | 4 | 7 | M | P:AVI 작업영역 조도·진동 정기  | D:AVI 장비 전수 자동 외관검사, |
| `PF-FC-19` | 5 | 4 | 7 | M | P:한도 견본 정기 최신화, 승인 기 | D:AVI 장비 전수 자동 외관검사, |
| `PF-FC-19` | 5 | 3 | 7 | L | P:AVI 장비 해상도 정기 교정,  | D:AVI 장비 전수 자동 외관검사, |
| `PF-FC-19` | 5 | 5 | 7 | M | P:AVI 결과 검토 교육, 이상 발 | D:AVI 장비 전수 자동 외관검사, |
| `PF-FC-20` | 7 | 4 | 6 | M | P:포장 작업영역 청정도 및 ESD  | D:포장 외관 전수 육안검사, 포장재 |
| `PF-FC-20` | 7 | 4 | 6 | M | P:포장재 입고 검사, 보관 기준 관 | D:포장 외관 전수 육안검사, 포장재 |
| `PF-FC-20` | 7 | 4 | 6 | M | P:포장 장비 진공 압력 정기 점검, | D:포장 외관 전수 육안검사, 포장재 |
| `PF-FC-20` | 7 | 5 | 6 | M | P:포장 작업자 교육, 포장 체크리스 | D:포장 외관 전수 육안검사, 포장재 |

## 7. Optimization 최적화
> (최적화 데이터 없음)

## 8. Import→DB→WS 연동 매칭
| 단계 | flatData | Atomic DB(PG) | Worksheet(Legacy) | FK |
|------|---------|---------------|-------------------|-----|
| 구조 L1 | C1~C4 | l1_structures/functions/failure_effects | l1 {} | l1StructId |
| 구조 L2 | A1~A6 | l2_structures/functions/process_product_chars/failure_modes | l2[] | l2StructId |
| 구조 L3 | B1~B5 | l3_structures/functions/failure_causes | l2[].l3[] | l3StructId, l2StructId |
| 고장사슬 | FC chains | failure_links | savedLinks[] | fmId, feId, fcId |
| 고장분석 | — | failure_analyses | — | linkId |
| 위험분석 | SOD/PC/DC | risk_analyses | riskData{} | linkId |
| 최적화 | — | optimizations | riskData{lesson-opt-*} | riskId |
