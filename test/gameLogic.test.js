const assert = require('assert');
const { tallyAndAdvance, continueToNextRound } = require('../src/gameLogic');
const submitVote = require('../src/submitVote');

// Helper to create dependency bags that simply mutate local objects.
function createDeps(room, players) {
  return {
    async updateRoom(partial) {
      Object.assign(room, partial);
    },
    async setPlayerAlive(uid, alive) {
      const p = players.find(pl => pl.uid === uid);
      if (p) p.alive = alive;
    },
    async deleteVotesRound() {
      // no-op for tests
    },
    async clearVotesRound() {
      // no-op for tests
    }
  };
}

(async () => {
  // --- Scenario 1: second round leads to impostor victory ---
  const room = {
    round: 1,
    phase: 'vote',
    impostorUids: ['d'],
    tieCandidates: null,
    lastExpelled: null,
    lastExpelledWasImpostor: null
  };
  const players = [
    { uid: 'a', name: 'A', alive: true },
    { uid: 'b', name: 'B', alive: true },
    { uid: 'c', name: 'C', alive: true },
    { uid: 'd', name: 'D', alive: true } // impostor
  ];
  const deps = createDeps(room, players);

  // Round 1: everyone votes C
  let votes = [
    { voterUid: 'a', targetUid: 'c' },
    { voterUid: 'b', targetUid: 'c' },
    { voterUid: 'c', targetUid: 'a' }, // irrelevant
    { voterUid: 'd', targetUid: 'c' }
  ];

  await tallyAndAdvance(room, votes, players, deps);
  assert.strictEqual(room.phase, 'reveal');
  assert.strictEqual(room.lastExpelled, 'c');
  assert.strictEqual(players.find(p => p.uid === 'c').alive, false);

  await continueToNextRound(room, players, deps);
  assert.strictEqual(room.phase, 'clues');
  assert.strictEqual(room.round, 2);
  assert.strictEqual(room.tieCandidates, null);

  // Expelled player cannot vote in later rounds
  try {
    await submitVote(room, players, 'c', 'a', { saveVote: async () => {} });
    assert.fail('Expelled player should not vote');
  } catch (err) {
    assert.ok(err.message.includes('Estás expulsado'));
  }

  // Round 2: A and D vote B -> B expelled leaving A vs D => impostor victory
  votes = [
    { voterUid: 'a', targetUid: 'b' },
    { voterUid: 'b', targetUid: 'a' },
    { voterUid: 'd', targetUid: 'b' }
  ];

  await tallyAndAdvance(room, votes, players, deps);
  assert.strictEqual(room.phase, 'end');
  assert.strictEqual(room.winner, 'impostor');
  console.log('Scenario 1 winner:', room.winner);

  // --- Scenario 2: second round expels impostor ---
  const room2 = {
    round: 1,
    phase: 'vote',
    impostorUids: ['d'],
    tieCandidates: null,
    lastExpelled: null,
    lastExpelledWasImpostor: null
  };
  const players2 = [
    { uid: 'a', name: 'A', alive: true },
    { uid: 'b', name: 'B', alive: true },
    { uid: 'c', name: 'C', alive: true },
    { uid: 'd', name: 'D', alive: true } // impostor
  ];
  const deps2 = createDeps(room2, players2);

  votes = [
    { voterUid: 'a', targetUid: 'c' },
    { voterUid: 'b', targetUid: 'c' },
    { voterUid: 'c', targetUid: 'a' },
    { voterUid: 'd', targetUid: 'c' }
  ];
  await tallyAndAdvance(room2, votes, players2, deps2);
  await continueToNextRound(room2, players2, deps2);

  // Round 2: everyone votes D (impostor)
  votes = [
    { voterUid: 'a', targetUid: 'd' },
    { voterUid: 'b', targetUid: 'd' },
    { voterUid: 'd', targetUid: 'a' }
  ];
  await tallyAndAdvance(room2, votes, players2, deps2);
  assert.strictEqual(room2.phase, 'end');
  assert.strictEqual(room2.winner, 'innocents');
  console.log('Scenario 2 winner:', room2.winner);
})();
