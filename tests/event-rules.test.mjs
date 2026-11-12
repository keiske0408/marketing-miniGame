import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS } from '../config/constants.ts';
import { displayedSeconds, normalizeSettings, overlapPercentage, timerRules, timerWon, validTimerRules } from '../services/eventRules.ts';
import { appendEventScore, EVENT_SCORES_KEY, formatEventScore, isEventScore, rankScores, readEventScores } from '../services/eventScores.ts';

const rules = { target: 23, winMin: 22.34, winMax: 23.99 };
const timer = (id, elapsed, target = 23, createdAt = 1) => ({
  id, name: 'Test player', createdAt, mode: 'target-timer', ...rules, target, elapsed,
});
const picture = (id, percentage, createdAt = 1) => ({
  id, name: 'Test player', createdAt, mode: 'picture-match', percentage,
});
const storage = () => {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
};

test('picture scores actual horizontal overlap at responsive sizes', () => {
  for (const width of [90, 130, 260]) {
    const target = { left: 200, width };
    assert.equal(overlapPercentage({ left: 200 + width, width }, target), 0);
    assert.equal(overlapPercentage({ left: 200 - width, width }, target), 0);
    assert.equal(overlapPercentage({ left: 200 + width / 2, width }, target), 50);
    assert.equal(overlapPercentage({ left: 200 - width / 2, width }, target), 50);
    assert.equal(overlapPercentage({ left: 200.001, width }, target), 99);
    assert.equal(overlapPercentage({ left: 200, width }, target), 100);
  }
  assert.equal(overlapPercentage({ left: 0, width: 90 }, { left: 0, width: 130 }), 69);
  assert.throws(() => overlapPercentage({ left: 0, width: 0 }, { left: 0, width: 130 }));
});

test('Time Stop winning boundaries are inclusive at displayed hundredths', () => {
  for (const [elapsed, won] of [[22.33, false], [22.34, true], [23, true], [23.99, true], [24, false]]) {
    assert.equal(timerWon({ ...rules, elapsed }), won);
  }
  assert.equal(displayedSeconds(22.3351), 22.34);
  assert.equal(timerWon({ ...rules, elapsed: 22.3351 }), true);
  assert.equal(displayedSeconds(23.9951), 24);
  assert.equal(timerWon({ ...rules, elapsed: 23.9951 }), false);
  assert.equal(timerWon({ target: 3.25, winMin: 3.21, winMax: 3.29, elapsed: 3.25 }), true);
});

test('settings preserve old preferences, gain defaults, and normalize invalid rules', () => {
  const settings = normalizeSettings({ language: 'tl', muted: true, timerTargetMode: 'fixed', timerCustomTarget: 17 });
  assert.equal(settings.language, 'tl');
  assert.equal(settings.muted, true);
  assert.equal(settings.pictureSpeed, 1);
  assert.deepEqual(timerRules(settings), { ...rules, target: 17 });
  assert.deepEqual(timerRules(DEFAULT_SETTINGS), rules);
  assert.equal(normalizeSettings({ pictureSpeed: 3 }).pictureSpeed, 1);
  assert.equal(normalizeSettings({ pictureSpeed: 0.25 }).pictureSpeed, 0.25);
  assert.equal(normalizeSettings({ pictureSpeed: 2 }).pictureSpeed, 2);
  assert.deepEqual(timerRules(normalizeSettings({ timerWinMin: 25, timerWinMax: 20 })), rules);
});

test('invalid ranges and nonfinite settings are rejected', () => {
  for (const value of [
    { ...rules, target: NaN }, { ...rules, target: 0 }, { ...rules, target: 301 },
    { ...rules, winMin: -1 }, { ...rules, winMax: Infinity }, { ...rules, winMax: 301 },
    { ...rules, winMin: 24 },
  ]) assert.equal(validTimerRules(value), false);
  assert.equal(validTimerRules({ target: 1, winMin: 0, winMax: 0 }), true);
});

test('standings separate units and rank against each recorded target with deterministic ties', () => {
  const entries = [
    timer('far', 24), timer('near', 22.99), timer('other-target', 8, 8),
    picture('partial', 70), picture('full-late', 100, 2), picture('full-first', 100),
  ];
  assert.deepEqual(rankScores(entries, 'target-timer').map((entry) => entry.id), ['other-target', 'near', 'far']);
  assert.deepEqual(rankScores(entries, 'picture-match').map((entry) => entry.id), ['full-first', 'full-late', 'partial']);
  assert.equal(formatEventScore(timer('time', 22.34)), '22.34s');
  assert.equal(formatEventScore(picture('match', 100)), '100%');
  assert.equal(entries[0].id, 'far');
});

test('legacy points clear once; new results persist and keep top 100 per game', () => {
  const db = storage();
  db.setItem('ppm_kiosk_leaderboard', '[{"score":1000}]');
  db.setItem('ppm_vintage_match_best', '1500');
  assert.deepEqual(readEventScores(db), []);
  assert.equal(db.getItem('ppm_kiosk_leaderboard'), null);
  assert.equal(db.getItem('ppm_vintage_match_best'), null);
  appendEventScore(db, timer('timer', 22.34));
  db.setItem('ppm_kiosk_leaderboard', 'migration already finished');
  assert.equal(readEventScores(db).length, 1);
  assert.equal(db.getItem('ppm_kiosk_leaderboard'), 'migration already finished');
  for (let i = 0; i < 105; i++) appendEventScore(db, picture(`picture-${i}`, i % 101));
  const saved = readEventScores(db);
  assert.equal(saved.filter((entry) => entry.mode === 'picture-match').length, 100);
  assert.equal(saved.filter((entry) => entry.mode === 'target-timer').length, 1);
  assert.equal(rankScores(saved, 'picture-match')[0].percentage, 100);
});

test('corrupt data and storage failures are explicit, not overwritten with empty standings', () => {
  const db = storage();
  for (const raw of ['invalid json', '{}', '[{"mode":"picture-match","percentage":150}]']) {
    db.setItem(EVENT_SCORES_KEY, raw);
    assert.throws(() => readEventScores(db));
    assert.equal(db.getItem(EVENT_SCORES_KEY), raw);
  }
  assert.equal(isEventScore(timer('bad', NaN)), false);
  assert.equal(isEventScore(picture('bad', -1)), false);
  assert.throws(() => appendEventScore(db, picture('bad', 101)));
  assert.throws(() => readEventScores({ getItem() { throw new Error('Storage disabled'); } }));
});
