# ID 생성 표준화 가이드

## 📌 핵심 원칙

> **ID는 오직 CreateDocumentModal에서 "생성" 버튼을 눌렀을 때 한 번만 생성된다.**

---

## 🔄 표준 워크플로우

```
1. 등록화면 접속 (/apqp/register, /pfmea/register, 등)
   ↓
2. 빈 폼 표시 (ID 없음)
   ↓
3. "새로 작성" 버튼 클릭
   ↓
4. CreateDocumentModal 열림
   ↓
5. 연동할 앱 선택 (APQP, PFMEA, DFMEA, PFD, CP)
   ↓
6. "생성" 버튼 클릭
   ↓
7. API 호출 (/api/project/create-linked)
   - DB에 선택한 앱들의 레코드 생성
   - 각 앱에 ID 부여 (apqp26-xxx, pfm26-xxx, 등)
   ↓
8. window.location.href로 등록화면 새로고침 (?id=생성된ID)
   ↓
9. 등록화면에서 ID 표시 + 정보 입력 가능
   ↓
10. "저장" 버튼 클릭
    - 기존 레코드 업데이트 (ID 변경 없음)
```

---

## 🚫 금지 사항

1. **자동 ID 생성 금지**
   - useEffect에서 자동으로 ID 생성하지 않음
   - 페이지 로드 시 자동 생성 없음

2. **저장 시 새 ID 생성 금지**
   - handleSave()에서 ID가 없으면 저장 차단
   - 모달을 열도록 안내

3. **연동 문서 자동 생성 금지**
   - PFMEA 저장 시 PFD/CP 자동 생성 안 함
   - 모든 연동 문서는 모달에서만 생성

---

## 📁 수정된 파일 목록

### 등록 화면
- `src/app/apqp/register/page.tsx`
- `src/app/pfmea/register/page.tsx`
- `src/app/dfmea/register/page.tsx`
- `src/app/pfd/register/page.tsx`
- `src/app/control-plan/register/page.tsx`

### 리스트 화면
- `src/app/apqp/list/page.tsx`

### 모달
- `src/components/modals/CreateDocumentModal.tsx`

---

## 🔧 handleSave 표준 패턴

```tsx
const handleSave = async () => {
  // ★★★ ID가 없으면 저장 불가 ★★★
  if (!apqpId) {  // 또는 fmeaId, pfdId, cpId
    alert('ID가 없습니다. "새로 작성" 버튼을 눌러 ID를 먼저 생성해주세요.');
    setIsCreateModalOpen(true);
    return;
  }
  
  // 유효성 검사
  if (!apqpInfo.subject?.trim()) {
    alert('이름을 입력해주세요.');
    return;
  }
  
  // 저장 로직...
  const finalId = apqpId.toLowerCase();  // 기존 ID 사용 (새로 생성 안 함)
  
  // API 호출 (upsert)
  const res = await fetch('/api/apqp', {
    method: 'POST',
    body: JSON.stringify({ apqpNo: finalId, ... }),
  });
};
```

---

## 📋 체크리스트

- [x] APQP 등록: 자동 ID 생성 제거
- [x] PFMEA 등록: 자동 ID 생성 + 연동 PFD/CP 생성 제거
- [x] DFMEA 등록: 자동 ID 생성 제거
- [x] PFD 등록: 자동 ID 생성 제거
- [x] CP 등록: 자동 ID 생성 + 연동 PFD 생성 제거
- [x] APQP 리스트: 연동 ID 자동 생성 제거
- [x] CreateDocumentModal: router.push → window.location.href

---

## 🧪 테스트 방법

1. **브라우저 LocalStorage 정리**
   - F12 → Application → Local Storage → 모든 항목 삭제

2. **Prisma Studio에서 DB 정리**
   - ApqpRegistration, FmeaProject, PfdRegistration, CpRegistration 삭제

3. **테스트 시나리오**
   - `/apqp/register` 접속 → 빈 폼 확인
   - "새로 작성" 클릭 → 모달 확인
   - 연동 앱 선택 후 "생성" 클릭
   - 페이지 새로고침 → ID 표시 확인
   - 정보 입력 후 "저장" → DB 확인 (레코드 1개만 존재)

---

*Updated: 2026-01-29*
