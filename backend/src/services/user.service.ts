import { getUserById, sanitizeUser } from "../utils/auth-store";
import { syncUserVerificationStatus } from "./verification.service";

export function getUserProfile(userId: number) {
    const user = getUserById(userId);

    if (!user) {
        throw new Error("User not found.");
    }

    const syncedUser = syncUserVerificationStatus(userId) || user;
    return sanitizeUser(syncedUser);
}