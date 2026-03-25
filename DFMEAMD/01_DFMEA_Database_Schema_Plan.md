# DFMEA (Design) 데이터베이스(DB) 확장 스키마 설계안

## 1. 개요 (Prisma 연동 전략)
PFMEA 전용으로 구성되어 있던 기존 데이터 모델에 설계 FMEA(DFMEA)를 수용하기 위한 핵심 확장 전략 문서입니다.

## 2. 기본 테이블(FmeaProject, FmeaNode) `fmeaType` 추가
기존 PFMEA 노드 구조(L1, L2, L3)를 DFMEA(시스템, 서브시스템, 부품특성/요구사항)에 동일하게 적용하기 위해 `fmeaType` Enum 컬럼을 삽입합니다.

```prisma
// FMEA 프로젝트/루트 정보
model FmeaProject {
  id        String   @id @default(uuid())
  fmeaType  String   @default("PFMEA") // "PFMEA" | "DFMEA"
  apqpNo    String?
  ...기존 필드 유지
}

// 트리 구조 노드
model FmeaNode {
  id        String   @id @default(uuid())
  fmeaType  String   @default("PFMEA") // "PFMEA" | "DFMEA"
  
  // DFMEA에서는 공정명칭이 아니라 시스템 블록/경계 이름이 적재됨
  name      String
  ...
}
```

## 3. DFMEA 전용 리스크 채점 기준표(Rating Table) 구축
공정 FMEA의 **검출관리(DC)**와 설계 FMEA의 **설계 검증 테스트(DV)**는 기준이 전혀 다릅니다. 기존 PFMEA 1~10 Rating 테이블과 완전히 독립된 DFMEA Rating 마스터 테이블이 필요합니다.

```prisma
model DfmeaRatingCriteria {
  id          String   @id @default(uuid())
  type        String   @default("S") // S | O | D
  score       Int      // 1 ~ 10
  description String   // DFMEA 전용 "설계 고장 기준" 모형설명
  ...
}
```

## 4. 구조화된 LLD(학습 교훈) 테이블 분리 여부
기존 `LLD` 테이블 또한 "공정번호", "공정명" 등으로 락인(Lock-in)되어 있다면 DFMEA를 위한 확장 또는 별도 테이블(`DfmeaLld`) 신설을 고려해야 합니다.

* **안 1 (기존 LLD에 컬럼 추가):** `fmeaType` Enum을 넣고, "공정명" 필드를 DFMEA에서는 "서브시스템/모듈명"으로 렌더링.
* **안 2 (별도 DfmeaLld 생성):** 완전히 독립적인 `DfmeaLld` 테이블을 만들어 설계/개발 이슈들만 별도로 축적(권장).
