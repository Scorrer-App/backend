# Kabaddi Scoring System — Backend Documentation

This document serves as a comprehensive reference guide to the architecture, MongoDB schemas, API endpoints, and business rules implemented in the Kabaddi Live-Scoring System.

---

## 1. Project Architecture

The backend is built as an intermediate-level Node.js application utilizing standard **Express** for the web tier and raw **MongoDB Driver** (v7.5) for the data tier. The project uses ES modules (`type: "module"`).

### Directory Structure

```text
Scorrer-App/backend
├── dot_md/                     # Documentation files
│   ├── project.md              # [This file] Backend architecture & guide
│   └── kabaddi_rule_book...    # Detailed rules comparisons
├── src/
│   ├── config/
│   │   ├── dbConnect/          # MongoDB init & collection helpers
│   │   └── env.js              # Environment variable loading
│   ├── middleware/             # Auth & Zod validation middleware
│   ├── modules/
│   │   ├── Auth/               # JWT Authentication and user roles
│   │   └── kabaddi/            # Main Kabaddi scoring module
│   │       ├── circle/         # Circle/Punjab rules engine
│   │       ├── international/  # Standard/National rules engine
│   │       ├── controllers/    # Grounds, teams, and matches endpoints
│   │       ├── routes/         # Router mappings
│   │       └── validations/    # Zod schemas for all actions
│   └── apiRoutes.js            # Base v1 router
├── server.js                   # Application bootstrap
└── package.json                # Dependencies and dev tools
```

---

## 2. Database Models & Schema

The application uses two distinct MongoDB databases:
1. `auth` — Stores user authentication records, roles, and tokens.
2. `kabaddi` — Stores match setups, playing teams, venues, scoring state, and stats.

### A. Auth Database Collections

#### `users`
Tracks registered players, captains, and administrators.
```json
{
  "_id": "ObjectId",
  "name": "string",
  "phone": "string (unique)",
  "gender": "enum ['male', 'female']",
  "password": "string (bcrypt hash)",
  "roles": ["users"],
  "dob": "Date | null",
  "address": "string | null",
  "city": "string | null",
  "state": "string | null",
  "Country": "string",
  "createdAt": "Date"
}
```

#### `refresh_tokens`
Manages user refresh tokens.
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "tokenHash": "string (SHA-256)",
  "expiresAt": "Date",
  "createdAt": "Date"
}
```

### B. Kabaddi Database Collections

#### `grounds`
Locations/stadiums where matches are scheduled.
```json
{
  "_id": "ObjectId",
  "name": "string",
  "city": "string",
  "country": "string"
}
```

#### `teams`
Playing squads containing registered players.
```json
{
  "_id": "ObjectId",
  "name": "string",
  "players": [
    {
      "userId": "ObjectId",
      "role": "enum ['raider', 'defender', 'all_rounder']",
      "isCaptain": "boolean"
    }
  ],
  "createdAt": "Date"
}
```

#### `matches`
The core entity, storing scheduled parameters and live match state snapshot.
```json
{
  "_id": "ObjectId",
  "groundId": "ObjectId",
  "teamAId": "ObjectId",
  "teamBId": "ObjectId",
  "format": "enum ['international', 'circle']",
  "toss": {
    "wonBy": "ObjectId",
    "decision": "enum ['raid', 'defend']"
  },
  "status": "enum ['scheduled', 'live', 'completed']",
  "winnerId": "ObjectId | null",
  "resultMessage": "string",
  "state": {
    "format": "string",
    "toss": "object",
    "teamAId": "ObjectId",
    "teamBId": "ObjectId",
    "currentHalf": "number (1 or 2)",
    "score": {
      "teamA": "number",
      "teamB": "number"
    },
    "teamA": {
      "activePlayers": ["string (userId)"],
      "outPlayers": ["string (userId)"],
      "injuredPlayers": ["string (userId)"],
      "substitutes": ["string (userId)"],
      "squad": ["string (userId)"]
    },
    "teamB": {
      "activePlayers": ["string (userId)"],
      "outPlayers": ["string (userId)"],
      "injuredPlayers": ["string (userId)"],
      "substitutes": ["string (userId)"],
      "squad": ["string (userId)"]
    },
    "consecutiveEmptyRaids": {
      "teamA": "number",
      "teamB": "number"
    },
    "raids": [
      {
        "raiderId": "string",
        "outcome": "string",
        "pointsAttacking": "number",
        "pointsDefending": "number",
        "revivedAttacking": ["string"],
        "revivedDefending": ["string"],
        "outPlayersAttacking": ["string"],
        "outPlayersDefending": ["string"],
        "isBonusScored": "boolean",
        "isSuperTackle": "boolean",
        "defenderId": "string | undefined",
        "foulReason": "string | undefined",
        "eventLog": "string",
        "timestamp": "Date"
      }
    ],
    "timeouts": [
      {
        "teamId": "ObjectId | null",
        "durationSeconds": "number",
        "type": "enum ['team', 'official']",
        "half": "number",
        "timestamp": "Date"
      }
    ],
    "stats": {
      "userIdString": {
        "raids": "number",
        "raidPoints": "number",
        "touchPoints": "number",
        "tacklePoints": "number",
        "bonusPoints": "number",
        "superTackles": "number",
        "outCount": "number"
      }
    }
  },
  "stateHistory": "Array (snapshots of state for Undo, max limit 5)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

---

## 3. Rules Engine Comparisons

The project implements two distinct rule profiles:

### Standard / National rules (International)
- **Court**: Rectangular.
- **Starting Lineup**: Exactly 7 players on court.
- **Out & Revival**: Touching defenders places them OUT. Raider getting tackled is OUT. Revivals occur in FIFO order of `outPlayers` matching the touch count / tackle outcome.
- **Bonus Point**: Eligible when defending team has $\ge 6$ active players. Raider scores $+1$ point (does not revive).
- **Super Tackle**: Active when defending team has $\le 3$ active players. Successful tackle scores $+2$ points to defenders and revives $1$ player.
- **All-Out**: Triggered when a team has $0$ active players. The other team scores $+2$ additional points. All players of the defending team (excluding injured) are restored.
- **Do-or-Die**: When a team records 2 consecutive empty raids, the 3rd raid MUST score. If empty, the raider is declared OUT, and the defending team receives $+1$ point + 1 revival.

### Circle / Punjab rules
- **Court**: Circle.
- **Starting Lineup**: Exactly 8 players on court.
- **Out & Revival**: No players ever go OUT. Everyone remains on court. Touch or Tackle points simply add to the score.
- **One-on-One**: A raider interacts with one stopper. If two stoppers attack, a "multiple_stoppers" defensive foul is called, giving $+1$ point to the raider.
- **Out of Bounds**: If the stopper goes out of bounds, the attacking team receives $+1$ point. If the raider goes out of bounds, the defending team receives $+1$ point.

---

## 4. API Specification

All endpoints are prefix-routed through `/v1/kabaddi`.

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| **POST** | `/grounds` | Create a new ground venue | Yes |
| **GET** | `/grounds` | Fetch all grounds | Yes |
| **POST** | `/teams` | Create a team with minimum 2 players | Yes |
| **GET** | `/teams` | Fetch all teams (alphabetical order) | Yes |
| **GET** | `/teams/:id` | Fetch team details with populated user info | Yes |
| **POST** | `/matches` | Schedule a match (Standard or Circle) | Yes |
| **POST** | `/matches/:id/start` | Start the match and verify court lineups | Yes |
| **POST** | `/matches/:id/raid` | Record a raid outcome | Yes |
| **GET** | `/matches/:id/scorecard` | Retrieve full scorecard with player names | Yes |
| **PATCH**| `/matches/:id/lineup` | Manually update lineups | Yes |
| **POST** | `/matches/:id/end` | Complete match and record winner/message | Yes |
| **POST** | `/matches/:id/injury` | Mark a player as injured (leaves court) | Yes |
| **POST** | `/matches/:id/substitute` | Perform tactical/injured substitutions | Yes |
| **POST** | `/matches/:id/timeout` | Record official/team timeouts | Yes |
| **POST** | `/matches/:id/switch-half` | Move match to second half | Yes |
| **POST** | `/matches/:id/undo` | Undo the last match event (roll-back state) | Yes |
