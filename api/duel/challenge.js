// POST /api/duel/challenge { fromCode, toCode }
// Creates a pending Duel + a Tag notification the other player will see.
// The challenger (Player1) gets the opening turn, on a fresh empty board,
// matching the "going first skips your Draw Phase" rule from single-player.

const { findOne, createRecord, randomCode } = require("../_airtable");

const EMPTY_ZONE = [null, null, null, null, null];

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method not allowed" });
    }
    const { fromCode, toCode } = req.body || {};
    if (!fromCode || !toCode) return res.status(400).json({ error: "fromCode and toCode are required" });
    if (fromCode.toUpperCase() === toCode.toUpperCase()) return res.status(400).json({ error: "You can't challenge yourself" });

    const toPlayer = await findOne("Players", "PlayerCode", toCode.toUpperCase());
    if (!toPlayer) return res.status(404).json({ error: "That player code doesn't exist" });

    const duelId = randomCode("DUEL-", 6);
    const initialState = {
      p1Mon: EMPTY_ZONE, p1ST: EMPTY_ZONE, p1LP: 4000,
      p2Mon: EMPTY_ZONE, p2ST: EMPTY_ZONE, p2LP: 4000,
      graveCount: 0, turnNum: 1, phaseIdx: 1, // challenger goes first, skips their Draw Phase
    };
    const duel = await createRecord("Duels", {
      DuelID: duelId,
      Player1Code: fromCode.toUpperCase(),
      Player2Code: toCode.toUpperCase(),
      Status: "p1_turn",
      GameState: JSON.stringify(initialState),
    });

    await createRecord("Tags", {
      TagID: randomCode("TAG-", 6),
      FromCode: fromCode.toUpperCase(),
      ToCode: toCode.toUpperCase(),
      Type: "duel_challenge",
      Status: "pending",
      RelatedID: duelId,
    });

    return res.status(201).json({ duelId, status: duel.fields.Status });
  } catch (err) {
    console.error(err);
    return res.status(err.status || 500).json({ error: err.message || "Server error" });
  }
};
