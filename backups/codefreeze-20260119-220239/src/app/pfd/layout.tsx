/**
 * @file layout.tsx
 * @description PFD 모듈 레이아웃 - PFMEA/CP와 동일한 구조
 */

import { Sidebar } from '@/components/layout/Sidebar';
import { StatusBar } from '@/components/layout/StatusBar';

export default function PFDLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f0f0f0]">
      <Sidebar />
      <main className="ml-[50px] min-h-screen pb-6 overflow-x-auto">
        {children}
      </main>
      <StatusBar />
    </div>
  );
}





