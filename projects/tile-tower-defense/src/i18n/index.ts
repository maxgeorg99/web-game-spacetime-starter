import { createInstance } from 'i18next';
import ui from './locales/en/ui.json';
import content from './locales/en/content.json';

export const english = { ...ui, ...content };
type ResourceKey = keyof typeof english;
type PluralBase<K> = K extends `${infer Base}_${'zero' | 'one' | 'two' | 'few' | 'many' | 'other'}`
  ? Base
  : never;
export type PluralKey = PluralBase<ResourceKey>;
export type TranslationKey = ResourceKey | PluralKey;
type Values = Record<string, string | number>;
type Arguments<K> = K extends PluralKey ? [values: Values & { count: number }] : [values?: Values];

/** Bundle catalogs locally: no network requests or translation service during play. */
export function createTranslator(
  language = 'en',
  catalogs: Record<string, Record<string, string>> = { en: english },
) {
  const instance = createInstance();
  const resources = { ...catalogs, en: { ...english, ...catalogs.en } };
  void instance.init({
    lng: language,
    fallbackLng: 'en',
    supportedLngs: Object.keys(resources),
    resources: Object.fromEntries(
      Object.entries(resources).map(([locale, translation]) => [locale, { translation }]),
    ),
    initAsync: false,
    keySeparator: false,
    nsSeparator: false,
    returnNull: false,
    interpolation: { escapeValue: false },
  });
  function translate<K extends TranslationKey>(key: K, ...args: Arguments<K>): string {
    return instance.t(key, args[0] ?? {}) as string;
  }
  return { t: translate, language: instance.resolvedLanguage ?? 'en' };
}

const requestedLanguage =
  typeof window === 'undefined'
    ? 'en'
    : (new URLSearchParams(window.location.search).get('lang') ?? navigator.language);
// Add another imported catalog here when its translation is ready.
const translator = createTranslator(requestedLanguage, { en: english });
export const t = translator.t;
export const language = translator.language;
export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
/** Use th in HTML templates; t in textContent, canvas text and errors. */
export function th<K extends TranslationKey>(key: K, ...args: Arguments<K>): string {
  return escapeHtml(t(key, ...args));
}

export function localizeDocument(root: ParentNode = document) {
  document.documentElement.lang = language;
  for (const element of Array.from(root.querySelectorAll<HTMLElement>('[data-i18n]'))) {
    element.textContent = t(element.dataset.i18n as ResourceKey);
  }
  for (const attribute of ['aria-label', 'title', 'placeholder', 'alt']) {
    for (const element of Array.from(
      root.querySelectorAll<HTMLElement>(`[data-i18n-${attribute}]`),
    )) {
      element.setAttribute(
        attribute,
        t(element.getAttribute(`data-i18n-${attribute}`) as ResourceKey),
      );
    }
  }
}
