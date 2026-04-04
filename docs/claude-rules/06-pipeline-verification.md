# Rule 15: 파이프라인 검증 — 골든 베이스라인 + 자동수정 루프

> **모든 코드 수정 완료 후 파이프라인 검증을 반드시 실시한다.**

---

## 검증 흐름

```
수정 완료 → tsc --noEmit → pipeline-verify POST (5단계)
               ↓ FAIL
         수정 → 재검증 (1회차)
               ↓ FAIL
         수정 → 재검증 (2회차)
               ↓ FAIL
         수정 → 재검증 (3회차)
               ↓ PASS → 완료 보고 (결과 표 포함)
```

- ❌ **검증 없이 "완료" 보고 금지**
- ❌ **tsc 통과만으로 완료 금지** (타입만 확인, 데이터 정합성은 파이프라인만)
- ✅ **STEP별 상태(OK/WARN/ERROR) + FK 고아 건수 포함 보고**

## API

- `GET /api/fmea/pipeline-verify?fmeaId=xxx` → 읽기 전용
- `POST /api/fmea/pipeline-verify { fmeaId }` → 검증 + 자동수정 루프

## 5단계 검증 항목

| 단계 | 이름 | 검증 대상 | 자동수정 |
|------|------|----------|---------|
| STEP 1 | IMPORT | Legacy 존재, L2 공정 수 | ❌ (사용자 개입) |
| STEP 2 | 파싱 | A1~A6, B1~B5, C1~C4 카운트 | ✅ fixStep2 |
| STEP 3 | UUID | Atomic L2/L3/FM/FE/FC, orphan L3Func | ✅ fixStep3 |
| STEP 4 | FK | FailureLink 정합성, unlinked FC | ✅ fixStep4 |
| STEP 5 | WS | PC 빈칸, orphan PC | ✅ fixStep5 |

## 골든 베이스라인 (pfm26-m002 Au Bump)

### Atomic DB 기대값

| 항목 | 기대값 |
|------|--------|
| L2 (공정) | 21 |
| L3 (작업요소) | 91 |
| L1Function | 17 |
| L2Function | 26 |
| L3Function | 101 |
| FM (고장형태) | 26 |
| FE (고장영향) | 20 |
| FC (고장원인) | 104 |
| FailureLink | 111 |
| RiskAnalysis | 111 |
| DC/PC in RA | 111 (NULL 0건) |
| flatData 합계 | ≥ 680 |

### flatData 항목별

| 코드 | 이름 | 기대값 |
|------|------|--------|
| A1 | 공정번호 | 21 |
| A2 | 공정명 | 21 |
| A3 | 공정기능 | ≥ 20 |
| A4 | 제품특성 | ≥ 25 |
| A5 | 고장형태 | 26 |
| A6 | 검출관리 | ≥ 20 |
| B1 | 작업요소 | 91 |
| B2 | 요소기능 | ≥ 100 |
| B3 | 공정특성 | ≥ 100 |
| B4 | 고장원인 | 104 |
| B5 | 예방관리 | ≥ 90 |
| C1 | L1 범주 | ≥ 3 |
| C2 | L1 기능 | ≥ 7 |
| C3 | 요구사항 | ≥ 17 |
| C4 | 고장영향 | 20 |

## STEP별 PASS 기준

### STEP 1 — IMPORT
| 검증 | PASS 기준 | FAIL 시 |
|------|-----------|---------|
| Legacy 존재 | `!= null` | Import 재실행 |
| L2 공정 수 | ≥ 20 | 엑셀 확인 |

### STEP 2 — 파싱
| 검증 | PASS 기준 | FAIL 시 |
|------|-----------|---------|
| A5 (FM) | > 0 | excel-parser.ts |
| B4 (FC) | > 0 | B4 파싱 로직 |
| C4 (FE) | > 0 | L1 시트 파싱 |
| A6/B5 (DC/PC) | > 0 | 통합시트 추출 |

### STEP 3 — UUID
| 검증 | PASS 기준 | FAIL 시 |
|------|-----------|---------|
| L2/L3 Structure | = 베이스라인 | rebuild-atomic |
| FM/FC | ≥ 90% | migration.ts |
| 고아 L3Function | = 0 | L3-L2 매핑 |

### STEP 4 — FK
| 검증 | PASS 기준 | FAIL 시 |
|------|-----------|---------|
| FailureLink | ≥ 50% | failureChainInjector |
| Broken FC/FM/FE | = 0 | FK 확인 |
| Unlinked FC | = 0 | 자동수정 |

### STEP 5 — WS
| 검증 | PASS 기준 | FAIL 시 |
|------|-----------|---------|
| 빈 PC | = 0 | PC 데이터 |
| 고아 PC | = 0 | PC-FM 매핑 |

## 검증 커맨드

```powershell
# 0. 타입 체크
npx tsc --noEmit

# 1. 파이프라인 읽기전용 검증
Invoke-RestMethod -Uri "http://localhost:3000/api/fmea/pipeline-verify?fmeaId=pfm26-m002" -Method GET | ConvertTo-Json -Depth 5

# 2. 자동수정 루프
Invoke-RestMethod -Uri "http://localhost:3000/api/fmea/pipeline-verify" -Method POST -Body '{"fmeaId":"pfm26-m002"}' -ContentType "application/json" | ConvertTo-Json -Depth 3

# 3. rebuild-atomic
Invoke-RestMethod -Uri "http://localhost:3000/api/fmea/rebuild-atomic?fmeaId=pfm26-m002" -Method POST | ConvertTo-Json -Depth 3

# 4. 마스터 동기화
Invoke-RestMethod -Uri "http://localhost:3000/api/fmea/export-master" -Method POST -Body '{"fmeaId":"pfm26-m002"}' -ContentType "application/json" | ConvertTo-Json -Depth 5

# 5. 마스터 DC/PC 확인
node -e "const d=JSON.parse(require('fs').readFileSync('data/master-fmea/pfm26-m002.json','utf8')); const r=d.atomicDB.riskAnalyses; console.log('risks:',r.length,'DC:',r.filter(x=>x.detectionControl?.trim()).length,'PC:',r.filter(x=>x.preventionControl?.trim()).length);"

# 6. import-validation (16개 규칙)
Invoke-RestMethod -Uri "http://localhost:3000/api/fmea/import-validation" -Method POST -Body '{"fmeaId":"pfm26-m002"}' -ContentType "application/json"
```

## 추가 검증 스크립트

```bash
npm run verify:pipeline-baseline        # FK 베이스라인
npm run verify:pipeline-baseline:strict  # pfm26-m002 골든 (엄격)
npm run verify:all                      # tsc + Vitest + 파이프라인 묶음
npm run test:import-slice               # Import 핵심 7개 스펙
```

## 코드 수정 후 체크리스트

```
[ ] tsc --noEmit 에러 0건
[ ] pipeline-verify POST → allGreen=true
[ ] rebuild-atomic → riskAnalyses=111
[ ] export-master → DC=111, PC=111
[ ] import-validation → 신규 ERROR 0건
[ ] (Import 수정 시) 원본 엑셀 re-import → ALL GREEN
```

## 테스트 이력 로그 형식

```
## [날짜] 파이프라인 테스트 결과
- tsc: ✅ 에러 0건
- STEP1 IMPORT: ✅ L2=21
- STEP2 파싱: ✅ A6=111 B5=111
- STEP3 UUID: ✅ FM=26 FC=104
- STEP4 FK: ✅ links=111 broken=0
- STEP5 WS: ✅ emptyPC=0 orphanPC=0
- Master DC/PC: ✅ 111/111
- allGreen: ✅
```
