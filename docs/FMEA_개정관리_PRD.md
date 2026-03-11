# FMEA 개정관리 PRD

## 1. 개요

FMEA 프로젝트의 개정(Revision) 관리 기능. 기존 FMEA를 기반으로 새로운 개정판을 생성하고, 수정 후 확정하는 워크플로우.

## 2. 사용자 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│  FMEA 리스트    →   등록화면(Rev N+1)   →   워크시트   →   확정  │
│  ☑ 선택 → 개정    기존 데이터 복제         수정/검토      개정확정 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.1 상세 순서

| 단계 | 화면 | 동작 |
|------|------|------|
| ① | PFMEA 리스트 | 체크박스로 1건 선택 → **[개정]** 버튼 클릭 |
| ② | (자동) | API가 기존 프로젝트 복제 → 새 fmeaId + Rev N+1 생성 |
| ③ | 등록화면 | 복제된 데이터로 등록화면 자동 이동 (수정 가능) |
| ④ | 리스트 | 새 개정 프로젝트가 리스트에 표시됨 |
| ⑤ | 등록화면/워크시트 | 기존 데이터 수정 (기초정보, 워크시트 등) |
| ⑥ | 워크시트 | **[개정확정]** 버튼 → 개정 이력 기록 + 상태 확정 |

## 3. 개정 복제 규칙

### 3.1 fmeaId 생성 규칙
```
원본: pfm-abc-001        → 신규: pfm-abc-001-r01
원본: pfm-abc-001-r01    → 신규: pfm-abc-001-r02
원본: pfm-abc-001-r02    → 신규: pfm-abc-001-r03
```

### 3.2 revisionNo 증가 규칙
```
원본 Rev.00 → 신규 Rev.01
원본 Rev.01 → 신규 Rev.02
원본 Rev.99 → 신규 Rev.100  (2자리 넘어감 허용)
```

### 3.3 복제 대상 데이터

| 데이터 | 복제 여부 | 비고 |
|--------|:---------:|------|
| FmeaProject | ✅ | 새 ID, revisionNo 증가, parentFmeaId = 원본ID |
| FmeaRegistration | ✅ | 등록정보 전체 복사 (날짜 갱신) |
| FmeaCftMember | ✅ | CFT 멤버 복사 |
| FmeaWorksheetData | ✅ | 워크시트 구조 전체 복사 |
| PfmeaMasterDataset | ✅ | 기초정보 데이터 복사 |
| FmeaRevisionHistory | ❌ | 신규 개정에서 새로 시작 |
| FmeaSodHistory | ❌ | 신규 개정에서 새로 시작 |
| ProjectLinkage | ✅ | CP/PFD/DFMEA 연동 복사 |

## 4. API 설계

### 4.1 POST /api/fmea/revision-clone
```typescript
// Request
{
  sourceFmeaId: string;   // 원본 FMEA ID
}

// Response
{
  success: boolean;
  newFmeaId: string;      // 생성된 새 FMEA ID
  revisionNo: string;     // 새 개정번호 (Rev.XX)
  message: string;
}
```

### 4.2 복제 프로세스
```
1. 원본 FmeaProject 조회 (+ Registration + CFT + Worksheet)
2. 새 fmeaId 생성 (원본ID + "-r{NN}")
3. revisionNo 증가 (Rev.00 → Rev.01)
4. 트랜잭션으로 전체 복제:
   a. FmeaProject 생성 (parentFmeaId = 원본ID)
   b. FmeaRegistration 복사 (날짜 갱신)
   c. FmeaCftMember 복사
   d. FmeaWorksheetData 복사
   e. PfmeaMasterDataset 복사
   f. ProjectLinkage 복사
5. 개정 이력(FmeaRevisionHistory) 1행 자동 추가: "Rev.XX 개정 시작"
```

## 5. UI 변경사항

### 5.1 리스트 페이지 (기존 동작 유지)
- 체크박스 1건 선택 → [개정] 버튼 활성화 (기존과 동일)
- **변경**: 클릭 시 `/pfmea/revision` 대신 **복제 API 호출** → 등록화면 이동

### 5.2 등록화면
- `?id={newFmeaId}&mode=revision` 파라미터로 진입
- 상단에 "개정 모드" 배너 표시: `Rev.01 (원본: pfm-abc-001)`
- 기존 데이터 모두 로드된 상태로 편집 가능
- 저장 시 새 fmeaId로 저장

### 5.3 워크시트
- 개정 프로젝트일 경우 상단에 "개정확정" 버튼 표시
- 클릭 시: 확인 다이얼로그 → 개정 이력 기록 → step 7으로 변경

## 6. 기존 코드 영향

| 파일 | 변경 | 내용 |
|------|------|------|
| `src/app/pfmea/list/page.tsx` | 수정 | handleRevision 로직 변경 (API 호출) |
| `src/app/api/fmea/revision-clone/route.ts` | **신규** | 복제 API |
| `src/app/pfmea/register/hooks/useRegisterPageCore.ts` | 수정 | mode=revision 인식 |
| `src/components/list/ListActionBar.tsx` | 스타일만 | 보라색→파란색 변경 |
| `src/app/pfmea/worksheet/page.tsx` | 수정 | 개정확정 버튼 추가 |

## 7. 제약사항

- 한 번에 1건만 개정 가능
- 이미 개정 중인 프로젝트는 중복 개정 방지 (같은 원본 기준)
- 개정확정 전까지 상태는 "개정중"
- 원본 프로젝트는 변경하지 않음 (읽기 전용 보존)
