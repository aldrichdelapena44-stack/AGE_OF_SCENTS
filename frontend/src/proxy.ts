import { NextRequest, NextResponse } from "next/server";

const AGE_GATE_COOKIE = "age_verified";

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const isAgeGatePage = pathname === "/age-gate";
    const isNextAsset = pathname.startsWith("/_next");
    const isStaticFile =
        pathname.startsWith("/images") ||
        pathname === "/favicon.ico" ||
        pathname.endsWith(".png") ||
        pathname.endsWith(".jpg") ||
        pathname.endsWith(".jpeg") ||
        pathname.endsWith(".webp") ||
        pathname.endsWith(".svg") ||
        pathname.endsWith(".ico") ||
        pathname.endsWith(".css") ||
        pathname.endsWith(".js") ||
        pathname.endsWith(".map") ||
        pathname.endsWith(".woff") ||
        pathname.endsWith(".woff2") ||
        pathname.endsWith(".ttf");

    if (isAgeGatePage || isNextAsset || isStaticFile) {
        return NextResponse.next();
    }

    const ageVerified = request.cookies.get(AGE_GATE_COOKIE)?.value === "true";

    if (!ageVerified) {
        const url = request.nextUrl.clone();
        url.pathname = "/age-gate";
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!api).*)"]
};