/**
 * @file components/RegisterHelpPanel.tsx
 * @description PFMEA 등록화면 도움말 패널 (공용 HelpPanel 래퍼)
 * @module pfmea/register
 * CODEFREEZE
 */

'use client';

import { HelpPanel } from '@/components/help/HelpPanel';
import { PFMEA_REGISTER_SECTIONS, PFMEA_REGISTER_META } from '@/components/help/content/pfmea-register';

export type HelpSection = 'overview' | 'fields' | 'mfp' | 'linkage' | 'cft' | 'workflow';

interface RegisterHelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialSection?: HelpSection;
}

export function RegisterHelpPanel({ isOpen, onClose, initialSection }: RegisterHelpPanelProps) {
  return (
    <HelpPanel
      isOpen={isOpen}
      onClose={onClose}
      sections={PFMEA_REGISTER_SECTIONS}
      meta={PFMEA_REGISTER_META}
      initialSection={initialSection}
    />
  );
}

export default RegisterHelpPanel;
