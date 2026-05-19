import { Request, Response } from "express";
import { addOrderChatMessage, getOrderById, getOrdersByUser } from "../services/order.service";
import { fail, ok } from "../utils/response";

type RequestWithUser = Request & {
    user?: { id: number; fullName: string; role: "ADMIN" | "CUSTOMER" };
};

function disableCache(res: Response) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
}

export async function listMyOrders(req: RequestWithUser, res: Response) {
    try {
        disableCache(res);
        return ok(res, await getOrdersByUser(req.user!.id), "Orders fetched.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Orders fetch failed.", 400);
    }
}

export async function getMyOrder(req: RequestWithUser, res: Response) {
    try {
        disableCache(res);
        const order = await getOrderById(Number(req.params.id));
        if (!order || order.userId !== req.user!.id) return fail(res, "Order not found.", 404);
        return ok(res, order, "Order fetched.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Order fetch failed.", 400);
    }
}

export async function sendMyOrderMessage(req: RequestWithUser, res: Response) {
    try {
        const order = await getOrderById(Number(req.params.id));
        if (!order || order.userId !== req.user!.id) return fail(res, "Order not found.", 404);
        const updated = await addOrderChatMessage(order.id, {
            senderId: req.user!.id,
            senderName: req.user!.fullName || "Client",
            senderRole: "CUSTOMER",
            message: String(req.body.message || "")
        });
        return ok(res, updated, "Message sent.");
    } catch (error) {
        return fail(res, error instanceof Error ? error.message : "Message failed.", 400);
    }
}
