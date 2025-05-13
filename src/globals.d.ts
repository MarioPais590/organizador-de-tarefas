import { BeforeInstallPromptEvent } from './types';

declare global {
  interface Window {
    deferredPrompt: any;
  }
}

export {}; 