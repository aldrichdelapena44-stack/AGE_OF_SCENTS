import { Router } from "express";
import { createGcashPayment } from "../controllers/payment.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { validateBody } from "../middlewares/validation.middleware";
import { checkoutSchema } from "../validators/checkout.validator";

const router = Router();

router.post("/gcash/checkout", requireAuth, validateBody(checkoutSchema), createGcashPayment);

export default router;