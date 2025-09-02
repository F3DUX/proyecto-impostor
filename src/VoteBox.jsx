import React from 'react';

/**
 * Dropdown + button to submit a vote. The list of options only includes
 * players that are alive and, when `limitTo` is provided, is restricted to
 * that subset (used during re-vote).
 */
export default function VoteBox({ players, meUid, limitTo, value, onChange, onSubmit }) {
  const me = players.find(p => p.uid === meUid);
  const options = players
    .filter(p => p.alive)
    .filter(p => !limitTo || limitTo.includes(p.uid));

  // 2) Si el jugador fue expulsado, no debe ver el selector de voto.
  if (!me?.alive) {
    return <div className="vote-box">Estás expulsado, no podés votar</div>;
  }

  return (
    <div className="vote-box">
      <select value={value} onChange={e => onChange(e.target.value)}>
        <option value="">Elegí jugador...</option>
        {options.map(p => (
          <option key={p.uid} value={p.uid} disabled={p.uid === meUid}>
            {p.name}
          </option>
        ))}
      </select>
      <button onClick={onSubmit} disabled={!value || value === meUid}>
        Votar
      </button>
    </div>
  );
}

