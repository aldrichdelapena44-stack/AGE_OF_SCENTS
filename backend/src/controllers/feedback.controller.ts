import { Request, Response } from "express";
import { submitFeedback } from "../services/feedback.service";
import { fail, ok } from "../utils/response";

export async function createFeedback(req: Request, res: Response) {
    try {
        const feedback = await submitFeedback(req.body);
        return ok(res, feedback, "Thank you. Your feedback was sent to AGE OF SCENT.", 201);
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Feedback submission failed.", 400);
    }
}
