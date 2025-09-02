import React, { useEffect } from 'react';
import VoteBox from './VoteBox';

/**
 * Simplified room view showing how different phases render specific cards.
 * It highlights two key conditions from the spec:
 *  - The re-vote card only appears when `tieCandidates` has entries.
 *  - After a successful vote the reveal card is always shown with a single
 *    "Continuar" button for the host.
 */
export default function RoomView({ room, players, votes, meUid, hostUid, tallyAndAdvance }) {
  const alivePlayers = players.filter(p => p.alive);
  const isHost = meUid === hostUid;
  const isRevote = room.phase === 'vote' && room.tieCandidates?.length;

  // 3) Tally automático cuando todos los vivos ya votaron (solo host).
  useEffect(() => {
    const aliveCount = alivePlayers.length;
    if (
      isHost &&
      (room.phase === 'clues' || room.phase === 'vote') &&
      votes.length === aliveCount &&
      aliveCount > 0
    ) {
      tallyAndAdvance && tallyAndAdvance();
    }
  }, [votes.length, players, room.phase, isHost, tallyAndAdvance, meUid]);

  if (room.phase === 'vote') {
    return (
      <div>
        <h2>Votación</h2>
        {isRevote && <div className="revote">Re-voto por empate</div>}
        <VoteBox
          players={players}
          meUid={meUid}
          limitTo={room.tieCandidates}
          value={''}
          onChange={() => {}}
          onSubmit={() => {}}
        />
        {isHost && isRevote && <button>Cerrar re-voto</button>}
      </div>
    );
  }

  if (room.phase === 'reveal') {
    const expelled = players.find(p => p.uid === room.lastExpelled);
    return (
      <div className="reveal">
        <p>
          Expulsaron a <strong>{expelled ? expelled.name : 'alguien'}</strong> —{' '}
          {room.lastExpelledWasImpostor ? 'ERA IMPOSTOR' : 'ERA INOCENTE'}
        </p>
        {isHost && <button>Continuar a Ronda {room.round + 1}</button>}
      </div>
    );
  }

  return <div>Fase: {room.phase}</div>;
}

