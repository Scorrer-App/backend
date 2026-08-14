import express from "express";

import { validate } from "../../../middleware/validate.js";
import { verifyToken } from "../../../middleware/auth.middleware.js";
import { permission } from "../../../middleware/permission.middleware.js";

import * as auth from "../controllers/auth.controller.js";
import * as schema from "../validations/auth.validation.js";
import * as roles from '../controllers/roles.controller.js';
import * as userRoles from '../controllers/user_roles.controller.js';

const router = express.Router();

// Registration and login
router.post('/register', validate(schema.registerSchema), auth.register);
router.get('/allUsers', auth.allUsers);
router.post('/login', validate(schema.loginSchema), auth.login);
router.post("/refresh", validate(schema.refreshSchema), auth.refresh);
router.post('/logout', verifyToken, auth.logout);


// Role management
router.get("/roles", verifyToken, permission("role.view"), roles.getRoles);
router.post("/roles", verifyToken, permission("role.create"), validate(schema.roleSchema), roles.createRole);
router.patch("/roles/:id", verifyToken, permission("role.update"), validate(schema.roleSchema), roles.updateRole);
router.delete("/roles/:id", verifyToken, permission("role.delete"), roles.deleteRole);


// User role management
router.get("/users/:id/roles", verifyToken, permission("user.role.view"), userRoles.getUserRoles);
router.patch("/users/:id/roles", verifyToken, permission("user.role.update"), validate(schema.userRolesSchema), userRoles.updateUserRoles);


export default router;