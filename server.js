require("dotenv").config();

const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(express.json());

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

const PORT = process.env.PORT || 3000;


// ==========================================
// STAGE 1 — SIGN UP
// ==========================================

app.post("/auth/signup", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                error: "Email and password are required"
            });
        }

        // Create user using Supabase Auth
        const { data, error } = await supabase.auth.signUp({
            email,
            password
        });

        if (error) {
            return res.status(400).json({
                error: error.message
            });
        }

        return res.status(201).json({
            user: data.user
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            error: "Internal server error"
        });
    }
});


// ==========================================
// STAGE 1 — LOGIN
// ==========================================

app.post("/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                error: "Email and password are required"
            });
        }

        // Login using Supabase Auth
        const { data, error } =
            await supabase.auth.signInWithPassword({
                email,
                password
            });

        // Invalid credentials
        if (error) {
            return res.status(401).json({
                error: "Invalid login credentials"
            });
        }

        return res.status(200).json({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            user: data.user
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            error: "Internal server error"
        });
    }
});


// ==========================================
// STAGE 2 — PUBLIC ROUTE
// ==========================================

app.get("/public/info", (req, res) => {
    return res.status(200).json({
        message: "Welcome stranger! This info is public."
    });
});


// ==========================================
// STAGE 2 — PROTECTED ROUTE
// ==========================================

app.get("/protected/profile", (req, res) => {

    // Get Authorization header
    const authHeader = req.headers.authorization;

    // No Authorization header
    if (!authHeader) {
        return res.status(401).json({
            error: "Access token required"
        });
    }

    // Split "Bearer token"
    const parts = authHeader.split(" ");

    // Check correct Bearer format
    if (
        parts.length !== 2 ||
        parts[0] !== "Bearer" ||
        !parts[1]
    ) {
        return res.status(401).json({
            error: "Access token required"
        });
    }

    // Token exists
    return res.status(200).json({
        message: "Token received"
    });
});


// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {
    console.log("Server running and connected to Supabase");
    console.log(`Server listening on http://localhost:${PORT}`);
});