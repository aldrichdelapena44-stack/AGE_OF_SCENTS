import { Router } from "express";
import { createFeedback } from "../controllers/feedback.controller";
import { validateBody } from "../middlewares/validation.middleware";
import { feedbackSchema } from "../validators/feedback.validator";

const router = Router();

router.post("/", validateBody(feedbackSchema), createFeedback);

export default router;
