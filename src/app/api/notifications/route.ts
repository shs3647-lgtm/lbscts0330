/**
 * @file Notification API - List & Create
 * @description GET: 사용자 알림 목록 조회, POST: 알림 생성
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';

const VALID_TYPES = [
  'REVISION_PROPAGATED',
  'MASTER_UPDATED',
  'REVIEW_REQUEST',
  'APPROVED',
  'REJECTED',
] as const;

type NotificationType = (typeof VALID_TYPES)[number];

function isValidNotificationType(type: string): type is NotificationType {
  return (VALID_TYPES as readonly string[]).includes(type);
}

/**
 * GET /api/notifications?recipientId=xxx&isRead=true&type=APPROVED&limit=50
 * 사용자의 알림 목록을 조회한다.
 */
export async function GET(request: NextRequest) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const recipientId = searchParams.get('recipientId');

    if (!recipientId) {
      return NextResponse.json(
        { success: false, error: 'recipientId is required' },
        { status: 400 }
      );
    }

    const isReadParam = searchParams.get('isRead');
    const typeParam = searchParams.get('type');
    const limitParam = searchParams.get('limit');
    const limit = Math.min(Math.max(parseInt(limitParam ?? '50', 10) || 50, 1), 200);

    const where: Record<string, unknown> = { recipientId };

    if (isReadParam !== null) {
      where.isRead = isReadParam === 'true';
    }

    if (typeParam && isValidNotificationType(typeParam)) {
      where.type = typeParam;
    }

    const [data, unreadCount] = await Promise.all([
      prisma.fmeaNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.fmeaNotification.count({
        where: { recipientId, isRead: false },
      }),
    ]);

    return NextResponse.json({ success: true, data, unreadCount });
  } catch (error: unknown) {
    console.error('[notifications GET] Error:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications
 * 알림을 생성한다.
 */
export async function POST(request: NextRequest) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { recipientId, recipientName, type, title, message, sourceType, sourceId } = body;

    if (!type || !title || !message) {
      return NextResponse.json(
        { success: false, error: 'type, title, message are required' },
        { status: 400 }
      );
    }

    if (!isValidNotificationType(type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const notification = await prisma.fmeaNotification.create({
      data: {
        recipientId: recipientId ?? null,
        recipientName: recipientName ?? null,
        type,
        title,
        message,
        sourceType: sourceType ?? null,
        sourceId: sourceId ?? null,
      },
    });

    return NextResponse.json({ success: true, data: notification }, { status: 201 });
  } catch (error: unknown) {
    console.error('[notifications POST] Error:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}
