import type { SupabaseClient } from '@supabase/supabase-js';

export interface PlayerRegistration {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export async function savePlayerRegistration(
  client: Pick<SupabaseClient, 'from'> | null,
  player: PlayerRegistration,
): Promise<void> {
  if (!client) throw new Error('Unable to save registration. Please check the connection and try again.');
  const record = {
    id: player.id,
    name: player.name || null,
    email: player.email || null,
    phone: player.phone || null,
  };
  const { error } = await client.from('player_registrations').insert(record);
  if (!error) return;

  // A prior attempt may have succeeded even if its response was lost.
  if (error.code === '23505') {
    const { data, error: lookupError } = await client.from('player_registrations')
      .select('name, email, phone').eq('id', player.id).maybeSingle();
    if (!lookupError && data && data.name === record.name && data.email === record.email && data.phone === record.phone) return;
  }
  throw new Error('Unable to save registration. Please check the connection and try again.');
}
