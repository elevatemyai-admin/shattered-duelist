// GET   /api/player?code=CLAY294            -> fetch by PlayerCode
// GET   /api/player?email=you@email.com      -> fetch by Email
// POST  /api/player  { email, displayName, avatar }
//   -> "continue with email": if that email already has a profile, returns
//      the EXISTING record (a lightweight sign-in, no password needed);
//      otherwise creates a brand new one with a fresh PlayerCode.
// PATCH /api/player  { code, ...fieldsToUpdate } -> save progress

const { findOne, createRecord, updateRecord, randomCode } = require("./_airtable");

const TABLE = "Players";

module.exports = async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { code, email } = req.query;
      let record = null;
      if (code) record = await findOne(TABLE, "PlayerCode", code.toUpperCase());
      else if (email) record = await findOne(TABLE, "Email", email.toLowerCase().trim());
      else return res.status(400).json({ error: "Provide ?code= or ?email=" });
      if (!record) return res.status(404).json({ error: "Player not found" });
      return res.status(200).json({ id: record.id, ...record.fields });
    }

    if (req.method === "POST") {
      const { displayName, avatar } = req.body || {};
      const email = (req.body?.email || "").toLowerCase().trim();
      if (!email) return res.status(400).json({ error: "email is required" });
      if (!displayName) return res.status(400).json({ error: "displayName is required" });

      // "Continue with email": an existing profile for this email signs back in as-is.
      const existing = await findOne(TABLE, "Email", email);
      if (existing) return res.status(200).json({ id: existing.id, ...existing.fields });

      // Otherwise, create a new profile with a fresh shareable PlayerCode.
      let code;
      for (let attempt = 0; attempt < 5; attempt++) {
        code = randomCode("", 7);
        const clash = await findOne(TABLE, "PlayerCode", code);
        if (!clash) break;
      }
      const record = await createRecord(TABLE, {
        PlayerCode: code,
        Email: email,
        DisplayName: displayName,
        Avatar: avatar || "🙂",
        Fragments: 240,
        Collection: "{}",
        DeckCounts: "{}",
        ExtraDeckPick: "extra-1",
        Wins: 0,
        Losses: 0,
        LastActive: new Date().toISOString(),
      });
      return res.status(201).json({ id: record.id, ...record.fields });
    }

    if (req.method === "PATCH") {
      const { code, ...updates } = req.body || {};
      if (!code) return res.status(400).json({ error: "code is required" });
      const record = await findOne(TABLE, "PlayerCode", code.toUpperCase());
      if (!record) return res.status(404).json({ error: "Player not found" });
      // Only allow known fields to be updated, so a tampered request can't write arbitrary data.
      const allowed = ["DisplayName", "Avatar", "Fragments", "Collection", "DeckCounts", "ExtraDeckPick", "Wins", "Losses", "BandID"];
      const fields = {};
      for (const key of allowed) if (key in updates) fields[key] = updates[key];
      fields.LastActive = new Date().toISOString();
      const updated = await updateRecord(TABLE, record.id, fields);
      return res.status(200).json({ id: updated.id, ...updated.fields });
    }

    res.setHeader("Allow", "GET, POST, PATCH");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error(err);
    return res.status(err.status || 500).json({ error: err.message || "Server error" });
  }
};
