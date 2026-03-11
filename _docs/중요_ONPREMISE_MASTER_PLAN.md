# 🚀 FMEA On-Premise 출시 마스터 플랜

> **문서 버전**: 2.9.0  
> **작성일**: 2026-01-10  
> **최종 수정**: 2026-01-25 (CP/PFD 워크시트 병합 로직 완성)  
> **상태**: 종합 진단 완료

---

## ⚠️ 개발 필수 룰 (MANDATORY RULES)

> **최종 개정**: 2026-01-19  
> **적용 범위**: FMEA On-Premise 프로젝트 전체  
> ❌ **위반 시 롤백 대상**

### 🔴 Rule 1: UI 변경 금지
```
기존 UI는 절대 변경하지 않는다.
- 레이아웃, 색상, 크기, 위치 변경 금지
- 사용자가 명시적으로 UI 변경을 요청한 경우에만 수정
```

### 🔴 Rule 2: 코드프리즈 수정 금지
```
코드프리즈된 파일은 절대 수정하지 않는다.
- CODEFREEZE 주석이 있는 파일은 읽기 전용
- 수정 필요시 반드시 사용자에게 허락을 먼저 요청
```

### 🔴 Rule 3: 명시적 허락 필수 (유추 허락 금지)
```
수정이 필요한 경우 반드시 사용자의 명시적 허락을 받는다.
- ❌ "아마 괜찮을 것 같아서" 수정 → 금지
- ❌ "비슷한 요청이었으니까" 수정 → 금지
- ✅ "이 파일의 이 부분을 수정해도 될까요?" → 필수
- ✅ 사용자가 "네, 수정해주세요" 응답 후 수정 → 허용
```

### 🟡 Rule 4: 데이터 연동 고려
```
관련 앱 화면의 데이터 연동을 항상 고려한다.
- PFMEA ↔ DFMEA 데이터 동기화
- FMEA ↔ CP (관리계획서) 연동
- 워크시트 ↔ ALL 화면 ↔ 고장연결 데이터 일관성
```

### 🟡 Rule 5: 모듈화/표준화/공용화 검토 (700행 제한)
```
새로운 기능 추가 시 반드시 검토한다:
1. 기존 코드 줄 수: 700행 초과 시 분리 필수
2. 모듈화: 기능별 파일 분리
3. 표준화: 동일 패턴의 코드는 공용 함수로 추출
4. 공용화: PFMEA/DFMEA 공통 로직은 공용 모듈 사용
```

### 🟡 Rule 6: DB 원자성 보장
```
모든 화면 데이터는 DB에 원자성 있게 보관되어야 한다.
- localStorage 임시 저장 → DB 영구 저장 필수
- 새로고침 후에도 데이터 유지
- 동시 편집 시 데이터 무결성 보장
```

### 🟡 Rule 7: CRUD 종합 검토
```
기능 개발 시 CRUD 모든 측면에서 종합적으로 검토한다:
- Create: 데이터 생성 시 DB 저장 확인
- Read: 데이터 로드 시 DB → UI 정확히 표시
- Update: 수정 시 DB 즉시 반영 (setStateSynced + saveAtomicDB)
- Delete: 삭제 시 DB에서 완전 제거 + 연관 데이터 정리
```

### 🟡 Rule 8: 타입 지정 필수
```typescript
// ❌ 금지: any 타입 남발
const data: any = response;

// ✅ 필수: 명확한 타입 지정
interface FMItem {
  id: string;
  fmNo: string;
  processName: string;
  text: string;
}
const data: FMItem[] = response;
```

### 🔴 Rule 9: 기존 기능 손상 금지 (핵심 로직 보호)
```
새 기능 추가 시 기존 핵심 로직을 절대 수정하지 않는다.

⛔ 고장연결 (FailureLink) 절대 수정 금지 영역:
├── useSVGLines.ts: SVG 화살표 좌표 계산 로직
├── linkedFEs/linkedFCs 상태: 기존 useEffect 외에서 setLinkedFEs/setLinkedFCs 호출 금지
├── FM 선택 useEffect: currentFMId 변경 시 연결 로드 로직
├── confirmLink: 연결확정 시 savedLinks 병합 로직
└── 화살표 스타일: strokeWidth="2", stroke 색상, markerEnd 절대 변경 금지

✅ 안전한 기능 추가 방법:
1. 기존 상태는 읽기만 (useMemo로 파생 데이터 계산)
2. 수정 필요시 savedLinks만 변경 (linkedFEs/linkedFCs 직접 수정 금지)
3. UI 표시용 별도 상태 사용
4. 수정 전 전체 플로우 테스트 필수: FM 선택 → FE/FC 연결 → 해제 → 재연결
```

---

### 📋 룰 위반 체크리스트

| 룰 | 체크 항목 | 위반 시 조치 |
|----|----------|-------------|
| Rule 1 | UI 변경 여부 확인 | 롤백 |
| Rule 2 | 코드프리즈 파일 확인 | 롤백 |
| Rule 3 | 사용자 허락 여부 확인 | 롤백 |
| Rule 4 | 연관 화면 데이터 확인 | 수정 |
| Rule 5 | 파일 줄 수 확인 (700행) | 분리 |
| Rule 6 | DB 저장 확인 | 수정 |
| Rule 7 | CRUD 동작 확인 | 수정 |
| Rule 8 | 타입 지정 확인 | 수정 |
| **Rule 9** | **기존 핵심 로직 손상 여부** | **즉시 롤백** |

---

## 🆕 v2.9.0 신규 기능 (2026-01-25)

### ✅ CP 워크시트 병합 로직 완성

| 기능 | 설명 | 상태 |
|------|------|------|
| **A,B열 행추가** | 병합 그룹 외부에 새 공정 추가 (기존 병합 유지) | ✅ 완료 |
| **D열 행추가** | C,D 병합 그룹 외부에 새 공정설명 추가 | ✅ 완료 |
| **E열 행추가** | C,D 병합 그룹 확장병합 (위로/아래로) | ✅ 완료 |
| **I열 행추가** | E열 병합 그룹 확장병합 (위로/아래로) | ✅ 완료 |
| **빈 값 병합** | 부모 미입력 셀도 물리적 확장병합 지원 | ✅ 완료 |

### ✅ CP 모달 기능 개선

| 기능 | 설명 | 상태 |
|------|------|------|
| **전체/해제/적용/삭제** | 4개 메뉴 버튼 (PFMEA와 동일) | ✅ 완료 |
| **신규 입력** | 입력 후 Enter → 목록에 추가 및 워크시트 반영 | ✅ 완료 |
| **무한루프 수정** | useEffect 의존성 정리로 안정성 향상 | ✅ 완료 |

### ✅ PFD 워크시트 구현 (CP 로직 적용)

| 기능 | 설명 | 상태 |
|------|------|------|
| **useWorksheetHandlers** | CP와 동일한 행추가 병합 로직 | ✅ 완료 |
| **useRowSpan** | useDescRowSpan, useWorkRowSpan 추가 | ✅ 완료 |
| **빈 값 병합** | 부모 미입력 셀도 물리적 확장병합 지원 | ✅ 완료 |

---

## 🆕 v2.8.0 신규 기능 (2026-01-22)

### ✅ FixedLayout 공통 컴포넌트

| 구성요소 | 경로 | 설명 |
|---------|------|------|
| 공통 레이아웃 | `src/components/layout/FixedLayout.tsx` | 고정 TopNav, 고정 Sidebar, 스크롤 가능한 콘텐츠 영역 |

#### 적용 페이지
- ✅ DFMEA 등록 (`/dfmea/register`)
- ✅ DFMEA 리스트 (`/dfmea/list`)
- ✅ PFMEA 등록 (`/pfmea/register`)
- ✅ PFMEA 리스트 (`/pfmea/list`)
- ✅ Control Plan 등록 (`/control-plan/register`)

#### 효과
- 스크롤 시 TopNav(바로가기 메뉴) 항상 고정
- 사이드바 확장/축소 연동 (이벤트 리스너)
- 일관된 레이아웃 경험 제공

### ✅ 모달 Portal 패턴 적용

| 모달 | 경로 | 적용 내용 |
|------|------|----------|
| UserSelectModal | `src/components/modals/UserSelectModal.tsx` | Portal + 스크롤 잠금 |
| BizInfoSelectModal | `src/components/modals/BizInfoSelectModal.tsx` | Portal + 스크롤 잠금 |
| DatePickerModal | `src/components/DatePickerModal.tsx` | Portal 적용 |

#### 효과
- 모달 열림/닫힘 시 스크롤 위치 유지
- 레이아웃 간섭 방지 (`document.body`에 렌더링)
- CFT 모달 클릭 후 스크롤 점프 문제 해결

---

## 🆕 v2.7.0 신규 기능 (2026-01-19)

### ✅ 이메일 결재 시스템

| 구성요소 | 경로 | 설명 |
|---------|------|------|
| 이메일 서비스 | `src/lib/email/emailService.ts` | Nodemailer 기반 SMTP 발송 |
| 결재 토큰 | `src/lib/email/approvalToken.ts` | HMAC-SHA256 서명 토큰 (7일 만료) |
| 결재 API | `/api/fmea/approval` | POST(요청), PUT(처리), GET(조회) |
| 결재 페이지 | `/pfmea/approve` | 이메일 링크에서 승인/반려 |
| 관리자 설정 | `/admin/settings/approval` | SMTP, 결재자, 알림, 그룹웨어 설정 |

#### 결재 흐름
```
작성자(FMEA 책임자) → 검토자(프로젝트 리더) → 승인자(챔피언)
        ↓ 📧 이메일           ↓ 📧 이메일           ↓ 📧 이메일
      결재 링크 발송        결재 링크 발송        최종 승인/반려
```

#### 관리자 환경설정 탭
1. **SMTP 설정**: Gmail, 네이버, 카카오, MS365, 직접입력
2. **결재자 자동 지정**: FMEA 등록정보 연동
3. **알림 설정**: 이메일, 시스템내, 리마인더
4. **그룹웨어 연동**: 네이버웍스, 카카오워크, MS365

### ✅ 버전 백업 시스템

| 구성요소 | 설명 |
|---------|------|
| DB 테이블 | `FmeaVersionBackup` (version, backupData, triggerType) |
| 백업 API | `/api/fmea/version-backup` (POST/PUT/GET) |
| 자동 백업 | 고장연결 확정, 6ST 확정 시 `AUTO_CONFIRM` |
| 복구 기능 | 개정이력, 변경히스토리에서 ↩️ 버튼 |

### ✅ 개정관리 개선

| 항목 | 변경 전 | 변경 후 |
|------|--------|--------|
| 개정번호 형식 | Rev.00, Rev.01 | 1.00, 1.01, 2.00 |
| 백업 버튼 | 수동 백업 | 자동 백업 (버튼 제거) |
| 복구 버튼 | 없음 | ↩️ (삭제 버튼 좌측) |
| 결재 요청 | 없음 | 📧 버튼 (작성/검토/승인) |

---

다른 주요 URL
화면	URL
루트 (Welcome Board)	http://localhost:3000
FMEA 등록 (시작점)	http://localhost:3000/pfmea/register
FMEA 리스트	http://localhost:3000/pfmea/list
FMEA 작성화면	http://localhost:3000/pfmea/worksheet?id={fmeaId}<br/>예: http://localhost:3000/pfmea/worksheet?id=pfm26-P001
FMEA 기초정보 등록	http://localhost:3000/pfmea/import
DB 뷰어	http://localhost:3000/admin/db-viewer
3. 빠른 접속 방법
브라우저 주소창 열기
URL 복사/붙여넣기:
   http://localhost:3000/pfmea/register
Enter 키 누르기
---

## 📋 FMEA 작성 순서 (표준 워크플로우)

```
1. FMEA 등록 → 2. FMEA 기초정보 등록 → 3. CFT 리스트 등록 → 4. 저장
   ↓
5. FMEA 리스트 생성 → 6. FMEA 작성화면 이동
   ↓
7. 구조분석 → 8. 1L기능 → 9. 2L기능 → 10. 3L기능
   ↓
11. 1L영향(FE) → 12. 2L형태(FM) → 13. 3L원인(FC)
   ↓
14. 고장연결 → 15. 5ST작성(리스크분석) 확정 → 16. 6ST작성(최적화) 확정
   ↓
✅ FMEA 완성
```

---

## 📊 단계별 진단 결과

### 🔴 **DB 구축 상태 (최우선)**

#### ✅ DB 구축 완료된 화면

| 화면 | DB 테이블 | API | 상태 |
|------|----------|-----|------|
| **FMEA 등록** | `fmea_projects`, `fmea_registrations`, `fmea_cft_members` | `/api/fmea/projects` | ✅ 완료 |
| **FMEA 워크시트** | `l1_structures`, `l2_structures`, `l3_structures`<br/>`l1_functions`, `l2_functions`, `l3_functions`<br/>`failure_effects`, `failure_modes`, `failure_causes`<br/>`failure_links`, `risk_analyses`, `optimizations`<br/>`fmea_worksheet_data`, `fmea_confirmed_states` | `/api/fmea/save-legacy`<br/>원자성 DB 저장 | ✅ 완료 |
| **FMEA 리스트** | `fmea_projects` | `/api/fmea/projects` | ✅ 완료 |
| **FMEA 기초정보** | `pfmea_master_datasets`, `pfmea_master_flat_items` | `/api/pfmea/master` | ✅ 완료 |
| **사용자 정보** | `users` | `/api/users` | ✅ 완료 (2026-01-11) |

#### ❌ DB 구축 미완료된 화면 (localStorage만 사용)

| 화면 | 현재 저장 방식 | 필요한 DB 테이블 | 우선순위 |
|------|---------------|-----------------|---------|
| **고객사 정보** (`/master/customer`) | ❌ localStorage만 | `customers` 테이블 필요 | 🔴 **높음** |
| **프로젝트 기초정보** (`/master/customer` 모달) | ❌ localStorage만 | `bizinfo_projects` 테이블 필요 | 🔴 **높음** |
| **APQP 프로젝트** | ⚠️ `apqp_projects` 테이블 있음<br/>❌ localStorage도 사용 | DB API 미완성 | 🟡 **중간** |
| **Control Plan** | ❌ localStorage만 | `control_plan_projects`, `control_plan_items` 필요 | 🟡 **중간** |
| **PFD (공정흐름도)** | ❌ localStorage만 | `pfd_projects`, `pfd_processes` 필요 | 🟡 **중간** |
| **DFMEA** | ⚠️ 일부 DB 있음<br/>❌ localStorage 혼용 | DB 완전 전환 필요 | 🟡 **중간** |

#### ⚠️ DB + localStorage 혼용 화면

| 화면 | DB 저장 | localStorage 사용 | 문제점 |
|------|---------|------------------|--------|
| **FMEA 워크시트** | ✅ 원자성 DB 저장 | ⚠️ tab, riskData 캐시용 | 데이터 불일치 가능 |
| **FMEA Import** | ✅ 마스터 데이터 DB | ⚠️ 임시 데이터 localStorage | 일관성 필요 |

---

### 1️⃣ FMEA 등록 (`/pfmea/register`)

| 항목 | 상태 | 비고 |
|------|------|------|
| UI 개발 | ✅ 완료 | `codefreeze-20260110-register-final` |
| DB 저장 | ✅ 완료 | `POST /api/fmea/projects` |
| 원자성 | ✅ 확보 | 트랜잭션 처리 완료 |
| 코드프리즈 | ✅ 완료 | 디자인 확정 |

**기능**:
- FMEA 기초정보 테이블 (4행 8컬럼)
- FMEA 등록 옵션 (Master/Family/Part/신규입력)
- AI 예측 FMEA 테이블
- FMEA ID 자동 생성 (pfm26-M001, pfm26-F001, pfm26-P001)

---

### 2️⃣ FMEA 기초정보 등록 (`/pfmea/import`)

| 항목 | 상태 | 비고 |
|------|------|------|
| UI 개발 | ✅ 완료 | `codefreeze-20260110-pfmea-import` |
| Excel Import | ✅ 완료 | 다중 시트 파싱 |
| Master 저장 | ✅ 완료 | localStorage + DB 동시 저장 |
| 시트명 변경 | ✅ 완료 | A1~C4 → L2-1~L1-4 형식 |
| 코드프리즈 | ✅ 완료 | `codefreeze-20260110-excel-sheet` |

**기능**:
- 전체/개별 Import
- 빈 템플릿/샘플 다운로드
- 관계형 데이터 Preview
- FMEA 목록 DB API 연동

---

### 3️⃣ CFT 리스트 등록 (등록화면 내장)

| 항목 | 상태 | 비고 |
|------|------|------|
| UI 개발 | ✅ 완료 | `CFTRegistrationTable` 컴포넌트 |
| CFT 저장 | ✅ 완료 | PostgreSQL DB 연동 및 지속성 확보 |
| 지속성 검증 | ✅ 완료 | `codefreeze-20260111-cft-persistence-fixed` |
| 접속 로그 | ✅ 완료 | `CFTAccessLogTable` 컴포넌트 |
| 사이드바 메뉴 | ✅ 제거됨 | 등록화면에 통합 |

---

### 4️⃣ FMEA 리스트 (`/pfmea/list`)

| 항목 | 상태 | 비고 |
|------|------|------|
| UI 개발 | ✅ 완료 | 14컬럼 테이블 |
| DB 조회 | ✅ 완료 | `GET /api/fmea/projects` |
| 미입력 표시 | ✅ 완료 | 주황색 "미입력" 배지 |
| 상위 FMEA | ✅ 완료 | 상속 관계 표시 |
| TYPE 배지 | ✅ 완료 | M/F/P 구분 |

---

### 5️⃣ 구조분석 (`StructureTab.tsx`)

| 항목 | 상태 | 비고 |
|------|------|------|
| UI 개발 | ✅ 완료 | 725줄 |
| 코드프리즈 | ✅ 완료 | 2026-01-05 |
| DB 저장 | ✅ 완료 | L1Structure, L2Structure 테이블 |
| 확정 기능 | ✅ 완료 | 확정 버튼 + 배지 |

---

### 6️⃣ 기능분석 - 1L/2L/3L (`FunctionL1Tab`, `FunctionL2Tab`, `FunctionL3Tab`)

| 항목 | 상태 | 비고 |
|------|------|------|
| 1L 기능 | ✅ 완료 | 767줄, 코드프리즈 |
| 2L 기능 | ✅ 완료 | 코드프리즈 |
| 3L 기능 | ✅ 완료 | 코드프리즈 |
| 다중선택 | ✅ 완료 | `codefreeze-20260103-multiselect` |
| DB 저장 | ✅ 완료 | L1Function, L2Function, L3Function 테이블 |

---

### 7️⃣ 고장분석 - 1L영향/2L형태/3L원인 (`FailureL1Tab`, `FailureL2Tab`, `FailureL3Tab`)

| 항목 | 상태 | 비고 |
|------|------|------|
| 1L 영향(FE) | ✅ 완료 | 845줄, 코드프리즈 |
| 2L 형태(FM) | ✅ 완료 | 코드프리즈 |
| 3L 원인(FC) | ✅ 완료 | 코드프리즈 |
| 심각도 선택 | ✅ 완료 | SODSelectModal |
| DB 저장 | ✅ 완료 | FailureEffect, FailureMode, FailureCause 테이블 |

---

### 8️⃣ 고장연결 (`FailureLinkTab.tsx`)

| 항목 | 상태 | 비고 |
|------|------|------|
| UI 개발 | ✅ 완료 | 1344줄 |
| FE-FM-FC 연결 | ✅ 완료 | 드래그&드롭, 클릭 연결 |
| 다이어그램 | ✅ 완료 | SVG 라인 표시 |
| DB 저장 | ✅ 완료 | FailureLink 테이블 |
| 코드프리즈 | ✅ 완료 | `codefreeze-20260105-failure-link-ui` |

---

### 9️⃣ 리스크분석 5ST (`RiskTabConfirmable.tsx`)

| 항목 | 상태 | 비고 |
|------|------|------|
| UI 개발 | ✅ 완료 | 332줄 |
| SOD 입력 | ✅ 완료 | 심각도/발생도/검출도 |
| AP/RPN 계산 | ✅ 완료 | 자동 계산 |
| 확정 기능 | ✅ 완료 | 확정 시 DB 저장 |
| DB 저장 | ✅ 완료 | RiskAnalysis 테이블 |
| 코드프리즈 | ✅ 완료 | `codefreeze-20260106-risk-opt-confirm` |

---

### 🔟 최적화 6ST (`OptTabConfirmable.tsx`)

| 항목 | 상태 | 비고 |
|------|------|------|
| UI 개발 | ✅ 완료 | 406줄 |
| 개선 계획 | ✅ 완료 | 조치/책임자/목표일 |
| 결과 모니터링 | ✅ 완료 | 새 SOD 값 |
| 효과 평가 | ✅ 완료 | 새 AP/RPN |
| 확정 기능 | ✅ 완료 | 확정 시 DB 저장 |
| DB 저장 | ✅ 완료 | Optimization 테이블 |
| 코드프리즈 | ✅ 완료 | `codefreeze-20260106-risk-opt-confirm` |

---

## 🗄️ DB 구축 현황 및 진단

### ✅ 완료된 DB 테이블 (22개)

#### 1. FMEA 프로젝트 관리 (5개)
- `fmea_projects` - 프로젝트 기본 정보
- `fmea_registrations` - 등록 정보 (기획 및 준비 1단계)
- `fmea_cft_members` - CFT 멤버 정보
- `fmea_worksheet_data` - 워크시트 데이터 (JSON)
- `fmea_confirmed_states` - 확정 상태

#### 2. FMEA 워크시트 원자성 테이블 (13개)
- `l1_structures` - 완제품 구조
- `l2_structures` - 메인공정 구조
- `l3_structures` - 작업요소 구조
- `l1_functions` - 완제품 기능
- `l2_functions` - 메인공정 기능
- `l3_functions` - 작업요소 기능
- `failure_effects` - 고장영향 (FE)
- `failure_modes` - 고장형태 (FM)
- `failure_causes` - 고장원인 (FC)
- `failure_links` - 고장연결 (FE-FM-FC)
- `risk_analyses` - 리스크분석
- `optimizations` - 최적화
- `fmea_legacy_data` - 레거시 데이터 (하위호환)

#### 3. 마스터 데이터 (3개)
- `pfmea_master_datasets` - PFMEA 기초정보 마스터
- `pfmea_master_flat_items` - PFMEA 기초정보 플랫 아이템
- `users` - 사용자 정보 (전체 프로젝트 공유)

#### 4. 기타 (1개)
- `apqp_projects` - APQP 프로젝트 (테이블만 있고 API 미완성)

---

### ❌ 미구축 DB 테이블 (필수)

#### 1. 기초정보 마스터 데이터 (높음 우선순위)

| 테이블명 | 용도 | 현재 상태 | 필요 작업 |
|---------|------|----------|----------|
| `customers` | 고객사 정보 | ❌ localStorage만 | DB 테이블 생성 + API + 마이그레이션 |
| `bizinfo_projects` | 프로젝트 기초정보 | ❌ localStorage만 | DB 테이블 생성 + API + 마이그레이션 |
| `factories` | 공장 정보 | ❌ localStorage만 | DB 테이블 생성 + API (선택사항) |
| `products` | 품명 정보 | ❌ localStorage만 | DB 테이블 생성 + API (선택사항) |

#### 2. 다른 모듈 DB (중간 우선순위)

| 테이블명 | 용도 | 현재 상태 | 필요 작업 |
|---------|------|----------|----------|
| `control_plan_projects` | Control Plan 프로젝트 | ❌ localStorage만 | DB 테이블 생성 + API |
| `control_plan_items` | Control Plan 항목 | ❌ localStorage만 | DB 테이블 생성 + API |
| `pfd_projects` | PFD 프로젝트 | ❌ localStorage만 | DB 테이블 생성 + API |
| `pfd_processes` | PFD 공정 | ❌ localStorage만 | DB 테이블 생성 + API |
| `dfmea_projects` | DFMEA 프로젝트 | ⚠️ 일부 DB | 완전 전환 필요 |
| `apqp_projects` | APQP 프로젝트 | ⚠️ 테이블만 있음 | API 완성 필요 |

---

### 테이블 구조 (프로젝트별 스키마)

```
fmea_projects (프로젝트 기본 정보)
├── fmea_registrations (등록 정보)
├── fmea_cft_members (CFT 멤버)
├── fmea_worksheet_data (워크시트 JSON)
├── fmea_confirmed_states (확정 상태)
└── fmea_legacy_data (레거시 데이터)

워크시트 원자성 테이블 (fmeaId 기준):
├── l1_structures (완제품 구조)
│   ├── l2_structures (메인공정 구조)
│   │   └── l3_structures (작업요소 구조)
│   └── l1_functions (완제품 기능)
├── l2_functions (메인공정 기능)
├── l3_functions (작업요소 기능)
├── failure_effects (고장영향)
├── failure_modes (고장형태)
├── failure_causes (고장원인)
├── failure_links (고장연결)
├── risk_analyses (리스크분석)
└── optimizations (최적화)
```

### 트랜잭션 처리

| API | 트랜잭션 | 타임아웃 | 롤백 |
|-----|---------|---------|------|
| POST /api/fmea | ✅ $transaction | 30초 | ✅ 자동 |
| POST /api/fmea/projects | ✅ 순차 실행 | - | ✅ 수동 |

### 데이터 무결성 가드

- ✅ **덮어쓰기 방지**: 빈 데이터로 기존 데이터 덮어쓰기 차단
- ✅ **FK 검증**: FailureLink 저장 시 유효한 FK만 저장
- ✅ **레거시 데이터 우선**: Single Source of Truth 패턴

---

## 📋 핵심 규칙 (Rules)

### 룰 1번: UI 코드프리즈 (2026-01-10)
**원칙**: 모든 UI는 코드프리즈됨. **절대 수정 금지 목록**: 등록화면, 리스트, 워크시트, Import, 개정관리, 기초정보, 웰컴보드, 사이드바, 모든 모달, 레이아웃.  
**UI 수정 시 필수 프로세스**: 1) "이 파일은 코드프리즈입니다. 수정하시겠습니까?" 질문 2) 사용자 승인 후 → "어디까지 수정할까요?" 범위 확인 3) 범위 승인 후에만 수정 시작.  
**위반 시**: 즉시 `git checkout`으로 복원.  
**태그**: `codefreeze-20260110-all-ui-freeze`

### 룰 2번: FMEA 리스트와 DB는 1:1 관계 (2026-01-10)
**원칙**: 각 FMEA ID당 DB에는 **최신본 하나만** 유지되어야 함. FMEA 리스트와 DB는 **1:1 매핑** 관계.

**필수 사항**:
1. **저장 시 중복 방지**: 동일 `fmeaId`의 모든 기존 행을 삭제 후 최신본만 INSERT
2. **ID 형식 통일**: `info-${fmeaId}` 형식으로 Primary Key 생성 (예: `info-pfm26-M001`)
3. **완전한 데이터 저장**: 모든 필드(`engineeringLocation`, `designResponsibility`, `fmeaRevisionDate`, `confidentialityLevel`, `fmeaResponsibleName`, `companyName`, `customerName`, `cftMembers` 등) 필수 포함
4. **저장 검증**: 저장 후 반드시 DB에 완전한 데이터가 저장되었는지 확인

**구현 위치**:
- API: `src/app/api/fmea/projects/route.ts` (POST 메서드)
- 저장 로직: 동일 `fmeaId`의 모든 기존 행 삭제 → 최신본 INSERT

**검증 방법**:
- DB 뷰어: `http://localhost:3000/admin/db-viewer`에서 확인
- 스크립트: `node scripts/check-duplicate-ids.js ${fmeaId}`
- 테스트 URL 제공 시 반드시 DB 스키마 URL도 함께 제공

**테스트 URL 제공 형식**:
```
테스트 URL: http://localhost:3000/pfmea/register?id=pfm26-M001
DB 확인 URL: http://localhost:3000/admin/db-viewer
```

---

## 🏷️ 코드프리즈 현황

### 최신 코드프리즈 태그 (2026-01-10)

| 태그 | 범위 |
|------|------|
| `codefreeze-20260110-full-system` | 전체 시스템 |
| `codefreeze-20260110-register-final` | 등록화면 디자인 |
| `codefreeze-20260110-sidebar` | 사이드바 메뉴 |
| `codefreeze-20260110-pfmea-import` | Import 화면 |
| `codefreeze-20260110-excel-sheet` | Excel 시트명 |
| `codefreeze-20260110-master-info` | 기초정보 화면 |

### 워크시트 탭 코드프리즈 (2026-01-05~06)

| 탭 | 프리즈 일자 | 상태 |
|-----|-----------|------|
| StructureTab | 2026-01-05 | ✅ |
| FunctionL1Tab | 2026-01-05 | ✅ |
| FunctionL2Tab | 2026-01-05 | ✅ |
| FunctionL3Tab | 2026-01-05 | ✅ |
| FailureL1Tab | 2026-01-05 | ✅ |
| FailureL2Tab | 2026-01-05 | ✅ |
| FailureL3Tab | 2026-01-05 | ✅ |
| FailureLinkTab | 2026-01-05 | ✅ |
| RiskTabConfirmable | 2026-01-06 | ✅ |
| OptTabConfirmable | 2026-01-06 | ✅ |

---

## ⚠️ 보완 필요 사항

### 🔴 높음 (출시 전 필수) - **DB 우선**

| No | 항목 | 현황 | 조치 필요 |
|----|------|------|----------|
| **0** | **🔥 고객사 정보 DB 구축** | ❌ **localStorage만** | `customers` 테이블 생성 + API + 마이그레이션 |
| **0** | **🔥 프로젝트 기초정보 DB 구축** | ❌ **localStorage만** | `bizinfo_projects` 테이블 생성 + API + 마이그레이션 |
| 1 | ~~FMEA 개정관리 화면~~ | ✅ **완료** | DB API + 등록정보 자동연동 + 6ST 승인버튼 (codefreeze-20260110-revision-approval) |
| 2 | AllViewTab 데이터 표시 | ⚠️ 부분 완료 | 전체 뷰 정합성 검증 필요 |
| 3 | **온프레미스 DB 구축 가이드** | ⚠️ **누락** | PostgreSQL 설치, 스키마 생성, 초기 데이터 설정 가이드 |
| 4 | **프로젝트별 백업 시스템** | ⚠️ **부분 완료** | FMEA 작성 시 자동 백업 (엑셀/JSON/화면 스냅샷) |
| 5 | **사용자 인증 관리** | ❌ **미개발** | 로그인/로그아웃, 세션 관리, 인증 토큰 |
| 6 | **사용자별 권한 설정** | ❌ **미개발** | 역할 기반 권한 (Admin/Editor/Viewer), 프로젝트별 접근 제어 |

### 🟡 중간 (출시 후 개선)

| No | 항목 | 현황 | 조치 필요 |
|----|------|------|----------|
| 1 | Excel Export | ⚠️ 부분 완료 | 전체 FMEA 양식 Export |
| 2 | PDF Export | ⚠️ 미개발 | 출력용 PDF 생성 |
| 3 | **프로젝트별 복구/복사/이동** | ⚠️ **부분 완료** | export-package API 있으나 UI 화면 필요 |
| 4 | **서버 이전 가이드** | ⚠️ **누락** | 프로젝트별 파일 이동, DB 마이그레이션 가이드 |
| 5 | **화면 결과 백업** | ⚠️ **누락** | 스냅샷/스크린샷 자동 저장 |

### 🟢 낮음 (향후 개선)

| No | 항목 | 현황 | 조치 필요 |
|----|------|------|----------|
| 1 | FMEA 4판 변환 | ✅ 기본 완료 | 정밀 검증 필요 |
| 2 | CP 연동 | ✅ 기본 완료 | 양방향 동기화 |
| 3 | PFD 연동 | ⚠️ 미개발 | 공정흐름도 연결 |

---

---

## 🏗️ 온프레미스 출시 필수 구축 사항

### 1️⃣ DB 구축 (PostgreSQL)

#### 필수 작업
- [ ] PostgreSQL 설치 및 설정
- [ ] 데이터베이스 생성 (`fmea_db`)
- [ ] Prisma 마이그레이션 실행 (`npx prisma migrate deploy`)
- [ ] 초기 데이터 설정 (마스터 데이터)
- [ ] DB 백업 스케줄 설정 (일일 자동 백업)

#### 참고 문서
- `docs/DB_BACKUP_GUIDE.md` - 백업/복원 가이드
- `docs/USER_MASTER_DB_MIGRATION.md` - 사용자 정보 DB 마이그레이션

---

### 2️⃣ 백업 시스템

#### 프로젝트별 백업 요구사항

**FMEA 작성 완료 시 자동 백업:**
- [ ] **엑셀 파일** - 전체 FMEA 데이터 (Excel Export)
- [ ] **JSON 파일** - 원본 데이터 (export-package API)
- [ ] **화면 스냅샷** - 최종 화면 상태 (스크린샷)

**백업 저장 위치:**
```
backups/
├── projects/
│   ├── {fmeaId}/
│   │   ├── {fmeaId}_{YYYYMMDD_HHMMSS}.xlsx  # 엑셀 파일
│   │   ├── {fmeaId}_{YYYYMMDD_HHMMSS}.json  # JSON 파일
│   │   ├── {fmeaId}_{YYYYMMDD_HHMMSS}.png   # 화면 스냅샷
│   │   └── metadata.json                     # 메타데이터
```

#### 구현 필요 항목
- [ ] FMEA 확정 시 자동 백업 트리거
- [ ] 백업 파일 자동 정리 (30일 이상 된 파일 삭제)
- [ ] 백업 목록 조회 API
- [ ] 백업 복원 UI 화면

#### 현재 상태
- ✅ export-package API 존재 (`/api/fmea/export-package`)
- ✅ import-package API 존재 (`/api/fmea/import-package`)
- ⚠️ 자동 백업 스케줄러 미구현
- ⚠️ 화면 스냅샷 기능 미구현
- ⚠️ 백업 관리 UI 미구현

---

### 3️⃣ 사용자 정보 및 기초정보 DB 구축

#### ✅ 완료된 항목
- ✅ **사용자 정보 DB** (`users` 테이블) - **완료 (2026-01-11)**
  - 위치: PostgreSQL DB
  - API: `/api/users`
  - 전체 프로젝트 공유
  - 파일: `prisma/schema.prisma` (User 모델)
- ✅ **PFMEA 기초정보 DB** (`pfmea_master_datasets`, `pfmea_master_flat_items`)
  - 위치: PostgreSQL DB
  - API: `/api/pfmea/master`
  - Excel Import 시 DB 저장

#### ❌ 미완료 항목 (🔥 최우선)

##### 1. 고객사 정보 DB (`customers` 테이블)
- **현재 상태**: ❌ localStorage만 사용 (`bizinfo-db.ts`)
- **저장 위치**: `localStorage['ss-bizinfo-customers']`
- **필요 작업**:
  - [ ] Prisma 스키마: `Customer` 모델 추가
  - [ ] API 생성: `/api/customers` (GET, POST, PUT, DELETE)
  - [ ] `bizinfo-db.ts` DB 연동 (localStorage 폴백)
  - [ ] 기존 localStorage 데이터 마이그레이션
  - [ ] 마이그레이션 실행 (`npx prisma migrate dev`)

##### 2. 프로젝트 기초정보 DB (`bizinfo_projects` 테이블)
- **현재 상태**: ❌ localStorage만 사용 (`bizinfo-db.ts`)
- **저장 위치**: `localStorage['ss-bizinfo-projects']`
- **필요 작업**:
  - [ ] Prisma 스키마: `BizInfoProject` 모델 추가
  - [ ] API 생성: `/api/bizinfo/projects` (GET, POST, PUT, DELETE)
  - [ ] `bizinfo-db.ts` DB 연동 (localStorage 폴백)
  - [ ] 기존 localStorage 데이터 마이그레이션
  - [ ] 마이그레이션 실행

##### 3. 기타 기초정보 (선택사항)
- **공장 정보** (`factories` 테이블) - 현재 localStorage
- **품명 정보** (`products` 테이블) - 현재 localStorage
- 우선순위: 낮음 (고객사 정보와 프로젝트 기초정보 완료 후)

---

### 4️⃣ 사용자 인증 관리

#### 필수 기능
- [ ] **로그인/로그아웃**
  - 아이디/비밀번호 인증
  - 세션 관리 (JWT 또는 세션 쿠키)
  - 자동 로그아웃 (세션 만료)
- [ ] **사용자 등록**
  - 관리자만 사용자 등록 가능
  - 초기 비밀번호 설정
  - 비밀번호 변경 기능
- [ ] **인증 미들웨어**
  - 모든 API 엔드포인트 인증 체크
  - 권한 없는 접근 차단

#### 구현 필요 항목
- [ ] Prisma 스키마: `User` 모델에 `password`, `isActive` 필드 추가
- [ ] 인증 API: `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`
- [ ] 로그인 페이지: `/login`
- [ ] 세션 관리: NextAuth.js 또는 JWT
- [ ] API 미들웨어: 인증 체크 로직

#### 현재 상태
- ✅ 사용자 정보 DB 구축 완료
- ❌ 비밀번호 필드 없음
- ❌ 로그인/로그아웃 기능 없음
- ❌ 인증 미들웨어 없음

---

### 5️⃣ 사용자별 권한 설정

#### 필수 기능
- [ ] **역할 기반 권한 (RBAC)**
  - **Admin**: 모든 권한 (사용자 관리, 프로젝트 삭제, 설정 변경)
  - **Editor**: FMEA 작성/수정 권한
  - **Viewer**: 읽기 전용 권한
- [ ] **프로젝트별 접근 제어**
  - 프로젝트 소유자 설정
  - 프로젝트별 편집자/뷰어 지정
  - 공개/비공개 프로젝트 설정

#### 구현 필요 항목
- [ ] Prisma 스키마: `User` 모델에 `role` 필드 추가
- [ ] Prisma 스키마: `FmeaProject` 모델에 `ownerId`, `accessControl` 필드 추가
- [ ] 권한 체크 API: `/api/auth/check-permission`
- [ ] 권한 관리 UI: 사용자별 권한 설정 화면
- [ ] API 미들웨어: 권한 체크 로직

#### 현재 상태
- ❌ 권한 시스템 없음
- ❌ 모든 사용자가 모든 프로젝트 접근 가능
- ❌ 프로젝트 소유자 개념 없음

---

### 6️⃣ 프로젝트별 복구/복사/이동

#### 필수 기능
- [ ] **프로젝트 복사**
  - 동일 DB 내에서 프로젝트 복사 (새 FMEA ID 생성)
  - 다른 서버로 프로젝트 복사 (export → import)
- [ ] **프로젝트 이동**
  - 서버 간 프로젝트 이동
  - DB 통째로 옮기지 않고 개별 프로젝트만 이동
- [ ] **프로젝트 복구**
  - 백업 파일에서 프로젝트 복구
  - 특정 시점으로 롤백
- [ ] **프로젝트 관리 UI**
  - 프로젝트 목록에서 복사/이동/복구 버튼
  - 백업 목록 조회 및 복구

#### 구현 필요 항목
- [ ] 프로젝트 복사 API: `/api/fmea/projects/copy`
- [ ] 프로젝트 이동 UI: 서버 선택, 프로젝트 선택, 이동 실행
- [ ] 프로젝트 복구 UI: 백업 목록, 복구 실행
- [ ] 프로젝트 관리 페이지: `/admin/projects`

#### 현재 상태
- ✅ export-package API 존재 (JSON 내보내기)
- ✅ import-package API 존재 (JSON 가져오기)
- ⚠️ 복사 기능 없음 (새 ID 생성하여 복사)
- ⚠️ 이동 UI 없음
- ⚠️ 복구 UI 없음

#### 서버 이전 시 프로세스
```
서버 A → 서버 B 이전:
1. 서버 A: 프로젝트별 export-package 실행
2. 백업 파일 (JSON) 다운로드
3. 서버 B: import-package로 가져오기
4. 서버 B: 프로젝트 검증 및 테스트
5. 서버 A: 프로젝트 삭제 (선택사항)
```

**⚠️ 주의사항:**
- DB 통째로 옮기지 말고 프로젝트별로 개별 이동
- 각 프로젝트는 독립적으로 백업/복구 가능
- 마스터 데이터 (사용자 정보, 기초정보)는 별도 마이그레이션 필요

---

## 📅 출시 체크리스트

### Phase 0: 인프라 구축 (5-7일) - **DB 우선**

- [ ] **🔥 DB 구축 (최우선)**
  - [ ] PostgreSQL 설치
  - [ ] 데이터베이스 생성 (`fmea_db`)
  - [ ] 기존 Prisma 마이그레이션 실행 (`npx prisma migrate deploy`)
  - [ ] **고객사 정보 DB 구축** (`customers` 테이블)
    - [ ] Prisma 스키마 추가
    - [ ] API 생성 (`/api/customers`)
    - [ ] `bizinfo-db.ts` DB 연동
    - [ ] localStorage 데이터 마이그레이션
  - [ ] **프로젝트 기초정보 DB 구축** (`bizinfo_projects` 테이블)
    - [ ] Prisma 스키마 추가
    - [ ] API 생성 (`/api/bizinfo/projects`)
    - [ ] `bizinfo-db.ts` DB 연동
    - [ ] localStorage 데이터 마이그레이션
  - [ ] 초기 데이터 설정 (마스터 데이터)
- [ ] **백업 시스템**
  - [ ] 프로젝트별 자동 백업 구현
  - [ ] 엑셀/JSON/스냅샷 백업 구현
  - [ ] 백업 스케줄 설정
  - [ ] 백업 관리 UI 구현
- [ ] **사용자 인증**
  - [ ] 로그인/로그아웃 구현
  - [ ] 세션 관리 구현
  - [ ] 인증 미들웨어 구현
- [ ] **권한 관리**
  - [ ] 역할 기반 권한 시스템 구현
  - [ ] 프로젝트별 접근 제어 구현
  - [ ] 권한 관리 UI 구현

### Phase 1: 기능 검증 (1-2일)

- [ ] FMEA 등록 → 리스트 → 작성화면 이동 테스트
- [ ] 구조분석 → 기능분석 → 고장분석 순차 테스트
- [ ] 고장연결 → 리스크분석 → 최적화 순차 테스트
- [ ] 확정 → DB 저장 → 재로드 데이터 정합성 검증
- [ ] Master/Family/Part FMEA 상속 테스트

### Phase 2: 데이터 무결성 (1일)

- [ ] 트랜잭션 롤백 테스트
- [ ] 동시 저장 충돌 테스트
- [ ] 대용량 데이터 (100공정 이상) 성능 테스트

### Phase 3: UX 검증 (1일)

- [ ] 모든 화면 사이드바 연동 확인
- [ ] 미입력 필드 표시 확인
- [ ] 에러 메시지 사용자 친화적 확인
- [ ] 로딩 상태 표시 확인

### Phase 4: 배포 (1일)

- [ ] 최종 코드프리즈 태그 생성
- [ ] 백업 완료
- [ ] 운영 서버 배포
- [ ] 사용자 매뉴얼 제공

---

## 🎯 결론

### 현재 완성도: **70%** (기능) / **35%** (온프레미스 구축) / **60%** (DB 구축)

| 구분 | 완료 | 미완료 | 비율 |
|------|------|--------|------|
| 핵심 기능 | 16개 | 0개 | 100% |
| **DB 구축** | **23개 테이블** | **5개 테이블** | **82%** |
| - FMEA 관련 (✅ FailureAnalyses 추가 2026-01-11) | 19개 | 0개 | 100% |
| - 마스터 데이터 | 3개 | 2개 | 60% |
| - 기타 모듈 | 1개 | 3개 | 25% |
| 코드프리즈 | 10개 탭 | 0개 | 100% |
| **온프레미스 구축** | **2개** | **6개** | **25%** |
| - DB 구축 가이드 | 1개 | - | - |
| - 백업 시스템 | 1개 | 3개 | 25% |
| - 사용자 인증 | 0개 | 1개 | 0% |
| - 권한 관리 | 0개 | 1개 | 0% |
| - 프로젝트 복구/이동 | 1개 | 2개 | 33% |
| - 화면 결과 백업 | 0개 | 1개 | 0% |

#### 🔥 DB 구축 우선순위

1. **최우선 (출시 전 필수)**
   - ❌ 고객사 정보 DB (`customers` 테이블)
   - ❌ 프로젝트 기초정보 DB (`bizinfo_projects` 테이블)

2. **중간 우선순위 (출시 후)**
   - ⚠️ Control Plan DB
   - ⚠️ PFD DB
   - ⚠️ DFMEA DB 완전 전환
   - ⚠️ APQP API 완성

3. **낮은 우선순위**
   - 공장 정보 DB
   - 품명 정보 DB

### 출시 가능 상태: ⚠️ **조건부 YES** (기능 완성) / ❌ **NO** (온프레미스 구축)

**기능 측면:**
- ✅ 핵심 FMEA 작성 워크플로우가 모두 구현되어 있으며, 각 단계별 DB 원자성이 확보되어 있습니다.

**온프레미스 구축 측면:**
- ❌ **DB 구축 (최우선)**: 고객사 정보, 프로젝트 기초정보 DB 필수
- ❌ 사용자 인증/권한 관리 필수
- ❌ 프로젝트별 백업 시스템 필수
- ❌ DB 구축 가이드 필요
- ⚠️ 프로젝트 복구/이동 기능 부분 완료

**추가 작업 필요 (우선순위 순):**

1. **🔥 DB 구축 (최우선, 3-4일)**
   - 고객사 정보 DB 구축 (`customers` 테이블) - 1-2일
   - 프로젝트 기초정보 DB 구축 (`bizinfo_projects` 테이블) - 1-2일
   - localStorage 데이터 마이그레이션 - 0.5일

2. **사용자 인증 시스템 구현 (3-5일)**
3. **권한 관리 시스템 구현 (2-3일)**
4. **프로젝트별 자동 백업 시스템 구현 (2-3일)**
5. **DB 구축 가이드 문서 작성 (1일)**
6. **프로젝트 관리 UI 구현 (2-3일)**

**예상 추가 작업 기간: 13-19일** (DB 구축 포함)

---

## 📋 개발 계획 (2026-01-14 추가)

### CP 공정흐름도 입력 모달 개발

**목적**: CP 워크시트 자동 입력 모드에서 공정명을 선택할 수 있는 입력 모달 개발

**요구사항**:
- PFMEA의 `ProcessSelectModal`과 동일한 형태 및 기능
- 우측 350px 고정 위치
- 트리뷰 형태의 공정 선택 인터페이스
- 연속 입력 모드 지원

**개발 단계**:
1. **Phase 1: 기본 모달 구조** (1일)
   - 모달 컴포넌트 생성 (`ProcessFlowInputModal.tsx`)
   - 우측 350px 위치 설정
   - 기본 레이아웃 (헤더, 검색, 트리뷰, 버튼)

2. **Phase 2: 데이터 로드** (1일)
   - 마스터 FMEA 공정 데이터 로드 (`/api/fmea/master-processes`)
   - 기초정보 공정 데이터 로드 (localStorage 폴백)
   - 현재 워크시트 공정 데이터 표시

3. **Phase 3: 트리뷰 구현** (1일)
   - 공정/작업요소 트리 구조 렌더링
   - 확장/축소 기능
   - 체크박스 선택 기능

4. **Phase 4: 검색 기능** (0.5일)
   - 실시간 검색 구현
   - 필터링 로직

5. **Phase 5: 입력 모드** (1일)
   - 일반 입력 모드
   - 연속 입력 모드 (선택사항)

6. **Phase 6: 통합 및 테스트** (0.5일)
   - CP 워크시트와 연동
   - 자동 입력 모드와 연동
   - 테스트 및 버그 수정

**예상 기간**: 5일

**관련 문서**:
- `docs/CP_공정흐름도_입력모달_PRD.md` - 상세 PRD
- 벤치마킹: `src/app/pfmea/worksheet/ProcessSelectModal.tsx`

**파일 위치**:
- `src/app/control-plan/worksheet/components/ProcessFlowInputModal.tsx`

**코드프리즈 태그**: `codefreeze-20260114-cp-process-flow-modal` (예정)

---

## 🔧 코드 리팩토링 계획 (2026-01-19 추가)

### 📊 현재 파일 분석 결과

| 파일 | 라인 수 | 상태 | 조치 |
|------|------:|------|------|
| `useWorksheetState.ts` | **2,313** | 🔴 위험 | **분리 필요** |
| `FailureLinkTab.tsx` | **1,702** | 🔴 위험 | **분리 필요** |
| `migration.ts` | 1,178 | 🟡 경고 | 모니터링 |
| `AllTabEmpty.tsx` | 1,121 | 🟡 경고 | 모니터링 |
| `schema.ts` | 1,089 | 🟢 OK | 타입 정의 |
| `FailureL3Tab.tsx` | 1,068 | 🟡 경고 | 모니터링 |
| `FunctionL3Tab.tsx` | 1,062 | 🟡 경고 | 모니터링 |
| `page.tsx` | 702 | 🟢 OK | 적정 |

**전체 통계**: 142개 파일, ~37,560줄 (평균 265줄 ✅)

---

### 🚨 즉시 리팩토링 필요 (2개 파일)

#### 1. `useWorksheetState.ts` (2,313줄) → 분리 계획

```
현재 문제점:
- 데이터 로드/저장/변환/상태관리가 모두 한 파일에
- 디버깅 어려움, 테스트 불가능

분리 방안:
src/app/pfmea/worksheet/hooks/
├── useWorksheetState.ts (메인 훅, ~500줄)
├── useDataLoader.ts (DB 로드, ~400줄)
├── useDataSaver.ts (DB 저장, ~400줄)
├── useRiskData.ts (RPN 관리, ~300줄)
├── useFailureLinks.ts (고장연결, ~300줄)
└── stateNormalizers.ts (정규화 유틸, ~300줄)
```

#### 2. `FailureLinkTab.tsx` (1,702줄) → 분리 계획

```
현재 문제점:
- UI + 로직 + 상태관리 혼합
- 컴포넌트 재사용 불가

분리 방안:
src/app/pfmea/worksheet/tabs/failure/
├── FailureLinkTab.tsx (메인, ~400줄)
├── FailureLinkDiagram.tsx (다이어그램 SVG, ~300줄)
├── FailureLinkTables.tsx (FE/FM/FC 테이블, ~400줄)
├── hooks/useFailureLinkState.ts (상태 관리, ~300줄)
└── utils/failureLinkUtils.ts (유틸리티, ~200줄)
```

---

### 📅 리팩토링 일정

| Phase | 작업 | 예상 기간 | 우선순위 |
|-------|------|----------|---------|
| **Phase 0** | 기능 추가 계속 | 현재 | ✅ 진행중 |
| **Phase 1** | `useWorksheetState.ts` 분리 | 2-3일 | 🟡 다음 마일스톤 |
| **Phase 2** | `FailureLinkTab.tsx` 분리 | 2일 | 🟢 필요시 |
| **Phase 3** | 1,000줄 이상 파일 최적화 | 3-4일 | 🔵 향후 |

---

### ✅ 새 기능 추가 시 원칙

```typescript
// ✅ 좋은 패턴: 새 기능은 별도 파일로 분리
src/app/pfmea/worksheet/
├── panels/NewFeaturePanel/  ← 새 패널 (플러그인)
├── hooks/useNewFeature.ts   ← 새 훅
└── utils/newFeatureUtils.ts ← 새 유틸

// ❌ 피해야 할 패턴: 기존 큰 파일에 추가
useWorksheetState.ts에 300줄 추가 ← 금지
FailureLinkTab.tsx에 200줄 추가 ← 금지
```

---

### 📊 ALL 화면 기능 현황 (2026-01-19 갱신)

#### ✅ 구현 완료 기능

| 기능 | 패널 ID | 위치 | 상태 |
|------|---------|------|------|
| 트리뷰 (구조 표시) | `tree` | TreePanel | ✅ 완료 |
| PDF 뷰어 (업로드/관리) | `pdf` | PDFViewer | ✅ 완료 |
| 5AP 기준표 | `5ap` | APTable5 | ✅ 완료 |
| 6AP 기준표 | `6ap` | APTable6 | ✅ 완료 |
| RPN Pareto 차트 | `rpn` | ParetoChart | ✅ 완료 |
| RPN 차트 (Top 10) | `rpn-chart` | RPNChart | ✅ 완료 |
| 고장사슬 | `chain` | FailureChainPanel | ✅ 완료 |
| SOD 입력 모달 | - | useAllTabModals | ✅ 완료 |
| 35컬럼 기본화면 | - | AllTabAtomic | ✅ 완료 |
| RPN 컬럼 표시 | - | showRPN 플래그 | ✅ 완료 |

#### ⏳ 미구현/예정 기능

| 기능 | 패널 ID | 예상 크기 | 우선순위 | 비고 |
|------|---------|----------|---------|------|
| LLD 문서 뷰어 | `lld` | ~15KB | Phase 3 | 마크다운/HTML 지원 |
| GAP 분석 | `gap` | ~20KB | Phase 3 | 갭 분석 및 비교 테이블 |
| 인쇄/내보내기 | - | - | 미정 | 워크시트 인쇄 기능 |
| 다국어 지원 | - | - | 미정 | i18n 적용 |

#### 🔧 수정/개선 필요

| 항목 | 현황 | 개선안 | 우선순위 |
|------|------|--------|---------|
| 우측 패널 전환 | 버튼 클릭 시 ALL 탭 이동 필요 | 모든 탭에서 패널 접근 가능 | 🟡 |
| RPN 컬럼 토글 | rpn 패널 활성화 시만 표시 | 사용자 설정으로 영구 토글 | 🟢 |
| 셀 인라인 편집 | SOD만 모달 | 더 많은 셀 인라인 편집 | 🟢 |

---

### 🔴 표준화/공용화 긴급 필요 (2026-01-19 추가)

> **문제 발견**: 구조분석~고장원인분석까지 **동일한 로직이 중복 구현**되어 있고, 
> **일부 파일에서만 수정**하면 다른 파일에서 **동일한 버그가 남아있는** 심각한 문제 발생

#### 🐛 발견된 버그 패턴 (2026-01-19 수정 완료)

| 파일 | 버그 | 원인 | 상태 |
|------|------|------|------|
| `FailureL2Tab.tsx` | 삭제 후 DB 저장 안됨 | `setState`만 사용 | ✅ 수정됨 (`setStateSynced` + `saveAtomicDB`) |
| `FailureL1Tab.tsx` | 수정 후 DB 저장 안됨 | `setState`만 사용 | ✅ 수정됨 |
| `FailureL3Tab.tsx` | 수정 후 DB 저장 안됨 | `setState`만 사용 | ✅ 수정됨 |
| `FunctionL1Tab.tsx` | 인라인 편집 후 DB 저장 안됨 | 동일 패턴 | ✅ 수정됨 |
| `FunctionL2Tab.tsx` | 인라인 편집 후 DB 저장 안됨 | 동일 패턴 | ✅ 수정됨 |
| `FunctionL3Tab.tsx` | 인라인 편집 후 DB 저장 안됨 | 동일 패턴 | ✅ 수정됨 |
| `StructureTab.tsx` | 내부 컴포넌트에서 DB 저장 안됨 | 동일 패턴 | ✅ 수정됨 |
| `FailureLinkTab.tsx` | 연결 후 DB 저장 안됨 | 동일 패턴 | ✅ 수정됨 |
| `RiskTabConfirmable.tsx` | **입력 시 데이터 사라짐** | `saveAtomicDB` 누락 | ✅ 수정됨 (debounce 500ms) |
| `OptTabConfirmable.tsx` | **입력 시 데이터 사라짐** | `saveAtomicDB` 누락 | ✅ 수정됨 (debounce 500ms) |

> ✅ **모든 PFMEA 탭 파일에 `setStateSynced` + `saveAtomicDB` 패턴 적용 완료**
> ✅ **5ST/6ST 입력 시 자동 저장 + 작성완료 안내 기능 추가 (2026-01-19)**

#### 🎯 표준화 대상 패턴

```typescript
// ❌ 잘못된 패턴 (7개 파일에서 반복)
const handleDelete = useCallback((values: string[]) => {
  setState(prev => { ... });           // 비동기 업데이트
  setDirty(true);
  saveToLocalStorage?.();              // localStorage만 저장
}, [setState, setDirty, saveToLocalStorage]);  // saveAtomicDB 누락!

// ✅ 올바른 패턴 (표준화 필요)
const handleDelete = useCallback((values: string[]) => {
  const updateFn = (prev: any) => { ... };
  if (setStateSynced) {
    setStateSynced(updateFn);          // stateRef 동기 업데이트
  } else {
    setState(updateFn);
  }
  setDirty(true);
  setTimeout(async () => {
    saveToLocalStorage?.();
    if (saveAtomicDB) {
      await saveAtomicDB();            // DB 저장 보장
    }
  }, 100);
}, [setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);
```

---

## 🔍 코드베이스 재진단 (2026-01-19 19:35 갱신)

### ✅ 작업 방식 (강제)

1. **UI/UX 변경 금지**: 기존 UI는 그대로 유지 (명시적 허락 없이는 금지)
2. **코드프리즈 손상 금지**: 코드프리즈 파일/구역은 수정하지 않음
3. **점진적 진행**: 변경 범위를 작게 나누어 단계별 적용
4. **롤백 지점 지정**: 각 단계 시작 전 롤백 포인트 확보
5. **TDD 방식**: 테스트 범위를 최소화하고, 검증 가능한 단위로 진행

### 🚨 700행 초과 파일 (긴급 분리 필요)

| # | 파일 | 줄 수 | 심각도 | 분리 계획 |
|---|------|-------|:------:|----------|
| 1 | `FailureLinkTab.tsx` | **1,858** | 🔴 | 다이어그램/테이블/로직 분리 |
| 2 | `AllTabEmpty.tsx` | 1,121 | 🟡 | 렌더러 분리 |
| 3 | `FunctionL3Tab.tsx` | 1,070 | 🟡 | 공통 로직 추출 |
| 4 | `FailureL3Tab.tsx` | 1,068 | 🟡 | 공통 로직 추출 |
| 5 | `FunctionL2Tab.tsx` | 998 | 🟡 | 공통 로직 추출 |
| 6 | `FailureL1Tab.tsx` | 961 | 🟡 | 공통 로직 추출 |
| 7 | `StructureTab.tsx` | 918 | 🟡 | 내부 컴포넌트 분리됨 |
| 8 | `FailureL2Tab.tsx` | 821 | 🟢 | 허용 범위 |
| 9 | `FunctionL1Tab.tsx` | 819 | 🟢 | 허용 범위 |
| 10 | `RiskOptCellRenderer.tsx` | 804 | 🟢 | 허용 범위 |
| 11 | `AllTabAtomic.tsx` | 747 | 🟢 | 허용 범위 |

### 🔄 PFMEA/DFMEA 중복 파일 (공용화 필요)

| 파일명 | 중복 횟수 | 공용화 우선순위 |
|--------|:--------:|:-------------:|
| `FunctionTab.tsx` | 4 | 🔴 즉시 |
| `FailureTab.tsx` | 4 | 🔴 즉시 |
| `FailureLinkResult.tsx` | 4 | 🔴 즉시 |
| `OptTabConfirmable.tsx` | 2 | 🟡 다음 |
| `OptTab.tsx` | 2 | 🟡 다음 |
| `L1Section.tsx` | 2 | 🟡 다음 |
| `L2Section.tsx` | 2 | 🟡 다음 |
| `L3Section.tsx` | 2 | 🟡 다음 |
| `ProcessSelectModal.tsx` | 2 | 🟢 향후 |
| `ParetoChart.tsx` | 2 | 🟢 향후 |

### 📂 types.ts 분산 (타입 중앙화 필요)

| 위치 | 파일 수 | 문제점 |
|------|:------:|--------|
| PFMEA | 7개 | 중복 정의 가능성 |
| DFMEA | 7개 | PFMEA와 동일 구조 |
| 기타 | 10개 | 분산된 타입 관리 |

**권장**: `src/types/fmea/` 중앙 타입 폴더 생성

---

### 📋 개선 계획 (우선순위별)

#### 🔴 Phase 1: 긴급 (타입 표준화 선행)

| 작업 | 대상 | 예상 효과 |
|------|------|----------|
| ✅ `setStateSynced` + `saveAtomicDB` 패턴 적용 | 12개 탭 | **완료** |
| 🔴 타입 중앙화/중복 제거 | `src/types/fmea/` 신규 | 타입 일관성 ↑ |
| 🔴 PFMEA/DFMEA 동일 기능 공용화 | `FunctionTab`, `FailureTab` 등 | 중복 제거 |
| 🟡 공용 훅 생성 | `useWorksheetCRUD.ts` | 저장 패턴 표준화 |

#### 🟡 Phase 2: 파일 분리 (표준화 이후)

| 작업 | 대상 | 효과 |
|------|------|------|
| `FailureLinkTab.tsx` 분리 | 1,858줄 → 4개 파일 | 유지보수성 ↑↑ |
| `AllTabEmpty.tsx` 분리 | 1,121줄 → 2개 파일 | 렌더러 분리 |

**FailureLinkTab 분리 계획:**
```
FailureLinkTab.tsx (1,858줄)
├── FailureLinkTab.tsx (~500줄) - 메인 로직
├── FailureLinkDiagram.tsx (~400줄) - SVG 다이어그램
├── FailureLinkTables.tsx (~400줄) - 테이블 렌더링 (현재 있음)
└── useFailureLinkState.ts (~300줄) - 상태 관리 훅
```

#### 🟢 Phase 3: 향후

| 작업 | 대상 | 효과 |
|------|------|------|
| L3Tab 공통화 | `FunctionL3Tab`, `FailureL3Tab` | 1,000줄 → 600줄 |
| 모달 공용화 | 5개 모달 컴포넌트 | 일관된 UX |

---

#### 📋 표준화/공용화 계획 (진행률 갱신)

| Phase | 작업 | 대상 파일 | 우선순위 | 상태 |
|-------|------|----------|---------|------|
| **Phase 1** | 개별 탭 저장 패턴 수정 | 12개 탭 파일 | 🔴 즉시 | ✅ 완료 (2026-01-19) |
| **Phase 1.5** | 타입 중앙화/중복 제거 | 24개 types.ts | 🔴 즉시 | ⏳ 계획됨 |
| **Phase 2** | PFMEA/DFMEA 공용화 | 4개 중복 컴포넌트 | 🔴 즉시 | ⏳ 계획됨 |
| **Phase 3** | 파일 분리 | `FailureLinkTab.tsx` 등 | 🟡 다음 | ⏳ 향후 |

#### 📐 공용 훅 설계 (예시)

```typescript
// src/hooks/worksheet/useWorksheetCRUD.ts
export function useWorksheetCRUD({ setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB }) {
  const saveState = useCallback(async (updateFn: (prev: any) => any, source: string) => {
    // 1. stateRef 동기 업데이트
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    // 2. dirty 플래그 설정
    setDirty(true);
    // 3. localStorage + DB 저장 보장
    setTimeout(async () => {
      saveToLocalStorage?.();
      if (saveAtomicDB) {
        try {
          await saveAtomicDB();
          console.log(`[${source}] DB 저장 완료`);
        } catch (e) {
          console.error(`[${source}] DB 저장 오류:`, e);
        }
      }
    }, 100);
  }, [setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  return { saveState };
}

// 사용 예시
const { saveState } = useWorksheetCRUD({ ... });
const handleDelete = (values: string[]) => {
  saveState(prev => ({ ...prev, l2: filterDeleted(prev.l2, values) }), 'FailureL2Tab');
};
```

> **핵심 원칙**: 같은 화면, 같은 로직이면 **반드시 같은 코드**를 공유해야 함
> → 버그 수정 시 1곳만 수정하면 모든 곳에 적용됨

---

### 🎯 결론

| 항목 | 현재 상태 | 조치 |
|------|----------|------|
| **page.tsx** | 702줄 ✅ | 적정 수준, 문제없음 |
| **탭 컴포넌트** | 800~1,100줄 | 관리 가능 범위 |
| **플러그인 패널** | 잘 분리됨 ✅ | 새 기능은 이 패턴 사용 |
| **즉시 리팩토링** | ❌ 불필요 | 기능 추가 먼저 진행 |
| **🔴 표준화/공용화** | **❌ 긴급 필요** | **동일 로직 중복으로 버그 누락** |

**권장**: 기능 추가 계속 진행 → 다음 마일스톤에서 `useWorksheetState.ts` 분리

---

## �️ 2026-01-23 모듈화 집중 개선 계획 (Current Focus)

**목표**: 700행 이상 비대해진 핵심 파일들을 기능별 파일로 분리하여 유지보수성 및 코드 품질 확보.

### 📋 긴급 리팩토링 대상 (3대 과제)

| 파일명 | 현재 크기 | 분리 목표 | 주요 분리 내용 |
|-------|----------|----------|--------------|
| `AllTabEmpty.tsx` | ~1,000줄 | 3개 파일 | Header, Row, Table 구조 분리 |
| `RiskOptCellRenderer.tsx` | ~950줄 | 4개 파일 | SOD, Control, Improvement 셀 컴포넌트화 |
| `useWorksheetDataLoader.ts` | ~900줄 | 4개 Hook | Inherit, Snapshot, Normalization 로직 분리 |

### 🏗️ 세부 분리 설계

#### 1. `AllTabEmpty.tsx` (전체보기 화면)
- **AllTabHeader.tsx**: Step 2~6 다중 헤더 렌더링 로직
- **AllTabRow.tsx**: 개별 행(Row) 및 RowSpan 병합 계산 담당
- **AllTabTable.tsx**: Sticky 테이블 컨테이너 및 레이아웃 관리

#### 2. `RiskOptCellRenderer.tsx` (리스크/최적화 셀)
- **SODCell.tsx**: S/O/D 점수 표시 및 전용 모달 연동
- **ControlCell.tsx**: 예방/검출 관리 텍스트 직접 편집 및 유효성 체크
- **ImprovementCell.tsx**: 조치결과근거, 책임자, 날짜 입력 셀 분리

#### 3. `useWorksheetDataLoader.ts` (데이터 로더)
- **useWorksheetInheritance.ts**: 상속(Inherit) 모드 전용 로직 추출
- **useWorksheetSnapshots.ts**: 스냅샷 비교 및 데이터 복원 엔진
- **useWorksheetNormalization.ts**: 데이터 구조 보정 및 스키마 마이그레이션

### 🧩 공통 로직 추출 (Utility)
- **`src/app/pfmea/worksheet/utils/apCalculator.ts`**: AP 등급 및 점수 계산 로직 통합
- **`src/app/pfmea/worksheet/utils/rowSpanUtils.ts`**: 테이블 병합 체크(`isInMergedRange`) 로직 공용화

---

## �🆕 SOD 히스토리 모듈 설계 (2026-01-19 추가)

### 📋 요구사항

1. **개정 번호**: 정수=정식개정(FMEA책임자), 소수점=자동개정(SOD변경시)
2. **SOD 변경 기록**: ALL 화면에서 심각도/발생도/검출도 변경 시 자동 기록
3. **히스토리 관리**: 정식개정 전까지 변경사항 누적, 정식개정 시 초기화

### 🏗️ 모듈화 구조 (500줄 미만 원칙)

```
src/
├── hooks/
│   └── revision/                        # ★ 신규 모듈
│       ├── index.ts                     # ~10줄 - export
│       ├── types.ts                     # ~50줄 - 타입 정의
│       └── useSODHistory.ts             # ~200줄 - CRUD + 변경감지
│
├── app/
│   ├── api/
│   │   └── fmea/
│   │       └── sod-history/             # ★ 신규 API
│   │           └── route.ts             # ~150줄 - REST API
│   │
│   └── pfmea/
│       └── revision/
│           └── components/              # ★ 신규 컴포넌트
│               ├── index.ts             # ~10줄 - export
│               └── SODHistoryTable.tsx  # ~200줄 - 히스토리 테이블
```

### 📊 파일별 예상 줄수

| 파일 | 예상 줄수 | 역할 |
|------|----------|------|
| `hooks/revision/types.ts` | ~50줄 | 타입 정의 |
| `hooks/revision/useSODHistory.ts` | ~200줄 | 변경감지 + CRUD 훅 |
| `hooks/revision/index.ts` | ~10줄 | 모듈 export |
| `api/fmea/sod-history/route.ts` | ~150줄 | REST API |
| `revision/components/SODHistoryTable.tsx` | ~200줄 | UI 컴포넌트 |
| `revision/components/index.ts` | ~10줄 | 컴포넌트 export |
| **합계** | **~620줄** | 6개 파일 분리 |

### 💾 DB 테이블 (완료)

```prisma
model FmeaSodHistory {
  id           String   @id @default(uuid())
  fmeaId       String
  revMajor     Int      // 정식개정 번호
  revMinor     Int      // 소수점 개정
  fmId         String   // 변경된 FM ID
  fmText       String   // FM 텍스트
  changeType   String   // 'S', 'O', 'D'
  oldValue     Int
  newValue     Int
  changedBy    String
  changedAt    DateTime @default(now())
  @@map("fmea_sod_history")
}
```

---

## 📝 변경 이력

| 버전 | 일자 | 변경 내용 |
|------|------|---------|
| **2.8.0** | **2026-01-23** | 🏗️ **모듈화 집중 개선 계획 추가**: `AllTabEmpty`, `RiskOptCellRenderer`, `useWorksheetDataLoader` 등 비대 파일 분리 계획 수립 |
| 2.7.0 | 2026-01-19 | 🔴 **개발 필수 룰 추가 (8개 룰)**: UI 변경 금지, 코드프리즈 수정 금지, 명시적 허락 필수, 데이터 연동 고려, 모듈화/표준화/공용화 검토 (700행 제한), DB 원자성 보장, CRUD 종합 검토, 타입 지정 필수 |
| 2.5.0 | 2026-01-19 | ✅ **SOD 히스토리 모듈 설계 추가**: 모듈화 구조 (6개 파일/~620줄), DB 테이블 완료, API+Hook+UI 분리 |
| 2.4.0 | 2026-01-19 | ✅ **코드 리팩토링 계획 추가**: 파일 분석 (142파일/37,560줄), useWorksheetState/FailureLinkTab 분리 계획 |
| 2.3.0 | 2026-01-14 | ✅ **CP 공정흐름도 입력 모달 개발 계획 추가**: PFMEA 모달 벤치마킹, 우측 350px 고정 위치, 트리뷰 형태 |
| 2.2.0 | 2026-01-11 | ✅ **고장분석 통합 DB 구축 완료** (`failure_analyses` 테이블): 고장연결+역전개 기능분석+역전개 구조분석 통합 저장, All 화면 DB 기반 렌더링 구현 |
| 2.1.0 | 2026-01-11 | DB 구축 현황 상세 추가: 화면별 DB 저장 상태 진단, 미구축 DB 테이블 명시, DB 구축 우선순위 강조 |
| 2.0.0 | 2026-01-11 | 온프레미스 출시 필수 구축 사항 추가: DB 구축, 백업 시스템, 사용자 인증, 권한 관리, 프로젝트 복구/이동 |
| 1.1.0 | 2026-01-10 | 룰 2번 추가: FMEA 리스트와 DB 1:1 관계 보장, 중복 ID 정리, 완전한 데이터 저장 필수 |
| 1.0.0 | 2026-01-10 | 최초 작성 - 전체 진단 완료 |

---

**작성자**: AI Assistant  
**승인자**: _________________  
**승인일**: _________________

