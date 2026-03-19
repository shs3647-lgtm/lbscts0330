/**
 * @file Notification Read API - Mark single as read
 * @description PUT: 단일 알림을 읽음 처리한다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';

/**
 * PUT /api/notifications/[id]/read
 * 알림 하나를 읽음 처리한다.
 */
export async function PUT(
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

    const notification = await prisma.fmeaNotification.update({
      where: { id },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true, data: notification });
  } catch (error: unknown) {
    console.error('[notifications read] Error:', error);

    const message = error instanceof Error ? error.message : '';
    if (message.includes('Record to update not found')) {
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
