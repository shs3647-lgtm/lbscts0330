import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // ★★★ 근본 대책: confirm()/alert() 사용 금지 ★★★
  // → useConfirmDialog / toast 사용 필수
  {
    rules: {
      "no-restricted-globals": ["warn",
        { name: "alert", message: "❌ alert() 금지 → import { toast } from '@/hooks/useToast' 사용" },
        { name: "confirm", message: "❌ confirm() 금지 → import { useConfirmDialog } from '@/hooks/useConfirmDialog' 사용" },
      ],
      // ★ 2026-02-20: any 타입 → warn (기존 2,100+ 사용처 일괄 수정 시 기능 파손 위험)
      "@typescript-eslint/no-explicit-any": "warn",
      // ★ 2026-02-20: @ts-nocheck 허용 (레거시 파일 호환)
      "@typescript-eslint/ban-ts-comment": ["warn", {
        "ts-nocheck": "allow-with-description",
        "ts-ignore": true,
        "ts-expect-error": "allow-with-description",
      }],
      // ★ 2026-02-20: React Compiler 규칙 → warn (기존 코드 패턴과 충돌, 기능 무변경)
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/use-memo": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      // ★ 2026-02-20: JSX 내 따옴표 → warn (한글 UI에서 빈번 발생, 기능 무관)
      "react/no-unescaped-entities": "warn",
      // ★ 2026-02-20: module 변수 할당 → warn (테스트/CJS 파일)
      "@next/next/no-assign-module-variable": "warn",
      // ★ 2026-02-20: display-name → warn
      "react/display-name": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
