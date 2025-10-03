/**
 * Theme-related type definitions
 */

export type ThemeMode = "light" | "dark" | "system";

export interface UseThemeReturn {
  theme: ThemeMode;
  resolvedTheme: "light" | "dark";
  setThemeMode: (mode: ThemeMode) => void;
}
