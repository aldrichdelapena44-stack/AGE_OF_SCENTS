import { getUserById, sanitizeUser } from "../utils/auth-store";
import { syncUserVerificationStatus } from "./verification.service";

export async function getUserProfile(userId: number) {
    const user = await getUserById(userId);

    if (!user) {
        throw new Error("User not found.");
    }

    const syncedUser = await syncUserVerificationStatus(userId);
    return sanitizeUser(syncedUser || user);
}
