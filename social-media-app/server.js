require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const path = require("path");
const multer = require("multer");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const requiredEnv = [
    "DB_HOST",
    "DB_USER",
    "DB_PASSWORD",
    "DB_NAME",
    "JWT_SECRET"
];

const missingEnv = requiredEnv.filter(
    key => !process.env[key] || process.env[key] === "YOUR_MYSQL_PASSWORD"
);

if (missingEnv.length) {
    console.error("\nMissing/invalid .env values:");
    console.error(missingEnv.join(", "));
    console.error("\nOpen .env and set DB_PASSWORD to your actual MySQL password.\n");
    process.exit(1);
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function startServer() {
    try {
        const connection = await db.getConnection();
        await connection.ping();
        connection.release();

        console.log("MySQL connected successfully");
        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("\nMySQL connection failed.");
        console.error("Error:", error.message);
        console.error("\nCheck these values in .env:");
        console.error(`DB_HOST=${process.env.DB_HOST}`);
        console.error(`DB_USER=${process.env.DB_USER}`);
        console.error(`DB_NAME=${process.env.DB_NAME}`);
        console.error("DB_PASSWORD=********");
        process.exit(1);
    }
}


const profileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "uploads", "profiles"));
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `user-${req.user.id}-${Date.now()}${ext}`);
    }
});

const profileUpload = multer({
    storage: profileStorage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (!allowed.includes(file.mimetype)) {
            return cb(new Error("Only JPG, PNG, WEBP and GIF images are allowed."));
        }
        cb(null, true);
    }
});

function authenticateToken(req, res, next) {
    const header = req.headers.authorization;
    const token = header && header.startsWith("Bearer ")
        ? header.slice(7)
        : null;

    if (!token) {
        return res.status(401).json({ message: "Please login first." });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: "Invalid or expired login session." });
        }
        req.user = user;
        next();
    });
}

app.post("/api/register", async (req, res) => {
    try {
        const username = String(req.body.username || "").trim();
        const email = String(req.body.email || "").trim().toLowerCase();
        const password = String(req.body.password || "");

        if (!username || !email || !password) {
            return res.status(400).json({ message: "All fields are required." });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password must contain at least 6 characters." });
        }

        const [existing] = await db.execute(
            "SELECT id FROM users WHERE username = ? OR email = ?",
            [username, email]
        );

        if (existing.length) {
            return res.status(409).json({ message: "Username or email already exists." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.execute(
            "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
            [username, email, hashedPassword]
        );

        res.status(201).json({ message: "Registration successful." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error." });
    }
});

app.post("/api/login", async (req, res) => {
    try {
        const email = String(req.body.email || "").trim().toLowerCase();
        const password = String(req.body.password || "");

        const [users] = await db.execute(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );

        if (!users.length) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        const user = users[0];
        const valid = await bcrypt.compare(password, user.password);

        if (!valid) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({
            message: "Login successful.",
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error." });
    }
});

app.get("/api/me", authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT id, username, email, bio, profile_image, created_at
             FROM users WHERE id = ?`,
            [req.user.id]
        );

        if (!rows.length) {
            return res.status(404).json({ message: "User not found." });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error." });
    }
});


app.post("/api/me/profile-photo", authenticateToken, profileUpload.single("profileImage"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Please select an image." });
        }

        const imageUrl = `/uploads/profiles/${req.file.filename}`;

        await db.execute(
            "UPDATE users SET profile_image = ? WHERE id = ?",
            [imageUrl, req.user.id]
        );

        res.json({
            message: "Profile photo updated successfully.",
            profile_image: imageUrl
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Could not update profile photo." });
    }
});

app.put("/api/me", authenticateToken, async (req, res) => {
    try {
        const username = String(req.body.username || "").trim();
        const bio = String(req.body.bio || "").trim();
        const profileImage = String(req.body.profile_image || "").trim();

        if (!username) {
            return res.status(400).json({ message: "Username is required." });
        }

        const [duplicate] = await db.execute(
            "SELECT id FROM users WHERE username = ? AND id != ?",
            [username, req.user.id]
        );

        if (duplicate.length) {
            return res.status(409).json({ message: "Username already exists." });
        }

        await db.execute(
            `UPDATE users
             SET username = ?, bio = ?, profile_image = ?
             WHERE id = ?`,
            [username, bio, profileImage, req.user.id]
        );

        const token = jwt.sign(
            { id: req.user.id, username },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({ message: "Profile updated.", token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error." });
    }
});

app.post("/api/posts", authenticateToken, async (req, res) => {
    try {
        const content = String(req.body.content || "").trim();

        if (!content) {
            return res.status(400).json({ message: "Post cannot be empty." });
        }

        await db.execute(
            "INSERT INTO posts (user_id, content) VALUES (?, ?)",
            [req.user.id, content]
        );

        res.status(201).json({ message: "Post created." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error." });
    }
});

app.get("/api/posts", authenticateToken, async (req, res) => {
    try {
        const [posts] = await db.execute(
            `SELECT
                p.id, p.user_id, p.content, p.created_at,
                u.username, u.profile_image,
                (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count,
                (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count,
                EXISTS(
                    SELECT 1 FROM likes l2
                    WHERE l2.post_id = p.id AND l2.user_id = ?
                ) AS liked
             FROM posts p
             JOIN users u ON p.user_id = u.id
             ORDER BY p.created_at DESC`,
            [req.user.id]
        );

        res.json(posts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error." });
    }
});

app.delete("/api/posts/:id", authenticateToken, async (req, res) => {
    try {
        const [result] = await db.execute(
            "DELETE FROM posts WHERE id = ? AND user_id = ?",
            [req.params.id, req.user.id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({ message: "Post not found or you are not the owner." });
        }

        res.json({ message: "Post deleted." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error." });
    }
});

app.post("/api/posts/:id/like", authenticateToken, async (req, res) => {
    try {
        const postId = Number(req.params.id);

        const [existing] = await db.execute(
            "SELECT id FROM likes WHERE post_id = ? AND user_id = ?",
            [postId, req.user.id]
        );

        if (existing.length) {
            await db.execute(
                "DELETE FROM likes WHERE post_id = ? AND user_id = ?",
                [postId, req.user.id]
            );
            return res.json({ liked: false });
        }

        await db.execute(
            "INSERT INTO likes (post_id, user_id) VALUES (?, ?)",
            [postId, req.user.id]
        );

        res.json({ liked: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error." });
    }
});

app.get("/api/posts/:id/comments", authenticateToken, async (req, res) => {
    try {
        const [comments] = await db.execute(
            `SELECT c.id, c.comment, c.created_at, u.id AS user_id, u.username
             FROM comments c
             JOIN users u ON c.user_id = u.id
             WHERE c.post_id = ?
             ORDER BY c.created_at ASC`,
            [req.params.id]
        );

        res.json(comments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error." });
    }
});

app.post("/api/posts/:id/comments", authenticateToken, async (req, res) => {
    try {
        const comment = String(req.body.comment || "").trim();

        if (!comment) {
            return res.status(400).json({ message: "Comment cannot be empty." });
        }

        await db.execute(
            "INSERT INTO comments (post_id, user_id, comment) VALUES (?, ?, ?)",
            [req.params.id, req.user.id, comment]
        );

        res.status(201).json({ message: "Comment added." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error." });
    }
});

app.get("/api/users", authenticateToken, async (req, res) => {
    try {
        const [users] = await db.execute(
            `SELECT
                u.id, u.username, u.bio, u.profile_image,
                (SELECT COUNT(*) FROM followers f1 WHERE f1.following_id = u.id) AS followers_count,
                EXISTS(
                    SELECT 1 FROM followers f2
                    WHERE f2.follower_id = ? AND f2.following_id = u.id
                ) AS following
             FROM users u
             WHERE u.id != ?
             ORDER BY u.username`,
            [req.user.id, req.user.id]
        );

        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error." });
    }
});

app.post("/api/users/:id/follow", authenticateToken, async (req, res) => {
    try {
        const followingId = Number(req.params.id);

        if (followingId === req.user.id) {
            return res.status(400).json({ message: "You cannot follow yourself." });
        }

        const [existing] = await db.execute(
            "SELECT id FROM followers WHERE follower_id = ? AND following_id = ?",
            [req.user.id, followingId]
        );

        if (existing.length) {
            await db.execute(
                "DELETE FROM followers WHERE follower_id = ? AND following_id = ?",
                [req.user.id, followingId]
            );
            return res.json({ following: false });
        }

        await db.execute(
            "INSERT INTO followers (follower_id, following_id) VALUES (?, ?)",
            [req.user.id, followingId]
        );

        res.json({ following: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error." });
    }
});

app.get("/api/users/:id", authenticateToken, async (req, res) => {
    try {
        const [users] = await db.execute(
            `SELECT
                u.id, u.username, u.email, u.bio, u.profile_image, u.created_at,
                (SELECT COUNT(*) FROM followers f1 WHERE f1.following_id = u.id) AS followers_count,
                (SELECT COUNT(*) FROM followers f2 WHERE f2.follower_id = u.id) AS following_count,
                EXISTS(
                    SELECT 1 FROM followers f3
                    WHERE f3.follower_id = ? AND f3.following_id = u.id
                ) AS following
             FROM users u
             WHERE u.id = ?`,
            [req.user.id, req.params.id]
        );

        if (!users.length) {
            return res.status(404).json({ message: "User not found." });
        }

        res.json(users[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error." });
    }
});

app.get("/api/users/:id/posts", authenticateToken, async (req, res) => {
    try {
        const [posts] = await db.execute(
            `SELECT
                p.id, p.user_id, p.content, p.created_at, u.username,
                (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count,
                (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count,
                EXISTS(
                    SELECT 1 FROM likes l2
                    WHERE l2.post_id = p.id AND l2.user_id = ?
                ) AS liked
             FROM posts p
             JOIN users u ON p.user_id = u.id
             WHERE p.user_id = ?
             ORDER BY p.created_at DESC`,
            [req.user.id, req.params.id]
        );

        res.json(posts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error." });
    }
});


app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ message: "Image must be 2 MB or smaller." });
        }
        return res.status(400).json({ message: error.message });
    }

    if (error && error.message && error.message.includes("Only JPG")) {
        return res.status(400).json({ message: error.message });
    }

    next(error);
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

startServer();