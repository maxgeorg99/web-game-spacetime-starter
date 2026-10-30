import { createInstance } from 'i18next';
import ui from './locales/en/ui.json';
import content from './locales/en/content.json';
import germanUI from './locales/de/ui.json';
import germanContent from './locales/de/content.json';
import spanishUI from './locales/es/ui.json';
import spanishContent from './locales/es/content.json';

export const english = { ...ui, ...content };
export const german = { ...germanUI, ...germanContent } satisfies Record<
  keyof typeof english,
  string
>;
export const spanish = { ...spanishUI, ...spanishContent } satisfies Record<
  keyof typeof english,
  string
>;
const bundledCatalogs = { en: english, de: german, es: spanish };
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
  catalogs: Record<string, Record<string, string>> = bundledCatalogs,
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
const translator = createTranslator(requestedLanguage);
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
