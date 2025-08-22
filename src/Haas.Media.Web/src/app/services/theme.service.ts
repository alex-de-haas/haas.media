import { Injectable } from '@angular/core';
import { BehaviorSubject, fromEvent, Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

export type ThemeMode = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly STORAGE_KEY = 'theme';
  private themeSubject = new BehaviorSubject<ThemeMode>(this.getStoredTheme());

  public theme$ = this.themeSubject.asObservable();

  public resolvedTheme$: Observable<'light' | 'dark'> = this.theme$.pipe(
    map(theme => this.resolveTheme(theme))
  );

  constructor() {
    // Listen for system theme changes
    if (typeof window !== 'undefined') {
      fromEvent(window.matchMedia('(prefers-color-scheme: dark)'), 'change')
        .pipe(startWith(null))
        .subscribe(() => {
          if (this.themeSubject.value === 'system') {
            this.applyTheme(this.resolveTheme('system'));
          }
        });

      // Apply initial theme
      this.applyTheme(this.resolveTheme(this.themeSubject.value));
    }
  }

  setTheme(mode: ThemeMode): void {
    this.themeSubject.next(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, mode);
      this.applyTheme(this.resolveTheme(mode));
    }
  }

  getCurrentTheme(): ThemeMode {
    return this.themeSubject.value;
  }

  private getStoredTheme(): ThemeMode {
    if (typeof window === 'undefined') return 'system';
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
    return 'system';
  }

  private resolveTheme(theme: ThemeMode): 'light' | 'dark' {
    if (theme !== 'system') return theme;
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private applyTheme(resolvedTheme: 'light' | 'dark'): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
    root.style.colorScheme = resolvedTheme;
  }
}
