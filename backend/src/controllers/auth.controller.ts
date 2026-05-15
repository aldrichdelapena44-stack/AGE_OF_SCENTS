import { Request, Response } from "express";
import { getCurrentUser, loginUser, registerUser } from "../services/auth.service";
import { fail, ok } from "../utils/response";

type RequestWithUser = Request & {
    user?: {
        id: number;
    };
};

export function register(req: Request, res: Response) {
    try {
        const result = registerUser(req.body);
        return ok(res, result, "Registration successful.", 201);
    } catch (error) {
        return fail(
            res,
            error instanceof Error ? error.message : "Registration failed.",
            400
        );
    }
}

export function login(req: Request, res: Response) {
    try {
        const result = loginUser(req.body);
        return ok(res, result, "Login successful.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Login failed.", 401);
    }
}

export function me(req: RequestWithUser, res: Response) {
    try {
        const user = getCurrentUser(req.user!.id);
        return ok(res, user, "Current user fetched.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Failed.", 400);
    }
}