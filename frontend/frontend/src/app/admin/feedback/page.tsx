"use client";

import { useEffect, useState } from "react";
import PageShell from "@/components/layout/PageShell";
import AdminGuard from "@/components/admin/AdminGuard";
import { api } from "@/lib/api";

type FeedbackRecord = {
    id: number;
    name: string;
    email: string;
    rating: number;
    message: string;
    status: "NEW" | "REVIEWED";
    createdAt: string;
    reviewedAt?: string;
};

export default function AdminFeedbackPage() {
    const [records, setRecords] = useState<FeedbackRecord[]>([]);
    const [message, setMessage] = useState("Loading feedback...");
    const [loadingId, setLoadingId] = useState<number | null>(null);

    async function loadFeedback() {
        try {
            const response = await api.get<{ success: boolean; message: string; data: FeedbackRecord[] }>(
                "/admin/feedback"
            );
            setRecords(response.data || []);
            setMessage("");
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Failed to load feedback.");
        }
    }

    useEffect(() => {
        loadFeedback();
    }, []);

    async function markReviewed(id: number) {
        try {
            setLoadingId(id);
            await api.put(`/admin/feedback/${id}/review`);
            await loadFeedback();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Review update failed.");
        } finally {
            setLoadingId(null);
        }
    }

    async function removeFeedback(id: number) {
        try {
            setLoadingId(id);
            await api.delete(`/admin/feedback/${id}`);
            await loadFeedback();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Feedback removal failed.");
        } finally {
            setLoadingId(null);
        }
    }

    return (
        <PageShell
            title="Admin Feedback"
            description="Review client feedback submitted from the top navigation feedback page."
        >
            <AdminGuard>
                {message ? <p className="muted">{message}</p> : null}

                <div className="grid">
                    {records.map((record) => (
                        <article className="card admin-row-card" key={record.id}>
                            <div>
                                <p className="eyebrow">Feedback #{record.id}</p>
                                <h3>{record.name}</h3>
                                <p className="muted">{record.email}</p>
                                <p>
                                    <strong>Rating:</strong> {record.rating}/5
                                </p>
                                <p className="muted feedback-message">{record.message}</p>
                                <p className="muted">
                                    <strong>Submitted:</strong> {new Date(record.createdAt).toLocaleString()}
                                </p>
                            </div>

                            <div className="admin-actions">
                                <span className={`status-badge ${record.status === "NEW" ? "status-pending" : "status-approved"}`}>
                                    {record.status}
                                </span>
                                <div className="button-row">
                                    <button
                                        className="btn"
                                        type="button"
                                        disabled={loadingId === record.id || record.status === "REVIEWED"}
                                        onClick={() => markReviewed(record.id)}
                                    >
                                        {loadingId === record.id ? "Working..." : "Mark Reviewed"}
                                    </button>

                                    <button
                                        className="btn btn--ghost"
                                        type="button"
                                        disabled={loadingId === record.id}
                                        onClick={() => removeFeedback(record.id)}
                                    >
                                        {loadingId === record.id ? "Working..." : "Remove"}
                                    </button>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>

                {!message && records.length === 0 ? (
                    <div className="card empty-state">
                        <h3>No feedback yet.</h3>
                        <p className="muted">Client messages will appear here after they submit feedback.</p>
                    </div>
                ) : null}
            </AdminGuard>
        </PageShell>
    );
}
