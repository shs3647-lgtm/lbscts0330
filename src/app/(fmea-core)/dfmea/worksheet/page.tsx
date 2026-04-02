/**
 * @file dfmea/worksheet/page.tsx
 * @description DFMEA 워크시트 — PFMEA 워크시트 공유 (fmeaId 기반으로 자동 구분)
 */
import { redirect } from 'next/navigation';

export default function DFMEAWorksheetPage() {
  redirect('/pfmea/worksheet');
}
