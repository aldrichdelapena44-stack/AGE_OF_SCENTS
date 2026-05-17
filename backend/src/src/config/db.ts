import { env } from "./env";

type PrismaLikeClient = {
    $connect: () => Promise<void>;
    $disconnect?: () => Promise<void>;
};

function createPrismaClient(): PrismaLikeClient {
    try {
        const prismaPackage = require("@prisma/client") as {
            PrismaClient?: new () => PrismaLikeClient;
        };

        if (prismaPackage.PrismaClient) {
            return new prismaPackage.PrismaClient();
        }
    } catch {
        // Prisma generation is optional in scaffold mode.
    }

    return {
        async $connect() {
            return;
        },
        async $disconnect() {
            return;
        }
    };
}

export const prisma = createPrismaClient();

export async function connectDatabase() {
    if (!env.databaseUrl) {
        console.warn("DATABASE_URL is missing. Skipping database connection for now.");
        return;
    }

    try {
        await prisma.$connect();
        console.log("Database connected.");
    } catch (error) {
        console.warn("Database connection failed. Scaffold mode will still run.");
        console.warn(error);
    }
}
