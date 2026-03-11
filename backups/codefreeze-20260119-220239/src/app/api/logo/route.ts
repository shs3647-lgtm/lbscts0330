/**
 * @file route.ts
 * @description 로고 저장/조회 API
 * @author AI Assistant
 * @created 2026-01-10
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const LOGO_PATH = path.join(process.cwd(), 'public', 'logo.png');

// GET: 저장된 로고 확인
export async function GET() {
  try {
    await fs.access(LOGO_PATH);
    return NextResponse.json({ exists: true, path: '/logo.png' });
  } catch {
    return NextResponse.json({ exists: false });
  }
}

// POST: Base64 로고를 파일로 저장
export async function POST(req: NextRequest) {
  try {
    const { logoBase64 } = await req.json();
    
    if (!logoBase64 || !logoBase64.startsWith('data:image')) {
      return NextResponse.json({ success: false, error: 'Invalid image data' }, { status: 400 });
    }
    
    // Base64 데이터에서 실제 이미지 데이터 추출
    const base64Data = logoBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // public/logo.png로 저장
    await fs.writeFile(LOGO_PATH, imageBuffer);
    
    console.log('✅ 로고가 서버에 저장되었습니다:', LOGO_PATH);
    
    return NextResponse.json({ 
      success: true, 
      message: '로고가 서버에 저장되었습니다',
      path: '/logo.png' 
    });
  } catch (error) {
    console.error('로고 저장 실패:', error);
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
}

// DELETE: 로고 삭제 (기본 SVG로 복원)
export async function DELETE() {
  try {
    await fs.unlink(LOGO_PATH);
    return NextResponse.json({ success: true, message: '로고가 삭제되었습니다' });
  } catch {
    return NextResponse.json({ success: true, message: '삭제할 로고가 없습니다' });
  }
}











