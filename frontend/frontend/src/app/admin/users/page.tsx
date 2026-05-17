"use client";

import { useEffect, useState } from "react";
import PageShell from "@/components/layout/PageShell";
import AdminGuard from "@/components/admin/AdminGuard";
import { api } from "@/lib/api";

type AdminUser = {
    id: number;
    fullName: string;
    email: string;
    role: string;
    verificationStatus: string;
    createdAt: string;
};

export default function AdminUsersPage() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [message, setMessage] = useState("Loading clients...");

    useEffect(() => {
        async function loadUsers() {
            try {
                const response = await api.get<{
                    success: boolean;
                    message: string;
                    data: AdminUser[];
                }>("/admin/users");

                setUsers(response.data || []);
                setMessage("");
            } catch (error) {
                setMessage(error instanceof Error ? error.message : "Failed to load clients.");
            }
        }

        loadUsers();
    }, []);

    return (
        <PageShell title="Admin Clients" description="Registered account overview.">
            <AdminGuard>
                {message ? <p className="muted">{message}</p> : null}

                <div className="grid">
                    {users.map((user) => (
                        <div className="card admin-row-card" key={user.id}>
                            <div>
                                <h3>{user.fullName}</h3>
                                <p className="muted">{user.email}</p>
                            </div>

                            <div>
                                <p>
                                    <strong>Role:</strong> {user.role}
                                </p>
                                <p>
                                    <strong>Status:</strong>{" "}
                                    <span
                                        className={`status-badge status-${user.verificationStatus.toLowerCase()}`}
                                    >
                                        {user.verificationStatus}
                                    </span>
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </AdminGuard>
        </PageShell>
    );
}
