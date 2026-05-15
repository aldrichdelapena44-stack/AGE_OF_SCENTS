import { NextFunction, Request, Response } from "express";
import { getUserByToken, sanitizeUser } from "../utils/auth-store";
import { fail } from "../utils/response";

type RequestWithUser = Request & {
    user?: ReturnType<typeof sanitizeUser>;
};

export function requireAuth(
    req: RequestWithUser,
    res: Response,
    next: NextFunction
) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return fail(res, "Unauthorized.", 401);
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const user = getUserByToken(token);

    if (!user) {
        return fail(res, "Invalid or expired session.", 401);
    }

    req.user = sanitizeUser(user);
    next();
}

export function requireAdmin(
    req: RequestWithUser,
    res: Response,
    next: NextFunction
) {
    requireAuth(req, res, () => {
        if (!req.user || req.user.role !== "ADMIN") {
            return fail(res, "Admin access required.", 403);
        }

        next();
    });
}