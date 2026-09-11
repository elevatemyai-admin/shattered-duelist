# Shattered Duelist — Backend

Vercel Serverless Functions that sit between the game and your Airtable base.
The game's frontend never talks to Airtable directly — it calls these endpoints,
and these endpoints hold the Airtable API key.

## Setup

1. **Add this to your existing repo.** Drop the `api/` folder into the same
   GitHub repo as `index.html`, at the repo root (so you end up with
   `/index.html` and `/api/player.js` etc. side by side). Commit and push.

2. **Create the Airtable base** with 4 tables — see the schema in the main
   chat. Table names must match exactly: `Players`, `Bands`, `Duels`, `Tags`.

3. **Get your Airtable credentials:**
   - API key: airtable.com/create/tokens → create a token with
     `data.records:read` and `data.records:write` scopes, granted access to
     this specific base.
   - Base ID: open the base → Help → API documentation → it's shown at the
     top (starts with `app`).

4. **Add environment variables in Vercel:**
   Project → Settings → Environment Variables:
   - `AIRTABLE_API_KEY` = your token
   - `AIRTABLE_BASE_ID` = your base ID

   Redeploy after adding these (Vercel only picks up env vars on a fresh deploy).

## Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/player` | GET | Fetch a player by `?code=` |
| `/api/player` | POST | Create a new player, returns a PlayerCode |
| `/api/player` | PATCH | Save progress (fragments, collection, deck, etc.) |
| `/api/leaderboard` | GET | Top players by wins |
| `/api/band` | GET | Fetch a Band of Brothers group by `?bandId=` |
| `/api/band` | POST | Create a group, or join one via invite code |
| `/api/duel/challenge` | POST | Tag a friend to start an async duel |
| `/api/duel/list` | GET | List a player's duels by `?code=`, with whose turn it is |
| `/api/duel/state` | GET | Fetch a duel's current board state |
| `/api/duel/move` | POST | Submit a turn, flips play to the other player |

## Current trust model (read this before scaling up)

The actual game rules — summoning, combat math, phase order — still run in
each player's own browser, same as single-player mode. `/api/duel/move` checks
that it's really your turn and the duel isn't already finished, then stores
whatever board state your browser sends and hands the turn to the other
player. It does **not** re-simulate every rule server-side to catch a
tampered request.

That's a fine, normal setup for friends playing each other. If this ever needs
to be cheat-proof (real prizes, public competition, strangers playing), the
rules engine needs to move server-side so the server computes outcomes
instead of trusting the client. That's a bigger follow-up project, not
something to bolt on later as an afterthought — flag it if that day comes.

## Not built yet

- Notifications when it's your turn (Airtable Automations can email/Slack on
  a new Tags record — worth setting up once the Tags table exists).
- Rate limiting / abuse protection on the endpoints themselves.
- The Tags table is written to on every challenge but nothing reads it yet —
  right now "My Duels" comes from the Duels table directly, which is enough
  to know whose turn it is. Tags becomes useful once you want a proper
  notifications inbox, or Band-invite tracking beyond the invite code itself.
