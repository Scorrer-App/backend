import express from "express";
import { validate } from "../../../middleware/validate.js";
import { verifyToken } from "../../../middleware/auth.middleware.js";

import * as ground from "../controllers/ground.controller.js";
import * as team from "../controllers/team.controller.js";
import * as match from "../controllers/match.controller.js";
import * as schema from "../validations/cricket.validation.js";

const router = express.Router();

// Ground Management
router.post("/grounds", verifyToken, validate(schema.groundSchema), ground.createGround);
router.get("/grounds", verifyToken, ground.getGrounds);

// Team Management
router.post("/teams", verifyToken, validate(schema.teamSchema), team.createTeam);
router.get("/teams", verifyToken, team.getTeams);
router.get("/teams/:id", verifyToken, team.getTeamById);

// Match Management
router.post("/matches", verifyToken, validate(schema.matchSchema), match.createMatch);
router.post("/matches/:id/start", verifyToken, validate(schema.startMatchSchema), match.startMatch);
router.post("/matches/:id/next-innings", verifyToken, validate(schema.startMatchSchema), match.startNextInnings);
router.post("/matches/:id/ball", verifyToken, validate(schema.ballSchema), match.recordBall);
router.get("/matches/:id/scorecard", verifyToken, match.getScorecard);
router.patch("/matches/:id/active-batsmen", verifyToken, validate(schema.activeBatsmenSchema), match.updateActiveBatsmen);
router.patch("/matches/:id/ball/:index", verifyToken, validate(schema.ballSchema), match.updateDelivery);

export default router;
