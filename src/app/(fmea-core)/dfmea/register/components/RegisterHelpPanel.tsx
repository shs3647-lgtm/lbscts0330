/**
 * @file components/RegisterHelpPanel.tsx
 * @description DFMEA 등록화면 도움말 패널 (공용 HelpPanel 래퍼)
 * @module pfmea/register
 * CODEFREEZE
 */

'use client';

import { HelpPanel } from '@/components/help/HelpPanel';
import { DFMEA_REGISTER_SECTIONS, DFMEA_REGISTER_META } from '@/components/help/content/dfmea-register';

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
      sections={DFMEA_REGISTER_SECTIONS}
      meta={DFMEA_REGISTER_META}
      initialSection={initialSection}
    />
  );
}

export default RegisterHelpPanel;
