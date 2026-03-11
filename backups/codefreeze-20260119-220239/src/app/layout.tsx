/**
 * @file layout.tsx
 * @description FMEA On-Premise 루트 레이아웃
 * @version 1.0.0
 */

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
        <style dangerouslySetInnerHTML={{
          __html: `
            html {
              zoom: 1 !important;
              -webkit-text-size-adjust: 100% !important;
              -ms-text-size-adjust: 100% !important;
              transform: scale(1) !important;
              background-color: #000000 !important;
            }
            body {
              zoom: 1 !important;
              transform: scale(1) !important;
              transform-origin: 0 0;
              padding-right: 5px !important;
              background-color: #f5f7fa !important;
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
        {children}
      </body>
    </html>
  );
}
