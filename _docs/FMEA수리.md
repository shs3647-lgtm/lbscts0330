# FMEA 코드 손상 분석 및 수리 계획

## 📅 분석 일시
- **분석 일자**: 2026-01-25
- **기준 커밋**: ea4a458a (2026-01-21, 사이드바/모달 레이아웃 안정화)
- **현재 커밋**: 3f16cb5d (2026-01-25, 고장분석 탭 단계별 색상 체계 적용)

## 📊 변경 규모 요약

| 영역 | 변경된 파일 수 | 추가된 줄 | 삭제된 줄 |
|------|--------------|----------|----------|
| **PFMEA 전체** | 97개 파일 | 3,747+ | 2,092+ |
| **모달 컴포넌트** | 10개 파일 | 997+ | 556+ |
| **워크시트 탭** | 50개 파일 | 대규모 | 대규모 |

---

## 🔴 주요 손상 의심 영역

### 1. 입력 모달 작동 오류

#### 영향받은 파일
```
src/components/modals/DataSelectModal.tsx
src/components/modals/SODSelectModal.tsx
src/components/modals/SODMasterModal.tsx
src/components/modals/FailureEffectSelectModal.tsx
```

#### 증상
- [ ] 모달이 열리지 않음
- [ ] 모달에서 선택한 값이 저장되지 않음
- [ ] 모달 닫기 시 데이터 유실
- [ ] 다중 선택 시 일부만 저장됨

#### 원인 분석
1. **onSave 콜백 손상**: 모달의 onSave 함수가 정상적으로 호출되지 않을 수 있음
2. **상태 동기화 문제**: `setStateSynced` vs `setState` 사용 불일치
3. **모달 Props 변경**: 인터페이스 변경으로 인한 호환성 문제

#### 수리 계획
```
□ 1. DataSelectModal.tsx의 onSave 흐름 검증
□ 2. 각 탭에서 모달 호출 시 필수 props 확인
□ 3. 저장 후 상태 반영 로직 점검
```

---

### 2. 입력된 데이터 누락

#### 영향받은 파일
```
src/app/pfmea/worksheet/tabs/failure/FailureL1Tab.tsx
src/app/pfmea/worksheet/tabs/failure/FailureL2Tab.tsx
src/app/pfmea/worksheet/tabs/failure/FailureL3Tab.tsx
src/app/pfmea/worksheet/tabs/function/FunctionL1Tab.tsx
src/app/pfmea/worksheet/tabs/function/FunctionL2Tab.tsx
src/app/pfmea/worksheet/tabs/function/FunctionL3Tab.tsx
src/app/pfmea/worksheet/tabs/StructureTab.tsx
```

#### 증상
- [ ] 저장 후 새로고침 시 데이터 사라짐
- [ ] 탭 전환 시 입력 데이터 초기화됨
- [ ] localStorage에는 있으나 화면에 표시 안됨
- [ ] DB 저장이 누락됨

#### 원인 분석
1. **저장 로직 손상**: `saveToLocalStorage`, `saveAtomicDB` 호출 타이밍 문제
2. **상태 키 불일치**: 저장 시 사용하는 키와 로드 시 사용하는 키 불일치
3. **마이그레이션 오류**: `migration.ts` 변경으로 인한 데이터 구조 문제

#### 수리 계획
```
□ 1. useWorksheetSave.ts 저장 흐름 검증
□ 2. useWorksheetDataLoader.ts 로드 로직 확인
□ 3. 탭별 handleSave 함수 점검
□ 4. localStorage <-> state <-> DB 동기화 확인
```

---

### 3. 고장 연결(Failure Chain) 누락

#### 영향받은 파일
```
src/app/pfmea/worksheet/tabs/failure/FailureLinkResult.tsx
src/app/pfmea/worksheet/tabs/failure/FailureLinkTables.tsx
src/app/pfmea/worksheet/tabs/failure/hooks/useLinkData.ts
src/app/pfmea/worksheet/panels/FailureChainPanel/index.tsx
```

#### 증상
- [ ] 고장영향-고장형태-고장원인 연결이 끊어짐
- [ ] FailureChain 패널에 데이터가 표시되지 않음
- [ ] FK(외래키) 연결이 누락됨
- [ ] 상위-하위 레벨 간 연결이 사라짐

#### 원인 분석
1. **FK 필드명 변경**: `productCharId`, `processCharId` 등 FK 필드명 불일치
2. **연결 로직 손상**: `useLinkData.ts`에서 연결 조회 로직 오류
3. **데이터 구조 변경**: 상위 탭에서 하위 탭으로 전달되는 데이터 구조 변경

#### 수리 계획
```
□ 1. FailureL1Tab → FailureL2Tab → FailureL3Tab 데이터 플로우 추적
□ 2. FK 필드명 일관성 검증 (productCharId, processCharId, failureEffectId 등)
□ 3. useLinkData.ts에서 쿼리 로직 점검
□ 4. FailureChainPanel의 데이터 소스 확인
```

---

### 4. 구조분석 탭 오류

#### 영향받은 파일
```
src/app/pfmea/worksheet/tabs/StructureTab.tsx
src/app/pfmea/worksheet/tabs/StructureTabCells.tsx
src/app/pfmea/worksheet/ProcessSelectModal.tsx
src/app/pfmea/worksheet/WorkElementSelectModal.tsx
```

#### 증상
- [ ] 공정 선택이 작동하지 않음
- [ ] 작업요소 추가가 안됨
- [ ] 행 추가/삭제 기능 오류
- [ ] 확정 버튼 작동 안됨

#### 수리 계획
```
□ 1. StructureTab.tsx 핸들러 함수 점검
□ 2. ProcessSelectModal 연동 확인
□ 3. 확정/수정 토글 로직 검증
```

---

### 5. 리스크 분석 탭 오류

#### 영향받은 파일
```
src/app/pfmea/worksheet/tabs/RiskTabConfirmable.tsx
src/app/pfmea/worksheet/tabs/OptTabConfirmable.tsx
src/app/pfmea/worksheet/tabs/all/AllTabAtomic.tsx
src/app/pfmea/worksheet/tabs/all/AllTabBasic.tsx
```

#### 증상
- [ ] RPN 계산이 안됨
- [ ] SOD 값이 표시 안됨
- [ ] AP 우선순위가 잘못됨
- [ ] 최적화 탭 연동 안됨

#### 수리 계획
```
□ 1. RiskTabConfirmable 데이터 바인딩 확인
□ 2. SOD 값 연결 검증
□ 3. AP 계산 로직 점검
```

---

## 🛠️ 수리 우선순위

### Phase 1: 긴급 수정 (당일)
| 순위 | 작업 | 영향도 |
|-----|------|-------|
| 1 | DataSelectModal 저장 로직 복구 | 🔴 Critical |
| 2 | 탭 간 데이터 연결(FK) 복구 | 🔴 Critical |
| 3 | localStorage 저장 로직 점검 | 🟠 High |

### Phase 2: 핵심 기능 복구 (1-2일)
| 순위 | 작업 | 영향도 |
|-----|------|-------|
| 4 | StructureTab 입력 기능 복구 | 🟠 High |
| 5 | FunctionL1~L3 데이터 플로우 복구 | 🟠 High |
| 6 | FailureL1~L3 고장분석 연결 복구 | 🟠 High |

### Phase 3: 전체 검증 (3일 이내)
| 순위 | 작업 | 영향도 |
|-----|------|-------|
| 7 | 리스크/최적화 탭 검증 | 🟡 Medium |
| 8 | FailureChain 패널 복구 | 🟡 Medium |
| 9 | 전체 워크플로우 E2E 테스트 | 🟢 Low |

---

## 📋 체크리스트

### 입력 모달 검증
- [ ] DataSelectModal 열기/닫기
- [ ] 단일 선택 저장
- [ ] 다중 선택 저장
- [ ] 삭제 기능
- [ ] SODSelectModal 작동
- [ ] SODMasterModal 작동

### 데이터 저장 검증
- [ ] localStorage 저장 확인
- [ ] 새로고침 후 데이터 유지
- [ ] 탭 전환 후 데이터 유지
- [ ] DB 저장 확인 (saveAtomicDB)

### 고장 연결 검증
- [ ] L1 영향 → L2 고장형태 연결
- [ ] L2 고장형태 → L3 고장원인 연결
- [ ] FailureChainPanel 표시
- [ ] FK 값 정상 저장

### 구조분석 검증
- [ ] 공정 선택 기능
- [ ] 작업요소 추가 기능
- [ ] 데이터 저장/로드
- [ ] 확정/수정 토글

### 기능분석 검증
- [ ] L1/L2/L3 탭 데이터 입력
- [ ] 상위-하위 연결
- [ ] 요구사항/제품특성/공정특성 입력

---

## 🔧 복구 전략

### 옵션 A: 부분 수정 (권장)
- 손상된 로직만 선별하여 수정
- 장점: 빠른 복구, 최소 영향
- 단점: 누락된 손상 가능성

### 옵션 B: 커밋 롤백
- ea4a458a 커밋으로 전체 롤백 후 필요한 변경만 재적용
- 장점: 확실한 복구
- 단점: 1월 22일 이후 작업 손실

### 옵션 C: 파일별 선택 복구
```bash
# 특정 파일만 이전 버전으로 복구
git checkout ea4a458a -- src/components/modals/DataSelectModal.tsx
git checkout ea4a458a -- src/app/pfmea/worksheet/tabs/failure/FailureL1Tab.tsx
```

---

## 📝 작업 로그

| 날짜 | 작업 내용 | 상태 |
|-----|---------|-----|
| 2026-01-25 | 손상 분석 문서 작성 | ✅ 완료 |
| | Phase 1 긴급 수정 | ⬜ 대기 |
| | Phase 2 핵심 기능 복구 | ⬜ 대기 |
| | Phase 3 전체 검증 | ⬜ 대기 |

---

## 📌 참고 사항

### 1월 22일 이후 주요 변경 이력
1. **2026-01-22**: AP 개선관리 UI, PFMEA staging system
2. **2026-01-23**: L3 기능분석 리팩토링, useLinkData 훅 분리
3. **2026-01-24**: CP worksheet, EP검사장치, PFD/APQP 리스 크기 최적화
4. **2026-01-25**: 고장분석 탭 단계별 색상 체계 적용

### 복구 시 주의사항
- 색상 변경 작업은 유지 (단계별 색상 체계)
- AP 개선관리 기능은 신규 기능이므로 손상과 무관
- 핵심은 **데이터 저장/로드/연결** 로직 복구
