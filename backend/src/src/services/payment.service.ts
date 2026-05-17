import { createGcashCheckoutSession } from "../providers/gcash.provider";
import { attachPaymentToOrder, StoredOrder } from "./order.service";

export async function createGcashCheckout(order: StoredOrder) {
    const payment = await createGcashCheckoutSession({
        orderId: order.id,
        amount: order.total,
        description: `AGE OF SCENT perfume order #${order.id}`
    });

    attachPaymentToOrder(order.id, payment.provider, payment.providerReference);

    return payment;
}