import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdminAuth, isAdminUser, loginDestination } from '../services/adminAuth.ts';

const settle = () => new Promise((resolve) => setImmediate(resolve));
const admin = () => ({
  id: '1c40a6fa-cf30-421d-acd3-227d5b869f34', email: 'operator@example.test',
  app_metadata: { role: 'admin' }, user_metadata: {}, created_at: '2026-01-01',
});

function harness(t, user = admin()) {
  const states = [];
  let callback;
  const fake = {
    session: { access_token: 'verified-token', expires_at: Math.floor(Date.now() / 1000) + 3600 },
    user, signInError: null, signOutError: null, userError: null, unsubscribed: false,
    auth: {
      async getSession() { return { data: { session: fake.session }, error: null }; },
      async getUser(token) {
        assert.equal(token, 'verified-token');
        return { data: { user: fake.user }, error: fake.userError };
      },
      async signInWithPassword() {
        return { error: fake.signInError };
      },
      async signOut() {
        if (!fake.signOutError) {
          fake.session = null;
          callback?.('SIGNED_OUT');
        }
        return { error: fake.signOutError };
      },
      onAuthStateChange(fn) {
        callback = fn;
        return { data: { subscription: { unsubscribe() { fake.unsubscribed = true; } } } };
      },
    },
  };
  const auth = createAdminAuth(fake, (state) => states.push(state));
  t.after(auth.start());
  return { fake, auth, states, event: (name) => callback(name), state: () => states.at(-1) };
}

test('only server-managed app metadata grants admin access', () => {
  assert.equal(isAdminUser(admin()), true);
  for (const value of [
    null, { email: 'admin@example.test', isAdmin: true, role: 'admin' },
    { app_metadata: { role: 'player' }, user_metadata: { role: 'admin' } },
  ]) assert.equal(isAdminUser(value), false);
});

test('restores a verified admin, denies non-admins, and handles remote verification failures', async (t) => {
  const h = harness(t);
  await settle();
  assert.equal(h.state().status, 'authenticated');
  assert.equal(h.state().user.id, h.fake.user.id);
  h.fake.user = { ...admin(), app_metadata: { role: 'player' } };
  assert.equal(await h.auth.retry(), false);
  assert.equal(h.state().user, null);
  assert.match(h.state().error, /does not have admin access/);
  h.fake.user = admin();
  h.fake.userError = new Error('network');
  await h.auth.retry();
  assert.equal(h.state().status, 'error');
  assert.match(h.state().error, /Unable to verify/);
});

test('missing configuration and wrong credentials fail visibly without a demo fallback', async (t) => {
  const states = [];
  const missing = createAdminAuth(null, (state) => states.push(state));
  assert.equal(await missing.signIn('a@example.test', 'not-a-real-password'), false);
  assert.match(states.at(-1).error, /not configured/);
  const h = harness(t);
  await settle();
  h.fake.session = null;
  h.fake.signInError = new Error('invalid credentials');
  assert.equal(await h.auth.signIn('a@example.test', 'not-a-real-password'), false);
  assert.equal(h.state().user, null);
  assert.match(h.state().error, /Check your email and password/);
});

test('sign-out and cross-tab sign-out invalidate access; sign-out errors are explicit', async (t) => {
  const h = harness(t);
  await settle();
  h.fake.signOutError = new Error('network');
  assert.equal(await h.auth.signOut(), false);
  assert.equal(h.state().status, 'error');
  assert.match(h.state().error, /Sign-out failed/);
  h.fake.signOutError = null;
  assert.equal(await h.auth.signOut(), true);
  assert.equal(h.state().status, 'signed-out');
  h.fake.session = { access_token: 'verified-token', expires_at: Math.floor(Date.now() / 1000) + 3600 };
  await h.auth.retry();
  h.event('SIGNED_OUT');
  assert.equal(h.state().status, 'signed-out');
});

test('an in-flight verification cannot restore access after sign-out', async (t) => {
  const h = harness(t);
  await settle();
  let release;
  h.fake.auth.getUser = () => new Promise((resolve) => { release = resolve; });
  const pending = h.auth.retry();
  await settle();
  h.event('SIGNED_OUT');
  release({ data: { user: admin() }, error: null });
  await pending;
  assert.equal(h.state().status, 'signed-out');
});

test('expiry removes access even when automatic refresh does not fire', async (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1_800_000_000_000 });
  const h = harness(t);
  h.fake.session.expires_at = Math.floor(Date.now() / 1000) + 1;
  await settle();
  assert.equal(h.state().status, 'authenticated');
  t.mock.timers.tick(1001);
  await settle();
  assert.equal(h.state().status, 'error');
  assert.match(h.state().error, /expired/);
});

test('token refresh revalidates roles and cleanup unsubscribes', async () => {
  let callback;
  let unsubscribed = false;
  const states = [];
  const client = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange(fn) {
        callback = fn;
        return { data: { subscription: { unsubscribe() { unsubscribed = true; } } } };
      },
    },
  };
  const auth = createAdminAuth(client, (state) => states.push(state));
  const stop = auth.start();
  await settle();
  callback('TOKEN_REFRESHED');
  await settle();
  assert.equal(states.at(-1).status, 'signed-out');
  stop();
  const count = states.length;
  callback('SIGNED_IN');
  await settle();
  assert.equal(unsubscribed, true);
  assert.equal(states.length, count);
});

test('post-login redirects only allow app routes, not external URLs or login loops', () => {
  assert.equal(loginDestination('/settings?tab=audio#volume'), '/settings?tab=audio#volume');
  for (const value of [undefined, {}, '//evil.test', '/\\evil.test', 'https://evil.test', '/login', '/unknown', '/home\n']) {
    assert.equal(loginDestination(value), '/');
  }
});
