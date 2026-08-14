# Cricket Rules & Scoring Logic: Reference Guide for Scorer App

This document provides a comprehensive, structured breakdown of the rules, player roles, dismissals, and scoring scenarios in cricket. It is specifically designed to serve as a logical foundation for developing a **Cricket Scorer App** (live match updates, database schema design, and state management).

---

## 1. Match Formats & Game Structure

| Feature | T20 (Twenty20) | ODI (One Day International) | Test Cricket | T10 |
| :--- | :--- | :--- | :--- | :--- |
| **Overs per Innings** | 20 overs | 50 overs | Unlimited (max 90 overs/day) | 10 overs |
| **Innings per Team** | 1 innings | 1 innings | 2 innings | 1 innings |
| **Max Overs per Bowler** | 4 overs | 10 overs | Unlimited | 2 overs |
| **Powerplays** | 1 Phase (Overs 1-6) | 3 Phases (Overs 1-10, 11-40, 41-50) | None (No field restrictions) | 1 Phase (Overs 1-3 typical) |
| **Free Hit on No-Balls** | Yes (All No-Balls) | Yes (All No-Balls) | No | Yes (All No-Balls) |
| **New Ball Rules** | 1 ball per innings | 2 balls (1 from each end) | 1 ball (new ball available after 80 overs) | 1 ball per innings |

---

## 2. Key Player Roles & Positions

For a scorer app, you must map player IDs to specific roles.

### A. On-Field Players
*   **Batter (Striker & Non-Striker)**: 
    *   *Striker*: Faces the bowler. Credited with runs, balls faced, strike rate, boundaries ($4\text{s}$ and $6\text{s}$).
    *   *Non-Striker*: Stands at the bowler's end. Can be run out if backing up too far.
*   **Bowler**: Delivers the ball. Credited with overs bowled, maidens, runs conceded, wickets taken, economy rate, and extras conceded (Wides and No-Balls).
*   **Wicketkeeper**: Stands behind the wickets. The only fielder allowed to wear gloves/pads. Credited with catches, stumpings, and run outs.
*   **Fielders**: 10 players assisting the bowler. Credited with catches, run-out assists (throw/glovework), and run-saving actions.
*   **Captain**: Leads the team. Responsible for declaring an innings (Test matches), DRS reviews, and choosing field placements/bowlers.

### B. Fielding Positions (Reference Chart)
Use these for mapping "catches" or "wagon wheel" coordinates in your database:
*   **Close-In**: Slip, Leg Slip, Gully, Silly Point, Short Leg, Short Mid-wicket.
*   **Infield (Ring)**: Point, Cover, Mid-off, Mid-on, Mid-wicket, Square Leg.
*   **Outfield (Deep)**: Third Man, Deep Point, Deep Cover, Long-off, Long-on, Deep Mid-wicket, Deep Square Leg, Fine Leg.

### C. Match Officials
*   **On-Field Umpires (2)**: 
    *   *Bowler's End Umpire*: Decisions on LBW, Wides, No-Balls, Byes, Leg Byes, and boundaries.
    *   *Square Leg Umpire*: Decisions on Stumpings, Run Outs, Waist-High No-Balls, and Short Runs.
*   **Third Umpire (TV Umpire)**: Reviews replays for Run Outs, Stumpings, Catches (fairness), No-Balls (front foot check), and DRS.
*   **Match Referee**: Ensures player conduct, monitors over-rates, and assesses penalties.

---

## 3. Scoring Logic & Match State Tracking

A scorer app needs to parse every delivery into state mutations. A delivery is represented as a state transition.

### A. Basic Run Scoring
*   **Physical Runs**: Batters run between the creases. Can be 1, 2, 3, or occasionally 4 runs. Credited to the Batter and the Team.
*   **Boundary 4**: Ball hits the ground and crosses the boundary. Credited to the Batter (4 runs) and the Team.
*   **Boundary 6**: Ball crosses the boundary without hitting the ground. Credited to the Batter (6 runs) and the Team.
*   **Short Run**: If a batter fails to cross the popping crease during a run, the umpire declares a "Short Run". 
    *   *Scoring action*: Deduct 1 run from the team/batter for that delivery.

### B. Extras (Not Credited to Batter)
Extras are added to the team total and charged/credited depending on the type.

#### 1. Wide Ball
*   **Trigger**: Ball passes out of reach of the striker (outside the wide guidelines).
*   **Scoring**: $+1$ run to the Team as a Wide. The ball is **not** counted as a valid delivery in the over (bowler must re-bowl).
*   **Bowler Charge**: Bowler is charged with $1$ wide run and must bowl an extra delivery.
*   **Additional Runs**: If the keeper misses the wide ball, batters can run. These are scored as Wides (e.g., "5 Wides" = 1 penalty run + 4 run-aways).
*   **Valid Dismissals on a Wide**:
    1. Run Out
    2. Stumped
    3. Obstructing the field
    4. Hit Wicket

#### 2. No-Ball
*   **Trigger**: Bowler oversteps the popping crease (Front Foot), touches/crosses the return crease, bowls a waist-high full-toss (Beamer), or breaches fielding restrictions.
*   **Scoring**: $+1$ run to the Team as a No-Ball. The ball is **not** counted as a valid delivery in the over.
*   **Free Hit**: In T20, ODI, and T10, the next delivery becomes a **Free Hit**. The field cannot be changed unless the batters swapped ends.
*   **Bowler Charge**: Bowler is charged with $1$ no-ball run and must bowl an extra delivery.
*   **Additional Runs**: Runs scored off the bat on a No-Ball are credited to the batter. If they don't hit it but run, they are credited as Byes/Leg Byes, but the $+1$ penalty run remains a No-Ball extra.
*   **Valid Dismissals on a No-Ball (and Free Hit)**:
    1. Run Out
    2. Obstructing the field
    3. Double Hit (Hit the ball twice)

#### 3. Bye
*   **Trigger**: Ball passes the batter without touching the bat or body, and the batters run.
*   **Scoring**: Credited to the Team as Byes. It counts as a valid delivery in the over.
*   **Bowler Charge**: Bowler is **not** charged with these runs (they do not count against the bowler's individual economy rate).

#### 4. Leg Bye
*   **Trigger**: Ball deflects off the batter's body/protective gear (not the glove/bat) while the batter was attempting a shot or trying to avoid being hit.
*   **Scoring**: Credited to the Team as Leg Byes. It counts as a valid delivery in the over.
*   **Bowler Charge**: Bowler is **not** charged with these runs.

#### 5. Penalty Runs
*   **Trigger**: Awarded for major infractions (e.g., ball hitting fielding helmet left on the ground, fake fielding, illegal run-up, saliva on the ball, or running on the pitch).
*   **Scoring**: $+5$ runs awarded to the opposing team. This does not require a delivery to occur and can be awarded mid-over or between innings.

---

## 4. Dismissals (Outs) & App Schema Mapping

For a database/state machine, each dismissal has specific characteristics:
1. **Bowler Credit**: Does the bowler get a wicket on their record?
2. **Fielder ID**: Is a fielder involved in the catch/run out?
3. **Batter Striker Change**: Which new batter comes in, and who faces the next ball?

| Dismissal Type | Bowler Credit | Fielder Involved | Wicketkeeper Involved | Ball Counted? | Description / App Logic |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Bowled** | Yes | No | No | Yes | Ball hits stumps directly from delivery. |
| **Caught** | Yes | Yes (Fielder) | Yes (If caught by keeper) | Yes | Ball caught before touching the ground. If caught, batters do **not** swap ends even if they crossed before the catch (Rule change 2022). |
| **LBW** | Yes | No | No | Yes | Ball strikes batter's body in line with stumps without hitting bat, projected to hit stumps. |
| **Run Out** | No | Yes (Thrower + Packer) | Optional | Yes / No (Can occur on wide/no-ball) | Batter out while running or backing up. Next striker is determined by who crossed the half-way line first before the wicket. |
| **Stumped** | Yes | No | Yes (Keeper) | Yes / No (Can occur on wide) | Keeper removes bails while batter is out of crease, not attempting a run. |
| **Hit Wicket** | Yes | No | No | Yes / No (Can occur on wide) | Batter accidentally dislodges stumps with bat or body while playing a shot or starting a run. |
| **Obstructing Field** | No | No | No | Yes | Batter deliberately distracts or physically blocks fielders. Includes "Handled the Ball" (using hand to touch ball). |
| **Hit Ball Twice** | No | No | No | Yes | Batter hits the ball a second time to score runs (can only hit it a second time to protect stumps). |
| **Timed Out** | No | No | No | No | New batter takes > 3 minutes (Test/ODI) or > 2 minutes (T20) to face a ball after a wicket. |
| **Retired Out** | No | No | No | No | Batter leaves the pitch without umpire's permission or injury. Counts as a wicket in match stats. |

### Retired Hurt vs. Retired Out (State management distinction)
*   **Retired Hurt**: Batter is injured. They can return to bat later at the fall of a wicket. *State: Not Out. Active bench.*
*   **Retired Out**: Batter leaves for tactical reasons. They cannot return. *State: Out. Added to dismissals.*

---

## 5. Over State Management

A critical component of a live scoring app is validating and closing an "Over".

*   **Valid Balls per Over**: Must equal exactly **6 valid deliveries**.
*   **Invalid Balls**: Wide balls and No-balls do not count toward the 6 deliveries. The over length increases by 1 for each.
*   **Maiden Over**: An over where 0 runs are scored off the bat (or via Wides/No-Balls). Byes and Leg Byes do not spoil a maiden over because they are not charged to the bowler.
*   **Wicket Maiden**: A maiden over where the bowler also takes one or more wickets.
*   **End of Over Tasks**:
    1. Swap Striker and Non-Striker roles (the batter who was on strike now becomes the non-striker for the next over).
    2. Change bowling end (the team bowls from the opposite wicket).
    3. Update bowler spell stats (overs, maidens, runs, wickets).

---

## 6. Advanced Scoring Scenarios & Edge Cases

To make your app robust and crash-proof, your logic must handle these complex scenarios:

### A. Free Hit Logic
1. Triggered on any No-Ball.
2. Field placement **cannot** change unless the striker has changed ends (either by running a single/three on the No-Ball, or if the batters crossed).
3. If the bowler bowls a Wide or another No-Ball during a Free Hit, the next ball remains a Free Hit.

### B. Super Over (Tie-Breaker)
1. Used in limited-overs matches if scores are tied.
2. Each team plays **1 over (6 balls)**.
3. The team batting second in the main match bats first in the Super Over.
4. Each team has only **2 wickets** (meaning 3 batters can bat). If 2 wickets fall, the innings ends.
5. If the Super Over is tied, subsequent Super Overs are played until there is a clear winner (replaces the boundary-countback rule).

### C. Overthrows and Boundaries
*   If a fielder throws the ball and it misses the stumps, crossing the boundary line:
    *   **Runs Scored**: Physical runs completed by the batters before the throw was made + 4 runs for the boundary.
    *   **Credited to**: The Batter if the ball came off the bat originally; otherwise credited as Extras (Byes/Leg Byes).

### D. Duckworth-Lewis-Stern (DLS) Method
*   Used in rain-interrupted limited-overs matches to adjust targets.
*   **App design consideration**: Do not attempt to code the DLS algorithm from scratch (it is proprietary and complex). Instead, your app should provide a manual "Adjusted Target" field or integrate a DLS calculator API that inputs:
    *   Overs remaining.
    *   Wickets lost.
    *   Runs scored.

### E. Dead Ball Scenarios
No runs can be scored, and no wickets can fall once a ball is declared "Dead".
*   Ball hitting the roof of an indoor stadium.
*   Ball getting stuck in a player’s or umpire’s clothing/helmet.
*   Umpire intervenes to stop play due to player injury.
*   Bowler aborts run-up or fails to deliver the ball.
