import { Request, Response } from "express";
import { createContactMessage } from "../services/contact.service";
import { fail, ok } from "../utils/response";

export function submitContactMessage(req: Request, res: Response) {
    try {
        const message = createContactMessage({
            name: req.body.name,
            email: req.body.email,
            message: req.body.message
        });

        return ok(res, message, "Your private consultation request has been received.", 201);
    } catch (error) {
        return fail(
            res,
            error instanceof Error ? error.message : "Contact submission failed.",
            400
        );
    }
}
