// GET /api/duel/state?duelId=DUEL-123 -> current GameState JSON + whose turn it is

const { findOne } = require("../_airtable");

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ error: "Method not allowed" });
    }
    const { duelId } = req.query;
    if (!duelId) return res.status(400).json({ error: "Missing ?duelId=" });
    const record = await findOne("Duels", "DuelID", duelId);
    if (!record) return res.status(404).json({ error: "Duel not found" });
    return res.status(200).json({
      duelId,
      status: record.fields.Status,
      gameState: JSON.parse(record.fields.GameState || "{}"),
      player1: record.fields.Player1Code,
      player2: record.fields.Player2Code,
      winner: record.fields.WinnerCode || null,
    });
  } catch (err) {
    console.error(err);
    return res.status(err.status || 500).json({ error: err.message || "Server error" });
  }
};
