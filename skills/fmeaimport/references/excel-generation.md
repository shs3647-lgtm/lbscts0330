# 엑셀 생성 및 출력 가이드

## 개요

openpyxl을 사용한 FMEA 엑셀 파일 생성, 데이터 입력, 포맷팅, 검증, 저장.

---

## 기본 전략

### 1단계: 템플릿 복사

```python
from openpyxl import load_workbook
from shutil import copy

# 템플릿 로드
template_path = "C:/01_skills/최종_PFMEA_기초정보_완성_v1.0_2.xlsx"
output_path = f"FMEA_{산업}_{날짜}_v1.0.xlsx"

copy(template_path, output_path)
wb = load_workbook(output_path)
```

### 2단계: 데이터 입력

```python
# 시트별 데이터 입력 (헤더 보존, 2행부터)
ws = wb['A1']  # A1 시트

# 헤더: 1행 (보존)
# 데이터: 2행부터 입력

for row_idx, data_row in enumerate(data, start=2):
    for col_idx, value in enumerate(data_row, start=1):
        cell = ws.cell(row=row_idx, column=col_idx, value=value)
```

### 3단계: 포맷팅

```python
from openpyxl.styles import Font, PatternFill, Alignment, Border

# 적색 폰트 (추론값)
red_font = Font(color='FF0000')

# 어두운 배경 (헤더)
header_fill = PatternFill(start_color='D3D3D3', end_color='D3D3D3', fill_type='solid')

# 센터 정렬
center_align = Alignment(horizontal='center', vertical='center', wrap_text=True)
```

### 4단계: 병합 처리 (FC 시트)

```python
# FM 그룹 내 셀병합 (A, B, C, D)
# start_row ~ end_row (동일 FM 범위)

ws.merge_cells(f'A{start}:A{end}')  # FE 구분
ws.merge_cells(f'B{start}:B{end}')  # FE
ws.merge_cells(f'C{start}:C{end}')  # 공정번호
ws.merge_cells(f'D{start}:D{end}')  # FM
```

### 5단계: 검증 후 저장

```python
# validation-rules.md 25개 규칙 체크

# 저장
wb.save(output_path)
print(f"✓ 생성 완료: {output_path}")
```

---

## 시트별 처리

### A1~A6 시트 (L2 공정 관점)

```
A1 공정번호:
  · Zero-padding: zfill(2)
  · 타입: 텍스트

A2 공정명:
  · 한글 또는 영문
  · 중복 검사

A3 공정기능:
  · 추론값이면 적색 폰트
  · 500자 제한

A4 제품특성:
  · 명사형만
  · 줄바꿈 허용

A5 고장형태:
  · [A4] + [이탈유형]
  · 검증: A4와의 연계

A6 검출관리:
  · 선택 항목
  · 동일 공정번호 1행만
```

### B1~B5 시트 (L3 요소 관점)

```
B1 작업요소:
  · 고유명 (상태명 제외)
  · (공정번호, B4) 키로 매핑 가능

B2 요소기능:
  · 함수형 구문
  · B1과 연계

B3 공정특성:
  · 입력 파라미터 명사형
  · Spec 수치 포함 가능

B4 고장원인:
  · 명사형 3대 패턴
  · 검증: B5/FC와 연계
  · 금지: 동사형 종결

B5 예방관리:
  · 필수 항목 (빈 셀 불가)
  · B1 매핑으로 자동 채우기 가능
```

### C1~C4 시트 (L1 고객 관점)

```
C1 구분:
  · YP (자사 공정 수율)
  · SP (고객 납품 품질)
  · USER (규제/안전)

C2 제품기능:
  · 함수형 문장
  · 공정 결과와 연계

C3 요구사항:
  · 영문 단위 필수
  · 형식: "Name: Min ~ Max Unit"

C4 고장영향:
  · [현상] + [영향]
  · 산업별 특화: [CC]/[CR] 표기 (자동차)
  · 위해도 표기 가능 (의료기기)
```

### L1/L2/L3 통합 시트

```
L1통합:
  · C1~C4 4열 통합
  · C4 있는 행 = C2, C3 필수

L2통합:
  · A1~A6 7열 통합
  · 상위값 반복기입

L3통합:
  · B1~B5 8열 통합
  · B5 빈 셀 금지
```

### FC 시트 (고장사슬)

```
12열 구조:
  A: FE 구분
  B: FE (고장영향)
  C: 공정번호
  D: FM (고장형태)
  E: 4M 분류
  F: WE (작업요소)
  G: FC (고장원인)
  H: PC (예방관리)
  I: DC (검출관리)
  J: SOD (심각도 1~10)
  K: AP (가능성 H/M/L)
  L: FP (검출 선택)

셀병합 규칙:
  · A, B, C, D: 동일 FM 행 병합
  · E~L: 병합 금지
```

### FA 시트 (통합분석)

```
26열 = FC 12열 + RPN 계산 + 평가

RPN 계산:
  RPN = SOD × AP × FP
  또는 RPN = SOD × AP (FP 제외)

평가 레벨:
  · RPN > 200: 우선 개선
  · RPN 100~200: 검토
  · RPN < 100: 현상 유지 가능
```

---

## 컬러 포맷팅

### 적색 폰트 (추론값)
```
Color: FF0000 (빨강)

적용 대상:
  · A3 (자동생성 공정기능)
  · A6 (추론 검출관리)
  · B5 (추론 예방관리)
  · C2/C3 (역매핑)
  · FC FE/FM (자동 추론)
```

### 셀 배경색

```
헤더: D3D3D3 (밝은 회색)
데이터: 흰색 (기본)
오류: FFE0E0 (연한 빨강) - 옵션
```

---

## 열 너비 설정

```
기본값: 20자

시트별:
  A1~A6: 15~30 (가변)
  B1~B5: 20~40
  C1~C4: 15~35
  FC: 12~25
  FA: 12~20
```

---

## 저장 및 출력

### 경로

```
임시 작업:  C:\Users\{user}\AppData\Local\Temp\FMEA_temp\
최종 출력: {사용자 지정} 또는 /mnt/user-data/outputs/

파일명 규칙: FMEA_{산업}_{공정}_{날짜}_v{버전}.xlsx
예: FMEA_Automotive_Stamping_20260315_v1.0.xlsx
   FMEA_Semiconductor_Photo_20260315_v1.2.xlsx
```

### 저장 코드

```python
from datetime import datetime

날짜 = datetime.now().strftime('%Y%m%d')
산업 = "Automotive"  # 또는 다른 산업
공정 = "Stamping"

output_path = f"FMEA_{산업}_{공정}_{날짜}_v1.0.xlsx"

wb.save(output_path)
```

---

## 검증 체크리스트

```python
# 저장 전 검증
def validate_before_save(wb):
    errors = []

    # 1. 19개 시트 확인
    required_sheets = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6',
                       'B1', 'B2', 'B3', 'B4', 'B5',
                       'C1', 'C2', 'C3', 'C4',
                       'L1통합', 'L2통합', 'L3통합',
                       'FC', 'FA']

    for sheet in required_sheets:
        if sheet not in wb.sheetnames:
            errors.append(f"시트 '{sheet}' 누락")

    # 2. Zero-padding 확인
    ws_a1 = wb['A1']
    for row in ws_a1.iter_rows(min_row=2, max_row=ws_a1.max_row):
        value = row[0].value
        if value and not str(value).zfill(2) == str(value):
            errors.append(f"A1 시트 공정번호 '{value}' zero-padding 필요")

    # 3. B5 빈 셀 확인
    ws_b5 = wb['B5']
    for row in ws_b5.iter_rows(min_row=2, max_row=ws_b5.max_row):
        if not row[0].value:  # B5 값 없음
            errors.append(f"B5 시트 {row[0].row}행 빈 셀")

    return errors

errors = validate_before_save(wb)
if errors:
    print("⚠ 검증 오류:")
    for err in errors:
        print(f"  · {err}")
else:
    print("✓ 검증 통과")
    wb.save(output_path)
```

---

## 문제 해결

### 한글 인코딩 오류
```python
# 원인: openpyxl은 UTF-8 자동 처리
# 해결: load_workbook(..., data_only=False)
```

### 셀 병합 오류
```python
# 원인: 이미 병합된 셀에 다시 병합
# 해결: 기존 병합 제거 후 다시 병합
ws.unmerge_cells('A1:A5')
ws.merge_cells('A1:A5')
```

### 데이터 손실
```python
# 원인: 저장 전 원본 파일 열려있음
# 해결: 파일 닫기 후 저장
wb.close()
```

---

## 최종 체크

```
저장 전:
□ 19개 시트 모두 존재
□ 헤더행 보존
□ Zero-padding 적용
□ B5 빈 셀 없음
□ SSOT 3축 검증 통과
□ 적색 폰트 적용
□ FC 셀병합 완료

저장 후:
□ 파일 생성 확인
□ 엑셀 열기 확인 (손상 없음)
□ 데이터 누락 확인
□ 포맷 정상 확인
```
