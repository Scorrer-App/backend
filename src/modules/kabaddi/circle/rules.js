export const processRaid = (state, raidData) => {
    // Clone state to avoid mutating input directly
    const nextState = JSON.parse(JSON.stringify(state));
    const { raiderId, outcome, defenderId, foulReason, pointsAttacking: optPointsAttacking, pointsDefending: optPointsDefending } = raidData;

    // Determine attacking and defending teams and validate raider is active
    let attackingTeamKey, defendingTeamKey;
    const isRaiderActiveA = nextState.teamA.activePlayers.includes(raiderId);
    const isRaiderActiveB = nextState.teamB.activePlayers.includes(raiderId);

    if (isRaiderActiveA) {
        attackingTeamKey = "teamA";
        defendingTeamKey = "teamB";
    } else if (isRaiderActiveB) {
        attackingTeamKey = "teamB";
        defendingTeamKey = "teamA";
    } else {
        const isSub = nextState.teamA.substitutes.includes(raiderId) || nextState.teamB.substitutes.includes(raiderId);
        const isInjured = nextState.teamA.injuredPlayers.includes(raiderId) || nextState.teamB.injuredPlayers.includes(raiderId);
        if (isSub) {
            throw new Error(`Raider ${raiderId} is a substitute`);
        } else if (isInjured) {
            throw new Error(`Raider ${raiderId} is injured`);
        } else {
            throw new Error(`Raider ${raiderId} does not belong to either team in the match`);
        }
    }

    const attackingTeam = nextState[attackingTeamKey];
    const defendingTeam = nextState[defendingTeamKey];

    // Validate defenderId (stopper) if provided
    if (defenderId) {
        if (!defendingTeam.activePlayers.includes(defenderId)) {
            const belongsToAttacking = attackingTeam.activePlayers.includes(defenderId) || 
                                       attackingTeam.substitutes.includes(defenderId) || 
                                       attackingTeam.injuredPlayers.includes(defenderId);
            if (belongsToAttacking) {
                throw new Error(`Stopper ${defenderId} belongs to the attacking team`);
            } else if (defendingTeam.substitutes.includes(defenderId)) {
                throw new Error(`Stopper ${defenderId} is a substitute`);
            } else if (defendingTeam.injuredPlayers.includes(defenderId)) {
                throw new Error(`Stopper ${defenderId} is injured`);
            } else {
                throw new Error(`Stopper ${defenderId} does not belong to the defending team`);
            }
        }
    }

    // Initialize scoring and tracking for this raid
    let pointsAttacking = 0;
    let pointsDefending = 0;
    let eventLog = "";

    // Stats updates helper
    const getOrInitStats = (userId) => {
        if (!nextState.stats[userId]) {
            nextState.stats[userId] = {
                raids: 0,
                raidPoints: 0,
                touchPoints: 0,
                tacklePoints: 0,
                bonusPoints: 0,
                superTackles: 0,
                outCount: 0
            };
        }
        return nextState.stats[userId];
    };

    // Increment raider's raid count
    const raiderStats = getOrInitStats(raiderId);
    raiderStats.raids += 1;

    // Process outcome
    if (outcome === "touch") {
        pointsAttacking += 1;
        raiderStats.touchPoints += 1;
        raiderStats.raidPoints += 1;
        
        let stopperMsg = "";
        if (defenderId) {
            stopperMsg = ` (Stopper: ${defenderId})`;
        }
        eventLog += `Raider touch point scored${stopperMsg}.`;

    } else if (outcome === "tackle" || outcome === "super_tackle") {
        pointsDefending += 1;
        if (defenderId) {
            const defenderStats = getOrInitStats(defenderId);
            defenderStats.tacklePoints += 1;
        }
        eventLog += `Stopper tackle successful. Defending team scores +1 point.`;

    } else if (outcome === "foul") {
        if (foulReason === "multiple_stoppers") {
            // Two-defender foul (multiple stoppers) -> +1 to attacking team
            pointsAttacking += 1;
            raiderStats.raidPoints += 1;
            eventLog += "Multiple stoppers foul committed by defending team. Attacking team scores +1 point.";
        } else if (foulReason === "out_of_bounds") {
            // Stopper went out -> +1 attacking; Raider went out -> +1 defending
            if (optPointsAttacking !== undefined || optPointsDefending !== undefined) {
                pointsAttacking = optPointsAttacking || 0;
                pointsDefending = optPointsDefending || 0;
            } else {
                if (defenderId) {
                    pointsAttacking = 1;
                    raiderStats.raidPoints += 1;
                    eventLog += `Stopper ${defenderId} went out of bounds. Attacking team scores +1 point.`;
                } else {
                    pointsDefending = 1;
                    eventLog += "Raider went out of bounds. Defending team scores +1 point.";
                }
            }
        } else {
            if (optPointsAttacking !== undefined) pointsAttacking = optPointsAttacking;
            if (optPointsDefending !== undefined) pointsDefending = optPointsDefending;
            eventLog += `Foul committed. Attacking: +${pointsAttacking}, Defending: +${pointsDefending}.`;
        }
    } else if (outcome === "technical") {
        if (optPointsAttacking !== undefined) pointsAttacking = optPointsAttacking;
        if (optPointsDefending !== undefined) pointsDefending = optPointsDefending;
        eventLog += `Technical point recorded. Attacking: +${pointsAttacking}, Defending: +${pointsDefending}.`;
    } else if (outcome === "empty") {
        eventLog += "Empty raid recorded. No score.";
    }

    // Apply scores
    if (attackingTeamKey === "teamA") {
        nextState.score.teamA += pointsAttacking;
        nextState.score.teamB += pointsDefending;
    } else {
        nextState.score.teamA += pointsDefending;
        nextState.score.teamB += pointsAttacking;
    }

    // In Circle Kabaddi, players never go out, so activePlayers is always equal to starting squad.
    // Ensure outPlayers is empty and activePlayers matches starting squad.
    attackingTeam.activePlayers = [...attackingTeam.squad];
    attackingTeam.outPlayers = [];
    defendingTeam.activePlayers = [...defendingTeam.squad];
    defendingTeam.outPlayers = [];

    // Compile raid record
    const raidRecord = {
        raiderId,
        outcome,
        pointsAttacking,
        pointsDefending,
        defenderId,
        foulReason,
        eventLog,
        timestamp: new Date()
    };

    nextState.raids.push(raidRecord);

    return {
        nextState,
        pointsScored: {
            teamA: attackingTeamKey === "teamA" ? pointsAttacking : pointsDefending,
            teamB: attackingTeamKey === "teamA" ? pointsDefending : pointsAttacking
        },
        eventLog
    };
};
