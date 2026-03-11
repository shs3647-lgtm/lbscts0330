/**
 * @file page.tsx
 * @description PFMEA 단일 진입점: /pfmea → /pfmea/list
 */

import { redirect } from 'next/navigation';

export default function PFMEARootPage() {
  redirect('/pfmea/list');
}



