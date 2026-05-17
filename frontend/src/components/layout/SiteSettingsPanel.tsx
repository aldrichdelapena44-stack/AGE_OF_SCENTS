"use client";

import { useEffect, useRef, useState } from "react";
import { applySiteTheme, getStoredSiteTheme, storeSiteTheme, type SiteTheme } from "@/lib/site-preferences";

const themes: { value: SiteTheme; label: string }[] = [
    { value: "dark", label: "Dark mode" },
    { value: "light", label: "White mode" }
];

export default function SiteSettingsPanel() {
    const [open, setOpen] = useState(false);
    const [theme, setTheme] = useState<SiteTheme>("dark");
    const panelRef = useRef<HTMLDivElement | null>(null);

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

    useEffect(() => {
        if (!open) return;

        function handlePointerDown(event: MouseEvent | TouchEvent) {
            const target = event.target as Node | null;
            if (target && panelRef.current && !panelRef.current.contains(target)) {
                setOpen(false);
            }
        }

        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("touchstart", handlePointerDown);
        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("touchstart", handlePointerDown);
        };
    }, [open]);

    function chooseTheme(nextTheme: SiteTheme) {
        setTheme(nextTheme);
        storeSiteTheme(nextTheme);
    }

    return (
        <div className="settings-widget" ref={panelRef}>
            <button className="icon-button" type="button" onClick={() => setOpen((current) => !current)} aria-label="Open website settings">
                ⚙
            </button>
            {open ? (
                <section className="settings-popover card" aria-label="Website settings">
                    <p className="eyebrow">Settings</p>
                    <h3>Website theme</h3>
                    <div className="theme-choice-list theme-choice-list--text-only">
                        {themes.map((item) => (
                            <button
                                className={`theme-choice ${theme === item.value ? "is-active" : ""}`}
                                type="button"
                                key={item.value}
                                onClick={() => chooseTheme(item.value)}
                            >
                                <strong>{item.label}</strong>
                            </button>
                        ))}
                    </div>
                </section>
            ) : null}
        </div>
    );
}
