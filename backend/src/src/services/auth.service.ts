import {
    createSession,
    createUser,
    findUserByEmail,
    getUserById,
    listUsers,
    sanitizeUser,
    validateUser
} from "../utils/auth-store";

export function registerUser(input: {
    fullName: string;
    email: string;
    password: string;
}) {
    const existing = findUserByEmail(input.email);

    if (existing) {
        throw new Error("Email is already registered.");
    }

    const user = createUser(input.fullName, input.email, input.password);
    const token = createSession(user.id);

    return {
        token,
        user: sanitizeUser(user)
    };
}

export function loginUser(input: { email: string; password: string }) {
    const user = validateUser(input.email, input.password);

    if (!user) {
        throw new Error("Invalid email or password.");
    }

    const token = createSession(user.id);

    return {
        token,
        user: sanitizeUser(user)
    };
}

export function getCurrentUser(userId: number) {
    const user = getUserById(userId);

    if (!user) {
        throw new Error("User not found.");
    }

    return sanitizeUser(user);
}

export function getAllUsers() {
    return listUsers();
}