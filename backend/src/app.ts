import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import path from "path";

import adminRoutes from "./routes/admin.routes";
import contactRoutes from "./routes/contact.routes";
import feedbackRoutes from "./routes/feedback.routes";
import authRoutes from "./routes/auth.routes";
import orderRoutes from "./routes/order.routes";
import paymentRoutes from "./routes/payment.routes";
import productRoutes from "./routes/product.routes";
import settingsRoutes from "./routes/settings.routes";
import storyRoutes from "./routes/story.routes";
import userRoutes from "./routes/user.routes";
import verificationRoutes from "./routes/verification.routes";
import webhookRoutes from "./routes/webhook.routes";

import { errorMiddleware } from "./middlewares/error.middleware";

export const app = express();

const allowedOrigins = [
    process.env.CORS_ORIGIN,
    process.env.FRONTEND_URL,
    "https://largefile-iota.vercel.app",
    "https://age-of-scent-perfume.vercel.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
].filter(Boolean) as string[];

const localhostOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/;

const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
        if (!origin) {
            return callback(null, true);
        }

        const isAllowedOrigin =
            allowedOrigins.includes(origin) ||
            localhostOriginPattern.test(origin) ||
            origin.endsWith(".vercel.app");

        if (isAllowedOrigin) {
            return callback(null, true);
        }

        return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

app.use(
    rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 200,
    })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/api/health", (_req, res) => {
    res.json({
        success: true,
        message: "AGE OF SCENT backend is running.",
    });
});

// Canonical API routes used by the frontend.
app.use("/api/auth", authRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/products", productRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/verifications", verificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/webhooks", webhookRoutes);

// Localhost compatibility aliases.
// These keep the app working even if an older frontend bundle or .env value
// calls /api/login, /api/register, /login, /register, /feedback, etc.
app.use("/api", authRoutes);
app.use("/auth", authRoutes);
app.use("/contact", contactRoutes);
app.use("/feedback", feedbackRoutes);
app.use("/products", productRoutes);
app.use("/settings", settingsRoutes);
app.use("/stories", storyRoutes);
app.use("/orders", orderRoutes);
app.use("/payments", paymentRoutes);
app.use("/users", userRoutes);
app.use("/verifications", verificationRoutes);
app.use("/admin", adminRoutes);
app.use("/webhooks", webhookRoutes);
app.use("/", authRoutes);

app.use((_req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found.",
    });
});

app.use(errorMiddleware);