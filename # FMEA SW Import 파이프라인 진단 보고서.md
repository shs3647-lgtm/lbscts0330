# FMEA SW Import 파이프라인 진단 보고서

> **대상 파일**: `PFMEA_Master_AU_BUMP_PIPELINE검증_2026-03-18.xlsx` (FMEA SW 출력)
> **기준 파일**: `통합_PFMEA_12inch_AuBump_v4_0.xlsx` (검증 완료 기준본)
> **진단일**: 2026-03-18
> **진단 결과**: ❌ Import 불가 — **치명적 결함 5건 + 구조 오류 3건 + 데이터 오류 21건**

---

## 요약

| 구분 | FMEA SW 출력 | 기준본 | 판정 |
|------|-------------|--------|------|
| L1 통합(C1-C4) | 20행 | 20행 | ⚠ 내용 동일하나 검증 필요 |
| L2 통합(A1-A6) | 33행 | 33행 | ❌ **A6 전수 누락 (33/33 빈셀)** |
| L3 통합(B1-B5) | 136행 | 115행 | ❌ **카테시안 증폭 +21행, B2→B3/B4 혼입 20건, B5 전수 누락** |
| FC 고장사슬 | 5행 (전부 빈셀) | 57행 | ❌ **완전 누락** |
| FA 통합분석 | 5행 (전부 빈셀) | 8행 | ❌ **완전 누락** |

---

## 1. 치명적 결함 (Critical — Import 완전 실패)

### 1.1 ❌ FC 고장사슬 완전 누락

FC 시트 5행 모두 빈 행. 고장사슬(FE↔FM↔FC)이 전혀 구성되지 않음.

**영향**: Import 시 STEP B 고장연결 단계가 완전 실패. Worksheet에 `(고장형태 선택)` 플레이스홀더만 표시됨.

**원인 추정**: FMEA SW의 FC 생성 로직이 통합시트 입력 모드에서 FC 행을 전혀 생성하지 못함. L2/L3 개별시트가 아닌 통합시트만 있을 때 FM↔FC 매핑 로직이 작동하지 않는 것으로 판단.

**수정**: 기준본 FC 시트(57행) 전체를 사용해야 함.

### 1.2 ❌ FA 통합분석 완전 누락

FA 시트 5행 모두 빈 행. 26열 통합분석이 전혀 생성되지 않음.

**영향**: Import 미리보기에서 전체 워크시트 미리보기 불가.

**수정**: FC 생성 후 FA를 FC 1행=FA 1행 기준으로 재구성해야 함.

### 1.3 ❌ A6 검출관리 전수 누락 (33/33행)

L2 통합시트의 A6 열이 33행 전부 빈 셀. 검출관리 정보가 완전히 소실됨.

**영향**: Import 후 Worksheet DC(검출관리) 란이 모두 공백. SOD 평가 중 D값 산출 불가.

**원인 추정**: Master FMEA 원본에서 A6에 `D:` 접두사가 붙어있어 파싱 시 인식 실패했거나, 통합시트 파싱 시 7번째 열(A6) 매핑이 누락됨.

**수정**: 기준본의 A6 데이터를 공정별로 복원해야 함. 아래 21개 공정 A6 값 참조.

### 1.4 ❌ B5 예방관리 전수 누락 (136/136행)

L3 통합시트의 B5 열이 136행 전부 빈 셀. 예방관리 정보가 완전히 소실됨.

**영향**: Import 후 Worksheet PC(예방관리) 란이 모두 공백. SOD 평가 중 O값 산출 불가.

**원인 추정**: Master FMEA 원본에서 B5에 `P:` 접두사가 붙어있어 파싱 시 인식 실패했거나, 통합시트 파싱 시 8번째 열(B5) 매핑이 누락됨.

**수정**: 기준본의 B5 데이터를 (공정번호, 4M, WE) 키로 복원해야 함.

### 1.5 ❌ B2→B3/B4 혼입 오류 (20건) — 유령 행 생성

FMEA SW가 동일 (공정, 4M) 그룹에 WE가 2개 이상일 때, WE-A의 B2 값을 WE-B의 B3/B4에 복제하는 치명적 오류 발생.

**발생 패턴**:
```
[정상 행]  WE=Sputter 장비, B3='DC Power(kW)', B4='Power 변동'
[오류 행]  WE=Sputter 장비, B3='DC Power Supply가 안정적인 전력을 공급하여...', 
           B4='DC Power Supply가 안정적인 전력을 공급하여... 부적합'
```

B2 요소기능 텍스트가 B3(공정특성) 열에 그대로 복사되고, B4(고장원인)에는 `B2텍스트 + " 부적합"` 형태로 자동 생성됨.

**발생 공정 및 건수**:

| 공정 | WE 그룹 | 유령 행 수 |
|------|---------|-----------|
| 01 작업환경 | 클린룸 ↔ FFU | 2행 |
| 10 IQA | 두께 측정기 ↔ HIGH POWER SCOPE | 4행 |
| 20 Sorter | Sorter 장비 ↔ OCR Reader | 2행 |
| 40 UBM Sputter | Sputter 장비 ↔ DC Power Supply | 4행 |
| 40 UBM Sputter | Ti Target ↔ Cu Target | 2행 |
| 100 Au Plating | Au Plating Tank ↔ 정류기 | 4행 |
| 150 Final Inspection | AVI 장비 ↔ 높이 측정기 | 2행 |
| **합계** | | **20행** |

**원인 추정**: FMEA SW의 L3 통합시트 파싱 로직에서, 동일 (공정, 4M)의 WE가 복수일 때 B3/B4를 카테시안 곱(Cartesian Product)으로 전개함. 이때 B2 값이 B3/B4로 overflow되는 치명적 버그.

**수정**: 유령 행 20건 삭제 필요. 행 식별 기준: `B3 또는 B4 값의 길이 > 30자 AND "한다" 또는 "부적합" 포함`.

---

## 2. 구조 오류 (Structural — Import 후 데이터 무결성 파괴)

### 2.1 ⚠ 카테시안 행 증폭 (+21행, 136 vs 115)

유령 행 20건 외에도, 동일 (공정, 4M) WE 복수 그룹에서 B2↔B3↔B4 교차 배분이 부정확.

**공정별 증폭 현황**:

| 공정 | SW 행 | 기준 행 | 증가 | 유령행 제외 순증가 |
|------|-------|--------|------|-----------------|
| 01 작업환경 | 10 | 8 | +2 | 0 (유령 2행) |
| 10 IQA | 9 | 5 | +4 | 0 (유령 4행) |
| 20 Sorter | 9 | 7 | +2 | 0 (유령 2행) |
| 40 UBM Sputter | 20 | 13 | +7 | +1 (유령 6행 + 초과 1행) |
| 100 Au Plating | 13 | 9 | +4 | 0 (유령 4행) |
| 150 Final Inspection | 11 | 9 | +2 | 0 (유령 2행) |

### 2.2 ⚠ B1↔B2 주어 불일치 (30건)

B1 작업요소와 B2 요소기능의 주어가 불일치하는 행이 30건. FMEA SW가 다른 WE의 B2를 현재 WE 행에 배치함.

**대표 사례**:

| 행 | WE(B1) | B2 주어 | 판정 |
|----|--------|---------|------|
| 7 | 클린룸 | FFU가... | ❌ |
| 9 | FFU(Fan Filter Unit) | 클린룸이... | ❌ |
| 14 | 두께 측정기 | HIGH POWER SCOPE가... | ❌ |
| 16 | HIGH POWER SCOPE | 두께 측정기가... | ❌ |
| 36 | Sputter 장비 | DC Power Supply가... | ❌ |
| 42 | DC Power Supply | Sputter 장비가... | ❌ |

**원인**: 동일 (공정, 4M)의 WE 복수 그룹에서 B2를 카테시안으로 교차 배정하는 로직 오류.

### 2.3 ⚠ VERIFY 시트 수식값 전부 None

VERIFY 시트의 모든 검증 수식(FM_COUNT, FC_COUNT, FE_COUNT 등)이 `None` 반환. 수식이 FC/FA 빈 시트를 참조하여 값 산출 불가.

---

## 3. 데이터 오류 상세 (20건 유령 행 목록)

### 삭제 대상 유령 행 (B2→B3/B4 혼입)

아래 행들은 B3에 B2 텍스트가 복사되고, B4에 `"B2텍스트 부적합"` 형태로 자동 생성된 무의미한 행임. **전부 삭제해야 함**.

| SW행 | 공정 | WE(B1) | B3 (오류값) | B4 (오류값) |
|------|------|--------|------------|------------|
| 8 | 01 | 클린룸 | `FFU가 청정 공기를 순환·공급하여 클린룸 청정도를 유지한다` | `FFU가 청정 공기를...유지한다 부적합` |
| 11 | 01 | FFU(Fan Filter Unit) | `FFU가 청정 공기를 순환·공급하여 클린룸 청정도를 유지한다` | `FFU가 청정 공기를...유지한다 부적합` |
| 15 | 10 | 두께 측정기 | `HIGH POWER SCOPE가 Wafer를 Auto Loading하여 외관 검사를 수행한다` | `HIGH POWER SCOPE가...수행한다 부적합` |
| 18 | 10 | HIGH POWER SCOPE | `HIGH POWER SCOPE가 Wafer를 Auto Loading하여 외관 검사를 수행한다` | `HIGH POWER SCOPE가...수행한다 부적합` |
| 24 | 20 | Sorter 장비 | `OCR Reader가 Wafer ID를 자동 인식하여 Lot 추적성을 제공한다` | `OCR Reader가...제공한다 부적합` |
| 27 | 20 | OCR Reader | `OCR Reader가 Wafer ID를 자동 인식하여 Lot 추적성을 제공한다` | `OCR Reader가...제공한다 부적합` |
| 40 | 40 | Sputter 장비 | `DC Power Supply가...Sputter 출력을 유지한다` | `DC Power Supply가...유지한다 부적합` |
| 41 | 40 | Sputter 장비 | `DC Power Supply가...Sputter 출력을 유지한다` | `DC Power Supply가...유지한다 부적합` |
| 47 | 40 | DC Power Supply | `DC Power Supply가...Sputter 출력을 유지한다` | `DC Power Supply가...유지한다 부적합` |
| 48 | 40 | DC Power Supply | `DC Power Supply가...Sputter 출력을 유지한다` | `DC Power Supply가...유지한다 부적합` |
| 50 | 40 | Ti Target | `Cu Target이 스퍼터링 소재를 공급하여 Cu 박막 형성을 지원한다` | `Cu Target이...지원한다 부적합` |
| 52 | 40 | Cu Target | `Cu Target이 스퍼터링 소재를 공급하여 Cu 박막 형성을 지원한다` | `Cu Target이...지원한다 부적합` |
| 78 | 100 | Au Plating Tank | `정류기(Rectifier)가...도금 전류밀도를 유지한다` | `정류기(Rectifier)가...유지한다 부적합` |
| 79 | 100 | Au Plating Tank | `정류기(Rectifier)가...도금 전류밀도를 유지한다` | `정류기(Rectifier)가...유지한다 부적합` |
| 83 | 100 | 정류기(Rectifier) | `정류기(Rectifier)가...도금 전류밀도를 유지한다` | `정류기(Rectifier)가...유지한다 부적합` |
| 84 | 100 | 정류기(Rectifier) | `정류기(Rectifier)가...도금 전류밀도를 유지한다` | `정류기(Rectifier)가...유지한다 부적합` |
| 111 | 150 | AVI 장비 | `높이 측정기가 Bump 높이를 전수 측정하여...` | `높이 측정기가...제공한다 부적합` |
| 115 | 150 | 높이 측정기 | `높이 측정기가 Bump 높이를 전수 측정하여...` | `높이 측정기가...제공한다 부적합` |

추가 B2 교차오염 행 (B3는 정상이나 B2 주어가 다른 WE):

| SW행 | 공정 | WE(B1) | 오류 B2 (다른 WE의 B2) |
|------|------|--------|----------------------|
| 7 | 01 | 클린룸 | FFU가 청정 공기를... |
| 9 | 01 | FFU | 클린룸이 외부 오염을... |
| 14 | 10 | 두께 측정기 | HIGH POWER SCOPE가... |
| 16 | 10 | HIGH POWER SCOPE | 두께 측정기가... |
| 23 | 20 | Sorter 장비 | OCR Reader가... |
| 25 | 20 | OCR Reader | Sorter 장비가... |
| 36~39 | 40 | Sputter 장비 | DC Power Supply가... |
| 42 | 40 | DC Power Supply | Sputter 장비가... |
| 76~77 | 100 | Au Plating Tank | 정류기(Rectifier)가... |
| 80 | 100 | 정류기(Rectifier) | Au Plating Tank가... |
| 109~110 | 150 | AVI 장비 | 높이 측정기가... |
| 112 | 150 | 높이 측정기 | AVI 장비가... |

---

## 4. 근본 원인 분석

### 4.1 FMEA SW 파이프라인의 L3 통합시트 파싱 로직 결함

FMEA SW는 동일 (공정, 4M) 그룹에 WE가 N개(N≥2)일 때 다음과 같이 처리하는 것으로 추정:

```
입력: (공정40, MC) → WE=[Sputter 장비, DC Power Supply]
                   → B2=[B2_sputter, B2_dcpower]
                   → B3=[DC Power, 증착속도, RF Etch, TiW, Au, 전압안정도]  (6개)
                   → B4=[Power 변동, 전압변동, RF이탈, TiW편차, Au편차, 전압부적합]  (6개)

SW 처리 (오류):
  WE=Sputter → B3×B2 카테시안 = 6×2 = 12행 (B2_dcpower가 B3/B4에 혼입)
  WE=DC Power → B3×B2 카테시안 = 6×2 = 12행 (B2_sputter가 B3/B4에 혼입)
  → 총 24행 중 유효 행만 남겨도 14행 (기준본은 13행)

올바른 처리:
  WE=Sputter → B3=[DC Power, 증착속도, RF Etch, TiW, Au] = 5행 (자기 B2만)
  WE=DC Power → B3=[전압안정도] + 교차매핑 4건 = 5행 (자기 B2만)
  → 총 13행
```

**핵심 버그**: 같은 (공정, 4M) 안에서 WE-A의 B2를 WE-B의 행에 교차 복제하면서, 복제된 B2 텍스트를 B3 열에 넣고 `B2 + " 부적합"`을 B4에 자동 생성함.

### 4.2 A6/B5 접두사(D:/P:) 파싱 실패

Master FMEA 원본에서 A6은 `D:검출관리내용`, B5는 `P:예방관리내용` 형식으로 접두사가 붙어있음. FMEA SW 파이프라인이 이 접두사를 인식하지 못하고 해당 열을 빈 셀로 처리한 것으로 추정.

### 4.3 FC/FA 생성 로직 미구현 또는 비활성

통합시트 입력 모드에서 FC 고장사슬과 FA 통합분석을 생성하는 로직이 아예 작동하지 않음. 개별시트(14개) 입력 모드에서만 FC/FA를 생성하도록 구현되어 있을 가능성.

---

## 5. 수정 지침

### 5.1 즉시 수정 (FMEA SW 코드 수정 전)

기준본 `통합_PFMEA_12inch_AuBump_v4_0.xlsx`를 Import 파일로 사용. FMEA SW 출력물은 사용 불가.

### 5.2 FMEA SW 코드 수정 우선순위

| 우선순위 | 수정 항목 | 난이도 | 영향 |
|---------|----------|--------|------|
| **P0** | A6/B5 접두사(D:/P:) 파싱 지원 | 낮음 | A6/B5 전수 복원 |
| **P0** | FC 고장사슬 생성 로직 (통합시트 모드) | 높음 | 고장연결 전체 |
| **P0** | L3 카테시안 교차 복제 버그 수정 | 중간 | 유령 행 20건 제거 |
| **P1** | B1↔B2 주어 일치 검증 | 중간 | B2 교차오염 30건 |
| **P1** | FA 통합분석 생성 (FC 기반) | 중간 | 미리보기 복원 |
| **P2** | VERIFY 시트 수식 검증 | 낮음 | 자가진단 활성화 |

### 5.3 L3 카테시안 버그 수정 방향

```python
# 현재 로직 (추정, 오류):
for we_a in WE_list:
    for b2 in ALL_B2_of_same_4M:      # ← 다른 WE의 B2도 포함
        for b3 in ALL_B3_of_same_4M:
            emit(we_a, b2, b3, infer_b4(b2, b3))  # ← B2→B3/B4 혼입

# 올바른 로직:
for we in WE_list:
    my_b2 = B2_map[(proc, 4m, we)]    # ← 자기 WE의 B2만
    my_b3_b4 = B3B4_allocated_to(we)  # ← 사전에 WE별 B3/B4 배분
    for b3, b4 in my_b3_b4:
        emit(we, my_b2, b3, b4)
```

### 5.4 A6/B5 접두사 처리

```python
# A6 파싱 시:
raw_a6 = cell.value  # "D:Particle Counter 파티클 측정, 매 근무조 실시"
a6_val = raw_a6[2:] if raw_a6.startswith('D:') else raw_a6

# B5 파싱 시:
raw_b5 = cell.value  # "P:클린룸 작업자 교육 및 인증, 작업표준서 게시"
b5_val = raw_b5[2:] if raw_b5.startswith('P:') else raw_b5
```

---

## 6. 검증 체크리스트 (수정 후 재검증용)

```
□ A6 빈셀 0건 (현재 33건)
□ B5 빈셀 0건 (현재 136건)
□ FC 행 수 ≥ 50 (현재 0건, 기준본 57건)
□ FA 행 수 ≥ 5 (현재 0건, 기준본 8건)
□ L3 행 수 = 115 (현재 136건, 유령 21행 제거 후)
□ B3 값 중 "한다"로 끝나는 값 0건 (현재 20건)
□ B4 값 중 30자 초과 + "부적합"으로 끝나는 값 0건 (현재 20건)
□ B1↔B2 주어 일치율 100% (현재 30건 불일치)
□ VERIFY 시트 수식값 전부 정수 (현재 전부 None)
□ A5↔FC FM 완전 일치
□ FC FC↔B4 완전 일치
□ FC WE↔B1 완전 일치
```

---

*FMEA SW 파이프라인 진단 보고서 끝.*