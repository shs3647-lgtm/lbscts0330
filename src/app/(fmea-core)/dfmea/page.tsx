/**
 * @file page.tsx
 * @description DFMEA 단일 진입점: /dfmea -> /dfmea/list
 */

import { redirect } from 'next/navigation';

export default function DFMEARootPage() {
  redirect('/dfmea/list');
}
