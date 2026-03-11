/**
 * @file HeroSection.tsx
 * @description 웰컴보드 히어로 배너 컴포넌트
 * @author AI Assistant
 * @created 2026-01-03
 */

'use client';

export default function HeroSection() {
  return (
    <section className="mb-4">
      <div className="bg-[#0e1a33] border border-[#1d2a48] rounded-[14px] shadow-lg overflow-hidden">
        {/* 배너 */}
        <div className="mx-4 my-3 bg-[#1b5e7a] rounded-lg text-white py-4 text-center font-black text-2xl tracking-wide">
          Smart System으로<br/>프리미엄 자동차 시장에 진출하세요 !
        </div>
        
        {/* 설명 */}
        <div className="text-[#a7b6d3] text-base px-4 pb-3">
          VDA-AIAG FMEA 4판 기준 · FMEA · Control Plan · PFD · Work Standard · SPC · MSA — 모듈식 품질 플랫폼
        </div>
      </div>
    </section>
  );
}





