'use client';

import React from 'react';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { DialogProvider } from '@/components/ui/DialogProvider';

/** Providers globais de interface (avisos e diálogos). */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <DialogProvider>{children}</DialogProvider>
    </ToastProvider>
  );
}
