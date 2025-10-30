# Internationalization (i18n) with next-intl

The Haas Media frontend now supports multiple languages using [next-intl](https://next-intl-docs.vercel.app/).

## Supported Languages

- **English (en)** - Default
- **Dutch (nl)** - Nederlands
- **German (de)** - Deutsch
- **Spanish (es)** - Español
- **French (fr)** - Français
- **Japanese (ja)** - 日本語
- **Chinese (zh)** - 中文

## Architecture

### Directory Structure

```
src/Haas.Media.Web/
├── app/
│   ├── [locale]/          # All routes are nested under locale
│   │   ├── layout.tsx     # Locale-specific layout with ClientLayout
│   │   ├── page.tsx       # Home page
│   │   ├── settings/
│   │   ├── movies/
│   │   └── ...
│   └── layout.tsx         # Root layout with NextIntlClientProvider
├── i18n/
│   ├── routing.ts         # Locale configuration and navigation helpers
│   └── request.ts         # Server-side locale detection
├── messages/
│   ├── en.json
│   ├── nl.json
│   ├── de.json
│   ├── es.json
│   ├── fr.json
│   ├── ja.json
│   └── zh.json
└── middleware.ts          # Locale routing middleware
```

### Key Components

1. **`i18n/routing.ts`** - Defines available locales and creates navigation helpers
2. **`i18n/request.ts`** - Handles server-side message loading
3. **`middleware.ts`** - Intercepts requests to add locale prefix
4. **Translation files** - JSON files in `messages/` directory

## Usage

### Using Translations in Components

```tsx
"use client";

import { useTranslations } from "next-intl";

export function MyComponent() {
  const t = useTranslations("common");

  return (
    <div>
      <h1>{t("title")}</h1>
      <button>{t("save")}</button>
    </div>
  );
}
```

### Navigation with Locale Support

Always use the i18n-aware navigation from `@/i18n/routing`:

```tsx
import { Link, useRouter, usePathname } from "@/i18n/routing";

// Link component
<Link href="/movies">Movies</Link>;

// Router navigation
const router = useRouter();
router.push("/settings");

// Get current pathname (without locale)
const pathname = usePathname();
```

### Language Switcher

The `LanguageSwitcher` component is available in the sidebar and allows users to switch between languages:

```tsx
import { LanguageSwitcher } from "@/components/language-switcher";

<LanguageSwitcher />;
```

The selected language is:

1. Stored in localStorage as `preferred_ui_locale`
2. Applied via next-intl middleware
3. Persisted across sessions

## Adding New Translations

### 1. Add Translation Keys

Add new keys to all language files in `messages/`:

```json
// messages/en.json
{
  "myFeature": {
    "title": "My Feature",
    "description": "This is a new feature"
  }
}
```

### 2. Use in Components

```tsx
const t = useTranslations("myFeature");

<h1>{t("title")}</h1>
<p>{t("description")}</p>
```

## Adding a New Language

1. **Update `i18n/routing.ts`**:

   ```typescript
   export const routing = defineRouting({
     locales: ["en", "nl", "de", "es", "fr", "ja", "zh", "it"], // Add new locale
     defaultLocale: "en",
   });
   ```

2. **Create translation file**:
   - Copy `messages/en.json` to `messages/it.json`
   - Translate all strings

3. **Update middleware matcher** in `middleware.ts`:

   ```typescript
   matcher: [
     "/",
     "/(nl|de|es|fr|ja|zh|it|en)/:path*", // Add new locale
     "/((?!api|_next/static|_next/image|favicon.ico).*)",
   ],
   ```

4. **Update LanguageSwitcher** in `components/language-switcher.tsx`:
   ```typescript
   const languages = [
     // ... existing languages
     { code: "it", name: "Italiano" },
   ];
   ```

## URL Structure

All routes are prefixed with the locale:

- `/en/movies` - English
- `/nl/movies` - Dutch
- `/de/movies` - German
- `/es/movies` - Spanish
- `/fr/movies` - French
- `/ja/movies` - Japanese
- `/zh/movies` - Chinese

The root URL `/` automatically redirects to the default locale `/en`.

## Server-Side Rendering

Translations work on both client and server:

```tsx
// Server Component
import { getTranslations } from "next-intl/server";

export default async function Page() {
  const t = await getTranslations("common");

  return <h1>{t("title")}</h1>;
}
```

## Best Practices

1. **Organize translation keys** by feature/domain (common, navigation, settings, etc.)
2. **Use descriptive keys** that indicate the context (e.g., `settings.metadataLanguage` not just `language`)
3. **Keep translations consistent** across all language files
4. **Use the i18n Link** instead of Next.js Link for all internal navigation
5. **Store user preference** in both localStorage and cookies for SSR support
6. **Test all languages** to ensure UI doesn't break with longer text

## Translation Keys Structure

Current translation structure in `messages/*.json`:

```
common/          # Buttons, actions, common UI elements
navigation/      # Navigation menu items
settings/        # Settings page
auth/            # Authentication (login, register)
movies/          # Movies feature
tvShows/         # TV shows feature
files/           # Files browser
torrents/        # Torrent management
encodings/       # Video encoding
people/          # People/cast/crew
releases/        # Release calendar
backgroundTasks/ # Background task management
errors/          # Error messages
```

## Troubleshooting

### "Module not found" errors

- Ensure `next-intl` plugin is configured in `next.config.mjs`
- Check that `i18n/request.ts` path is correct

### Translations not loading

- Verify translation files exist in `messages/` directory
- Check that keys match between files and code
- Ensure locale is included in `routing.locales` array

### Navigation issues

- Always use `import { Link } from "@/i18n/routing"` not `next/link`
- Use `useRouter` from `@/i18n/routing` for programmatic navigation

### Middleware conflicts

- Ensure middleware matcher excludes API routes and static files
- Check that auth middleware allows through locale-prefixed routes
