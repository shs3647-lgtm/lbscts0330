/**
 * @file QuickLinksSection.tsx
 * @description 바로가기 메뉴 컴포넌트
 * @author AI Assistant
 * @created 2026-01-03
 */

'use client';

import Link from 'next/link';
import { QuickLinkItem } from '../types';

interface QuickLinksSectionProps {
  links: QuickLinkItem[];
}

export default function QuickLinksSection({ links }: QuickLinksSectionProps) {
  return (
    <section className="mb-4">
      <h2 className="text-white font-black text-lg mb-2">바로가기</h2>
      <div className="flex justify-between gap-2">
        {links.map((link) => (
          <Link
            key={link.id}
            href={link.href}
            className="flex-1 bg-[#0e1a33] border border-[#1d2a48] rounded-lg px-3 py-2 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#162a56] shadow-md text-center"
          >
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-white font-bold text-sm">{link.title}</span>
              {link.badge && (
                <span className="px-1.5 py-0.5 rounded text-[10px] text-white bg-gradient-to-r from-[#5ba9ff] to-[#88c0ff]">
                  {link.badge}
                </span>
              )}
            </div>
            <p className="text-[#a7b6d3] text-[10px] mt-0.5">{link.desc}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}





