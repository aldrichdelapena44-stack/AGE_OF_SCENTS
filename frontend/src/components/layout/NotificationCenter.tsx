"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getAuthUser, isLoggedIn } from "@/lib/auth";
import { formatDateTime, NOTIFICATION_READ_KEY } from "@/lib/site-preferences";

type NotificationItem = {
    id: string;
    title: string;
    message: string;
    createdAt?: string;
    href?: string;
    audience: "ADMIN" | "CUSTOMER" | "ALL";
    priority?: "normal" | "important";
};

type OrderLike = {
    id: number;
    fullName?: string;
    status?: string;
    total?: number;
    paymentMethod?: string;
    paymentReference?: string;
    createdAt?: string;
    updatedAt?: string;
    deliveryNote?: string;
    landmarkStatus?: string;
    customLandmark?: string;
    items?: { name: string; quantity: number; price: number }[];
};

type ProductLike = {
    id: number;
    name: string;
    description?: string;
    scentNotes?: string;
    volume?: string;
    price?: number;
    stock?: number;
    category?: string;
    createdAt?: string;
    updatedAt?: string;
};

type StoryLike = {
    id: number;
    userName?: string;
    note?: string;
    status?: "PENDING" | "APPROVED" | "REJECTED" | string;
    createdAt?: string;
    updatedAt?: string;
    expiresAt?: string;
    rejectionReason?: string;
};

type FeedbackLike = {
    id: number;
    name?: string;
    rating?: number;
    message?: string;
    status?: string;
    createdAt?: string;
};

const PINNED_KEY = "age-of-scent-pinned-notifications";
const DELETED_KEY = "age-of-scent-deleted-notifications";

function readStoredIds(key: string) {
    if (typeof window === "undefined") return [] as string[];
    try {
        const parsed = JSON.parse(localStorage.getItem(key) || "[]");
        return Array.isArray(parsed) ? parsed.filter((value) => typeof value === "string") : [];
    } catch {
        return [];
    }
}

function writeStoredIds(key: string, values: string[]) {
    localStorage.setItem(key, JSON.stringify(Array.from(new Set(values))));
}

function orderProducts(order: OrderLike) {
    return (order.items || []).map((item) => `${item.quantity}x ${item.name}`).join(", ") || "your perfume order";
}

function friendlyStatus(status?: string) {
    const clean = String(status || "pending").replace(/_/g, " ").toLowerCase();
    return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function shortText(value = "", max = 130) {
    const clean = value.trim();
    if (clean.length <= max) return clean;
    return `${clean.slice(0, max - 3)}...`;
}

function storyReminder(story: StoryLike) {
    const status = String(story.status || "PENDING").toUpperCase();
    if (status === "APPROVED") return "Approved. Your story is live for 24 hours.";
    if (status === "REJECTED") return `Rejected. ${story.rejectionReason || "Please upload a clearer photo or update your story details."}`;
    return "Pending. Admin still needs to approve or reject this story.";
}

export default function NotificationCenter() {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [readAt, setReadAt] = useState(0);
    const [role, setRole] = useState("CUSTOMER");
    const [pinnedIds, setPinnedIds] = useState<string[]>([]);
    const [deletedIds, setDeletedIds] = useState<string[]>([]);
    const panelRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        setPinnedIds(readStoredIds(PINNED_KEY));
        setDeletedIds(readStoredIds(DELETED_KEY));
        setReadAt(Number(localStorage.getItem(NOTIFICATION_READ_KEY) || 0));

        async function loadNotifications() {
            if (!isLoggedIn()) {
                setItems([
                    {
                        id: "guest-order-tracking",
                        title: "Order tracking is ready",
                        message: "Login to see payment confirmations, delivery notes, story status, checkout updates, and feedback updates.",
                        audience: "ALL",
                        href: "/login",
                        priority: "important",
                    },
                ]);
                return;
            }

            const user = getAuthUser();
            const userRole = user?.role === "ADMIN" ? "ADMIN" : "CUSTOMER";
            setRole(userRole);
            const nextItems: NotificationItem[] = [];

            try {
                const orderPath = userRole === "ADMIN" ? "/admin/orders" : "/orders/mine";
                const orderResponse = await api.get<{ success: boolean; message: string; data: OrderLike[] }>(orderPath);
                (orderResponse.data || []).slice(0, 12).forEach((order) => {
                    const status = friendlyStatus(order.status);
                    const note = order.deliveryNote ? ` Admin note: ${order.deliveryNote}` : "";
                    if (userRole === "ADMIN") {
                        nextItems.push({
                            id: `admin-order-${order.id}-${order.updatedAt || order.createdAt || order.status}`,
                            title: "Checkout / payment update",
                            message: `${order.fullName || "A client"} checked out ${orderProducts(order)}. Payment: ${order.paymentMethod || "N/A"}${order.paymentReference ? ` (${order.paymentReference})` : ""}. Status: ${status}. Total PHP ${Number(order.total || 0).toFixed(2)}.${note}`,
                            createdAt: order.updatedAt || order.createdAt,
                            audience: "ADMIN",
                            href: "/admin/orders",
                            priority: "important",
                        });
                    } else {
                        nextItems.push({
                            id: `customer-order-${order.id}-${order.updatedAt || order.createdAt || order.status}`,
                            title: "Admin note / delivery notification",
                            message: `Your ${orderProducts(order)} is now ${status}.${note || " Please check your account for order progress."}`,
                            createdAt: order.updatedAt || order.createdAt,
                            audience: "CUSTOMER",
                            href: "/account",
                            priority: "important",
                        });
                    }
                });
            } catch {
                nextItems.push({
                    id: "orders-unavailable",
                    title: "Order notification unavailable",
                    message: "Order tracking will appear here once the backend order service responds.",
                    audience: "ALL",
                });
            }

            try {
                const productsResponse = await api.get<{ success: boolean; message: string; data: ProductLike[] }>("/products");
                (productsResponse.data || []).slice(0, 10).forEach((product) => {
                    nextItems.push({
                        id: `product-${product.id}-${product.updatedAt || product.createdAt || product.name}`,
                        title: "Product added / updated",
                        message: `${product.name}${product.category ? ` (${product.category})` : ""}. ${shortText(product.description || "Full product details are available in the shop.")} ${product.scentNotes ? `Notes: ${shortText(product.scentNotes, 80)}.` : ""}${product.price ? ` Price: PHP ${Number(product.price).toFixed(2)}.` : ""}`,
                        createdAt: product.updatedAt || product.createdAt,
                        audience: "ALL",
                        href: "/shop",
                    });
                });
            } catch {
                // Product notifications are optional when the backend is offline.
            }

            try {
                if (userRole === "ADMIN") {
                    const storiesResponse = await api.get<{ success: boolean; message: string; data: StoryLike[] }>("/admin/stories");
                    (storiesResponse.data || []).slice(0, 12).forEach((story) => {
                        const pending = String(story.status || "PENDING").toUpperCase() === "PENDING";
                        nextItems.push({
                            id: `admin-story-${story.id}-${story.updatedAt || story.createdAt || story.status}`,
                            title: pending ? "Story waiting for review" : "Story status updated",
                            message: `${story.userName || "A client"} submitted a story. Status: ${friendlyStatus(story.status)}. ${pending ? "Reminder: approve or reject it shortly." : "The client can now see the status."}`,
                            createdAt: story.updatedAt || story.createdAt,
                            audience: "ADMIN",
                            href: "/admin/stories",
                            priority: pending ? "important" : "normal",
                        });
                    });
                } else {
                    const storiesResponse = await api.get<{ success: boolean; message: string; data: StoryLike[] }>("/stories/mine");
                    (storiesResponse.data || []).slice(0, 12).forEach((story) => {
                        nextItems.push({
                            id: `customer-story-${story.id}-${story.updatedAt || story.createdAt || story.status}`,
                            title: "Story status reminder",
                            message: `Status: ${friendlyStatus(story.status)}. ${storyReminder(story)}`,
                            createdAt: story.updatedAt || story.createdAt,
                            audience: "CUSTOMER",
                            href: "/#story",
                            priority: String(story.status || "PENDING").toUpperCase() === "PENDING" ? "important" : "normal",
                        });
                    });
                }
            } catch {
                // Story notifications are optional.
            }

            if (userRole === "ADMIN") {
                try {
                    const feedbackResponse = await api.get<{ success: boolean; message: string; data: FeedbackLike[] }>("/admin/feedback");
                    (feedbackResponse.data || []).slice(0, 10).forEach((feedback) => {
                        nextItems.push({
                            id: `feedback-${feedback.id}-${feedback.createdAt}-${feedback.status}`,
                            title: "Feedback received",
                            message: `${feedback.name || "A client"} sent feedback${feedback.rating ? ` (${feedback.rating}/5)` : ""}. ${shortText(feedback.message || "Open admin feedback to review.", 120)}`,
                            createdAt: feedback.createdAt,
                            audience: "ADMIN",
                            href: "/admin/feedback",
                            priority: "important",
                        });
                    });
                } catch {
                    // Feedback notifications are optional.
                }
            }

            setItems(nextItems);
        }

        loadNotifications();
        const interval = window.setInterval(loadNotifications, 30000);
        window.addEventListener("auth-updated", loadNotifications);
        return () => {
            window.clearInterval(interval);
            window.removeEventListener("auth-updated", loadNotifications);
        };
    }, []);

    useEffect(() => {
        if (!open) return;

        function handlePointerDown(event: MouseEvent | TouchEvent) {
            const target = event.target as Node | null;
            if (target && panelRef.current && !panelRef.current.contains(target)) {
                setOpen(false);
            }
        }

        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("touchstart", handlePointerDown);
        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("touchstart", handlePointerDown);
        };
    }, [open]);

    const visibleItems = useMemo(() => {
        return items
            .filter((item) => item.audience === "ALL" || item.audience === role)
            .filter((item) => !deletedIds.includes(item.id))
            .sort((a, b) => {
                const pinnedDiff = Number(pinnedIds.includes(b.id)) - Number(pinnedIds.includes(a.id));
                if (pinnedDiff !== 0) return pinnedDiff;
                const priorityDiff = Number(b.priority === "important") - Number(a.priority === "important");
                if (priorityDiff !== 0) return priorityDiff;
                return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
            });
    }, [items, role, pinnedIds, deletedIds]);

    const unreadCount = visibleItems.filter((item) => {
        const time = item.createdAt ? new Date(item.createdAt).getTime() : Date.now();
        return time > readAt;
    }).length;

    function openPanel() {
        setOpen((current) => !current);
        const now = Date.now();
        localStorage.setItem(NOTIFICATION_READ_KEY, String(now));
        setReadAt(now);
    }

    function togglePin(id: string) {
        setPinnedIds((current) => {
            const next = current.includes(id) ? current.filter((item) => item !== id) : [id, ...current];
            writeStoredIds(PINNED_KEY, next);
            return next;
        });
    }

    function deleteNotification(id: string) {
        setDeletedIds((current) => {
            const next = current.includes(id) ? current : [...current, id];
            writeStoredIds(DELETED_KEY, next);
            return next;
        });
        setPinnedIds((current) => {
            const next = current.filter((item) => item !== id);
            writeStoredIds(PINNED_KEY, next);
            return next;
        });
    }

    return (
        <div className="notification-center" ref={panelRef}>
            <button className="notification-button" type="button" onClick={openPanel} aria-label="Open notifications">
                <span aria-hidden="true">🔔</span>
                {unreadCount > 0 ? <span className="notification-count">{unreadCount}</span> : null}
            </button>
            {open ? (
                <section className="notification-panel card" aria-label="Notifications">
                    <div className="notification-panel__head">
                        <div>
                            <p className="eyebrow">Notifications</p>
                            <h3>{role === "ADMIN" ? "Admin alerts" : "Your alerts"}</h3>
                        </div>
                        <button className="icon-button" type="button" onClick={() => setOpen(false)} aria-label="Close notifications">×</button>
                    </div>
                    <div className="notification-list">
                        {visibleItems.length === 0 ? <p className="muted">No notifications yet.</p> : null}
                        {visibleItems.map((item) => {
                            const pinned = pinnedIds.includes(item.id);
                            return (
                                <article className={`notification-item ${pinned ? "is-pinned" : ""}`} key={item.id}>
                                    <div className="notification-item__topline">
                                        <strong>{pinned ? "📌 " : ""}{item.title}</strong>
                                        <div className="notification-actions">
                                            <button className="notification-action-button" type="button" onClick={() => togglePin(item.id)} aria-label={pinned ? "Unpin notification" : "Pin notification"}>
                                                {pinned ? "Unpin" : "Pin"}
                                            </button>
                                            <button className="notification-action-button notification-action-button--danger" type="button" onClick={() => deleteNotification(item.id)} aria-label="Delete notification">
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                    <p>{item.message}</p>
                                    <div className="notification-item__footer">
                                        <small>{formatDateTime(item.createdAt)}</small>
                                        {item.href ? <Link className="notification-open-link" href={item.href}>Open</Link> : null}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </section>
            ) : null}
        </div>
    );
}
