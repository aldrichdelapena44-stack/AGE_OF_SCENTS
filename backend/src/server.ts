import { app } from "./app";
import { connectDatabase } from "./config/db";
import { env } from "./config/env";
import { ensureConfiguredAdminUser } from "./utils/auth-store";

async function bootstrap() {
    ensureConfiguredAdminUser();

    try {
        await connectDatabase();
    } catch (error) {
        console.warn("Continuing without database connection.");
        console.warn(error);
    }

    app.listen(env.port, () => {
        console.log(`AGE OF SCENT backend running on http://localhost:${env.port}`);
    });
}

bootstrap().catch((error) => {
    console.error("Server bootstrap failed:", error);
    process.exit(1);
});