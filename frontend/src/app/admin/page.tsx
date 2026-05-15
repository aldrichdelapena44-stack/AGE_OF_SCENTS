"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PageShell from "@/components/layout/PageShell";
import AdminGuard from "@/components/admin/AdminGuard";
import { api } from "@/lib/api";

type Summary = {
    users: number;
    products: number;
    orders: number;
    pendingVerifications: number;
    newFeedback: number;
    pendingStories: number;
};

export default function AdminDashboardPage() {
    const [summary, setSummary] = useState<Summary | null>(null);
    const [message, setMessage] = useState("Loading admin dashboard...");

    useEffect(() => {
        async function loadSummary() {
            try {
                const response = await api.get<{ success: boolean; message: string; data: Summary }>(
                    "/admin/summary"
                );
                setSummary(response.data);
                setMessage("");
            } catch (error) {
                setMessage(error instanceof Error ? error.message : "Failed to load dashboard.");
            }
        }
        loadSummary();
    }, []);

    return (
        <PageShell title="Admin Dashboard" description="Overview of the AGE OF SCENT platform.">
            <AdminGuard>
                {message ? <p className="muted">{message}</p> : null}

                {summary ? (
                    <>
                        <div className="grid grid--4">
                            <div className="card stat-card">
                                <p className="eyebrow">Clients</p>
                                <p className="price">{summary.users}</p>
                            </div>
                            <div className="card stat-card">
                                <p className="eyebrow">Perfumes</p>
                                <p className="price">{summary.products}</p>
                            </div>
                            <div className="card stat-card">
                                <p className="eyebrow">Orders</p>
                                <p className="price">{summary.orders}</p>
                            </div>
                            <div className="card stat-card">
                                <p className="eyebrow">Pending Reviews</p>
                                <p className="price">{summary.pendingVerifications}</p>
                            </div>
                            <div className="card stat-card">
                                <p className="eyebrow">New Feedback</p>
                                <p className="price">{summary.newFeedback}</p>
                            </div>
                            <div className="card stat-card">
                                <p className="eyebrow">Pending Stories</p>
                                <p className="price">{summary.pendingStories}</p>
                            </div>
                        </div>

                        <div className="grid grid--3">
                            <Link href="/admin/products" className="card admin-link-card">
                                <h3>Manage Products</h3>
                                <p className="muted">
                                    Change perfume image, name, ml/capacity, price, stock, notes, and description.
                                </p>
                            </Link>
                            <Link href="/admin/stories" className="card admin-link-card">
                                <h3>Approve Stories</h3>
                                <p className="muted">Approve or reject 24-hour client photo stories.</p>
                            </Link>
                            <Link href="/admin/settings" className="card admin-link-card">
                                <h3>Checkout Settings</h3>
                                <p className="muted">Edit GCash QR, GCash number, COD instructions, and delivery landmarks.</p>
                            </Link>
                            <Link href="/admin/users" className="card admin-link-card">
                                <h3>Manage Clients</h3>
                                <p className="muted">View registered accounts and verification status.</p>
                            </Link>
                            <Link href="/admin/orders" className="card admin-link-card">
                                <h3>Manage Orders</h3>
                                <p className="muted">Review perfume orders and payment references.</p>
                            </Link>
                            <Link href="/admin/verifications" className="card admin-link-card">
                                <h3>Review Client Files</h3>
                                <p className="muted">
                                    Approve or reject identity records and keep or remove uploaded files.
                                </p>
                            </Link>
                            <Link href="/admin/feedback" className="card admin-link-card">
                                <h3>Review Feedback</h3>
                                <p className="muted">
                                    Read client feedback, mark it as reviewed, or remove it from the list.
                                </p>
                            </Link>
                        </div>
                    </>
                ) : null}
            </AdminGuard>
        </PageShell>
    );
}
