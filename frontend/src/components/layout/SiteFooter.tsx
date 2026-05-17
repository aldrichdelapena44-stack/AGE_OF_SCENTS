"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const socialLinks = [
    { label: "Facebook", href: "https://www.facebook.com/share/1CP9tfhmFE/", icon: "f" },
    { label: "Instagram", href: "https://www.instagram.com/ageofscent.7228904?igsh=MzRxdHFmbXViZmYz", icon: "◎" },
    { label: "TikTok", href: "https://www.tiktok.com/@yong_an18?_r=1&_t=ZS-96QZwpjx4M5", icon: "♪" }
];

export default function SiteFooter() {
    const pathname = usePathname();

    if (pathname === "/age-gate") {
        return (
            <footer className="site-footer site-footer--quiet">
                <div className="site-footer__inner site-footer__stack">
                    <p>AGE OF SCENT private boutique access.</p>
                    <p className="muted footer-warning">
                        Continue only if you are eligible to create an account and complete secure checkout.
                    </p>
                </div>
            </footer>
        );
    }

    return (
        <footer className="site-footer" id="footer">
            <div className="site-footer__inner footer-grid">
                <div>
                    <Link href="/" className="brand footer-brand">
                        <span className="brand__mark brand__mark--logo">
                            <img src="/logo.png" alt="" aria-hidden="true" onError={(event) => { event.currentTarget.style.display = "none"; }} />
                            <span>AS</span>
                        </span>
                        <span>AGE OF SCENT</span>
                    </Link>
                    <div className="social-link-row" aria-label="Social media links">
                        {socialLinks.map((item) => (
                            <a key={item.label} href={item.href} target="_blank" rel="noreferrer" aria-label={item.label} title={item.label}>
                                <span>{item.icon}</span>
                            </a>
                        ))}
                    </div>
                </div>

                <div className="footer-links">
                    <Link href="/#story">Brand Story</Link>
                    <Link href="/shop">Shop</Link>
                    <Link href="/feedback">Feedback</Link>
                    <Link href="/#contact">Contact</Link>
                    <Link href="/settings">Settings</Link>
                    <Link href="/privacy">Privacy Policy</Link>
                    <Link href="/terms">Terms and Conditions</Link>
                </div>

            </div>
        </footer>
    );
}
