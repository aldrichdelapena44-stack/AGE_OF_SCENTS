"use client";

import { FormEvent, useEffect, useState } from "react";
import PageShell from "@/components/layout/PageShell";
import { api } from "@/lib/api";
import { getAuthUser } from "@/lib/auth";

type FeedbackForm = {
    name: string;
    email: string;
    rating: string;
    message: string;
};

export default function FeedbackPage() {
    const [form, setForm] = useState<FeedbackForm>({
        name: "",
        email: "",
        rating: "5",
        message: ""
    });
    const [lockedUser, setLockedUser] = useState(false);
    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const user = getAuthUser();
        if (user) {
            setLockedUser(true);
            setForm((current) => ({
                ...current,
                name: user.fullName,
                email: user.email
            }));
        }
    }, []);

    function updateField(field: keyof FeedbackForm, value: string) {
        if (lockedUser && (field === "name" || field === "email")) return;
        setForm((current) => ({ ...current, [field]: value }));
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setStatus("");

        try {
            const response = await api.post<{ success: boolean; message: string; data: unknown }>(
                "/feedback",
                {
                    name: form.name,
                    email: form.email,
                    rating: Number(form.rating),
                    message: form.message
                }
            );

            setStatus(response.message || "Feedback sent.");
            setForm((current) => ({
                ...current,
                rating: "5",
                message: ""
            }));
        } catch (error) {
            setStatus(error instanceof Error ? error.message : "Unable to send feedback.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <PageShell
            title="Feedback"
            description="Share your AGE OF SCENT experience to the admin."
        >
            <div className="grid grid--2 feedback-layout">
                <section className="card feedback-copy">
                    <p className="eyebrow">Client Voice</p>
                    <h2>Your feedback helps refine the house.</h2>
                    <p className="muted large-copy">
                        Send notes about the shopping experience, product presentation, checkout,
                        delivery, or any fragrance you want the team to improve.
                    </p>
                    <p className="muted">
                        Admin can review every feedback message inside the dashboard.
                    </p>
                </section>

                <form className="card form-card" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="feedback-name">Name</label>
                        <input
                            id="feedback-name"
                            value={form.name}
                            onChange={(event) => updateField("name", event.target.value)}
                            placeholder="Your full name"
                            readOnly={lockedUser}
                            required
                        />
                        {lockedUser ? <p className="field-hint">This name comes from your login account and cannot be changed for feedback.</p> : null}
                    </div>

                    <div className="form-group">
                        <label htmlFor="feedback-email">Email</label>
                        <input
                            id="feedback-email"
                            type="email"
                            value={form.email}
                            onChange={(event) => updateField("email", event.target.value)}
                            placeholder="you@example.com"
                            readOnly={lockedUser}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="feedback-rating">Rating</label>
                        <select
                            id="feedback-rating"
                            value={form.rating}
                            onChange={(event) => updateField("rating", event.target.value)}
                        >
                            <option value="5">5 - Excellent</option>
                            <option value="4">4 - Very good</option>
                            <option value="3">3 - Good</option>
                            <option value="2">2 - Needs improvement</option>
                            <option value="1">1 - Poor</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="feedback-message">Message</label>
                        <textarea
                            id="feedback-message"
                            value={form.message}
                            onChange={(event) => updateField("message", event.target.value)}
                            placeholder="Tell us what should be improved or what you enjoyed."
                            required
                        />
                    </div>

                    <button className="btn" type="submit" disabled={loading}>
                        {loading ? "Sending..." : "Send Feedback"}
                    </button>

                    {status ? <p className="muted">{status}</p> : null}
                </form>
            </div>
        </PageShell>
    );
}
