import { TOKEN_KEY } from "@/lib/auth";

const LOCAL_BACKEND_ORIGIN = "http://localhost:4000";
const LOCAL_API_BASE_URL = `${LOCAL_BACKEND_ORIGIN}/api`;
const LEGACY_TOKEN_KEY = "token";

const LEGACY_ROUTE_ALIASES: Record<string, string> = {
    login: "auth/login",
    register: "auth/register",
    me: "auth/me",
};

function normalizeApiPath(path: string) {
    const cleanPath = path.replace(/^\/+/, "");
    return LEGACY_ROUTE_ALIASES[cleanPath] || cleanPath;
}

function isLocalBrowser() {
    if (typeof window === "undefined") return false;
    return ["localhost", "127.0.0.1"].includes(window.location.hostname);
}

function resolveApiBaseUrl() {
    const configuredUrl = (
        process.env.NEXT_PUBLIC_API_URL ||
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        ""
    ).replace(/\/$/, "");

    // In local development, always call the Express backend directly.
    // This avoids stale Next.js /api proxy cache and fixes localhost 404 issues.
    if (isLocalBrowser()) {
        return LOCAL_API_BASE_URL;
    }

    return configuredUrl || LOCAL_API_BASE_URL;
}

function resolveBackendOrigin() {
    const configuredUrl = (
        process.env.NEXT_PUBLIC_API_URL ||
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        ""
    ).replace(/\/$/, "");

    if (isLocalBrowser()) {
        return LOCAL_BACKEND_ORIGIN;
    }

    if (configuredUrl.startsWith("http://") || configuredUrl.startsWith("https://")) {
        return configuredUrl.replace(/\/api\/?$/, "");
    }

    return "";
}

export const API_BASE_URL = resolveApiBaseUrl();
export const API_ORIGIN = resolveBackendOrigin();

export const mediaUrl = (path?: string | null) => {
    if (!path) return "";

    if (path.startsWith("http://") || path.startsWith("https://")) {
        return path;
    }

    const cleanPath = path.replace(/^\/+/, "");

    if (cleanPath.startsWith("uploads/")) {
        return API_ORIGIN ? `${API_ORIGIN}/${cleanPath}` : `/${cleanPath}`;
    }

    return `/${cleanPath}`;
};

type RequestBody =
    | Record<string, unknown>
    | unknown[]
    | string
    | number
    | boolean
    | null
    | FormData
    | undefined;

function getStoredToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
}

function getFriendlyNetworkError(error: unknown) {
    const apiUrl = API_BASE_URL.startsWith("http") ? API_BASE_URL : `${window.location.origin}${API_BASE_URL}`;
    const backendUrl = API_BASE_URL.replace(/\/api\/?$/, "");

    if (error instanceof TypeError) {
        return `Cannot connect to the backend. Make sure it is running at ${backendUrl}, then refresh and try again.`;
    }

    if (error instanceof Error) {
        return error.message || `Request failed while calling ${apiUrl}.`;
    }

    return `Request failed while calling ${apiUrl}.`;
}

async function request<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const token = getStoredToken();
    const url = `${API_BASE_URL}/${normalizeApiPath(path)}`;
    const headers = new Headers(options.headers);

    if (!(options.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
    }

    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    let response: Response;

    try {
        response = await fetch(url, {
            ...options,
            headers,
        });
    } catch (error) {
        throw new Error(getFriendlyNetworkError(error));
    }

    const text = await response.text();
    let data: unknown = null;

    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }

    if (!response.ok) {
        const errorData = data as { message?: string; error?: string };
        throw new Error(errorData?.message || errorData?.error || "Request failed");
    }

    return data as T;
}

export const api = {
    get: <T>(path: string): Promise<T> => {
        return request<T>(path, {
            method: "GET",
        });
    },

    post: <T>(path: string, body?: RequestBody): Promise<T> => {
        return request<T>(path, {
            method: "POST",
            body:
                body instanceof FormData
                    ? body
                    : body !== undefined
                        ? JSON.stringify(body)
                        : undefined,
        });
    },

    put: <T>(path: string, body?: RequestBody): Promise<T> => {
        return request<T>(path, {
            method: "PUT",
            body:
                body instanceof FormData
                    ? body
                    : body !== undefined
                        ? JSON.stringify(body)
                        : undefined,
        });
    },

    delete: <T>(path: string): Promise<T> => {
        return request<T>(path, {
            method: "DELETE",
        });
    },
};
