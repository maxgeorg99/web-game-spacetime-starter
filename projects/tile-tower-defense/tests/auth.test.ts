import { describe, expect, test } from 'bun:test';
import { validHandoff } from '../src/auth-handoff';

describe('account handoff', () => {
  const nonce = 'transaction-nonce';
  const message = () => ({
    type: 'tile-td:account',
    nonce,
    token: 'test-token',
    expiresAt: Date.now() + 60_000,
  });
  test('accepts a current result for the pending transaction', () => {
    expect(validHandoff(message(), nonce)).toBe(true);
  });
  test('rejects other transactions and message types', () => {
    expect(validHandoff(message(), 'other')).toBe(false);
    expect(validHandoff({ ...message(), type: 'tile-td:received' }, nonce)).toBe(false);
  });
  test('rejects expired or malformed credentials', () => {
    for (const value of [
      null,
      {},
      { ...message(), token: '' },
      { ...message(), token: 'x'.repeat(32769) },
      { ...message(), expiresAt: Date.now() },
      { ...message(), expiresAt: Infinity },
      { ...message(), expiresAt: '9999999999999' },
    ]) {
      expect(validHandoff(value, nonce)).toBe(false);
    }
  });
});
