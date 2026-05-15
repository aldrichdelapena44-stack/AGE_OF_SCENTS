import { Request, Response } from "express";
import { getUserProfile } from "../services/user.service";
import { fail, ok } from "../utils/response";

type RequestWithUser = Request & {
    user?: {
        id: number;
    };
};

export function getProfile(req: RequestWithUser, res: Response) {
    try {
        if (!req.user) {
            return fail(res, "Unauthorized.", 401);
        }

        const profile = getUserProfile(req.user.id);
        return ok(res, profile, "Profile fetched.");
    } catch (error) {
        return fail(
            res,
            error instanceof Error ? error.message : "Failed to fetch profile.",
            400
        );
    }
}