import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex, "Invalid ObjectId format");

// Ground Validation
export const groundSchema = z.object({
    name: z.string().trim().min(3, "Ground name must be at least 3 characters").max(100),
    city: z.string().trim().min(2, "City name must be at least 2 characters").max(50),
    country: z.string().trim().min(2, "Country name must be at least 2 characters").max(50)
});

// Team Player Validation
const playerSchema = z.object({
    userId: objectIdSchema,
    role: z.enum(["raider", "defender", "all_rounder"], {
        message: "Role must be raider, defender, or all_rounder"
    }),
    isCaptain: z.boolean().default(false)
});

// Team Validation
export const teamSchema = z.object({
    name: z.string().trim().min(3, "Team name must be at least 3 characters").max(100),
    players: z.array(playerSchema).min(2, "A team must have at least 2 players") // set min 2 for testing flexibility
});

// Match Setup Validation
export const matchSchema = z.object({
    groundId: objectIdSchema,
    teamAId: objectIdSchema,
    teamBId: objectIdSchema,
    format: z.enum(["international", "circle"], {
        message: "Format must be international or circle"
    }),
    toss: z.object({
        wonBy: objectIdSchema,
        decision: z.enum(["raid", "defend"])
    })
});

// Start Match Validation (Lineups)
export const startMatchSchema = z.object({
    teamALineup: z.array(objectIdSchema).min(2, "Lineup must have players"),
    teamBLineup: z.array(objectIdSchema).min(2, "Lineup must have players")
});

// Raid Validation
export const raidSchema = z.object({
    raiderId: objectIdSchema,
    outcome: z.enum(["touch", "tackle", "super_tackle", "bonus", "empty", "do_or_die_empty", "foul", "technical"], {
        message: "Invalid raid outcome"
    }),
    touchedPlayers: z.array(objectIdSchema).optional().default([]),
    defenderId: objectIdSchema.optional(),
    isBonusScored: z.boolean().optional().default(false),
    isSuperTackle: z.boolean().optional().default(false),
    foulReason: z.enum(["multiple_stoppers", "out_of_bounds", "other"]).optional(),
    technicalReason: z.string().optional(),
    pointsAttacking: z.number().int().min(0).optional(),
    pointsDefending: z.number().int().min(0).optional()
});

// Lineup Update Validation
export const lineupSchema = z.object({
    teamAActive: z.array(objectIdSchema).optional(),
    teamBActive: z.array(objectIdSchema).optional()
});

// Injury Validation
export const injurySchema = z.object({
    userId: objectIdSchema
});

// Substitution Validation
export const substituteSchema = z.object({
    teamId: objectIdSchema,
    playerOutId: objectIdSchema,
    playerInId: objectIdSchema
});

// Timeout Validation
export const timeoutSchema = z.object({
    teamId: objectIdSchema.optional(),
    durationSeconds: z.number().int().min(1).max(300).default(30),
    type: z.enum(["official", "team"])
});
