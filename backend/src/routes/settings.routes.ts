import { Router } from "express";
import { publicCheckoutSettings } from "../controllers/settings.controller";

const router = Router();

router.get("/checkout", publicCheckoutSettings);

export default router;
