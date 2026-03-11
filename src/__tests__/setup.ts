/**
 * @file setup.ts
 * @description Vitest 테스트 설정 파일
 */

import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// QueryClient 모킹
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
  QueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Next.js Request/Response 모킹
vi.mock('next/server', () => ({
  NextRequest: vi.fn(),
  NextResponse: {
    json: vi.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
    })),
  },
}));

// 전역 fetch 모킹 설정
global.fetch = vi.fn();

// 콘솔 에러 억제 (테스트 중 노이즈 방지)
const originalConsoleError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning:') || args[0].includes('Error:'))
  ) {
    return;
  }
  originalConsoleError(...args);
};
