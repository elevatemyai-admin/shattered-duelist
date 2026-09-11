// POST /api/duel/move { duelId, playerCode, newGameState, winnerCode? }
//
// IMPORTANT — current trust model:
// The actual game rules (summoning, combat math, phase order) still run in the
// player's own browser, same as the single-player mode. This endpoint checks that
// it's really that player's turn and that the duel is still open, then stores
// whatever GameState the client sends and flips the turn to the other player.
// It does NOT re-simulate the rules to catch a tampered request. That's fine for
// friends playing each other in good faith; if this ever needs to be cheat-proof
// (e.g. real prize competitions), the rules engine would need to move server-side
// so the server computes the result instead of trusting the client's version.

const { findOne, updateRecord } = require("../_airtable");

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method not allowed" });
    }
    const { duelId, playerCode, newGameState, winnerCode } = req.body || {};
    if (!duelId || !playerCode || !newGameState) {
      return res.status(400).json({ error: "duelId, playerCode, and newGameState are required" });
    }

    const duel = await findOne("Duels", "DuelID", duelId);
    if (!duel) return res.status(404).json({ error: "Duel not found" });
    if (duel.fields.Status === "complete") return res.status(409).json({ error: "This duel is already over" });

    const isPlayer1 = duel.fields.Player1Code === playerCode;
    const isPlayer2 = duel.fields.Player2Code === playerCode;
    if (!isPlayer1 && !isPlayer2) return res.status(403).json({ error: "You're not part of this duel" });

    const currentTurnField = duel.fields.Status; // "p1_turn" | "p2_turn"
    const myTurnField = isPlayer1 ? "p1_turn" : "p2_turn";
    if (currentTurnField !== myTurnField) {
      return res.status(409).json({ error: "It's not your turn yet" });
    }

    const nextStatus = winnerCode ? "complete" : (isPlayer1 ? "p2_turn" : "p1_turn");
    const updated = await updateRecord("Duels", duel.id, {
      GameState: JSON.stringify(newGameState),
      Status: nextStatus,
      ...(winnerCode ? { WinnerCode: winnerCode } : {}),
    });

    // Update win/loss records once the duel concludes.
    if (winnerCode) {
      const loserCode = winnerCode === duel.fields.Player1Code ? duel.fields.Player2Code : duel.fields.Player1Code;
      const winner = await findOne("Players", "PlayerCode", winnerCode);
      const loser = await findOne("Players", "PlayerCode", loserCode);
      if (winner) await updateRecord("Players", winner.id, { Wins: (winner.fields.Wins || 0) + 1 });
      if (loser) await updateRecord("Players", loser.id, { Losses: (loser.fields.Losses || 0) + 1 });
    }

    return res.status(200).json({ status: updated.fields.Status });
  } catch (err) {
    console.error(err);
    return res.status(err.status || 500).json({ error: err.message || "Server error" });
  }
};
