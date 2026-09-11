// GET /api/leaderboard?limit=20 -> top players ranked by Wins

const { findMany } = require("./_airtable");

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ error: "Method not allowed" });
    }
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const records = await findMany("Players", {
      sort: [{ field: "Wins", direction: "desc" }],
      maxRecords: limit,
    });
    const leaderboard = records.map((r, i) => ({
      rank: i + 1,
      code: r.fields.PlayerCode,
      name: r.fields.DisplayName,
      avatar: r.fields.Avatar,
      wins: r.fields.Wins || 0,
      losses: r.fields.Losses || 0,
    }));
    return res.status(200).json({ leaderboard });
  } catch (err) {
    console.error(err);
    return res.status(err.status || 500).json({ error: err.message || "Server error" });
  }
};
