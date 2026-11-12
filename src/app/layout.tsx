import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";

// one clean font for the whole app. Next.js downloads it once and serves it from your site
const inter = Inter({ subsets: ["latin"] });

export const metadata = {
    title: "Mnemo",
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en" className={inter.className}>
        <body className="antialiased" suppressHydrationWarning>
        {children}
        </body>
        </html>
    );
}