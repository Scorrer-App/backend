import express from "express";
import { validate } from "../../../middleware/validate.js";
import { verifyToken } from "../../../middleware/auth.middleware.js";

import * as ground from "../controllers/ground.controller.js";
import * as team from "../controllers/team.controller.js";
import * as match from "../controllers/match.controller.js";
import * as schema from "../validations/kabaddi.validation.js";

const router = express.Router();

// Ground Management
router.post("/grounds", verifyToken, validate(schema.groundSchema), ground.createGround);
router.get("/grounds", ground.getGrounds);

// Team Management
router.post("/teams", verifyToken, validate(schema.teamSchema), team.createTeam);
router.get("/teams", team.getTeams);
router.get("/teams/:id", team.getTeamById);

// Match Management
router.post("/matches", verifyToken, validate(schema.matchSchema), match.createMatch);
router.post("/matches/:id/start", verifyToken, validate(schema.startMatchSchema), match.startMatch);
router.post("/matches/:id/raid", verifyToken, validate(schema.raidSchema), match.recordRaid);
router.get("/matches/:id/scorecard", match.getScorecard);
router.patch("/matches/:id/lineup", verifyToken, validate(schema.lineupSchema), match.updateLineup);
router.post("/matches/:id/end", verifyToken, match.endMatch);
router.post("/matches/:id/injury", verifyToken, validate(schema.injurySchema), match.recordInjury);
router.post("/matches/:id/substitute", verifyToken, validate(schema.substituteSchema), match.recordSubstitution);
router.post("/matches/:id/timeout", verifyToken, validate(schema.timeoutSchema), match.recordTimeout);
router.post("/matches/:id/switch-half", verifyToken, match.switchHalf);
router.post("/matches/:id/undo", verifyToken, match.undoLastEvent);

export default router;
