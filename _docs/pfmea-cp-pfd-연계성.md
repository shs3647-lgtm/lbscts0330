/**
 * @file pfmea-cp-pfd-연계성.md
 * @description PFMEA/CP/PFD 양방향 연동 테스트 계획서
 * @created 2026-01-29
 */

# PFMEA/CP/PFD 양방향 연동 테스트

## 📋 연동 구조

```
APQP (pj26-n001)
  ├── 연동 PFMEA (pfm26-n001)
  ├── 연동 DFMEA (dfm26-n001)  ★ 신규 추가
  ├── 연동 CP (cpl26-n001)
  └── 연동 PFD (pfdl26-n001)
```

## 🗄️ DB 스키마 (Prisma)

### ApqpRegistration
```prisma
model ApqpRegistration {
  // ..기본 필드..
  
  // ★★★ 연동 문서 (하위 자동 생성) ★★★
  linkedFmea   String? // 연동 PFMEA ID (pfm26-n001)
  linkedDfmea  String? // 연동 DFMEA ID (dfm26-n001)
  linkedCp     String? // 연동 CP ID (cpl26-n001)
  linkedPfd    String? // 연동 PFD ID (pfdl26-n001)
}
```

### FmeaRegistration (PFMEA)
```prisma
model FmeaRegistration {
  // 상위 연결
  parentApqpNo  String?  // 상위 APQP ID
  parentFmeaId  String?  // 상위 FMEA ID (계층 구조)
  
  // 하위 연결
  linkedCpNos   String[] // 연동 CP ID 배열
  linkedPfdNo   String?  // 연동 PFD ID
}
```

### CpRegistration (Control Plan)
```prisma
model CpRegistration {
  // 상위 연결
  parentApqpNo  String?  // 상위 APQP ID
  parentFmeaId  String?  // 상위 FMEA ID
  
  // 연동
  linkedPfdNo   String?  // 연동 PFD ID
}
```

### PfdRegistration (PFD)
```prisma
model PfdRegistration {
  // 상위 연결
  linkedApqpNo  String?  // 상위 APQP ID
  linkedFmeaNo  String?  // 상위 FMEA ID
  
  // 연동
  linkedCpNos   String[] // 연동 CP ID 배열
}
```

## 🧪 테스트 시나리오

### 1. APQP → 연동 문서 자동 생성 ✅

**테스트 순서:**
1. `/apqp/register` 접속
2. APQP 정보 입력
3. 저장 버튼 클릭
4. **확인**: 연동 PFMEA/DFMEA/CP/PFD ID 자동 생성

**예상 결과:**
- APQP ID: `pj26-n001`
- 연동 PFMEA: `pfm26-n001` (자동)
- 연동 DFMEA: `dfm26-n001` (자동)
- 연동 CP: `cpl26-n001` (자동)
- 연동 PFD: `pfdl26-n001` (자동)

### 2. PFMEA → CP/PFD 연동

**테스트 순서:**
1. `/pfmea/register?id=pfm26-n001` 접속
2. 상위 APQP 확인: `pj26-n001`
3. PFMEA 데이터 입력 및 저장
4. 연동 CP/PFD 버튼 클릭
5. **확인**: CP/PFD 등록화면으로 이동

### 3. CP → PFMEA/PFD 연동

**테스트 순서:**
1. `/control-plan/register?id=cpl26-n001` 접속
2. 상위 APQP/FMEA 확인
3. 연동 PFD 버튼 클릭
4. **확인**: PFD 등록화면으로 이동

### 4. PFD → PFMEA/CP 연동

**테스트 순서:**
1. `/pfd/register?id=pfdl26-n001` 접속
2. 상위 APQP/FMEA 확인
3. 연동 CP 버튼 클릭
4. **확인**: CP 등록화면으로 이동

## ✅ 체크리스트

| 항목 | APQP | PFMEA | CP | PFD |
|------|:----:|:-----:|:--:|:---:|
| 상위 APQP 표시 | - | ✅ | ✅ | ✅ |
| 상위 FMEA 표시 | - | ✅ | ✅ | ✅ |
| 연동 PFMEA 자동생성 | ✅ | - | - | - |
| 연동 DFMEA 자동생성 | ✅ | - | - | - |
| 연동 CP 자동생성 | ✅ | ✅ | - | ✅ |
| 연동 PFD 자동생성 | ✅ | ✅ | ✅ | - |
| 저장 시 DB 반영 | ✅ | ✅ | ✅ | ✅ |
| 버튼 클릭 이동 | ✅ | ✅ | ✅ | ✅ |

## 📝 API 엔드포인트

| 모듈 | 엔드포인트 | 메소드 |
|------|-----------|--------|
| APQP | `/api/apqp` | GET/POST/PUT/DELETE |
| PFMEA | `/api/fmea/projects` | GET/POST/PUT/DELETE |
| CP | `/api/control-plan` | GET/POST/PUT/DELETE |
| PFD | `/api/pfd` | GET/POST/PUT/DELETE |

## 🔄 연동 버튼 동작

| 버튼 | 동작 |
|------|------|
| APQP 연동 버튼 | 상위 APQP 등록화면으로 이동 (데이터 있으면 ID 포함) |
| FMEA 연동 버튼 | 상위/연동 FMEA 등록화면으로 이동 |
| CP 연동 버튼 | 연동 CP 등록화면으로 이동 |
| PFD 연동 버튼 | 연동 PFD 등록화면으로 이동 |

---

**작성일**: 2026-01-29
**작성자**: AI Assistant
