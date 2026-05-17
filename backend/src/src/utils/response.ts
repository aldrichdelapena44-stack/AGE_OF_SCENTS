import { Response } from "express";

export function ok(
    res: Response,
    data: unknown = null,
    message = "OK",
    status = 200
) {
    return res.status(status).json({
        success: true,
        message,
        data
    });
}

export function fail(
    res: Response,
    message = "Request failed",
    status = 400,
    errors?: unknown
) {
    return res.status(status).json({
        success: false,
        message,
        errors
    });
}