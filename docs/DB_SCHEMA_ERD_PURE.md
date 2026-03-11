# 📊 FMEA DB 스키마 ERD - Mermaid 순수 코드

> **사용법**: 각 다이어그램 코드를 복사해서 Mermaid Live Editor에 붙여넣으세요.  
> **Mermaid Live Editor**: https://mermaid.live/

---

## 1. 전체 ERD (Entity Relationship Diagram)

아래 코드를 복사해서 붙여넣으세요:

```
erDiagram
    APQPProject {
        string id PK
        string name
        string productName
        string customerName
        string status
        string startDate
        string targetDate
    }

    L1Structure {
        string id PK
        string fmeaId FK
        string name
        boolean confirmed
    }

    L2Structure {
        string id PK
        string fmeaId FK
        string l1Id FK
        string no
        string name
        int order
    }

    L3Structure {
        string id PK
        string fmeaId FK
        string l1Id FK
        string l2Id FK
        string m4
        string name
        int order
    }

    L1Function {
        string id PK
        string fmeaId FK
        string l1StructId FK
        string category
        string functionName
        string requirement
    }

    L2Function {
        string id PK
        string fmeaId FK
        string l2StructId FK
        string functionName
        string productChar
        string specialChar
    }

    L3Function {
        string id PK
        string fmeaId FK
        string l3StructId FK
        string l2StructId FK
        string functionName
        string processChar
        string specialChar
    }

    FailureEffect {
        string id PK
        string fmeaId FK
        string l1FuncId FK
        string category
        string effect
        int severity
    }

    FailureMode {
        string id PK
        string fmeaId FK
        string l2FuncId FK
        string l2StructId FK
        string productCharId FK
        string mode
        boolean specialChar
    }

    FailureCause {
        string id PK
        string fmeaId FK
        string l3FuncId FK
        string l3StructId FK
        string l2StructId FK
        string cause
        int occurrence
    }

    FailureLink {
        string id PK
        string fmeaId FK
        string fmId FK
        string feId FK
        string fcId FK
        string cache
    }

    RiskAnalysis {
        string id PK
        string fmeaId FK
        string linkId FK
        int severity
        int occurrence
        int detection
        string ap
        string preventionControl
        string detectionControl
    }

    Optimization {
        string id PK
        string fmeaId FK
        string riskId FK
        string recommendedAction
        string responsible
        string targetDate
        int newSeverity
        int newOccurrence
        int newDetection
        string newAP
        string status
        string completedDate
    }

    APQPProject ||--o{ L1Structure : contains
    L1Structure ||--o{ L2Structure : has
    L2Structure ||--o{ L3Structure : has
    L1Structure ||--o{ L1Function : defines
    L2Structure ||--o{ L2Function : defines
    L3Structure ||--o{ L3Function : defines
    L1Function ||--o{ FailureEffect : causes
    L2Function ||--o{ FailureMode : causes
    L3Function ||--o{ FailureCause : causes
    FailureMode ||--o{ FailureLink : center
    FailureEffect ||--o{ FailureLink : linked
    FailureCause ||--o{ FailureLink : linked
    FailureLink ||--|| RiskAnalysis : analyzed
    RiskAnalysis ||--o{ Optimization : optimized
```

---

## 2. 구조분석 계층 (Structure Hierarchy)

```
flowchart TB
    subgraph L1[1L 완제품 공정]
        L1S[L1Structure<br/>완제품 제조라인]
    end
    
    subgraph L2[2L 메인공정]
        L2S1[L2Structure<br/>10 프레스]
        L2S2[L2Structure<br/>20 용접]
        L2S3[L2Structure<br/>30 도장]
    end
    
    subgraph L3[3L 작업요소]
        L3S1[L3Structure<br/>MN 작업자 셋업]
        L3S2[L3Structure<br/>MC 프레스 가동]
        L3S3[L3Structure<br/>MN 용접 작업]
        L3S4[L3Structure<br/>MC 로봇 용접]
    end
    
    L1S --> L2S1
    L1S --> L2S2
    L1S --> L2S3
    
    L2S1 --> L3S1
    L2S1 --> L3S2
    L2S2 --> L3S3
    L2S2 --> L3S4

    style L1 fill:#e3f2fd,stroke:#1565c0
    style L2 fill:#fff3e0,stroke:#ef6c00
    style L3 fill:#e8f5e9,stroke:#2e7d32
```

---

## 3. 기능-고장 연결 (Function to Failure)

```
flowchart LR
    subgraph Structure[구조분석 2단계]
        S1[L1Structure]
        S2[L2Structure]
        S3[L3Structure]
    end
    
    subgraph Function[기능분석 3단계]
        F1[L1Function<br/>완제품기능+요구사항]
        F2[L2Function<br/>메인공정기능+제품특성]
        F3[L3Function<br/>작업요소기능+공정특성]
    end
    
    subgraph Failure[고장분석 4단계]
        FE[FailureEffect<br/>고장영향 FE]
        FM[FailureMode<br/>고장형태 FM]
        FC[FailureCause<br/>고장원인 FC]
    end
    
    S1 --> F1
    S2 --> F2
    S3 --> F3
    
    F1 --> FE
    F2 --> FM
    F3 --> FC

    style FM fill:#ffcdd2,stroke:#c62828,stroke-width:3px
```

---

## 4. 고장연결 관계 (FailureLink)

```
flowchart TB
    subgraph FE_Group[고장영향 1L]
        FE1[FE: 차량 정지]
        FE2[FE: 소음 발생]
        FE3[FE: 외관 불량]
    end
    
    subgraph FM_Group[고장형태 2L - 중심축]
        FM1[FM: 용접 강도 부족]
    end
    
    subgraph FC_Group[고장원인 3L]
        FC1[FC: 전류 설정 오류]
        FC2[FC: 전극 마모]
        FC3[FC: 시간 부족]
    end
    
    subgraph Links[FailureLink 관계 테이블]
        L1[Link 1]
        L2[Link 2]
        L3[Link 3]
    end
    
    FE1 --> L1
    FE2 --> L2
    FE3 --> L3
    
    FM1 --> L1
    FM1 --> L2
    FM1 --> L3
    
    FC1 --> L1
    FC2 --> L2
    FC3 --> L3

    style FM_Group fill:#ffcdd2,stroke:#c62828,stroke-width:2px
    style Links fill:#e1f5fe,stroke:#0288d1
```

---

## 5. 리스크-최적화 흐름 (Risk to Optimization)

```
flowchart LR
    subgraph Step4[4단계 고장분석]
        FL[FailureLink<br/>FE + FM + FC]
    end
    
    subgraph Step5[5단계 리스크분석]
        RA[RiskAnalysis<br/>S x O x D = AP]
        PC[예방관리 PC]
        DC[검출관리 DC]
    end
    
    subgraph Step6[6단계 최적화]
        OPT[Optimization<br/>개선조치]
        NEW[New SOD<br/>개선 후 평가]
    end
    
    FL --> RA
    RA --> PC
    RA --> DC
    RA --> OPT
    OPT --> NEW

    style Step4 fill:#fff3e0,stroke:#ef6c00
    style Step5 fill:#e8f5e9,stroke:#2e7d32
    style Step6 fill:#e3f2fd,stroke:#1565c0
```

---

## 6. FMEA 7단계 프로세스 흐름

```
flowchart TB
    subgraph Step1[1단계 계획 및 준비]
        P1[프로젝트 정의]
        P2[범위 설정]
        P3[팀 구성]
    end
    
    subgraph Step2[2단계 구조분석]
        S1[L1 완제품 공정]
        S2[L2 메인공정]
        S3[L3 작업요소]
    end
    
    subgraph Step3[3단계 기능분석]
        F1[L1 완제품기능 + 요구사항]
        F2[L2 메인공정기능 + 제품특성]
        F3[L3 작업요소기능 + 공정특성]
    end
    
    subgraph Step4[4단계 고장분석]
        FA1[L1 고장영향 FE]
        FA2[L2 고장형태 FM]
        FA3[L3 고장원인 FC]
        FA4[고장연결 FailureLink]
    end
    
    subgraph Step5[5단계 리스크분석]
        R1[SOD 평가]
        R2[AP 산출]
        R3[예방검출관리]
    end
    
    subgraph Step6[6단계 최적화]
        O1[개선조치 수립]
        O2[담당자 일정]
        O3[개선 후 평가]
    end
    
    subgraph Step7[7단계 결과문서화]
        D1[FMEA 보고서]
        D2[Control Plan]
        D3[Lessons Learned]
    end
    
    Step1 --> Step2
    Step2 --> Step3
    Step3 --> Step4
    Step4 --> Step5
    Step5 --> Step6
    Step6 --> Step7

    style Step1 fill:#f3e5f5,stroke:#7b1fa2
    style Step2 fill:#e3f2fd,stroke:#1565c0
    style Step3 fill:#e8f5e9,stroke:#2e7d32
    style Step4 fill:#fff3e0,stroke:#ef6c00
    style Step5 fill:#ffebee,stroke:#c62828
    style Step6 fill:#e0f2f1,stroke:#00695c
    style Step7 fill:#fce4ec,stroke:#ad1457
```

---

## 7. 공유 마스터 데이터 ERD

```
erDiagram
    APQPProject {
        string id PK
        string name
        string productName
        string customerName
    }
    
    ProcessMaster {
        string id PK
        string apqpId FK
        string no
        string name
        int order
    }
    
    WorkElementMaster {
        string id PK
        string apqpId FK
        string processId FK
        string m4
        string name
    }
    
    SpecialCharacteristic {
        string id PK
        string apqpId FK
        string type
        string symbol
        string name
        string sourceType
    }
    
    ControlPlan {
        string id PK
        string apqpId FK
        string name
        string revision
    }
    
    ProcessFlowDiagram {
        string id PK
        string apqpId FK
        string name
        string revision
    }
    
    WorkStandard {
        string id PK
        string apqpId FK
        string processId FK
        string name
    }
    
    PreventiveMaintenance {
        string id PK
        string apqpId FK
        string equipmentId
        string equipmentName
    }
    
    APQPProject ||--o{ ProcessMaster : has
    APQPProject ||--o{ SpecialCharacteristic : has
    ProcessMaster ||--o{ WorkElementMaster : contains
    APQPProject ||--o{ ControlPlan : generates
    APQPProject ||--o{ ProcessFlowDiagram : generates
    APQPProject ||--o{ WorkStandard : generates
    APQPProject ||--o{ PreventiveMaintenance : generates
```

---

## 8. 데이터 흐름도 (Data Flow)

```
flowchart LR
    subgraph Input[입력]
        I1[사용자 입력]
        I2[Excel Import]
        I3[마스터 데이터]
    end
    
    subgraph Processing[처리]
        P1[원자성 DB 저장]
        P2[FK 연결]
        P3[검증 Validation]
    end
    
    subgraph Storage[저장]
        S1[(localStorage)]
        S2[(IndexedDB)]
    end
    
    subgraph Output[출력]
        O1[워크시트 표시]
        O2[Excel Export]
        O3[보고서 생성]
    end
    
    I1 --> P1
    I2 --> P1
    I3 --> P2
    
    P1 --> P2
    P2 --> P3
    P3 --> S1
    P3 --> S2
    
    S1 --> O1
    S2 --> O1
    S1 --> O2
    S2 --> O3

    style Input fill:#e3f2fd,stroke:#1565c0
    style Processing fill:#fff3e0,stroke:#ef6c00
    style Storage fill:#e8f5e9,stroke:#2e7d32
    style Output fill:#fce4ec,stroke:#ad1457
```

---

## 주의사항

1. **Mermaid Live Editor**: https://mermaid.live/
2. 코드 복사 시 **\`\`\`** 부분은 제외하고 순수 코드만 복사
3. `object` 타입은 `string`으로 변경됨
4. `number` 타입은 `int`로 변경됨 (Mermaid 호환)
5. 관계 정의의 따옴표 제거됨

