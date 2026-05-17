"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import PageShell from "@/components/layout/PageShell";
import AdminGuard from "@/components/admin/AdminGuard";
import { api, mediaUrl } from "@/lib/api";
import { formatDateTime } from "@/lib/site-preferences";

type OrderItem = { id: number; name: string; quantity: number; price: number; imageUrl?: string; volume?: string };
type ChatMessage = { id: number; senderName: string; senderRole: "ADMIN" | "CUSTOMER"; message: string; createdAt: string };
type AdminOrder = {
    id: number;
    userId: number;
    fullName: string;
    address: string;
    gcashNumber?: string;
    customerGcashNumber?: string;
    selectedLandmark?: string;
    customLandmark?: string;
    needsLandmarkConfirmation?: boolean;
    landmarkStatus?: "APPROVED" | "REJECTED" | "PENDING";
    adminConfirmationNote?: string;
    deliveryNote?: string;
    items: OrderItem[];
    subtotal?: number;
    shippingFee?: number;
    total: number;
    status: string;
    paymentMethod: string;
    paymentReference?: string;
    chatMessages: ChatMessage[];
    createdAt: string;
};

const statuses = [
    ["PAYMENT_CONFIRMATION", "Payment Confirmation"],
    ["ORDER_PROCESSING", "Order Processing"],
    ["READY_TO_SHIP", "Ready to Ship"],
    ["OUT_FOR_DELIVERY", "Out for Delivery"],
    ["DELIVERED", "Delivered"]
];

const emojis = ["😊", "👍", "❤️", "✅", "🚚", "📦"];
const chatThemes = ["gold", "blue", "rose"];

function messageParts(message: string) {
    const imageMatch = message.match(/\[image:([^\]]+)\]/);
    return {
        text: message.replace(/\[image:[^\]]+\]/g, "").trim(),
        image: imageMatch?.[1]
    };
}

function orderProductSummary(order: AdminOrder) {
    return order.items.map((item) => `${item.quantity}x ${item.name}`).join(", ") || "perfume order";
}

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<AdminOrder[]>([]);
    const [hiddenPaymentIds, setHiddenPaymentIds] = useState<number[]>([]);
    const [message, setMessage] = useState("Loading orders...");
    const [deliveryNotes, setDeliveryNotes] = useState<Record<number, string>>({});
    const [shippingFees, setShippingFees] = useState<Record<number, number>>({});
    const [chatDrafts, setChatDrafts] = useState<Record<number, string>>({});
    const [chatImages, setChatImages] = useState<Record<number, string>>({});
    const [paymentSearch, setPaymentSearch] = useState("");
    const [chatTheme, setChatTheme] = useState("gold");
    const [saving, setSaving] = useState(false);
    const [deletingIds, setDeletingIds] = useState<number[]>([]);

    async function loadOrders() {
        try {
            const response = await api.get<{ success: boolean; message: string; data: AdminOrder[] }>(`/admin/orders?fresh=${Date.now()}`);
            setOrders(response.data || []);
            setMessage("");
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Failed to load orders.");
        }
    }

    useEffect(() => { loadOrders(); }, []);

    const paymentRecords = useMemo(() => {
        const query = paymentSearch.trim().toLowerCase();
        return orders
            .filter((order) => !hiddenPaymentIds.includes(order.id))
            .filter((order) => {
                const haystack = [order.fullName, order.status, order.paymentMethod, order.paymentReference, order.customerGcashNumber, orderProductSummary(order), order.createdAt]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();
                return !query || haystack.includes(query);
            });
    }, [orders, hiddenPaymentIds, paymentSearch]);

    async function updateStatus(orderId: number, status: string) {
        try {
            setSaving(true);
            const response = await api.put<{ success: boolean; message: string; data: AdminOrder }>(`/admin/orders/${orderId}/status`, {
                status,
                deliveryNote: deliveryNotes[orderId] || "",
                shippingFee: shippingFees[orderId] ?? orders.find((order) => order.id === orderId)?.shippingFee ?? 0
            });
            setOrders((current) => current.map((order) => order.id === orderId ? response.data : order));
            setMessage(response.message || "Order updated. This update will appear in client notifications.");
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Order update failed.");
        } finally { setSaving(false); }
    }

    async function saveShippingFee(order: AdminOrder) {
        try {
            setSaving(true);
            const nextShippingFee = Number(shippingFees[order.id] ?? order.shippingFee ?? 0);
            const response = await api.put<{ success: boolean; message: string; data: AdminOrder }>(`/admin/orders/${order.id}/status`, {
                status: order.status,
                deliveryNote: deliveryNotes[order.id] || order.deliveryNote || "Shipping fee updated by admin.",
                shippingFee: nextShippingFee
            });
            setOrders((current) => current.map((item) => item.id === order.id ? response.data : item));
            setShippingFees((current) => ({ ...current, [order.id]: Number(response.data.shippingFee || 0) }));
            setMessage(`Shipping fee saved. New total: PHP ${Number(response.data.total || 0).toFixed(2)}.`);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Shipping fee update failed.");
        } finally {
            setSaving(false);
        }
    }

    async function updateLandmark(orderId: number, landmarkStatus: "APPROVED" | "REJECTED") {
        try {
            setSaving(true);
            const response = await api.put<{ success: boolean; message: string; data: AdminOrder }>(`/admin/orders/${orderId}/landmark`, {
                landmarkStatus,
                note: deliveryNotes[orderId] || "",
                shippingFee: shippingFees[orderId] ?? orders.find((order) => order.id === orderId)?.shippingFee ?? 0
            });
            setOrders((current) => current.map((order) => order.id === orderId ? response.data : order));
            setMessage(response.message || "Landmark updated. The client will see the notification.");
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Landmark update failed.");
        } finally { setSaving(false); }
    }

    function attachChatImage(orderId: number, file?: File) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setChatImages((current) => ({ ...current, [orderId]: String(reader.result || "") }));
        reader.readAsDataURL(file);
    }


    async function deleteOrder(orderId: number) {
        const confirmDelete = window.confirm("Delete this order from the admin website? The customer will be notified that the transaction is not eligible to pay.");
        if (!confirmDelete) return;

        try {
            setDeletingIds((current) => current.includes(orderId) ? current : [...current, orderId]);
            const response = await api.delete<{ success: boolean; message: string; data: AdminOrder }>(`/admin/orders/${orderId}`);
            setMessage(response.message || "Order deleted. The customer was notified.");
            window.setTimeout(() => {
                setOrders((current) => current.filter((order) => order.id !== orderId));
                setDeletingIds((current) => current.filter((id) => id !== orderId));
            }, 260);
        } catch (error) {
            setDeletingIds((current) => current.filter((id) => id !== orderId));
            setMessage(error instanceof Error ? error.message : "Order delete failed.");
        }
    }

    async function sendMessage(event: FormEvent<HTMLFormElement>, orderId: number) {
        event.preventDefault();
        const draft = (chatDrafts[orderId] || "").trim();
        const image = chatImages[orderId];
        if (!draft && !image) return;
        try {
            const outgoing = image ? `${draft}\n[image:${image}]`.trim() : draft;
            const response = await api.post<{ success: boolean; message: string; data: AdminOrder }>(`/admin/orders/${orderId}/messages`, { message: outgoing });
            setOrders((current) => current.map((order) => order.id === orderId ? response.data : order));
            setChatDrafts((current) => ({ ...current, [orderId]: "" }));
            setChatImages((current) => ({ ...current, [orderId]: "" }));
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Message failed.");
        }
    }

    return (
        <PageShell title="Admin Orders" description="Review payments, approve custom delivery requests, update delivery status, and chat with clients.">
            <AdminGuard>
                {message ? <p className="muted">{message}</p> : null}

                <section className="card payment-report-card">
                    <div className="payment-report-head">
                        <div>
                            <p className="eyebrow">Payment Reports</p>
                            <h2>All customer payment records</h2>
                            <p className="muted">Search by client, product, method, reference, status, or date. Delete permanently hides the record from this admin view and notifies the customer.</p>
                        </div>
                        <div className="form-group search-field">
                            <label htmlFor="admin-payment-search">Search payments</label>
                            <input id="admin-payment-search" value={paymentSearch} onChange={(event) => setPaymentSearch(event.target.value)} placeholder="Search payment records..." />
                        </div>
                    </div>
                    <div className="payment-table-wrap">
                        <table className="payment-table">
                            <thead>
                                <tr><th>Date</th><th>User</th><th>Product</th><th>Method</th><th>Reference</th><th>Total</th><th>Status</th><th>Action</th></tr>
                            </thead>
                            <tbody>
                                {paymentRecords.map((order) => (
                                    <tr key={order.id}>
                                        <td>{formatDateTime(order.createdAt)}</td>
                                        <td>{order.fullName}</td>
                                        <td>{orderProductSummary(order)}</td>
                                        <td>{order.paymentMethod}</td>
                                        <td>{order.paymentReference || order.customerGcashNumber || "N/A"}</td>
                                        <td>PHP {Number(order.total).toFixed(2)}</td>
                                        <td>{order.status}</td>
                                        <td><button className="btn btn--small btn--ghost" type="button" disabled={deletingIds.includes(order.id)} onClick={() => deleteOrder(order.id)}>{deletingIds.includes(order.id) ? "Deleting..." : "Delete"}</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {paymentRecords.length === 0 ? <p className="muted">No payment records match your search.</p> : null}
                    </div>
                </section>

                <div className="chat-theme-picker card">
                    <p className="eyebrow">Messenger Theme</p>
                    <div className="category-filter-row">
                        {chatThemes.map((theme) => <button key={theme} className={`category-filter ${chatTheme === theme ? "is-active" : ""}`} type="button" onClick={() => setChatTheme(theme)}>{theme}</button>)}
                    </div>
                </div>

                <div className="grid order-admin-grid">
                    {orders.map((order) => (
                        <article className={`card order-admin-card ${deletingIds.includes(order.id) ? "is-fading-out" : ""}`} key={order.id}>
                            <div className="order-admin-card__head">
                                <div>
                                    <p className="eyebrow">Order #{order.id}</p>
                                    <h3>{order.fullName}</h3>
                                    <p className="muted">{formatDateTime(order.createdAt)}</p>
                                </div>
                                <div className="order-admin-card__actions">
                                    <span className="status-badge status-pending">{order.status}</span>
                                    <button className="btn btn--small btn--ghost" type="button" disabled={deletingIds.includes(order.id)} onClick={() => deleteOrder(order.id)}>
                                        {deletingIds.includes(order.id) ? "Deleting..." : "Delete Order"}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid--2">
                                <div>
                                    <p><strong>Subtotal:</strong> PHP {Number(order.subtotal ?? (Number(order.total) - Number(order.shippingFee || 0))).toFixed(2)}</p>
                                    <p><strong>Shipping fee:</strong> PHP {Number(order.shippingFee || 0).toFixed(2)}</p>
                                    <p><strong>Total:</strong> PHP {Number(order.total).toFixed(2)}</p>
                                    <p><strong>Payment:</strong> {order.paymentMethod}</p>
                                    <p><strong>Reference:</strong> {order.paymentReference || "N/A"}</p>
                                    <p><strong>Customer GCash:</strong> {order.customerGcashNumber || "N/A"}</p>
                                </div>
                                <div>
                                    <p><strong>Address:</strong> {order.address}</p>
                                    <p><strong>Landmark:</strong> {order.selectedLandmark === "CUSTOM" ? "Other" : (order.selectedLandmark || "N/A")}</p>
                                    {order.customLandmark ? <p><strong>Customer requested place:</strong> {order.customLandmark}</p> : null}
                                    <p><strong>Landmark status:</strong> {order.landmarkStatus || "APPROVED"}</p>
                                </div>
                            </div>

                            <div className="order-items-list">
                                {order.items.map((item, index) => (
                                    <div className="order-item" key={`${item.id}-${index}`}>
                                        {item.imageUrl ? <img src={mediaUrl(item.imageUrl)} alt={item.name} /> : <div />}
                                        <div>
                                            <strong>{item.name}</strong>
                                            <p className="muted">{item.volume || ""} · Qty {item.quantity} · PHP {Number(item.price).toFixed(2)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid--2">
                                <div className="form-group">
                                    <label>Admin note / delivery notification</label>
                                    <input value={deliveryNotes[order.id] || order.deliveryNote || ""} onChange={(event) => setDeliveryNotes((current) => ({ ...current, [order.id]: event.target.value }))} placeholder="Example: We will deliver tomorrow at 3 PM." />
                                </div>
                                <div className="form-group shipping-fee-admin-control">
                                    <label>Update shipping fee</label>
                                    <div className="inline-action-field">
                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={shippingFees[order.id] ?? order.shippingFee ?? 0}
                                            onChange={(event) => setShippingFees((current) => ({ ...current, [order.id]: Number(event.target.value || 0) }))}
                                        />
                                        <button className="btn btn--small" type="button" disabled={saving} onClick={() => saveShippingFee(order)}>
                                            Save Fee
                                        </button>
                                    </div>
                                    <p className="field-hint">Use this for custom landmark requests or delivery price changes. Saving here updates the customer order total and account report.</p>
                                </div>
                            </div>

                            {order.customLandmark ? (
                                <div className="button-row">
                                    <button className="btn btn--small" type="button" disabled={saving} onClick={() => updateLandmark(order.id, "APPROVED")}>Approve Other Address</button>
                                    <button className="btn btn--small btn--ghost" type="button" disabled={saving} onClick={() => updateLandmark(order.id, "REJECTED")}>Reject Other Address</button>
                                </div>
                            ) : null}

                            <div className="button-row status-button-row">
                                {statuses.map(([value, label]) => <button key={value} className="btn btn--small btn--ghost" type="button" disabled={saving} onClick={() => updateStatus(order.id, value)}>{label}</button>)}
                            </div>

                            <section className={`order-chat-panel messenger-theme messenger-theme--${chatTheme}`}>
                                <p className="eyebrow">Client Chat</p>
                                <div className="order-chat-messages">
                                    {(order.chatMessages || []).map((chat) => {
                                        const parts = messageParts(chat.message);
                                        return (
                                            <div className={`chat-bubble ${chat.senderRole === "ADMIN" ? "chat-bubble--admin" : ""}`} key={chat.id}>
                                                <strong>{chat.senderName}</strong>
                                                {parts.text ? <p>{parts.text}</p> : null}
                                                {parts.image ? <img className="chat-image" src={parts.image} alt="Chat attachment" /> : null}
                                                <small>{formatDateTime(chat.createdAt)}</small>
                                            </div>
                                        );
                                    })}
                                    {(!order.chatMessages || order.chatMessages.length === 0) ? <p className="muted">No messages yet.</p> : null}
                                </div>
                                <div className="emoji-row">{emojis.map((emoji) => <button key={emoji} type="button" onClick={() => setChatDrafts((current) => ({ ...current, [order.id]: `${current[order.id] || ""}${emoji}` }))}>{emoji}</button>)}</div>
                                {chatImages[order.id] ? <img className="chat-preview" src={chatImages[order.id]} alt="Selected chat attachment" /> : null}
                                <form className="order-chat-form" onSubmit={(event) => sendMessage(event, order.id)}>
                                    <input value={chatDrafts[order.id] || ""} onChange={(event) => setChatDrafts((current) => ({ ...current, [order.id]: event.target.value }))} placeholder="Message the client..." />
                                    <label className="chat-upload-button">📷<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { attachChatImage(order.id, event.target.files?.[0]); event.currentTarget.value = ""; }} /></label>
                                    <button className="btn btn--small" type="submit">Send</button>
                                </form>
                            </section>
                        </article>
                    ))}
                </div>
            </AdminGuard>
        </PageShell>
    );
}
