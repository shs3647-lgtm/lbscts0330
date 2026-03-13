import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // ★ 대용량 패키지 로딩 최적화 (성능 향상)
  experimental: {
    optimizePackageImports: [
      'lucide-react', 'recharts', 'date-fns',
      '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select', '@radix-ui/react-tabs',
      'chart.js', 'react-chartjs-2', 'chartjs-plugin-datalabels',
      'exceljs', 'xlsx', 'xlsx-js-style',
      'jspdf', 'html2canvas-pro', 'react-pdf',
      '@tanstack/react-query', '@tanstack/react-virtual',
    ],
  },

  // ★ Next.js 개발 인디케이터 (N 로고) 비활성화
  devIndicators: false,

  // Docker 배포를 위한 standalone 모드 활성화
  output: 'standalone',

  // 이미지 최적화 설정
  images: {
    unoptimized: true, // Docker 환경에서는 이미지 최적화 비활성화
  },

  // Turbopack 설정 (빈 객체로 설정하여 Turbopack 사용)
  turbopack: {},

  // ★ 프로덕션 빌드에서 console.* 자동 제거 (성능 + 보안)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error'] } : false,
  },

  // TypeScript 및 ESLint 체크 스킵 (빌드 속도 향상)
  typescript: {
    ignoreBuildErrors: true,
  },
  // 환경 변수
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4000',
  },

  // ★ 온프레미스 보안 헤더 (OWASP 권장)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
