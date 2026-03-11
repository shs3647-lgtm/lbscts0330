/**
 * @file layout.tsx
 * @description FMEA On-Premise 루트 레이아웃
 * @version 1.0.0
 * 
 * ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
 * ★                    UI/UX 코드프리즈 - 2026-01-23                    ★
 * ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
 * 
 * ⛔ 절대 수정 금지 - 앱 출시에 영향
 * 
 * 🚫 금지 사항:
 *   - background-color: #000000 (검은색) 절대 금지
 *   - 어두운 배경색 사용 금지
 *   - 사용자 요청이 있어도 변경 불가
 * 
 * ✅ 필수 유지:
 *   - html/body 배경색: #f5f7fa (밝은 회색)
 *   - min-height: 100vh
 * 
 * ⚠️ 이 파일 수정 시 앱 출시 불가능
 * ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
 */

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ToastContainer from "@/components/ui/ToastContainer";
import { LocaleProvider } from "@/lib/locale";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FMEA On-Premise System",
  description: "FMEA · Control Plan — 온프레미스 품질 플랫폼",
  keywords: ["FMEA", "PFMEA", "DFMEA", "Control Plan", "품질관리"],
  authors: [{ name: "AMP SYSTEM" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
  maximumScale: 1.0,
  minimumScale: 1.0,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        {/* ★★★ UI/UX 코드프리즈 - 배경색 #f5f7fa 필수, #000000 금지 ★★★ */}
        <style dangerouslySetInnerHTML={{
          __html: `
            /* ⛔ 코드프리즈: 검은색(#000000) 절대 금지! 밝은색(#f5f7fa) 필수! */
            html {
              zoom: 1 !important;
              -webkit-text-size-adjust: 100% !important;
              -ms-text-size-adjust: 100% !important;
              transform: scale(1) !important;
              background-color: #f5f7fa !important; /* ⛔ 절대 #000000 금지! */
              min-height: 100vh;
            }
            body {
              zoom: 1 !important;
              transform: scale(1) !important;
              transform-origin: 0 0;
              padding-right: 5px !important;
              background-color: #f5f7fa !important; /* ⛔ 절대 #000000 금지! */
              min-height: 100vh;
            }
            * {
              zoom: 1 !important;
            }
            ::-webkit-scrollbar {
              width: 8px;
              height: 8px;
            }
            ::-webkit-scrollbar-track {
              background: #1d2a48;
            }
            ::-webkit-scrollbar-thumb {
              background: #3b5998;
              border-radius: 4px;
            }
            ::-webkit-scrollbar-thumb:hover {
              background: #5ba9ff;
            }
            /* All 탭 스크롤바 스타일은 globals.css에서 관리 */
          `
        }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LocaleProvider>
          {children}
        </LocaleProvider>
        <ToastContainer />
      </body>
    </html>
  );
}
