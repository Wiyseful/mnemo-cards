import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
    title: "Mnemo",
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en">
        <body suppressHydrationWarning>{children}</body>
        </html>
    );
}