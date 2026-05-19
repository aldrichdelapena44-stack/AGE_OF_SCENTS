import { NextFunction, Request, Response } from "express";
import { getUserByToken, sanitizeUser, SanitizedUser } from "../utils/auth-store";
import { fail } from "../utils/response";

type RequestWithUser = Request & {
    user?: SanitizedUser;
};

export async function requireAuth(
    req: RequestWithUser,
    res: Response,
    next: NextFunction
) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return fail(res, "Unauthorized.", 401);
        }

        const token = authHeader.replace("Bearer ", "").trim();
        const user = await getUserByToken(token);

        if (!user) {
            return fail(res, "Invalid or expired session.", 401);
        }

        req.user = sanitizeUser(user);
        next();
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Authentication failed.", 401);
    }
}

export async function requireAdmin(
    req: RequestWithUser,
    res: Response,
    next: NextFunction
) {
    await requireAuth(req, res, () => {
        if (!req.user || req.user.role !== "ADMIN") {
            return fail(res, "Admin access required.", 403);
        }

        next();
    });
}
