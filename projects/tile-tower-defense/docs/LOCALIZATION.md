# Localization

Client text uses i18next. Edit `src/i18n/locales/en/ui.json` for menus, buttons, hints and counts; edit `content.json` alongside it for unit, tower, tile, wave, skill and faction display names/descriptions. Keys are flat, stable IDs. English is currently the only shipped language.

```ts
import { t, th } from './i18n';
label.textContent = t('count.troops', { count: 1 }); // 1 troop
label.textContent = t('count.troops', { count: 5 }); // 5 troops
```

```json
{
  "count.troops_zero": "No troops",
  "count.troops_one": "{{count}} troop",
  "count.troops_other": "{{count}} troops"
}
```

Always pass `count` for plural keys; the typed helper requires it. i18next selects the language's plural category: `one`, `two`, `few`, `many`, or `other`, with an optional special `zero` entry. English uses `one` and `other`; it does not have a `some` category. Do not manually branch on counts in UI code.

Use `t` for canvas text, `textContent` and plain strings. Use `th` inside HTML templates: it escapes the entire interpolated result. Catalog values are plain text, not HTML. Escape other dynamic strings with `escapeHtml`. Static HTML uses `data-i18n="key"`, or `data-i18n-title`, `data-i18n-aria-label`, `data-i18n-placeholder` and `data-i18n-alt` for attributes. Put text markers on leaf elements so localization does not replace buttons or inputs inside a label.

## Add a language

Create `src/i18n/locales/de/ui.json` and `content.json`, import them in `src/i18n/index.ts`, and register their merged catalog:

```ts
const translator = createTranslator(requestedLanguage, {
  en: english,
  de: { ...deUI, ...deContent },
});
```

Language is chosen at startup from `?lang=de`, otherwise the browser language. Reload to change languages. Unsupported languages and missing entries fall back to English. No translation service is contacted during play. Key autocomplete comes from the English catalog.

`src/i18n/content.ts` adapts display data on the client. Stable gameplay IDs, saves and server rules stay language independent. When adding content, add its English catalog keys too; tests cover content and static HTML keys. Original config names remain server fallbacks. Raw backend/transport errors and player-authored names are not translated by this pass.

Run the existing approved checks with `bun run check`; localization tests cover plural categories, fallback, HTML escaping and catalog coverage.
