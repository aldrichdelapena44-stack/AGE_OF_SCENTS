import {
    createSession,
    createUser,
    findUserByEmail,
    getUserById,
    listUsers,
    sanitizeUser,
    validateUser
} from "../utils/auth-store";

export async function registerUser(input: {
    fullName: string;
    email: string;
    password: string;
}) {
    const existing = await findUserByEmail(input.email);

    if (existing) {
        throw new Error("Email is already registered.");
    }

    const user = await createUser(input.fullName, input.email, input.password);
    const token = createSession(user.id);

    return {
        token,
        user: sanitizeUser(user)
    };
}

export async function loginUser(input: { email: string; password: string }) {
    const user = await validateUser(input.email, input.password);

    if (!user) {
        throw new Error("Invalid email or password.");
    }

    const token = createSession(user.id);

    return {
        token,
        user: sanitizeUser(user)
    };
}

export async function getCurrentUser(userId: number) {
    const user = await getUserById(userId);

    if (!user) {
        throw new Error("User not found.");
    }

    return sanitizeUser(user);
}

export async function getAllUsers() {
    return listUsers();
}
