import { createClient } from '@supabase/supabase-js';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

class SeedError extends Error {}

export function seedConfiguration(env) {
  for (const name of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ADMIN_EMAIL', 'ADMIN_PASSWORD']) {
    if (!env[name]?.trim()) throw new SeedError(`Missing required environment variable: ${name}`);
  }
  const url = new URL(env.SUPABASE_URL);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) {
    throw new SeedError('SUPABASE_URL must use HTTPS (or HTTP for local development).');
  }
  const email = env.ADMIN_EMAIL.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new SeedError('ADMIN_EMAIL must be a valid email address.');
  if (env.ADMIN_PASSWORD.length < 12) throw new SeedError('ADMIN_PASSWORD must contain at least 12 characters.');
  return { url: url.href, key: env.SUPABASE_SERVICE_ROLE_KEY, email, password: env.ADMIN_PASSWORD };
}

export async function seedAdmin(client, { email, password }) {
  let existing;
  for (let page = 1; ; page++) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new SeedError('Unable to look up existing Auth accounts. Check the server credentials.');
    existing = data.users.find((user) => user.email?.toLowerCase() === email);
    if (existing || data.users.length < 1000) break;
  }
  if (existing && existing.app_metadata?.role !== 'admin') {
    throw new SeedError('This email belongs to a non-admin account. Refusing to elevate it automatically.');
  }
  let user = existing;
  if (!user) {
    const { data, error } = await client.auth.admin.createUser({
      email, password,
      email_confirm: true,
      app_metadata: { role: 'admin' },
      user_metadata: { display_name: 'Event Admin' },
    });
    if (error || !data.user) throw new SeedError('Unable to create the Auth admin. Check Auth settings and password requirements.');
    user = data.user;
  }
  const { error } = await client.from('profiles').upsert({
    id: user.id,
    email: user.email,
    display_name: typeof user.user_metadata?.display_name === 'string' ? user.user_metadata.display_name : 'Event Admin',
    role: 'admin',
  }, { onConflict: 'id' });
  if (error) throw new SeedError('Auth admin exists, but its profile could not be seeded. Apply the schema and rerun.');
  return { created: !existing };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (existsSync('.env')) process.loadEnvFile('.env');
    const configuration = seedConfiguration(process.env);
    const client = createClient(configuration.url, configuration.key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { created } = await seedAdmin(client, configuration);
    console.log(created ? 'Admin account and profile created.' : 'Admin profile verified. Existing password was not changed.');
  } catch (error) {
    // Supabase error objects may contain request details; only print our setup errors.
    console.error(error instanceof SeedError
      ? error.message : 'Admin seed failed. Check connectivity and server configuration.');
    process.exitCode = 1;
  }
}
