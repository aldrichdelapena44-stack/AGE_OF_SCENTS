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

// Render/Vercel sit behind proxies. This keeps rate limiting accurate and stable.
app.set("trust proxy", 1);

const allowedOrigins = [
    process.env.CORS_ORIGIN,
    process.env.FRONTEND_URL,

    // Production frontend
    "https://age-of-scents-six.vercel.app",

    // Previous / test frontend links
    "https://largefile-iota.vercel.app",
    "https://age-of-scent-perfume.vercel.app",

    // Local development
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

app.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    next();
});

/**
 * General site/API limiter.
 * This allows normal browsing, products, cart, orders, stories, feedback,
 * notifications, and admin panels without blocking too quickly.
 */
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10000,
    message: {
        success: false,
        message: "Too many requests, please wait a moment and try again.",
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Login/register limiter.
 * This is stricter to protect accounts, but still reasonable for testing.
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    message: {
        success: false,
        message: "Too many login or register attempts. Please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Admin limiter.
 * Admin pages can make many requests, so this is higher than auth.
 */
const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5000,
    message: {
        success: false,
        message: "Too many admin requests. Please wait a moment and try again.",
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(generalLimiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(process.cwd(), "uploads"), {
    etag: false,
    lastModified: false,
    maxAge: 0,
    setHeaders: (res) => {
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
    }
}));

app.get("/", (_req, res) => {
    res.json({
        success: true,
        message: "AGE OF SCENT backend API is running.",
    });
});

app.get("/api/health", (_req, res) => {
    res.json({
        success: true,
        message: "AGE OF SCENT backend is running.",
    });
});

// Canonical API routes used by the frontend.
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/products", productRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/verifications", verificationRoutes);
app.use("/api/admin", adminLimiter, adminRoutes);
app.use("/api/webhooks", webhookRoutes);

// Localhost compatibility aliases.
app.use("/api", authLimiter, authRoutes);
app.use("/auth", authLimiter, authRoutes);
app.use("/contact", contactRoutes);
app.use("/feedback", feedbackRoutes);
app.use("/products", productRoutes);
app.use("/settings", settingsRoutes);
app.use("/stories", storyRoutes);
app.use("/orders", orderRoutes);
app.use("/payments", paymentRoutes);
app.use("/users", userRoutes);
app.use("/verifications", verificationRoutes);
app.use("/admin", adminLimiter, adminRoutes);
app.use("/webhooks", webhookRoutes);
app.use("/", authLimiter, authRoutes);

app.use((_req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found.",
    });
});

app.use(errorMiddleware);