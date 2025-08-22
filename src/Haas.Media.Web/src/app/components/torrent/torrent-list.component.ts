import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TorrentInfo } from '../../types/torrent';
import { TorrentCardComponent } from './torrent-card.component';

@Component({
  selector: 'app-torrent-list',
  standalone: true,
  imports: [CommonModule, TorrentCardComponent],
  template: `
    <div class="space-y-4">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
        Active Torrents ({{ torrents.length }})
      </h2>

      <div *ngIf="torrents.length === 0" class="text-center py-12">
        <svg
          class="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
          />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
          No torrents
        </h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Upload a torrent file to get started.
        </p>
      </div>

      <div class="space-y-3">
        <app-torrent-card
          *ngFor="let torrent of torrents; trackBy: trackByHash"
          [torrent]="torrent"
          (delete)="handleDelete(torrent.hash, torrent.name)"
          (start)="handleStart(torrent.hash)"
          (stop)="handleStop(torrent.hash)"
        ></app-torrent-card>
      </div>
    </div>
  `,
  styles: []
})
export class TorrentListComponent {
  @Input() torrents: TorrentInfo[] = [];
  @Output() delete = new EventEmitter<string>();
  @Output() start = new EventEmitter<string>();
  @Output() stop = new EventEmitter<string>();

  trackByHash(index: number, torrent: TorrentInfo): string {
    return torrent.hash;
  }

  handleDelete(hash: string, name: string): void {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      this.delete.emit(hash);
    }
  }

  handleStart(hash: string): void {
    this.start.emit(hash);
  }

  handleStop(hash: string): void {
    this.stop.emit(hash);
  }
}
