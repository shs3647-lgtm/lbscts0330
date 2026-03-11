# 🚨 빌드 오류 - Import 경로 최적화 필요

**작성일**: 2026-02-02  
**작성자**: AI Assistant  
**상태**: 🔴 긴급

---

## ⚠️ 요청 사항 (다른 개발자에게)

**WS (Work Standard)와 PM (설비보전) 페이지를 제대로 개발해서 푸쉬해 주세요!**

현재 이 두 페이지는 임시 placeholder 상태이며, 실제 기능이 구현되지 않았습니다.

---

## 문제 요약

WS (Work Standard) 및 PM (Project Manager) 페이지에서 `@/packages/` 경로로 import하는 모듈들이 존재하지 않아 빌드 오류가 발생합니다.

---

## 오류 메시지

```
Module not found: Can't resolve '@/packages/constants/menu-structure'
Module not found: Can't resolve '@/packages/modules/common/FeatureShell'
Module not found: Can't resolve '@/packages/project'
Module not found: Can't resolve '@/packages/utils/handsontable-warning-suppress'
Module not found: Can't resolve '@/packages/types/WS'
Module not found: Can't resolve '@/packages/core/ws-handsontable-config'
Module not found: Can't resolve '@/packages/hooks/useCurrentProject'
Module not found: Can't resolve '@/packages/ui/layout/StandardLayout'
Module not found: Can't resolve '@/packages/modals/MasterDataModal'
Module not found: Can't resolve '@/packages/modals/WsInspectionModal'
```

---

## 영향받는 파일

| 파일 | 현재 상태 |
|------|----------|
| `src/app/ws/page.tsx` | ⚠️ 임시 placeholder로 대체됨 |
| `src/app/pm/page.tsx` | ⚠️ 임시 placeholder로 대체됨 |

---

## 존재하지 않는 모듈 목록

다음 모듈들이 `src/` 폴더에 존재하지 않습니다:

1. `constants/menu-structure`
2. `modules/common/FeatureShell`
3. `project` (index export)
4. `utils/handsontable-warning-suppress`
5. `types/WS`
6. `core/ws-handsontable-config`
7. `hooks/useCurrentProject`
8. `ui/layout/StandardLayout`
9. `modals/MasterDataModal`
10. `modals/WsInspectionModal`

---

## 해결 방안

### 옵션 1: 누락된 모듈 생성
각 모듈을 `src/` 폴더에 생성합니다.

### 옵션 2: Import 경로 수정
실제 존재하는 파일 경로로 import 문을 수정합니다.

### 옵션 3: 페이지 재설계
WS/PM 페이지를 기존 PFMEA 페이지 패턴에 맞게 재설계합니다.

---

## 참고: tsconfig.json 경로 설정

현재 `tsconfig.json`에 다음 경로 alias가 설정되어 있습니다:

```json
"paths": {
  "@/*": ["./src/*"],
  "@/packages/*": ["./src/*"]
}
```

이로 인해 `@/packages/constants/menu-structure`는 `./src/constants/menu-structure`로 매핑됩니다.

---

## 임시 조치

빌드 오류를 방지하기 위해 WS와 PM 페이지를 간단한 placeholder로 대체했습니다.

```typescript
// 현재 placeholder 상태
export default function WSPage() {
  return (
    <div>🛠️ Work Standard (WS) - 개발 진행 중입니다...</div>
  );
}
```

---

## 요청 사항

1. **누락된 모듈 위치 확인**: 위 모듈들이 다른 브랜치나 위치에 있는지 확인 필요
2. **정확한 import 경로 제공**: 실제 파일 위치에 맞는 import 경로 정보 필요
3. **WS/PM 페이지 개발 우선순위 결정**: 현재 데모에 포함되어야 하는지 확인

---

**문의**: 이 이슈 관련하여 추가 정보가 필요하면 알려주세요.
