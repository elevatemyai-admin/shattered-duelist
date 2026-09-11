// GET /api/duel/list?code=CLAY294 -> every duel this player is part of,
// with whose turn it is, so the Friends tab can show "Your turn" vs "Waiting".

const { findMany } = require("../_airtable");

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ error: "Method not allowed" });
    }
    const { code } = req.query;
    if (!code) return res.status(400).json({ error: "Missing ?code=" });
    const upper = code.toUpperCase();
    const formula = `OR({Player1Code}="${upper}", {Player2Code}="${upper}")`;
    const records = await findMany("Duels", { formula, maxRecords: 50 });

    const duels = records.map(r => {
      const isP1 = r.fields.Player1Code === upper;
      const myTurnStatus = isP1 ? "p1_turn" : "p2_turn";
      return {
        duelId: r.fields.DuelID,
        opponent: isP1 ? r.fields.Player2Code : r.fields.Player1Code,
        status: r.fields.Status,
        isMyTurn: r.fields.Status === myTurnStatus,
        complete: r.fields.Status === "complete",
        winner: r.fields.WinnerCode || null,
        youWon: r.fields.WinnerCode === upper,
      };
    });

    return res.status(200).json({ duels });
  } catch (err) {
    console.error(err);
    return res.status(err.status || 500).json({ error: err.message || "Server error" });
  }
};
