import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BACKEND_API_URL = "http://localhost:4000/api";

function getBackendApiUrl() {
    const configured =
        process.env.BACKEND_API_URL ||
        process.env.NEXT_PUBLIC_BACKEND_API_URL ||
        process.env.NEXT_PUBLIC_API_URL ||
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        DEFAULT_BACKEND_API_URL;

    if (configured.startsWith("/")) {
        return DEFAULT_BACKEND_API_URL;
    }

    return configured.replace(/\/$/, "");
}

const LEGACY_ROUTE_ALIASES: Record<string, string> = {
    login: "auth/login",
    register: "auth/register",
    me: "auth/me",
};

function normalizePath(path: string[]) {
    const joined = (path || []).join("/");
    return LEGACY_ROUTE_ALIASES[joined] || joined;
}

function buildTargetUrl(request: NextRequest, path: string[]) {
    const target = new URL(`${getBackendApiUrl()}/${normalizePath(path)}`);
    request.nextUrl.searchParams.forEach((value, key) => {
        target.searchParams.set(key, value);
    });
    return target;
}

function buildHeaders(request: NextRequest) {
    const headers = new Headers(request.headers);

    headers.delete("host");
    headers.delete("connection");
    headers.delete("content-length");

    return headers;
}

async function proxyToBackend(
    request: NextRequest,
    context: { params: Promise<{ path: string[] }> }
) {
    const { path } = await context.params;
    const targetUrl = buildTargetUrl(request, path || []);

    try {
        const method = request.method.toUpperCase();
        const response = await fetch(targetUrl, {
            method,
            headers: buildHeaders(request),
            body: ["GET", "HEAD"].includes(method) ? undefined : await request.arrayBuffer(),
            cache: "no-store",
        });

        const responseHeaders = new Headers(response.headers);
        responseHeaders.delete("content-encoding");
        responseHeaders.delete("content-length");

        return new NextResponse(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
        });
    } catch {
        return NextResponse.json(
            {
                success: false,
                message: `Cannot connect to the backend. Start it with npm.cmd run dev and make sure ${getBackendApiUrl()} is available.`,
            },
            { status: 503 }
        );
    }
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
    return proxyToBackend(request, context);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
    return proxyToBackend(request, context);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
    return proxyToBackend(request, context);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
    return proxyToBackend(request, context);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
    return proxyToBackend(request, context);
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204 });
}
