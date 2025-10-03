---
description: Tailwind CSS Instructions for GitHub Copilot
applyTo: "**/*.tsx"
---

# Tailwind CSS Instructions for GitHub Copilot

## General Guidelines

- **Always use Tailwind CSS utility classes** instead of writing custom CSS when possible
- **Prefer utility-first approach** - compose complex components from simple utility classes
- **Use semantic class names** for component wrapper classes when utilities become unwieldy
- **Follow mobile-first responsive design** using responsive prefixes (sm:, md:, lg:, xl:, 2xl:)

## Class Ordering Convention

When writing Tailwind classes, follow this order for better readability:

1. Layout (display, position, float, clear)
2. Box model (width, height, margin, padding)
3. Typography (font, text, leading, tracking)
4. Visual (background, border, shadow, opacity)
5. Interactive (cursor, user-select, pointer-events)
6. Animation and transforms
7. Responsive variants (sm:, md:, lg:, xl:, 2xl:)
8. State variants (hover:, focus:, active:, disabled:)

Example:

```tsx
<div className="flex w-full p-4 text-lg font-semibold bg-white border rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 sm:p-6 md:text-xl">
```

## Component Patterns

### Button Components

```tsx
// Primary button
<button className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">

// Secondary button
<button className="px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2">

// Destructive button
<button className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
```

### Form Elements

```tsx
// Input field
<input className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400" />

// Select dropdown
<select className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">

// Textarea
<textarea className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm resize-vertical focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
```

### Card Components

```tsx
// Basic card
<div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">

// Interactive card
<div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer">
```

## Layout Patterns

### Flexbox Layouts

```tsx
// Center content
<div className="flex items-center justify-center min-h-screen">

// Space between items
<div className="flex items-center justify-between p-4">

// Vertical stack with gap
<div className="flex flex-col gap-4">

// Responsive flex direction
<div className="flex flex-col md:flex-row gap-4">
```

### Grid Layouts

```tsx
// Responsive grid
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

// Auto-fit grid
<div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4">
```

## Responsive Design

### Breakpoint Usage

- `sm:` - 640px and up (small devices)
- `md:` - 768px and up (medium devices)
- `lg:` - 1024px and up (large devices)
- `xl:` - 1280px and up (extra large devices)
- `2xl:` - 1536px and up (2x extra large devices)

### Common Responsive Patterns

```tsx
// Responsive text sizes
<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">

// Responsive padding/margin
<div className="p-4 md:p-6 lg:p-8">

// Responsive grid columns
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Show/hide on different screens
<div className="hidden md:block">Desktop only</div>
<div className="block md:hidden">Mobile only</div>
```

## Color and Theming

### Semantic Color Usage

- Use semantic color names (blue, green, red, gray) rather than specific shades when possible
- For primary brand colors, use blue scale (blue-500, blue-600, etc.)
- For success states, use green scale
- For warning states, use yellow/amber scale
- For error states, use red scale
- For neutral content, use gray scale

### Dark Mode Support

```tsx
// Background colors
<div className="bg-white dark:bg-gray-900">

// Text colors
<p className="text-gray-900 dark:text-gray-100">

// Border colors
<div className="border-gray-200 dark:border-gray-700">
```

## Performance Considerations

- **Avoid arbitrary values** like `w-[127px]` unless absolutely necessary
- **Use design tokens** provided by Tailwind's default theme
- **Prefer shorter class names** when equivalent options exist
- **Group related utilities** logically for better maintainability

## Accessibility

### Focus States

Always include focus states for interactive elements:

```tsx
<button className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">

<a className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:underline">
```

### Screen Reader Support

```tsx
// Use sr-only for screen reader only content
<span className="sr-only">Loading...</span>

// Ensure proper contrast ratios
<text className="text-gray-900"> // Good contrast
<text className="text-gray-400"> // Check contrast ratio
```

## Animation and Transitions

### Common Transitions

```tsx
// Smooth hover transitions
<div className="transition-colors duration-200 hover:bg-gray-100">
<div className="transition-transform duration-300 hover:scale-105">
<div className="transition-shadow duration-200 hover:shadow-lg">

// Loading states
<div className="animate-pulse bg-gray-200 rounded">
<div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full">
```

## Best Practices

1. **Extract component classes** when utility combinations become too long (>10 classes)
2. **Use @apply directive** sparingly and only for component-level abstractions
3. **Prefer composition over extraction** - compose utilities rather than creating custom CSS
4. **Test responsive behavior** at all breakpoints
5. **Validate accessibility** with screen readers and keyboard navigation
6. **Use consistent spacing scale** (4px increments: p-1, p-2, p-4, p-6, p-8, etc.)
7. **Follow the design system** - maintain consistency across components

## Common Mistakes to Avoid

- Don't mix Tailwind utilities with custom CSS properties in the same element
- Don't use `!important` in custom CSS to override Tailwind
- Don't create unnecessary wrapper divs just for styling - use utilities on semantic elements
- Don't ignore responsive design - always consider mobile-first approach
- Don't use arbitrary values when standard utilities exist
- Don't forget to include focus states for accessibility
