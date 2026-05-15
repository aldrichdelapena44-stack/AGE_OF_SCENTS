"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import PageShell from "@/components/layout/PageShell";
import { api } from "@/lib/api";
import { getAuthUser, isLoggedIn, updateAuthUser } from "@/lib/auth";

type VerificationRecord = {
    id: number;
    documentType: string;
    fileUrl: string;
    status: string;
    createdAt: string;
};

export default function AgeVerificationPage() {
    const [documentType, setDocumentType] = useState("NATIONAL_ID");
    const [idImage, setIdImage] = useState<File | null>(null);
    const [message, setMessage] = useState("");
    const [records, setRecords] = useState<VerificationRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    const user = mounted ? getAuthUser() : null;

    async function loadRecords() {
        try {
            const response = await api.get<{
                success: boolean;
                message: string;
                data: VerificationRecord[];
            }>("/verifications/mine");

            setRecords(response.data || []);
        } catch (error) {
            setMessage(
                error instanceof Error ? error.message : "Failed to load verification records."
            );
        }
    }

    useEffect(() => {
        setMounted(true);
        if (isLoggedIn()) {
            loadRecords();
        }
    }, []);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setMessage("");

        try {
            const formData = new FormData();
            formData.append("documentType", documentType);

            if (idImage) {
                formData.append("idImage", idImage);
            }

            const response = await api.post<{
                success: boolean;
                message: string;
                data: {
                    verificationStatus: string;
                };
            }>("/verifications/submit", formData);

            updateAuthUser({
                verificationStatus: response.data.verificationStatus || "PENDING"
            });

            setMessage("Verification submitted successfully.");
            setIdImage(null);
            await loadRecords();
        } catch (error) {
            setMessage(
                error instanceof Error ? error.message : "Verification submission failed."
            );
        } finally {
            setLoading(false);
        }
    }

    if (!mounted) {
        return (
            <PageShell title="Verification" description="Loading verification flow.">
                <div className="card">
                    <p className="muted">Loading...</p>
                </div>
            </PageShell>
        );
    }

    if (!isLoggedIn()) {
        return (
            <PageShell title="Verification" description="Login required.">
                <div className="card empty-state">
                    <h3>Sign in first.</h3>
                    <p className="muted">Account verification is available after login.</p>
                    <div className="button-row">
                        <Link href="/login" className="btn">
                            Login
                        </Link>
                    </div>
                </div>
            </PageShell>
        );
    }

    return (
        <PageShell
            title="Account Verification"
            description="Submit your ID for secure account review before checkout."
        >
            <div className="card">
                <p>
                    <strong>Current status:</strong>{" "}
                    <span
                        className={`status-badge status-${(user?.verificationStatus || "UNVERIFIED").toLowerCase()}`}
                    >
                        {user?.verificationStatus || "UNVERIFIED"}
                    </span>
                </p>
            </div>

            <form className="card form-card" onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Document type</label>
                    <select
                        value={documentType}
                        onChange={(event) => setDocumentType(event.target.value)}
                    >
                        <option value="NATIONAL_ID">National ID</option>
                        <option value="DRIVERS_LICENSE">Driver&apos;s License</option>
                        <option value="PASSPORT">Passport</option>
                        <option value="OTHER">Other</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>Upload ID image</label>
                    <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(event) => setIdImage(event.target.files?.[0] || null)}
                    />
                </div>

                <button className="btn" type="submit" disabled={loading}>
                    {loading ? "Submitting..." : "Submit Verification"}
                </button>

                {message ? <p className="muted">{message}</p> : null}
            </form>

            <div className="card">
                <h3>Submission History</h3>

                {records.length === 0 ? (
                    <p className="muted">No submissions yet.</p>
                ) : (
                    <div className="grid">
                        {records.map((record) => (
                            <div className="card verification-record" key={record.id}>
                                <p>
                                    <strong>Document:</strong> {record.documentType}
                                </p>
                                <p>
                                    <strong>Status:</strong> {record.status}
                                </p>
                                <p className="muted">
                                    <strong>File:</strong> {record.fileUrl}
                                </p>
                                <p className="muted">
                                    <strong>Submitted:</strong>{" "}
                                    {new Date(record.createdAt).toLocaleString()}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </PageShell>
    );
}
