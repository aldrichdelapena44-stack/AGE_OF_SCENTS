"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import PageShell from "@/components/layout/PageShell";
import { api } from "@/lib/api";
import { saveAuth } from "@/lib/auth";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setMessage("");

        try {
            const response = await api.post<{
                success: boolean;
                message: string;
                data: {
                    token: string;
                    user: {
                        id: number;
                        fullName: string;
                        email: string;
                        role?: string;
                        verificationStatus?: string;
                    };
                };
            }>("/auth/login", {
                email,
                password
            });

            saveAuth(response.data.token, response.data.user);
            setMessage("Login successful.");
            router.push("/");
            router.refresh();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Login failed.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <PageShell title="Login" description="Sign in to your AGE OF SCENT account.">
            <form className="card form-card auth-card" onSubmit={handleSubmit}>
                <div>
                    <p className="eyebrow">Private Access</p>
                    <h2>Return to the atelier.</h2>
                    <p className="muted">
                        Use the preserved backend authentication system to access cart,
                        checkout, account verification, and admin tools.
                    </p>
                </div>

                <div className="form-group">
                    <label>Email</label>
                    <input
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        type="email"
                        name="age-of-scent-login-email"
                        autoComplete="off"
                        placeholder="Enter your email"
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Password</label>
                    <div className="password-field">
                        <input
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            type={showPassword ? "text" : "password"}
                            name="age-of-scent-login-password"
                            autoComplete="new-password"
                            placeholder="Enter your password"
                            required
                        />
                        <button
                            className="password-toggle"
                            type="button"
                            onClick={() => setShowPassword((current) => !current)}
                        >
                            {showPassword ? "Hide" : "Show"}
                        </button>
                    </div>
                </div>

                <button className="btn" type="submit" disabled={loading}>
                    {loading ? "Logging in..." : "Login"}
                </button>

                {message ? <p className="muted">{message}</p> : null}
            </form>
        </PageShell>
    );
}
