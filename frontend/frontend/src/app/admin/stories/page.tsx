"use client";

import { useEffect, useState } from "react";
import PageShell from "@/components/layout/PageShell";
import AdminGuard from "@/components/admin/AdminGuard";
import { api, mediaUrl } from "@/lib/api";

type StoryRecord = {
    id: number;
    userId: number;
    userName: string;
    imageUrl: string;
    note: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    createdAt: string;
    expiresAt: string;
    rejectionReason?: string;
};

export default function AdminStoriesPage() {
    const [stories, setStories] = useState<StoryRecord[]>([]);
    const [message, setMessage] = useState("Loading stories...");
    const [loadingId, setLoadingId] = useState<number | null>(null);

    async function loadStories() {
        try {
            const response = await api.get<{ success: boolean; message: string; data: StoryRecord[] }>("/admin/stories");
            setStories(response.data || []);
            setMessage("");
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Failed to load stories.");
        }
    }

    useEffect(() => {
        loadStories();
    }, []);

    async function approve(id: number) {
        try {
            setLoadingId(id);
            await api.put(`/admin/stories/${id}/approve`);
            await loadStories();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Approval failed.");
        } finally {
            setLoadingId(null);
        }
    }

    async function reject(id: number) {
        try {
            setLoadingId(id);
            await api.put(`/admin/stories/${id}/reject`, { reason: "Rejected by admin." });
            await loadStories();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Rejection failed.");
        } finally {
            setLoadingId(null);
        }
    }

    async function remove(id: number) {
        try {
            setLoadingId(id);
            await api.delete(`/admin/stories/${id}`);
            await loadStories();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Remove failed.");
        } finally {
            setLoadingId(null);
        }
    }

    return (
        <PageShell title="Admin Stories" description="Approve or reject client perfume story photos before they appear for 24 hours.">
            <AdminGuard>
                {message ? <p className="muted">{message}</p> : null}
                <div className="grid admin-story-grid">
                    {stories.map((story) => (
                        <article className="card admin-story-card" key={story.id}>
                            <img src={mediaUrl(story.imageUrl)} alt={`${story.userName} story`} />
                            <div>
                                <p className="eyebrow">Story #{story.id}</p>
                                <h3>{story.userName}</h3>
                                {story.note ? <p className="muted">{story.note}</p> : <p className="muted">No note added.</p>}
                                <p className="muted"><strong>Created:</strong> {new Date(story.createdAt).toLocaleString()}</p>
                                <p className="muted"><strong>Expires:</strong> {new Date(story.expiresAt).toLocaleString()}</p>
                            </div>
                            <div className="admin-actions">
                                <span className={`status-badge status-${story.status.toLowerCase()}`}>{story.status}</span>
                                <div className="button-row">
                                    <button className="btn" type="button" disabled={loadingId === story.id || story.status === "APPROVED"} onClick={() => approve(story.id)}>
                                        Approve
                                    </button>
                                    <button className="btn btn--ghost" type="button" disabled={loadingId === story.id || story.status === "REJECTED"} onClick={() => reject(story.id)}>
                                        Reject
                                    </button>
                                    <button className="btn btn--ghost" type="button" disabled={loadingId === story.id} onClick={() => remove(story.id)}>
                                        Remove
                                    </button>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
                {!message && stories.length === 0 ? (
                    <div className="card empty-state">
                        <h3>No story submissions yet.</h3>
                        <p className="muted">Client stories will appear here after users upload a photo and note.</p>
                    </div>
                ) : null}
            </AdminGuard>
        </PageShell>
    );
}
