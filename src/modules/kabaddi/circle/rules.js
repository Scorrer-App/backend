export const processRaid = (state, raidData) => {
    // Clone state to avoid mutating input directly
    const nextState = JSON.parse(JSON.stringify(state));
    const { raiderId, outcome, defenderId, foulReason, pointsAttacking: optPointsAttacking, pointsDefending: optPointsDefending } = raidData;

    // Determine attacking and defending teams
    let attackingTeamKey, defendingTeamKey;
    if (nextState.teamA.activePlayers.includes(raiderId)) {
        attackingTeamKey = "teamA";
        defendingTeamKey = "teamB";
    } else if (nextState.teamB.activePlayers.includes(raiderId)) {
        attackingTeamKey = "teamB";
        defendingTeamKey = "teamA";
    } else {
        throw new Error(`Raider ${raiderId} does not belong to either team in the match`);
    }

    const attackingTeam = nextState[attackingTeamKey];
    const defendingTeam = nextState[defendingTeamKey];

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
