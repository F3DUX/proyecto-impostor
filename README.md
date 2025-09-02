# Proyecto Impostor

This repository contains a minimal implementation of the core logic for the
**Impostor Futbolero** game. The important pieces are:

- `src/gameLogic.js` – functions `tallyAndAdvance` and `continueToNextRound`.
- `src/submitVote.js` – client side validation for voting.
- `src/VoteBox.jsx` – React component that only lists alive players and honours
  the optional `limitTo` list during a re-vote and hides the selector if the
  user was expelled.
- `src/RoomView.jsx` – simplified view showing the conditional rendering of the
  re-vote card, the reveal screen and the host-only auto tally behaviour.

## Manual test script

Run the following script to simulate two rounds with four players. The first
round expels an innocent, the second one expels another innocent which leads to
parity (1 impostor vs 1 innocent) and therefore an impostor victory. A variant
is included where the impostor is expelled in round 2.

```bash
node test/gameLogic.test.js
```

Expected output shows the room phase advancing to `reveal` after each round and
finally to `end` with `winner: "impostor"`.

## Manual test plan

1. **Ronda 1 – expulsan inocente**
   - Todos votan a un inocente.
   - Se pasa a `phase="reveal"` mostrando que era inocente.
   - Host presiona continuar y comienza la ronda 2.
   - El expulsado ya no puede votar en rondas futuras.
2. **Ronda 2 – expulsan inocente**
   - De nuevo se expulsa un inocente.
   - Quedan 1 impostor y 1 inocente → `phase="end"`, ganador impostor.
3. **Variante**
   - Si en la segunda ronda expulsan al impostor, `phase="end"` muestra
     ganador inocentes.

These cases are covered in the script above but can also be tested manually in a
full application.

