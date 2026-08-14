# KABADDI RULE BOOK
## Standard / National Kabaddi vs Circle / Punjab Kabaddi

> Practical reference for understanding the two formats and designing a live-scoring system.
>
> **Important:** Exact tournament regulations can vary. For an actual competition, the current rulebook/circular of that competition is authoritative. AKFI publishes rules for all forms of Kabaddi and separately lists National and Circle Style National competitions. citeturn0search0turn0search1

---

# 1. The Two Main Formats

For this document:

1. **Standard / National Kabaddi**
2. **Circle / Punjab Kabaddi**

The World Kabaddi Federation also treats Kabaddi, Circle Kabaddi and Beach Kabaddi as distinct disciplines. citeturn0search37

---

# 2. Quick Comparison

| Feature | Standard / National | Circle / Punjab |
|---|---|---|
| Court | Rectangle | Circle |
| Players on court | Normally 7 | Commonly 8 |
| Basic attack | Raider vs defence | One-on-one emphasis |
| Multiple defenders | Allowed | Common Punjab rules restrict this |
| Bonus line | Yes | No standard bonus-line system |
| Lobby | Yes | Different circular-field rules |
| All-out/revival | Major part of game | Different model |
| Raid time | Commonly 30 sec | Commonly 30 sec |
| Playing style | Tactical/team based | Physical one-on-one style |
| Scoring model | Touch, tackle, bonus, etc. | Primarily touch/struggle outcomes |

AKFI lists Circle Style National Championships separately from National Kabaddi championships. citeturn0search1

---

# PART I — STANDARD / NATIONAL KABADDI

# 3. Court

Standard Kabaddi uses a rectangular court divided into two halves by the midline.

Important areas include:

- Midline
- End lines
- Side lines
- Baulk lines
- Bonus lines
- Lobbies

Conceptually:

```text
┌─────────────────┬─────────────────┐
│                 │                 │
│     TEAM A      │      TEAM B     │
│                 │                 │
│                 │                 │
│                 │                 │
└─────────────────┴─────────────────┘
                  ↑
               MIDLINE
```

Exact dimensions should be taken from the current competition rulebook.

---

# 4. Players

Standard Kabaddi normally has:

```text
7 players on court
```

The rest of the registered squad are substitutes.

Do not hard-code squad size and substitute rules without checking the competition regulations.

---

# 5. Raider and Antis

The attacking player is the:

```text
RAIDER
```

The defenders are commonly called:

```text
ANTIS / DEFENDERS
```

A raid is an attacking attempt by one player into the opponent's half.

Basic sequence:

```text
Raider enters opponent half
        ↓
Attempts touch / bonus
        ↓
Defenders try to stop raider
        ↓
Raider returns safely OR is tackled
```

---

# 6. Raid Time

Modern standard Kabaddi commonly uses:

```text
30 seconds
```

for a raid.

For software, store:

```text
raidStartedAt
raidEndedAt
raidDurationSeconds
```

rather than assuming every tournament uses exactly the same value.

---

# 7. Cant

Traditional/standard Kabaddi uses an approved cant such as:

```text
"Kabaddi, Kabaddi..."
```

The published rule set requires the approved cant and provides penalties for failure to maintain it. citeturn0search5

However, professional/tournament implementations can differ, so the cant rule should be configurable.

---

# 8. Touch Point

Example:

```text
Team A sends A1 as raider.

Team B:
B1 B2 B3 B4 B5 B6 B7
```

A1 enters B's half and legally touches:

```text
B2
B4
```

A1 returns safely.

Result:

```text
Team A +2 points
B2 out
B4 out
```

The actual revival process then follows the applicable standard rules.

---

# 9. Tackle Point

Example:

```text
Team A raider = A1

B3 + B5 tackle A1
A1 cannot return
```

Result:

```text
Team B +1 tackle point
A1 out
```

Multiple defenders can participate in a standard Kabaddi tackle.

---

# 10. All-Out

When all active players of a team are put out under the standard rules, an all-out occurs.

The standard scoring consequence is commonly:

```text
+2 additional points
```

for the team causing the all-out.

The opposing side then restores its eliminated players through revival.

---

# 11. Revival

Standard Kabaddi uses a revival mechanism.

Conceptually:

```text
Team A earns a qualifying point
        ↓
An eliminated Team A player is revived
```

A scoring engine must keep track of:

```text
activePlayers
outPlayers
revival order
```

Do not simply activate everyone after a score.

---

# 12. Bonus Point

Standard Kabaddi has a bonus line.

A raider can score a bonus when the conditions required by the rules are satisfied.

Example:

```text
Raider crosses bonus line
+
Bonus conditions satisfied
+
No normal touch required
```

Result:

```text
+1 bonus point
```

A bonus point does not itself put a defender out.

---

# 13. Empty Raid

An empty raid means:

```text
No point scored
+
Raider is not out
```

Example:

```text
A1 raids
No touch
No bonus
A1 returns safely
```

Result:

```text
No score
No player out
```

The raid must still be stored.

---

# 14. Do-or-Die Raid

Some standard Kabaddi competitions use a do-or-die raid mechanism.

The system must track:

```text
consecutiveEmptyRaids
```

for each team.

The exact trigger should come from the competition's current regulations.

---

# 15. Super Tackle

A common standard Kabaddi rule gives an additional defensive reward when the defending team has only a small number of players remaining.

Commonly:

```text
3 or fewer defenders
+
successful tackle
=
2 points
```

This is generally called:

```text
SUPER TACKLE
```

Make the trigger configurable.

---

# 16. Lobby

Standard Kabaddi has lobbies on the sides.

The lobby becomes active/relevant during an ongoing struggle according to the rules.

Therefore:

```text
player enters lobby
```

must not automatically mean:

```text
player out
```

The scoring engine needs the current raid/struggle state.

---

# 17. Technical Point

Technical points can arise from rule violations such as:

- Illegal raid procedure
- Incorrect cant
- Delay
- Incorrect player entry
- Certain misconduct
- Other rule-specific violations

Store:

```text
technicalPointReason
```

rather than just adding an unexplained point.

---

# 18. Standard Scoring Model

A typical standard model contains:

```text
Touch point       → +1 per eligible defender
Tackle point      → +1
Super tackle      → +2
Bonus             → +1
All-out           → +2 additional
Technical point   → +1
```

Exact competition rules should override these defaults.

---

# PART II — CIRCLE / PUNJAB KABADDI

# 19. Circle Kabaddi

Circle Kabaddi is a separate form of Kabaddi.

AKFI separately lists Circle Style National Kabaddi competitions. citeturn0search1

The World Kabaddi Federation also identifies Circle Kabaddi separately from standard Kabaddi. citeturn0search37

---

# 20. Court

Punjab/Circle Kabaddi is played on a circular field.

A commonly described Punjab-style field has:

```text
approximately 22 m diameter
```

with an inner circle and central dividing arrangement.

Exact dimensions can vary by tournament.

citeturn0search3turn0search38

---

# 21. Players

A commonly described Punjab Circle format uses:

```text
8 players per team on the field
```

This is different from standard Kabaddi's normal 7-player setup. citeturn0search3

---

# 22. One-on-One Principle

One of the biggest differences is the defensive structure.

Conceptually:

```text
RAIDER
   ↓
ONE STOPPER
   ↓
STRUGGLE
```

A commonly published Punjab Circle ruleset says that if two stoppers attack a player, a foul is declared. citeturn0search3

Therefore Circle Kabaddi should not use the same multi-defender tackle state machine as Standard Kabaddi.

---

# 23. Circle Raid

Basic sequence:

```text
Team A sends Raider
        ↓
Raider enters opponent area
        ↓
Raider attempts touch
        ↓
Stopper attempts to stop raider
        ↓
Physical struggle
        ↓
Raider escapes OR is stopped
```

The one-on-one contest is central to the Punjab/Circle style.

---

# 24. Touch Point

Example:

```text
A1 = Raider
B1 = Stopper
```

A1 touches B1 and successfully returns.

Result in the commonly described Punjab Circle format:

```text
Team A +1
```

The touched player generally remains in the playing area rather than leaving the court as in standard Kabaddi. citeturn0search3turn0search38

---

# 25. No Standard Revival Cycle

In the commonly described Punjab Circle format:

```text
Player touched
      ↓
Point awarded
      ↓
Player remains on field
```

Therefore do not automatically implement:

```text
OUT → REVIVE → ACTIVE
```

for Circle Kabaddi.

Use the exact tournament's rules.

---

# 26. Two-Defender Foul

Example:

```text
A1 = Raider

B1 + B2
both attack A1
```

Under the commonly described Punjab Circle rule:

```text
Defensive foul
```

may be called.

A published rules source explicitly describes two stoppers attacking a player as a foul. citeturn0search3

For software:

```json
{
  "event": "defensive_foul",
  "reason": "multiple_stoppers"
}
```

---

# 27. Circle Match Duration

A commonly described Punjab Circle match is:

```text
40 minutes
```

with:

```text
First half  = 20 minutes
Second half = 20 minutes
```

and teams change sides at halftime. citeturn0search3

Local competitions can use different durations.

---

# 28. Circle Raid Duration

A commonly described Punjab Circle raid is:

```text
30 seconds
```

citeturn0search3

Again, make it configurable.

---

# 29. Cant in Circle Kabaddi

This is an important variation.

One commonly published Punjab Circle ruleset says the raider does **not** have to continuously say "Kabaddi, Kabaddi" throughout the raid. citeturn0search3

However, another published Punjab-style rules source describes a continuous cant requirement. citeturn0search13

Therefore:

> **Do not hard-code one cant rule for every Circle/Punjab tournament.**

Use a tournament-specific rule profile.

---

# 30. Pursuit After Touch

Punjab-style rules can contain special restrictions on when the raider can be pursued after touching an opponent.

One published Punjab-style rule states that after touching an opponent and returning, the raider cannot be pursued until crossing the required line on his side. citeturn0search13turn0search14

This is another reason Circle Kabaddi needs its own raid state machine.

---

# 31. Circle Boundary

Boundary rules are different from the standard rectangular court.

A published Circle Kabaddi rule states that a player can be out if part of the body touches outside the boundary, while providing special treatment during a struggle when contact with the playing area is maintained. citeturn0search5

Therefore the scoring engine must know whether:

```text
normal movement
```

or:

```text
active struggle
```

is occurring.

---

# 32. Circle Technical/Foul Events

Potential events include:

- Multiple-stopper foul
- Incorrect raid
- Illegal entry
- Boundary violation
- Unfair tackle
- Deliberate interference
- Delay
- Other referee decisions

The exact penalty must follow the tournament rules.

---

# 33. Standard vs Circle — Example

## Standard

```text
A1 raids

Defenders:
B1 B2 B3 B4 B5 B6 B7

A1 touches:
B1
B3
B5

A1 returns safely

Result:
A +3
B1 OUT
B3 OUT
B5 OUT
```

Multiple defenders can be involved.

## Circle

```text
A1 raids

B1 = stopper

A1 touches B1
A1 escapes

Result:
A +1
B1 remains active
```

If two defenders attack the raider contrary to the applicable one-on-one rule:

```text
Defensive foul
```

may result. citeturn0search3

---

# 34. Software Architecture

Do not build one generic scoring algorithm and only change the UI.

Use:

```text
KABADDI
│
├── STANDARD
│
└── CIRCLE
```

with a rules configuration.

---

# 35. Standard Configuration

Example:

```json
{
  "sport": "kabaddi",
  "format": "standard",
  "playersOnCourt": 7,
  "raidDurationSeconds": 30,
  "hasBonusLine": true,
  "hasLobby": true,
  "hasAllOut": true,
  "hasRevival": true,
  "hasSuperTackle": true,
  "multipleDefendersAllowed": true
}
```

---

# 36. Circle Configuration

Example:

```json
{
  "sport": "kabaddi",
  "format": "circle",
  "playersOnCourt": 8,
  "raidDurationSeconds": 30,
  "hasBonusLine": false,
  "hasLobby": false,
  "hasAllOut": false,
  "hasRevival": false,
  "hasSuperTackle": false,
  "multipleDefendersAllowed": false
}
```

These are useful software defaults, not universal tournament law.

---

# 37. Recommended Scoring Events

Use a generic event list:

```text
RAID_START
TOUCH
BONUS
TACKLE
SUPER_TACKLE
ALL_OUT
TECHNICAL_POINT
DEFENSIVE_FOUL
BOUNDARY_OUT
RAID_SUCCESS
RAID_EMPTY
RAIDER_OUT
HALF_END
MATCH_END
```

The selected format decides which events are legal.

---

# 38. Standard Touch Event

```json
{
  "format": "standard",
  "raiderId": "A1",
  "event": "touch",
  "touchedPlayerIds": [
    "B2",
    "B5"
  ],
  "points": 2
}
```

Result:

```text
Team A +2
B2 OUT
B5 OUT
```

---

# 39. Standard Tackle Event

```json
{
  "format": "standard",
  "raiderId": "A1",
  "event": "tackle",
  "raiderOutId": "A1",
  "defenderIds": [
    "B3",
    "B4"
  ],
  "points": 1
}
```

Super tackle variant:

```json
{
  "format": "standard",
  "raiderId": "A1",
  "event": "super_tackle",
  "raiderOutId": "A1",
  "defenderIds": [
    "B3",
    "B4"
  ],
  "points": 2
}
```

---

# 40. Circle Touch Event

```json
{
  "format": "circle",
  "raiderId": "A1",
  "stopperId": "B1",
  "event": "successful_touch",
  "points": 1
}
```

B1 remains active under the commonly described Punjab Circle model.

---

# 41. Circle Defensive Foul

```json
{
  "format": "circle",
  "event": "defensive_foul",
  "reason": "two_stoppers_attack_raider",
  "points": 1
}
```

The exact point penalty must be determined by the competition's rulebook.

---

# 42. Do Not Mix the Formats

Do not automatically apply:

```text
Circle + standard bonus line
Circle + standard revival
Circle + standard all-out
Circle + standard multi-defender tackle
```

Likewise, do not automatically apply:

```text
Standard + 8-player court
Standard + one-stopper restriction
Standard + Circle touch/revival model
```

---

# 43. Recommended Match Object

Standard:

```json
{
  "sport": "kabaddi",
  "format": "standard",
  "teamAId": "TEAM_A",
  "teamBId": "TEAM_B",
  "playersOnCourt": 7,
  "raidDurationSeconds": 30
}
```

Circle:

```json
{
  "sport": "kabaddi",
  "format": "circle",
  "teamAId": "TEAM_A",
  "teamBId": "TEAM_B",
  "playersOnCourt": 8,
  "raidDurationSeconds": 30
}
```

---

# 44. Final Comparison

## Standard / National

```text
RECTANGULAR COURT
        ↓
7 players
        ↓
Raider enters opponent half
        ↓
Multiple defenders can interact
        ↓
Touch
Bonus
Tackle
Super tackle
        ↓
All-out
        ↓
Revival
```

## Circle / Punjab

```text
CIRCULAR COURT
        ↓
Commonly 8 players
        ↓
Raider enters opponent area
        ↓
One-on-one stopper concept
        ↓
Touch / struggle
        ↓
Successful raid
        ↓
Different player-state model
```

---

# 45. Authority and Versioning

For Indian National/Standard Kabaddi, use the **current AKFI rules and current competition circulars** as the primary authority. AKFI identifies itself as the national sports federation for all forms of Kabaddi and publishes current competition notices. citeturn0search9turn0search2

For Circle Kabaddi, use the specific **Circle Style National Championship** regulations or the tournament organizer's current rules. AKFI publishes Circle Style notices separately. citeturn0search2

This is important because Circle/Punjab rules are not perfectly uniform across every local tournament.

---

# 46. Bottom Line

The safest model for a live scoring application is:

```text
KABADDI
│
├── STANDARD / NATIONAL
│   ├── Rectangle
│   ├── 7 players
│   ├── Multiple-defender interaction
│   ├── Bonus
│   ├── Lobby
│   ├── All-out
│   ├── Revival
│   └── Super tackle
│
└── CIRCLE / PUNJAB
    ├── Circle
    ├── Commonly 8 players
    ├── One-on-one emphasis
    ├── Different touch/out model
    ├── No standard bonus-line system
    └── Different raid/scoring state
```

**Conclusion:** These should be implemented as **two rule profiles/rule engines**, not one scoring algorithm with only a different court UI.
