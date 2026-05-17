import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

export type UserRole = "CUSTOMER" | "ADMIN";
export type VerificationState = "UNVERIFIED" | "PENDING" | "APPROVED" | "REJECTED";

export type StoredUser = {
    id: number;
    fullName: string;
    email: string;
    password: string;
    role: UserRole;
    verificationStatus: VerificationState;
    createdAt: string;
};

const dataDir = path.join(process.cwd(), "data");
const usersDataFile = path.join(dataDir, "users.json");
const sessions = new Map<string, number>();

function ensureDataDir() {
    fs.mkdirSync(dataDir, { recursive: true });
}

function normalizeEmail(email: string) {
    return email.trim().toLowerCase();
}

function loadUsers() {
    try {
        if (!fs.existsSync(usersDataFile)) return [] as StoredUser[];
        const parsed = JSON.parse(fs.readFileSync(usersDataFile, "utf8")) as StoredUser[];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [] as StoredUser[];
    }
}

const users: StoredUser[] = loadUsers();
let nextUserId = users.reduce((max, user) => Math.max(max, user.id), 0) + 1;

function saveUsers() {
    ensureDataDir();
    fs.writeFileSync(usersDataFile, JSON.stringify(users, null, 2));
}

export function sanitizeUser(user: StoredUser) {
    return {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        verificationStatus: user.verificationStatus,
        createdAt: user.createdAt
    };
}

export function listUsers() {
    return users.map(sanitizeUser);
}

export function getUserById(id: number) {
    return users.find((user) => user.id === id) || null;
}

export function findUserByEmail(email: string) {
    const normalized = normalizeEmail(email);
    return users.find((user) => normalizeEmail(user.email) === normalized) || null;
}

export function hasAdminUser() {
    return users.some((user) => user.role === "ADMIN");
}

export function createUser(fullName: string, email: string, password: string) {
    const normalizedEmail = normalizeEmail(email);
    const firstAdmin = !hasAdminUser();

    const user: StoredUser = {
        id: nextUserId++,
        fullName: fullName.trim(),
        email: normalizedEmail,
        password,
        role: firstAdmin ? "ADMIN" : "CUSTOMER",
        verificationStatus: firstAdmin ? "APPROVED" : "UNVERIFIED",
        createdAt: new Date().toISOString()
    };

    users.push(user);
    saveUsers();
    return user;
}

export function validateUser(email: string, password: string) {
    const user = findUserByEmail(email);
    if (!user) return null;
    return user.password === password ? user : null;
}

export function createSession(userId: number) {
    const token = randomUUID();
    sessions.set(token, userId);
    return token;
}

export function getUserByToken(token: string) {
    const userId = sessions.get(token);
    if (!userId) return null;
    return getUserById(userId);
}

export function updateUserVerificationStatus(userId: number, verificationStatus: VerificationState) {
    const user = getUserById(userId);
    if (!user) return null;

    user.verificationStatus = verificationStatus;
    saveUsers();
    return user;
}

export function ensureConfiguredAdminUser() {
    const email = process.env.ADMIN_EMAIL?.trim();
    const password = process.env.ADMIN_PASSWORD?.trim();
    const fullName = process.env.ADMIN_FULL_NAME?.trim() || "AGE OF SCENT Admin";

    if (!email || !password) return null;

    const existing = findUserByEmail(email);
    if (existing) {
        existing.fullName = fullName;
        existing.password = password;
        existing.role = "ADMIN";
        existing.verificationStatus = "APPROVED";
        saveUsers();
        return existing;
    }

    const admin: StoredUser = {
        id: nextUserId++,
        fullName,
        email: normalizeEmail(email),
        password,
        role: "ADMIN",
        verificationStatus: "APPROVED",
        createdAt: new Date().toISOString()
    };

    users.push(admin);
    saveUsers();
    return admin;
}
