export type AuthUser = {
    id: number;
    fullName: string;
    email: string;
    role?: string;
    verificationStatus?: string;
};

export const TOKEN_KEY = "age_of_scent_token";
const LEGACY_TOKEN_KEY = "token";
const USER_KEY = "age_of_scent_user";

export function getToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
}

export function getAuthUser(): AuthUser | null {
    if (typeof window === "undefined") return null;

    try {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function isLoggedIn() {
    return Boolean(getToken());
}

export function saveAuth(token: string, user: AuthUser) {
    if (typeof window === "undefined") return;

    localStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event("auth-updated"));
}

export function updateAuthUser(partial: Partial<AuthUser>) {
    if (typeof window === "undefined") return;

    const currentUser = getAuthUser();
    if (!currentUser) return;

    const updatedUser = {
        ...currentUser,
        ...partial
    };

    localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
    window.dispatchEvent(new Event("auth-updated"));
}

export function clearAuth() {
    if (typeof window === "undefined") return;

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new Event("auth-updated"));
}