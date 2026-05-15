"use client";

import { useEffect, useMemo, useState } from "react";
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
    if (status === "APPROVED") return "Approved. Your story can now appear on the website.";
    if (status === "REJECTED") return `Rejected. ${story.rejectionReason || "Please upload a clearer photo or update your story details."}`;
    return "Pending. Please wait for admin approval before it appears publicly.";
}

export default function NotificationCenter() {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [readAt, setReadAt] = useState(0);
    const [role, setRole] = useState("CUSTOMER");

    useEffect(() => {
        const storedReadAt = Number(localStorage.getItem(NOTIFICATION_READ_KEY) || 0);
        setReadAt(storedReadAt);

        async function loadNotifications() {
            if (!isLoggedIn()) {
                setItems([
                    {
                        id: "guest-order-tracking",
                        title: "Order tracking is ready",
                        message: "Login to see payment confirmation, order processing, delivery notes, story status, and feedback updates.",
                        audience: "ALL",
                        href: "/login"
                    }
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
                (orderResponse.data || []).forEach((order) => {
                    const status = friendlyStatus(order.status);
                    const note = order.deliveryNote ? ` Admin note: ${order.deliveryNote}` : "";
                    if (userRole === "ADMIN") {
                        nextItems.push({
                            id: `admin-order-${order.id}-${order.updatedAt || order.createdAt || order.status}`,
                            title: "Admin note / delivery notification",
                            message: `${order.fullName || "A client"} checked out ${orderProducts(order)}. Payment: ${order.paymentMethod || "N/A"}${order.paymentReference ? ` (${order.paymentReference})` : ""}. Status: ${status}. Total PHP ${Number(order.total || 0).toFixed(2)}.${note}`,
                            createdAt: order.updatedAt || order.createdAt,
                            audience: "ADMIN",
                            href: "/admin/orders"
                        });
                    } else {
                        nextItems.push({
                            id: `customer-order-${order.id}-${order.updatedAt || order.createdAt || order.status}`,
                            title: "Admin note / delivery notification",
                            message: `Your ${orderProducts(order)} is now ${status}.${note || " Please check your account for order progress."}`,
                            createdAt: order.updatedAt || order.createdAt,
                            audience: "CUSTOMER",
                            href: "/account"
                        });
                    }
                });
            } catch {
                nextItems.push({
                    id: "orders-unavailable",
                    title: "Admin note / delivery notification",
                    message: "Order tracking will appear here once the backend order service is available.",
                    audience: "ALL"
                });
            }

            try {
                const productsResponse = await api.get<{ success: boolean; message: string; data: ProductLike[] }>("/products");
                (productsResponse.data || []).slice(0, 8).forEach((product) => {
                    nextItems.push({
                        id: `product-${product.id}-${product.updatedAt || product.createdAt || product.name}`,
                        title: "Product added / updated",
                        message: `${product.name}${product.category ? ` (${product.category})` : ""}. ${shortText(product.description || "Full product details are available in the shop.")} ${product.scentNotes ? `Notes: ${shortText(product.scentNotes, 80)}.` : ""}${product.price ? ` Price: PHP ${Number(product.price).toFixed(2)}.` : ""}`,
                        createdAt: product.updatedAt || product.createdAt,
                        audience: "ALL",
                        href: "/shop"
                    });
                });
            } catch {
                // Product notifications are optional when the backend is offline.
            }

            try {
                if (userRole === "ADMIN") {
                    const storiesResponse = await api.get<{ success: boolean; message: string; data: StoryLike[] }>("/admin/stories");
                    (storiesResponse.data || []).slice(0, 8).forEach((story) => {
                        nextItems.push({
                            id: `admin-story-${story.id}-${story.updatedAt || story.createdAt || story.status}`,
                            title: "Story status reminder",
                            message: `${story.userName || "A client"} submitted a story. Status: ${friendlyStatus(story.status)}. Reminder: ${String(story.status || "PENDING").toUpperCase() === "PENDING" ? "Approve or reject it shortly." : "Status already reviewed."}`,
                            createdAt: story.updatedAt || story.createdAt,
                            audience: "ADMIN",
                            href: "/admin/stories"
                        });
                    });
                } else {
                    const storiesResponse = await api.get<{ success: boolean; message: string; data: StoryLike[] }>("/stories/mine");
                    (storiesResponse.data || []).slice(0, 8).forEach((story) => {
                        nextItems.push({
                            id: `customer-story-${story.id}-${story.updatedAt || story.createdAt || story.status}`,
                            title: "Story status reminder",
                            message: `Status: ${friendlyStatus(story.status)}. ${storyReminder(story)}`,
                            createdAt: story.updatedAt || story.createdAt,
                            audience: "CUSTOMER",
                            href: "/#story"
                        });
                    });
                }
            } catch {
                // Story notifications are optional.
            }

            if (userRole === "ADMIN") {
                try {
                    const feedbackResponse = await api.get<{ success: boolean; message: string; data: FeedbackLike[] }>("/admin/feedback");
                    (feedbackResponse.data || []).slice(0, 8).forEach((feedback) => {
                        nextItems.push({
                            id: `feedback-${feedback.id}-${feedback.createdAt}-${feedback.status}`,
                            title: "Feedback received",
                            message: `${feedback.name || "A client"} sent feedback${feedback.rating ? ` (${feedback.rating}/5)` : ""}. ${shortText(feedback.message || "Open admin feedback to review.", 120)}`,
                            createdAt: feedback.createdAt,
                            audience: "ADMIN",
                            href: "/admin/feedback"
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

    const visibleItems = useMemo(
        () => items.filter((item) => item.audience === "ALL" || item.audience === role),
        [items, role]
    );

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

    return (
        <div className="notification-center">
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
                            const content = (
                                <article className="notification-item">
                                    <strong>{item.title}</strong>
                                    <p>{item.message}</p>
                                    <small>{formatDateTime(item.createdAt)}</small>
                                </article>
                            );
                            return item.href ? <Link key={item.id} href={item.href}>{content}</Link> : <div key={item.id}>{content}</div>;
                        })}
                    </div>
                </section>
            ) : null}
        </div>
    );
}
