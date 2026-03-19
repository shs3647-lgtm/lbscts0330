/**
 * @file Notification Read-All API - Mark all as read
 * @description PUT: 사용자의 모든 알림을 읽음 처리한다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';

/**
 * PUT /api/notifications/read-all
 * 특정 사용자의 모든 미읽음 알림을 읽음 처리한다.
 */
export async function PUT(request: NextRequest) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { recipientId } = body;

    if (!recipientId) {
      return NextResponse.json(
        { success: false, error: 'recipientId is required' },
        { status: 400 }
      );
    }

    const result = await prisma.fmeaNotification.updateMany({
      where: { recipientId, isRead: false },
      data: { isRead: true },
    });

    return NextResponse.json({
      success: true,
      updatedCount: result.count,
    });
  } catch (error: unknown) {
    console.error('[notifications read-all] Error:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}
