import { Router } from "express";
import { getMyOrder, listMyOrders, sendMyOrderMessage } from "../controllers/order.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

router.get("/mine", requireAuth, listMyOrders);
router.get("/mine/:id", requireAuth, getMyOrder);
router.post("/mine/:id/messages", requireAuth, sendMyOrderMessage);

export default router;
