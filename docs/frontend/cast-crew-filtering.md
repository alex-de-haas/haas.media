# People Filtering Feature

## Overview

Added people filtering functionality to both Movies and TV Shows list pages using a multi-select component with badges for an enhanced user experience. The filter combines both cast and crew into a unified "Filter by People" interface.

## Components Added

### MultiSelect Component

**File**: `src/Haas.Media.Web/components/ui/multi-select.tsx`

A reusable multi-select component that provides:
- Search/filter functionality
- Badge display for selected items
- Easy removal of selected items (X button on badges)
- Keyboard navigation support
- Clean, accessible UI using shadcn/ui design system

**Key Features**:
- Uses Command component for search functionality
- Displays selected values as removable badges
- Supports custom placeholder and empty message
- Fully typed with TypeScript
- Responsive and accessible

### Dependencies Installed

- `command` - shadcn/ui component for command palette functionality
- `popover` - shadcn/ui component for popover UI
- `cmdk` - NPM package for command menu functionality

## Pages Updated

### Movies List

**File**: `src/Haas.Media.Web/features/media/components/movies-list.tsx`

**Changes**:
1. Added state management for selected people filter
2. Created `peopleOptions` memoized list combining cast and crew from all movies
3. Implemented filtering logic that matches movies containing ALL selected people
4. Added unified filter UI above the movie grid with one multi-select component
5. Updated the title badge to show "X of Y titles" when filters are active
6. Added empty state when no movies match the selected filters

**Filter Behavior**:
- People filter: Shows all unique people (cast and crew) across all movies
- Each person displays their roles (e.g., "Christopher Nolan (Director, Producer, Writer)")
- If a person is only an actor, it shows "Actor" as the role
- Multiple selections work with AND logic (movie must have ALL selected people)
- A person can match as either cast OR crew member

### TV Shows List

**File**: `src/Haas.Media.Web/features/media/components/tvshows-list.tsx`

**Changes**:
1. Added state management for selected people filter
2. Created `peopleOptions` memoized list combining cast and crew from all TV shows
3. Implemented filtering logic that matches TV shows containing ALL selected people
4. Added unified filter UI above the TV shows grid with one multi-select component
5. Updated the title badge to show "X of Y series" when filters are active
6. Added empty state when no TV shows match the selected filters

**Filter Behavior**:
- Same as Movies list, but for TV shows
- Cast and crew data comes from the main TV show metadata (not individual episodes)
- Each person displays all their roles across the show

## UI/UX Features

### Filter Display
- Single, full-width filter control
- Clear label: "Filter by People"
- Inline search within the multi-select
- Selected items displayed as badges with X remove buttons
- People shown with all their roles (e.g., "Christopher Nolan (Director, Producer, Writer)")

### Visual Feedback
- Title count updates dynamically: "5 of 20 titles" when filtering
- Empty state with helpful message when no results match
- Smooth transitions and animations
- Consistent with existing design system

### Performance
- Uses `useMemo` to prevent unnecessary recalculation of options
- Efficient filtering algorithm
- Only re-renders when necessary

## Technical Details

### Type Safety
- Full TypeScript support
- `Option` type exported for reusability: `{ label: string; value: string }`
- Proper typing for all component props and state

### Data Structure
- People options use person ID as value for uniqueness
- Labels formatted as "Name (Role1, Role2, ...)" combining all roles alphabetically
- Options sorted alphabetically by label
- Duplicate people across movies/shows are deduplicated by ID
- When a person appears as both cast and crew, all roles are combined

### Accessibility
- Proper ARIA labels and roles
- Keyboard navigation support
- Focus management
- Screen reader friendly

## Usage Example

```tsx
<MultiSelect
  options={peopleOptions}
  selected={selectedPeople}
  onChange={setSelectedPeople}
  placeholder="Search cast and crew..."
  emptyMessage="No person found."
/>
```

## Future Enhancements

Potential improvements:
1. Add OR logic option (match ANY selected person instead of ALL)
2. Add "Clear all filters" button
3. Save filter preferences to localStorage
4. Add genre filtering
5. Add rating/year range filters
6. Export filter state to URL params for sharing
7. Add filter presets (e.g., "Christopher Nolan Films")

## Testing Recommendations

1. Test with movies/shows that have no cast/crew data
2. Test with large numbers of cast/crew members
3. Test filter combinations
4. Test responsive behavior on mobile
5. Test keyboard navigation and accessibility
6. Test performance with large libraries (100+ movies)
