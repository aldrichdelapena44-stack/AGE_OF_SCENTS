"use client";

import { useEffect, useState } from "react";
import PageShell from "@/components/layout/PageShell";
import AdminGuard from "@/components/admin/AdminGuard";
import { api, mediaUrl } from "@/lib/api";

type VerificationRecord = {
    id: number;
    userId: number;
    documentType: string;
    fileUrl: string;
    originalFileUrl?: string;
    fileStatus?: "PENDING_REVIEW" | "KEPT" | "REMOVED";
    fileKeptAt?: string;
    fileRemovedAt?: string;
    status: string;
    createdAt: string;
};

export default function AdminVerificationsPage() {
    const [records, setRecords] = useState<VerificationRecord[]>([]);
    const [message, setMessage] = useState("Loading verification records...");
    const [loadingId, setLoadingId] = useState<number | null>(null);

    async function loadRecords() {
        try {
            const response = await api.get<{ success: boolean; message: string; data: VerificationRecord[] }>(
                "/admin/verifications"
            );
            setRecords(response.data || []);
            setMessage("");
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Failed to load verifications.");
        }
    }

    useEffect(() => {
        loadRecords();
    }, []);

    async function handleApprove(id: number) {
        try {
            setLoadingId(id);
            await api.put(`/admin/verifications/${id}/approve`);
            await loadRecords();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Approval failed.");
        } finally {
            setLoadingId(null);
        }
    }

    async function handleReject(id: number) {
        try {
            setLoadingId(id);
            await api.put(`/admin/verifications/${id}/reject`);
            await loadRecords();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Rejection failed.");
        } finally {
            setLoadingId(null);
        }
    }

    async function handleKeepFile(id: number) {
        try {
            setLoadingId(id);
            await api.put(`/admin/verifications/${id}/file/keep`);
            await loadRecords();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Unable to keep file.");
        } finally {
            setLoadingId(null);
        }
    }

    async function handleRemoveFile(id: number) {
        try {
            setLoadingId(id);
            await api.put(`/admin/verifications/${id}/file/remove`);
            await loadRecords();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Unable to remove file.");
        } finally {
            setLoadingId(null);
        }
    }

    return (
        <PageShell
            title="Admin Verifications"
            description="Approve, reject, keep, or remove submitted client identity files."
        >
            <AdminGuard>
                {message ? <p className="muted">{message}</p> : null}

                <div className="grid">
                    {records.map((record) => {
                        const fileStatus = record.fileStatus || "PENDING_REVIEW";
                        const hasFile = Boolean(record.fileUrl) && fileStatus !== "REMOVED";

                        return (
                            <div className="card admin-row-card verification-card" key={record.id}>
                                <div>
                                    <h3>Submission #{record.id}</h3>
                                    <p>
                                        <strong>User ID:</strong> {record.userId}
                                    </p>
                                    <p>
                                        <strong>Document:</strong> {record.documentType}
                                    </p>
                                    <p className="muted">
                                        <strong>Submitted:</strong> {new Date(record.createdAt).toLocaleString()}
                                    </p>

                                    {hasFile ? (
                                        <div className="verification-file-preview">
                                            <img src={mediaUrl(record.fileUrl)} alt={`Submission ${record.id}`} />
                                            <a href={mediaUrl(record.fileUrl)} target="_blank" rel="noreferrer">
                                                Open uploaded file
                                            </a>
                                        </div>
                                    ) : (
                                        <div className="verification-file-preview verification-file-preview--empty">
                                            <p>Client file removed from server storage.</p>
                                            {record.originalFileUrl ? (
                                                <p className="muted">Original path: {record.originalFileUrl}</p>
                                            ) : null}
                                        </div>
                                    )}
                                </div>

                                <div className="admin-actions">
                                    <p>
                                        <strong>Status:</strong>{" "}
                                        <span className={`status-badge status-${record.status.toLowerCase()}`}>
                                            {record.status}
                                        </span>
                                    </p>

                                    <p>
                                        <strong>File:</strong>{" "}
                                        <span
                                            className={`status-badge ${
                                                fileStatus === "REMOVED"
                                                    ? "status-rejected"
                                                    : fileStatus === "KEPT"
                                                      ? "status-approved"
                                                      : "status-pending"
                                            }`}
                                        >
                                            {fileStatus.replace("_", " ")}
                                        </span>
                                    </p>

                                    <div className="button-row">
                                        <button
                                            className="btn"
                                            type="button"
                                            disabled={loadingId === record.id || record.status === "APPROVED"}
                                            onClick={() => handleApprove(record.id)}
                                        >
                                            {loadingId === record.id ? "Working..." : "Approve"}
                                        </button>

                                        <button
                                            className="btn btn--ghost"
                                            type="button"
                                            disabled={loadingId === record.id || record.status === "REJECTED"}
                                            onClick={() => handleReject(record.id)}
                                        >
                                            {loadingId === record.id ? "Working..." : "Reject"}
                                        </button>
                                    </div>

                                    <div className="button-row">
                                        <button
                                            className="btn btn--small"
                                            type="button"
                                            disabled={loadingId === record.id || fileStatus === "KEPT" || fileStatus === "REMOVED"}
                                            onClick={() => handleKeepFile(record.id)}
                                        >
                                            Keep File
                                        </button>

                                        <button
                                            className="btn btn--small btn--ghost"
                                            type="button"
                                            disabled={loadingId === record.id || fileStatus === "REMOVED"}
                                            onClick={() => handleRemoveFile(record.id)}
                                        >
                                            Remove File
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {!message && records.length === 0 ? (
                    <div className="card empty-state">
                        <h3>No client files submitted yet.</h3>
                        <p className="muted">
                            Client identity files will appear here after account verification upload.
                        </p>
                    </div>
                ) : null}
            </AdminGuard>
        </PageShell>
    );
}
