import test from 'node:test';
import assert from 'node:assert/strict';
import { createScoreHandler } from '../api/submit-score.ts';

function fixture() {
  const calls = [];
  const fake = {
    user: { id: 'admin-uuid', app_metadata: { role: 'admin' }, user_metadata: {} },
    authError: null,
    auth: { async getUser(token) {
      calls.push(['token', token]);
      return { data: { user: fake.user }, error: fake.authError };
    } },
    from: () => ({
      async insert(row) { calls.push(['insert', row]); return { error: null }; },
      select: () => ({ gt: async () => ({ count: 2, error: null }) }),
    }),
  };
  const body = { userId: 'admin-uuid', runId: 'run-test', gameMode: 'target-timer', score: 3, level: 1, accuracy: 100, timestamp: Date.now() };
  const handler = createScoreHandler(() => fake);
  const request = async (authorization = 'Bearer test-token', payload = body) => {
    const res = {
      code: 0, payload: null,
      setHeader() {},
      status(code) { this.code = code; return this; },
      json(value) { this.payload = value; return this; },
      end() { return this; },
    };
    await handler({ method: 'POST', headers: { authorization }, body: payload }, res);
    return res;
  };
  return { fake, calls, body, request };
}

test('score API denies missing/invalid tokens and authenticated non-admins before any write', async () => {
  const h = fixture();
  assert.equal((await h.request('')).code, 401);
  h.fake.authError = new Error('expired');
  assert.equal((await h.request()).code, 401);
  h.fake.authError = null;
  h.fake.user.app_metadata = { role: 'player' };
  h.fake.user.user_metadata = { role: 'admin' };
  assert.equal((await h.request()).code, 403);
  assert.equal(h.calls.some(([kind]) => kind === 'insert'), false);
});

test('score API rejects spoofed identities and uses verified admin identity on success', async () => {
  const h = fixture();
  assert.equal((await h.request('Bearer test-token', { ...h.body, userId: 'other-user' })).code, 403);
  const response = await h.request();
  assert.equal(response.code, 200);
  assert.equal(response.payload.rank, 3);
  assert.equal(response.payload.success, true);
  const inserted = h.calls.find(([kind]) => kind === 'insert')[1];
  assert.equal(inserted.user_id, 'admin-uuid');
  assert.equal(inserted.game_mode, 'target-timer');
});

test('score API reports missing configuration instead of fabricating a recorded score', async () => {
  const res = { status(code) { this.code = code; return this; }, setHeader() {}, json(value) { this.payload = value; } };
  await createScoreHandler(() => null)({ method: 'POST', headers: { authorization: 'Bearer test' } }, res);
  assert.equal(res.code, 503);
  assert.equal(res.payload.success, undefined);
});
