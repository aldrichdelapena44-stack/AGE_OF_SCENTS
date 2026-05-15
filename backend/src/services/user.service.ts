import { getUserById, sanitizeUser } from "../utils/auth-store";

export function getUserProfile(userId: number) {
    const user = getUserById(userId);

    if (!user) {
        throw new Error("User not found.");
    }

    return sanitizeUser(user);
}