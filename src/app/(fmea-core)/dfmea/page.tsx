/**
 * @file page.tsx
 * @description PFMEA 단일 진입점: /pfmea → /dfmea/list
 */

import { redirect } from 'next/navigation';

export default function DFMEARootPage() {
  redirect('/dfmea/list');
}



