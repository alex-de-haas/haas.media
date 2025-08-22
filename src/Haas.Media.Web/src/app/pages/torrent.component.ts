import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TorrentService } from '../services/torrent.service';
import { NotificationService } from '../services/notification.service';
import { TorrentInfo, TorrentActionResponse } from '../types/torrent';
import { TorrentUploadComponent } from '../components/torrent/torrent-upload.component';
import { TorrentListComponent } from '../components/torrent/torrent-list.component';

@Component({
  selector: 'app-torrent-page',
  standalone: true,
  imports: [CommonModule, TorrentUploadComponent, TorrentListComponent],
  template: `
    <div class="mx-auto space-y-10">
      <div class="space-y-2">
        <h1 class="text-2xl font-semibold">Torrents</h1>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Upload new torrent files and monitor their progress.
        </p>
      </div>

      <app-torrent-upload
        [isUploading]="isUploading"
        (upload)="handleUpload($event)">
      </app-torrent-upload>

      <app-torrent-list
        [torrents]="torrents"
        (delete)="handleDelete($event)"
        (start)="handleStart($event)"
        (stop)="handleStop($event)">
      </app-torrent-list>
    </div>
  `,
  styles: []
})
export class TorrentPageComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  torrents: TorrentInfo[] = [];
  isUploading = false;

  constructor(
    private torrentService: TorrentService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.torrentService.torrents$
      .pipe(takeUntil(this.destroy$))
      .subscribe((torrents: TorrentInfo[]) => {
        this.torrents = torrents;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async handleUpload(file: File): Promise<void> {
    this.isUploading = true;
    try {
      const result = await this.torrentService.uploadTorrent(file);
      this.reportResult(result, { success: "Upload Success", fail: "Upload Failed" });
    } finally {
      this.isUploading = false;
    }
  }

  async handleDelete(hash: string): Promise<void> {
    const result = await this.torrentService.deleteTorrent(hash);
    this.reportResult(result, { success: "Delete Success", fail: "Delete Failed" });
  }

  async handleStart(hash: string): Promise<void> {
    const result = await this.torrentService.startTorrent(hash);
    this.reportResult(result, { success: "Torrent Started", fail: "Start Failed" });
  }

  async handleStop(hash: string): Promise<void> {
    const result = await this.torrentService.stopTorrent(hash);
    this.reportResult(result, { success: "Torrent Stopped", fail: "Stop Failed" }, "info");
  }

  private reportResult(
    result: TorrentActionResponse,
    labels: { success: string; fail: string },
    typeOverride?: string
  ): void {
    this.notificationService.notify({
      title: result.success ? labels.success : labels.fail,
      message: result.message,
      type: (result.success ? (typeOverride || "success") : "error") as any,
    });
  }
}
