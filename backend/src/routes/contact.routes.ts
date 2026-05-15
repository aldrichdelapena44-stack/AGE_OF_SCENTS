import { Router } from "express";
import { submitContactMessage } from "../controllers/contact.controller";
import { validateBody } from "../middlewares/validation.middleware";
import { contactSchema } from "../validators/contact.validator";

const router = Router();

router.post("/", validateBody(contactSchema), submitContactMessage);

export default router;
