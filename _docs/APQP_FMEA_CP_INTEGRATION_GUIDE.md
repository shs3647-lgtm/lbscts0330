# APQP-FMEA-CP 연동 구조 유지보수 가이드

**코드프리즈 태그**: `codefreeze-20260113-apqp-fmea-cp-integration`  
**날짜**: 2026-01-13  
**커밋**: `c810cbd`

---

## 📋 개요

APQP를 최상위 프로젝트로 설정하고, FMEA와 CP에서 상위 APQP를 선택할 수 있는 연동 구조가 완성되었습니다.

### 프로젝트 계층 구조

```
📋 APQP (최상위)
    ↓
🔧 FMEA (상위 APQP 선택 가능)
    ↓
📝 CP (상위 APQP + 상위 FMEA 선택 가능)
```

---

## 🔧 수정된 파일 목록

### 1. DB 스키마

**파일**: `prisma/schema.prisma`

**변경 내용**:
- `ApqpRegistration` 모델: `parentApqpNo` 필드 추가 (자기 참조)
- `CpRegistration` 모델: `parentProject` → `parentApqpNo` 변경

**검색 키워드**: `parentApqpNo`, `parentProject`

```prisma
// ApqpRegistration
model ApqpRegistration {
  // ...
  parentApqpNo        String?  // ★ 상위 APQP (최상위)
  parentFmeaId        String?  // 상위 FMEA ID
  baseCpId            String?  // 기반 CP ID
}

// CpRegistration
model CpRegistration {
  // ...
  parentApqpNo        String?  // ★ 상위 APQP (최상위)
  parentFmeaId        String?   // 상위 FMEA ID
  baseCpId            String?   // 기반 CP ID
}
```

---

### 2. FMEA 등록 화면

**파일**: `src/app/pfmea/register/page.tsx`

**변경 내용**:
- 상위 APQP 선택 상태 추가
- APQP 목록 로드 함수 추가
- APQP 선택 모달 추가
- 레이아웃 구조 재정렬 (CP와 동일)

**검색 키워드**: `selectedParentApqp`, `openApqpModal`, `상위 APQP`

**주요 코드 위치**:
- Line ~137: 상위 APQP 선택 상태 정의
- Line ~150: APQP 목록 로드 함수
- Line ~1056: 상위 APQP UI (1행)
- Line ~1440: APQP 선택 모달

---

### 3. CP 등록 화면

**파일**: `src/app/control-plan/register/page.tsx`

**변경 내용**:
- "상위 프로젝트" → "상위 APQP"로 변경
- APQP 선택 모달 추가
- hooks에서 `selectedParentProject` → `selectedParentApqp` 변경

**검색 키워드**: `상위 APQP`, `selectedParentApqp`, `openApqpModal`

**주요 코드 위치**:
- Line ~54: 상위 APQP 선택 상태 정의
- Line ~390: 상위 APQP UI (1행)
- Line ~507: APQP 선택 모달

---

### 4. CP 리스트 화면

**파일**: `src/app/control-plan/list/page.tsx`

**변경 내용**:
- "상위 프로젝트" → "상위 APQP" 컬럼명 변경
- `parentProject` → `parentApqpNo` 필드명 변경

**검색 키워드**: `상위 APQP`, `parentApqpNo`

---

### 5. CP API

**파일**: `src/app/api/control-plan/route.ts`

**변경 내용**:
- `parentProject` → `parentApqpNo` 필드명 변경

**검색 키워드**: `parentApqpNo`, `parentProject`

---

### 6. CP Register Handlers

**파일**: `src/app/control-plan/register/hooks/useRegisterHandlers.ts`

**변경 내용**:
- `selectedParentProject` → `selectedParentApqp` 파라미터 변경
- 저장 시 `parentApqpNo` 필드로 전달

**검색 키워드**: `selectedParentApqp`, `parentApqpNo`

---

### 7. APQP API

**파일**: `src/app/api/apqp/route.ts`

**변경 내용**:
- `findUnique` → `findFirst`로 변경 (Prisma 호환성)
- CFT 멤버 필터링: `m.name && m.name.trim()`

**검색 키워드**: `findFirst`, `cftMembers.filter`

---

### 8. CFT 정리 API (신규)

**파일**: `src/app/api/admin/cleanup-cft/route.ts`

**기능**: 이름이 없거나 공백인 CFT 멤버 삭제

**사용법**:
```bash
curl -X POST "http://localhost:3000/api/admin/cleanup-cft"
```

---

## 🎨 UI 변경사항

### FMEA 등록 화면 레이아웃

**변경 전**: 불규칙한 컬럼 너비, 상위 프로젝트가 1행에 있음

**변경 후**: CP와 동일한 구조
- 1행: 회사명, FMEA명, FMEA ID, **상위 APQP**
- 2행: 공정책임, FMEA책임자, 시작일자, **상위 FMEA**
- 3행: 고객명, 개정일자, 엔지니어링위치, 기밀유지수준
- 4행: 모델연식, FMEA유형, 상호기능팀

**컬럼 너비**: w-[11%], w-[14%], w-[7%], w-[18%], w-[7%], w-[10%], w-[8%], w-[15%]

---

## 🔍 동일 기능이 여러 파일에 분산된 경우

### 상위 APQP 선택 기능

다음 파일들에서 동일한 패턴으로 구현됨:

1. **FMEA 등록**: `src/app/pfmea/register/page.tsx`
   - Line ~137: 상태 정의
   - Line ~150: 목록 로드
   - Line ~1056: UI
   - Line ~1440: 모달

2. **CP 등록**: `src/app/control-plan/register/page.tsx`
   - Line ~54: 상태 정의
   - Line ~390: UI
   - Line ~507: 모달

**수정 시 주의사항**:
- 두 파일 모두 동일하게 수정해야 함
- 모달 스타일 통일 (초록색 배경, APQP 배지)

---

## 🐛 버그 수정

### CFT 멤버 중복 저장 문제

**문제**: 이름이 없는 CFT 멤버도 저장되어 Champion이 중복 생성됨

**해결**:
- 저장 시 필터링: `filter((m: any) => m.name && m.name.trim())`
- 정리 API 추가: `/api/admin/cleanup-cft`

**수정 파일**:
- `src/app/api/apqp/route.ts` (POST, PUT 핸들러)
- `src/app/apqp/register/page.tsx`

---

## 📝 예시 코드

### 상위 APQP 선택 UI (FMEA 등록 화면)

```tsx
<td className={`${headerCell} w-[8%] whitespace-nowrap`}>상위 APQP</td>
<td className={`${inputCell} w-[15%] cursor-pointer hover:bg-green-50`} onClick={openApqpModal}>
  {selectedParentApqp ? (
    <div className="flex items-center gap-1 px-2">
      <span className="px-1 py-0 rounded text-[9px] font-bold text-white bg-green-500">APQP</span>
      <span className="text-xs font-semibold text-green-600">{selectedParentApqp.apqpNo}</span>
      <button onClick={(e) => { e.stopPropagation(); setSelectedParentApqp(null); }} className="text-red-500 hover:text-red-700 text-[10px]">✕</button>
    </div>
  ) : <span className="px-2 text-xs text-gray-400">- (클릭하여 선택)</span>}
</td>
```

### APQP 선택 모달

```tsx
{apqpModalOpen && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setApqpModalOpen(false)}>
    <div className="bg-white rounded-lg shadow-xl w-[500px] max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
      <div className="bg-green-600 text-white px-4 py-3 flex items-center justify-between">
        <h2 className="font-bold">📋 상위 APQP 선택</h2>
        <button onClick={() => setApqpModalOpen(false)} className="text-white/70 hover:text-white text-xl">✕</button>
      </div>
      {/* ... APQP 리스트 ... */}
    </div>
  </div>
)}
```

---

## ✅ 검증 체크리스트

수정 시 다음 항목을 확인하세요:

- [ ] FMEA 등록 화면에서 상위 APQP 선택 가능
- [ ] CP 등록 화면에서 상위 APQP 선택 가능
- [ ] 선택한 APQP가 DB에 저장됨 (`parentApqpNo` 필드)
- [ ] CP 리스트에서 상위 APQP 컬럼 표시
- [ ] CFT 멤버 저장 시 이름 없는 멤버는 저장되지 않음
- [ ] FMEA 등록 화면 레이아웃이 CP와 동일

---

## 🔄 롤백 방법

이전 버전으로 롤백하려면:

```bash
git checkout codefreeze-20260113-apqp-fmea-cp-integration
```

또는 특정 커밋으로:

```bash
git checkout c810cbd
```

---

## 📚 관련 문서

- `CHANGELOG-20260106.md` - 전체 변경 이력
- `docs/CP_MASTER_PLAN.md` - CP 마스터 플랜
- `prisma/schema.prisma` - DB 스키마 정의

---

**마지막 업데이트**: 2026-01-13


