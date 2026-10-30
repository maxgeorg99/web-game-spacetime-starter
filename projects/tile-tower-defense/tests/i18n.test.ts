import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { createTranslator, english, t, th, type TranslationKey } from '../src/i18n';
import { towers, units, waves, tiles, skillTrees } from '../shared/config';
import { buildCards } from '../src/views';
import { fresh } from '../shared/game/rules';

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
      for (const node of tree.nodes) {
        expect(t(`content.skills.${tree.tower}.${node.id}.name` as TranslationKey)).not.toContain(
          'content.skills.',
        );
      }
    }
    expect(buildCards(fresh(), undefined, false)).toContain('Catapult');
  });
});
