import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ["en", "nl", "de", "es", "fr", "ja", "zh", "ru"],

  // Used when no locale matches
  defaultLocale: "en",

  // The `pathnames` are used for internationalized pathnames (optional)
  // If not set, all pathnames are available in all locales
});

// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
