---
description: Next.js TypeScript Development Guidelines
applyTo: '**/*.tsx,**/*.ts'
---

# Next.js TypeScript Development Guidelines

## General TypeScript Principles
- Use strict TypeScript configurations
- Prefer type-first development - define interfaces before implementation
- Use `const assertions` and `as const` where appropriate
- Leverage TypeScript's utility types (`Partial`, `Pick`, `Omit`, `Record`, etc.)
- Use discriminated unions for better type safety
- Prefer `unknown` over `any`, avoid `any` unless absolutely necessary

## Next.js Specific Guidelines

### App Router (Next.js 13+)
- Use the App Router (`app/` directory) for new projects
- Follow the file-based routing conventions:
  - `page.tsx` for route pages
  - `layout.tsx` for layouts
  - `loading.tsx` for loading UI
  - `error.tsx` for error boundaries
  - `not-found.tsx` for 404 pages
  - `route.ts` for API routes

### Folders Structure
- app/ — Used for App Router (Next.js 13+).
- features/ — Keeps related logic together (components, hooks, services).
- lib/ — Utilities, configs, constants, and API clients.
- types/ — Shared types/interfaces for TypeScript safety.
- public/ — For static assets served at /.

### Component Structure
- Use functional components with TypeScript
- Define prop interfaces before component implementation
- Use descriptive interface names (e.g., `UserProfileProps`, `NavigationBarProps`)
- Export components as default exports from their files
- Use `NextPage` for page components
- Use `NextPageWithLayout` for pages that require a layout

```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

export default function Button({ variant, size = 'md', disabled, onClick, children }: ButtonProps) {
  // Implementation
}
```

### Server Components vs Client Components
- Default to Server Components unless client-side interactivity is needed
- Use `'use client'` directive only when necessary (state, effects, event handlers)
- Keep client components small and focused
- Pass data down from Server Components to Client Components via props

### Data Fetching
- Use async Server Components for data fetching
- Implement proper error handling with try-catch blocks
- Use TypeScript generics for API response types
- Implement loading and error states

```typescript
interface Post {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

async function getPosts(): Promise<Post[]> {
  const res = await fetch('/api/posts', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch posts');
  return res.json();
}

export default async function PostsPage() {
  try {
    const posts = await getPosts();
    return (
      <div>
        {posts.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    );
  } catch (error) {
    return <div>Error loading posts</div>;
  }
}
```

### API Routes
- Use proper HTTP methods and status codes
- Implement request/response type safety
- Use Zod or similar for request validation
- Handle errors gracefully with proper error responses

```typescript
import { NextRequest, NextResponse } from 'next/server';

interface CreateUserRequest {
  name: string;
  email: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateUserRequest = await request.json();
    // Validate and process request
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### State Management
- Use React's built-in state management for simple cases
- Prefer `useReducer` for complex state logic
- Use Zustand or similar for global state when needed
- Type state and actions properly

```typescript
interface AppState {
  user: User | null;
  theme: 'light' | 'dark';
  isLoading: boolean;
}

type AppAction = 
  | { type: 'SET_USER'; payload: User }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'SET_LOADING'; payload: boolean };

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}
```

### Styling Guidelines
- Use CSS Modules, Tailwind CSS, or styled-components
- Define style props interfaces when creating styled components
- Use CSS custom properties for theming
- Follow BEM methodology for CSS class naming when not using utility frameworks

### Performance Best Practices
- Use `next/dynamic` for code splitting and lazy loading
- Implement proper `next/image` usage with optimization
- Use `next/font` for font optimization
- Implement proper caching strategies
- Use `useMemo` and `useCallback` judiciously

### Error Handling
- Implement error boundaries for component error handling
- Use proper error types and error handling patterns
- Log errors appropriately for debugging
- Provide user-friendly error messages

### Testing Guidelines
- Write unit tests for utility functions and hooks
- Use React Testing Library for component testing
- Mock external dependencies properly
- Use TypeScript in test files for better type safety

### File Organization
- Group related files in feature folders
- Use barrel exports (`index.ts`) for cleaner imports
- Separate business logic into custom hooks or utility functions
- Keep components focused and single-responsibility

### Environment and Configuration
- Use environment variables for configuration
- Type environment variables properly
- Use `next.config.mjs` for Next.js configuration
- Implement proper TypeScript path mapping

### Accessibility
- Use semantic HTML elements
- Implement proper ARIA attributes
- Ensure keyboard navigation works
- Test with screen readers
- Maintain proper color contrast ratios

### Security
- Sanitize user inputs
- Implement proper authentication and authorization
- Use HTTPS in production
- Implement CSRF protection for forms
- Validate all API inputs

## Code Quality
- Use ESLint and Prettier for code formatting
- Implement pre-commit hooks for code quality
- Use meaningful variable and function names
- Write self-documenting code with clear intent
- Add JSDoc comments for complex functions and public APIs