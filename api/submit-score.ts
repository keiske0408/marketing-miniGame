import { z } from 'zod';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { IncomingHttpHeaders } from 'node:http';
import { isAdminUser } from '../services/adminAuth';

const ScoreSchema = z.object({
  userId: z.string().min(1).optional(),
  runId: z.string().min(1, 'Run ID is required'),
  gameMode: z.enum(['picture-match', 'target-timer']).default('picture-match'),
  score: z.number().int().min(0).max(500, 'Score exceeds plausible session limits'),
  level: z.number().int().min(1).max(50, 'Level out of bounds'),
  accuracy: z.number().int().min(0).max(100, 'Accuracy percentage must be between 0 and 100'),
  timestamp: z.number().positive(),
});

interface ApiRequest {
  method?: string;
  headers: IncomingHttpHeaders;
  body?: unknown;
}

interface ApiResponse {
  setHeader(name: string, value: string): void;
  status(code: number): ApiResponse;
  json(body: unknown): unknown;
  end(): unknown;
}

function configuredClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) : null;
}

export function createScoreHandler(getClient: () => SupabaseClient | null = configuredClient) {
  return async (req: ApiRequest, res: ApiResponse) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed. Expected POST.' });

    const authorization = req.headers.authorization;
    const token = typeof authorization === 'string' ? /^Bearer ([^\s]+)$/i.exec(authorization)?.[1] : undefined;
    if (!token) return res.status(401).json({ error: 'Admin authentication is required.' });

    try {
      const client = getClient();
      if (!client) return res.status(503).json({ error: 'Score service is not configured.' });
      const { data: { user }, error: authError } = await client.auth.getUser(token);
      if (authError || !user) return res.status(401).json({ error: 'Invalid or expired admin session.' });
      if (!isAdminUser(user)) return res.status(403).json({ error: 'Admin access is required.' });

      const parsed = ScoreSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
        });
      }
      const { userId, gameMode, score, level, accuracy, timestamp } = parsed.data;
      if (userId && userId !== user.id) return res.status(403).json({ error: 'Score identity does not match the admin session.' });
      if (Math.abs(Date.now() - timestamp) > 300000) {
        return res.status(400).json({ error: 'Invalid score timestamp or session expired.' });
      }
      const { error: insertError } = await client.from('scores').insert({
        user_id: user.id,
        display_name: typeof user.user_metadata?.display_name === 'string' ? user.user_metadata.display_name : 'Event Admin',
        game_mode: gameMode,
        score, level, accuracy,
        created_at: new Date(timestamp).toISOString(),
      });
      if (insertError) throw insertError;
      const { count, error: rankError } = await client.from('scores')
        .select('*', { count: 'exact', head: true }).gt('score', score);
      if (rankError || count === null) throw rankError ?? new Error('Rank query returned no count.');

      const rewardUnlocked = score >= 3;
      return res.status(200).json({
        success: true,
        rank: count + 1,
        score, level, accuracy,
        rewardClaimable: rewardUnlocked,
        rewardCode: rewardUnlocked ? `BOOTH-${crypto.randomUUID().slice(0, 8).toUpperCase()}` : null,
        message: 'Score successfully validated and recorded',
      });
    } catch (error) {
      console.error('Score submission failed:', error);
      return res.status(500).json({ error: 'Unable to record the score. Please try again.' });
    }
  };
}

export default createScoreHandler();
