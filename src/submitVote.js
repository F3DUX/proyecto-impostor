// Handles client-side validation before writing a vote document.
// Ensures that a player cannot vote themselves, only alive players can vote
// and that candidates are restricted during a re-vote.

/**
 * @param {Object} room Room data including `round` and optional `tieCandidates`.
 * @param {Array<Object>} players All players with uid & alive.
 * @param {string} voterUid UID of the voter.
 * @param {string} targetUid UID being voted.
 * @param {Object} deps Dependency bag with Firestore helper `saveVote(data)`.
 */
async function submitVote(room, players, voterUid, targetUid, deps) {
  const voter = players.find(p => p.uid === voterUid);
  const target = players.find(p => p.uid === targetUid);

  // 1) Un jugador expulsado no puede volver a votar.
  if (!voter || !voter.alive) {
    throw new Error('Estás expulsado, no podés votar');
  }
  if (voterUid === targetUid) {
    throw new Error('No podés votarte');
  }
  if (!target || !target.alive) {
    throw new Error('El jugador no está disponible para votar.');
  }
  if (room.tieCandidates && !room.tieCandidates.includes(targetUid)) {
    throw new Error('Solo se puede votar entre los empatados.');
  }

  // All validations passed – persist vote.
  await deps.saveVote({
    round: room.round,
    voterUid,
    targetUid,
    at: new Date().toISOString()
  });
}

module.exports = submitVote;

