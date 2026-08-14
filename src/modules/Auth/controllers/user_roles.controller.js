import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { ObjectId } from "mongodb";

import { db } from "../../../config/dbConnect/mongo.js";

// Get user roles
export const getUserRoles = async (req, res) => {

    try {

        const {
            id
        } = req.params;

        if (!ObjectId.isValid(id)) {

            return res.status(400).json({
                success: false,
                message: "Invalid user ID"
            });
        }

        const users = db("auth", "users");

        const user = await users.findOne(
            {
                _id: new ObjectId(id)
            },
            {
                projection: {
                    name: 1,
                    phone: 1,
                    roles: 1
                }
            }
        );

        if (!user) {

            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                userId: user._id,
                name: user.name,
                phone: user.phone,
                roles: user.roles || []
            }
        });

    } catch (error) {

        console.error("Get user roles error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch user roles"
        });
    }
};


// UPDATE USER ROLES
export const updateUserRoles = async (req, res) => {

    try {

        const {
            id
        } = req.params;

        const {
            roles: newRoles
        } = req.body;

        if (!ObjectId.isValid(id)) {

            return res.status(400).json({
                success: false,
                message: "Invalid user ID"
            });
        }

        const users = db("auth", "users");
        const roles = db("auth", "roles");

        const user = await users.findOne({
            _id: new ObjectId(id)
        });

        if (!user) {

            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Remove duplicates
        const uniqueRoles = [
            ...new Set(newRoles)
        ];

        // Check all roles exist
        const existingRoles = await roles.find({
            name: {
                $in: uniqueRoles
            }
        }).toArray();

        const existingRoleNames = existingRoles.map(
            role => role.name
        );

        const invalidRoles = uniqueRoles.filter(
            role => !existingRoleNames.includes(role)
        );

        if (invalidRoles.length > 0) {

            return res.status(400).json({
                success: false,
                message: "Invalid role(s)",
                invalidRoles
            });
        }

        // Update user
        await users.updateOne(
            {
                _id: new ObjectId(id)
            },
            {
                $set: {
                    roles: uniqueRoles,
                    updatedAt: new Date()
                }
            }
        );

        return res.status(200).json({
            success: true,
            message: "User roles updated successfully",
            roles: uniqueRoles
        });

    } catch (error) {

        console.error("Update user roles error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update user roles"
        });
    }
};