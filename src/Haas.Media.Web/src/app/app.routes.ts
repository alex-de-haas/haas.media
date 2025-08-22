import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home.component';
import { TorrentPageComponent } from './pages/torrent.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'torrent', component: TorrentPageComponent },
  { path: 'encodings', loadComponent: () => import('./pages/encodings.component').then(c => c.EncodingsComponent) },
  { path: '**', redirectTo: '' }
];
