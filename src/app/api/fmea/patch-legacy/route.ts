// @deprecated — Legacy data no longer used as SSoT (2026-03-20)
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  return NextResponse.json(
    { error: 'Legacy data API deprecated' },
    { status: 410 }
  );
}
