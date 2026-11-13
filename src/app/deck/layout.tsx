import type { ReactNode } from "react";
import DeckList from "@/components/DeckList";

export default function DeckLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex h-dvh">
            {/* phones don't get the sidebar. they use the home page's list instead */}
            <aside className="hidden w-92 shrink-0 overflow-y-auto border-r border-neutral-200 bg-neutral-100/60 px-2 py-4 md:block">
                <DeckList isInSidebar />
            </aside>
            <div className="min-w-0 flex-1">{children}</div>
        </div>
    );
}