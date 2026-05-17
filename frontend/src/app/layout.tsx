import type { Metadata } from "next";
import "@/styles/globals.css";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";

export const metadata: Metadata = {
    title: "AGE OF SCENT",
    description: "",
    openGraph: {
        title: "AGE OF SCENT",
        description: "",
        siteName: "AGE OF SCENT",
        type: "website"
    },
    twitter: {
        card: "summary",
        title: "AGE OF SCENT",
        description: ""
    }
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
