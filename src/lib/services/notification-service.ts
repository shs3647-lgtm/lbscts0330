/**
 * @file notification-service.ts
 * @description 알림 서비스 레이어 - 다른 API에서 알림 생성 시 사용
 *
 * 비유: 사내 메신저 시스템. 각 부서(Family FMEA, Part FMEA 등)에서
 * 중요한 이벤트가 발생하면 관련 담당자에게 자동으로 알림을 보낸다.
 */

import { getPrisma } from '@/lib/prisma';

const VALID_TYPES = [
  'REVISION_PROPAGATED',
  'MASTER_UPDATED',
  'REVIEW_REQUEST',
  'APPROVED',
  'REJECTED',
] as const;

type NotificationType = (typeof VALID_TYPES)[number];

interface CreateNotificationInput {
  recipientId?: string;
  recipientName?: string;
  type: NotificationType;
  title: string;
  message: string;
  sourceType?: string;
  sourceId?: string;
}

/**
 * 알림을 생성한다.
 * 다른 API route나 서비스에서 호출하여 알림을 발송한다.
 */
export async function createNotification(data: CreateNotificationInput): Promise<void> {
  const prisma = getPrisma();
  if (!prisma) {
    console.error('[notification-service] Database not configured, skipping notification');
    return;
  }

  try {
    await prisma.fmeaNotification.create({
      data: {
        recipientId: data.recipientId ?? null,
        recipientName: data.recipientName ?? null,
        type: data.type,
        title: data.title,
        message: data.message,
        sourceType: data.sourceType ?? null,
        sourceId: data.sourceId ?? null,
      },
    });
  } catch (error: unknown) {
    console.error('[notification-service] Failed to create notification:', error);
  }
}

/**
 * 리뷰 요청 알림을 보낸다.
 *
 * FMEA 작성자가 리뷰어에게 검토를 요청할 때 호출된다.
 */
export async function notifyReviewRequest(params: {
  targetType: 'FAMILY_FMEA' | 'PART_FMEA';
  targetId: string;
  targetCode: string;
  reviewerName: string;
  authorName: string;
}): Promise<void> {
  const typeLabel = params.targetType === 'FAMILY_FMEA' ? 'Family FMEA' : 'Part FMEA';

  await createNotification({
    recipientName: params.reviewerName,
    type: 'REVIEW_REQUEST',
    title: `${typeLabel} 리뷰 요청: ${params.targetCode}`,
    message: `${params.authorName}님이 ${typeLabel} "${params.targetCode}" (${params.targetId})의 리뷰를 요청했습니다.`,
    sourceType: params.targetType,
    sourceId: params.targetId,
  });
}

/**
 * 상태 변경 알림을 보낸다.
 *
 * FMEA 상태(초안→검토중→승인 등)가 변경될 때 관련자에게 알림을 전달한다.
 */
export async function notifyStatusChange(params: {
  targetType: 'FAMILY_FMEA' | 'PART_FMEA';
  targetId: string;
  targetCode: string;
  newStatus: string;
  recipientName: string;
  changedBy: string;
}): Promise<void> {
  const typeLabel = params.targetType === 'FAMILY_FMEA' ? 'Family FMEA' : 'Part FMEA';
  const statusMap: Record<string, string> = {
    DRAFT: '초안',
    IN_REVIEW: '검토중',
    APPROVED: '승인',
    REJECTED: '반려',
    REVISION: '개정중',
  };
  const statusLabel = statusMap[params.newStatus] ?? params.newStatus;

  const typeForNotification =
    params.newStatus === 'APPROVED'
      ? 'APPROVED'
      : params.newStatus === 'REJECTED'
        ? 'REJECTED'
        : 'MASTER_UPDATED';

  await createNotification({
    recipientName: params.recipientName,
    type: typeForNotification as NotificationType,
    title: `${typeLabel} 상태 변경: ${params.targetCode}`,
    message: `${params.changedBy}님이 ${typeLabel} "${params.targetCode}"의 상태를 "${statusLabel}"(으)로 변경했습니다.`,
    sourceType: params.targetType,
    sourceId: params.targetId,
  });
}
