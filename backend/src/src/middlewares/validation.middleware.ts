import { NextFunction, Request, Response } from "express";
import { z } from "zod";

export function validateBody(schema: z.ZodTypeAny) {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed.",
                errors: result.error.flatten()
            });
        }

        req.body = result.data;
        next();
    };
}