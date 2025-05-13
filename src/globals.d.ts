import { BeforeInstallPromptEvent } from './types';

declare global {
  interface Window {
    deferredPrompt: BeforeInstallPromptEvent | null;
  }
}

export {}; 