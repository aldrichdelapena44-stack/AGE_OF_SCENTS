import PageShell from "@/components/layout/PageShell";

export default function PrivacyPage() {
    return (
        <PageShell
            title="Privacy Policy"
            description="How AGE OF SCENT collects, uses, and protects personal information."
        >
            <div className="card legal-card">
                <h3>1. Information We Collect</h3>
                <p className="muted">
                    AGE OF SCENT may collect account information such as full name, email address,
                    login details, order details, delivery information, contact requests, and
                    verification submissions.
                </p>

                <h3>2. How We Use Information</h3>
                <p className="muted">
                    We use information to operate the boutique, manage user accounts, process
                    perfume orders, support verification review, improve user experience, and
                    maintain platform security.
                </p>

                <h3>3. Verification Data</h3>
                <p className="muted">
                    Verification submissions may include identification-related files and status
                    records. These are used only for account review, fraud prevention, and checkout
                    access control.
                </p>

                <h3>4. Data Protection</h3>
                <p className="muted">
                    We take reasonable steps to protect user information from unauthorized access,
                    misuse, alteration, or disclosure. No digital system can guarantee absolute
                    security.
                </p>

                <h3>5. Sharing of Information</h3>
                <p className="muted">
                    AGE OF SCENT does not sell personal information. Information may be shared only
                    when necessary for website operation, compliance review, lawful requests, or
                    service support.
                </p>

                <h3>6. Cookies and Local Storage</h3>
                <p className="muted">
                    The website may use cookies or browser storage to support login state, boutique
                    access confirmation, cart behavior, and essential site functionality.
                </p>

                <h3>7. User Responsibilities</h3>
                <p className="muted">
                    Users are responsible for ensuring that information provided during account,
                    checkout, and verification flows is accurate and lawful.
                </p>

                <h3>8. Updates to this Policy</h3>
                <p className="muted">
                    This privacy policy may be updated as the platform develops and new operational
                    requirements are introduced.
                </p>

                <h3>9. Contact</h3>
                <p className="muted">
                    For privacy-related concerns, users may contact the website administrator through
                    the official support channel of the platform.
                </p>
            </div>
        </PageShell>
    );
}
