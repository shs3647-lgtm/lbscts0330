# APQP Parent 관계 유지보수 가이드

> **코드프리즈 태그**: `codefreeze-20260113-apqp-parent-relationship`  
> **작성일**: 2026-01-13  
> **상태**: ✅ 완료

---

## 📋 개요

APQP는 최상위 프로젝트이며, FMEA와 CP의 상위 프로젝트입니다. 이 가이드는 APQP Parent 관계의 저장 및 표시 로직을 설명합니다.

---

## 🔧 수정된 파일 목록

### 1. APQP 등록 화면
- **파일**: `src/app/apqp/register/page.tsx`
- **변경 내용**: 상위 APQP 선택 기능 제거 (APQP는 최상위이므로 불필요)
- **검색 키워드**: `selectedParentApqp`, `openApqpModal`, `상위 APQP`

### 2. FMEA 등록 화면
- **파일**: `src/app/pfmea/register/page.tsx`
- **변경 내용**: 
  - Master FMEA는 본인이 상위 FMEA가 되도록 로직 추가
  - 상위 APQP 선택 및 저장 로직 확인
- **검색 키워드**: `parentFmeaId`, `parentApqpNo`, `actualFmeaType === 'M'`

### 3. CP 등록 화면
- **파일**: `src/app/control-plan/register/page.tsx`
- **파일**: `src/app/control-plan/register/hooks/useRegisterHandlers.ts`
- **변경 내용**: 
  - 상위 APQP 저장 로직 확인
  - 타입 에러 수정 (`newType !== 'M'` → `newType === 'F' || newType === 'P'`)
- **검색 키워드**: `parentApqpNo`, `selectedParentApqp`, `handleCpTypeChange`

---

## 🎯 핵심 로직

### 1. APQP 등록 화면
- **상위 APQP 선택 기능 없음**: APQP는 최상위 프로젝트이므로 상위 APQP가 없습니다.
- **UI에서 제거**: 상위 APQP 선택 버튼 및 관련 상태 변수 제거

### 2. FMEA 등록 화면
- **Master FMEA**: `parentFmeaId = fmeaId` (자기 자신이 상위 FMEA)
- **Family/Part FMEA**: 선택된 상위 FMEA를 `parentFmeaId`로 저장
- **상위 APQP**: `selectedParentApqp?.apqpNo`를 `parentApqpNo`로 저장

```typescript
// Master FMEA는 본인이 상위 FMEA
if (actualFmeaType === 'M') {
  parentId = finalFmeaId.toLowerCase();
  parentType = 'M';
} else if (selectedBaseFmea) {
  // Family/Part는 선택된 상위 FMEA를 parent로 가짐
  parentId = selectedBaseFmea.toLowerCase();
  // parentFmeaType 추출
  const match = selectedBaseFmea.match(/pfm\d{2}-([mfp])/i);
  if (match) {
    parentType = match[1].toUpperCase(); // M, F, P
  }
}
```

### 3. CP 등록 화면
- **상위 APQP**: `selectedParentApqp?.apqpNo`를 `parentApqpNo`로 저장
- **상위 FMEA**: `selectedParentFmea`를 `fmeaId`로 저장
- **상위 CP**: `selectedBaseCp`를 `parentCpId`로 저장

---

## 🔍 수정 위치 상세

### APQP 등록 화면 (`src/app/apqp/register/page.tsx`)

#### 제거된 코드
```typescript
// 제거: 상위 APQP 선택 상태
const [selectedParentApqp, setSelectedParentApqp] = useState<{apqpNo: string; subject: string} | null>(null);
const [apqpModalOpen, setApqpModalOpen] = useState(false);
const [apqpList, setApqpList] = useState<Array<{apqpNo: string; subject: string}>>([]);

// 제거: APQP 목록 로드 함수
const loadApqpList = async () => { ... };
const openApqpModal = () => { ... };

// 제거: handleSave에서 parentApqpNo 전달
parentApqpNo: selectedParentApqp?.apqpNo || null,

// 제거: UI에서 상위 APQP 선택 버튼
<td className={`${headerCell} w-[8%] whitespace-nowrap`}>상위 APQP</td>
<td className={`${inputCell} w-[12%] cursor-pointer hover:bg-green-50`} onClick={openApqpModal}>
  ...
</td>
```

### FMEA 등록 화면 (`src/app/pfmea/register/page.tsx`)

#### 수정된 로직 (라인 1036-1060)
```typescript
// ✅ parentFmeaId 결정: Master는 본인이 상위 FMEA, Family/Part는 선택된 상위 FMEA
let actualFmeaType: FMEAType;
if (fmeaInfo.fmeaType) {
  actualFmeaType = fmeaInfo.fmeaType as FMEAType;
} else if (finalFmeaId.includes('-M')) {
  actualFmeaType = 'M';
} else if (finalFmeaId.includes('-F')) {
  actualFmeaType = 'F';
} else {
  actualFmeaType = 'P';
}

let parentId: string | null = null;
let parentType: string | null = null;

if (actualFmeaType === 'M') {
  // ★ Master FMEA는 본인이 상위 FMEA (자기 자신이 parent)
  parentId = finalFmeaId.toLowerCase();
  parentType = 'M';
} else if (selectedBaseFmea) {
  // Family/Part는 선택된 상위 FMEA를 parent로 가짐
  parentId = selectedBaseFmea.toLowerCase();
  const match = selectedBaseFmea.match(/pfm\d{2}-([mfp])/i);
  if (match) {
    parentType = match[1].toUpperCase(); // M, F, P
  }
}
```

### CP 등록 화면 (`src/app/control-plan/register/hooks/useRegisterHandlers.ts`)

#### 수정된 타입 체크 (라인 91-96)
```typescript
// 수정 전
} else if (cpInfo.cpType === 'M' && newType !== 'M') {

// 수정 후
} else if (cpInfo.cpType === 'M' && (newType === 'F' || newType === 'P')) {
```

---

## 🗄️ DB 저장 구조

### FMEA 프로젝트 (`fmea_projects`)
- `parentApqpNo`: 상위 APQP 번호 (문자열, nullable)
- `parentFmeaId`: 상위 FMEA ID (문자열, nullable)
  - Master FMEA: 자기 자신의 `fmeaId`
  - Family/Part FMEA: 선택된 상위 FMEA의 `fmeaId`

### CP 등록 (`cp_registrations`)
- `parentApqpNo`: 상위 APQP 번호 (문자열, nullable)
- `fmeaId`: 상위 FMEA ID (문자열, nullable)
- `parentCpId`: 상위 CP ID (문자열, nullable)
  - Master CP: 자기 자신의 `cpNo`

---

## ✅ 검증 방법

1. **APQP 등록 화면**: 상위 APQP 선택 버튼이 없는지 확인
2. **FMEA 등록 화면**: 
   - Master FMEA 저장 시 `parentFmeaId`가 자기 자신인지 확인
   - 상위 APQP 선택 후 저장 시 DB에 저장되는지 확인
3. **CP 등록 화면**: 
   - 상위 APQP 선택 후 저장 시 DB에 저장되는지 확인
   - Master CP는 상위 CP가 자기 자신인지 확인

---

## 🔄 향후 수정 시 주의사항

1. **APQP는 최상위**: APQP 등록 화면에 상위 APQP 선택 기능을 추가하지 마세요.
2. **Master FMEA 로직**: Master FMEA는 항상 본인이 상위 FMEA입니다.
3. **타입 체크**: TypeScript 타입 체크 시 `!== 'M'` 대신 `=== 'F' || === 'P'`를 사용하세요.

---

## 📝 관련 문서

- `docs/CP_MASTER_PLAN.md`: CP 개발 마스터 플랜
- `docs/CODEFREEZE_FILES.md`: 코드프리즈 파일 목록

