import { Request, Response } from "express";
import { submitFeedback } from "../services/feedback.service";
import { ok } from "../utils/response";

export function createFeedback(req: Request, res: Response) {
    const feedback = submitFeedback(req.body);
    return ok(res, feedback, "Thank you. Your feedback was sent to AGE OF SCENT.", 201);
}
