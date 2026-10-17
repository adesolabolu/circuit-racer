import test from 'node:test';
import assert from 'node:assert/strict';
import { LeaderboardState, STORAGE_KEY, SEED_DATA } from '../src/state/LeaderboardState.js';
import { TRACK_LIST, getSelectedTrackId, setSelectedTrackId } from '../src/scene/TrackRegistry.js';

test('Track Registry contains all three official circuits', () => {
  assert.equal(TRACK_LIST.length, 3);
  assert.deepEqual(
    TRACK_LIST.map((t) => t.id),
    ['workbench-gp', 'velocity-oval', 'figure-8']
  );

  for (const track of TRACK_LIST) {
    assert.ok(track.name);
    assert.ok(track.file);
    assert.ok(track.lengthMeters > 0);
    assert.ok(track.scaleLengthMeters > 0);
  }

  setSelectedTrackId('velocity-oval');
  assert.equal(getSelectedTrackId(), 'velocity-oval');
  setSelectedTrackId('workbench-gp');
});

test('Clean deployment: Leaderboards start empty with no fake/mock entries', () => {
  LeaderboardState.clearAll();

  assert.equal(STORAGE_KEY, 'circuit_racer_leaderboards_clean_v1');
  assert.deepEqual(SEED_DATA['workbench-gp'], []);
  assert.deepEqual(SEED_DATA['velocity-oval'], []);
  assert.deepEqual(SEED_DATA['figure-8'], []);

  assert.deepEqual(LeaderboardState.getLeaderboard('workbench-gp'), []);
  assert.deepEqual(LeaderboardState.getLeaderboard('velocity-oval'), []);
  assert.deepEqual(LeaderboardState.getLeaderboard('figure-8'), []);

  assert.equal(LeaderboardState.getBestLap('workbench-gp'), null);
  assert.equal(LeaderboardState.getBestLap('velocity-oval'), null);
  assert.equal(LeaderboardState.getBestLap('figure-8'), null);

  assert.equal(LeaderboardState.getPersonalBest('workbench-gp'), null);
});

test('First recorded player lap sets Rank 1 and New Record', () => {
  LeaderboardState.clearAll();

  const res1 = LeaderboardState.recordLapTime('workbench-gp', {
    playerName: 'Player1',
    lapTime: 14.50,
    kartName: 'Proto-Buggy #87',
    cleanRun: true,
  });

  assert.equal(res1.isNewRecord, true);
  assert.equal(res1.isPersonalBest, true);
  assert.equal(res1.rank, 1);
  assert.equal(LeaderboardState.getBestLap('workbench-gp'), 14.50);
  assert.equal(LeaderboardState.getPersonalBest('workbench-gp', 'Player1'), 14.50);

  const board = LeaderboardState.getLeaderboard('workbench-gp');
  assert.equal(board.length, 1);
  assert.equal(board[0].playerName, 'Player1');
  assert.equal(board[0].lapTime, 14.50);
  assert.equal(board[0].rank, 1);
});

test('Subsequent slower lap ranks #2; faster lap takes #1 and sets New Record', () => {
  LeaderboardState.clearAll();

  // 1. Initial 15.00s lap
  LeaderboardState.recordLapTime('workbench-gp', {
    playerName: 'RacerA',
    lapTime: 15.00,
    kartName: 'Micro-F1 Aero',
  });

  // 2. Slower 16.20s lap
  const resSlower = LeaderboardState.recordLapTime('workbench-gp', {
    playerName: 'RacerB',
    lapTime: 16.20,
    kartName: 'Resistor Rod',
  });
  assert.equal(resSlower.isNewRecord, false);
  assert.equal(resSlower.rank, 2);

  // 3. Faster 13.80s lap
  const resFaster = LeaderboardState.recordLapTime('workbench-gp', {
    playerName: 'RacerC',
    lapTime: 13.80,
    kartName: 'Micro-F1 Aero',
  });
  assert.equal(resFaster.isNewRecord, true);
  assert.equal(resFaster.rank, 1);

  const board = LeaderboardState.getLeaderboard('workbench-gp');
  assert.equal(board.length, 3);
  assert.equal(board[0].playerName, 'RacerC');
  assert.equal(board[0].lapTime, 13.80);
  assert.equal(board[0].rank, 1);

  assert.equal(board[1].playerName, 'RacerA');
  assert.equal(board[1].lapTime, 15.00);
  assert.equal(board[1].rank, 2);

  assert.equal(board[2].playerName, 'RacerB');
  assert.equal(board[2].lapTime, 16.20);
  assert.equal(board[2].rank, 3);
});

test('Leaderboard State clearAll() resets all circuits to empty', () => {
  LeaderboardState.clearAll();
  assert.equal(LeaderboardState.getLeaderboard('workbench-gp').length, 0);
  assert.equal(LeaderboardState.getLeaderboard('velocity-oval').length, 0);
  assert.equal(LeaderboardState.getLeaderboard('figure-8').length, 0);
});
