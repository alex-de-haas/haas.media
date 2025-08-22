import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TorrentInfo, TorrentState, TorrentFile } from '../../types/torrent';
import { formatSize, formatPercentage } from '../../utils/format';

@Component({
  selector: 'app-torrent-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
      <div class="flex items-start justify-between">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {{ torrent.name }}
            </h3>
          </div>
          <div class="mt-1 flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
            <span>
              {{ formatSize(torrent.downloaded) }} from {{ formatSize(torrent.size) }}
            </span>
            <span>•</span>
            <span>{{ formatPercentage(torrent.progress) }} complete</span>
            <span>•</span>
            <span [class]="isRunning ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'">
              {{ isRunning ? 'Running' : 'Stopped' }}
            </span>
          </div>
        </div>

        <div class="ml-4 flex items-center space-x-2">
          <span
            class="p-1 text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
            [title]="torrent.hash"
            [attr.aria-label]="torrent.hash"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
              />
            </svg>
          </span>

          <a
            *ngIf="torrent.progress >= 100"
            [routerLink]="['/torrent', torrent.hash]"
            class="p-1 text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
            [attr.aria-label]="'View media info for ' + torrent.name"
            title="View media info"
          >
            <span class="sr-only">Media Info</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
              />
            </svg>
          </a>

          <button
            *ngIf="isRunning"
            (click)="onStop()"
            class="p-1 text-orange-600 hover:text-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded"
            [attr.aria-label]="'Stop ' + torrent.name"
            title="Stop torrent"
          >
            <span class="sr-only">Stop</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <rect x="6" y="6" width="12" height="12" rx="1" />
            </svg>
          </button>

          <button
            *ngIf="!isRunning"
            (click)="onStart()"
            class="p-1 text-green-600 hover:text-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 rounded"
            [attr.aria-label]="'Start ' + torrent.name"
            title="Start torrent"
          >
            <span class="sr-only">Start</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M5 3.868a1 1 0 011.52-.853l12 8.132a1 1 0 010 1.706l-12 8.132A1 1 0 015 20.132V3.868z" />
            </svg>
          </button>

          <button
            (click)="onDelete()"
            class="p-1 text-gray-400 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded"
            [attr.aria-label]="'Delete ' + torrent.name"
            title="Delete torrent"
          >
            <span class="sr-only">Delete</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- Progress Bar -->
      <div class="mt-3">
        <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>Progress</span>
          <span>{{ formatPercentage(torrent.progress) }}</span>
        </div>
        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            class="bg-blue-600 h-2 rounded-full transition-all duration-300"
            [style.width.%]="torrent.progress"
          ></div>
        </div>
      </div>

      <!-- Files List -->
      <details class="mt-3">
        <summary class="text-sm text-blue-600 dark:text-blue-400 hover:underline focus:outline-none cursor-pointer">
          Files
        </summary>

        <ul class="mt-2 space-y-1 text-xs text-gray-700 dark:text-gray-300">
          <li
            *ngFor="let file of torrent.files; trackBy: trackByPath"
            class="flex justify-between items-center gap-2"
          >
            <div class="flex-1 min-w-0">
              <span class="truncate block" [title]="file.path">
                {{ file.path }}
              </span>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                {{ formatSize(file.downloaded) }} from {{ formatSize(file.size) }}
              </div>
            </div>
          </li>
        </ul>
      </details>
    </div>
  `,
  styles: []
})
export class TorrentCardComponent {
  @Input() torrent!: TorrentInfo;
  @Output() delete = new EventEmitter<void>();
  @Output() start = new EventEmitter<void>();
  @Output() stop = new EventEmitter<void>();

  get isRunning(): boolean {
    return this.torrent.state === TorrentState.Downloading ||
           this.torrent.state === TorrentState.Seeding;
  }

  formatSize = formatSize;
  formatPercentage = formatPercentage;

  trackByPath(index: number, file: TorrentFile): string {
    return file.path;
  }

  onDelete(): void {
    this.delete.emit();
  }

  onStart(): void {
    this.start.emit();
  }

  onStop(): void {
    this.stop.emit();
  }
}
