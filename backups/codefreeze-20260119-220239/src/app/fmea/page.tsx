/**
 * @file page.tsx
 * @description Legacy alias route: /fmea -> /pfmea
 *
 * Some users/bookmarks still use /fmea as the entrypoint.
 * We keep it as a server-side redirect to the current PFMEA module.
 */

import { redirect } from 'next/navigation';

export default function FmeaAliasRootPage() {
  redirect('/pfmea');
}


