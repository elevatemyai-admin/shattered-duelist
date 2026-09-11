// POST /api/band { action:"create", ownerCode, bandName }
// POST /api/band { action:"join", playerCode, inviteCode }
// GET  /api/band?bandId=BAND123 -> band details + member list

const { findOne, findMany, createRecord, updateRecord, randomCode } = require("./_airtable");

const BANDS = "Bands";
const PLAYERS = "Players";

module.exports = async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { bandId } = req.query;
      if (!bandId) return res.status(400).json({ error: "Missing ?bandId=" });
      const record = await findOne(BANDS, "BandID", bandId);
      if (!record) return res.status(404).json({ error: "Band not found" });
      const memberCodes = JSON.parse(record.fields.Members || "[]");
      return res.status(200).json({ ...record.fields, memberCodes });
    }

    if (req.method === "POST") {
      const { action } = req.body || {};

      if (action === "create") {
        const { ownerCode, bandName } = req.body;
        if (!ownerCode || !bandName) return res.status(400).json({ error: "ownerCode and bandName are required" });
        const bandId = randomCode("BAND-", 5);
        const inviteCode = randomCode("", 6);
        const record = await createRecord(BANDS, {
          BandID: bandId,
          BandName: bandName,
          OwnerCode: ownerCode,
          InviteCode: inviteCode,
          Members: JSON.stringify([ownerCode]),
        });
        await updateRecord(PLAYERS, (await findOne(PLAYERS, "PlayerCode", ownerCode)).id, { BandID: bandId });
        return res.status(201).json(record.fields);
      }

      if (action === "join") {
        const { playerCode, inviteCode } = req.body;
        if (!playerCode || !inviteCode) return res.status(400).json({ error: "playerCode and inviteCode are required" });
        const band = await findOne(BANDS, "InviteCode", inviteCode.toUpperCase());
        if (!band) return res.status(404).json({ error: "Invalid invite code" });
        const members = JSON.parse(band.fields.Members || "[]");
        if (!members.includes(playerCode)) members.push(playerCode);
        await updateRecord(BANDS, band.id, { Members: JSON.stringify(members) });
        const player = await findOne(PLAYERS, "PlayerCode", playerCode);
        if (player) await updateRecord(PLAYERS, player.id, { BandID: band.fields.BandID });
        return res.status(200).json({ ...band.fields, Members: JSON.stringify(members) });
      }

      return res.status(400).json({ error: "Unknown action. Use 'create' or 'join'." });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error(err);
    return res.status(err.status || 500).json({ error: err.message || "Server error" });
  }
};
