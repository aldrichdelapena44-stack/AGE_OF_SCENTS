import { Request, Response } from "express";
import { markOrderPaidByReference } from "../services/order.service";
import { ok } from "../utils/response";

export function handleGcashWebhook(req: Request, res: Response) {
    const { providerReference, status } = req.body as {
        providerReference?: string;
        status?: string;
    };

    if (providerReference && status === "PAID") {
        markOrderPaidByReference(providerReference);
    }

    return ok(res, { received: true }, "Webhook received.");
}