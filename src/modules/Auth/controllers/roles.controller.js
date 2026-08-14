import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { ObjectId } from "mongodb";

import { db } from "../../../config/dbConnect/mongo.js";

// Get
export const getRoles = async (req, res) => {

    try {

        const roles = db("auth", "roles");

        const data = await roles
            .find({})
            .sort({ name: 1 })
            .toArray();

        return res.status(200).json({
            success: true,
            data
        });

    } catch (error) {

        console.error("Get roles error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch roles"
        });
    }
};


// CREATE ROLE
export const createRole = async (req, res) => {

    try {

        const {
            name,
            permissions
        } = req.body;

        const roles = db("auth", "roles");

        const existingRole = await roles.findOne({
            name
        });

        if (existingRole) {

            return res.status(409).json({
                success: false,
                message: "Role already exists"
            });
        }

        const result = await roles.insertOne({

            name,

            permissions: [
                ...new Set(permissions || [])
            ],

            createdAt: new Date(),
            updatedAt: new Date()

        });

        return res.status(201).json({
            success: true,
            message: "Role created successfully",
            roleId: result.insertedId
        });

    } catch (error) {

        console.error("Create role error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create role"
        });
    }
};


// UPDATE ROLE
export const updateRole = async (req, res) => {

    try {

        const {
            id
        } = req.params;

        const {
            name,
            permissions
        } = req.body;

        if (!ObjectId.isValid(id)) {

            return res.status(400).json({
                success: false,
                message: "Invalid role ID"
            });
        }

        const roles = db("auth", "roles");

        const role = await roles.findOne({
            _id: new ObjectId(id)
        });

        if (!role) {

            return res.status(404).json({
                success: false,
                message: "Role not found"
            });
        }

        const updateData = {
            updatedAt: new Date()
        };

        if (name !== undefined) {
            updateData.name = name;
        }

        if (permissions !== undefined) {

            updateData.permissions = [
                ...new Set(permissions)
            ];
        }

        await roles.updateOne(
            {
                _id: new ObjectId(id)
            },
            {
                $set: updateData
            }
        );

        // If role name changed, update users
        if (name && name !== role.name) {

            const users = db("auth", "users");

            await users.updateMany(
                {
                    roles: role.name
                },
                {
                    $set: {
                        "roles.$[role]": name
                    }
                },
                {
                    arrayFilters: [
                        {
                            role: role.name
                        }
                    ]
                }
            );
        }

        return res.status(200).json({
            success: true,
            message: "Role updated successfully"
        });

    } catch (error) {

        console.error("Update role error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update role"
        });
    }
};


// DELETE ROLE
export const deleteRole = async (req, res) => {

    try {

        const {
            id
        } = req.params;

        if (!ObjectId.isValid(id)) {

            return res.status(400).json({
                success: false,
                message: "Invalid role ID"
            });
        }

        const roles = db("auth", "roles");
        const users = db("auth", "users");

        const role = await roles.findOne({
            _id: new ObjectId(id)
        });

        if (!role) {

            return res.status(404).json({
                success: false,
                message: "Role not found"
            });
        }

        // Don't delete assigned role
        const assignedUser = await users.findOne({
            roles: role.name
        });

        if (assignedUser) {

            return res.status(409).json({
                success: false,
                message: "Role is assigned to users and cannot be deleted"
            });
        }

        await roles.deleteOne({
            _id: new ObjectId(id)
        });

        return res.status(200).json({
            success: true,
            message: "Role deleted successfully"
        });

    } catch (error) {

        console.error("Delete role error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete role"
        });
    }
};

