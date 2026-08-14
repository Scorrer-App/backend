import { db } from "../../../config/dbConnect/mongo.js";

// CREATE GROUND
export const createGround = async (req, res) => {
    try {
        const { name, city, country } = req.body;
        const grounds = db("kabaddi", "grounds");

        const existingGround = await grounds.findOne({ name, city });
        if (existingGround) {
            return res.status(409).json({
                success: false,
                message: "Ground with this name in the same city already exists"
            });
        }

        const newGround = {
            name,
            city,
            country,
            createdAt: new Date()
        };

        const result = await grounds.insertOne(newGround);

        return res.status(201).json({
            success: true,
            message: "Ground created successfully",
            groundId: result.insertedId
        });

    } catch (error) {
        console.error("Create ground error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create ground"
        });
    }
};

// GET ALL GROUNDS
export const getGrounds = async (req, res) => {
    try {
        const grounds = db("kabaddi", "grounds");
        const data = await grounds.find({}).sort({ name: 1 }).toArray();

        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error("Get grounds error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch grounds"
        });
    }
};
