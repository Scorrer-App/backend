import { ObjectId } from "mongodb";
import { db } from "../../../config/dbConnect/mongo.js";

// Helper to format balls to overs (e.g. 8 balls -> 1.2 overs)
const ballsToOvers = (balls) => {
    return Math.floor(balls / 6) + (balls % 6) / 10;
};

// CREATE MATCH
export const createMatch = async (req, res) => {
    try {
        const { groundId, teamAId, teamBId, format, overs, toss } = req.body;

        const grounds = db("cricket", "grounds");
        const teams = db("cricket", "teams");
        const matches = db("cricket", "matches");

        // Validate Ground
        const ground = await grounds.findOne({ _id: new ObjectId(groundId) });
        if (!ground) {
            return res.status(404).json({ success: false, message: "Ground not found" });
        }

        // Validate Teams
        const teamA = await teams.findOne({ _id: new ObjectId(teamAId) });
        const teamB = await teams.findOne({ _id: new ObjectId(teamBId) });
        if (!teamA || !teamB) {
            return res.status(404).json({ success: false, message: "One or both teams not found" });
        }

        // Validate Toss Winner
        if (toss.wonBy !== teamAId && toss.wonBy !== teamBId) {
            return res.status(400).json({ success: false, message: "Toss winner must be one of the playing teams" });
        }

        const match = {
            groundId: new ObjectId(groundId),
            teamAId: new ObjectId(teamAId),
            teamBId: new ObjectId(teamBId),
            format,
            overs,
            toss: {
                wonBy: new ObjectId(toss.wonBy),
                decision: toss.decision
            },
            status: "scheduled",
            state: null,
            winnerId: null,
            resultMessage: "",
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await matches.insertOne(match);

        return res.status(201).json({
            success: true,
            message: "Match scheduled successfully",
            matchId: result.insertedId
        });

    } catch (error) {
        console.error("Create match error:", error);
        return res.status(500).json({ success: false, message: "Failed to schedule match" });
    }
};

// START MATCH (Innings 1)
export const startMatch = async (req, res) => {
    try {
        const { id } = req.params;
        const { strikerId, nonStrikerId, bowlerId } = req.body;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid match ID" });
        }

        const matches = db("cricket", "matches");
        const teams = db("cricket", "teams");

        const match = await matches.findOne({ _id: new ObjectId(id) });
        if (!match) {
            return res.status(404).json({ success: false, message: "Match not found" });
        }

        if (match.status !== "scheduled") {
            return res.status(400).json({ success: false, message: "Match has already started or is completed" });
        }

        // Determine Batting and Bowling Teams
        let battingTeamId, bowlingTeamId;
        const tossWinnerId = match.toss.wonBy.toString();
        const tossDecision = match.toss.decision;

        if (tossWinnerId === match.teamAId.toString()) {
            if (tossDecision === "bat") {
                battingTeamId = match.teamAId;
                bowlingTeamId = match.teamBId;
            } else {
                battingTeamId = match.teamBId;
                bowlingTeamId = match.teamAId;
            }
        } else {
            if (tossDecision === "bat") {
                battingTeamId = match.teamBId;
                bowlingTeamId = match.teamAId;
            } else {
                battingTeamId = match.teamAId;
                bowlingTeamId = match.teamBId;
            }
        }

        // Validate players in team rosters
        const battingTeam = await teams.findOne({ _id: battingTeamId });
        const bowlingTeam = await teams.findOne({ _id: bowlingTeamId });

        const battingUserIds = battingTeam.players.map(p => p.userId.toString());
        const bowlingUserIds = bowlingTeam.players.map(p => p.userId.toString());

        if (!battingUserIds.includes(strikerId) || !battingUserIds.includes(nonStrikerId)) {
            return res.status(400).json({ success: false, message: "Striker and non-striker must belong to the batting team" });
        }

        if (strikerId === nonStrikerId) {
            return res.status(400).json({ success: false, message: "Striker and non-striker cannot be the same player" });
        }

        if (!bowlingUserIds.includes(bowlerId)) {
            return res.status(400).json({ success: false, message: "Bowler must belong to the bowling team" });
        }

        // Initialize state for Innings 1
        const initialState = {
            currentInnings: 1,
            innings: [
                {
                    battingTeamId,
                    bowlingTeamId,
                    runs: 0,
                    wickets: 0,
                    overs: 0,
                    ballsBowled: 0,
                    deliveries: [],
                    battingStats: [
                        { userId: new ObjectId(strikerId), runs: 0, balls: 0, fours: 0, sixes: 0, out: false, dismissal: null },
                        { userId: new ObjectId(nonStrikerId), runs: 0, balls: 0, fours: 0, sixes: 0, out: false, dismissal: null }
                    ],
                    bowlingStats: [
                        { userId: new ObjectId(bowlerId), overs: 0, balls: 0, maidens: 0, runsConceded: 0, wickets: 0 }
                    ],
                    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0 }
                }
            ],
            currentBatsmen: [
                { userId: new ObjectId(strikerId), isStriker: true },
                { userId: new ObjectId(nonStrikerId), isStriker: false }
            ],
            currentBowler: new ObjectId(bowlerId),
            freeHit: false
        };

        await matches.updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    status: "live",
                    state: initialState,
                    updatedAt: new Date()
                }
            }
        );

        return res.status(200).json({
            success: true,
            message: "Match started successfully. Innings 1 is now live."
        });

    } catch (error) {
        console.error("Start match error:", error);
        return res.status(500).json({ success: false, message: "Failed to start match" });
    }
};

// START INNINGS 2
export const startNextInnings = async (req, res) => {
    try {
        const { id } = req.params;
        const { strikerId, nonStrikerId, bowlerId } = req.body;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid match ID" });
        }

        const matches = db("cricket", "matches");
        const teams = db("cricket", "teams");

        const match = await matches.findOne({ _id: new ObjectId(id) });
        if (!match) {
            return res.status(404).json({ success: false, message: "Match not found" });
        }

        if (match.status !== "live") {
            return res.status(400).json({ success: false, message: "Match must be live to start next innings" });
        }

        if (match.state.currentInnings !== 1) {
            return res.status(400).json({ success: false, message: "Next innings can only be started after Innings 1 is complete" });
        }

        // Innings 1 must be completed
        const innings1 = match.state.innings[0];
        const battingTeam1 = await teams.findOne({ _id: innings1.battingTeamId });
        const allWickets1 = innings1.wickets >= battingTeam1.players.length - 1; // e.g. 10 wickets for 11 players
        const oversCompleted1 = innings1.ballsBowled >= match.overs * 6;

        if (!allWickets1 && !oversCompleted1) {
            return res.status(400).json({
                success: false,
                message: "Cannot start next innings, Innings 1 is still ongoing (overs/wickets not complete)"
            });
        }

        // Innings 2 details (batting & bowling teams swap)
        const battingTeamId = innings1.bowlingTeamId;
        const bowlingTeamId = innings1.battingTeamId;

        // Validate players
        const battingTeam = await teams.findOne({ _id: battingTeamId });
        const bowlingTeam = await teams.findOne({ _id: bowlingTeamId });

        const battingUserIds = battingTeam.players.map(p => p.userId.toString());
        const bowlingUserIds = bowlingTeam.players.map(p => p.userId.toString());

        if (!battingUserIds.includes(strikerId) || !battingUserIds.includes(nonStrikerId)) {
            return res.status(400).json({ success: false, message: "Striker and non-striker must belong to the batting team" });
        }

        if (strikerId === nonStrikerId) {
            return res.status(400).json({ success: false, message: "Striker and non-striker cannot be the same player" });
        }

        if (!bowlingUserIds.includes(bowlerId)) {
            return res.status(400).json({ success: false, message: "Bowler must belong to the bowling team" });
        }

        const innings2 = {
            battingTeamId,
            bowlingTeamId,
            runs: 0,
            wickets: 0,
            overs: 0,
            ballsBowled: 0,
            deliveries: [],
            battingStats: [
                { userId: new ObjectId(strikerId), runs: 0, balls: 0, fours: 0, sixes: 0, out: false, dismissal: null },
                { userId: new ObjectId(nonStrikerId), runs: 0, balls: 0, fours: 0, sixes: 0, out: false, dismissal: null }
            ],
            bowlingStats: [
                { userId: new ObjectId(bowlerId), overs: 0, balls: 0, maidens: 0, runsConceded: 0, wickets: 0 }
            ],
            extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0 }
        };

        await matches.updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    "state.currentInnings": 2,
                    "state.currentBatsmen": [
                        { userId: new ObjectId(strikerId), isStriker: true },
                        { userId: new ObjectId(nonStrikerId), isStriker: false }
                    ],
                    "state.currentBowler": new ObjectId(bowlerId),
                    "state.freeHit": false,
                    "state.innings.1": innings2,
                    updatedAt: new Date()
                }
            }
        );

        return res.status(200).json({
            success: true,
            message: "Innings 2 started successfully."
        });

    } catch (error) {
        console.error("Start next innings error:", error);
        return res.status(500).json({ success: false, message: "Failed to start next innings" });
    }
};

// RECORD BALL / DELIVERY
export const recordBall = async (req, res) => {
    try {
        const { id } = req.params;
        const { runs, extras, wicket, bowlerId: inputBowlerId, nextBowlerId } = req.body;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid match ID" });
        }

        const matches = db("cricket", "matches");
        const teams = db("cricket", "teams");

        const match = await matches.findOne({ _id: new ObjectId(id) });
        if (!match) {
            return res.status(404).json({ success: false, message: "Match not found" });
        }

        if (match.status !== "live") {
            return res.status(400).json({ success: false, message: "Cannot record scorecard, match is not live" });
        }

        const state = match.state;
        const currentInningsIdx = state.currentInnings - 1;
        const currentInnings = state.innings[currentInningsIdx];

        // Ensure innings has not completed yet
        const battingTeam = await teams.findOne({ _id: currentInnings.battingTeamId });
        const bowlingTeam = await teams.findOne({ _id: currentInnings.bowlingTeamId });
        const maxWickets = battingTeam.players.length - 1;

        if (currentInnings.wickets >= maxWickets || currentInnings.ballsBowled >= match.overs * 6) {
            return res.status(400).json({
                success: false,
                message: "Current innings is already complete. Transition to the next innings or complete the match."
            });
        }

        // Identify Active Striker, Non-Striker, Bowler
        const strikerObj = state.currentBatsmen.find(b => b.isStriker);
        const nonStrikerObj = state.currentBatsmen.find(b => !b.isStriker);
        if (!strikerObj || !nonStrikerObj) {
            return res.status(400).json({ success: false, message: "Striker or Non-striker not set in live state" });
        }

        const strikerId = strikerObj.userId;
        const nonStrikerId = nonStrikerObj.userId;
        
        let bowlerId = state.currentBowler ? new ObjectId(state.currentBowler) : null;
        if (inputBowlerId) {
            const bowlingUserIds = bowlingTeam.players.map(p => p.userId.toString());
            if (!bowlingUserIds.includes(inputBowlerId)) {
                return res.status(400).json({ success: false, message: "Bowler must belong to the bowling team" });
            }
            bowlerId = new ObjectId(inputBowlerId);
            state.currentBowler = bowlerId;
        }

        if (!bowlerId) {
            return res.status(400).json({ success: false, message: "No active bowler set for the match" });
        }

        // Process Ball Details
        const isWide = extras?.type === "wide";
        const isNoBall = extras?.type === "no_ball";
        const isBye = extras?.type === "bye";
        const isLegBye = extras?.type === "leg_bye";
        const isPenalty = extras?.type === "penalty";

        const isValidBall = !isWide && !isNoBall;

        // Enforce new bowler if over changed
        if (currentInnings.deliveries.length > 0) {
            const lastBall = currentInnings.deliveries[currentInnings.deliveries.length - 1];
            // A new over is starting if the last ball recorded was valid and completed an over
            const wasOverCompleted = lastBall.isValidBall && (currentInnings.ballsBowled % 6 === 0);
            if (wasOverCompleted) {
                if (lastBall.bowlerId.toString() === bowlerId.toString()) {
                    return res.status(400).json({
                        success: false,
                        message: "A bowler cannot bowl consecutive overs. Provide nextBowlerId in the previous over's end, or update bowler."
                    });
                }
            }
        }

        // Calculate Runs
        let ballRuns = 0; // runs added to team total
        let batterRuns = 0;
        let bowlerRunsConceded = 0;

        if (isWide) {
            // 1 run penalty for wide + any runs completed
            const widePenalty = 1 + (extras.runs || 0);
            ballRuns = widePenalty;
            bowlerRunsConceded = widePenalty;
        } else if (isNoBall) {
            // 1 run penalty for no-ball + runs completed (bat or bye/legbye)
            const noBallPenalty = 1 + runs + (extras.runs || 0);
            ballRuns = noBallPenalty;
            batterRuns = runs;
            bowlerRunsConceded = 1 + runs; // byes/leg-byes on no-ball are not charged to bowler
        } else if (isBye || isLegBye) {
            // Byes/legbyes runs scored on valid delivery
            ballRuns = extras.runs || 0;
            batterRuns = 0;
            bowlerRunsConceded = 0; // not charged to bowler
        } else if (isPenalty) {
            ballRuns = extras.runs || 5; // default 5 runs
            batterRuns = 0;
            bowlerRunsConceded = 0; // penalty runs not charged to bowler
        } else {
            // Normal ball
            ballRuns = runs;
            batterRuns = runs;
            bowlerRunsConceded = runs;
        }

        // 1. Update Innings Runs
        currentInnings.runs += ballRuns;

        // 2. Update Extras totals
        if (isWide) currentInnings.extras.wides += ballRuns;
        if (isNoBall) currentInnings.extras.noBalls += 1;
        if (isBye) currentInnings.extras.byes += ballRuns;
        if (isLegBye) currentInnings.extras.legByes += ballRuns;
        if (isPenalty) currentInnings.extras.penalty += ballRuns;

        // 3. Update Batter Stats
        let strikerStat = currentInnings.battingStats.find(b => b.userId.toString() === strikerId.toString());
        if (!strikerStat) {
            strikerStat = { userId: strikerId, runs: 0, balls: 0, fours: 0, sixes: 0, out: false, dismissal: null };
            currentInnings.battingStats.push(strikerStat);
        }

        if (!isWide) {
            strikerStat.runs += batterRuns;
            strikerStat.balls += 1;
            if (batterRuns === 4 && !isBye && !isLegBye) strikerStat.fours += 1;
            if (batterRuns === 6 && !isBye && !isLegBye) strikerStat.sixes += 1;
        }

        // 4. Update Bowler Stats
        let bowlerStat = currentInnings.bowlingStats.find(b => b.userId.toString() === bowlerId.toString());
        if (!bowlerStat) {
            bowlerStat = { userId: bowlerId, overs: 0, balls: 0, maidens: 0, runsConceded: 0, wickets: 0 };
            currentInnings.bowlingStats.push(bowlerStat);
        }

        bowlerStat.runsConceded += bowlerRunsConceded;
        if (isValidBall) {
            bowlerStat.balls += 1;
            bowlerStat.overs = ballsToOvers(bowlerStat.balls);
        }

        // 5. Update Valid Balls Bowled
        if (isValidBall) {
            currentInnings.ballsBowled += 1;
            currentInnings.overs = ballsToOvers(currentInnings.ballsBowled);
        }

        // 6. Process Wicket
        let wicketOccurred = false;
        let isBowlerWicket = false;
        let nextStrikerId = strikerId;
        let nextNonStrikerId = nonStrikerId;

        if (wicket) {
            wicketOccurred = true;
            const playerOutId = new ObjectId(wicket.playerOutId);

            // Verify the player out is striker or non-striker
            if (playerOutId.toString() !== strikerId.toString() && playerOutId.toString() !== nonStrikerId.toString()) {
                return res.status(400).json({ success: false, message: "Dismissed player is not currently active on crease" });
            }

            // Mark batter as out
            const outBatterStat = currentInnings.battingStats.find(b => b.userId.toString() === playerOutId.toString());
            if (outBatterStat) {
                outBatterStat.out = true;
                outBatterStat.dismissal = {
                    type: wicket.type,
                    fielderId: wicket.fielderId ? new ObjectId(wicket.fielderId) : null,
                    bowlerId: bowlerId
                };
            }

            currentInnings.wickets += 1;

            // Bowler gets credit if it's bowled, caught, lbw, stumped, or hit wicket
            const bowlerCreditedTypes = ["bowled", "caught", "lbw", "stumped", "hit_wicket"];
            if (bowlerCreditedTypes.includes(wicket.type)) {
                isBowlerWicket = true;
                bowlerStat.wickets += 1;
            }

            // If team still has players, insert the next batter
            const activeWickets = currentInnings.wickets;
            if (activeWickets < maxWickets) {
                if (!wicket.nextBatterId) {
                    return res.status(400).json({
                        success: false,
                        message: "wicket occurred: nextBatterId is required to continue play"
                    });
                }

                const nextBatterObjectId = new ObjectId(wicket.nextBatterId);

                // Verify next batter belongs to batting team and has not batted yet
                const battingRosterIds = battingTeam.players.map(p => p.userId.toString());
                if (!battingRosterIds.includes(wicket.nextBatterId)) {
                    return res.status(400).json({ success: false, message: "Next batter must be in the batting team roster" });
                }

                const alreadyBatted = currentInnings.battingStats.some(b => b.userId.toString() === wicket.nextBatterId);
                if (alreadyBatted) {
                    return res.status(400).json({ success: false, message: "Next batter has already batted in this innings" });
                }

                // Add to batting stats
                currentInnings.battingStats.push({
                    userId: nextBatterObjectId,
                    runs: 0,
                    balls: 0,
                    fours: 0,
                    sixes: 0,
                    out: false,
                    dismissal: null
                });

                // Determine striker/non-striker placements:
                // New batter takes strike by default (unless end of over)
                if (playerOutId.toString() === strikerId.toString()) {
                    nextStrikerId = nextBatterObjectId;
                } else {
                    nextNonStrikerId = nextBatterObjectId;
                    // Swap positions so the new batter takes strike (if not end of over)
                    if (currentInnings.ballsBowled % 6 !== 0) {
                        const temp = nextStrikerId;
                        nextStrikerId = nextNonStrikerId;
                        nextNonStrikerId = temp;
                    }
                }
            } else {
                // All out
                nextStrikerId = null;
                nextNonStrikerId = null;
            }
        }

        // 7. Swapping ends based on runs (odd runs swaps striker)
        if (!wicketOccurred && (ballRuns % 2 === 1) && !isWide) {
            const temp = nextStrikerId;
            nextStrikerId = nextNonStrikerId;
            nextNonStrikerId = temp;
        }

        // 8. Swapping ends at the end of the over
        const isOverEnded = isValidBall && (currentInnings.ballsBowled % 6 === 0) && currentInnings.ballsBowled > 0;
        if (isOverEnded && nextStrikerId && nextNonStrikerId) {
            const temp = nextStrikerId;
            nextStrikerId = nextNonStrikerId;
            nextNonStrikerId = temp;
        }

        // 9. Free Hit validation
        let isFreeHitNext = false;
        if (isNoBall) {
            isFreeHitNext = true;
        } else if (state.freeHit && !isValidBall) {
            isFreeHitNext = true; // Wide/No-ball on free hit keeps it free hit
        }

        // 10. Record delivery detail
        const deliveryDetail = {
            strikerId,
            nonStrikerId,
            bowlerId,
            runs: runs,
            isValidBall,
            extras: extras ? { type: extras.type, runs: extras.runs } : null,
            wicket: wicket ? { type: wicket.type, playerOutId: new ObjectId(wicket.playerOutId), fielderId: wicket.fielderId ? new ObjectId(wicket.fielderId) : null } : null,
            teamScoreAtBall: currentInnings.runs,
            wicketsAtBall: currentInnings.wickets,
            oversAtBall: currentInnings.overs,
            timestamp: new Date()
        };
        currentInnings.deliveries.push(deliveryDetail);

        // Update active batsmen in state
        const updatedBatsmen = [];
        if (nextStrikerId) updatedBatsmen.push({ userId: nextStrikerId, isStriker: true });
        if (nextNonStrikerId) updatedBatsmen.push({ userId: nextNonStrikerId, isStriker: false });
        state.currentBatsmen = updatedBatsmen;

        // Set free hit status
        state.freeHit = isFreeHitNext;

        // Set bowler: If over ended and nextBowlerId is specified, update bowler.
        if (isOverEnded && nextBowlerId) {
            state.currentBowler = new ObjectId(nextBowlerId);
        }

        // 11. Check Innings & Match Completion
        let targetScore = null;
        if (state.currentInnings === 2) {
            targetScore = state.innings[0].runs + 1;
        }

        let isMatchCompleted = false;
        let isCurrentInningsCompleted = false;

        const allOut = currentInnings.wickets >= maxWickets;
        const oversLimitReached = currentInnings.ballsBowled >= match.overs * 6;

        if (state.currentInnings === 1) {
            if (allOut || oversLimitReached) {
                isCurrentInningsCompleted = true;
            }
        } else if (state.currentInnings === 2) {
            const scoreChased = currentInnings.runs >= targetScore;
            if (scoreChased || allOut || oversLimitReached) {
                isCurrentInningsCompleted = true;
                isMatchCompleted = true;
            }
        }

        let winnerId = null;
        let resultMessage = "";
        let matchStatus = "live";

        if (isMatchCompleted) {
            matchStatus = "completed";
            const score1 = state.innings[0].runs;
            const score2 = currentInnings.runs;

            if (score2 >= targetScore) {
                winnerId = currentInnings.battingTeamId;
                const remainingWickets = maxWickets - currentInnings.wickets;
                resultMessage = `${battingTeam.name} won by ${remainingWickets} wickets`;
            } else if (score2 < score1) {
                winnerId = state.innings[0].battingTeamId;
                const runsMargin = score1 - score2;
                resultMessage = `${bowlingTeam.name} won by ${runsMargin} runs`;
            } else {
                resultMessage = "Match tied";
            }
        }

        // Save modifications to database
        const updateParams = {
            "state.innings": state.innings,
            "state.currentBatsmen": state.currentBatsmen,
            "state.freeHit": state.freeHit,
            "state.currentBowler": state.currentBowler,
            updatedAt: new Date()
        };

        if (isMatchCompleted) {
            updateParams.status = "completed";
            updateParams.winnerId = winnerId;
            updateParams.resultMessage = resultMessage;
        }

        await matches.updateOne(
            { _id: new ObjectId(id) },
            { $set: updateParams }
        );

        return res.status(200).json({
            success: true,
            message: "Ball recorded successfully",
            ballDetail: deliveryDetail,
            state: {
                runs: currentInnings.runs,
                wickets: currentInnings.wickets,
                overs: currentInnings.overs,
                target: targetScore,
                freeHit: state.freeHit,
                inningsCompleted: isCurrentInningsCompleted,
                matchCompleted: isMatchCompleted,
                resultMessage
            }
        });

    } catch (error) {
        console.error("Record ball error:", error);
        return res.status(500).json({ success: false, message: "Failed to record ball" });
    }
};

// GET MATCH SCORECARD & DETAILS
export const getScorecard = async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid match ID" });
        }

        const matches = db("cricket", "matches");
        const teams = db("cricket", "teams");
        const grounds = db("cricket", "grounds");
        const users = db("auth", "users");

        const match = await matches.findOne({ _id: new ObjectId(id) });
        if (!match) {
            return res.status(404).json({ success: false, message: "Match not found" });
        }

        // Fetch team names
        const teamA = await teams.findOne({ _id: match.teamAId });
        const teamB = await teams.findOne({ _id: match.teamBId });
        const ground = await grounds.findOne({ _id: match.groundId });

        // Retrieve names of all users associated with this match for clean readable names
        const allUserIds = [];
        if (match.state?.innings) {
            match.state.innings.forEach(innings => {
                innings.battingStats.forEach(b => allUserIds.push(b.userId));
                innings.bowlingStats.forEach(b => allUserIds.push(b.userId));
                innings.deliveries.forEach(d => {
                    allUserIds.push(d.strikerId);
                    allUserIds.push(d.nonStrikerId);
                    allUserIds.push(d.bowlerId);
                });
            });
        }

        const uniqueUserObjectIds = [...new Set(allUserIds.map(id => id.toString()))].map(id => new ObjectId(id));
        const usersList = await users.find({ _id: { $in: uniqueUserObjectIds } }).toArray();
        const usersMap = {};
        usersList.forEach(u => {
            usersMap[u._id.toString()] = u.name;
        });

        // Format Scorecard
        const formattedInnings = [];
        if (match.state?.innings) {
            match.state.innings.forEach((inn, index) => {
                const battingTeamName = inn.battingTeamId.toString() === teamA._id.toString() ? teamA.name : teamB.name;
                const bowlingTeamName = inn.bowlingTeamId.toString() === teamA._id.toString() ? teamA.name : teamB.name;

                const battingStats = inn.battingStats.map(b => ({
                    userId: b.userId,
                    name: usersMap[b.userId.toString()] || "Unknown Player",
                    runs: b.runs,
                    balls: b.balls,
                    fours: b.fours,
                    sixes: b.sixes,
                    strikeRate: b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(2) : "0.00",
                    out: b.out,
                    dismissal: b.dismissal ? {
                        type: b.dismissal.type,
                        fielderName: b.dismissal.fielderId ? usersMap[b.dismissal.fielderId.toString()] : null,
                        bowlerName: b.dismissal.bowlerId ? usersMap[b.dismissal.bowlerId.toString()] : null
                    } : null
                }));

                const bowlingStats = inn.bowlingStats.map(b => ({
                    userId: b.userId,
                    name: usersMap[b.userId.toString()] || "Unknown Player",
                    overs: b.overs,
                    maidens: b.maidens,
                    runsConceded: b.runsConceded,
                    wickets: b.wickets,
                    economy: b.balls > 0 ? ((b.runsConceded / b.balls) * 6).toFixed(2) : "0.00"
                }));

                formattedInnings.push({
                    inningsNumber: index + 1,
                    battingTeam: battingTeamName,
                    bowlingTeam: bowlingTeamName,
                    runs: inn.runs,
                    wickets: inn.wickets,
                    overs: inn.overs,
                    extras: inn.extras,
                    battingStats,
                    bowlingStats
                });
            });
        }

        // Live stats overview
        let liveOverview = null;
        if (match.status === "live" && match.state) {
            const currentInnings = match.state.innings[match.state.currentInnings - 1];
            const striker = match.state.currentBatsmen.find(b => b.isStriker);
            const nonStriker = match.state.currentBatsmen.find(b => !b.isStriker);
            const bowler = match.state.currentBowler;

            liveOverview = {
                currentInnings: match.state.currentInnings,
                battingTeamName: currentInnings.battingTeamId.toString() === teamA._id.toString() ? teamA.name : teamB.name,
                runs: currentInnings.runs,
                wickets: currentInnings.wickets,
                overs: currentInnings.overs,
                striker: striker ? {
                    userId: striker.userId,
                    name: usersMap[striker.userId.toString()] || "Unknown Player",
                    stats: currentInnings.battingStats.find(b => b.userId.toString() === striker.userId.toString())
                } : null,
                nonStriker: nonStriker ? {
                    userId: nonStriker.userId,
                    name: usersMap[nonStriker.userId.toString()] || "Unknown Player",
                    stats: currentInnings.battingStats.find(b => b.userId.toString() === nonStriker.userId.toString())
                } : null,
                bowler: bowler ? {
                    userId: bowler,
                    name: usersMap[bowler.toString()] || "Unknown Player",
                    stats: currentInnings.bowlingStats.find(b => b.userId.toString() === bowler.toString())
                } : null,
                freeHit: match.state.freeHit
            };
        }

        return res.status(200).json({
            success: true,
            data: {
                matchId: match._id,
                ground: ground ? { name: ground.name, city: ground.city } : null,
                teamA: teamA.name,
                teamB: teamB.name,
                format: match.format,
                overs: match.overs,
                toss: {
                    wonBy: match.toss.wonBy.toString() === teamA._id.toString() ? teamA.name : teamB.name,
                    decision: match.toss.decision
                },
                status: match.status,
                winner: match.winnerId ? (match.winnerId.toString() === teamA._id.toString() ? teamA.name : teamB.name) : null,
                resultMessage: match.resultMessage,
                liveOverview,
                innings: formattedInnings
            }
        });

    } catch (error) {
        console.error("Get scorecard error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch scorecard details" });
    }
};

// UPDATE ACTIVE BATSMEN (Edit active batsmen by mistake)
export const updateActiveBatsmen = async (req, res) => {
    try {
        const { id } = req.params;
        const { strikerId, nonStrikerId } = req.body;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid match ID" });
        }

        const matches = db("cricket", "matches");
        const teams = db("cricket", "teams");

        const match = await matches.findOne({ _id: new ObjectId(id) });
        if (!match) {
            return res.status(404).json({ success: false, message: "Match not found" });
        }

        if (match.status !== "live") {
            return res.status(400).json({ success: false, message: "Match must be live to update active batsmen" });
        }

        const currentInnings = match.state.innings[match.state.currentInnings - 1];
        const battingTeam = await teams.findOne({ _id: currentInnings.battingTeamId });
        const battingUserIds = battingTeam.players.map(p => p.userId.toString());

        if (!battingUserIds.includes(strikerId) || !battingUserIds.includes(nonStrikerId)) {
            return res.status(400).json({ success: false, message: "Both players must belong to the batting team roster" });
        }

        if (strikerId === nonStrikerId) {
            return res.status(400).json({ success: false, message: "Striker and non-striker cannot be the same player" });
        }

        // Initialize batting stats for them if they aren't in there yet
        const strikerObjectId = new ObjectId(strikerId);
        const nonStrikerObjectId = new ObjectId(nonStrikerId);

        let strikerStat = currentInnings.battingStats.find(b => b.userId.toString() === strikerId);
        if (!strikerStat) {
            currentInnings.battingStats.push({
                userId: strikerObjectId,
                runs: 0,
                balls: 0,
                fours: 0,
                sixes: 0,
                out: false,
                dismissal: null
            });
        }

        let nonStrikerStat = currentInnings.battingStats.find(b => b.userId.toString() === nonStrikerId);
        if (!nonStrikerStat) {
            currentInnings.battingStats.push({
                userId: nonStrikerObjectId,
                runs: 0,
                balls: 0,
                fours: 0,
                sixes: 0,
                out: false,
                dismissal: null
            });
        }

        const updatedBatsmen = [
            { userId: strikerObjectId, isStriker: true },
            { userId: nonStrikerObjectId, isStriker: false }
        ];

        await matches.updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    "state.currentBatsmen": updatedBatsmen,
                    "state.innings": match.state.innings,
                    updatedAt: new Date()
                }
            }
        );

        return res.status(200).json({
            success: true,
            message: "Active batsmen updated successfully",
            currentBatsmen: updatedBatsmen
        });

    } catch (error) {
        console.error("Update active batsmen error:", error);
        return res.status(500).json({ success: false, message: "Failed to update active batsmen" });
    }
};

// UPDATE A PREVIOUS DELIVERY (Correct ball details by mistake)
export const updateDelivery = async (req, res) => {
    try {
        const { id, index } = req.params;
        const { runs, extras, wicket } = req.body;
        const deliveryIdx = parseInt(index, 10);

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid match ID" });
        }

        const matches = db("cricket", "matches");
        const teams = db("cricket", "teams");

        const match = await matches.findOne({ _id: new ObjectId(id) });
        if (!match) {
            return res.status(404).json({ success: false, message: "Match not found" });
        }

        if (!match.state || !match.state.innings) {
            return res.status(400).json({ success: false, message: "Match state is not initialized" });
        }

        const state = match.state;
        const currentInningsIdx = state.currentInnings - 1;
        const currentInnings = state.innings[currentInningsIdx];

        if (isNaN(deliveryIdx) || deliveryIdx < 0 || deliveryIdx >= currentInnings.deliveries.length) {
            return res.status(400).json({ success: false, message: "Invalid delivery index" });
        }

        // Update the delivery detail at that index
        const delivery = currentInnings.deliveries[deliveryIdx];
        
        const isWide = extras?.type === "wide";
        const isNoBall = extras?.type === "no_ball";
        const isValidBall = !isWide && !isNoBall;

        delivery.runs = runs;
        delivery.isValidBall = isValidBall;
        delivery.extras = extras ? { type: extras.type, runs: extras.runs } : null;
        delivery.wicket = wicket ? {
            type: wicket.type,
            playerOutId: new ObjectId(wicket.playerOutId),
            fielderId: wicket.fielderId ? new ObjectId(wicket.fielderId) : null
        } : null;

        // Recalculate whole Innings from deliveries
        const deliveries = currentInnings.deliveries;
        
        // Reset Innings stats
        currentInnings.runs = 0;
        currentInnings.wickets = 0;
        currentInnings.overs = 0;
        currentInnings.ballsBowled = 0;
        currentInnings.extras = { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0 };
        currentInnings.battingStats = [];
        currentInnings.bowlingStats = [];

        // Pre-initialize first delivery players if deliveries exist
        if (deliveries.length > 0) {
            const firstDel = deliveries[0];
            currentInnings.battingStats.push(
                { userId: new ObjectId(firstDel.strikerId), runs: 0, balls: 0, fours: 0, sixes: 0, out: false, dismissal: null },
                { userId: new ObjectId(firstDel.nonStrikerId), runs: 0, balls: 0, fours: 0, sixes: 0, out: false, dismissal: null }
            );
            currentInnings.bowlingStats.push(
                { userId: new ObjectId(firstDel.bowlerId), overs: 0, balls: 0, maidens: 0, runsConceded: 0, wickets: 0 }
            );
        }

        // Recalculation loop
        for (let i = 0; i < deliveries.length; i++) {
            const d = deliveries[i];
            const dStrikerId = new ObjectId(d.strikerId);
            const dNonStrikerId = new ObjectId(d.nonStrikerId);
            const dBowlerId = new ObjectId(d.bowlerId);

            // Ensure players exist in stats
            let bStat = currentInnings.battingStats.find(b => b.userId.toString() === dStrikerId.toString());
            if (!bStat) {
                bStat = { userId: dStrikerId, runs: 0, balls: 0, fours: 0, sixes: 0, out: false, dismissal: null };
                currentInnings.battingStats.push(bStat);
            }

            let nsStat = currentInnings.battingStats.find(b => b.userId.toString() === dNonStrikerId.toString());
            if (!nsStat) {
                nsStat = { userId: dNonStrikerId, runs: 0, balls: 0, fours: 0, sixes: 0, out: false, dismissal: null };
                currentInnings.battingStats.push(nsStat);
            }

            let bowlStat = currentInnings.bowlingStats.find(b => b.userId.toString() === dBowlerId.toString());
            if (!bowlStat) {
                bowlStat = { userId: dBowlerId, overs: 0, balls: 0, maidens: 0, runsConceded: 0, wickets: 0 };
                currentInnings.bowlingStats.push(bowlStat);
            }

            // Calculate runs for this delivery
            const dIsWide = d.extras?.type === "wide";
            const dIsNoBall = d.extras?.type === "no_ball";
            const dIsBye = d.extras?.type === "bye";
            const dIsLegBye = d.extras?.type === "leg_bye";
            const dIsPenalty = d.extras?.type === "penalty";

            const dIsValidBall = !dIsWide && !dIsNoBall;

            let dBallRuns = 0;
            let dBatterRuns = 0;
            let dBowlerRuns = 0;

            if (dIsWide) {
                const widePenalty = 1 + (d.extras.runs || 0);
                dBallRuns = widePenalty;
                dBowlerRuns = widePenalty;
                currentInnings.extras.wides += widePenalty;
            } else if (dIsNoBall) {
                const noBallPenalty = 1 + d.runs + (d.extras.runs || 0);
                dBallRuns = noBallPenalty;
                dBatterRuns = d.runs;
                dBowlerRuns = 1 + d.runs;
                currentInnings.extras.noBalls += 1;
            } else if (dIsBye || dIsLegBye) {
                dBallRuns = d.extras.runs || 0;
                if (dIsBye) currentInnings.extras.byes += dBallRuns;
                if (dIsLegBye) currentInnings.extras.legByes += dBallRuns;
            } else if (dIsPenalty) {
                dBallRuns = d.extras.runs || 5;
                currentInnings.extras.penalty += dBallRuns;
            } else {
                dBallRuns = d.runs;
                dBatterRuns = d.runs;
                dBowlerRuns = d.runs;
            }

            currentInnings.runs += dBallRuns;

            if (!dIsWide) {
                bStat.runs += dBatterRuns;
                bStat.balls += 1;
                if (dBatterRuns === 4 && !dIsBye && !dIsLegBye) bStat.fours += 1;
                if (dBatterRuns === 6 && !dIsBye && !dIsLegBye) bStat.sixes += 1;
            }

            bowlStat.runsConceded += dBowlerRuns;
            if (dIsValidBall) {
                bowlStat.balls += 1;
                bowlStat.overs = ballsToOvers(bowlStat.balls);
                currentInnings.ballsBowled += 1;
                currentInnings.overs = ballsToOvers(currentInnings.ballsBowled);
            }

            if (d.wicket) {
                const dOutId = new ObjectId(d.wicket.playerOutId);
                const outStat = currentInnings.battingStats.find(b => b.userId.toString() === dOutId.toString());
                if (outStat) {
                    outStat.out = true;
                    outStat.dismissal = {
                        type: d.wicket.type,
                        fielderId: d.wicket.fielderId ? new ObjectId(d.wicket.fielderId) : null,
                        bowlerId: dBowlerId
                    };
                }
                currentInnings.wickets += 1;
                if (["bowled", "caught", "lbw", "stumped", "hit_wicket"].includes(d.wicket.type)) {
                    bowlStat.wickets += 1;
                }
            }

            // Update indices on delivery record for tracking correctness
            d.teamScoreAtBall = currentInnings.runs;
            d.wicketsAtBall = currentInnings.wickets;
            d.oversAtBall = currentInnings.overs;
        }

        // Check Match/Innings completion status
        const battingTeam = await teams.findOne({ _id: currentInnings.battingTeamId });
        const maxWickets = battingTeam.players.length - 1;
        
        let targetScore = null;
        if (state.currentInnings === 2) {
            targetScore = state.innings[0].runs + 1;
        }

        let isMatchCompleted = false;
        let isCurrentInningsCompleted = false;

        const allOut = currentInnings.wickets >= maxWickets;
        const oversLimitReached = currentInnings.ballsBowled >= match.overs * 6;

        if (state.currentInnings === 1) {
            if (allOut || oversLimitReached) {
                isCurrentInningsCompleted = true;
            }
        } else if (state.currentInnings === 2) {
            const scoreChased = currentInnings.runs >= targetScore;
            if (scoreChased || allOut || oversLimitReached) {
                isCurrentInningsCompleted = true;
                isMatchCompleted = true;
            }
        }

        let winnerId = null;
        let resultMessage = "";
        let matchStatus = match.status;

        if (isMatchCompleted) {
            matchStatus = "completed";
            const score1 = state.innings[0].runs;
            const score2 = currentInnings.runs;
            const bowlingTeam = await teams.findOne({ _id: currentInnings.bowlingTeamId });

            if (score2 >= targetScore) {
                winnerId = currentInnings.battingTeamId;
                const remainingWickets = maxWickets - currentInnings.wickets;
                resultMessage = `${battingTeam.name} won by ${remainingWickets} wickets`;
            } else if (score2 < score1) {
                winnerId = state.innings[0].battingTeamId;
                const runsMargin = score1 - score2;
                resultMessage = `${bowlingTeam.name} won by ${runsMargin} runs`;
            } else {
                resultMessage = "Match tied";
            }
        } else {
            // If the match was completed but the edit made it active again
            matchStatus = "live";
            winnerId = null;
            resultMessage = "";
        }

        const updateParams = {
            "state.innings": state.innings,
            status: matchStatus,
            winnerId,
            resultMessage,
            updatedAt: new Date()
        };

        await matches.updateOne(
            { _id: new ObjectId(id) },
            { $set: updateParams }
        );

        return res.status(200).json({
            success: true,
            message: "Delivery updated and scorecard recalculated successfully",
            state: {
                runs: currentInnings.runs,
                wickets: currentInnings.wickets,
                overs: currentInnings.overs,
                target: targetScore,
                inningsCompleted: isCurrentInningsCompleted,
                matchCompleted: isMatchCompleted,
                resultMessage
            }
        });

    } catch (error) {
        console.error("Update delivery error:", error);
        return res.status(500).json({ success: false, message: "Failed to update delivery details" });
    }
};

