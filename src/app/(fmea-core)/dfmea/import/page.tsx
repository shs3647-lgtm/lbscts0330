/**
 * @file dfmea/import/page.tsx
 * @description DFMEA Import — PFMEA Import 페이지 공유
 * DFMEA 엑셀은 position-parser가 DFMEA 헤더(초점요소/부품/설계파라미터/Type)를 자동 감지
 */
import { redirect } from 'next/navigation';

export default function DFMEAImportPage() {
  redirect('/pfmea/import');
}
