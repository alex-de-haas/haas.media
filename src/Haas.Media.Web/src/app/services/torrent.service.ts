import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HubConnectionBuilder, HubConnection } from '@microsoft/signalr';
import { TorrentInfo, TorrentActionResponse } from '../types/torrent';
import { RuntimeEnvironmentService } from './runtime-environment.service';

@Injectable({
  providedIn: 'root'
})
export class TorrentService implements OnDestroy {
  private torrentsSubject = new BehaviorSubject<TorrentInfo[]>([]);
  private connection: HubConnection | null = null;

  public torrents$ = this.torrentsSubject.asObservable();

  constructor(private runtimeEnv: RuntimeEnvironmentService) {
    this.initializeConnection();
  }

  ngOnDestroy(): void {
    if (this.connection) {
      this.connection.stop();
    }
  }

  private async initializeConnection(): Promise<void> {
    await this.fetchTorrents();

    const downloaderApi = this.runtimeEnv.apiDownloaderUrl;

    this.connection = new HubConnectionBuilder()
      .withUrl(`${downloaderApi}/hub/torrents`, {
        accessTokenFactory: async () => await this.getValidToken() ?? "",
      })
      .withAutomaticReconnect()
      .build();

    this.connection.on("TorrentUpdated", (info: TorrentInfo) => {
      const currentTorrents = this.torrentsSubject.value;
      const idx = currentTorrents.findIndex((t) => t.hash === info.hash);
      if (idx !== -1) {
        const updated = [...currentTorrents];
        updated[idx] = info;
        this.torrentsSubject.next(updated);
      } else {
        this.torrentsSubject.next([...currentTorrents, info]);
      }
    });

    this.connection.on("TorrentDeleted", (hash: string) => {
      const currentTorrents = this.torrentsSubject.value;
      this.torrentsSubject.next(currentTorrents.filter((t) => t.hash !== hash));
    });

    try {
      await this.connection.start();
    } catch (error) {
      console.error('Failed to start SignalR connection:', error);
    }
  }

  private async fetchTorrents(): Promise<void> {
    try {
      const token = await this.getValidToken();
      const headers = new Headers();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      const response = await fetch(`${this.runtimeEnv.apiDownloaderUrl}/api/torrents`, {
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        this.torrentsSubject.next(data);
      }
    } catch (error) {
      console.error("Failed to fetch torrents:", error);
    }
  }

  async uploadTorrent(file: File): Promise<TorrentActionResponse> {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = await this.getValidToken();
      const headers = new Headers();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      const response = await fetch(`${this.runtimeEnv.apiDownloaderUrl}/api/torrents/upload`, {
        method: "POST",
        body: formData,
        headers,
      });

      if (response.ok) {
        return { success: true, message: "Torrent uploaded successfully!" };
      } else {
        const errorText = await response.text();
        return { success: false, message: errorText || "Upload failed" };
      }
    } catch (error) {
      return { success: false, message: "Network error occurred" };
    }
  }

  async deleteTorrent(hash: string): Promise<TorrentActionResponse> {
    return this.performTorrentAction(hash, 'DELETE', 'delete');
  }

  async startTorrent(hash: string): Promise<TorrentActionResponse> {
    return this.performTorrentAction(hash, 'POST', 'start');
  }

  async stopTorrent(hash: string): Promise<TorrentActionResponse> {
    return this.performTorrentAction(hash, 'POST', 'stop');
  }

  private async performTorrentAction(hash: string, method: string, action: string): Promise<TorrentActionResponse> {
    try {
      const token = await this.getValidToken();
      const headers = new Headers();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      const url = action === 'delete'
        ? `${this.runtimeEnv.apiDownloaderUrl}/api/torrents/${hash}`
        : `${this.runtimeEnv.apiDownloaderUrl}/api/torrents/${hash}/${action}`;

      const response = await fetch(url, {
        method,
        headers,
      });

      if (response.ok) {
        return { success: true, message: `Torrent ${action}ed successfully!` };
      } else {
        const errorText = await response.text();
        return { success: false, message: errorText || `${action} failed` };
      }
    } catch (error) {
      return { success: false, message: "Network error occurred" };
    }
  }

  private async getValidToken(): Promise<string | null> {
    // For now, return null since we don't have Auth0 setup yet
    // TODO: Implement Auth0 token retrieval
    return null;
  }
}
