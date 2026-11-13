import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import {StudyDataProvider} from "@/data/StudyDataProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
    title: "Mnemo",
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en" className={inter.className}>
        <body className="antialiased" suppressHydrationWarning>
        <StudyDataProvider>
        {children}
        </StudyDataProvider>
        </body>
        </html>
    );
}