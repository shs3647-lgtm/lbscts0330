/**
 * @file page.tsx
 * @description Legacy alias route: /fmea/import -> /pfmea/import (preserve query params)
 */

import { redirect } from 'next/navigation';

type SearchParams = Record<string, string | string[] | undefined>;

function toQueryString(sp: SearchParams | undefined): string {
  if (!sp) return '';
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === 'string' && v.length > 0) params.set(k, v);
    else if (Array.isArray(v)) v.forEach(val => val && params.append(k, val));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export default function FmeaImportAliasPage({ searchParams }: { searchParams?: SearchParams }) {
  redirect(`/pfmea/import${toQueryString(searchParams)}`);
}


