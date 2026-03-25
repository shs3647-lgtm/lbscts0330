'use client';
import { useState, useCallback } from 'react';

interface AlertModalState {
  isOpen: boolean;
  message: string;
  items?: string[];
}

export function useAlertModal() {
  const [alertState, setAlertState] = useState<AlertModalState>({ isOpen: false, message: '' });

  const showAlert = useCallback((message: string, items?: string[]) => {
    setAlertState({ isOpen: true, message, items });
  }, []);

  const closeAlert = useCallback(() => {
    setAlertState({ isOpen: false, message: '' });
  }, []);

  return {
    alertProps: {
      isOpen: alertState.isOpen,
      onClose: closeAlert,
      message: alertState.message,
      items: alertState.items,
    },
    showAlert,
  };
}
