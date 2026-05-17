"use client";

import { useEffect, useRef, useState } from "react";

const LENS_SIZE = 180;
const ZOOM = 2;

function cleanClone(clone: HTMLElement) {
    clone.querySelectorAll("script, .magnifier-lens, .magnifier-zoom-surface").forEach((node) => node.remove());
    clone.querySelectorAll("input, textarea").forEach((node) => {
        const field = node as HTMLInputElement | HTMLTextAreaElement;
        field.setAttribute("value", field.value || field.getAttribute("value") || "");
        if (field instanceof HTMLTextAreaElement) field.textContent = field.value;
    });
}

export default function MagnifierTool() {
    const [enabled, setEnabled] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [viewport, setViewport] = useState({ width: 0, height: 0, scrollY: 0, documentHeight: 0 });
    const surfaceRef = useRef<HTMLDivElement | null>(null);
    const refreshTimer = useRef<number | null>(null);

    useEffect(() => {
        function readViewport() {
            setViewport({
                width: window.innerWidth,
                height: window.innerHeight,
                scrollY: window.scrollY,
                documentHeight: Math.max(document.body.scrollHeight, window.innerHeight)
            });
        }

        function refreshSurface() {
            if (!surfaceRef.current || !enabled) return;
            readViewport();
            const clone = document.body.cloneNode(true) as HTMLElement;
            cleanClone(clone);
            surfaceRef.current.replaceChildren(clone);
        }

        function move(event: MouseEvent | TouchEvent) {
            const point = "touches" in event ? event.touches[0] : event;
            if (!point) return;
            setPosition({ x: point.clientX, y: point.clientY });
            setViewport((current) => ({ ...current, scrollY: window.scrollY }));
        }

        if (!enabled) {
            document.body.classList.remove("magnifier-active");
            return;
        }

        document.body.classList.add("magnifier-active");
        refreshSurface();
        refreshTimer.current = window.setInterval(refreshSurface, 900);
        window.addEventListener("mousemove", move, { passive: true });
        window.addEventListener("touchmove", move, { passive: true });
        window.addEventListener("scroll", refreshSurface, { passive: true });
        window.addEventListener("resize", refreshSurface);

        return () => {
            document.body.classList.remove("magnifier-active");
            window.removeEventListener("mousemove", move);
            window.removeEventListener("touchmove", move);
            window.removeEventListener("scroll", refreshSurface);
            window.removeEventListener("resize", refreshSurface);
            if (refreshTimer.current) window.clearInterval(refreshTimer.current);
            refreshTimer.current = null;
        };
    }, [enabled]);

    return (
        <>
            <button
                className={`floating-tool floating-tool--magnifier icon-button ${enabled ? "is-active" : ""}`}
                type="button"
                aria-pressed={enabled}
                onClick={() => setEnabled((current) => !current)}
                title="Magnify small website details"
            >
                <span aria-hidden="true">🔎</span>
                <span className="floating-tool__label sr-only">Magnifier</span>
            </button>
            {enabled ? (
                <div
                    className="magnifier-lens"
                    style={{ left: position.x, top: position.y, width: LENS_SIZE, height: LENS_SIZE }}
                    aria-hidden="true"
                >
                    <div
                        ref={surfaceRef}
                        className="magnifier-zoom-surface"
                        style={{
                            width: viewport.width,
                            minHeight: viewport.documentHeight || viewport.height,
                            transform: `translate(${LENS_SIZE / 2 - position.x * ZOOM}px, ${LENS_SIZE / 2 - (position.y + viewport.scrollY) * ZOOM}px) scale(${ZOOM})`,
                            transformOrigin: "0 0"
                        }}
                    />
                </div>
            ) : null}
        </>
    );
}
