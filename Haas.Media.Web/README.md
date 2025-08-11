# Haas Media Web

A modern Next.js TypeScript application for managing media downloads and torrents.

## Project Structure

This project follows the recommended Next.js TypeScript development guidelines with a feature-based architecture:

```
Haas.Media.Web/
├── app/                     # Next.js App Router
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout (Server Component)
│   ├── page.tsx            # Homepage
│   └── torrent-upload/     # Torrent upload page
├── components/             # Reusable UI components
│   ├── layout/            # Layout components
│   │   ├── header.tsx     # Header component
│   │   └── client-layout.tsx # Client-side layout wrapper
│   └── ui/                # UI components
│       └── notifications.tsx # Notification system
├── features/              # Feature-specific code
│   └── torrent/          # Torrent management feature
│       ├── components/   # Feature components
│       │   ├── torrent-upload.tsx
│       │   └── torrent-list.tsx
│       └── hooks/        # Feature hooks
│           ├── useTorrents.ts
│           └── useFileUpload.ts
├── lib/                  # Utilities and configurations
│   ├── hooks/           # Shared hooks
│   │   └── useTheme.ts  # Theme management
│   └── utils/           # Utility functions
│       └── format.ts    # Formatting utilities
├── types/               # TypeScript type definitions
│   ├── torrent.ts      # Torrent-related types
│   ├── notifications.ts # Notification types
│   ├── theme.ts        # Theme types
│   └── index.ts        # Type exports
└── public/             # Static assets
```

## Architecture Principles

### TypeScript-First Development
- Strict TypeScript configuration with additional safety checks
- Type definitions organized in dedicated `types/` directory
- Proper interface definitions before implementation
- Use of discriminated unions and utility types

### Component Structure
- **Server Components by default** - Layout components are server-side
- **Client Components** - Only when interactivity is needed (marked with `"use client"`)
- **Proper separation** - Business logic in hooks, presentation in components
- **TypeScript interfaces** - All props properly typed

### Feature-Based Organization
- **Colocation** - Related components, hooks, and logic grouped together
- **Barrel exports** - Clean imports using index files
- **Single responsibility** - Each component has a focused purpose

### State Management
- **React hooks** for local state
- **Custom hooks** for business logic
- **Context** for cross-component state (notifications, theme)

### Code Quality
- **ESLint & Prettier** for consistent formatting
- **Tailwind CSS** utility-first styling
- **Path mapping** for clean imports
- **Proper TypeScript** configurations

## Key Features

### Theme System
- Light/Dark/System theme modes
- Client-side theme persistence
- Smooth theme transitions

### Notification System
- Toast notifications with multiple types
- Auto-dismiss functionality
- Accessible design

### Torrent Management
- File upload with drag-and-drop
- Real-time progress tracking via SignalR
- File validation and error handling

## Development Guidelines

### Component Development
```typescript
// Define interfaces first
interface ComponentProps {
  variant: 'primary' | 'secondary';
  children: React.ReactNode;
}

// Use default exports for components
export default function Component({ variant, children }: ComponentProps) {
  // Implementation
}
```

### Hook Development
```typescript
// Return objects, not arrays for complex state
interface UseFeatureReturn {
  data: DataType[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useFeature(): UseFeatureReturn {
  // Implementation
}
```

### File Organization
- Use barrel exports (`index.ts`) for clean imports
- Group related functionality in feature folders
- Separate concerns: hooks, components, types
- Use descriptive, semantic naming

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Technologies

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety and developer experience
- **Tailwind CSS** - Utility-first CSS framework
- **SignalR** - Real-time communication
- **React Hooks** - State management and side effects
