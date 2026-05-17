import { Request, Response } from "express";
import { createCheckoutOrder, PaymentMethod } from "../services/order.service";
import { attachPaymentToOrder } from "../services/order.service";
import { fail, ok } from "../utils/response";

type RequestWithUser = Request & {
    user?: {
        id: number;
    };
};

function makeOrderReference(orderId: number) {
    return `AOS-${orderId}-${Date.now().toString(36).toUpperCase()}`;
}

export async function createGcashPayment(req: RequestWithUser, res: Response) {
    try {
        const paymentMethod: PaymentMethod = req.body.paymentMethod === "COD" ? "COD" : "GCASH";
        const order = createCheckoutOrder({
            userId: req.user!.id,
            fullName: req.body.fullName,
            address: req.body.address,
            gcashNumber: req.body.gcashNumber,
            customerGcashNumber: req.body.customerGcashNumber,
            selectedLandmark: req.body.selectedLandmark,
            customLandmark: req.body.customLandmark,
            needsLandmarkConfirmation: req.body.needsLandmarkConfirmation,
            paymentMethod,
            items: req.body.items,
            subtotal: req.body.subtotal,
            shippingFee: req.body.shippingFee
        });

        const reference = makeOrderReference(order.id);
        attachPaymentToOrder(order.id, paymentMethod, reference);

        return ok(
            res,
            {
                order: {
                    ...order,
                    paymentProvider: paymentMethod,
                    paymentReference: reference
                },
                payment: {
                    provider: paymentMethod,
                    providerReference: reference,
                    amount: order.total,
                    status: "PENDING_CONFIRMATION"
                }
            },
            paymentMethod === "GCASH"
                ? "Order submitted. Admin will confirm your GCash payment details."
                : "COD order submitted. Admin will confirm the delivery landmark.",
            201
        );
    } catch (error) {
        return fail(
            res,
            error instanceof Error ? error.message : "Checkout failed.",
            400
        );
    }
}
