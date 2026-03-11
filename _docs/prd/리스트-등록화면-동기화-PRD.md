# PRD: 리스트-등록화면 필드 동기화

## 📋 문서 정보
| 항목 | 내용 |
|------|------|
| **작성일** | 2026-01-27 |
| **작성자** | AI Assistant |
| **버전** | 1.0.0 |
| **상태** | ✅ 완료 |

---

## 1. 개요

### 1.1 목적
모든 모듈(PFD, CP, PFMEA, DFMEA, APQP)의 **등록화면 필드**와 **리스트 화면 컬럼**을 완전히 동기화하여 데이터 일관성을 확보합니다.

### 1.2 배경
- 등록화면에서 입력한 데이터가 리스트에서 '미입력'으로 표시되는 문제 발생
- 등록화면에 있는 필드(상위 APQP 등)가 리스트에 없는 불일치 문제
- 등록화면에 없는 필드(부품명, 항목수)가 리스트에 있는 불일치 문제

### 1.3 범위
| 모듈 | 등록화면 | 리스트 화면 | API | DB 스키마 |
|------|----------|-------------|-----|-----------|
| PFD | ✅ | ✅ | ✅ | ✅ |
| CP | ✅ | ✅ | - | - |
| PFMEA | ✅ | ✅ | - | - |
| DFMEA | ✅ | ✅ | - | - |
| APQP | ✅ | ✅ | - | - |

---

## 2. 설계 원칙

### 2.1 등록화면 우선 원칙
```
등록화면 필드 = 리스트 컬럼
```

1. **등록화면에 있는 필드** → 리스트에 반드시 표시
2. **등록화면에 없는 필드** → 리스트에서 제거
3. **모든 연동 정보** (상위/하위 관계) → 리스트에 컬럼으로 표시

### 2.2 컬럼 표준화
| 컬럼 유형 | 배지 색상 | 예시 |
|----------|----------|------|
| 상위 APQP | 🔵 Blue (#2563eb) | `APQP pj26-001` |
| 상위 FMEA | 🟡 Yellow (#eab308) | `FMEA pfm26-p001` |
| 상위 CP | 🟢 Teal (#0d9488) | `CP cp26-m001` |
| 연동 PFD | 🟣 Violet (#7c3aed) | `PFD pfd26-p001` |
| 하위 FMEA | 🟡 Yellow (#eab308) | `FMEA pfm26-p001` |
| 하위 CP | 🟢 Teal (#0d9488) | `CP cp26-p001` |

---

## 3. 모듈별 변경 내역

### 3.1 PFD 리스트

#### 변경 전
```
No | PFD ID | TYPE | PFD명 | 고객사 | 부품명 | 공정책임 | 상위 PFMEA | 연동 CP | 담당자 | 항목수 | 시작일 | 목표완료일 | Rev | 단계
```

#### 변경 후
```
No | PFD ID | TYPE | PFD명 | 고객사 | 공정책임 | 상위 APQP | 상위 PFMEA | 연동 CP | 담당자 | 시작일 | 목표완료일 | Rev | 단계
```

#### 변경 사항
| 항목 | 변경 |
|------|------|
| ❌ 부품명 | 삭제 (등록화면에 없음) |
| ❌ 항목수 | 삭제 (워크시트 데이터) |
| ✅ 상위 APQP | 추가 (등록화면에 있음) |

### 3.2 CP 리스트

#### 변경 전
```
No | CP ID | TYPE | 상위 CP | CP명 | 고객사 | 공정책임 | 담당자 | 시작일 | 목표완료일 | 개정번호 | 단계
```

#### 변경 후
```
No | CP ID | TYPE | CP명 | 고객사 | 공정책임 | 상위 APQP | 상위 FMEA | 상위 CP | 연동 PFD | 담당자 | 시작일 | 목표완료일 | Rev | 단계
```

#### 변경 사항
| 항목 | 변경 |
|------|------|
| ✅ 상위 APQP | 추가 |
| ✅ 상위 FMEA | 추가 |
| ✅ 연동 PFD | 추가 |
| 🔄 컬럼 순서 조정 | CP명 앞으로 이동 |

### 3.3 PFMEA 리스트

#### 변경 전
```
No | FMEA ID | TYPE | 상위 FMEA | 프로젝트명 | FMEA명 | 고객사 | 모델명 | 공정책임 | 담당자 | CFT | 시작일 | 목표완료일 | Rev | 단계
```

#### 변경 후
```
No | FMEA ID | TYPE | 상위 FMEA | FMEA명 | 고객사 | 모델명 | 공정책임 | 담당자 | CFT | 상위 APQP | 연동 PFD | 연동 CP | 시작일 | 목표완료일 | Rev | 단계
```

#### 변경 사항
| 항목 | 변경 |
|------|------|
| ❌ 프로젝트명 | 삭제 (등록화면에 없음) |
| ✅ 상위 APQP | 추가 |
| ✅ 연동 PFD | 추가 |
| ✅ 연동 CP | 추가 |

### 3.4 DFMEA 리스트

#### 변경 전
```
No | FMEA ID | TYPE | 상위 FMEA | 프로젝트명 | FMEA명 | 고객사 | 모델명 | 설계책임 | 담당자 | CFT | 시작일 | 목표완료일 | Rev | 단계
```

#### 변경 후
```
No | FMEA ID | TYPE | 상위 FMEA | FMEA명 | 고객사 | 모델명 | 설계책임 | 담당자 | CFT | 상위 APQP | 시작일 | 목표완료일 | Rev | 단계
```

#### 변경 사항
| 항목 | 변경 |
|------|------|
| ❌ 프로젝트명 | 삭제 (등록화면에 없음) |
| ✅ 상위 APQP | 추가 |

### 3.5 APQP 리스트

#### 변경 전
```
No | APQP ID | 프로젝트명 | 고객사 | 품명 | 회사명 | 시작일 | 목표완료일 | 상태 | 담당자 | 작성일
```

#### 변경 후
```
No | APQP ID | APQP명 | 고객사 | 품명 | 회사명 | 하위 FMEA | 하위 CP | 시작일 | 목표완료일 | 상태 | 담당자 | 작성일
```

#### 변경 사항
| 항목 | 변경 |
|------|------|
| 🔄 프로젝트명 → APQP명 | 명칭 통일 |
| ✅ 하위 FMEA | 추가 |
| ✅ 하위 CP | 추가 |

---

## 4. DB 스키마 변경

### 4.1 PfdRegistration 모델 신규 필드

```prisma
model PfdRegistration {
  // ... 기존 필드 ...
  
  // ★ 2026-01-27 추가
  processResponsibility String? // 공정책임 (부서)
  pfdResponsibleName    String? // PFD 담당자 (이름)
  pfdStartDate          String? // 시작 일자
  pfdRevisionDate       String? // 목표 완료일
  engineeringLocation   String? // 엔지니어링 위치
  confidentialityLevel  String? // 기밀유지 수준
}
```

### 4.2 마이그레이션
```bash
npx prisma generate
npx prisma db push --accept-data-loss
```

---

## 5. API 변경

### 5.1 PFD API (`/api/pfd/route.ts`)

#### POST 메서드 변경
- **기존**: 생성만 지원
- **변경**: Upsert (생성 또는 업데이트) 지원

#### 데이터 구조 처리
```typescript
// 등록화면에서 보내는 구조
const { 
  pfdInfo,        // 중첩 객체
  parentFmeaId,   // 등록화면 필드명
  linkedCpNo,     // 등록화면 필드명
  parentApqpNo,   // 등록화면 필드명
} = body;

// API 내부 정규화
const finalData = {
  pfdNo,
  subject: pfdInfo?.subject || subject,
  processResponsibility: pfdInfo?.processResponsibility,
  pfdResponsibleName: pfdInfo?.pfdResponsibleName,
  pfdStartDate: pfdInfo?.pfdStartDate,
  pfdRevisionDate: pfdInfo?.pfdRevisionDate,
  fmeaId: parentFmeaId || fmeaId,
  cpNo: linkedCpNo || cpNo,
  apqpProjectId: parentApqpNo || apqpProjectId,
  // ...
};
```

---

## 6. 인터페이스 변경

### 6.1 리스트 인터페이스 추가 필드

#### CPProject
```typescript
interface CPProject {
  // ... 기존 필드 ...
  parentApqpNo?: string;
  parentFmeaId?: string;
  linkedPfdNo?: string;
}
```

#### FMEAProject (PFMEA/DFMEA)
```typescript
interface FMEAProject {
  // ... 기존 필드 ...
  parentApqpNo?: string;
  linkedPfdNo?: string;   // PFMEA only
  linkedCpNo?: string;    // PFMEA only
}
```

#### APQPProject
```typescript
interface APQPProject {
  // ... 기존 필드 ...
  linkedFmeaId?: string;
  linkedCpNo?: string;
}
```

---

## 7. 테스트 체크리스트

### 7.1 PFD
- [ ] 등록화면에서 저장 후 리스트에서 데이터 확인
- [ ] 상위 APQP 연동 표시 확인
- [ ] 목표완료일 저장/표시 확인

### 7.2 CP
- [ ] 상위 APQP, 상위 FMEA, 연동 PFD 컬럼 표시 확인
- [ ] 클릭 시 해당 등록화면으로 이동 확인

### 7.3 PFMEA
- [ ] 상위 APQP, 연동 PFD, 연동 CP 컬럼 표시 확인
- [ ] 프로젝트명 컬럼 제거 확인

### 7.4 DFMEA
- [ ] 상위 APQP 컬럼 표시 확인
- [ ] 프로젝트명 컬럼 제거 확인

### 7.5 APQP
- [ ] 하위 FMEA, 하위 CP 컬럼 표시 확인

---

## 8. 수정 파일 목록

| 파일 경로 | 변경 내용 |
|----------|----------|
| `prisma/schema.prisma` | PfdRegistration 신규 필드 추가 |
| `src/app/api/pfd/route.ts` | POST upsert, 신규 필드 저장 |
| `src/app/pfd/list/page.tsx` | 컬럼 재구성, 상위 APQP 추가 |
| `src/app/control-plan/list/page.tsx` | 상위 APQP/FMEA, 연동 PFD 추가 |
| `src/app/pfmea/list/page.tsx` | 프로젝트명 삭제, 연동 정보 추가 |
| `src/app/dfmea/list/page.tsx` | 프로젝트명 삭제, 상위 APQP 추가 |
| `src/app/apqp/list/page.tsx` | 하위 FMEA, 하위 CP 추가 |

---

## 9. 커밋 히스토리

### 커밋 1
```
fix: PFD API upsert 수정 및 등록화면-리스트 데이터 동기화

- API POST를 upsert로 변경 (생성+업데이트 통합)
- 등록화면 데이터 구조(pfdInfo, parentFmeaId 등) 처리
- 리스트 페이지 필드 매핑을 DB 필드명과 일치
- 문서 연결(DocumentLink) upsert 처리
```

### 커밋 2
```
feat: 모든 리스트 페이지 등록화면 필드 동기화

PFD: 부품명/항목수 삭제, 상위 APQP 추가
CP: 상위 APQP, 상위 FMEA, 연동 PFD 추가
PFMEA: 프로젝트명 삭제, 상위 APQP/연동 PFD/연동 CP 추가
DFMEA: 프로젝트명 삭제, 상위 APQP 추가
APQP: 하위 FMEA, 하위 CP 추가

DB 스키마: PfdRegistration에 새 필드 추가
```

---

## 10. 향후 개선 사항

1. **API 데이터 매핑 표준화**: 다른 모듈 (CP, PFMEA 등)도 PFD처럼 API 데이터 매핑 정리
2. **연동 데이터 자동 조회**: 리스트에서 연동 ID 표시 시 실제 데이터 유무 확인
3. **배치 저장 최적화**: 여러 연동 데이터 동시 저장 시 트랜잭션 처리

---

**Code Freeze: 2026-01-27 19:42 KST**
