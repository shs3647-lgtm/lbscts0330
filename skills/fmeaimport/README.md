# fmeaimport 스킬 (다중산업 FMEA 스킬)

## 개요

다중 산업 AIAG-VDA PFMEA 기초정보 Import 파일을 생성·검증·교정하는 Claude Code 스킬입니다.

**지원 산업 (7개)**:
- 자동차 (Automotive) - IATF 16949 기준
- 반도체 (Semiconductor) - Cpk 기반
- 의료기기 (Medical Device) - ISO 14971 위해도
- 전자제품 (Electronics)
- 사출 (Molding)
- 주조 (Casting)
- 전기전자조립 (Assembly)

---

## 스킬 구성

```
fmeaimport/
├── SKILL.md                           # 메인 스킬 정의 (280줄)
│   └─ 산업별 진입점, 작업 유형 판별, 항목별 규칙, 체크리스트
│
└── references/                         # 참조 문서 (5개)
    ├── aiag-vda-standard.md           # AIAG-VDA 표준 (200줄)
    │   └─ 7단계 분석, 항목 정의, 혼입 금지 규칙
    │
    ├── industry-templates.md          # 산업별 템플릿 (250줄)
    │   └─ 7개 산업 특화 항목, 추가 규칙
    │
    ├── automotive-processes.md        # 자동차 공정 (200줄)
    │   └─ 6개 공정 샘플 (설계, 프레스, 용접, 도장, 조립, 검사)
    │
    ├── validation-rules.md            # 검증 규칙 (200줄)
    │   └─ 25개 규칙, 자동 교정, 오류 레벨 정의
    │
    └── excel-generation.md            # 엑셀 생성 (200줄)
        └─ openpyxl 패턴, 포맷팅, 검증 체크리스트
```

---

## 주요 기능

### 1. AIAG-VDA PFMEA 19개 시트 자동 생성

- **L1 (고객 관점)**: C1~C4 (구분/기능/요구사항/영향) + 통합
- **L2 (공정 관점)**: A1~A6 (공정번호/명/기능/특성/고장형태/검출) + 통합
- **L3 (요소 관점)**: B1~B5 (요소/기능/특성/원인/예방) + 통합
- **FC (고장사슬)**: N:1:N 구조 (12열)
- **FA (통합분석)**: RPN 계산 (26열)

### 2. 자동 검증 & 교정 (25개 규칙)

- Zero-padding 자동 적용
- B5 (예방관리) 빈 셀 자동 채우기
- SSOT 3축 검증 (FM/B4/B1 일치성)
- 동사형 명사형 변환
- FC 셀병합 자동 처리

### 3. 산업별 특화

**자동차 (IATF 16949)**:
- CC/CR 특수특성 표기
- SPC 공정능력 관리

**의료기기 (ISO 14971)**:
- 위해도 평가 (심각도 × 가능성)
- FDA 규제 항목

**반도체**:
- Cpk 기반 공정능력
- 엔지니어링 Spec 수치 포함

### 4. 엑셀 자동 생성

- 기존 템플릿 포맷 100% 유지
- 적색 폰트 (추론값 표시)
- 셀병합 자동 처리
- 검증 후 저장

---

## 설치 방법

### 1. Claude Code 설치

```bash
# Claude Code 설치
brew install anthropic/claude-code/claude-code
# 또는 https://claude.com/claude-code 에서 다운로드
```

### 2. 스킬 복사

```bash
# 방법 A: 직접 복사
cp -r skills/fmeaimport ~/.claude/skills/

# 방법 B: 이 저장소에서 클론
git clone https://github.com/shs3647-lgtm/fmea-stable-dev.git
cp -r fmea-stable-dev/skills/fmeaimport ~/.claude/skills/
```

### 3. 설치 확인

```bash
# Claude Code 터미널에서:
> /help

또는 대화에서:
사용자: "FMEA 자료 만들어줘"
→ fmeaimport 스킬이 자동 활성화되면 설치 완료!
```

---

## 사용 예시

### 자동차 공정 FMEA

```
👤 사용자:
"자동차 프레스 공정 FMEA를 만들어줘.
부품 높이, 두께, 표면 거칠기가 주요 특성이고,
작업요소는 프레스 유압, 금형, 윤활유, 작업자야.
고장원인은 유압 편차, 금형 마모, 윤활유 오염이야."

🤖 Claude (fmeaimport 활성화):
→ automotive-processes.md 로드
→ 19개 시트 자동 생성
→ A4/A5/B4/FC 자동 입력
→ 25개 규칙으로 검증
→ FMEA_Automotive_Stamping_20260315_v1.0.xlsx 생성
```

### 의료기기 공정 FMEA (ISO 14971)

```
👤 사용자:
"의료기기 조립 공정 FMEA를 ISO 14971로 분석해줘.
센서 오작동으로 인한 잘못된 진단이 위험해."

🤖 Claude:
→ 위해도 평가 (S=4, P=2, Risk=8)
→ 위해 통제 조치 자동 제안
→ FMEA_Medical_Assembly_20260315_v1.0.xlsx 생성
```

---

## 참조 문서 가이드

| 상황 | 참조 파일 | 내용 |
|------|----------|------|
| 스킬 사용법 | SKILL.md | 전체 워크플로우, 진입점, 항목별 규칙 |
| 표준 이해 | aiag-vda-standard.md | AIAG-VDA 정의, 7단계 분석, 혼입 금지 |
| 산업 선택 | industry-templates.md | 7개 산업별 템플릿, 특화 항목 |
| 공정 샘플 | automotive-processes.md | 공정별 A4/A5/B4/FC 샘플 |
| 검증 오류 | validation-rules.md | 25개 규칙, 자동 교정, 오류 레벨 |
| 엑셀 문제 | excel-generation.md | openpyxl 패턴, 포맷팅, 문제 해결 |

---

## 파일 크기

```
총 라인 수: ~2,500줄

파일별:
- SKILL.md: 280줄
- aiag-vda-standard.md: 200줄
- industry-templates.md: 250줄
- automotive-processes.md: 200줄
- validation-rules.md: 200줄
- excel-generation.md: 200줄
```

---

## 확장 계획

### 현재 미포함 (필요시 추가)

- [ ] 반도체 공정 카탈로그 (semiconductor-processes.md)
- [ ] 의료기기 공정 카탈로그 (medical-processes.md)
- [ ] 전자제품 공정 카탈로그 (electronics-processes.md)
- [ ] 사출 공정 카탈로그 (molding-processes.md)
- [ ] 주조 공정 카탈로그 (casting-processes.md)
- [ ] 조립 공정 카탈로그 (assembly-processes.md)
- [ ] Python 자동화 코드 (openpyxl 통합)

---

## 라이선스

MIT License

---

## 기여

이슈, PR 환영합니다!

---

## 관련 자료

- [AIAG-VDA PFMEA 1st Edition](https://www.aiag.org/)
- [IATF 16949](https://www.iatfglobaloversight.org/)
- [ISO 14971 (의료기기 위험관리)](https://www.iso.org/standard/72904.html)

---

## Contact

- GitHub: [shs3647-lgtm](https://github.com/shs3647-lgtm)
- Repository: [fmea-stable-dev](https://github.com/shs3647-lgtm/fmea-stable-dev)

---

Created with ❤️ by Claude Code
