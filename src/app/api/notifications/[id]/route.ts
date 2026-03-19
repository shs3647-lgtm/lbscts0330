/**
 * @file Notification Delete API - Delete single notification
 * @description DELETE: 단일 알림을 삭제한다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';

/**
 * DELETE /api/notifications/[id]
 * 알림 하나를 삭제한다.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Notification id is required' },
        { status: 400 }
      );
    }

    await prisma.fmeaNotification.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[notifications delete] Error:', error);

    const message = error instanceof Error ? error.message : '';
    if (message.includes('Record to delete does not exist')) {
      return NextResponse.json(
        { success: false, error: 'Notification not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}
