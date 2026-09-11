// Shared helper for talking to Airtable from Vercel Serverless Functions.
// Requires two environment variables, set in the Vercel project dashboard
// (Project -> Settings -> Environment Variables) — never in the code itself:
//   AIRTABLE_API_KEY  = your Personal Access Token
//   AIRTABLE_BASE_ID  = the base ID (starts with "app...")

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const BASE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

async function airtableRequest(path, options = {}) {
  const res = await fetch(`${BASE_URL}/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data?.error?.message || "Airtable request failed");
    err.status = res.status;
    err.details = data;
    throw err;
  }
  return data;
}

// Find a single record by an exact-match field value. Returns null if not found.
async function findOne(table, field, value) {
  const formula = encodeURIComponent(`{${field}} = "${value}"`);
  const data = await airtableRequest(`${table}?filterByFormula=${formula}&maxRecords=1`);
  return data.records[0] || null;
}

async function findMany(table, { formula, sort, maxRecords } = {}) {
  const params = new URLSearchParams();
  if (formula) params.set("filterByFormula", formula);
  if (maxRecords) params.set("maxRecords", String(maxRecords));
  if (sort) sort.forEach((s, i) => {
    params.set(`sort[${i}][field]`, s.field);
    params.set(`sort[${i}][direction]`, s.direction || "asc");
  });
  const data = await airtableRequest(`${table}?${params.toString()}`);
  return data.records;
}

async function createRecord(table, fields) {
  const data = await airtableRequest(table, {
    method: "POST",
    body: JSON.stringify({ fields }),
  });
  return data;
}

async function updateRecord(table, recordId, fields) {
  const data = await airtableRequest(`${table}/${recordId}`, {
    method: "PATCH",
    body: JSON.stringify({ fields }),
  });
  return data;
}

function randomCode(prefix = "", length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let out = prefix;
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

module.exports = { airtableRequest, findOne, findMany, createRecord, updateRecord, randomCode };
