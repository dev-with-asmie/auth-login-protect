require("dotenv").config();

const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;

// ==========================================
// SUPABASE CLIENT
// ==========================================

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);


// ==========================================
// STAGE 4 — AUTH MIDDLEWARE
// ==========================================

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        // Missing Authorization header
        if (!authHeader) {
            return res.status(401).json({
                error: "Access token required"
            });
        }

        // Check Bearer format
        const parts = authHeader.trim().split(/\s+/);

        if (
            parts.length !== 2 ||
            parts[0].toLowerCase() !== "bearer" ||
            !parts[1]
        ) {
            return res.status(401).json({
                error: "Access token required"
            });
        }

        const token = parts[1]; 
        const payload = JSON.parse(
        Buffer.from(token.split(".")[1], "base64").toString()
        );

        console.log("TOKEN CHECK:", {
        issued: new Date(payload.iat * 1000).toISOString(),
        expires: new Date(payload.exp * 1000).toISOString(),
        now: new Date().toISOString(),
        expired: Date.now() >= payload.exp * 1000
       });

        // Verify the exact token sent by the client
        const { data, error } = await supabase.auth.getUser(token);

        console.log("VERIFY RESULT:", {
        user: data?.user?.id,
        error: error?.message,
        status: error?.status
    });

        if (error || !data || !data.user) {
            console.error("JWT verification failed:", error?.message);

            return res.status(401).json({
                error: "Invalid or expired token"
            });
        }

        // Save authenticated user
        req.user = data.user;

        // Save token for logout
        req.accessToken = token;

        next();

    } catch (error) {
        console.error("Authentication error:", error);

        return res.status(500).json({
            error: "Internal server error"
        });
    }
};


// ==========================================
// STAGE 1 — SIGN UP
// ==========================================

app.post("/auth/signup", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: "Email and password are required"
            });
        }

        const { data, error } =
            await supabase.auth.signUp({
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
        console.error("Signup error:", error);

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

        if (!email || !password) {
            return res.status(400).json({
                error: "Email and password are required"
            });
        }

        const { data, error } =
            await supabase.auth.signInWithPassword({
                email,
                password
            });

        if (error) {
            return res.status(401).json({
                error: "Invalid login credentials"
            });
        }

        if (!data.session) {
            return res.status(401).json({
                error: "No session created"
            });
        }

        return res.status(200).json({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            user: data.user
        });

    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            error: "Internal server error"
        });
    }
});


// ==========================================
// STAGE 4 — LOGOUT
// ==========================================

app.post("/auth/logout", authMiddleware, async (req, res) => {
    try {
        // Sign out the specific authenticated session
        const { error } = await supabase.auth.admin.signOut(
            req.accessToken
        );

        if (error) {
            console.error("Logout error:", error);

            return res.status(401).json({
                error: error.message
            });
        }

        return res.status(204).send();

    } catch (error) {
        console.error("Logout error:", error);

        return res.status(500).json({
            error: "Internal server error"
        });
    }
});


// ==========================================
// STAGE 2 — PUBLIC INFO
// ==========================================

app.get("/public/info", (req, res) => {
    return res.status(200).json({
        message: "Welcome stranger! This info is public."
    });
});


// ==========================================
// STAGE 3/4 — PROTECTED PROFILE
// ==========================================

app.get(
    "/protected/profile",
    authMiddleware,
    (req, res) => {
        return res.status(200).json({
            id: req.user.id,
            email: req.user.email,
            account_created: req.user.created_at
        });
    }
);


// ==========================================
// STAGE 4 — PROTECTED DASHBOARD
// ==========================================

app.get(
    "/protected/dashboard",
    authMiddleware,
    (req, res) => {
        return res.status(200).json({
            message: "Welcome to your protected dashboard!",
            user: {
                id: req.user.id,
                email: req.user.email
            }
        });
    }
);


// ==========================================
// SERVER
// ==========================================

app.listen(PORT, () => {
    console.log("Server running and connected to Supabase");
    console.log(`Server listening on http://localhost:${PORT}`);
});