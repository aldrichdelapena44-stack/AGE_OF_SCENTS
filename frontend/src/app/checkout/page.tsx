"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageShell from "@/components/layout/PageShell";
import { api, mediaUrl } from "@/lib/api";
import { clearCart, getCart, type CartItem } from "@/lib/cart";
import { getAuthUser, isLoggedIn, updateAuthUser } from "@/lib/auth";

type DeliveryLandmark = {
    id: number;
    name: string;
    details?: string;
    imageUrl?: string;
    shippingFee?: number;
    isActive: boolean;
};

type ReceiptData = {
    reference: string;
    date: string;
    paymentMethod: string;
    selectedLandmark: string;
    customLandmark: string;
    subtotal: number;
    shippingFee: number;
    total: number;
    status: "PENDING" | "ACCEPTED" | "REJECTED";
    items: CartItem[];
};

type CheckoutSettings = {
    gcashNumber: string;
    gcashQrUrl: string;
    gcashInstructions: string;
    codInstructions: string;
    adminDeliveryAddress: string;
    deliveryLandmarks: DeliveryLandmark[];
};

export default function CheckoutPage() {
    const [fullName, setFullName] = useState("");
    const [address, setAddress] = useState("");
    const [customerGcashNumber, setCustomerGcashNumber] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<"GCASH" | "COD">("GCASH");
    const [selectedLandmark, setSelectedLandmark] = useState("");
    const [customLandmark, setCustomLandmark] = useState("");
    const [needsLandmarkConfirmation, setNeedsLandmarkConfirmation] = useState(false);
    const [settings, setSettings] = useState<CheckoutSettings | null>(null);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [mounted, setMounted] = useState(false);
    const [receipt, setReceipt] = useState<ReceiptData | null>(null);
    const [receiptWindowState, setReceiptWindowState] = useState<"open" | "minimized" | "closed">("open");
    const [freshUser, setFreshUser] = useState(getAuthUser());

    useEffect(() => {
        setCart(getCart());
        setMounted(true);
        const savedUser = getAuthUser();
        setFreshUser(savedUser);
        if (savedUser?.fullName) setFullName(savedUser.fullName);

        async function refreshCurrentUser() {
            if (!isLoggedIn()) return;
            try {
                const response = await api.get<{
                    success: boolean;
                    message: string;
                    data: NonNullable<ReturnType<typeof getAuthUser>> | { user: NonNullable<ReturnType<typeof getAuthUser>> };
                }>("/auth/me");

                const latestUser = "user" in response.data ? response.data.user : response.data;
                if (!latestUser) return;
                updateAuthUser(latestUser);
                setFreshUser(latestUser);
                if (latestUser.fullName) setFullName(latestUser.fullName);
            } catch {
                // Keep checkout usable while the hosted backend wakes up.
            }
        }

        async function loadSettings() {
            try {
                const response = await api.get<{ success: boolean; message: string; data: CheckoutSettings }>(
                    `/settings/checkout?fresh=${Date.now()}`
                );
                const activeLandmarks = (response.data.deliveryLandmarks || []).filter((landmark) => landmark.isActive !== false);
                const nextSettings = { ...response.data, deliveryLandmarks: activeLandmarks };
                setSettings(nextSettings);
                setSelectedLandmark((current) => {
                    if (current && activeLandmarks.some((landmark) => landmark.name === current)) return current;
                    return activeLandmarks[0]?.name || "CUSTOM";
                });
            } catch {
                setSettings(null);
            }
        }

        refreshCurrentUser();
        loadSettings();

        function refreshWhenVisible() {
            if (document.visibilityState === "visible") loadSettings();
        }

        window.addEventListener("focus", loadSettings);
        document.addEventListener("visibilitychange", refreshWhenVisible);
        return () => {
            window.removeEventListener("focus", loadSettings);
            document.removeEventListener("visibilitychange", refreshWhenVisible);
        };
    }, []);

    const subtotal = useMemo(
        () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
        [cart]
    );
    const selectedLandmarkData = useMemo(
        () => (settings?.deliveryLandmarks || []).find((landmark) => landmark.name === selectedLandmark),
        [settings, selectedLandmark]
    );
    const shippingFee = selectedLandmark === "CUSTOM" ? 0 : Number(selectedLandmarkData?.shippingFee || 0);
    const total = subtotal + shippingFee;
    const user = mounted ? freshUser : null;
    const verificationStatus = user?.verificationStatus || "UNVERIFIED";

    async function handleCheckout(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setMessage("");

        try {
            const response = await api.post<{
                success: boolean;
                message: string;
                data: {
                    order: unknown;
                    payment: {
                        provider: string;
                        providerReference: string;
                        amount: number;
                        status: string;
                    };
                };
            }>("/payments/gcash/checkout", {
                fullName,
                address,
                customerGcashNumber,
                gcashNumber: settings?.gcashNumber || "",
                paymentMethod,
                selectedLandmark,
                customLandmark,
                needsLandmarkConfirmation: needsLandmarkConfirmation || Boolean(customLandmark.trim()),
                shippingFee,
                subtotal,
                items: cart,
                total
            });

            setReceipt({
                reference: response.data.payment.providerReference,
                date: new Date().toISOString(),
                paymentMethod,
                selectedLandmark,
                customLandmark,
                subtotal,
                shippingFee,
                total,
                status: "PENDING",
                items: cart
            });
            setReceiptWindowState("open");
            clearCart();
            setCart([]);
            setMessage(`${response.message} Reference: ${response.data.payment.providerReference}`);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Checkout failed.");
        } finally {
            setLoading(false);
        }
    }

    function updateReceiptStatus(status: "ACCEPTED" | "REJECTED") {
        setReceipt((current) => current ? { ...current, status } : current);
        setMessage(status === "ACCEPTED" ? "Transaction accepted. Please wait for admin delivery confirmation." : "Transaction rejected. Please contact admin for a revised delivery request.");
    }

    function downloadReceipt() {
        if (!receipt) return;
        const lines = [
            "AGE OF SCENT RECEIPT",
            `Date: ${new Date(receipt.date).toLocaleString()}`,
            `Reference: ${receipt.reference}`,
            `Payment: ${receipt.paymentMethod}`,
            `Landmark: ${receipt.selectedLandmark === "CUSTOM" ? receipt.customLandmark : receipt.selectedLandmark}`,
            `Transaction Status: ${receipt.status}`,
            "",
            "Products:",
            ...receipt.items.map((item) => `- ${item.name} | Qty ${item.quantity} | PHP ${Number(item.price).toFixed(2)}`),
            "",
            `Subtotal: PHP ${Number(receipt.subtotal).toFixed(2)}`,
            `Shipping fee: PHP ${Number(receipt.shippingFee).toFixed(2)}`,
            `Total: PHP ${Number(receipt.total).toFixed(2)}`,
            "",
            "Thank you for shopping with AGE OF SCENT. Your scent story starts here."
        ];
        const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `age-of-scent-receipt-${receipt.reference}.txt`;
        link.click();
        URL.revokeObjectURL(url);
    }

    if (!mounted) {
        return (
            <PageShell title="Checkout" description="Preparing secure checkout.">
                <div className="card">
                    <p className="muted">Loading checkout...</p>
                </div>
            </PageShell>
        );
    }

    if (!isLoggedIn()) {
        return (
            <PageShell title="Checkout" description="Login is required before checkout.">
                <div className="card empty-state">
                    <h3>Sign in to continue.</h3>
                    <p className="muted">Your account keeps orders, verification, and checkout secure.</p>
                    <div className="button-row">
                        <Link href="/login" className="btn">
                            Login
                        </Link>
                    </div>
                </div>
            </PageShell>
        );
    }

    if (verificationStatus === "UNVERIFIED" || verificationStatus === "REJECTED") {
        return (
            <PageShell
                title="Checkout"
                description="Account verification is required before checkout."
            >
                <div className="card empty-state">
                    <h3>Verification needed.</h3>
                    <p className="muted">
                        Complete identity verification before placing a perfume order.
                    </p>
                    <div className="button-row">
                        <Link href="/age-verification" className="btn">
                            Go to Verification
                        </Link>
                    </div>
                </div>
            </PageShell>
        );
    }

    return (
        <PageShell title="Checkout" description="Submit your AGE OF SCENT order for admin confirmation.">
            {receipt ? (
                <section className={`card receipt-card transaction-window transaction-window--${receiptWindowState}`}>
                    <div className="window-titlebar">
                        <div className="window-titlebar__caption"><span className="window-dot" /><span>Transaction Information</span></div>
                        <div className="window-controls" aria-label="Transaction window controls">
                            <button type="button" aria-label="Minimize transaction card" onClick={() => setReceiptWindowState("minimized")}>−</button>
                            <button type="button" aria-label="Restore transaction card" onClick={() => setReceiptWindowState("open")}>□</button>
                            <button type="button" aria-label="Close transaction card" onClick={() => setReceiptWindowState("closed")}>×</button>
                        </div>
                    </div>
                    {receiptWindowState === "open" ? (
                        <div className="transaction-window__body">
                            <p className="eyebrow">Receipt</p>
                            <h2>Thank you for your purchase, {fullName || user?.fullName}.</h2>
                            <p className="muted">Your order was submitted for admin confirmation.</p>
                            <div className="receipt-lines">
                                <p><strong>Date:</strong> {new Date(receipt.date).toLocaleString()}</p>
                                <p><strong>Reference:</strong> {receipt.reference}</p>
                                <p><strong>Payment:</strong> {receipt.paymentMethod}</p>
                                <p><strong>Landmark:</strong> {receipt.selectedLandmark === "CUSTOM" ? receipt.customLandmark : receipt.selectedLandmark}</p>
                                <p><strong>Transaction status:</strong> {receipt.status}</p>
                            </div>
                            <div className="order-items-list">
                                {receipt.items.map((item, index) => (
                                    <div className="order-item" key={`${item.id}-${index}`}>
                                        {item.imageUrl ? <img src={mediaUrl(item.imageUrl)} alt={item.name} /> : <div />}
                                        <div>
                                            <strong>{item.name}</strong>
                                            <p className="muted">Qty {item.quantity} · PHP {Number(item.price).toFixed(2)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="checkout-summary transaction-summary">
                                <span>Subtotal</span><strong>PHP {Number(receipt.subtotal).toFixed(2)}</strong>
                                <span>Shipping fee</span><strong>PHP {Number(receipt.shippingFee).toFixed(2)}</strong>
                                <span>Total</span><strong>PHP {Number(receipt.total).toFixed(2)}</strong>
                            </div>
                            <p className="muted">For custom landmark requests, admin can update the delivery fee. Accept or reject the final transaction after admin confirmation.</p>
                            <div className="button-row">
                                <button className="btn btn--small" type="button" onClick={() => updateReceiptStatus("ACCEPTED")}>Accept Transaction</button>
                                <button className="btn btn--small btn--ghost" type="button" onClick={() => updateReceiptStatus("REJECTED")}>Reject Transaction</button>
                                <button className="btn btn--small" type="button" onClick={downloadReceipt}>Download Transaction</button>
                            </div>
                        </div>
                    ) : (
                        <button className="window-iconified-bar" type="button" onClick={() => setReceiptWindowState("open")}>Transaction card is hidden. Click to restore.</button>
                    )}
                </section>
            ) : null}

            {verificationStatus === "PENDING" ? (
                <div className="card">
                    <p className="muted">
                        Your verification is currently pending review. Checkout can be completed
                        after admin approval.
                    </p>
                </div>
            ) : null}

            <form className="card form-card checkout-form" onSubmit={handleCheckout}>
                <div className="form-group">
                    <label>Full name</label>
                    <input
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        placeholder={user?.fullName || "Full name"}
                        required
                    />
                </div>

                {settings?.adminDeliveryAddress ? (
                    <div className="card checkout-payment-panel">
                        <p className="eyebrow">Admin Delivery Coverage</p>
                        <p className="muted">{settings.adminDeliveryAddress}</p>
                    </div>
                ) : null}

                <div className="card delivery-address-landmark-card">
                    <p className="eyebrow">Delivery Address & Landmark</p>
                    <div className="form-group">
                        <label>Your complete delivery address</label>
                        <textarea
                            value={address}
                            onChange={(event) => setAddress(event.target.value)}
                            placeholder="House number, street, barangay, city"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Delivery landmark</label>
                        <select value={selectedLandmark} onChange={(event) => setSelectedLandmark(event.target.value)}>
                            {(settings?.deliveryLandmarks || []).map((landmark) => (
                                <option key={landmark.id} value={landmark.name}>{landmark.name} — PHP {Number(landmark.shippingFee || 0).toFixed(2)} shipping</option>
                            ))}
                            <option value="CUSTOM">Other address / landmark request — admin will quote shipping</option>
                        </select>
                        {selectedLandmarkData ? <p className="field-hint">Shipping fee: PHP {shippingFee.toFixed(2)} {selectedLandmarkData.details ? `· ${selectedLandmarkData.details}` : ""}</p> : null}
                        {selectedLandmarkData?.imageUrl ? (
                            <div className="checkout-landmark-preview">
                                <img src={mediaUrl(selectedLandmarkData.imageUrl, true)} alt={`${selectedLandmarkData.name} landmark`} />
                                <div>
                                    <strong>{selectedLandmarkData.name}</strong>
                                    {selectedLandmarkData.details ? <p>{selectedLandmarkData.details}</p> : null}
                                    <span>Shipping fee: PHP {shippingFee.toFixed(2)}</span>
                                </div>
                            </div>
                        ) : null}
                        {selectedLandmark === "CUSTOM" ? <p className="field-hint">Admin will review your requested place, set the delivery fee, then you can accept or reject the transaction.</p> : null}
                    </div>

                    {selectedLandmark === "CUSTOM" ? (
                        <div className="form-group">
                            <label>Your requested landmark</label>
                            <input
                                value={customLandmark}
                                onChange={(event) => {
                                    setCustomLandmark(event.target.value);
                                    setNeedsLandmarkConfirmation(Boolean(event.target.value.trim()));
                                }}
                                placeholder="Type your complete address or preferred landmark"
                                required
                            />
                            <p className="field-hint">Custom landmarks need admin confirmation before delivery.</p>
                        </div>
                    ) : null}
                </div>

                <div className="form-group">
                    <label>Payment method</label>
                    <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as "GCASH" | "COD")}>
                        <option value="GCASH">GCash QR / Number</option>
                        <option value="COD">Cash on Delivery</option>
                    </select>
                </div>

                {paymentMethod === "GCASH" ? (
                    <div className="card checkout-payment-panel">
                        <p className="eyebrow">GCash Payment</p>
                        {settings?.gcashQrUrl ? (
                            <img className="checkout-qr" src={mediaUrl(settings.gcashQrUrl)} alt="GCash QR code" />
                        ) : (
                            <p className="muted">Admin has not uploaded a GCash QR code yet.</p>
                        )}
                        <p><strong>GCash number:</strong> {settings?.gcashNumber || "Not set yet"}</p>
                        <p className="muted">{settings?.gcashInstructions}</p>
                        <div className="form-group">
                            <label>Your GCash number or payment reference</label>
                            <input
                                value={customerGcashNumber}
                                onChange={(event) => setCustomerGcashNumber(event.target.value)}
                                placeholder="09XXXXXXXXX or payment reference"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="card checkout-payment-panel">
                        <p className="eyebrow">Cash on Delivery</p>
                        <p className="muted">{settings?.codInstructions}</p>
                    </div>
                )}

                <label className="checkbox-row">
                    <input
                        type="checkbox"
                        checked={needsLandmarkConfirmation}
                        onChange={(event) => setNeedsLandmarkConfirmation(event.target.checked)}
                    />
                    I understand the admin must confirm the payment and delivery landmark.
                </label>

                <div className="card checkout-summary">
                    <span>Items</span>
                    <strong>{cart.length}</strong>
                    <span>Subtotal</span>
                    <strong>PHP {subtotal.toFixed(2)}</strong>
                    <span>Shipping Fee</span>
                    <strong>PHP {shippingFee.toFixed(2)}</strong>
                    <span>Total</span>
                    <strong>PHP {total.toFixed(2)}</strong>
                </div>

                <button className="btn" type="submit" disabled={loading || cart.length === 0}>
                    {loading ? "Submitting..." : "Submit Order for Confirmation"}
                </button>

                {message ? <p className="muted">{message}</p> : null}
            </form>
        </PageShell>
    );
}
