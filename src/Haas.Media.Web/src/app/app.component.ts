import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/layout/header.component';
import { NotificationsComponent } from './components/notifications.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, NotificationsComponent],
  template: `
    <div class="min-h-screen bg-white text-gray-900 antialiased transition-colors duration-0 dark:bg-gray-950 dark:text-gray-100">
      <app-header></app-header>
      <main class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <router-outlet></router-outlet>
      </main>
      <app-notifications></app-notifications>
    </div>
  `,
  styles: []
})
export class AppComponent {
  title = 'Haas Media Server';
}
