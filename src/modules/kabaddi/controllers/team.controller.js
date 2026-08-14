import { ObjectId } from "mongodb";
import { db } from "../../../config/dbConnect/mongo.js";

// CREATE TEAM
export const createTeam = async (req, res) => {
    try {
        const { name, players } = req.body;
        const teams = db("kabaddi", "teams");
        const users = db("auth", "users");

        // Validate duplicates and check player roles
        let captainCount = 0;
        const playerUserIds = [];

        for (const player of players) {
            if (playerUserIds.includes(player.userId)) {
                return res.status(400).json({
                    success: false,
                    message: `Duplicate user ID: ${player.userId} in team`
                });
            }
            playerUserIds.push(player.userId);

            if (player.isCaptain) captainCount++;
        }

        if (captainCount !== 1) {
            return res.status(400).json({
                success: false,
                message: "A team must have exactly one captain"
            });
        }

        // Verify all player userIds exist in auth.users
        const userObjectIds = playerUserIds.map(id => new ObjectId(id));
        const existingUsers = await users.find({
            _id: { $in: userObjectIds }
        }).toArray();

        if (existingUsers.length !== playerUserIds.length) {
            const foundIds = existingUsers.map(u => u._id.toString());
            const missingIds = playerUserIds.filter(id => !foundIds.includes(id));
            return res.status(400).json({
                success: false,
                message: "Some users do not exist",
                missingIds
            });
        }

        const newTeam = {
            name,
            players: players.map(p => ({
                userId: new ObjectId(p.userId),
                role: p.role,
                isCaptain: p.isCaptain
            })),
            createdAt: new Date()
        };

        const result = await teams.insertOne(newTeam);

        return res.status(201).json({
            success: true,
            message: "Team created successfully",
            teamId: result.insertedId
        });

    } catch (error) {
        console.error("Create team error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create team"
        });
    }
};

// GET ALL TEAMS
export const getTeams = async (req, res) => {
    try {
        const teams = db("kabaddi", "teams");
        const data = await teams.find({}).sort({ name: 1 }).toArray();

        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error("Get teams error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch teams"
        });
    }
};

// GET TEAM BY ID (With populated user details)
export const getTeamById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid team ID"
            });
        }

        const teams = db("kabaddi", "teams");
        const users = db("auth", "users");

        const team = await teams.findOne({ _id: new ObjectId(id) });
        if (!team) {
            return res.status(404).json({
                success: false,
                message: "Team not found"
            });
        }

        // Populate users
        const playerIds = team.players.map(p => p.userId);
        const userDetailsList = await users.find({
            _id: { $in: playerIds }
        }, {
            projection: { name: 1, phone: 1, gender: 1 }
        }).toArray();

        const userDetailsMap = {};
        userDetailsList.forEach(u => {
            userDetailsMap[u._id.toString()] = u;
        });

        const populatedPlayers = team.players.map(p => ({
            ...p,
            userDetails: userDetailsMap[p.userId.toString()] || null
        }));

        return res.status(200).json({
            success: true,
            data: {
                ...team,
                players: populatedPlayers
            }
        });

    } catch (error) {
        console.error("Get team by ID error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch team details"
        });
    }
};
