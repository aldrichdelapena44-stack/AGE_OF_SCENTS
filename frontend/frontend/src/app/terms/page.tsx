import PageShell from "@/components/layout/PageShell";

export default function TermsPage() {
    return (
        <PageShell
            title="Terms and Conditions"
            description="Rules and conditions governing the use of AGE OF SCENT."
        >
            <div className="card legal-card">
                <h3>1. Boutique Access</h3>
                <p className="muted">
                    AGE OF SCENT is a private perfume e-commerce experience. By entering and using
                    the website, the user confirms that they are eligible to create an account and
                    complete secure checkout.
                </p>

                <h3>2. Verification Requirement</h3>
                <p className="muted">
                    Access to checkout, account actions, or admin-reviewed flows may be limited by
                    boutique access confirmation, account verification status, and internal review.
                </p>

                <h3>3. Account Responsibility</h3>
                <p className="muted">
                    Users are responsible for keeping login credentials secure and for all activity
                    occurring under their account.
                </p>

                <h3>4. Accuracy of Information</h3>
                <p className="muted">
                    Users agree to provide true, accurate, and current information during
                    registration, checkout, and verification submission.
                </p>

                <h3>5. Product Availability</h3>
                <p className="muted">
                    Perfume listings, stock, pricing, and availability may change without prior
                    notice. The website may limit or suspend items at any time.
                </p>

                <h3>6. Verification Review</h3>
                <p className="muted">
                    Verification submissions are subject to admin review. Submission does not
                    automatically guarantee approval.
                </p>

                <h3>7. Restricted Use</h3>
                <p className="muted">
                    The website must not be used for unlawful purposes, fraudulent activity, misuse
                    of verification systems, or unauthorized access.
                </p>

                <h3>8. Orders and Payments</h3>
                <p className="muted">
                    Order and payment flows may include scaffold or development behavior while the
                    platform is being finalized and tested.
                </p>

                <h3>9. Limitation of Service</h3>
                <p className="muted">
                    AGE OF SCENT may restrict, suspend, or terminate access where security, fraud
                    prevention, compliance, or policy enforcement requires it.
                </p>

                <h3>10. Updates</h3>
                <p className="muted">
                    These terms may be revised as the platform develops. Continued use of the website
                    indicates acceptance of the latest version.
                </p>
            </div>
        </PageShell>
    );
}
