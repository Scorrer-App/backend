export const processRaid = (state, raidData) => {
    // Clone state to avoid mutating input directly
    const nextState = JSON.parse(JSON.stringify(state));
    const { raiderId, outcome, touchedPlayers = [], defenderId, isBonusScored = false, isSuperTackle = false } = raidData;

    // Determine attacking and defending teams
    let attackingTeamKey, defendingTeamKey;
    if (nextState.teamA.activePlayers.includes(raiderId) || nextState.teamA.outPlayers.includes(raiderId)) {
        attackingTeamKey = "teamA";
        defendingTeamKey = "teamB";
    } else if (nextState.teamB.activePlayers.includes(raiderId) || nextState.teamB.outPlayers.includes(raiderId)) {
        attackingTeamKey = "teamB";
        defendingTeamKey = "teamA";
    } else {
        throw new Error(`Raider ${raiderId} does not belong to either team in the match`);
    }

    const attackingTeam = nextState[attackingTeamKey];
    const defendingTeam = nextState[defendingTeamKey];

    const attackingTeamId = attackingTeamKey === "teamA" ? nextState.teamAId : nextState.teamBId;
    const defendingTeamId = defendingTeamKey === "teamA" ? nextState.teamAId : nextState.teamBId;

    // Initialize scoring and tracking for this raid
    let pointsAttacking = 0;
    let pointsDefending = 0;
    const revivedAttacking = [];
    const revivedDefending = [];
    const outPlayersAttacking = [];
    const outPlayersDefending = [];
    let eventLog = "";

    // Stats updates
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

    const initialDefendersCount = defendingTeam.activePlayers.length;

    // Process outcome
    if (outcome === "touch") {
        // Validation: touched players must be active
        const activeTouched = touchedPlayers.filter(id => defendingTeam.activePlayers.includes(id));
        if (activeTouched.length === 0) {
            throw new Error("Touch outcome must specify active defending players in touchedPlayers");
        }

        pointsAttacking += activeTouched.length;
        raiderStats.touchPoints += activeTouched.length;
        raiderStats.raidPoints += activeTouched.length;

        // Move touched players to outPlayers
        for (const defenderId of activeTouched) {
            defendingTeam.activePlayers = defendingTeam.activePlayers.filter(id => id !== defenderId);
            defendingTeam.outPlayers.push(defenderId);
            outPlayersDefending.push(defenderId);
            getOrInitStats(defenderId).outCount += 1;
        }

        // Process bonus line if checked
        if (isBonusScored) {
            if (initialDefendersCount >= 6) {
                pointsAttacking += 1;
                raiderStats.bonusPoints += 1;
                raiderStats.raidPoints += 1;
                eventLog += "Bonus point scored. ";
            }
        }

        // Revive players from attacking team's out list
        const reviveCount = activeTouched.length;
        for (let i = 0; i < reviveCount; i++) {
            if (attackingTeam.outPlayers.length > 0) {
                const revivedPlayerId = attackingTeam.outPlayers.shift();
                attackingTeam.activePlayers.push(revivedPlayerId);
                revivedAttacking.push(revivedPlayerId);
            }
        }

        // Reset consecutive empty raids
        nextState.consecutiveEmptyRaids[attackingTeamKey] = 0;
        eventLog += `Touch point(s) scored: +${activeTouched.length} points.`;

    } else if (outcome === "bonus") {
        if (initialDefendersCount < 6) {
            throw new Error("Bonus point can only be scored if defending team has 6 or more players active");
        }

        pointsAttacking += 1;
        raiderStats.bonusPoints += 1;
        raiderStats.raidPoints += 1;

        // Reset consecutive empty raids
        nextState.consecutiveEmptyRaids[attackingTeamKey] = 0;
        eventLog += "Bonus point scored safely.";

    } else if (outcome === "tackle" || outcome === "super_tackle") {
        // Raider is tackled and is out
        attackingTeam.activePlayers = attackingTeam.activePlayers.filter(id => id !== raiderId);
        attackingTeam.outPlayers.push(raiderId);
        outPlayersAttacking.push(raiderId);
        raiderStats.outCount += 1;

        const isSuper = outcome === "super_tackle" || (isSuperTackle && initialDefendersCount <= 3);
        const tacklePointsAwarded = isSuper ? 2 : 1;

        pointsDefending += tacklePointsAwarded;

        // Credit primary defender and team stats
        if (defenderId) {
            const defenderStats = getOrInitStats(defenderId);
            defenderStats.tacklePoints += 1;
            if (isSuper) {
                defenderStats.superTackles += 1;
            }
        }

        // Revive 1 defender
        if (defendingTeam.outPlayers.length > 0) {
            const revivedPlayerId = defendingTeam.outPlayers.shift();
            defendingTeam.activePlayers.push(revivedPlayerId);
            revivedDefending.push(revivedPlayerId);
        }

        // Reset consecutive empty raids
        nextState.consecutiveEmptyRaids[attackingTeamKey] = 0;
        eventLog += `${isSuper ? "Super " : ""}Tackle successful! Defending team scores +${tacklePointsAwarded} point(s).`;

    } else if (outcome === "empty") {
        // Increment empty raids
        nextState.consecutiveEmptyRaids[attackingTeamKey] += 1;
        eventLog += `Empty raid recorded. Consecutive empty raids for ${attackingTeamKey}: ${nextState.consecutiveEmptyRaids[attackingTeamKey]}.`;

        // Check if this was a do-or-die situation
        // If consecutiveEmptyRaids is now >= 3, it should have been declared do_or_die_empty if they didn't score.
        // Wait, the client usually determines if it's do-or-die. If they submit "empty" but their count was 2,
        // it means they had 2 consecutive empty raids, and this 3rd one was also empty. Under standard rules,
        // the 3rd raid MUST score. If they submit "empty" when consecutive count was 2, we automatically turn it
        // into a do-or-die out or let them know.
        // Let's check: if current count before this was 2, this is the 3rd raid. If it's empty, raider is out!
        if (nextState.consecutiveEmptyRaids[attackingTeamKey] >= 3) {
            // Raider out!
            attackingTeam.activePlayers = attackingTeam.activePlayers.filter(id => id !== raiderId);
            attackingTeam.outPlayers.push(raiderId);
            outPlayersAttacking.push(raiderId);
            raiderStats.outCount += 1;

            pointsDefending += 1;

            if (defendingTeam.outPlayers.length > 0) {
                const revivedPlayerId = defendingTeam.outPlayers.shift();
                defendingTeam.activePlayers.push(revivedPlayerId);
                revivedDefending.push(revivedPlayerId);
            }

            nextState.consecutiveEmptyRaids[attackingTeamKey] = 0;
            eventLog = `Do-or-Die Raid! Raider failed to score. Defending team scores +1 point. Raider is out.`;
        }

    } else if (outcome === "do_or_die_empty") {
        // Raider is out
        attackingTeam.activePlayers = attackingTeam.activePlayers.filter(id => id !== raiderId);
        attackingTeam.outPlayers.push(raiderId);
        outPlayersAttacking.push(raiderId);
        raiderStats.outCount += 1;

        pointsDefending += 1;

        // Revive 1 defender
        if (defendingTeam.outPlayers.length > 0) {
            const revivedPlayerId = defendingTeam.outPlayers.shift();
            defendingTeam.activePlayers.push(revivedPlayerId);
            revivedDefending.push(revivedPlayerId);
        }

        nextState.consecutiveEmptyRaids[attackingTeamKey] = 0;
        eventLog += "Do-or-Die raid empty. Raider out, defending team scores +1 point.";

    } else if (outcome === "foul" || outcome === "technical") {
        // Handled through optional point inputs or simple standard defaults
        if (raidData.pointsAttacking !== undefined) pointsAttacking = raidData.pointsAttacking;
        if (raidData.pointsDefending !== undefined) pointsDefending = raidData.pointsDefending;

        // If attacking team got points, check if we revive
        if (pointsAttacking > 0) {
            for (let i = 0; i < pointsAttacking; i++) {
                if (attackingTeam.outPlayers.length > 0) {
                    const revivedPlayerId = attackingTeam.outPlayers.shift();
                    attackingTeam.activePlayers.push(revivedPlayerId);
                    revivedAttacking.push(revivedPlayerId);
                }
            }
        }
        if (pointsDefending > 0) {
            for (let i = 0; i < pointsDefending; i++) {
                if (defendingTeam.outPlayers.length > 0) {
                    const revivedPlayerId = defendingTeam.outPlayers.shift();
                    defendingTeam.activePlayers.push(revivedPlayerId);
                    revivedDefending.push(revivedPlayerId);
                }
            }
        }
        eventLog += `Foul/Technical event recorded. Attacking: +${pointsAttacking}, Defending: +${pointsDefending}.`;
    }

    // Apply scores
    if (attackingTeamKey === "teamA") {
        nextState.score.teamA += pointsAttacking;
        nextState.score.teamB += pointsDefending;
    } else {
        nextState.score.teamA += pointsDefending;
        nextState.score.teamB += pointsAttacking;
    }

    // Check All-Out for defending team
    if (defendingTeam.activePlayers.length === 0) {
        eventLog += ` All-Out! ${attackingTeamKey === "teamA" ? "Team A" : "Team B"} inflicts All-Out on ${defendingTeamKey === "teamA" ? "Team A" : "Team B"}.`;
        
        // Add +2 All-Out points
        if (attackingTeamKey === "teamA") {
            nextState.score.teamA += 2;
        } else {
            nextState.score.teamB += 2;
        }

        // Restore all players from squad (excluding injured)
        defendingTeam.activePlayers = defendingTeam.squad.filter(id => !defendingTeam.injuredPlayers.includes(id));
        defendingTeam.outPlayers = [];
    }

    // Check All-Out for attacking team (if raider went out and was the last active player)
    if (attackingTeam.activePlayers.length === 0) {
        eventLog += ` All-Out! ${defendingTeamKey === "teamA" ? "Team A" : "Team B"} inflicts All-Out on ${attackingTeamKey === "teamA" ? "Team A" : "Team B"}.`;

        // Add +2 All-Out points
        if (defendingTeamKey === "teamA") {
            nextState.score.teamA += 2;
        } else {
            nextState.score.teamB += 2;
        }

        // Restore all players from squad (excluding injured)
        attackingTeam.activePlayers = attackingTeam.squad.filter(id => !attackingTeam.injuredPlayers.includes(id));
        attackingTeam.outPlayers = [];
    }

    // Compile raid record
    const raidRecord = {
        raiderId,
        outcome,
        pointsAttacking,
        pointsDefending,
        revivedAttacking,
        revivedDefending,
        outPlayersAttacking,
        outPlayersDefending,
        isBonusScored,
        isSuperTackle,
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
