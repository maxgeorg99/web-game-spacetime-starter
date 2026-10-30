import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import {
  createTranslator,
  english,
  german,
  spanish,
  t,
  th,
  type TranslationKey,
} from '../src/i18n';
import { towers, units, waves, tiles, skillTrees } from '../shared/config';
import { buildCards } from '../src/views';
import { fresh } from '../shared/game/rules';
import { localizeSkillTree } from '../src/i18n/content';

describe('localization', () => {
  test('troop counts select zero, one, and other without caller branches', () => {
    expect([0, 1, 2, 5, 100].map((count) => t('count.troops', { count }))).toEqual([
      'No troops',
      '1 troop',
      '2 troops',
      '5 troops',
      '100 troops',
    ]);
    expect(t('count.unitsPerAirship', { count: 1, seconds: 8 })).toBe(
      '8s flight · 1 unit per airship',
    );
    expect(t('count.unitsPerAirship', { count: 6, seconds: 8 })).toBe(
      '8s flight · 6 units per airship',
    );
    expect(t('session.availability', { count: 1, capacity: 4, stale: '' })).toBe(
      '1/4 island available',
    );
  });
  test('uses locale plural rules, including two, few and many', () => {
    const ar = createTranslator('ar', {
      ar: {
        'count.troops_zero': 'zero',
        'count.troops_one': 'one',
        'count.troops_two': 'two',
        'count.troops_few': 'few',
        'count.troops_many': 'many',
        'count.troops_other': 'other',
      },
    });
    expect([0, 1, 2, 3, 11, 100].map((count) => ar.t('count.troops', { count }))).toEqual([
      'zero',
      'one',
      'two',
      'few',
      'many',
      'other',
    ]);
    expect(ar.t('common.save')).toBe('Save');
  });
  test('unsupported languages fall back to English and regional English resolves', () => {
    expect(createTranslator('xx').language).toBe('en');
    expect(createTranslator('en-GB').t('count.troops', { count: 1 })).toBe('1 troop');
  });
  test('German browser locales resolve to the bundled German catalog', () => {
    for (const locale of ['de', 'de-DE', 'de-AT', 'de-CH']) {
      const translator = createTranslator(locale);
      expect(translator.language).toBe('de');
      expect(translator.t('common.build')).toBe('Bauen');
      expect(translator.t('content.towers.sentinel.name')).toBe('Magierturm');
      expect(translator.t('content.skills.sentinel.lightning-capstone.name')).toBe('Überladung');
      expect([0, 1, 2].map((count) => translator.t('count.troops', { count }))).toEqual([
        'Keine Truppen',
        '1 Einheit',
        '2 Einheiten',
      ]);
    }
  });
  test('Spanish browser locales resolve to the bundled Spanish catalog', () => {
    for (const locale of ['es', 'es-ES', 'es-MX', 'es-AR', 'es-419']) {
      const translator = createTranslator(locale);
      expect(translator.language).toBe('es');
      expect(translator.t('common.build')).toBe('Construir');
      expect(translator.t('content.towers.sentinel.name')).toBe('Torre de mago');
      expect(translator.t('content.skills.sentinel.lightning-capstone.name')).toBe('Sobrecarga');
      expect([0, 1, 2].map((count) => translator.t('count.troops', { count }))).toEqual([
        'Sin tropas',
        '1 unidad',
        '2 unidades',
      ]);
      expect(translator.t('skill.requires', { name: 'Frío intenso', rank: 3 })).toBe(
        'Requiere Frío intenso, rango 3',
      );
    }
  });
  test('translated catalogs cover every English key and preserve interpolation variables', () => {
    const variables = (text: string) => (text.match(/{{\s*\w+\s*}}/g) ?? []).sort();
    for (const catalog of [german, spanish]) {
      expect(Object.keys(catalog).sort()).toEqual(Object.keys(english).sort());
      for (const key of Object.keys(english) as (keyof typeof english)[]) {
        expect(catalog[key].trim().length).toBeGreaterThan(0);
        expect(variables(catalog[key])).toEqual(variables(english[key]));
      }
    }
  });
  test('text interpolation preserves names; HTML interpolation escapes markup once', () => {
    const name = '<img src=x onerror=alert(1)> & "Captain"';
    expect(t('connection.connectingWorld', { name })).toBe(`Connecting to ${name}…`);
    const result = th('connection.connectingWorld', { name });
    expect(result).not.toContain('<img');
    expect(result).toContain('&lt;img');
    expect(result).toContain('&amp; &quot;Captain&quot;');
  });
  test('static document keys and every game content entry have translations', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    for (const match of html.matchAll(/data-i18n(?:-[\w-]+)?="([^"]+)"/g)) {
      expect(english[match[1] as keyof typeof english]).toBeString();
    }
    for (const [group, rows] of Object.entries({ towers, units, waves, tiles })) {
      for (const row of rows) {
        for (const field of ['name', 'description']) {
          const key = `content.${group}.${row.id}.${field}` as TranslationKey;
          expect(t(key)).not.toBe(key);
        }
      }
    }
    for (const tree of skillTrees) {
      for (const branch of tree.branchIds) {
        const key = `content.branches.${tree.tower}.${branch}` as TranslationKey;
        expect(t(key)).not.toBe(key);
      }
      for (const node of tree.nodes) {
        for (const field of ['name', 'description']) {
          const key = `content.skills.${tree.tower}.${node.id}.${field}` as TranslationKey;
          expect(t(key)).not.toBe(key);
        }
      }
    }
    expect(buildCards(fresh(), undefined, false)).toContain('Catapult');
  });
  test('skill translations replace labels and fall back without changing game rules', () => {
    const tree = skillTrees.find((value) => value.tower === 'sentinel')!;
    const before = JSON.stringify(tree);
    const de = createTranslator('de', {
      de: {
        'content.branches.sentinel.frost': 'Frostmagie',
        'content.skills.sentinel.frost-attune.name': 'Kälte',
        'content.skills.sentinel.frost-attune.description': 'Verlangsamt das primäre Ziel.',
      },
    });
    const localized = localizeSkillTree(tree, de.t);
    expect(localized.branches[0]).toBe('Frostmagie');
    const chill = localized.nodes.find((node) => node.id === 'frost-attune')!;
    expect(chill.name).toBe('Kälte');
    expect(chill.description).toBe('Verlangsamt das primäre Ziel.');
    expect(localized.nodes.find((node) => node.id === 'frost-capstone')!.name).toBe('Deep freeze');
    for (const node of tree.nodes) {
      expect(localized.nodes.find((value) => value.id === node.id)).toMatchObject(node);
    }
    expect(JSON.stringify(tree)).toBe(before);
  });
  test('shared catalogs do not carry duplicated display text', () => {
    const rows = [
      ...towers,
      ...units,
      ...waves,
      ...tiles,
      ...skillTrees.flatMap((tree) => tree.nodes),
    ];
    for (const row of rows) {
      expect(row).not.toHaveProperty('name');
      expect(row).not.toHaveProperty('description');
    }
  });
});
