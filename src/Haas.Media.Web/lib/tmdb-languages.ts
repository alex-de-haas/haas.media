export interface TmdbLanguageOption {
  code: string;
  label: string;
}

export const TMDB_LANGUAGE_OPTIONS: TmdbLanguageOption[] = [
  { code: "en", label: "English" },
  { code: "en-GB", label: "English (United Kingdom)" },
  { code: "en-US", label: "English (United States)" },
  { code: "es", label: "Spanish" },
  { code: "es-MX", label: "Spanish (Mexico)" },
  { code: "de", label: "German" },
  { code: "fr", label: "French" },
  { code: "it", label: "Italian" },
  { code: "nl", label: "Dutch" },
  { code: "pt", label: "Portuguese" },
  { code: "pt-BR", label: "Portuguese (Brazil)" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "zh-CN", label: "Chinese (Simplified)" },
  { code: "zh-TW", label: "Chinese (Traditional)" },
  { code: "ru", label: "Russian" },
  { code: "sv", label: "Swedish" },
  { code: "no", label: "Norwegian" },
  { code: "fi", label: "Finnish" },
  { code: "da", label: "Danish" },
  { code: "pl", label: "Polish" },
  { code: "cs", label: "Czech" },
  { code: "sk", label: "Slovak" }
];

export function isSupportedTmdbLanguage(code: string): boolean {
  return TMDB_LANGUAGE_OPTIONS.some((option) => option.code === code);
}

export function findTmdbLanguageLabel(code: string | undefined | null): string | undefined {
  if (!code) {
    return undefined;
  }

  const normalized = code.trim();
  return TMDB_LANGUAGE_OPTIONS.find((option) => option.code === normalized)?.label;
}
