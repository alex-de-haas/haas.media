import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export type NotificationType = "success" | "error" | "warning" | "info";

export interface NotificationItem {
  id: string;
  title?: string;
  message: string;
  type?: NotificationType;
  /** milliseconds to auto dismiss. If 0/undefined => default. If -1 => persist */
  timeout?: number;
}

/** Default timeout (ms) */
const DEFAULT_TIMEOUT = 5000;

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private itemsSubject = new BehaviorSubject<NotificationItem[]>([]);
  private timers = new Map<string, any>();

  public items$ = this.itemsSubject.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  notify(notification: Omit<NotificationItem, "id"> & { id?: string }): string {
    const id = notification.id ?? this.generateId();
    const item: NotificationItem = {
      id,
      type: 'info',
      ...notification
    };

    const currentItems = this.itemsSubject.value;
    this.itemsSubject.next([...currentItems, item]);
    this.scheduleRemoval(item);

    return id;
  }

  remove(id: string): void {
    const currentItems = this.itemsSubject.value;
    this.itemsSubject.next(currentItems.filter(item => item.id !== id));

    const timerRef = this.timers.get(id);
    if (timerRef) {
      timerRef.unsubscribe();
      this.timers.delete(id);
    }
  }

  clear(): void {
    // Clear all timers
    this.timers.forEach(timerRef => timerRef.unsubscribe());
    this.timers.clear();

    // Clear all notifications
    this.itemsSubject.next([]);
  }

  private scheduleRemoval(item: NotificationItem): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const timeout = item.timeout == null ? DEFAULT_TIMEOUT : item.timeout;
    if (timeout <= 0) return; // 0 or negative (except -1) treated as persist if -1 else no auto

    const timerRef = timer(timeout).subscribe(() => {
      this.remove(item.id);
    });

    this.timers.set(item.id, timerRef);
  }

  private generateId(): string {
    if (isPlatformBrowser(this.platformId) && 'crypto' in window && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    // Fallback for environments without crypto.randomUUID
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}
