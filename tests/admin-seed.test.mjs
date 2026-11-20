import test from 'node:test';
import assert from 'node:assert/strict';
import { seedAdmin, seedConfiguration } from '../scripts/seed-admin.mjs';

const env = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-only-not-a-real-key',
  ADMIN_EMAIL: 'operator@example.test',
  ADMIN_PASSWORD: 'test-only-not-a-real-password',
};

function fakeClient(users = []) {
  const calls = { created: [], profiles: [] };
  return {
    calls,
    auth: { admin: {
      async listUsers() { return { data: { users }, error: null }; },
      async createUser(attributes) {
        calls.created.push(attributes);
        const user = { id: 'new-auth-uuid', ...attributes };
        users.push(user);
        return { data: { user }, error: null };
      },
    } },
    from(table) {
      assert.equal(table, 'profiles');
      return { async upsert(profile) { calls.profiles.push(profile); return { error: null }; } };
    },
  };
}

test('seed validates required server-only credentials and password length', () => {
  assert.equal(seedConfiguration(env).email, env.ADMIN_EMAIL);
  for (const name of Object.keys(env)) {
    assert.throws(() => seedConfiguration({ ...env, [name]: '' }), /Missing required/);
  }
  assert.throws(() => seedConfiguration({ ...env, ADMIN_PASSWORD: 'short' }), /at least 12/);
  assert.throws(() => seedConfiguration({ ...env, ADMIN_EMAIL: 'invalid' }), /valid email/);
  assert.throws(() => seedConfiguration({ ...env, SUPABASE_URL: 'http://remote.test' }), /HTTPS/);
});

test('seed creates a confirmed Auth admin and matching profile, then reruns without resetting credentials', async () => {
  const client = fakeClient();
  const configuration = seedConfiguration(env);
  assert.deepEqual(await seedAdmin(client, configuration), { created: true });
  assert.equal(client.calls.created[0].email_confirm, true);
  assert.equal(client.calls.created[0].app_metadata.role, 'admin');
  assert.equal(client.calls.profiles[0].id, 'new-auth-uuid');
  assert.deepEqual(await seedAdmin(client, configuration), { created: false });
  assert.equal(client.calls.created.length, 1);
  assert.equal(client.calls.profiles.length, 2);
  assert.equal('password' in client.calls.profiles[0], false);
});

test('seed refuses to promote an existing non-admin or conceal database errors', async () => {
  const client = fakeClient([{ email: env.ADMIN_EMAIL, app_metadata: {} }]);
  await assert.rejects(seedAdmin(client, seedConfiguration(env)), /Refusing to elevate/);
  assert.equal(client.calls.created.length, 0);
  const failing = fakeClient();
  failing.from = () => ({ upsert: async () => ({ error: new Error('denied') }) });
  await assert.rejects(seedAdmin(failing, seedConfiguration(env)), /profile could not be seeded/);
});
