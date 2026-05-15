import dotenv from "dotenv";

dotenv.config();

export const env = {
    nodeEnv: process.env.NODE_ENV || "development",
    port: Number(process.env.PORT || 4000),
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
    databaseUrl: process.env.DATABASE_URL || "",
    jwtSecret: process.env.JWT_SECRET || "change-me",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
    maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB || 10),
    gcashMerchantId: process.env.GCASH_MERCHANT_ID || "",
    gcashPublicKey: process.env.GCASH_PUBLIC_KEY || "",
    gcashSecretKey: process.env.GCASH_SECRET_KEY || "",
    gcashWebhookSecret: process.env.GCASH_WEBHOOK_SECRET || "",
    gcashApiBaseUrl: process.env.GCASH_API_BASE_URL || ""
} as const;