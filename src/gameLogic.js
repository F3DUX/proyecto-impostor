// Core game logic for Impostor Futbolero.
// Implements tallying votes and advancing rounds exactly as per spec.

// Utility shuffle function used when generating new turn order.
function shuffle(arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Tally votes for the current round and update the room accordingly.
 *
 * @param {Object} room          Current room document snapshot data.
 * @param {Array<Object>} votes  Votes for the round [{voterUid, targetUid}].
 * @param {Array<Object>} players List of players with `uid` and `alive`.
 * @param {Object} deps          Dependency bag with Firestore helpers:
 *   - updateRoom(partial)
 *   - setPlayerAlive(uid, alive)
 *   - deleteVotesRound(round)
 *
 * The function mirrors the pseudocode in the specification. If there is a
 * clear winner, the player is marked as not alive and the remaining counts are
 * evaluated: if the game ends it sets `phase="end"` with the proper winner,
 * otherwise it fills `lastExpelled`/`lastExpelledWasImpostor` and moves to
 * `phase="reveal"`. On tie, it goes back to `phase="vote"` with the
 * `tieCandidates` filled after clearing the votes so a re-vote can happen.
 */
async function tallyAndAdvance(room, votes, players, deps) {
  const counts = {};
  for (const v of votes) {
    // Ignore votes targeting dead players (should not happen, but defensive).
    const targetAlive = players.find(p => p.uid === v.targetUid && p.alive);
    if (!targetAlive) continue;
    counts[v.targetUid] = (counts[v.targetUid] || 0) + 1;
  }

  const max = Math.max(...Object.values(counts), 0);
  const top = Object.entries(counts)
    .filter(([_, c]) => c === max)
    .map(([uid]) => uid);

  // Tie => start re-vote between top candidates and wipe previous votes.
  if (top.length !== 1) {
    await deps.deleteVotesRound(room.round);
    await deps.updateRoom({ phase: 'vote', tieCandidates: top });
    return { phase: 'vote', tieCandidates: top };
  }

  // Clear winner => expel and evaluate victory conditions.
  const expelled = top[0];
  await deps.setPlayerAlive(expelled, false); // a) mark expelled player

  const expIsImp = room.impostorUids.includes(expelled);
  const newImpostorUids = expIsImp
    ? room.impostorUids.filter(u => u !== expelled)
    : room.impostorUids;

  const survivors = players.filter(p => p.uid !== expelled && p.alive);
  const impsAfter = survivors.filter(p => newImpostorUids.includes(p.uid)).length;
  const innocentsAfter = survivors.length - impsAfter;

  if (impsAfter === 0) {
    await deps.updateRoom({
      phase: 'end',
      winner: 'innocents',
      lastExpelled: expelled,
      lastExpelledWasImpostor: expIsImp,
      impostorUids: newImpostorUids,
      tieCandidates: null
    });
    await deps.deleteVotesRound(room.round);
    return { phase: 'end', winner: 'innocents', expelled };
  }

  if (impsAfter >= innocentsAfter) {
    await deps.updateRoom({
      phase: 'end',
      winner: 'impostor',
      lastExpelled: expelled,
      lastExpelledWasImpostor: expIsImp,
      impostorUids: newImpostorUids,
      tieCandidates: null
    });
    await deps.deleteVotesRound(room.round);
    return { phase: 'end', winner: 'impostor', expelled };
  }

  await deps.updateRoom({
    phase: 'reveal',
    lastExpelled: expelled,
    lastExpelledWasImpostor: expIsImp,
    impostorUids: newImpostorUids,
    tieCandidates: null // c) remove tie candidates so re-vote button disappears
  });

  await deps.deleteVotesRound(room.round); // d) clear votes of the round
  return { phase: 'reveal', expelled };
}

/**
 * Continue from the reveal screen to the next step depending on remaining
 * players.
 *
 * @param {Object} room
 * @param {Array<Object>} players
 * @param {Object} deps Dependency bag:
 *   - updateRoom(partial)
 *   - clearVotesRound(round)
 *
 * Votes were cleared when tallying, but we clean again just in case and
 * initialise state for the next round.
 */
async function continueToNextRound(room, players, deps) {
  const alive = players.filter(p => p.alive);

  // Clear votes of the previous round before changing state.
  await deps.clearVotesRound(room.round);

  // Next round with new turn order of alive players only.
  const nextOrder = shuffle(alive.map(p => p.uid));
  await deps.updateRoom({
    phase: 'clues',
    round: room.round + 1,
    turnOrder: nextOrder,
    turnIndex: 0,
    tieCandidates: null,
    lastExpelled: null,
    lastExpelledWasImpostor: null
  });
  return 'next-round';
}

module.exports = {
  tallyAndAdvance,
  continueToNextRound,
  shuffle
};

