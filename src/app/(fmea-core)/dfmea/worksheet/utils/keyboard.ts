import type React from 'react';

export function handleEnterBlur(e: React.KeyboardEvent<HTMLElement>): void {
  if (e.key !== 'Enter') return;

  const target = e.target as HTMLElement;
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    e.preventDefault();
    target.blur();
  }
}

