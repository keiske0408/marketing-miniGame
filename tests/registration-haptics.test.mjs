import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS } from '../config/constants.ts';
import { normalizeSettings } from '../services/eventRules.ts';
import { savePlayerRegistration } from '../services/playerRegistration.ts';
import { HapticService } from '../services/haptics.ts';

const player = { id: '10000000-0000-4000-8000-000000000001', name: '', email: 'test@example.invalid', phone: '123' };
const record = { id: player.id, name: null, email: player.email, phone: player.phone };

function clientFor(insertError, lookupData = null, lookupError = null) {
  const calls = [];
  return {
    calls,
    from(table) {
      assert.equal(table, 'player_registrations');
      return {
        insert(value) { calls.push(value); return Promise.resolve({ error: insertError }); },
        select() { return { eq: () => ({ maybeSingle: () => Promise.resolve({ data: lookupData, error: lookupError }) }) }; },
      };
    },
  };
}

test('new defaults require contact information but preserve existing settings', () => {
  const defaults = normalizeSettings({});
  assert.equal(defaults.requirePlayerName, false);
  assert.equal(defaults.requirePlayerEmail, true);
  assert.equal(defaults.requirePlayerPhone, true);
  assert.equal(defaults.showGuidelines, true);
  assert.equal(defaults.haptics, true);
  const saved = normalizeSettings({ ...DEFAULT_SETTINGS, requirePlayerName: true, requirePlayerEmail: false, requirePlayerPhone: false, showGuidelines: false, haptics: false });
  assert.deepEqual([saved.requirePlayerName, saved.requirePlayerEmail, saved.requirePlayerPhone, saved.showGuidelines, saved.haptics], [true, false, false, false, false]);
});

test('registration saves optional name as null and reports failures', async () => {
  const client = clientFor(null);
  await savePlayerRegistration(client, player);
  assert.deepEqual(client.calls, [record]);
  await assert.rejects(savePlayerRegistration(null, player), /Unable to save/);
  await assert.rejects(savePlayerRegistration(clientFor({ code: '42501' }), player), /Unable to save/);
});

test('retry succeeds only when an existing registration matches the submitted data', async () => {
  await savePlayerRegistration(clientFor({ code: '23505' }, record), player);
  await assert.rejects(savePlayerRegistration(clientFor({ code: '23505' }, { ...record, phone: '999' }), player), /Unable to save/);
  await assert.rejects(savePlayerRegistration(clientFor({ code: '23505' }, null), player), /Unable to save/);
});

test('vibration respects settings and reports unavailable or rejected requests', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const calls = [];
  try {
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { vibrate: pattern => { calls.push(pattern); return true; } } });
    const haptics = new HapticService();
    assert.equal(haptics.test(), 'sent');
    haptics.tick();
    assert.deepEqual(calls, [200, 40]);
    haptics.setEnabled(false);
    assert.equal(haptics.test(), 'disabled');
    assert.equal(calls.length, 2);
    haptics.setEnabled(true);
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { vibrate: () => false } });
    assert.equal(haptics.test(), 'failed');
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} });
    assert.equal(haptics.test(), 'unsupported');
  } finally {
    if (original) Object.defineProperty(globalThis, 'navigator', original);
    else delete globalThis.navigator;
  }
});
