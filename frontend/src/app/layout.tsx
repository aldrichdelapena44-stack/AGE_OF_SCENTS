import type { Metadata } from "next";
import "@/styles/globals.css";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";

export const metadata: Metadata = {
    title: "AGE OF SCENT | Luxury Perfume Boutique",
    description:
        "A cinematic luxury perfume e-commerce experience with parallax storytelling, premium product browsing, cart, checkout, and admin-preserved backend integration."
};

export default function RootLayout({
    children
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body>
                <SiteHeader />
                <main className="site-main">{children}</main>
                <SiteFooter />
            </body>
        </html>
    );
}
