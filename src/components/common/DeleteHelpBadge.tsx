/**
 * @file DeleteHelpBadge.tsx
 * @description 삭제 도움말 배지 — 모든 리스트 페이지에 표준 적용
 *
 * HelpIcon 컴포넌트를 사용하여 삭제 관련 도움말을 표시.
 * FMEA/CP/PFD/WS/PM/APQP 리스트 페이지 공통.
 *
 * @usage
 * import DeleteHelpBadge from '@/components/common/DeleteHelpBadge';
 * <DeleteHelpBadge />
 *
 * @version 1.0.0
 * @created 2026-02-16
 */

'use client';

import React from 'react';
import HelpIcon from './HelpIcon';

interface DeleteHelpBadgeProps {
  /** 아이콘 크기 (기본 28) */
  size?: number;
}

export default function DeleteHelpBadge({ size = 28 }: DeleteHelpBadgeProps) {
  return (
    <HelpIcon size={size} title="삭제 도움말" popoverWidth={420}>
      <table style={{ fontSize: 11, borderCollapse: 'collapse', width: '100%' }}>
        <tbody>
          <tr>
            <td style={{ paddingRight: 8, paddingTop: 2, paddingBottom: 2, fontWeight: 700, color: '#2563eb', whiteSpace: 'nowrap', verticalAlign: 'top' }}>FMEA</td>
            <td style={{ paddingTop: 2, paddingBottom: 2 }}>항상 삭제 (필수). 연동 모듈은 개별 선택 가능.</td>
          </tr>
          <tr>
            <td style={{ paddingRight: 8, paddingTop: 2, paddingBottom: 2, fontWeight: 700, color: '#059669', whiteSpace: 'nowrap', verticalAlign: 'top' }}>CP</td>
            <td style={{ paddingTop: 2, paddingBottom: 2 }}>관리계획서. FMEA 삭제 시 체크하면 함께 삭제.</td>
          </tr>
          <tr>
            <td style={{ paddingRight: 8, paddingTop: 2, paddingBottom: 2, fontWeight: 700, color: '#7c3aed', whiteSpace: 'nowrap', verticalAlign: 'top' }}>PFD</td>
            <td style={{ paddingTop: 2, paddingBottom: 2 }}>공정흐름도. FMEA 삭제 시 체크하면 함께 삭제.</td>
          </tr>
          <tr>
            <td style={{ paddingRight: 8, paddingTop: 2, paddingBottom: 2, fontWeight: 700, color: '#dc2626', whiteSpace: 'nowrap', verticalAlign: 'top' }}>DFMEA / PFMEA</td>
            <td style={{ paddingTop: 2, paddingBottom: 2 }}>연동된 상대편 FMEA. 체크 시 함께 삭제.</td>
          </tr>
          <tr>
            <td style={{ paddingRight: 8, paddingTop: 2, paddingBottom: 2, fontWeight: 700, color: '#d97706', whiteSpace: 'nowrap', verticalAlign: 'top' }}>WS</td>
            <td style={{ paddingTop: 2, paddingBottom: 2 }}>작업표준서. FMEA 삭제 시 체크하면 함께 삭제.</td>
          </tr>
          <tr>
            <td style={{ paddingRight: 8, paddingTop: 2, paddingBottom: 2, fontWeight: 700, color: '#0891b2', whiteSpace: 'nowrap', verticalAlign: 'top' }}>PM</td>
            <td style={{ paddingTop: 2, paddingBottom: 2 }}>예방보전. FMEA 삭제 시 체크하면 함께 삭제.</td>
          </tr>
        </tbody>
      </table>
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: 3, fontSize: 10 }}>
        <span style={{ color: '#dc2626' }}>⛔ 승인 완료 모듈은 삭제할 수 없습니다.</span>
        <span style={{ color: '#6b7280' }}>🔒 APQP는 부모 모듈 — 하위에서 삭제 불가. APQP 리스트에서 삭제하세요.</span>
        <span style={{ color: '#059669' }}>♻️ 삭제된 항목은 휴지통에서 복원할 수 있습니다.</span>
      </div>
    </HelpIcon>
  );
}
