import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import { db } from "../../../config/dbConnect/mongo.js";

// REGISTER
export const register = async (req, res) => {
    try {

        const { name, phone, gender, password, dob, address, city, state, Country, country } = req.body;

        const users = db("auth", "users");

        // Check existing user
        const existingUser = await users.findOne({
            phone
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Phone number already registered"
            });
        }

        // Generate password if not present (random integer between 1111111 and 9999999 inclusive)
        let finalPassword = password;
        if (!finalPassword) {
            finalPassword = Math.floor(1111111 + Math.random() * 8888889).toString();
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(finalPassword, 10);

        // Create user
        const user = {
            name,
            phone,
            gender,
            password: hashedPassword,
            dob: dob || null,
            address: address || null,
            city: city || null,
            state: state || null,
            Country: Country || country || "India",
            roles: ["users"],
            createdAt: new Date()
        };

        const result = await users.insertOne(user);

        const responseData = {
            success: true,
            message: "User registered successfully",
            userId: result.insertedId
        };
        
        if (!password) {
            responseData.generatedPassword = finalPassword;
        }

        return res.status(201).json(responseData);

    } catch (error) {

        console.error("Register error:", error);

        return res.status(500).json({
            success: false,
            message: "Registration failed"
        });
    }
};


// All user
// All users
export const allUsers = async (req, res) => {
    try {
        const users = db("auth", "users");

        const allUsers = await users.find(
            {},
            {
                projection: {
                    password: 0
                }
            }
        ).toArray();

        return res.status(200).json({
            success: true,
            message: "Users fetched successfully",
            count: allUsers.length,
            users: allUsers
        });

    } catch (error) {

        console.error("Get users error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch users"
        });
    }
};


// LOGIN
export const login = async (req, res) => {
    try {

        const { phone, password } = req.body;

        const users = db("auth", "users");
        const refreshTokens = db("auth", "refresh_tokens");

        // Find user
        const user = await users.findOne({
            phone
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid phone or password"
            });
        }

        // Check password
        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid phone or password"
            });
        }


        // ---------------------------------------------
        // ACCESS TOKEN
        // ---------------------------------------------

        const accessToken = jwt.sign(
            {
                userId: user._id.toString(),
                phone: user.phone
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "15m"
            }
        );


        // ---------------------------------------------
        // REFRESH TOKEN
        // ---------------------------------------------

        const refreshToken = crypto.randomBytes(64).toString("hex");

        const refreshTokenHash = crypto
            .createHash("sha256")
            .update(refreshToken)
            .digest("hex");

        const expiresAt = new Date();

        expiresAt.setDate(
            expiresAt.getDate() +
            Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS || 30)
        );


        await refreshTokens.insertOne({
            userId: user._id,
            tokenHash: refreshTokenHash,
            expiresAt,
            createdAt: new Date()
        });


        // ---------------------------------------------
        // RESPONSE
        // ---------------------------------------------

        return res.status(200).json({
            success: true,
            message: "Login successful",

            accessToken,

            refreshToken,

            user: {
                id: user._id,
                name: user.name,
                phone: user.phone,
                gender: user.gender
            }
        });

    } catch (error) {

        console.error("Login error:", error);

        return res.status(500).json({
            success: false,
            message: "Login failed"
        });
    }
};


// REFRESH ACCESS TOKEN
export const refresh = async (req, res) => {
    try {

        const { refreshToken } = req.body;

        const refreshTokens = db("auth", "refresh_tokens");

        // Hash received refresh token
        const tokenHash = crypto
            .createHash("sha256")
            .update(refreshToken)
            .digest("hex");


        // Find token
        const storedToken = await refreshTokens.findOne({
            tokenHash
        });


        if (!storedToken) {
            return res.status(401).json({
                success: false,
                message: "Invalid refresh token"
            });
        }


        // Check expiration
        if (storedToken.expiresAt < new Date()) {

            await refreshTokens.deleteOne({
                _id: storedToken._id
            });

            return res.status(401).json({
                success: false,
                message: "Refresh token expired"
            });
        }


        // Create new access token
        const accessToken = jwt.sign(
            {
                userId: storedToken.userId.toString()
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "15m"
            }
        );


        return res.status(200).json({
            success: true,
            accessToken
        });

    } catch (error) {

        console.error("Refresh error:", error);

        return res.status(500).json({
            success: false,
            message: "Token refresh failed"
        });
    }
};


// LOGOUT
export const logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: "Refresh token is required"
            });
        }

        const refreshTokens = db("auth", "refresh_tokens");

        const tokenHash = crypto
            .createHash("sha256")
            .update(refreshToken)
            .digest("hex");

        const result = await refreshTokens.deleteOne({
            tokenHash: tokenHash
        });

        console.log("Logout delete result:", result);

        if (result.deletedCount !== 1) {
            return res.status(401).json({
                success: false,
                message: "Invalid or already logged out"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Logout successful"
        });

    } catch (error) {
        console.error("Logout error:", error);

        return res.status(500).json({
            success: false,
            message: "Logout failed"
        });
    }
};