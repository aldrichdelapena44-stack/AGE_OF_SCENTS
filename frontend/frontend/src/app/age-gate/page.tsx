"use client";

import { useRouter } from "next/navigation";
import { setAgeVerifiedCookie } from "@/lib/age-gate";

export default function AgeGatePage() {
    const router = useRouter();

    function handleEnter() {
        setAgeVerifiedCookie();
        router.push("/");
        router.refresh();
    }

    function handleDeny() {
        window.location.href = "https://www.google.com";
    }

    return (
        <main className="age-gate-page">
            <section className="age-gate-card">
                <p className="age-gate-eyebrow">AGE OF SCENT</p>
                <h1>Private Boutique Access</h1>

                <p className="age-gate-text">
                    Enter the AGE OF SCENT perfume experience to browse the collection, create an
                    account, and continue to secure checkout.
                </p>

                <p className="age-gate-text">
                    By entering, you confirm that you are eligible to use this commerce website and
                    complete account verification when required.
                </p>

                <div className="age-gate-warning">
                    <strong>Secure access:</strong> Checkout and restricted account actions may require
                    identity review through the preserved verification system.
                </div>

                <div className="button-row">
                    <button className="btn" type="button" onClick={handleEnter}>
                        Enter Boutique
                    </button>

                    <button
                        className="btn btn--ghost"
                        type="button"
                        onClick={handleDeny}
                    >
                        Leave
                    </button>
                </div>
            </section>
        </main>
    );
}
