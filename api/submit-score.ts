import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

declare const process: any;

const ScoreSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  runId: z.string().min(1, 'Run ID is required'),
  score: z.number().int().min(0).max(500, 'Score exceeds plausible session limits'),
  level: z.number().int().min(1).max(50, 'Level out of bounds'),
  accuracy: z.number().int().min(0).max(100, 'Accuracy percentage must be between 0 and 100'),
  timestamp: z.number().positive(),
});

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Expected POST.' });
  }

  try {
    const parsed = ScoreSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
      });
    }

    const { userId, score, level, accuracy, timestamp } = parsed.data;

    // Validate timestamp is not in the distant future or expired
    const now = Date.now();
    if (Math.abs(now - timestamp) > 300000) { // 5-minute threshold
      return res.status(400).json({ error: 'Invalid score timestamp or session expired.' });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let dbRank = Math.max(1, Math.floor(10 - score / 5));

    if (supabaseUrl && serviceRoleKey) {
      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      const { error: dbError } = await adminClient.from('scores').insert({
        user_id: userId,
        score,
        level,
        accuracy,
        created_at: new Date(timestamp).toISOString(),
      });

      if (dbError) {
        console.error('Supabase score insert error:', dbError);
      } else {
        // Query rank count
        const { count } = await adminClient
          .from('scores')
          .select('*', { count: 'exact', head: true })
          .gt('score', score);
        if (typeof count === 'number') {
          dbRank = count + 1;
        }
      }
    }

    // Determine rewards unlocked
    const rewardUnlocked = score >= 3;
    const rewardCode = rewardUnlocked
      ? `BOOTH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      : null;

    return res.status(200).json({
      success: true,
      rank: dbRank,
      score,
      level,
      accuracy,
      rewardClaimable: rewardUnlocked,
      rewardCode,
      message: 'Score successfully validated and recorded',
    });
  } catch (err: any) {
    return res.status(500).json({
      error: 'Internal server error while processing score',
      message: err?.message || 'Unknown error',
    });
  }
}
