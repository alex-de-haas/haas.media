import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

declare global {
  interface Window {
    __ENV__?: {
      API_DOWNLOADER_URL?: string;
    };
  }
}

@Injectable({
  providedIn: 'root'
})
export class RuntimeEnvironmentService {
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  get apiDownloaderUrl(): string {
    if (isPlatformBrowser(this.platformId) && window.__ENV__?.API_DOWNLOADER_URL) {
      return window.__ENV__.API_DOWNLOADER_URL;
    }
    // Fallback to localhost for development
    return 'http://localhost:8080';
  }

  get baseApiUrl(): string {
    return this.apiDownloaderUrl;
  }
}
