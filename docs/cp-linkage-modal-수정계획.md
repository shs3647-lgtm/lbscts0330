# 연동 모달 표준화 계획서

**작성일**: 2026-01-28  
**업데이트**: 2026-01-29 (v2.0 - 자동 ID 생성 및 두 단계 화면 분리)  
**상태**: ✅ v2.0 구현 완료

---

## 1. 개요

### 1.0 v2.0 변경사항 (2026-01-29)
- **자동 ID 생성**: "+ 추가" 버튼 클릭 시 ID 자동 생성 (사용자 선택 없음)
- **두 단계 화면 분리**: 기본 화면 (자동 생성) + 고급 화면 (기존 문서 선택)
- **기존 문서 선택 경고**: 데이터 덮어쓰기 위험 경고 및 확인
- **메인 문서 보호**: 첫 번째 연동(L01)은 삭제 불가

### 1.1 목표
- **APQP, PFMEA, PFD, CP** 모든 모듈에서 **동일한 연동 모달** 사용
- 기본 생성 시 **L01 연동 문서 자동 생성**
- 사용자가 **토글/추가/삭제**로 연동 관리
- 연동 문서는 **등록정보 공유**

### 1.2 핵심 원칙
```
┌─────────────────────────────────────────────────────────────────┐
│                      문서 생성 플로우                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   1️⃣ PFMEA 등록 (pfm26-m001-L01)                                │
│       ↓                                                         │
│   2️⃣ 연동 PFD 자동 생성 (pfd26-m001-L01)   ← 등록정보 공유      │
│       ↓                                                         │
│   3️⃣ 연동 CP 자동 생성 (cp26-m001-L01)     ← 등록정보 공유      │
│                                                                 │
│   📌 사용자가 연동 해제 시:                                      │
│       - 토글 OFF → ID가 -S로 변경                                │
│       - 문서 독립 (더 이상 동기화 안됨)                          │
│                                                                 │
│   📌 사용자가 추가 연동 시:                                      │
│       - "+ 추가" 버튼 → 새 연동 문서 생성 (L02, L03...)          │
│       - 등록정보 자동 복사                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 표준 연동 모달 UI

### 2.1 모달 디자인

```
┌──────────────────────────────────────────────────────────────────────┐
│ 🔗 연동 문서 관리                                    [+ 추가]  [✕] │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  📄 연동 PFD 목록                                                    │
│  ┌────────────────────┬──────┬────────────┬──────┬──────────┬──────┐│
│  │ PFD ID             │ 유형 │ 제목       │ 연동 │ 그룹     │ 삭제 ││
│  ├────────────────────┼──────┼────────────┼──────┼──────────┼──────┤│
│  │ pfd26-m001-L01     │  M   │ (자동동기) │[🔘ON]│   L01    │  -   ││
│  │ pfd26-m001-L02     │  M   │ (자동동기) │[🔘ON]│   L02    │  ✕   ││
│  │ pfd26-m002-S       │  M   │ 프로젝트B  │[⚪OFF]│   -     │  ✕   ││
│  └────────────────────┴──────┴────────────┴──────┴──────────┴──────┘│
│                                                                      │
│  📋 연동 CP 목록                                                     │
│  ┌────────────────────┬──────┬────────────┬──────┬──────────┬──────┐│
│  │ CP ID              │ 유형 │ 제목       │ 연동 │ 그룹     │ 삭제 ││
│  ├────────────────────┼──────┼────────────┼──────┼──────────┼──────┤│
│  │ cp26-p001-L01      │  P   │ (자동동기) │[🔘ON]│   L01    │  -   ││
│  │ cp26-t002-L02      │  T   │ 시작품 CP  │[🔘ON]│   L02    │  ✕   ││
│  └────────────────────┴──────┴────────────┴──────┴──────────┴──────┘│
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│ � 연동 ON: 등록정보 자동 동기화  │  연동 OFF: 독립 문서로 분리      │
└──────────────────────────────────────────────────────────────────────┘
```

### 2.2 토글 동작

| 토글 상태 | ID 형식 | 동작 |
|-----------|---------|------|
| **🔘 ON** | `xxx-L01` | 등록정보 자동 동기화 (제목, 고객, 담당자 등) |
| **⚪ OFF** | `xxx-S` | 독립 문서로 분리, 더 이상 동기화 안됨 |

### 2.3 버튼 동작

| 버튼 | 동작 |
|------|------|
| **+ 추가** | 새 연동 문서 생성 (L02, L03...), 등록정보 자동 복사 |
| **✕ 삭제** | 연동 문서 삭제 (자동생성 L01은 삭제 불가) |

---

## 3. 모듈별 적용

### 3.1 적용 대상

| 모듈 | 등록화면 | 연동 대상 |
|------|----------|-----------|
| **APQP** | `/apqp/register` | PFMEA, PFD, CP |
| **PFMEA** | `/pfmea/register` | PFD, CP |
| **PFD** | `/pfd/register` | CP |
| **CP** | `/control-plan/register` | PFD (역방향) |

### 3.2 연동 문서 자동 생성

```
PFMEA 등록 시:
┌─────────────────────────────────────────────────────┐
│ 1. PFMEA 저장 (pfm26-m001-L01)                      │
│    ↓                                                │
│ 2. PFD 자동 생성 (pfd26-m001-L01)                   │
│    - subject: PFMEA.subject                         │
│    - customerName: PFMEA.customerName               │
│    - parentFmeaId: pfm26-m001-L01                   │
│    ↓                                                │
│ 3. CP 자동 생성 (cp26-m001-L01)                     │
│    - subject: PFMEA.subject                         │
│    - customerName: PFMEA.customerName               │
│    - parentFmeaId: pfm26-m001-L01                   │
│    - linkedPfdNo: pfd26-m001-L01                    │
└─────────────────────────────────────────────────────┘
```

### 3.3 추가 연동 시 플로우

```
사용자가 [+ 추가] 클릭:
┌─────────────────────────────────────────────────────┐
│ 1. 다음 연동 그룹 번호 계산 (L01 있으면 → L02)      │
│    ↓                                                │
│ 2. 새 연동 문서 생성                                │
│    - ID: pfd26-m001-L02 또는 cp26-m001-L02          │
│    - 등록정보: 부모 FMEA에서 복사                   │
│    ↓                                                │
│ 3. ProjectLinkage 테이블에 연동 관계 저장           │
│    ↓                                                │
│ 4. 리스트에 새 항목 추가                            │
└─────────────────────────────────────────────────────┘
```

---

## 4. 구현 상세

### 4.1 표준 컴포넌트 구조

```
src/components/linkage/
├── LinkageModal.tsx           ← 표준 연동 모달
├── LinkageToggle.tsx          ← 토글 스위치
├── LinkageList.tsx            ← 연동 리스트
├── types.ts                   ← 타입 정의
└── utils.ts                   ← 유틸리티 함수
```

### 4.2 LinkageModal Props

```typescript
interface LinkageModalProps {
  isOpen: boolean;
  onClose: () => void;
  
  // 현재 문서 정보
  sourceModule: 'apqp' | 'pfm' | 'pfd' | 'cp';
  sourceId: string;
  sourceInfo: {  // 등록정보 (자동 복사용)
    subject: string;
    customerName: string;
    modelYear?: string;
    // ...
  };
  
  // 연동 리스트
  linkedPfdList: LinkedDocItem[];
  linkedCpList: LinkedDocItem[];
  
  // 이벤트 핸들러
  onAddLinkedDoc: (targetModule: 'pfd' | 'cp') => void;
  onRemoveLinkedDoc: (docId: string) => void;
  onToggleLinkage: (docId: string, isLinked: boolean) => void;
}

interface LinkedDocItem {
  id: string;           // 예: pfd26-m001-L01
  module: 'pfd' | 'cp';
  type: string;         // M, F, P 또는 T, L, P, S
  subject?: string;
  linkGroupNo: number;  // 0=Solo, 1~99=Linked
  isAutoGenerated: boolean;  // 자동생성 여부 (L01)
}
```

### 4.3 등록정보 공유 로직

```typescript
// 연동 문서 추가 시
async function addLinkedDoc(targetModule: 'pfd' | 'cp', sourceInfo: SourceInfo) {
  const nextGroupNo = getNextLinkGroupNo(existingDocs);
  const newId = generateDocId(targetModule, sourceInfo.type, nextSerial, nextGroupNo);
  
  // 등록정보 자동 복사
  await fetch(`/api/${targetModule}`, {
    method: 'POST',
    body: JSON.stringify({
      [`${targetModule}No`]: newId,
      subject: sourceInfo.subject,           // ★ 복사
      customerName: sourceInfo.customerName,  // ★ 복사
      modelYear: sourceInfo.modelYear,        // ★ 복사
      parentFmeaId: sourceInfo.fmeaId,
      // ...
    }),
  });
}
```

---

## 5. 변경 파일 목록

| 파일 | 작업 |
|------|------|
| `components/linkage/LinkageModal.tsx` | **신규** - 표준 모달 |
| `components/linkage/LinkageToggle.tsx` | **신규** - 토글 컴포넌트 |
| `components/linkage/types.ts` | **신규** - 타입 정의 |
| `pfd/register/components/CpManageModal.tsx` | **삭제** - 표준 모달로 대체 |
| `pfmea/register/page.tsx` | **수정** - 표준 모달 적용 |
| `pfd/register/page.tsx` | **수정** - 표준 모달 적용 |
| `control-plan/register/page.tsx` | **수정** - 표준 모달 적용 |
| `apqp/register/page.tsx` | **수정** - 표준 모달 적용 (해당 시) |

---

## 6. 예상 UI 플로우

### 6.1 PFMEA 등록화면
```
┌──────────────────────────────────────────────────────────────────┐
│ [등록정보 테이블]                                                │
│                                                                  │
│ FMEA ID: pfm26-m001-L01        │ 연동 PFD: pfd26-m001-L01 [관리] │
│ 제목: 신규 프로젝트            │ 연동 CP:  cp26-m001-L01  [관리] │
│ 고객: ABC자동차               │                                 │
└──────────────────────────────────────────────────────────────────┘
                                        ↓ [관리] 클릭
                              ┌────────────────────────────────────┐
                              │ 🔗 연동 문서 관리 (표준 모달)      │
                              │   - 연동 PFD 리스트 (토글/추가)    │
                              │   - 연동 CP 리스트 (토글/추가)     │
                              └────────────────────────────────────┘
```

---

## 7. 승인 요청

### 수정 범위:
1. ✅ **표준 LinkageModal 컴포넌트** 신규 생성
2. ✅ **APQP, PFMEA, PFD, CP** 모든 등록화면에 적용
3. ✅ **기본 L01 연동 문서 자동 생성**
4. ✅ **토글/추가/삭제**로 연동 관리
5. ✅ **등록정보 자동 공유**

**승인해 주시면 구현 시작합니다.** 🙏
