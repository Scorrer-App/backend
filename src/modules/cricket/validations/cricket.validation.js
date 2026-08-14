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
    role: z.enum(["batsman", "bowler", "all_rounder", "wicket_keeper"], {
        message: "Role must be batsman, bowler, all_rounder, or wicket_keeper"
    }),
    isCaptain: z.boolean().default(false),
    isWicketKeeper: z.boolean().default(false)
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
    format: z.enum(["T20", "ODI", "Test", "T10"], {
        message: "Format must be T20, ODI, Test, or T10"
    }),
    overs: z.number().int().min(1).max(50),
    toss: z.object({
        wonBy: objectIdSchema,
        decision: z.enum(["bat", "bowl"])
    })
});

// Start Match Validation
export const startMatchSchema = z.object({
    strikerId: objectIdSchema,
    nonStrikerId: objectIdSchema,
    bowlerId: objectIdSchema
});

// Ball / Delivery Action Validation
export const ballSchema = z.object({
    runs: z.number().int().min(0).max(6),
    extras: z.object({
        type: z.enum(["wide", "no_ball", "bye", "leg_bye", "penalty"]),
        runs: z.number().int().nonnegative().default(0)
    }).optional(),
    wicket: z.object({
        type: z.enum([
            "bowled",
            "caught",
            "lbw",
            "run_out",
            "stumped",
            "hit_wicket",
            "obstructing_field",
            "hit_ball_twice",
            "timed_out",
            "retired_out",
            "retired_hurt"
        ]),
        playerOutId: objectIdSchema,
        fielderId: objectIdSchema.optional(),
        nextBatterId: objectIdSchema.optional() // Required if wicket falls and it's not the last wicket
    }).optional(),
    bowlerId: objectIdSchema.optional(),
    nextBowlerId: objectIdSchema.optional()
});

// Active Batsmen Correction Validation
export const activeBatsmenSchema = z.object({
    strikerId: objectIdSchema,
    nonStrikerId: objectIdSchema
});

