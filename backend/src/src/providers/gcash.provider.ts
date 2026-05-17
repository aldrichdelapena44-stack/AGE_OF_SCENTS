import { env } from "../config/env";

type CheckoutInput = {
    orderId: number;
    amount: number;
    description: string;
};

export async function createGcashCheckoutSession(input: CheckoutInput) {
    const providerReference = `GCASH-${Date.now()}-${input.orderId}`;

    return {
        provider: "GCASH",
        providerReference,
        checkoutUrl: `${env.frontendUrl}/payment-success?reference=${providerReference}`,
        amount: input.amount,
        status: "PENDING"
    };
}