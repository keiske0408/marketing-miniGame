import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS } from '../config/constants.ts';
import { designPalette, displayedSeconds, formatTimerClock, normalizeSettings, overlapPercentage, timerRules, timerWon, validTimerRules } from '../services/eventRules.ts';
import { appendEventScore, EVENT_SCORES_KEY, formatEventScore, isEventScore, rankScores, readEventScores } from '../services/eventScores.ts';

const rules = { target: 23, winMin: 22.34, winMax: 23.99 };
const timer = (id, elapsed, target = 23, createdAt = 1) => ({
  id, name: 'Test player', createdAt, mode: 'target-timer', ...rules, target, elapsed,
});
const picture = (id, percentage, createdAt = 1) => ({
  id, name: 'Test player', createdAt, mode: 'picture-match', percentage,
});
const multiPicture = (id, matches, percentage, createdAt = 1) => ({
  id, name: 'Test player', createdAt, mode: 'picture-match', matches, percentage,
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
  for (const [elapsed, won] of [[22.33, false], [22.34, true], [23, true], [23.68, true], [23.99, true], [24, false]]) {
    assert.equal(timerWon({ ...rules, elapsed }), won);
  }
  assert.equal(displayedSeconds(22.3351), 22.34);
  assert.equal(timerWon({ ...rules, elapsed: 22.3351 }), true);
  assert.equal(displayedSeconds(23.9951), 24);
  assert.equal(timerWon({ ...rules, elapsed: 23.9951 }), false);
  assert.equal(timerWon({ target: 3.25, winMin: 3.21, winMax: 3.29, elapsed: 3.25 }), true);
});

test('live clock formatting carries rounded hundredths into seconds and minutes', () => {
  for (const [seconds, clock] of [
    [0, '00:00.00'], [23, '00:23.00'], [23.9951, '00:24.00'],
    [59.9951, '01:00.00'], [60.0051, '01:00.01'], [300, '05:00.00'],
  ]) assert.equal(formatTimerClock(seconds), clock);
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
  assert.equal(settings.pictureMatchMode, 'multi');
  assert.equal(normalizeSettings({ pictureMatchMode: 'single' }).pictureMatchMode, 'single');
  assert.equal(normalizeSettings({ pictureMatchMode: 'invalid' }).pictureMatchMode, 'multi');
  assert.deepEqual(timerRules(normalizeSettings({ timerWinMin: 25, timerWinMax: 20 })), rules);
});

test('design, guidelines, and leaderboard settings keep valid choices and repair invalid ones', () => {
  const defaults = normalizeSettings({});
  assert.equal(defaults.designColor, 'violet');
  assert.equal(defaults.eventBackground, 'ribbon');
  assert.equal(defaults.showLeaderboard, true);
  assert.equal(defaults.showGuidelines, true);
  const chosen = normalizeSettings({ designColor: 'custom', customDesignColor: '#3A7BD5', eventBackground: 'circles', showLeaderboard: false, showGuidelines: false });
  assert.equal(chosen.designColor, 'custom');
  assert.equal(chosen.customDesignColor, '#3A7BD5');
  assert.equal(chosen.eventBackground, 'circles');
  assert.equal(chosen.showLeaderboard, false);
  assert.equal(chosen.showGuidelines, false);
  const repaired = normalizeSettings({ designColor: 'red', customDesignColor: 'url(x)', eventBackground: 'beach', showLeaderboard: 'no', showGuidelines: 'no' });
  assert.equal(repaired.designColor, 'violet');
  assert.equal(repaired.customDesignColor, '#210e64');
  assert.equal(repaired.eventBackground, 'ribbon');
  assert.equal(repaired.showLeaderboard, true);
  assert.equal(repaired.showGuidelines, true);
});

test('design palettes keep the violet default exact and panels readable for light colours', () => {
  assert.equal(designPalette({ designColor: 'violet' }), null);
  assert.equal(designPalette({ designColor: 'custom', customDesignColor: '#210E64' }), null);
  const luminance = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  for (const choice of [{ designColor: 'mischka' }, { designColor: 'slate' }, { designColor: 'custom', customDesignColor: '#ffffff' }]) {
    const palette = designPalette(choice);
    for (const surface of [palette.panel, palette.card.slice(0, 7), palette.cardHover]) {
      assert.ok(1.05 / (luminance(surface) + 0.05) >= 4.5, `${surface} must keep white text readable`);
    }
  }
  assert.equal(designPalette({ designColor: 'mischka' }).color, '#e0dae6');
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
    multiPicture('one-match', 1, 25), multiPicture('three-matches', 3, 10),
  ];
  assert.deepEqual(rankScores(entries, 'target-timer').map((entry) => entry.id), ['other-target', 'near', 'far']);
  assert.deepEqual(rankScores(entries, 'picture-match').map((entry) => entry.id), ['three-matches', 'one-match', 'full-first', 'full-late', 'partial']);
  assert.equal(formatEventScore(timer('time', 22.34)), '22.34s');
  assert.equal(formatEventScore(picture('match', 100)), '100%');
  assert.equal(formatEventScore(multiPicture('one', 1, 72)), '1 match');
  assert.equal(formatEventScore(multiPicture('zero', 0, 0)), '0 matches');
  assert.equal(formatEventScore(multiPicture('one', 1, 72), (text) => text === 'match' ? 'tugma' : 'mga tugma'), '1 tugma');
  assert.equal(isEventScore(multiPicture('fraction', 1.5, 72)), false);
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
