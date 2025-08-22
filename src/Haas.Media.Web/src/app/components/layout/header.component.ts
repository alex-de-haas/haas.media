import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ThemeService, ThemeMode } from '../../services/theme.service';

interface User {
  name?: string;
  email?: string;
  picture?: string;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-16 items-center justify-between">
          <!-- Brand -->
          <a
            routerLink="/"
            class="flex items-center gap-2 text-blue-700 hover:text-blue-800 dark:text-blue-400 hover:dark:text-blue-300 transition-colors"
            aria-label="Go to Haas Media Server home"
          >
            <svg
              class="h-8 w-8"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                stroke-width="2"
              />
              <path d="M10 8l6 4-6 4V8z" fill="currentColor" />
            </svg>
            <span class="text-xl font-semibold">Haas Media Server</span>
          </a>

          <!-- Actions -->
          <div class="flex items-center gap-4">
            <div>
              <div
                class="inline-flex shadow-sm border border-gray-300 dark:border-gray-600 overflow-hidden"
                role="group"
                aria-label="Theme switch"
              >
                <button
                  type="button"
                  (click)="setTheme('light')"
                  [class]="getThemeButtonClass('light')"
                >
                  Light
                </button>
                <button
                  type="button"
                  (click)="setTheme('dark')"
                  [class]="getThemeButtonClass('dark')"
                >
                  Dark
                </button>
                <button
                  type="button"
                  (click)="setTheme('system')"
                  [class]="getThemeButtonClass('system')"
                >
                  System
                </button>
              </div>
            </div>
            <div *ngIf="user; else loginButton" class="flex items-center gap-3">
              <img
                *ngIf="user.picture"
                [src]="user.picture"
                [alt]="user.name || user.email || 'User avatar'"
                class="w-8 h-8 border border-gray-300 dark:border-gray-700"
              />
              <div class="flex flex-col text-sm text-gray-700 dark:text-gray-200">
                <span class="font-medium">{{ user.name }}</span>
                <span *ngIf="user.email" class="text-xs text-gray-500 dark:text-gray-400">
                  {{ user.email }}
                </span>
              </div>
              <a
                href="/api/auth/logout"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                Logout
              </a>
            </div>
            <ng-template #loginButton>
              <a
                href="/api/auth/login"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                Login
              </a>
            </ng-template>
          </div>
        </div>
      </div>

      <!-- Secondary bar -->
      <div class="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div class="flex h-12 items-center gap-6">
            <a
              routerLink="/torrent"
              class="block px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-300"
            >
              Torrents
            </a>
            <a
              routerLink="/encodings"
              class="block px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-300"
            >
              Encodings
            </a>
          </div>
        </div>
      </div>
    </header>
  `,
  styles: []
})
export class HeaderComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  currentTheme: ThemeMode = 'system';
  user: User | null = null;

  constructor(private themeService: ThemeService) {}

  ngOnInit(): void {
    this.themeService.theme$
      .pipe(takeUntil(this.destroy$))
      .subscribe(theme => {
        this.currentTheme = theme;
      });

    this.loadUser();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setTheme(mode: ThemeMode): void {
    this.themeService.setTheme(mode);
  }

  getThemeButtonClass(mode: ThemeMode): string {
    const baseClass = "px-3 py-2 text-sm font-medium ";
    const activeClass = "bg-blue-600 text-white";
    const inactiveClass = "bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700";
    const borderClass = mode !== 'system' ? " border-r border-gray-300 dark:border-gray-600" : "";

    return baseClass + (this.currentTheme === mode ? activeClass : inactiveClass) + borderClass;
  }

  private async loadUser(): Promise<void> {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        this.user = data || null;
      }
    } catch (error) {
      console.error('Failed to load user:', error);
    }
  }
}
