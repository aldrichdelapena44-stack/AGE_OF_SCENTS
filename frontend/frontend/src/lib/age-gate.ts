export const AGE_GATE_COOKIE = "age_verified";

export function setAgeVerifiedCookie() {
    if (typeof document === "undefined") return;

    const maxAge = 60 * 60 * 24 * 30; // 30 days
    document.cookie = `${AGE_GATE_COOKIE}=true; path=/; max-age=${maxAge}; samesite=lax`;
}

export function clearAgeVerifiedCookie() {
    if (typeof document === "undefined") return;

    document.cookie = `${AGE_GATE_COOKIE}=; path=/; max-age=0; samesite=lax`;
}