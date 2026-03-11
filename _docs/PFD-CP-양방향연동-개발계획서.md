# PFD ↔ CP 양방향 연동 개발 계획서

**작성일**: 2026-01-27  
**상태**: 🚧 개발 중  
**브랜치**: `feature/pfmea-context-menu`

---

## 1. 개요

### 1.1 목표
PFD(Process Flow Diagram)와 CP(Control Plan) 간의 양방향 연동 기능을 완성합니다.

### 1.2 범위
1. **PFD 등록 화면 개선** - CP 등록 화면과 동일한 구조로 업그레이드
2. **연동 대상 지정** - 상위 PFMEA, 연동 CP 선택 기능
3. **DB 스키마 정합성** - PFD/CP 테이블 연동 필드 확인
4. **양방향 연동 API** - PFD→CP, CP→PFD 완전한 DB 저장
5. **TDD 및 E2E 테스트** - 자동화 테스트로 품질 보증

---

## 2. 현재 상태 분석

### 2.1 CP 등록 화면 필드 (참조 이미지)

| 그룹 | 필드명 | 타입 | 설명 |
|-----|--------|------|------|
| 기본정보 | CP 유형 | Select | P - Part CP, S - Special CP 등 |
| 기본정보 | CP명 | Text | CP 명칭 |
| 기본정보 | FMEA&PFD 연동대상트 | Select | 연동 대상 선택 |
| 기본정보 | CP ID | Auto | 자동 생성 ID |
| 연동 | 상위 APCP | Select | 상위 APCP 선택 |
| 연동 | 상위 FMEA | Select | 상위 PFMEA 선택 |
| 연동 | 연동 PFD | Select | 연동할 PFD 선택 |
| 담당 | 공정 책임 | Text | 부서 |
| 담당 | CP 담당자 | Text | 담당자 ID |
| 담당 | 담당자 성명 | Text | 담당자 이름 |
| 일정 | 시작 일자 | Date | 시작일 |
| 일정 | 목표 완료일 | Date | 목표 완료일 |
| 기타 | 고객 명 | Text | 고객명 |
| 기타 | 엔지니어링 위치 | Text | 위치 |
| 기타 | 회사 명 | Text | 회사명 |
| 기타 | CP 종류 | Select | CP 종류 |
| 기타 | 모델 연식 | Text | 모델 연식 |
| 기타 | 어플리케이션 | Text | 어플리케이션 |

### 2.2 PFD 등록 화면 현재 상태

현재 PFD 등록 화면에서 **누락된 필드**:
- [ ] 상위 PFMEA 선택
- [ ] 연동 CP 선택
- [ ] 연동 대상 표시

---

## 3. 개발 작업 목록

### Phase 1: DB 스키마 검증 및 수정

#### 3.1 PfdRegistration 테이블 확인
```prisma
model PfdRegistration {
  // 기존 필드...
  fmeaId     String?  // 상위 PFMEA 연결
  cpNo       String?  // 연동 CP 번호
  // 추가 필요 필드...
}
```

#### 3.2 ControlPlan 테이블 확인
```prisma
model ControlPlan {
  // 기존 필드...
  pfdNo      String?  // 연동 PFD 번호 (추가 필요)
  // ...
}
```

### Phase 2: PFD 등록 화면 개선

#### 3.3 PFD 등록 폼 컴포넌트 수정
- `src/app/pfd/components/PfdRegistrationForm.tsx`
- CP 등록 화면과 동일한 레이아웃
- 필드 추가:
  - 상위 PFMEA (Select)
  - 연동 CP (Select)

#### 3.4 API 엔드포인트 수정
- `POST /api/pfd` - 등록 시 연동 정보 저장
- `PUT /api/pfd/[id]` - 수정 시 연동 정보 업데이트

### Phase 3: 양방향 연동 API 완성

#### 3.5 PFD → CP 연동 API (완료)
- `/api/control-plan/sync-from-pfd`
- DB 직접 저장 ✅
- 리다이렉트 ✅

#### 3.6 CP → PFD 연동 API (완료)
- `/api/pfd/sync-from-cp`
- DB 직접 저장 ✅
- 컬럼 매핑 수정 ✅

### Phase 4: TDD 테스트 작성

#### 3.7 단위 테스트
- `src/__tests__/api/pfd-registration.test.ts`
- `src/__tests__/api/cp-registration.test.ts`

#### 3.8 통합 테스트
- `src/__tests__/sync/pfd-cp-sync.test.ts`

#### 3.9 E2E 테스트
- `tests/e2e/pfd-cp-sync.spec.ts`

---

## 4. 컬럼 매핑 정의

### 4.1 PFD → CP 매핑

| PFD 필드 | CP 필드 | 설명 |
|----------|---------|------|
| pfdNo | - | PFD 번호 (참조용) |
| processNo | processNo | 공정번호 |
| processName | processName | 공정명 |
| processLevel | processLevel | 공정레벨 |
| processDesc | processDesc | 공정설명 |
| workElement | partName | 부품명 |
| equipment | workElement, equipment | 설비/금형/JIG |
| productChar | productChar | 제품특성 |
| processChar | processChar | 공정특성 |
| specialChar | specialChar | 특별특성 |

### 4.2 CP → PFD 매핑

| CP 필드 | PFD 필드 | 설명 |
|---------|----------|------|
| cpNo | - | CP 번호 (참조용) |
| processNo | processNo | 공정번호 |
| processName | processName | 공정명 |
| processLevel | processLevel | 공정레벨 |
| processDesc | processDesc | 공정설명 |
| partName | workElement | 부품명 |
| workElement, equipment | equipment | 설비/금형/JIG |
| productChar | productChar | 제품특성 |
| processChar | processChar | 공정특성 |
| specialChar | specialChar | 특별특성 |

---

## 5. 테스트 계획

### 5.1 TDD 테스트 케이스

#### API 테스트
```typescript
describe('PFD ↔ CP 양방향 연동', () => {
  // 1. PFD 등록 + 연동 정보 저장
  test('PFD 등록 시 상위 PFMEA, 연동 CP 저장', async () => {});
  
  // 2. PFD → CP 연동
  test('PFD 데이터를 CP로 연동 시 DB에 저장', async () => {});
  
  // 3. CP → PFD 연동
  test('CP 데이터를 PFD로 연동 시 DB에 저장', async () => {});
  
  // 4. 중복 연동
  test('기존 데이터 있을 때 업데이트', async () => {});
  
  // 5. 양방향 연동 일관성
  test('PFD→CP→PFD 왕복 연동 시 데이터 일치', async () => {});
});
```

### 5.2 E2E 테스트 시나리오

```typescript
test('PFD 생성 → CP 연동 → CP 확인', async ({ page }) => {
  // 1. PFD 등록 페이지로 이동
  // 2. 필수 정보 입력 (상위 PFMEA, 연동 CP 포함)
  // 3. PFD 워크시트에서 데이터 입력
  // 4. "CP로 연동" 버튼 클릭
  // 5. CP 워크시트로 이동 확인
  // 6. 연동된 데이터 검증
});
```

---

## 6. 진행 일정

| 순서 | 작업 | 예상 시간 | 상태 |
|------|------|-----------|------|
| 1 | DB 스키마 검증 | 30분 | ✅ 완료 |
| 2 | PFD 등록 화면 수정 | 1시간 | ✅ 완료 |
| 3 | API 수정 | 30분 | ✅ 완료 |
| 4 | TDD 테스트 작성 | 1시간 | ✅ 완료 |
| 5 | E2E 테스트 작성 | 1시간 | ✅ 완료 |
| 6 | 테스트 실행 및 검증 | 30분 | ✅ 완료 |
| 7 | 수동 테스트 요청 | - | ⏳ 대기 |

**테스트 실행 안내**
- 통합 테스트(pfd-cp-sync, cp-pfd-sync)는 **FULL_SYSTEM** 환경 필요
- `npm run dev` 실행 후 `npx vitest run src/__tests__/sync/pfd-cp-sync.test.ts` 실행
- 서버 미실행 시 자동 스킵 (실패 아님)

---

## 7. 수동 테스트 체크리스트

### 7.1 PFD 등록 화면
- [ ] 상위 PFMEA 선택 드롭다운 표시
- [ ] 연동 CP 선택 드롭다운 표시
- [ ] 등록 시 연동 정보 DB 저장 확인

### 7.2 PFD → CP 연동
- [ ] PFD 워크시트에서 "CP로 연동" 버튼 클릭
- [ ] CP 워크시트로 자동 이동
- [ ] 공정번호, 공정명, 부품명, 설비 등 정확히 매핑
- [ ] NO 컬럼 공정별 순번 표시

### 7.3 CP → PFD 연동
- [ ] CP 워크시트에서 "PFD로 연동" 버튼 클릭
- [ ] PFD 워크시트로 자동 이동
- [ ] 공정번호, 공정명, 부품명, 설비 등 정확히 매핑
- [ ] NO 컬럼 공정별 순번 표시

---

## 8. 참조 문서

- [CP-PFD 연동 버그수정 보고서](./bugfix/CP-PFD-연동-버그수정-20260127.md)
- [PFMEA-PFD 연동 PRD](./PFMEA-PFD-연동-PRD.md)
- [PFMEA-PFD 연동 TodoList](./PFMEA-PFD-연동-TodoList.md)
