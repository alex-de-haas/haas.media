import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-encodings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mx-auto space-y-10">
      <div class="space-y-2">
        <h1 class="text-2xl font-semibold">Encodings</h1>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Monitor media encoding progress.
        </p>
      </div>

      <div class="text-center py-12">
        <svg
          class="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
          No encodings in progress
        </h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Encodings will appear here when media processing starts.
        </p>
      </div>
    </div>
  `,
  styles: []
})
export class EncodingsComponent {}
