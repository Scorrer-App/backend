import { z } from "zod";

// Register schema
export const registerSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, "Name must be at least 2 characters")
        .max(50, "Name cannot exceed 50 characters"),

    phone: z
        .string()
        .trim()
        .regex(/^[0-9]{10}$/, "Phone number must be 10 digits"),

    email: z
        .string()
        .trim()
        .email("Invalid email address").optional(),

    gender: z
        .enum(["male", "female", "other"], {
            message: "Gender must be male, female, or other"
        }),

    password: z
        .string()
        .min(6, "Password must be at least 6 characters")
        .max(50, "Password cannot exceed 50 characters")
        .optional(),

    dob: z.string().trim().optional(),
    address: z.string().trim().optional(),
    city: z.string().trim().optional(),
    state: z.string().trim().optional(),
    Country: z.string().trim().optional().default("India")
});

// Login schema
export const loginSchema = z.object({
    phone: z
        .string()
        .trim()
        .regex(/^[0-9]{10}$/, "Phone number must be 10 digits").optional(),

    email: z
        .string()
        .trim()
        .email("Invalid email address").optional(),

    password: z
        .string()
        .min(1, "Password is required")
});

// Refresh token
export const refreshSchema = z.object({
    refreshToken: z
        .string()
        .min(1, "Refresh token is required")
});

// Logout
export const logoutSchema = z.object({
    refreshToken: z
        .string()
        .min(1, "Refresh token is required")
});


// ROLE
export const roleSchema = z.object({
    name: z
        .string()
        .min(2, "Role name is required")
        .max(50)
        .regex(
            /^[a-zA-Z0-9_-]+$/,
            "Invalid role name"
        ),

    permissions: z
        .array(
            z.string().min(1)
        )
        .default([])
});


// USER ROLES
export const userRolesSchema = z.object({
    roles: z
        .array(
            z.string().min(1)
        )
        .min(1, "At least one role is required")
});