"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import PageShell from "@/components/layout/PageShell";
import { getAuthUser, isLoggedIn } from "@/lib/auth";
import { api, mediaUrl } from "@/lib/api";
import { formatDateTime } from "@/lib/site-preferences";

type UserState = {
    id: number;
    fullName: string;
    email: string;
    role?: string;
    verificationStatus?: string;
} | null;

type OrderItem = { id: number; name: string; quantity: number; price: number; imageUrl?: string; volume?: string };
type ChatMessage = { id: number; senderName: string; senderRole: "ADMIN" | "CUSTOMER"; message: string; createdAt: string };
type MyOrder = {
    id: number;
    address: string;
    selectedLandmark?: string;
    customLandmark?: string;
    landmarkStatus?: string;
    deliveryNote?: string;
    subtotal?: number;
    shippingFee?: number;
    transactionDecision?: "PENDING" | "ACCEPTED" | "REJECTED";
    total: number;
    paymentMethod?: string;
    paymentReference?: string;
    customerGcashNumber?: string;
    status: string;
    items: OrderItem[];
    chatMessages: ChatMessage[];
    createdAt: string;
};

const emojis = ["😊", "👍", "❤️", "✅", "🚚", "📦"];
const chatThemes = ["gold", "blue", "rose"];

function messageParts(message: string) {
    const imageMatch = message.match(/\[image:([^\]]+)\]/);
    return {
        text: message.replace(/\[image:[^\]]+\]/g, "").trim(),
        image: imageMatch?.[1]
    };
}

function orderProductSummary(order: MyOrder) {
    return order.items.map((item) => `${item.quantity}x ${item.name}`).join(", ") || "perfume order";
}

export default function AccountPage() {
    const [user, setUser] = useState<UserState>(null);
    const [mounted, setMounted] = useState(false);
    const [orders, setOrders] = useState<MyOrder[]>([]);
    const [hiddenPaymentIds, setHiddenPaymentIds] = useState<number[]>([]);
    const [orderMessage, setOrderMessage] = useState("");
    const [chatDrafts, setChatDrafts] = useState<Record<number, string>>({});
    const [chatImages, setChatImages] = useState<Record<number, string>>({});
    const [paymentSearch, setPaymentSearch] = useState("");
    const [chatTheme, setChatTheme] = useState("gold");
    const [transactionDecisions, setTransactionDecisions] = useState<Record<number, "ACCEPTED" | "REJECTED">>({});

    useEffect(() => {
        setUser(getAuthUser());
        setMounted(true);
        async function loadOrders() {
            if (!isLoggedIn()) return;
            try {
                const response = await api.get<{ success: boolean; message: string; data: MyOrder[] }>("/orders/mine");
                setOrders(response.data || []);
            } catch {
                setOrders([]);
            }
        }
        loadOrders();
    }, []);

    const paymentRecords = useMemo(() => {
        const query = paymentSearch.trim().toLowerCase();
        return orders
            .filter((order) => !hiddenPaymentIds.includes(order.id))
            .filter((order) => {
                const haystack = [order.status, order.paymentMethod, order.paymentReference, order.customerGcashNumber, orderProductSummary(order), order.createdAt]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();
                return !query || haystack.includes(query);
            });
    }, [orders, hiddenPaymentIds, paymentSearch]);

    function attachChatImage(orderId: number, file?: File) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setChatImages((current) => ({ ...current, [orderId]: String(reader.result || "") }));
        reader.readAsDataURL(file);
    }

    async function sendClientMessage(event: FormEvent<HTMLFormElement>, orderId: number) {
        event.preventDefault();
        const draft = (chatDrafts[orderId] || "").trim();
        const image = chatImages[orderId];
        if (!draft && !image) return;
        try {
            const outgoing = image ? `${draft}\n[image:${image}]`.trim() : draft;
            const response = await api.post<{ success: boolean; message: string; data: MyOrder }>(`/orders/mine/${orderId}/messages`, { message: outgoing });
            setOrders((current) => current.map((order) => order.id === orderId ? response.data : order));
            setChatDrafts((current) => ({ ...current, [orderId]: "" }));
            setChatImages((current) => ({ ...current, [orderId]: "" }));
            setOrderMessage(response.message || "Message sent.");
        } catch (error) {
            setOrderMessage(error instanceof Error ? error.message : "Message failed.");
        }
    }

    async function decideTransaction(orderId: number, decision: "ACCEPTED" | "REJECTED") {
        setTransactionDecisions((current) => ({ ...current, [orderId]: decision }));
        setOrderMessage(decision === "ACCEPTED" ? "Transaction accepted. Admin will continue processing your delivery." : "Transaction rejected. Admin has been notified to revise or cancel the delivery request.");
        try {
            const response = await api.post<{ success: boolean; message: string; data: MyOrder }>(`/orders/mine/${orderId}/messages`, {
                message: decision === "ACCEPTED" ? "Customer accepted the updated delivery transaction." : "Customer rejected the updated delivery transaction."
            });
            setOrders((current) => current.map((order) => order.id === orderId ? response.data : order));
        } catch {
            // Keep the local decision visible even if the chat notification endpoint is unavailable.
        }
    }

    if (!mounted) {
        return (
            <PageShell title="Account" description="Loading account.">
                <div className="card"><p className="muted">Loading...</p></div>
            </PageShell>
        );
    }

    if (!isLoggedIn()) {
        return (
            <PageShell title="Account" description="Login required.">
                <div className="card empty-state">
                    <h3>Access your private profile.</h3>
                    <p className="muted">Please log in to view orders, verification, and boutique details.</p>
                    <div className="button-row"><Link href="/login" className="btn">Login</Link><Link href="/register" className="btn btn--ghost">Register</Link></div>
                </div>
            </PageShell>
        );
    }

    const verificationStatus = user?.verificationStatus || "UNVERIFIED";

    return (
        <PageShell title="Account" description="">
            <div className="grid grid--2">
                <div className="card account-card">
                    <p className="eyebrow">Profile</p>
                    <h3>{user?.fullName}</h3>
                    <p><strong>Email:</strong> {user?.email}</p>
                    <p><strong>Role:</strong> {user?.role || "CUSTOMER"}</p>
                </div>
                <div className="card account-card">
                    <p className="eyebrow">Verification</p>
                    <h3>Account review</h3>
                    <p><strong>Status:</strong> <span className={`status-badge status-${verificationStatus.toLowerCase()}`}>{verificationStatus}</span></p>
                    <div className="button-row"><Link href="/age-verification" className="btn">Manage Verification</Link></div>
                </div>
            </div>

            <div className="card">
                <p className="eyebrow">Next Steps</p>
                {verificationStatus === "APPROVED" ? <p className="muted">Your account is verified. You may proceed with the perfume checkout flow.</p> : verificationStatus === "PENDING" ? <p className="muted">Your verification is under review. Admin approval remains preserved in the system.</p> : verificationStatus === "REJECTED" ? <p className="muted">Your verification was rejected. Please submit a new valid image for review.</p> : <p className="muted">Your account is not verified yet. Submit verification before full checkout.</p>}
            </div>

            <section className="card payment-report-card">
                <div className="payment-report-head">
                    <div>
                        <p className="eyebrow">My Payment Reports</p>
                        <h2>Your payment records</h2>
                        <p className="muted">Only your own payment records appear here.</p>
                    </div>
                    <div className="form-group search-field">
                        <label htmlFor="client-payment-search">Search payments</label>
                        <input id="client-payment-search" value={paymentSearch} onChange={(event) => setPaymentSearch(event.target.value)} placeholder="Search your payment records..." />
                    </div>
                </div>
                <div className="payment-table-wrap">
                    <table className="payment-table">
                        <thead><tr><th>Date</th><th>Product</th><th>Method</th><th>Reference</th><th>Total</th><th>Status</th><th>Action</th></tr></thead>
                        <tbody>
                            {paymentRecords.map((order) => (
                                <tr key={order.id}>
                                    <td>{formatDateTime(order.createdAt)}</td>
                                    <td>{orderProductSummary(order)}</td>
                                    <td>{order.paymentMethod || "N/A"}</td>
                                    <td>{order.paymentReference || order.customerGcashNumber || "N/A"}</td>
                                    <td>PHP {Number(order.total).toFixed(2)}</td>
                                    <td>{order.status}</td>
                                    <td><button className="btn btn--small btn--ghost" type="button" onClick={() => setHiddenPaymentIds((current) => [...current, order.id])}>Delete</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {paymentRecords.length === 0 ? <p className="muted">No payment records match your search.</p> : null}
                </div>
            </section>

            <section className="card account-orders-card">
                <p className="eyebrow">My Orders</p>
                {orderMessage ? <p className="muted">{orderMessage}</p> : null}
                <div className="chat-theme-picker">
                    <span className="muted">Messenger theme:</span>
                    <div className="category-filter-row">{chatThemes.map((theme) => <button key={theme} className={`category-filter ${chatTheme === theme ? "is-active" : ""}`} type="button" onClick={() => setChatTheme(theme)}>{theme}</button>)}</div>
                </div>
                {orders.length === 0 ? <p className="muted">No orders yet.</p> : null}
                {orders.map((order) => (
                    <article className="order-admin-card" key={order.id}>
                        <div className="order-admin-card__head"><div><h3>Order #{order.id}</h3><p className="muted">{order.status} · PHP {Number(order.total).toFixed(2)}</p>{order.deliveryNote ? <p className="muted"><strong>Admin delivery note:</strong> {order.deliveryNote}</p> : null}</div></div>
                        <div className="card transaction-summary transaction-summary--account">
                            <p><strong>Landmark:</strong> {order.selectedLandmark === "CUSTOM" ? order.customLandmark : (order.selectedLandmark || "N/A")}</p>
                            <p><strong>Subtotal:</strong> PHP {Number(order.subtotal ?? (Number(order.total) - Number(order.shippingFee || 0))).toFixed(2)}</p>
                            <p><strong>Shipping fee:</strong> PHP {Number(order.shippingFee || 0).toFixed(2)}</p>
                            <p><strong>Transaction decision:</strong> {transactionDecisions[order.id] || order.transactionDecision || "PENDING"}</p>
                            <div className="button-row">
                                <button className="btn btn--small" type="button" onClick={() => decideTransaction(order.id, "ACCEPTED")}>Accept Transaction</button>
                                <button className="btn btn--small btn--ghost" type="button" onClick={() => decideTransaction(order.id, "REJECTED")}>Reject Transaction</button>
                            </div>
                        </div>
                        <div className="order-items-list">
                            {order.items.map((item, index) => <div className="order-item" key={`${item.id}-${index}`}>{item.imageUrl ? <img src={mediaUrl(item.imageUrl)} alt={item.name} /> : <div />}<div><strong>{item.name}</strong><p className="muted">Qty {item.quantity} · PHP {Number(item.price).toFixed(2)}</p></div></div>)}
                        </div>
                        <section className={`order-chat-panel messenger-theme messenger-theme--${chatTheme}`}>
                            <p className="eyebrow">Chat with Admin</p>
                            <div className="order-chat-messages">
                                {(order.chatMessages || []).map((chat) => {
                                    const parts = messageParts(chat.message);
                                    return <div className={`chat-bubble ${chat.senderRole === "CUSTOMER" ? "chat-bubble--admin" : ""}`} key={chat.id}><strong>{chat.senderName}</strong>{parts.text ? <p>{parts.text}</p> : null}{parts.image ? <img className="chat-image" src={parts.image} alt="Chat attachment" /> : null}<small>{formatDateTime(chat.createdAt)}</small></div>;
                                })}
                            </div>
                            <div className="emoji-row">{emojis.map((emoji) => <button key={emoji} type="button" onClick={() => setChatDrafts((current) => ({ ...current, [order.id]: `${current[order.id] || ""}${emoji}` }))}>{emoji}</button>)}</div>
                            {chatImages[order.id] ? <img className="chat-preview" src={chatImages[order.id]} alt="Selected chat attachment" /> : null}
                            <form className="order-chat-form" onSubmit={(event) => sendClientMessage(event, order.id)}>
                                <input value={chatDrafts[order.id] || ""} onChange={(event) => setChatDrafts((current) => ({ ...current, [order.id]: event.target.value }))} placeholder="Message admin..." />
                                <label className="chat-upload-button">📷<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { attachChatImage(order.id, event.target.files?.[0]); event.currentTarget.value = ""; }} /></label>
                                <button className="btn btn--small" type="submit">Send</button>
                            </form>
                        </section>
                    </article>
                ))}
            </section>
        </PageShell>
    );
}
