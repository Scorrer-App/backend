import { ObjectId } from "mongodb";
import { db } from "../config/dbConnect/mongo.js";

export const permission = (requiredPermission) => {

    return async (req, res, next) => {

        try {

            if (!req.user?.userId) {

                return res.status(401).json({
                    success: false,
                    message: "Authentication required"
                });
            }

            const users = db("auth", "users");
            const roles = db("auth", "roles");

            if (!ObjectId.isValid(req.user.userId)) {

                return res.status(401).json({
                    success: false,
                    message: "Invalid user"
                });
            }

            // Get user roles
            const user = await users.findOne(
                {
                    _id: new ObjectId(req.user.userId)
                },
                {
                    projection: {
                        roles: 1
                    }
                }
            );

            if (!user) {

                return res.status(401).json({
                    success: false,
                    message: "User not found"
                });
            }

            if (!user.roles?.length) {

                return res.status(403).json({
                    success: false,
                    message: "No role assigned"
                });
            }

            // Get all roles assigned to the user
            const userRoles = await roles.find({
                name: {
                    $in: user.roles
                }
            }).toArray();

            // Check permission in any role
            const hasPermission = userRoles.some((role) => {

                return (
                    role.permissions?.includes("*") ||
                    role.permissions?.includes(requiredPermission)
                );

            });

            if (!hasPermission) {

                return res.status(403).json({
                    success: false,
                    message: "Access denied"
                });
            }

            next();

        } catch (error) {

            console.error("Permission error:", error);

            return res.status(500).json({
                success: false,
                message: "Permission check failed"
            });
        }
    };
};