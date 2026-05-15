export type SiteTheme = "dark" | "light";

export const SITE_THEME_KEY = "age-of-scent-theme";
export const NOTIFICATION_READ_KEY = "age-of-scent-notification-read-at";

export function applySiteTheme(theme: SiteTheme) {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.theme = theme;
}

export function getStoredSiteTheme(): SiteTheme {
    if (typeof window === "undefined") return "dark";
    const stored = localStorage.getItem(SITE_THEME_KEY);
    return stored === "dark" || stored === "light" ? stored : "dark";
}

export function storeSiteTheme(theme: SiteTheme) {
    if (typeof window === "undefined") return;
    localStorage.setItem(SITE_THEME_KEY, theme);
    applySiteTheme(theme);
    window.dispatchEvent(new CustomEvent("site-theme-updated", { detail: theme }));
}

export function formatDateTime(value?: string | number | Date) {
    if (!value) return "Just now";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Just now";
    return date.toLocaleString();
}
