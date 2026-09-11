/**
 * CRABS Internationalization Module
 *
 * Handles dictionary lookups, language resolution, parameter interpolation,
 * and dynamic locale overriding.
 *
 * @module base/localization
 */

import baseLocales from "./i18n.json";

export type SupportedLocale = "en" | "de" | "fr" | "ru" | "cn" | "tw" | "uk";

const translations: Record<string, Record<string, any>> = {
  base: baseLocales,
};
let userLanguageOverride: string | null = null;

/**
 * Normalizes an arbitrary locale or language tag into a supported CRABS locale.
 *
 * @param lang - Incoming language code (e.g. from browser or BC).
 * @returns Normalized {@link SupportedLocale}.
 */
export function normalizeLocale(
  lang: string | undefined | null,
): SupportedLocale {
  if (!lang) return "en";
  const normalized = lang.trim().toLowerCase();
  switch (normalized) {
    case "cn":
    case "zh":
    case "zh-cn":
      return "cn";
    case "tw":
    case "zh-tw":
    case "zh-hk":
      return "tw";
    case "de":
      return "de";
    case "fr":
      return "fr";
    case "ru":
      return "ru";
    case "uk":
    case "ua":
      return "uk";
    default:
      return (normalized.slice(0, 2) as SupportedLocale) || "en";
  }
}

/**
 * Retrieves the currently active locale, honoring manual overrides before falling back
 * to the host game environment or storage.
 *
 * @returns The active {@link SupportedLocale}.
 */
export function getActiveLocale(): SupportedLocale {
  if (userLanguageOverride) {
    return normalizeLocale(userLanguageOverride);
  }
  const globalWindow = window as any;
  const gameLang =
    globalWindow.TranslationLanguage ||
    localStorage.getItem("BondageClubLanguage") ||
    "en";
  return normalizeLocale(gameLang);
}

/**
 * Sets an explicit user language override or clears it if "auto" or null.
 *
 * @param lang - Desired locale string or null to reset.
 */
export function setLanguageOverride(lang: string | null): void {
  userLanguageOverride = !lang || lang === "auto" ? null : lang;
}

/**
 * Registers an internationalization dictionary bundle under a specific module namespace.
 *
 * @param namespace - Unique module key.
 * @param bundle - Key-value translation map or default export object.
 */
export function registerTranslations(
  namespace: string,
  bundle: Record<string, any>,
): void {
  let rawData =
    bundle && typeof bundle === "object" && "default" in bundle
      ? bundle.default
      : bundle;

  // VERY IMPORTANT: Unwraps double namespaces from the migration script
  if (
    rawData &&
    typeof rawData === "object" &&
    namespace in rawData &&
    Object.keys(rawData).length === 1
  ) {
    rawData = rawData[namespace];
  }

  translations[namespace] = {
    ...(translations[namespace] || {}),
    ...rawData,
  };
}

/**
 * Traverses a nested dictionary using an array of property tokens.
 *
 * @param obj - Root dictionary object.
 * @param keyPath - Array of key tokens.
 * @returns Found translation node or undefined.
 */
function resolveKey(
  obj: any,
  keyPath: string[],
): Record<string, string> | undefined {
  let current = obj;
  for (const part of keyPath) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return typeof current === "object" && current !== null ? current : undefined;
}

/**
 * Translates a given key with optional token replacements.
 *
 * @param key - Dotted path key (e.g. "base.chat.person_not_found").
 * @param params - Optional map of string or number replacements for `{token}` placeholders.
 * @returns Localized string or the original key on miss.
 */
export function translate(
  key: string,
  params?: Record<string, string | number>,
): string {
  const active = getActiveLocale();
  const parts = key.split(".");

  // Determine namespace (first token) and path within namespace
  const namespace = parts[0];
  const subPath = parts.slice(1);

  // Look in namespace first, or check the root if unnamespaced
  let entry = translations[namespace]
    ? resolveKey(translations[namespace], subPath)
    : undefined;

  // Fallback: if not found, check if it was registered under 'base'
  if (!entry && namespace !== "base" && translations["base"]) {
    entry = resolveKey(translations["base"], parts);
  }

  // 🔴 DEBUG CHECK
  if (!entry) {
    console.warn(
      `[CRABS i18n MISS] Key: "${key}", Namespace: "${namespace}", subPath:`,
      subPath,
      "Available in namespace:",
      Object.keys(translations[namespace] || {}),
    );
  }

  let text: string | undefined = undefined;

  if (entry) {
    text = entry[active];
    if ((text === undefined || text === "") && active === "tw") {
      text = entry["cn"];
    }
    if ((text === undefined || text === "") && active !== "en") {
      text = entry["en"];
    }
  }

  if (text === undefined || text === "") {
    return key;
  }

  if (params) {
    return text.replace(/\{(\w+)\}/g, (_, match) =>
      params[match] !== undefined ? String(params[match]) : `{${match}}`,
    );
  }
  return text;
}
