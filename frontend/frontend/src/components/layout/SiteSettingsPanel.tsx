"use client";

import { useEffect, useState } from "react";
import { applySiteTheme, getStoredSiteTheme, storeSiteTheme, type SiteTheme } from "@/lib/site-preferences";

const themes: { value: SiteTheme; label: string; description: string }[] = [
    { value: "dark", label: "Dark", description: "Deep luxury perfume look." },
    { value: "light", label: "Light", description: "Clean bright shopping view." }
];

export default function SiteSettingsPanel() {
    const [open, setOpen] = useState(false);
    const [theme, setTheme] = useState<SiteTheme>("dark");

    useEffect(() => {
        const stored = getStoredSiteTheme();
        setTheme(stored);
        applySiteTheme(stored);

        function sync(event: Event) {
            const detail = (event as CustomEvent<SiteTheme>).detail;
            if (detail) setTheme(detail);
        }

        window.addEventListener("site-theme-updated", sync);
        return () => window.removeEventListener("site-theme-updated", sync);
    }, []);

    function chooseTheme(nextTheme: SiteTheme) {
        setTheme(nextTheme);
        storeSiteTheme(nextTheme);
    }

    return (
        <div className="settings-widget">
            <button className="icon-button" type="button" onClick={() => setOpen((current) => !current)} aria-label="Open website settings">
                ⚙
            </button>
            {open ? (
                <section className="settings-popover card" aria-label="Website settings">
                    <p className="eyebrow">Settings</p>
                    <h3>Website theme</h3>
                    <p className="muted">Switch between dark and light mode.</p>
                    <div className="theme-choice-list">
                        {themes.map((item) => (
                            <button
                                className={`theme-choice ${theme === item.value ? "is-active" : ""}`}
                                type="button"
                                key={item.value}
                                onClick={() => chooseTheme(item.value)}
                            >
                                <strong>{item.label}</strong>
                                <span>{item.description}</span>
                            </button>
                        ))}
                    </div>
                </section>
            ) : null}
        </div>
    );
}
