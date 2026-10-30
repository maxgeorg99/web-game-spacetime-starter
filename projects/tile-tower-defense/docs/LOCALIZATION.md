# Localization

Client text uses i18next. Edit `src/i18n/locales/en/ui.json` for menus, buttons, hints and counts; edit `content.json` alongside it for unit, tower, tile, wave, skill and faction display names/descriptions. Keys are flat, stable IDs. English, German and Spanish are bundled locally. Translated catalogs live under `src/i18n/locales/de/` and `src/i18n/locales/es/`; keep their keys and interpolation variables in sync with English.

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

For an additional language, create its `ui.json` and `content.json` under `src/i18n/locales/<locale>/`, import them in `src/i18n/index.ts`, and add their merged catalog to `bundledCatalogs`. The shipped languages are registered as follows:

```ts
const bundledCatalogs = { en: english, de: german, es: spanish };
```

Language is chosen at startup from `?lang=de`, `?lang=es` or `?lang=en`, otherwise `navigator.language`. German regional locales (`de-DE`, `de-AT`, `de-CH`) resolve to German; Spanish regional locales (including `es-ES`, `es-MX`, `es-AR` and `es-419`) resolve to the shared Spanish catalog. Reload to change languages. This also applies inside itch.io’s game iframe: it reads the browser language directly and loads the bundled catalogs without external requests. Query overrides must be on the embedded game URL, not the parent itch.io page. Unsupported languages and missing entries fall back to English. No translation service is contacted during play. Key autocomplete comes from the English catalog.

`src/i18n/content.ts` adapts display data on the client. Stable gameplay IDs, saves and server rules stay language independent. When adding content, add its English catalog keys too; tests cover content and static HTML keys. Shared configs contain IDs, art references and game rules only; do not duplicate display names or descriptions there. Skill trees store stable `branchIds`, with labels at `content.branches.<tower>.<branchId>`. The client adapter supplies typed localized names and descriptions for panels, prerequisites and the field guide. Server prerequisite diagnostics use stable skill IDs, while the UI translates the structured upgrade failure. Raw backend/transport errors and player-authored names are not translated by this pass.

Run the existing approved checks with `bun run check`; localization tests cover plural categories, regional language selection, fallback, HTML escaping, complete German and Spanish key/interpolation parity and catalog coverage.
