import { Router } from "express";
import { handleGcashWebhook } from "../controllers/webhook.controller";

const router = Router();

router.post("/gcash", handleGcashWebhook);

export default router;