import { randomUUID } from "crypto";
import { supabase } from "../config/supabase";

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

const sessions = new Map<string, number>();

function normalizeEmail(email: string) {
    return email.trim().toLowerCase();
}

function normalizeRole(role?: string): UserRole {
    return role === "ADMIN" ? "ADMIN" : "CUSTOMER";
}

function normalizeVerificationStatus(status?: string): VerificationState {
    if (status === "APPROVED" || status === "PENDING" || status === "REJECTED" || status === "UNVERIFIED") return status;
    return "UNVERIFIED";
}

function fromRow(row: any): StoredUser {
    return {
        id: Number(row.id),
        fullName: String(row.full_name || ""),
        email: String(row.email || ""),
        password: String(row.password_hash || ""),
        role: normalizeRole(row.role),
        verificationStatus: normalizeVerificationStatus(row.verification_status),
        createdAt: String(row.created_at || new Date().toISOString())
    };
}

function toRow(user: StoredUser) {
    return {
        id: user.id,
        full_name: user.fullName,
        email: normalizeEmail(user.email),
        password_hash: user.password,
        role: user.role,
        verification_status: user.verificationStatus,
        updated_at: new Date().toISOString(),
        created_at: user.createdAt
    };
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

export type SanitizedUser = ReturnType<typeof sanitizeUser>;

async function nextUserId() {
    const { data, error } = await supabase
        .from("users")
        .select("id")
        .order("id", { ascending: false })
        .limit(1);

    if (error) throw new Error(error.message);
    return Number(data?.[0]?.id || 0) + 1;
}

export async function listUsers() {
    const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("id", { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []).map(fromRow).map(sanitizeUser);
}

export async function getUserById(id: number) {
    const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? fromRow(data) : null;
}

export async function findUserByEmail(email: string) {
    const normalized = normalizeEmail(email);
    const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", normalized)
        .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? fromRow(data) : null;
}

export async function hasAdminUser() {
    const { count, error } = await supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("role", "ADMIN");

    if (error) throw new Error(error.message);
    return Boolean((count || 0) > 0);
}

export async function createUser(fullName: string, email: string, password: string) {
    const normalizedEmail = normalizeEmail(email);
    const firstAdmin = !(await hasAdminUser());

    const user: StoredUser = {
        id: await nextUserId(),
        fullName: fullName.trim(),
        email: normalizedEmail,
        password,
        role: firstAdmin ? "ADMIN" : "CUSTOMER",
        verificationStatus: firstAdmin ? "APPROVED" : "UNVERIFIED",
        createdAt: new Date().toISOString()
    };

    const { data, error } = await supabase
        .from("users")
        .insert(toRow(user))
        .select("*")
        .single();

    if (error) throw new Error(error.message);
    return fromRow(data);
}

export async function validateUser(email: string, password: string) {
    const user = await findUserByEmail(email);
    if (!user) return null;
    return user.password === password ? user : null;
}

export function createSession(userId: number) {
    const token = randomUUID();
    sessions.set(token, userId);
    return token;
}

export async function getUserByToken(token: string) {
    const userId = sessions.get(token);
    if (!userId) return null;
    return getUserById(userId);
}

export async function updateUserVerificationStatus(userId: number, verificationStatus: VerificationState) {
    const { data, error } = await supabase
        .from("users")
        .update({
            verification_status: verificationStatus,
            updated_at: new Date().toISOString()
        })
        .eq("id", userId)
        .select("*")
        .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? fromRow(data) : null;
}

export async function ensureConfiguredAdminUser() {
    const email = process.env.ADMIN_EMAIL?.trim();
    const password = process.env.ADMIN_PASSWORD?.trim();
    const fullName = process.env.ADMIN_FULL_NAME?.trim() || "AGE OF SCENT Admin";

    if (!email || !password) return null;

    const existing = await findUserByEmail(email);
    if (existing) {
        const updated: StoredUser = {
            ...existing,
            fullName,
            password,
            role: "ADMIN",
            verificationStatus: "APPROVED"
        };

        const { data, error } = await supabase
            .from("users")
            .upsert(toRow(updated), { onConflict: "id" })
            .select("*")
            .single();

        if (error) throw new Error(error.message);
        return fromRow(data);
    }

    const admin: StoredUser = {
        id: await nextUserId(),
        fullName,
        email: normalizeEmail(email),
        password,
        role: "ADMIN",
        verificationStatus: "APPROVED",
        createdAt: new Date().toISOString()
    };

    const { data, error } = await supabase
        .from("users")
        .insert(toRow(admin))
        .select("*")
        .single();

    if (error) throw new Error(error.message);
    return fromRow(data);
}
