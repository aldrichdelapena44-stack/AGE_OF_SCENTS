"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { getAuthUser, isLoggedIn } from "@/lib/auth";

type AdminGuardProps = {
    children: ReactNode;
};

export default function AdminGuard({ children }: AdminGuardProps) {
    const [allowed, setAllowed] = useState<boolean | null>(null);

    useEffect(() => {
        if (!isLoggedIn()) {
            setAllowed(false);
            return;
        }

        const user = getAuthUser();
        setAllowed(user?.role === "ADMIN");
    }, []);

    if (allowed === null) {
        return (
            <div className="card">
                <p className="muted">Checking admin access...</p>
            </div>
        );
    }

    if (!allowed) {
        return (
            <div className="card empty-state">
                <h3>Access Denied</h3>
                <p className="muted">This page is available only to admin accounts.</p>
                <div className="button-row">
                    <Link href="/" className="btn">
                        Back to Home
                    </Link>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
