# Client-Side Layout System

This document explains the new client-side layout system implemented for the Haas Media Server.

## Architecture Overview

The layout system is organized into several key components:

### 1. Root Layout (`app/layout.tsx`)
- Server-side component that provides the base HTML structure
- Handles theme initialization and meta tags
- Wraps content with the `ClientLayout` component

### 2. Client Layout (`components/layout/client-layout.tsx`)
- Main client-side layout wrapper
- Provides providers for authentication, notifications, and layout state
- Manages the overall layout structure with sidebar and main content area

### 3. Layout Provider (`components/layout/layout-provider.tsx`)
- Context provider for layout-related state
- Manages sidebar open/close state
- Provides page title and action management
- Exports hooks: `useLayout()`, `usePageTitle()`, and `usePageActions()`

### 4. Sidebar (`components/layout/sidebar.tsx`)
- Responsive navigation sidebar
- Automatically hides on mobile, shows as drawer
- Highlights active navigation items
- Includes main navigation items: Dashboard, Torrents, Encodings, Profile

### 5. Header (`components/layout/header.tsx`)
- Original header component (now used only on mobile)
- Contains branding, user info, and theme toggle

### 6. Footer (`components/layout/footer.tsx`)
- Site footer with branding and links
- Responsive design

## Usage Examples

### Basic Page Structure
```tsx
"use client";

import { usePageTitle } from "@/components/layout";

export default function MyPage() {
  usePageTitle("My Page");

  return (
    <main className="space-y-8 px-4 py-8 sm:px-6 lg:px-10">
      <div>{/* Page content */}</div>
    </main>
  );
}
```

### Using Layout Hooks

#### Setting Page Title Dynamically
```tsx
"use client";

import { usePageTitle } from "@/components/layout";

export default function DynamicPage() {
  const [title, setTitle] = useState("Initial Title");

  usePageTitle(title);

  return <div>{/* Page content */}</div>;
}
```

#### Managing Sidebar State
```tsx
"use client";

import { useLayout } from "@/components/layout";

export default function PageWithSidebarControl() {
  const { sidebarOpen, setSidebarOpen } = useLayout();
  
  return (
    <div>
      <button onClick={() => setSidebarOpen(!sidebarOpen)}>
        Toggle Sidebar
      </button>
    </div>
  );
}
```

## Layout Features

### Responsive Design
- **Desktop (lg+)**: Fixed sidebar (288px width), main content with left padding
- **Mobile (<lg)**: Collapsible drawer sidebar, full-width main content with mobile header

### Navigation
- Automatic active state highlighting based on current route
- Smooth transitions and hover effects
- Mobile-friendly tap targets

### Theme Support
- Full dark mode support
- Theme switching handled by existing theme system
- Consistent color scheme across all components

### Accessibility
- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader friendly
- Focus management for mobile menu

## File Structure
```
components/
  layout/
    ├── index.ts              # Barrel exports
    ├── client-layout.tsx     # Main client layout wrapper
    ├── layout-provider.tsx   # Context and hooks
    ├── sidebar.tsx           # Navigation sidebar
    ├── header.tsx            # Header component
    └── footer.tsx            # Site footer
```

## Best Practices

1. **Sync layout metadata**: Use `usePageTitle()` to keep the sticky header in sync with the current page
2. **Surface important actions**: Push primary page actions to the global header with `usePageActions()`
3. **Follow responsive patterns**: Test layouts on mobile and desktop
4. **Maintain accessibility**: Include proper ARIA labels and keyboard support
5. **Use semantic HTML**: Leverage proper HTML elements for better accessibility

## Migration Guide

### From Old Layout
If you have existing pages with inline headings, update them to set layout metadata and optionally surface quick actions:

```tsx
// Old approach
<div>
  <h1>Page Title</h1>
  <div>Content</div>
</div>

// New approach
"use client";

import { usePageTitle } from "@/components/layout";
import { Separator } from "@/components/ui/separator";

export default function Page() {
  usePageTitle("Page Title");

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Page Title</h1>
        <p className="text-sm text-muted-foreground">Optional description.</p>
      </div>
      <Separator />
      <div>Content</div>
    </div>
  );
}
```

### Adding New Navigation Items
To add new items to the sidebar, edit the `navigationItems` array in `sidebar.tsx`:

```tsx
const navigationItems = [
  // existing items...
  {
    name: "New Feature",
    href: "/new-feature",
    icon: (
      <svg className="h-6 w-6" /* ... */>
        {/* SVG path */}
      </svg>
    ),
  },
];
```

This layout system provides a solid foundation for building consistent, accessible, and responsive pages throughout the application.
