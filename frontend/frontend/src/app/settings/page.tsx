"use client";

import { useEffect, useState } from "react";
import PageShell from "@/components/layout/PageShell";
import { applySiteTheme, getStoredSiteTheme, storeSiteTheme, type SiteTheme } from "@/lib/site-preferences";

const themes: { value: SiteTheme; title: string; copy: string }[] = [
    { value: "dark", title: "Dark theme", copy: "Best for the luxury perfume feeling and cinematic product photos." },
    { value: "light", title: "Light theme", copy: "Best when users want a clear bright shopping interface." }
];

export default function SettingsPage() {
    const [theme, setTheme] = useState<SiteTheme>("dark");

    useEffect(() => {
        const stored = getStoredSiteTheme();
        setTheme(stored);
        applySiteTheme(stored);
    }, []);

    function choose(nextTheme: SiteTheme) {
        setTheme(nextTheme);
        storeSiteTheme(nextTheme);
    }

    return (
        <PageShell title="Settings" description="Change website display from dark to light.">
            <section className="card settings-page-card">
                <p className="eyebrow">Theme Controller</p>
                <h2>Choose your website color mode</h2>
                <div className="theme-card-grid">
                    {themes.map((item) => (
                        <button
                            key={item.value}
                            className={`theme-card ${theme === item.value ? "is-active" : ""}`}
                            type="button"
                            onClick={() => choose(item.value)}
                        >
                            <span className={`theme-card__swatch theme-card__swatch--${item.value}`} />
                            <strong>{item.title}</strong>
                            <span>{item.copy}</span>
                        </button>
                    ))}
                </div>
            </section>
        </PageShell>
    );
}
